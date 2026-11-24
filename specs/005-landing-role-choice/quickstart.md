# Quickstart: validation

Prerequisites: the backend in its own terminal (`uv run uvicorn src.main:app --reload`), `npm run dev` in `frontend/`.

## Automated

- `uv run pytest tests/auth/test_sign_up.py`
- In `frontend/`: `npm run build`, `npm run lint`, `npm run lint:css`, then one file at a time:
  `npx playwright test e2e/landing.spec.ts --workers=2`, `e2e/auth.spec.ts`, `e2e/design-system.spec.ts`,
  `e2e/profiles.spec.ts`, `e2e/company-vacancies.spec.ts`, `e2e/opportunities.spec.ts`

## Manual

1. Signed out, open `/`: purpose, capabilities and both roles are visible; "Create account" and "Log in" work.
2. Stop the backend and reload `/`: the page still shows.
3. `/sign-up`: nothing is selected; Continue shows the message; choosing a role clears it.
4. Register once as Student and once as HR Representative: each lands in its own onboarding.
5. On the details step press Back (page and browser): role and email are kept.
6. Open `/employers`, `/vacancies`, `/vacancies/1`: the landing page opens.
7. Signed in, open `/`: the role's home opens.
