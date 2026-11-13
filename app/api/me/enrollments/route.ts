import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { enrollmentSummaries } from "@/lib/courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: NextRequest) => {
  const user = await requireUser();
  const summaries = await enrollmentSummaries(user.id);

  const items = await Promise.all(
    summaries
      .filter((e) => e.status !== "REVOKED")
      .map(async (enrollment) => {
        const nextLesson = await db.lesson.findFirst({
          where: {
            module: { courseId: enrollment.courseId },
            isPublished: true,
            progress: { none: { enrollmentId: enrollment.id, completed: true } },
          },
          orderBy: [{ module: { position: "asc" } }, { position: "asc" }],
          select: { id: true, title: true, durationSeconds: true, type: true },
        });
        return {
          id: enrollment.id,
          courseId: enrollment.courseId,
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
          percent: enrollment.percent,
          completedLessons: enrollment.completedLessons,
          totalLessons: enrollment.totalLessons,
          certificateSerial: enrollment.certificate?.serial || null,
          course: {
            title: enrollment.course.title,
            slug: enrollment.course.slug,
            summary: enrollment.course.summary,
            thumbnailUrl: enrollment.course.thumbnailUrl,
            category: enrollment.course.category?.name,
            accent: enrollment.course.category?.accent,
          },
          nextLesson,
        };
      }),
  );

  return json({ ok: true, enrollments: items });
});
