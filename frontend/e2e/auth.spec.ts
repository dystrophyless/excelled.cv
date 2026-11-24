import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import {
  mockRegister,
  mockResendCode,
  mockResetConfirm,
  mockResetRequest,
  mockResetVerify,
  mockSignIn,
  mockSignOut,
  mockVerifyEmail,
  signedInAs,
  signedOut,
} from "./support/auth-api";
import { mockOpportunities } from "./support/opportunities-api";
import { mockCatalog } from "./support/vacancies-api";

/*
 * Feature 001-user-auth - screens S1 (sign in), S2 (sign up), S3 (verify email) and the route guards.
 * The API is mocked with page.route (support/auth-api.ts); contract: specs/001-user-auth/contracts/auth-api.md.
 */

const EMAIL = "maya@sdu.edu.kz";
const PASSWORD = "correct horse";

test.beforeEach(async ({ page }) => {
  await signedOut(page);
  // the student home is the opportunities list (004): serve it empty, so a signed-in student lands on a quiet page
  await mockCatalog.ok(page);
  await mockOpportunities.empty(page);
});

async function expectNoHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
}

/** The details step: email, password, submit. */
async function fillSignUp(page: Page, email = EMAIL, password = PASSWORD) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

type RoleName = "Student" | "HR Representative";

/** Step 1 of sign-up: choose a role and continue; ends on the details step. */
async function chooseRole(page: Page, role: RoleName = "Student") {
  await page.getByRole("radio", { name: role }).check({ force: true });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
}

/** Open /sign-up and get to the details step for `role`. */
async function openDetails(page: Page, role: RoleName = "Student") {
  await page.goto("/sign-up");
  await chooseRole(page, role);
}

/** Sign up and land on S3. `resendIn` (seconds) is short in the countdown tests so they can wait it out for real. */
/** Enter a code the way autofill / paste does: all six digits at once (typing key by key races the box animations). */
async function enterCode(page: Page, digits: string) {
  const code = page.getByLabel("Verification code");
  await expect(code).toBeEditable();
  await code.focus();
  await code.evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, digits);
}

async function reachVerify(page: Page, resendIn = 60) {
  if (resendIn === 60) await mockRegister.ok(page);
  else await page.route("**/api/auth/register", (r) => r.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ email: EMAIL, resend_in: resendIn, expires_in: 600 }) }));
  await openDetails(page);
  await fillSignUp(page);
  await expect(page).toHaveURL(/\/sign-up\/verify$/);
  await expect(page.getByRole("heading", { level: 1, name: "Check your email" })).toBeVisible();
}

