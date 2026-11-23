---
name: Novio design system
style: affect-ui (Light + Classic), copied 1:1
font: Inter 400/500/600
icons: Lucide via <Icon name> (≈1.3px stroke)
colors: { page: "#fafafa", tray: "#f0f0f0", surface: "#ffffff", ink: "#171717", text: "#404040", muted: "#8f8f8f", line: "#e5e5e5", accent: "#2f6bff", primary: "graphite gradient #323137→#201e25" }
radius: { tray: 22, card: 16, control: 12, chip: 8, pill: 999 }
breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 }
tokens: frontend/src/styles/tokens.css
---

# Novio design system

Novio is a career platform for students (internships, junior jobs) and employers, matching by skills.
Its UI follows **affect-ui Light + Classic**: neutral greys, white cards on gray trays, a graphite primary button,
Inter, Lucide icons, quiet motion. This folder is the single source of truth for designing and building UI.

## Read in this order

1. **This file** — golden rules.
2. `ia.md` — roles, sitemap, navigation, matching vocabulary.
3. `templates.md` — pick the page archetype; then open its reference: `/styleguide/templates/<id>`.
4. `components.md` — what exists (search before building).
5. `patterns.md` — forms, filters, lists, feedback, loading, empty, destructive, responsive.
6. `foundations.md` — colour, type, layout, shape, icons, motion rules.
7. `content.md` — voice, microcopy, glossary.
8. `quality.md` — a11y, e2e-readiness, visual checks, QA checklist.
9. `process.md` — who does what, ui-spec, prototype, review loop.

`audit.md` explains where every value came from (measured from the affect-ui source).

## Golden rules

1. **Every page is an archetype.** Start from the reference template; never invent a page layout. No fit → NEW-ARCHETYPE.
2. **Compose, don't create.** UI kit + layout primitives + domain components. A new component needs a ui-spec entry and a styleguide section.
3. **Tokens only.** No raw colours, radii, shadows, font sizes or weights. Spacing via `gap` props or `--space-*`.
4. **affect-ui ports are untouchable** (`button`, `otp-input`, `segmented-control`, `filter-menu`, `profile-menu`, …): use, wrap — never edit or restyle.
5. **Tray + card** for self-contained units; actions and meta on the tray footer. Never tray-in-tray or card-in-card.
6. **One primary (graphite) button per view.** Others secondary / ghost. Destructive is confirmed or undoable.
7. **Neutral first.** Accent and status colours only as small signals. Rejection is neutral ("Not selected").
8. **Icons:** Lucide through `<Icon name>` with the semantic dictionary. Icon-only buttons have `aria-label` + `Tooltip`.
9. **Every state is designed:** loading (skeleton in content shape), empty, error (with retry), success.
10. **Desktop 1440 and mobile 390** for every screen; `lg` (1024) is where layouts switch.
11. **Copy is design:** sentence case, verbs on buttons, glossary terms, exact strings in the ui-spec.
12. **E2E-ready:** semantic roles and labels first, `data-testid` per `quality.md`, states driven by data.
13. **Every control works.** Filters filter, tabs switch, menu items act, links go somewhere. Otherwise don't show it.
14. **No browser-native UI:** SelectField / Combobox / DateField / FileUpload instead of native pickers; `BackLink` instead of a typed "←"; toolbars are one 36px row.

## Where things are

| What | Where |
|---|---|
| Tokens | `frontend/src/styles/tokens.css` |
| UI kit | `frontend/src/components/ui` (`@/components/ui`) |
| Layout primitives | `frontend/src/components/layout` |
| Domain components | `frontend/src/components/domain` |
| Icons + dictionary | `frontend/src/components/icons/icons.tsx` |
| Role shells | `frontend/src/app/layouts` |
| Reference templates | `frontend/src/pages/styleguide/templates` → `/styleguide/templates` |
| Component showcase | `/styleguide` |
| Mock data | `frontend/src/mocks/data.ts` (shared) · `features/<f>/mocks.ts` (per feature) |
| Feature prototypes | `frontend/src/prototypes` → `/prototypes/<NNN-feature>/<screen>` |
| ui-spec template | `.specify/templates/ui-spec-template.md` |
| affect-ui source pack | `D:\Program\frontend\affect-ui\affectui-free` (Light + Classic) |
