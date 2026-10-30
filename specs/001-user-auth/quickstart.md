# Quickstart: validate Sign up and sign in

How to prove the feature works end to end. Endpoint details: [contracts/auth-api.md](./contracts/auth-api.md);
tables: [data-model.md](./data-model.md).

## Prerequisites

- PostgreSQL running; `.env` with `SECRET_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, plus new
  `FRONTEND_ORIGIN=http://localhost:5173`, `ENVIRONMENT=development`, `SESSION_DAYS=30`.
- For backend tests: `TEST_DATABASE_URL` pointing to an empty database.
- Dev data reset (schema changed, no migrations — research R8): `uv run python -m src.scripts.create_tables --reset-auth`.

## Run

```bash
uv run fastapi dev src/main.py          # API on :8000
cd frontend && npm run dev              # SPA on :5173, /api proxied to :8000
```

## Automated checks

```bash
uv run pytest tests/auth -q                                        # API rules (throttle, revocation, neutrality)
cd frontend && npm run build && npm run lint && npm run lint:css
cd frontend && npm run test:e2e -- e2e/auth.spec.ts                # UI flows with the API mocked
```

Expected: all pass.

## Manual end-to-end scenarios (real API, real email)

| # | Steps | Expected |
|---|---|---|
| 1 | `/sign-up` → "I'm a student" → new email + 8-char password → submit | code screen shows the email; email arrives with a 6-digit code |
| 2 | Enter the code | lands on student home (`/app`), signed in; reload keeps you signed in |
| 3 | Enter a wrong code twice, then the right one | "2 tries left", "1 try left", then success |
| 4 | Click "Resend" immediately | disabled with a 60 s countdown; works after it |
| 5 | Sign up again with the same email | "An account already exists" with Sign in / Reset password |
| 6 | Log out, sign in with the wrong password 5 times | 5th answer: wait 15 min + reset link; correct password is refused during the pause |
| 7 | "Forgot password?" → email → code on its own screen → new password twice | signed in on this browser; a second browser that was signed in is signed out on its next request; old password fails |
| 8 | Same as 7 with an email that has no account | identical screens and messages; no email sent; any code is refused like a used-up one |
| 8a | Open `/reset-password/confirm` directly (no verified code) | redirected to "Forgot password" |
| 9 | Sign up as "I'm hiring" | lands on `/company`; opening `/app` redirects back to `/company` |
| 10 | While signed out, open `/app/applications` → sign in | returns to `/app/applications` |
| 11 | Phone width (390 px) for screens 1–7 | no horizontal scroll, code autofill/paste fills all six boxes |
