"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2, Undo2, X } from "lucide-react";

export function RefundButton({ orderId, amountLabel }: { orderId: string; amountLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed.");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[9.5px] text-[#C2CCDD] hover:border-rose-400/40 hover:text-rose-300">
        <Undo2 size={10} /> Refund
      </button>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[13px] font-semibold text-white">Refund {amountLabel}?</h3>
                <p className="mt-1 text-[10.5px] leading-relaxed text-[#8492A6]">
                  The student loses course access and any certificate is revoked. Paystack is called when configured. This action is logged.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-[#6F7C90] hover:text-white"><X size={15} /></button>
            </div>
            {error && <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-2 text-[10px] text-rose-200"><AlertCircle size={11} /> {error}</p>}
            <textarea rows={2} className="field mt-3 text-[11px]" placeholder="Reason for the refund" value={reason} onChange={(e) => setReason(e.target.value)} />
            <label className="mt-3 block text-[9.5px] text-[#6F7C90]">Type REFUND to confirm</label>
            <input className="field mt-1 h-9 text-[11px]" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm h-9 flex-1">Cancel</button>
              <button onClick={submit} disabled={busy || confirmText !== "REFUND" || reason.trim().length < 4} className="btn btn-danger btn-sm h-9 flex-1">
                {busy ? <Loader2 size={12} className="animate-spin" /> : "Process refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
