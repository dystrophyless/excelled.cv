# Quickstart: validating student opportunities

Prerequisites: PostgreSQL, `.env`, `uv run python -m src.scripts.create_tables` (adds the `research` label),
`uv run uvicorn src.main:app --reload`, `cd frontend && npm run dev`.

## Automated checks

```bash
uv run pytest                                   # TEST_DATABASE_URL → an empty test database
cd frontend && npm run build && npm run lint && npm run lint:css
cd frontend && npx playwright test --workers=2
```

## Manual scenarios

| # | Steps | Expected |
|---|---|---|
| 1 | Employer posts a Research vacancy; student opens Opportunities | Listed as Research with title and deadline |
| 2 | Employer leaves the title empty and publishes | Not saved, message on the field |
| 3 | Employer pauses / closes a vacancy; student reloads | Gone from the list; its address says no longer available |
| 4 | No active vacancies | "No opportunities yet" message |
| 5 | Open a card, then Back (with a search and page 2 active) | All fields shown; same search and page |
| 6 | Keyword + type; then Clear | Only matches of both; full list again |
| 7 | Keyword that matches nothing | "No matching opportunities" message and Clear |
| 8 | Reload and share a filtered address; add `type=bogus` | Same list; unknown value ignored |
| 9 | Guest / employer / student without profile open `/app/opportunities` | Sign in / employer home / onboarding, then back |
| 10 | `/app`, `/app/vacancies`, `/app/applications`, `/app/saved` | Opportunities; no Match, Apply or Save anywhere |
