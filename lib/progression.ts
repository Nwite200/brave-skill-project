import "server-only";

import { db } from "@/lib/db";
import { isStaff, type SessionUser } from "@/lib/auth";

export type ModuleProgression = {
  id: string;
  title: string;
  position: number;
  locked: boolean;
  lessonsComplete: boolean;
  completedLessons: number;
  totalLessons: number;
  quizRequired: boolean;
  quizPassed: boolean;
  quizAvailable: boolean;
  quizId: string | null;
  quizTitle: string | null;
};

export type CourseProgression = {
  modules: ModuleProgression[];
  allLessonsComplete: boolean;
  requiredQuizzesPassed: boolean;
  examAvailable: boolean;
  nextLessonId: string | null;
  nextModuleId: string | null;
};

/**
 * Server-authoritative curriculum progression.
 *
 * A module is unlocked when the previous module has all published lessons
 * complete AND its required quiz (if any) has been passed. The first module is
 * always available to an enrolled student.
 */
export async function getCourseProgression(input: {
  courseId: string;
  userId: string;
  staff?: boolean;
}): Promise<CourseProgression> {
  const [course, enrollment] = await Promise.all([
    db.course.findUnique({
      where: { id: input.courseId },
      include: {
        modules: {
          where: { isPublished: true },
          orderBy: { position: "asc" },
          include: {
            lessons: { where: { isPublished: true }, orderBy: { position: "asc" }, select: { id: true } },
            quizzes: { where: { isPublished: true }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    }),
    db.enrollment.findUnique({
      where: { userId_courseId: { userId: input.userId, courseId: input.courseId } },
      include: { progress: true },
    }),
  ]);

  if (!course || !enrollment) {
    return {
      modules: [],
      allLessonsComplete: false,
      requiredQuizzesPassed: false,
      examAvailable: false,
      nextLessonId: null,
      nextModuleId: null,
    };
  }

  const completedIds = new Set(enrollment.progress.filter((p) => p.completed).map((p) => p.lessonId));
  const quizIds = course.modules.flatMap((module) => module.quizzes.map((quiz) => quiz.id));
  const attempts = quizIds.length
    ? await db.quizAttempt.findMany({
        where: { userId: input.userId, quizId: { in: quizIds }, submittedAt: { not: null } },
        select: { quizId: true, passed: true },
      })
    : [];
  const passedQuizIds = new Set(attempts.filter((attempt) => attempt.passed).map((attempt) => attempt.quizId));

  const modules: ModuleProgression[] = [];
  let previousReady = true;
  let nextLessonId: string | null = null;
  let nextModuleId: string | null = null;

  for (const [index, module] of course.modules.entries()) {
    const requiredQuizzes = module.quizzes.filter((quiz) => quiz.isRequired);
    const quizRequired = module.quizzes.some((quiz) => quiz.isRequired);
    const quizPassed = requiredQuizzes.length > 0 && requiredQuizzes.every((quiz) => passedQuizIds.has(quiz.id));
    const completedLessons = module.lessons.filter((lesson) => completedIds.has(lesson.id)).length;
    const lessonsComplete = module.lessons.length > 0 && completedLessons >= module.lessons.length;
    const locked: boolean = !input.staff && index > 0 && !previousReady;
    const quiz = module.quizzes.find((item) => item.isRequired) || module.quizzes[0] || null;

    if (!locked && !nextLessonId) {
      const next = module.lessons.find((lesson) => !completedIds.has(lesson.id));
      if (next) {
        nextLessonId = next.id;
        nextModuleId = module.id;
      }
    }

    modules.push({
      id: module.id,
      title: module.title,
      position: module.position,
      locked,
      lessonsComplete,
      completedLessons,
      totalLessons: module.lessons.length,
      quizRequired,
      quizPassed,
      quizAvailable: !locked && lessonsComplete && Boolean(quiz),
      quizId: quiz?.id ?? null,
      quizTitle: quiz?.title ?? null,
    });

    previousReady = !locked && lessonsComplete && (!quizRequired || quizPassed);
  }

  const allLessonsComplete = modules.length > 0 && modules.every((module) => module.lessonsComplete);
  const requiredQuizzesPassed = modules.every((module) => !module.quizRequired || module.quizPassed);

  return {
    modules,
    allLessonsComplete,
    requiredQuizzesPassed,
    examAvailable: allLessonsComplete && requiredQuizzesPassed,
    nextLessonId,
    nextModuleId,
  };
}

export async function lessonAccess(user: SessionUser | null, lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { id: true, courseId: true, position: true } } },
  });
  if (!lesson || !lesson.isPublished) {
    return { lesson: null, allowed: false, reason: "not_found" as const, progression: null, staff: false, enrolled: false };
  }

  const staff = Boolean(user && isStaff(user.role));
  if (!user) {
    return { lesson, allowed: lesson.isPreview, reason: lesson.isPreview ? ("preview" as const) : ("auth" as const), progression: null, staff: false, enrolled: false };
  }

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: lesson.module.courseId } },
  });
  const enrolled = Boolean(enrollment && enrollment.status !== "REVOKED");

  if (staff) {
    return { lesson, allowed: true, reason: "staff" as const, progression: null, staff: true, enrolled };
  }
  if (lesson.isPreview) {
    return { lesson, allowed: true, reason: "preview" as const, progression: null, staff: false, enrolled };
  }
  if (!enrolled) {
    return { lesson, allowed: false, reason: "not_enrolled" as const, progression: null, staff: false, enrolled: false };
  }

  const progression = await getCourseProgression({
    courseId: lesson.module.courseId,
    userId: user.id,
  });
  const module = progression.modules.find((item) => item.id === lesson.module.id);
  if (module?.locked) {
    return { lesson, allowed: false, reason: "module_locked" as const, progression, staff: false, enrolled: true };
  }

  return { lesson, allowed: true, reason: "enrolled" as const, progression, staff: false, enrolled: true };
}
