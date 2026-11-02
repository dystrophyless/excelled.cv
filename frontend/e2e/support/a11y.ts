import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Fails on any WCAG 2.x A/AA violation except colour contrast — the affect-ui palette (muted #8f8f8f)
 * is kept 1:1 on purpose (design-system/quality.md). The dev-only state switcher is excluded.
 */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .disableRules(["color-contrast"])
    .exclude("[data-testid=state-switcher]")
    .analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n    ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

/** Collects console errors and uncaught exceptions; assert it's empty at the end of a test. */
export function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}
