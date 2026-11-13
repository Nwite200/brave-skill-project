import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { percent } from "@/lib/format";
import { getCourseProgression } from "@/lib/progression";
import { LessonPlayer } from "@/components/learning/LessonPlayer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ courseId: string }> }): Promise<Metadata> {
  const { courseId } = await params;
  const course = await db.course.findUnique({ where: { id: courseId }, select: { title: true } });
  return { title: course ? `Learning · ${course.title}` : "Learning" };
}

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const user = await requireUser();
  const [{ courseId }, query] = await Promise.all([params, searchParams]);

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        where: { isPublished: true },
        orderBy: { position: "asc" },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { position: "asc" },
            include: { videoAsset: true, pdfAsset: true },
          },
        },
      },
      quizzes: {
        where: { isPublished: true },
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { questions: true } } },
      },
    },
  });
  if (!course) notFound();

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    include: { progress: true },
  });
  if (!enrollment || enrollment.status === "REVOKED") {
    redirect(`/courses/${course.slug}`);
  }

  const lessons = course.modules.flatMap((m) => m.lessons);
  if (!lessons.length) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-[20px] font-semibold text-white">{course.title}</h1>
        <p className="mt-2 text-[12px] text-[#8492A6]">Lessons for this programme are being prepared. Check back soon.</p>
      </div>
    );
  }

  const progressMap = new Map(enrollment.progress.map((p) => [p.lessonId, p]));
  const progression = await getCourseProgression({ courseId, userId: user.id });
  const moduleState = new Map(progression.modules.map((module) => [module.id, module]));
  const lessonModule = new Map(course.modules.flatMap((module) => module.lessons.map((lesson) => [lesson.id, module.id])));
  const isLessonLocked = (lessonId: string) => {
    const moduleId = lessonModule.get(lessonId);
    return moduleId ? Boolean(moduleState.get(moduleId)?.locked) : false;
  };

  const requestedLesson = lessons.find((l) => l.id === query.lesson);
  const activeLesson =
    (requestedLesson && !isLessonLocked(requestedLesson.id) ? requestedLesson : undefined) ||
    lessons.find((l) => !progressMap.get(l.id)?.completed && !isLessonLocked(l.id)) ||
    lessons.find((l) => !isLessonLocked(l.id)) ||
    lessons[0];

  const index = lessons.findIndex((l) => l.id === activeLesson.id);
  const progress = progressMap.get(activeLesson.id);
  const completedCount = enrollment.progress.filter((p) => p.completed).length;

  const attempts = await db.quizAttempt.findMany({
    where: { userId: user.id, quizId: { in: course.quizzes.map((q) => q.id) }, submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
    select: { quizId: true, passed: true },
  });
  const passedMap = new Map<string, boolean>();
  for (const attempt of attempts) {
    if (!passedMap.has(attempt.quizId) || attempt.passed) passedMap.set(attempt.quizId, attempt.passed);
  }

  const nextEnrollment = await db.enrollment.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      courseId: { not: courseId },
      progress: { none: { completed: true } },
    },
    include: { course: { include: { modules: { select: { lessons: { where: { isPublished: true }, select: { id: true }, take: 1 } } } } } },
  });
  const nextCourseFirstLesson = nextEnrollment?.course.modules.flatMap((m) => m.lessons)[0];
  const nextCourseHref = nextEnrollment && nextCourseFirstLesson
    ? `/dashboard/courses/${nextEnrollment.courseId}?lesson=${nextCourseFirstLesson.id}`
    : "/dashboard/courses";

  return (
    <LessonPlayer
      lesson={{
        id: activeLesson.id,
        title: activeLesson.title,
        description: activeLesson.description,
        type: activeLesson.type,
        durationSeconds: activeLesson.durationSeconds,
        videoAssetId: activeLesson.videoAssetId,
        pdfAssetId: activeLesson.pdfAssetId,
        videoUrl: activeLesson.videoUrl,
        content: activeLesson.content,
        isPreview: activeLesson.isPreview,
        videoProvider: activeLesson.videoAsset?.provider || (activeLesson.videoUrl ? "external" : "local"),
      }}
      completed={Boolean(progress?.completed)}
      watchedSeconds={progress?.watchedSeconds || 0}
      nextLessonId={
        lessons[index + 1] && !isLessonLocked(lessons[index + 1].id) ? lessons[index + 1].id : null
      }
      prevLessonId={lessons[index - 1]?.id || null}
      courseId={course.id}
      courseTitle={course.title}
      modules={course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        position: m.position,
        locked: Boolean(moduleState.get(m.id)?.locked),
        quizId: moduleState.get(m.id)?.quizId || null,
        quizPassed: Boolean(moduleState.get(m.id)?.quizPassed),
        quizRequired: Boolean(moduleState.get(m.id)?.quizRequired),
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          durationSeconds: l.durationSeconds,
          isPreview: l.isPreview,
          locked: isLessonLocked(l.id),
          completed: Boolean(progressMap.get(l.id)?.completed),
        })),
      }))}
      activeLessonId={activeLesson.id}
      progressPercent={percent(completedCount, lessons.length)}
      quizzes={course.quizzes.map((q) => {
        const quizModule = q.moduleId ? moduleState.get(q.moduleId) : null;
        return {
          id: q.id,
          title: q.title,
          type: q.type,
          questionCount: q._count.questions,
          passed: passedMap.get(q.id) ?? false,
          moduleId: q.moduleId || null,
          locked: q.type === "EXAM" ? !progression.examAvailable : Boolean(quizModule?.locked || (quizModule && !quizModule.lessonsComplete)),
          required: q.isRequired,
        };
      })}
      nextCourseLessonHref={nextCourseHref}
      studentEmail={user.email}
    />
  );
}
