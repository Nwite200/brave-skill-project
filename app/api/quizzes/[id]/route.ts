import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = route(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, slug: true, certificateEnabled: true } },
      _count: { select: { questions: true } },
      attempts: {
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        select: { id: true, score: true, maxScore: true, percent: true, passed: true, startedAt: true, submittedAt: true },
      },
    },
  });
  if (!quiz || !quiz.isPublished) return fail("Assessment not found.", 404);

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: quiz.courseId } },
  });
  if (!enrollment || enrollment.status === "REVOKED") return fail("You are not enrolled in this course.", 403);

  const completedLessons = await db.lessonProgress.count({ where: { enrollmentId: enrollment.id, completed: true } });
  const totalLessons = await db.lesson.count({ where: { module: { courseId: quiz.courseId }, isPublished: true } });

  return json({
    ok: true,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      type: quiz.type,
      passMark: quiz.passMark,
      timeLimitMinutes: quiz.timeLimitMinutes,
      maxAttempts: quiz.maxAttempts,
      questions: quiz._count.questions,
      course: quiz.course,
    },
    lessons: { completed: completedLessons, total: totalLessons },
    attempts: quiz.attempts,
    attemptsUsed: quiz.attempts.length,
    lessonsComplete: completedLessons >= totalLessons && totalLessons > 0,
  });
});
