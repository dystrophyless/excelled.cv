# Quickstart: validating the student CV

Prerequisites: PostgreSQL, `.env`, `uv run python -m src.scripts.create_tables` (adds `student_cvs`),
`uv run uvicorn src.main:app --reload`, `cd frontend && npm run dev`.

## Automated checks

```bash
uv run pytest                                   # TEST_DATABASE_URL → novio_test
cd frontend && npm run build && npm run lint && npm run lint:css
cd frontend && npx playwright test e2e/cv.spec.ts --workers=2   # then the other suites, one at a time
```

## Manual scenarios

| # | Steps | Expected |
|---|---|---|
| 1 | Student without a CV opens My profile | "No CV" state, formats and limit, no replace / remove / download |
| 2 | Choose a PDF, upload; reload. Repeat with DOCX on another account | Name, size, date, status; still there |
| 3 | Choose PNG; empty PDF; file over 5 MB; PNG renamed to `.pdf` | Refused with the reason; nothing saved |
| 4 | Stop the API, upload; start it, retry | Error, file kept; retry succeeds |
| 5 | Download | Same bytes and name (also a Cyrillic name) |
| 6 | Replace: cancel; invalid file; valid file; reload | Old stays; old stays with error; new one only |
| 7 | Remove: cancel; confirm; reload | Stays; removed; profile unchanged |
| 8 | Two tabs: replace in A, then replace or remove in B | B refused, shows the current CV |
| 9 | Edit the profile in one tab, replace the CV in another, save | No conflict |
| 10 | Guest / employer / other student call the API | 401 / 403 / never this CV |
