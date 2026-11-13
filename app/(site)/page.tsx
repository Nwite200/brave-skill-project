import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { listPublishedCourses } from "@/lib/courses";
import { Hero } from "@/components/marketing/Hero";
import {
  AppPromo,
  CategoryGrid,
  CertificateSection,
  CtaBand,
  FaqTeaser,
  FeaturedCourses,
  ProcessSection,
  SkillMarquee,
  TestimonialsSection,
  WhySection,
} from "@/components/marketing/HomeSections";

// This page queries PostgreSQL. Render it on the Worker at request time rather
// than trying to access production data during the build/prerender phase.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, featured, categories, testimonials, faqs] = await Promise.all([
    getSettings(),
    listPublishedCourses({ limit: 3, order: "popular" }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      include: { _count: { select: { courses: { where: { isPublished: true } } } } },
    }),
    db.testimonial.findMany({ where: { isPublished: true }, orderBy: { position: "asc" }, take: 3 }),
    db.faq.findMany({ where: { isPublished: true }, orderBy: { position: "asc" }, take: 5 }),
  ]);

  return (
    <>
      <Hero settings={settings} />
      <SkillMarquee />
      <FeaturedCourses courses={featured as never} />
      <CategoryGrid categories={categories} />
      <WhySection />
      <ProcessSection />
      <TestimonialsSection testimonials={testimonials} />
      <CertificateSection />
      <AppPromo settings={settings} />
      {faqs.length > 0 && <FaqTeaser faqs={faqs} />}
      <CtaBand />
    </>
  );
}
