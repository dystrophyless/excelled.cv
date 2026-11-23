import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { mockSignOut, signedInAs, signedOut } from "./support/auth-api";
import {
  companyServer, mockCompanyCreate, mockProfileCatalog, mockStudentCreate, mockStudentProfile, newEmployer, newStudent,
  studentProfileFixture, studentServer, type Sink,
} from "./support/profiles-api";
import { mockCatalog, mockCompanyProfile, mockSkills } from "./support/vacancies-api";

/*
 * Feature 003-profiles — US1 block: S1 (student onboarding, 5 steps), S2 (My profile) and the account menu.
 * The API is mocked with page.route (support/profiles-api.ts); contract: specs/003-profiles/contracts/profiles-api.md.
 */

const EMAIL = "maya@sdu.edu.kz";

async function expectNoHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
}

/* ── onboarding helpers ──────────────────────────────────────────────────── */

const step = (page: Page) => page.getByTestId("student-onboarding-step");
const h1 = (page: Page) => page.getByRole("heading", { level: 1 });
const cont = (page: Page) => page.getByRole("button", { name: "Continue", exact: true });
const save = (page: Page) => page.getByRole("button", { name: "Save", exact: true });

async function expectStep(page: Page, label: string) {
  await expect(step(page)).toHaveAttribute("data-step", label);
}

/** A new student (no profile) with the catalog, on /onboarding (or `path`, which the guard sends there). */
async function startOnboarding(page: Page, path = "/onboarding") {
  const api = await newStudent(page, { email: EMAIL });
  await mockProfileCatalog.ok(page);
  await page.goto(path);
  await expectStep(page, "Name");
  return api;
}

async function pickOption(page: Page, combobox: string, typed: string, option: RegExp) {
  await page.getByRole("combobox", { name: combobox }).fill(typed);
  await page.getByRole("option", { name: option }).first().click();
}

async function fillName(page: Page) {
  await page.getByLabel("Full name").fill("Maya Akhmetova");
  await cont(page).click();
  await expectStep(page, "University");
}

async function fillUniversity(page: Page) {
  await pickOption(page, "University", "Satbayev", /^Satbayev University/);
  await page.getByRole("radio", { name: "Bachelor's" }).check();
  await cont(page).click();
  await expectStep(page, "Major");
}

async function fillMajor(page: Page) {
  await pickOption(page, "Major", "Computer Sci", /^Computer Science$/);
  await page.getByRole("radio", { name: "3rd year" }).check();
  await cont(page).click();
  await expectStep(page, "Looking for");
}

async function fillLookingFor(page: Page) {
  await page.getByRole("checkbox", { name: "Internship" }).check();
  await page.getByRole("radio", { name: "I know which field" }).check();
  await page.getByRole("checkbox", { name: "Backend" }).check();
  await page.getByRole("checkbox", { name: "Data Engineering" }).check();
  await cont(page).click();
  await expectStep(page, "About");
}

/* ── US1 ─────────────────────────────────────────────────────────────────── */

