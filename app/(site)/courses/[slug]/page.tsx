import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Globe2,
  GraduationCap,
  Lock,
  PlayCircle,
  ShieldCheck,
  Smartphone,
  Star,
  Users,
  Video,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCourseBySlug, listPublishedCourses, courseJsonLd, courseCardInclude } from "@/lib/courses";
import { getSessionUser, isStaff } from "@/lib/auth";
import { formatDuration, formatNaira, levelLabel } from "@/lib/format";
import { CourseCover, CourseCard } from "@/components/ui/CourseCard";
import { PurchasePanel } from "@/components/courses/PurchasePanel";
import { PageHero } from "@/components/site/PageHero";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await db.course.findFirst({ where: { slug, isPublished: true } });
  if (!course) return { title: "Course not found" };
  return {
    title: course.title,
    description: course.summary,
    openGraph: { title: course.title, description: course.summary, images: course.thumbnailUrl ? [course.thumbnailUrl] : undefined },
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [course, user] = await Promise.all([getCourseBySlug(slug), getSessionUser()]);
  if (!course) notFound();

  const lessons = course.modules.flatMap((m) => m.lessons);
  const totalSeconds = lessons.reduce((sum, l) => sum + l.durationSeconds, 0);
  const enrollment = user
    ? await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } })
    : null;
  const enrolled = Boolean(enrollment && enrollment.status !== "REVOKED");

  const related = await db.course.findMany({
    where: { isPublished: true, id: { not: course.id }, categoryId: course.categoryId },
    include: courseCardInclude,
    take: 3,
  });

  const outcomes = course.outcomes.split("\n").map((s) => s.trim()).filter(Boolean);
  const requirements = course.requirements.split("\n").map((s) => s.trim()).filter(Boolean);
  const exam = course.quizzes.find((q) => q.type === "EXAM");

  return (
    <>
      <PageHero
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Courses", href: "/courses" },
          { label: course.category.name, href: `/courses?category=${course.category.slug}` },
        ]}
        eyebrow={course.category.name}
        title={course.title}
        subtitle={course.summary}
      >
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-[#8492A6]">
          <span className="flex items-center gap-1.5"><Star size={13} className="fill-[#FBBF24] text-[#FBBF24]" /> 4.9 rating</span>
          <span className="flex items-center gap-1.5"><Users size={13} /> {course._count.enrollments} enrolled</span>
          <span className="flex items-center gap-1.5"><Video size={13} /> {lessons.length} lessons</span>
          <span className="flex items-center gap-1.5"><Clock3 size={13} /> {course.durationLabel || formatDuration(totalSeconds)}</span>
          <span className="flex items-center gap-1.5"><BadgeCheck size={13} /> {levelLabel[course.level]}</span>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em]">Updated 2026</span>
        </div>
      </PageHero>

      <section className="py-10">
        <div className="container-bs grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
              {course.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnailUrl} alt={course.title} className="aspect-[16/8] w-full object-cover" />
              ) : (
                <CourseCover
                  title={course.title}
                  accent={course.category.accent || "#873BFF"}
                  category={course.category.name}
                  className="aspect-[16/8] w-full"
                />
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[13px] font-semibold">
                {(course.instructor?.name || "Brave Skill").slice(0, 1)}
              </span>
              <div className="mr-auto">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#6F7C90]">Instructor</p>
                <p className="text-[12.5px] font-medium text-white">{course.instructor?.name || "Brave Skill Faculty"}</p>
              </div>
              <div className="hidden h-8 w-px bg-white/[0.08] sm:block" />
              <div className="hidden sm:block">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#6F7C90]">Format</p>
                <p className="text-[12px] text-[#C2CCDD]">Video · PDF · Assessment</p>
              </div>
            </div>

            {outcomes.length > 0 && (
              <div className="mt-10">
                <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-white">What you will be able to do</h2>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {outcomes.map((outcome) => (
                    <div key={outcome} className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#10C99A]" />
                      <span className="text-[12px] leading-relaxed text-[#B9C3D4]">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10">
              <div className="flex items-end justify-between">
                <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-white">Course curriculum</h2>
                <span className="text-[10.5px] text-[#6F7C90]">{course.modules.length} modules · {lessons.length} lessons</span>
              </div>
              <p className="mt-2 text-[12px] text-[#7C8AA3]">
                {lessons.filter((l) => l.isPreview).length} preview lessons are free to watch. Full access unlocks after enrolment.
              </p>

              <div className="mt-5 space-y-2.5">
                {course.modules.map((module, moduleIndex) => (
                  <details key={module.id} open={moduleIndex === 0} className="group overflow-hidden rounded-xl border border-white/[0.08] bg-[#0B0E18]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 transition hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[10px] text-[#C9B8FF]">
                          {String(moduleIndex + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-white">{module.title}</p>
                          <p className="text-[10px] text-[#6F7C90]">{module.lessons.length} lessons · {formatDuration(module.lessons.reduce((s, l) => s + l.durationSeconds, 0))}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] text-[#6F7C90] transition group-open:rotate-180">▾</span>
                    </summary>
                    <div className="border-t border-white/[0.06] p-2">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const canPreview = lesson.isPreview;
                        return (
                          <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 transition hover:bg-white/[0.02]">
                            <div className="flex min-w-0 items-center gap-2.5">
                              {lesson.type === "PDF" ? <FileText size={13} className="shrink-0 text-[#20D9E8]" /> : lesson.type === "TEXT" ? <BookOpen size={13} className="shrink-0 text-[#10C99A]" /> : canPreview ? <PlayCircle size={13} className="shrink-0 text-[#C9B8FF]" /> : <Lock size={13} className="shrink-0 text-[#4B5668]" />}
                              <span className={`truncate text-[11.5px] ${canPreview ? "text-[#D6DFEC]" : "text-[#8492A6]"}`}>
                                {String(moduleIndex + 1)}.{String(lessonIndex + 1)} {lesson.title}
                              </span>
                              {lesson.isPreview && !enrolled && (
                                <span className="shrink-0 rounded-full border border-[#20D9E8]/25 bg-[#20D9E8]/10 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.1em] text-[#7FE9F2]">Preview</span>
                              )}
                            </div>
                            <span className="shrink-0 text-[10px] text-[#5F6B7E]">{formatDuration(lesson.durationSeconds)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-white/[0.08] bg-[#0B0E18] p-6">
              <h2 className="text-[17px] font-semibold text-white">About this programme</h2>
              <div className="prose-bs mt-4">
                {course.description.split("\n").filter(Boolean).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>

              {requirements.length > 0 && (
                <>
                  <h3 className="mt-8 text-[13px] font-semibold text-white">Requirements</h3>
                  <ul className="mt-3 grid gap-2">
                    {requirements.map((req) => (
                      <li key={req} className="flex items-start gap-2 text-[12px] text-[#9AA6BA]">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#873BFF]" /> {req}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Globe2, label: "Language", value: "English" },
                  { icon: Smartphone, label: "Access", value: "Web + Android" },
                  { icon: ShieldCheck, label: "Certificate", value: course.certificateEnabled ? "Included" : "Not included" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <item.icon size={14} className="text-[#873BFF]" />
                    <p className="mt-2 text-[9px] uppercase tracking-[0.14em] text-[#6F7C90]">{item.label}</p>
                    <p className="text-[11.5px] text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {exam && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#873BFF]/20 bg-[#873BFF]/[0.06] p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#873BFF]/20 text-[#C9B8FF]"><GraduationCap size={18} /></span>
                  <div>
                    <p className="text-[12.5px] font-medium text-white">Final assessment</p>
                    <p className="text-[10.5px] text-[#9AA6BA]">{exam._count.questions} questions · pass mark {exam.passMark}% · {exam.timeLimitMinutes ? `${exam.timeLimitMinutes} min limit` : "no time limit"}</p>
                  </div>
                </div>
                <span className="chip border-[#873BFF]/25 bg-[#873BFF]/10 text-[#C9B8FF]">Certificate on pass</span>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <PurchasePanel
              course={{
                id: course.id,
                slug: course.slug,
                title: course.title,
                priceKobo: course.priceKobo,
                compareAtKobo: course.compareAtKobo,
                lessonCount: lessons.length,
                certificateEnabled: course.certificateEnabled,
              }}
              enrolled={enrolled}
              isStaffUser={Boolean(user && isStaff(user.role))}
              isAuthenticated={Boolean(user)}
              redirectPath={`/courses/${course.slug}`}
            />

            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6F7C90]">This programme includes</p>
              <div className="mt-3 space-y-2.5">
                {[
                  { icon: Video, label: `${lessons.filter((l) => l.type === "VIDEO").length} video lessons` },
                  { icon: FileText, label: "Downloadable PDF field guides" },
                  { icon: Download, label: "Offline-friendly materials" },
                  { icon: BadgeCheck, label: "Quizzes and final assessment" },
                  { icon: Smartphone, label: "Android app access" },
                  { icon: Clock3, label: "Lifetime access and updates" },
                ].map((item) => (
                  <p key={item.label} className="flex items-center gap-2.5 text-[11.5px] text-[#A2AFC2]">
                    <item.icon size={13} className="text-[#20D9E8]" /> {item.label}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <p className="text-[11px] font-medium text-white">Need help deciding?</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#7C8AA3]">Speak with admissions about the right track for your goals.</p>
              <Link href="/contact" className="btn btn-ghost btn-sm mt-3 w-full">Contact admissions</Link>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="container-bs mt-16 border-t border-white/[0.06] pt-12">
            <div className="flex items-end justify-between">
              <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-white">Continue this track</h2>
              <Link href={`/courses?category=${course.category.slug}`} className="text-[11.5px] text-[#8492A6] hover:text-white">View all {course.category.name} →</Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => <CourseCard key={item.id} course={item as never} />)}
            </div>
          </div>
        )}
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd(course)) }} />
    </>
  );
}
