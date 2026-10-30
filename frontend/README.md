# Novio frontend

Vite + React 19 + TypeScript SPA. Router: React Router · server data: TanStack Query · client state: Zustand.
Styling: CSS Modules + design tokens (`src/styles/tokens.css`) in the affect-ui (Light + Classic) style. Icons: Lucide.

```bash
npm install
npm run dev          # http://localhost:5173 → /styleguide, /styleguide/templates, /prototypes
npm run build        # TypeScript strict + bundle
npm run lint         # oxlint
npm run lint:css     # tokens-only rule (Stylelint)
npm run test:e2e     # Playwright + axe, desktop and mobile (uses local Chrome)
npm run preview      # serve the build on :4173, then:
npm run snap:pages -- --out snapshots --viewport both /styleguide/templates/browse "/styleguide/templates/browse?state=empty"
```
On Windows Git Bash prefix `snap:pages` with `MSYS_NO_PATHCONV=1`.

| Folder | What |
|---|---|
| `src/styles` | tokens + global base |
| `src/components/ui` | UI kit (affect-ui ports + Novio primitives) |
| `src/components/layout` | Stack, Cluster, Grid, TwoColumn, Section, FormSection, StickyBar, Show |
| `src/components/domain` | MatchScore, skills, VacancyCard, CandidateCard, StatusTag, FactList |
| `src/components/icons` | `<Icon name>` (Lucide + semantic dictionary) |
| `src/app` | router, providers, role layouts |
| `src/pages/styleguide` | `/styleguide` + reference page templates |
| `src/prototypes` | feature prototypes from `/speckit-design` |
| `src/features` | feature views (design) and pages (implementation) |
| `e2e` | Playwright tests + axe helper |

Rules: `../design-system/README.md`.
