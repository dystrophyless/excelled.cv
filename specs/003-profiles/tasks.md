---
description: "Task list for 003-profiles — Student and company profiles"
---

# Tasks: Student and company profiles

**Input**: Design documents from `/specs/003-profiles/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/profiles-api.md, quickstart.md, ui-spec.md
(**Approved 2026-11-23**)

**Tests**: REQUIRED (constitution IV, V; spec SC-002: every QA scenario of US5QATest, US6QATest, US7QATest is an automated
e2e test). Backend rules are proven with pytest on `TEST_DATABASE_URL` (test tasks come first and must fail before the
code task after them); every user story with UI gets an e2e block (Playwright + axe, API mocked).

**Organization**: by user story (spec.md US1 student profile, US2 company profile, US3 edit).

## Novio UI rules for tasks

- ui-spec.md is **Approved** — views are wired, not redesigned. UI tasks name the screen (S1 student onboarding, S2 My
  profile, S3 Edit profile, S4 company onboarding, S5 company profile) and the approved View in
  `frontend/src/features/profiles/views/`, and are owned by the `ui-builder` agent — marked **(ui-builder)**. Do not
  edit the Views, `parts.tsx`, `pickers.tsx`, `profile-parts.tsx`, `profiles.module.css`, the `model.ts` types, `mocks.ts`,
  `universities.ts` or the prototype; if a View cannot do what a task needs, stop and ask for a design round.
- The page containers own step state and focus moves exactly as `frontend/src/prototypes/003-profiles.tsx` does
  (h1 on step change, first invalid control on refusal, `#section` focus on arrival from an "Add" button).
- API → view mapping: ui-spec §4 "Data contract for views" (`toStudentIn`, `toStudentValues`, `studentErrorKey(loc)`
  for 422 `loc` → field keys, including `projects.N.url` / `languages.N.language`).
- e2e: `frontend/e2e/profiles.spec.ts`, API mocked by `page.route` helpers in `frontend/e2e/support/profiles-api.ts`;
  each story block covers its QA-sheet scenarios, error states, axe, 390 px with no horizontal scroll. Signed-in
  account via `signedInAs(page, role)` from `e2e/support/auth-api.ts` (gains a `hasProfile` option).
- Final task: `/speckit-design-qa`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US3 from spec.md

## Path conventions

Backend `src/`, backend tests `tests/`, frontend `frontend/src/`, e2e `frontend/e2e/`. API bases
`/api/student/profile`, `/api/company/profile` (contract: `specs/003-profiles/contracts/profiles-api.md`). Auth, error
shape (`src/auth/exceptions.py::api_error`), `require_role`, `UtcDatetime` and the pytest harness come from 001/002.

---

## Phase 1: Setup

