import puppeteer from "puppeteer-core";
import fs from "fs/promises";
import path from "path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.QA_BASE || "http://localhost:3000";
const OUT = process.env.QA_OUT || "./qa-shots";
await fs.mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
});

const errors = [];
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(`PAGEERROR ${err.message}`));

async function shot(name, url, opts = {}) {
  await page.setViewport(opts.viewport || { width: 1440, height: 1000, deviceScaleFactor: 1 });
  const res = await page.goto(`${BASE}${url}`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, opts.wait || 700));
  if (opts.skipIntro) {
    await page.evaluate(() => sessionStorage.setItem("bs_intro_seen_v1", "1"));
  }
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: Boolean(opts.full) });
  console.log(`${res?.status()} ${url} → ${name}.png`);
}

async function login(email, password) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.evaluate(() => sessionStorage.setItem("bs_intro_seen_v1", "1"));
  await page.type("#email", email);
  await page.type("#password", password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await new Promise((r) => setTimeout(r, 1200));
}

await page.goto(BASE, { waitUntil: "networkidle2" });
await page.evaluate(() => sessionStorage.setItem("bs_intro_seen_v1", "1"));

await shot("home", "/", { full: false, skipIntro: true });
await shot("home-full", "/", { full: true, skipIntro: true });
await shot("home-mobile", "/", { viewport: { width: 390, height: 844, deviceScaleFactor: 2 }, full: false, skipIntro: true });
await shot("courses", "/courses", { skipIntro: true });
await shot("course-detail", "/courses/solar-installation-inverter-technology", { skipIntro: true });
await shot("course-detail-full", "/courses/solar-installation-inverter-technology", { full: true, skipIntro: true });
await shot("about", "/about", { skipIntro: true });
await shot("faqs", "/faqs", { skipIntro: true });
await shot("download", "/download", { skipIntro: true });
await shot("login", "/login", { skipIntro: true });
await shot("register", "/register", { skipIntro: true });
await shot("verify", "/verify?serial=BS-2026-D7A882C1", { skipIntro: true });

await login("student@braveskill.ng", "BraveSkill#2026");
await shot("dashboard", "/dashboard", { skipIntro: true });
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
await page.evaluate(() => sessionStorage.setItem("bs_intro_seen_v1", "1"));
await shot("dashboard-mobile", "/dashboard", { viewport: { width: 390, height: 844, deviceScaleFactor: 2 }, skipIntro: true });
await shot("my-courses", "/dashboard/courses", { skipIntro: true });
const courseId = await page.evaluate(async () => {
  const res = await fetch("/api/me");
  return null;
});
await shot("learning", "/dashboard/courses/cmwf312n8000is7kj0uxnv9zq", { skipIntro: true });
await shot("assessments", "/dashboard/assessments", { skipIntro: true });
await shot("certificates", "/dashboard/certificates", { skipIntro: true });
await shot("payments", "/dashboard/payments", { skipIntro: true });
await shot("notifications", "/dashboard/notifications", { skipIntro: true });
await shot("settings", "/dashboard/settings", { skipIntro: true });

await login("admin@braveskill.ng", "BraveSkill#2026");
await shot("admin", "/admin", { skipIntro: true });
await shot("admin-courses", "/admin/courses", { skipIntro: true });
await shot("admin-course-edit", "/admin/courses/cmwf312n8000is7kj0uxnv9zq", { skipIntro: true, full: true });
await shot("admin-students", "/admin/students", { skipIntro: true });
await shot("admin-transactions", "/admin/transactions", { skipIntro: true });
await shot("admin-revenue", "/admin/revenue", { skipIntro: true });
await shot("admin-website", "/admin/website", { skipIntro: true });

await browser.close();

if (errors.length) {
  console.log(`\nConsole errors (${errors.length}):`);
  for (const error of [...new Set(errors)].slice(0, 20)) console.log(" -", error.slice(0, 300));
  process.exitCode = 1;
} else {
  console.log("\nNo console errors.");
}
