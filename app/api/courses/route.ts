import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { listPublishedCourses, lessonCount } from "@/lib/courses";
import { percent } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public catalogue consumed by the Android app and any external client. */
export const GET = route(async (req: NextRequest) => {
  const search = req.nextUrl.searchParams.get("q") || undefined;
  const category = req.nextUrl.searchParams.get("category") || undefined;
  const order = (req.nextUrl.searchParams.get("sort") as "newest" | "popular" | "price-asc" | "price-desc") || "newest";

  const courses = await listPublishedCourses({ search, category, order });
  const durations = await db.lesson.groupBy({
    by: ["moduleId"],
    where: { module: { courseId: { in: courses.map((c) => c.id) } }, isPublished: true },
    _sum: { durationSeconds: true },
  });
  const modules = await db.module.findMany({
    where: { courseId: { in: courses.map((c) => c.id) } },
    select: { id: true, courseId: true },
  });
  const moduleCourse = new Map(modules.map((m) => [m.id, m.courseId]));
  const durationByCourse = new Map<string, number>();
  for (const row of durations) {
    const courseId = moduleCourse.get(row.moduleId);
    if (!courseId) continue;
    durationByCourse.set(courseId, (durationByCourse.get(courseId) || 0) + (row._sum.durationSeconds || 0));
  }

  return json({
    ok: true,
    courses: courses.map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      summary: course.summary,
      level: course.level,
      priceKobo: course.priceKobo,
      compareAtKobo: course.compareAtKobo,
      thumbnailUrl: course.thumbnailUrl,
      durationSeconds: durationByCourse.get(course.id) || 0,
      durationLabel: course.durationLabel,
      lessons: lessonCount(course as never),
      students: course._count.enrollments,
      category: { name: course.category.name, slug: course.category.slug, accent: course.category.accent },
      instructor: course.instructor ? { name: course.instructor.name, headline: course.instructor.headline } : null,
    })),
  });
});
