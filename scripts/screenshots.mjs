// Captures every major screen at desktop and phone widths (used for the README and visual review).
//   BASE=http://localhost:3000 EMAIL=… PASSWORD=… node scripts/screenshots.mjs [outDir] [--full]
// Needs a local Chrome (or set CHROME_PATH). Member pages are captured when EMAIL/PASSWORD are set.
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.argv[2] ?? "docs/screenshots";
const FULL = process.argv.includes("--full");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const PUBLIC = [
  ["landing", "/"],
  ["arena", "/arena"],
  ["game-reaction", "/arena/reaction-time"],
  ["leaderboards", "/leaderboards"],
  ["directory", "/directory"],
  ["directory-test", "/directory/mensa-norway"],
  ["forum", "/forum"],
  ["thread", "/forum/t/1"],
  ["join", "/join"],
  ["login", "/login"],
  ["about", "/about"],
  ["privacy", "/privacy"],
  ["not-found", "/this-door-does-not-exist"],
];
const MEMBER = [
  ["home", "/home"],
  ["profile", "/u/test_initiate"],
  ["settings-profile", "/settings/profile"],
  ["settings-privacy", "/settings/privacy"],
  ["messages", "/messages"],
  ["notifications", "/notifications"],
  ["moderation", "/mod?status=closed"],
  ["new-thread", "/forum/new"],
];
const VIEWPORTS = [
  ["desktop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });

async function capture(context, name, path, label) {
  const page = await context.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem("ue-cookie-notice-v1", "1");
    } catch {}
  });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" }).catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal{display:none!important} .grain::after{display:none}" });
  await page.evaluate(() => document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-revealed")));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  const png = await page.screenshot({ fullPage: FULL });
  await sharp(png).jpeg({ quality: 80, mozjpeg: true }).toFile(`${OUT}/${name}-${label}.jpg`);
  await page.close();
  console.log("captured", name, label);
}

for (const [label, viewport] of VIEWPORTS) {
  const guest = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: "dark", reducedMotion: "reduce" });
  for (const [name, path] of PUBLIC) await capture(guest, name, path, label);
  await guest.close();

  if (process.env.EMAIL && process.env.PASSWORD) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: "dark", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill("#email", process.env.EMAIL);
    await page.fill("#password", process.env.PASSWORD);
    await Promise.all([page.waitForURL(/\/home/), page.click("button[type=submit]")]);
    await page.close();
    for (const [name, path] of MEMBER) await capture(ctx, name, path, label);
    await ctx.close();
  }
}
await browser.close();
