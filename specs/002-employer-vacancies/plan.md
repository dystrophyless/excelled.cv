# Implementation Plan: Employer vacancies

**Branch**: `002-employer-vacancies` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-employer-vacancies/spec.md`

## Summary

Employers post vacancies (draft → preview → publish), edit them, see their own list grouped by status, and manage the
lifecycle agreed in `design-system/ia.md`: Draft · Open · Paused · Closed, with pause/resume, close before the deadline,
automatic close at the deadline, reopen with a new deadline and deleting drafts. The backend adds a `vacancies` module
(three tables, an employer-only API, a catalog and skill suggestions) on top of 001's cookie sessions and role guard; the
SPA replaces the demo `/company/vacancies*` routes with real pages. Key decisions in [research.md](./research.md):
deadline closing without a scheduler (R1), optimistic concurrency with `version` (R3), 404 for "not yours" (R4), a shared
skills vocabulary (R5), server-owned fixed lists (R6), and the status rules exported for the later student features (R8).

## Technical Context

**Language/Version**: Python 3.13 (backend) · TypeScript / React 19 (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2 async (psycopg 3), pydantic · Vite, React Router, TanStack Query 5,
Novio UI kit — all existing; no new runtime dependency.

**Storage**: PostgreSQL — new tables `vacancies`, `skills`, `vacancy_skills` and their enums ([data-model.md](./data-model.md));
created by the existing `create_tables` script, auth data untouched.

**Testing**: pytest + pytest-asyncio + httpx ASGI on `TEST_DATABASE_URL` (from 001) · Playwright + axe with `page.route`
mocks (`frontend/e2e/company-vacancies.spec.ts`).

**Target Platform**: Linux server (API) · evergreen desktop and mobile browsers, 390–1440 px

**Project Type**: Web application — FastAPI backend in `src/`, React SPA in `frontend/`

**Performance Goals**: vacancy list and actions answer in < 300 ms p95 for an employer with up to 200 vacancies; the
deadline sweep is one indexed UPDATE. UI meets SC-001 (post < 5 min) and SC-002 (status action < 15 s).

**Constraints**: no application after the deadline at any moment (SC-003, enforced by `closes_at`, R1); not-yours looks
exactly like not-found (SC-006, R4); no silently lost edits (R3).

**Scale/Scope**: hundreds of employers, up to a few thousand vacancies; 4 screens + 3 dialogs; 8 new endpoints; 3 new tables.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Spec-driven delivery | spec with clarification (scope B) and the IA lifecycle decisions; design runs after this plan | ✅ |
| I. Scope decisions in ia.md | one role per account, no messaging, skills without levels (Required / Nice to have), no cross-vacancy candidates view — all respected | ✅ |
| II. One design system | list = Browse (table), post = Wizard, edit = employer Form, vacancy page = Tracker; dialogs from the kit `Modal`; tokens only | ✅ |
| III. Owner approves design first | `/speckit-design` → approval → `before_tasks` gate | ✅ (pending design step) |
| IV. States + e2e-ready | every screen: loading / empty / error with retry / success; e2e per user story with axe | ✅ |
| V. Verify, then claim | quickstart lists build, lint, lint:css, pytest, e2e and design QA | ✅ |
| Technology | FastAPI + PostgreSQL + React SPA + TanStack Query; no new frameworks. (Constitution text still says "JWT auth"; 001 moved to cookie sessions — amend the constitution wording in a PATCH, recorded as a follow-up) | ✅ |

**Post-design re-check**: ✅ — the design artifacts add no dependency, no new archetype, and no client store (the
catalog and lists are TanStack Query server data).

## UI Surface

| Screen | Route | Role | Archetype (proposed) | API it needs |
|--------|-------|------|----------------------|--------------|
| My vacancies (status groups with counts, search, "⋯" actions, empty state) | `/company/vacancies` | Employer | Browse (table) — `/styleguide/templates/table` | `GET /api/company/vacancies`, `POST …/{id}/status`, `DELETE …/{id}` |
| Post a vacancy (Basics → Skills → Details → Preview; Save draft; Publish) | `/company/vacancies/new` | Employer | Wizard — `/styleguide/templates/wizard` | `GET /api/catalog`, `GET /api/skills`, `POST /api/company/vacancies` |
| Edit vacancy (Save draft / Publish for drafts, Save changes otherwise; unsaved-changes guard) | `/company/vacancies/:id/edit` | Employer | Form (employer) — `/styleguide/templates/vacancy-edit` | `GET …/{id}`, `PUT …/{id}`, `POST …/{id}/status` (publish), catalog, skills |
| Vacancy page (title, status line "Open · closes 30 Nov" / "Closed by you on …", Edit + "⋯" actions; applicants area = empty state until the pipeline feature) | `/company/vacancies/:id` | Employer | Tracker — `/styleguide/templates/pipeline` | `GET …/{id}`, `POST …/{id}/status`, `DELETE …/{id}` |
| Dialog: Close vacancy (confirm) | — (from list / vacancy page) | Employer | kit `Modal` | `POST …/status` `close` |
| Dialog: Reopen (new "Apply by" date) | — | Employer | kit `Modal` + `DateField` | `POST …/status` `reopen` |
| Dialog: Delete draft (confirm) | — | Employer | kit `Modal` | `DELETE …/{id}` |

No student screens: US9's display rules (Paused / Closed messages, greyed saved card) are enforced server-side here
(research R8) and drawn by the student vacancy and saved features; the Saved template already shows the "Closed" tag.

## Project Structure

### Documentation (this feature)

```text
specs/002-employer-vacancies/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── vacancies-api.md # Phase 1
├── ui-spec.md           # /speckit-design (after_plan hook)
├── design/screens/      # approved screenshots
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── main.py                       # + include vacancies, catalog, skills routers
├── models.py                     # + vacancy models import
├── scripts/create_tables.py      # + import vacancy models (create_all picks them up)
├── catalog/
│   ├── enums.py                  # VacancyType, WorkFormat, VacancyField, City (+ labels)
│   └── router.py                 # GET /api/catalog
├── skills/
│   ├── models.py                 # Skill
│   ├── normalize.py              # skill key normalisation
│   ├── repository.py             # upsert by key, suggestions
│   └── router.py                 # GET /api/skills
└── vacancies/
    ├── models.py                 # Vacancy, VacancySkill, status / closed_by / skill_kind enums
    ├── schemas.py                # VacancyInput, VacancyOut, list + counts, StatusAction
    ├── deadlines.py              # apply_by → closes_at (UTC+5), "today" in UTC+5
    ├── rules.py                  # completeness, transitions, accepting_applications, visible_in_search, sweep
    ├── repository.py             # owner-scoped queries, versioned updates
    └── router.py                 # /api/company/vacancies…
