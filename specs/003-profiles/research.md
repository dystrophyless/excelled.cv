# Research: Student and company profiles

## R1 — Separate create and update; update is versioned

**Decision**: `POST` creates (409 `profile_exists` if there is one); `PUT` updates with the `version` that was read and
answers 409 `version_conflict` with the current profile when it is stale; `GET` returns the profile or 404
`profile_not_found`. Creation relies on the unique `user_id` constraint, so a double submit yields one row.
**Rationale**: same optimistic-concurrency pattern as 002 (R3 there); a stale tab cannot overwrite (FR-012).
**Alternatives**: one upsert `PUT` — a stale tab would overwrite silently.

## R2 — `has_profile` on the account

**Decision**: `AccountOut` gains `has_profile: bool` — true when the row for the account's role exists. Returned by
`/auth/me` and the sign-in response. The SPA invalidates `["me"]` after creating a profile.
**Rationale**: the SPA loads `["me"]` before rendering any guarded page, so the redirect needs no extra request and never
flashes the wrong page.
**Alternatives**: a separate status endpoint (extra round trip per navigation); read the profile in the guard (two
different 404 meanings).

## R3 — The profile rule lives in `RequireRole`

**Decision**: `RequireRole` redirects a profile-less account to `/onboarding` or `/company/onboarding` with
`?next=<requested path>`; the onboarding pages use a guard that allows only profile-less accounts of their role and send
others to their profile page. After saving: `next` (same-origin, via the existing `safeNext`), otherwise
`/app/profile` for a student (they see what they saved) and `/company/vacancies` for an employer.
**Rationale**: every role page is already wrapped in `RequireRole`; no page can be forgotten.

## R4 — Vacancy gate in the backend

**Decision**: the `vacancy_db` dependency (runs for every employer vacancy call) checks the company profile and raises
403 `company_profile_required`. Test fixtures `employer`/`other_employer` get a profile by default; a separate
`employer_without_profile` fixture tests the gate.
**Rationale**: FR-015 holds for direct API calls too; covers old employer accounts without a migration.

## R5 — Fixed lists in the catalog

**Decision**: `Industry` (`it`, `finance`, `education`, `healthcare`, `retail`, `manufacturing`, `media`, `government`,
`consulting`, `other`) and `CompanySize` (`1_10`, `11_50`, `51_200`, `201_1000`, `1000_plus`; Python names prefixed,
e.g. `s1_10`) with labels in `src/catalog/enums.py`; `/api/catalog` adds `industries` and `company_sizes`.
**Rationale**: same pattern as 002 R6 — server owns the lists, the UI renders them.

## R6 — Validation rules

**Decision** (updated in design round 13, owner): full name 2–80; university 2–120; degree from the Kazakhstan levels
(college, bachelor, master, doctoral, residency) with a year of study 1…max (4/4/2/3/4) or "graduated"; no graduation
year; GPA optional 0.00–4.00 (the 4-point scale of Kazakhstan's credit system); looking-for fields 0–3 (0 = "I'm not sure yet") from the refined vacancy
field list and position types 1–3 from the vacancy type list; projects (title 2–80, description ≤ 300, http(s) url) and
languages (language 2–40, level native/fluent/intermediate/basic, each language once) up to 10 each; contacts optional
(phone and WhatsApp 7–20 chars of digits/space/+-(), Telegram 5–32 `[A-Za-z0-9_]` stored without "@", LinkedIn/GitHub/website
http(s) ≤ 200); city from the existing `City` list or null; about me ≤ 1000; company
name 2–120; website ≤ 200 and `http://` or `https://` with a host (a bare `kaspi.kz` is accepted and stored with
`https://` added); description ≤ 1000. Strings are trimmed; empty optional strings become null. Pydantic validation
returns 422 with the field location; the SPA mirrors the rules for instant feedback and maps 422 locations to fields.
**Rationale**: the backlog asks for validation of "invalid academic data"; ranges allow last year's graduates.

## R7 — No copy of the company name

**Decision**: vacancies store no company name. The employer wizard preview reads `GET /api/company/profile` (cached as
`["company-profile"]`). Student-facing features will join the profile.
**Rationale**: FR-016 — a rename shows everywhere.

## R8 — One form per role

**Decision**: onboarding and edit render the same field set per role; the edit page adds the dirty / conflict /
unsaved-changes behaviour (router blocker + `beforeunload`, as in 002's edit page).
**Rationale**: consistent validation and fewer states.
