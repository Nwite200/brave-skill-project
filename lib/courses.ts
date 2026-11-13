import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { percent } from "@/lib/format";

export const courseCardInclude = {
  category: { select: { name: true, slug: true, accent: true } },
  instructor: { select: { name: true, headline: true, avatarUrl: true } },
  _count: { select: { enrollments: true } },
  modules: {
    where: { isPublished: true },
    select: { _count: { select: { lessons: { where: { isPublished: true } } } } },
  },
} satisfies Prisma.CourseInclude;

export type CourseCard = Prisma.CourseGetPayload<{ include: typeof courseCardInclude }>;

export const lessonCount = (course: CourseCard) =>
  course.modules.reduce((sum, m) => sum + m._count.lessons, 0);

export const totalDuration = async (courseId: string) => {
  const rows = await db.lesson.aggregate({
    where: { module: { courseId }, isPublished: true },
    _sum: { durationSeconds: true },
  });
  return rows._sum.durationSeconds ?? 0;
};

export async function listPublishedCourses(params: {
  search?: string;
  category?: string;
  featured?: boolean;
  limit?: number;
  order?: "newest" | "popular" | "price-asc" | "price-desc";
} = {}) {
  const where: Prisma.CourseWhereInput = { isPublished: true };
  if (params.featured) where.isFeatured = true;
  if (params.category) where.category = { slug: params.category };
  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { summary: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ];
  }
  const orderBy: Prisma.CourseOrderByWithRelationInput =
    params.order === "popular"
      ? { enrollments: { _count: "desc" } }
      : params.order === "price-asc"
        ? { priceKobo: "asc" }
        : params.order === "price-desc"
          ? { priceKobo: "desc" }
          : { publishedAt: "desc" };

  return db.course.findMany({
    where,
    include: courseCardInclude,
    orderBy: [{ isFeatured: "desc" }, orderBy],
    take: params.limit,
  });
}

export async function getCourseBySlug(slug: string) {
  return db.course.findFirst({
    where: { slug, isPublished: true },
    include: {
      category: true,
      instructor: { select: { id: true, name: true, headline: true, bio: true, avatarUrl: true, expertise: true } },
      modules: {
        where: { isPublished: true },
        orderBy: { position: "asc" },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { position: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              durationSeconds: true,
              isPreview: true,
              position: true,
            },
          },
        },
      },
      quizzes: {
        where: { isPublished: true },
        select: { id: true, title: true, type: true, passMark: true, timeLimitMinutes: true, _count: { select: { questions: true } } },
      },
      _count: { select: { enrollments: true } },
    },
  });
}

export async function getEnrollmentForCourse(userId: string, courseId: string) {
  return db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: {
      progress: true,
      certificate: true,
    },
  });
}

export async function courseProgress(userId: string, courseId: string) {
  const [totalLessons, completed] = await Promise.all([
    db.lesson.count({ where: { module: { courseId }, isPublished: true } }),
    db.lessonProgress.count({
      where: { completed: true, enrollment: { userId, courseId } },
    }),
  ]);
  return { totalLessons, completed, percent: percent(completed, totalLessons) };
}

export async function enrollmentSummaries(userId: string) {
  const enrollments = await db.enrollment.findMany({
    where: { userId },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: {
        include: {
          category: { select: { name: true, accent: true } },
          instructor: { select: { name: true } },
          modules: { select: { _count: { select: { lessons: { where: { isPublished: true } } } } } },
        },
      },
      progress: { select: { lessonId: true, completed: true } },
      certificate: { select: { serial: true, issuedAt: true } },
    },
  });

  return enrollments.map((e) => {
    const totalLessons = e.course.modules.reduce((s, m) => s + m._count.lessons, 0);
    const completed = e.progress.filter((p) => p.completed).length;
    return {
      ...e,
      totalLessons,
      completedLessons: completed,
      percent: percent(completed, totalLessons),
    };
  });
}

export function courseJsonLd(course: {
  title: string;
  summary: string;
  priceKobo: number;
  slug: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.summary,
    provider: { "@type": "Organization", name: "Brave Skill", sameAs: "https://academy.emyphilltech.com.ng" },
    offers: {
      "@type": "Offer",
      price: (course.priceKobo / 100).toFixed(2),
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
      url: `https://academy.emyphilltech.com.ng/courses/${course.slug}`,
    },
  };
}
