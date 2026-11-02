---
description: "Task list for 001-user-auth — Sign up and sign in"
---

# Tasks: Sign up and sign in

**Input**: Design documents from `/specs/001-user-auth/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-api.md, quickstart.md, ui-spec.md (**Approved 2026-10-30**)

**Tests**: REQUIRED. The constitution (IV, V) and plan.md ask for API tests on the security rules (pytest, research R10) and
for an e2e test per user story with UI (Playwright + axe, `design-system/quality.md`). Backend tests are written first and
must fail before the implementation task that follows them.

**Organization**: Tasks are grouped by user story (spec.md) so each story can be implemented and tested on its own.

## Novio UI rules for tasks

- UI tasks start only after `ui-spec.md` is **Approved** (it is).
- Each UI task names the ui-spec screen (S1…S6) and the approved View in `frontend/src/features/auth/views/`, and is owned
  by the `ui-builder` agent (marked **(ui-builder)**). Views are wired, not redesigned. Do not edit the View files,
  `auth-parts.tsx`, `auth.module.css`, `mocks.ts` or the prototype; if a View needs a change, stop and ask for a
  `/speckit-design` round.
- The API error → View state mapping is ui-spec §4 ("Mapping for the builder"). Copy, test hooks and guards are in ui-spec §2.
- Every user story with UI gets e2e coverage in `frontend/e2e/auth.spec.ts` (happy path, error states, axe, 390 px with no
  horizontal scroll), with the API mocked by `page.route`.
- Final task of the feature: run `/speckit-design-qa`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US4 from spec.md

## Path conventions

Web app on the existing layout: backend `src/`, backend tests `tests/`, frontend `frontend/src/`, e2e `frontend/e2e/`.
API base path `/api/auth`. Contract = `specs/001-user-auth/contracts/auth-api.md`.

---

## Phase 1: Setup (shared infrastructure)

**Purpose**: dependencies, settings and test harness.

- [X] T001 Add dev dependencies `pytest`, `pytest-asyncio`, `httpx` with `uv add --dev pytest pytest-asyncio httpx`, and a `[tool.pytest.ini_options]` block (`asyncio_mode = "auto"`, `testpaths = ["tests"]`) in `pyproject.toml`
- [X] T002 Add settings `FRONTEND_ORIGIN: str` (e.g. `http://localhost:5173`), `ENVIRONMENT: Literal["development", "production"] = "production"` and `SESSION_DAYS: int = 30` to `src/config.py` (research R1–R3). Do not print or commit `.env`.
- [X] T003 [P] Add `server.proxy` forwarding `/api` → `http://localhost:8000` (`changeOrigin: false`, so the `Origin` header stays `http://localhost:5173`) in `frontend/vite.config.ts` (research R3)
- [X] T004 [P] Create the pytest harness in `tests/__init__.py`, `tests/auth/__init__.py` and `tests/conftest.py`: engine on `TEST_DATABASE_URL` (skip the whole suite with a clear message if unset), drop + create all tables per test session and truncate between tests, an `httpx.AsyncClient(transport=ASGITransport(app), base_url="http://test")` fixture that sends `Origin: <FRONTEND_ORIGIN>` by default, and a fixture that patches the emailer to capture `(to, code)` instead of calling Resend (research R10)

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: schema, shared security code, error shape, `/me`, the API client and guards. Every story needs these.

**⚠️ No user-story work starts until this phase is done.**

### Backend

