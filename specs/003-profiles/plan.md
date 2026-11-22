# Implementation Plan: Student and company profiles

**Branch**: `003-profiles` | **Date**: 2026-11-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-profiles/spec.md` (backlog US-05, US-06, US-07)

## Summary

Each student gets one profile (basic + academic information) and each HR representative one company profile. A new
`profiles` backend module adds two tables and, per role, read / create / update endpoints on top of 001's cookie sessions
and role guard. `GET /auth/me` reports `has_profile`, so the SPA sends profile-less accounts to the profile step before
any other page of their role. The employer vacancy API refuses accounts without a company profile
(`company_profile_required`), which also covers employers created before this feature. The SPA replaces the demo routes
`/onboarding`, `/app/profile`, `/app/profile/edit`, `/company/onboarding` and `/company/profile` with real pages, and the
vacancy wizard preview shows the real company name. Decisions: [research.md](./research.md) R1–R8.

## Technical Context

**Language/Version**: Python 3.13 (backend) · TypeScript / React 19 (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2 async (psycopg 3), pydantic · Vite, React Router, TanStack Query 5,
Novio UI kit — all existing; no new runtime dependency.

**Storage**: PostgreSQL — new tables `student_profiles`, `company_profiles` and enums `industry`, `company_size`
([data-model.md](./data-model.md)); created by the existing `create_tables` script; no change to existing tables.

**Testing**: pytest + pytest-asyncio + httpx ASGI on `TEST_DATABASE_URL` (`tests/profiles/`) · Playwright + axe
(`frontend/e2e/profiles.spec.ts`, mocked API with `page.route`) with one test per backlog QA scenario (SC-002).

**Target Platform**: Linux server (API) · evergreen desktop and mobile browsers, 390–1440 px

**Project Type**: Web application — FastAPI backend in `src/`, React SPA in `frontend/`

**Performance Goals**: profile read / write < 200 ms p95; `has_profile` adds one indexed lookup to `/auth/me`.

**Constraints**: owner-only access (SC-005); no silent overwrite (R1); vacancy actions refused without a company profile
(SC-006); existing 001/002 behaviour unchanged for accounts that have a profile.

**Scale/Scope**: thousands of accounts · 5 screens + 1 dialog · 6 endpoints (+2 changed responses) · 2 tables.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Spec-driven delivery | spec traced to backlog US-05/06/07 and their QA sheets; design runs after this plan | ✅ |
| I. Scope decisions in ia.md | routes and archetypes as in the IA sitemap; one role per account; later onboarding steps left to their features | ✅ |
| II. One design system | Wizard, Detail (own profile), Form; kit components, tokens only; no new archetype expected | ✅ |
| III. Owner approves design first | `/speckit-design` → approval → `before_tasks` gate | ✅ (pending design step) |
| IV. States + e2e-ready | loading / error with retry / success; validation, conflict and unsaved-changes states; e2e per QA scenario + axe | ✅ |
| V. Verify, then claim | quickstart: pytest, build, lint, lint:css, e2e (all suites, since guards change), design QA | ✅ |
| Technology | no new framework or dependency | ✅ |

**Post-design re-check**: ✅ — no new dependency, archetype or client store (profile + catalog are TanStack Query data).

## UI Surface

| Route | Role | Archetype (ia.md) | Content |
|---|---|---|---|
| `/onboarding` | student | Wizard — step 1 of the IA onboarding | create student profile; "Save" |
| `/app/profile` | student | Detail (own profile) | saved profile + owner panel; "Edit profile" |
| `/app/profile/edit` | student | Form | same fields prefilled; Save changes / Discard; unsaved-changes dialog; conflict state |
| `/company/onboarding` | employer | Wizard — company basics | create company profile; "Save" |
| `/company/profile` | employer | Form | company profile shown in its form, edit in place; same states as student edit |

Wizard preview (`/company/vacancies/new`) gets the real company name. Redirects: profile-less → its onboarding with
`next`; onboarding with an existing profile → the profile page.

## Cross-feature impact

- `src/auth`: `AccountOut.has_profile` (sign-in and `/auth/me`).
- `src/catalog/enums.py` `VacancyField` is refined (data-model.md § Enums): new values `data_analytics`, `data_science`,
  `data_engineering`, `security` with descriptions; `data` migrated to `data_analytics` and no longer accepted. 002's
  vacancy wizard, edit form, list filters, mocks and e2e fixtures that use `data` must follow; `create_tables` gains an
  idempotent step that adds the enum labels and migrates existing rows.
- `src/vacancies/router.py`: the profile gate; `tests/conftest.py` gives the `employer` / `other_employer` fixtures a
  company profile so 002's tests keep their meaning; new tests cover the gate.
- `frontend/src/features/auth/guards.tsx`: `RequireRole` also enforces the profile rule (one place for every role page).
- e2e mocks of `/api/auth/me` in `auth.spec.ts`, `company-vacancies.spec.ts`, `design-system.spec.ts` and
  `e2e/support/*` return `has_profile: true` unless a test is about onboarding.

## Project Structure

```text
specs/003-profiles/   spec.md plan.md research.md data-model.md contracts/profiles-api.md quickstart.md ui-spec.md design/
src/profiles/         __init__.py models.py schemas.py repository.py router.py
src/catalog/          enums.py (+ Industry, CompanySize) · router.py (+ industries, company_sizes)
src/auth/             schemas.py, router.py (has_profile)
src/vacancies/        router.py (profile gate)
src/main.py, src/models.py, src/scripts/create_tables.py
tests/profiles/       test_student_profile.py test_company_profile.py test_access.py test_vacancy_gate.py test_me.py
frontend/src/features/profiles/   api.ts hooks.ts model.ts pages + views (from the designer)
frontend/src/features/auth/       guards.tsx, api.ts (Account.has_profile)
frontend/src/app/router.tsx       real routes
frontend/e2e/profiles.spec.ts     + support/profiles-api.ts
```

## Complexity Tracking

No constitution violations to justify.
