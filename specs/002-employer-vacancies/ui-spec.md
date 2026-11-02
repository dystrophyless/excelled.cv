# UI spec: Employer vacancies

**Feature**: `002-employer-vacancies` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Status**: Approved (2026-11-02; round 5 changes approved in chat 2026-11-03)
**Designer**: ui-designer · **Prototype**: `/prototypes/002-employer-vacancies/<screen>?state=<state>`

Code: `frontend/src/features/company-vacancies/` (`model.ts`, `mocks.ts`, `views/*`), `frontend/src/prototypes/002-employer-vacancies.tsx`.
Screenshots: `design/screens/<screen>.<state>.<desktop|mobile>.png` (every state below, 1440 and 390; plus `list.reopen-calendar.desktop.png`).

## 1. Screens

| # | Screen | Prototype route | Real route | Layout | Archetype | Reference | Stories |
|---|---|---|---|---|---|---|---|
| S1 | My vacancies | `/list` | `/company/vacancies` | EmployerLayout | Table (Browse table) | `/styleguide/templates/table` | US2, US3, US6, US7, US8 |
| S2 | Post a vacancy | `/new` | `/company/vacancies/new` | own bar (no nav) | Wizard | `/styleguide/templates/wizard` | US1 |
| S3 | Edit vacancy | `/edit` | `/company/vacancies/:id/edit` | EmployerLayout | Form (employer) | `/styleguide/templates/vacancy-edit` | US1, US5 |
| S4 | Vacancy page | `/vacancy` | `/company/vacancies/:id` | EmployerLayout | Pipeline (applicants area = empty state) | `/styleguide/templates/pipeline` | US3, US4, US6, US7, US8 |
| D1-D4 | Dialogs: Close, Reopen, Delete draft, Discard changes | states of S1/S4/S3 | — | kit `Modal` | — | — | US3, US7, US8, FR-008 |

Student screens (US9) are out of scope.

## 2. Shared rules

**Status tags** (`VacancyStatusTag`): Draft warning · Open success · Paused accent · Closed neutral.

**"⋯" menu** (only valid actions; destructive last after a separator):

| Status | Items |
|---|---|
| Draft | Edit · Publish · — · Delete draft |
| Open | Edit · Pause · — · Close vacancy |
| Paused | Edit · Resume · — · Close vacancy |
| Closed | Edit · Reopen |

On the vacancy page Edit is a visible button, so the menu omits it.

**Closed by** (FR-015): page line "Closed by you on 22 Oct" / "Closed on its deadline, 15 Oct"; list cell under the tag "by you on 22 Oct" / "on its deadline".

**Toasts** (success unless noted): Publish "Vacancy published" · "Students can find it now"; Pause "Vacancy paused" · "Hidden from search until you resume it"; Resume "Vacancy resumed" · "Open until 30 Nov"; Close "Vacancy closed" · "Students can no longer apply"; Reopen "Vacancy reopened" · "Open until {date}"; Delete "Draft deleted"; Save draft "Draft saved"; Save changes "Changes saved". Error: "Can't publish yet" · "Finish the draft first: Format, Description, Apply by." No Undo (Close and Delete are confirmed; Pause/Resume undo each other).

**Dialogs**

| Dialog | Title | Text | Buttons |
|---|---|---|---|
| Close | Close “{title}”? | With applicants: "Students will no longer find it or apply. Your 48 applicants stay exactly where they are, and you can reopen it later." Without: "Students will no longer find it or apply. You can reopen it later with a new deadline." | Keep it open · **Close vacancy** (primary) |
| Reopen | Reopen “{title}”? | "It becomes Open again with its 112 applicants. New applications join the same list." (0 applicants: "It becomes Open again and students can find and apply to it.") + DateField "New Apply by date", min today, hint "Students can apply until the end of this day"; error "Choose today or a later date" | Cancel · **Reopen vacancy** |
| Delete draft | Delete this draft? | "“{title}” will be deleted for good. This can't be undone." | Keep draft · **Delete draft** (destructive) |
| Discard | Discard your changes? | "You have unsaved changes to this vacancy. They'll be lost if you leave." | Keep editing · **Discard changes** (destructive) |

## 3. Screen details

### S1 — My vacancies
**Layout**: `PageHeader` (title "Vacancies", description "Post vacancies, change their status and review applicants ranked by skill match.", primary "Post a vacancy") → optional `NoticeAlert` → `Toolbar` (SearchField "Search by title" · SegmentedControl All/Open/Draft/Paused/Closed with counts) → `DataTable` "Your vacancies": Vacancy (title link + "Internship · Backend · Almaty"), Status (tag + closed-by line), Applicants (right, "+6 new" tag + number), Apply by ("30 Nov" / "—"), "⋯" (aria-label "Actions for {title}"). Row click opens S4. Sort on Vacancy / Applicants / Apply by.