test.describe("US1 student profile", () => {
  test("US5QATest 1: all 5 steps → Save → My profile shows the data (axe on every step)", async ({ page }) => {
    const { posted } = await startOnboarding(page);
    await expect(h1(page)).toHaveText("Welcome to Novio. What's your name?");
    await expectNoA11yViolations(page);
    await fillName(page);
    // a step change moves focus to the new h1
    await expect(h1(page)).toBeFocused();
    await expect(page.getByText("Nice to meet you, Maya.", { exact: false })).toBeVisible();
    await expectNoA11yViolations(page);
    await fillUniversity(page);
    await expectNoA11yViolations(page);
    await fillMajor(page);
    await expectNoA11yViolations(page);
    await page.getByRole("checkbox", { name: "Internship" }).check();
    await page.getByRole("radio", { name: "I know which field" }).check();
    await expect(page.getByTestId("field-choices")).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("checkbox", { name: "Backend" }).check();
    await page.getByRole("checkbox", { name: "Data Engineering" }).check();
    await cont(page).click();
    await expectStep(page, "About");
    await page.getByRole("radio", { name: "Almaty" }).check();
    await expectNoA11yViolations(page);
    await save(page).click();

    await expect(page).toHaveURL(/\/app\/profile$/);
    await expect(page.getByRole("heading", { level: 1, name: "My profile" })).toBeVisible();
    await expect(page.getByTestId("toast").filter({ hasText: "Profile saved" })).toBeVisible();
    const identity = page.getByTestId("profile-identity");
    await expect(identity).toContainText("Maya Akhmetova");
    await expect(identity).toContainText("Computer Science · Bachelor's, 3rd year");
    await expect(identity).toContainText("Almaty");
    await expect(page.getByTestId("profile-looking-for")).toContainText("Backend, Data Engineering");
    await expect(page.getByTestId("profile-looking-for")).toContainText("Internship");
    await expect(page.getByTestId("profile-education")).toContainText("Satbayev University");
    await expectNoA11yViolations(page);

    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({
      full_name: "Maya Akhmetova", university: "Satbayev University", degree: "bachelor", major: "Computer Science",
      study_year: 3, graduated: false, gpa: null, looking_for_fields: ["backend", "data_engineering"],
      position_types: ["internship"], city: "almaty", about: null, projects: [], languages: [],
    });
  });

  test("US5QATest 2: Continue with empty or invalid answers shows the field messages; nothing is POSTed", async ({ page }) => {
    const { posted } = await startOnboarding(page);

    // step 1: empty, then one character
    await cont(page).click();
    await expect(page.getByText("Enter your full name")).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeFocused();
    await page.getByLabel("Full name").fill("A");
    await cont(page).click();
    await expect(page.getByText("Enter at least 2 characters")).toBeVisible();
    await expectStep(page, "Name");
    await page.getByLabel("Full name").fill("Maya Akhmetova");
    await cont(page).click();
    await expectStep(page, "University");

    // step 2: nothing → both messages + summary; then a 1-character university
    await cont(page).click();
    await expect(page.getByText("Choose or enter your university")).toBeVisible();
    await expect(page.getByText("Choose your degree")).toBeVisible();
    await expect(page.getByTestId("error-summary")).toContainText("Fix 2 fields to continue");
    await expect(page.getByTestId("error-summary")).toContainText("University · Degree");
    await expect(page.getByRole("combobox", { name: "University" })).toBeFocused();
    await expectNoA11yViolations(page);
    await page.getByRole("combobox", { name: "University" }).fill("A");
    await page.getByRole("radio", { name: "Bachelor's" }).check();
    await cont(page).click();
    await expect(page.getByText("Enter at least 2 characters")).toBeVisible();
    await expectStep(page, "University");
    await pickOption(page, "University", "Satbayev", /^Satbayev University/);
    await cont(page).click();
    await expectStep(page, "Major");

    // step 3: a major but no year of study
    await pickOption(page, "Major", "Computer Sci", /^Computer Science$/);
    await cont(page).click();
    await expect(page.getByText("Choose your year of study")).toBeVisible();
    await expectStep(page, "Major");
    await page.getByRole("radio", { name: "3rd year" }).check();
    await cont(page).click();
    await expectStep(page, "Looking for");

    // step 4: nothing → both messages, focus on the first answer; "I know" without a field → the list's message
    await cont(page).click();
    await expect(page.getByText("Choose at least one position type")).toBeVisible();
    await expect(page.getByText("Choose one: I know which field, or I'm not sure yet")).toBeVisible();
    await expect(page.getByTestId("error-summary")).toContainText("Fix 2 fields to continue");
    await expect(page.getByRole("checkbox", { name: "Internship" })).toBeFocused();
    await page.getByRole("checkbox", { name: "Internship" }).check();
    await page.getByRole("radio", { name: "I know which field" }).check();
    await cont(page).click();
    await expect(page.getByText("Pick at least one field, or choose I'm not sure yet")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Backend" })).toBeFocused();
    await expectStep(page, "Looking for");
    await expectNoA11yViolations(page);

    // Back never validates and keeps the answers
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expectStep(page, "Major");
    await expect(page.getByRole("radio", { name: "3rd year" })).toBeChecked();

    expect(posted).toHaveLength(0);
  });

  test("a student without a profile opening /app/vacancies goes to /onboarding?next=… and back after Save", async ({ page }) => {
    const { posted } = await startOnboarding(page, "/app/vacancies");
    await expect(page).toHaveURL(/\/onboarding\?next=%2Fapp%2Fvacancies$/);
    await fillName(page);
    await fillUniversity(page);
    await fillMajor(page);
    await fillLookingFor(page);
    await save(page).click();
    await expect(page).toHaveURL(/\/app\/vacancies$/);
    expect(posted).toHaveLength(1);
  });

  test("/onboarding with a profile goes to /app/profile", async ({ page }) => {
    await signedInAs(page, "student");
    await mockStudentProfile.ok(page);
    await mockProfileCatalog.ok(page);
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/app\/profile$/);
    await expect(page.getByRole("heading", { level: 1, name: "My profile" })).toBeVisible();
  });

  test("a refused Continue focuses the empty University without opening its list; Continue stays in view at 390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startOnboarding(page);
    await fillName(page);
    await cont(page).click();
    await expect(page.getByText("Choose or enter your university")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "University" })).toBeFocused();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(cont(page)).toBeInViewport();
    // a press on the field (or typing) still opens it
    await page.getByRole("combobox", { name: "University" }).click();
    await expect(page.getByRole("listbox")).toBeVisible();
  });

  test("an employer opening /onboarding goes to the company pages", async ({ page }) => {
    await signedInAs(page, "employer");
    await mockCompanyProfile.ok(page);
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/company(\/vacancies)?$/);
  });

  test("Tab picks the highlighted university after typing", async ({ page }) => {
    await startOnboarding(page);
    await fillName(page);
    const university = page.getByRole("combobox", { name: "University" });
    await university.pressSequentially("Kazakh-Brit");
    await expect(page.getByRole("option", { name: /^Kazakh-British Technical University/ })).toBeVisible();
    await university.press("Tab");
    await expect(university).toHaveValue("Kazakh-British Technical University");
    // a listed university shows its city in the hint
    await expect(step(page)).toContainText("Almaty");
  });

  test("\"I'm not sure yet\" hides the fields, keeps them in memory and sends looking_for_fields: []", async ({ page }) => {
    const { posted } = await startOnboarding(page);
    await fillName(page);
    await fillUniversity(page);
    await fillMajor(page);
    await page.getByRole("checkbox", { name: "Internship" }).check();
    await page.getByRole("radio", { name: "I know which field" }).check();
    await page.getByRole("checkbox", { name: "Backend" }).check();
    await page.getByRole("radio", { name: "I'm not sure yet" }).check();
    await expect(page.getByTestId("field-choices")).toHaveCount(0);
    // switching back shows the ticked field again
    await page.getByRole("radio", { name: "I know which field" }).check();
    await expect(page.getByRole("checkbox", { name: "Backend" })).toBeChecked();
    await page.getByRole("radio", { name: "I'm not sure yet" }).check();
    await cont(page).click();
    await expectStep(page, "About");
    await save(page).click();
    await expect(page).toHaveURL(/\/app\/profile$/);
    await expect(page.getByTestId("profile-looking-for")).toContainText("Open to any field");
    await expect(page.getByTestId("profile-looking-for")).toContainText("Still exploring · Internship");
    expect(posted[0]).toMatchObject({ looking_for_fields: [], position_types: ["internship"], city: null });
  });

  test("save error: the alert shows, the answers stay, Save again works", async ({ page }) => {
    const { posted } = await startOnboarding(page);
    const failed: Sink = [];
    await mockStudentCreate.serverError(page, failed, 1);
    await fillName(page);
    await fillUniversity(page);
    await fillMajor(page);
    await fillLookingFor(page);
    await page.getByRole("radio", { name: "Almaty" }).check();
    await save(page).click();
    await expect(page.getByTestId("save-error")).toContainText("Couldn't save your profile");
    await expect(page.getByTestId("save-error")).toContainText("Nothing you typed is lost.");
    await expectStep(page, "About");
    await expect(page.getByRole("radio", { name: "Almaty" })).toBeChecked();
    await expectNoA11yViolations(page);
    expect(failed).toHaveLength(1);
    await save(page).click();
    await expect(page).toHaveURL(/\/app\/profile$/);
    expect(posted).toHaveLength(1);
  });

  test("a 422 from the API jumps back to the step of the refused field", async ({ page }) => {
    await startOnboarding(page);
    await mockStudentCreate.validation(page, ["body", "study_year"]);
    await fillName(page);
    await fillUniversity(page);
    await fillMajor(page);
    await fillLookingFor(page);
    await save(page).click();
    await expectStep(page, "Major");
    await expect(page.getByText("Choose a year from 1 to 4, or Graduated")).toBeVisible();
  });

  test("409 profile_exists goes to My profile", async ({ page }) => {
    await startOnboarding(page);
    await mockStudentCreate.exists(page);
    await mockStudentProfile.ok(page);
    // the profile was made in another tab: from now on the server says so
    await signedInAs(page, "student", EMAIL);
    await fillName(page);
    await fillUniversity(page);
    await fillMajor(page);
    await fillLookingFor(page);
    await save(page).click();
    await expect(page).toHaveURL(/\/app\/profile$/);
  });

  test("catalog error: the form offers Try again, which loads it", async ({ page }) => {
    await newStudent(page);
    await mockProfileCatalog.ok(page);
    await mockProfileCatalog.network(page, 2); // the query retries once by itself
    await page.goto("/onboarding");
    await expect(page.getByText("Couldn't load the form")).toBeVisible();
    await expect(cont(page)).toBeDisabled();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByLabel("Full name")).toBeVisible();
  });

  test("Log out from onboarding goes to /sign-in", async ({ page }) => {
    await startOnboarding(page);
    await mockSignOut.ok(page);
    await signedOut(page);
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("390 px: no step scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startOnboarding(page);
    await expectNoHorizontalScroll(page);
    await fillName(page);
    await expectNoHorizontalScroll(page);
    await fillUniversity(page);
    await expectNoHorizontalScroll(page);
    await fillMajor(page);
    await page.getByRole("radio", { name: "I know which field" }).check();
    await expectNoHorizontalScroll(page);
    await page.getByRole("checkbox", { name: "Internship" }).check();
    await page.getByRole("checkbox", { name: "Backend" }).check();
    await cont(page).click();
    await expectStep(page, "About");
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await save(page).click();
    await expect(page).toHaveURL(/\/app\/profile$/);
    await expect(page.getByTestId("student-profile")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

/* ── S2 My profile ───────────────────────────────────────────────────────── */

const FULL = studentProfileFixture({
  university: "Suleyman Demirel University", gpa: "3.45", looking_for_fields: ["backend", "data_engineering"],
  position_types: ["internship", "part_time"], city: "almaty", about: "Third-year CS student who likes building APIs.",
  contacts: { phone: "+7 701 123 45 67", whatsapp: null, telegram: "maya_akh", linkedin_url: null, github_url: "https://github.com/maya-akh", website_url: null },
  projects: [{ title: "Campus timetable bot", description: "Telegram bot for timetables.", url: "https://github.com/maya-akh/bot" }],
  languages: [{ language: "Kazakh", level: "native" }, { language: "English", level: "intermediate" }],
  version: 2, updated_at: "2026-11-20T08:15:00Z",
});

test.describe("S2 My profile", () => {
  test.beforeEach(async ({ page }) => {
    await signedInAs(page, "student", EMAIL);
    await mockProfileCatalog.ok(page);
  });

  test("default: every section, Looking for above About, no completeness block", async ({ page }) => {
    await mockStudentProfile.ok(page, FULL);
    await page.goto("/app/profile");
    const card = page.getByTestId("student-profile");
    await expect(card).toContainText("Computer Science · Bachelor's, 3rd year");
    await expect(page.getByTestId("profile-gpa")).toHaveText("GPA 3.45");
    await expect(page.getByTestId("profile-looking-for")).toContainText("Internship or part-time");
    await expect(page.getByTestId("profile-about")).toBeVisible();
    await expect(page.getByTestId("profile-projects")).toContainText("Campus timetable bot");
    await expect(page.getByTestId("profile-languages")).toContainText("Intermediate");
    await expect(page.getByRole("link", { name: /GitHub/ })).toHaveAttribute("href", "https://github.com/maya-akh");
    await expect(page.getByTestId("contact-telegram")).toHaveAttribute("href", "https://t.me/maya_akh");
    await expect(page.getByTestId("profile-completeness")).toHaveCount(0);
    await expect(page.getByTestId("owner-panel")).toContainText("Updated 20 Nov 2026");
    // round 16: Looking for sits above About
    const lookingForY = (await page.getByTestId("profile-looking-for").boundingBox())!.y;
    const aboutY = (await page.getByTestId("profile-about").boundingBox())!.y;
    expect(lookingForY).toBeLessThan(aboutY);
    await expectNoA11yViolations(page);
  });

  test("minimal: About prompt and Add buttons lead to the edit sections", async ({ page }) => {
    await mockStudentProfile.ok(page, studentProfileFixture({ looking_for_fields: [] }));
    await page.goto("/app/profile");
    await expect(page.getByTestId("profile-looking-for")).toContainText("Open to any field");
    await expect(page.getByTestId("profile-about-empty")).toBeVisible();
    await expect(page.getByTestId("profile-completeness")).toContainText("0 of 6 added");
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Add city" }).click();
    await expect(page).toHaveURL(/\/app\/profile\/edit#city$/);
    await page.goBack();
    await page.getByRole("button", { name: "Write about yourself" }).click();
    await expect(page).toHaveURL(/\/app\/profile\/edit#about$/);
  });

  test("Edit profile opens the edit page", async ({ page }) => {
    await mockStudentProfile.ok(page);
    await page.goto("/app/profile");
    await page.getByRole("button", { name: "Edit profile" }).click();
    await expect(page).toHaveURL(/\/app\/profile\/edit$/);
  });

  test("loading shows the skeleton with Edit disabled", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((r) => { release = r; });
    await page.route("**/api/student/profile", async (r) => {
      await held;
      await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(studentProfileFixture()) });
    });
    await page.goto("/app/profile");
    await expect(page.getByTestId("student-profile")).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("button", { name: "Edit profile" })).toBeDisabled();
    await expectNoA11yViolations(page);
    release();
    await expect(page.getByTestId("profile-identity")).toContainText("Maya Akhmetova");
  });

  test("error: Try again reloads the profile", async ({ page }) => {
    await mockStudentProfile.ok(page);
    await mockStudentProfile.serverError(page, 2); // the query retries once by itself
    await page.goto("/app/profile");
    await expect(page.getByText("Couldn't load your profile")).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("profile-identity")).toContainText("Maya Akhmetova");
  });

  test("390 px: the profile does not scroll sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockStudentProfile.ok(page, FULL);
    await page.goto("/app/profile");
    await expect(page.getByTestId("profile-contacts")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });
});

/* ── US2 company profile ─────────────────────────────────────────────────── */

const companyStep = (page: Page) => page.getByTestId("company-onboarding-step");
async function expectCompanyStep(page: Page, label: string) {
  await expect(companyStep(page)).toHaveAttribute("data-step", label);
}

/** A new employer (no company profile) with the catalog, on `path` (the guard sends every company page to the step). */
async function startCompany(page: Page, path = "/company/onboarding") {
  const api = await newEmployer(page);
  await mockProfileCatalog.ok(page);
  await mockSkills.ok(page);
  await page.goto(path);
  await expectCompanyStep(page, "Name");
  return api;
}

/** Name · Industry · Size, then optional Details (website) → About. */
async function fillCompany(page: Page, { website = "kaspi.kz" } = {}) {
  await page.getByLabel("Company name").fill("Kaspi.kz");
  await cont(page).click();
  await expectCompanyStep(page, "Industry");
  await page.getByRole("radio", { name: "Finance & banking" }).check();
  await cont(page).click();
  await expectCompanyStep(page, "Size");
  await page.getByRole("radio", { name: "1000+ employees" }).check();
  await cont(page).click();
  await expectCompanyStep(page, "Details");
  await page.getByLabel(/Website/).fill(website);
  await page.getByTestId("city-choices").getByRole("radio", { name: "Almaty" }).check();
  await cont(page).click();
  await expectCompanyStep(page, "About");
}

test.describe("US2 company profile", () => {
  test("US6QATest 1: the wizard → Save → vacancies list, the company name in the account menu (axe on every step)", async ({ page, isMobile }) => {
    const { posted } = await startCompany(page);
    await expect(h1(page)).toHaveText("Welcome to Novio. What's your company called?");
    await expectNoA11yViolations(page);
    await page.getByLabel("Company name").fill("Kaspi.kz");
    await cont(page).click();
    await expectCompanyStep(page, "Industry");
    await expect(h1(page)).toBeFocused();
    await expect(page.getByText("Thanks, Kaspi.kz. Pick the closest one.")).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("radio", { name: "Finance & banking" }).check();
    await cont(page).click();
    await expectCompanyStep(page, "Size");
    await expectNoA11yViolations(page);
    await page.getByRole("radio", { name: "1000+ employees" }).check();
    await cont(page).click();
    await expectCompanyStep(page, "Details");
    await expectNoA11yViolations(page);
    await page.getByLabel(/Website/).fill("kaspi.kz");
    await page.getByTestId("city-choices").getByRole("radio", { name: "Almaty" }).check();
    await cont(page).click();
    await expectCompanyStep(page, "About");
    await page.getByTestId("description-starters").getByRole("button").first().click();
    await expect(page.getByLabel(/Description/)).toHaveValue(/^We build /);
    await expectNoA11yViolations(page);
    await save(page).click();

    await expect(page).toHaveURL(/\/company\/vacancies$/);
    await expect(page.getByTestId("toast").filter({ hasText: "Company profile saved" })).toBeVisible();
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ name: "Kaspi.kz", industry: "finance", size: "1000_plus", website: "kaspi.kz", city: "almaty" });
    expect(String(posted[0].description)).toMatch(/^We build/);
    if (!isMobile) {
      await page.getByTestId("account-menu").click();
      await expect(page.locator(".ui-pm__name")).toHaveText("Kaspi.kz");
    }
    // the completed company profile can be viewed (S5)
    await page.goto("/company/profile");
    await expect(page.getByLabel("Company name")).toHaveValue("Kaspi.kz");
    await expect(page.getByRole("combobox", { name: /^Industry/ })).toContainText("Finance & banking");
    await expect(page.getByRole("combobox", { name: /^Company size/ })).toContainText("1000+ employees");
    await expect(page.getByLabel(/Website/)).toHaveValue("https://kaspi.kz");
    await expect(page.getByLabel(/Description/)).toHaveValue(/^We build/);
  });

  test("US6QATest 2: empty required answers and a bad website are refused on their step; nothing is POSTed", async ({ page }) => {
    const { posted } = await startCompany(page);
    await cont(page).click();
    await expect(page.getByText("Enter the company name")).toBeVisible();
    await expect(page.getByLabel("Company name")).toBeFocused();
    await page.getByLabel("Company name").fill("K");
    await cont(page).click();
    await expect(page.getByText("Enter at least 2 characters")).toBeVisible();
    await page.getByLabel("Company name").fill("Kaspi.kz");
    await cont(page).click();
    await expectCompanyStep(page, "Industry");
    await cont(page).click();
    await expect(page.getByText("Choose an industry")).toBeVisible();
    await expect(page.getByRole("radio", { name: "IT & software" })).toBeFocused();
    await expectNoA11yViolations(page);
    await page.getByRole("radio", { name: "Finance & banking" }).check();
    await cont(page).click();
    await cont(page).click();
    await expect(page.getByText("Choose the company size")).toBeVisible();
    await expectCompanyStep(page, "Size");
    await page.getByRole("radio", { name: "1000+ employees" }).check();
    await cont(page).click();
    await page.getByLabel(/Website/).fill("kaspi kz");
    await cont(page).click();
    await expect(page.getByText("Enter a website like kaspi.kz or https://kaspi.kz")).toBeVisible();
    await expect(page.getByLabel(/Website/)).toBeFocused();
    await expectCompanyStep(page, "Details");
    await expectNoA11yViolations(page);
    expect(posted).toHaveLength(0);
  });

  test("US6QATest 3: an employer without a profile opening /company/vacancies/new is sent to the company step and back; the preview shows the name", async ({ page }) => {
    const { posted } = await startCompany(page, "/company/vacancies/new");
    await expect(page).toHaveURL(/\/company\/onboarding\?next=%2Fcompany%2Fvacancies%2Fnew$/);
    await fillCompany(page);
    await save(page).click();
    await expect(page).toHaveURL(/\/company\/vacancies\/new$/);
    expect(posted).toHaveLength(1);
    // the wizard preview reads the company profile (T028)
    await page.getByLabel("Title").fill("Backend Intern (Python)");
    await cont(page).click();
    await cont(page).click();
    await cont(page).click();
    await expect(page.getByTestId("vacancy-preview")).toContainText("Kaspi.kz");
  });

  test("a 403 company_profile_required from the vacancies API also sends the employer to the company step", async ({ page }) => {
    // the cached account still says it has a profile (e.g. an old session); the API knows better
    await signedInAs(page, "employer", "hr@kaspi.kz");
    await mockCompanyProfile.ok(page);
    await mockProfileCatalog.ok(page);
    await page.route(/\/api\/company\/vacancies(\?.*)?$/, (r) =>
      r.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ detail: { code: "company_profile_required", message: "mock" } }) }));
    await page.goto("/company/vacancies");
    await expect(page).toHaveURL(/\/company\/onboarding\?next=%2Fcompany%2Fvacancies$/);
    await expectCompanyStep(page, "Name");
  });

  test("a company profile already there: /company/onboarding goes to the profile page; a student goes home", async ({ page }) => {
    await signedInAs(page, "employer");
    await mockCompanyProfile.ok(page);
    await page.goto("/company/onboarding");
    await expect(page).toHaveURL(/\/company\/profile$/);
    await signedInAs(page, "student");
    await mockStudentProfile.ok(page);
    await page.goto("/company/onboarding");
    await expect(page).toHaveURL(/\/app$/);
  });

  test("save error: the alert shows, the answers stay, Save again works", async ({ page }) => {
    const { posted } = await startCompany(page);
    await mockCompanyCreate.serverError(page, [], 1);
    await fillCompany(page);
    await save(page).click();
    await expect(page.getByTestId("save-error")).toContainText("Couldn't save your company profile");
    await expectCompanyStep(page, "About");
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByLabel(/Website/)).toHaveValue("kaspi.kz");
    await cont(page).click();
    await save(page).click();
    await expect(page).toHaveURL(/\/company\/vacancies$/);
    expect(posted).toHaveLength(1);
  });

  test("catalog error: Try again loads the form", async ({ page }) => {
    await newEmployer(page);
    await mockProfileCatalog.ok(page);
    await mockProfileCatalog.network(page, 2);
    await page.goto("/company/onboarding");
    await expect(page.getByText("Couldn't load the form")).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByLabel("Company name")).toBeVisible();
  });

  test("the vacancy wizard waits for the company profile and retries it with the catalog", async ({ page }) => {
    await signedInAs(page, "employer");
    await mockCatalog.ok(page);
    await mockSkills.ok(page);
    await mockCompanyProfile.ok(page);
    await page.route("**/api/company/profile", (r) => r.fulfill({ status: 500, contentType: "application/json", body: "{}" }), { times: 2 });
    await page.goto("/company/vacancies/new");
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByLabel("Title")).toBeVisible();
  });

  test("390 px: no company step scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startCompany(page);
    await expectNoHorizontalScroll(page);
    await page.getByLabel("Company name").fill("Kaspi.kz");
    await cont(page).click();
    await expectCompanyStep(page, "Industry");
    await expectNoHorizontalScroll(page);
    await page.getByRole("radio", { name: "Finance & banking" }).check();
    await cont(page).click();
    await expectNoHorizontalScroll(page);
    await page.getByRole("radio", { name: "1000+ employees" }).check();
    await cont(page).click();
    await expectNoHorizontalScroll(page);
    await cont(page).click();
    await expectCompanyStep(page, "About");
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });
});

