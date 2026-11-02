import type { Page, Route } from "@playwright/test";

/*
 * page.route mocks for /api/auth/* — bodies follow specs/001-user-auth/contracts/auth-api.md.
 * Every helper registers one endpoint; call it before page.goto(). Later registrations win (Playwright semantics),
 * so a test can override a default with a specific error.
 */

export type Role = "student" | "employer";
export type MockAccount = { id: number; email: string; role: Role };

export const account = (role: Role = "student", email = "maya@sdu.edu.kz"): MockAccount => ({ id: 42, email, role });

const json = (route: Route, status: number, body?: unknown) =>
  route.fulfill(body === undefined ? { status } : { status, contentType: "application/json", body: JSON.stringify(body) });

const err = (route: Route, status: number, code: string, extra: Record<string, unknown> = {}) =>
  json(route, status, { detail: { code, message: `mock ${code}`, ...extra } });

const at = (page: Page, method: string, path: string, handler: (route: Route) => Promise<void>) =>
  page.route(`**/api/auth/${path}`, (route) => (route.request().method() === method ? handler(route) : route.fallback()));

const CODE_SENT = { resend_in: 60, expires_in: 600 };

/** GET /me → 200 signed in as `role`. */
export const signedInAs = (page: Page, role: Role = "student", email?: string) =>
  at(page, "GET", "me", (r) => json(r, 200, { account: account(role, email) }));

/** GET /me → 401 not_signed_in. */
export const signedOut = (page: Page) => at(page, "GET", "me", (r) => err(r, 401, "not_signed_in"));

export const mockMe = { signedInAs, signedOut };

export const mockSignIn = {
  ok: (page: Page, role: Role = "student") => at(page, "POST", "token", (r) => json(r, 200, { account: account(role) })),
  invalidCredentials: (page: Page) => at(page, "POST", "token", (r) => err(r, 400, "invalid_credentials")),
  locked: (page: Page, retryAfter = 900) => at(page, "POST", "token", (r) => err(r, 429, "sign_in_locked", { retry_after: retryAfter })),
  network: (page: Page) => at(page, "POST", "token", (r) => r.abort("failed")),
};

export const mockSignOut = {
  ok: (page: Page) => at(page, "POST", "sign-out", (r) => json(r, 204)),
};

export const mockRegister = {
  ok: (page: Page) => at(page, "POST", "register", (r) => json(r, 202, { email: "maya@sdu.edu.kz", ...CODE_SENT })),
  emailTaken: (page: Page) => at(page, "POST", "register", (r) => err(r, 409, "email_taken")),
  tooSoon: (page: Page, retryAfter = 42) => at(page, "POST", "register", (r) => err(r, 429, "resend_too_soon", { retry_after: retryAfter })),
  validation: (page: Page) =>
    at(page, "POST", "register", (r) => json(r, 422, { detail: [{ loc: ["body", "password"], msg: "too short", type: "string_too_short" }] })),
  network: (page: Page) => at(page, "POST", "register", (r) => r.abort("failed")),
};

export const mockResendCode = {
  ok: (page: Page) => at(page, "POST", "resend-code", (r) => json(r, 202, CODE_SENT)),
  nothingPending: (page: Page) => at(page, "POST", "resend-code", (r) => err(r, 404, "nothing_pending")),
  tooSoon: (page: Page, retryAfter = 42) => at(page, "POST", "resend-code", (r) => err(r, 429, "resend_too_soon", { retry_after: retryAfter })),
};

export const mockVerifyEmail = {
  ok: (page: Page, role: Role = "student") => at(page, "POST", "verify-email", (r) => json(r, 200, { account: account(role) })),
  invalidCode: (page: Page, attemptsLeft = 2) => at(page, "POST", "verify-email", (r) => err(r, 400, "invalid_code", { attempts_left: attemptsLeft })),
  tooManyAttempts: (page: Page) => at(page, "POST", "verify-email", (r) => err(r, 400, "too_many_attempts")),
  codeExpired: (page: Page) => at(page, "POST", "verify-email", (r) => err(r, 400, "code_expired")),
  nothingPending: (page: Page) => at(page, "POST", "verify-email", (r) => err(r, 400, "nothing_pending")),
};

/** Always 202 — the contract never reveals whether the account exists. */
export const mockResetRequest = {
  ok: (page: Page) => at(page, "POST", "password-reset/request", (r) => json(r, 202, CODE_SENT)),
};

export const mockResetVerify = {
  ok: (page: Page) => at(page, "POST", "password-reset/verify", (r) => json(r, 200, { reset_token: "mock-reset-token", expires_in: 600 })),
  invalidCode: (page: Page, attemptsLeft = 2) => at(page, "POST", "password-reset/verify", (r) => err(r, 400, "invalid_code", { attempts_left: attemptsLeft })),
  tooManyAttempts: (page: Page) => at(page, "POST", "password-reset/verify", (r) => err(r, 400, "too_many_attempts")),
  codeExpired: (page: Page) => at(page, "POST", "password-reset/verify", (r) => err(r, 400, "code_expired")),
};

export const mockResetConfirm = {
  ok: (page: Page, role: Role = "student") => at(page, "POST", "password-reset/confirm", (r) => json(r, 200, { account: account(role) })),
  tokenInvalid: (page: Page) => at(page, "POST", "password-reset/confirm", (r) => err(r, 400, "reset_token_invalid")),
};
