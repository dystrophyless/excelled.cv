# Quickstart: validating profiles

Prerequisites: PostgreSQL running, `.env` set, `uv run python -m src.scripts.create_tables` (creates the new tables),
backend `uv run uvicorn src.main:app --reload`, frontend `cd frontend && npm run dev`.

## Automated checks

```bash
uv run pytest                                   # with TEST_DATABASE_URL pointing at novio_test
cd frontend && npm run build && npm run lint && npm run lint:css
cd frontend && npx playwright test --workers=2  # all suites: the guards change every role page
```

## Backlog QA scenarios (manual run)

| # | Backlog | Steps | Expected |
|---|---|---|---|
| 1 | US5 · create | Sign up as a student, verify → profile step; name, university, degree, major, year of study, looking for → Save | "My profile" opens and shows the data |
| 2 | US5 · invalid | Leave university empty, pick no year of study → Continue (the API also refuses a 3rd year of a Master's) | Not saved; both fields show a message |
| 3 | US6 · create | Sign up as an employer, verify → company step; name, industry, size → Save | Vacancies list; Company profile shows the data |
| 4 | US6 · invalid | Leave company name empty, website `not a site` → Save | Not saved; messages on both fields |
| 5 | US7 · edit | My profile → Edit → change the year of study, add a GPA, a project and a language → Save; reload | New value shown after reload |
| 6 | US7 · invalid | Clear the full name → Save; reload | Error shown; old name still stored |
| 7 | Gate | Employer without profile opens `/company/vacancies/new` | Company step, then back to New vacancy after Save |
| 8 | Rename | Rename the company, open New vacancy → preview | Preview shows the new name |
| 9 | Conflict | Edit in two tabs, save both | Second save refused, latest data offered |
| 10 | Access | As a student call `GET /api/company/profile` | 403 `wrong_role` |
