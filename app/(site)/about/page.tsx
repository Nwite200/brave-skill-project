import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, Building2, Compass, HeartHandshake, Lightbulb, ShieldCheck, Target, Users } from "lucide-react";
import { db } from "@/lib/db";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "About Brave Skill",
  description: "Brave Skill is a skill acquisition academy by Emyphill-Tech Global Solutions Limited, training practical technicians across Nigeria.",
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const instructors = await db.user.findMany({
    where: { role: "INSTRUCTOR", status: "ACTIVE" },
    select: { id: true, name: true, headline: true, bio: true, expertise: true, avatarUrl: true },
    take: 6,
  });

  return (
    <>
      <PageHero
        eyebrow="About Brave Skill"
        title={<>We turn curiosity into <span className="text-gradient">competence.</span></>}
        subtitle="Brave Skill is a skill acquisition academy built for people who want to do real work — install, configure, troubleshoot and get paid for it."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      <section className="py-16">
        <div className="container-bs grid gap-14 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <Reveal>
            <div className="prose-bs max-w-[640px]">
              <h2 className="!mt-0">Our story</h2>
              <p>
                Brave Skill began with a simple observation: too many capable young Nigerians were graduating with theory
                but no hands-on ability. Meanwhile, homes, businesses and estates were searching for technicians who could
                actually install a solar system, configure a camera network or terminate fibre correctly.
              </p>
              <p>
                We built the academy around that gap. Each programme is designed by working professionals, structured into
                short video lessons, reinforced with downloadable field guides, and tested through practical assessments.
                The goal is not a certificate on a wall — it is confidence on a site.
              </p>
              <h3>What we believe</h3>
              <ul>
                <li><strong>Practice beats theory.</strong> Every module ends with something you can build, wire or configure.</li>
                <li><strong>Access should be simple.</strong> Learn on a phone, a laptop or both. One account, one progress record.</li>
                <li><strong>Credentials should mean something.</strong> Certificates carry serials and public verification.</li>
                <li><strong>Local context matters.</strong> We teach for Nigerian power, security and network realities.</li>
              </ul>
              <h3>Who owns Brave Skill</h3>
              <p>
                Brave Skill is a product of <strong>Emyphill-Tech Global Solutions Limited</strong>, a Nigerian technology
                company. The company owns the domain, hosting, source code, database, payment account and app distribution
                arrangements — so the academy can be operated and grown independently.
              </p>
            </div>
          </Reveal>

          <div className="space-y-4">
            <Reveal delay={80}>
              <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12101F] to-[#0A0C16] p-6">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9B8FF]">
                  <Compass size={14} /> Our mission
                </div>
                <p className="mt-3 text-[18px] font-medium leading-snug tracking-[-0.02em] text-white">
                  Equip ambitious Africans with practical, income-generating technical skills — and the proof that they can do the work.
                </p>
              </div>
            </Reveal>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Target, title: "Practical by default", body: "Field tasks in every module." },
                { icon: Users, title: "Human support", body: "Real instructors, real answers." },
                { icon: ShieldCheck, title: "Trust built in", body: "Verified payments and certificates." },
                { icon: HeartHandshake, title: "Accessible", body: "Naira pricing, mobile-first learning." },
              ].map((item, i) => (
                <Reveal key={item.title} delay={120 + i * 50}>
                  <div className="h-full rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <item.icon size={16} className="text-[#20D9E8]" />
                    <p className="mt-3 text-[12px] font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-[10.5px] leading-relaxed text-[#7C8AA3]">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <Building2 size={18} className="text-[#10C99A]" />
                <div>
                  <p className="text-[11px] font-medium text-white">Emyphill-Tech Global Solutions Limited</p>
                  <p className="text-[10px] text-[#6F7C90]">Registered in Nigeria · Owner and operator of Brave Skill</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-[#07080F] py-16">
        <div className="container-bs">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#B79BFF]">The faculty</p>
              <h2 className="mt-3 text-[clamp(1.8rem,3vw,2.5rem)] font-semibold tracking-[-0.04em] text-white">Taught by people who do the work.</h2>
            </div>
            <Link href="/contact" className="text-[11.5px] text-[#8492A6] hover:text-white">Join the faculty →</Link>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(instructors.length ? instructors : [{ id: "1", name: "Brave Skill Faculty", headline: "Solar · Security · Networks", bio: "Practising technicians and engineers.", expertise: "Solar, CCTV, Networking", avatarUrl: null }]).map((person) => (
              <div key={person.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[14px] font-semibold">
                    {person.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <div>
                    <p className="text-[12.5px] font-medium text-white">{person.name}</p>
                    <p className="text-[10.5px] text-[#7C8AA3]">{person.headline || "Instructor"}</p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-[#8B98AD]">{person.bio || "Hands-on instructor at Brave Skill."}</p>
                {person.expertise && <p className="mt-3 text-[9.5px] uppercase tracking-[0.14em] text-[#5F6B7E]">{person.expertise}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-bs">
          <div className="grid gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#101321] to-[#0A0C16] p-8 sm:grid-cols-3">
            {[
              { icon: Award, value: "2026", label: "Current intake" },
              { icon: Lightbulb, value: "5+", label: "Career tracks" },
              { icon: Users, value: "4,800+", label: "Learners served" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <item.icon size={18} className="mx-auto text-[#873BFF]" />
                <p className="num mt-3 text-[24px] font-semibold text-white">{item.value}</p>
                <p className="text-[9.5px] uppercase tracking-[0.16em] text-[#6F7C90]">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#873BFF]/20 bg-[#873BFF]/[0.06] p-6 sm:flex-row">
            <div>
              <p className="text-[14px] font-medium text-white">Ready to start learning?</p>
              <p className="mt-1 text-[11.5px] text-[#93A1B6]">Browse the catalogue or talk to admissions about the right track.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/courses" className="btn btn-primary btn-sm h-10">Browse courses <ArrowRight size={13} /></Link>
              <Link href="/contact" className="btn btn-ghost btn-sm h-10">Contact us</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
