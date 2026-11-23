import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";
import { mockSignIn, signedInAs, signedOut } from "./support/auth-api";
import {
  detailFixture, manyOpportunities, mockOpportunities, mockOpportunity, opportunityFixture, signedInStudent, type ApiOpportunity,
} from "./support/opportunities-api";
import {
  mockProfileCatalog, mockStudentProfile, newStudent, studentProfileFixture, studentServer,
} from "./support/profiles-api";
import {
  mockCatalog, mockCompanyProfile, mockSkills, mockVacancyCreate, mockVacancyGet, mockVacancyList, mockVacancyStatus, mockVacancyUpdate,
  vacancyFixture, type Sink,
} from "./support/vacancies-api";

/*
 * Feature 004-student-opportunities — S1 (list), S2 (details), S3 (Research in the 002 and 003 screens).
 * The API is mocked with page.route (support/opportunities-api.ts); contract: specs/004-student-opportunities/contracts/opportunities-api.md.
 * QA scenarios of spec.md user stories 1-4 are named "US<n> QA <m>".
 */

const LIST = "/app/opportunities";
const PHONE = { width: 390, height: 844 };

test.beforeEach(async ({ page }) => {
  await signedInStudent(page);
});

const isDesktop = (page: Page) => page.viewportSize()!.width >= 1024;
const cards = (page: Page) => page.getByTestId("vacancy-card");
const count = (page: Page) => page.getByTestId("results-count");
const searchbox = (page: Page) => page.getByRole("searchbox", { name: "Search opportunities" });
const titles = (page: Page) => cards(page).getByRole("link").allTextContents();

async function expectNoHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
}

