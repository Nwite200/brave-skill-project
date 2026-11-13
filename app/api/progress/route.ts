import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { progressSchema } from "@/lib/validation";
import { issueCertificate } from "@/lib/certificates";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "STUDENT") return fail("Only students have learning progress.", 403);

  const data = await parseJson(req, progressSchema);
  const lesson = await db.lesson.findUnique({
    where: { id: data.lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson || !lesson.isPublished) return fail("Lesson not found.", 404);

  const courseId = lesson.module.courseId;
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });
  if (!enrollment || enrollment.status === "REVOKED") return fail("You are not enrolled in this course.", 403);

  await db.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } },
    update: {
      ...(typeof data.completed === "boolean"
        ? { completed: data.completed, completedAt: data.completed ? new Date() : null }
        : {}),
      ...(typeof data.watchedSeconds === "number" ? { watchedSeconds: data.watchedSeconds } : {}),
    },
    create: {
      enrollmentId: enrollment.id,
      lessonId: lesson.id,
      completed: data.completed ?? false,
      watchedSeconds: data.watchedSeconds ?? 0,
      completedAt: data.completed ? new Date() : null,
    },
  });

  await db.enrollment.update({ where: { id: enrollment.id }, data: { lastAccessedAt: new Date() } });

  const [totalLessons, completedLessons] = await Promise.all([
    db.lesson.count({ where: { module: { courseId }, isPublished: true } }),
    db.lessonProgress.count({ where: { enrollmentId: enrollment.id, completed: true } }),
  ]);

  let certificateSerial: string | null = null;
  if (
    completedLessons >= totalLessons &&
    totalLessons > 0 &&
    lesson.module.course.certificateEnabled &&
    !lesson.module.course.examRequired
  ) {
    const certificate = await issueCertificate({
      userId: user.id,
      courseId,
      enrollmentId: enrollment.id,
    });
    certificateSerial = certificate.serial;
  }

  return json({
    ok: true,
    completedLessons,
    totalLessons,
    percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    certificateSerial,
  });
});
