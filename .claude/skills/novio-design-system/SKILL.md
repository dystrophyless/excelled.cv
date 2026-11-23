---
name: novio-design-system
description: Novio UI rules (affect-ui Light + Classic style). Use for ANY frontend work in this repo — designing or building pages, components, prototypes, styles, copy — and when reviewing UI. Gives the read order, golden rules, archetype choice and checklists.
paths:
  - "frontend/**"
  - "design-system/**"
---

# Novio design system — working rules

Source of truth: `design-system/` (start with `design-system/README.md`). Live reference: `/styleguide` and
`/styleguide/templates` (run `cd frontend && npm run dev`). This skill is the short version; when in doubt, open the doc.

## Before you design or build anything

1. Read `design-system/README.md`, then the docs your task touches:
   page → `templates.md` + `ia.md`; components → `components.md`; behaviour → `patterns.md`; copy → `content.md`;
   tests / a11y → `quality.md`; workflow → `process.md`.
2. Pick the **archetype** (decision tree in `templates.md`) and open its reference source
   `frontend/src/pages/styleguide/templates/<id>.tsx`. Copy its structure; change content, not layout.
3. If no archetype fits — stop and report `NEW-ARCHETYPE` with why. Do not improvise a layout.

## Golden rules

1. Compose from `@/components/ui`, `@/components/layout`, `@/components/domain`, `@/app/layouts`; icons only via `<Icon name>` from `@/components/icons` (Lucide + semantic dictionary).
2. Tokens only (`frontend/src/styles/tokens.css`). No raw hex/rgb, px radii, shadows, font sizes or weights in CSS or inline styles. Spacing through `gap` props or `--space-*`.
3. affect-ui ports (`button`, `otp-input`, `segmented-control`, `filter-menu`, `profile-menu`, `progress-tracker`, `smart-recommendation`, `decision-inbox`, `notification-stack`, `tips-panel`, `change-summary`, `thinking-loader`, `shimmer-loader`, `number-ticker`) are never edited or restyled.
4. Tray + card for self-contained units; meta and actions on the tray footer. No tray-in-tray, no card-in-card.
5. One primary (graphite) button per view; destructive actions confirmed (irreversible) or undoable (reversible).
6. Neutral palette; accent / status colours only as small signals; application rejection is neutral "Not selected".
7. Every screen has loading (skeleton in content shape), empty, error (retry) and success states.
8. Design and check desktop 1440 and mobile 390; layouts switch at 1024.
9. Copy: sentence case, verbs on buttons, glossary terms from `content.md`, exact strings in the ui-spec.
10. E2E-ready: roles + labels first, `data-testid` as in `quality.md`; views get data and state via props.
12. Every control does something real (filters filter, menus act); no browser-native pickers (SelectField, DateField, Combobox); toolbars use `Toolbar` with 36px controls; back links use `BackLink`.
13. Run the whole app at `http://localhost:5173/` — real paths show the reference templates (demo routes) until a feature replaces them.
11. Fidelity: the palette is affect-ui 1:1 — never "fix" contrast by changing colours (axe `color-contrast` is disabled on purpose).

## Feature code layout

```
frontend/src/features/<feature>/views/<Screen>View.tsx   presentational, props in → JSX out (designer)
frontend/src/features/<feature>/mocks.ts                 mock data per state (designer)
frontend/src/features/<feature>/<Screen>Page.tsx         data hooks + route → View (builder)
frontend/src/prototypes/<NNN-feature>.tsx + registry.ts  prototype screens with ?state= (designer)
frontend/e2e/<feature>.spec.ts                           Playwright + axe (builder)
```

## Verify before you say "done"

```bash
cd frontend
npm run build          # TypeScript strict + bundle
npm run lint:css       # tokens-only check
npm run preview        # in the background, then:
npm run snap:pages -- --out ../specs/<NNN>/design/screens --viewport both /prototypes/<NNN-feature>/<screen> "/prototypes/<NNN-feature>/<screen>?state=empty"
```
Open the screenshots and check them against the reference template and `quality.md` → "Design QA checklist".
On Windows Git Bash prefix the snap command with `MSYS_NO_PATHCONV=1` so `/prototypes/...` paths are not rewritten.