- [X] T005 Change `User` in `src/users/models.py`: add enum `UserRole` (`student` | `employer`, Postgres enum `user_role`), `role` "`user_role` NOT NULL", `created_at` "timestamptz, default now()", `password_changed_at` "timestamptz, nullable — set on reset"; email "lower-cased on write" (data-model.md `users`)
- [X] T006 Change and add models in `src/auth/models.py` (data-model.md): `PendingUser` + `role` "`user_role` NOT NULL — copied to `users.role` on verification"; new `PasswordResetRequest` (`user_id` "FK → users.id, unique, ON DELETE CASCADE", `hashed_code`, `expires_at`, `attempts` "default 0", `last_sent_at`, `verified_at` "nullable", `reset_token_hash` "char(64), nullable, unique", `reset_token_expires_at` "nullable", `created_at`); new `Session` (`id` uuid PK, `user_id` "FK → users.id, indexed, ON DELETE CASCADE", `token_hash` "char(64), unique, indexed", `created_at`, `expires_at`, `revoked_at` "nullable", `last_seen_at`, `user_agent` "text, nullable, ≤ 255 chars"); new `SignInThrottle` (`email` "text PK, normalised (lower-cased, trimmed)", `failed_count` "int, default 0", `locked_until` "timestamptz, nullable", `updated_at`). All timestamps `timestamptz` UTC.
- [X] T007 Add a `--reset-auth` option to `src/scripts/create_tables.py` that drops and recreates `users`, `pending_users`, `password_reset_requests`, `sessions`, `sign_in_throttles` and the `user_role` enum (research R8; dev data only)
- [X] T008 [P] Rework `src/auth/utils.py`: keep password hashing (pwdlib) and code hashing (HMAC-SHA256 of `email:code`, constant-time compare); add `new_token() -> str` (32 random bytes, URL-safe base64) and `hash_token(token) -> str` (SHA-256 hex); add `normalize_email()` (strip + lower); remove the JWT helpers and the broken `verify_access_token` (research R9)
- [X] T009 [P] Add the API error helper to `src/auth/exceptions.py`: `api_error(status, code, message, **extra)` raising `HTTPException(detail={"code", "message", **extra})` — error shape from the contract; keep `EmailDeliveryError`
- [X] T010 [P] Update `src/auth/schemas.py`: `Role` literal, `AccountOut {id, email, role}`, `AccountResponse {account}`, `RegisterIn {email, password (8–64), role}`, `ResendIn {email, purpose: "sign_up" | "password_reset"}`, `VerifyIn {email, code (6 digits)}`, `ResetRequestIn {email}`, `ResetVerifyIn {email, code}`, `ResetVerifyOut {reset_token, expires_in}`, `ResetConfirmIn {reset_token, password (8–64)}`, `CodeSentOut {resend_in, expires_in}`; password length is the only rule (FR-002)
- [X] T011 Create `src/auth/codes.py` with the shared code logic moved out of `src/auth/router.py`: issue (6 digits from `secrets`, `expires_at = now + 10 min`, `attempts = 0`, `last_sent_at = now`), `cooldown_left(row) -> int` (60 s), and `check(row, email, code)` returning ok / `invalid_code` with `attempts_left` / `too_many_attempts` (3rd wrong code; caller deletes the row) / `code_expired`. Fix research R9: use `status.HTTP_429_TOO_MANY_REQUESTS` and the real attribute names `hashed_password` / `hashed_code`
- [X] T012 Create `src/auth/sessions.py`: `create_session(db, user, user_agent) -> raw_token` (stores only `hash_token`, `expires_at = now + SESSION_DAYS`, `user_agent` cut to 255), `resolve(db, raw) -> (session, user) | None` (valid when `revoked_at IS NULL AND expires_at > now()`; bump `last_seen_at` at most once per hour), `revoke(db, session)`, `revoke_all_except(db, user_id, keep_id)`, and `set_cookie(response, raw)` / `clear_cookie(response)` for `novio_session` (`HttpOnly; SameSite=Lax; Path=/api; Max-Age=2592000`, `Secure` unless `ENVIRONMENT=development`) (research R1)
- [X] T013 Create `src/auth/dependencies.py`: `current_account` (reads the cookie via `sessions.resolve`, else 401 `not_signed_in`) and `require_role(*roles)` (401 `not_signed_in` / 403 `wrong_role`) (contract "Role guard", research R7)
- [X] T014 Add the Origin-check middleware to `src/main.py`: for `POST/PUT/PATCH/DELETE` under `/api`, `Origin` (or, if absent, the origin of `Referer`) must equal `FRONTEND_ORIGIN`, otherwise 403 `{detail:{code:"origin_not_allowed"}}` (research R2)
- [X] T015 Write failing tests in `tests/auth/test_session_basics.py`: `GET /api/auth/me` → 401 `not_signed_in` without a cookie, with an expired session and with a revoked session; 200 `{account}` with a valid session (create it through `sessions.create_session` directly); a POST with a foreign `Origin` → 403 `origin_not_allowed`; `require_role("student")` on a test-only route → 403 `wrong_role` for an employer
- [X] T016 Add `GET /me` to `src/auth/router.py` returning `{account}` via `current_account`; make T015 pass

