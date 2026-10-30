# Research: Sign up and sign in

Phase 0 of [plan.md](./plan.md). Each decision resolves an open technical question from the spec
(FR-014 sessions, FR-009a throttling, FR-013 reset, FR-015 full-stack scope).

## R1. Session mechanism for 30-day, individually revocable sessions (FR-014, FR-013)

- **Decision**: Opaque random session token (32 bytes, URL-safe) stored **only as a SHA-256 hash** in a new
  `sessions` table; sent to the browser as an `HttpOnly; Secure; SameSite=Lax; Path=/api` cookie named
  `novio_session`, `Max-Age` 30 days. Every authenticated request looks the hash up (indexed) and checks
  `revoked_at IS NULL AND expires_at > now()`. Sign-out revokes the row; password reset revokes all rows of the
  account except the current one.
- **Rationale**: Revocation is a core requirement (reset must sign out other devices). With opaque DB sessions it
  is one UPDATE; with stateless JWTs it needs a denylist or refresh-token rotation anyway. An HttpOnly cookie keeps the
  credential out of JavaScript (XSS cannot read it) and the SPA needs no token storage at all. The lookup cost is
  negligible at Novio's scale (thousands of users, one indexed primary-key-sized lookup per request).
- **Alternatives considered**:
  - *Short JWT access token + rotating refresh token*: industry-standard for multi-service APIs, but two token types,
    rotation, reuse detection and a denylist for 30-day revocation — far more moving parts for one backend.
  - *Keep the current 30-minute bearer JWT in localStorage*: fails FR-014 (30 days) and FR-013 (revocation), and
    exposes the token to XSS.
  - *Bearer token in memory + refresh cookie*: still needs the refresh machinery above.

## R2. CSRF protection for cookie-authenticated requests

- **Decision**: `SameSite=Lax` cookie **plus** an `Origin` check on every state-changing request
  (`POST/PUT/PATCH/DELETE` under `/api`): the `Origin` (or, if absent, `Referer`) must match the configured
  `FRONTEND_ORIGIN`; otherwise 403. All mutating endpoints accept JSON only (`application/json`), which a cross-site
  HTML form cannot send without a CORS preflight.
- **Rationale**: Lax already blocks cross-site POST cookies in all current browsers; the Origin check covers older
  browsers and same-site subdomain attacks, without a token round-trip in the SPA.
- **Alternatives considered**: Double-submit CSRF token (extra header plumbing in every request for no gain here);
  `SameSite=Strict` (breaks arriving signed-in from an email link).

## R3. Frontend ↔ backend wiring

- **Decision**: Same-origin in every environment. Dev: Vite `server.proxy` forwards `/api` → `http://localhost:8000`
  (FastAPI). Prod: one reverse proxy serves the SPA and `/api`. The API client is a small `fetch` wrapper with
  `credentials: "include"`, JSON in/out, mapping error responses to typed errors (`code`, `message`, extra fields).
- **Rationale**: Same-origin removes CORS from the picture and makes the cookie first-party. No new HTTP library needed.
- **Alternatives considered**: CORS with credentials from `:5173` to `:8000` (works, but adds CORS config and
  `SameSite=None` complications in dev).

## R4. Who is signed in — client state

- **Decision**: A TanStack Query `["me"]` query (`GET /api/auth/me`) is the single source of truth for the current
  account (`null` when signed out). Route guards (`RequireRole`) read it; sign-in / verify / reset success writes it
  with `setQueryData`; sign-out clears the query cache. **No Zustand store and no token storage** for auth.
- **Rationale**: The server owns the session (R1); caching its answer is exactly what TanStack Query is for. A second
  store would duplicate it and drift.
- **Alternatives considered**: Zustand auth store persisted to localStorage (duplicates server state, can lie after
  revocation).

## R5. Throttling failed sign-ins (FR-009a)

- **Decision**: New table `sign_in_throttles` keyed by **normalised email** (whether or not an account exists):
  `failed_count`, `locked_until`. On a wrong password or unknown email: `failed_count += 1`; at 5 →
  `locked_until = now + 15 min`, `failed_count = 0`. While locked, `/token` answers **429** with `retry_after`
  seconds and does not check the password. Success or password reset deletes the row.