/* ── US3 edit ────────────────────────────────────────────────────────────── */

const EDIT = "/app/profile/edit";
const bar = (page: Page) => page.getByTestId("unsaved-bar");
const barSave = (page: Page) => bar(page).getByRole("button", { name: "Save", exact: true });
const select = (page: Page, name: string) => page.getByRole("combobox", { name: new RegExp(`^${name}`) });

async function choose(page: Page, combobox: string, option: string | RegExp, within = page.locator("body")) {
  await within.getByRole("combobox", { name: new RegExp(`^${combobox}`) }).click();
  await page.getByRole("option", { name: option }).first().click();
}

/** A signed-in student with the full profile stored on a stateful mock server, on the edit page. */
async function startEdit(page: Page, path = EDIT) {
  await signedInAs(page, "student", EMAIL);
  await mockProfileCatalog.ok(page);
  const server = await studentServer(page, FULL);
  await page.goto(path);
  await expect(page.getByTestId("student-profile-form")).toBeVisible();
  return server;
}

test.describe("US3 edit (student)", () => {
  test("US7QATest 1: the form is prefilled with the stored profile", async ({ page }) => {
    await startEdit(page);
    await expect(page.getByLabel("Full name")).toHaveValue("Maya Akhmetova");
    await expect(page.getByRole("combobox", { name: "University" })).toHaveValue("Suleyman Demirel University");
    await expect(page.getByRole("combobox", { name: "Major" })).toHaveValue("Computer Science");
    await expect(select(page, "Degree")).toContainText("Bachelor's");
    await expect(select(page, "Year of study")).toContainText("3rd year");
    await expect(page.getByLabel(/GPA/)).toHaveValue("3.45");
    await expect(page.getByRole("checkbox", { name: "Internship" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Part-time" })).toBeChecked();
    await expect(page.getByTestId("fields-input")).toContainText("Backend");
    await expect(page.getByTestId("project-row")).toHaveCount(1);
    await expect(page.getByTestId("language-row")).toHaveCount(2);
    await expect(page.getByLabel(/Telegram/)).toHaveValue("@maya_akh");
    await expect(bar(page)).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test("US7QATest 2: change the year, add a project and a language → Save → the profile shows them after a reload", async ({ page }) => {
    const server = await startEdit(page);
    await choose(page, "Year of study", "4th year");
    await expect(bar(page)).toBeVisible();

    await page.getByRole("button", { name: "Add project" }).click();
    const project = page.getByTestId("project-row").nth(1);
    await expect(project.getByLabel("Title")).toBeFocused();
    await project.getByLabel("Title").fill("Almaty air quality dashboard");
    await project.getByLabel(/^Link/).fill("github.com/maya-akh/aqi");

    await page.getByRole("button", { name: "Add language" }).click();
    const language = page.getByTestId("language-row").nth(2);
    await expect(language.getByRole("combobox", { name: "Language 3" })).toBeFocused();
    await language.getByRole("combobox", { name: "Language 3" }).fill("Turk");
    await page.getByRole("option", { name: /^Turkish/ }).click();
    await choose(page, "Level", "Basic", language);
    await expectNoA11yViolations(page);

    await barSave(page).click();
    await expect(page).toHaveURL(/\/app\/profile$/);
    await expect(page.getByTestId("toast").filter({ hasText: "Changes saved" })).toBeVisible();
    expect(server.puts).toHaveLength(1);
    expect(server.puts[0]).toMatchObject({
      version: 2, study_year: 4, graduated: false,
      projects: [{ title: "Campus timetable bot" }, { title: "Almaty air quality dashboard", url: "https://github.com/maya-akh/aqi" }],
      languages: [{ language: "Kazakh" }, { language: "English" }, { language: "Turkish", level: "basic" }],
    });

    await page.reload();
    await expect(page.getByTestId("profile-identity")).toContainText("Computer Science · Bachelor's, 4th year");
    await expect(page.getByTestId("profile-projects")).toContainText("Almaty air quality dashboard");
    await expect(page.getByTestId("profile-languages")).toContainText("Turkish");
  });

  test("US7QATest 3: clearing the full name is refused on the field; the stored profile is unchanged", async ({ page }) => {
    const server = await startEdit(page);
    await page.getByLabel("Full name").fill("");
    await page.getByLabel(/GPA/).fill("4.5");
    await barSave(page).click();
    await expect(page.getByText("Enter your full name")).toBeVisible();
    await expect(page.getByText("Enter a GPA from 0.00 to 4.00, like 3.45")).toBeVisible();
    await expect(page.getByTestId("error-summary")).toContainText("Fix 2 fields to save");
    await expect(page.getByLabel("Full name")).toBeFocused();
    await expectNoA11yViolations(page);
    expect(server.puts).toHaveLength(0);
    expect(server.current().full_name).toBe("Maya Akhmetova");
    // Discard brings the stored values back
    await bar(page).getByRole("button", { name: "Discard" }).click();
    await expect(page.getByLabel("Full name")).toHaveValue("Maya Akhmetova");
    await expect(bar(page)).toHaveCount(0);
  });

  test("US7QATest 4: leaving with unsaved changes asks first (router blocker and beforeunload)", async ({ page }) => {
    await startEdit(page);
    await page.getByLabel("Full name").fill("Maya A.");
    await page.getByRole("link", { name: "Profile" }).click();
    const dialog = page.getByRole("dialog", { name: "Leave without saving?" });
    await expect(dialog).toBeVisible();
    await expectNoA11yViolations(page);
    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/app\/profile\/edit$/);
    await expect(page.getByLabel("Full name")).toHaveValue("Maya A.");

    // a reload / tab close asks the browser's question
    const asked = page.waitForEvent("dialog");
    await page.close({ runBeforeUnload: true });
    const beforeUnload = await asked;
    expect(beforeUnload.type()).toBe("beforeunload");
    await beforeUnload.dismiss();
  });

  test("US7QATest 4b: Leave without saving goes on and keeps the stored profile", async ({ page }) => {
    const server = await startEdit(page);
    await page.getByLabel("Full name").fill("Maya A.");
    await page.getByRole("link", { name: "Profile" }).click();
    await page.getByTestId("confirm-leave").click();
    await expect(page).toHaveURL(/\/app\/profile$/);
    await expect(page.getByTestId("profile-identity")).toContainText("Maya Akhmetova");
    expect(server.puts).toHaveLength(0);
  });

  test("US7QATest 5: a save after another tab saved shows the conflict alert; Load latest loads the newer version", async ({ page }) => {
    const server = await startEdit(page);
    server.elsewhere({ study_year: 4 });
    await page.getByLabel("Full name").fill("Maya Akhmetova-Sultan");
    await barSave(page).click();
    const conflict = page.getByTestId("conflict-alert");
    await expect(conflict).toContainText("Your profile was changed elsewhere");
    await expect(page.getByLabel("Full name")).toHaveValue("Maya Akhmetova-Sultan");
    await expectNoA11yViolations(page);
    expect(server.current().full_name).toBe("Maya Akhmetova");
    await conflict.getByRole("button", { name: "Load latest version" }).click();
    await expect(page.getByTestId("toast").filter({ hasText: "Loaded the latest version" })).toBeVisible();
    await expect(select(page, "Year of study")).toContainText("4th year");
    await expect(page.getByLabel("Full name")).toHaveValue("Maya Akhmetova");
    await expect(bar(page)).toHaveCount(0);
  });

  test("conflict → Save again replaces the newer version with the edits (the 409's version is the base)", async ({ page }) => {
    const server = await startEdit(page);
    server.elsewhere({ study_year: 4 });
    await page.getByLabel("Full name").fill("Maya Akhmetova-Sultan");
    await barSave(page).click();
    await expect(page.getByTestId("conflict-alert")).toBeVisible();
    await barSave(page).click();
    await expect(page).toHaveURL(/\/app\/profile$/);
    expect(server.puts.map((p) => p.version)).toEqual([2, 3]);
    expect(server.current()).toMatchObject({ full_name: "Maya Akhmetova-Sultan", version: 4 });
  });

  test("Add buttons on My profile open the section and focus its first field", async ({ page }) => {
    await startEdit(page, `${EDIT}#gpa`);
    await expect(page.getByLabel(/GPA/)).toBeFocused();
    await page.goto(`${EDIT}#contacts`);
    await expect(page.getByLabel(/^Phone/)).toBeFocused();
    await page.goto(`${EDIT}#city`);
    await expect(select(page, "City")).toBeFocused();
  });

  test("removing a row hands focus to Add; Discard brings it back", async ({ page }) => {
    await startEdit(page);
    await page.getByRole("button", { name: "Remove project 1" }).click();
    await expect(page.getByTestId("project-row")).toHaveCount(0);
    await expect(page.getByText("No projects yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add project" })).toBeFocused();
    await page.getByRole("button", { name: "Remove language 1" }).click();
    await expect(page.getByTestId("language-row")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Add language" })).toBeFocused();
    await bar(page).getByRole("button", { name: "Discard" }).click();
    await expect(page.getByTestId("project-row")).toHaveCount(1);
    await expect(page.getByTestId("language-row")).toHaveCount(2);
  });

  test("a 422 row error from the API shows on the row", async ({ page }) => {
    const server = await startEdit(page);
    server.failNext("validation", ["body", "projects", 0, "url"]);
    await page.getByTestId("project-row").first().getByLabel(/^Link/).fill("github.com/maya-akh/bot2");
    await barSave(page).click();
    await expect(page.getByTestId("project-row").first().getByText("Enter a link like github.com/you/project")).toBeVisible();
    await expect(page).toHaveURL(/\/app\/profile\/edit$/);
  });

  test("save error: the alert shows and the edits stay", async ({ page }) => {
    const server = await startEdit(page);
    server.failNext("server");
    await page.getByLabel("Full name").fill("Maya A.");
    await barSave(page).click();
    await expect(page.getByTestId("save-error")).toContainText("Couldn't save your profile");
    await expect(page.getByLabel("Full name")).toHaveValue("Maya A.");
    await barSave(page).click();
    await expect(page).toHaveURL(/\/app\/profile$/);
  });

  test("\"I'm not sure yet\" keeps the fields in memory; saving it sends looking_for_fields: []", async ({ page }) => {
    const server = await startEdit(page);
    const unsure = page.getByRole("checkbox", { name: "I'm not sure yet" });
    await unsure.check();
    await expect(page.getByRole("combobox", { name: /^Fields of work/ })).toBeDisabled();
    await unsure.uncheck();
    await expect(page.getByTestId("fields-input")).toContainText("Backend");
    await expect(page.getByTestId("fields-input")).toContainText("Data Engineering");
    await unsure.check();
    await barSave(page).click();
    await expect(page).toHaveURL(/\/app\/profile$/);
    expect(server.puts[0]).toMatchObject({ looking_for_fields: [] });
  });

  test("the fields Combobox keeps focus when the 3rd field is picked", async ({ page }) => {
    await startEdit(page);
    const fields = page.getByRole("combobox", { name: /^Fields of work/ });
    await fields.click();
    await fields.fill("Dev");
    await page.getByRole("option", { name: /^DevOps/ }).click();
    await expect(page.getByTestId("fields-input")).toContainText("DevOps");
    await expect(fields).toBeFocused();
  });

  test("load error: Try again loads the form", async ({ page }) => {
    await signedInAs(page, "student", EMAIL);
    await mockProfileCatalog.ok(page);
    await mockStudentProfile.ok(page, FULL);
    await mockStudentProfile.serverError(page, 2);
    await page.goto(EDIT);
    await expect(page.getByText("Couldn't load your profile")).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByLabel("Full name")).toHaveValue("Maya Akhmetova");
  });

  test("390 px: the edit form does not scroll sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startEdit(page);
    await page.getByLabel("Full name").fill("Maya A.");
    await expect(bar(page)).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });
});

const COMPANY_STORED = {
  name: "Kaspi.kz", industry: "finance", size: "1000_plus", website: "https://kaspi.kz", city: "almaty",
  description: "Payments, marketplace and banking in one app.", version: 4,
  created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-18T10:00:00Z",
};

async function startCompanyEdit(page: Page) {
  await signedInAs(page, "employer", "hr@kaspi.kz");
  await mockProfileCatalog.ok(page);
  await mockSkills.ok(page);
  const server = await companyServer(page, COMPANY_STORED);
  await page.goto("/company/profile");
  await expect(page.getByTestId("company-profile-form")).toBeVisible();
  return server;
}

test.describe("US3 edit (company)", () => {
  test("rename → Save stays on the page with the rename toast; the vacancy wizard preview shows the new name", async ({ page }) => {
    const server = await startCompanyEdit(page);
    await expect(page.getByText("Updated 18 Nov 2026")).toBeVisible();
    await expect(page.getByLabel("Company name")).toHaveValue("Kaspi.kz");
    await expect(select(page, "Industry")).toContainText("Finance & banking");
    await expectNoA11yViolations(page);
    await page.getByLabel("Company name").fill("Kaspi Bank");
    await barSave(page).click();
    const toastEl = page.getByTestId("toast").filter({ hasText: "Changes saved" });
    await expect(toastEl).toContainText("Your vacancies now show “Kaspi Bank”.");
    await expect(page).toHaveURL(/\/company\/profile$/);
    await expect(bar(page)).toHaveCount(0);
    await expect(page.getByText("Updated 23 Nov 2026")).toBeVisible();
    expect(server.puts[0]).toMatchObject({ name: "Kaspi Bank", version: 4 });

    await page.goto("/company/vacancies/new");
    await page.getByLabel("Title").fill("Backend Intern (Python)");
    await cont(page).click();
    await cont(page).click();
    await cont(page).click();
    await expect(page.getByTestId("vacancy-preview")).toContainText("Kaspi Bank");
  });

  test("an empty name and a bad website are refused; nothing is saved", async ({ page }) => {
    const server = await startCompanyEdit(page);
    await page.getByLabel("Company name").fill("");
    await page.getByLabel(/Website/).fill("kaspi kz");
    await barSave(page).click();
    await expect(page.getByText("Enter the company name")).toBeVisible();
    await expect(page.getByText("Enter a website like kaspi.kz or https://kaspi.kz")).toBeVisible();
    await expect(page.getByTestId("error-summary")).toContainText("Fix 2 fields to save");
    await expect(page.getByLabel("Company name")).toBeFocused();
    await expectNoA11yViolations(page);
    expect(server.puts).toHaveLength(0);
  });

  test("conflict: Load latest loads the newer version", async ({ page }) => {
    const server = await startCompanyEdit(page);
    server.elsewhere({ size: "201_1000" });
    await page.getByLabel("Company name").fill("Kaspi Bank");
    await barSave(page).click();
    await expect(page.getByTestId("conflict-alert")).toContainText("Your company profile was changed elsewhere");
    await page.getByRole("button", { name: "Load latest version" }).click();
    await expect(select(page, "Company size")).toContainText("201–1000 employees");
    await expect(page.getByLabel("Company name")).toHaveValue("Kaspi.kz");
  });

  test("leaving with unsaved changes asks first", async ({ page, isMobile }) => {
    test.skip(isMobile, "the nav collapses into the sheet");
    await startCompanyEdit(page);
    await page.getByLabel("Company name").fill("Kaspi Bank");
    await page.getByRole("link", { name: "Vacancies" }).click();
    await expect(page.getByRole("dialog", { name: "Leave without saving?" })).toBeVisible();
    await page.getByTestId("confirm-leave").click();
    await expect(page).toHaveURL(/\/company\/vacancies$/);
  });

  test("390 px: the company profile does not scroll sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startCompanyEdit(page);
    await page.getByLabel("Company name").fill("Kaspi Bank");
    await expect(bar(page)).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });
});

/* ── Account menu ────────────────────────────────────────────────────────── */

test.describe("account menu", () => {
  test.skip(({ isMobile }) => isMobile, "header actions collapse on mobile");

  test("student: the menu shows the profile name and the sign-in email", async ({ page }) => {
    await signedInAs(page, "student", EMAIL);
    await mockProfileCatalog.ok(page);
    await mockStudentProfile.ok(page, studentProfileFixture({ full_name: "Maya Akhmetova" }));
    await page.goto("/app/profile");
    await expect(page.getByTestId("profile-identity")).toBeVisible();
    await page.getByTestId("account-menu").click();
    await expect(page.locator(".ui-pm__name")).toHaveText("Maya Akhmetova");
    await expect(page.locator(".ui-pm__email")).toHaveText(EMAIL);
    await expect(page.getByText("Add your CV")).toHaveCount(0);
  });

  test("employer: the menu shows the company name", async ({ page }) => {
    await signedInAs(page, "employer", "hr@kaspi.kz");
    await mockCompanyProfile.ok(page);
    await page.route(/\/api\/company\/vacancies(\?.*)?$/, (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], counts: { all: 0, draft: 0, open: 0, paused: 0, closed: 0 } }) }));
    await page.goto("/company/vacancies");
    await page.getByTestId("account-menu").click();
    await expect(page.locator(".ui-pm__name")).toHaveText("Kaspi.kz");
    await expect(page.locator(".ui-pm__email")).toHaveText("hr@kaspi.kz");
  });

  test("the sign-in email stands in while the profile can't be read", async ({ page }) => {
    await signedInAs(page, "student", EMAIL);
    await mockStudentProfile.network(page);
    await page.goto("/app/applications");
    await page.getByTestId("account-menu").click();
    await expect(page.locator(".ui-pm__name")).toHaveText(EMAIL);
  });
});
