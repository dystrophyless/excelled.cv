# UI spec: Student opportunities

**Feature**: `004-student-opportunities` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Status**: Approved (2026-11-24)
**Designer**: ui-designer · **Prototype**: `/prototypes/004-student-opportunities/list` and `/details`

## 1. Screens

| # | Screen | Route | Role / layout | Archetype | Reference template | User stories |
|---|---|---|---|---|---|---|
| S1 | Browse (`list`) | `/app/opportunities` | Student / `StudentLayout` | Browse | `/styleguide/templates/browse` | US1, US3 |
| S2 | Detail (`details`) | `/app/opportunities/:id` | Student / `StudentLayout` | Detail | `/styleguide/templates/detail` | US2 |
| S3 | Research type in existing views | 002 wizard, edit, list, page · 003 onboarding, profile edit, profile | Employer / Student | unchanged | — | US4 |
| S4 | Salary: from – to and currency | 002 wizard Details step and edit form; shown on the employer page, wizard preview, student card and details | Employer / Student | Wizard step and Form (unchanged) + display | — | US5 |

Shell (all student pages): nav = **Opportunities** only, rendered as a plain label in ink colour with `aria-current` (one section needs no gray track: a lone
white thumb reads as a button); no demo notification bell; the logo links to `/app/opportunities`; no menu button on mobile.

## 2. Screen details

### S1 — Browse

**Goal**: find an active opportunity by keyword, type and filters, and open it.

**Layout**:
```
PageHeader: title "Opportunities" · description "Internships, vacancies and research projects open for applications."
Toolbar: start [SearchField · (below lg) Button secondary "Filters (n)"] · end [SegmentedControl md · SelectField sm]
TwoColumn side=start 280 sticky, aside hidden below lg
  aside: FilterMenu (Format · City · Field), "Clear all" in its header
  main:  results line (count · mobile chips · ghost "Clear filters")
         VacancyCard × 10 (one column) → Pagination
Modal "Filters" (below lg): the same FilterMenu (header "None selected" / "n selected") · footer [Show N opportunities]
```
Card (`VacancyCard`): avatar · title (link) · type `Tag` · company; facts: city · format, duration, salary (only when
given); Required skills (neutral chips, max 6 then "+n"); tray footer = deadline (left) · "Posted 2 days ago" (right).
Nice to have skills are not on the card (details only).

**Deadline** (calm, never red, no fill): more than 7 days away = muted "Apply by 15 Dec" with a calendar icon; the last
7 days = ink text, medium weight, warning-coloured icon: "Closes in 5 days" / "Closes tomorrow" / "Closes today".

**Type tag tones** (one rule, `vacancyTypeTone`): Internship accent · Research violet · Full-time and Part-time neutral.

**Copy**:
| Element | Text |
|---|---|
| Search placeholder / label | "Title, company or skill" / "Search opportunities" |
| Type control | All · Internships · Vacancies · Research (Vacancies = Full-time + Part-time) |
| Sort | Newest · Closing soon |
| Filter groups | Format (On-site, Hybrid, Remote) · City · Field (from the catalog) |
| Count | "24 opportunities" / "1 opportunity" · while fetching "Searching…" |
| Clear | "Clear filters" (shown when a keyword, type or filter is set and there are results) |
| None yet | icon vacancy · "No opportunities yet" · "Active internships, vacancies and research projects will appear here." (no action) |
| No results | icon search · "No opportunities match these filters" · "Try removing a filter or searching for a skill instead of a title." · [Clear filters] |
| Error | "Couldn't load opportunities" · "Check your connection and try again. Your search and filters are kept." · [Try again] |
| Mobile sheet | modal title "Filters" · the menu header reads "None selected" / "2 selected" with its own "Clear all" · footer [Show 24 opportunities] |

**States**:
| State (`?state=`) | What the user sees | Trigger in the real page |
|---|---|---|
| default | 10 cards of page 1, count, pagination (3 pages) | data loaded |
| loading | 3 skeleton trays in the card's shape, count "Searching…", `aria-busy` | first query pending |
| updating | results stay, count reads "Searching…" | refetch after a filter / search / page change |
| none-yet | header and the EmptyState only: no search, type, sort, filters or count | `total = 0` and no keyword, type or filter |
| no-results | EmptyState "No opportunities match these filters" + Clear filters; toolbar keeps the search | `total = 0` with a keyword, type or filter |
| error | EmptyState error + Try again; toolbar and filters stay | query error |
| filters-open | the mobile Filters sheet open (on desktop the aside is already visible) | tap "Filters (n)" |
| with-match (preview) | cards also show match, skill chips coloured, a bookmark Save | **prototype only** |

