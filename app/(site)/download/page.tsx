import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { Download, Fingerprint, Lock, Play, ShieldCheck, Smartphone, Wifi } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { PageHero } from "@/components/site/PageHero";
import { formatDate, fileSize } from "@/lib/format";

export const metadata: Metadata = {
  title: "Android app",
  description: "Download the Brave Skill Academy Android app to learn on the go.",
};

export const dynamic = "force-dynamic";

export default async function DownloadPage() {
  const [settings, release] = await Promise.all([
    getSettings(),
    db.apkRelease.findFirst({
      where: { isActive: true },
      orderBy: [{ versionCode: "desc" }, { releasedAt: "desc" }],
      include: { asset: true },
    }),
  ]);

  const downloadUrl = `${env.siteUrl}/api/app/download`;
  const qr = await QRCode.toDataURL(downloadUrl, {
    margin: 1,
    width: 320,
    color: { dark: "#050509", light: "#ffffff" },
  });

  const version = release?.version || settings["app.version"] || "1.0.0";
  const size = release ? fileSize(release.sizeBytes || release.asset?.sizeBytes || 0) : settings["app.size"] || "—";
  const notes = release?.notes || settings["app.notes"];

  return (
    <>
      <PageHero
        eyebrow="Android"
        title={<>Brave Skill, <span className="text-gradient">in your pocket.</span></>}
        subtitle="Install the academy app to learn offline-friendly, track progress, take assessments and carry your certificates anywhere."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Android app" }]}
      />

      <section className="py-14">
        <div className="container-bs grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Version {version}
              </span>
              <span className="chip">Android 8.0+</span>
              <span className="chip">{size}</span>
            </div>

            <h2 className="mt-6 text-[clamp(1.9rem,3.2vw,2.7rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              One account. <span className="text-gradient-cyan">Every lesson.</span>
            </h2>
            <p className="mt-3 max-w-lg text-[13px] leading-[1.8] text-[#93A1B6]">
              The Android app uses the same secure backend as this website. When a new course is published by the academy,
              it appears in your app immediately — no update required.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Play, title: "Video lessons", body: "Resume exactly where you stopped." },
                { icon: Download, title: "PDF field guides", body: "Read materials on the go." },
                { icon: ShieldCheck, title: "Quizzes & exams", body: "Timed assessments with instant results." },
                { icon: Fingerprint, title: "Certificates", body: "View and share your credentials." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#873BFF]/12 text-[#C9B8FF]"><item.icon size={14} /></span>
                  <div>
                    <p className="text-[11.5px] font-medium text-white">{item.title}</p>
                    <p className="mt-0.5 text-[10.5px] text-[#7C8AA3]">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0B0E18] p-5 sm:flex-row sm:items-center">
              <img src={qr} alt="QR code to download the Brave Skill Android app" className="h-[104px] w-[104px] rounded-lg bg-white p-1.5" />
              <div className="flex-1">
                <p className="text-[12.5px] font-medium text-white">Scan to install</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-[#7C8AA3]">
                  Point your Android camera at the code, or tap the button. You may need to allow installs from your browser.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {release || settings["app.url"] ? (
                    <a href={downloadUrl} className="btn btn-primary btn-sm h-10"><Download size={13} /> Download APK</a>
                  ) : (
                    <span className="btn btn-ghost btn-sm h-10 opacity-60">Build coming soon</span>
                  )}
                  <Link href="#play" className="btn btn-ghost btn-sm h-10">Google Play</Link>
                </div>
              </div>
            </div>
            {notes && <p className="mt-3 whitespace-pre-wrap text-[10.5px] leading-relaxed text-[#6F7C90]">{notes}</p>}
          </div>

          <div className="relative mx-auto w-[270px] sm:w-[300px]">
            <div className="absolute -inset-10 rounded-full bg-[#873BFF]/20 blur-[80px]" />
            <div className="relative rounded-[44px] border border-white/20 bg-[#05060A] p-2.5 shadow-[0_50px_100px_-30px_rgba(0,0,0,1)]">
              <div className="relative overflow-hidden rounded-[34px] border border-white/[0.07] bg-gradient-to-b from-[#0B0E19] to-[#05060B]">
                <div className="absolute left-1/2 top-2.5 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
                <div className="px-5 pb-5 pt-11">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[9px] font-bold">B</div>
                      <div>
                        <p className="text-[7.5px] font-semibold tracking-[0.12em] text-white">BRAVE SKILL</p>
                        <p className="text-[4.5px] tracking-[0.2em] text-[#20D9E8]">SKILL ACQUISITION ACADEMY</p>
                      </div>
                    </div>
                    <span className="h-6 w-6 rounded-full border border-white/15" />
                  </div>

                  <p className="mt-5 text-[8px] text-[#7C8AA3]">Welcome back, Ada</p>
                  <p className="text-[13px] font-semibold text-white">Keep building.</p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
                      <p className="text-[5.5px] uppercase tracking-[0.12em] text-[#6F7C90]">In progress</p>
                      <p className="num mt-1 text-[15px] font-semibold text-white">3</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
                      <p className="text-[5.5px] uppercase tracking-[0.12em] text-[#6F7C90]">Certificates</p>
                      <p className="num mt-1 text-[15px] font-semibold text-white">1</p>
                    </div>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-xl border border-[#873BFF]/25 bg-gradient-to-br from-[#1A1130] to-[#0A0C16] p-3">
                    <p className="text-[5.5px] uppercase tracking-[0.14em] text-[#C9B8FF]">Continue learning</p>
                    <p className="mt-1.5 text-[8.5px] font-medium leading-snug text-white">Solar Installation &amp; Inverter Technology</p>
                    <p className="mt-1 text-[6px] text-[#7C8AA3]">Battery bank sizing · 12:40</p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#873BFF] to-[#20D9E8]" /></div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[5.5px] text-[#7C8AA3]">62% complete</span>
                      <span className="flex items-center gap-0.5 rounded bg-white px-1.5 py-0.5 text-[5.5px] font-semibold text-black"><Play size={5} /> Resume</span>
                    </div>
                  </div>

                  <p className="mt-4 text-[6px] uppercase tracking-[0.16em] text-[#6F7C90]">My courses</p>
                  <div className="mt-1.5 space-y-1.5">
                    {["CCTV Installation & Config", "Electrical Installation", "Access Control Systems"].map((t, i) => (
                      <div key={t} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                        <span className="h-7 w-7 rounded-md" style={{ background: ["#20D9E818", "#FBBF2418", "#10C99A18"][i] }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[6.5px] font-medium text-white">{t}</p>
                          <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-white/40" style={{ width: `${[48, 30, 18][i]}%` }} /></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-around border-t border-white/[0.07] pt-2.5 text-[7px] text-[#5F6B7E]">
                    <span className="text-[#20D9E8]">◉</span><span>▤</span><span>◎</span><span>☰</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-[#07080F] py-14">
        <div className="container-bs grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-[20px] font-semibold text-white">How to install the APK</h2>
            <ol className="mt-4 space-y-3">
              {[
                "Download the Brave Skill APK using the button above.",
                "Open the downloaded file from your notifications or Files app.",
                "If prompted, allow installs from this source (Settings → Install unknown apps).",
                "Tap Install and open the app. Sign in with your existing account.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#873BFF]/30 bg-[#873BFF]/10 text-[10px] text-[#C9B8FF]">{index + 1}</span>
                  <span className="text-[12px] leading-relaxed text-[#9AA6BA]">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-[10.5px] leading-relaxed text-[#7C8AA3]">
              <Lock size={13} className="mt-0.5 shrink-0 text-[#10C99A]" />
              The APK is served directly from the academy’s own domain. Verify the file size and version before installing, and never install a build shared by a third party.
            </p>
          </div>

          <div id="play" className="scroll-mt-24">
            <h2 className="text-[20px] font-semibold text-white">Google Play</h2>
            <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-[#20D9E8]"><Smartphone size={18} /></span>
                <div>
                  <p className="text-[12.5px] font-medium text-white">Brave Skill Academy</p>
                  <p className="text-[10.5px] text-[#7C8AA3]">Google Play listing status: in review</p>
                </div>
              </div>
              <p className="mt-4 text-[11.5px] leading-relaxed text-[#93A1B6]">
                The Play Store build is published from the same signed bundle. Until it is live, use the direct APK above.
                Course purchases are completed on this website; the Android app consumes the access attached to your account.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-[#6F7C90]">
                <Wifi size={12} /> {release ? `Updated ${formatDate(release.releasedAt)}` : "Awaiting first signed build"}
              </div>
            </div>

            <h3 className="mt-6 text-[13px] font-semibold text-white">App permissions</h3>
            <p className="mt-2 text-[11px] leading-relaxed text-[#7C8AA3]">
              Internet access (streaming and sync), notification permission (course and payment alerts) and local storage
              (cached PDFs). No contacts, location or background tracking.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