test.describe("US1 - student creates an account", () => {
  test("sign-up happy path: form -> code -> /app/opportunities", async ({ page }) => {
    await mockVerifyEmail.ok(page, "student");
    await reachVerify(page);
    await expect(page.getByText(EMAIL)).toBeVisible();
    await expect(page.getByLabel("Verification code")).toBeFocused();
    await enterCode(page, "123456");
    await expect(page).toHaveURL(/\/app\/opportunities$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("S2 sends the chosen role and the typed values", async ({ page }) => {
    let body: unknown;
    await mockRegister.ok(page);
    await page.route("**/api/auth/register", async (route) => {
      body = route.request().postDataJSON();
      await route.fallback();
    });
    await openDetails(page, "HR Representative");
    await fillSignUp(page, "Aruzhan@Kaspi.kz ");
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    expect(body).toEqual({ email: "Aruzhan@Kaspi.kz", password: PASSWORD, role: "employer" });
  });

  test("wrong code twice shows the tries left", async ({ page }) => {
    await reachVerify(page);
    const code = page.getByLabel("Verification code");
    await mockVerifyEmail.invalidCode(page, 2);
    await enterCode(page, "111111");
    await expect(page.getByText("That code didn't work. 2 tries left.").first()).toBeVisible();
    await expect(code).toBeEditable(); // the boxes lock for a moment while the wrong code clears
    await mockVerifyEmail.invalidCode(page, 1);
    await enterCode(page, "222222");
    await expect(page.getByText("That code didn't work. 1 try left.").first()).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
  });

  test("too many wrong codes: Start again returns to the details step with the email and role kept", async ({ page }) => {
    await mockRegister.ok(page);
    await openDetails(page, "HR Representative");
    await fillSignUp(page);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await mockVerifyEmail.tooManyAttempts(page);
    await enterCode(page, "333333");
    await expect(page.getByRole("heading", { level: 1, name: "Start again" })).toBeVisible();
    await page.getByRole("button", { name: "Start again" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(EMAIL);
    await expect(page.getByTestId("chosen-role")).toContainText("HR Representative");
  });

  test("expired code can be replaced; nothing pending offers a restart", async ({ page }) => {
    await reachVerify(page);
    await mockVerifyEmail.codeExpired(page);
    await enterCode(page, "444444");
    await expect(page.getByText("That code expired")).toBeVisible();
    await mockResendCode.ok(page);
    await page.getByRole("button", { name: "Send a new code" }).click();
    await expect(page.getByText("New code sent")).toBeVisible();
    await expect(page.getByLabel("Verification code")).toBeEditable();

    await mockVerifyEmail.nothingPending(page);
    await enterCode(page, "555555");
    await expect(page.getByText("Nothing to verify")).toBeVisible();
  });

  test("resend countdown turns into a Resend code button", async ({ page }) => {
    await reachVerify(page, 3);
    await expect(page.getByText(/Resend in/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Resend code" })).toHaveCount(0);
    await mockResendCode.ok(page);
    await page.getByRole("button", { name: "Resend code" }).click();
    await expect(page.getByText("New code sent")).toBeVisible();
  });

  test("resend inside the cooldown shows the remaining time", async ({ page }) => {
    await reachVerify(page, 2);
    await expect(page.getByRole("button", { name: "Resend code" })).toBeVisible();
    await mockResendCode.tooSoon(page, 42);
    await page.getByRole("button", { name: "Resend code" }).click();
    await expect(page.getByText("Wait before asking again")).toBeVisible();
    await expect(page.getByTestId("countdown")).toContainText("0:4");
  });

  test("register 429 resend_too_soon goes to S3 with the cooldown", async ({ page }) => {
    await mockRegister.tooSoon(page, 42);
    await openDetails(page);
    await fillSignUp(page);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await expect(page.getByText("Wait before asking again")).toBeVisible();
    await expect(page.getByTestId("countdown")).toContainText("0:4");
  });

  test("email_taken offers Log in and Reset password", async ({ page }) => {
    await mockRegister.emailTaken(page);
    await openDetails(page);
    await fillSignUp(page);
    const alert = page.getByRole("alert").filter({ hasText: "An account with this email already exists" });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/sign-in");
    await expect(alert.getByRole("link", { name: "reset your password" })).toHaveAttribute("href", "/reset-password");
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Email")).toHaveValue(EMAIL);
  });

  test("client validation shows field errors and sends nothing", async ({ page }) => {
    let requests = 0;
    await page.route("**/api/auth/register", (route) => {
      requests += 1;
      return route.abort();
    });
    await openDetails(page);
    await fillSignUp(page, "not-an-email", "short");
    await expect(page.getByText("Enter an email like you@university.edu")).toBeVisible();
    await expect(page.getByText("Use 8 to 64 characters")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Fix 2 fields to continue" })).toBeVisible();
    expect(requests).toBe(0);
  });

  test("server error keeps the form filled and the button is the retry", async ({ page }) => {
    await mockRegister.network(page);
    await openDetails(page);
    await fillSignUp(page);
    await expect(page.getByRole("alert").filter({ hasText: "Couldn't create your account" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(EMAIL);
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue(PASSWORD);
    await mockRegister.ok(page);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
  });

  test("pasting 6 digits fills every box and submits", async ({ page }) => {
    await mockVerifyEmail.ok(page, "student");
    await reachVerify(page);
    await enterCode(page, "123456");
    await expect(page).toHaveURL(/\/app\/opportunities$/);
  });

  test("verify without an email in navigation state goes back to the role step", async ({ page }) => {
    await page.goto("/sign-up/verify");
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
  });

  test("the role step, the details step and S3 pass axe and do not scroll sideways at 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockRegister.ok(page);
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
    await chooseRole(page);
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
    await fillSignUp(page);
    await expect(page.getByRole("heading", { level: 1, name: "Check your email" })).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
  });
});

test.describe("US2 - returning user signs in", () => {
  async function signInWith(page: Page, email = EMAIL, password = PASSWORD) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
  }

  test("student signs in and lands on /app/opportunities", async ({ page }) => {
    await mockSignIn.ok(page, "student");
    await page.goto("/sign-in");
    await signInWith(page);
    await expect(page).toHaveURL(/\/app\/opportunities$/);
  });

  test("employer signs in and lands on the company home", async ({ page }) => {
    await mockSignIn.ok(page, "employer");
    await page.goto("/sign-in");
    await signInWith(page, "aruzhan@kaspi.kz");
    await expect(page).toHaveURL(/\/company\/vacancies$/);
  });

  test("sends credentials form-encoded", async ({ page }) => {
    let body = "";
    await mockSignIn.ok(page);
    await page.route("**/api/auth/token", async (route) => {
      body = route.request().postData() ?? "";
      await route.fallback();
    });
    await page.goto("/sign-in");
    await signInWith(page);
    await expect(page).toHaveURL(/\/app\/opportunities$/);
    expect(new URLSearchParams(body).get("username")).toBe(EMAIL);
    expect(new URLSearchParams(body).get("password")).toBe(PASSWORD);
  });

  test("invalid_credentials keeps the email and clears the password", async ({ page }) => {
    await mockSignIn.invalidCredentials(page);
    await page.goto("/sign-in");
    await signInWith(page);
    await expect(page.getByRole("alert").filter({ hasText: "Wrong email or password" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(EMAIL);
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  });

  test("empty fields show errors and send nothing", async ({ page }) => {
    let requests = 0;
    await page.route("**/api/auth/token", (route) => {
      requests += 1;
      return route.abort();
    });
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Enter your email")).toBeVisible();
    await expect(page.getByText("Enter your password")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeFocused();
    await page.getByLabel("Password", { exact: true }).focus();
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByLabel("Email")).toBeFocused(); // a second identical failure refocuses too
    expect(requests).toBe(0);
  });

  test("locked shows the countdown and the reset link; Log in only re-announces", async ({ page }) => {
    await mockSignIn.locked(page, 872);
    await page.goto("/sign-in");
    await signInWith(page);
    const alert = page.getByRole("alert").filter({ hasText: "Too many attempts" });
    await expect(alert).toBeVisible();
    await expect(page.getByTestId("countdown")).toContainText(/^14:/);
    await expect(alert.getByRole("link", { name: "Reset your password" })).toHaveAttribute("href", "/reset-password");

    let requests = 0;
    await page.route("**/api/auth/token", (route) => {
      requests += 1;
      return route.abort();
    });
    await expect(page.getByRole("button", { name: "Log in" })).toBeEnabled();
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Too many attempts" })).toBeVisible();
    expect(requests).toBe(0);
  });

  test("network failure shows the server error and Log in retries", async ({ page }) => {
    await mockSignIn.network(page);
    await page.goto("/sign-in");
    await signInWith(page);
    await expect(page.getByRole("alert").filter({ hasText: "Couldn't log in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(EMAIL);
    await mockSignIn.ok(page);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/app\/opportunities$/);
  });

  // 004: /app/applications now redirects to the opportunities, so the deep link is an opportunities address
  test("signed-out visit to /app/opportunities?type=research -> sign in -> back to the same address", async ({ page }) => {
    await mockSignIn.ok(page, "student");
    await page.goto("/app/opportunities?type=research");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp%2Fopportunities%3Ftype%3Dresearch$/);
    await signInWith(page);
    await expect(page).toHaveURL(/\/app\/opportunities\?type=research$/);
    await expect(page.getByRole("heading", { level: 1, name: "Opportunities" })).toBeVisible();
  });

  test("an off-site next is ignored", async ({ page }) => {
    await mockSignIn.ok(page, "student");
    await page.goto("/sign-in?next=%2F%2Fevil.example%2Fx");
    await signInWith(page);
    await expect(page).toHaveURL(/\/app\/opportunities$/);
  });

  test("Log out returns to /sign-in and protected pages ask for sign-in again", async ({ page }) => {
    await signedInAs(page, "student", EMAIL);
    await mockSignOut.ok(page);
    await page.goto("/app");
    await page.getByTestId("account-menu").click();
    await expect(page.getByText(EMAIL).first()).toBeVisible();
    await signedOut(page);
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp%2Fopportunities$/);
  });

  test("the account menu shows the real email", async ({ page }) => {
    await signedInAs(page, "employer", "real@company.kz");
    await page.goto("/company/vacancies");
    await page.getByTestId("account-menu").click();
    await expect(page.getByText("real@company.kz").first()).toBeVisible();
  });

  test("signed-in visit to /sign-in goes to the role's home", async ({ page }) => {
    await signedInAs(page, "student");
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/app\/opportunities$/);
    await signedInAs(page, "employer");
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/company\/vacancies$/);
  });

  test("S1 passes axe and does not scroll sideways at 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("form", { name: "Log in" })).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
    await mockSignIn.locked(page, 872);
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Too many attempts" })).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
  });
});

test.describe("US3 - employer account", () => {
  test("employer signs up and lands on the company pages", async ({ page }) => {
    let role: unknown;
    await mockRegister.ok(page);
    await page.route("**/api/auth/register", async (route) => {
      role = route.request().postDataJSON().role;
      await route.fallback();
    });
    await mockVerifyEmail.ok(page, "employer");
    await openDetails(page, "HR Representative");
    await fillSignUp(page);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await enterCode(page, "123456");
    await expect(page).toHaveURL(/\/company(\/vacancies)?$/);
    expect(role).toBe("employer");
  });

  test("a signed-in employer opening /app is sent to /company", async ({ page }) => {
    await signedInAs(page, "employer");
    await page.goto("/app");
    await expect(page).toHaveURL(/\/company(\/vacancies)?$/);
  });

  test("a signed-in student opening /company/vacancies is sent to /app/opportunities", async ({ page }) => {
    await signedInAs(page, "student");
    await page.goto("/company/vacancies");
    await expect(page).toHaveURL(/\/app\/opportunities$/);
  });
});

test.describe("US4 - reset a forgotten password", () => {
  const NEW_PASSWORD = "brand new pass";

  async function requestCode(page: Page, email = EMAIL) {
    await page.goto("/reset-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page).toHaveURL(/\/reset-password\/verify$/);
  }

  async function reachConfirm(page: Page) {
    await mockResetRequest.ok(page);
    await mockResetVerify.ok(page);
    await requestCode(page);
    await enterCode(page, "123456");
    await expect(page).toHaveURL(/\/reset-password\/confirm$/);
    await expect(page.getByRole("heading", { level: 1, name: "Set a new password" })).toBeVisible();
  }

  async function setPasswords(page: Page, password: string, confirm = password) {
    await page.getByLabel("New password", { exact: true }).fill(password);
    await page.getByLabel("Confirm new password").fill(confirm);
    await page.getByRole("button", { name: "Set new password" }).click();
  }

  test("forgot password -> code -> new password twice -> signed in at the role home", async ({ page }) => {
    let body: unknown;
    await mockResetConfirm.ok(page, "student");
    await page.route("**/api/auth/password-reset/confirm", async (route) => {
      body = route.request().postDataJSON();
      await route.fallback();
    });
    await reachConfirm(page);
    expect(page.url()).not.toContain("mock-reset-token");
    await setPasswords(page, NEW_PASSWORD);
    await expect(page.getByRole("heading", { level: 1, name: "Password updated" })).toBeVisible();
    await expect(page).toHaveURL(/\/reset-password\/confirm$/);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/app\/opportunities$/);
    expect(body).toEqual({ reset_token: "mock-reset-token", password: NEW_PASSWORD });
  });

  test("an employer lands on the company pages after a reset", async ({ page }) => {
    await mockResetConfirm.ok(page, "employer");
    await reachConfirm(page);
    await setPasswords(page, NEW_PASSWORD);
    await expect(page.getByRole("heading", { level: 1, name: "Password updated" })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/company(\/vacancies)?$/);
  });

  test("S4 validates the email and keeps the form on a server error", async ({ page }) => {
    await page.goto("/reset-password");
    await page.getByLabel("Email").fill("nope");
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByText("Enter an email like you@university.edu")).toBeVisible();
    await page.route("**/api/auth/password-reset/request", (r) => r.abort("failed"));
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Couldn't send the code" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(EMAIL);
    await mockResetRequest.ok(page);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page).toHaveURL(/\/reset-password\/verify$/);
  });

  test("S1 Forgot password? opens S4", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(page.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible();
  });

  test("S6 wrong code shows the tries left", async ({ page }) => {
    await mockResetRequest.ok(page);
    await requestCode(page);
    await expect(page.getByLabel("Verification code")).toBeFocused();
    await mockResetVerify.invalidCode(page, 2);
    await enterCode(page, "111111");
    await expect(page.getByText("That code didn't work. 2 tries left.").first()).toBeVisible();
    await expect(page).toHaveURL(/\/reset-password\/verify$/);
  });

  test("S6 too many wrong codes: Request a new code returns to S4 with the email kept", async ({ page }) => {
    await mockResetRequest.ok(page);
    await requestCode(page);
    await mockResetVerify.tooManyAttempts(page);
    await enterCode(page, "333333");
    await expect(page.getByRole("heading", { level: 1, name: "Start again" })).toBeVisible();
    await page.getByRole("button", { name: "Request a new code" }).click();
    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(page.getByLabel("Email")).toHaveValue(EMAIL);
  });

  test("S6 expired code can be replaced", async ({ page }) => {
    await mockResetRequest.ok(page);
    await requestCode(page);
    await mockResetVerify.codeExpired(page);
    await enterCode(page, "444444");
    await expect(page.getByText("That code expired")).toBeVisible();
    await mockResendCode.ok(page);
    await page.getByRole("button", { name: "Send a new code" }).click();
    await expect(page.getByText("New code sent")).toBeVisible();
  });

  test("S6 resend after the countdown is always neutral", async ({ page }) => {
    await page.route("**/api/auth/password-reset/request", (r) =>
      r.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ resend_in: 2, expires_in: 600 }) }));
    await requestCode(page);
    await mockResendCode.ok(page);
    await page.getByRole("button", { name: "Resend code" }).click();
    await expect(page.getByText("New code sent")).toBeVisible();
  });

  test("S5 mismatch blocks the submit", async ({ page }) => {
    let requests = 0;
    await page.route("**/api/auth/password-reset/confirm", (route) => {
      requests += 1;
      return route.abort();
    });
    await reachConfirm(page);
    await setPasswords(page, NEW_PASSWORD, "something else");
    await expect(page.getByText("Passwords don't match")).toBeVisible();
    await expect(page.getByLabel("Confirm new password")).toBeFocused();
    expect(requests).toBe(0);
    await expect(page).toHaveURL(/\/reset-password\/confirm$/);
  });

  test("S5 short password shows the length error", async ({ page }) => {
    await reachConfirm(page);
    await setPasswords(page, "short");
    await expect(page.getByText("That password is too short")).toBeVisible();
    await expect(page.getByLabel("New password", { exact: true })).toBeFocused();
    await page.getByLabel("New password", { exact: true }).fill("long enough now");
    await expect(page.getByText("That password is too short")).toHaveCount(0);
  });

  test("S5 reset_token_invalid -> Your reset session expired -> Start again", async ({ page }) => {
    await mockResetConfirm.tokenInvalid(page);
    await reachConfirm(page);
    await setPasswords(page, NEW_PASSWORD);
    await expect(page.getByText("Your reset session expired")).toBeVisible();
    await page.getByRole("button", { name: "Start again" }).click();
    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(page.getByLabel("Email")).toHaveValue(EMAIL);
  });

  test("S5 network failure shows the server error and the button retries", async ({ page }) => {
    await page.route("**/api/auth/password-reset/confirm", (r) => r.abort("failed"));
    await reachConfirm(page);
    await setPasswords(page, NEW_PASSWORD);
    await expect(page.getByRole("alert").filter({ hasText: "Couldn't set your password" })).toBeVisible();
    await mockResetConfirm.ok(page);
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Password updated" })).toBeVisible();
  });

  test("direct visits to S5 and S6 go back to S4", async ({ page }) => {
    await page.goto("/reset-password/confirm");
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.goto("/reset-password/verify");
    await expect(page).toHaveURL(/\/reset-password$/);
  });

  test("S4, S6 and S5 pass axe and do not scroll sideways at 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockResetRequest.ok(page);
    await mockResetVerify.ok(page);
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Check your email" })).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
    await enterCode(page, "123456");
    await expect(page.getByRole("heading", { level: 1, name: "Set a new password" })).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
  });
});

/* 005 - sign-up starts with the role step; the details step needs a role. Contract: specs/005-landing-role-choice. */
test.describe("005 - choosing a role", () => {
  const radio = (page: Page, name: RoleName) => page.getByRole("radio", { name });
  const historyState = (page: Page) => page.evaluate(() => JSON.stringify(window.history.state));

  test("nothing is preselected; selecting the other role moves the selection", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(2);
    await expect(radio(page, "Student")).not.toBeChecked();
    await expect(radio(page, "HR Representative")).not.toBeChecked();
    await radio(page, "Student").check({ force: true });
    await expect(radio(page, "Student")).toBeChecked();
    await radio(page, "HR Representative").check({ force: true });
    await expect(radio(page, "HR Representative")).toBeChecked();
    await expect(radio(page, "Student")).not.toBeChecked();
  });

  test("Continue without a role stays, shows the message and focuses a radio; selecting a role clears it", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Select a role to continue" })).toBeVisible();
    await expect(page.getByRole("radio").first()).toBeFocused();
    await expectNoA11yViolations(page);
    await radio(page, "Student").check({ force: true });
    await expect(page.getByText("Select a role to continue")).toHaveCount(0);
  });

  test("a keyboard alone completes registration", async ({ page }) => {
    await mockRegister.ok(page);
    await page.goto("/sign-up");
    await radio(page, "HR Representative").focus();
    await page.keyboard.press("Space");
    await expect(radio(page, "HR Representative")).toBeChecked();
    await page.keyboard.press("ArrowUp");
    await expect(radio(page, "Student")).toBeChecked();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Continue" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
    await page.getByLabel("Email").focus();
    await page.keyboard.type(EMAIL);
    await page.keyboard.press("Tab");
    await page.keyboard.type(PASSWORD);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
  });

  for (const [label, apiRole] of [["Student", "student"], ["HR Representative", "employer"]] as const) {
    test(`${label} is sent as ${apiRole} and the account lands on its role's pages`, async ({ page }) => {
      let body: unknown;
      await mockRegister.ok(page);
      await page.route("**/api/auth/register", async (route) => {
        body = route.request().postDataJSON();
        await route.fallback();
      });
      await mockVerifyEmail.ok(page, apiRole);
      await openDetails(page, label);
      await expect(page.getByTestId("chosen-role")).toContainText(label);
      await fillSignUp(page);
      await expect(page).toHaveURL(/\/sign-up\/verify$/);
      expect(body).toEqual({ email: EMAIL, password: PASSWORD, role: apiRole });
      await enterCode(page, "123456");
      await expect(page).toHaveURL(apiRole === "student" ? /\/app\/opportunities$/ : /\/company(\/vacancies)?$/);
    });
  }

  test("Change role keeps the role and the email, and Continue returns to the details", async ({ page }) => {
    await openDetails(page, "HR Representative");
    await page.getByLabel("Email").fill("kept@company.kz");
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Change role" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
    await expect(radio(page, "HR Representative")).toBeChecked();
    await radio(page, "Student").check({ force: true });
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByTestId("chosen-role")).toContainText("Student");
    await expect(page.getByLabel("Email")).toHaveValue("kept@company.kz");
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue(""); // the password is never kept
  });

  test("browser Back and Forward keep the role and the latest email", async ({ page }) => {
    await openDetails(page, "HR Representative");
    await page.getByLabel("Email").fill("first@company.kz");
    await page.getByLabel("Email").fill("second@company.kz");
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
    await expect(radio(page, "HR Representative")).toBeChecked();
    await page.goForward();
    await expect(page.getByTestId("chosen-role")).toContainText("HR Representative");
    await expect(page.getByLabel("Email")).toHaveValue("second@company.kz");
    await page.getByLabel("Email").fill("third@company.kz");
    await page.goBack();
    await page.goForward();
    await expect(page.getByLabel("Email")).toHaveValue("third@company.kz");
  });

  test("the typed email survives Change role and the browser Back that follows", async ({ page }) => {
    await openDetails(page);
    await page.getByLabel("Email").fill("typed@sdu.edu.kz");
    await page.getByRole("button", { name: "Change role" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
    await page.goBack();
    await expect(page.getByLabel("Email")).toHaveValue("typed@sdu.edu.kz");
  });

  test("Back from the code page returns to the details with the role and email", async ({ page }) => {
    await mockRegister.ok(page);
    await openDetails(page, "HR Representative");
    await fillSignUp(page, "back@company.kz");
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByTestId("chosen-role")).toContainText("HR Representative");
    await expect(page.getByLabel("Email")).toHaveValue("back@company.kz");
  });

  test("an error of one role does not follow the user to the next step", async ({ page }) => {
    await mockRegister.emailTaken(page);
    await openDetails(page);
    await fillSignUp(page);
    await expect(page.getByRole("alert").filter({ hasText: "An account with this email already exists" })).toBeVisible();
    await page.getByRole("button", { name: "Change role" }).click();
    await radio(page, "HR Representative").check({ force: true });
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByLabel("Email")).not.toHaveAttribute("aria-invalid", "true");
  });

  test("a direct visit shows the role step; a forged or unknown role in history is ignored", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
    await page.evaluate(() => window.history.replaceState({ usr: { role: "admin", email: 42 }, key: "forged", idx: 0 }, ""));
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  });

  test("a reload on the details step keeps the role; the password never enters history", async ({ page }) => {
    await mockRegister.ok(page);
    await openDetails(page, "HR Representative");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    expect(await historyState(page)).not.toContain(PASSWORD);
    await page.reload();
    await expect(page.getByTestId("chosen-role")).toContainText("HR Representative");
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await page.goBack();
    expect(await historyState(page)).not.toContain(PASSWORD);
  });

  test("a second submit while the first is running sends one request", async ({ page }) => {
    let requests = 0;
    await page.route("**/api/auth/register", async (route) => {
      requests += 1;
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ email: EMAIL, resend_in: 60, expires_in: 600 }) });
    });
    await openDetails(page);
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Password", { exact: true }).press("Enter");
    await page.getByLabel("Password", { exact: true }).press("Enter");
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    expect(requests).toBe(1);
  });

  for (const [label, apiRole, onboarding] of [["Student", "student", /\/onboarding(\?.*)?$/], ["HR Representative", "employer", /\/company\/onboarding(\?.*)?$/]] as const) {
    test(`a new ${apiRole} account without a profile lands on its onboarding after verification`, async ({ page }) => {
      await mockRegister.ok(page);
      await mockVerifyEmail.ok(page, apiRole, false);
      await openDetails(page, label);
      await fillSignUp(page);
      await enterCode(page, "123456");
      await expect(page).toHaveURL(onboarding);
    });
  }

  test("the verify request carries the chosen role", async ({ page }) => {
    let body: unknown;
    await mockRegister.ok(page);
    await mockVerifyEmail.ok(page, "employer");
    await page.route("**/api/auth/verify-email", async (route) => {
      body = route.request().postDataJSON();
      await route.fallback();
    });
    await openDetails(page, "HR Representative");
    await fillSignUp(page);
    await enterCode(page, "123456");
    await expect(page).toHaveURL(/\/company(\/vacancies)?$/);
    expect(body).toEqual({ email: EMAIL, code: "123456", role: "employer" });
  });

  test("Back, Change role and a resubmit that hits resend_too_soon verify with the new role", async ({ page }) => {
    let body: unknown;
    await mockRegister.ok(page);
    await openDetails(page, "Student");
    await fillSignUp(page);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await page.goBack();
    await page.getByRole("button", { name: "Change role" }).click();
    await radio(page, "HR Representative").check({ force: true });
    await page.getByRole("button", { name: "Continue" }).click();
    await mockRegister.tooSoon(page, 42);
    await fillSignUp(page);
    await expect(page.getByText("Wait before asking again")).toBeVisible();
    await mockVerifyEmail.ok(page, "employer");
    await page.route("**/api/auth/verify-email", async (route) => {
      body = route.request().postDataJSON();
      await route.fallback();
    });
    await enterCode(page, "123456");
    await expect(page).toHaveURL(/\/company(\/vacancies)?$/);
    expect(body).toEqual({ email: EMAIL, code: "123456", role: "employer" });
  });

  /** register that answers only when `release()` is called; `requests()` counts calls */
  async function holdRegister(page: Page) {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let requests = 0;
    await page.route("**/api/auth/register", async (route) => {
      requests += 1;
      if (requests === 1) await gate;
      await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ email: EMAIL, resend_in: 60, expires_in: 600 }) });
    });
    return { release, requests: () => requests };
  }

  test("a response that arrives after Change role does not navigate; submitting again works", async ({ page }) => {
    const held = await holdRegister(page);
    await openDetails(page);
    await fillSignUp(page);
    await expect.poll(held.requests).toBe(1);
    await page.getByRole("button", { name: "Change role" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
    held.release();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByRole("heading", { level: 1, name: "Choose your role" })).toBeVisible();
    await radio(page, "Student").check({ force: true });
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await fillSignUp(page);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    expect(held.requests()).toBe(2);
  });

  test("a response that arrives after leaving to the landing page does not open the code page", async ({ page }) => {
    const held = await holdRegister(page);
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Create account" }).click();
    await chooseRole(page);
    await fillSignUp(page);
    await expect.poll(held.requests).toBe(1);
    await page.goBack(); // role step
    await page.goBack(); // landing
    await expect(page.getByRole("heading", { level: 1, name: "Students and employers, connected by skills" })).toBeVisible();
    held.release();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Students and employers, connected by skills" })).toBeVisible();
    // and sign-up still works afterwards
    await page.getByRole("banner").getByRole("button", { name: "Create account" }).click();
    await chooseRole(page);
    await fillSignUp(page);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
  });

  test("a signed-in visit to /sign-up goes to the role's home", async ({ page }) => {
    await signedInAs(page, "student");
    await page.goto("/sign-up");
    await expect(page).toHaveURL(/\/app\/opportunities$/);
  });
});
