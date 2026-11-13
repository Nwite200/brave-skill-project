import Link from "next/link";

type LogoProps = {
  variant?: "full" | "stacked" | "icon" | "mono" | "certificate";
  size?: number;
  href?: string | null;
  className?: string;
  showTagline?: boolean;
};

const neon = "bs-neon";
const soft = "bs-soft";

function Mark({ size = 40, mono = false }: { size?: number; mono?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      role="img"
      aria-label="Brave Skill"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={neon} x1="14" y1="8" x2="82" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A855F7" />
          <stop offset="0.45" stopColor="#1677FF" />
          <stop offset="1" stopColor="#20D9E8" />
        </linearGradient>
        <linearGradient id={soft} x1="30" y1="38" x2="70" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor={mono ? "#FFFFFF" : "#C9C2FF"} />
        </linearGradient>
        <linearGradient id="bs-bg" x1="12" y1="8" x2="86" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#171029" />
          <stop offset="1" stopColor="#080A12" />
        </linearGradient>
      </defs>
      {!mono && (
        <>
          <rect x="1.5" y="1.5" width="93" height="93" rx="25" fill="url(#bs-bg)" stroke="url(#bs-neon)" strokeWidth="1.4" />
          <rect x="7" y="7" width="82" height="82" rx="20" fill="none" stroke="#FFFFFF" strokeOpacity="0.05" />
        </>
      )}
      {/* graduation cap */}
      <path d="M20 27.5 L48 14 L76 27.5 L48 41 Z" fill={`url(#${neon})`} />
      <path d="M67 31.5 C73 34 74 40 74 45" stroke={`url(#${neon})`} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="74" cy="47.5" r="2.6" fill="#20D9E8" />
      {/* B monogram / open book */}
      <path
        d="M31 43 V80 M31 43 H51.5 C59.5 43 64.5 47.5 64.5 54.5 C64.5 61.5 59.5 66 51.5 66 H31 M31 66 H55 C63 66 68.5 70.5 68.5 78 C68.5 85 63 89 55 89 H31"
        stroke={`url(#${soft})`}
        strokeWidth="6.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!mono && <circle cx="76" cy="79" r="3.4" fill="#10C99A" />}
    </svg>
  );
}

export function Logo({ variant = "full", size = 40, href = "/", className = "", showTagline = true }: LogoProps) {
  const content =
    variant === "icon" ? (
      <span className={`inline-flex items-center ${className}`}>
        <Mark size={size} mono={false} />
      </span>
    ) : variant === "mono" ? (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        <Mark size={size} mono />
        <span className="font-semibold tracking-[0.22em] text-white" style={{ fontSize: size * 0.4 }}>
          BRAVE SKILL
        </span>
      </span>
    ) : variant === "certificate" ? (
      <span className={`inline-flex items-center gap-3 ${className}`}>
        <Mark size={size} mono />
        <span className="flex flex-col leading-none">
          <span className="font-bold tracking-[0.16em] text-white" style={{ fontSize: size * 0.36 }}>
            BRAVE SKILL
          </span>
          <span className="mt-1 tracking-[0.32em] text-[#20D9E8]" style={{ fontSize: size * 0.16 }}>
            SKILL ACQUISITION ACADEMY
          </span>
        </span>
      </span>
    ) : variant === "stacked" ? (
      <span className={`inline-flex flex-col items-center gap-3 ${className}`}>
        <Mark size={size} />
        <span className="flex flex-col items-center leading-none">
          <span className="font-bold tracking-[0.18em] text-white" style={{ fontSize: size * 0.3 }}>
            BRAVE <span className="text-gradient-cyan">SKILL</span>
          </span>
          <span className="mt-2 tracking-[0.4em] text-[#94A3B8]" style={{ fontSize: Math.max(7, size * 0.13) }}>
            SKILL ACQUISITION ACADEMY
          </span>
        </span>
      </span>
    ) : (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        <Mark size={size} />
        <span className="flex flex-col leading-none">
          <span className="font-bold tracking-[0.12em] text-white" style={{ fontSize: size * 0.42 }}>
            BRAVE <span className="text-gradient-cyan">SKILL</span>
          </span>
          {showTagline && (
            <span className="mt-1.5 tracking-[0.26em] text-[#7C8AA3]" style={{ fontSize: Math.max(6.5, size * 0.155) }}>
              SKILL ACQUISITION ACADEMY
            </span>
          )}
        </span>
      </span>
    );

  if (!href) return content;
  return (
    <Link href={href} aria-label="Brave Skill home" className="inline-flex">
      {content}
    </Link>
  );
}

export { Mark as BrandMark };
