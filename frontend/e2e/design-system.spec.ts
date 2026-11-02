import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";
import { account } from "./support/auth-api";

/*
 * Guards the design system itself: every reference template and state renders without errors and passes axe,
 * and the interactive behaviour the templates demonstrate (filters, row actions, undo, menus) actually works.
 * Feature specs (e2e/<feature>.spec.ts) follow the same pattern.
 */

/*
 * /app/* and /company/* are behind the role guards (feature 001-user-auth), so these demo-route tests run signed in:
 * /me answers as an employer for /company/* pages and as a student everywhere else.
 */
test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", (route) => {
    const from = route.request().headers()["referer"] ?? "";
    const role = new URL(from, "http://localhost").pathname.startsWith("/company") ? "employer" : "student";
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ account: account(role) }) });
  });
});

const TEMPLATE_STATES: Record<string, string[]> = {
  auth: ["sign-in", "sign-up", "error", "verify"],
  wizard: ["default"],
  dashboard: ["default", "loading", "empty", "error"],
  browse: ["default", "loading", "empty", "error"],
  detail: ["default", "loading", "not-found"],
  tracker: ["default", "empty"],
  pipeline: ["default", "empty"],
  table: ["default", "empty"],
  form: ["default", "error"],
  "vacancy-edit": ["default", "error"],
  candidate: ["default"],
  saved: ["default", "loading", "empty"],
  profile: ["default", "loading"],
  settings: ["default", "confirm-delete"],
  landing: ["default"],
};

for (const [template, states] of Object.entries(TEMPLATE_STATES)) {
  for (const state of states) {
    test(`template ${template} · ${state}`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(`/styleguide/templates/${template}?state=${state}`);
      await expect(page.locator("body")).not.toBeEmpty();
      await expectNoA11yViolations(page);
      // no horizontal page scroll at any width (wide content scrolls inside its own container)
      // compare with the device width: mobile browsers widen the layout viewport to fit overflowing content
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(errors).toEqual([]);
    });
  }
}

test("styleguide renders and passes axe", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/styleguide");
  await expect(page.getByRole("heading", { level: 1, name: "Styleguide" })).toBeVisible();
  await expectNoA11yViolations(page);
  expect(errors).toEqual([]);
});

test("app routes show the templates and highlight the nav", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "nav collapses into the sheet");
  await page.goto("/app/applications");
  await expect(page.getByRole("heading", { level: 1, name: "Applications" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Applications" })).toHaveAttribute("aria-current", "page");
  await page.goto("/company/candidates/c1");
  await expect(page.getByRole("link", { name: "Vacancies" })).toHaveAttribute("aria-current", "page");
});

test("account menu opens and lists profile actions", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "header actions collapse on mobile");
  await page.goto("/app");
  await page.getByTestId("account-menu").click();
  await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible();
});