/** The date in UTC+5 (what the app calls today), `days` from now. */
const kzDay = (days: number) => new Date(Date.now() + 5 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

/** One filter value, on desktop in the side menu, below 1024 px in the Filters sheet. */
async function pickFilter(page: Page, group: "format" | "city" | "field", label: string) {
  const toggle = async (scope: Locator) => {
    const header = scope.locator(`button[aria-controls="${group}-options"]`);
    if ((await header.getAttribute("aria-expanded")) === "false") await header.click();
    await scope.getByRole("checkbox", { name: label, exact: true }).click();
  };
  if (isDesktop(page)) return toggle(page.locator("body"));
  await page.getByRole("button", { name: /^Filters/ }).click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await toggle(sheet);
  await sheet.getByRole("button", { name: /^Show / }).click();
  await expect(sheet).toBeHidden();
}

/** Five opportunities that exercise every filter. */
const DATA: ApiOpportunity[] = [
  opportunityFixture({ id: 1, title: "Backend Intern (Python)", published_at: "2026-11-24T08:00:00Z", apply_by: "2099-12-15" }),
  opportunityFixture({
    id: 2, title: "Frontend Developer", type: "full_time", field: "frontend", city: "astana", format: "remote", duration: null, salary: null,
    published_at: "2026-11-23T08:00:00Z", apply_by: "2099-12-01", required_skills: ["React", "TypeScript"], nice_skills: [], company: { name: "Chocofamily" },
  }),
  opportunityFixture({
    id: 3, title: "Data Science Research Assistant", type: "research", field: "data_science", city: "almaty", format: "on_site",
    published_at: "2026-11-22T08:00:00Z", apply_by: "2099-11-20", required_skills: ["Python", "Statistics"], nice_skills: [], company: { name: "KBTU Lab" },
  }),
  opportunityFixture({
    id: 4, title: "QA Intern", type: "internship", field: "qa", city: "astana", format: "on_site", published_at: "2026-11-21T08:00:00Z",
    apply_by: "2099-12-30", required_skills: ["Selenium"], nice_skills: [], company: { name: "Kolesa Group" },
  }),
  opportunityFixture({
    id: 5, title: "Support Engineer", type: "part_time", field: "other", city: "almaty", format: "hybrid", published_at: "2026-11-20T08:00:00Z",
    apply_by: "2099-12-10", required_skills: ["SQL"], nice_skills: ["Linux"], company: { name: "Beeline" },
  }),
];

/* ── US1 · list ──────────────────────────────────────────────────────────── */

test.describe("US1 list (S1)", () => {
  test("US1 QA 1: every active opportunity shows title, type and deadline; the closing week is called out", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const requests: string[] = [];
    const soon = opportunityFixture({ id: 6, title: "Closing tomorrow role", apply_by: kzDay(1), published_at: daysAgo(2) });
    await mockOpportunities.serve(page, [...DATA, soon], { requests });
    await page.goto(LIST);

    await expect(page.getByRole("heading", { level: 1, name: "Opportunities" })).toBeVisible();
    await expect(cards(page)).toHaveCount(6);
    await expect(count(page)).toHaveText("6 opportunities");
    const first = cards(page).filter({ hasText: "Backend Intern (Python)" });
    await expect(first.getByRole("link", { name: "Backend Intern (Python)" })).toHaveAttribute("href", "/app/opportunities/1");
    await expect(first).toContainText("Internship");
    await expect(first).toContainText("Kaspi.kz");
    await expect(first).toContainText("Almaty · Hybrid");
    await expect(first.getByTestId("vacancy-deadline")).toHaveText("Apply by 15 Dec");
    await expect(first).toContainText("Python");
    await expect(first).not.toContainText("Docker"); // Nice to have skills are on the details page
    await expect(cards(page).filter({ hasText: "Frontend Developer" })).toContainText("Full-time");
    await expect(cards(page).filter({ hasText: "Data Science Research Assistant" })).toContainText("Research");
    await expect(cards(page).filter({ hasText: "Closing tomorrow role" }).getByTestId("vacancy-deadline")).toHaveText("Closes tomorrow");
    // the plain list is one request without a query
    expect(requests[0]).toBe("");
    expect(errors).toEqual([]);
  });

  test("US1 QA 1: pagination shows 10 at a time", async ({ page }) => {
    await mockOpportunities.serve(page, manyOpportunities(23));
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(10);
    await expect(count(page)).toHaveText("23 opportunities");
    await page.getByRole("button", { name: "Page 3" }).click();
    await expect(cards(page)).toHaveCount(3);
    await expect(page).toHaveURL(/\?page=3$/);
  });

  test("US1 QA 2: no active opportunities shows a clear message and nothing to search", async ({ page }) => {
    await mockOpportunities.empty(page);
    await page.goto(LIST);
    const none = page.getByTestId("opportunities-none-yet");
    await expect(none).toContainText("No opportunities yet");
    await expect(none).toContainText("Active internships, vacancies and research projects will appear here.");
    await expect(searchbox(page)).toHaveCount(0);
    await expect(count(page)).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "Research" })).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test("US1 QA 3: a student without a profile is sent to create it and comes back to the same address", async ({ page }) => {
    await newStudent(page);
    await mockProfileCatalog.ok(page);
    await mockOpportunities.serve(page, DATA);
    await page.goto(`${LIST}?type=research`);
    await expect(page).toHaveURL(/\/onboarding\?next=%2Fapp%2Fopportunities%3Ftype%3Dresearch$/);

    await page.getByLabel("Full name").fill("Maya Akhmetova");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("combobox", { name: "University" }).fill("Satbayev");
    await page.getByRole("option", { name: /^Satbayev University/ }).first().click();
    await page.getByRole("radio", { name: "Bachelor's" }).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("combobox", { name: "Major" }).fill("Computer Sci");
    await page.getByRole("option", { name: /^Computer Science$/ }).first().click();
    await page.getByRole("radio", { name: "3rd year" }).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("checkbox", { name: "Internship" }).check();
    await page.getByRole("radio", { name: "I'm not sure yet" }).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page).toHaveURL(/\/app\/opportunities\?type=research$/);
    await expect(page.getByRole("radio", { name: "Research" })).toBeChecked();
    await expect(cards(page)).toHaveCount(1);
  });

  test("US1 QA 3: a stale cache is corrected by 403 student_profile_required (the student goes to onboarding)", async ({ page }) => {
    await mockOpportunities.profileRequired(page);
    await page.goto(LIST);
    await expect(page).toHaveURL(/\/onboarding\?next=%2Fapp%2Fopportunities$/);
  });

  test("US1 QA 4: a guest is sent to sign in and, after signing in, back to the list they asked for", async ({ page }) => {
    await signedOut(page);
    await mockSignIn.ok(page, "student");
    await mockOpportunities.serve(page, DATA);
    await page.goto(`${LIST}?q=python`);
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp%2Fopportunities%3Fq%3Dpython$/);
    await page.getByLabel("Email").fill("maya@sdu.edu.kz");
    await page.getByLabel("Password", { exact: true }).fill("correct horse");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app\/opportunities\?q=python$/);
    await expect(searchbox(page)).toHaveValue("python");
  });

  test("US1 QA 4: an employer does not see it and lands on the company pages", async ({ page }) => {
    await signedInAs(page, "employer");
    await mockCompanyProfile.ok(page);
    await mockVacancyList.empty(page);
    await page.goto(LIST);
    await expect(page).toHaveURL(/\/company\/vacancies$/);
    await page.goto(`${LIST}/3`);
    await expect(page).toHaveURL(/\/company\/vacancies$/);
  });

  test("US1 QA 5: what the employer changed shows on the next load, a removed vacancy is gone", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);
    const [edited, , ...rest] = DATA;
    await mockOpportunities.serve(page, [{ ...edited, title: "Backend Intern (Go)" }, ...rest.slice(0, 2)]);
    await page.reload();
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByRole("link", { name: "Backend Intern (Go)" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Frontend Developer" })).toHaveCount(0);
  });

  test("a failed load shows the error with Try again, then the list", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await mockOpportunities.serverError(page, 1);
    await page.goto(LIST);
    await expect(page.getByText("Couldn't load opportunities")).toBeVisible();
    await expect(page.getByText("Your search and filters are kept.")).toBeVisible();
    await expect(searchbox(page)).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(cards(page)).toHaveCount(5);
    await expect(page.getByText("Couldn't load opportunities")).toHaveCount(0);
  });

  test("a network failure keeps the typed search; Try again repeats it", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);
    await mockOpportunities.network(page, 1);
    await searchbox(page).fill("python");
    await expect(page.getByText("Couldn't load opportunities")).toBeVisible();
    await expect(searchbox(page)).toHaveValue("python");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(cards(page)).toHaveCount(2);
  });

  test("a failed background refetch never hides the cards already shown", async ({ page }) => {
    await page.clock.install();
    await mockOpportunities.serve(page, DATA);
    await mockOpportunity.ok(page);
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);
    await page.getByRole("link", { name: "QA Intern" }).click();
    await expect(page.getByTestId("decision-panel")).toBeVisible();
    await page.clock.fastForward(120_000); // the cached list is stale now: coming back refetches it
    let failed = 0;
    await page.route(/\/api\/student\/opportunities(\?.*)?$/, (route) => { failed += 1; return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: { code: "server_error", message: "mock" } }) }); });
    await page.getByRole("main").getByRole("link", { name: "Opportunities" }).click();
    await expect.poll(() => failed).toBe(1);
    await expect(cards(page)).toHaveCount(5);
    await expect(page.getByText("Couldn't load opportunities")).toHaveCount(0);
  });

  test("a transient catalog failure shows the error; Try again loads the catalog and the list", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    // the catalog query retries once by itself, so two failures = the load fails and Try again works
    await mockProfileCatalog.network(page, 2);
    await page.goto(LIST);
    await expect(page.getByText("Couldn't load opportunities")).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(cards(page)).toHaveCount(5);
  });

  test("loading shows skeleton cards (never a spinner page) while the first answer is pending", async ({ page }) => {
    await mockOpportunities.serve(page, DATA, { delay: () => 1200 });
    await page.goto(LIST);
    await expect(page.getByTestId("opportunities-loading")).toBeVisible();
    await expect(count(page)).toHaveText("Searching…");
    await expect(cards(page)).toHaveCount(5);
  });

  test("the old demo paths lead to Opportunities (the query string is kept)", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await mockOpportunity.ok(page);
    for (const path of ["/app", "/app/applications", "/app/saved"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/app\/opportunities$/);
    }
    await page.goto("/app/vacancies?type=research&q=py");
    await expect(page).toHaveURL(/\/app\/opportunities\?type=research&q=py$/);
    await expect(searchbox(page)).toHaveValue("py");
    await page.goto("/app/vacancies/5");
    await expect(page).toHaveURL(/\/app\/opportunities\/5$/);
    await expect(page.getByRole("heading", { level: 1, name: "Backend Intern (Python)" })).toBeVisible();
  });

  test("no Match, Apply, Save, notification bell or other menu item (list and details)", async ({ page }, info) => {
    await mockOpportunities.serve(page, DATA);
    await mockOpportunity.ok(page);
    for (const path of [LIST, `${LIST}/1`]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(/\d+% match/i)).toHaveCount(0);
      await expect(page.getByRole("button", { name: /apply|save|bookmark/i })).toHaveCount(0);
      await expect(page.getByTestId("notifications-button")).toHaveCount(0);
      await expect(page.getByText(/^(Home|Applications|Saved)$/)).toHaveCount(0);
      if (info.project.name === "desktop") {
        const nav = page.getByRole("navigation", { name: "Main" });
        await expect(nav.getByRole("link")).toHaveCount(1);
        await expect(nav.getByRole("link", { name: "Opportunities" })).toHaveAttribute("aria-current", "page");
      }
    }
  });

  test("the logo and the single menu item lead to the plain list", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the menu is one plain label on desktop");
    await mockOpportunities.serve(page, DATA);
    await page.goto(`${LIST}?type=research`);
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Opportunities" }).click();
    await expect(page).toHaveURL(/\/app\/opportunities$/);
    await expect(cards(page)).toHaveCount(5);
  });

  test("passes axe and does not scroll sideways at 390 px", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await mockOpportunities.serve(page, DATA);
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });

  test("passes axe on the list with filters picked and on no results", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await page.goto(`${LIST}?type=internship&city=almaty`);
    await expect(cards(page)).toHaveCount(1);
    await expectNoA11yViolations(page);
    await searchbox(page).fill("blockchain");
    await expect(page.getByTestId("opportunities-no-results")).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

/* ── US2 · details ───────────────────────────────────────────────────────── */

test.describe("US2 details (S2)", () => {
  test("US2 QA 1: every published field is shown", async ({ page }) => {
    await mockOpportunity.ok(page, detailFixture({ id: 7, published_at: daysAgo(3) }));
    await page.goto(`${LIST}/7`);

    await expect(page.getByRole("heading", { level: 1, name: "Backend Intern (Python)" })).toBeVisible();
    await expect(page.getByText("Kaspi.kz · Posted 3 days ago")).toBeVisible();
    const description = page.getByTestId("opportunity-description");
    await expect(description.locator("p")).toHaveCount(2);
    await expect(description).toContainText("Join the Payments team.");
    await expect(description).toContainText("You will build and test internal APIs.");

    const panel = page.getByTestId("decision-panel");
    await expect(panel).toContainText("Internship");
    await expect(panel).toContainText("Backend");
    const skills = page.getByTestId("skill-breakdown");
    await expect(skills).toContainText("Required");
    await expect(skills).toContainText("Nice to have");
    for (const skill of ["Python", "SQL", "Git", "Docker"]) await expect(skills).toContainText(skill);
    // no count beside the skills (no "x of y", no bare number) without a match
    expect((await skills.textContent())!).not.toMatch(/\d/);
    await expect(panel).toContainText("Almaty · Hybrid");
    await expect(panel).toContainText("3 months");
    await expect(panel).toContainText("200 000 ₸ / month");
    await expect(page.getByTestId("opportunity-deadline")).toHaveText("Apply by 15 Dec 2099");

    const company = page.getByTestId("company-card");
    await expect(company).toContainText("Kaspi.kz");
    await expect(company).toContainText("Finance & banking · 1000+ employees · Almaty");
    await expect(company).toContainText("Payments, marketplace and banking in one app.");
    await expect(company.getByRole("link", { name: "kaspi.kz" })).toHaveAttribute("href", "https://kaspi.kz");
  });

  test("the last week before the deadline is called out with the date", async ({ page }) => {
    await mockOpportunity.ok(page, detailFixture({ apply_by: kzDay(3) }));
    await page.goto(`${LIST}/7`);
    await expect(page.getByTestId("opportunity-deadline")).toHaveText(/^Closes in 3 days · \d{1,2} \w{3}$/);
  });

  test("minimal: absent optional values leave no rows, sections or placeholders", async ({ page }) => {
    await mockOpportunity.ok(page, detailFixture({
      duration: null, salary: null, nice_skills: [],
      company: { name: "Acme", industry: null, size: null, city: null, website: null, description: null },
    }));
    await page.goto(`${LIST}/7`);
    await expect(page.getByRole("heading", { level: 1, name: "Backend Intern (Python)" })).toBeVisible();
    const panel = page.getByTestId("decision-panel");
    await expect(panel).not.toContainText("Nice to have");
    await expect(panel).not.toContainText("months");
    await expect(panel).not.toContainText("₸");
    const company = page.getByTestId("company-card");
    await expect(company).toContainText("Acme");
    await expect(company.getByRole("link")).toHaveCount(0);
    await expect(page.getByText(/not given|not specified|n\/a/i)).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test("US2 QA 3: not active or missing (404) shows only the message, with a way back to the list", async ({ page }) => {
    await mockOpportunity.unavailable(page);
    await mockOpportunities.serve(page, DATA);
    await page.goto(`${LIST}/99`);
    const message = page.getByTestId("opportunity-unavailable");
    await expect(message).toContainText("This opportunity is no longer available");
    await expect(message).toContainText("It may have closed, been paused or been removed by the company.");
    await expect(page.getByTestId("decision-panel")).toHaveCount(0);
    await expectNoA11yViolations(page);
    await message.getByRole("button", { name: "Browse opportunities" }).click();
    await expect(page).toHaveURL(/\/app\/opportunities$/);
    await expect(cards(page)).toHaveCount(5);
  });

  test("US2 QA 3: a non-numeric id shows the same message without any request", async ({ page }) => {
    const requests: string[] = [];
    await mockOpportunity.ok(page, detailFixture(), requests);
    for (const id of ["abc", "12abc", "1.5"]) {
      await page.goto(`${LIST}/${id}`);
      await expect(page.getByTestId("opportunity-unavailable")).toContainText("This opportunity is no longer available");
    }
    expect(requests).toEqual([]);
  });

  test("a failed load shows the error with the back link; Try again loads it", async ({ page }) => {
    await mockOpportunity.ok(page);
    await mockOpportunity.serverError(page, 1);
    await page.goto(`${LIST}/7`);
    await expect(page.getByText("Couldn't load this opportunity")).toBeVisible();
    await expect(page.getByRole("link", { name: "Opportunities" }).last()).toHaveAttribute("href", "/app/opportunities");
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Backend Intern (Python)" })).toBeVisible();
  });

  test("loading shows the skeleton of the page", async ({ page }) => {
    await page.route(/\/api\/student\/opportunities\/7$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(detailFixture()) });
    });
    await page.goto(`${LIST}/7`);
    await expect(page.locator("[aria-busy='true']").first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Backend Intern (Python)" })).toBeVisible();
  });

  test("US2 QA 2: Back restores the same search, filters, sort and page", async ({ page }) => {
    const items = manyOpportunities(23, (id) => ({ city: id % 2 ? "almaty" : "astana" }));
    const requests: string[] = [];
    await mockOpportunities.serve(page, items, { requests });
    await mockOpportunity.ok(page);
    const address = `${LIST}?q=opportunity&city=almaty&sort=closing&page=2`;
    await page.goto(address);
    await expect(cards(page)).toHaveCount(2);
    await expect(count(page)).toHaveText("12 opportunities");

    await page.getByRole("link", { name: "Opportunity 3" }).click();
    await expect(page).toHaveURL(/\/app\/opportunities\/3$/);
    await page.getByRole("main").getByRole("link", { name: "Opportunities" }).click();
    await expect(page).toHaveURL(new RegExp(`${address.replace(/[?]/g, "\\?")}$`));
    await expect(searchbox(page)).toHaveValue("opportunity");
    await expect(cards(page)).toHaveCount(2);
    await expect(count(page)).toHaveText("12 opportunities");
    await expect(page.getByRole("combobox", { name: /Sort by/ })).toContainText("Closing soon");
    expect(requests.at(-1)).toBe("q=opportunity&city=almaty&sort=closing&page=2");
  });

  test("the browser's Back from an opportunity also returns to the same list", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await mockOpportunity.ok(page);
    await page.goto(`${LIST}?type=internship`);
    await expect(cards(page)).toHaveCount(2);
    await page.getByRole("link", { name: "QA Intern" }).click();
    await expect(page).toHaveURL(/\/app\/opportunities\/4$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/app\/opportunities\?type=internship$/);
    await expect(cards(page)).toHaveCount(2);
  });

  test("opened directly (no list before it), Back goes to the plain list", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await mockOpportunity.ok(page);
    await page.goto(`${LIST}/7`);
    await page.getByRole("main").getByRole("link", { name: "Opportunities" }).click();
    await expect(page).toHaveURL(/\/app\/opportunities$/);
    await expect(cards(page)).toHaveCount(5);
  });

  test("a forged list address in router state is not followed", async ({ page }) => {
    await mockOpportunity.ok(page);
    await page.goto(`${LIST}/7`);
    await page.evaluate(() => {
      window.history.replaceState({ usr: { list: "x#//evil.example" }, key: "k", idx: 0 }, "");
    });
    await page.reload();
    await expect(page.getByRole("main").getByRole("link", { name: "Opportunities" })).toHaveAttribute("href", "/app/opportunities");
  });

  test("the company website opens safely in a new tab", async ({ page, context }) => {
    await context.route("https://kaspi.kz/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Kaspi</title>" }));
    await mockOpportunity.ok(page);
    await page.goto(`${LIST}/7`);
    const link = page.getByTestId("company-card").getByRole("link", { name: "kaspi.kz" });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
    const [popup] = await Promise.all([page.waitForEvent("popup"), link.click()]);
    expect(await popup.evaluate(() => window.opener)).toBeNull();
    await popup.close();
    await expect(page).toHaveURL(/\/app\/opportunities\/7$/);
  });

  test("Copy link copies the page address and confirms with a toast", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await mockOpportunity.ok(page);
    await page.goto(`${LIST}/7`);
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByTestId("toast").filter({ hasText: "Link copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
  });

  test("Copy link says so when the browser refuses", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) }, configurable: true });
    });
    await mockOpportunity.ok(page);
    await page.goto(`${LIST}/7`);
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByTestId("toast").filter({ hasText: "Couldn't copy the link" })).toBeVisible();
    await expect(page.getByTestId("toast").filter({ hasText: "Link copied" })).toHaveCount(0);
  });

  test("passes axe and does not scroll sideways at 390 px", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await mockOpportunity.ok(page);
    await page.goto(`${LIST}/7`);
    await expect(page.getByTestId("decision-panel")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });

  test("passes axe on the desktop page", async ({ page }) => {
    await mockOpportunity.ok(page);
    await page.goto(`${LIST}/7`);
    await expect(page.getByTestId("decision-panel")).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

/* ── US3 · search and filters ────────────────────────────────────────────── */

test.describe("US3 search and filters (S1)", () => {
  test("US3 QA 1: a keyword and a type show only what matches both, with their number", async ({ page }) => {
    const requests: string[] = [];
    await mockOpportunities.serve(page, DATA, { requests });
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);

    await searchbox(page).fill("python");
    await expect(cards(page)).toHaveCount(2);
    await expect(count(page)).toHaveText("2 opportunities");
    await page.getByRole("radio", { name: "Internships" }).click();
    await expect(cards(page)).toHaveCount(1);
    await expect(count(page)).toHaveText("1 opportunity");
    expect(await titles(page)).toEqual(["Backend Intern (Python)"]);
    await expect(page).toHaveURL(/\?q=python&type=internship$/);
    expect(requests.at(-1)).toBe("q=python&type=internship");

    // Vacancies = Full-time + Part-time; Research is its own type
    await searchbox(page).fill("");
    await page.getByRole("radio", { name: "Vacancies" }).click();
    await expect.poll(() => titles(page)).toEqual(["Frontend Developer", "Support Engineer"]);
    await page.getByRole("radio", { name: "Research" }).click();
    await expect.poll(() => titles(page)).toEqual(["Data Science Research Assistant"]);
  });

  test("a keyword finds a company or a skill, every word must match, case and extra spaces do not matter", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await page.goto(LIST);
    await searchbox(page).fill("  CHOCO  ");
    await expect(cards(page)).toHaveCount(1);
    await searchbox(page).fill("sql python");
    await expect.poll(() => titles(page)).toEqual(["Backend Intern (Python)"]);
  });

  test("US3 QA 2: Clear filters brings back the full list; sort stays", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await page.goto(`${LIST}?q=python&type=internship&sort=closing`);
    await expect(cards(page)).toHaveCount(1);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(cards(page)).toHaveCount(5);
    await expect(searchbox(page)).toHaveValue("");
    await expect(page.getByRole("radio", { name: "All" })).toBeChecked();
    await expect(page).toHaveURL(/\/app\/opportunities\?sort=closing$/);
    await expect(page.getByRole("button", { name: "Clear filters" })).toHaveCount(0);
  });

  test("US3 QA 3: nothing matches shows its own message with a way to clear, and keeps the search box", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await page.goto(LIST);
    await searchbox(page).fill("blockchain");
    const none = page.getByTestId("opportunities-no-results");
    await expect(none).toContainText("No opportunities match these filters");
    await expect(none).toContainText("Try removing a filter or searching for a skill instead of a title.");
    await expect(page.getByTestId("opportunities-none-yet")).toHaveCount(0);
    await expect(searchbox(page)).toHaveValue("blockchain");
    await expect(count(page)).toHaveText("0 opportunities");
    await none.getByRole("button", { name: "Clear filters" }).click();
    await expect(cards(page)).toHaveCount(5);
    await expect(searchbox(page)).toHaveValue("");
  });

  test("US3 QA 4: reload and a shared link show the same search; the browser's Back and Forward move through it", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);
    await page.getByRole("radio", { name: "Research" }).click();
    await expect(cards(page)).toHaveCount(1);
    await searchbox(page).fill("data");
    await expect(page).toHaveURL(/\?q=data&type=research$/);

    await page.reload();
    await expect(searchbox(page)).toHaveValue("data");
    await expect(page.getByRole("radio", { name: "Research" })).toBeChecked();
    await expect(cards(page)).toHaveCount(1);

    // typing replaced its history entry; the type change pushed one
    await page.goBack();
    await expect(page).toHaveURL(/\/app\/opportunities$/);
    await expect(page.getByRole("radio", { name: "All" })).toBeChecked();
    await expect(searchbox(page)).toHaveValue("");
    await expect(cards(page)).toHaveCount(5);
    await page.goForward();
    await expect(page).toHaveURL(/\?q=data&type=research$/);
    await expect(searchbox(page)).toHaveValue("data");
    await expect(cards(page)).toHaveCount(1);

    // a shared link: a fresh load of the address shows the same search
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);
    await page.goto(`${LIST}?q=data&type=research`);
    await expect(searchbox(page)).toHaveValue("data");
    await expect(page.getByRole("radio", { name: "Research" })).toBeChecked();
    await expect(cards(page)).toHaveCount(1);
  });

  test("format, city and field filters narrow the list; several values of one filter widen it", async ({ page }) => {
    const requests: string[] = [];
    await mockOpportunities.serve(page, DATA, { requests });
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);

    await pickFilter(page, "format", "Hybrid");
    await expect(cards(page)).toHaveCount(2);
    await pickFilter(page, "format", "Remote");
    await expect(cards(page)).toHaveCount(3);
    await expect(page).toHaveURL(/\?format=hybrid&format=remote$/);
    expect(requests.at(-1)).toBe("format=hybrid&format=remote");

    await pickFilter(page, "city", "Almaty");
    await expect.poll(() => titles(page)).toEqual(["Backend Intern (Python)", "Support Engineer"]);
    expect(requests.at(-1)).toBe("format=hybrid&format=remote&city=almaty");

    await pickFilter(page, "field", "Frontend");
    await expect(page.getByTestId("opportunities-no-results")).toBeVisible();
    await expect(page).toHaveURL(/format=hybrid&format=remote&city=almaty&field=frontend$/);
    await page.getByTestId("opportunities-no-results").getByRole("button", { name: "Clear filters" }).click();
    await expect(cards(page)).toHaveCount(5);
    await expect(page).toHaveURL(/\/app\/opportunities$/);
  });

  test("a filter combines with the keyword and the type", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await page.goto(`${LIST}?type=internship`);
    await expect(cards(page)).toHaveCount(2);
    await pickFilter(page, "city", "Astana");
    await expect(cards(page)).toHaveCount(1);
    expect(await titles(page)).toEqual(["QA Intern"]);
    await searchbox(page).fill("selenium");
    await expect(cards(page)).toHaveCount(1);
    await searchbox(page).fill("python");
    await expect(page.getByTestId("opportunities-no-results")).toBeVisible();
  });

  test("sort: Closing soon orders by the deadline and goes into the address", async ({ page }) => {
    const requests: string[] = [];
    await mockOpportunities.serve(page, DATA, { requests });
    await page.goto(LIST);
    await expect.poll(() => titles(page)).toEqual([
      "Backend Intern (Python)", "Frontend Developer", "Data Science Research Assistant", "QA Intern", "Support Engineer",
    ]);
    await page.getByRole("combobox", { name: /Sort by/ }).click();
    await page.getByRole("option", { name: "Closing soon" }).click();
    await expect(page).toHaveURL(/\?sort=closing$/);
    await expect.poll(() => titles(page)).toEqual([
      "Data Science Research Assistant", "Frontend Developer", "Support Engineer", "Backend Intern (Python)", "QA Intern",
    ]);
    expect(requests.at(-1)).toBe("sort=closing");
  });

  test("paging goes back to page 1 when the search or a filter changes; a page change keeps them", async ({ page }) => {
    const requests: string[] = [];
    await mockOpportunities.serve(page, manyOpportunities(23, (id) => ({ type: id % 2 ? "internship" : "full_time" })), { requests });
    await page.goto(LIST);
    await page.getByRole("button", { name: "Page 2" }).click();
    await expect(page).toHaveURL(/\?page=2$/);
    await expect(cards(page)).toHaveCount(10);

    await page.getByRole("radio", { name: "Internships" }).click();
    await expect(page).toHaveURL(/\?type=internship$/);
    await expect(count(page)).toHaveText("12 opportunities");
    await page.getByRole("button", { name: "Page 2" }).click();
    await expect(page).toHaveURL(/\?type=internship&page=2$/);
    await expect(cards(page)).toHaveCount(2);
    await searchbox(page).fill("opportunity 1");
    await expect(page).toHaveURL(/\?q=opportunity\+1&type=internship$/);
    expect(requests.at(-1)).toBe("q=opportunity+1&type=internship");
  });

  test("a page past the last shows the last page and the address says so", async ({ page }) => {
    await mockOpportunities.serve(page, manyOpportunities(23));
    await page.goto(`${LIST}?page=99`);
    await expect(cards(page)).toHaveCount(3);
    await expect(page).toHaveURL(/\?page=3$/);
    // the corrected address replaced the bad one: Back leaves the app's list instead of returning to page 99
    await page.goBack().catch(() => undefined);
    await expect(page).not.toHaveURL(/page=99/);
  });

  test("unknown values in the address are ignored and never sent", async ({ page }) => {
    const requests: string[] = [];
    await mockOpportunities.serve(page, DATA, { requests });
    await page.goto(`${LIST}?type=bogus&format=nope&city=mars&field=zzz&sort=weird&page=abc`);
    await expect(cards(page)).toHaveCount(5);
    await expect(page.getByRole("radio", { name: "All" })).toBeChecked();
    expect(requests).toEqual([""]);
  });

  test("typing 'data engineer' with a pause after the space keeps the space", async ({ page }) => {
    const requests: string[] = [];
    await mockOpportunities.serve(page, DATA, { requests });
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);
    const box = searchbox(page);
    await box.click();
    await box.pressSequentially("data ");
    await expect.poll(() => requests.some((r) => r === "q=data")).toBe(true);
    await page.waitForTimeout(500); // longer than the 250 ms pause
    await expect(box).toHaveValue("data ");
    await box.pressSequentially("engineer", { delay: 30 });
    await expect(box).toHaveValue("data engineer");
    await expect.poll(() => requests.at(-1)).toBe("q=data+engineer");
    await expect(box).toHaveValue("data engineer");
  });

  test("a keystroke still waiting for its pause does not undo a filter chosen meanwhile", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await page.goto(`${LIST}?type=internship`);
    await expect(cards(page)).toHaveCount(2);
    await searchbox(page).fill("python");
    await page.getByRole("radio", { name: "Research" }).click(); // before the 250 ms pause is over
    await expect(page).toHaveURL(/\?q=python&type=research$/);
    await expect.poll(() => titles(page)).toEqual(["Data Science Research Assistant"]);
  });

  test("Clear filters cancels a keystroke still waiting for its pause", async ({ page }) => {
    const requests: string[] = [];
    await mockOpportunities.serve(page, DATA, { requests });
    await page.goto(`${LIST}?type=internship`);
    await expect(cards(page)).toHaveCount(2);
    await searchbox(page).fill("python");
    await page.getByRole("button", { name: "Clear filters" }).click(); // before the 250 ms pause is over
    await page.waitForTimeout(700);
    await expect(searchbox(page)).toHaveValue("");
    await expect(page).toHaveURL(/\/app\/opportunities$/);
    await expect(cards(page)).toHaveCount(5);
    expect(requests.some((r) => r.includes("q=python"))).toBe(false);
  });

  test("browser Back during a pending keystroke is not overwritten by it", async ({ page }) => {
    const requests: string[] = [];
    await mockOpportunities.serve(page, DATA, { requests });
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);
    await page.getByRole("radio", { name: "Internships" }).click();
    await expect(page).toHaveURL(/\?type=internship$/);
    await searchbox(page).fill("python");
    await page.goBack(); // before the 250 ms pause is over
    await page.waitForTimeout(700);
    await expect(page).toHaveURL(/\/app\/opportunities$/);
    await expect(searchbox(page)).toHaveValue("");
    await expect(page.getByRole("radio", { name: "All" })).toBeChecked();
    expect(requests.some((r) => r.includes("q=python"))).toBe(false);
  });

  test("an absurdly large page number is capped so the server clamps it to the last page", async ({ page }) => {
    const requests: string[] = [];
    await mockOpportunities.serve(page, manyOpportunities(23), { requests });
    await page.goto(`${LIST}?page=99999999999999999999999`);
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByText("Couldn't load opportunities")).toHaveCount(0);
    await expect(page).toHaveURL(/\?page=3$/);
    expect(requests[0]).toBe("page=1000000");
  });

  test("the search field holds 120 characters at most", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await page.goto(LIST);
    await searchbox(page).fill("a".repeat(130));
    await expect(searchbox(page)).toHaveValue("a".repeat(120));
  });

  test("typing is sent after a short pause: one request for fast typing, not one per key", async ({ page }) => {
    const requests: string[] = [];
    await mockOpportunities.serve(page, DATA, { requests });
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);
    requests.length = 0;
    await searchbox(page).click();
    await searchbox(page).pressSequentially("python", { delay: 40 });
    await expect(cards(page)).toHaveCount(2);
    expect(requests).toEqual(["q=python"]);
  });

  test("Escape clears the search", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await page.goto(`${LIST}?q=python`);
    await expect(cards(page)).toHaveCount(2);
    await searchbox(page).focus();
    await page.keyboard.press("Escape");
    await expect(searchbox(page)).toHaveValue("");
    await expect(cards(page)).toHaveCount(5);
    await expect(page).toHaveURL(/\/app\/opportunities$/);
  });

  test("a slow old answer never replaces a newer one", async ({ page }) => {
    const requests: string[] = [];
    await mockOpportunities.serve(page, DATA, { requests, delay: (p) => (p.get("q") === "slow" ? 1500 : 0) });
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);
    await searchbox(page).fill("slow");
    await expect.poll(() => requests.includes("q=slow")).toBe(true);
    await searchbox(page).fill("python");
    await expect(cards(page)).toHaveCount(2);
    await expect(count(page)).toHaveText("2 opportunities");
    await page.waitForTimeout(1800); // the slow answer (no results) has arrived by now
    await expect(cards(page)).toHaveCount(2);
    await expect(count(page)).toHaveText("2 opportunities");
    await expect(page.getByTestId("opportunities-no-results")).toHaveCount(0);
  });

  test("while a new search loads, the old results stay and the count says Searching…", async ({ page }) => {
    await mockOpportunities.serve(page, DATA, { delay: (p) => (p.get("q") ? 1000 : 0) });
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);
    await searchbox(page).fill("python");
    await expect(count(page)).toHaveText("Searching…");
    await expect(cards(page)).toHaveCount(5);
    await expect(count(page)).toHaveText("2 opportunities");
    await expect(cards(page)).toHaveCount(2);
  });

  test("the result count is announced politely when it changes", async ({ page }) => {
    await mockOpportunities.serve(page, DATA);
    await page.goto(LIST);
    await expect(count(page)).toHaveAttribute("aria-live", "polite");
    await expect(count(page)).toHaveText("5 opportunities");
    await searchbox(page).fill("choco");
    await expect(count(page)).toHaveText("1 opportunity");
  });

  test("below 1024 px the filters live in a sheet with chips above the cards", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "the sheet is the below-lg layout");
    await mockOpportunities.serve(page, DATA);
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(5);
    await expect(page.getByRole("checkbox", { name: "Remote" })).toHaveCount(0);
    await page.getByRole("button", { name: "Filters" }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await expect(sheet).toContainText("None selected");
    await sheet.getByRole("checkbox", { name: "Remote", exact: true }).click();
    await expect(sheet).toContainText("1 selected");
    await expect(sheet.getByRole("button", { name: "Show 1 opportunity" })).toBeVisible();
    await expectNoA11yViolations(page);
    await sheet.getByRole("button", { name: /^Show / }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("button", { name: "Filters (1)" })).toBeVisible();
    await expect(cards(page)).toHaveCount(1);
    // the chip above the cards removes the value again
    await page.getByRole("main").getByRole("button", { name: /Remove Remote/ }).click();
    await expect(cards(page)).toHaveCount(5);
    await expect(page.getByRole("button", { name: "Filters", exact: true })).toBeVisible();
  });

  test("on desktop the filters are in the side menu and there is no Filters button", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the side menu is the lg layout");
    await mockOpportunities.serve(page, DATA);
    await page.goto(LIST);
    await expect(page.getByRole("checkbox", { name: "Remote", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Filters/ })).toHaveCount(0);
  });

  test("the type control fits 390 px and filtering does not scroll sideways", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await mockOpportunities.serve(page, DATA);
    await page.goto(`${LIST}?type=research&city=almaty`);
    await expect(page.getByRole("radio", { name: "Research" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });
});