### Frontend

- [X] T017 [P] Create `frontend/src/lib/api.ts` (ui-builder): `fetch` wrapper with `credentials: "include"`, JSON in/out, form-encoded option for `/token`, and a typed `ApiError { status, code, message, retryAfter?, attemptsLeft? }`; network failure → `ApiError` with `code: "network"` (research R3)
- [X] T018 Create `frontend/src/features/auth/api.ts` (ui-builder): typed functions for every endpoint in the contract (`me`, `signIn`, `signOut`, `register`, `resendCode`, `verifyEmail`, `resetRequest`, `resetVerify`, `resetConfirm`), `Account` type, and query key `["me"]`
- [X] T019 Create `frontend/src/features/auth/hooks.ts` (ui-builder) with `useMe()` (`["me"]` query; 401 → `null`, no retry on 401) and `homeFor(role)` (`student` → `/app`, `employer` → `/company`). `["me"]` is the only client auth state — no Zustand, no token storage (research R4)
- [X] T020 Create `frontend/src/features/auth/guards.tsx` (ui-builder): `RequireRole({ role })` (loading → nothing; signed out → `/sign-in?next=<path+search>`; wrong role → `homeFor(own role)`) and `RedirectIfSignedIn` (signed in → `homeFor(role)`) (research R7, spec edge cases)
- [X] T021 [P] Create `frontend/e2e/support/auth-api.ts` (ui-builder): `page.route` helpers that mock each `/api/auth/*` endpoint with contract-shaped bodies (success and every error code), plus a `signedInAs(page, role)` helper that mocks `/me`

**Checkpoint**: schema, sessions, `/me`, guards and the API client exist. `uv run pytest tests/auth -q` passes; `npm run build` passes.

---

## Phase 3: User Story 1 — Student creates an account (P1) 🎯 MVP

**Goal**: a visitor chooses "I'm a student", signs up with email + password, enters the 6-digit code and lands on `/app`, signed in.

**Independent test**: quickstart scenarios 1–5; `auth.spec.ts` US1 block passes.

### Tests for US1 (write first, must fail)

- [X] T022 [P] [US1] Write `tests/auth/test_sign_up.py`: `/register` with `role` → 202 `{email, resend_in: 60, expires_in: 600}` and one captured email; email stored lower-cased ("Maya@SDU.edu.kz" == "maya@sdu.edu.kz"); 409 `email_taken` for an existing account; 429 `resend_too_soon` + `retry_after` within 60 s; repeating `/register` after the cooldown replaces password, role and code (old code stops working); `/resend-code` `sign_up` → 202, 429 `resend_too_soon` in cooldown, 404 `nothing_pending` with no pending sign-up, resets `attempts` to 0; `/verify-email` → 200 `{account}` with role `student` + `Set-Cookie novio_session` (HttpOnly, Path=/api, Max-Age=2592000) and the pending row deleted; wrong code → 400 `invalid_code` `attempts_left` 2 then 1; 3rd wrong → 400 `too_many_attempts` and the row deleted; > 10 min → 400 `code_expired`; unknown email → 400 `nothing_pending`; afterwards `/me` with that cookie → 200

### Implementation for US1

