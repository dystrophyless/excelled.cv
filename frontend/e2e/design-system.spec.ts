import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";
import { account } from "./support/auth-api";
import { mockStudentProfile } from "./support/profiles-api";
import { mockCompanyProfile } from "./support/vacancies-api";

/*
 * Guards the design system itself: every reference template and state renders without errors and passes axe,
 * and the interactive behaviour the templates demonstrate (filters, row actions, undo, menus) actually works.
 * Feature specs (e2e/<feature>.spec.ts) follow the same pattern.
 */

/*
 * /app/* and /company/* are behind the role guards (feature 001-user-auth), so the demo-route tests run signed in:
 * /me answers as an employer for /company/* pages and as a student everywhere else.
 * 004: the student's demo paths (/app, /app/vacancies, /app/applications, /app/saved) redirect to the opportunities, so
 * their reference templates are tested at /styleguide/templates/<id>; the employer layout keeps its notification bell.
 */
test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", (route) => {
    const from = route.request().headers()["referer"] ?? "";
    const role = new URL(from, "http://localhost").pathname.startsWith("/company") ? "employer" : "student";
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ account: account(role) }) });
  });
  // the role layouts show the profile name in the account menu (003-profiles)
  await mockStudentProfile.ok(page);
  await mockCompanyProfile.ok(page);
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

test("demo routes show the templates and highlight the nav", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "nav collapses into the sheet");
  // student: the Applications nav item is hidden until its feature ships (004), so only the template itself is checked here;
  // the student nav (Opportunities only, current) is asserted in opportunities.spec.ts
  await page.goto("/styleguide/templates/tracker");
  await expect(page.getByRole("heading", { level: 1, name: "Applications" })).toBeVisible();
  await page.goto("/company/candidates/c1");
  await expect(page.getByRole("link", { name: "Vacancies" })).toHaveAttribute("aria-current", "page");
});

test("account menu opens and lists profile actions", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "header actions collapse on mobile");
  await page.goto("/styleguide/templates/dashboard");
  await page.getByTestId("account-menu").click();
  await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible();
});

test("row menu is keyboard operable", async ({ page }) => {
  await page.goto("/styleguide/templates/tracker");
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
  await page.goto("/styleguide/templates/browse");
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
  await page.goto("/styleguide/templates/browse");
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
  await page.goto("/styleguide/templates/tracker");
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
  await page.goto("/styleguide/templates/dashboard");
  await expect(page.getByTestId("dashboard-overview").locator("section")).toHaveCount(3);
  await expect(page.getByTestId("top-matches").getByRole("link")).toHaveCount(4);
  await expect(page.getByTestId("applications-funnel")).toBeVisible();
  await page.getByRole("button", { name: "Add Docker" }).click();
  await expect(page.getByText("Added", { exact: true })).toBeVisible();
});

test("dashboard: a failed block retries on its own, the rest stays usable", async ({ page }) => {
  await page.goto("/styleguide/templates/dashboard?state=error");
  const matches = page.getByTestId("top-matches");
  await expect(matches).toHaveAttribute("data-status", "error");
  await expect(page.getByTestId("applications-funnel")).toBeVisible();
  await matches.getByRole("button", { name: "Try again" }).click();
  await expect(matches).toHaveAttribute("data-status", "ready");
  await expect(matches.getByRole("link")).toHaveCount(4);
});

// the student's demo bell is gone (004); the employer layout keeps its bell, so the notification centre is tested there
test("notifications: badge, panel, mark all read, open an item", async ({ page }) => {
  await page.goto("/company/candidates/c1");
  const bell = page.getByTestId("notifications-button");
  await expect(bell).toHaveAccessibleName("Notifications, 3 unread");
  await bell.click();
  const panel = page.getByRole("dialog", { name: /Notifications/ });
  await expect(panel.getByTestId("notification")).toHaveCount(4);
  await expectNoA11yViolations(page);
  const box = (await panel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await panel.getByRole("button", { name: "Mark all as read" }).click();
  await expect(bell).toHaveAccessibleName("Notifications");
  await panel.getByTestId("notification").filter({ hasText: "Dana Sultanova" }).click();
  await expect(page).toHaveURL(/\/company\/candidates\/c5$/);
  await expect(page.getByRole("dialog", { name: /Notifications/ })).toBeHidden();
});

test("tooltip on a header button opens below it, inside the viewport", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "no hover on touch");
  await page.goto("/company/candidates/c1");
  const bell = page.getByTestId("notifications-button");
  await bell.hover();
  const tip = page.getByRole("tooltip", { name: "Notifications" });
  await expect(tip).toBeVisible();
  const [t, b] = [await tip.boundingBox(), await bell.boundingBox()];
  expect(t!.y).toBeGreaterThan(b!.y + b!.height - 1);
});