- [X] T001 Create packages `src/profiles/__init__.py` and `tests/profiles/__init__.py`
- [X] T002 Extend `tests/conftest.py`: import `src.profiles.models` (so `drop_all/create_all/TRUNCATE` cover the new tables); the `employer` and `other_employer` fixtures now also create a `CompanyProfile` (name "Acme" / "Other Co", industry `it`, size `11_50`) so every 002 test keeps its meaning; add fixtures `employer_without_profile`, `student_with_profile` (a complete `StudentProfile`: Bachelor's, year 3, fields `["backend"]`, types `["internship"]`) and `make_student_profile(user, **overrides)`

---

## Phase 2: Foundational (blocking prerequisites)

**⚠️ No user-story work starts until this phase is done.**

### Backend

- [X] T003 Extend `src/catalog/enums.py` (data-model § Enums, research R5): `Industry` = `it` · `finance` · `education` · `healthcare` · `retail` · `manufacturing` · `media` · `government` · `consulting` · `other` (labels "IT & software", "Finance & banking", "Education", "Healthcare", "Retail & e-commerce", "Manufacturing", "Media & marketing", "Government & public sector", "Consulting", "Other"); `CompanySize` = `1_10` · `11_50` · `51_200` · `201_1000` · `1000_plus` (Python names `s1_10`…, labels "1–10 employees" … "1000+ employees"); `Degree` = `college` · `bachelor` · `master` · `doctoral` · `residency` with labels "College (TVE)", "Bachelor's", "Master's", "Doctoral (PhD)", "Residency" and `DEGREE_MAX_YEAR` "college 4, bachelor 4, master 2, doctoral 3, residency 4"; `LanguageLevel` = `native` · `fluent` · `intermediate` · `basic`. **Refine `VacancyField`** to `backend` · `frontend` · `mobile` · `data_analytics` · `data_science` · `data_engineering` · `qa` · `design` · `devops` · `security` · `product` · `other` with the labels and one-line descriptions from ui-spec §1 field table (`DESCRIPTIONS` dict); keep the member `data` in the enum (Postgres label stays) but exclude it from `options()` and from accepted input (`ACCEPTED_FIELDS`)
- [X] T004 Update `src/catalog/router.py`: `GET /api/catalog` adds `industries`, `company_sizes`, `degrees` (`[{value, label, max_year}]`), `language_levels`; `fields` items gain `description` and no longer list `data` (contract "Changed")
- [X] T005 Update `src/vacancies/schemas.py` so vacancy input refuses `field: "data"` (422, use `ACCEPTED_FIELDS`), and fix every 002 test / factory that uses `VacancyField.data` to `data_analytics` (`tests/vacancies/*`)
- [X] T006 Create `src/profiles/models.py` (data-model.md): `StudentProfile` — `user_id` "FK users.id ON DELETE CASCADE, unique", `full_name` "varchar(80)", `university` "varchar(120)", `degree` "`degree` enum", `major` "varchar(120)", `study_year` "smallint, null — NULL exactly when graduated", `graduated` "boolean, default false", `gpa` "numeric(3,2), null", `looking_for_fields` "`vacancy_field[]`, 0–3", `position_types` "`vacancy_type[]`, 1–3", `city` "`city` enum, null", `about` "text, null", `phone`/`whatsapp` "varchar(20), null", `telegram` "varchar(33), null", `linkedin_url`/`github_url`/`website_url` "varchar(200), null", `version` "int NOT NULL default 1", `created_at`/`updated_at`; check constraint "(graduated AND study_year IS NULL) OR (NOT graduated AND study_year IS NOT NULL)"; `StudentProject` (`profile_id` FK CASCADE, `position` smallint, `title` varchar(80), `description` varchar(300) null, `url` varchar(200) null); `StudentLanguage` (`profile_id` FK CASCADE, `position`, `language` varchar(40), `level` `language_level` enum; unique index on (`profile_id`, lower(`language`))); `CompanyProfile` — `user_id` unique FK CASCADE, `name` varchar(120), `industry`, `size`, `website` varchar(200) null, `city` null, `description` text null, `version`, timestamps. Relationships `projects` / `languages` ordered by `position`, `cascade="all, delete-orphan"`. Import in `src/models.py` and `src/scripts/create_tables.py`
- [X] T007 Extend `src/scripts/create_tables.py` with an idempotent step for existing databases: `ALTER TYPE vacancy_field ADD VALUE IF NOT EXISTS` for `data_analytics`, `data_science`, `data_engineering`, `security` (outside a transaction), then `UPDATE vacancies SET field='data_analytics' WHERE field='data'`; document it in `README.md` "Upgrading"
- [X] T008 [P] Write `tests/profiles/test_me.py` (must fail first): `/api/auth/me` and `/api/auth/token` return `account.has_profile` false for a student / employer without a profile and true with one
- [X] T009 Add `has_profile: bool` to `AccountOut` in `src/auth/schemas.py`, computed in `src/auth/router.py` (`/me`, `/token`) by a `profiles.repository.has_profile(db, user)` helper (one indexed lookup in the table of the user's role) in `src/profiles/repository.py`
- [X] T010 [P] Write `tests/profiles/test_vacancy_gate.py` (must fail first): with `employer_without_profile`, every `/api/company/vacancies*` call (list, create, get, put, status, delete) answers 403 `company_profile_required`; a student still gets 403 `wrong_role` first
- [X] T011 Add the gate to the `vacancy_db` dependency in `src/vacancies/router.py` (after the role check, before the sweep), using `has_profile` (research R4)

### Frontend

- [X] T012 [P] `frontend/src/features/auth/api.ts` + `hooks.ts`: `Account` gains `has_profile: boolean`; add `profileHomeFor(role)` = `/onboarding` | `/company/onboarding`
- [X] T013 `frontend/src/features/auth/guards.tsx` (research R3): `RequireRole` sends an account without a profile to its onboarding with `?next=<path+search>`; new `RequireOnboarding({ role })` renders only for a signed-in account of that role **without** a profile (with one → `/app/profile` or `/company/profile`; other role → its home)
- [X] T014 [P] Create `frontend/src/features/profiles/api.ts` (typed client for GET/POST/PUT `/api/student/profile` and `/api/company/profile`, errors via `ApiError` incl. `detail.profile` on 409) and `hooks.ts` (`useStudentProfile` `["student-profile"]`, `useCompanyProfile` `["company-profile"]`, create/update mutations that set the cache and invalidate `["me"]` after a create; `useProfileCatalog` mapping `/api/catalog` → `ProfileCatalog` incl. field descriptions and degree `max_year`)
- [X] T015 Update every e2e mock of `/api/auth/me` / sign-in to include `has_profile: true` by default: `frontend/e2e/support/auth-api.ts` (`signedInAs(page, role, { hasProfile = true })`), `frontend/e2e/design-system.spec.ts`, `frontend/e2e/company-vacancies.spec.ts`; and add `GET /api/company/profile` to `frontend/e2e/support/vacancies-api.ts` mocks
- [X] T016 Follow the refined field list in 002 (ui-spec "Change to 002" note): `frontend/src/features/company-vacancies/mocks.ts` (`data` → `data_analytics`, "Junior Data Engineer" → `data_engineering`), any hard-coded field in `frontend/e2e/company-vacancies.spec.ts` / `e2e/support/vacancies-api.ts` catalog mock (12 fields with descriptions)

**Checkpoint**: backend tests for me / gate pass; all existing pytest + e2e suites still pass.

---

## Phase 3: User Story 1 — Student creates their profile (P1) 🎯 MVP

**Goal**: a new student goes through the 5-step onboarding, saves, lands on My profile (US-05, US5QATest).
**Independent test**: sign up as a student → onboarding → Save → `/app/profile` shows the data; empty required answers are refused per step.

### Tests (write first, must fail)

- [X] T017 [P] [US1] `tests/profiles/test_student_create.py`: POST creates (201, version 1, projects/languages `[]`), second POST → 409 `profile_exists`, GET → 200 / 404 `profile_not_found`; an employer gets 403 `wrong_role`; unauthenticated 401
- [X] T018 [P] [US1] `tests/profiles/test_student_validation.py` (FR-002/003, research R6): 422 with the field `loc` for — empty / whitespace `full_name`, `university`, `major`; `degree` not in the enum; `study_year` 0, 5 with `bachelor`, 3 with `master`, missing while `graduated` false, given while `graduated` true; `gpa` 4.01, -0.1, 3.456; `looking_for_fields` 4 values, duplicates, `data`; `position_types` empty; `about` 1001 chars; `phone`/`whatsapp` "abc"; `telegram` "@ab"; bad URLs; 11 projects; project title 1 char; duplicate language (case-insensitive); 11 languages. Accepted: "kaspi.kz"-style URL gets `https://`, `@maya_akh` stored as `maya_akh`, `gpa` "3,45" → 3.45, empty optional strings → null, `looking_for_fields: []` (not sure yet)

### Implementation

- [X] T019 [US1] Create `src/profiles/schemas.py`: `StudentProfileIn` / `StudentProfileOut` (contract shape incl. `contacts`, `projects`, `languages`, `UtcDatetime` timestamps, `gpa` as string with two decimals), `CompanyProfileIn` / `CompanyProfileOut`; validators implementing every rule of T018 (trim, empty→null, degree-dependent year via `DEGREE_MAX_YEAR`, URL scheme fill, Telegram "@" strip, phone pattern, list limits)
- [X] T020 [US1] Create `src/profiles/repository.py` functions `get_student(db, user_id)`, `create_student(db, user_id, data)` (catches the unique violation → `profile_exists`), `student_out(profile)` and the router `src/profiles/router.py` with `GET`/`POST /student/profile` (`require_role("student")`); include it in `src/main.py` under `/api`
- [X] T021 [US1] (ui-builder) S1: create `frontend/src/features/profiles/StudentOnboardingPage.tsx` wiring `StudentOnboardingView` (ui-spec S1; steps, Continue/Back/Save, step validation, `fieldChoice` exclusivity, focus moves as in the prototype, 422 → `studentErrorKey` → jump to the first wrong step, save error alert, Log out → `useSignOut`), POST via `api.ts`, then `next` (`safeNext`) or `/app/profile`; route `/onboarding` under `RequireOnboarding role="student"` in `frontend/src/app/router.tsx`
- [X] T022 [US1] (ui-builder) S2: create `frontend/src/features/profiles/StudentProfilePage.tsx` wiring `StudentProfileView` (ui-spec S2: loading / error with retry / default / partial / minimal; Add buttons → `/app/profile/edit#<section>`); route `/app/profile` under `RequireRole role="student"`
- [X] T023 [US1] (ui-builder) Account menu (ui-spec §3 "Account menu"): `StudentLayout` / `EmployerLayout` in `frontend/src/app/layouts/layouts.tsx` show the profile name (`full_name` / company `name` from the profile queries), the sign-in email while it loads or fails; no setup progress
- [X] T024 [US1] (ui-builder) e2e block "US1 student profile" in `frontend/e2e/profiles.spec.ts` + `frontend/e2e/support/profiles-api.ts`: US5QATest 1 (all 5 steps → Save → My profile shows name, "{Major} · {Degree}, {n} year", looking for, university), US5QATest 2 (Continue with empty / invalid answers on each step shows the field messages, nothing POSTed), redirect of a profile-less student from `/app/vacancies` to `/onboarding?next=…` and back after Save, `/onboarding` with a profile → `/app/profile`, Tab picks a university after typing, "I'm not sure yet" path sends `looking_for_fields: []`, save error alert, axe on every step, 390 px no horizontal scroll

**Checkpoint**: US1 independently demoable.

---

## Phase 4: User Story 2 — Employer creates the company profile (P1)

**Goal**: a new employer completes the company wizard; vacancy pages require it (US-06, US6QATest, FR-015/016).
**Independent test**: sign up as an employer → company onboarding → Save → vacancies list; New vacancy preview shows the company name.

- [X] T025 [P] [US2] `tests/profiles/test_company_profile.py`: create / get / duplicate 409 / student 403; validation 422 (empty name, 1-char name, unknown industry or size, website "not a site", description 1001 chars; "kaspi.kz" → "https://kaspi.kz")
- [X] T026 [US2] Add `get_company`, `create_company` to `src/profiles/repository.py` and `GET`/`POST /company/profile` (`require_role("employer")`) to `src/profiles/router.py`
- [X] T027 [US2] (ui-builder) S4: `frontend/src/features/profiles/CompanyOnboardingPage.tsx` wiring `CompanyOnboardingView` (ui-spec S4), POST, then `next` or `/company/vacancies`; route `/company/onboarding` under `RequireOnboarding role="employer"`
- [X] T028 [US2] (ui-builder) 002 change: `frontend/src/features/company-vacancies/NewVacancyPage.tsx` passes `company={companyProfile.name}` from `useCompanyProfile` (delete the `COMPANY` constant; the query counts in loading / error with the catalog; retry refetches both)
- [X] T029 [US2] (ui-builder) e2e block "US2 company profile": US6QATest 1–3 (wizard → Save → vacancies list; empty required / bad website refused; employer without a profile opening `/company/vacancies/new` is sent to the company step and back after Save), a 403 `company_profile_required` from the API also redirects there, the wizard preview shows the company name, axe, 390 px

---

## Phase 5: User Story 3 — Edit the profile (P2)

**Goal**: both roles edit their profile; invalid changes and stale saves are refused (US-07, US7QATest).
**Independent test**: change a field → Save → reload shows it; clear a required field → error, stored value unchanged; two tabs → 409.

- [X] T030 [P] [US3] `tests/profiles/test_edit.py`: PUT student / company with the current version → 200, version + 1, projects and languages replaced as whole lists (order kept); stale version → 409 `version_conflict` with `profile` = current; invalid body → 422 and the stored row unchanged; PUT without a profile → 404; another account can't read or change it (SC-005, both roles both directions)
- [X] T031 [US3] Add `update_student`, `update_company` (`UPDATE … WHERE version = :v`, replace child rows in the same transaction) to `src/profiles/repository.py` and `PUT` handlers to `src/profiles/router.py` (conflict body as in 002's `version_conflict`)
- [X] T032 [US3] (ui-builder) S3: `frontend/src/features/profiles/StudentProfileEditPage.tsx` wiring `StudentProfileEditView` (ui-spec S3: prefilled values via `toStudentValues`, dirty bar, Save/Discard, `#section` focus on arrival, add/remove project and language rows, 422 mapping incl. row errors, 409 conflict alert with Load latest keeping the 409's version as base, leave-confirm via router blocker + `beforeunload`, toast); route `/app/profile/edit`
- [X] T033 [US3] (ui-builder) S5: `frontend/src/features/profiles/CompanyProfilePage.tsx` wiring `CompanyProfileView` (view + edit in one page; rename toast "Your vacancies now show “{name}”"; same dirty / conflict / leave rules); route `/company/profile` (replace the demo `SettingsTemplate` route)
- [X] T034 [US3] (ui-builder) e2e block "US3 edit": US7QATest 1–5 for the student (prefilled form; change year of study + add a project and a language → Save → profile shows them after reload; clear full name → error, stored value unchanged; leave with unsaved changes asks; 409 shows the conflict alert and Load latest), the company rename shows on the wizard preview, the multiple Combobox keeps focus at its max (3 fields), axe, 390 px

---

## Phase 6: Polish & cross-cutting

- [X] T035 [P] Remove the demo routes replaced by real pages from `frontend/src/app/router.tsx` comments / mapping (`/onboarding`, `/app/profile`, `/app/profile/edit`, `/company/profile`; `/company/onboarding` added) and keep the "DEMO ROUTES" note accurate
- [X] T036 [P] Docs: `CHANGELOG.md` 0.4.0 (profiles, catalog refinement, kit ChoiceCard / Combobox / Stepper changes), `README.md` status table, API overview and "Upgrading" step (T007), version 0.4.0 in `pyproject.toml` and `frontend/package.json`; mark US-05/06/07 done in `specs/backlog.md`
- [X] T037 Run every check and report real output: `uv run pytest` (TEST_DATABASE_URL), `npm run build`, `npm run lint`, `npm run lint:css`, `npx playwright test --workers=2` (all suites: auth, company-vacancies, design-system, profiles)
- [X] T038 Run the quickstart.md manual scenarios 1–10 against the real backend (owner verifies)
- [X] T039 `/speckit-design-qa` (re-snap `profile.*` for the approved section order: Looking for above About)

---

## Dependencies & execution order

- Phase 1 → Phase 2 → stories. US1 and US2 are independent of each other after Phase 2 (both need T009/T011–T016).
- US3 needs US1 (student pages/API) and US2 (company API) for its own parts; backend T030–T031 can start after T020/T026.
- Within each story: tests → schemas/repository → router → (ui-builder) pages → e2e.
- Polish after all stories.

### Parallel opportunities

- T008 ∥ T010 (different test files); T012 ∥ T014; T017 ∥ T018; T025 ∥ T030 once their APIs exist.
- ui-builder batches: T021–T024 (US1), T027–T029 (US2), T032–T034 (US3) — one run per story.

## Implementation strategy

MVP = Phase 1–3 (student onboarding + My profile), then US2 (unblocks employers, enforces the gate), then US3 (editing),
then polish and design QA. Commit per phase.
