# Design QA report: 002-employer-vacancies (re-run after round 5 fixes)

**Verdict: PASS WITH NOTES.** All previously reported blockers (F1 to F5) are resolved in the real flow. Two minor items remain; neither blocks release.

## Method
- Static checks: `npm run build`, `lint:css` and `lint` are clean. There are no raw values in the feature.
- Kit diffs are limited to the accepted patches (button, modal) plus the round 5 changes in `combobox.tsx` / `combobox.module.css` and `date-field.tsx` / `date-field.module.css`. The Views (`views/parts.tsx`) gained `onSkillQuery`, `skillsLoading` and the reworked `ReopenDialog`, as agreed.
- Probes with the API mocked via `page.route` against `vite preview` on port 5202 (since stopped), at 1440x900 and 390x844, Chrome. One browser at a time.
- Probe script: `scratchpad/qa/r2/r2.spec.ts`. Log: `scratchpad/qa/r2/log.txt`. The 45 round 5 screenshots are `specs/002-employer-vacancies/design/qa/r5.*.{1440,390}.png`.
- Not re-run in this pass: the repo's own `company-vacancies.spec.ts` (124 passed in the first run). I did not diff every approved screenshot pixel by pixel.

## Checks requested

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Focus after dialogs | PASS | See the list below. Never `<body>` after a dialog on S1 and S4 |
| 2 | DateField calendar axe | PASS | axe `[]` with the calendar open in D2, the wizard Details step and the edit form, at 1440 and 390. Visuals unchanged (compared `r5.list.reopen-calendar.1440.png` with the approved `list.reopen-calendar.desktop.png`: same size, position, 7-column layout, today marker) |
| 3 | Wizard focus | PASS | See the list below |
| 4 | Skills combobox | PASS (one point below) | See the list below |
| 5 | Reopen with refused date | PASS | Dialog stays open; date still "15 Dec 2026" in the field; error "Choose today or a later date" inside the dialog; `aria-invalid=true`, `aria-describedby` set; focus on the date button; choosing a new date clears error and `aria-invalid` (same at 390). axe `[]` |
| 6 | Server-driven skills | PASS | Typing "pyt" sends `GET /api/skills?q=pyt` (debounced), then `q=python`. "python" lists only "Python"; Enter adds a single "Python" chip (no duplicate). "zig" shows only `Add “zig”`. Typing "pyt" lists Python, PyTorch, Add “pyt” |
| 7 | Views and approved screenshots vs real pages | PASS, with the notes below | |

**1. Focus after dialogs** (1440 and 390 identical):
- Close (D1) Esc, Keep it open and confirm: focus goes back to the row's "Actions for Backend Intern (Python)" button.
- Reopen (D2) Cancel and confirm: back to "Actions for Closed by deadline".
- Delete (D3) Keep draft: back to the "⋯" button. Delete confirm: the row is gone, focus goes to the h1 "Vacancies".
- Vacancy page: Reopen Cancel goes to the Reopen button; Close Esc and confirm go to "More actions"; Delete Keep goes to "More actions"; Delete confirm navigates to the list with focus on its h1.
- Discard (D4) Keep editing and Esc: back to the "Vacancies" link.
- Initial focus when a dialog opens is the ✕ button. Acceptable (native behaviour).
- See note N1 for D4 Discard.

**3. Wizard focus**:
- Invalid title: focus goes to the Title input (`aria-invalid=true`).
- Step change: focus goes to the new h1, on all steps including Preview.
- Alert links "Format · Basics" and "Description · Details": focus goes to the target step's h1.
- Save and exit with no title: focus goes to the Title input.

**4. Skills combobox** (open list is in flow, 200 px):
- 1440: after a pick the list is 200 px tall and does not overlap Continue (continue y=794, list ends about 513) or Save changes (not covered).
- 390x844 wizard: Continue is not overlapped. One real click on Continue right after a pick advances to "Tell students about it" (verified after scrolling it into view, since with the list open the page is taller than the viewport; this is expected for an in-flow list).
- Edit form at 390: Save changes is not covered with the list open.
- Esc, Tab and an outside click all close the list. A click on the field re-opens it.

## Resolved items from the first QA
| Earlier finding | Status |
|---|---|
| F1 focus lost after dialogs | Resolved (`focus.ts`, `actions.ts`, `EditVacancyPage.tsx`) |
| F2 refused reopen date cleared, focus not on field | Resolved (`parts.tsx` `ReopenDialog`) |
| F3 wizard focus and announcements | Resolved (`NewVacancyPage.tsx`) |
| F4 kit DateField axe failure | Resolved (kit `role=row` wrappers, `display: contents`) |
| F5 skills list covering Continue on mobile | Resolved (kit in-flow list, closes after the press ends) |
| Skills search not server-driven | Resolved |

## Accepted notes (no action)
- Preview shows the placeholder company "Your company" (initials "YC"), `NewVacancyPage.tsx:16`. The company profile is a later feature.
- The list status cell for a deadline close reads "on its deadline" without a date. This matches ui-spec §2. The date is in the Apply by column and on the vacancy page.
- Toast copy "Vacancy resumed" · "Open until 30 Nov" matches ui-spec §2. The description is omitted when the vacancy has no `applyBy`.
- Muted-grey contrast is an accepted exception and was not flagged.

## Remaining notes (minor)
- **N1.** After "Discard changes" (D4) the app navigates to the list and focus is on `<body>` (1440, log `D4 Discard`). The destination route does not move focus to its h1. Fix if desired: call `focusHeading()` on the list page on mount after an in-app navigation (`VacanciesListPage.tsx`), or at the router level. Not caused by this feature alone; other dialog exits (delete confirm) already land on the h1.
- **N2.** axe `target-size` fails at 390 on the Combobox chip remove buttons when five chips are present (`button[aria-label="Remove Python"]`, `Remove SQL`, +1; edit form at 390). The buttons are 22 px, below 24 px (`components/ui/combobox/combobox.module.css:75-76`). Fix: width and height `var(--space-24)` or equivalent, or add spacing. This is a kit defect that predates round 5; the shipped e2e passes with fewer chips.

## Screenshots opened
- `design/qa/r5.list.reopen-calendar.1440.png` against the approved `design/screens/list.reopen-calendar.desktop.png`
- `design/qa/r5.new.skills-nice-open.390.png` against the approved `design/screens/new.skills.mobile.png`
- Earlier pass: `new.skills-open-after-pick.mobile.png`, `list.reopen-error.mobile.png` (superseded)

The other `r5.*` captures were taken by the probe but not opened. They cover the basics, skills, details, preview, preview-incomplete, save-error, list default, close and delete confirm, reopen, reopen-error, empty, vacancy closed-on-deadline, edit default, dirty and leave-confirm states.

## Follow-up (2026-11-03): notes N1 and N2 fixed

- **N1** (focus on `<body>` after "Discard changes"): `EditVacancyPage.tsx` now focuses the destination page's h1 after the discard navigation; covered by the existing D4 e2e.
- **N2** (chip remove buttons 22 px): `combobox.module.css` `.chipRemove` is now 24 × 24 px; a new 390 px e2e with five chips checks each remove button and runs axe.
- Verified by the orchestrator after the fix: `npm run build`, `lint`, `lint:css` clean; e2e company-vacancies 148 passed, auth 88 passed, design-system 103 passed / 3 skipped; backend 195 passed.
- **Final verdict: PASS.** Remaining accepted notes: placeholder company name "Your company" in the wizard preview (until the company profile feature), the list cell "on its deadline" without a date (the date is in the Apply by column and on the vacancy page), the muted-grey contrast (documented affect-ui exception).
