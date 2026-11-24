# Design QA report: 006-cv (Student CV, `/app/profile`)

**Verdict: PASS WITH NOTES.** No blocker. The implementation matches the approved ui-spec and the approved screens. The notes are small a11y/kit polish items and some dead code.

Checked against `ui-spec.md` (approved 2026-11-25), `design/screens/` and `design-system/quality.md`. Real route `/app/profile` with the e2e API mocks, at 1440x900 and 390x844. Evidence is in `design/qa/` (`real_*.desktop.png` and `real_*.mobile.png`, plus `probe-log.txt` with the measured keyboard, focus and ARIA results).

## Static and automated checks

| Check | Result | Evidence |
|---|---|---|
| `npm run build` | pass (only the usual 500 kB chunk warning) | run in `frontend/` |
| `npm run lint:css` | pass, 0 findings | run in `frontend/` |
| `npm run lint` (oxlint) | pass, 0 findings | run in `frontend/` |
| Raw values (`#hex`, `rgba(`, inline `style={{`) in `features/cv` and `features/profiles` | none | grep |
| Affect-ui ports edited | none. The diff in `components/ui` is `file-upload` and `modal` only (Novio-owned) | `git diff --stat main -- frontend/src/components/ui` |
| One primary button per view | pass. "Edit profile" is the only primary on the page. Replace CV is primary only inside its dialog (own layer). Remove CV is destructive | `CvBlock.tsx:272,303` |
| `e2e/cv.spec.ts` | 128 passed, 4 skipped (viewport-only tests), 0 failed, 0 axe violations | `npx playwright test e2e/cv.spec.ts`, desktop + mobile |
| Regression of other kit users: `profiles`, `design-system` (styleguide Modal and FileUpload, templates), `opportunities` specs | 365 passed, 10 skipped, 1 failed. The failure is `browserType.launch: Chromium distribution 'chrome' is not found` (a Chrome launch failure under low memory), not an assertion. Not rerun | run output |
| `company-vacancies.spec.ts` (Modal user) | not completed. The 618-test run was stopped for memory and time. Covered by static review of the diff below | n/a |
| Own axe pass on real states (uploaded, none + three refusals, long names, replace dialog, load error) | clean at both widths | `qa6` probe |

## Checklist

| # | Item | Result | Evidence | Fix |
|---|---|---|---|---|
| 1 | Archetype and structure (Detail, owner Tray, CV between checklist and Coming soon) | pass | `real_uploaded.desktop.png`, same order as `design/screens/..._uploaded.desktop.png`; profile card untouched | none |
| 2 | Kit components only, no new ad-hoc ones outside the ui-spec | pass | `CvBlock`, `CvFileRow`, `CvJump` are the declared feature views | none |
| 3 | Tokens only | pass | `lint:css` clean, `cv.module.css` read in full | none |
| 4 | Copy matches the ui-spec | pass | heading, "No CV yet", zone title and hint, all four refusals, upload and replace and remove and download failures, load error, three notices, both dialogs, toasts (e2e + screenshots) | none |
| 5 | States present and reachable, skeleton shape | pass | `real_loading`, `real_load-error`, `real_none`, `real_refused-format/-content/-size`, `real_chosen`, `real_uploading`, `real_upload-failed`, `real_uploaded`, `real_replace-dialog`, `real_replacing`, `real_replace-failed`, `real_remove-dialog`, `real_removing`, `real_remove-failed`, `real_download-failed`, `real_notice-replaced`, long names | none |
| 6 | 1440, mobile 390, no horizontal scroll | pass | `scrollWidth == innerWidth` (1440 / 390) with a 108-char Cyrillic name; replace dialog with two long names wraps with no overflow (`real_replace-dialog-long.mobile.png`; dialog scroll == client width) | none |
| 7 | One primary, destructive confirmed | pass | see above | none |
| 8 | Keyboard, focus visible, axe | pass with notes (below) | `probe-log.txt` | see notes N1, N2, N5 |
| 9 | Screenshots match the approved ones | pass | see "Differences" | none |

## Behaviour requested in the brief