- [X] T023 [US1] Rewrite `POST /register` in `src/auth/router.py` with `codes.py`: accept `role`, normalise email, 409 `email_taken`, 429 `resend_too_soon` + `retry_after`, replace an existing pending sign-up after the cooldown, 202 `{email, resend_in, expires_in}`; errors via `api_error` (contract `/register`)
- [X] T024 [US1] Add `POST /resend-code` for `purpose: "sign_up"` in `src/auth/router.py` (202 / 404 `nothing_pending` / 429 `resend_too_soon`; resets `attempts` and `expires_at`). The `password_reset` branch comes in T045
- [X] T025 [US1] Rewrite `POST /verify-email` in `src/auth/router.py`: on success create the `User` with the pending role, delete the pending row, create a session and set the cookie, return `{account}`; errors `invalid_code` / `too_many_attempts` / `code_expired` / `nothing_pending`. Make T022 pass
- [X] T026 [US1] Add `useSignUp`, `useResendCode`, `useVerifyEmail` to `frontend/src/features/auth/hooks.ts` (ui-builder); verify success writes `["me"]` with `setQueryData`
- [X] T027 [US1] Create `frontend/src/features/auth/SignUpPage.tsx` (ui-builder) wiring **S2** `SignUpView`: submit → 202 navigates to `/sign-up/verify` with `{email, resendIn}` in navigation state; `email_taken` → `email-taken`; 429 `resend_too_soon` → navigate to S3 with `resendIn = retry_after` (`resend-cooldown`); 422 → `field-errors`; network/5xx → `server-error` (ui-spec §2 S2, §4 mapping)
- [X] T028 [US1] Create `frontend/src/features/auth/VerifyEmailPage.tsx` (ui-builder) wiring **S3** `VerifyEmailView`: no email in navigation state → redirect to `/sign-up`; code → `verifying` → `success` → `homeFor(role)`; `invalid_code`+`attempts_left` → `invalid-code`; `code_expired` → `expired`; `too_many_attempts` → `too-many-attempts` ("Start again" → `/sign-up` with email prefilled); `nothing_pending` → `nothing-pending`; resend → `resent` / `resend-cooldown`; mount OtpInput idle then switch status (ui-spec §2 S3, §4)
- [X] T029 [US1] Replace the demo `/sign-up` route in `frontend/src/app/router.tsx` with `SignUpPage` and add `/sign-up/verify` → `VerifyEmailPage`, both inside `RedirectIfSignedIn` (ui-builder)
- [X] T030 [US1] Write the US1 block of `frontend/e2e/auth.spec.ts` (ui-builder): student sign-up happy path → `/app`; wrong code twice ("2 tries left", "1 try left"); resend countdown; `email_taken` offers Sign in / Reset password; paste of 6 digits fills all boxes; `server-error` keeps the form filled; axe on S2 and S3; 390 px no horizontal scroll

**Checkpoint**: a student can create an account end to end (quickstart 1–5).

---

## Phase 4: User Story 2 — Returning user signs in (P1)

**Goal**: sign in with email + password, land on the role's home or the `next` page; log out; the 5-failure pause.

**Independent test**: quickstart scenarios 6 and 10; `auth.spec.ts` US2 block passes.

### Tests for US2 (write first, must fail)

- [X] T031 [P] [US2] Write `tests/auth/test_sign_in.py`: `/token` (form-encoded) → 200 `{account}` + cookie; wrong password and unknown email → identical 400 `invalid_credentials`; email case-insensitive; 5 failures in a row (known **and** unknown email) → 429 `sign_in_locked` with `retry_after` ≤ 900 and the correct password refused during the pause; success deletes the throttle row; `/sign-out` → 204, clears the cookie (`Max-Age=0`), revokes the session (`/me` → 401 with the old cookie), idempotent without a cookie

### Implementation for US2

