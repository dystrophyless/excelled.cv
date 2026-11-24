---
description: "Task list for 004-student-opportunities — Student opportunities"
---

# Tasks: Student opportunities

**Input**: Design documents from `/specs/004-student-opportunities/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/opportunities-api.md, quickstart.md, ui-spec.md
(**Approved 2026-11-24**)

**Tests**: REQUIRED (constitution IV, V; spec SC-003). Backend test tasks come first and must fail before the code task
after them. Every story with UI gets an e2e block (Playwright + axe, API mocked).

## Novio UI rules for tasks

- Views are wired, not redesigned: `frontend/src/features/opportunities/views/*` keep their look and props. UI tasks are
  marked **(ui-builder)** and name the ui-spec screen (S1 list, S2 details, S3 research in existing views).
- Pages never pass `match`, `apply` or `save` (research R11).
- e2e: `frontend/e2e/opportunities.spec.ts`, mocks in `frontend/e2e/support/opportunities-api.ts`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Create packages `src/opportunities/__init__.py` and `tests/opportunities/__init__.py`; move the `make_vacancy` fixture from `tests/vacancies/conftest.py` to `tests/conftest.py` so both suites use it

## Phase 2: Foundational (research type in the catalog, blocks every story)

- [X] T002 Write failing tests in `tests/opportunities/test_research.py`: `GET /api/catalog` types end with `{"value": "research", "label": "Research"}`; an employer creates, publishes, and edits to and from `type: "research"`; an incomplete research vacancy is refused with 422 `incomplete`; a student profile accepts all 4 `position_types` and refuses duplicates; update the exact list in `tests/vacancies/test_catalog_skills.py`
- [X] T003 Add `research` ("Research", last) to `VacancyType` and `LABELS` in `src/catalog/enums.py`; `position_types` "1–4 distinct values" in `src/profiles/schemas.py`
- [X] T004 Add the idempotent, AUTOCOMMIT `ALTER TYPE vacancy_type ADD VALUE IF NOT EXISTS 'research'` step to `src/scripts/create_tables.py` (research R5) and an "Upgrading" note to `README.md`; check it twice on a database created before the change

**Checkpoint**: all existing pytest suites pass.

## Phase 3: User Story 1 — Student views active opportunities (P1) 🎯 MVP

**Independent test**: with vacancies in every status, the list holds exactly the active ones.

- [X] T005 [P] [US1] Write failing tests in `tests/opportunities/test_access.py` for both endpoints: 401 `not_signed_in`, 403 `wrong_role` (employer), 403 `student_profile_required`; the response keys are exactly the contract's (no owner id, email, version, status, counts)
- [X] T006 [P] [US1] Write failing tests in `tests/opportunities/test_list.py`: only Open before its deadline (draft, paused, closed, expired excluded, with `freeze_now` at the deadline instant and before a sweep); a vacancy whose employer has no company profile is excluded; an edit and a pause show on the next read; `newest` and `closing` order with `id` desc tie-break; 10 per page without repeats or gaps; page beyond the last is clamped; `page` 0 → 422; empty → `items: []`, `total: 0`, `page: 1`; query count does not grow with items
- [X] T007 [US1] Create `src/opportunities/schemas.py`, `repository.py` (list: join `CompanyProfile`, `rules.visible_in_search(now)`, count, sort, clamp, `load_skills`) and `router.py` (`GET /student/opportunities`, role check → profile check → `sweep_expired`, clock `now_utc`); include it in `src/main.py` under `/api`
- [X] T008 [US1] Create `frontend/src/features/opportunities/api.ts` (typed client; list and details; snake_case → view-model; `publishedOn` = the UTC+5 date of `published_at`; catalog with industries and company sizes) and `hooks.ts` (`useOpportunities(query)` with `keepPreviousData` and an abort signal, `useOpportunity(id)` that does not retry 4xx, 403 `student_profile_required` marks `has_profile: false` so the guard redirects)
- [X] T009 [US1] (ui-builder) S1: create `frontend/src/features/opportunities/OpportunitiesPage.tsx` wiring `OpportunitiesListView` (states loading, updating, none yet, error with retry; the catalog loads with it); routes in `frontend/src/app/router.tsx`: `/app/opportunities` under `RequireRole`, redirects (R10): `/app`, `/app/vacancies`, `/app/applications`, `/app/saved` → `/app/opportunities`, `/app/vacancies/:id` → `/app/opportunities/:id`, query string kept; `homePathFor("student")` → `/app/opportunities` in `frontend/src/features/auth/hooks.ts`; update the DEMO ROUTES comment; remove unused demo imports
- [X] T010 [US1] (ui-builder) Move tests off the removed demo routes: `frontend/e2e/design-system.spec.ts` (use `/styleguide/templates/<id>`; notification and tooltip tests use the employer layout, which keeps its bell), `frontend/e2e/auth.spec.ts`, `frontend/e2e/profiles.spec.ts`; keep every assertion that still has a subject
- [X] T011 [US1] (ui-builder) e2e block "US1 list" in `frontend/e2e/opportunities.spec.ts` + `frontend/e2e/support/opportunities-api.ts`: cards with title, type and deadline; none yet; error then retry; guest → sign-in and back; employer → own home; no profile → onboarding with `next` and back; redirects; no Match, Apply, Save, bell or other nav item; axe; 390 px without horizontal scroll

## Phase 4: User Story 2 — Student opens an opportunity (P1)

**Independent test**: every published field is shown; Back restores the list; unavailable ids show the message.

- [X] T012 [P] [US2] Write failing tests in `tests/opportunities/test_detail.py`: full body of an active one incl. company (null optional fields); identical 404 `opportunity_unavailable` bodies for draft, paused, closed, expired, missing and no-company; skills in entered order
- [X] T013 [US2] Add `get_active` to `src/opportunities/repository.py` and `GET /student/opportunities/{id}` to `router.py`
- [X] T014 [US2] (ui-builder) S2: create `frontend/src/features/opportunities/OpportunityPage.tsx` wiring `OpportunityDetailsView` (loading, unavailable for 404 and non-numeric id without a request, error with retry, copy link with toast and a failure toast); `backTo` from router state, else the plain list; the list card link passes its query in router state; route `/app/opportunities/:id`
- [X] T015 [US2] (ui-builder) e2e block "US2 details": all fields, minimal, unavailable (404 and bad id), error retry, Back restores search + filters + page, opened directly Back goes to the plain list, website opens safely in a new tab, copy link, no count beside skills, axe, 390 px

## Phase 5: User Story 3 — Search and filter (P1)

**Independent test**: each keyword and filter combination returns exactly the matches; Clear restores all.

- [X] T016 [P] [US3] Write failing tests in `tests/opportunities/test_search.py`: keyword in title, company, Required and Nice skill; case; spaces; several words in any order across fields; `%`, `_` and `\` literal; description not searched; `q` 121 chars → 422; type internship / vacancy (both job types) / research; several formats, cities, fields; all combined; unknown enum → 422; total matches the filter; closed never found
- [X] T017 [US3] Add keyword, type, format, city and field conditions (research R3, R4) to `src/opportunities/repository.py` and the validated query parameters to `router.py`
- [X] T018 [US3] (ui-builder) S1 address state in `OpportunitiesPage.tsx` with `parseQuery` / `toSearchParams` (R7: typing replaces, the rest pushes; unknown values dropped after the catalog loads; a clamped page from the server is shown in the address with replace); fix `useSearchDraft` in `views/OpportunitiesListView.tsx` so a committed trimmed value never overwrites what is being typed (trailing space, fast typing) and the field has a 120-char limit (behaviour only, no visual change)
- [X] T019 [US3] (ui-builder) e2e block "US3 search": keyword + type → only matches; Clear → all; no results with its own message and Clear; format, city, field; sort; paging resets on filter; reload and browser Back keep the state; unknown values ignored; typing "data engineer" with a pause after the space keeps the space; a slow old response never replaces a newer one; mobile filter sheet; result count is announced; axe

## Phase 6: User Story 4 — Research type in existing screens (P2)

**Independent test**: post Research as an employer; it shows as Research everywhere.

- [X] T020 [US4] (ui-builder) S3: add `research` to the catalog mocks in `frontend/e2e/support/vacancies-api.ts` and `profiles-api.ts`; e2e block "US4 research" in `frontend/e2e/opportunities.spec.ts`: employer picks Research in the wizard and edit (body `type: "research"`), list and page show Research; student picks Research in onboarding and profile edit and My profile shows it; Research filter lists it; axe

## Phase 7: Polish

- [X] T021 [P] Docs: `CHANGELOG.md` 0.5.0, `README.md` (status, API overview, upgrading), versions in `pyproject.toml`, `frontend/package.json` and lock files, `specs/backlog.md` statuses
- [X] T022 Run every check in quickstart.md and report real output; measure the list with 1,000 active vacancies (SC-004)
- [X] T023 Run the quickstart manual scenarios against the real backend
- [X] T024 `/speckit-design-qa`

## Phase 8: User Story 5 — Salary amounts and currency (P1)

**Independent test**: 1000000 tenge is shown grouped with ₸ in the form, on employer pages and for students.

- [X] T025 [US5] Write failing tests (`tests/vacancies/test_salary.py`, update existing salary assertions): the contract's salary rules on create, edit, draft, publish and in both student endpoints; currencies in the catalog; upgrade of text salaries (convertible, not convertible, twice, after the employer cleared it)
- [X] T026 [US5] Implement research R12 in `src/catalog/`, `src/vacancies/`, `src/opportunities/`, `src/scripts/create_tables.py`; `README.md` "Upgrading", `CHANGELOG.md`
- [X] T027 [US5] Design round 3 (ui-designer): salary from / to / currency in the 002 wizard and edit form, salary display; owner approval
- [X] T028 [US5] (ui-builder) Wire the approved salary field and display in `frontend/src/features/company-vacancies/` and `frontend/src/features/opportunities/`, `features/*/api.ts` mapping, 422 errors at the field
- [X] T029 [US5] (ui-builder) e2e: US5 scenarios 1–4 (wizard, edit, list, page, student card and details), paste, currency kept, axe, 390 px; update mocks
- [X] T030 Run all checks again

---

## Dependencies & execution order

Phase 1 → 2 → US1 → (US2, US3 backend in parallel; their UI in order, same page files) → US4 → polish. T020 needs only
Phase 2, the Research filter part needs US3. Parallel: T005 ∥ T006; T012 ∥ T016.

## Implementation strategy

MVP = US1. ui-builder batches: T009–T011, T014–T015, T018–T019, T020. Commit per phase in focused commits.