**Interactions**: typing is sent 250 ms after the last key and replaces the history entry; type, filters, sort and page
push one and reset the page to 1 (page change keeps the rest). Opening a card passes the list's query to the page; Back
returns to the same search, filters, sort and page. "Clear filters" empties keyword, type and the filters (sort stays).
Esc clears the search field. Results count is `aria-live="polite"`.

**Responsive**: 1440 = aside + one card column; 1024 and below = one column, Filters button, filter chips above the cards
(removable); toolbar wraps (search + Filters, then the type control, then sort). The type control (4 options) fits 390 px.

**Test hooks**: `getByRole("searchbox", {name: "Search opportunities"})`, `getByRole("radio", {name: "Research"})`,
filter checkboxes by name, `data-testid`: `vacancy-card` (+ `data-id`), `vacancy-deadline`, `results-count`,
`opportunities-list`, `opportunities-loading`, `opportunities-none-yet`, `opportunities-no-results`; pagination buttons "Page 2".

### S2 — Detail

**Goal**: read everything the employer published and about the company, then go back to the list as left.

**Layout**:
```
PageHeader: eyebrow BackLink "Opportunities" · title · description "Kaspi.kz · Posted today" · actions [Copy link]
TwoColumn side=end 360 sticky, asideFirstOnMobile
  main:  Section "About this opportunity" → Card lg (description paragraphs)
         Section "About {company}" → Card lg (avatar · name · "Finance & banking · 1000+ employees · Almaty" · about · website link)
  aside: Tray header [type Tag · field]
         card: SkillBreakdown (Required · Nice to have, neutral chips, no counts) · divider · FactList list (city · format, duration, salary)
         footer: deadline line (same rule as the card, with the year: "Apply by 15 Dec 2026" · "Closes in 3 days · 27 Nov")
```
The shipped decision panel is the requirements, the facts and the deadline: complete, with no empty block, no disabled
button and no placeholder. Copy link copies the page address and shows the toast "Link copied".

**Copy**:
| Element | Text |
|---|---|
| Back | "Opportunities" |
| Skill groups | "Required" · "Nice to have"; "x of y" at the right only when x > 0 (never a bare count) |
| Unavailable | icon vacancy · "This opportunity is no longer available" · "It may have closed, been paused or been removed by the company." · [Browse opportunities] (same text for closed, paused, draft, expired, missing, non-numeric id) |
| Error | "Couldn't load this opportunity" · "Check your connection and try again." · [Try again]; the back link stays |
| Toast | "Link copied" |

**States**:
| State | What the user sees | Trigger |
|---|---|---|
| default | as above | 200 |
| minimal | no salary, duration, Nice to have, company website or company description: those rows / sections are simply absent, nothing says "not given" | optional fields null |
| loading | skeleton of header, panel and both cards | query pending |
| unavailable | the unavailable EmptyState alone | 404 `opportunity_unavailable` or bad id |
| error | error EmptyState with back link | other failure |
| with-match (preview) | + Save (header), match % and coloured skills, "Apply now" primary in the panel footer, mobile StickyBar with match + Apply, Apply dialog, "Applied" state | **prototype only** |

**Responsive**: below 1024 the panel moves above the text (it is short); no sticky bar in the shipped variant (nothing to repeat).

**Test hooks**: `decision-panel`, `skill-breakdown`, `opportunity-deadline`, `opportunity-description`, `company-card`,
`opportunity-unavailable`; roles: link "Opportunities" (back), button "Copy link".

### S3 — Research in existing views (data-driven from the catalog)

| View | Result | Change |
|---|---|---|
| 002 wizard / edit: Type `SelectField` | 4 options | none |
| 002 list, page, wizard preview | type text and `Tag` (violet for Research) | tone via `vacancyTypeTone` |
| 003 onboarding "Position type" (`ChoiceCardGroup sm`) | 4 cards in one row at 1440, 2 × 2 at 390 | `min` 88 → 104, `columns` = number of types (max 4) |
| 003 profile edit "Position type" (checkboxes) | 4 checkboxes in the wrapping row | none |
| 003 profile "Looking for" | "Internship, part-time or research" | list reads "a, b or c" |

