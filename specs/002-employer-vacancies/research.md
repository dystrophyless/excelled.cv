# Research: Employer vacancies

Phase 0 of [plan.md](./plan.md). Each decision resolves an open technical question from the spec.
Builds on 001-user-auth: cookie sessions, `require_role`, error shape `{detail:{code,message,...}}`, Origin check.

## R1. Closing at the deadline without a scheduler (FR-014, SC-003, SC-004)

- **Decision**: Store the deadline as a date (`apply_by`) **and** the exact moment it ends (`closes_at` = end of that day
  in Kazakhstan time, UTC+5, as a `timestamptz`). Close lazily:
  1. **Every rule check uses `closes_at`**: "accepting applications" = `status = open AND closes_at > now()`; "visible in
     search" = the same. So nothing can be applied to after the deadline, even before any row is updated.
  2. **A sweep persists it**: one indexed `UPDATE vacancies SET status='closed', closed_by='deadline', closed_at=closes_at
     WHERE status IN ('open','paused') AND closes_at <= now()` runs at the start of every vacancy request (employer list,
     detail, actions). It is idempotent and touches only expired rows.
- **Rationale**: Correctness never depends on a background job (SC-003 holds at the exact second); the stored status
  catches up on the next read, well inside SC-004's one minute because nobody can see the vacancy without a read. No new
  infrastructure, works with several workers.
- **Alternatives considered**: APScheduler / cron in the API process (runs once per worker, lost on restart, needs
  locking); Postgres `pg_cron` (extension + ops work); computing the status only on read and never storing it (makes
  "closed by deadline" history and list grouping awkward).

## R2. Kazakhstan time for deadlines

- **Decision**: A fixed `UTC+05:00` offset (`timezone(timedelta(hours=5))`); `closes_at = (apply_by + 1 day) 00:00 at
  UTC+5`. Shown to users in their local time by the browser.
- **Rationale**: Kazakhstan uses a single UTC+5 time zone with no daylight saving; a fixed offset avoids a `tzdata`
  dependency on Windows dev machines.
- **Alternatives considered**: `zoneinfo("Asia/Almaty")` (needs `tzdata` on Windows; same result today); storing a
  per-vacancy time zone (no need in a one-country MVP).

## R3. Concurrent changes (edge case "two actions at once")

- **Decision**: Optimistic concurrency. Each vacancy has `version` (int). Edit, status actions and delete send the version
  they were based on; the server applies them with `... WHERE id = :id AND version = :v` and increments it. A mismatch →
  **409 `version_conflict`** with the current status, and the UI reloads the vacancy and tells the user what changed.
  Status actions are additionally guarded by the allowed-from statuses in the same `WHERE` (→ **409
  `invalid_transition`** naming the current status, FR-013).
- **Rationale**: Prevents silently lost edits and double transitions with one SQL statement and no locks held across
  requests.
- **Alternatives considered**: Last write wins (silently loses edits — rejected by the spec); row locks
  (`SELECT … FOR UPDATE`) only protect within one request, not between two open tabs.

## R4. Ownership and not leaking existence (FR-018, SC-006)

- **Decision**: Every employer endpoint lives under `/api/company/vacancies`, depends on `require_role("employer")`
  (401 / 403 from 001), and loads vacancies with `WHERE id = :id AND employer_id = :me`. Not found **or** not mine →
  the same **404 `vacancy_not_found`**.
- **Rationale**: One query shape for both cases means identical responses and timing.
- **Alternatives considered**: 403 for other employers' vacancies (reveals that the id exists).

## R5. Skills: free entry now, shared vocabulary later (FR-003)

- **Decision**: A `skills` table (`name` as first typed, `key` = trimmed, lower-cased, inner spaces collapsed, unique) and
  a `vacancy_skills` link (`kind` = `required` | `nice`, `position`). Saving a vacancy upserts skills by `key`. A
  `GET /api/skills?q=` endpoint suggests existing skills (prefix match, top 10). Duplicates and a skill in both groups are
  resolved server-side: one row per skill, the group chosen last wins (spec edge case).
- **Rationale**: Matching (later feature) compares student and vacancy skills by the same `key`; one table now avoids a
  migration later. Free entry matches the template (`Combobox allowCreate`).
- **Alternatives considered**: Skills as a text array on the vacancy (no shared vocabulary, no suggestions); a curated,
  closed skill list (blocks employers on day one).

## R6. Fixed lists: type, field, city, format (FR-001)

- **Decision**: Python enums on the server are the source of truth; `GET /api/catalog` returns them with display labels.
  The SPA loads the catalog once (TanStack Query, long `staleTime`) for selects and labels. Initial values: types
  Internship / Full-time / Part-time; formats On-site / Hybrid / Remote; fields Backend, Frontend, Mobile, Data, QA,
  Design, DevOps, Product, Other; cities Almaty, Astana, Shymkent, Karaganda, Aktobe, Other.
- **Rationale**: One source of truth for validation and for the student filters built later.
- **Alternatives considered**: Hard-coding the lists in both apps (drift); DB tables with an admin UI (no admin in MVP).

## R7. Draft vs publish validation (FR-002)

- **Decision**: One input schema with every content field optional except `title`; the server validates "complete"
  only when the result must be Open (create with `publish: true`, the `publish` action, and edits of Open/Paused
  vacancies). Incomplete → **422 `incomplete`** with `fields: [...]` naming what is missing; a non-future deadline →
  **422 `apply_by_not_in_future`**.
- **Rationale**: Drafts can be saved at any point; published vacancies can never become incomplete through an edit.
- **Alternatives considered**: Two schemas (drafts vs published) duplicated across create/edit.

## R8. Rules other features must reuse (FR-009, FR-017)

- **Decision**: `src/vacancies/rules.py` exposes `accepting_applications(vacancy, now)` and a SQL filter
  `visible_in_search()` (`status = open AND closes_at > now()`), unit-tested here. The future applying / search / saved
  features call them; this feature does not build student pages.
- **Rationale**: The rule is defined once, with the feature that owns the status, and is proven by tests now.
- **Alternatives considered**: Building the student vacancy page here (belongs to the student browsing feature; would
  duplicate the Detail archetype work).

## R9. Applicant counts before applications exist (FR-006)

- **Decision**: The list/detail responses carry `applicants` and `new_applicants`, returned as `0` until the applying
  feature adds its table and fills them.
- **Rationale**: The contract and UI are final now; no UI change when applying lands.

## R10. Schema changes

- **Decision**: New tables only (`vacancies`, `skills`, `vacancy_skills`, enums) — `create_tables` (create_all) adds them
  without touching auth data; no `--reset` needed. Alembic stays a recorded follow-up (001 R8).

## R11. Post = Wizard, Edit = Form

- **Decision**: Follow ia.md: `/company/vacancies/new` uses the **Wizard** archetype (Basics → Skills → Details →
  Preview), `/company/vacancies/:id/edit` the employer **Form** (`/styleguide/templates/vacancy-edit`). Both use the same
  fields and the same API. Final layout is the designer's call in `/speckit-design`.

## R12. Testing

- **Decision**: Same as 001 R10 — pytest + httpx ASGI on `TEST_DATABASE_URL` (status rules, deadline sweep with a
  frozen clock via an injectable `now`, ownership/404, version conflicts, validation), Playwright + axe with `page.route`
  mocks for every screen state.
