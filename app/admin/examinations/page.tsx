import type { Metadata } from "next";
import { requireStaffPage, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuizManager } from "@/components/admin/QuizManager";

export const metadata: Metadata = { title: "Examinations · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminExaminationsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const user = await requireStaffPage();
  const admin = isAdmin(user.role);
  const params = await searchParams;

  const [quizzes, courses] = await Promise.all([
    db.quiz.findMany({
      where: {
        ...(admin ? {} : { course: { instructorId: user.id } }),
        ...(params.course ? { courseId: params.course } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { course: { select: { title: true, id: true } }, _count: { select: { questions: true } } },
    }),
    db.course.findMany({ where: admin ? {} : { instructorId: user.id }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <QuizManager
      courses={courses}
      quizzes={quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        type: quiz.type,
        passMark: quiz.passMark,
        timeLimitMinutes: quiz.timeLimitMinutes,
        questions: quiz._count.questions,
        isPublished: quiz.isPublished,
        courseTitle: quiz.course.title,
        courseId: quiz.course.id,
      }))}
    />
  );
}