| State | What the user sees |
|---|---|
| default | 7 vacancies, all statuses, applicants 0 (what ships first) |
| with-applicants | same with numbers (48 +6 new, 21, 14, 112, 37), the later design |
| loading | toolbar without counts, 4 skeleton rows |
| empty | first run: no toolbar; EmptyState "Post your first vacancy" · "Students see it as soon as you publish, ranked by how well their skills fit." · primary "Post a vacancy"; header button becomes secondary |
| no-results | "No vacancies match" · "Try another word from the title, or another status." · Clear filters. A group with none: "No open vacancies / No drafts / No paused vacancies / No closed vacancies" + "Show all vacancies" |
| error | EmptyState error "Couldn't load vacancies" · "Check your connection and try again." · Try again |
| close-confirm / reopen / reopen-error / delete-confirm | dialog D1 / D2 / D2 with error / D3 open over the list |
| refused | warning Alert "Resume didn't apply" · "“…” is Closed — it closed on its deadline, 15 Oct — so it can't be resumed. Reopen it with a new deadline instead." + Reopen (`invalid_transition`) |

Publish of an incomplete draft: error toast (see above). Responsive (< 1024): the status control becomes a `SelectField size="sm"` ("All (7)", "Open (2)" …, 36 px like the search field) and the table becomes stacked rows in one Card: title link · meta · status tag + closed-by line · "0 applicants · Apply by 30 Nov" (+ "+6 new" tag) with "⋯" always at the right; no horizontal scroll in any state. Testids `vacancies-list`, `vacancy-row`, `status-select`.
**Test hooks**: `vacancies-table`, `vacancy-status` (`data-status`), `close-dialog`, `reopen-dialog`, `delete-dialog`, `confirm-close|reopen|delete`, `reopen-date`, `vacancy-notice`; roles: button "Actions for {title}", menuitem names above.

### S2 — Post a vacancy (wizard)
**Layout**: bar (logo · ghost "Save and exit") → `Stepper` Basics / Skills / Details / Preview → h1 + one-line why → one `Tray` (footer = hint) → footer row Back (ghost) · Continue (primary) / "Publish vacancy" (primary, last step).

| Step | Title · why | Fields · tray hint |
|---|---|---|
| Basics | What's the role? · Students search by title, field and city. | Title (hint "What students will search for"), Type, Field, City (SelectFields), Format (Radio). "Only the title is needed to save a draft" |
| Skills | Which skills does it need? · Required skills carry most of the match score. | Required (Combobox, max 10, hint "1 to 10 skills a student must have") + SkillSuggestion chips. The open list stays open after a pick and sits IN the flow (pushes the next field and Continue down, never covers them); Esc and outside click close it; typing searches ("Searching…" row while loading); typed text that matches an option (any case, spaces collapsed) picks that option, "Add “X”" only when nothing matches; Nice to have (optional, max 10). "2 of 10 required · 0 nice to have" |
| Details | Tell students about it · A clear description and a deadline help them decide to apply. | Description, Duration (optional), Salary (optional), Apply by (DateField, min today). "Duration and salary are optional" |
| Preview | Check how students will see it · Publish when it looks right. You can edit it any time. | one card as students see it (company, title, type tag, facts, description, Required / Nice to have chips). "Not visible to students until you publish" |

States: `basics` `basics-error` (title "Enter a title of 3–120 characters") `skills` `details` `details-error` (Apply by "Choose today or a later date") `preview` `preview-incomplete` (Alert "Fix 3 things to publish" with links "Format · Basics", "Description · Details", "Apply by · Details" that jump to the step) `publishing` (Publish loading) `save-error` (Alert "Couldn't save your draft" · "Check your connection and try again. Nothing you typed is lost.") `loading` (tray skeleton) `error` ("Couldn't load the form" + Try again).
"Save and exit" saves a draft (needs a title: "Add a title to save a draft") → toast "Draft saved" → list. Publish success → toast + list.
**Test hooks**: `wizard-step-basics|skills|details|preview`, `vacancy-preview`, `required-skills-input`, `nice-skills-input`, `skill-suggestions`, `apply-by`.

### S3 — Edit vacancy
**Layout**: `PageHeader` (BackLink = vacancy title · "Edit vacancy" · status tag + status line) → form-level Alert → one `Card` of FormSections Basics / Where / Skills / Details → `StickyBar`. StickyBar: Draft = always ("Draft · not visible to students" / "Unsaved changes") with secondary "Save draft" + primary "Publish"; Open/Paused/Closed = only when dirty: ghost "Discard" + primary "Save changes". Closed: no minimum date, hint "This vacancy is closed. Use Reopen to take applications again."

