import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuizRunner } from "@/components/assessments/QuizRunner";

export const metadata: Metadata = { title: "Assessment" };
export const dynamic = "force-dynamic";

export default async function TakeAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, slug: true, certificateEnabled: true } },
      _count: { select: { questions: true } },
    },
  });
  if (!quiz || !quiz.isPublished) notFound();

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: quiz.courseId } },
  });
  if (!enrollment || enrollment.status === "REVOKED") redirect(`/courses/${quiz.course.slug}`);

  const [completed, total, attempts] = await Promise.all([
    db.lessonProgress.count({ where: { enrollmentId: enrollment.id, completed: true } }),
    db.lesson.count({ where: { module: { courseId: quiz.courseId }, isPublished: true } }),
    db.quizAttempt.findMany({
      where: { quizId: quiz.id, userId: user.id, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      select: { percent: true, passed: true },
    }),
  ]);

  return (
    <QuizRunner
      quiz={{
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        type: quiz.type,
        passMark: quiz.passMark,
        timeLimitMinutes: quiz.timeLimitMinutes,
        maxAttempts: quiz.maxAttempts,
        questions: quiz._count.questions,
        course: {
          id: quiz.course.id,
          title: quiz.course.title,
          slug: quiz.course.slug,
          certificateEnabled: quiz.course.certificateEnabled,
        },
        lessonsComplete: total > 0 && completed >= total,
        attemptsUsed: attempts.length,
        lessons: { completed, total },
        bestPercent: attempts.length ? Math.max(...attempts.map((a) => a.percent)) : null,
      }}
    />
  );
}
