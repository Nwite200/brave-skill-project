import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const out = path.resolve("public/brand");
await fs.mkdir(out, { recursive: true });

const mark = await fs.readFile(path.join(out, "mark.svg"), "utf8");
const markInner = mark.trim().replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");

/* ── icon exports ─────────────────────────────────────────────── */
const iconSizes = [512, 192, 144, 96, 72, 48];
for (const size of iconSizes) {
  await sharp(Buffer.from(mark))
    .resize(size, size)
    .png()
    .toFile(path.join(out, `icon-${size}.png`));
}
await sharp(Buffer.from(mark)).resize(180, 180).png().toFile(path.join(out, "apple-touch-icon.png"));
await sharp(Buffer.from(mark)).resize(32, 32).png().toFile(path.join(out, "favicon-32.png"));
await sharp(Buffer.from(mark)).resize(16, 16).png().toFile(path.join(out, "favicon-16.png"));

/* Android adaptive icon foreground (transparent, centred mark) */
const fg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432" width="432" height="432">
  <g transform="translate(108 108) scale(2.25)">${markInner}</g>
</svg>`;
await sharp(Buffer.from(fg)).png().toFile(path.join(out, "android-foreground.png"));

/* ── horizontal logo ──────────────────────────────────────────── */
const horizontal = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 96" width="440" height="96">
  <g>${markInner}</g>
  <text x="114" y="50" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="700" font-size="30" letter-spacing="2.5" fill="#FFFFFF">BRAVE<tspan fill="#20D9E8"> SKILL</tspan></text>
  <text x="116" y="74" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="500" font-size="8.4" letter-spacing="4.4" fill="#94A3B8">SKILL ACQUISITION ACADEMY</text>
</svg>`;
await fs.writeFile(path.join(out, "logo-horizontal.svg"), horizontal);
await sharp(Buffer.from(horizontal)).png().toFile(path.join(out, "logo-horizontal.png"));

/* ── stacked logo ─────────────────────────────────────────────── */
const stacked = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 230" width="320" height="230">
  <g transform="translate(112 10)">${markInner}</g>
  <text x="160" y="166" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="700" font-size="30" letter-spacing="3" fill="#FFFFFF">BRAVE <tspan fill="#20D9E8">SKILL</tspan></text>
  <text x="160" y="194" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="500" font-size="8.6" letter-spacing="5.4" fill="#94A3B8">SKILL ACQUISITION ACADEMY</text>
  <text x="160" y="218" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="500" font-size="7.6" letter-spacing="4.2" fill="#C9C2FF">LEARN. PRACTICE. BUILD.</text>
</svg>`;
await fs.writeFile(path.join(out, "logo-stacked.svg"), stacked);
await sharp(Buffer.from(stacked)).png().toFile(path.join(out, "logo-stacked.png"));

/* ── icon-only / mono ─────────────────────────────────────────── */
await fs.copyFile(path.join(out, "mark.svg"), path.join(out, "logo-icon.svg"));
const mono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs><linearGradient id="m" x1="14" y1="8" x2="82" y2="90" gradientUnits="userSpaceOnUse">
    <stop stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9C2FF"/></linearGradient></defs>
  <path d="M20 27.5 L48 14 L76 27.5 L48 41 Z" fill="#FFFFFF" fill-opacity="0.9"/>
  <path d="M67 31.5 C73 34 74 40 74 45" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M31 43 V80 M31 43 H51.5 C59.5 43 64.5 47.5 64.5 54.5 C64.5 61.5 59.5 66 51.5 66 H31 M31 66 H55 C63 66 68.5 70.5 68.5 78 C68.5 85 63 89 55 89 H31" stroke="url(#m)" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
await fs.writeFile(path.join(out, "logo-mono.svg"), mono);

const certLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 96" width="440" height="96">
  <g>${markInner}</g>
  <text x="114" y="50" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="700" font-size="28" letter-spacing="4" fill="#FFFFFF">BRAVE SKILL</text>
  <text x="116" y="74" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="500" font-size="8.4" letter-spacing="4.4" fill="#20D9E8">SKILL ACQUISITION ACADEMY</text>
</svg>`;
await fs.writeFile(path.join(out, "logo-certificate.svg"), certLogo);

