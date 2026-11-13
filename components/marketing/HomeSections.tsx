import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Download,
  Fingerprint,
  GraduationCap,
  Layers3,
  LockKeyhole,
  Play,
  Quote,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { CourseCard, type CourseCardData } from "@/components/ui/CourseCard";
import { Reveal } from "@/components/ui/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import type { Faq, Testimonial } from "@prisma/client";

export function SectionLabel({ children, tone = "purple" }: { children: React.ReactNode; tone?: "purple" | "cyan" | "emerald" }) {
  const colors = {
    purple: "text-[#B79BFF] from-[#873BFF] to-transparent",
    cyan: "text-[#7FE9F2] from-[#20D9E8] to-transparent",
    emerald: "text-[#7FE9C8] from-[#10C99A] to-transparent",
  }[tone];
  return (
    <div className="flex items-center gap-3">
      <span className={`h-px w-8 bg-gradient-to-r ${colors.split(" ").slice(1).join(" ")}`} />
      <span className={`text-[10px] font-semibold uppercase tracking-[0.26em] ${colors.split(" ")[0]}`}>{children}</span>
    </div>
  );
}

const SKILLS = [
  "Solar & Inverter", "CCTV & Surveillance", "Electrical Installation", "Fiber Optics",
  "Access Control", "Intercom Systems", "Smart Home", "Inverter Repair", "Network Security",
  "Cable Management", "Site Survey", "Battery Storage",
];

