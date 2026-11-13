import "server-only";

import { db } from "@/lib/db";
import { isStaff } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";

export async function getCourseAccess(user: SessionUser | null, courseId: string) {
  if (!user) return { enrolled: false, staff: false, enrollment: null };
  const staff = isStaff(user.role);
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    include: { progress: true, certificate: true },
  });
  return {
    enrolled: enrollment?.status === "ACTIVE" || enrollment?.status === "COMPLETED",
    staff,
    enrollment,
  };
}

export async function getLessonWithAccess(user: SessionUser | null, lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { course: true } },
      videoAsset: true,
      pdfAsset: true,
    },
  });
  if (!lesson || !lesson.isPublished) return null;
  const access = await getCourseAccess(user, lesson.module.courseId);
  const preview = lesson.isPreview;
  return { lesson, access, allowed: preview || access.enrolled || access.staff };
}

export async function assertCourseAccess(user: SessionUser, courseId: string, allowStaff = true) {
  const access = await getCourseAccess(user, courseId);
  if (access.staff && allowStaff) return access;
  if (!access.enrolled) {
    const { HttpError } = await import("@/lib/api");
    throw new HttpError("You are not enrolled in this course.", 403);
  }
  return access;
}
