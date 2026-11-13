import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { submitAttemptSchema } from "@/lib/validation";
import { issueCertificate } from "@/lib/certificates";
import { audit } from "@/lib/audit";
import { getCourseProgression } from "@/lib/progression";

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
  const allQuestions = attempt.quiz.questions;
  const byId = new Map(allQuestions.map((question) => [question.id, question]));

  let questionOrder: string[];
  let optionOrder: number[][];
  try {
    questionOrder = attempt.questionOrder ? (JSON.parse(attempt.questionOrder) as string[]) : allQuestions.map((q) => q.id);
    optionOrder = attempt.optionOrder ? (JSON.parse(attempt.optionOrder) as number[][]) : allQuestions.map((q) => {
      const options = JSON.parse(q.options) as string[];
      return options.map((_, index) => index);
    });
  } catch {
    questionOrder = allQuestions.map((q) => q.id);
    optionOrder = allQuestions.map((q) => (JSON.parse(q.options) as string[]).map((_, index) => index));
  }

  const questions = questionOrder.map((questionId) => byId.get(questionId)).filter(Boolean) as typeof allQuestions;

  let expired = false;
  if (attempt.quiz.timeLimitMinutes > 0) {
    const deadline = attempt.startedAt.getTime() + attempt.quiz.timeLimitMinutes * 60_000 + 90_000;
    if (Date.now() > deadline) expired = true;
  }

  let score = 0;
  let maxScore = 0;
  const graded = questions.map((question, index) => {
    const options = JSON.parse(question.options) as string[];
    const order = optionOrder[index] || options.map((_, i) => i);
    const selectedDisplay = typeof data.answers[index] === "number" ? data.answers[index] : -1;
    const selectedOriginal = selectedDisplay >= 0 ? order[selectedDisplay] : -1;
    const correct = !expired && selectedOriginal === question.correctIndex;
    maxScore += question.points;
    if (correct) score += question.points;
    return {
      questionId: question.id,
      prompt: question.prompt,
      selected: selectedDisplay,
      correctIndex: order.indexOf(question.correctIndex),
      selectedAnswer: selectedOriginal >= 0 ? options[selectedOriginal] : null,
      correctAnswer: options[question.correctIndex],
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
      const progression = await getCourseProgression({ courseId: attempt.quiz.courseId, userId: user.id });
      if (progression.examAvailable) {
        const certificate = await issueCertificate({
          userId: user.id,
          courseId: attempt.quiz.courseId,
          enrollmentId: enrollment.id,
          examAttemptId: attempt.id,
        });
        certificateSerial = certificate.serial;
      } else {
        certificateNote = "Exam passed. Complete all lessons and required module quizzes to unlock your certificate.";
      }
    }
  }

  await db.notification.create({
    data: {
      userId: user.id,
      type: "COURSE",
      title: passed ? `${attempt.quiz.type === "EXAM" ? "Final assessment" : "Assessment"} passed` : "Assessment result recorded",
      body: `${attempt.quiz.title}: ${percent}% (pass mark ${attempt.quiz.passMark}%).`,
      link: certificateSerial ? "/dashboard/certificates" : "/dashboard/assessments",
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
