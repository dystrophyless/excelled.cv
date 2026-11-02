# Page templates (archetypes)

Every Novio page is one of these archetypes. Each has a **reference implementation** — open it, switch states with
`?state=…`, copy its structure. Source: `frontend/src/pages/styleguide/templates/<id>.tsx` · route `/styleguide/templates/<id>`.

## Choosing an archetype

```
Is the user signed out and authenticating?                → Auth
Is it a sequence of ordered steps (setup, posting)?        → Wizard
Is it the role's home ("what next")?                       → Dashboard
Is it searching / filtering a collection to open one?      → Browse
Is it one record + a decision (apply, move candidate)?     → Detail
Is it "my items" grouped by status?                        → Tracker (list)
Is it a team moving many items through stages?             → Pipeline (board)
Is it an owner managing records compared by columns?       → Table
Is it editing one record with several field groups?        → Form
Is it account preferences?                                 → Settings
Is it a public marketing page?                             → Landing
None fits                                                  → STOP: NEW-ARCHETYPE (see process.md)
```

A page may combine an archetype with patterns (e.g. Detail + a Modal form), but has exactly one archetype.

## App shell (all signed-in pages)

```
┌ header 60px, sticky, translucent page bg, hairline bottom ───────────────────────────┐
│ [n] Novio   Home  Vacancies  Applications  Saved           (actions) 🔔  (MA)       │
└───────────────────────────────────────────────────────────────────────────────────────┘
  Container (page 1120 | content 760 | form 560)
  PageHeader: eyebrow · h1 · description · actions(right)
  PageBody (gap 32) …
```
Primary nav sits in a gray track like SegmentedControl; the current section is the white raised thumb inside it (a lone white pill without the track reads as a button; an underline was rejected). Side navs (settings) mark the current item with a soft `--color-tray` fill.
< 1024: nav + collapsible actions move into a full-screen sheet behind ☰. Student / Employer / Public layouts differ only in nav items and actions (`app/layouts`).

---

### Auth — `/styleguide/templates/auth`
States: `sign-in` `sign-up` `submitting` `error` `verify` `verify-error`
```
            [n] Novio
        Welcome back            ← h2-size title, one-line muted subtitle
  ┌ tray ───────────────────┐
  │ ┌ card ───────────────┐ │   form: (Alert on error) · role switch (sign-up) · fields · lg primary full width
  │ └─────────────────────┘ │
  │ No account? Sign up     │   ← alternative action on the tray footer, centred
  └─────────────────────────┘
      legal text (sign-up)
```
No app header. Column 400. Verify = `OtpInput` (6 digits, separator after 3, resend timer).

### Wizard — `/styleguide/templates/wizard`
States: `default` `empty` `saving`
Minimal bar (logo · "Skip for now") → `Stepper` → question as h2 + one-line why → one `Tray` with the step's fields
(tray footer = progress hint) → footer row: ghost "Back" (left) · primary "Continue →" (right). Width `form`.
One topic per step, ≤ 5 steps; later steps skippable.

### Dashboard — `/styleguide/templates/dashboard`
States: `default` `loading` `empty` `error` — per block (see patterns.md § Loading)
Answers four questions in order:
1. **What's next?** — overview row of three equal-height trays (`Tray stretch`): Up next (date block + event), Profile strength (%, meter, next step), This week (3 numbers).
2. **What fits me best?** — "Top matches": a compact row list in one Card (logo · title + meta · `MatchScore compact` · save), max 4.
3. **How are my applications?** — aside: status funnel (bars per stage) + Activity timeline (tinted icon · text · time).
4. **How do I get better?** — "Skills that unlock more vacancies": missing skills ranked by frequency with `SkillSuggestion` + Undo.
`TwoColumn` end 360; section titles in both columns start on one line. Empty: header action becomes secondary
("Add skills" is the one primary), "See all" links hide, lists show guided empty states.

### Browse — `/styleguide/templates/browse`
States: `default` `loading` `empty` `error`
`PageHeader` → toolbar (search · `Show below=lg` Filters button · segmented type · sort) → `TwoColumn` start 280
(FilterMenu, sticky, hidden < 1024 → Modal) → results: count + filter chips → `VacancyCard`s (one column, `Grid min=560`)
→ `Pagination`.