test("saved: own list, remove with undo, closed vacancy has no Apply", async ({ page }) => {
  await page.goto("/styleguide/templates/saved");
  const cards = page.getByTestId("saved-list").getByTestId("vacancy-card");
  await expect(cards).toHaveCount(4);
  await expect(cards.last().getByRole("button", { name: "Apply" })).toHaveCount(0);
  await page.getByRole("button", { name: "Remove Backend Intern (Python) from saved" }).click();
  await expect(cards).toHaveCount(3);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(cards).toHaveCount(4);
});

// /app/profile and /app/profile/edit are real pages since 003-profiles (e2e/profiles.spec.ts); the reference template keeps
// its owner panel and Edit still leads to the edit path. Its "Preview" demo (/app/profile?preview=1) no longer exists.
test("profile template: owner panel and Edit leads to the edit form", async ({ page }) => {
  await page.goto("/styleguide/templates/profile");
  await expect(page.getByTestId("owner-panel")).toBeVisible();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(page).toHaveURL(/\/app\/profile\/edit$/);
});

test("settings: sign-in email is read-only", async ({ page }) => {
  await page.goto("/app/settings");
  await expect(page.getByLabel("Email")).toHaveAttribute("readonly", "");
  await expect(page.getByRole("button", { name: "Change email" })).toHaveCount(0);
});

