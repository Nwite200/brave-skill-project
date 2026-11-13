import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { getSettings } from "@/lib/settings";
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

// Public landing page is database-independent for the initial frontend launch.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Frontend-first launch: render the public marketing experience without
  // requiring a database. Dynamic academy content will be enabled after D1
  // is provisioned and connected.
  const settings = await getSettings();
  const featured: never[] = [];
  const categories: never[] = [];
  const testimonials: never[] = [];
  const faqs: never[] = [];

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
