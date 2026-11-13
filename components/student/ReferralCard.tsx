"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Share2 } from "lucide-react";

export function ReferralCard() {
  const [data, setData] = useState<{ code: string; link: string; referred: number } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/me/referral")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load your referral link.");
        setData(payload);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load your referral link."));
  }, []);

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard access is unavailable. Select the link and copy it manually.");
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#20D9E8]/12 text-[#20D9E8]"><Share2 size={14} /></span>
        <div>
          <p className="text-[12.5px] font-medium text-white">Refer a friend</p>
          <p className="text-[9.5px] text-[#6F7C90]">Share your code. Rewards are not automatic while the programme is being finalised.</p>
        </div>
      </div>
      {error && <p className="mt-3 text-[10.5px] text-rose-300">{error}</p>}
      {!data && !error && <div className="mt-4 flex items-center gap-2 text-[10px] text-[#6F7C90]"><Loader2 size={12} className="animate-spin" /> Loading your link…</div>}
      {data && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2">
              <span className="num truncate text-[11px] text-white">{data.link}</span>
            </div>
            <button onClick={copy} className="btn btn-ghost btn-sm h-9"><Copy size={12} /> {copied ? "Copied" : "Copy"}</button>
          </div>
          <div className="mt-3 flex items-center gap-4 text-[10px] text-[#8492A6]">
            <span>Your code: <strong className="text-white">{data.code}</strong></span>
            <span>{data.referred} {data.referred === 1 ? "signup" : "signups"} referred</span>
          </div>
        </>
      )}
    </div>
  );
}
