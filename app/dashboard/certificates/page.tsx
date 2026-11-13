import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Download, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Certificates" };
export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const user = await requireUser();
  const certificates = await db.certificate.findMany({
    where: { userId: user.id },
    orderBy: { issuedAt: "desc" },
    include: { course: { select: { title: true, category: { select: { name: true } } } } },
  });

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-white">Certificates</h1>
          <p className="mt-1 text-[12px] text-[#8492A6]">Verifiable credentials issued by the academy.</p>
        </div>
        <Link href="/verify" className="btn btn-ghost btn-sm h-9"><ShieldCheck size={12} /> Verification page</Link>
      </div>

      {certificates.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {certificates.map((certificate) => (
            <div key={certificate.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0E18]">
              <div className="relative flex aspect-[16/10] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#151027] via-[#0B0D18] to-[#081210] p-5">
                <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#873BFF]/25 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-[#10C99A]/15 blur-3xl" />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#873BFF]/40 bg-[#873BFF]/20 text-[10px] font-bold">B</span>
                    <div>
                      <p className="text-[7px] font-bold tracking-[0.18em] text-white">BRAVE SKILL</p>
                      <p className="text-[4.5px] tracking-[0.2em] text-[#20D9E8]">SKILL ACQUISITION ACADEMY</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[6px] uppercase tracking-[0.12em] text-emerald-300">Verified</span>
                </div>
                <div className="relative text-center">
                  <p className="text-[6px] tracking-[0.26em] text-[#20D9E8]">CERTIFICATE OF COMPLETION</p>
                  <p className="mt-2.5 text-[7px] text-[#7C8AA3]">This certifies that</p>
                  <p className="mt-1 text-[22px] font-semibold leading-tight text-white">{certificate.recipientName}</p>
                  <div className="mx-auto mt-2 h-px w-28 bg-gradient-to-r from-transparent via-[#873BFF] to-transparent" />
                  <p className="mx-auto mt-2 max-w-[240px] text-[9px] leading-snug text-[#D9D1FF]">{certificate.courseTitle}</p>
                </div>
                <div className="relative flex items-end justify-between border-t border-white/[0.07] pt-2">
                  <div><p className="text-[4.5px] uppercase tracking-[0.16em] text-[#6F7C90]">Issued</p><p className="text-[6px] text-white">{formatDate(certificate.issuedAt)}</p></div>
                  <p className="text-[5px] tracking-[0.24em] text-[#6F7C90]">LEARN. PRACTICE. BUILD.</p>
                  <div className="text-right"><p className="text-[4.5px] uppercase tracking-[0.16em] text-[#6F7C90]">Serial</p><p className="num text-[6px] text-white">{certificate.serial}</p></div>
                </div>
              </div>

              <div className="p-4">
                <p className="text-[12.5px] font-medium text-white">{certificate.course.title}</p>
                <p className="mt-0.5 text-[10px] text-[#6F7C90]">{certificate.course.category?.name} · Issued {formatDate(certificate.issuedAt)}</p>
                <div className="mt-3 flex gap-2">
                  <a href={`/api/certificates/${certificate.serial}/pdf`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm h-8 flex-1">
                    <Download size={11} /> Download PDF
                  </a>
                  <Link href={`/verify?serial=${certificate.serial}`} className="btn btn-ghost btn-sm h-8">Verify</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] text-[#6F7C90]"><GraduationCap size={20} /></span>
          <p className="mt-4 text-[14px] font-medium text-white">No certificate yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-[#8492A6]">
            Complete every lesson and pass the final assessment to receive a serial-numbered certificate that anyone can verify.
          </p>
          <Link href="/dashboard/assessments" className="btn btn-primary btn-sm mt-4">View assessments</Link>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-[#10C99A]/20 bg-[#10C99A]/[0.05] p-4">
        <BadgeCheck size={16} className="text-[#10C99A]" />
        <p className="flex-1 text-[10.5px] leading-relaxed text-[#93A1B6]">
          Every certificate is bound to your record with a verification hash. Employers and clients can confirm it at {` `}
          <Link href="/verify" className="text-[#C9B8FF] hover:text-white">academy.emyphilltech.com.ng/verify</Link>.
        </p>
        <span className="flex items-center gap-1 text-[9.5px] text-[#6F7C90]"><Sparkles size={10} /> {certificates.length} issued</span>
      </div>
    </div>
  );
}
