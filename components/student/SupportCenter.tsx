"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, LifeBuoy, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/format";

type Ticket = {
  id: string;
  reference: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
};

export function SupportCenter({ tickets: initial }: { tickets: Ticket[] }) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initial);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create the ticket.");
      setTickets((prev) => [data.ticket, ...prev]);
      setSubject("");
      setMessage("");
      setSuccess(`Ticket ${data.ticket.reference} created. The team will reply by email.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the ticket.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[860px]">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-white">Support</h1>
        <p className="mt-1 text-[12px] text-[#8492A6]">Create a ticket and track replies from the academy team.</p>
      </div>

      <form onSubmit={submit} className="mt-5 rounded-2xl border border-white/[0.08] bg-[#0B0E18] p-5">
        <div className="flex items-center gap-2">
          <LifeBuoy size={15} className="text-[#20D9E8]" />
          <h2 className="text-[13px] font-semibold text-white">New ticket</h2>
        </div>
        {error && <p className="mt-3 flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"><AlertCircle size={12} /> {error}</p>}
        {success && <p className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200"><CheckCircle2 size={12} /> {success}</p>}
        <div className="mt-3">
          <label className="label">Subject</label>
          <input className="field" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Short summary of the issue" required minLength={3} />
        </div>
        <div className="mt-3">
          <label className="label">What happened?</label>
          <textarea className="field" rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Include a course name and transaction reference if relevant." required minLength={10} />
        </div>
        <button type="submit" disabled={busy} className="btn btn-primary btn-sm mt-4 h-9">
          {busy ? <Loader2 size={12} className="animate-spin" /> : "Create ticket"}
        </button>
        <p className="mt-2 text-[9px] text-[#5F6B7E]">Never include your password, PIN or OTP.</p>
      </form>

      <div className="mt-6 space-y-2">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-medium text-white">{ticket.subject}</p>
                <p className="num text-[9px] text-[#6F7C90]">{ticket.reference} · {formatDate(ticket.createdAt, true)}</p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[8.5px] uppercase ${ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : "border-amber-400/20 bg-amber-500/10 text-amber-300"}`}>{ticket.status.replace("_", " ")}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-[#9AA6BA]">{ticket.message}</p>
          </div>
        ))}
        {!tickets.length && <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-[11px] text-[#6F7C90]">No tickets yet.</p>}
      </div>
    </div>
  );
}
