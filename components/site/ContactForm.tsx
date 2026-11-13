"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to send your message.");
        setStatus("idle");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Network error. Please try again.");
      setStatus("idle");
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-8 text-center">
        <CheckCircle2 size={26} className="mx-auto text-emerald-300" />
        <h3 className="mt-4 text-[18px] font-semibold text-white">Message received</h3>
        <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-[#93A1B6]">
          Thanks for reaching out. Our team will reply to your email within one business day.
        </p>
        <button type="button" onClick={() => { setStatus("idle"); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }} className="btn btn-ghost btn-sm mt-5">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/[0.08] bg-[#0B0E18] p-6">
      <h2 className="text-[17px] font-semibold text-white">Send us a message</h2>
      <p className="mt-1 text-[11.5px] text-[#7C8AA3]">Fields marked * are required.</p>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-[11.5px] text-rose-200">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="label">Full name *</label>
          <input id="c-name" required className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="c-email" className="label">Email *</label>
          <input id="c-email" type="email" required className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label htmlFor="c-phone" className="label">Phone</label>
          <input id="c-phone" type="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label htmlFor="c-subject" className="label">Subject *</label>
          <select id="c-subject" required className="field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
            <option value="">Choose a topic</option>
            <option>Course enquiry</option>
            <option>Payment or receipt</option>
            <option>Certificate verification</option>
            <option>Android app support</option>
            <option>Corporate training</option>
            <option>Something else</option>
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="c-message" className="label">Message *</label>
        <textarea id="c-message" required rows={6} className="field" placeholder="Tell us what you need help with…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>
      <button type="submit" disabled={status === "loading"} className="btn btn-primary mt-5 w-full">
        {status === "loading" ? <Loader2 size={15} className="animate-spin" /> : <><Send size={14} /> Send message</>}
      </button>
      <p className="mt-3 text-center text-[10px] text-[#5F6B7E]">Your details are used only to respond to this enquiry.</p>
    </form>
  );
}
