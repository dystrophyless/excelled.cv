import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { signedInAs, signedOut } from "./support/auth-api";
import { mockOpportunities } from "./support/opportunities-api";
import { mockCatalog } from "./support/vacancies-api";

/*
 * Feature 005-landing-role-choice - S1 landing page. The API is mocked with page.route (support/auth-api.ts);
 * the only call the page makes is GET /api/auth/me, to send a signed-in account to its home. Runs on both projects
 * (desktop 1440, mobile Pixel 7). Contract: specs/005-landing-role-choice/contracts/routes.md.
 */

test.beforeEach(async ({ page }) => {
  await signedOut(page);
  // the student home is the opportunities list (004): serve it empty, so a redirected student lands on a quiet page
  await mockCatalog.ok(page);
  await mockOpportunities.empty(page);
});

const header = (page: Page) => page.getByRole("banner");
const h1 = (page: Page) => page.getByRole("heading", { level: 1, name: "Students and employers, connected by skills" });

test.describe("US1 - visitor learns what Novio offers", () => {
  test("shows the purpose, the three capabilities and both roles without any form", async ({ page }) => {
    await page.goto("/");
    await expect(h1(page)).toBeVisible();
    await expect(page.getByText("Novio connects students with internships, vacancies, research opportunities and employers.").first()).toBeVisible();
    const capabilities = page.getByTestId("capability");
    await expect(capabilities).toHaveCount(3);
    await expect(capabilities.getByRole("heading", { level: 3 })).toHaveText(["Create your profile", "Find opportunities", "See your match"]);
    await expect(page.getByRole("heading", { level: 2, name: "Build a profile, find what fits" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Publish opportunities and present your company" })).toBeVisible();
    await expect(page.getByText("Pick Student or HR Representative")).toBeVisible();
    // the sample search field in the illustration is aria-hidden and inert: nothing to fill in
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await expect(page.locator("form")).toHaveCount(0);
  });

  test("Create account and Log in are visible in the header without a menu", async ({ page }) => {
    await page.goto("/");
    await expect(header(page).getByRole("button", { name: "Log in" })).toBeVisible();
    await expect(header(page).getByRole("button", { name: "Create account" })).toBeVisible();
    await expect(page.getByRole("button", { name: /menu/i })).toHaveCount(0);
    await expect(header(page).getByRole("link", { name: /vacancies|for employers/i })).toHaveCount(0);
  });

  test("header Create account opens sign-up with no role selected", async ({ page }) => {
    await page.goto("/");
    await header(page).getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(2);
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  });

  test("header Log in opens sign-in", async ({ page }) => {
    await page.goto("/");
    await header(page).getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  });

  test("every Create account button opens the role step", async ({ page }) => {
    await page.goto("/");
    const buttons = page.getByRole("button", { name: "Create account" });
    const count = await buttons.count();
    expect(count).toBe(4); // header, hero, HR block, closing call to action
    for (let i = 0; i < count; i++) {
      await page.goto("/");
      await buttons.nth(i).click();
      await expect(page).toHaveURL(/\/sign-up$/);
      await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
    }
  });

  test("every Log in link in the page and the footer opens sign-in", async ({ page }) => {
    await page.goto("/");
    const links = page.getByRole("link", { name: "Log in" });
    const count = await links.count();
    expect(count).toBe(2); // closing call to action, footer
    for (let i = 0; i < count; i++) {
      await page.goto("/");
      await links.nth(i).click();
      await expect(page).toHaveURL(/\/sign-in$/);
    }
    await page.goto("/");
    await page.getByRole("navigation", { name: "Account" }).getByRole("link", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test("every link leads to a real address or a section of the page", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(["/", "/sign-up", "/sign-in", "#students", "#hr"]).toContain(href);
    for (const id of ["students", "hr"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
  });

  test("the HR button and the footer anchors scroll to the section and move focus to its heading", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "For HR representatives" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Publish opportunities and present your company" })).toBeFocused();
    await expect(page).toHaveURL(/#hr$/);
    await expect(page.locator("#hr")).toBeInViewport();

    const footer = page.getByRole("navigation", { name: "On this page" });
    await footer.getByRole("link", { name: "For students" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Build a profile, find what fits" })).toBeFocused();
    await expect(page).toHaveURL(/#students$/);
    await expect(page.locator("#students")).toBeInViewport();

    await footer.getByRole("link", { name: "For HR representatives" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Publish opportunities and present your company" })).toBeFocused();
    // the next Tab continues inside the section: its Create account button
    await page.keyboard.press("Tab");
    await expect(page.locator("#hr").getByRole("button", { name: "Create account" })).toBeFocused();
  });

  test("with reduced motion the jump is instant and still moves focus", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: "For HR representatives" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Publish opportunities and present your company" })).toBeFocused();
    await expect(page.locator("#hr")).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("a slow session check does not hide the page", async ({ page }) => {
    await page.route("**/api/auth/me", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: { code: "not_signed_in", message: "mock" } }) });
    });
    await page.goto("/");
    await expect(h1(page)).toBeVisible(); // while the check is still pending
    await expect(header(page).getByRole("button", { name: "Create account" })).toBeVisible();
    await page.waitForTimeout(3000);
    await expect(h1(page)).toBeVisible(); // and after it ends signed out
    await expect(page).toHaveURL(/\/$/);
  });

  test("a failing session check keeps the page", async ({ page }) => {
    await page.route("**/api/auth/me", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "boom" }) }));
    await page.goto("/");
    await expect(h1(page)).toBeVisible();
    await page.waitForTimeout(500);
    await expect(h1(page)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await page.route("**/api/auth/me", (route) => route.abort("failed"));
    await page.reload();
    await expect(h1(page)).toBeVisible();
  });

  test("a signed-in student is sent to the opportunities, an employer to the company pages", async ({ page }) => {
    await signedInAs(page, "student");
    await page.goto("/");
    await expect(page).toHaveURL(/\/app\/opportunities$/);
    await signedInAs(page, "employer");
    await page.goto("/");
    await expect(page).toHaveURL(/\/company\/vacancies$/);
  });

  test("the removed public addresses lead to the landing page", async ({ page }) => {
    for (const path of ["/employers", "/vacancies", "/vacancies/5"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
      await expect(h1(page)).toBeVisible();
    }
    // the redirect replaces the entry: Back does not return to the removed address
    await page.goto("/");
    await page.goto("/employers");
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });

  test("a signed-in account opening a removed address ends on its home", async ({ page }) => {
    await signedInAs(page, "student");
    await page.goto("/vacancies");
    await expect(page).toHaveURL(/\/app\/opportunities$/);
  });

  test("passes axe, does not scroll sideways and keeps every action reachable", async ({ page }) => {
    await page.goto("/");
    await expect(h1(page)).toBeVisible();
    await expectNoA11yViolations(page);
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    await expect(header(page).getByRole("button", { name: "Create account" })).toBeInViewport();
    await expect(header(page).getByRole("button", { name: "Log in" })).toBeInViewport();
  });
});
