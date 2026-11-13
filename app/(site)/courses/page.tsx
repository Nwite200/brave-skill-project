import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { db } from "@/lib/db";
import { listPublishedCourses } from "@/lib/courses";
import { CourseCard } from "@/components/ui/CourseCard";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "Course catalogue",
  description: "Browse Brave Skill programmes in solar, CCTV, electrical, networking and access control.",
};

export const dynamic = "force-dynamic";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const [categories, courses] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      include: { _count: { select: { courses: { where: { isPublished: true } } } } },
    }),
    listPublishedCourses({
      search: params.q,
      category: params.category,
      order: (params.sort as "newest" | "popular" | "price-asc" | "price-desc") || "newest",
    }),
  ]);

  const activeCategory = categories.find((c) => c.slug === params.category);

  return (
    <>
      <PageHero
        eyebrow="Course catalogue"
        title={
          activeCategory ? (
            <>{activeCategory.name} <span className="text-gradient">programmes.</span></>
          ) : (
            <>Practical skills, taught <span className="text-gradient">properly.</span></>
          )
        }
        subtitle={
          activeCategory?.description ||
          "Every programme blends video lessons, downloadable field guides, quizzes and a final assessment. Learn at your pace on web or Android."
        }
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Courses" }]}
      >
        <form action="/courses" className="mt-8 flex max-w-[520px] flex-col gap-2 sm:flex-row">
          {params.category && <input type="hidden" name="category" value={params.category} />}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5F6B7E]" />
            <input name="q" defaultValue={params.q} className="field h-11 pl-10" placeholder="Search courses, skills or topics" aria-label="Search courses" />
          </div>
          <button className="btn btn-light h-11 px-5 text-[13px]">Search</button>
        </form>
      </PageHero>

      <section className="py-10">
        <div className="container-bs">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/courses"
                className={`chip transition ${!params.category ? "border-[#873BFF]/40 bg-[#873BFF]/15 text-white" : "hover:border-white/25 hover:text-white"}`}
              >
                All tracks
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/courses?category=${category.slug}`}
                  className={`chip transition ${params.category === category.slug ? "border-[#873BFF]/40 bg-[#873BFF]/15 text-white" : "hover:border-white/25 hover:text-white"}`}
                >
                  {category.name}
                  <span className="text-[9.5px] text-[#5F6B7E]">{category._count.courses}</span>
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] text-[#6F7C90]"><SlidersHorizontal size={12} /> Sort</span>
              <div className="flex gap-1">
                {[
                  { key: "newest", label: "Newest" },
                  { key: "popular", label: "Popular" },
                  { key: "price-asc", label: "Price ↑" },
                  { key: "price-desc", label: "Price ↓" },
                ].map((option) => {
                  const query = new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.category ? { category: params.category } : {}), sort: option.key });
                  return (
                    <Link
                      key={option.key}
                      href={`/courses?${query.toString()}`}
                      className={`rounded-full px-3 py-1.5 text-[10.5px] transition ${(params.sort || "newest") === option.key ? "bg-white text-black" : "border border-white/10 text-[#8492A6] hover:text-white"}`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
            <p className="text-[11px] text-[#6F7C90]">
              <span className="text-white">{courses.length}</span> {courses.length === 1 ? "programme" : "programmes"}
              {params.q ? <> for “{params.q}”</> : null}
            </p>
            <p className="hidden text-[10.5px] text-[#5F6B7E] sm:block">Prices in Nigerian Naira · lifetime access</p>
          </div>

          {courses.length ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course as never} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-white/10 py-20 text-center">
              <p className="text-[14px] font-medium text-white">No courses match that search.</p>
              <p className="mx-auto mt-2 max-w-sm text-[12px] text-[#8492A6]">Try a different keyword or browse the full catalogue.</p>
              <Link href="/courses" className="btn btn-ghost btn-sm mt-5">Clear filters</Link>
            </div>
          )}

          <div className="mt-14 grid gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 sm:grid-cols-3">
            {[
              ["Not sure where to start?", "Talk to admissions and we will recommend a track for your market."],
              ["Learn on any device", "The same account works on the website and the Android app."],
              ["Pay in Naira, securely", "Checkout is handled by Paystack with server-side verification."],
            ].map(([title, body]) => (
              <div key={title}>
                <p className="text-[12px] font-medium text-white">{title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#7C8AA3]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
