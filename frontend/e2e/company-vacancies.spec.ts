import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { signedInAs } from "./support/auth-api";
import {
  mockCatalog,
  mockSkills,
  mockVacancyCreate,
  mockVacancyDelete,
  mockVacancyGet,
  mockVacancyList,
  mockVacancyStatus,
  mockVacancyUpdate,
  vacancyFixture,
  type Sink,
} from "./support/vacancies-api";

/*
 * Feature 002-employer-vacancies - US1 block: S2 (post a vacancy wizard) and S3 (edit a draft).
 * The API is mocked with page.route (support/vacancies-api.ts); contract: specs/002-employer-vacancies/contracts/vacancies-api.md.
 */

test.beforeEach(async ({ page }) => {
  await signedInAs(page, "employer");
  await mockCatalog.ok(page);
  await mockSkills.ok(page);
});

async function expectNoHorizontalScroll(page: Page, width = page.viewportSize()!.width) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}

/* ── wizard helpers ──────────────────────────────────────────────────────── */

const WIZARD = "/company/vacancies/new";
const cont = (page: Page) => page.getByRole("button", { name: "Continue" });

async function choose(page: Page, field: string, option: string) {
  await page.getByRole("combobox", { name: new RegExp(`^${field}\\b`) }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** Picks a skill. The list stays open after a pick (round 5); the next click must still work with it open. */
async function addSkill(page: Page, group: "Required" | "Nice to have", name: string) {
  const input = page.getByRole("combobox", { name: new RegExp(`^${group}\\b`) });
  await input.fill(name);
  await input.press("Enter");
}

/** Basics: title, type, field, city, format. */
async function fillBasics(page: Page) {
  await page.getByLabel("Title").fill("Backend Intern (Python)");
  await choose(page, "Type", "Internship");
  await choose(page, "Field", "Backend");
  await choose(page, "City", "Almaty");
  await page.getByRole("radio", { name: "Hybrid" }).check();
}

/** Details: description, duration, salary and a deadline two months ahead (picked in the calendar). */
async function fillDetails(page: Page) {
  await page.getByLabel("Description").fill("Join the Payments team and ship real features.");
  await page.getByLabel("Duration").fill("3 months");
  await page.getByLabel("Salary").fill("200 000 ₸ / month");
  await page.getByRole("button", { name: /Apply by/ }).click();
  const calendar = page.getByRole("dialog", { name: "Choose a date" });
  await calendar.getByRole("button", { name: "Next month" }).click();
  await calendar.getByRole("button", { name: "Next month" }).click();
  await calendar.getByRole("gridcell", { name: /^15 / }).click();
}

/** Wizard with only a title, advanced to the Preview step. */
async function reachPreviewWithTitleOnly(page: Page) {
  await page.getByLabel("Title").fill("Backend Intern (Python)");
  await cont(page).click();
  await cont(page).click();
  await cont(page).click();
  await expect(page.getByTestId("wizard-step-preview")).toBeVisible();
}

test.describe("US1 - employer posts a vacancy (S2 wizard)", () => {
  test("wizard happy path: four steps, preview, publish sends the whole vacancy", async ({ page }) => {
    const sink: Sink = [];
    await mockVacancyCreate.ok(page, sink);
    await page.goto(WIZARD);

    await expect(page.getByRole("heading", { level: 1, name: "What's the role?" })).toBeVisible();
    await fillBasics(page);
    await cont(page).click();

    await expect(page.getByRole("heading", { level: 1, name: "Which skills does it need?" })).toBeVisible();
    await addSkill(page, "Required", "Python");
    await addSkill(page, "Required", "SQL");
    await addSkill(page, "Nice to have", "Docker");
    await cont(page).click();

    await expect(page.getByTestId("wizard-step-details")).toBeVisible();
    await fillDetails(page);
    await cont(page).click();

    const preview = page.getByTestId("vacancy-preview");
    await expect(preview.getByRole("heading", { name: "Backend Intern (Python)" })).toBeVisible();
    await expect(preview).toContainText("Almaty · Hybrid");
    await expect(preview).toContainText("Python");
    await expect(preview).toContainText("Docker");

    await page.getByRole("button", { name: "Publish vacancy" }).click();
    await expect(page).toHaveURL(/\/company\/vacancies$/);
    await expect(page.getByText("Vacancy published")).toBeVisible();

    expect(sink).toHaveLength(1);
    expect(sink[0]).toMatchObject({
      title: "Backend Intern (Python)",
      type: "internship",
      field: "backend",
      city: "almaty",
      format: "hybrid",
      description: "Join the Payments team and ship real features.",
      duration: "3 months",
      salary: "200 000 ₸ / month",
      required_skills: ["Python", "SQL"],
      nice_skills: ["Docker"],
      publish: true,
    });
    expect(sink[0].apply_by).toMatch(/^\d{4}-\d{2}-15$/);
  });

  test("Continue on Basics needs a title of 3 to 120 characters", async ({ page }) => {
    await page.goto(WIZARD);
    await cont(page).click();
    await expect(page.getByText("Enter a title of 3–120 characters")).toBeVisible();
    await expect(page.getByTestId("wizard-step-basics")).toBeVisible();
    await page.getByLabel("Title").fill("QA");
    await cont(page).click();
    await expect(page.getByText("Enter a title of 3–120 characters")).toBeVisible();
    await page.getByLabel("Title").fill("QA Intern");
    await cont(page).click();
    await expect(page.getByTestId("wizard-step-skills")).toBeVisible();
  });

  test("Back keeps what was typed", async ({ page }) => {
    await page.goto(WIZARD);
    await page.getByLabel("Title").fill("Backend Intern");
    await cont(page).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel("Title")).toHaveValue("Backend Intern");
  });

  test("Save and exit saves a draft and returns to the list", async ({ page }) => {
    const sink: Sink = [];
    await mockVacancyCreate.ok(page, sink);
    await page.goto(WIZARD);
    await page.getByLabel("Title").fill("Backend Intern (Python)");
    await page.getByRole("button", { name: "Save and exit" }).click();
    await expect(page).toHaveURL(/\/company\/vacancies$/);
    await expect(page.getByText("Draft saved")).toBeVisible();
    expect(sink).toHaveLength(1);
    expect(sink[0]).toMatchObject({ title: "Backend Intern (Python)", publish: false, type: null, required_skills: [] });
  });

  test("Save and exit without a title asks for one and sends nothing", async ({ page }) => {
    const sink: Sink = [];
    await mockVacancyCreate.ok(page, sink);
    await page.goto(WIZARD);
    await page.getByRole("button", { name: "Save and exit" }).click();
    await expect(page.getByText("Add a title to save a draft")).toBeVisible();
    await expect(page).toHaveURL(/\/company\/vacancies\/new$/);
    expect(sink).toHaveLength(0);
  });

  test("incomplete: the alert lists the missing fields and its links jump to the right step", async ({ page }) => {
    const sink: Sink = [];
    await mockVacancyCreate.incomplete(page, ["format", "description", "apply_by"], sink);
    await page.goto(WIZARD);
    await reachPreviewWithTitleOnly(page);
    await page.getByRole("button", { name: "Publish vacancy" }).click();

    const alert = page.getByRole("alert").filter({ hasText: "Fix 3 things to publish" });
    await expect(alert).toBeVisible();
    expect(sink[0]).toMatchObject({ publish: true });

    await alert.getByRole("button", { name: "Description · Details" }).click();
    await expect(page.getByTestId("wizard-step-details")).toBeVisible();
    await expect(page.getByText("Add a description")).toBeVisible();
    await expect(page.getByText("Choose an Apply by date")).toBeVisible();

    await cont(page).click();
    await page.getByRole("button", { name: "Publish vacancy" }).click();
    await page.getByRole("alert").filter({ hasText: "Fix 3 things to publish" }).getByRole("button", { name: "Format · Basics" }).click();
    await expect(page.getByTestId("wizard-step-basics")).toBeVisible();
    await expect(page.getByText("Choose a format")).toBeVisible();
  });

  test("apply_by_not_in_future: back to Details with the deadline error", async ({ page }) => {
    await mockVacancyCreate.applyByNotInFuture(page);
    await page.goto(WIZARD);
    await reachPreviewWithTitleOnly(page);
    await page.getByRole("button", { name: "Publish vacancy" }).click();
    await expect(page.getByTestId("wizard-step-details")).toBeVisible();
    await expect(page.getByText("Choose today or a later date")).toBeVisible();
  });

  test("a network error on save shows the alert and keeps everything typed", async ({ page }) => {
    await mockVacancyCreate.network(page);
    await page.goto(WIZARD);
    await page.getByLabel("Title").fill("Backend Intern (Python)");
    await choose(page, "Type", "Internship");
    await cont(page).click();
    await addSkill(page, "Required", "Python");
    await page.getByRole("button", { name: "Save and exit" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Couldn't save your draft" })).toBeVisible();
    await expect(page).toHaveURL(/\/company\/vacancies\/new$/);
    await expect(page.getByTestId("required-skills-input")).toContainText("Python");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel("Title")).toHaveValue("Backend Intern (Python)");
    await expect(page.getByRole("combobox", { name: /^Type\b/ })).toContainText("Internship");

    // the connection comes back: the same click saves
    const sink: Sink = [];
    await mockVacancyCreate.ok(page, sink);
    await page.getByRole("button", { name: "Save and exit" }).click();
    await expect(page).toHaveURL(/\/company\/vacancies$/);
    expect(sink[0]).toMatchObject({ title: "Backend Intern (Python)", type: "internship", required_skills: ["Python"] });
  });

  test("the catalog failing shows the error state with Try again", async ({ page }) => {
    await mockCatalog.network(page);
    await page.goto(WIZARD);
    await expect(page.getByText("Couldn't load the form")).toBeVisible();
    await mockCatalog.ok(page);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("wizard-step-basics")).toBeVisible();
  });

  test("a student cannot open the wizard", async ({ page }) => {
    await signedInAs(page, "student");
    await page.goto(WIZARD);
    await expect(page).toHaveURL(/\/app$/);
  });

  test("axe: every step passes; no horizontal scroll at 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(WIZARD);
    await expect(page.getByTestId("wizard-step-basics")).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page, 390);
    await fillBasics(page);
    await cont(page).click();
    await expect(page.getByTestId("wizard-step-skills")).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page, 390);
    await cont(page).click();
    await expect(page.getByTestId("wizard-step-details")).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page, 390);
    await cont(page).click();
    await expect(page.getByTestId("vacancy-preview")).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page, 390);
  });

  test("axe on desktop: Basics and the incomplete alert", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockVacancyCreate.incomplete(page, ["format", "description"]);
    await page.goto(WIZARD);
    await expectNoA11yViolations(page);
    await reachPreviewWithTitleOnly(page);
    await page.getByRole("button", { name: "Publish vacancy" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Fix 2 things to publish" })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

/* ── S3 edit a draft ─────────────────────────────────────────────────────── */

const EDIT = "/company/vacancies/17/edit";
const draft = () => vacancyFixture({ id: 17, status: "draft", version: 2, published_at: null, apply_by: "2099-11-30", closes_at: null });
const pageTitle = (page: Page) => page.getByRole("heading", { level: 1, name: "Edit vacancy" });

test.describe("US1 - employer completes and publishes a draft (S3 edit)", () => {
  test("edit a draft and publish: saves with the loaded version, then publishes the new version", async ({ page }) => {
    const d = draft();
    const putSink: Sink = [];
    const statusSink: Sink = [];
    await mockVacancyGet.ok(page, d);
    await mockVacancyUpdate.ok(page, d, putSink);
    await mockVacancyStatus.ok(page, { ...d, status: "open", version: 4, published_at: "2026-11-02T10:00:00Z" }, statusSink);
    await page.goto(EDIT);

    await expect(pageTitle(page)).toBeVisible();
    await expect(page.getByTestId("vacancy-status")).toHaveAttribute("data-status", "draft");
    await expect(page.getByLabel("Title")).toHaveValue("Backend Intern (Python)");
    await page.getByLabel("Title").fill("Backend Intern (Python, Payments)");
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: "Publish", exact: true }).click();

    await expect(page).toHaveURL(/\/company\/vacancies\/17$/);
    await expect(page.getByText("Vacancy published")).toBeVisible();
    expect(putSink).toHaveLength(1);
    expect(putSink[0]).toMatchObject({ title: "Backend Intern (Python, Payments)", version: 2, required_skills: ["Python", "SQL", "Git"] });
    expect(statusSink).toEqual([{ action: "publish", version: 3 }]);
  });

  test("Save draft sends PUT with the loaded version and stays on the page", async ({ page }) => {
    const d = draft();
    const putSink: Sink = [];
    await mockVacancyGet.ok(page, d);
    await mockVacancyUpdate.ok(page, d, putSink);
    await page.goto(EDIT);
    await page.getByLabel("Description").fill("A new description.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved")).toBeVisible();
    await expect(page).toHaveURL(/\/edit$/);
    expect(putSink[0]).toMatchObject({ description: "A new description.", version: 2 });
    // saved: nothing is unsaved any more, and a second save uses the new version
    await expect(page.getByText("Draft · not visible to students")).toBeVisible();
    await page.getByLabel("Description").fill("Another one.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect.poll(() => putSink.length).toBe(2);
    expect(putSink[1]).toMatchObject({ description: "Another one.", version: 3 });
  });

  test("incomplete on publish: field errors and the alert, nothing published", async ({ page }) => {
    const d = draft();
    await mockVacancyGet.ok(page, d);
    await mockVacancyUpdate.ok(page, d);
    await mockVacancyStatus.incomplete(page, ["format", "description"]);
    await page.goto(EDIT);
    await page.getByLabel("Title").fill("Backend Intern (Python) v2");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Fix 2 fields to publish" })).toBeVisible();
    await expect(page.getByText("Choose a format")).toBeVisible();
    await expect(page.getByText("Add a description")).toBeVisible();
    await expect(page).toHaveURL(/\/edit$/);
    await expectNoA11yViolations(page);
  });

  test("apply_by_not_in_future on publish shows the deadline error", async ({ page }) => {
    const d = draft();
    await mockVacancyGet.ok(page, d);
    await mockVacancyUpdate.ok(page, d);
    await mockVacancyStatus.applyByNotInFuture(page);
    await page.goto(EDIT);
    await page.getByLabel("Title").fill("Backend Intern (Python) v2");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText("Choose today or a later date")).toBeVisible();
  });

  test("a network error on save keeps the typed values", async ({ page }) => {
    await mockVacancyGet.ok(page, draft());
    await mockVacancyUpdate.network(page);
    await page.goto(EDIT);
    await page.getByLabel("Title").fill("Backend Intern (Python) v2");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Couldn't save your changes" })).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("Backend Intern (Python) v2");
  });

  test("leaving with unsaved changes shows the Discard dialog; Keep editing stays, Discard leaves", async ({ page }) => {
    await mockVacancyGet.ok(page, draft());
    await page.goto(EDIT);
    await page.getByLabel("Title").fill("Backend Intern (Python) changed");

    await page.getByRole("link", { name: "Backend Intern (Python)" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Discard your changes?" });
    await expect(dialog).toBeVisible();
    await expectNoA11yViolations(page);
    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/edit$/);
    await expect(page.getByLabel("Title")).toHaveValue("Backend Intern (Python) changed");

    await page.getByRole("link", { name: "Backend Intern (Python)" }).first().click();
    await page.getByTestId("confirm-discard").click();
    await expect(page).toHaveURL(/\/company\/vacancies\/17$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  });

  test("a pristine form leaves without the dialog", async ({ page }) => {
    await mockVacancyGet.ok(page, draft());
    await page.goto(EDIT);
    await expect(pageTitle(page)).toBeVisible();
    await page.getByRole("link", { name: "Backend Intern (Python)" }).first().click();
    await expect(page).toHaveURL(/\/company\/vacancies\/17$/);
  });

  test("unsaved changes ask the browser before a reload", async ({ page }) => {
    await mockVacancyGet.ok(page, draft());
    await page.goto(EDIT);
    await page.getByLabel("Title").fill("Backend Intern (Python) changed");
    const prevented = await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(prevented).toBe(true);
  });

  test("not found, load error with retry", async ({ page }) => {
    await mockVacancyGet.notFound(page);
    await page.goto(EDIT);
    await expect(page.getByText("Vacancy not found")).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to vacancies" })).toBeVisible();
    await expectNoA11yViolations(page);

    await mockVacancyGet.network(page);
    await page.goto(EDIT);
    await expect(page.getByText("Couldn't load this vacancy")).toBeVisible();
    await mockVacancyGet.ok(page, draft());
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByLabel("Title")).toHaveValue("Backend Intern (Python)");
  });

  test("axe on the draft form; no horizontal scroll at 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockVacancyGet.ok(page, draft());
    await page.goto(EDIT);
    await expect(page.getByLabel("Title")).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page, 390);
    await page.getByLabel("Title").fill("Backend Intern (Python) changed");
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page, 390);
  });
});