| State | What the user sees |
|---|---|
| default | Open vacancy, pristine, no bar |
| draft | bar with Save draft + Publish |
| closed | Closed vacancy |
| dirty | changed title and skills, bar "Unsaved changes" |
| incomplete | error Alert "Fix 5 fields to publish" + names, field errors ("Choose a format", "Add a description", "Choose an Apply by date") (`incomplete`) |
| deadline-error | Apply by error "Choose today or a later date" (`apply_by_not_in_future`) |
| saving | Save changes loading |
| conflict | warning Alert "This vacancy was changed elsewhere" · "Someone saved a newer version, maybe in another tab. Your edits are still here: save again to replace it." + "Load latest version" (`version_conflict`) |
| save-error | Alert "Couldn't save your changes" · "Check your connection and try again. Nothing you typed is lost." |
| leave-confirm | dialog D4 (router blocker) |
| loading / not-found / load-error | form skeleton / EmptyState "Vacancy not found" · "It may have been deleted, or the link is wrong." · Back to vacancies (also for another employer's vacancy) / "Couldn't load this vacancy" + Try again |

Success: toast "Changes saved" / "Vacancy published" and back to S4.

### S4 — Vacancy page
**Layout**: `PageHeader` (BackLink "Vacancies" · title · status tag + status line + "· 0 applicants" · actions: Draft primary "Publish" (all header buttons are `sm`); secondary "Edit vacancy"; secondary "⋯" aria-label "More actions") → one `Alert` at most → `TwoColumn` end 360 sticky: main = Section "Applicants" (Card with EmptyState) + Section "About this vacancy" (Card, description); aside = Tray (header type tag + field · FactList list + Required / Nice to have chips · footer "Updated 24 Oct").
Status line: Draft "Not visible to students yet" · Open "Closes 30 Nov" · Paused "Hidden from search · closes 15 Dec" · Closed (see Shared rules). Status Alert: Paused (info) "Paused · hidden from search" + Resume; Closed (info) "This vacancy is closed" · "Students can't find it or apply, and your applicants stay exactly where they are. Reopen it with a new deadline to take applications again." + Reopen.
Applicants empty copy: Draft "No applicants yet · Publish the vacancy and students can start applying." · Open "…When students apply, they appear here ranked by skill match." · Paused "New applications are paused. Resume the vacancy to receive them." · Closed "No applicants · Reopen the vacancy with a new deadline to receive applications."

States: `default` (Open) `draft` `paused` `closed-by-you` `closed-on-deadline` `loading` `not-found` `load-error` `close-confirm` `reopen` `reopen-error` `delete-confirm` (draft) `refused` (Closed + Alert "Resume didn't apply") `incomplete` (draft + error Alert "Finish the draft to publish it" · "Still missing: Format, Description, Apply by." + Edit draft).
Responsive: < 1024 aside after main; header actions wrap. **Test hooks**: `vacancy-status-line`, `applicants-area`, `vacancy-summary`.

## 4. Components

- Existing only: Table/Wizard/Form/Pipeline parts, Modal, DateField, Combobox, SegmentedControl, DataTable, Alert, Tray, FactList, SkillChip, SkillSuggestion, Stepper, EmptyState, toast.
- Feature-local: `VacancyStatusTag` (Tag wrapper, like `StatusTag`; move to `components/domain` when the student Saved screen needs the Closed tag), `vacancyMenuItems`, shared field groups in `views/parts.tsx`.
- **Kit change**: `Modal` got `overflow="visible"` (Novio component, not an affect port) because the DateField calendar was clipped inside the Reopen dialog. See `list.reopen-calendar.desktop.png`.
- Icons reused: Pause = `hide`, Resume = `show`, Close = `lock`, Reopen = `retry`, Publish = `postVacancy`.

## 5. Data contract

Views take props only; types in `features/company-vacancies/model.ts`: `VacancyItem` (camelCase of the API Vacancy, dates as ISO `YYYY-MM-DD`, `closedOn`, `closedBy`, `version`), `Catalog`, `VacancyDraft`, `DraftErrors`, `VacancyRoutes`, `VacancyNotice`. Props: `VacancyListViewProps`, `VacancyPageViewProps`, `VacancyEditViewProps` (`formAlert`: incomplete / conflict / save-error), `VacancyWizardViewProps` (`step`, `busy`, `formAlert`), `VacancyDialogsProps`. Mapping: `incomplete.fields` → `errors` + `formAlert`; `apply_by_not_in_future` → `errors.applyBy` / `reopenError`; `version_conflict` → `formAlert conflict` (container refreshes `version`); `invalid_transition` → `notice` (+ refetch); `vacancy_not_found` → `not-found`; `not_a_draft` → refetch (menu then hides Delete). `today` is passed in (UTC+5 date).

**Round 5 additions (props the page wires)**: kit `Combobox` gets `onQueryChange?(query)` and `loading?`; `SkillsFields`, `VacancyWizardView` and `VacancyEditView` get `onSkillQuery?(query)` (typed text of either skill field, "" after a pick) and `skillsLoading?`; the page answers with `skillOptions` / `suggestions` from `GET /api/skills?q=`. `VacancyDialogsProps.reopenError` (→ `ReopenDialog.serverError`) may arrive while the dialog is open: it is shown on the date field (aria-invalid, aria-describedby), focus moves to the field, the chosen date is kept; changing the date clears it; the confirm spinner hides it while a request runs. Do not remount the dialog.

## 6. Open questions

All resolved by the owner's approval on 2026-11-02 (kept as designed unless noted):
1. Status filter = dropdown below 1024 px (round 4); full width not required.
2. Wizard Preview stays a single student-style card.
3. No Undo for Pause / Resume; Close and Delete are confirmed.
4. Reopen date starts empty.
5. Fourth dialog "Discard changes" (FR-008) is part of the design.
6. Example dates in the past are fine.
Also accepted: Modal `overflow="visible"` (Reopen calendar); Button kit — primary without the outer ring, secondary back to
affect's original (round 3).

## 7. Revision log

| Round | Date | Feedback | Changes |
|---|---|---|---|
| 1 | 2026-10-30 | — (first review) | — |
| 2 | 2026-10-31 | "close vacancy" button is bigger than "Keep it open" in height | Cause: kit `Button`, not the dialog. Layout boxes were already equal (both 32 px, same `size="sm"`), but the primary drew a dark 1px outer ring (`box-shadow 0 0 0 1px #0d0d0d`) while a secondary's ring (#e5e5e5) is invisible on the gray tray, so the primary looked 34 px vs 32 px. Added **NOVIO PATCH 2** in `components/ui/button/button.tsx`: primary has no outer ring (its gradient border still outlines it); noted in `design-system/components.md`. Applies to every primary in the app. Pairs re-measured in the browser at 1440 and 390: Close, Reopen, Delete draft, Discard changes (list and vacancy page), edit StickyBar pairs: 32 / 32 each. Wizard Back / Continue 40 / 40. |
| 3 | 2026-10-31 | Owner decision on the Button kit: keep the primary patch, revert the secondary patch | `components/ui/button/button.tsx`: secondary is affect's original again (1px `--ui-btn-line` border inside the box + `0 1px 2px` shadow). The only deviation left is one patch: primary without the outer dark ring (comment in the file and `design-system/components.md` say so; the "Novio patch 2" naming from round 2 is now just "the patch"). Measured visible heights, secondary / primary: sm 32 / 32, md 40 / 40, lg 48 / 48 on page, gray tray and white card backgrounds. All 002 and 001 screenshots re-taken. |
| 4 | 2026-11-02 | (1) status filter as a dropdown on phones; (2) mobile table cuts off Applicants / Apply by / "⋯"; (3) Publish taller than Edit vacancy / "⋯"; (4) Product Design Intern 112 vs 0 applicants | (1) < 1024 px: `SelectField` "All (7)" (36 px = search field), segmented control from 1024 up. (2) < 1024 px: stacked rows in one Card, "⋯" always visible, checked: no horizontal page scroll in default / with-applicants / loading / empty / no-results / error. (3) "Publish" is `size=sm` like the rest of the header row (all 32 px). (4) One dataset: zeros everywhere by default, numbers everywhere with `with-applicants`; list rows now open the clicked vacancy (`?id=`) and carry the mode, new vacancy-page state `with-applicants`. |
| 5 | 2026-11-03 | Owner decisions on QA notes (F5 / 1b, F2, F6 skills search) | (1) Combobox multiple: list stays open after a pick but is rendered in the flow (not floating), so Continue / Save changes is never covered; checked at 390×844 and 1440 on wizard Skills and the edit form with Required and Nice to have open after picks. (2) Reopen dialog shows a late server error in place, keeps the date, moves focus to the date field. (3) Server-driven skills: `onQueryChange` / `loading` on Combobox, `onSkillQuery` / `skillsLoading` on the Views; exact match (case, spaces) picks the existing option, "Add" only when nothing matches. QA notes F2, F5 and the skills-search note are resolved. |


## 8. Approval

- Approved by the product owner on: 2026-11-02 (after round 4)
- Approved screenshots: `design/screens/` — 100 files: 50 states × desktop/mobile (list 11, new 11, edit 13, vacancy 15), named `<screen>.<state>.<desktop|mobile>.png`, plus `list.reopen-calendar.desktop.png`
