# Novio

Career platform matching students' skills with internships / junior jobs; roles: student and employer.

- Backend: FastAPI in `src/` (uv, Python 3.13).
- Frontend: Vite + React 19 SPA in `frontend/` — see `frontend/README.md`.
- Workflow: SpecKit (`.specify/`), constitution in `.specify/memory/constitution.md`.

## UI work — always

Any frontend design or code follows `design-system/` (start with `design-system/README.md`; the `novio-design-system`
skill is the short version). The style is affect-ui Light + Classic, copied 1:1 — tokens only, kit components only,
page archetypes from `design-system/templates.md`. Feature UI goes through `/speckit-design` (ui-spec + prototype +
owner approval) before it is implemented. Roles and models: `design-system/process.md`.

During `/speckit-implement`, every task marked **(ui-builder)** in `tasks.md` is delegated to the `ui-builder` agent
(Agent tool, `subagent_type: ui-builder`), never written in the main session. Give it the feature dir, the task IDs and
the ui-spec screen ids; batch consecutive ui-builder tasks of one user story into one run.

Every other implementation task goes to the `implementer` agent. The main session does not implement: it writes the
spec, plan and tasks, checks the agents' reports against real command output, asks the owner, and commits.

## Agents and models

Agents live in `.claude/agents/`. Sol, Terra and Luna are ChatGPT models reached through `clodex`: start the session with
`clodex claude`. If such an agent cannot start, tell the owner; do not silently switch models.

| Work | Agent | Model |
|---|---|---|
| Feature design; UI implementation | `ui-designer`; `ui-builder` | Sonnet |
| New archetype; critique after two rejections | `design-architect` | Opus |
| Design QA | `design-qa` (returns its report, the main session saves it) | Sol |
| Backend and other non-UI tasks | `implementer` | Terra |
| Tasks marked **(sol)**: access, privacy, concurrency, database upgrades; tasks `implementer` failed twice | `implementer-sol` | Sol |
| Extra API tests | `test-writer` | Terra |
| Review of spec, plan and tasks, after `/speckit-tasks` | `spec-reviewer` | Sol |
| Review of the diff, before a PR is proposed | `code-reviewer` | Sol |
| Failing or flaky tests | `test-triage` | Sol |
| Walking `quickstart.md` in a browser | `quickstart-runner` | Sol |
| Trying to break the running app, when the owner asks | `explorer-qa` | Terra |
| Full check runs | `verifier` | Luna |
| README, CHANGELOG, backlog, quickstart and task checkboxes | `docs-sync` | Luna |

- Spawn agents only where the workflow calls for them. Memory is low: one heavy run (Playwright, build, full pytest) at
  a time, in the foreground.
- A review finding is fixed as a class, not only on the reported line.
- API tests run only on `novio_test`. The owner runs the backend (8000) and the frontend (5173).
- Never send real CVs, personal data or secrets to an agent; use invented data.

## Versions

SemVer 0.x: a feature raises the minor version, a fix release the patch; tooling and documentation changes raise nothing.
A feature's own PR updates `CHANGELOG.md`, the README version table and badge, `pyproject.toml`, `uv.lock`,
`frontend/package.json` and `package-lock.json`. After the merge and the owner's confirmation: an annotated tag `vX.Y.Z`
on the merge commit and a GitHub release with the changelog section.