/* ── S1 list · S4 vacancy page ───────────────────────────────────────────── */

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
const LIST = "/company/vacancies";

const open17 = () => vacancyFixture({ id: 17, title: "Backend Intern (Python)", status: "open", version: 3 });
const draft18 = () =>
  vacancyFixture({ id: 18, title: "Data Analyst Intern", status: "draft", version: 1, published_at: null, format: null, apply_by: null, closes_at: null });
const paused19 = () => vacancyFixture({ id: 19, title: "QA Engineer", status: "paused", version: 4 });
const closed20 = () =>
  vacancyFixture({ id: 20, title: "Product Design Intern", status: "closed", closed_by: "employer", closed_at: "2026-10-22T10:00:00Z", version: 5 });
const deadline21 = () =>
  vacancyFixture({
    id: 21, title: "Junior Data Engineer", status: "closed", closed_by: "deadline", apply_by: "2026-10-15",
    closes_at: "2026-10-15T19:00:00Z", closed_at: "2026-10-15T19:00:00Z", version: 6,
  });
const ALL = () => [open17(), draft18(), paused19(), closed20()];

const tableRows = (page: Page) => page.getByTestId("vacancies-table").locator("tbody tr");
const phoneRows = (page: Page) => page.getByTestId("vacancy-row");
const rowActions = (page: Page, title: string) => page.getByRole("button", { name: `Actions for ${title}` });

