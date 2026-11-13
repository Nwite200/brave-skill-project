# Cinematic brand intro

The Brave Skill identity opens with a 15-second cinematic film and a family of
reusable transitions. Everything is code-rendered from one deterministic canvas
renderer, so the film, the website, the dashboards and the Android splash share the
same logo geometry, colours and timing.

**LEARN. PRACTICE. BUILD.**

---

## 1. Creative direction

| Element | Decision |
| --- | --- |
| Background | `#050509` near-black with a restrained purple core glow |
| Light | Purple `#873BFF`, electric blue `#1677FF`, cyan `#20D9E8`, emerald `#10C99A` |
| Logo | The B monogram with graduation cap and tassel, traced with a neon light path |
| Motion | Slow, deliberate, ease-out curves; no bounce, no clutter |
| Typography | Inter 600/500 with wide tracking for the sub-brand |
| Texture | Fine film grain, vignette, floating particles, radial technology lines |
| Audio | Original synthesized ambient bed; no licensed music |

The film avoids trading imagery, coins, charts or unrelated symbols. It reads as an
education-technology company: calm, precise and premium.

---

## 2. Timeline (15 seconds)

| Time | Beat |
| --- | --- |
| 0.0–2.0s | Black. A purple light emerges; cyan/blue particles appear |
| 1.5–4.1s | Neon ring draws; cyan segment rotates with orbital nodes |
| 3.4–5.9s | The B monogram traces in; the graduation cap and tassel resolve |
| 5.8–7.3s | A specular highlight sweeps across the logo |
| 6.1–8.4s | `BRAVE SKILL` reveals with tracking-in and blur; subtitle fades |
| 8.1–9.4s | `LEARN. PRACTICE. BUILD.` appears; a light sweep crosses the line |
| 9.2–12.2s | Geometry and particles build depth; the mark pulses gently |
| 11.6–13.8s | `YOUR FUTURE STARTS HERE.` resolves with a thin light line |
| 14.3–15.0s | Elegant fade to black |

---

## 3. Deliverables

All files live in `public/brand/`:

| File | Use |
| --- | --- |
| `video/brave-skill-intro.mp4` | 15s, 1920×1080, H.264 + AAC, web/hero modal |
| `video/brave-skill-intro-4k.mp4` | 15s, 3840×2160, H.264 + AAC, master |
| `video/brave-skill-intro-poster.jpg` | Settled lockup poster (1920×1080) |
| `video/brave-skill-transition.mp4` | 2.4s, 1080×1080 transition (MP4) |
| `video/brave-skill-transition.webm` | 2.4s transition (VP9) |
| `video/brave-skill-logo-loop.webm` | 5s, 1080×1080 transparent logo loop (VP9 alpha) |
| `icon-1024.png` / `icon-512.png` | App icon / store icon |
| `logo-transparent-1024.png` | Static transparent logo |
| `logo-horizontal.svg` `logo-stacked.svg` `logo-mono.svg` | Static identity |
| `intro/index.html` + `intro/intro.js` | Live interactive film used by `/intro` |

The generated video is intentionally light (about 2.4MB for 1080p) so the website
can stream it without competing with course media.

---

## 4. Where it is used

| Surface | Version |
| --- | --- |
| Website first load | Existing 2.7s CSS intro (`components/brand/LogoIntro.tsx`) with the same ring/logo/type |
| Hero “Watch introduction” | Full 15s film in a modal (`components/marketing/WatchIntro.tsx`) |
| `/intro` | Full-screen live canvas film with downloadable masters |
| Dashboard / admin navigation | `BrandLoader` ring + monogram (route `loading.tsx`) |
| Course navigation | `BrandLoader` during course page loads |
| Android startup | Flutter splash with the same ring, monogram and tagline |
| Certificates / receipts | Static logo system |

All variants respect `prefers-reduced-motion`: CSS animations collapse, and the native
splash shortens to a static lockup.

---

## 5. Re-rendering the film

Requirements: Node 22, Chrome, ffmpeg, and a running server at `http://localhost:3000`.

```bash
npm run dev                 # in one terminal
node scripts/render-intro.mjs \
  --width=1920 --height=1080 --fps=30 --duration=15000 \
  --out=public/brand/video/brave-skill-intro.mp4
```

The renderer steps the canvas deterministically (`window.seek(ms)`) and screenshots
each frame, so the output is identical on every machine. Options:

| Flag | Meaning |
| --- | --- |
| `--mode=full` | Complete film (default) |
| `--mode=short` | 2.4s transition |
| `--mode=logo` | Transparent logo loop (WebM/VP9 alpha) |
| `--keep=true` | Keep the PNG frame sequence |
| `--base=` | Alternate server URL |

Add sound with the included ambient bed workflow or mux any approved track:

```bash
ffmpeg -i video.mp4 -i audio.m4a -c:v copy -c:a aac -shortest out.mp4
```

The 4K master uses the same command with `--width=3840 --height=2160 --fps=24`.

---

## 6. Accessibility and performance

- Decorative animation is `aria-hidden`; the logo is exposed to assistive tech via
  the static mark.
- The website does not block content on the film: the intro overlay is skippable and
  the hero video only loads when requested.
- Reduced-motion users see the static identity immediately.
- Videos use `preload="metadata"`, posters and fast-start encoding.
- Cloudflare serves these as static assets with long-lived cache headers.

---

## 7. Brand rules

- Always keep generous negative space around the ring and wordmark.
- Do not recolour the logo outside the approved purple/blue/cyan family.
- Do not add trading, finance or unrelated iconography.
- Keep the tagline as **LEARN. PRACTICE. BUILD.** with the periods.
- The final line is **YOUR FUTURE STARTS HERE.**
- Minimum clear space: half the height of the B monogram on all sides.

© Emyphill-Tech Global Solutions Limited.
