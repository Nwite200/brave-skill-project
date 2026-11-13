"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-500/10 text-rose-300"><AlertTriangle size={22} /></span>
      <h1 className="mt-5 text-[20px] font-semibold text-white">That action could not be completed</h1>
      <p className="mt-2 text-[12px] leading-relaxed text-[#8492A6]">
        {error.message || "An unexpected error occurred while loading this console page."}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="btn btn-primary btn-sm"><RotateCcw size={12} /> Try again</button>
        <Link href="/admin" className="btn btn-ghost btn-sm">Back to dashboard</Link>
      </div>
    </div>
  );
}