test.describe("US2 - employer sees and finds their vacancies (S1)", () => {
  test("desktop: groups with counts filter the table and live in the URL", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.ok(page, ALL());
    await page.goto(LIST);

    await expect(tableRows(page)).toHaveCount(4);
    await expect(page.getByRole("radio", { name: /^All\s*4/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Draft\s*1/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Open\s*1/ })).toBeVisible();

    await page.getByRole("radio", { name: /^Draft/ }).click();
    await expect(page).toHaveURL(/status=draft/);
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText("Data Analyst Intern");
    // counts ignore the selected group
    await expect(page.getByRole("radio", { name: /^All\s*4/ })).toBeVisible();

    await page.getByRole("radio", { name: /^All/ }).click();
    await expect(page).not.toHaveURL(/status=/);
    await expect(tableRows(page)).toHaveCount(4);
  });

  test("the URL query is the state: ?status=&q= opens the filtered list", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.ok(page, ALL());
    await page.goto(`${LIST}?status=closed&q=design`);
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText("Product Design Intern");
    await expect(page.getByLabel("Search vacancies")).toHaveValue("design");
    await expect(page.getByRole("radio", { name: /^Closed/ })).toBeChecked();
  });

  test("search is debounced into the URL and filters by title; no results offers Clear filters", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const queries: string[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (u.pathname === "/api/company/vacancies") queries.push(u.searchParams.get("q") ?? "");
    });
    await mockVacancyList.ok(page, ALL());
    await page.goto(LIST);
    await expect(tableRows(page)).toHaveCount(4);

    await page.getByLabel("Search vacancies").pressSequentially("data", { delay: 30 });
    await expect(page).toHaveURL(/q=data/);
    await expect(tableRows(page)).toHaveCount(1);
    // one request for the whole word, not one per letter
    expect(queries.filter((q) => q && q !== "data")).toEqual([]);

    await page.getByLabel("Search vacancies").fill("zzz");
    await expect(page.getByTestId("vacancies-table").getByText("No vacancies match")).toBeVisible();
    await page.getByTestId("vacancies-table").getByRole("button", { name: "Clear filters" }).click();
    await expect(tableRows(page)).toHaveCount(4);
    await expect(page).not.toHaveURL(/q=/);
  });

  test("an empty group offers to show all vacancies", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.ok(page, [open17()]);
    await page.goto(`${LIST}?status=paused`);
    await expect(page.getByTestId("vacancies-table").getByText("No paused vacancies")).toBeVisible();
    await page.getByTestId("vacancies-table").getByRole("button", { name: "Show all vacancies" }).click();
    await expect(tableRows(page)).toHaveCount(1);
  });

  test("first run: empty state with Post a vacancy", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.empty(page);
    await page.goto(LIST);
    await expect(page.getByText("Post your first vacancy")).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Post a vacancy" }).last().click();
    await expect(page).toHaveURL(/\/company\/vacancies\/new$/);
  });

  test("list error shows Try again, and retrying loads the list", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.serverError(page);
    await page.goto(LIST);
    await expect(page.getByText("Couldn't load vacancies")).toBeVisible();
    await mockVacancyList.ok(page, ALL());
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(tableRows(page)).toHaveCount(4);
  });

  test("desktop: a row opens the vacancy; the menu's Edit opens the edit form", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.ok(page, ALL());
    await mockVacancyGet.ok(page, paused19());
    await page.goto(LIST);
    await tableRows(page).filter({ hasText: "QA Engineer" }).locator("td").nth(3).click();
    await expect(page).toHaveURL(/\/company\/vacancies\/19$/);
    await expect(page.getByRole("heading", { level: 1, name: "QA Engineer" })).toBeVisible();

    await page.goto(LIST);
    await rowActions(page, "QA Engineer").click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/company\/vacancies\/19\/edit$/);
  });

  test("390 px: the status dropdown replaces the segmented control, rows are stacked, a row opens the vacancy", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await mockVacancyList.ok(page, ALL());
    await mockVacancyGet.ok(page, draft18());
    await page.goto(LIST);

    await expect(phoneRows(page)).toHaveCount(4);
    await expect(page.getByRole("radio", { name: /^Draft/ })).toHaveCount(0);
    await expectNoHorizontalScroll(page, 390);
    await expectNoA11yViolations(page);

    await page.getByTestId("status-select").getByRole("combobox").click();
    await page.getByRole("option", { name: "Draft (1)" }).click();
    await expect(page).toHaveURL(/status=draft/);
    await expect(phoneRows(page)).toHaveCount(1);
    await expectNoHorizontalScroll(page, 390);

    await phoneRows(page).first().getByText(/applicants? ·/).click();
    await expect(page).toHaveURL(/\/company\/vacancies\/18$/);
  });

  test("axe on the desktop list, its search with no results, and the 390 px error state", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.ok(page, ALL());
    await page.goto(LIST);
    await expect(tableRows(page)).toHaveCount(4);
    await expectNoA11yViolations(page);
    await page.getByLabel("Search vacancies").fill("zzz");
    await expect(page.getByTestId("vacancies-table").getByText("No vacancies match")).toBeVisible();
    await expectNoA11yViolations(page);

    await page.setViewportSize(PHONE);
    await mockVacancyList.serverError(page);
    await page.goto(LIST);
    await expect(page.getByText("Couldn't load vacancies")).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page, 390);
  });
});

