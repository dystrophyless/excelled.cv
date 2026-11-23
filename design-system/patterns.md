# Patterns

How to solve recurring UX problems with the kit. Each pattern names the components; the templates show them in place.

## 1. Choosing a container for a list

| Content | Use | Why |
|---|---|---|
| Opportunities to browse (vacancies, companies) | `VacancyCard` list / `Grid` | scanned visually, compared by match and facts |
| My items with a status (applications) | rows in one `Card` (Tracker template) | many short items, status is the key column |
| Records an owner manages and compares (employer vacancies) | `DataTable` | sortable columns, row actions |
| Items moving through stages by a team (applicants) | Pipeline board columns + `CandidateCard` | stage is the organising axis |
| 3–4 previews on a dashboard | the same component as the full list, sliced, + "See all" | consistency |

## 2. Forms

- **Layout:** one column; related short fields side by side with `Grid min={200}`. Long forms → `FormSection`s in a `Card`.
  ≤ 4 fields → `Modal` or a `Tray`. Ordered multi-topic input → Wizard template.
- **Labels** always visible above the field. Mark the *minority*: if most fields are required, mark optional ones (`optional`).
- **Validation:** on blur for format errors, on submit for everything. Show the error under the field (`error`), keep the
  typed value, focus the first invalid field. More than one error on submit → `Alert tone="error"` at the top listing them.
  Never disable the submit button to signal errors; disable only while a request is in flight (prefer `loading`).
- **Submitting:** the submit `Button` gets `loading`; the form stays visible. Success → navigate or `toast` ("Saved").
- **Unsaved changes** on long forms: `StickyBar` "Unsaved changes · Discard · Save changes" appears after the first edit.
- **Autocomplete attributes** on every personal field (`email`, `given-name`, `new-password`, …).

## 3. Search and filters

- `Toolbar` above results: `SearchField` (grows) · `SegmentedControl` md for the main split (All / Internships / Jobs) · sort `SelectField size="sm"`.
  **All toolbar controls are 36px** (`--control-toolbar` = SegmentedControl md) — never mix 32/40px controls in one row.
- Filters: desktop = `FilterMenu` in a `TwoColumn` start aside (280, sticky); below 1024 = "Filters (n)" button → `Modal`
  with the same `FilterMenu` and a footer "Show N vacancies".
- Above results: count ("24 vacancies") + "Clear filters" (ghost button). Active filter chips appear here only below 1024px — on desktop the FilterMenu already shows them (no duplicates).
- Results sorted by match by default for students. Results update without a page reload; keep scroll position.
- Paginate (`Pagination`, 20 per page); filters and page live in the URL query so results are shareable.

## 4. Matching visualisation

- Card / row: `MatchScore` (sm) on the tray footer + `SkillMatchRow` (required skills first, max 6, "+n").
- Detail decision panel: `MatchScore size="lg"` → divider → `SkillBreakdown` (Required x of y, Nice to have x of y, one tip).
- Employer side: same components, copy "candidate match"; no tips.
- Guests: no score; skill chips neutral; "Sign up to see your match" on the tray footer.
- Colour meaning: matched = success tint ✓; missing = hairline chip; never red for missing.

## 5. Status and tracking

- Status = `StatusTag` only. One status per item.
- The next step (interview date) is the most important line: warning icon (`interview`) + `--color-text`.
- Status changes by the other side arrive as: row status update + `Alert` on the dashboard for interview/offer + email.
- Moving items between stages (employer): "⋯" menu on the card (keyboard accessible). Drag-and-drop only as an extra.

## 6. Feedback — which component?

| Situation | Use |
|---|---|
| An action succeeded (saved, applied, copied) | `toast()` — past tense |
| An action failed and can be retried now | `toast.error()` with the reason, or inline error near the control |
| Form has errors | field `error` + `Alert` summary if > 1 |
| Something important the user should see on this page (interview tomorrow, profile incomplete) | `Alert` (info / warning) at the top of `PageBody` |
| A list is empty / failed to load | `EmptyState` inside the list's container |
| The user must decide before continuing | `Modal` |
| Several dismissible announcements | `NotificationStack` |

## 7. Destructive and irreversible actions

- Button / menu item `destructive` (`danger` in menus), placed last, separated by a divider in menus.
- Irreversible (delete account, delete vacancy with applicants): confirmation `Modal` — question title, consequence,
  buttons "[Keep …] [Delete …]" (destructive variant).
- Reversible (withdraw application, close vacancy, move a candidate, duplicate): act immediately + `toast(title, { action: { label: "Undo", onClick } })`.
- Rejection of a candidate = "Not selected", neutral, no confirmation, undo via toast.

## 8. Loading

| Wait | Use |
|---|---|
| Page / list first load | `Skeleton`s in the exact shape of the content (same container, same count of cards up to 3) |
| Button action | `Button loading` (label stays) |
| Re-fetch with data on screen | keep data, no skeletons; subtle "Searching…" in the results count |
| Multi-phase process (matching, CV parsing) | `ThinkingLoader` with real phase labels |
| < 300 ms | nothing |

Never a full-page spinner. Never block the header.

**Pages built from independent blocks** (dashboards, detail pages with side panels): each block has its own
loading / ready / empty / error, because each is its own query. Loading = that block's skeleton (keep its footer so nothing
jumps); error = an inline `Alert tone="error"` with "Try again" in that block only — the rest of the page stays usable.
Never replace the whole page with one error. Reference: `/styleguide/templates/dashboard?state=error`.

## 9. Empty states

