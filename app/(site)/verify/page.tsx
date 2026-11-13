import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, Download, Search, ShieldCheck, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { PageHero } from "@/components/site/PageHero";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description: "Confirm the authenticity of a Brave Skill certificate using its serial number.",
};

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ serial?: string }>;
}) {
  const { serial } = await searchParams;
  const cleaned = serial?.trim().toUpperCase();
  const certificate = cleaned
    ? await db.certificate.findUnique({
        where: { serial: cleaned },
        include: { user: { select: { name: true } }, course: { select: { title: true } } },
      })
    : null;

  return (
    <>
      <PageHero
        eyebrow="Certificate verification"
        title={<>Confirm a <span className="text-gradient">credential.</span></>}
        subtitle="Enter the serial number printed on a Brave Skill certificate. Every valid credential is recorded in our system."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Verify certificate" }]}
      />

      <section className="py-14">
        <div className="container-bs grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <form action="/verify" className="rounded-2xl border border-white/[0.08] bg-[#0B0E18] p-6">
              <label htmlFor="serial" className="label">Certificate serial number</label>
              <div className="relative">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5F6B7E]" />
                <input
                  id="serial"
                  name="serial"
                  required
                  defaultValue={cleaned}
                  placeholder="BS-2026-XXXXXXXX"
                  className="field h-12 pl-10 uppercase tracking-[0.04em]"
                />
              </div>
              <button className="btn btn-primary mt-4 w-full">Verify certificate</button>
              <p className="mt-3 text-center text-[10px] text-[#5F6B7E]">Serial numbers are not case sensitive.</p>
            </form>

            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <p className="flex items-center gap-2 text-[11.5px] font-medium text-white"><ShieldCheck size={14} className="text-[#10C99A]" /> How verification works</p>
              <p className="mt-2 text-[11px] leading-relaxed text-[#7C8AA3]">
                Each certificate is generated with a unique serial and a cryptographic hash bound to the graduate and the course.
                A record only exists here if the academy issued it after a learner passed the required assessment.
              </p>
            </div>
          </div>

          <div>
            {!cleaned && (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] text-[#6F7C90]"><BadgeCheck size={22} /></span>
                <p className="mt-4 text-[13px] font-medium text-white">Awaiting a serial number</p>
                <p className="mt-1.5 max-w-xs text-[11.5px] leading-relaxed text-[#7C8AA3]">
                  Enter the serial found at the bottom of the certificate. It looks like BS-2026-4F2A9C.
                </p>
              </div>
            )}

            {cleaned && !certificate && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.07] p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300"><XCircle size={19} /></span>
                  <div>
                    <p className="text-[13.5px] font-medium text-white">No certificate found</p>
                    <p className="text-[10.5px] text-rose-200/70">Serial {cleaned} is not in the registry.</p>
                  </div>
                </div>
                <p className="mt-4 text-[11.5px] leading-relaxed text-[#B9A2AC]">
                  Check the spelling carefully. If you believe this is an error, contact support with a photo of the certificate.
                </p>
                <Link href="/contact" className="btn btn-ghost btn-sm mt-4">Contact support</Link>
              </div>
            )}

            {certificate && (
              <div className={`overflow-hidden rounded-2xl border ${certificate.revokedAt ? "border-rose-400/25 bg-rose-500/[0.05]" : "border-emerald-400/25 bg-emerald-500/[0.05]"}`}>
                <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] p-5">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${certificate.revokedAt ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                      {certificate.revokedAt ? <AlertTriangle size={19} /> : <BadgeCheck size={19} />}
                    </span>
                    <div>
                      <p className="text-[13.5px] font-medium text-white">{certificate.revokedAt ? "Certificate revoked" : "Valid certificate"}</p>
                      <p className="num text-[10.5px] text-[#7C8AA3]">{certificate.serial}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${certificate.revokedAt ? "border-rose-400/30 text-rose-300" : "border-emerald-400/30 text-emerald-300"}`}>
                    {certificate.revokedAt ? "Revoked" : "Verified"}
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Awarded to</p>
                    <p className="text-[19px] font-semibold tracking-[-0.02em] text-white">{certificate.recipientName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Programme completed</p>
                    <p className="text-[13px] text-[#C3CEDF]">{certificate.courseTitle}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Issued</p>
                      <p className="text-[12px] text-white">{formatDate(certificate.issuedAt)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Status</p>
                      <p className={`text-[12px] ${certificate.revokedAt ? "text-rose-300" : "text-emerald-300"}`}>{certificate.revokedAt ? formatDate(certificate.revokedAt) : "Active"}</p>
                    </div>
                  </div>
                  {!certificate.revokedAt && (
                    <a href={`/api/certificates/${certificate.serial}/pdf`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm mt-1 w-full">
                      <Download size={13} /> View certificate PDF
                    </a>
                  )}
                  <p className="break-all rounded-lg bg-black/25 px-3 py-2 text-[9px] leading-relaxed text-[#5F6B7E]">
                    Integrity hash {certificate.hash}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
