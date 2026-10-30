// Screenshots every /styleguide section (for visual review against affect-ui references).
// Usage: node scripts/snap-styleguide.mjs <base-url> <out-dir>
import { chromium } from "@playwright/test";

const [base = "http://localhost:4173", out = "snapshots"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${base}/styleguide`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500); // let entrance animations settle
for (const section of await page.locator("section[data-testid^='styleguide-']").all()) {
  const id = await section.getAttribute("data-testid");
  await section.screenshot({ path: `${out}/${id}.png`, animations: "disabled" });
}
console.log("Inter loaded:", await page.evaluate(() => document.fonts.check("500 14px Inter")));
await browser.close();