- [X] T032 [US2] Create `src/auth/throttle.py` (FR-009a, data-model `sign_in_throttles`): `check(db, email) -> retry_after | None` (while `locked_until > now()` answer without checking the password), `fail(db, email)` (`failed_count += 1`; at 5 → `locked_until = now + 15 min` and reset the count), `clear(db, email)` (delete the row)
- [X] T033 [US2] Rewrite `POST /token` in `src/auth/router.py`: throttle check → 429 `sign_in_locked` + `retry_after`; verify the password (run a dummy hash for unknown emails so timing matches); failure → `throttle.fail` + 400 `invalid_credentials`; success → `throttle.clear`, create session, set cookie, `{account}`. Remove `OAuth2PasswordBearer(tokenUrl="/auth/token")` (research R9)
- [X] T034 [US2] Add `POST /sign-out` to `src/auth/router.py` (revoke the current session if any, `clear_cookie`, always 204). Make T031 pass
- [X] T035 [US2] Add `useSignIn` and `useSignOut` to `frontend/src/features/auth/hooks.ts` (ui-builder): sign-in success writes `["me"]`; sign-out clears the whole query cache and navigates to `/sign-in`
- [X] T036 [US2] Create `frontend/src/features/auth/SignInPage.tsx` (ui-builder) wiring **S1** `SignInView`: success → `next` (only same-origin paths starting with `/`) or `homeFor(role)`; `invalid_credentials` → `invalid` with the email kept; `sign_in_locked` → `locked` + `retryAfter`; 422 → `field-errors`; network/5xx → `server-error`; while locked, Sign in stays enabled and re-announces the Alert without a request (ui-spec §2 S1)
- [X] T037 [US2] In `frontend/src/app/router.tsx` (ui-builder): replace the demo `/sign-in` route with `SignInPage` inside `RedirectIfSignedIn`; wrap every `/app/*` route in `RequireRole role="student"` + `StudentLayout` and every `/company/*` route in `RequireRole role="employer"` + `EmployerLayout` (demo pages stay as they are inside the guard)
- [X] T038 [US2] Wire "Log out" in `frontend/src/app/layouts/layouts.tsx` (ui-builder): `StudentLayout` and `EmployerLayout` call `useSignOut`, and `AccountMenu` shows the real email from `useMe()` (keep the demo name / setup until the profile features exist)
- [X] T039 [US2] Write the US2 block of `frontend/e2e/auth.spec.ts` (ui-builder): student and employer sign in → own home; `invalid_credentials` keeps the email; locked shows the countdown and reset link; signed-out visit to `/app/applications` → sign in → back to `/app/applications`; Log out → `/sign-in` and `/app` redirects to sign-in; signed-in visit to `/sign-in` → own home; axe on S1; 390 px

**Checkpoint**: US1 + US2 work; protected pages require a session (quickstart 6, 10).

---

## Phase 5: User Story 3 — Employer creates an account (P2)

**Goal**: "I'm hiring" sign-up lands on `/company`; each role is kept out of the other role's pages.

**Independent test**: quickstart scenario 9; `auth.spec.ts` US3 block passes.

- [X] T040 [P] [US3] Add employer cases to `tests/auth/test_sign_up.py`: `/register` with `role: "employer"` → `/verify-email` returns role `employer` and `users.role = employer`; an invalid role → 422; `require_role("employer")` accepts it and `require_role("student")` → 403 `wrong_role`
- [X] T041 [US3] Make T040 pass in `src/auth/router.py` / `src/auth/dependencies.py` if anything fails (the role path is built in T023/T025 and T013 — this task is the verification, not new code)
- [X] T042 [US3] Check in `frontend/src/features/auth/SignUpPage.tsx` and `VerifyEmailPage.tsx` (ui-builder) that the **S2** "I'm hiring" segment sends `role: "employer"` and S3 success goes to `/company`; fix only the wiring if not
- [X] T043 [US3] Write the US3 block of `frontend/e2e/auth.spec.ts` (ui-builder): employer sign-up → `/company`; signed-in employer opening `/app` → `/company`; signed-in student opening `/company/vacancies` → `/app`

**Checkpoint**: both roles sign up and are kept to their own pages (quickstart 9).

---

## Phase 6: User Story 4 — User resets a forgotten password (P2)

**Goal**: email → code on its own screen → new password twice → signed in here, other devices signed out.

**Independent test**: quickstart scenarios 7, 8, 8a; `auth.spec.ts` US4 block passes.

### Tests for US4 (write first, must fail)

