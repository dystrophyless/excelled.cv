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
the ui-spec screen ids; batch consecutive ui-builder tasks of one user story into one run. Backend tasks stay in the
main session.