| Area | Result | Evidence |
|---|---|---|
| Tab order | pass. Stored: group, Download, Replace, Remove. None: zone input. Chosen: Upload CV, Cancel | `probe-log.txt` "stored tab order" |
| Focus ring | pass. The zone, the stored group and the CV block show the kit halo (`0 0 0 4px rgba(23,23,23,.22)`); `real_focus-zone.*.png`, `real_focus-stored.*.png` | probe |
| Zone via keyboard | pass. Enter and Space both open the file chooser | probe |
| Dialog initial focus | pass. "Keep current CV" and "Keep CV" take focus, not the Close X | probe |
| Focus return | pass. Esc on the remove dialog returns to the Remove opener. Replaced or uploaded moves to "Your CV: <name>". Removed moves to the zone input. Choosing a file moves to Upload CV. A failed upload or replace keeps focus on the retry button | probe |
| Screen-reader semantics | pass. The block is `region "CV"` (labelled by the h2). The stored row is `group "Your CV: <full name>"`. The truncated name is `aria-hidden` and the full name is in sr-only text. The zone input is described by the error and the hint (`aria-describedby` has the message id and the zonehint id, `aria-invalid=true`). The inline Alert and the dialog Alert use `role=alert`. The toast container is `role=status` `aria-live=polite`. `aria-busy=true` while loading and uploading | probe, `toast.tsx:47` |
| Long and Cyrillic names | pass. Middle-cut keeps the extension: "Резюме_Ахметова_Ма…ировки.docx". Title and sr-only carry the whole name. Dialogs wrap with `overflow-wrap:anywhere` | `real_long-cyrillic.*.png`, `real_replace-dialog-long.*.png` |
| Reduced motion | pass. `CvJump` uses `behavior:auto` under `prefers-reduced-motion` and still focuses the block (`scrollY` 677, `activeElement=cv-block`). `cv.module.css` adds no transitions or animations | probe, `CvBlock.tsx:335` |
| Dialogs while busy | pass in behaviour. While PUT or DELETE runs, Esc, the backdrop and the Close X all leave the dialog open, "Keep" is disabled, the confirm button is `aria-busy`. Double click sends one request (e2e). Visual note N2 | probe, `real_replacing.*.png`, `real_removing.*.png` |
| File drag | pass in the zone. Dragover sets `data-dragging`, a real drop event opens the chosen row and focuses Upload CV. See N3 for a drop outside the zone | `real_drag-over.*.png`, probe |
| Other users of changed kit pieces | pass. `FileUpload` without `onFile` keeps the old path (own extension and size checks, `value`/`onChange`; the form template and its e2e pass). `Modal` runs the `data-autofocus` query only when the dialog contains one: no other dialog does (the notification centre sets it on its own panel, which is not a `Modal`). `FactList` `trailing` is optional and renders nothing when absent. Styleguide, opportunities and profiles e2e pass | `git diff main -- components/ui components/domain`, test output |

## Notes (none blocks the verdict)

| ID | Finding | Evidence | Fix |
|---|---|---|---|
| N1 | The mobile identity link "Add CV" / "CV uploaded" is 20 px high, under the WCAG 2.2 AA minimum target of 24 px (2.5.8). It sits in a wrapping facts row, so the spacing exception is not guaranteed. axe did not flag it | `probe-log.txt` "jump link tap target h=20 w=67"; `real_mobile-top.mobile.png` | `cv.module.css:188` `.jump`: add `min-height: var(--control-sm)` (or vertical padding) while keeping `inline-flex` |
| N2 | While a replace or remove request is running the Close X stays enabled and looks active. A click does nothing, with no feedback. The ui-spec says the dismiss controls are disabled while saving. Esc and backdrop are already blocked | probe "closeX disabled=false"; `real_replacing.desktop.png` | `components/ui/modal/modal.tsx:~66`: when `dismissible` is false, render the Close button `disabled` (a kit-wide, backwards-compatible change; other Modals with `dismissible={false}` do the same job), or else document that X is inert while busy |
| N3 | A file dropped slightly outside the zone makes the browser open it in the tab and the profile page is lost. Neither `dragover` nor `drop` is `preventDefault`ed outside the zone. This is existing `FileUpload` behaviour, but a CV drop is the main use | probe "defaultPrevented=false,false" | Optional. In `useCvBlock` or `CvBlock`, add `window` `dragover` and `drop` listeners that call `preventDefault()` while the zone or stored block is mounted |
| N4 | Dead code: `.swapArrow` (CSS) and `splitFileName` (model) are unused | `cv.module.css:134-139`; `features/cv/model.ts:41` (no other reference) | Delete both |
| N5 | After a mouse click on the mobile link the block is focused but shows no halo (`:focus-visible` does not match programmatic focus after a pointer click). Keyboard activation does show it. Screen-reader and keyboard users are fine | probe "block focus ring: none" | Accepted as is, or use `.block:focus` for the halo |
| N6 | `FactList` `trailing` is not in `design-system/components.md` (line 108 still lists only the old description), although the ui-spec section 3 says changed kit components are documented there. `FileUpload` and `Modal` rows are updated | `design-system/components.md:108` | Add "`trailing` = an extra `<li>` after the facts (the CV jump link)" |
| N7 | `company-vacancies.spec.ts` (Modal users) was not run to the end. The `Modal` change is one guarded `querySelector` call, so risk is low, but it is not proven by a run | n/a | Run `npx playwright test e2e/company-vacancies.spec.ts` once on a machine with more memory |

## Differences from the approved screenshots

Most visible first. None is a defect.

1. **Checklist block shows above the CV on the real route.** The approved screens use a complete profile (no checklist). The real-route mock profile is minimal, so "Complete your profile, 0 of 6 added" appears above the CV, with a divider between them as the ui-spec layout describes (`real_uploaded.desktop.png` against `..._uploaded.desktop.png`). The CV block itself is identical in layout, spacing and copy.
2. **Left card is shorter** for the same reason (only the facts of the minimal profile).
3. **Mobile CV block is at the bottom of the page**, as accepted in the ui-spec; the "Add CV" identity link under the facts row leads to it (`real_mobile-top.mobile.png`). The link wraps to its own row at 390.
4. Mobile screenshots here are at the Pixel 7 pixel ratio (about 2.6x), so they look larger than the approved ones. The proportions are the same.

## Top fixes

1. N2: disable or hide the Close X while a dialog is not dismissible (`modal.tsx`).
2. N1: raise the identity link to a 24 px target (`cv.module.css:188`).
3. N3: prevent the browser from opening a file dropped outside the zone.
4. N6: document `FactList` `trailing` in `design-system/components.md`.
5. N4: remove the dead `.swapArrow` and `splitFileName`.

## Follow-up

All five listed fixes were applied after this report. The close button uses a separate `busy` prop instead of
`dismissible`, which only governs the backdrop. Every browser suite, including company-vacancies, was then run to the end.
