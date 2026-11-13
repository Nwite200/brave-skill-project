"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/Logo";

const STORAGE_KEY = "bs_intro_seen_v1";

export function LogoIntro({ force = false }: { force?: boolean }) {
  const [visible, setVisible] = useState(force);
  const [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      setReduced(true);
      if (!force) return;
    }
    if (!force) {
      try {
        if (sessionStorage.getItem(STORAGE_KEY)) return;
      } catch {
        return;
      }
    }
    setVisible(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
    const exit = window.setTimeout(() => setLeaving(true), force ? 2400 : 2200);
    const done = window.setTimeout(() => setVisible(false), force ? 2900 : 2700);
    return () => {
      window.clearTimeout(exit);
      window.clearTimeout(done);
    };
  }, [force]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-[#050509] transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      style={{ animation: reduced ? "none" : "fadeIn .3s ease both" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#873BFF]/20 blur-[110px]" />
        <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#20D9E8]/10 blur-[80px]" />
      </div>

      <div className="relative flex flex-col items-center">
        <div className="relative flex h-[168px] w-[168px] items-center justify-center">
          {/* outer neon ring */}
          <span
            className="absolute inset-0 rounded-full border border-[#873BFF]/50"
            style={{
              boxShadow: "0 0 40px rgba(135,59,255,.45), inset 0 0 40px rgba(135,59,255,.18)",
              animation: reduced ? "none" : "introRing .8s cubic-bezier(.2,.9,.2,1) both",
            }}
          />
          {/* rotating segments */}
          <svg
            viewBox="0 0 200 200"
            className="absolute inset-0 h-full w-full"
            style={{ animation: reduced ? "none" : "spinSlow 3.6s linear infinite" }}
          >
            <defs>
              <linearGradient id="introSegA" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#20D9E8" />
                <stop offset="1" stopColor="#1677FF" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="introSegB" x1="1" y1="0" x2="0" y2="1">
                <stop stopColor="#A855F7" />
                <stop offset="1" stopColor="#873BFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="86" stroke="url(#introSegA)" strokeWidth="2" fill="none" strokeDasharray="150 390" strokeLinecap="round" />
            <circle cx="100" cy="100" r="86" stroke="url(#introSegB)" strokeWidth="2" fill="none" strokeDasharray="90 450" strokeDashoffset="-260" strokeLinecap="round" />
            <circle cx="100" cy="100" r="74" stroke="#FFFFFF" strokeOpacity="0.06" strokeWidth="1" fill="none" />
            <circle cx="100" cy="14" r="3" fill="#20D9E8" />
          </svg>

          <div
            className="relative"
            style={{
              animation: reduced ? "none" : "introRise .9s cubic-bezier(.2,.9,.2,1) .35s both",
            }}
          >
            <BrandMark size={84} />
          </div>

          <span
            className="absolute inset-0 overflow-hidden rounded-full"
            style={{ maskImage: "radial-gradient(circle, transparent 55%, #000 56%)" }}
          >
            <span
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{ animation: reduced ? "none" : "introSweep 1.6s ease-in-out .9s both" }}
            />
          </span>
        </div>

        <div className="mt-9 overflow-hidden text-center">
          <h1
            className="text-[28px] font-bold tracking-[0.28em] text-white sm:text-[34px]"
            style={{ animation: reduced ? "none" : "introRise .7s cubic-bezier(.2,.9,.2,1) .95s both" }}
          >
            BRAVE <span className="text-gradient-cyan">SKILL</span>
          </h1>
          <p
            className="mt-3 text-[9px] tracking-[0.5em] text-[#94A3B8] sm:text-[10px]"
            style={{ animation: reduced ? "none" : "introRise .7s ease 1.25s both" }}
          >
            SKILL ACQUISITION ACADEMY
          </p>
          <p
            className="mt-6 text-[10px] font-medium tracking-[0.38em] text-[#C9C2FF]"
            style={{ animation: reduced ? "none" : "introRise .6s ease 1.55s both" }}
          >
            LEARN. <span className="text-[#20D9E8]">PRACTICE.</span> <span className="text-[#10C99A]">BUILD.</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setVisible(false)}
          className="absolute -bottom-24 rounded-full border border-white/10 px-4 py-1.5 text-[10px] tracking-[0.2em] text-white/40 transition hover:border-white/25 hover:text-white/70"
        >
          SKIP
        </button>
      </div>
    </div>
  );
}
