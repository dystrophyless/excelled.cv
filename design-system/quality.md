# Quality: accessibility, e2e-readiness, visual checks

## Accessibility (target: WCAG 2.2 AA, with one deliberate exception)

- **Exception — colour contrast:** the palette is copied 1:1 from affect-ui; `--color-muted` (#8f8f8f) is below 4.5:1.
  This is accepted by the product owner. axe runs with `color-contrast` disabled. Do not change palette colours to fix it;
  do not put essential information *only* in muted text.
- Semantic HTML first: `button` for actions, `a` for navigation, `form` + `label`, headings in order (one h1 per page).
- Every control has an accessible name (visible label, or `aria-label` for icon-only buttons).
- Keyboard: everything reachable with Tab, visible focus (`:focus-visible` ring from tokens), Esc closes overlays,
  menus support arrows. Never remove outlines without a replacement.
- Errors: `aria-invalid` + `aria-describedby` (the kit's `Field` does it) and `role="alert"` for the message.
- Live updates: toasts use `role=status`; loading regions set `aria-busy`.
- Motion: respect `prefers-reduced-motion` (all kit components do).
- Touch targets ≥ 40px for primary actions on mobile.
- Horizontally scrolling areas (pipeline board, wide tables) are focusable regions: `role="region"`, `aria-label`, `tabIndex={0}`.
- Icon-only and avatar buttons: name via `aria-label` *or* `sr-only` text — never an `aria-label` that contradicts visible text (axe `label-content-name-mismatch`).

## E2E-ready UI

A screen is e2e-ready when a Playwright test can drive every state without sleeping or guessing selectors.

**Selectors, in order of preference**
1. Role + accessible name: `getByRole("button", { name: "Apply now" })`, `getByRole("link", { name: "Backend Intern (Python)" })`.
2. Label: `getByLabel("Email")`.
3. `data-testid` — for containers and repeated items that have no unique role/name.

**`data-testid` naming:** kebab-case `<area>-<thing>`: `vacancy-card`, `applications-list`, `application-row`,
`decision-panel`, `pipeline-board`, `skills-input`. Repeated items get the same testid plus a data attribute for the
key (`data-status="interview"`, `data-id="v1"`). Kit components already expose: `vacancy-card`, `candidate-card`,
`match-score`, `skill-breakdown`, `status-tag` (+`data-status`), `toast`, `account-menu`.

**States:** every screen renders all states from data — `loading` (skeleton, `aria-busy`), `empty`, `error` (with retry),
`success`. Prototypes expose them via `?state=`; the real page derives them from the query (TanStack Query
`isPending` / `isError` / empty data).

**Tests per feature** (written by ui-builder, `frontend/e2e/<feature>.spec.ts`):
- the happy path of each user story from spec.md;
- each error / empty state reachable by mocking the API (`page.route`);
- `expectNoA11yViolations(page)` on each screen (helper in `e2e/support/a11y.ts`).

## Visual checks

- **Approved screens:** after the user approves a design, `specs/<NNN>/design/screens/*.png` holds the screenshots
  of every screen × state × viewport (desktop 1440, mobile 390). These are the reference for design QA.
- **Snapshots:** `npm run snap:pages -- --out <dir> <paths…>` (needs `npm run build && npm run preview`).
- **Design QA** compares the implemented screens with the approved ones and with `/styleguide/templates`.

## Lint gates

- `npm run lint:css` — Stylelint: no raw colours, radii, shadows, font sizes or font weights outside `tokens.css`.
- `npm run lint` — oxlint (affect ports in `src/components/ui/<affect>/` are exempt from refactoring; leave their warnings).
- `npm run build` — TypeScript strict.
- `npm run test:e2e` — Playwright (+ axe).

## Design QA checklist (design-qa agent runs this)

1. Archetype matches the ui-spec; structure matches the reference template.
2. Only kit / layout / domain components; no new ad-hoc components without a ui-spec entry.
3. Tokens only (lint:css clean); no inline styles with raw values.
4. Copy matches the ui-spec and `content.md` (sentence case, button verbs, statuses).
5. All states present and reachable; skeleton shape matches content.
6. Desktop 1440, 1024 and mobile 390 look right; no horizontal page scroll; primary action reachable on mobile.
7. One primary button per view; destructive actions confirmed or undoable.
8. a11y: axe clean (except contrast), keyboard path works, focus visible.
9. Screenshots match the approved ones (layout, hierarchy, spacing); differences are listed with file:line fixes.
