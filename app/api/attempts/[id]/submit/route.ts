import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { submitAttemptSchema } from "@/lib/validation";
import { issueCertificate } from "@/lib/certificates";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const attempt = await db.quizAttempt.findUnique({
    where: { id },
    include: {
      quiz: {
        include: {
          questions: { orderBy: { position: "asc" } },
          course: true,
        },
      },
    },
  });
  if (!attempt) return fail("Attempt not found.", 404);
  if (attempt.userId !== user.id) return fail("You cannot submit this attempt.", 403);
  if (attempt.submittedAt) return fail("This attempt has already been submitted.", 409);

  const data = await parseJson(req, submitAttemptSchema);
  const questions = attempt.quiz.questions;

  let expired = false;
  if (attempt.quiz.timeLimitMinutes > 0) {
    const deadline = attempt.startedAt.getTime() + attempt.quiz.timeLimitMinutes * 60_000 + 90_000;
    if (Date.now() > deadline) expired = true;
  }

  let score = 0;
  let maxScore = 0;
  const graded = questions.map((question, index) => {
    const selected = typeof data.answers[index] === "number" ? data.answers[index] : -1;
    const correct = !expired && selected === question.correctIndex;
    maxScore += question.points;
    if (correct) score += question.points;
    return {
      questionId: question.id,
      selected,
      correctIndex: question.correctIndex,
      correct,
      points: question.points,
      explanation: question.explanation,
    };
  });

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const passed = !expired && percent >= attempt.quiz.passMark;

  await db.quizAttempt.update({
    where: { id: attempt.id },
    data: {
      answers: JSON.stringify(graded),
      score,
      maxScore,
      percent,
      passed,
      submittedAt: new Date(),
    },
  });

  let certificateSerial: string | null = null;
  let certificateNote: string | null = null;

  if (passed && attempt.quiz.type === "EXAM" && attempt.quiz.course.certificateEnabled) {
    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: attempt.quiz.courseId } },
    });
    if (enrollment) {
      const [completedLessons, totalLessons] = await Promise.all([
        db.lessonProgress.count({ where: { enrollmentId: enrollment.id, completed: true } }),
        db.lesson.count({ where: { module: { courseId: attempt.quiz.courseId }, isPublished: true } }),
      ]);
      if (completedLessons >= totalLessons) {
        const certificate = await issueCertificate({
          userId: user.id,
          courseId: attempt.quiz.courseId,
          enrollmentId: enrollment.id,
          examAttemptId: attempt.id,
        });
        certificateSerial = certificate.serial;
      } else {
        certificateNote = "Exam passed. Complete all remaining lessons to unlock your certificate.";
      }
    }
  }

  await db.notification.create({
    data: {
      userId: user.id,
      type: "COURSE",
      title: passed ? `${attempt.quiz.type === "EXAM" ? "Final assessment" : "Quiz"} passed` : "Assessment result recorded",
      body: `${attempt.quiz.title}: ${percent}% (pass mark ${attempt.quiz.passMark}%).`,
      link: certificateSerial ? "/dashboard/certificates" : `/dashboard/assessments`,
    },
  });

  await audit({
    actorId: user.id,
    action: "assessment.submitted",
    entity: "QuizAttempt",
    entityId: attempt.id,
    meta: { quizId: attempt.quizId, percent, passed, expired },
  });

  return json({
    ok: true,
    score,
    maxScore,
    percent,
    passed,
    expired,
    passMark: attempt.quiz.passMark,
    certificateSerial,
    certificateNote,
    review: attempt.quiz.type === "EXAM" ? undefined : graded,
    quizTitle: attempt.quiz.title,
  });
});