test.describe("US3 - employer closes a vacancy before its deadline (S1 + S4, D1)", () => {
  test("close from the list: D1, confirm sends {action: close, version}, toast, refreshed row", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    const closed = { ...open17(), status: "closed" as const, version: 4, closed_by: "employer" as const, closed_at: "2026-11-02T10:00:00Z" };
    await mockVacancyList.ok(page, ALL());
    await mockVacancyStatus.ok(page, closed, sink);
    await page.goto(LIST);

    await rowActions(page, "Backend Intern (Python)").click();
    await page.getByRole("menuitem", { name: "Close vacancy" }).click();
    const dialog = page.getByRole("dialog", { name: "Close “Backend Intern (Python)”?" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("You can reopen it later with a new deadline.");
    await expectNoA11yViolations(page);

    await mockVacancyList.ok(page, [closed, draft18(), paused19(), closed20()]);
    await page.getByTestId("confirm-close").click();
    await expect(page.getByText("Vacancy closed", { exact: true })).toBeVisible();
    await expect(dialog).toBeHidden();
    expect(sink).toEqual([{ action: "close", version: 3 }]);
    await expect(tableRows(page).filter({ hasText: "Backend Intern (Python)" }).getByTestId("vacancy-status")).toHaveAttribute("data-status", "closed");
  });

  test("close from the vacancy page (S4)", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    const closed = { ...open17(), status: "closed" as const, version: 4, closed_by: "employer" as const, closed_at: "2026-11-02T10:00:00Z" };
    await mockVacancyGet.ok(page, open17());
    await mockVacancyStatus.ok(page, closed, sink);
    await page.goto("/company/vacancies/17");

    await expect(page.getByTestId("vacancy-status-line").getByTestId("vacancy-status")).toHaveAttribute("data-status", "open");
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Close vacancy" }).click();
    await page.getByTestId("confirm-close").click();

    await expect(page.getByText("Vacancy closed", { exact: true })).toBeVisible();
    await expect(page.getByTestId("vacancy-status-line").getByTestId("vacancy-status")).toHaveAttribute("data-status", "closed");
    await expect(page.getByTestId("vacancy-status-line")).toContainText("Closed by you on 2 Nov");
    expect(sink).toEqual([{ action: "close", version: 3 }]);
  });

  test("Keep it open cancels: no request, still Open", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    await mockVacancyList.ok(page, ALL());
    await mockVacancyStatus.ok(page, { ...open17(), status: "closed" }, sink);
    await page.goto(LIST);
    await rowActions(page, "Backend Intern (Python)").click();
    await page.getByRole("menuitem", { name: "Close vacancy" }).click();
    await page.getByRole("button", { name: "Keep it open" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(sink).toHaveLength(0);
    await expect(tableRows(page).filter({ hasText: "Backend Intern (Python)" }).getByTestId("vacancy-status")).toHaveAttribute("data-status", "open");
  });

  test("a refused close (invalid_transition) shows the notice and refreshes the list", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const stale = open17();
    const now = { ...open17(), status: "closed" as const, closed_by: "deadline" as const, closed_at: "2026-10-15T19:00:00Z", apply_by: "2026-10-15", version: 4 };
    await mockVacancyList.ok(page, [stale, draft18()]);
    await mockVacancyStatus.invalidTransition(page, "closed");
    await page.goto(LIST);
    await rowActions(page, "Backend Intern (Python)").click();
    await page.getByRole("menuitem", { name: "Close vacancy" }).click();
    await mockVacancyList.ok(page, [now, draft18()]);
    await page.getByTestId("confirm-close").click();

    const notice = page.getByTestId("vacancy-notice");
    await expect(notice).toContainText("Close didn't apply");
    await expect(notice).toContainText("Closed");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(tableRows(page).filter({ hasText: "Backend Intern (Python)" }).getByTestId("vacancy-status")).toHaveAttribute("data-status", "closed");
    await expectNoA11yViolations(page);
  });

  test("a version conflict refreshes the vacancy and says so", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const newer = { ...open17(), version: 9 };
    await mockVacancyGet.ok(page, open17());
    await mockVacancyStatus.versionConflict(page, newer);
    await page.goto("/company/vacancies/17");
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Close vacancy" }).click();
    await mockVacancyGet.ok(page, newer);
    await page.getByTestId("confirm-close").click();
    await expect(page.getByTestId("vacancy-notice")).toContainText("changed elsewhere");
  });

  test("a network error keeps the dialog open and shows an error toast; retrying works", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    await mockVacancyList.ok(page, ALL());
    await mockVacancyStatus.network(page);
    await page.goto(LIST);
    await rowActions(page, "Backend Intern (Python)").click();
    await page.getByRole("menuitem", { name: "Close vacancy" }).click();
    await page.getByTestId("confirm-close").click();
    await expect(page.getByText("Couldn't complete that")).toBeVisible();
    await expect(page.getByTestId("close-dialog")).toBeVisible();

    await mockVacancyStatus.ok(page, { ...open17(), status: "closed", version: 4 }, sink);
    await page.getByTestId("confirm-close").click();
    await expect(page.getByTestId("close-dialog")).toBeHidden();
    expect(sink).toEqual([{ action: "close", version: 3 }]);
  });

  test("390 px: close from a stacked row", async ({ page }) => {
    await page.setViewportSize(PHONE);
    const sink: Sink = [];
    await mockVacancyList.ok(page, ALL());
    await mockVacancyStatus.ok(page, { ...open17(), status: "closed", version: 4 }, sink);
    await page.goto(LIST);
    await rowActions(page, "Backend Intern (Python)").click();
    await page.getByRole("menuitem", { name: "Close vacancy" }).click();
    await expect(page.getByTestId("close-dialog")).toBeVisible();
    await expectNoHorizontalScroll(page, 390);
    await page.getByTestId("confirm-close").click();
    await expect(page.getByText("Vacancy closed", { exact: true })).toBeVisible();
    expect(sink).toEqual([{ action: "close", version: 3 }]);
  });

  test("vacancy page: not found and load error with retry; draft vacancy page axe", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyGet.notFound(page);
    await page.goto("/company/vacancies/17");
    await expect(page.getByText("Vacancy not found")).toBeVisible();

    await mockVacancyGet.network(page);
    await page.goto("/company/vacancies/17");
    await expect(page.getByText("Couldn't load this vacancy")).toBeVisible();
    await mockVacancyGet.ok(page, draft18());
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Data Analyst Intern" })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe("US4 - a vacancy that closed on its deadline", () => {
  test("desktop row, mobile row and the vacancy page say it closed on its deadline and offer Edit + Reopen only", async ({ page }) => {
    await mockVacancyList.ok(page, [open17(), deadline21()]);
    await mockVacancyGet.ok(page, deadline21());

    await page.setViewportSize(DESKTOP);
    await page.goto(LIST);
    const row = tableRows(page).filter({ hasText: "Junior Data Engineer" });
    await expect(row).toContainText("on its deadline");
    await rowActions(page, "Junior Data Engineer").click();
    await expect(page.getByRole("menuitem")).toHaveText(["Edit", "Reopen"]);
    await page.keyboard.press("Escape");

    await page.setViewportSize(PHONE);
    await page.goto(LIST);
    await expect(phoneRows(page).filter({ hasText: "Junior Data Engineer" })).toContainText("on its deadline");
    await rowActions(page, "Junior Data Engineer").click();
    await expect(page.getByRole("menuitem")).toHaveText(["Edit", "Reopen"]);
    await page.keyboard.press("Escape");

    await page.setViewportSize(DESKTOP);
    await page.goto("/company/vacancies/21");
    await expect(page.getByTestId("vacancy-status-line")).toContainText("Closed on its deadline, 15 Oct");
    await expect(page.getByTestId("vacancy-notice")).toContainText("This vacancy is closed");
    await page.getByRole("button", { name: "More actions" }).click();
    await expect(page.getByRole("menuitem")).toHaveText(["Reopen"]);
    await expect(page.getByRole("button", { name: "Edit vacancy" })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

/* ── US5 edit a published vacancy (S3, non-draft) ────────────────────────── */

const saveBar = (page: Page) => page.getByRole("button", { name: "Save changes" });

async function pickNextMonth15(page: Page, label: RegExp | string) {
  await page.getByRole("button", { name: label }).click();
  const calendar = page.getByRole("dialog", { name: "Choose a date" });
  await calendar.getByRole("button", { name: "Next month" }).click();
  await calendar.getByRole("gridcell", { name: /^15 / }).click();
}

test.describe("US5 - employer edits a vacancy (S3, Open / Paused / Closed)", () => {
  test("no bar until an edit; Save changes sends PUT with the version, keeps the status and returns to the vacancy", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const putSink: Sink = [];
    const statusSink: Sink = [];
    await mockVacancyGet.ok(page, open17());
    await mockVacancyUpdate.ok(page, open17(), putSink);
    await mockVacancyStatus.ok(page, open17(), statusSink);
    await page.goto(EDIT);

    await expect(page.getByTestId("vacancy-status")).toHaveAttribute("data-status", "open");
    await expect(saveBar(page)).toHaveCount(0);
    await page.getByLabel("Title").fill("Backend Intern (Python, Payments)");
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await saveBar(page).click();

    await expect(page).toHaveURL(/\/company\/vacancies\/17$/);
    await expect(page.getByText("Changes saved")).toBeVisible();
    expect(putSink).toHaveLength(1);
    expect(putSink[0]).toMatchObject({ title: "Backend Intern (Python, Payments)", version: 3 });
    expect(statusSink).toHaveLength(0);
  });

  test("Discard resets the form and hides the bar", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyGet.ok(page, open17());
    await page.goto(EDIT);
    await page.getByLabel("Title").fill("Something else");
    await page.getByRole("button", { name: "Discard", exact: true }).click();
    await expect(page.getByLabel("Title")).toHaveValue("Backend Intern (Python)");
    await expect(saveBar(page)).toHaveCount(0);
  });

  test("incomplete and a past deadline show field errors; a network error keeps the values", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyGet.ok(page, open17());
    await mockVacancyUpdate.incomplete(page, ["description", "format"]);
    await page.goto(EDIT);
    await page.getByLabel("Title").fill("Backend Intern v2");
    await saveBar(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "Fix 2 fields to save" })).toBeVisible();
    await expect(page.getByText("Add a description")).toBeVisible();
    await expect(page.getByText("Choose a format")).toBeVisible();

    await mockVacancyUpdate.applyByNotInFuture(page);
    await saveBar(page).click();
    await expect(page.getByText("Choose today or a later date")).toBeVisible();

    await mockVacancyUpdate.network(page);
    await saveBar(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "Couldn't save your changes" })).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("Backend Intern v2");
  });

  test("version conflict: alert with Load latest; loading resets the form to the newest version; axe on dirty and conflict", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const newer = { ...open17(), title: "Changed in another tab", version: 9 };
    await mockVacancyGet.ok(page, open17());
    await mockVacancyUpdate.versionConflict(page, newer);
    await page.goto(EDIT);
    await page.getByLabel("Title").fill("My edit");
    await expectNoA11yViolations(page);
    await saveBar(page).click();

    await expect(page.getByRole("alert").filter({ hasText: "This vacancy was changed elsewhere" })).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("My edit");
    await expectNoA11yViolations(page);

    await mockVacancyGet.ok(page, newer);
    await page.getByRole("button", { name: "Load latest version" }).click();
    await expect(page.getByLabel("Title")).toHaveValue("Changed in another tab");
    await expect(page.getByText("This vacancy was changed elsewhere")).toHaveCount(0);
    await expect(saveBar(page)).toHaveCount(0);

    // saving again goes against the newest version
    const okSink: Sink = [];
    await mockVacancyUpdate.ok(page, newer, okSink);
    await page.getByLabel("Title").fill("After reload");
    await saveBar(page).click();
    await expect(page).toHaveURL(/\/company\/vacancies\/17$/);
    expect(okSink[0]).toMatchObject({ title: "After reload", version: 9 });
  });

  test("a closed vacancy can be edited and saved with a past deadline; it stays closed", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const closed = { ...closed20(), apply_by: "2020-01-01" };
    const putSink: Sink = [];
    await mockVacancyGet.ok(page, closed);
    await mockVacancyUpdate.ok(page, closed, putSink);
    await page.goto("/company/vacancies/20/edit");
    await expect(page.getByTestId("vacancy-status")).toHaveAttribute("data-status", "closed");
    await expect(page.getByText("This vacancy is closed. Use Reopen to take applications again.")).toBeVisible();
    await page.getByLabel("Description").fill("Updated description.");
    await saveBar(page).click();
    await expect(page.getByText("Changes saved")).toBeVisible();
    expect(putSink[0]).toMatchObject({ description: "Updated description.", apply_by: "2020-01-01", version: 5 });
    expect(putSink[0]).not.toHaveProperty("status");
  });

  test("leaving a dirty Open vacancy asks first (D4)", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyGet.ok(page, open17());
    await page.goto(EDIT);
    await page.getByLabel("Title").fill("Changed");
    await page.getByRole("link", { name: "Backend Intern (Python)" }).first().click();
    await expect(page.getByRole("dialog", { name: "Discard your changes?" })).toBeVisible();
  });

  test("390 px: dirty form has no horizontal scroll", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await mockVacancyGet.ok(page, paused19());
    await page.goto("/company/vacancies/19/edit");
    await page.getByLabel("Title").fill("Changed");
    await expect(saveBar(page)).toBeVisible();
    await expectNoHorizontalScroll(page, 390);
  });
});