/* ── favicon ──────────────────────────────────────────────────── */
await fs.copyFile(path.join(out, "mark.svg"), path.join(out, "favicon.svg"));

/* ── Open Graph image ─────────────────────────────────────────── */
const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#08060F"/><stop offset="0.55" stop-color="#050509"/><stop offset="1" stop-color="#0A1218"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="0%" r="65%">
      <stop stop-color="#873BFF" stop-opacity="0.45"/><stop offset="1" stop-color="#873BFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop stop-color="#873BFF"/><stop offset="1" stop-color="#20D9E8"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g opacity="0.09" stroke="#FFFFFF">
    ${Array.from({ length: 19 }, (_, i) => `<line x1="${i * 64}" y1="0" x2="${i * 64}" y2="630"/>`).join("")}
    ${Array.from({ length: 10 }, (_, i) => `<line x1="0" y1="${i * 64}" x2="1200" y2="${i * 64}"/>`).join("")}
  </g>
  <path d="M-50 500 C 260 380, 520 620, 860 380 C 1040 250, 1140 300, 1260 180" fill="none" stroke="url(#line)" stroke-opacity="0.5" stroke-width="1.4"/>
  <path d="M-50 560 C 300 450, 560 660, 920 430" fill="none" stroke="#20D9E8" stroke-opacity="0.2" stroke-width="0.8"/>
  <g transform="translate(96 96) scale(1.15)">${markInner}</g>
  <text x="240" y="150" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="700" font-size="42" letter-spacing="4" fill="#FFFFFF">BRAVE SKILL</text>
  <text x="242" y="182" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="500" font-size="13" letter-spacing="6.4" fill="#20D9E8">SKILL ACQUISITION ACADEMY</text>
  <text x="96" y="360" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="600" font-size="72" letter-spacing="-3" fill="#FFFFFF">Learn practical skills.</text>
  <text x="96" y="438" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="600" font-size="72" letter-spacing="-3" fill="#B79BFF">Build your future.</text>
  <text x="100" y="492" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="400" font-size="19" fill="#94A3B8">Solar · CCTV · Electrical · Networking · Access Control</text>
  <rect x="98" y="532" width="220" height="2" fill="url(#line)"/>
  <text x="98" y="572" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="500" font-size="13" letter-spacing="4" fill="#94A3B8">LEARN. PRACTICE. BUILD.</text>
</svg>`;
await fs.writeFile(path.join(out, "og-image.svg"), og);
await sharp(Buffer.from(og)).png().toFile(path.join(out, "og-image.png"));

/* ── Google Play feature graphic ──────────────────────────────── */
const feature = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
  <defs>
    <linearGradient id="fbg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#08060F"/><stop offset="0.6" stop-color="#0A0B13"/><stop offset="1" stop-color="#0B1620"/></linearGradient>
    <linearGradient id="fl" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#873BFF"/><stop offset="1" stop-color="#20D9E8"/></linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#fbg)"/>
  <circle cx="120" cy="40" r="220" fill="#873BFF" opacity="0.18"/>
  <circle cx="920" cy="470" r="200" fill="#20D9E8" opacity="0.10"/>
  <g transform="translate(84 66) scale(1.1)">${markInner}</g>
  <text x="232" y="120" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="700" font-size="32" letter-spacing="3" fill="#FFFFFF">BRAVE SKILL</text>
  <text x="234" y="146" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="500" font-size="10" letter-spacing="5" fill="#20D9E8">SKILL ACQUISITION ACADEMY</text>
  <text x="84" y="290" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="600" font-size="58" letter-spacing="-2" fill="#FFFFFF">Learn practical skills.</text>
  <text x="84" y="350" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="600" font-size="58" letter-spacing="-2" fill="#B79BFF">Build your future.</text>
  <text x="88" y="400" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="400" font-size="17" fill="#94A3B8">Video lessons · PDFs · Assessments · Verifiable certificates</text>
  <rect x="86" y="432" width="190" height="2" fill="url(#fl)"/>
  <text x="86" y="466" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="500" font-size="11" letter-spacing="4" fill="#94A3B8">LEARN. PRACTICE. BUILD.</text>
</svg>`;
await fs.writeFile(path.join(out, "play-feature-graphic.svg"), feature);
await sharp(Buffer.from(feature)).png().toFile(path.join(out, "play-feature-graphic.png"));

console.log("Brand assets generated.");
