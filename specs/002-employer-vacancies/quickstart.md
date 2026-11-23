# Quickstart: validate Employer vacancies

How to prove the feature works end to end. Endpoints: [contracts/vacancies-api.md](./contracts/vacancies-api.md);
tables and state machine: [data-model.md](./data-model.md).

## Prerequisites

- Everything from [001 quickstart](../001-user-auth/quickstart.md) (PostgreSQL, `.env` with `ENVIRONMENT=development`).
- New tables: `uv run python -m src.scripts.create_tables` (adds vacancy tables; auth data is kept).
- An employer account and a student account (sign up at `/sign-up`, "I'm hiring" / "I'm a student").
- Backend tests: `TEST_DATABASE_URL` pointing to an empty database.

## Run

```bash
uv run fastapi dev src/main.py          # API on :8000
cd frontend && npm run dev              # SPA on :5173, /api proxied
```

## Automated checks

```bash
uv run pytest tests -q                                             # incl. tests/vacancies (rules, sweep, ownership, conflicts)
cd frontend && npm run build && npm run lint && npm run lint:css
cd frontend && npm run test:e2e -- e2e/company-vacancies.spec.ts   # UI flows with the API mocked
```

Expected: all pass.

## Manual scenarios (real API, signed in as the employer unless noted)

| # | Steps | Expected |
|---|---|---|
| 1 | Vacancies → empty state → "Post a vacancy" | the posting flow opens |
| 2 | Fill only the title → Save draft | listed under Draft; counts Draft 1 |
| 3 | Open the draft → Publish with a skill missing | told which fields to fix; still Draft |
| 4 | Complete everything (deadline next week) → Preview → Publish | Open; toast; listed under Open |
| 5 | Search part of the title | only that vacancy in the current group |
| 6 | "⋯" → Pause | Paused; "⋯" now offers Resume / Close |
| 7 | Resume | Open, same deadline |
| 8 | "⋯" → Close vacancy → Cancel, then again → Confirm | unchanged, then Closed "Closed by you on …" |
| 9 | Closed vacancy → Reopen: try to pick yesterday in the calendar, then pick a date next month | past days cannot be picked (the server also refuses them — covered by automated tests); the next-month date reopens it: toast, Open, new deadline |
| 10 | Edit an Open vacancy's title in two tabs, save both | second save: "changed elsewhere", reloads the latest |
| 11 | Set a vacancy's deadline to today, wait past midnight UTC+5 (or shift `closes_at` in the DB) and open Vacancies | Closed "Closed on its deadline, …" |
| 12 | Delete draft (confirm); check "⋯" on Open/Closed | draft gone; no delete for published ones |
| 13 | As the student, open `/company/vacancies` | sent to the student home |
| 14 | As a second employer, open the first employer's `/company/vacancies/<id>` | "Vacancy not found" |
| 15 | Phone width (390 px) for screens 1–12 | no horizontal scroll; actions reachable |
