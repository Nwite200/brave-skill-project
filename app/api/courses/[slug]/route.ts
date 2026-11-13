import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail } from "@/lib/api";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getCourseBySlug } from "@/lib/courses";
import { percent } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: NextRequest, ctx) => {
  const { slug } = await ctx.params;
  const [course, user] = await Promise.all([getCourseBySlug(slug), getSessionUser()]);
  if (!course) return fail("Course not found.", 404);

  const enrollment = user
    ? await db.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
        include: { progress: true, certificate: { select: { serial: true } } },
      })
    : null;

  const staff = user ? isStaff(user.role) : false;
  const enrolled = Boolean(enrollment && enrollment.status !== "REVOKED");
  const progressMap = new Map(enrollment?.progress.map((p) => [p.lessonId, p.completed]) || []);
  const lessons = course.modules.flatMap((m) => m.lessons);
  const completed = enrollment?.progress.filter((p) => p.completed).length || 0;

  const modules = course.modules.map((module) => ({
    id: module.id,
    title: module.title,
    position: module.position,
    lessons: module.lessons.map((lesson) => {
      const locked = !enrolled && !staff && !lesson.isPreview;
      return {
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        durationSeconds: lesson.durationSeconds,
        isPreview: lesson.isPreview,
        locked,
        completed: progressMap.get(lesson.id) ?? false,
        content: locked ? null : lesson.content,
        videoAssetId: locked ? null : lesson.videoAssetId,
        pdfAssetId: locked ? null : lesson.pdfAssetId,
        videoUrl: locked ? null : lesson.videoUrl,
      };
    }),
  }));

  return json({
    ok: true,
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      summary: course.summary,
      description: course.description,
      outcomes: course.outcomes.split("\n").filter(Boolean),
      requirements: course.requirements.split("\n").filter(Boolean),
      level: course.level,
      priceKobo: course.priceKobo,
      compareAtKobo: course.compareAtKobo,
      thumbnailUrl: course.thumbnailUrl,
      durationLabel: course.durationLabel,
      certificateEnabled: course.certificateEnabled,
      examRequired: course.examRequired,
      passMark: course.passMark,
      category: { name: course.category.name, slug: course.category.slug, accent: course.category.accent },
      instructor: course.instructor
        ? { name: course.instructor.name, headline: course.instructor.headline, bio: course.instructor.bio, expertise: course.instructor.expertise }
        : null,
      lessons: lessons.length,
      students: course._count.enrollments,
      modules,
      quizzes: course.quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        type: quiz.type,
        passMark: quiz.passMark,
        timeLimitMinutes: quiz.timeLimitMinutes,
        questions: quiz._count.questions,
      })),
    },
    access: {
      enrolled,
      staff,
      canPurchase: !enrolled && !staff,
      progress: percent(completed, lessons.length),
      completedLessons: completed,
      totalLessons: lessons.length,
      certificateSerial: enrollment?.certificate?.serial || null,
    },
  });
});
