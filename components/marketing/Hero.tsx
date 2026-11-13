import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Download,
  GraduationCap,
  Layers3,
  MonitorPlay,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { WatchIntroButton } from "@/components/marketing/WatchIntro";
import { CountUp, Reveal } from "@/components/ui/Reveal";

const stats = (settings: Record<string, string>) => [
  { value: Number(settings["stats.students"].replace(/[^\d]/g, "")) || 0, suffix: "+", label: "Students trained" },
  { value: Number(settings["stats.courses"]) || 0, suffix: "", label: "Career-ready courses" },
  { value: Number(settings["stats.certificates"].replace(/[^\d]/g, "")) || 0, suffix: "+", label: "Certificates issued" },
  { value: Number(settings["stats.instructors"]) || 0, suffix: "", label: "Working instructors" },
];

export function Hero({ settings }: { settings: Record<string, string> }) {
  const title = settings["hero.title"] || "Learn Practical Skills. Build Your Future.";
  const [line1, ...rest] = title.split(". ");
  const line2 = rest.join(". ").replace(/\.$/, "");

  return (
    <section className="relative overflow-hidden pb-10 pt-14 sm:pt-20">
      {/* ambient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(135,59,255,.20),transparent_65%)]" />
        <div className="absolute left-[-10%] top-[20%] h-[500px] w-[500px] rounded-full bg-[#1677FF]/[0.07] blur-[100px]" />
        <div className="absolute right-[-8%] top-[8%] h-[420px] w-[420px] rounded-full bg-[#20D9E8]/[0.06] blur-[110px]" />
        <div className="absolute inset-0 grid-bg opacity-60" />
      </div>

      {/* neon arcs */}
      <svg className="pointer-events-none absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1440 900" fill="none" aria-hidden preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="arcL" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#873BFF" stopOpacity="0" />
            <stop offset="0.35" stopColor="#873BFF" stopOpacity="0.75" />
            <stop offset="0.8" stopColor="#20D9E8" stopOpacity="0.15" />
            <stop offset="1" stopColor="#20D9E8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="arcR" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#20D9E8" stopOpacity="0" />
            <stop offset="0.4" stopColor="#1677FF" stopOpacity="0.55" />
            <stop offset="1" stopColor="#873BFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M-60 60 C 170 90, 210 330, 120 520 C 40 700, 80 860, 40 960" stroke="url(#arcL)" strokeWidth="1.4" />
        <path d="M-30 20 C 200 60, 250 320, 160 500" stroke="url(#arcL)" strokeWidth="0.7" opacity="0.5" />
        <path d="M1500 20 C 1270 90, 1230 300, 1330 470 C 1420 620, 1370 830, 1430 960" stroke="url(#arcR)" strokeWidth="1.4" />
        <path d="M1520 80 C 1300 140, 1260 330, 1350 500" stroke="url(#arcR)" strokeWidth="0.7" opacity="0.45" />
      </svg>

      <div className="container-bs relative">
        <div className="mx-auto max-w-[900px] text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-2 pr-3.5 backdrop-blur">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#873BFF]/20 text-[#C9B8FF]">
                <Sparkles size={11} />
              </span>
              <span className="text-[11px] font-medium tracking-[0.02em] text-[#C7D0E0]">
                {settings["hero.eyebrow"] || "Practical skills. Real opportunities."}
              </span>
              <span className="h-3 w-px bg-white/15" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#20D9E8]">2026 intake</span>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-7 text-[clamp(2.55rem,6.1vw,5.1rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-white">
              {line1}.
              <br />
              <span className="text-gradient">{line2}.</span>
              <span className="ml-3 inline-block h-[0.78em] w-[3px] translate-y-[0.06em] bg-[#20D9E8] align-baseline" style={{ animation: "blink 1.1s step-end infinite" }} />
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-[620px] text-[14.5px] leading-[1.75] text-[#9AA7BC] sm:text-[15.5px]">
              {settings["hero.subtitle"]}
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/courses" className="btn btn-light btn-lg w-full sm:w-auto">
                Explore courses <ArrowRight size={16} />
              </Link>
              <WatchIntroButton className="btn btn-ghost btn-lg w-full text-[#E7ECF5] sm:w-auto" />
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-[#7C8AA3]">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-[#10C99A]" /> Hands-on, project-based</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-[#20D9E8]" /> Secure Paystack checkout</span>
              <span className="inline-flex items-center gap-1.5"><Star size={13} className="fill-[#FBBF24] text-[#FBBF24]" /> 4.9/5 student rating</span>
            </div>
          </Reveal>
        </div>

        {/* Product mockup */}
        <Reveal delay={380}>
          <div className="relative mx-auto mt-14 max-w-[1040px]">
            <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[40px] bg-[radial-gradient(ellipse_at_center,rgba(135,59,255,.25),transparent_65%)] blur-2xl" />

            <div className="overflow-hidden rounded-[22px] border border-white/[0.11] bg-[#0A0C16]/90 shadow-[0_60px_140px_-60px_rgba(0,0,0,1),0_0_0_1px_rgba(255,255,255,.03)] backdrop-blur-xl">
              {/* window chrome */}
              <div className="flex items-center gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]/80" />
                </div>
                <div className="mx-auto hidden items-center gap-2 rounded-md border border-white/[0.07] bg-black/30 px-3 py-1 text-[9.5px] text-[#6F7C90] sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10C99A]" /> academy.emyphilltech.com.ng/dashboard
                </div>
                <span className="ml-auto hidden text-[9px] tracking-[0.18em] text-[#5D6A7E] sm:block">STUDENT PORTAL</span>
              </div>

              <div className="grid md:grid-cols-[168px_1fr]">
                {/* sidebar */}
                <aside className="hidden border-r border-white/[0.06] bg-black/20 p-3 md:block">
                  <div className="mb-4 flex items-center gap-2 px-1">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[10px] font-bold">B</div>
                    <span className="text-[9px] font-semibold tracking-[0.16em] text-white/80">BRAVE SKILL</span>
                  </div>
                  {[
                    { icon: Layers3, label: "Overview", active: true },
                    { icon: BookOpenCheck, label: "My courses" },
                    { icon: MonitorPlay, label: "Continue" },
                    { icon: GraduationCap, label: "Certificates" },
                    { icon: TrendingUp, label: "Payments" },
                  ].map(({ icon: Icon, label, active }) => (
                    <div key={label} className={`mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-[9.5px] ${active ? "bg-[#873BFF]/15 text-white" : "text-[#7C8AA3]"}`}>
                      <Icon size={12} /> {label}
                    </div>
                  ))}
                  <div className="mt-6 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5">
                    <p className="text-[8px] uppercase tracking-[0.14em] text-[#6F7C90]">Weekly goal</p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#873BFF] to-[#20D9E8]" />
                    </div>
                    <p className="num mt-1.5 text-[9px] text-[#9AA6BA]">4 of 6 lessons</p>
                  </div>
                </aside>

                {/* main */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Welcome back, Ada</p>
                      <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-white">Pick up where you left off</p>
                    </div>
                    <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[8.5px] font-medium text-emerald-300 sm:flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 3 courses active
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
                    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#171029] to-[#0B0D17] p-3.5">
                      <div className="absolute right-[-20px] top-[-20px] h-24 w-24 rounded-full bg-[#873BFF]/25 blur-2xl" />
                      <div className="flex items-center justify-between">
                        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[7.5px] uppercase tracking-[0.14em] text-[#C9B8FF]">Continue learning</span>
                        <span className="text-[8px] text-[#7C8AA3]">Module 3 of 6</span>
                      </div>
                      <p className="mt-3 text-[12px] font-semibold leading-snug text-white">Solar Installation &amp; Inverter Technology</p>
                      <p className="mt-1 text-[8.5px] text-[#8794A8]">Lesson 4 · Battery bank sizing and wiring</p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#20D9E8] to-[#10C99A]" />
                        </div>
                        <span className="num text-[8px] text-[#B9C3D4]">62%</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <span className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[8px] font-semibold text-black"><Play size={8} /> Resume</span>
                        <span className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[8px] text-white/70"><Download size={8} /> Notes</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
                      <p className="text-[8px] uppercase tracking-[0.16em] text-[#6F7C90]">Learning streak</p>
                      <div className="mt-2 flex items-end justify-between">
                        <p className="num text-[26px] font-semibold leading-none text-white">14<span className="text-[11px] text-[#7C8AA3]"> days</span></p>
                        <TrendingUp size={14} className="text-[#10C99A]" />
                      </div>
                      <div className="mt-3 flex items-end gap-1">
                        {[30, 52, 40, 68, 55, 82, 74].map((h, i) => (
                          <span key={i} className="flex-1 rounded-sm" style={{ height: `${h * 0.4}px`, background: i === 5 ? "linear-gradient(180deg,#20D9E8,#873BFF)" : "rgba(255,255,255,.09)" }} />
                        ))}
                      </div>
                      <p className="mt-2 text-[8px] text-[#7C8AA3]">Top 8% of learners this month</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {[
                      { icon: BadgeCheck, title: "CCTV Installation", meta: "Lesson 9 of 12", tone: "#20D9E8" },
                      { icon: Zap, title: "Electrical Maintenance", meta: "Lesson 5 of 10", tone: "#FBBF24" },
                      { icon: ShieldCheck, title: "Access Control", meta: "Lesson 2 of 8", tone: "#10C99A" },
                    ].map(({ icon: Icon, title, meta, tone }) => (
                      <div key={title} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${tone}1a`, color: tone }}><Icon size={11} /></span>
                        <div className="min-w-0">
                          <p className="truncate text-[9px] font-medium text-white/90">{title}</p>
                          <p className="text-[7.5px] text-[#6F7C90]">{meta}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* floating chips */}
            <div className="absolute -left-8 top-32 hidden animate-float rounded-xl border border-white/10 bg-[#0B0E18]/90 p-2.5 shadow-2xl backdrop-blur lg:block" style={{ animationDelay: "1.2s" }}>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400"><BadgeCheck size={14} /></span>
                <div>
                  <p className="text-[9px] font-semibold text-white">Certificate issued</p>
                  <p className="text-[7.5px] text-[#7C8AA3]">Verified · BS-2026-4F2A</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-6 top-[46%] hidden animate-float rounded-xl border border-white/10 bg-[#0B0E18]/90 p-2.5 shadow-2xl backdrop-blur lg:block">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#873BFF]/20 text-[#C9B8FF]"><Users size={14} /></span>
                <div>
                  <p className="text-[9px] font-semibold text-white">+128 enrolled</p>
                  <p className="text-[7.5px] text-[#7C8AA3]">this week</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 right-6 hidden animate-float items-center gap-2 rounded-xl border border-white/10 bg-[#0B0E18]/90 px-3 py-2 shadow-2xl backdrop-blur lg:flex" style={{ animationDelay: "2.4s" }}>
              <Clock3 size={12} className="text-[#20D9E8]" />
              <p className="text-[9px] text-[#B9C3D4]">Lifetime access · learn at your pace</p>
            </div>
          </div>
        </Reveal>

        {/* stats strip */}
        <Reveal delay={120}>
          <div className="mx-auto mt-16 grid max-w-[980px] grid-cols-2 divide-y divide-white/[0.07] rounded-2xl border border-white/[0.08] bg-white/[0.015] backdrop-blur-sm sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
            {stats(settings).map((s) => (
              <div key={s.label} className="px-5 py-5 text-center">
                <p className="text-[26px] font-semibold tracking-[-0.03em] text-white">
                  <CountUp value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-1 text-[9.5px] uppercase tracking-[0.16em] text-[#6F7C90]">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
