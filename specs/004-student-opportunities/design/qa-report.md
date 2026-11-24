# Design QA: 004-student-opportunities

Verdict: **PASS WITH NOTES**. No blocking drift from the approved ui-spec (round 2). Four low-severity notes, none against the spec text.

Captures: `specs/004-student-opportunities/design/qa/` (`<screen>-<state>.desktop|mobile.png`, 1440 and 390). Approved reference: `design/screens/`. Captured against `vite preview` (production build), API mocked with `e2e/support/opportunities-api.ts` and `auth-api.ts`. The StateSwitcher in the approved screenshots is ignored. Mock copy and data differ from the prototype data, so I compared layout, hierarchy, spacing, copy and states.

## Static checks

| Check | Result | Evidence |
|---|---|---|
| `npm run build` | pass | tsc + vite build OK (only the usual >500 kB chunk warning) |
| `npm run lint:css` | pass | no output |
| `npm run lint` | pass | no output |
| Raw values in feature | pass | no hex/rgb, no inline `style={{}}` in `src/features/opportunities`; only `2px` and `1px` at `opportunities.module.css:5,51` (stylelint accepts them) |
| affect-ui ports untouched | pass | `git diff main -- src/components/ui` touches only `app-shell/app-shell.tsx` and `app-shell.module.css` (single-nav label; app-shell is not a port, documented in components.md/ia.md) |
| One primary Button per view | pass | list and details have no primary button; the sheet footer has one ("Show N opportunities") |
| New components outside the kit | pass | none |
| `npm run test:e2e -- e2e/opportunities.spec.ts --workers=2` | pass | 131 passed, 3 skipped (desktop-only/mobile-only cases), 0 failed, axe clean |

## Checklist

| Item | Result | Evidence | Fix |
|---|---|---|---|
| S1 default 1440 / 390 | match | `qa/list-default.*` vs `screens/list-default.*`: same header, toolbar, aside, count, cards, pagination, type tag tones, deadline rule | none |
| S1 loading | match | `qa/list-loading.*`: 3 skeleton trays, "Searching…", aside stays | none |
| S1 updating | match | `qa/list-updating.*`: results stay, count reads "Searching…" | none |
| S1 none-yet | pixel-identical | `qa/list-none-yet.desktop.png`: header and EmptyState only, no toolbar, filters or count | none |
| S1 no-results | match | `qa/list-no-results.*`: toolbar keeps the search, EmptyState and Clear filters; "0 opportunities" line is also in the approved shot | none |
| S1 error | match | `qa/list-error.*`: copy "Your search and filters are kept", toolbar and aside stay | none |
| S1 mobile filters | match | `qa/list-filters-open.mobile.png`: Filters sheet, "2 selected", own Clear all, footer "Show 8 opportunities" (the approved shot shows "None selected" because nothing was picked) | none |
| S1 filtered | match | `qa/list-filtered.*`: chips in the aside (desktop) and above the cards (mobile), removable, "Clear filters" | none |
| S1 page 3 | match | `qa/list-page-3.*` (3 pages, last page of 4 cards) | none |
| S2 default, minimal, closing-soon | match | `qa/details-default|minimal|closing-soon.*`: panel above the text below 1024, deadline "Closes in 3 days · 27 Nov" with a warning icon, no empty rows or sections in minimal | none |
| S2 loading / unavailable / error | match | `qa/details-loading.mobile.png` identical skeleton; unavailable is the EmptyState alone; error has the back link and "Try again" | none |
| Copy link toast | pass | `qa/details-copy-toast.mobile.png`: "Link copied" | none |
| Real pages show no prototype-only items | pass | page text dump of list and details (default, minimal, closing-soon): no Match, Apply, Save, skill counts, bell, or second nav item; `AppShell` nav is a single "Opportunities" label; e2e "no Match, Apply, Save, notification bell or other menu item" passes | none |
| S3 research in employer wizard / list / page / edit | match | `qa/research-vacancy-wizard*.png` (4 options), `-list` (text "Research · Backend · Almaty"), `-page` (violet tag in the tray header, same as approved), `-edit` | none |
| S3 student onboarding | match | `qa/research-onboarding-types.desktop.png`: 4 cards in one row, Research selected. Mobile: 2 x 2 | none |
| S3 profile edit / My profile | match | `qa/research-profile-edit.*` (4 checkboxes in a wrapping row), `qa/research-profile.desktop.png` ("Internship, part-time or research") | none |
| Single-item nav | pass | header HTML: logo links to `/app/opportunities`, label has `aria-current`, no track or thumb, no menu button at 390 | none |
| Templates `/styleguide/templates` (index, browse, detail) | pass | `qa/template-*.png`: unchanged, with their own nav, bell and Save | none |
| No horizontal scroll | pass | `scrollWidth` 390 on every mobile capture | none |
| Keyboard: list | pass | Tab order: logo, nav label, account menu, search, Filters (mobile), type control (1 stop, arrows), sort, Format header, card titles, Page 1..3, Next. Every stop shows a visible ring (`qa/focus-card-link.desktop.png` shows the tray ring). Esc clears the search and focus stays in the field. Sheet: Esc closes it and focus returns to "Filters" | see notes 1 and 2 |
| Keyboard: details | pass | back link, Copy link, company website link, all with a visible ring | none |

## Notes (low severity, none contradict the ui-spec)

1. **Focus is lost on route change.** Enter on a card opens the details page with `document.activeElement` = `BODY`; Back to the list also lands on `BODY`. The user must Tab from the top again. Fix: in the page containers (`frontend/src/features/opportunities/OpportunityPage.tsx` and `OpportunitiesPage.tsx`), move focus to the page `h1` (tabindex -1) on mount, or restore focus to the opened card link on Back. This may be a shared concern for the whole app, so decide it once in the layout.
2. **Duplicate tab stop.** The logo and the "Opportunities" nav label both link to `/app/opportunities`, so there are two consecutive stops for the same target on every student page. `app-shell.tsx` (the `single` branch around line 67): render the label as a non-link `span` with `aria-current` when `single`, since the logo already navigates.
3. **FilterMenu uses roving tabindex** (port, not editable): one Tab stop for the whole menu, options move with arrow keys (checkboxes have `tabindex="-1"` until focused). Works (Space toggles and the URL updates), but this is not obvious. Optional hint in the keyboard docs of `design-system/patterns.md`; no code change.
4. **Prototype nav shade.** In the approved loading and error shots the nav label is grey, while the real pages show it in ink with `aria-current` as the spec says. Ignore.

## Differences from the approved screenshots (most visible first)

1. Search field shows the clear (x) button when it has text (approved filtered/no-results shots show the same, so no drift).
2. Content differs only because of the mock data (titles, "Posted 4 days ago", "Apply by 15 Dec 2099"); real pages render the year on the details panel as specified.
3. The StateSwitcher is absent, as intended.

## Not verified

- The mobile onboarding capture flaked once in my script (a combobox option did not appear in time) and passed on rerun; the repo e2e passes at Pixel 7, so I treat it as a test flake.
- Back-restores-scroll position was not checked.