- **Rationale**: Per-email (not per-IP) matches the spec and works behind shared NAT (university networks). Counting
  unknown emails too keeps the response identical for existing and non-existing accounts (SC-005). DB-backed survives
  restarts and multiple workers.
- **Alternatives considered**: In-memory limiter (lost on restart, wrong with >1 worker); Redis (new infrastructure
  for one counter); per-IP limiting (punishes a whole campus network).

## R6. Codes for verification, resend and password reset (FR-004, FR-013)

- **Decision**: Keep the existing code scheme (6 digits from `secrets`, HMAC-SHA256 of `email:code` with the
  secret key, constant-time compare, 10-minute expiry, 3 wrong attempts, 60-second resend cooldown) and reuse it for
  password reset via a new `password_reset_requests` table (one row per account). A dedicated
  `POST /api/auth/resend-code {email, purpose}` resends for `sign_up` or `password_reset`; for sign-up it keeps the
  already-chosen role and password. Password-reset request and reset resend **always** return the same 202 (never 429): with no account, or inside the cooldown, nothing is sent — any different status would reveal which emails have accounts.
- **Rationale**: One proven pattern, one set of limits, consistent UX (the same OTP input everywhere).
- **Alternatives considered**: Reset links with a long token (different UX from sign-up; link prefetchers in mail
  clients can consume one-time links).

## R7. Role model (FR-001, FR-012)

- **Decision**: `role` enum (`student`, `employer`) on `users` (NOT NULL) and on `pending_users` (chosen at
  sign-up, copied to the account on verification). Backend dependency `require_role(...)` protects role-specific API
  routes; frontend `RequireRole` guards `/app/*` (student) and `/company/*` (employer), redirecting a wrong-role user to
  their own home.
- **Rationale**: One account = one role (ia.md). An enum keeps it explicit and indexable.
- **Alternatives considered**: Separate student/employer tables (premature; profile data comes in later features).

## R8. Schema changes without a migration tool

- **Decision**: Keep the project's current approach (`src/scripts/create_tables.py`, `Base.metadata.create_all`) and
  document a dev reset: drop and recreate the auth tables (spec assumption: existing accounts are development data).
  Adding Alembic is recorded as a follow-up, not part of this feature.
- **Rationale**: No production data exists; introducing a migration framework is a separate infrastructure decision.
- **Alternatives considered**: Alembic now (right long-term, but expands this feature's scope and review surface).

## R9. Existing defects the feature must fix (found while reading `src/auth`)

- `status.HTTP_429_TOO_MANY_REQUEST` does not exist (FastAPI/Starlette name is `HTTP_429_TOO_MANY_REQUESTS`) — the
  resend cooldown currently crashes with 500 instead of answering 429.
- The `IntegrityError` recovery branch in `/register` assigns `pending_user.password_hash` / `code_hash` (nonexistent
  attributes) instead of `hashed_password` / `hashed_code`.
- `OAuth2PasswordBearer(tokenUrl="/auth/token")` points to the wrong path (`/api/auth/token`); it becomes unused with
  cookie sessions and is removed.
- `verify_access_token` passes `options={"sub","exp"}` (a set, not the options dict) — removed with the JWT approach.
- Error responses are free-text `detail` strings; the SPA needs machine-readable codes → errors become
  `{"detail": {"code": "...", "message": "...", ...}}` (see contracts).

## R10. Testing

- **Decision**: Backend — `pytest` + `pytest-asyncio` + `httpx.AsyncClient(ASGITransport)` against a separate
  PostgreSQL test database (`TEST_DATABASE_URL`), email sending patched to capture codes. Frontend — Playwright e2e
  with the API mocked by `page.route` (per design-system/quality.md) plus one full-stack smoke run documented in
  quickstart.md.
- **Rationale**: The security rules (throttle, revocation, neutral responses) must be proven at the API level; UI
  states are proven by e2e with deterministic mocks.
- **Alternatives considered**: SQLite for backend tests (differs from PostgreSQL on case-insensitive and timezone
  behaviour the feature relies on).
