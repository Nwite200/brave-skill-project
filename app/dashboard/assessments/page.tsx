import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, FileQuestion, Lock, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { percent } from "@/lib/format";
import { CourseCover } from "@/components/ui/CourseCard";
import { getCourseProgression } from "@/lib/progression";

export const metadata: Metadata = { title: "Quizzes & exams" };
export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  const user = await requireUser();

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id, status: { not: "REVOKED" } },
    include: {
      course: {
        include: {
          category: { select: { name: true, accent: true } },
          modules: { select: { id: true, title: true, position: true, lessons: { where: { isPublished: true }, select: { id: true } } } },
          quizzes: {
            where: { isPublished: true },
            orderBy: { createdAt: "asc" },
            include: { _count: { select: { questions: true } } },
          },
        },
      },
      progress: { select: { lessonId: true, completed: true } },
    },
  });

  const quizIds = enrollments.flatMap((e) => e.course.quizzes.map((q) => q.id));
  const attempts = quizIds.length
    ? await db.quizAttempt.findMany({
        where: { userId: user.id, quizId: { in: quizIds }, submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        select: { quizId: true, percent: true, passed: true },
      })
    : [];

  const attemptMap = new Map<string, { percent: number; passed: boolean; count: number }>();
  for (const attempt of attempts) {
    const existing = attemptMap.get(attempt.quizId);
    attemptMap.set(attempt.quizId, {
      percent: Math.max(existing?.percent ?? 0, attempt.percent),
      passed: (existing?.passed ?? false) || attempt.passed,
      count: (existing?.count ?? 0) + 1,
    });
  }

  const progressions = await Promise.all(
    enrollments.map((enrollment) => getCourseProgression({ courseId: enrollment.courseId, userId: user.id })),
  );
  const moduleStateByCourse = new Map(
    enrollments.map((enrollment, index) => [
      enrollment.courseId,
      new Map(progressions[index].modules.map((module) => [module.id, module])),
    ]),
  );
  const examAvailableByCourse = new Map(enrollments.map((enrollment, index) => [enrollment.courseId, progressions[index].examAvailable]));

  const items = enrollments.flatMap((enrollment) => {
    const totalLessons = enrollment.course.modules.reduce((s, m) => s + m.lessons.length, 0);
    const done = enrollment.progress.filter((p) => p.completed).length;
    const modules = moduleStateByCourse.get(enrollment.courseId);
    return enrollment.course.quizzes.map((quiz) => {
      const module = quiz.moduleId ? modules?.get(quiz.moduleId) : null;
      return {
        quiz,
        course: enrollment.course,
        done,
        totalLessons,
        attempt: attemptMap.get(quiz.id),
        moduleTitle: module?.title || null,
        locked:
          quiz.type === "EXAM"
            ? !examAvailableByCourse.get(enrollment.courseId)
            : Boolean(module?.locked || (module && !module.lessonsComplete)),
      };
    });
  });

  return (
    <div className="mx-auto max-w-[1100px]">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-white">Quizzes & exams</h1>
        <p className="mt-1 text-[12px] text-[#8492A6]">Test your understanding and unlock your certificate.</p>
      </div>

      {items.length ? (
        <div className="mt-6 space-y-3">
          {items.map(({ quiz, course, done, totalLessons, attempt, locked, moduleTitle }) => (
            <div key={quiz.id} className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-4 sm:flex-row sm:items-center">
              <CourseCover compact title={course.title} accent={course.category?.accent || "#873BFF"} category={course.category?.name || "Course"} className="h-14 w-20 shrink-0 rounded-xl border border-white/10" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.1em] ${quiz.type === "EXAM" ? "border-[#873BFF]/25 bg-[#873BFF]/10 text-[#C9B8FF]" : "border-[#20D9E8]/25 bg-[#20D9E8]/10 text-[#7FE9F2]"}`}>
                    {quiz.type === "EXAM" ? "Final exam" : moduleTitle ? "Module quiz" : "Quiz"}
                  </span>
                  {attempt?.passed && <span className="flex items-center gap-1 text-[9px] text-emerald-300"><CheckCircle2 size={10} /> Passed</span>}
                </div>
                <p className="mt-1.5 truncate text-[13px] font-medium text-white">{quiz.title}</p>
                <p className="mt-0.5 truncate text-[10px] text-[#6F7C90]">{course.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9.5px] text-[#8492A6]">
                  <span className="flex items-center gap-1"><FileQuestion size={10} /> {quiz._count.questions} questions</span>
                  <span>Pass mark {quiz.passMark}%</span>
                  <span className="flex items-center gap-1"><Clock3 size={10} /> {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : "No limit"}</span>
                  {quiz.type === "EXAM" && <span>{done}/{totalLessons} lessons complete</span>}
                  {moduleTitle && <span>{moduleTitle}</span>}
                  {attempt && <span className="text-[#C2CCDD]">Best {attempt.percent}%</span>}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {locked ? (
                  <span className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-[#6F7C90]"><Lock size={10} /> {quiz.type === "EXAM" ? "Complete modules" : "Complete module"}</span>
                ) : attempt?.passed ? (
                  <Link href={`/dashboard/certificates`} className="btn btn-ghost btn-sm h-8">Certificate</Link>
                ) : (
                  <Link href={`/dashboard/assessments/${quiz.id}`} className="btn btn-primary btn-sm h-8">
                    {attempt ? "Retake" : "Start"} <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] text-[#6F7C90]"><Sparkles size={20} /></span>
          <p className="mt-4 text-[14px] font-medium text-white">No assessments available</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[11.5px] text-[#8492A6]">Enrol in a course to unlock its quizzes and final assessment.</p>
          <Link href="/courses" className="btn btn-primary btn-sm mt-4">Browse courses</Link>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="flex items-center gap-2 text-[11px] font-medium text-white"><CheckCircle2 size={13} className="text-[#10C99A]" /> How grading works</p>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#7C8AA3]">
          Answers are graded on the server against the stored answer key. Quiz scores are immediate; the final assessment triggers certificate issuance when you pass and all lessons are complete. Attempt limits and time limits are enforced server-side.
        </p>
      </div>
    </div>
  );
}