test("row menu is keyboard operable", async ({ page }) => {
  await page.goto("/app/applications");
  const trigger = page.getByRole("button", { name: "Actions for Backend Intern (Python)" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Open vacancy" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Withdraw application" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("browse: search, type and filters narrow the results", async ({ page }, info) => {
  await page.goto("/app/vacancies");
  const count = page.getByText(/^\d+ vacanc(y|ies)$/);
  await expect(count).toHaveText("8 vacancies");
  await page.getByRole("searchbox", { name: "Search vacancies" }).fill("fastapi");
  await expect(count).toHaveText("2 vacancies");
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("radio", { name: "Jobs" }).click();
  await expect(count).toHaveText("3 vacancies");
  if (info.project.name === "desktop") {
    await page.getByRole("checkbox", { name: "Remote" }).click();
    await expect(count).toHaveText("2 vacancies");
    await page.getByRole("button", { name: "Clear filters" }).first().click();
    await expect(count).toHaveText("8 vacancies");
  }
});

test("select: keyboard opens, moves and chooses", async ({ page }) => {
  await page.goto("/app/vacancies");
  const sort = page.getByRole("combobox", { name: /Sort by/ });
  await sort.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(sort).toContainText("Newest");
  await expect(page.getByRole("listbox")).toBeHidden();
});

test("tracker: status tabs filter, withdraw can be undone", async ({ page }) => {
  await page.goto("/app/applications");
  await expect(page.getByTestId("application-row")).toHaveCount(3);
  await page.getByRole("radio", { name: /Interviews/ }).click();
  await expect(page.getByTestId("application-row")).toHaveCount(1);
  await page.getByRole("radio", { name: /Active/ }).click();
  await page.getByRole("button", { name: "Actions for QA Engineer Intern" }).click();
  await page.getByRole("menuitem", { name: "Withdraw application" }).click();
  await expect(page.getByTestId("application-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("application-row")).toHaveCount(3);
});

test("employer table: tabs filter, duplicate and delete work", async ({ page }) => {
  await page.goto("/styleguide/templates/table");
  const rows = page.getByTestId("vacancies-table").locator("tbody tr");
  await expect(rows).toHaveCount(4);
  await page.getByRole("radio", { name: /Drafts/ }).click();
  await expect(rows).toHaveCount(1);
  await page.getByRole("radio", { name: /All/ }).click();
  await page.getByRole("button", { name: "Actions for iOS Developer Intern" }).click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  await expect(rows).toHaveCount(5);
  await expect(page.getByText("iOS Developer Intern (copy)")).toBeVisible();
  await page.getByRole("button", { name: "Actions for Product Design Intern" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByRole("dialog", { name: "Delete this vacancy?" })).toBeVisible();
  await page.getByRole("button", { name: "Delete vacancy" }).click();
  await expect(rows).toHaveCount(4);
});

test("pipeline: views switch and a candidate can be moved", async ({ page }) => {
  await page.goto("/styleguide/templates/pipeline");
  const newColumn = page.getByRole("region", { name: "Applicants by stage" }).getByRole("region", { name: "New" });
  await expect(newColumn.getByTestId("candidate-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Move Maya Akhmetova" }).click();
  await page.getByRole("menuitem", { name: "Shortlist" }).click();
  await expect(newColumn.getByTestId("candidate-card")).toHaveCount(1);
  await page.getByRole("radio", { name: "List" }).click();
  await expect(page.getByRole("table", { name: "Applicants" })).toBeVisible();
  await page.getByRole("radio", { name: /Not selected/ }).click();
  await expect(page.getByRole("table", { name: "Not selected" }).locator("tbody tr")).toHaveCount(2);
});

test("settings: confirm-delete state opens the dialog", async ({ page }) => {
  await page.goto("/app/settings?state=confirm-delete");
  await expect(page.getByRole("dialog", { name: "Delete your account?" })).toBeVisible();
});

test("date field: pick a date from the calendar", async ({ page }) => {
  // /company/vacancies/:id/edit is a real page now (feature 002); the reference template lives under /styleguide
  await page.goto("/styleguide/templates/vacancy-edit");
  const field = page.getByRole("button", { name: /Apply by/ });
  // the template is the "new vacancy" form here (no :id), so the field starts empty
  await expect(field).toContainText("Pick a date");
  await field.click();
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("gridcell", { name: /^15 / }).click();
  await expect(field).toContainText(/15 \w{3} \d{4}/);
});

test("dashboard: overview, top matches, funnel and skill suggestion", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByTestId("dashboard-overview").locator("section")).toHaveCount(3);
  await expect(page.getByTestId("top-matches").getByRole("link")).toHaveCount(4);
  await expect(page.getByTestId("applications-funnel")).toBeVisible();
  await page.getByRole("button", { name: "Add Docker" }).click();
  await expect(page.getByText("Added", { exact: true })).toBeVisible();
});

test("dashboard: a failed block retries on its own, the rest stays usable", async ({ page }) => {
  await page.goto("/app?state=error");
  const matches = page.getByTestId("top-matches");
  await expect(matches).toHaveAttribute("data-status", "error");
  await expect(page.getByTestId("applications-funnel")).toBeVisible();
  await matches.getByRole("button", { name: "Try again" }).click();
  await expect(matches).toHaveAttribute("data-status", "ready");
  await expect(matches.getByRole("link")).toHaveCount(4);
});

test("notifications: badge, panel, mark all read, open an item", async ({ page }) => {
  await page.goto("/app");
  const bell = page.getByTestId("notifications-button");
  await expect(bell).toHaveAccessibleName("Notifications, 2 unread");
  await bell.click();
  const panel = page.getByRole("dialog", { name: /Notifications/ });
  await expect(panel.getByTestId("notification")).toHaveCount(4);
  await expectNoA11yViolations(page);
  const box = (await panel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await panel.getByRole("button", { name: "Mark all as read" }).click();
  await expect(bell).toHaveAccessibleName("Notifications");
  await panel.getByTestId("notification").filter({ hasText: "Junior Data Engineer" }).click();
  await expect(page).toHaveURL(/\/app\/vacancies\/v6$/);
  await expect(page.getByRole("dialog", { name: /Notifications/ })).toBeHidden();
});

test("tooltip on a header button opens below it, inside the viewport", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "no hover on touch");
  await page.goto("/app");
  const bell = page.getByTestId("notifications-button");
  await bell.hover();
  const tip = page.getByRole("tooltip", { name: "Notifications" });
  await expect(tip).toBeVisible();
  const [t, b] = [await tip.boundingBox(), await bell.boundingBox()];
  expect(t!.y).toBeGreaterThan(b!.y + b!.height - 1);
});

test("saved: own list, remove with undo, closed vacancy has no Apply", async ({ page }) => {
  await page.goto("/app/saved");
  const cards = page.getByTestId("saved-list").getByTestId("vacancy-card");
  await expect(cards).toHaveCount(4);
  await expect(cards.last().getByRole("button", { name: "Apply" })).toHaveCount(0);
  await page.getByRole("button", { name: "Remove Backend Intern (Python) from saved" }).click();
  await expect(cards).toHaveCount(3);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(cards).toHaveCount(4);
});

test("profile: Edit → Preview shows the employer view and leads back", async ({ page }) => {
  await page.goto("/app/profile");
  await expect(page.getByTestId("owner-panel")).toBeVisible();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(page).toHaveURL(/\/app\/profile\/edit$/);
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page).toHaveURL(/\/app\/profile\?preview=1$/);
  await expect(page.getByTestId("owner-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit profile" })).toHaveCount(0);
  await page.getByRole("button", { name: "Back to editing" }).click();
  await expect(page).toHaveURL(/\/app\/profile\/edit$/);
});

test("settings: sign-in email is read-only", async ({ page }) => {
  await page.goto("/app/settings");
  await expect(page.getByLabel("Email")).toHaveAttribute("readonly", "");
  await expect(page.getByRole("button", { name: "Change email" })).toHaveCount(0);
});