export function SkillMarquee() {
  return (
    <section className="relative border-y border-white/[0.06] bg-[#07080F] py-5">
      <div className="marquee-mask overflow-hidden">
        <div className="marquee-track items-center gap-8">
          {[...SKILLS, ...SKILLS].map((skill, i) => (
            <span key={`${skill}-${i}`} className="flex items-center gap-8 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.2em] text-[#5F6B7E]">
              {skill}
              <span className="h-1 w-1 rounded-full bg-[#873BFF]/70" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeaturedCourses({ courses }: { courses: CourseCardData[] }) {
  return (
    <section className="relative py-24">
      <div className="pointer-events-none absolute left-1/2 top-20 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[#873BFF]/[0.07] blur-[120px]" />
      <div className="container-bs relative">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Reveal>
            <SectionLabel>Featured programmes</SectionLabel>
            <h2 className="mt-5 max-w-[600px] text-[clamp(2rem,3.6vw,3.1rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-white">
              Skills that get you <span className="text-gradient">hired, paid and trusted.</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="flex items-center gap-4">
              <p className="max-w-[260px] text-[12.5px] leading-relaxed text-[#8492A6]">
                Every programme is built around real installations, real clients and real site conditions.
              </p>
              <Link href="/courses" className="btn btn-ghost btn-sm h-10 shrink-0">
                All courses <ArrowUpRight size={13} />
              </Link>
            </div>
          </Reveal>
        </div>

        {courses.length ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, index) => (
              <Reveal key={course.id} delay={index * 70}>
                <CourseCard course={course} index={index} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-[#8492A6]">
            Course catalogue is being prepared. Please check back shortly.
          </div>
        )}
      </div>
    </section>
  );
}

const CATEGORY_META: Record<string, { icon: React.ElementType; tint: string; blurb: string }> = {
  solar: { icon: Sun, tint: "#FBBF24", blurb: "Design, install and maintain solar power systems." },
  cctv: { icon: ScanLine, tint: "#20D9E8", blurb: "Surveillance from site survey to remote viewing." },
  security: { icon: ScanLine, tint: "#20D9E8", blurb: "Surveillance and electronic security systems." },
  electrical: { icon: Zap, tint: "#873BFF", blurb: "Safe wiring, distribution boards and fault finding." },
  networking: { icon: Wifi, tint: "#1677FF", blurb: "Structured cabling, fibre splicing and networks." },
  intercom: { icon: Fingerprint, tint: "#10C99A", blurb: "Intercom, access control and smart entry." },
  access: { icon: Fingerprint, tint: "#10C99A", blurb: "Card, biometric and smart access systems." },
};

export function CategoryGrid({
  categories,
}: {
  categories: { id: string; name: string; slug: string; description: string | null; accent: string | null; icon: string | null; _count: { courses: number } }[];
}) {
  return (
    <section className="relative border-y border-white/[0.06] bg-[#07080F] py-24">
      <div className="container-bs">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_2fr] lg:gap-14">
          <Reveal>
            <SectionLabel tone="cyan">Career tracks</SectionLabel>
            <h2 className="mt-5 text-[clamp(1.9rem,3.2vw,2.8rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              Choose the track that <span className="text-gradient-cyan">pays.</span>
            </h2>
            <p className="mt-4 max-w-sm text-[13px] leading-[1.8] text-[#8492A6]">
              Each track blends video lessons, downloadable field guides, quizzes and a final assessment. Add a specialisation whenever you are ready.
            </p>
            <Link href="/courses" className="mt-7 inline-flex items-center gap-2 text-[12.5px] font-medium text-white">
              Browse the catalogue <ArrowRight size={14} className="text-[#20D9E8]" />
            </Link>
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-[11px] text-[#B9C3D4]">
                <Layers3 size={14} className="text-[#873BFF]" /> New courses added by the academy appear here automatically.
              </div>
            </div>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((category, index) => {
              const meta = CATEGORY_META[category.slug] || { icon: Sparkles, tint: "#873BFF", blurb: category.description || "" };
              const Icon = meta.icon;
              return (
                <Reveal key={category.id} delay={index * 60}>
                  <Link
                    href={`/courses?category=${category.slug}`}
                    className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0E18] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.18] ${index === 0 ? "sm:col-span-2" : ""}`}
                  >
                    <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.16] blur-2xl transition group-hover:opacity-30" style={{ background: meta.tint }} />
                    <div className="relative flex items-start justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10" style={{ background: `${meta.tint}14`, color: meta.tint }}>
                        <Icon size={17} />
                      </span>
                      <span className="num text-[10px] text-[#6F7C90]">{String(category._count.courses).padStart(2, "0")} {category._count.courses === 1 ? "course" : "courses"}</span>
                    </div>
                    <div className="relative mt-8 flex items-end justify-between gap-4">
                      <div>
                        <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-white">{category.name}</h3>
                        <p className="mt-1.5 max-w-[280px] text-[11.5px] leading-relaxed text-[#7C8AA3]">{category.description || meta.blurb}</p>
                      </div>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-[#8492A6] transition group-hover:border-white/25 group-hover:text-white">
                        <ArrowUpRight size={13} />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const WHY = [
  {
    icon: Play,
    title: "Learn by doing",
    body: "Every module ends with a field task. You wire, configure, test and troubleshoot — not just watch.",
    span: "sm:col-span-2",
    tint: "#873BFF",
  },
  { icon: Users, title: "Working instructors", body: "Trainers who install solar, CCTV and networks every week.", span: "", tint: "#20D9E8" },
  { icon: BadgeCheck, title: "Verifiable certificate", body: "Every certificate carries a serial and public verification page.", span: "", tint: "#10C99A" },
  { icon: Smartphone, title: "Learn anywhere", body: "Web and Android apps sync your progress, notes and downloads.", span: "", tint: "#1677FF" },
  { icon: LockKeyhole, title: "Secure payments", body: "Paystack-verified checkout. Access unlocks only after server confirmation.", span: "", tint: "#A855F7" },
];

export function WhySection() {
  return (
    <section className="relative py-24">
      <div className="container-bs">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_2fr] lg:items-start lg:gap-14">
          <Reveal>
            <SectionLabel tone="emerald">Why Brave Skill</SectionLabel>
            <h2 className="mt-5 text-[clamp(1.9rem,3.2vw,2.8rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              Built like a workshop. <span className="text-[#8492A6]">Not a lecture hall.</span>
            </h2>
            <p className="mt-4 max-w-sm text-[13px] leading-[1.8] text-[#8492A6]">
              We stripped away the filler. What remains is a focused path from first lesson to client-ready technician — with the support to get there.
            </p>
            <div className="mt-8 flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex -space-x-2">
                {["#873BFF", "#20D9E8", "#10C99A", "#1677FF"].map((c) => (
                  <span key={c} className="h-7 w-7 rounded-full border-2 border-[#0A0B13]" style={{ background: `linear-gradient(135deg, ${c}, #0A0B13)` }} />
                ))}
              </div>
              <p className="text-[11px] leading-snug text-[#9AA6BA]">
                <span className="font-semibold text-white">4,800+ learners</span> across Nigeria are building income with Brave Skill.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2">
            {WHY.map((item, index) => (
              <Reveal key={item.title} delay={index * 60} className={item.span}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.035] to-white/[0.01] p-5 transition hover:border-white/[0.16]">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full opacity-[0.12] blur-2xl" style={{ background: item.tint }} />
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10" style={{ background: `${item.tint}14`, color: item.tint }}>
                    <item.icon size={15} />
                  </span>
                  <h3 className="mt-5 text-[14px] font-semibold tracking-[-0.01em] text-white">{item.title}</h3>
                  <p className="mt-2 max-w-[340px] text-[11.5px] leading-[1.7] text-[#8290A5]">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { n: "01", title: "Choose your track", body: "Compare programmes, preview the curriculum and pick the skill that fits your market." },
  { n: "02", title: "Enrol securely", body: "Pay in Naira through Paystack. Access unlocks the moment payment is verified." },
  { n: "03", title: "Learn & practise", body: "Follow video lessons, download field guides and complete hands-on assignments." },
  { n: "04", title: "Get certified", body: "Pass the final assessment, download your certificate and start taking jobs." },
];

export function ProcessSection() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#07080F] py-24">
      <div className="pointer-events-none absolute inset-0 dot-bg opacity-40" />
      <div className="container-bs relative">
        <Reveal>
          <div className="mx-auto max-w-[640px] text-center">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-5 text-[clamp(1.9rem,3.2vw,2.9rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              Four steps from curious to <span className="text-gradient">certified.</span>
            </h2>
          </div>
        </Reveal>
        <div className="relative mt-14">
          <div className="absolute left-0 right-0 top-[26px] hidden h-px bg-gradient-to-r from-transparent via-[#873BFF]/35 to-transparent lg:block" />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {STEPS.map((step, index) => (
              <Reveal key={step.n} delay={index * 80}>
                <div className="relative">
                  <div className="relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#873BFF]/30 bg-[#0B0D17] text-[12px] font-semibold text-[#C9B8FF] shadow-[0_0_30px_-8px_rgba(135,59,255,.7)]">
                    {step.n}
                  </div>
                  <h3 className="mt-5 text-[14px] font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 max-w-[230px] text-[11.5px] leading-[1.75] text-[#8290A5]">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="relative py-24">
      <div className="container-bs">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Reveal>
            <SectionLabel tone="cyan">Student stories</SectionLabel>
            <h2 className="mt-5 max-w-[560px] text-[clamp(1.9rem,3.2vw,2.9rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              Real people. <span className="text-gradient-cyan">Real income.</span>
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} className="fill-[#FBBF24] text-[#FBBF24]" />)}
              </div>
              <span className="text-[11px] text-[#9AA6BA]"><span className="font-semibold text-white">4.9</span> average from 1,300+ reviews</span>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <Reveal key={testimonial.id} delay={index * 80}>
              <figure className="flex h-full flex-col justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.035] to-transparent p-6">
                <div>
                  <Quote size={18} className="text-[#873BFF]" />
                  <blockquote className="mt-4 text-[13px] leading-[1.8] text-[#C3CEDF]">“{testimonial.quote}”</blockquote>
                </div>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-white/[0.07] pt-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[11px] font-semibold text-white">
                    {testimonial.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <div>
                    <p className="text-[12px] font-medium text-white">{testimonial.name}</p>
                    <p className="text-[10px] text-[#7C8AA3]">{testimonial.role || testimonial.courseTitle}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {Array.from({ length: testimonial.rating }).map((_, i) => <Star key={i} size={9} className="fill-[#FBBF24] text-[#FBBF24]" />)}
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CertificateSection() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#07080F] py-24">
      <div className="pointer-events-none absolute left-0 top-0 h-[400px] w-[400px] rounded-full bg-[#10C99A]/[0.05] blur-[110px]" />
      <div className="container-bs relative grid items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <SectionLabel tone="emerald">Certification</SectionLabel>
          <h2 className="mt-5 text-[clamp(1.9rem,3.2vw,2.8rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
            A credential your clients can <span className="text-gradient-cyan">verify.</span>
          </h2>
          <p className="mt-4 max-w-md text-[13px] leading-[1.8] text-[#8492A6]">
            Finish your programme and pass the final assessment to receive a Brave Skill certificate with a unique serial number. Employers and clients can confirm it instantly — no phone calls, no guesswork.
          </p>
          <ul className="mt-7 grid gap-3">
            {[
              "Unique serial and tamper-evident verification hash",
              "Public verification page for employers and clients",
              "Downloadable PDF, ready to print or share",
              "Lifetime access to your credential record",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[12.5px] text-[#B9C3D4]">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#10C99A]/15 text-[#10C99A]"><Check size={10} /></span>
                {item}
              </li>
            ))}
          </ul>
          <Link href="/verify" className="btn btn-ghost mt-8">
            <ShieldCheck size={15} /> Verify a certificate
          </Link>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mx-auto max-w-[520px]">
            <div className="absolute -inset-6 rounded-[32px] bg-[radial-gradient(ellipse_at_center,rgba(16,201,154,.12),transparent_70%)] blur-xl" />
            <div className="relative overflow-hidden rounded-2xl border border-[#873BFF]/25 bg-gradient-to-br from-[#151027] via-[#0B0D18] to-[#081210] p-6 shadow-[0_50px_100px_-40px_rgba(0,0,0,1)]">
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#873BFF]/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-14 -left-10 h-44 w-44 rounded-full bg-[#10C99A]/15 blur-3xl" />
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#873BFF]/40 bg-[#873BFF]/20 text-[13px] font-bold">B</div>
                  <div>
                    <p className="text-[8px] font-bold tracking-[0.2em] text-white">BRAVE SKILL</p>
                    <p className="text-[5.5px] tracking-[0.24em] text-[#20D9E8]">SKILL ACQUISITION ACADEMY</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[6.5px] uppercase tracking-[0.14em] text-emerald-300">Verified</span>
              </div>

              <p className="mt-8 text-center text-[7px] tracking-[0.3em] text-[#20D9E8]">CERTIFICATE OF COMPLETION</p>
              <p className="mt-4 text-center text-[8px] text-[#7C8AA3]">This certifies that</p>
              <p className="mt-2 text-center text-[22px] font-semibold tracking-[0.02em] text-white">Adaeze Okafor</p>
              <div className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-[#873BFF] to-transparent" />
              <p className="mt-3 text-center text-[7.5px] text-[#7C8AA3]">has successfully completed</p>
              <p className="mt-2 text-center text-[12px] font-semibold text-[#D9D1FF]">Solar Installation &amp; Inverter Technology</p>
              <p className="mt-5 text-center text-[6px] tracking-[0.28em] text-[#6F7C90]">LEARN. PRACTICE. BUILD.</p>

              <div className="mt-7 flex items-end justify-between border-t border-white/[0.07] pt-3">
                <div>
                  <p className="text-[5px] uppercase tracking-[0.18em] text-[#6F7C90]">Serial</p>
                  <p className="num text-[7px] text-white">BS-2026-4F2A9C</p>
                </div>
                <div className="text-center">
                  <p className="text-[5px] uppercase tracking-[0.18em] text-[#6F7C90]">Issued</p>
                  <p className="text-[7px] text-white">12 Nov 2026</p>
                </div>
                <div className="text-right">
                  <p className="text-[5px] uppercase tracking-[0.18em] text-[#6F7C90]">Verify</p>
                  <p className="text-[6px] text-[#20D9E8]">academy.emyphilltech.com.ng/verify</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function AppPromo({ settings }: { settings: Record<string, string> }) {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1677FF]/[0.07] blur-[130px]" />
      <div className="container-bs relative">
        <div className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-gradient-to-br from-[#101321] via-[#0B0E18] to-[#081019] px-6 py-12 sm:px-12 lg:px-16">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#873BFF]/20 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-[#20D9E8]/10 blur-[90px]" />
          <div className="relative grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <SectionLabel tone="cyan">Brave Skill for Android</SectionLabel>
              <h2 className="mt-5 max-w-[480px] text-[clamp(1.9rem,3.2vw,2.9rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
                Your classroom, <span className="text-gradient">in your pocket.</span>
              </h2>
              <p className="mt-4 max-w-[460px] text-[13px] leading-[1.8] text-[#8492A6]">
                Stream lessons, read PDF field guides, take quizzes and access your certificates on Android. Progress syncs with the website automatically.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {["Video lessons & PDFs", "Progress that syncs", "Quizzes & exams", "Certificates on the go"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[12px] text-[#B9C3D4]">
                    <Check size={13} className="text-[#10C99A]" /> {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/download" className="btn btn-light">
                  <Download size={15} /> Download APK
                </Link>
                <Link href="/download#play" className="btn btn-ghost">
                  <Smartphone size={15} /> Google Play
                </Link>
              </div>
              <p className="mt-4 text-[10px] text-[#6F7C90]">
                Version {settings["app.version"]} · {settings["app.requires"]} · Free to install
              </p>
            </div>

            <div className="relative mx-auto w-[236px]">
              <div className="absolute -inset-8 rounded-full bg-[#873BFF]/20 blur-[60px]" />
              <div className="relative rounded-[36px] border border-white/20 bg-[#05060A] p-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,1)]">
                <div className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#080A12]">
                  <div className="absolute left-1/2 top-2 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-black" />
                  <div className="px-4 pb-5 pt-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[8px] font-bold">B</div>
                        <span className="text-[6.5px] font-semibold tracking-[0.14em] text-white">BRAVE SKILL</span>
                      </div>
                      <span className="h-5 w-5 rounded-full border border-white/15" />
                    </div>
                    <p className="mt-4 text-[7px] text-[#7C8AA3]">Good evening, Ada</p>
                    <p className="text-[11px] font-semibold text-white">Keep building.</p>

                    <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#1A1130] to-[#0A0C16] p-2.5">
                      <p className="text-[5.5px] uppercase tracking-[0.14em] text-[#C9B8FF]">Continue</p>
                      <p className="mt-1.5 text-[7.5px] font-medium leading-snug text-white">Solar Installation &amp; Inverter Technology</p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#873BFF] to-[#20D9E8]" /></div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[5px] text-[#7C8AA3]">Lesson 4 of 12</span>
                        <span className="rounded bg-white px-1.5 py-0.5 text-[5px] font-semibold text-black">Play</span>
                      </div>
                    </div>

                    <p className="mt-4 text-[6px] uppercase tracking-[0.16em] text-[#6F7C90]">My courses</p>
                    <div className="mt-2 space-y-1.5">
                      {["CCTV Installation", "Electrical Maintenance", "Access Control"].map((t, i) => (
                        <div key={t} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1.5">
                          <span className="h-6 w-6 rounded-md" style={{ background: ["#20D9E822", "#FBBF2422", "#10C99A22"][i] }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[6px] font-medium text-white">{t}</p>
                            <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-white/40" style={{ width: `${[38, 24, 12][i]}%` }} /></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-around border-t border-white/[0.07] pt-2.5 text-[#5F6B7E]">
                      <span className="text-[#20D9E8]">◉</span>
                      <span>▤</span>
                      <span>◎</span>
                      <span>☰</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FaqTeaser({ faqs }: { faqs: Faq[] }) {
  return (
    <section className="relative border-t border-white/[0.06] py-24">
      <div className="container-bs grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <SectionLabel>Questions</SectionLabel>
          <h2 className="mt-5 text-[clamp(1.9rem,3.1vw,2.7rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
            Everything you need to <span className="text-gradient-cyan">start.</span>
          </h2>
          <p className="mt-4 max-w-sm text-[13px] leading-[1.8] text-[#8492A6]">
            Still unsure? Talk to our admissions team on WhatsApp — a real person will answer.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/faqs" className="btn btn-ghost btn-sm h-10">All FAQs <ArrowUpRight size={13} /></Link>
            <Link href="/contact" className="btn btn-primary btn-sm h-10">Talk to a human</Link>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <Accordion items={faqs.map((f) => ({ question: f.question, answer: f.answer }))} />
        </Reveal>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="container-bs">
        <div className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[#080A12] px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-[-40%] h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-[#873BFF]/25 blur-[100px]" />
            <div className="absolute bottom-[-60%] left-[10%] h-[300px] w-[300px] rounded-full bg-[#20D9E8]/10 blur-[90px]" />
            <div className="absolute inset-0 grid-bg opacity-40" />
          </div>
          <div className="relative mx-auto max-w-[640px]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#873BFF]/35 bg-[#873BFF]/15 text-[#C9B8FF]">
              <GraduationCap size={22} />
            </div>
            <h2 className="mt-6 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.04] tracking-[-0.045em] text-white">
              Your next skill could change <span className="text-gradient">everything.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[13px] leading-[1.8] text-[#93A1B6]">
              Join the next intake. Learn at your pace, practise on real equipment, and leave with a credential that opens doors.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className="btn btn-primary btn-lg w-full sm:w-auto">Create your account <ArrowRight size={16} /></Link>
              <Link href="/courses" className="btn btn-ghost btn-lg w-full sm:w-auto">Browse courses</Link>
            </div>
            <p className="mt-5 text-[10.5px] text-[#6F7C90]">No hidden fees · Paystack secured · Learn on web and Android</p>
          </div>
        </div>
      </div>
    </section>
  );
}
