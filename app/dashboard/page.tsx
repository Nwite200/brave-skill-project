import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Clock3,
  Flame,
  GraduationCap,
  Play,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollmentSummaries, listPublishedCourses } from "@/lib/courses";
import { formatDate, formatNaira, percent, timeAgo } from "@/lib/format";
import { CourseCover } from "@/components/ui/CourseCard";

export const metadata: Metadata = { title: "Student dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const summaries = await enrollmentSummaries(user.id);
  const active = summaries.filter((s) => s.status !== "REVOKED");
  const inProgress = active
    .filter((s) => s.status === "ACTIVE" && s.percent > 0)
    .sort((a, b) => b.percent - a.percent);
  const focusOrder = [...inProgress, ...active.filter((s) => !inProgress.includes(s))];
  const certificates = await db.certificate.count({ where: { userId: user.id, revokedAt: null } });

  const [watchSum, notifications, recommended] = await Promise.all([
    db.lessonProgress.aggregate({ where: { enrollment: { userId: user.id } }, _sum: { watchedSeconds: true } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    listPublishedCourses({ limit: 3, order: "popular" }),
  ]);

  const watchedMinutes = Math.round((watchSum._sum.watchedSeconds || 0) / 60);

  const nextLessons = await Promise.all(
    focusOrder.slice(0, 4).map(async (enrollment) => {
      const lesson = await db.lesson.findFirst({
        where: {
          module: { courseId: enrollment.courseId },
          isPublished: true,
          progress: { none: { enrollmentId: enrollment.id, completed: true } },
        },
        orderBy: [{ module: { position: "asc" } }, { position: "asc" }],
        include: { module: { select: { title: true, position: true } } },
      });
      return { enrollment, lesson };
    }),
  );

  const focus = nextLessons.find((item) => item.lesson) || nextLessons[0];
  const completedLessons = active.reduce((sum, e) => sum + e.completedLessons, 0);

  return (
    <div className="mx-auto max-w-[1180px]">
      {params.welcome && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#873BFF]/25 bg-[#873BFF]/[0.08] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#873BFF]/20 text-[#C9B8FF]"><Sparkles size={16} /></span>
            <div>
              <p className="text-[12.5px] font-medium text-white">Welcome to Brave Skill, {user.name.split(" ")[0]}.</p>
              <p className="text-[10.5px] text-[#93A1B6]">Your account is ready. Start with a course that matches your goals.</p>
            </div>
          </div>
          <Link href="/courses" className="btn btn-primary btn-sm h-9">Explore courses</Link>
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6F7C90]">{formatDate(new Date(), false)}</p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.035em] text-white">
            Welcome back, {user.name.split(" ")[0]}.
          </h1>
          <p className="mt-1 text-[12px] text-[#8492A6]">
            {active.length ? `You have ${active.length} active ${active.length === 1 ? "programme" : "programmes"}. Keep the momentum going.` : "Your learning journey starts with a single lesson."}
          </p>
        </div>
        <Link href="/courses" className="btn btn-ghost btn-sm h-9 self-start">Browse catalogue <ArrowUpRight size={12} /></Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: BookOpen, label: "Active courses", value: active.length, sub: `${summaries.length} total enrolments`, tint: "#873BFF" },
          { icon: Target, label: "Lessons completed", value: completedLessons, sub: "across all programmes", tint: "#20D9E8" },
          { icon: Clock3, label: "Learning time", value: `${watchedMinutes}m`, sub: "tracked video time", tint: "#1677FF" },
          { icon: GraduationCap, label: "Certificates", value: certificates, sub: "verified credentials", tint: "#10C99A" },
        ].map((stat) => (
          <div key={stat.label} className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-transparent p-4">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.12] blur-2xl" style={{ background: stat.tint }} />
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${stat.tint}18`, color: stat.tint }}><stat.icon size={14} /></span>
              <TrendingUp size={12} className="text-[#3F4A5C]" />
            </div>
            <p className="num mt-3 text-[24px] font-semibold tracking-[-0.03em] text-white">{stat.value}</p>
            <p className="text-[10.5px] text-[#8492A6]">{stat.label}</p>
            <p className="mt-0.5 text-[9px] text-[#5F6B7E]">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-5">
          {focus?.lesson ? (
            <div className="relative overflow-hidden rounded-2xl border border-[#873BFF]/25 bg-gradient-to-br from-[#171029] via-[#0D0F1C] to-[#0A0C16]">
              <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#873BFF]/25 blur-[70px]" />
              <div className="relative p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="chip border-[#873BFF]/25 bg-[#873BFF]/12 text-[#C9B8FF]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#20D9E8]" /> Continue learning
                    </span>
                    <h2 className="mt-3 max-w-[440px] text-[18px] font-semibold leading-snug tracking-[-0.02em] text-white">
                      {focus.enrollment.course.title}
                    </h2>
                    <p className="mt-1.5 text-[11.5px] text-[#93A1B6]">
                      Module {focus.lesson.module.position + 1} · {focus.lesson.module.title}
                    </p>
                  </div>
                  <CourseCover compact title={focus.enrollment.course.title} accent={focus.enrollment.course.category?.accent || "#873BFF"} category={focus.enrollment.course.category?.name || "Course"} className="hidden h-16 w-24 rounded-xl border border-white/10 sm:block" />
                </div>

                <div className="mt-5 rounded-xl border border-white/[0.08] bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-[#6F7C90]">Next lesson</p>
                      <p className="truncate text-[11.5px] text-[#D6DFEC]">{focus.lesson.title}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-[#7C8AA3]">{focus.lesson.durationSeconds ? `${Math.round(focus.lesson.durationSeconds / 60)} min` : ""}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#873BFF] to-[#20D9E8]" style={{ width: `${focus.enrollment.percent}%` }} />
                    </div>
                    <span className="num text-[9px] text-[#9AA6BA]">{focus.enrollment.percent}%</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link href={`/dashboard/courses/${focus.enrollment.courseId}?lesson=${focus.lesson.id}`} className="btn btn-primary btn-sm h-9">
                    <Play size={12} className="fill-white" /> Resume lesson
                  </Link>
                  <Link href={`/dashboard/courses/${focus.enrollment.courseId}`} className="btn btn-ghost btn-sm h-9">Open course</Link>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-[#6F7C90]">
                    <Flame size={12} className="text-[#FBBF24]" /> {focus.enrollment.completedLessons} of {focus.enrollment.totalLessons} lessons complete
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <BookOpen size={24} className="mx-auto text-[#4F5B6E]" />
              <p className="mt-3 text-[14px] font-medium text-white">No active course yet</p>
              <p className="mx-auto mt-1 max-w-xs text-[11.5px] leading-relaxed text-[#7C8AA3]">Choose a programme from the catalogue to start learning on web and Android.</p>
              <Link href="/courses" className="btn btn-primary btn-sm mt-4">Browse courses</Link>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-white">Your programmes</h2>
              <Link href="/dashboard/courses" className="text-[10.5px] text-[#8492A6] hover:text-white">View all →</Link>
            </div>
            <div className="mt-3 space-y-2">
              {active.slice(0, 4).map((enrollment) => (
                <Link
                  key={enrollment.id}
                  href={`/dashboard/courses/${enrollment.courseId}`}
                  className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.035]"
                >
                  <CourseCover compact title={enrollment.course.title} accent={enrollment.course.category?.accent || "#873BFF"} category={enrollment.course.category?.name || "Course"} className="h-11 w-16 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-white">{enrollment.course.title}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10 sm:w-32">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#873BFF] to-[#20D9E8]" style={{ width: `${enrollment.percent}%` }} />
                      </div>
                      <span className="num text-[9px] text-[#6F7C90]">{enrollment.percent}%</span>
                    </div>
                  </div>
                  <span className="hidden shrink-0 text-[9.5px] text-[#6F7C90] sm:block">
                    {enrollment.status === "COMPLETED" ? "Completed" : `${enrollment.completedLessons}/${enrollment.totalLessons} lessons`}
                  </span>
                  <ArrowRight size={13} className="shrink-0 text-[#4F5B6E] transition group-hover:text-white" />
                </Link>
              ))}
              {!active.length && <p className="rounded-xl border border-white/[0.06] p-4 text-[11px] text-[#6F7C90]">No enrolments yet.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[12px] font-semibold text-white"><Bell size={13} className="text-[#20D9E8]" /> Recent activity</h2>
              <Link href="/dashboard/notifications" className="text-[9.5px] text-[#6F7C90] hover:text-white">All</Link>
            </div>
            <div className="mt-3 space-y-2.5">
              {notifications.slice(0, 4).map((notification) => (
                <div key={notification.id} className="flex gap-2.5">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${notification.readAt ? "bg-[#3F4A5C]" : "bg-[#873BFF]"}`} />
                  <div className="min-w-0">
                    <p className="truncate text-[10.5px] font-medium text-[#D6DFEC]">{notification.title}</p>
                    <p className="truncate text-[9.5px] text-[#6F7C90]">{notification.body}</p>
                    <p className="mt-0.5 text-[8.5px] text-[#4F5B6E]">{timeAgo(notification.createdAt)}</p>
                  </div>
                </div>
              ))}
              {!notifications.length && <p className="text-[10.5px] text-[#5F6B7E]">Nothing yet. Your updates will appear here.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-semibold text-white">Recommended for you</h2>
              <Link href="/courses" className="text-[9.5px] text-[#6F7C90] hover:text-white">All</Link>
            </div>
            <div className="mt-3 space-y-2">
              {recommended.filter((c) => !active.some((e) => e.courseId === c.id)).slice(0, 3).map((course) => (
                <Link key={course.id} href={`/courses/${course.slug}`} className="group flex items-center gap-2.5 rounded-lg border border-white/[0.06] p-2 transition hover:bg-white/[0.03]">
                  <CourseCover compact title={course.title} accent={course.category.accent || "#873BFF"} category={course.category.name} className="h-9 w-12 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-medium text-white">{course.title}</p>
                    <p className="num text-[9px] text-[#6F7C90]">{course.priceKobo === 0 ? "Free" : formatNaira(course.priceKobo)}</p>
                  </div>
                  <ArrowUpRight size={11} className="text-[#3F4A5C] group-hover:text-white" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#10C99A]/20 bg-[#10C99A]/[0.05] p-4">
            <p className="flex items-center gap-2 text-[11px] font-medium text-[#7FE9C8]"><GraduationCap size={13} /> Certificate ready?</p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#93A1B6]">Pass your final assessment to generate a verifiable certificate you can share with clients.</p>
            <Link href="/dashboard/certificates" className="mt-3 inline-flex text-[10px] text-[#C9B8FF] hover:text-white">View certificates →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