### Detail — `/styleguide/templates/detail`
States: `default` `applied` `loading` `not-found`
`PageHeader` (eyebrow back link · title · `FactList` · secondary actions Save / Copy) → `TwoColumn` end 360 sticky:
main = `Card padding=lg` (company row + prose: intro, h3 sections, lists); aside = decision `Tray`
(header: type tag + deadline · card: `MatchScore lg` + `SkillBreakdown` · footer: hint + primary). < 1024: aside
first + `StickyBar mobileOnly` with the primary. Candidate detail (employer) = same layout, decision = status actions.

### Browse (saved) — `/styleguide/templates/saved`
States: `default` `loading` `empty`
The student's own bookmarks: Container `content` → PageHeader (count) → Toolbar (search · sort) → one column of
VacancyCards with a filled bookmark (removes with Undo) and Apply. Closed vacancies stay, greyed, with a "Closed" tag and
no Apply. No filter aside — personal lists are short.

### Detail (own profile) — `/styleguide/templates/profile`
States: `default` `loading`; `?preview=1`
The profile as employers see it + an owner-only panel (strength, CV, visibility). Primary action "Edit profile".
Edit profile → Preview opens `?preview=1`: info Alert "This is what companies see" + "Back to editing", owner panel hidden
(`TwoColumn` without `aside` renders main full width).

### Tracker (list) — `/styleguide/templates/tracker`
States: `default` `loading` `empty`
Container `content` → `PageHeader` → `SegmentedControl variant=underline` status groups with counts → one `Card padding=sm`
with rows: logo · title link + meta · next-step note · `StatusTag` · "⋯" `DropdownMenu`.

### Pipeline (board) — `/styleguide/templates/pipeline`
States: `default` `loading` `empty`
`PageHeader` (back link · vacancy title · status line · Edit + "⋯") → toolbar (Board / List / Not selected (n) · sort note) →
board of gray columns (stage + `Count`) holding white `CandidateCard`s sorted by match; "⋯" moves a candidate.
Columns min 260, horizontal scroll with snap. Hired / Not selected are filters, not columns.

### Table — `/styleguide/templates/table`
States: `default` `loading` `empty`
`PageHeader` with the primary action → toolbar (status segmented with counts · search) → `DataTable`
(name + secondary line, status `Tag`, numbers right-aligned, "⋯" last column, row click opens) → empty = `EmptyState` with the primary action.

### Form (employer) — `/styleguide/templates/vacancy-edit`
States: `default` `error` `saving`
Same structure as Form; skills as two Comboboxes (Required / Nice to have), Radio group for choices confirmed with Save,
`DateField` for the deadline; StickyBar with "Save draft" (ghost) + "Publish" / "Save changes" (primary).

### Detail (employer) — `/styleguide/templates/candidate`
Candidate for one vacancy: BackLink to the pipeline, `FactList`, CV / Email secondary actions; decision Tray with the
current stage, `MatchScore lg` + `SkillBreakdown subject="candidate"`, footer "⋯" (other stages, Not selected) + next-stage primary.

### Form — `/styleguide/templates/form`
States: `default` `dirty` `saving` `error`
Container `content` → `PageHeader` (back link, Preview) → (error `Alert`) → one `Card padding=lg` of `FormSection`s
→ `StickyBar` (Unsaved changes · Discard · Save changes) when dirty.

### Settings — `/styleguide/templates/settings`
States: `default` `confirm-delete`
`PageHeader` → `TwoColumn` start 220 (section nav, sticky) → one `Card` per section with `FormSection`s; switches save
instantly (+ toast); last card = delete with confirmation `Modal`.

### Landing — `/styleguide/templates/landing`
Hero (hero/display type, one value sentence, primary + secondary CTA) → real `VacancyCard`s (guest mode) →
"How it works" 3 numbered `Card`s → closing CTA `Tray` → footer. `PublicLayout`.

---

## Mapping to Novio routes

See `ia.md` → Sitemap (each route lists its archetype). Until a feature ships, `frontend/src/app/router.tsx` maps its real
path to the reference template (**demo routes**), so the whole app can be clicked through at `http://localhost:5173/`.
Shipping a page = replacing its demo route with the real page.