| Kind | Content |
|---|---|
| First run (nothing created yet) | icon tile (domain icon), title = what will be here, one sentence of value, primary action |
| No results (filters / search) | `search` icon, "No … match these filters", tip, secondary "Clear filters" |
| Cleared (all done) | `success` icon, positive title ("You're all caught up") |
| Error | `EmptyState tone="error"`, "Couldn't load …", "Try again" |

## 10. Navigation

- Role layouts own the header. The current section is highlighted automatically by route.
- Detail and edit pages: back link as `PageHeader eyebrow` — `<TextLink tone="muted">← Vacancies</TextLink>`.
- Wizards: no header nav; logo + "Skip for now" / "Save and exit" only.
- Tabs that change the URL (status filters) keep state in the query string.

## 11. Responsive

- Design mobile (390) and desktop (1440) for every screen; check 1024.
- Below 1024: one column; asides go after main (or before, for decision panels); toolbars wrap; tables scroll horizontally
  inside their card; pipeline columns scroll with snap; primary action of a detail page repeats in `StickyBar mobileOnly`.
- Touch targets ≥ 40px on mobile (use `md` buttons for primary actions on mobile).

## 12. Alignment of neighbouring blocks

- Sections side by side (TwoColumn main + aside, cards in one row) share the same header shape: if one has a
  description, all of them get one — otherwise the titles and the content below them sit on different lines.
- Actions on a tray footer are always `Button size="sm"` (secondary, or primary for the one main action) — never a bare
  text link next to buttons in neighbouring trays. Text links belong in section headers ("See all") and inside text.

## 13. Every control does something

In templates, prototypes and pages, every button, tab, filter and menu item has a real effect (filters filter, tabs switch,
menus act, links navigate). A control that does nothing is a bug. If the feature can't do it yet, don't show the control.

## 14. Native browser UI

No browser-default pickers: dropdowns → `SelectField` / `Combobox`, dates → `DateField`, files → `FileUpload`.
Scrollbars are thin and themed globally.

## 15. Onboarding nudges

- Profile completeness lives in two places only: `ProfileMenu setup` and the dashboard `ProgressTracker`.
- One nudge per page at most (an `Alert` or a `SmartRecommendation`), never a modal on page load.

## 16. Choosing one answer — cards, radio, select or segmented?

| Situation | Use | Why |
|---|---|---|
| A wizard / onboarding step that asks one question with 2–12 ready-made answers | `ChoiceCardGroup` | one tap, big targets, reads like a choice, not a questionnaire |
| Same question in an edit form or settings (S3/S5-style forms, many fields on one page) | `SelectField` (≤ 12) / `Combobox` (long list) | compact; the cards would dominate the form |
| 2–4 short answers inside a regular form or a modal | `Radio` in a `ChoiceGroup` | quiet, no extra weight |
| Several answers allowed in a step ("work formats") | `ChoiceCardGroup type="checkbox"` | same look, checkbox semantics |
| Switching views of the same content, status tabs, toolbar splits | `SegmentedControl` | it changes what is shown, it is not a form answer; > 6 options don't fit at 390 px |
| More than ~12 answers or answers the user types (university, city, skills) | `Combobox` (with `allowCreate` when free values are allowed) | cards would scroll for pages |
| A neutral long list where any "popular" subset would rank people (universities) | `Combobox` over the full A–Z list, object options with `description` (city) and `keywords` (aliases), `createLabel` "Use “…”" | no option looks preferred; short names still find the entry |

**Ready-made answers in a wizard step (recipe)**

- One question per step; the step `h1` asks it, so the group gets `hideLegend` (the legend stays for screen readers)
  — or a visible `legend` when a step holds two questions.
- Size by content: text-only answers → `size="sm"` (`columns={3}` for six years → 3 × 2 on every width; `min={140}`
  for "11–50 employees"); answers that need a second line or an icon → `md` (`min` 220 → 2 columns at form width, 1 on mobile).
  The grid never scrolls horizontally: below `min` everything drops to one column.
- Icons only when they help recognition (industries: `industryIcon(value)` from `@/components/icons`). Never mix cards with
  and without icons in one group.
- Nothing is preselected unless the system genuinely knows the answer; a required step validates on Continue:
  `error="Choose …"` (all cards get the error edge + the message under the grid; the page moves focus to the first card, as for any invalid field).
- "Other" / "Not in the list": pass an extra `<ChoiceCard value="other" … checked={otherOn} onChange={…} />` as a child
  and show a `TextField` under the group when it is selected (focus it); the typed text becomes the value.
- Optional step: no error, the tray footer says it can be skipped / changed later.
- **A list never covers the step's primary action.** A suggestion list that could open over Continue / Save would turn a
  click on the button into a click on an option (a wrong answer, silently). Comboboxes with an action below them use
  `inFlow` (single; multiple mode always does): the list pushes the button down, and a press that blurs the field closes
  the list only after the press, so the click still lands. Overlay lists (default single mode) only where nothing
  actionable sits under the field. E2E: `elementFromPoint` at the button's centre returns the button with the list open.
- **Combobox in a step:** the full list opens on focus and scrolls (no cap); Arrow / PageUp / PageDown / Ctrl+Home / Ctrl+End move,
  Enter picks. In edit forms make optional — or required but editable — single values `clearable`, so the user can empty
  the field and see the required error instead of the field snapping back.
- Testing: `getByRole("radio" | "checkbox", { name: label })` — the name is the label only; the description is the
  accessible description. Click the role, not the text (the native input covers the card).
