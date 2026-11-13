import puppeteer from "puppeteer-core";
import fs from "fs/promises";
import path from "path";
import { execFileSync } from "child_process";

/**
 * Renders the Brave Skill cinematic intro to a video by stepping the
 * deterministic canvas renderer frame by frame.
 *
 * Usage:
 *   node scripts/render-intro.mjs --width=1920 --height=1080 --fps=30 \
 *     --duration=15000 --out=public/brand/video/brave-skill-intro.mp4
 */
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);

const width = Number(args.width || 1920);
const height = Number(args.height || 1080);
const fps = Number(args.fps || 30);
const duration = Number(args.duration || 15000);
const out = args.out || "public/brand/video/brave-skill-intro.mp4";
const mode = args.mode || "full";
const chrome = args.chrome || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const framesDir = path.resolve(args.frames || `./.intro-frames-${width}x${height}`);

const base = args.base || "http://localhost:3000";
const query = new URLSearchParams({
  record: "1",
  w: String(width),
  h: String(height),
  ...(mode === "logo" ? { logoOnly: "1", transparent: "1" } : {}),
  ...(mode === "short" ? { short: "1" } : {}),
});

await fs.mkdir(path.dirname(out), { recursive: true });
await fs.rm(framesDir, { recursive: true, force: true });
await fs.mkdir(framesDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1", "--hide-scrollbars"],
  defaultViewport: { width, height, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto(`${base}/brand/intro/index.html?${query.toString()}`, { waitUntil: "networkidle2" });
await page.waitForFunction(() => window.__READY__ === true, { timeout: 30000 });

const total = Math.round((duration / 1000) * fps);
console.log(`Rendering ${total} frames at ${width}×${height} → ${framesDir}`);

for (let i = 0; i < total; i++) {
  const t = (i / fps) * 1000;
  await page.evaluate((time) => window.seek(time), t);
  await page.screenshot({
    path: path.join(framesDir, `frame-${String(i + 1).padStart(4, "0")}.png`),
    omitBackground: mode === "logo",
  });
  if (i % 60 === 0) console.log(`  ${i}/${total}`);
}

// Poster / static frame at the settled lockup
if (mode === "full") {
  await page.evaluate(() => window.seek(14200));
  await page.screenshot({ path: path.join(path.dirname(out), "brave-skill-intro-poster.png") });
}

await browser.close();

console.log("Encoding video…");
const ffmpegArgs = [
  "-y",
  "-framerate", String(fps),
  "-i", path.join(framesDir, "frame-%04d.png"),
  ...(mode === "logo"
    ? ["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-b:v", "0", "-crf", "24", "-row-mt", "1"]
    : ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-profile:v", "high"]),
  out,
];
execFileSync("ffmpeg", ffmpegArgs, { stdio: "inherit" });

const stat = await fs.stat(out);
console.log(`✓ ${out} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
if (!args.keep) await fs.rm(framesDir, { recursive: true, force: true });
