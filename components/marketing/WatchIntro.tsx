"use client";

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { BrandMark } from "@/components/brand/Logo";

function BrandFilm() {
  return (
    <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#050509]">
      <div className="absolute h-64 w-64 rounded-full bg-[#873BFF]/25 blur-[80px]" />
      <div className="absolute right-10 top-10 h-40 w-40 rounded-full bg-[#20D9E8]/15 blur-[60px]" />
      <div className="relative flex h-32 w-32 items-center justify-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-full border border-[#873BFF]/60" />
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" style={{ animation: "spinSlow 8s linear infinite" }}>
          <circle cx="100" cy="100" r="88" fill="none" stroke="#20D9E8" strokeOpacity="0.5" strokeWidth="1.2" strokeDasharray="60 400" strokeLinecap="round" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="#873BFF" strokeOpacity="0.6" strokeWidth="1.2" strokeDasharray="120 380" strokeDashoffset="-200" strokeLinecap="round" />
        </svg>
        <BrandMark size={62} />
      </div>
      <p className="mt-6 text-[10px] tracking-[0.5em] text-[#94A3B8]">BRAVE SKILL · SKILL ACQUISITION ACADEMY</p>
      <p className="mt-3 text-[13px] tracking-[0.3em] text-[#C9C2FF]">LEARN. PRACTICE. BUILD.</p>
      <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#873BFF]/60 to-transparent" />
    </div>
  );
}

export function WatchIntroButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
          <Play size={10} className="ml-0.5 fill-white" />
        </span>
        Watch introduction
      </button>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close introduction"
              className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:text-white"
            >
              <X size={16} />
            </button>
            <BrandFilm />
            <p className="mt-4 text-center text-[12px] text-[#8492A6]">
              The Brave Skill identity — one animation across web, Android and certificate.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export function HeroCopy() {
  return null;
}