- [X] T044 [P] [US4] Write `tests/auth/test_password_reset.py`: `/password-reset/request` → always 202 `{resend_in, expires_in}` for an existing email, an unknown email and inside the cooldown, with an email captured only in the first case (SC-005); `/resend-code` `password_reset` → always 202, same neutrality; `/password-reset/verify` → 200 `{reset_token, expires_in: 600}` for the right code, `invalid_code` with `attempts_left`, `too_many_attempts` on the 3rd wrong code (row deleted), `code_expired`, and `too_many_attempts` for an email with no pending reset; `/password-reset/confirm` with the token → 200 `{account}` + new cookie, the old password fails on `/token`, the new one works, a second session of the same user gets 401 on `/me`, the throttle row is deleted, `password_changed_at` is set; reusing the token, an unknown token and a token older than 10 min → 400 `reset_token_invalid`; a reset works while sign-in is locked

### Implementation for US4

- [X] T045 [US4] Add `send_password_reset_email(to, code)` to `src/auth/emailer.py` (same sender as the sign-up code, its own subject and wording, English) and the `password_reset` branch of `/resend-code` in `src/auth/router.py` (always 202; nothing sent with no account or in cooldown)
- [X] T046 [US4] Add `POST /password-reset/request` to `src/auth/router.py`: always 202; account exists and no code in the last 60 s → issue a code (one `PasswordResetRequest` row per account, replace an older one) and send it; otherwise send nothing (contract, research R6)
- [X] T047 [US4] Add `POST /password-reset/verify` to `src/auth/router.py`: check the code with `codes.check`; on success set `verified_at`, issue a reset token (`new_token`, store `hash_token` in `reset_token_hash`, `reset_token_expires_at = verified_at + 10 min`) and return `{reset_token, expires_in: 600}`; no pending reset → 400 `too_many_attempts`
- [X] T048 [US4] Add `POST /password-reset/confirm` to `src/auth/router.py`: look up by `hash_token(reset_token)` with `reset_token_expires_at > now()`, else 400 `reset_token_invalid`; replace `hashed_password`, set `password_changed_at`, delete the reset row (single use), `throttle.clear`, create a session for this device, `revoke_all_except(user, new_session)`, set the cookie, return `{account}`. Make T044 pass
- [X] T049 [US4] Add `useResetRequest`, `useResetVerify`, `useResetConfirm` to `frontend/src/features/auth/hooks.ts` (ui-builder); confirm success writes `["me"]`
- [X] T050 [P] [US4] Create `frontend/src/features/auth/ResetRequestPage.tsx` (ui-builder) wiring **S4** `ResetRequestView`: 202 → navigate to `/reset-password/verify` with `{email}`; 422 → `field-errors`; network/5xx → `server-error`; email prefilled from navigation state when coming back from S5/S6 or from S1 "Forgot password?" (ui-spec §2 S4)
- [X] T051 [P] [US4] Create `frontend/src/features/auth/ResetVerifyPage.tsx` (ui-builder) wiring **S6** `ResetVerifyView`: no email in navigation state → redirect to `/reset-password`; 200 → navigate to `/reset-password/confirm` with `{email, resetToken}` in navigation state (never in the URL); `invalid_code` → `invalid-code`; `code_expired` → `expired`; `too_many_attempts` → `too-many-attempts` ("Request a new code" → S4 with the email); resend → `resent` (ui-spec §2 S6, §4)
- [X] T052 [P] [US4] Create `frontend/src/features/auth/ResetConfirmPage.tsx` (ui-builder) wiring **S5** `ResetConfirmView`: no `resetToken` in navigation state → redirect to `/reset-password`; `onSubmit({password})` → `submitting` → `success` → `homeFor(role)`; `reset_token_invalid` → `link-expired` ("Start again" → S4); 422 → `invalid-password`; network/5xx → `server-error`; the match check stays inside the View (ui-spec §2 S5, §4)
- [X] T053 [US4] Add `/reset-password`, `/reset-password/verify`, `/reset-password/confirm` to `frontend/src/app/router.tsx` (ui-builder) inside `RedirectIfSignedIn`
- [X] T054 [US4] Write the US4 block of `frontend/e2e/auth.spec.ts` (ui-builder): Forgot password → code → new password twice → signed in at role home; S6 `invalid-code` and `too-many-attempts`; S5 mismatch blocks submit with "Passwords don't match"; `reset_token_invalid` → "Your reset session expired"; direct visit to `/reset-password/confirm` and `/reset-password/verify` → `/reset-password` (quickstart 8a); axe on S4, S6, S5; 390 px

