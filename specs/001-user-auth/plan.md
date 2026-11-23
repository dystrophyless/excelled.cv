# Implementation Plan: Sign up and sign in

**Branch**: `001-user-auth` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-user-auth/spec.md`

## Summary

Students and employers create an account (role + email + password), confirm the email with a 6-digit code, sign in,
sign out and reset a forgotten password with an emailed code. The feature is full-stack (spec FR-015): the existing
FastAPI auth (`/register`, `/verify-email`, `/token`) is extended with a role, a dedicated resend action, password
reset, 30-day revocable cookie sessions (replacing the 30-minute bearer JWT), per-email sign-in throttling, and role
guards; the SPA gets the auth screens (Auth archetype), a session-aware API client and role-based route guards.
Key decisions are in [research.md](./research.md): opaque DB sessions in an HttpOnly cookie (R1), Origin check
against CSRF (R2), same-origin via Vite proxy (R3), `["me"]` query as the only client auth state (R4).

## Technical Context

**Language/Version**: Python 3.13 (backend) · TypeScript 7 / React 19 (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2 (async, psycopg 3), pwdlib (argon2), pydantic-settings, resend ·
Vite 8, React Router 8, TanStack Query 5, Novio UI kit (`frontend/src/components/*`). PyJWT becomes unused for auth
(kept only if another module needs it).

**Storage**: PostgreSQL — changed tables `users`, `pending_users`; new `sessions`, `password_reset_requests`,
`sign_in_throttles` ([data-model.md](./data-model.md)). Schema applied with the existing `create_tables` script (R8).

**Testing**: pytest + pytest-asyncio + httpx (ASGI) on a separate PostgreSQL test DB (new dev dependencies) ·
Playwright + axe e2e with `page.route` API mocks (existing setup).

**Target Platform**: Linux server (API) · evergreen desktop and mobile browsers, 390–1440 px (SPA)

**Project Type**: Web application — FastAPI backend in `src/`, React SPA in `frontend/`

**Performance Goals**: auth endpoints answer in < 300 ms p95 excluding email delivery; password hashing stays at
pwdlib's recommended cost. UI meets spec SC-001 (sign-up < 2 min), SC-002 (sign-in < 20 s).

**Constraints**: no account-existence leaks (SC-005) — identical responses for known/unknown emails on sign-in,
reset and reset-resend; credentials never readable by JavaScript; same-origin deployment.

**Scale/Scope**: thousands of accounts; 6 screens; 4 changed + 5 new endpoints; 3 new tables.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Spec-driven delivery | spec + clarifications done; design runs after this plan (after_plan hook) before tasks | ✅ |
| II. One design system | all screens use the **Auth** archetype (`/styleguide/templates/auth`) and kit components; OTP via affect `OtpInput` | ✅ |
| III. Owner approves design first | `/speckit-design` → owner approval → `before_tasks` gate | ✅ (pending design step) |
| IV. States + e2e-ready | every screen: idle / submitting / field error / server error / success; e2e `frontend/e2e/auth.spec.ts`; API tests for security rules | ✅ |
| V. Verify, then claim | quickstart.md lists the exact commands; build, lint, lint:css, pytest, e2e must pass | ✅ |
| Technology | FastAPI + PostgreSQL + React SPA + TanStack Query, no new runtime frameworks | ✅ |
| Scope decisions in ia.md | one role per account, no messaging — respected | ✅ |

**Post-design re-check**: ✅ — the design artifacts add no new runtime frameworks; Zustand is intentionally not used
for auth (R4), which the constitution permits ("only for client state that outlives a page").

## UI Surface

| Screen | Route | Role | Archetype (proposed) | API it needs |
|--------|-------|------|----------------------|--------------|
| Sign in | `/sign-in` | Public | Auth | `POST /api/auth/token`, `GET /api/auth/me` |
| Sign up (role + email + password) | `/sign-up` | Public | Auth | `POST /api/auth/register` |
| Verify email (6-digit code, resend) | `/sign-up/verify` | Public | Auth | `POST /api/auth/verify-email`, `POST /api/auth/resend-code` |
| Forgot password (email) | `/reset-password` | Public | Auth | `POST /api/auth/password-reset/request` |
| Enter reset code (resend) | `/reset-password/verify` | Public | Auth | `POST /api/auth/password-reset/verify`, `POST /api/auth/resend-code` |
| Set new password (new + confirm) | `/reset-password/confirm` | Public | Auth | `POST /api/auth/password-reset/confirm` |
| Sign out (profile menu item, both roles) | — (header) | Student, Employer | — (existing AccountMenu) | `POST /api/auth/sign-out` |
| Route guards: signed-out → `/sign-in?next=…`; wrong role → own home; signed-in on auth pages → own home | `/app/*`, `/company/*`, auth routes | all | — (no screen) | `GET /api/auth/me` |

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── auth-api.md      # Phase 1
├── ui-spec.md           # /speckit-design (after_plan hook)
├── design/screens/      # approved screenshots (/speckit-design)
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/                                  # FastAPI backend (existing layout kept)
├── config.py                         # + FRONTEND_ORIGIN, ENVIRONMENT, SESSION_DAYS
├── main.py                           # + Origin-check middleware
├── auth/
│   ├── models.py                     # PendingUser(+role), PasswordResetRequest, Session, SignInThrottle
│   ├── schemas.py                    # role, resend, reset, account, error-detail schemas
│   ├── router.py                     # register/resend/verify/token/sign-out/me/password-reset
│   ├── codes.py                      # shared 6-digit code issue/verify/cooldown logic (from router + utils)
│   ├── sessions.py                   # create / resolve / revoke sessions, cookie helpers
│   ├── throttle.py                   # sign-in throttling (FR-009a)
│   ├── dependencies.py               # current_account, require_role
│   ├── emailer.py                    # + send_password_reset_email
│   ├── repository.py
│   └── utils.py                      # password + code hashing (JWT helpers removed)
├── users/
│   ├── models.py                     # User(+role, created_at, password_changed_at)
│   └── repository.py
└── scripts/create_tables.py          # + --reset-auth option
tests/
└── auth/                             # pytest: register, verify, resend, sign-in + throttle, reset + revocation, me/sign-out, origin check

frontend/src/
├── lib/api.ts                        # fetch wrapper: credentials, JSON, typed ApiError(code)
├── features/auth/
│   ├── views/                        # SignInView, SignUpView, VerifyEmailView, ResetRequestView, ResetConfirmView (designer)
│   ├── mocks.ts                      # (designer)
│   ├── api.ts                        # auth endpoints + query keys
│   ├── hooks.ts                      # useMe, useSignIn, useSignUp, useVerifyEmail, useResendCode, useResetRequest, useResetConfirm, useSignOut
│   ├── guards.tsx                    # RequireRole, RedirectIfSignedIn
│   └── *Page.tsx                     # containers wiring hooks → views (builder)
├── prototypes/001-user-auth.tsx      # (designer)
└── app/router.tsx                    # replace demo /sign-in, /sign-up routes; add verify + reset routes; guard /app, /company
frontend/vite.config.ts               # + server.proxy /api → :8000
frontend/e2e/auth.spec.ts             # Playwright + axe, API mocked
```

**Structure Decision**: Web application on the existing layout — backend stays in `src/` (no move to `backend/`),
frontend in `frontend/`. Auth logic is split out of the 300-line `router.py` into `codes.py`, `sessions.py`,
`throttle.py`, `dependencies.py` so each security rule is small and testable.

## Complexity Tracking

> No constitution violations. Recorded deviations from "simplest possible":

| Choice | Why needed | Simpler alternative rejected because |
|---|---|---|
| DB-backed sessions instead of the existing stateless JWT | spec requires 30-day sessions that a password reset can revoke (FR-013/014) | stateless JWT cannot be revoked without an equivalent server-side store |
| `sign_in_throttles` table | throttle must survive restarts and work with several workers, and must count unknown emails (SC-005) | in-memory counters reset on restart and differ per worker |
