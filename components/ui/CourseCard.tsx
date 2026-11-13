import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Clock3,
  Cpu,
  Fingerprint,
  Radio,
  Sun,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { formatDuration, formatNaira, levelLabel } from "@/lib/format";

export const categoryIcons: Record<string, React.ElementType> = {
  solar: Sun,
  cctv: Radio,
  security: Radio,
  electrical: Zap,
  networking: Cpu,
  intercom: Fingerprint,
  access: Fingerprint,
  general: BookOpen,
};

export function CourseCover({
  title,
  accent = "#873BFF",
  category = "Course",
  icon = "sparkles",
  className = "",
  compact = false,
}: {
  title: string;
  accent?: string;
  category?: string;
  icon?: string;
  className?: string;
  compact?: boolean;
}) {
  const Icon = categoryIcons[icon] || BookOpen;
  if (compact) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden ${className}`}
        style={{
          background: `radial-gradient(120% 120% at 20% 0%, ${accent}55 0%, transparent 65%), linear-gradient(150deg, #161C2E 0%, #0A0C15 100%)`,
        }}
        aria-hidden
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-black/25 text-white/70">
          <Icon size={13} />
        </span>
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
      </div>
    );
  }
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(120% 110% at 10% 0%, ${accent}46 0%, transparent 55%), radial-gradient(100% 100% at 90% 100%, #20D9E81f 0%, transparent 60%), linear-gradient(150deg, #141a2b 0%, #0a0c15 100%)`,
      }}
    >
      <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "34px 34px", maskImage: "radial-gradient(120% 120% at 50% 20%, #000 20%, transparent 80%)" }} />
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full blur-2xl" style={{ background: accent, opacity: 0.35 }} />
      <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 400 220" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`cover-${icon}-${compact ? "c" : "n"}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor={accent} stopOpacity="0.9" />
            <stop offset="1" stopColor="#20D9E8" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path d="M-20 190 C 120 120, 240 240, 420 90" fill="none" stroke={`url(#cover-${icon}-${compact ? "c" : "n"})`} strokeWidth="1.2" />
        <path d="M-20 210 C 140 150, 260 250, 430 120" fill="none" stroke={`url(#cover-${icon}-${compact ? "c" : "n"})`} strokeWidth="0.8" opacity="0.6" />
        <circle cx="322" cy="64" r="38" fill="none" stroke={accent} strokeOpacity="0.25" strokeWidth="1" />
        <circle cx="322" cy="64" r="56" fill="none" stroke="#20D9E8" strokeOpacity="0.12" strokeWidth="0.8" />
      </svg>
      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
            {category}
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-white/85 backdrop-blur">
            <Icon size={16} />
          </span>
        </div>
        {!compact && (
          <p className="max-w-[85%] text-[15px] font-semibold leading-snug tracking-[-0.02em] text-white/95 drop-shadow">
            {title}
          </p>
        )}
      </div>
    </div>
  );
}

export type CourseCardData = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  priceKobo: number;
  compareAtKobo: number;
  level: string;
  durationLabel: string;
  thumbnailUrl: string | null;
  category: { name: string; accent: string | null };
  instructor: { name: string } | null;
  _count: { enrollments: number };
  modules: { _count: { lessons: number } }[];
};

export function CourseCard({ course, index = 0 }: { course: CourseCardData; index?: number }) {
  const lessons = course.modules.reduce((s, m) => s + m._count.lessons, 0);
  const accent = course.category.accent || "#873BFF";
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0C0E18] transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.16] hover:shadow-[0_30px_70px_-40px_rgba(135,59,255,.7)]">
      <Link href={`/courses/${course.slug}`} className="block">
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {course.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          ) : (
            <CourseCover
              title={course.title}
              accent={accent}
              category={course.category.name}
              icon={(course.category.name || "").toLowerCase().includes("solar") ? "solar" : (course.category.name || "").toLowerCase().includes("cctv") ? "cctv" : (course.category.name || "").toLowerCase().includes("elect") ? "electrical" : (course.category.name || "").toLowerCase().includes("net") ? "networking" : "general"}
              className="h-full w-full"
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0C0E18] via-transparent to-transparent opacity-80" />
          <div className="absolute left-4 top-4 flex gap-1.5">
            <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white/85 backdrop-blur">
              {levelLabel[course.level] || course.level}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: accent }}>
          {course.category.name}
        </div>
        <Link href={`/courses/${course.slug}`}>
          <h3 className="text-[16.5px] font-semibold leading-snug tracking-[-0.025em] text-white transition group-hover:text-white">
            {course.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-[#8B98AD]">{course.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#7C8AA3]">
          <span className="inline-flex items-center gap-1.5"><Video size={12} /> {lessons} lessons</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 size={12} /> {course.durationLabel || "Self-paced"}</span>
          <span className="inline-flex items-center gap-1.5"><Users size={12} /> {course._count.enrollments}</span>
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-white/[0.06] pt-4">
          <div>
            {course.priceKobo === 0 ? (
              <span className="text-[15px] font-semibold text-[#10C99A]">Free</span>
            ) : (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="num text-[16px] font-semibold text-white">{formatNaira(course.priceKobo)}</span>
                {course.compareAtKobo > course.priceKobo && (
                  <span className="num text-[11px] text-[#5F6B7E] line-through">{formatNaira(course.compareAtKobo)}</span>
                )}
              </div>
            )}
          </div>
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-[11.5px] font-medium text-white/90 transition group-hover:border-[#873BFF]/50 group-hover:bg-[#873BFF]/15"
          >
            View course <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function MiniCourseCard({ course }: { course: CourseCardData }) {
  const lessons = course.modules.reduce((s, m) => s + m._count.lessons, 0);
  return (
    <Link href={`/courses/${course.slug}`} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-2.5 transition hover:border-white/20 hover:bg-white/[0.04]">
      <CourseCover compact title={course.title} accent={course.category.accent || "#873BFF"} category={course.category.name} className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-white">{course.title}</p>
        <p className="text-[10.5px] text-[#7C8AA3]">{lessons} lessons · {formatDuration(0)}</p>
      </div>
    </Link>
  );
}
