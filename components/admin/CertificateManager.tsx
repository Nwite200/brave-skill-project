"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Award, Download, Loader2, Plus, Search, ShieldOff, X } from "lucide-react";
import { formatDate } from "@/lib/format";

type CertificateRow = {
  id: string;
  serial: string;
  recipientName: string;
  email: string;
  courseTitle: string;
  issuedAt: string;
  revokedAt: string | null;
};

export function CertificateManager({
  certificates,
  students,
  courses,
}: {
  certificates: CertificateRow[];
  students: { id: string; name: string; email: string }[];
  courses: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(students[0]?.id || "");
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<CertificateRow | null>(null);
  const [reason, setReason] = useState("");

  const filtered = certificates.filter((c) =>
    `${c.serial} ${c.recipientName} ${c.email} ${c.courseTitle}`.toLowerCase().includes(query.toLowerCase()),
  );

  const issue = async () => {
    setBusy("issue");
    setError("");
    try {
      const res = await fetch("/api/admin/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not issue the certificate.");
      setOpen(false);
      setSuccess(`Certificate ${data.certificate.serial} issued.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not issue the certificate.");
    } finally {
      setBusy(null);
    }
  };

  const setRevoked = async (certificate: CertificateRow, revoked: boolean) => {
    setBusy(certificate.id);
    setError("");
    try {
      const res = await fetch("/api/admin/certificates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: certificate.id, revoked, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");
      setRevokeTarget(null);
      setReason("");
      setSuccess(revoked ? "Certificate revoked." : "Certificate restored.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">Commerce / certificates</p>
          <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-white">Certificates</h1>
          <p className="mt-1 text-[11.5px] text-[#8492A6]">Issue, verify and revoke credentials. Revoked certificates fail public verification immediately.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5">
            <Search size={12} className="text-[#5F6B7E]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Serial, name, course" className="w-[160px] bg-transparent text-[10.5px] text-white outline-none placeholder:text-[#3F4A5C]" />
          </div>
          <button onClick={() => setOpen(true)} disabled={!students.length || !courses.length} className="btn btn-primary btn-sm h-8"><Plus size={12} /> Issue certificate</button>
        </div>
      </div>

      {error && <p className="mt-4 flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"><AlertCircle size={12} /> {error}</p>}
      {success && <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">{success}</p>}

      <div className="mt-4 table-wrap">
        <table className="data">
          <thead>
            <tr><th>Serial</th><th>Recipient</th><th>Course</th><th>Issued</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((certificate) => (
              <tr key={certificate.id}>
                <td className="font-mono text-[10px] text-[#C9B8FF]">{certificate.serial}</td>
                <td>
                  <p className="text-[11px] text-white">{certificate.recipientName}</p>
                  <p className="text-[9px] text-[#5F6B7E]">{certificate.email}</p>
                </td>
                <td className="max-w-[220px] truncate text-[11px]">{certificate.courseTitle}</td>
                <td className="text-[10px] text-[#6F7C90]">{formatDate(certificate.issuedAt)}</td>
                <td>
                  <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[8.5px] uppercase ${certificate.revokedAt ? "border-rose-400/20 bg-rose-500/10 text-rose-300" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"}`}>
                    {certificate.revokedAt ? "Revoked" : "Valid"}
                  </span>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <a href={`/api/certificates/${certificate.serial}/pdf`} target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:text-white" title="Download PDF"><Download size={11} /></a>
                    {certificate.revokedAt ? (
                      <button onClick={() => setRevoked(certificate, false)} disabled={busy === certificate.id} className="flex h-7 items-center rounded-md border border-white/10 px-2 text-[9px] text-emerald-300 hover:border-emerald-400/40">
                        {busy === certificate.id ? <Loader2 size={10} className="animate-spin" /> : "Restore"}
                      </button>
                    ) : (
                      <button onClick={() => setRevokeTarget(certificate)} className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:border-rose-400/40 hover:text-rose-300" title="Revoke"><ShieldOff size={11} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={6} className="py-12 text-center text-[11px] text-[#6F7C90]">No certificates issued yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-white">Issue a certificate</h2>
              <button onClick={() => setOpen(false)} className="text-[#6F7C90] hover:text-white"><X size={15} /></button>
            </div>
            <p className="mt-1 text-[10.5px] text-[#8492A6]">Use for verified completions. The student must already be enrolled.</p>
            {error && <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-2 text-[10.5px] text-rose-200">{error}</p>}
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Student</label>
                <select className="field h-10 text-[12px]" value={userId} onChange={(e) => setUserId(e.target.value)}>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.email}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Course</label>
                <select className="field h-10 text-[12px]" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm h-9">Cancel</button>
              <button onClick={issue} disabled={busy === "issue"} className="btn btn-primary btn-sm h-9">{busy === "issue" ? <Loader2 size={12} className="animate-spin" /> : <><Award size={12} /> Issue</>}</button>
            </div>
          </div>
        </div>
      )}

      {revokeTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <h3 className="text-[13px] font-semibold text-white">Revoke certificate?</h3>
            <p className="mt-1 text-[10.5px] leading-relaxed text-[#8492A6]">{revokeTarget.serial} for {revokeTarget.recipientName} will fail public verification.</p>
            <input className="field mt-3 h-9 text-[11px]" placeholder="Reason for revocation" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setRevokeTarget(null)} className="btn btn-ghost btn-sm h-9 flex-1">Cancel</button>
              <button onClick={() => setRevoked(revokeTarget, true)} disabled={busy === revokeTarget.id || reason.trim().length < 3} className="btn btn-danger btn-sm h-9 flex-1">
                {busy === revokeTarget.id ? <Loader2 size={12} className="animate-spin" /> : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
