import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHero({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  children,
  align = "left",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  children?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06] pb-14 pt-12 sm:pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-30%] h-[440px] w-[760px] -translate-x-1/2 rounded-full bg-[#873BFF]/[0.14] blur-[110px]" />
        <div className="absolute inset-0 grid-bg opacity-40" />
      </div>
      <div className={`container-bs relative ${align === "center" ? "text-center" : ""}`}>
        {breadcrumbs && (
          <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-[10.5px] text-[#6F7C90]" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.label} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={11} className="text-[#3F4A5C]" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition hover:text-white">{crumb.label}</Link>
                ) : (
                  <span className="text-[#A2AFC2]">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && (
          <div className={`flex items-center gap-3 ${align === "center" ? "justify-center" : ""}`}>
            <span className="h-px w-7 bg-gradient-to-r from-[#873BFF] to-transparent" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#B79BFF]">{eyebrow}</span>
          </div>
        )}
        <h1 className={`mt-5 max-w-[840px] text-[clamp(2.1rem,4.6vw,3.7rem)] font-semibold leading-[1.04] tracking-[-0.045em] text-white ${align === "center" ? "mx-auto" : ""}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`mt-4 max-w-[620px] text-[13.5px] leading-[1.8] text-[#93A1B6] ${align === "center" ? "mx-auto" : ""}`}>{subtitle}</p>
        )}
        {children}
      </div>
    </section>
  );
}