**Checkpoint**: all four stories work independently.

---

## Phase 7: Polish & cross-cutting

- [X] T055 [P] Remove `pyjwt` from `pyproject.toml` with `uv remove pyjwt` if nothing in `src/` imports `jwt` any more (plan Technical Context)
- [X] T056 [P] Remove auth-only demo leftovers (ui-builder): the `/sign-up` → `/sign-in?state=sign-up` redirect is gone (T029); make sure `PublicLayout` "Sign in" / "Sign up" buttons and the landing CTAs reach the real pages, and update the "DEMO ROUTES" note in `frontend/src/app/router.tsx`
- [X] T057 Run the automated checks from `specs/001-user-auth/quickstart.md`: `uv run pytest tests/auth -q`, `cd frontend && npm run build && npm run lint && npm run lint:css`, `npm run test:e2e -- e2e/auth.spec.ts`, plus the existing `e2e/design-system.spec.ts`; all must pass (report real output)
- [X] T058 Walk through quickstart manual scenarios 1–11 against the real API and email (`uv run python -m src.scripts.create_tables --reset-auth` first); note any failure in this file — verified manually by the owner on 2026-11-02 (all scenarios work)
- [X] T059 Run `/speckit-design-qa` (design-qa agent → `specs/001-user-auth/design/qa-report.md`) and fix what it reports

---

## Dependencies & execution order

### Phase dependencies

- **Setup (1)** → **Foundational (2)** → user stories → **Polish (7)**.
- Foundational blocks every story (models, `codes.py`, `sessions.py`, `/me`, `api.ts`, guards).

### User story dependencies

- **US1 (P1)**: after Phase 2. No dependency on other stories.
- **US2 (P1)**: after Phase 2. Independent of US1 for the backend; its e2e mocks the API, so it does not need US1 either. Route guards for `/app` and `/company` land here (T037).
- **US3 (P2)**: after US1 (reuses `/register`, `/verify-email`, SignUpPage, VerifyEmailPage) and T037 (guards).
- **US4 (P2)**: after Phase 2; uses `throttle.clear` from US2 (T032), so do T032 first or alongside.

### Within each story

- Backend: failing tests → endpoint code → tests pass.
- Frontend: hooks → pages → routes → e2e.
- `src/auth/router.py`, `frontend/src/features/auth/hooks.ts`, `frontend/src/app/router.tsx` and `frontend/e2e/auth.spec.ts` are shared files — tasks touching them run one at a time.

### Parallel opportunities

- Setup: T003 and T004.
- Foundational: T008, T009, T010 together; T017 and T021 alongside the backend.
- In each story the backend test task ([P]) can be written while the frontend pages are built.
- US4: T050, T051, T052 (three different page files).
- Backend (developer / main session) and frontend (ui-builder) streams of one story can run at the same time; they meet in the e2e task, which mocks the API, and in quickstart scenarios.

---

## Parallel example: User Story 4

```text
Task: "Write tests/auth/test_password_reset.py"                         (T044, backend)
Task: "Create ResetRequestPage.tsx wiring S4"                           (T050, ui-builder)
Task: "Create ResetVerifyPage.tsx wiring S6"                            (T051, ui-builder)
Task: "Create ResetConfirmPage.tsx wiring S5"                           (T052, ui-builder)
```

---

## Implementation strategy

### MVP first (US1 + US2, both P1)

1. Phase 1 Setup → Phase 2 Foundational.
2. Phase 3 US1 → validate with quickstart 1–5.
3. Phase 4 US2 → validate with quickstart 6, 10. **Stop and demo**: students can sign up, sign in and log out.

### Incremental delivery

4. US3 (employer sign-up, role separation) → quickstart 9.
5. US4 (password reset) → quickstart 7, 8, 8a.
6. Phase 7 polish, full checks, `/speckit-design-qa`.

## Notes

- Never print or commit `.env`; tests use `TEST_DATABASE_URL`, never the dev database.
- Commit after each phase or logical group.
- Owner-approved design is fixed: wiring problems are fixed in pages, design problems go back through `/speckit-design`.
