"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";

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
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md sm:p-6" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#7C8AA3]">Brave Skill · brand film</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close introduction"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <video
              controls
              autoPlay
              playsInline
              preload="metadata"
              poster="/brand/video/brave-skill-intro-poster.jpg"
              className="aspect-video w-full rounded-2xl border border-white/10 bg-black shadow-[0_50px_120px_-40px_rgba(0,0,0,1)]"
            >
              <source src="/brand/video/brave-skill-intro.mp4" type="video/mp4" />
            </video>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-[#6F7C90]">Learn. Practice. Build. — the Brave Skill identity.</p>
              <Link href="/intro" className="text-[10px] text-[#C9B8FF] hover:text-white">Open full-screen brand film →</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
