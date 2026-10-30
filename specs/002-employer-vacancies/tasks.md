---
description: "Task list for 002-employer-vacancies — Employer vacancies"
---

# Tasks: Employer vacancies

**Input**: Design documents from `/specs/002-employer-vacancies/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/vacancies-api.md, quickstart.md, ui-spec.md (**Approved 2026-11-02**)

**Tests**: REQUIRED (constitution IV, V; plan "Testing"). Backend rules are proven with pytest on `TEST_DATABASE_URL`
(test tasks come first and must fail before the code task after them); every user story with UI gets an e2e block
(Playwright + axe, API mocked).

**Organization**: by user story (spec.md US1–US9).

## Novio UI rules for tasks

- ui-spec.md is **Approved** — views are wired, not redesigned. UI tasks name the screen (S1 list, S2 wizard, S3 edit,
  S4 vacancy page, D1–D4 dialogs) and the approved View in `frontend/src/features/company-vacancies/views/`, and are
  owned by the `ui-builder` agent — marked **(ui-builder)**. Do not edit the Views, `parts.tsx`, `vacancies.module.css`,
  `model.ts` types, `mocks.ts` or the prototype; if a View cannot do what a task needs, stop and ask for a design round.
- API → view mapping: ui-spec §5 "Data contract" (+ §3 screen details for copy, states and test hooks).
- e2e: `frontend/e2e/company-vacancies.spec.ts`, API mocked by `page.route` helpers in
  `frontend/e2e/support/vacancies-api.ts`; each story block checks happy path, error/empty states, axe, 390 px with no
  horizontal scroll. Signed-in employer via `signedInAs(page, "employer")` from `e2e/support/auth-api.ts`.
- Final task: `/speckit-design-qa`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US9 from spec.md

## Path conventions

Backend `src/`, backend tests `tests/`, frontend `frontend/src/`, e2e `frontend/e2e/`. Employer API base
`/api/company/vacancies` (contract: `specs/002-employer-vacancies/contracts/vacancies-api.md`). Auth, error shape
(`src/auth/exceptions.py::api_error`), `require_role` and the pytest harness come from 001-user-auth.

---

## Phase 1: Setup

- [X] T001 Create packages `src/catalog/__init__.py`, `src/skills/__init__.py`, `src/vacancies/__init__.py` and `tests/vacancies/__init__.py`
- [X] T002 Extend `tests/conftest.py`: import the new model modules (so `drop_all/create_all/TRUNCATE` cover `vacancies`, `skills`, `vacancy_skills`), add fixtures `employer` (a `UserRole.employer` user + its session cookie headers via `make_user` / `make_session`), `other_employer`, `student`, and `freeze_now(datetime)` which overrides the `now_utc` dependency (T010) through `app.dependency_overrides` for deadline tests

---

## Phase 2: Foundational (blocking prerequisites)

**⚠️ No user-story work starts until this phase is done.**

### Backend

- [X] T003 [P] Create `src/catalog/enums.py` (research R6): `VacancyType` = `internship` · `full_time` · `part_time`; `WorkFormat` = `on_site` · `hybrid` · `remote`; `VacancyField` = `backend` · `frontend` · `mobile` · `data` · `qa` · `design` · `devops` · `product` · `other`; `City` = `almaty` · `astana` · `shymkent` · `karaganda` · `aktobe` · `other`; each with a display label ("Internship", "Full-time", "On-site", "Almaty", …); Postgres enum names `vacancy_type`, `work_format`, `vacancy_field`, `city`
- [X] T004 [P] Create `src/catalog/router.py` with public `GET /api/catalog` → `{types, fields, cities, formats}` as `[{value, label}]` (contract "GET /api/catalog") and include it in `src/main.py` under `/api`
- [X] T005 [P] Create `src/skills/models.py` (`Skill`: `id`, `name` "text NOT NULL, display form as first typed (trimmed), ≤ 40 chars", `key` "text NOT NULL, unique — trimmed, lower-cased, inner whitespace collapsed"), `src/skills/normalize.py` (`skill_key(name)`), and `src/skills/repository.py` (`upsert_skills(db, names) -> list[Skill]` by key, keeping the first display form; `suggest(db, q, limit=10)` prefix match on key, empty `q` → most used) (research R5)
- [X] T006 Create `src/skills/router.py`: `GET /api/skills?q=` for any signed-in account (`current_account`) → `{skills: [names]}`; include in `src/main.py`
- [X] T007 Create `src/vacancies/models.py` (data-model.md): enums `vacancy_status` (`draft`·`open`·`paused`·`closed`), `closed_by` (`employer`·`deadline`), `skill_kind` (`required`·`nice`); `Vacancy` with `employer_id` "FK → users.id, ON DELETE CASCADE, indexed", `title` "text NOT NULL, 3–120 chars", `type`/`field`/`city`/`format` nullable enums from T003, `description` "text, nullable, ≤ 5,000", `duration`/`salary` "text, nullable, ≤ 60", `apply_by` "date, nullable", `closes_at` "timestamptz, nullable", `status` "NOT NULL, default draft", `published_at`, `closed_at`, `closed_by` (nullable), `version` "int NOT NULL, default 1", `created_at`/`updated_at`; indexes `(employer_id, status)` and `(status, closes_at)`; `VacancySkill` (`vacancy_id` FK CASCADE + `skill_id` FK as PK, `kind`, `position`). Import the models in `src/models.py` and `src/scripts/create_tables.py`
- [X] T008 [P] Create `src/vacancies/deadlines.py` (research R2): `KZ = timezone(timedelta(hours=5))`; `closes_at_for(apply_by: date) -> datetime` = `apply_by + 1 day` at 00:00 KZ, as UTC; `today_kz(now) -> date`; `is_future_deadline(apply_by, now)` = `apply_by >= today_kz(now)`
- [X] T009 Create `src/vacancies/rules.py` (data-model.md "State machine", research R1/R8): `missing_fields(vacancy_or_input) -> list[str]` (complete = title, type, field, city, format, non-empty description, `apply_by`, ≥ 1 required skill; names as in the contract: `type`, `field`, `city`, `format`, `description`, `apply_by`, `required_skills`); `TRANSITIONS` table (publish draft→open, pause open→paused, resume paused→open only if `closes_at > now`, close open|paused→closed, reopen closed→open); `accepting_applications(v, now)` and `visible_in_search()` SQL filter = `status = open AND closes_at > now`; `sweep_expired(db, now)` = one `UPDATE … SET status='closed', closed_by='deadline', closed_at=closes_at, version=version+1 WHERE status IN ('open','paused') AND closes_at <= now`
- [X] T010 [P] Create `src/vacancies/schemas.py` (contract "Shared objects"): `VacancyInput` (all optional except `title` 3–120; `description` ≤ 5000; `duration`/`salary` ≤ 60; `required_skills`/`nice_skills` ≤ 10 items, each 1–40 chars), `VacancyCreate` (+ `publish: bool = False`), `VacancyUpdate` (+ `version`), `StatusActionIn` (`action`, `version`, `apply_by?`), `VacancyOut`, `VacancyListOut` (`items`, `counts`); and a `now_utc()` FastAPI dependency (in `src/vacancies/deadlines.py` or a small `deps.py`) used by every vacancy route
- [X] T011 Create `src/vacancies/repository.py`: `get_own(db, id, employer_id)` (not found **or** not owner → `None`, research R4), `list_own(db, employer_id, status, q)` + `counts_own(db, employer_id)` (counts ignore `q`/`status`), `set_skills(db, vacancy, required, nice)` (upsert via T005; one row per skill; a skill in both groups ends up in the group listed last; duplicates by key dropped; `position` as entered), `bump(vacancy)` (version + 1), `to_out(vacancy) -> VacancyOut` with `applicants = new_applicants = 0` (research R9)
- [X] T012 [P] Write `tests/vacancies/test_rules.py` (unit, no HTTP): `closes_at_for` (2026-11-30 → 2026-11-30T19:00:00Z), `is_future_deadline` around midnight UTC+5, `missing_fields` for empty and complete inputs, every allowed and refused transition in `TRANSITIONS`, `accepting_applications` false for draft/paused/closed and for open past `closes_at`, `sweep_expired` closing open and paused rows with `closed_by = deadline` and `closed_at = closes_at` while leaving future ones alone; and `tests/vacancies/test_catalog_skills.py` (`/api/catalog` shape; `/api/skills?q=py` prefix match, 401 without session; "Python", " python ", "PYTHON" share one key)
- [X] T013 Create `src/vacancies/router.py` with the employer router (`require_role("employer")`, prefix `/api/company/vacancies`, sweep via `sweep_expired(db, now)` at the start of every handler) and `GET /{id}` → `VacancyOut` or 404 `vacancy_not_found`; include it in `src/main.py`. Write `tests/vacancies/test_access.py` first: 401 `not_signed_in`, 403 `wrong_role` for a student, 404 `vacancy_not_found` for another employer's vacancy with a body identical to a non-existent id. Make T012 and T013 pass

### Frontend

- [X] T014 [P] Create `frontend/src/features/company-vacancies/api.ts` (ui-builder): typed functions for every endpoint in the contract (`catalog`, `skills`, `list`, `get`, `create`, `update`, `changeStatus`, `remove`) on `frontend/src/lib/api.ts`; map API `Vacancy` → `VacancyItem` from `model.ts` (snake → camel, `id` → string, `closed_at` → `closedOn` ISO date, `updated_at` → `updatedOn`) and `VacancyDraft` → `VacancyInput`; query keys `["vacancies", status, q]`, `["vacancy", id]`, `["catalog"]`, `["skills", q]`
- [X] T015 Create `frontend/src/features/company-vacancies/hooks.ts` (ui-builder): `useCatalog` (long `staleTime`), `useSkillSuggestions(q)` (debounced), `useVacancyList(status, q)`, `useVacancy(id)`, and `todayKz()` (UTC+5 date passed to the Views as `today`). Mutation hooks are added by the story tasks
- [X] T016 [P] Create `frontend/e2e/support/vacancies-api.ts` (ui-builder): `page.route` helpers for `/api/catalog`, `/api/skills`, and each `/api/company/vacancies…` endpoint with contract-shaped bodies — success and every error code (`incomplete` with `fields`, `apply_by_not_in_future`, `version_conflict` with `vacancy`, `invalid_transition` with `status`, `vacancy_not_found`, `not_a_draft`, network)

**Checkpoint**: `uv run pytest tests -q` passes (001 + new rule/access tests); `npm run build` passes.

---

## Phase 3: User Story 1 — Employer posts a vacancy (P1) 🎯 MVP

**Goal**: create a vacancy in the wizard, save a draft at any point, preview, publish; complete a draft in the edit form and publish it.

**Independent test**: quickstart 1–4; `company-vacancies.spec.ts` US1 block.

- [X] T017 [P] [US1] Write `tests/vacancies/test_create_edit_draft.py`: `POST` with only a title → 201 `draft` (`version` 1, `published_at` null); title of 2 or 121 chars → 422; `publish: true` complete with a future `apply_by` → 201 `open`, `published_at` set, `closes_at` = end of `apply_by` UTC+5; `publish: true` incomplete → 422 `incomplete` with exactly the missing `fields`; `publish: true` with yesterday → 422 `apply_by_not_in_future`; 11 required skills → 422; skills "Python"/"python " collapse to one, a skill in both lists ends up only in `nice_skills` when listed there last; `PUT` on a draft replaces content and skills, keeps `draft`, bumps `version`; `POST …/{id}/status` `publish` on a complete draft → `open`, on an incomplete draft → 422 `incomplete`, from `open` → 409 `invalid_transition` with `status: "open"`; stale `version` → 409 `version_conflict` with the current `vacancy`
- [X] T018 [US1] Implement `POST /api/company/vacancies` in `src/vacancies/router.py` (validate with `rules.missing_fields` / `is_future_deadline` only when `publish` is true; set `closes_at`; `set_skills`; 201 `VacancyOut`)
- [X] T019 [US1] Implement `PUT /api/company/vacancies/{id}` (versioned `UPDATE … WHERE id AND employer_id AND version`; 409 `version_conflict` with the current vacancy; content + skills replaced; status unchanged; for Open/Paused enforce complete + future deadline — rules shared with US5) and `POST /{id}/status` with the `publish` action (allowed-from check in the same `WHERE`, 409 `invalid_transition` naming the current status, `published_at` set once). Make T017 pass
- [X] T020 [US1] Add `useCreateVacancy`, `useUpdateVacancy`, `useVacancyStatusAction` to `frontend/src/features/company-vacancies/hooks.ts` (ui-builder); successes invalidate `["vacancies"]` and set `["vacancy", id]`
- [X] T021 [US1] Create `frontend/src/features/company-vacancies/NewVacancyPage.tsx` (ui-builder) wiring **S2** `VacancyWizardView`: step state, `onContinue` validates the current step client-side, "Save and exit" → `POST publish:false` → toast → `/company/vacancies`; Preview → `onPublish` → `POST publish:true` → toast → `/company/vacancies`; `incomplete.fields` → `errors` + `formAlert` with `FIELD_STEP` links; `apply_by_not_in_future` → `errors.applyBy`; network → `save-error` keeping the draft; catalog loading/error → wizard `loading`/`error` (ui-spec §3 S2)
- [X] T022 [US1] Create `frontend/src/features/company-vacancies/EditVacancyPage.tsx` (ui-builder) wiring **S3** `VacancyEditView` for **drafts**: load by id (`loading`/`error`/`not-found`), "Save draft" → `PUT`, "Publish" → `PUT` then `status publish` (or one call order that never publishes stale content), `incomplete` → `formAlert`, unsaved-changes guard → **D4** "Discard changes" via `onLeaveCancel`/`onLeaveConfirm` (block in-app navigation with React Router's blocker; `beforeunload` for reloads) (ui-spec §3 S3, FR-008)
- [X] T023 [US1] In `frontend/src/app/router.tsx` (ui-builder) replace the demo `/company/vacancies/new` and `/company/vacancies/:id/edit` routes with `NewVacancyPage` and `EditVacancyPage` inside `RequireRole role="employer"` (S2 has its own bar, no `EmployerLayout`; S3 inside `EmployerLayout`)
- [X] T024 [US1] Write the US1 block of `frontend/e2e/company-vacancies.spec.ts` (ui-builder): wizard happy path to publish (asserts the request body), Save and exit as draft, `incomplete` alert links jump to the right step, `apply_by_not_in_future`, save network error keeps values, edit a draft and publish, leaving with unsaved changes shows D4; axe on S2 and S3; 390 px

**Checkpoint**: an employer can post and publish (quickstart 1–4).

---

## Phase 4: User Story 2 — Employer sees and finds their vacancies (P1)

**Independent test**: quickstart 5, 13, 14; US2 e2e block.

- [X] T025 [P] [US2] Write `tests/vacancies/test_list.py`: only own vacancies; `status` filter per group; `q` case-insensitive title substring within the group; `counts` ignore `q`/`status` and match the rows; newest `updated_at` first; an expired Open vacancy is already `closed` in the list (sweep ran); empty list → `items: []` with zero counts
- [X] T026 [US2] Implement `GET /api/company/vacancies?status=&q=` in `src/vacancies/router.py` → `VacancyListOut`. Make T025 pass
- [X] T027 [US2] Create `frontend/src/features/company-vacancies/VacanciesListPage.tsx` (ui-builder) wiring **S1** `VacancyListView`: status group + search in the URL query (`?status=&q=`, debounced search), `loading` / `error` with retry / empty ("Post a vacancy") / no-results, row click → `/company/vacancies/:id`, mobile dropdown and stacked rows come from the View; actions are wired by later stories (until then `onAction` handles only `edit`)
- [X] T028 [US2] Replace the demo `/company/vacancies` route (and keep `/company` → `/company/vacancies`) in `frontend/src/app/router.tsx` with `VacanciesListPage` inside `RequireRole role="employer"` + `EmployerLayout` (ui-builder)
- [X] T029 [US2] Write the US2 block of `frontend/e2e/company-vacancies.spec.ts` (ui-builder): groups and counts, search, empty state, list error + retry, mobile status dropdown at 390 px, row opens the vacancy; axe on S1 desktop and mobile

---

## Phase 5: User Story 3 — Employer closes a vacancy before its deadline (P1)

**Independent test**: quickstart 8; US3 e2e block.

- [X] T030 [P] [US3] Write `tests/vacancies/test_close.py`: `close` from `open` and from `paused` → `closed`, `closed_by = employer`, `closed_at` ≈ now, `version` + 1; from `draft` or `closed` → 409 `invalid_transition` with `status`; stale version → 409 `version_conflict`; after closing, `rules.accepting_applications` is false and the vacancy is not in a `visible_in_search()` query
- [X] T031 [US3] Add the `close` action to `POST /{id}/status` in `src/vacancies/router.py`. Make T030 pass
- [X] T032 [US3] Create `frontend/src/features/company-vacancies/VacancyPage.tsx` (ui-builder) wiring **S4** `VacancyPageView`: load by id (`loading` / `error` / `not-found`), status line and notice from the item, "Edit vacancy" → S3, "⋯" actions via `onAction`; replace the demo `/company/vacancies/:id` route in `frontend/src/app/router.tsx` (inside `RequireRole employer` + `EmployerLayout`)
- [X] T033 [US3] Wire "Close vacancy" + **D1** confirm on S1 (`VacanciesListPage`) and S4 (`VacancyPage`) (ui-builder): confirm → `status close` with the item's `version` → toast "Vacancy closed" and refreshed data; cancel → nothing; `invalid_transition` → `notice` + refetch; `version_conflict` → refetch + notice; network → error toast, dialog stays
- [X] T034 [US3] Write the US3 block of `frontend/e2e/company-vacancies.spec.ts` (ui-builder): close from list and from the vacancy page (asserts `action: "close"` + `version`), cancel keeps status, refused action shows the notice; axe on D1

---

## Phase 6: User Story 4 — A vacancy closes by itself at its deadline (P1)

**Independent test**: quickstart 11; US4 tests.

- [X] T035 [P] [US4] Write `tests/vacancies/test_deadline.py` with `freeze_now`: an `open` and a `paused` vacancy whose `closes_at` passed are returned `closed` with `closed_by = deadline` and `closed_at = closes_at` by `GET /{id}` and `GET` list; a vacancy closing tomorrow is untouched; `resume` on a paused vacancy past its deadline → 409 `invalid_transition` with `status: "closed"`; `accepting_applications` is false one second after `closes_at` even before any sweep
- [X] T036 [US4] Make T035 pass in `src/vacancies/rules.py` / `router.py` (sweep at the start of every handler, including status actions and `PUT`)
- [X] T037 [US4] In the US4 block of `frontend/e2e/company-vacancies.spec.ts` (ui-builder): a mocked `closed_by: "deadline"` vacancy shows "Closed on its deadline, …" on S1 (desktop row and mobile stacked row) and S4, and offers Edit + Reopen only

---

## Phase 7: User Story 5 — Employer edits a vacancy (P2)

**Independent test**: US5 tests + e2e block.

- [X] T038 [P] [US5] Write `tests/vacancies/test_edit_published.py`: `PUT` on `open`/`paused`/`closed` keeps the status; removing a required field from an Open vacancy → 422 `incomplete`; a past `apply_by` on Open/Paused → 422 `apply_by_not_in_future`; changing `apply_by` updates `closes_at`; two `PUT`s with the same `version` → second 409 `version_conflict` returning the first one's result; other employer → 404
- [X] T039 [US5] Make T038 pass in `src/vacancies/router.py` (shared completeness/deadline guard for non-drafts)
- [X] T040 [US5] Extend `EditVacancyPage.tsx` (ui-builder) for **non-drafts**: Discard / "Save changes" only after an edit, `incomplete` / `apply_by_not_in_future` → `errors` + `formAlert`, `version_conflict` → `formAlert conflict` with "Load latest" (`onLoadLatest` refetches and resets the form), save error keeps values, D4 guard as in T022
- [X] T041 [US5] Write the US5 block of `frontend/e2e/company-vacancies.spec.ts` (ui-builder): edit an Open vacancy and save (status unchanged), conflict → Load latest, past deadline error, Discard; axe on S3 states `dirty` and `conflict`

---

## Phase 8: User Story 6 — Employer pauses and resumes a vacancy (P2)

- [X] T042 [P] [US6] Write `tests/vacancies/test_pause_resume.py`: `pause` open → paused (still not accepting, not in search); `resume` paused → open with `apply_by` unchanged; `pause` from paused/draft/closed and `resume` from open/draft/closed → 409 `invalid_transition`; `close` from paused → closed
- [X] T043 [US6] Add `pause` and `resume` to `POST /{id}/status` in `src/vacancies/router.py`. Make T042 pass
- [X] T044 [US6] Wire Pause / Resume on S1 and S4 (ui-builder): no dialog, toast "Vacancy paused" / "Vacancy is open again", S4 paused notice's "Resume" button; refusals as in T033
- [X] T045 [US6] Write the US6 block of `frontend/e2e/company-vacancies.spec.ts` (ui-builder): pause then resume from the list "⋯" and from the S4 notice; menu shows only valid actions per status

---

## Phase 9: User Story 7 — Employer reopens a closed vacancy (P2)

- [X] T046 [P] [US7] Write `tests/vacancies/test_reopen.py`: `reopen` closed → open with the new `apply_by`, new `closes_at`, `closed_at`/`closed_by` cleared; without `apply_by` or with a past one → 422 `apply_by_not_in_future`, still closed; from open/paused/draft → 409 `invalid_transition`
- [X] T047 [US7] Add `reopen` to `POST /{id}/status` in `src/vacancies/router.py`. Make T046 pass
- [X] T048 [US7] Wire Reopen + **D2** (empty `DateField`, min = `todayKz()`) on S1 and S4 (ui-builder): confirm → `status reopen` with `apply_by`; `apply_by_not_in_future` → `reopenError` "Choose today or a later date", dialog stays open; success toast
- [X] T049 [US7] Write the US7 block of `frontend/e2e/company-vacancies.spec.ts` (ui-builder): reopen with a valid date (asserts body), past-date error, calendar opens inside the dialog without clipping; axe on D2

---

## Phase 10: User Story 8 — Employer deletes a draft (P3)

- [X] T050 [P] [US8] Write `tests/vacancies/test_delete.py`: `DELETE /{id}?version=` on a draft → 204 and its `vacancy_skills` rows gone (skills themselves stay); on open/paused/closed → 409 `not_a_draft` with `status`; stale version → 409; other employer → 404
- [X] T051 [US8] Implement `DELETE /api/company/vacancies/{id}` in `src/vacancies/router.py`. Make T050 pass
- [X] T052 [US8] Wire "Delete draft" + **D3** on S1 and S4 (ui-builder): confirm → `DELETE` → toast, list refreshed, from S4 navigate to `/company/vacancies`; `not_a_draft` → refetch (menu hides Delete)
- [X] T053 [US8] Write the US8 block of `frontend/e2e/company-vacancies.spec.ts` (ui-builder): delete a draft from the list and from S4; no Delete item for published statuses; axe on D3

---

## Phase 11: User Story 9 — Students see the vacancy's real state (P3)

No student UI in this feature (plan "UI Surface"); the rule is delivered server-side for the student features.

- [X] T054 [US9] Write `tests/vacancies/test_student_rules.py` and make it pass: for draft, paused, closed (by employer and by deadline) `accepting_applications` is false and `visible_in_search()` excludes them; for open with a future `closes_at` both are true; document in the `src/vacancies/rules.py` module docstring that the applying feature must answer 409 `vacancy_not_accepting` (`status`) and the student pages show "Not accepting applications right now" / "This vacancy is closed" (spec FR-017)

---

## Phase 12: Polish & cross-cutting

- [X] T055 [P] Amend `.specify/memory/constitution.md` Technology line "JWT auth" → "cookie sessions (see specs/001-user-auth/research.md R1)", version 1.0.0 → 1.0.1 (PATCH), Last Amended date (plan Constitution Check follow-up)
- [X] T056 [P] Remove the demo vacancy data no longer used by real routes from `frontend/src/mocks/data.ts` only if nothing else imports it (templates and other demo routes still may) (ui-builder)
- [X] T057 Run the automated checks from `specs/002-employer-vacancies/quickstart.md`: `uv run pytest tests -q`, `npm run build && npm run lint && npm run lint:css`, `npm run test:e2e -- e2e/company-vacancies.spec.ts --workers=2`, plus `e2e/auth.spec.ts` and `e2e/design-system.spec.ts`; all must pass (report real output)
- [X] T058 Walk through quickstart manual scenarios 1–15 against the real API (`uv run python -m src.scripts.create_tables` first) and note failures in this file — verified manually by the owner on 2026-11-03 (all scenarios work)
- [X] T059 Run `/speckit-design-qa` (design-qa → `specs/002-employer-vacancies/design/qa-report.md`) and fix what it reports

---

## Dependencies & execution order

- Setup (1) → Foundational (2) → stories → Polish (12).
- **US1** and **US2** are independent after Phase 2. **US3** needs US2's list page (T027) and adds S4 (T032), which US4–US8 reuse.
  **US4** needs only Phase 2 backend + US3's S4 for its e2e. **US5** extends US1's edit page. **US6/US7/US8** need US3 (S1 + S4 wiring patterns).
  **US9** needs only Phase 2.
- Within a story: failing backend test → endpoint → frontend hooks → page → e2e.
- Shared files — one task at a time: `src/vacancies/router.py`, `frontend/src/features/company-vacancies/hooks.ts`,
  `frontend/src/app/router.tsx`, `frontend/e2e/company-vacancies.spec.ts`, `VacanciesListPage.tsx`, `VacancyPage.tsx`.

### Parallel opportunities

- Phase 2: T003, T004, T005, T008, T010, T012 together; T014 and T016 alongside the backend.
- Every story's backend test task ([P]) can be written while the previous story's frontend is wired.
- Backend stream (main session) and frontend stream (ui-builder) of a story run in parallel; they meet in the e2e block (mocked API) and in the quickstart run.

## Parallel example: Phase 2

```text
Task: "Create src/catalog/enums.py"                 (T003)
Task: "Create src/skills/models.py + normalize + repository" (T005)
Task: "Create src/vacancies/deadlines.py"            (T008)
Task: "Write tests/vacancies/test_rules.py"          (T012)
Task: "Create features/company-vacancies/api.ts"     (T014, ui-builder)
```

## Implementation strategy

1. **MVP = US1 + US2 + US3 + US4 (all P1)**: post, list, close, auto-close. Stop and demo: an employer can post a vacancy
   and end it, by hand or by deadline.
2. Then US5 (edit), US6 (pause/resume), US7 (reopen), US8 (delete draft), US9 (rules for students).
3. Polish, full checks, `/speckit-design-qa`.

## Notes

- Never print or commit `.env`; tests use `TEST_DATABASE_URL`.
- Commit after each phase or logical group on branch `002-employer-vacancies`.
- Wiring problems are fixed in pages; design problems go back through `/speckit-design`.
