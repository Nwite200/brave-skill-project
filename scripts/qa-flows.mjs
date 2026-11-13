import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.QA_BASE || "http://localhost:3000";
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 950 },
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("401")) errors.push(`CONSOLE: ${m.text().slice(0, 240)}`);
});

const step = (name) => console.log(`\n→ ${name}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(text, selector = "button, a") {
  const handle = await page.evaluateHandle(
    (sel, t) => [...document.querySelectorAll(sel)].find((el) => el.textContent?.trim().includes(t)),
    selector,
    text,
  );
  const element = handle.asElement();
  if (!element) throw new Error(`No element containing "${text}"`);
  await page.evaluate((el) => el.click(), element);
}

async function login(email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.evaluate(() => sessionStorage.setItem("bs_intro_seen_v1", "1"));
  await sleep(1000);
  await page.type("#email", email);
  await page.waitForFunction((value) => document.querySelector("#email")?.value === value, {}, email);
  await page.type("#password", password);
  await clickText("Sign in");
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), { timeout: 30000 });
  await sleep(1200);
}

try {
  step("Register a new student through the UI");
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
  await page.evaluate(() => sessionStorage.setItem("bs_intro_seen_v1", "1"));
  await page.type("#name", "Grace E2E");
  await page.type("#email", `grace.e2e.${Date.now()}@example.com`);
  await page.type("#password", "TestPass123");
  await sleep(600);
  await page.evaluate(() => document.querySelector('input[type="checkbox"]')?.click());
  await page.waitForFunction(() => document.querySelector('input[type="checkbox"]')?.checked === true, { timeout: 5000 });
  await clickText("Create account");
  await page.waitForFunction(() => location.pathname.startsWith("/dashboard"), { timeout: 30000 });
  await sleep(900);
  console.log("   registration OK");

  step("Open a paid course and apply a discount code");
  await page.goto(`${BASE}/courses/solar-installation-inverter-technology`, { waitUntil: "networkidle2" });
  await sleep(900);
  await page.type("#coupon", "BRAVE20");
  await sleep(300);
  await clickText("Apply");
  await page.waitForFunction(() => document.body.innerText.includes("20% off"), { timeout: 10000 });
  const priceText = await page.evaluate(() => document.body.innerText.match(/₦[\d,]+/)?.[0] || "");
  console.log("   coupon applied, first price on page:", priceText);

  step("Enrol and complete the test checkout");
  await clickText("Enrol now");
  await page.waitForFunction(() => location.pathname.startsWith("/checkout/demo"), { timeout: 30000 });
  await clickText("Simulate successful payment");
  await page.waitForFunction(() => location.pathname.startsWith("/checkout/success"), { timeout: 30000 });
  await sleep(1200);
  console.log("   payment fulfilled and success page reached");

  step("Start learning from the success page");
  await clickText("Start learning");
  await page.waitForFunction(() => location.pathname.startsWith("/dashboard/courses/"), { timeout: 30000 });
  await sleep(1000);

  step("Mark a lesson complete");
  await clickText("Mark complete");
  await page.waitForFunction(() => document.body.innerText.includes("Completed") || document.body.innerText.includes("Lesson marked"), { timeout: 10000 });
  console.log("   lesson completion saved");

  step("Take the quiz through the UI");
  await page.goto(`${BASE}/dashboard/assessments`, { waitUntil: "networkidle2" });
  await page.evaluate(() => sessionStorage.setItem("bs_intro_seen_v1", "1"));
  const quizHref = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href^="/dashboard/assessments/"]')];
    return links[0]?.getAttribute("href") || null;
  });
  if (!quizHref) throw new Error("No assessment link found");
  await page.goto(`${BASE}${quizHref}`, { waitUntil: "networkidle2" });
  await clickText("Start assessment");
  await page.waitForFunction(() => document.body.innerText.includes("Question 1"), { timeout: 15000 });
  // choose first option on each question then submit
  for (let i = 0; i < 12; i++) {
    const next = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")];
      const nextBtn = buttons.find((b) => b.textContent?.trim() === "Next");
      const option = [...document.querySelectorAll("button")].find((b) => b.querySelector("span") && /^[A-D]$/.test(b.querySelector("span")?.textContent || "") && b.className.includes("border"));
      option?.click();
      if (nextBtn) {
        nextBtn.click();
        return "next";
      }
      const review = buttons.find((b) => b.textContent?.includes("Review & submit"));
      review?.click();
      return "review";
    });
    await sleep(250);
    if (next === "review") break;
  }
  await sleep(400);
  await clickText("Submit now").catch(async () => {
    await clickText("Submit");
  });
  await page.waitForFunction(
    () => /Assessment passed|Not passed this time|Time expired/.test(document.body.innerText),
    { timeout: 20000 },
  );
  console.log("   quiz submitted and graded");

  step("Admin creates and deletes a category");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await login("admin@braveskill.ng", "BraveSkill#2026");
  await page.goto(`${BASE}/admin/categories`, { waitUntil: "networkidle2" });
  await clickText("New category");
  await page.waitForSelector("#f-name", { timeout: 10000 });
  await page.type("#f-name", "QA Automation Track");
  await page.type("#f-desc", "Created by the automated end-to-end test.");
  await clickText("Create");
  await page.waitForFunction(() => document.body.innerText.includes("QA Automation Track"), { timeout: 15000 });
  console.log("   category created");
  const deleted = await page.evaluate(async () => {
    const rows = [...document.querySelectorAll("table.data tbody tr")];
    const row = rows.find((r) => r.textContent?.includes("QA Automation Track"));
    if (!row) return false;
    const buttons = [...row.querySelectorAll("button")];
    buttons[buttons.length - 1]?.click();
    return true;
  });
  if (!deleted) throw new Error("Could not find QA category row");
  await sleep(300);
  await clickText("Delete");
  await page.waitForFunction(() => !document.body.innerText.includes("QA Automation Track"), { timeout: 15000 });
  console.log("   category deleted");

  step("Admin toggles course publication");
  await page.goto(`${BASE}/admin/courses`, { waitUntil: "networkidle2" });
  const before = await page.evaluate(() => document.body.innerText);
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")].filter((b) => /Live|Draft/.test(b.textContent || ""));
    buttons[0]?.click();
  });
  await sleep(1800);
  const after = await page.evaluate(() => document.body.innerText);
  console.log("   publication toggle responded:", before !== after);

  step("Mobile navigation opens");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
  await page.evaluate(() => sessionStorage.setItem("bs_intro_seen_v1", "1"));
  await page.click('button[aria-label="Open menu"]');
  await page.waitForFunction(() => document.body.innerText.includes("My dashboard"), { timeout: 8000 });
  console.log("   mobile menu OK");

  console.log("\nAll UI flows passed.");
} catch (error) {
  console.error("\nFAILED:", error.message);
  await page.screenshot({ path: "qa-shots/e2e-failure.png", fullPage: false });
  process.exitCode = 1;
} finally {
  if (errors.length) {
    console.log("\nPage errors:");
    for (const error of [...new Set(errors)].slice(0, 10)) console.log(" -", error);
  }
  await browser.close();
}
