# Design QA: 003-profiles

**Date**: 2026-11-23 · **Branch**: `003-profiles` · **Against**: `ui-spec.md` (Approved 2026-11-23, §6 rows 13–16, §7),
`design/screens/`, `/styleguide/templates/{wizard,profile,form}`, `design-system/quality.md` checklist.

## Re-check (round 2, 2026-11-23): PASS WITH NOTES

All five fixes from round 1 are in and hold on the real pages (dev server `:5173`, same API mocks and data as round 1).
Nothing blocks. What's left is reference housekeeping: some approved screenshots predate the kit fixes.

| Round 1 item | Result | Evidence |
|---|---|---|
| Fix #1: error focus opened the Combobox list | **FIXED** | `combobox.tsx` opens on pointer down (`onPointerDown`), typing and ArrowDown / Alt+ArrowDown; the `onFocus` opener is gone. Each shot recorded the open listbox count, the focused element and the bottom edge of Continue / Save: `qa/onboarding.university-error.desktop.png` listbox 0, focus = University, Continue 738 of 900 (was 924); `qa/onboarding.university-error.mobile.png` listbox 0, Continue 834 of 844 (was ≈1020, below the fold), message right under the field; `qa/onboarding.major-empty-error.{desktop,mobile}.png` (new: step 3, empty Major) listbox 0, focus = Major, Continue 732 / 794; `qa/profile-edit.university-error.{desktop,mobile}.png` (new: Edit profile, University emptied, Save) listbox 0, focus = University, one error so no summary (as specified). Page heights match the approved `university-error` shots again (900 / 898). Tab after emptying a field picks nothing (`typed` is the trimmed query, `combobox.tsx:147`, `:232`). e2e `profiles.spec.ts:207` covers it |
| Note A: S2 skeleton order | **FIXED** | `StudentProfileView.tsx:108-129` renders tile · lines · tile. `qa/profile.loading.{desktop,mobile}.png` |
| Note B: ChoiceCard titles across a row | **FIXED** | `choice-card.module.css:101` `.text { align-self: flex-start }`, `:193-196` `sm` keeps `center`. `qa/onboarding.looking-for-max.desktop.png`: titles at 423 / 423 (I know / I'm not sure), 693 / 693 (Mobile / Data Analytics); `qa/company-onboarding.industry.desktop.png`: row 4 (Media & marketing / Government & public sector) at 461 / 461, single-line cards still centred on their icon tile; `qa/company-onboarding.size.mobile.png` sm text centred |
| Note C: company-onboarding shots stale | **FIXED** | `screens/company-onboarding.*` re-snapped; diff against `qa/` ≤ 0.06 % (desktop / mobile) outside the switcher band |
| Note D: ui-spec text | **FIXED** | `ui-spec.md:214-215` Looking for before About; `:196` radio hook (S3 checkbox noted); revision row 16a |

**Static gates**: `npm run build` OK; `npm run lint:css` clean; `npm run lint` clean.

**e2e**: `npx playwright test e2e/profiles.spec.ts --workers=1`: **100 passed, 4 skipped** (desktop + mobile; the same mobile-only skips as round 1; includes the new `:207` refused-Continue test, axe on every screen). The Combobox is shared, so its users were re-run too, desktop: `design-system.spec.ts` + `company-vacancies.spec.ts` `--grep "combobox|select:|US1 - |US5 - |skills search|wizard focus|skill chips"`: **39 passed**, including `design-system.spec.ts:372` (focus alone never opens; press / typing / ArrowDown / Alt+ArrowDown do), `:405` (Tab), `:420` (inFlow), and the 002 skill pickers at 390 (`company-vacancies.spec.ts:1396`, `:1424`). The full 368-test run of the three suites was not completed on this low-memory machine; the rest of `company-vacancies` / `design-system` doesn't touch the Combobox

### Still open (non-blocking)

1. **Approved `profile.loading.*` still shows the old skeleton order.** `screens/profile.loading.desktop.png` = lines ·
   tile · tile; the build (`qa/profile.loading.desktop.png`) = tile · lines · tile. Re-snap
   `profile.loading.{desktop,mobile}` (designer, or copy from `qa/`).
   *Correction to round 1*: the round 1 report said `profile.loading.*` diffed at 0.00 %. My diff threshold (24 / 255)
   was above the contrast between the skeleton grey and white, so it could not see skeleton changes. Skeleton and other
   low-contrast states were re-checked by eye this round.
2. **Approved `onboarding.looking-for*` shots predate the ChoiceCard fix.** The two md radio cards are now 6px taller,
   and their titles line up with the middle of the icon tile (mobile title y 431 vs 425). On desktop the titles now
   share one line. Diff 0.9–2.3 % desktop, 4–8 % mobile, from y≈412. The short path still holds: Continue bottom 652 of
   900 at 1440 (spec measured 646), 740 of 844 at 390. Re-snap `onboarding.looking-for{,-exploring,-fields,-max,-error}.*`
   from `/prototypes/003-profiles/onboarding` (designer). Not drift: it is the approved fix showing through.
3. Unchanged from round 1, out of scope: the fixed unread badge on the header bell (app shell, 001/002).

Re-snapped in `design/qa/` this round: `onboarding.{university-error,university-picked,major-empty-error,major-error,
looking-for,looking-for-error,looking-for-exploring,looking-for-max}.*`, `profile.loading.*`,
`profile-edit.{university-error,validation}.*`, `company-onboarding.{industry,industry-error,size}.*`.

---

## Round 1 verdict: FAIL (one blocking fix, then PASS WITH NOTES)

The five real pages and the 002 preview change match the approved design almost pixel for pixel. The static gates,
e2e and axe are all clean. One state drifts visibly in a way that hurts the required flow. On S1 step 2 (and step 3 /
S3 when the empty field is a Combobox), **Continue / Save with an empty University opens the full A–Z list.** Error
focus lands on the Combobox, and the kit opens its in-flow list on focus. The list pushes Degree and Continue down by
about 206px; on mobile Continue ends up below the fold, and the field's error message sits about 200px below its
field. The approved `onboarding.university-error` shows no list. Fix #1 below, then this report is PASS WITH NOTES.

## How this was checked

- Real routes on the running dev server (`:5173`, reused, not restarted), rendered with `page.route` API mocks in the
  shape of `frontend/e2e/support/profiles-api.ts`. Fixtures equal the prototype mocks (`features/profiles/mocks.ts`), so
  the data matches the approved shots. States were reached by interaction (Continue, typing, picking), not by `?state=`.
  87 snapshots are in `design/qa/` (`<screen>.<state>.<desktop|mobile|1024>.png`). Each one recorded its final URL
  (no unexpected redirects) and horizontal scroll (**none at 390 / 1024 / 1440**).
- Pixel diff of every `qa/` shot against the `screens/` shot with the same name, masking the prototype state-switcher
  band. Every difference above 0.1 % was opened and explained below.

## Checklist (quality.md)

| # | Checklist item | Result | Evidence | Fix |
|---|---|---|---|---|
| 1 | Archetype matches; structure matches reference template | PASS | S1/S4 Wizard (`views/pickers.tsx:126-187` WizardFrame = bar · Stepper · h1+sub · Tray(footer hint) · Back/Continue); S2 Detail (own profile) `TwoColumn` end 360 sticky + owner Tray (`StudentProfileView.tsx:85-149`); S3/S5 Form, `content` container, one `Card padding=lg` of `FormSection`s + `StickyBar` | — |
| 2 | Kit / layout / domain components only | PASS | Feature-local compositions are the ones listed in ui-spec §3. `git diff --stat -- frontend/src/components/ui`: `combobox`, `steps`, `page`, `index.ts` (+ new `choice-card/`), no affect-ui port touched | — |
| 3 | Tokens only; no raw inline values | PASS | `npm run lint:css` clean. No `#hex` / `rgb(` in `features/profiles`, `choice-card`, `brand-icons.tsx`, `prototypes/003-profiles.tsx`; no `style=` in the feature. `px` in `profiles.module.css` = hairlines (`1px solid var(--color-line-subtle)`) and two `639.98px` media queries only | — |
| 4 | Copy matches ui-spec / content.md | PASS | 34 spec strings grep-checked in `features/profiles` (limits interpolated from `LIMITS`, e.g. `parts.tsx:39`, `:205`, `:253`, `:488`, `:577`); snapshots read against §2 tables | — |
| 5 | All states present and reachable; skeleton shape matches content | PASS WITH NOTE | Every spec state was reached on the real pages (loading = held request, error = aborted request). **S2 skeleton** still follows the old order (About lines first, then two tiles): `qa/profile.loading.desktop.png`, while the content now starts with the Looking for tile | Note A |
| 6 | 1440 / 1024 / 390 right; no h-scroll; primary reachable on mobile | **FAIL (one state)** | No h-scroll anywhere (87/87). **`qa/onboarding.university-error.mobile.png`**: Continue at y≈1020 on an 844 viewport, pushed down by the open University list | Fix #1 |
| 7 | One primary per view; destructive confirmed / undoable | PASS | Default-variant (primary) Buttons: S2 "Edit profile" (`StudentProfileView.tsx:71`), wizard Continue **or** Save (`pickers.tsx:177/179`), sticky-bar Save (`parts.tsx:597`). Leave = confirmed Modal (`parts.tsx:603-619`); Remove project / language undone by Discard (spec) | — |
| 8 | a11y: axe clean (except contrast), keyboard, focus | PASS | `npx playwright test e2e/profiles.spec.ts --workers=1`: **98 passed, 4 skipped** (mobile-only skips by design, `profiles.spec.ts:949`, `:971`), 3.7 min; 37 `expectNoA11yViolations` calls, no violations. Tab in the Combobox accepts only after typing (`combobox.tsx:231-236`), so the open-on-error list can't pick silently | — |
| 9 | Screenshots match the approved ones | PASS WITH NOTES (after Fix #1) | Diff table below | Fix #1, Notes B–D |
| — | Static gates | PASS | `npm run build` OK (only the existing >500 kB chunk warning); `npm run lint:css` clean; `npm run lint` (oxlint) clean | — |
| — | 002 change: wizard preview shows the real company name | PASS | `qa/vacancy-new.preview.desktop.png` shows "Backend Intern (Python) · Kaspi.kz" with KA initials. `NewVacancyPage.tsx` uses `useCompanyProfile()`, loading/error combined with the catalog, Retry refetches both, `COMPANY` constant deleted, exactly as ui-spec "Change to 002". e2e `profiles.spec.ts:545`, `:609`, `:901` pass | — |

## Fixes

### Fix #1 (blocking): the error focus opens the Combobox list

- **Where**: `frontend/src/components/ui/combobox/combobox.tsx:362` `onFocus={() => { if (!full) setOpen(true); }}` opens the
  list on *any* focus, including the programmatic `focus()` from `frontend/src/features/profiles/form.ts:22-28`
  (`focusInvalid`), which `StudentOnboardingPage.tsx:74` / the edit pages call after a refused Continue / Save.
- **Seen**: `qa/onboarding.university-error.desktop.png` (page 1008px tall vs 900 approved; the list shows 4 options
  with the first one clipped). `qa/onboarding.university-error.mobile.png` (1104 vs 898; Continue below the fold, the
  "Choose or enter your university" message detached from its field). Approved:
  `screens/onboarding.university-error.{desktop,mobile}.png` (no list).
  The same happens for Major on step 3 (empty major), and on S3 when University / Major is the first invalid field.
- **Side effect**: on desktop, Continue moves from y≈718 to y≈924. The "Master's" tile now sits where Continue was, so
  a second click on Continue picks a degree.
- **Change** (design-architect owns the kit; the builder can take the feature-side option):
  - preferred, in the kit: open the list on pointer down / typing / ArrowDown, not on focus. Or add an opt-out prop
    (`openOnFocus={false}`) and pass it from `UniversityField` / `MajorField` (`views/parts.tsx`, the two Combobox calls);
  - or, feature-side only: in `form.ts:27`, focus without opening (e.g. set a `data-no-open` flag that the Combobox
    `onFocus` respects). Do not dispatch Escape, because that races the list's own effects.
- **Test**: add to `e2e/profiles.spec.ts` (US5QATest 2): after Continue on empty step 2, expect
  `getByRole("listbox")` to have count 0 and `getByRole("button", { name: "Continue" })` to be in the viewport at 390 × 844.

### Note A: S2 skeleton order (round 16)

`frontend/src/features/profiles/views/StudentProfileView.tsx:108-128`. The loading card is identity · text lines
(About) · tile · tile. Since round 16 the content is identity · **tile (Looking for)** · text lines (About) · tile
(Education). Reorder the skeleton blocks: one entry-tile block, then the `LinesSkeleton` block, then one entry-tile
block. Evidence: `qa/profile.loading.desktop.png` vs `qa/profile.default.desktop.png`.

### Note B: ChoiceCard titles don't line up across a row (kit, low)

`frontend/src/components/ui/choice-card/choice-card.module.css:100` `.text { align-self: center }`. In a grid row,
the card with the shorter description centres its text, so "I know which field" sits about 10px lower than
"I'm not sure yet" (`qa/onboarding.looking-for.desktop.png`, titles at y 427 vs 417). The same happens on Mobile /
Data Analytics in `qa/onboarding.looking-for-max.desktop.png`. The approved shots have the same offset, so this is
not drift. Suggestion for the design-architect: `align-self: flex-start` when the card has a description (keep
`center` for label-only cards).

### Note C: approved company-onboarding shots are stale (Stepper restyle)

All `company-onboarding.*` diffs start at y=84, the Stepper. The kit Stepper was restyled in this branch
(`frontend/src/components/ui/steps/steps.module.css`: done = muted fill + check, current = ink fill). The student
`onboarding.*` approved shots already show the new style; the `company-onboarding.*` ones still show the old style
(ink done, ring current). Compare `screens/company-onboarding.industry.desktop.png` with
`qa/company-onboarding.industry.desktop.png`. The implementation is consistent; re-snap `company-onboarding.*` from
`/prototypes/003-profiles/company-onboarding` (designer) so the reference matches.

### Note D: spec text left behind by round 15/16 (doc only)

- `specs/003-profiles/ui-spec.md:214-215`: the S2 layout block still lists About before Looking for. Swap the two
  lines (row 16 and the implementation have Looking for first).
- `ui-spec.md:196`: test hook `getByRole("checkbox", { name: "I'm not sure yet" })` is from round 14. On S1 it is a
  radio since round 15 (`line 199` already says so); the checkbox exists only on S3 (`exploring-checkbox`).

## Differences from the approved screenshots (most visible first)

1. **S1 university-error**: University list open, Continue pushed down (Fix #1).
   `qa/onboarding.university-error.mobile.png` vs `screens/onboarding.university-error.mobile.png`.
2. **S2 section order**: Looking for above About. This is the **approved** change (row 16, §7). Confirmed in code
   (`StudentProfileView.tsx:43-45`), in e2e (`profiles.spec.ts:371-374`) and in `qa/profile.*`. **Re-snapped** from the
   implementation (real page, prototype data, no state switcher): `screens/profile.default.{desktop,mobile,1024}.png`,
   `screens/profile.partial.{desktop,mobile}.png`, `screens/profile.minimal.{desktop,mobile}.png`. `profile.loading.*` /
   `profile.error.*` are unchanged (0.00 % diff); the loading skeleton order is Note A.
3. **S4 Stepper style**: stale reference (Note C).
4. **Expected, not drift**:
   - account avatar initials come from the real profile query ("KA" for Kaspi.kz vs the prototype's "AB"; y=25 diffs on S5);
   - `dirty` / `validation` on S3 / S5 used different edits than the prototype mocks (name change, empty name + GPA "4.5" /
     website "kaspi kz"), so heights differ; field messages, summary Alert ("Fix 2 fields to save · Full name · GPA",
     "· Company name · Website"), focus ring and StickyBar are as approved;
   - the approved `*.1024` onboarding shots were taken at 1024 × 800 (mine at 1024 × 768);
   - the prototype state switcher is in every approved shot.
5. Every other state (S1 name / name-error / university-picked / major / major-error / looking-for / -exploring / -max /
   -error / about / saving / loading / error; S3 default / loading / error; S5 default / loading / error) differs by
   ≤ 0.08 % outside the switcher band, i.e. the same render.

## Out of scope, seen in passing

- The header bell shows a fixed unread badge ("2" student, "3" employer) on every role page. It comes from the app
  shell (001/002), not this feature.
