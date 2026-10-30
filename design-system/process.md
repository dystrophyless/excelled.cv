# Design process: roles, documents, steps

How a feature goes from spec to approved, implemented UI. SpecKit drives it; three hooks plug design in
(`.specify/extensions.yml`).

```
/speckit-specify → /speckit-clarify → /speckit-plan
   └ after_plan  (mandatory) → /speckit-design        ui-designer: ui-spec + prototype + screenshots → review loop with the user → Approved
/speckit-tasks
   └ before_tasks (mandatory) → /speckit-design-gate  stop unless ui-spec is Approved (or the feature has no UI)
/speckit-implement                                     ui-builder: real pages from the approved views + e2e
   └ after_implement (mandatory) → /speckit-design-qa design-qa: checklist + screenshot comparison → report / fixes
```

## Roles

| Role | Model | Reads | Writes |
|---|---|---|---|
| **ui-designer** (`.claude/agents/ui-designer.md`) | Sonnet | spec.md, plan.md, `design-system/*` (README first), reference templates | `specs/<NNN>/ui-spec.md`, view components + prototype, screenshots |
| **ui-builder** (`.claude/agents/ui-builder.md`) | Sonnet | approved ui-spec, view components, `quality.md`, plan.md (API) | page containers, data hooks, e2e tests |
| **design-qa** (`.claude/agents/design-qa.md`) | Sonnet | ui-spec, approved screenshots, `quality.md` checklist | `specs/<NNN>/design/qa-report.md` |
| **design-architect** (`.claude/agents/design-architect.md`) | Opus | everything above | new archetype / pattern / component spec + reference template; critique after 2 rejected rounds |
| **You (product owner)** | — | prototype on localhost + screenshots | approval or change requests in chat |

## Step 1 — ui-spec (ui-designer)

Copy `.specify/templates/ui-spec-template.md` to `specs/<NNN>/ui-spec.md` and fill it:
screens → route, role, **archetype**, layout regions → components, exact copy, state matrix, interactions,
responsive notes, test ids, new components (if any). If no archetype fits → status `NEW-ARCHETYPE`, stop and report.

## Step 2 — prototype (ui-designer)

Code that will **not** be thrown away:

```
frontend/src/features/<feature>/
  views/<Screen>View.tsx      ← presentational page: props in (data + state + callbacks), JSX out. Uses the role layout.
  views/<screen>.module.css   ← only if layout primitives are not enough; tokens only
  mocks.ts                    ← mock data for every state
frontend/src/prototypes/<NNN-feature>.tsx   ← renders each View with mocks; useViewState() + <StateSwitcher/>
frontend/src/prototypes/registry.ts         ← add { id: "<NNN-feature>", screens: {...} }
```
Route: `/prototypes/<NNN-feature>/<screen>?state=<state>`. The View must not fetch data or read the URL.
Copy the structure of the reference template for the archetype; reuse kit components; tokens only.

Self-check before showing: `npm run build`, `npm run lint:css`, snapshots of every screen × state × desktop/mobile,
look at them, fix what breaks the checklist in `quality.md`.

## Step 3 — review loop (orchestrated by `/speckit-design` in the main session)

1. Show the user: the list of screens and states, the localhost links (`npm run dev` → `http://localhost:5173/prototypes/…`),
   the key screenshots, and the decisions worth a look ("filters are a modal on mobile").
2. The user answers in chat: approve, or change requests.
3. Changes → the same ui-designer agent (SendMessage) revises; every round is logged in ui-spec "Revision log".
4. After 2 rounds rejected on the same point → ask design-architect (Opus) for a critique and a proposal.
5. Approved → ui-spec `Status: Approved (date)`, approved screenshots saved to `specs/<NNN>/design/screens/`.

## Step 4 — implementation (ui-builder, inside `/speckit-implement`)

- Page container `frontend/src/features/<feature>/<Screen>Page.tsx`: route params, TanStack Query hooks, mutations →
  passes data/state/callbacks to the approved View. In `app/router.tsx` **replace the demo route** for that path with the page.
- Do not change the View's look. If a change is needed, say so — it goes back to the designer (and to you).
- e2e tests per `quality.md`.

## Step 5 — design QA (design-qa, after implement)

Runs the checklist, snapshots the implemented routes with mocked API, compares to approved screenshots,
writes `qa-report.md` with pass/fail and concrete fixes (`file:line`). Failures go back to ui-builder.

## Escalation: NEW-ARCHETYPE

When nothing in `templates.md` fits, the designer stops. design-architect (Opus) designs the archetype once:
adds the reference template to `/styleguide/templates`, a section to `templates.md`, and any new pattern/component.
You approve it like a feature design. Then the normal flow continues — and every later feature reuses it.
