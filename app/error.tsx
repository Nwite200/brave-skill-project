"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-bs flex min-h-[60vh] max-w-lg flex-col items-center justify-center py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[#C9B8FF]"><AlertTriangle size={22} /></span>
      <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.03em] text-white">Something went wrong</h1>
      <p className="mt-2 text-[12.5px] leading-relaxed text-[#8492A6]">The page could not load. Please retry — if it keeps happening, contact support.</p>
      <div className="mt-6 flex gap-2">
        <button onClick={reset} className="btn btn-primary btn-sm">Try again</button>
        <Link href="/" className="btn btn-ghost btn-sm">Home</Link>
      </div>
    </div>
  );
}