/* ── US6 pause and resume ────────────────────────────────────────────────── */

const menuItems = (page: Page) => page.getByRole("menuitem");

test.describe("US6 - employer pauses and resumes a vacancy", () => {
  test("the menu offers only the actions valid for each status", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.ok(page, ALL());
    await page.goto(LIST);
    const expected: [string, string[]][] = [
      ["Backend Intern (Python)", ["Edit", "Pause", "Close vacancy"]],
      ["Data Analyst Intern", ["Edit", "Publish", "Delete draft"]],
      ["QA Engineer", ["Edit", "Resume", "Close vacancy"]],
      ["Product Design Intern", ["Edit", "Reopen"]],
    ];
    for (const [title, items] of expected) {
      await rowActions(page, title).click();
      await expect(menuItems(page)).toHaveText(items);
      await page.keyboard.press("Escape");
    }
  });

  test("pause then resume from the list sends {action, version} and shows the toast", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    const paused = { ...open17(), status: "paused" as const, version: 4 };
    await mockVacancyList.ok(page, ALL());
    await mockVacancyStatus.ok(page, paused, sink);
    await page.goto(LIST);

    await rowActions(page, "Backend Intern (Python)").click();
    await mockVacancyList.ok(page, [paused, draft18(), paused19(), closed20()]);
    await menuItems(page).filter({ hasText: "Pause" }).click();
    await expect(page.getByText("Vacancy paused", { exact: true })).toBeVisible();
    await expect(tableRows(page).filter({ hasText: "Backend Intern (Python)" }).getByTestId("vacancy-status")).toHaveAttribute("data-status", "paused");
    expect(sink).toEqual([{ action: "pause", version: 3 }]);

    await mockVacancyStatus.ok(page, { ...paused, status: "open", version: 5 }, sink);
    await rowActions(page, "Backend Intern (Python)").click();
    await mockVacancyList.ok(page, ALL());
    await menuItems(page).filter({ hasText: "Resume" }).click();
    await expect(page.getByText("Vacancy resumed", { exact: true })).toBeVisible();
    expect(sink[1]).toEqual({ action: "resume", version: 4 });
  });

  test("S4: the paused notice has Resume; pause from the More actions menu", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    await mockVacancyGet.ok(page, paused19());
    await mockVacancyStatus.ok(page, { ...paused19(), status: "open", version: 5 }, sink);
    await page.goto("/company/vacancies/19");
    const notice = page.getByTestId("vacancy-notice");
    await expect(notice).toContainText("Paused · hidden from search");
    await notice.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByTestId("vacancy-status-line").getByTestId("vacancy-status")).toHaveAttribute("data-status", "open");
    await expect(page.getByTestId("vacancy-notice")).toHaveCount(0);
    expect(sink).toEqual([{ action: "resume", version: 4 }]);

    await mockVacancyStatus.ok(page, { ...paused19(), version: 6 }, sink);
    await page.getByRole("button", { name: "More actions" }).click();
    await menuItems(page).filter({ hasText: "Pause" }).click();
    await expect(page.getByTestId("vacancy-status-line").getByTestId("vacancy-status")).toHaveAttribute("data-status", "paused");
    expect(sink[1]).toEqual({ action: "pause", version: 5 });
  });

  test("a refused resume (past deadline) shows the notice", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyGet.ok(page, paused19());
    await mockVacancyStatus.invalidTransition(page, "closed");
    await page.goto("/company/vacancies/19");
    await page.getByTestId("vacancy-notice").getByRole("button", { name: "Resume" }).click();
    await expect(page.getByTestId("vacancy-notice")).toContainText("Resume didn't apply");
  });
});

