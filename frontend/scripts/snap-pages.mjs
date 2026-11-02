// Full-page screenshots of any routes, desktop and/or mobile — used by designers, QA and reviews.
// Usage: node scripts/snap-pages.mjs --base http://localhost:4173 --out snapshots [--viewport desktop|mobile|both] <path> [<path> …]
//   paths may include ?state=…   e.g. /styleguide/templates/browse?state=empty
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const [value] = args.splice(i, 2).slice(1);
  return value;
};
const base = opt("base", "http://localhost:4173");
const out = opt("out", "snapshots");
const which = opt("viewport", "both");
const paths = args;
if (!paths.length) {
  console.error("No paths given");
  process.exit(1);
}

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const selected = which === "both" ? ["desktop", "mobile"] : [which];
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
for (const vp of selected) {
  const page = await browser.newPage({ viewport: VIEWPORTS[vp], deviceScaleFactor: 1 });
  for (const path of paths) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900); // entrance animations
    const name = path.replace(/^\//, "").replace(/[/?=&]+/g, "_") || "root";
    const file = `${out}/${name}.${vp}.png`;
    await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
    console.log(file);
  }
  await page.close();
}
await browser.close();