/* ── US4 · Research in the 002 and 003 screens (S3) ──────────────────────── */

test.describe("US4 research type (S3)", () => {
  const choose = async (page: Page, field: string, option: string) => {
    await page.getByRole("combobox", { name: new RegExp(`^${field}\\b`) }).click();
    await page.getByRole("option", { name: new RegExp(`^${option}(\\s|$)`) }).click();
  };
  const addSkill = async (page: Page, group: "Required" | "Nice to have", name: string) => {
    const input = page.getByRole("combobox", { name: new RegExp(`^${group}\\b`) });
    await input.fill(name);
    await input.press("Enter");
  };
  const research = (overrides = {}) =>
    vacancyFixture({ id: 17, title: "Research on payments fraud", type: "research", status: "open", version: 3, ...overrides });

  test.describe("employer", () => {
    test.beforeEach(async ({ page }) => {
      await signedInAs(page, "employer");
      await mockCompanyProfile.ok(page);
      await mockCatalog.ok(page);
      await mockSkills.ok(page);
    });

    test("US4 QA 1: the wizard offers Research, sends type research, and the list shows it as Research", async ({ page }) => {
      const sink: Sink = [];
      await mockVacancyCreate.ok(page, sink);
      await mockVacancyList.ok(page, [research({ id: 99 })]);
      await page.goto("/company/vacancies/new");

      await page.getByLabel("Title").fill("Research on payments fraud");
      await page.getByRole("combobox", { name: /^Type\b/ }).click();
      await expect(page.getByRole("option")).toHaveText([/Internship/, /Full-time/, /Part-time/, /Research/]);
      await page.getByRole("option", { name: /^Research$/ }).click();
      await choose(page, "Field", "Backend");
      await choose(page, "City", "Almaty");
      await page.getByRole("radio", { name: "Hybrid" }).check();
      await page.getByRole("button", { name: "Continue" }).click();
      await addSkill(page, "Required", "Python");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByLabel("Description").fill("Study fraud patterns in payment data.");
      await page.getByRole("button", { name: /Apply by/ }).click();
      const calendar = page.getByRole("dialog", { name: "Choose a date" });
      await calendar.getByRole("button", { name: "Next month" }).click();
      await calendar.getByRole("button", { name: "Next month" }).click();
      await calendar.getByRole("gridcell", { name: /^15 / }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByTestId("vacancy-preview")).toContainText("Research");
      await expectNoA11yViolations(page);
      await page.getByRole("button", { name: "Publish vacancy" }).click();

      await expect(page).toHaveURL(/\/company\/vacancies$/);
      expect(sink).toHaveLength(1);
      expect(sink[0]).toMatchObject({ type: "research", publish: true });
      await expect(page.getByRole("main")).toContainText("Research on payments fraud");
      await expect(page.getByRole("main")).toContainText("Research");
      await expectNoA11yViolations(page);
    });

    test("the vacancy page shows the type as Research", async ({ page }) => {
      await mockVacancyGet.ok(page, research());
      await page.goto("/company/vacancies/17");
      await expect(page.getByRole("heading", { level: 1, name: "Research on payments fraud" })).toBeVisible();
      await expect(page.getByRole("main").getByText("Research", { exact: true }).first()).toBeVisible();
      await expectNoA11yViolations(page);
    });

    test("US4 QA 2: editing a vacancy to Research and back to another type is saved", async ({ page }) => {
      const draft = vacancyFixture({ id: 17, status: "draft", version: 2, published_at: null, apply_by: "2099-11-30", closes_at: null });
      const puts: Sink = [];
      await mockVacancyGet.ok(page, draft);
      await mockVacancyUpdate.ok(page, draft, puts);
      await page.goto("/company/vacancies/17/edit");
      await choose(page, "Type", "Research");
      await page.getByRole("button", { name: "Save draft" }).click();
      await expect(page.getByText("Draft saved")).toBeVisible();
      expect(puts[0]).toMatchObject({ type: "research", version: 2 });
      await choose(page, "Type", "Part-time");
      await page.getByRole("button", { name: "Save draft" }).click();
      await expect.poll(() => puts.length).toBe(2);
      expect(puts[1]).toMatchObject({ type: "part_time" });
    });

    test("US4 QA 3: publishing an incomplete Research vacancy is refused with the fields to fix", async ({ page }) => {
      const draft = research({ status: "draft", version: 2, published_at: null, format: null, description: null });
      await mockVacancyGet.ok(page, draft);
      await mockVacancyUpdate.ok(page, draft);
      await mockVacancyStatus.incomplete(page, ["format", "description"]);
      await page.goto("/company/vacancies/17/edit");
      await page.getByRole("button", { name: "Publish", exact: true }).click();
      await expect(page.getByRole("alert").filter({ hasText: "Fix 2 fields to publish" })).toBeVisible();
      await expect(page.getByText("Choose a format")).toBeVisible();
      await expect(page.getByText("Add a description")).toBeVisible();
    });
  });

  test("US4 QA 1: students find it under Research, listed and opened as Research", async ({ page }) => {
    const items = [...DATA, opportunityFixture({ id: 8, title: "Research on payments fraud", type: "research", published_at: "2026-11-24T09:00:00Z" })];
    const requests: string[] = [];
    await mockOpportunities.serve(page, items, { requests });
    await mockOpportunity.ok(page, detailFixture({ id: 8, title: "Research on payments fraud", type: "research" }));
    await page.goto(LIST);
    await page.getByRole("radio", { name: "Research" }).click();
    await expect(cards(page)).toHaveCount(2);
    expect(requests.at(-1)).toBe("type=research");
    const card = cards(page).filter({ hasText: "Research on payments fraud" });
    await expect(card.getByText("Research", { exact: true })).toBeVisible();
    await card.getByRole("link", { name: "Research on payments fraud" }).click();
    await expect(page.getByTestId("decision-panel")).toContainText("Research");
    await expectNoA11yViolations(page);
  });

  test("US4 QA 4: a student picks Research in onboarding; My profile shows it", async ({ page }) => {
    const { posted } = await newStudent(page);
    await mockProfileCatalog.ok(page);
    await mockOpportunities.empty(page);
    await page.goto("/onboarding");
    await page.getByLabel("Full name").fill("Maya Akhmetova");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("combobox", { name: "University" }).fill("Satbayev");
    await page.getByRole("option", { name: /^Satbayev University/ }).first().click();
    await page.getByRole("radio", { name: "Bachelor's" }).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("combobox", { name: "Major" }).fill("Computer Sci");
    await page.getByRole("option", { name: /^Computer Science$/ }).first().click();
    await page.getByRole("radio", { name: "3rd year" }).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // four position types: Internship, Full-time, Part-time, Research
    for (const name of ["Internship", "Full-time", "Part-time", "Research"]) await expect(page.getByRole("checkbox", { name })).toBeVisible();
    await page.getByRole("checkbox", { name: "Internship" }).check();
    await page.getByRole("checkbox", { name: "Research" }).check();
    await page.getByRole("radio", { name: "I'm not sure yet" }).check();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page).toHaveURL(/\/app\/profile$/);
    expect((posted[0] as { position_types: string[] }).position_types).toEqual(["internship", "research"]);
    await expect(page.getByTestId("profile-looking-for")).toContainText("Internship or research");
  });

  test("US4 QA 4: a student adds Research in profile edit; My profile reads 'a, b or c'", async ({ page }) => {
    const FULL = studentProfileFixture({ position_types: ["internship", "part_time"], version: 2 });
    await mockProfileCatalog.ok(page);
    const server = await studentServer(page, FULL);
    await page.goto("/app/profile/edit");
    await expect(page.getByTestId("student-profile-form")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Research" })).not.toBeChecked();
    await page.getByRole("checkbox", { name: "Research" }).check();
    await expectNoA11yViolations(page);
    await page.getByTestId("unsaved-bar").getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/profile$/);
    expect((server.puts[0] as { position_types: string[] }).position_types).toEqual(["internship", "part_time", "research"]);
    await expect(page.getByTestId("profile-looking-for")).toContainText("Internship, part-time or research");
    await expectNoA11yViolations(page);
  });

  test("My profile with a stored Research position type shows it", async ({ page }) => {
    await mockProfileCatalog.ok(page);
    await mockStudentProfile.ok(page, studentProfileFixture({ position_types: ["research"] }));
    await page.goto("/app/profile");
    await expect(page.getByTestId("profile-looking-for")).toContainText("Research");
  });
});
