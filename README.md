# Novio

**A career platform that matches students' skills with internships and junior jobs.**
Students build a skills profile; employers post vacancies and mark each required skill as *Required* or *Nice to have*;
the match between the two drives what everyone sees.

![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Version](https://img.shields.io/badge/version-0.3.0-2f6bff)

| Sign in | Employer vacancies |
|---|---|
| ![Sign in](specs/001-user-auth/design/screens/prototypes_001-user-auth_sign-in_state_default.desktop.png) | ![My vacancies](specs/002-employer-vacancies/design/screens/list.with-applicants.desktop.png) |

| Vacancy page | Skills in the posting wizard | On a phone |
|---|---|---|
| ![Vacancy page](specs/002-employer-vacancies/design/screens/vacancy.closed-by-you.desktop.png) | ![Skills step](specs/002-employer-vacancies/design/screens/new.skills.desktop.png) | <img src="specs/002-employer-vacancies/design/screens/list.default.mobile.png" width="220" alt="Vacancy list on a phone"> |

## Status

Novio is built feature by feature (spec → plan → approved design → tasks → implementation → design QA). Released so far:

| Version | What it adds |
|---|---|
| **0.3.0** | Employer vacancies: post, edit, list, and manage status (draft, open, paused, closed), automatic closing at the deadline |
| **0.2.0** | Sign up, sign in and password reset for students and employers |
| **0.1.0** | Design system, reference page templates and the design workflow |

Next on the roadmap: applying to a vacancy, the applicant pipeline for employers, student profile and skills, and
skill-based matching. See [CHANGELOG.md](CHANGELOG.md).

## Features

**Accounts** (`specs/001-user-auth`)
- Student and employer roles, chosen at sign-up; email verified with a 6-digit code.
- 30-day sessions in an HttpOnly cookie that the server can revoke; a password reset signs out other devices.
- Sign-in pause after 5 wrong passwords in a row; no response reveals whether an email has an account.
- Role-based route guards in the SPA and a `require_role` dependency in the API.

**Employer vacancies** (`specs/002-employer-vacancies`)
- Posting wizard (Basics → Skills → Details → Preview), drafts, edit form, "My vacancies" with status groups and search.
- Lifecycle: **Draft → Open ⇄ Paused → Closed → (Reopen)**; closing by hand at any time, or automatically at the end of
  the *Apply by* day (Kazakhstan time) without a background scheduler.
- Two browser tabs cannot overwrite each other's changes; one employer can never see another's vacancy.
- Skills are one shared vocabulary (case-insensitive), searched on the server as you type.

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Open: publish
    Open --> Paused: pause
    Paused --> Open: resume
    Open --> Closed: close / deadline
    Paused --> Closed: close / deadline
    Closed --> Open: reopen (new deadline)
    Draft --> [*]: delete
```

## Tech stack

| Layer | Technology |
|---|---|
| API | Python 3.13, FastAPI, SQLAlchemy 2 (async), pydantic-settings; the schema is created by a `create_tables` script (no migration tool yet) |
| Database | PostgreSQL (psycopg 3) |
| Auth | Opaque server-side sessions (SHA-256 of the token stored), argon2 passwords, email codes via Resend |
| Web app | Vite, React 19, TypeScript (strict), React Router, TanStack Query, Zustand |
| UI | CSS Modules + design tokens in the [affect-ui](design-system/README.md) Light + Classic style, Lucide icons, Inter |
| Quality | pytest + httpx, Playwright + axe (desktop and phone), Stylelint (tokens only), oxlint |

## Getting started

**Prerequisites:** Python 3.13 with [uv](https://docs.astral.sh/uv/), Node.js 22+, PostgreSQL, Google Chrome (for the
browser tests).

```bash
git clone https://github.com/dystrophyless/excelled.cv.git
cd excelled.cv

# 1. Backend
uv sync
cp .env.example .env            # then fill in the values (see below)
uv run python -m src.scripts.create_tables
uv run fastapi dev src/main.py  # API on http://localhost:8000

# 2. Web app (in a second terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173, /api is proxied to :8000
```

Open <http://localhost:5173/sign-up>, choose a role and register. The verification code is sent by email through
[Resend](https://resend.com); with its test sender, mail is only delivered to your own Resend account address.

**Environment variables** (`.env`, never committed — see [.env.example](.env.example)):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | e.g. `postgresql+psycopg://user:password@localhost:5432/novio` |
| `SECRET_KEY` | random string used to sign email codes |
| `RESEND_API_KEY` | Resend API key for verification and reset emails |
| `RESEND_FROM_EMAIL` | sender address (default: Resend's test sender) |
| `ENVIRONMENT` | `development` allows the session cookie over plain HTTP on localhost; default is `production` |
| `FRONTEND_ORIGIN` | origin allowed to make state-changing requests (default `http://localhost:5173`) |

Upgrading from an older checkout: `uv run python -m src.scripts.create_tables` adds new tables; add
`--reset-auth` only if the auth tables changed and you can lose development accounts.

## Tests and checks

```bash
# API tests — need an empty PostgreSQL database (the suite never touches DATABASE_URL)
TEST_DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/novio_test uv run pytest

# Web app
cd frontend
npm run build && npm run lint && npm run lint:css
npm run test:e2e                # Playwright + axe; builds and serves the app itself
```

Current baseline: 195 API tests and about 340 browser tests (every flow on desktop and on a phone, including
accessibility checks).

## API overview

All routes are under `/api`; errors look like `{"detail": {"code", "message", ...}}`. Full contracts live next to each
feature: [auth](specs/001-user-auth/contracts/auth-api.md), [vacancies](specs/002-employer-vacancies/contracts/vacancies-api.md).

| Area | Endpoints |
|---|---|
| Accounts | `POST /auth/register` · `/auth/resend-code` · `/auth/verify-email` · `/auth/token` · `/auth/sign-out` · `GET /auth/me` |
| Password reset | `POST /auth/password-reset/request` · `/verify` · `/confirm` |
| Catalog & skills | `GET /catalog` · `GET /skills?q=` |
| Vacancies (employer) | `GET /company/vacancies` · `POST /company/vacancies` · `GET/PUT/DELETE /company/vacancies/{id}` · `POST /company/vacancies/{id}/status` |

## Project structure

```text
src/                  FastAPI backend
├── auth/             sessions, email codes, throttling, password reset
├── users/            accounts and roles
├── vacancies/        vacancy model, lifecycle rules, deadlines, employer API
├── skills/ catalog/  shared skills vocabulary and fixed lists
tests/                pytest suites (auth, vacancies)
frontend/             Vite + React SPA
├── src/components/   UI kit, layout primitives, domain components (see design-system/)
├── src/features/     auth, company-vacancies (views, pages, hooks, API calls)
├── src/pages/        style guide and reference page templates
└── e2e/              Playwright + axe tests
design-system/        rules for every screen: tokens, components, patterns, templates
specs/                one folder per feature: spec, plan, contracts, ui-spec, tasks, QA report
.specify/ .claude/    SpecKit workflow, constitution and the design agents
```

## How features are built

Novio uses a spec-driven workflow ([SpecKit](https://github.com/github/spec-kit)) with a mandatory design step:
`specify → clarify → plan → design (prototype, reviewed and approved by the product owner) → tasks → implement → design QA`.
The visual style is defined once in [design-system/](design-system/README.md) and enforced by lint rules (no raw colours,
sizes or shadows outside the tokens), so every screen looks like it belongs to the same product. The principles are in
[.specify/memory/constitution.md](.specify/memory/constitution.md).

## Versioning

[Semantic Versioning](https://semver.org/): each delivered feature bumps the minor version while the product is
pre-1.0. Versions are tagged (`v0.1.0`, `v0.2.0`, `v0.3.0`) and described in [CHANGELOG.md](CHANGELOG.md).

## License

No license has been chosen yet; all rights are reserved until one is added.
