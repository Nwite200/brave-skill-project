import Link from "next/link";
import { ArrowLeft, BadgeCheck, GraduationCap, ShieldCheck, Smartphone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { getSettings } from "@/lib/settings";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050509]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-[-10%] h-[560px] w-[560px] rounded-full bg-[#873BFF]/[0.16] blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[520px] w-[520px] rounded-full bg-[#20D9E8]/[0.07] blur-[130px]" />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>

      <div className="container-bs relative flex min-h-screen flex-col">
        <header className="flex h-[84px] items-center justify-between">
          <Logo size={38} showTagline />
          <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] text-[#8492A6] transition hover:text-white">
            <ArrowLeft size={13} /> Back to site
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-16 pb-16 lg:grid-cols-[1fr_1.05fr]">
          <div className="mx-auto w-full max-w-[420px]">{children}</div>

          <div className="relative hidden lg:block">
            <div className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-gradient-to-br from-[#12101F] via-[#0A0C16] to-[#081016] p-9">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#873BFF]/20 blur-[80px]" />
              <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-[#10C99A]/10 blur-[80px]" />

              <div className="relative">
                <span className="chip border-[#873BFF]/25 bg-[#873BFF]/10 text-[#C9B8FF]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#20D9E8]" />
                  {settings["site.subtitle"]}
                </span>
                <h2 className="mt-6 max-w-[420px] text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
                  Learn practical skills.
                  <br />
                  <span className="text-gradient">Build your future.</span>
                </h2>
                <p className="mt-4 max-w-[400px] text-[13px] leading-[1.8] text-[#93A1B6]">
                  One account for the website and Android app. Your progress, certificates and payment history stay in sync.
                </p>

                <div className="mt-8 grid gap-3">
                  {[
                    { icon: GraduationCap, title: "Structured programmes", body: "Modules, lessons, quizzes and a final assessment." },
                    { icon: BadgeCheck, title: "Verifiable certificates", body: "Every credential has a public serial number." },
                    { icon: Smartphone, title: "Learn on any device", body: "Responsive web portal and native Android app." },
                    { icon: ShieldCheck, title: "Secure by design", body: "Paystack-verified payments, protected course media." },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#873BFF]/15 text-[#C9B8FF]">
                        <item.icon size={15} />
                      </span>
                      <div>
                        <p className="text-[12px] font-medium text-white">{item.title}</p>
                        <p className="mt-0.5 text-[10.5px] text-[#7C8AA3]">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-7 text-[9px] tracking-[0.4em] text-[#5F6B7E]">LEARN. PRACTICE. BUILD.</p>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] py-6 text-[10.5px] text-[#5F6B7E]">
          <span>© {new Date().getFullYear()} Emyphill-Tech Global Solutions Limited</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/contact" className="hover:text-white">Support</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
