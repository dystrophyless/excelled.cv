# Novio Constitution

Novio is a career platform that matches students' skills with internships and junior jobs, for two roles:
students and employers.

## Core Principles

### I. Spec-driven delivery
Every feature goes specify → clarify → plan → design → tasks → implement → design QA. No code without an approved
spec; no UI tasks without an approved ui-spec. Scope decisions recorded in `design-system/ia.md` (no in-app messaging,
no skill levels, one role per account, no cross-vacancy candidates view in MVP) stand until amended there.

### II. One design system (NON-NEGOTIABLE)
All UI follows `design-system/` — affect-ui Light + Classic copied 1:1. Pages are built from a page archetype and its
reference template, from kit / layout / domain components, with design tokens only. affect-ui ports are never edited.
Anything outside the system goes through the NEW-ARCHETYPE escalation, not improvisation.

### III. The product owner approves design before it is built
`/speckit-design` produces a ui-spec and a working prototype with every state; the product owner reviews it on
localhost and approves in chat. The before_tasks gate blocks UI tasks until `ui-spec.md` is Approved. The approved views
are implemented as-is; any visual change goes back through review.

### IV. Every state designed, every screen e2e-ready
Each screen has loading, empty, error (with retry) and success states driven by data, semantic roles and labels,
and the test ids in `design-system/quality.md`. Each user story with UI ships with a Playwright test (happy path,
error/empty states, axe). Accessibility targets WCAG 2.2 AA except the documented colour-contrast exception.

### V. Verify, then claim
Work is done when `npm run build`, `npm run lint`, `npm run lint:css`, the e2e tests and design QA pass — with real
output reported. Screenshots of desktop (1440) and mobile (390) are checked by eye for every UI change.

## Technology

- Backend: Python 3.13, FastAPI, SQLAlchemy, PostgreSQL (psycopg), cookie sessions with server-side revocable sessions (`src/`; see specs/001-user-auth/research.md R1).
- Frontend: SPA — Vite, React 19, TypeScript strict, React Router, TanStack Query (server data), Zustand (client state),
  CSS Modules + design tokens, Inter, Lucide (`frontend/`). UI language: English only.
- Tests: Playwright + axe for UI.

## Workflow and roles

`design-system/process.md` defines the agents: ui-designer, ui-builder, design-qa (Sonnet) and design-architect (Opus,
escalations only), and the hooks in `.specify/extensions.yml` (after_plan design, before_tasks gate, after_implement QA).

## Governance

This constitution and `design-system/` override ad-hoc preferences. Amendments: edit this file with
`/speckit-constitution`, bump the version (MAJOR: principle removed or redefined; MINOR: principle added; PATCH: wording),
and update dependent templates. Reviews check compliance with principles II–V.

**Version**: 1.0.1 | **Ratified**: 2026-10-30 | **Last Amended**: 2026-11-02
