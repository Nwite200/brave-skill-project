import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, GraduationCap, PlayCircle, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { enrollmentSummaries } from "@/lib/courses";
import { CourseCover } from "@/components/ui/CourseCard";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "My courses" };
export const dynamic = "force-dynamic";

export default async function MyCoursesPage() {
  const user = await requireUser();
  const summaries = await enrollmentSummaries(user.id);
  const active = summaries.filter((s) => s.status !== "REVOKED");

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-white">My courses</h1>
          <p className="mt-1 text-[12px] text-[#8492A6]">{active.length} {active.length === 1 ? "programme" : "programmes"} in your learning portal.</p>
        </div>
        <Link href="/courses" className="btn btn-ghost btn-sm h-9">Find another course <ArrowRight size={12} /></Link>
      </div>

      {active.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((enrollment) => (
            <article key={enrollment.id} className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0E18] transition hover:border-white/15">
              <Link href={`/dashboard/courses/${enrollment.courseId}`} className="relative block aspect-[16/8] overflow-hidden">
                <CourseCover title={enrollment.course.title} accent={enrollment.course.category?.accent || "#873BFF"} category={enrollment.course.category?.name || "Course"} className="h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E18] via-transparent to-transparent" />
                <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[8.5px] font-medium uppercase tracking-[0.12em] text-white/85 backdrop-blur">
                  {enrollment.status === "COMPLETED" ? "Completed" : "In progress"}
                </span>
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="text-[13.5px] font-semibold leading-snug text-white">{enrollment.course.title}</h2>
                <p className="mt-1 text-[10px] text-[#6F7C90]">Enrolled {formatDate(enrollment.enrolledAt)}</p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#8492A6]">{enrollment.completedLessons} of {enrollment.totalLessons} lessons</span>
                    <span className="num text-white">{enrollment.percent}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#873BFF] to-[#20D9E8]" style={{ width: `${enrollment.percent}%` }} />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                  <Link href={`/dashboard/courses/${enrollment.courseId}`} className="btn btn-primary btn-sm h-8 flex-1">
                    <PlayCircle size={12} /> {enrollment.percent > 0 ? "Continue" : "Start"} learning
                  </Link>
                  {enrollment.certificate && (
                    <Link href="/dashboard/certificates" className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/10 text-emerald-300" title="Certificate issued">
                      <GraduationCap size={13} />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] text-[#6F7C90]"><Sparkles size={20} /></span>
          <p className="mt-4 text-[15px] font-medium text-white">Your learning portal is empty</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-[#8492A6]">Enrol in a programme to unlock lessons, assessments and your certificate path.</p>
          <Link href="/courses" className="btn btn-primary mt-5">Explore courses</Link>
        </div>
      )}

      {active.some((e) => e.status === "COMPLETED") && (
        <div className="mt-10">
          <h2 className="text-[14px] font-semibold text-white">Completed programmes</h2>
          <div className="mt-3 space-y-2">
            {active.filter((e) => e.status === "COMPLETED").map((enrollment) => (
              <Link key={enrollment.id} href={`/dashboard/courses/${enrollment.courseId}`} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300"><GraduationCap size={14} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-white">{enrollment.course.title}</p>
                  <p className="flex items-center gap-1 text-[9.5px] text-[#6F7C90]"><Clock3 size={9} /> Completed {formatDate(enrollment.completedAt)}</p>
                </div>
                <ArrowRight size={13} className="text-[#4F5B6E]" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