test("choice cards: native radio keys, checkbox toggle, error and disabled states", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/styleguide#choice-cards");
  const section = page.getByTestId("styleguide-choice-cards");
  await expect(section).toBeVisible();

  // radio group: the accessible name is the label only; arrow keys move the selection inside the group
  const year = page.getByTestId("cc-year");
  await expect(year.getByRole("radio", { name: "3rd year" })).toBeChecked();
  await year.getByRole("radio", { name: "3rd year" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(year.getByRole("radio", { name: "4th year" })).toBeChecked();
  await expect(year.getByRole("radio", { name: "4th year" })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(year.getByRole("radio", { name: "3rd year" })).toBeChecked();

  // description is a description, not part of the name; a click on the card selects it
  const uni = page.getByTestId("cc-university");
  await uni.getByRole("radio", { name: "Nazarbayev University" }).click();
  await expect(uni.getByRole("radio", { name: "Nazarbayev University" })).toBeChecked();
  await expect(uni.getByRole("radio", { name: "Nazarbayev University" })).toHaveAccessibleDescription("Astana");
  await uni.getByRole("radio", { name: "Other" }).click();
  await expect(page.getByLabel("Your university")).toBeVisible();

  // icon cards
  const industry = page.getByTestId("cc-industry");
  await expect(industry.getByRole("radio")).toHaveCount(10);
  await industry.getByRole("radio", { name: "Manufacturing" }).click();
  await expect(industry.getByRole("radio", { name: "Manufacturing" })).toBeChecked();

  // checkbox group: Space toggles, several answers
  const format = page.getByTestId("cc-format");
  await format.getByRole("checkbox", { name: "Remote" }).focus();
  await page.keyboard.press("Space");
  await expect(format.getByRole("checkbox", { name: "Remote" })).toBeChecked();
  await expect(format.getByRole("checkbox", { name: "Hybrid" })).toBeChecked();

  // error: every input aria-invalid, the message is announced and linked to the group
  const errorGroup = page.getByTestId("cc-error");
  await section.getByRole("button", { name: "Continue" }).click();
  await expect(errorGroup.getByRole("alert")).toHaveText("Choose your year of study");
  await expect(errorGroup.getByRole("radio", { name: "1st year" })).toHaveAttribute("aria-invalid", "true");
  await expect(errorGroup).toHaveAccessibleDescription("Choose your year of study");
  await expectNoA11yViolations(page);
  await errorGroup.getByRole("radio", { name: "2nd year" }).click();
  await expect(errorGroup.getByRole("alert")).toHaveCount(0);
  await expect(errorGroup.getByRole("radio", { name: "1st year" })).not.toHaveAttribute("aria-invalid", "true");

  // disabled
  await expect(section.getByRole("radio", { name: "Full-time job" })).toBeDisabled();
  await expect(page.getByTestId("cc-disabled").getByRole("radio", { name: "Education" })).toBeDisabled();

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(errors).toEqual([]);
});

test("combobox: aliases, description line, create label, all options reachable, clearing", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/styleguide#forms");
  const university = page.getByTestId("sg-combobox-university").getByRole("combobox", { name: "University" });
  await expect(university).toHaveValue("Kazakh-British Technical University");

  // an alias finds its university and ranks first; the matched alias shows on the description line
  await university.fill("kbtu");
  const list = page.getByRole("listbox");
  await expect(list.getByRole("option").first()).toHaveText(/^Kazakh-British Technical University\s*Almaty · KBTU/);
  await university.fill("nu");
  await expect(list.getByRole("option").first()).toContainText("Nazarbayev University");
  await expect(list.getByRole("option").first()).toContainText("Astana · NU");
  await university.fill("enu");
  await expect(list.getByRole("option").first()).toContainText("L.N. Gumilyov Eurasian National University");
  await expectNoA11yViolations(page);
  await page.keyboard.press("Enter");
  await expect(university).toHaveValue("L.N. Gumilyov Eurasian National University");

  // an unknown name: the create option uses createLabel
  await university.fill("Narxoz University");
  await expect(list.getByRole("option", { name: "Use “Narxoz University”" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(university).toHaveValue("Narxoz University");

  // clearable: empty the field and leave it → stays empty; the clear button does the same
  await university.fill("");
  await university.blur();
  await expect(university).toHaveValue("");
  await university.fill("sdu");
  await page.keyboard.press("Enter");
  await expect(university).toHaveValue("Suleyman Demirel University");
  await page.getByTestId("sg-combobox-university").getByRole("button", { name: "Clear" }).click();
  await expect(university).toHaveValue("");
  await university.blur();
  await expect(university).toHaveValue("");

  // no 50-option cap: every option is listed, the last one is reachable by keyboard and scrolled into view
  const city = page.getByTestId("sg-combobox-city").getByRole("combobox", { name: "City" });
  await city.click();
  const cities = page.getByRole("listbox").getByRole("option");
  expect(await cities.count()).toBeGreaterThan(50);
  await page.keyboard.press("Control+End");
  await expect(cities.last()).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(city).toHaveValue("Zyryanovsk");
  // a former name finds the city
  await city.fill("Ust-Kamenogorsk");
  await page.keyboard.press("Enter");
  await expect(city).toHaveValue("Oskemen");
  expect(errors).toEqual([]);
});

test("combobox: focus alone never opens the list; a press, typing or ArrowDown does", async ({ page }) => {
  await page.goto("/styleguide#forms");
  const university = page.getByTestId("sg-combobox-university").getByRole("combobox", { name: "University" });
  const list = page.getByRole("listbox");
  // programmatic focus (as an error focus does) and Tab-in show no list
  await university.focus();
  await expect(university).toBeFocused();
  await expect(list).toHaveCount(0);
  await expect(university).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(university).toBeFocused();
  await expect(list).toHaveCount(0);
  // ArrowDown opens it; Escape closes it
  await page.keyboard.press("ArrowDown");
  await expect(list).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
  // Alt+ArrowDown too
  await page.keyboard.press("Alt+ArrowDown");
  await expect(list).toBeVisible();
  await page.keyboard.press("Escape");
  // typing opens it
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("kb");
  await expect(list.getByRole("option").first()).toContainText("Kazakh-British");
  await page.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
  // a press on the field opens it
  await university.click();
  await expect(list).toBeVisible();
});

test("combobox: Tab accepts the highlighted option after typing, and changes nothing when nothing was typed", async ({ page }) => {
  await page.goto("/styleguide#forms");
  const university = page.getByTestId("sg-combobox-university").getByRole("combobox", { name: "University" });
  await university.click();
  await university.fill("kbtu");
  await expect(page.getByRole("listbox").getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(university).toHaveValue("Kazakh-British Technical University");
  await expect(university).not.toBeFocused();
  // tabbing through again without typing keeps the value
  await university.focus();
  await page.keyboard.press("Tab");
  await expect(university).toHaveValue("Kazakh-British Technical University");
});

test("combobox: an open single list never covers the primary action below it (inFlow)", async ({ page }) => {
  await page.goto("/styleguide#forms");
  const university = page.getByTestId("sg-combobox-university").getByRole("combobox", { name: "University" });
  const next = page.getByTestId("sg-combobox-continue");
  await university.click();
  await university.fill("Kaz");
  await expect(page.getByRole("listbox").getByRole("option").first()).toBeVisible();
  await next.scrollIntoViewIfNeeded();
  // the element at the button's centre is the button (or inside it), not an option of the open list
  const hit = await next.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return top !== null && el.contains(top);
  });
  expect(hit).toBe(true);
  // a real click reaches the button although the list closes on the blur it causes; the typed name is kept
  await next.click();
  await expect(page.getByRole("status").filter({ hasText: "Continued with" })).toHaveText("Continued with Kaz");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expectNoA11yViolations(page);

  // A short list (an alias, or a name that is not listed) shrinks or changes when the blur commits the text; that commit
  // waits for the press to end too, so the first click still lands (regression: it used to move the button away).
  for (const [typed, result] of [["kbtu", "Kazakh-British Technical University"], ["Narxoz Uni", "Narxoz Uni"]]) {
    await university.click();
    await university.fill(typed);
    await expect(page.getByRole("listbox").getByRole("option").first()).toBeVisible();
    await next.click();
    await expect(page.getByRole("status").filter({ hasText: "Continued with" })).toHaveText(`Continued with ${result}`);
  }
});
