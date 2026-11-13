import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = route(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!quiz || !quiz.isPublished) return fail("Assessment not found.", 404);
  if (quiz.questions.length === 0) return fail("This assessment has no questions yet.", 409);

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: quiz.courseId } },
  });
  if (!enrollment || enrollment.status === "REVOKED") return fail("You are not enrolled in this course.", 403);

  const [completedLessons, totalLessons] = await Promise.all([
    db.lessonProgress.count({ where: { enrollmentId: enrollment.id, completed: true } }),
    db.lesson.count({ where: { module: { courseId: quiz.courseId }, isPublished: true } }),
  ]);

  if (quiz.type === "EXAM" && completedLessons < totalLessons) {
    return fail("Complete all lessons before taking the final assessment.", 409);
  }

  const attemptsUsed = await db.quizAttempt.count({ where: { quizId: quiz.id, userId: user.id } });
  if (quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts) {
    return fail("You have used all available attempts for this assessment.", 409);
  }

  const inProgress = await db.quizAttempt.findFirst({
    where: { quizId: quiz.id, userId: user.id, submittedAt: null },
    orderBy: { startedAt: "desc" },
  });

  const attempt =
    inProgress ||
    (await db.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: user.id,
        attemptNumber: attemptsUsed + 1,
        maxScore: quiz.questions.reduce((sum, q) => sum + q.points, 0),
      },
    }));

  return json({
    ok: true,
    attempt: {
      id: attempt.id,
      startedAt: attempt.startedAt,
      attemptNumber: attempt.attemptNumber,
      maxScore: attempt.maxScore,
    },
    quiz: {
      id: quiz.id,
      title: quiz.title,
      type: quiz.type,
      passMark: quiz.passMark,
      timeLimitMinutes: quiz.timeLimitMinutes,
      courseId: quiz.courseId,
    },
    questions: quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: JSON.parse(q.options) as string[],
      points: q.points,
      position: q.position,
    })),
    resumed: Boolean(inProgress),
  });
});
