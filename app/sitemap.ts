import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Built per request so the build doesn't need a database connection.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://academy.emyphilltech.com.ng";
  const staticPages = ["", "/courses", "/about", "/contact", "/faqs", "/testimonials", "/download", "/intro", "/privacy", "/terms", "/refunds", "/verify"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
    priority: path === "" ? 1 : 0.7,
  }));

  let courses: { slug: string; updatedAt: Date }[] = [];
  try {
    courses = await db.course.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } });
  } catch {
    courses = [];
  }

  return [
    ...staticPages,
    ...courses.map((course) => ({
      url: `${base}/courses/${course.slug}`,
      lastModified: course.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
