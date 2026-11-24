# Changelog

All notable changes to Novio are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/) (pre-1.0: each delivered feature is a minor version).

## [Unreleased]

Planned (backlog iterations 1 and 5): the public landing page, an explicit role choice, CV upload, replace and remove.

## [0.5.0] - 2026-11-24

Feature `004-student-opportunities` (backlog US-11 View Opportunities, US-12 View Opportunity Details, US-13 Search and
Filter Opportunities, and the research type of US-08).

### Added
- Student opportunities API: `GET /api/student/opportunities` (list) and `GET /api/student/opportunities/{id}`
  (details). Only vacancies that are open for applications are returned.
- Keyword search; filters by type (internship, vacancy, research), work format, city and field of work; sort by newest
  or closing soonest; 10 per page.
- "Research" opportunity type for employers when posting and editing, and among the position types in the student
  profile.
- Student Opportunities page (list with search, filters, sort and paging) and opportunity details page; search, filters,
  sort and page are kept in the address, and Back returns to the same list.
- Skill requirements show "x of y" only when at least one skill matches, never a bare count.
- Match, Apply and Save exist only in the design prototype; they arrive with later features.
- Salary as monthly amounts "from" and "to" (whole numbers 1 to 999 999 999) with a currency (KZT by default, also USD,
  EUR, RUB); `GET /api/catalog` lists `currencies` with their symbols.
- Contract: `specs/004-student-opportunities/contracts/opportunities-api.md`.
- 63 API tests and about 130 browser tests for the feature, plus 69 API tests and about 110 browser tests for the salary change.

### Changed
- The student menu has a single item, Opportunities. The demo pages Home, Applications and Saved redirect to it, and
  the demo notification bell is removed for students.
- Vacancy cards show the deadline and pass router state to the details page; work formats are exposed to the kit.
- Student browser scenarios moved from demo routes to the page templates.
- `salary` in the vacancy API and in both student endpoints is an object `{min, max, currency}` or `null` instead of free
  text; an amount outside the range, a non-integer or from above to is refused with 422 (from above to at `salary.max`).

### Upgrade
- Run `uv run python -m src.scripts.create_tables` to add the Research type and the salary columns. Old text salaries that
  are a plain amount become that amount in tenge; other texts stay in the old column and are printed. Safe to run again.

## [0.4.0] - 2026-11-23

Feature `003-profiles` (backlog US-05 Create Student Profile, US-06 Create HR Profile, US-07 Edit Profile).

### Added
- Student profile API (`/api/student/profile`): name, university, degree (College, Bachelor's, Master's, PhD,
  Residency), major, year of study or graduated, optional GPA (0.00–4.00), what the student is looking for (up to 3
  fields of work or "not sure yet", position types), city, about, projects, languages and contacts (phone, WhatsApp,
  Telegram, LinkedIn, GitHub, website).
- Company profile API (`/api/company/profile`): name, industry, size, website, city, description.
- `has_profile` on the account; students and employers without a profile are sent to a 5-step onboarding first.
- Employers need a company profile before any vacancy action (403 `company_profile_required`).
- Onboarding wizards with ready-made answers, a searchable university list (83 universities of Kazakhstan, short
  names such as KBTU or SDU), My profile, Edit profile and the company profile page; the vacancy preview shows the real
  company name.
- Kit: `ChoiceCard` / `ChoiceCardGroup`; Combobox with descriptions, alias search, "Use …" for typed values, no 50-item
  cap, clearable, in-flow single mode, Tab accepts the highlighted option; real brand logos for contact links.
- 60 API tests and about 100 browser tests for the feature.

### Changed
- Fields of work refined: "Data" split into Data Analytics, Data Science (incl. ML) and Data Engineering, plus
  Cybersecurity; every field has a one-line description. Existing `data` vacancies move to Data Analytics when
  `create_tables` runs.
- Stepper: done steps are faded, the current step is the only full-ink mark.
- Page header renders rich descriptions in a `<div>` (valid HTML).

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
