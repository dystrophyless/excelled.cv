# Implementation Plan: Landing page and role choice

**Branch**: `005-landing-role-choice` | **Date**: 2026-11-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-landing-role-choice/spec.md`

## Summary

Replace the demo page at `/` with a real landing page for both roles, remove the public demo routes, and split sign-up
into a role step (nothing preselected) and an account details step. The server needs one small change: `/verify-email`
accepts an optional `role` that wins over the pending one (see research R2); `/register` already requires a valid role.

## Technical Context

**Language/Version**: TypeScript strict, React 19; Python 3.13

**Primary Dependencies**: Vite, React Router, TanStack Query; FastAPI

**Storage**: No change (PostgreSQL `pending_users.role`, `users.role` exist)

**Testing**: Playwright + axe (one spec file at a time, `--workers=2`), pytest

**Target Platform**: Current browsers, desktop 1440 and mobile 390

**Project Type**: Web application

**Performance Goals**: The landing page is readable without waiting for any API response

**Constraints**: English only; design tokens and kit components only; no invented statistics or companies

**Scale/Scope**: One new page, one new sign-up step, three removed demo routes

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec-driven delivery | Pass: spec clarified with the owner; no code before design approval |
| II. One design system | Pass: existing archetypes Landing and Auth |
| III. Owner approves design | Pass: `/speckit-design` follows this plan |
| IV. Every state designed | Pass: see UI Surface; the landing page has no data states |
| V. Verify, then claim | Pass: checks listed in [quickstart.md](./quickstart.md) |

Re-checked after Phase 1: no violations.

## UI Surface

| Screen | Route | Role | Archetype (proposed) | API it needs |
|--------|-------|------|----------------------|--------------|
| S1 Landing | `/` | Public | Landing | `GET /auth/me` (existing, only to redirect signed-in users) |
| S2 Choose role (sign-up step 1) | `/sign-up` | Public | Auth | None |
| S3 Account details (sign-up step 2, changed 001 S2) | `/sign-up` | Public | Auth | `POST /auth/register` (existing) |

States. S1: default (plus the open mobile menu, if there is one). S2: default, selected, no-role error. S3: the 001 S2
states, plus the chosen role with a way to change it.

## Project Structure

### Documentation (this feature)

```text
specs/005-landing-role-choice/
├── spec.md  plan.md  research.md  data-model.md  quickstart.md
├── contracts/routes.md
├── ui-spec.md, design/    # /speckit-design
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
frontend/src/
├── app/router.tsx                          # real `/`, redirects for removed demos
├── app/layouts/layouts.tsx                 # public header: no demo links, new actions
├── features/landing/LandingPage.tsx        # new container
├── features/landing/views/LandingView.tsx  # new view (designer)
├── features/auth/SignUpPage.tsx            # two steps
├── features/auth/guards.tsx                # redirect that does not hide the page while loading
├── features/auth/views/RoleStepView.tsx    # new view (designer)
├── features/auth/views/SignUpView.tsx      # role control replaced by the chosen role
└── prototypes/005-landing-role-choice.tsx
frontend/e2e/landing.spec.ts, auth.spec.ts
design-system/ia.md, specs/backlog.md
```

**Structure Decision**: the existing feature folders; `features/landing` is new.
