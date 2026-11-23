# Implementation Plan: Student opportunities

**Branch**: `004-student-opportunities` | **Date**: 2026-11-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-student-opportunities/spec.md`

## Summary

Students get a searchable, filterable list of active opportunities and a page for each. A read-only `opportunities`
backend module serves both from the existing vacancy and company tables, using 002's visibility rule. `research` becomes
a fourth vacancy type for employers, students' profiles and the student filter. The SPA replaces the student demo routes
with two real pages and hides the rest. Decisions: [research.md](./research.md) R1–R11.

## Technical Context

**Language/Version**: Python 3.13 · TypeScript / React 19

**Primary Dependencies**: FastAPI, SQLAlchemy 2 async · Vite, React Router, TanStack Query 5, Novio kit — all existing

**Storage**: PostgreSQL; no new table, one enum label ([data-model.md](./data-model.md))

**Testing**: pytest on `TEST_DATABASE_URL` (`tests/opportunities/`) · Playwright + axe (`frontend/e2e/opportunities.spec.ts`)

**Target Platform**: Linux server · evergreen browsers, 390–1440 px

**Project Type**: Web application — `src/` and `frontend/`

**Performance Goals**: list and details < 200 ms p95 with 1,000 active vacancies; constant number of queries per request

**Constraints**: only active vacancies ever leave the API; no owner data (FR-017); no mock data in the application

**Scale/Scope**: 2 endpoints · 2 screens · 1 enum label

## Constitution Check

| Principle | Check | Status |
|---|---|---|
| I. Spec-driven | spec clarified with the owner; ia.md amended for the section name, menu and addresses | ✅ |
| II. One design system | Browse and Detail archetypes; kit and domain components; tokens only | ✅ |
| III. Owner approves design | `/speckit-design`, then the gate | pending design step |
| IV. States + e2e-ready | loading, empty, none yet, error, unavailable; e2e per QA scenario + axe | ✅ |
| V. Verify, then claim | quickstart checks | ✅ |

**Post-design re-check**: ✅ — no new dependency, archetype or store.

## UI Surface

| Route | Role | Archetype | Content |
|---|---|---|---|
| `/app/opportunities` | student | Browse | search, type, format / city / field filters, sort, paging |
| `/app/opportunities/:id` | student | Detail | full opportunity, company, Back; unavailable state |
| `/company/vacancies/new`, `/:id/edit`, list, page | employer | unchanged | Research among the types (data-driven; check layout) |
| `/onboarding`, `/app/profile/edit` | student | unchanged | Research among position types (check layout) |

Match, Apply and Save: optional View slots, filled only by the prototype (R11).

## Cross-feature impact

- `design-system/ia.md`: student sitemap, primary nav, flows.
- `VacancySummary.type` in the domain kit gains "Research"; `VacancyCard` shows the deadline.
- `StudentLayout`: nav = Opportunities, no demo bell; `homePathFor("student")`.
- e2e: `auth`, `profiles`, `design-system` specs that go through demo routes; catalog mocks gain `research`.
- `tests/vacancies/test_catalog_skills.py` (types list), profile validation maximum.

## Project Structure

```text
specs/004-student-opportunities/   spec plan research data-model contracts/ quickstart ui-spec design/
src/opportunities/     __init__.py schemas.py repository.py router.py
src/catalog/enums.py · src/profiles/schemas.py · src/scripts/create_tables.py · src/main.py
tests/opportunities/   test_list.py test_detail.py test_search.py test_access.py test_research.py
frontend/src/features/opportunities/   api hooks model pages views mocks
frontend/src/app/router.tsx, layouts/
frontend/e2e/opportunities.spec.ts + support/opportunities-api.ts
```

## Complexity Tracking

No violations to justify.
