# Component catalogue

Imports: UI kit `@/components/ui` · layout `@/components/layout` · domain `@/components/domain` · icons `@/components/icons` ·
role shells `@/app/layouts`. Live examples: `/styleguide` and `/styleguide/templates`.

**Origin:** **A** = affect-ui port, kept 1:1 (never restyle, never edit — wrap instead). **N** = Novio, built on the same tokens.
Before building anything new, search this table. A new component must follow `patterns.md` recipes, use tokens only,
and get a section on `/styleguide`.

## Actions

| Component | Origin | Use | Don't use for |
|---|---|---|---|
| `Button` | A | any action; variants primary · secondary · ghost · destructive; sizes sm · md · lg; `loading`, `icon`, `iconRight`. **One Novio patch:** the primary has no outer dark ring, so primary and secondary (affect's original, 1px inner border) of one size are visibly equally big on any background | navigation (use `TextLink`) |
| `DropdownMenu` | N | row / card "⋯" actions, overflow actions; `danger` items | the account menu (use `AccountMenu`), choosing a value (Select / Combobox) |
| `TextLink`, `ExternalLink` | N | in-app / external navigation inside text and headers | buttons |
| `BackLink` | N | the back link in `PageHeader eyebrow` (arrow icon + parent name). Never type "←" | |
| `Tooltip` | N | label for icon-only buttons, truncated text; flips below the element when there's no room above (header buttons) | essential info, anything interactive |

## Forms

| Component | Origin | Use | Notes |
|---|---|---|---|
| `TextField` | N | one-line text, email, url, number | label above; `hint`; `error`; `optional`; `size="sm"` (36px) in toolbars; `hideLabel` only in toolbars |
| `SearchField` | N | search in toolbars: icon, clear button, Esc clears | controlled `value` / `onChange(value)`; label hidden by default |
| `DateField` | N | a date (deadline, start date) — calendar popover, never the browser picker | ISO `YYYY-MM-DD`; `min` |
| `PasswordField` | N | passwords | show/hide toggle built in |
| `TextareaField` | N | multi-line text | min 96px, vertical resize |
| `SelectField` | N | ≤ ~12 known options (city, type, sort). Custom listbox — never the browser's option list | `options=[{value,label,description?}]`, `value`/`defaultValue`, `onChange(value)`, `placeholder`, `size`, `name` |
| `Combobox` | N | long lists (university, city) — single; tags (skills, languages) — `multiple` | `options`: strings or `{ value, label, description?, keywords? }` (description = muted second line, e.g. city; keywords = aliases / abbreviations / former names — matched case-insensitively, exact and prefix matches ranked first, the matched alias shown on the second line). `allowCreate` for free values + `createLabel={(t) => …}` (default "Add “…”"); every match is listed and scrolls (`limit` only for huge server lists); single `clearable` = clear button + empty-on-blur clears the value (optional fields, edit forms); single `inFlow` = the list sits in the page flow and never covers the action below (wizard steps, forms — patterns.md §16). The list opens on a pointer press, typing or ArrowDown / Alt+ArrowDown — **never on focus alone**, so tabbing in or error focus (refused Continue / Save) doesn't push the layout |
| `Checkbox`, `Radio`, `Switch`, `ChoiceGroup` | N | multiple choice / one choice / instant on-off setting | Switch = applies immediately; Checkbox in forms with Save |
| `ChoiceCardGroup`, `ChoiceCard` | N | ready-made answers in a wizard step, 2–12 options: a radio (or `type="checkbox"`) drawn as a tile. `size="sm"` compact text-only (year of study, company size) · `md` with `description` (university + city) and / or `icon` tile (industry, `industryIcon(value)`) | `options=[{value,label,description?,icon?,disabled?}]`, `value`/`defaultValue`/`onChange` (string, or string[] for checkbox), `name`, `legend` (`hideLegend` under a step h1), `hint`, `error`, `disabled`, `required`, `min` / `columns` for the grid; children = extra cards ("Other"). Not for edit forms, toolbars or > 12 options — see patterns.md §16 |
| `SalaryField` | N | a monthly salary as **From – To** amounts and a **currency** (one row when the group is 452 px or wider, From | To + currency below from 352 px, all stacked below that, so 999 999 999 always shows whole); either amount optional; vacancy wizard and edit form | `value: { min, max, currency }` (digits only, `SalaryDraft`), `onChange`, `currencies` (catalog: value, label, symbol), `label` (group legend), `hint` ("Per month…"), `error` (one message under the row; the amounts it concerns get the error edge), `optional`. Digits group live ("1 000 000") with the caret staying after the same digit when typing, deleting (also over a space) and pasting "1,000,000 ₸"; numeric keyboard (`inputMode`), never `type=number`; "From" / "To" stay visible inside the amount fields as a muted prefix (the input keeps `aria-label`); text inset 12 px like every field; the currency is a `SelectField` showing "₸ KZT", its list adds "Tenge". Group semantics: `fieldset` + `legend`; amounts have `aria-label` From / To. Helpers: `draftToSalary`, `validateSalary`, `formatSalary` in `lib/money.ts` |
| `FileUpload` | N | one file (logo; the CV drop zone) | type and size validated, a chosen file becomes a row with Remove. `onFile(file)` = caller-validated mode (006 CV): the zone only reports the picked / dropped file, shows the caller's `error`, never turns into a row; `value` / `onChange` optional. `zoneHint` = a line inside the zone that stays beside an error; `hideLabel`; `prompt` may be a node. The stored CV, its actions and dialogs are feature views (`features/cv/views`), not the kit |
| `OtpInput` | A | 6-digit email code | status idle · verifying · error · success |
| `SegmentedControl` | A | 2–6 views of the same content, status tabs (`variant="underline"`, counts) | > 6 options, form choices |
| `FilterMenu` | A | grouped checkbox filters with chips | single choice, free text |
| `Field` | N | wrap a custom control to get label / hint / error / aria wiring | |

## Display

| Component | Origin | Use |
|---|---|---|
| `Tag` | N | status / category pill; tones neutral · accent · success · warning · danger · rose · violet. **Vacancy type tones** (one rule, `vacancyTypeTone()`): Internship accent · Research violet · Full-time / Part-time neutral |
| `Chip` | N | a selected value, removable (`onRemove`) |
| `Count` | N | number next to a label |
| `Avatar` | N | person (round) / company (`shape="square"`), initials fallback |
| `DataTable` | N | records compared in columns (employer lists). Not for browsing opportunities |
| `Skeleton`, `ShimmerText` | A | loading placeholders shaped like the content |
| `NumberTicker` | A | animated numbers (stats, match %) — once per view |
| `GridBackground` | A | the drifting line grid behind a landing hero — landing only |
| `ChangeSummary` | A | "this week" metric changes |
| `ProgressTracker` | A | rewarding checklist (profile completeness, onboarding to-dos) |
| `Stepper` | N | ordered steps of a wizard. Done = faded filled dot (`--color-muted`) with a check, muted label and connector; current = the only full-ink dot, with its number + ink label; upcoming = hairline dot, muted number, hairline connector. Connectors are equal length. No pill or ring on the current step (a lone white pill reads as a button). Below 768px: "Step n of N · Label" + bar |
| `Pagination` | N | long result lists |

## Containers and layout

| Component | Origin | Use |
|---|---|---|
| `Tray` | N | tray + card (`header`, `footer`, `size`, `padding`) — the signature container |
| `Card` | N | standalone white card (`padding`, `interactive`) |
| `Container` | N | page width + gutters (`page` · `content` · `form`) |
| `PageHeader` | N | the page's h1 + eyebrow + description + actions. One per page |
| `PageBody` | N | vertical rhythm of the page body (gap 32) |
| `Section` | N | titled block (h2 at 16px) with optional "See all" action |
| `FormSection` | N | settings / edit block: title + description left, fields right |
| `Stack`, `Cluster`, `Grid` | N | vertical / wrapping row / responsive card grid; `gap` in px steps |
| `TwoColumn` | N | main + aside (filters 280 start, nav 220 start, summary 360 end); `sticky`, `asideFirstOnMobile`, `hideAsideOnMobile` |
| `StickyBar` | N | floating bottom bar: unsaved changes, mobile primary action |
| `Show` | N | `below="lg"` / `above="lg"` visibility |
| `Toolbar` | N | the row of list controls above results: `start` (SearchField + mobile Filters button) · `end` (SegmentedControl md, SelectField sm) — all 36px |
| `SectionLabel`, `SectionTitle` | N | small muted group label / plain h2 |

## Navigation and shells

| Component | Origin | Use |
|---|---|---|
| `StudentLayout`, `EmployerLayout`, `PublicLayout` | N | the shell of every page by role — pages never build headers |
| `AppShell` | N | lower-level shell used by the layouts (nav, actions, mobile sheet). A single nav item renders as a plain label (ink colour, `aria-current`) and hides the menu button |
| `AccountMenu` | N | avatar → affect `ProfileMenu` popover |
| `NotificationCenter` | N | the header bell: unread badge + panel (Today / Earlier, tinted icon tiles, unread dot, Mark all as read, settings link); opening an item marks it read and navigates. Items: `{ icon, tone, title, detail, time, group, unread, to }` |
| `ProfileMenu` | A | account card with items + profile setup progress |

## Overlays and feedback

| Component | Origin | Use |
|---|---|---|
| `Modal` | N | confirmations, short forms (≤ 4 fields), filters on mobile. Footer buttons on the tray. A footer button with `data-autofocus` takes the first focus (confirmations: the safe "Keep …" button) instead of the Close X |
| `toast()` / `Toaster` | N | short confirmation after an action; `action: { label: "Undo", onClick }` for reversible changes |
| `Alert` | N | inline message that must stay visible (form summary error, important notice) |
| `EmptyState` | N | empty list / first run / load error inside a card |
| `NotificationStack` | A | announcements in a corner that stay until dismissed |
| `DecisionInbox` | A | quick yes/no decisions (employer: pending invites) |
| `SmartRecommendation` | A | one suggested next step with alternatives |
| `TipsPanel` | A | getting-started tips |
| `ThinkingLoader` | A | multi-phase waits (matching runs) |

## Domain (Novio)

| Component | Use |
|---|---|
| `MatchScore` | match % + 3-bar signal + label; `size="lg"` on detail pages, `compact` in tables / cards |
| `SkillChip`, `SkillMatchRow`, `SkillBreakdown`, `SkillSuggestion` | skills: plain / matched / missing; row for cards; full breakdown for detail ("x of y" appears only when x > 0, so a bare number never reads as a score; without `have` = plain Required / Nice to have lists, no counts, no tip); "+ Docker" suggestion |
| `VacancyCard` | a vacancy in lists (tray: identity + facts + skills; footer: match + deadline + actions). `deadline={{ label, soon }}` = the apply-by line (muted; last 7 days: ink text + warning icon, "Closes in 3 days"); without match / actions the footer reads deadline · posted ago. Types: Internship · Full-time · Part-time · Research |
| `CandidateCard` | a candidate in pipeline columns (white card) |
| `StatusTag`, `APPLICATION_STATUS` | the only way to show an application status |
| `FactList` | location · format · duration · salary with icons; `layout="list"` in asides |

## Not built yet (build by recipe when a feature needs it)

Date range picker (DateField covers single dates) · tabs with panels beyond SegmentedControl · drawer / side sheet · rich-text editor · charts
(load the `dataviz` guidance first) · image cropper (logos). Flag them in the ui-spec under "New components".