/* ── US7 reopen (D2) ─────────────────────────────────────────────────────── */

const reopenDialog = (page: Page) => page.getByTestId("reopen-dialog");

test.describe("US7 - employer reopens a closed vacancy (D2)", () => {
  test("list: empty date field, calendar inside the dialog, confirm sends {action, version, apply_by}", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    const reopened = { ...closed20(), status: "open" as const, closed_at: null, closed_by: null, version: 6 };
    await mockVacancyList.ok(page, ALL());
    await mockVacancyStatus.ok(page, reopened, sink);
    await page.goto(LIST);

    await rowActions(page, "Product Design Intern").click();
    await menuItems(page).filter({ hasText: "Reopen" }).click();
    await expect(reopenDialog(page)).toBeVisible();
    await expect(reopenDialog(page).getByTestId("reopen-date")).toContainText("Pick a date");
    await expectNoA11yViolations(page);

    // the calendar opens inside the dialog and is not clipped by it
    await reopenDialog(page).getByRole("button", { name: /New Apply by date/ }).click();
    const calendar = page.getByRole("dialog", { name: "Choose a date" });
    await expect(calendar).toBeVisible();
    const last = (await calendar.getByRole("gridcell").last().boundingBox())!;
    const reachable = await page.evaluate(
      ([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest("[role=gridcell]")),
      [last.x + last.width / 2, last.y + last.height / 2],
    );
    expect(reachable).toBe(true);
    await calendar.getByRole("button", { name: "Next month" }).click();
    await calendar.getByRole("gridcell", { name: /^15 / }).click();

    await mockVacancyList.ok(page, [reopened, open17()]);
    await page.getByTestId("confirm-reopen").click();
    await expect(page.getByText("Vacancy reopened", { exact: true })).toBeVisible();
    await expect(reopenDialog(page)).toBeHidden();
    expect(sink).toHaveLength(1);
    expect(sink[0]).toMatchObject({ action: "reopen", version: 5 });
    expect(sink[0].apply_by).toMatch(/^\d{4}-\d{2}-15$/);
  });

  test("confirming without a date asks for one and sends nothing", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    await mockVacancyList.ok(page, ALL());
    await mockVacancyStatus.ok(page, closed20(), sink);
    await page.goto(LIST);
    await rowActions(page, "Product Design Intern").click();
    await menuItems(page).filter({ hasText: "Reopen" }).click();
    await page.getByTestId("confirm-reopen").click();
    await expect(reopenDialog(page)).toContainText("Choose today or a later date");
    expect(sink).toHaveLength(0);
  });

  test("a date the server refuses keeps the dialog open, the date and the error in place; a second date succeeds", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    await mockVacancyGet.ok(page, closed20());
    await mockVacancyStatus.applyByNotInFuture(page, sink);
    await page.goto("/company/vacancies/20");
    await page.getByTestId("vacancy-notice").getByRole("button", { name: "Reopen" }).click();
    await pickNextMonth15(page, /New Apply by date/);
    const dateButton = reopenDialog(page).getByRole("button", { name: /New Apply by date/ });
    const chosen = await dateButton.innerText();
    expect(chosen).toMatch(/15 /);
    await page.getByTestId("confirm-reopen").click();

    await expect(reopenDialog(page)).toBeVisible();
    await expect(reopenDialog(page)).toContainText("Choose today or a later date");
    await expect(dateButton).toHaveAttribute("aria-invalid", "true");
    await expect(dateButton).toBeFocused();
    expect(await dateButton.innerText()).toBe(chosen);
    expect(sink).toHaveLength(1);

    // a valid answer from now on; changing the date clears the error, confirming succeeds
    const okSink: Sink = [];
    await mockVacancyStatus.ok(page, { ...closed20(), status: "open", closed_at: null, closed_by: null, version: 6 }, okSink);
    await dateButton.click();
    await page.getByRole("dialog", { name: "Choose a date" }).getByRole("gridcell", { name: /^20 / }).click();
    await expect(reopenDialog(page)).not.toContainText("Choose today or a later date");
    await page.getByTestId("confirm-reopen").click();
    await expect(page.getByText("Vacancy reopened", { exact: true })).toBeVisible();
    expect(okSink[0]).toMatchObject({ action: "reopen", version: 5 });
    expect(okSink[0].apply_by).toMatch(/-20$/);
  });

  test("S4: reopen from the closed notice turns the page Open", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    await mockVacancyGet.ok(page, closed20());
    await mockVacancyStatus.ok(page, { ...closed20(), status: "open", closed_at: null, closed_by: null, version: 6 }, sink);
    await page.goto("/company/vacancies/20");
    await page.getByTestId("vacancy-notice").getByRole("button", { name: "Reopen" }).click();
    await pickNextMonth15(page, /New Apply by date/);
    await page.getByTestId("confirm-reopen").click();
    await expect(page.getByTestId("vacancy-status-line").getByTestId("vacancy-status")).toHaveAttribute("data-status", "open");
    expect(sink[0]).toMatchObject({ action: "reopen", version: 5 });
  });

  test("390 px: the reopen dialog fits", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await mockVacancyList.ok(page, ALL());
    await page.goto(LIST);
    await rowActions(page, "Product Design Intern").click();
    await menuItems(page).filter({ hasText: "Reopen" }).click();
    await expect(reopenDialog(page)).toBeVisible();
    await expectNoHorizontalScroll(page, 390);
    await expectNoA11yViolations(page);
  });
});

