export function BrandLoader({ label = "Brave Skill" }: { label?: string }) {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-6 bg-[#050509]">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-full border border-[#873BFF]/40" />
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" style={{ animation: "spinSlow 3.2s linear infinite" }}>
          <circle cx="100" cy="100" r="88" fill="none" stroke="#20D9E8" strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="70 420" strokeLinecap="round" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="#873BFF" strokeOpacity="0.6" strokeWidth="1.4" strokeDasharray="120 380" strokeDashoffset="-220" strokeLinecap="round" />
        </svg>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#873BFF]/40 bg-[#873BFF]/15 text-[16px] font-bold text-white">
          B
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-semibold tracking-[0.4em] text-white/80">{label.toUpperCase()}</p>
        <p className="mt-2 text-[8px] tracking-[0.34em] text-[#6F7C90]">LEARN. PRACTICE. BUILD.</p>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