tests/
└── vacancies/                    # pytest: create/edit/validation, lifecycle, deadline sweep, ownership 404, conflicts, skills, catalog

frontend/src/
├── features/company-vacancies/
│   ├── views/                    # (designer) list, wizard steps, edit form, vacancy page, dialogs
│   ├── mocks.ts                  # (designer)
│   ├── api.ts                    # endpoints + query keys
│   ├── hooks.ts                  # list / detail / create / update / status / delete; catalog; skill suggestions
│   └── *Page.tsx                 # containers (builder)
├── prototypes/002-employer-vacancies.tsx   # (designer)
└── app/router.tsx                # replace demo /company/vacancies* routes with the real pages (inside RequireRole employer)
frontend/e2e/company-vacancies.spec.ts      # Playwright + axe, API mocked
```

**Structure Decision**: Same web-app layout as 001. Backend modules per domain (`vacancies`, `skills`, `catalog`) mirror
`src/auth` / `src/users`; `skills` and `catalog` are separate because the student profile and search features will reuse
them. Frontend feature folder `company-vacancies` matches the `/company/vacancies` routes.

## Complexity Tracking

> No constitution violations. Recorded deviations from "simplest possible":

| Choice | Why needed | Simpler alternative rejected because |
|---|---|---|
| `version` column + 409 on conflict | spec edge case: no edit or transition may be silently lost or applied twice | last-write-wins loses edits between two tabs |
| `closes_at` + lazy sweep instead of a stored status only | SC-003 needs "no application after the deadline" to hold at the exact second without a job runner | a cron job leaves a gap until it runs and needs extra infrastructure |
| separate `skills` table | the later matching and student-profile features compare skills by the same key | per-vacancy text arrays would need a migration and de-duplication later |