/* ── US8 delete a draft (D3) ─────────────────────────────────────────────── */

test.describe("US8 - employer deletes a draft (D3)", () => {
  test("list: D3, confirm sends DELETE with the version, toast, row gone", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    await mockVacancyList.ok(page, ALL());
    await mockVacancyDelete.ok(page, sink);
    await page.goto(LIST);

    await rowActions(page, "Data Analyst Intern").click();
    await menuItems(page).filter({ hasText: "Delete draft" }).click();
    const dialog = page.getByTestId("delete-dialog");
    await expect(dialog).toContainText("will be deleted for good");
    await expectNoA11yViolations(page);

    await mockVacancyList.ok(page, [open17(), paused19(), closed20()]);
    await page.getByTestId("confirm-delete").click();
    await expect(page.getByText("Draft deleted")).toBeVisible();
    await expect(tableRows(page)).toHaveCount(3);
    expect(sink).toEqual([{ version: 1 }]);
  });

  test("Keep draft cancels without a request", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    await mockVacancyList.ok(page, ALL());
    await mockVacancyDelete.ok(page, sink);
    await page.goto(LIST);
    await rowActions(page, "Data Analyst Intern").click();
    await menuItems(page).filter({ hasText: "Delete draft" }).click();
    await page.getByRole("button", { name: "Keep draft" }).click();
    await expect(page.getByTestId("delete-dialog")).toBeHidden();
    expect(sink).toHaveLength(0);
    await expect(tableRows(page)).toHaveCount(4);
  });

  test("S4: deleting returns to the list", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    await mockVacancyGet.ok(page, draft18());
    await mockVacancyDelete.ok(page, sink);
    await mockVacancyList.ok(page, [open17()]);
    await page.goto("/company/vacancies/18");
    await page.getByRole("button", { name: "More actions" }).click();
    await menuItems(page).filter({ hasText: "Delete draft" }).click();
    await page.getByTestId("confirm-delete").click();
    await expect(page).toHaveURL(/\/company\/vacancies$/);
    await expect(page.getByText("Draft deleted")).toBeVisible();
    expect(sink).toEqual([{ version: 1 }]);
  });

  test("published statuses have no Delete item", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.ok(page, ALL());
    await page.goto(LIST);
    for (const title of ["Backend Intern (Python)", "QA Engineer", "Product Design Intern"]) {
      await rowActions(page, title).click();
      await expect(menuItems(page).filter({ hasText: "Delete" })).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
  });

  test("not_a_draft: the dialog closes with a notice and the list refreshes (no Delete any more)", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.ok(page, ALL());
    await mockVacancyDelete.notADraft(page, "open");
    await page.goto(LIST);
    await rowActions(page, "Data Analyst Intern").click();
    await menuItems(page).filter({ hasText: "Delete draft" }).click();
    await mockVacancyList.ok(page, [open17(), { ...draft18(), status: "open" }, paused19(), closed20()]);
    await page.getByTestId("confirm-delete").click();
    await expect(page.getByTestId("vacancy-notice")).toContainText("Delete didn't apply");
    await rowActions(page, "Data Analyst Intern").click();
    await expect(menuItems(page).filter({ hasText: "Delete" })).toHaveCount(0);
  });

  test("390 px: the delete dialog fits", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await mockVacancyList.ok(page, ALL());
    await page.goto(LIST);
    await rowActions(page, "Data Analyst Intern").click();
    await menuItems(page).filter({ hasText: "Delete draft" }).click();
    await expect(page.getByTestId("delete-dialog")).toBeVisible();
    await expectNoHorizontalScroll(page, 390);
  });
});

/* ── Accessibility follow-ups from design QA: focus management and the open calendar ─────────────── */

const activeTag = (page: Page) => page.evaluate(() => document.activeElement?.tagName ?? "");

test.describe("focus after dialogs close", () => {
  test("D1 Close: Esc, Keep it open and the ✕ return focus to the ⋯ trigger; confirm does not drop it on body", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.ok(page, ALL());
    await mockVacancyStatus.ok(page, { ...open17(), status: "closed", version: 4 }, []);
    await page.goto(LIST);
    const trigger = rowActions(page, "Backend Intern (Python)");
    const openClose = async () => {
      await trigger.click();
      await menuItems(page).filter({ hasText: "Close vacancy" }).click();
      await expect(page.getByTestId("close-dialog")).toBeVisible();
    };

    await openClose();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("close-dialog")).toBeHidden();
    await expect(trigger).toBeFocused();

    await openClose();
    await page.getByRole("button", { name: "Keep it open" }).click();
    await expect(trigger).toBeFocused();

    await openClose();
    await page.getByTestId("confirm-close").click();
    await expect(page.getByTestId("close-dialog")).toBeHidden();
    await expect.poll(() => activeTag(page)).not.toBe("BODY");
  });

  test("D2 Reopen: Cancel returns focus to the trigger", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.ok(page, ALL());
    await page.goto(LIST);
    const trigger = rowActions(page, "Product Design Intern");
    await trigger.click();
    await menuItems(page).filter({ hasText: "Reopen" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(reopenDialog(page)).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("D3 Delete: Keep draft returns to the trigger; a confirmed delete (row gone) focuses the page heading", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.ok(page, ALL());
    await mockVacancyDelete.ok(page, []);
    await page.goto(LIST);
    const trigger = rowActions(page, "Data Analyst Intern");
    await trigger.click();
    await menuItems(page).filter({ hasText: "Delete draft" }).click();
    await page.getByRole("button", { name: "Keep draft" }).click();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await menuItems(page).filter({ hasText: "Delete draft" }).click();
    await mockVacancyList.ok(page, [open17(), paused19(), closed20()]);
    await page.getByTestId("confirm-delete").click();
    await expect(page.getByRole("heading", { level: 1, name: "Vacancies" })).toBeFocused();
  });

  test("S4: closing from the notice-less page returns focus to the More actions button on cancel", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyGet.ok(page, open17());
    await page.goto("/company/vacancies/17");
    const trigger = page.getByRole("button", { name: "More actions" });
    await trigger.click();
    await menuItems(page).filter({ hasText: "Close vacancy" }).click();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });

  test("D4 Discard: Keep editing leaves focus on a control, not on body", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyGet.ok(page, open17());
    await page.goto(EDIT);
    await page.getByLabel("Title").fill("Changed");
    const back = page.getByRole("link", { name: "Backend Intern (Python)" }).first();
    await back.click();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(page.getByRole("dialog", { name: "Discard your changes?" })).toBeHidden();
    await expect(back).toBeFocused();
  });
});