Prototype mocks: catalogs gained `research`; 002 has an open Research vacancy (v8); the 003 student looks for
internship, part-time or research.

### S4 — Salary (from – to, currency, readable numbers)

**Goal**: an employer enters a monthly salary as readable amounts with a currency; everyone sees it grouped, with the currency.

**Field** (`SalaryField`, in the wizard "Details" step and the edit form "Details", under Duration):
```
Salary (optional)
[ From  1 000 000 ] [ To  1 500 000 ] [ ₸ KZT ▾ ]   <- wide (group 452px+); From | To then currency from 352px; all stacked below
Per month. Fill one or both amounts           <- hint; replaced by the error
```
Digits group while typing ("1000000" becomes "1 000 000"); the caret stays after the same digit when typing, deleting in the
middle (Backspace / Delete over a space removes the neighbouring digit) and pasting "1,000,000 ₸" (non-digits dropped,
leading zeros dropped). Numeric keyboard on mobile (`inputMode="numeric"`), no number spinners. "From" and "To" stay visible inside each amount as a muted prefix (the input keeps its accessible name); the text inset is 12px like the neighbouring fields. Currency: custom select
showing "₸ KZT"; list rows "₸ KZT · Tenge", "$ USD · US dollar", "€ EUR · Euro", "₽ RUB · Russian ruble"; default ₸ KZT,
kept when editing. Either amount may be empty; both empty = no salary (a currency alone is not a salary). Always "/ month":
no period choice. 999 999 999 shows whole at 1440, 390 and 360 px.

**Display** (one formatter, `formatSalary()`): `200 000 – 300 000 ₸ / month` · `From 200 000 ₸ / month` ·
`Up to 300 000 ₸ / month` · equal amounts `150 000 ₸ / month` · `$1 500 – 2 200 / month` · `From €600 / month` ·
`70 000 – 90 000 ₽ / month` · `1 000 000 – 999 999 999 ₸ / month`. Non-breaking spaces between thousands and before the
symbol; only the spaces around the en dash may wrap. Shown on: student card (facts), student details (aside facts), employer
vacancy page (aside facts), wizard preview. The employer list shows no salary today and still does not. GPA, counts and
applicant numbers are small and unaffected.

**Copy**:
| Element | Text |
|---|---|
| Group label | "Salary (optional)" |
| Amount prefixes / accessible names | "From", "To" |
| Currency control name | "Currency" |
| Hint | "Per month. Fill one or both amounts" |
| Amount error | "Enter a whole amount from 1 to 999 999 999" |
| Range error | "“From” can’t be more than “To”" |

**States** (prototype `?state=`): wizard `details` (empty), `details-filled` (1 000 000 – 1 500 000 ₸), `salary-range-error`,
`salary-amount-error` (10 digits, USD), `preview`; edit `default` (200 000 – 300 000 ₸), `salary-error`; employer page
(`vacancy?id=v1` range, `v6` up to, `v2` equal); student list and details `long-numbers` (1 000 000 – 999 999 999 ₸); details
`?id=o23` USD, `o7` From €600, `o13` RUB, `o8` From, `o10` Up to. Continue, Publish and Save are refused while the message
shows; what was typed is kept; the offending amounts have the error edge.

**Responsive** (container queries on the field): 452px+ one row; 352px+ From | To with the currency on the next line (edit form on desktop, 390 px wide tray at 640+); below that From, To and the currency each on their own line (390 and 360 mobile). No horizontal scroll. The long range stays on one line on the card at 390.

**Test hooks**: `getByRole("group", {name: "Salary"})`, `getByRole("textbox", {name: "From" | "To"})`,
`getByRole("combobox", {name: "Currency"})`, `data-testid="vacancy-salary"`.

## 3. Components

- Existing: `Toolbar`, `SearchField`, `SegmentedControl`, `SelectField`, `FilterMenu`, `Modal`, `Pagination`, `VacancyCard`,
  `SkillBreakdown`, `FactList`, `Tray`, `Card`, `Section`, `EmptyState`, `Skeleton`, `Chip`, `BackLink`, `ExternalLink`.
