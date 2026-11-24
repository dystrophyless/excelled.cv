---
description: "Task list for 005-landing-role-choice: Landing page and role choice"
---

# Tasks: Landing page and role choice

**Input**: Design documents from `/specs/005-landing-role-choice/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/routes.md, quickstart.md, ui-spec.md
(**Approved 2026-11-24**)

**Tests**: REQUIRED (constitution IV, V). Every story gets Playwright + axe tests with a mocked API. The server change (optional role at verification, research R2) and
a missing or unknown role are covered in `tests/auth/test_sign_up.py`.

## Novio UI rules for tasks

- Views are wired, not redesigned: `LandingView`, `RoleStepView`, `AccountDetailsView` keep their look. UI tasks are marked
  **(ui-builder)** and name the ui-spec screen (S1 landing, S2 role, S3 account details).
- Wording changes follow the table in ui-spec §5a exactly.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

No setup tasks: dependencies, routes and API exist.

## Phase 2: Foundational (shared auth wording and landmark)

- [X] T001 (ui-builder) Wrap `AuthFrame` content in `<main id="main">` in `frontend/src/features/auth/views/auth-parts.tsx` without changing its look
- [X] T002 (ui-builder) Apply ui-spec §5a wording in `SignInView`, `ResetRequestView`, `ResetVerifyView`, `ResetConfirmView`, `VerifyEmailView` (`frontend/src/features/auth/views/`) and update the selectors that depend on it in `frontend/e2e/auth.spec.ts` and `frontend/e2e/opportunities.spec.ts`

**Checkpoint**: the auth suite passes.

## Phase 3: User Story 1 - Visitor learns what Novio offers (P1) 🎯 MVP

**Independent test**: signed out, `/` shows the purpose, capabilities and both roles; both actions work.

- [X] T003 [US1] (ui-builder) S1: add a guard to `frontend/src/features/auth/guards.tsx` that renders its children while the session check is pending or failed and redirects a known account to its role's home (research R3)
- [X] T004 [US1] (ui-builder) S1: `frontend/src/features/landing/LandingPage.tsx` renders `LandingView`; in `frontend/src/app/router.tsx` make `/` real, redirect `/employers`, `/vacancies`, `/vacancies/:id` to `/` with replace (contracts/routes.md), update the demo-routes comment and remove unused imports
- [X] T005 [US1] (ui-builder) S1: make the landing header the only `PublicLayout` and remove `PUBLIC_NAV` in `frontend/src/app/layouts/layouts.tsx`; keep `/styleguide/templates/landing` rendering
- [X] T006 [US1] (ui-builder) S1 e2e `frontend/e2e/landing.spec.ts`: purpose, three capabilities, both roles; header actions visible without a menu on both projects and leading to `/sign-up` with no role selected and `/sign-in`; slow (pending) and failing `/api/auth/me` keep the page; signed-in student and employer redirect; the three removed addresses; every link and button leads somewhere; HR button and footer anchors move focus; reduced motion; no horizontal scroll; axe

## Phase 4: User Story 2 - New user chooses a role (P1)

**Independent test**: Continue without a role shows the message; each role completes registration.

- [X] T007 [US2] (ui-builder) S2, S3: `frontend/src/features/auth/SignUpPage.tsx` renders `RoleStepView` or `AccountDetailsView` by navigation state (research R1, data-model.md): Continue pushes, Back (page and browser) keeps role and email, an unknown or missing role shows the role step, the password never enters navigation state, "Start again" opens the details step
- [X] T008 [US2] (ui-builder) Remove `SignUpView.tsx`, moving the types it exports to `roles.ts` or `AccountDetailsView.tsx`; update `frontend/src/prototypes/001-user-auth.tsx` to the new views
- [X] T009 [US2] (ui-builder) S2, S3 e2e in `frontend/e2e/auth.spec.ts`: nothing preselected; Continue without a role stays, shows the message, focuses a radio; selecting clears it; only one role selected; keyboard-only path; each role is sent as `student` / `employer` and ends in its onboarding; Change role and browser Back keep role and email; reload and forged state; password absent from history state; existing sign-up cases adapted, not weakened; axe without exclusions

## Phase 5: Polish

- [X] T010 [P] Documentation (Sonnet worker): `design-system/ia.md` (sitemap, public header, sign-up flow, removed public pages), `design-system/templates.md` (Landing: real page and allowed content, demo-route note), `frontend/README.md` where it lists demo routes, `specs/backlog.md` (first iteration rows)
- [ ] T011 Run quickstart.md checks one at a time: build, lint, lint:css, every e2e file, `uv run pytest tests/auth`
- [X] T012 Design QA (`/speckit-design-qa`) and its fixes

## Dependencies

T001 → T002 → T003 → T004 → T005 → T006; T007 → T008 → T009 after T002. T010 is independent; T011 and T012 are last.
