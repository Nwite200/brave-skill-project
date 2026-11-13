import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Brand film",
  description: "The Brave Skill cinematic brand introduction.",
};

export default function IntroPage() {
  return (
    <main className="relative min-h-screen bg-[#050509]">
      <iframe
        src="/brand/intro/index.html"
        title="Brave Skill cinematic brand intro"
        allow="autoplay; fullscreen"
        className="h-screen w-full border-0"
      />
      <Link
        href="/"
        className="fixed left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[10px] text-white/70 backdrop-blur transition hover:border-white/30 hover:text-white"
      >
        <ArrowLeft size={12} /> Back to academy
      </Link>
      <div className="fixed right-4 top-4 z-20 flex flex-wrap justify-end gap-1.5">
        {[
          { href: "/brand/video/brave-skill-intro-4k.mp4", label: "4K film" },
          { href: "/brand/video/brave-skill-intro.mp4", label: "1080p" },
          { href: "/brand/video/brave-skill-logo-loop.webm", label: "Logo · alpha" },
          { href: "/brand/video/brave-skill-transition.mp4", label: "Transition" },
        ].map((asset) => (
          <a
            key={asset.href}
            href={asset.href}
            download
            className="rounded-full border border-white/12 bg-black/40 px-2.5 py-1.5 text-[9px] text-white/55 backdrop-blur transition hover:border-white/30 hover:text-white"
          >
            {asset.label}
          </a>
        ))}
      </div>
    </main>
  );
}