- **New component**: `SalaryField` (`components/ui/salary-field`), composed from the field recipe and `SelectField`; section "Salary field" in `/styleguide`; documented in `components.md`. Pure helpers in `lib/money.ts`; the Money row of `content.md` is updated.
- **Kit changes**: `VacancyCard` gains `deadline` and type "Research"; `SkillBreakdown` works without
  `have`; `vacancyTypeTone()`; `AppShell` renders a single nav item as a label; `StudentLayout` nav and no bell.
  Documented in `design-system/components.md` and `ia.md`.

## 4. Data contract for views

```ts
type OpportunitiesListViewProps = {
  state: "ready" | "loading" | "updating" | "error";
  catalog: OpportunityCatalog; query: OpportunityQuery;
  onQueryChange(patch: Partial<OpportunityQuery>): void; onClear(): void;
  data?: OpportunityPage; today: string; detailHref(id: string): string; onRetry(): void;
  initialFiltersOpen?: boolean;
  match?: { have: string[]; scores: Record<string, number> };   // later feature, prototype only
  save?: { saved: ReadonlySet<string>; onToggle(item): void };  // later feature, prototype only
};
// salary is an object everywhere, never a string: { min: number | null, max: number | null, currency } | null.
// The vacancy form value is SalaryDraft { min: string, max: string, currency: string } (digits only); catalog.currencies = [{ value, label, symbol }].
type OpportunityDetailsViewProps = {
  state: "ready" | "loading" | "unavailable" | "error";
  opportunity?: OpportunityDetail; catalog: OpportunityCatalog; today: string; backTo: string;
  onCopyLink(): void; onRetry(): void;
  match?: { score: number; have: string[] }; apply?: { applied: boolean; onApply(): void }; save?: { saved: boolean; onToggle(): void };
};
```
Types, `parseQuery` / `toSearchParams` (address ⇄ query, unknown values dropped) and date helpers are in
`features/opportunities/model.ts`. Views never read the URL; `today` is passed in.

## 5. Open questions

- Sort "Best match" arrives with the matching feature (not offered now).
- City "Other" is listed as a filter value because it is a catalog value.

## 6. Revision log

| Round | Date | Feedback (user) | Changes made |
|---|---|---|---|
| 1 | 2026-11-24 | — (first review) | — |
| 2 | 2026-11-24 | «Поправь, дизайн утверждаю только вот убрать как будто надо количество скиллов когда нет матчей (допустим оппортюнити требует 4 скилла, а у пользователя нет ни одного из них, тогда показывает просто количество скиллов - 4).» Also accepted: none-yet shows only header + message without unverified claims; unavailable loses "Other opportunities are still open"; no duplicate "Filters" heading on mobile; onboarding "Show me opportunities from every field"; the single nav item reads as active. | `SkillBreakdown`: "x of y" only when x > 0, no bare counts (shipped and zero-match). none-yet: toolbar, filters and count hidden; copy "Active internships, vacancies and research projects will appear here." Unavailable copy shortened. Mobile sheet: menu header = "None selected" / "n selected" (via the port's existing `title` prop, port untouched), footer "Clear all" removed (the menu has its own). Onboarding and profile-edit copy "opportunities". Single nav label: ink colour, `aria-current`. |
| 3 | 2026-11-24 | «отображение крупных чисел сделай нормальным, сейчас например 1000000 слипнутый и не понятно что это - миллион, десять миллионов или вообще сто тысяч. Так-же добавь выбор валюты (по дефолту тенге) и показывай её.» Owner chose: two amounts from / to (either may be empty) + currency ₸ KZT (default), USD, EUR, RUB; always "/ month"; no period choice. | New S4: `SalaryField` in the vacancy wizard and edit form; one formatter for card, details, employer page and preview; `salary` is an object in models and mocks; currencies in the catalog type; prototype states and a styleguide section. Status back to In review. |
| 4 | 2026-11-24 | Owner approved round 3 («да») with three fixes: keep From / To visible inside the amount fields; text inset equal to neighbouring fields; on narrow screens the currency on its own line so 9-digit amounts show whole at 390 px (check 360). | Muted "From" / "To" prefix inside the inputs; inset 12px; container-query layout (one row / From | To + currency / stacked); the currency select shows "₸ KZT". Caret, grouping and paste unchanged. |

## 7. Approval

- Approved by the product owner on 2026-11-24 (rounds 1–2, round 3 S4 Salary with the fixes of round 4).
- Approved screenshots: `design/screens/` (list-*, details-*, research-*; desktop and mobile)
