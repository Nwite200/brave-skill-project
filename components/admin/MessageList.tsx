"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, Mail, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";

type Message = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

export function MessageList({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const update = async (id: string, status: string) => {
    setBusy(id);
    try {
      await fetch(`/api/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15]">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <p className="text-[11.5px] font-medium text-white">Contact inbox</p>
        <p className="text-[9.5px] text-[#6F7C90]">{messages.filter((m) => m.status === "NEW").length} new enquiries</p>
      </div>
      <div className="divide-y divide-white/[0.05]">
        {messages.map((message) => (
          <div key={message.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11.5px] font-medium text-white">{message.subject}</p>
                <p className="text-[9.5px] text-[#6F7C90]">{message.name} · {message.email}{message.phone ? ` · ${message.phone}` : ""} · {formatDate(message.createdAt, true)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`rounded-full border px-1.5 py-0.5 text-[8px] uppercase ${message.status === "NEW" ? "border-amber-400/20 bg-amber-500/10 text-amber-300" : message.status === "RESOLVED" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-[#8492A6]"}`}>{message.status}</span>
                {message.status !== "RESOLVED" && (
                  <button onClick={() => update(message.id, "RESOLVED")} disabled={busy === message.id} title="Mark resolved" className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[#8492A6] hover:text-emerald-300"><Check size={10} /></button>
                )}
                <a href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject)}`} className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[#8492A6] hover:text-white"><Mail size={10} /></a>
                <button onClick={() => remove(message.id)} disabled={busy === message.id} className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[#8492A6] hover:text-rose-300">
                  {busy === message.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                </button>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[10.5px] leading-relaxed text-[#A2AFC2]">{message.message}</p>
          </div>
        ))}
        {!messages.length && <p className="px-4 py-8 text-center text-[10.5px] text-[#6F7C90]">No messages yet.</p>}
      </div>
    </div>
  );
}
