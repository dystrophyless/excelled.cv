# Changelog

All notable changes to Novio are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/) (pre-1.0: each delivered feature is a minor version).

## [Unreleased]

Planned: applying to a vacancy, the applicant pipeline for employers, student profile and skills, skill-based matching.

## [0.3.0] - 2026-11-02

Feature `002-employer-vacancies`.

### Added
- Employer vacancies API under `/api/company/vacancies`: create, edit, list with status counts and title search, delete a
  draft, and the lifecycle actions publish, pause, resume, close and reopen (with a new deadline).
- A vacancy closes itself at the end of its *Apply by* day in Kazakhstan time (UTC+5) without a scheduler.
- Shared skills vocabulary (`GET /api/skills?q=`) and fixed catalogs (`GET /api/catalog`).
- Optimistic concurrency (`version`) so two tabs cannot overwrite each other; another employer's vacancy answers 404.
- `src/vacancies/rules.py` with the rules future student features reuse (`accepting_applications`, `visible_in_search`).
- Posting wizard, edit form, vacancy list (table on desktop, stacked rows and a status dropdown on phones), vacancy page,
  and close / reopen / delete / discard dialogs.
- 140 API tests and 148 browser tests for the feature.

### Changed
- Primary button no longer draws the outer dark ring (the single documented patch to the affect-ui button); the
  secondary button is affect-ui's original again.
- Combobox: in-flow list that never covers the primary action, server-driven suggestions without duplicates.
- DateField calendar passes the axe accessibility check; skill chip remove buttons are 24 px.
- Constitution 1.0.1: cookie sessions instead of JWT.

## [0.2.0] - 2026-10-30

Feature `001-user-auth`.

### Added
- Sign up for students and employers with email verification by a 6-digit code, sign in, sign out, and a three-step
  password reset that signs out other devices.
- 30-day revocable cookie sessions, Origin check for state-changing requests, `require_role` guard.
- Sign-in pause after 5 wrong passwords in a row; responses never reveal whether an email has an account.
- Six auth screens, route guards for `/app` and `/company`, session-aware API client.
- 55 API tests and 88 browser tests.

### Changed
- Replaced the 30-minute bearer-JWT login with server-side sessions (PyJWT removed).

### Fixed
- Resend cooldown crashed with a 500 (misspelled status constant), a recovery branch wrote nonexistent attributes, wrong
  `tokenUrl`, and error responses were free text without machine-readable codes.

## [0.1.0] - 2026-10-30

### Added
- Frontend foundation: Vite + React 19 + TypeScript SPA with React Router, TanStack Query and Zustand.
- Design system in affect-ui Light + Classic: tokens, ported components, own UI kit, layout primitives, domain
  components, 17 reference page templates with every state, Lucide icon wrapper.
- Quality gates: Stylelint tokens-only, oxlint, Playwright + axe on desktop and phone.
- SpecKit design workflow with agents `ui-designer`, `ui-builder`, `design-qa`, `design-architect`; constitution v1.0.0.

[Unreleased]: https://github.com/dystrophyless/excelled.cv/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/dystrophyless/excelled.cv/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/dystrophyless/excelled.cv/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/dystrophyless/excelled.cv/releases/tag/v0.1.0