test.describe("open calendar passes axe", () => {
  test("in the Reopen dialog", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyList.ok(page, ALL());
    await page.goto(LIST);
    await rowActions(page, "Product Design Intern").click();
    await menuItems(page).filter({ hasText: "Reopen" }).click();
    await reopenDialog(page).getByRole("button", { name: /New Apply by date/ }).click();
    await expect(page.getByRole("dialog", { name: "Choose a date" })).toBeVisible();
    await expectNoA11yViolations(page);
    // grid > row > gridcell, names kept
    await expect(page.getByRole("dialog", { name: "Choose a date" }).getByRole("row")).toHaveCount(6);
    await expect(page.getByRole("gridcell", { name: /^15 / })).toHaveCount(1);
  });

  test("in the wizard Details step and the edit form", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(WIZARD);
    await page.getByLabel("Title").fill("Backend Intern (Python)");
    await cont(page).click();
    await cont(page).click();
    await page.getByRole("button", { name: /Apply by/ }).click();
    await expect(page.getByRole("dialog", { name: "Choose a date" })).toBeVisible();
    await expectNoA11yViolations(page);

    await mockVacancyGet.ok(page, draft());
    await page.goto(EDIT);
    await page.getByRole("button", { name: /Apply by/ }).click();
    await expect(page.getByRole("dialog", { name: "Choose a date" })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe("wizard focus", () => {
  test("invalid title focuses the field; each step change focuses the new heading; alert links focus the target heading", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await mockVacancyCreate.incomplete(page, ["format", "apply_by"]);
    await page.goto(WIZARD);

    await cont(page).click();
    await expect(page.getByLabel("Title")).toBeFocused();

    await page.getByLabel("Title").fill("Backend Intern (Python)");
    await cont(page).click();
    await expect(page.getByRole("heading", { level: 1, name: "Which skills does it need?" })).toBeFocused();
    await cont(page).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tell students about it" })).toBeFocused();
    await cont(page).click();
    await expect(page.getByRole("heading", { level: 1, name: "Check how students will see it" })).toBeFocused();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tell students about it" })).toBeFocused();
    await cont(page).click();

    await page.getByRole("button", { name: "Publish vacancy" }).click();
    const alert = page.getByRole("alert").filter({ hasText: "Fix 2 things to publish" });
    await expect(alert).toBeVisible();
    await alert.getByRole("button", { name: "Format · Basics" }).click();
    await expect(page.getByTestId("wizard-step-basics")).toBeVisible();
    await expect.poll(() => activeTag(page)).not.toBe("BODY");
    await expect(page.getByRole("heading", { level: 1, name: "What's the role?" })).toBeFocused();
  });
});

/* ── Round 5: skills search from the server, and the open skills list never covers the primary button ───── */

const SKILLS = ["Python", "PyTorch", "SQL", "Git", "Docker", "React", "TypeScript", "FastAPI"];

function trackSkillQueries(page: Page) {
  const queries: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.pathname === "/api/skills") queries.push(u.searchParams.get("q") ?? "");
  });
  return queries;
}

/** Types into a skills field and picks: waits for the option that must appear (server answer) before pressing Enter. */
async function pickTyped(page: Page, group: "Required" | "Nice to have", text: string, option: RegExp | string) {
  const input = page.getByRole("combobox", { name: new RegExp(`^${group}\\b`) });
  // the page asks the server once the typing pauses (250 ms), so wait for that request before picking
  const asked = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/skills" && new URL(r.url()).searchParams.get("q") === text);
  await input.fill(text);
  await asked;
  await expect(page.getByRole("option", { name: option })).toBeVisible();
  await input.press("Enter");
}

/** The control at the centre of `locator` is the control itself: nothing floats over it. */
async function expectReachable(locator: ReturnType<Page["locator"]>) {
  await locator.scrollIntoViewIfNeeded();
  const box = (await locator.boundingBox())!;
  const hit = await locator.evaluate(
    (el, [x, y]) => {
      const top = document.elementFromPoint(x as number, y as number);
      return Boolean(top && (el === top || el.contains(top)));
    },
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(hit).toBe(true);
}

test.describe("skills search (round 5)", () => {
  test("wizard: typing asks GET /api/skills?q=; fastapi + Enter picks the existing FastAPI; rust offers Add and adds it", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const sink: Sink = [];
    await mockSkills.ok(page, SKILLS);
    await mockVacancyCreate.ok(page, sink);
    const queries = trackSkillQueries(page);
    await page.goto(WIZARD);
    await page.getByLabel("Title").fill("Backend Intern (Python)");
    await cont(page).click();

    await pickTyped(page, "Required", "fastapi", "FastAPI");
    await expect(page.getByRole("button", { name: "Remove FastAPI" })).toBeVisible();
    await pickTyped(page, "Required", "rust", /Add .*rust/);
    await expect(page.getByRole("button", { name: "Remove rust" })).toBeVisible();
    expect(queries).toContain("fastapi");
    expect(queries).toContain("rust");

    await cont(page).click();
    await cont(page).click();
    await page.getByRole("button", { name: "Publish vacancy" }).click();
    await expect(page).toHaveURL(/\/company\/vacancies$/);
    expect(sink[0]).toMatchObject({ required_skills: ["FastAPI", "rust"] });
  });

  test("edit form: the same, saved with the PUT body", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const putSink: Sink = [];
    await mockSkills.ok(page, SKILLS);
    await mockVacancyGet.ok(page, open17());
    await mockVacancyUpdate.ok(page, open17(), putSink);
    const queries = trackSkillQueries(page);
    await page.goto(EDIT);

    await pickTyped(page, "Required", "fastapi", "FastAPI");
    await pickTyped(page, "Required", "rust", /Add .*rust/);
    expect(queries).toContain("fastapi");
    expect(queries).toContain("rust");
    await saveBar(page).click();
    await expect(page).toHaveURL(/\/company\/vacancies\/17$/);
    expect(putSink[0].required_skills).toEqual(expect.arrayContaining(["Python", "SQL", "Git", "FastAPI", "rust"]));
  });

  test("390 px: with both skill lists used, Continue (wizard) and Save changes (edit) are reachable without Escape", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await mockSkills.ok(page, SKILLS);
    await mockVacancyGet.ok(page, open17());
    await page.goto(WIZARD);
    await page.getByLabel("Title").fill("Backend Intern (Python)");
    await cont(page).click();
    await addSkill(page, "Required", "Python");
    await addSkill(page, "Required", "SQL");
    await expect(page.getByRole("listbox").first()).toBeVisible();
    await expectReachable(cont(page));
    await expect(page.getByRole("listbox").first()).toBeVisible();
    await cont(page).click(); // one click, list still open: it must not be lost
    await expect(page.getByTestId("wizard-step-details")).toBeVisible();

    await page.goto(EDIT);
    await addSkill(page, "Required", "React");
    await addSkill(page, "Nice to have", "TypeScript");
    await expectReachable(saveBar(page));
    await expectNoHorizontalScroll(page, 390);
    const putSink: Sink = [];
    await mockVacancyUpdate.ok(page, open17(), putSink);
    await saveBar(page).click(); // one click with both lists open
    await expect(page).toHaveURL(/\/company\/vacancies\/17$/);
    expect(putSink).toHaveLength(1);
  });
});

test("390 px: five skill chips pass axe (remove buttons are at least 24 px)", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await mockSkills.ok(page, SKILLS);
  await page.goto(WIZARD);
  await page.getByLabel("Title").fill("Backend Intern (Python)");
  await cont(page).click();
  for (const skill of ["Python", "SQL", "Git", "Docker", "React"]) await addSkill(page, "Required", skill);
  await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(5);
  const sizes = await page.getByRole("button", { name: /^Remove / }).evaluateAll((els) => els.map((e) => [(e as HTMLElement).offsetWidth, (e as HTMLElement).offsetHeight]));
  for (const [w, h] of sizes) {
    expect(w).toBeGreaterThanOrEqual(24);
    expect(h).toBeGreaterThanOrEqual(24);
  }
  await expectNoA11yViolations(page);
  await expectNoHorizontalScroll(page, 390);
});
