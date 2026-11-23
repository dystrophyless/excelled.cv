# UI spec: Student and company profiles

**Feature**: `003-profiles` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Status**: Approved (2026-11-23)
**Designer**: ui-designer · **Prototype**: `/prototypes/003-profiles`

## 1. Screens

| # | Screen | Route | Role / layout | Archetype | Reference template | User stories (spec.md) |
|---|---|---|---|---|---|---|
| S1 | Student onboarding (5 steps) | `/onboarding` | Student / none (wizard bar) | Wizard | `/styleguide/templates/wizard` | US1 (US5QATest 1–4) |
| S2 | My profile | `/app/profile` | Student / `StudentLayout` | Detail (own profile) | `/styleguide/templates/profile` | US1 (sc. 1), US3 (sc. 2) |
| S3 | Edit profile | `/app/profile/edit` | Student / `StudentLayout` | Form | `/styleguide/templates/form` | US3 (US7QATest 1–5) |
| S4 | Company onboarding (5 steps) | `/company/onboarding` | Employer / none (wizard bar) | Wizard | `/styleguide/templates/wizard` | US2 (US6QATest 1–3) |
| S5 | Company profile (view + edit in one page) | `/company/profile` | Employer / `EmployerLayout` | Form | `/styleguide/templates/form` | US2 (sc. 1), US3 (sc. 1–6) |
| — | Vacancy wizard preview (002, changed) | `/company/vacancies/new` step 4 | Employer | Wizard (unchanged) | — | US3 sc. 6, FR-016 |

Prototype screens: `/prototypes/003-profiles/onboarding` · `/profile` · `/profile-edit` · `/company-onboarding` · `/company-profile`.

### Decisions that apply to several screens

- **Onboarding is step by step (round 2).** One question per step, 5 steps (the Wizard maximum), kit `Stepper` on top
  (desktop: numbered steps; < 768: "Step 2 of 5 · University" + bar). Steps are defined once in `model.ts`
  (`STUDENT_STEPS`, `COMPANY_STEPS`: label + the fields the step owns).
- **Ready-made answers instead of empty inputs.** Short, closed answer sets are kit `ChoiceCardGroup`s (patterns.md §16):
  `md` cards with an icon tile (industries, `industryIcon(value)`); `sm` tiles for years, sizes, cities. The group's legend
  is hidden (screen readers only) when the step h1 already asks the question; a step with two questions shows both
  legends. Multi-answer questions use `ChoiceCardGroup type="checkbox"` (fields of work, position type). The grids never
  scroll sideways.
- **University and major are searched, not picked from a shortlist (round 4).** Showing 8 "popular" universities as cards
  ranked schools and made everyone else take a second-class "Another university" path. Both steps are now one kit
  `Combobox` (single, typeahead, keyboard) over a broad **alphabetical** list with no highlighted subset
  (`features/profiles/universities.ts`: 83 universities with city; 45 majors). A name that isn't listed is offered in the
  same list as a normal option and saved exactly as typed (validated 2–120 characters); the hint then says
  "Saved as you typed it". A listed university shows its city under the field. Majors follow the same rule: a fixed
  shortlist of 8 also implied "real" vs "other" majors, and patterns.md §16 sends long / typed answer sets to `Combobox`.
- **Required stays required.** Steps 1–4 (student: name · university + degree · major + year of study · looking for) and 1–3 (company) can't be passed without a valid answer. The optional
  steps (student "About": city + about me; company "Details": website + city, "About": description) can be left empty:
  Continue / Save just move on. There is no "Skip" button and no "Skip for now" in the bar (FR-014).
- **Continue checks the current step; Save checks everything.** A missing or wrong answer shows its field message on that
  step and focuses it (a radio list focuses its first answer); > 1 wrong field adds the Alert "Fix N fields to continue".
  If Save finds a wrong field on an earlier step (only possible through stale data), it jumps back to that step.
  Back never validates and keeps every answer.
- **The final button is "Save"** (QA sheets); intermediate steps use "Continue →", previous step "← Back" (ghost). The
  bar's right slot is ghost "Log out" — the only other way out of a required onboarding.
- **Same components and data in the edit forms (S3, S5).** University and Major are the very same `UniversityField` /
  `MajorField` as onboarding; Degree and Year of study are `SelectField`s with the same answers as the onboarding tiles
  (`studyYearOptions(degree)`); Fields of work = `Combobox multiple max=3`, Position type = `Checkbox`es in a
  `ChoiceGroup` (patterns.md §16: cards only in wizard steps); City / Industry / Size are catalog `SelectField`s.
- **Year of study, not graduation year (round 13, owner; spec FR-002/FR-003).** The graduation year is gone everywhere.
  The year of study depends on the degree (Kazakhstan levels): College (TVE) 1–4, Bachelor's 1–4 (round 14), Master's 1–2,
  Doctoral (PhD) 1–3, Residency 1–4, plus "Graduated" for every degree (`DEGREE_MAX_YEAR`, catalog `degrees[].max_year`).
  Changing the degree clears a year the new degree doesn't have (`degreePatch`), so the student re-picks it.
- **US5QATest "invalid academic data"** in the UI = required academic answers left out or not fitting: Continue on step 2
  without a degree ("Choose your degree"), on step 3 without a year ("Choose your year of study"), an empty / 1-character
  university or major, a GPA like "4.5" on Edit profile ("Enter a GPA from 0.00 to 4.00, like 3.45"). A year beyond the
  degree's length can't be picked in the UI (the tiles / select only offer valid years); the API refuses it (FR-003's
  "4th year of a Master's"), so that case stays an API test, and the UI shows "Choose a year from 1 to {max}, or
  Graduated" if stale data ever brings one.
  → e2e US5QATest 2: on step 3 press Continue without a year → field message; on step 2 type "A" + Continue → messages.
- **Version conflict follows 002**: warning Alert, nothing saved; "Load latest version" replaces the form with the server's
  profile, or "Save" again replaces the server's version with the user's edits (an explicit choice, never silent).
- **Every text field shows its limit** (FR-004): short fields in the hint ("up to 80 characters"), long ones as a live
  counter ("171 of 1000 characters"); `maxLength` stops typing at the limit.

### Data for the ready-made answers (for plan / contracts)

| List | Where | Why |
|---|---|---|
| Universities of Kazakhstan (83: name, city, aliases), alphabetical | **frontend constant** `UNIVERSITIES` in `features/profiles/universities.ts` | the API stores university as free text (spec Assumptions); the list only speeds up input and must be curated by people. Compiled from public sources, **not checked against the official accreditation registry** — the owner (or someone they name) should review it. If it needs updates without a release, move it to `GET /api/catalog` → `universities: [{ name, city, aliases }]`; the Views keep the same shape. |
| Majors (45), alphabetical | **frontend constant** `MAJORS` (same file) | free text in the API |
| Years of study | computed: `studyYearOptions(degree)` = "1st year" … "{max}th year" + "Graduated"; the same list for the tiles and the edit select | FR-003 |
| Degrees (+ max year), language levels | **catalog** `degrees: [{value, label, max_year}]`, `language_levels` (contracts) | server-owned enums; short headline names (Bachelor's, PhD…) in `model.ts` `degreeShort` |
| Fields of work, position types ("Looking for") | **catalog** `fields` (refined in round 14, each with `description`), `types` (002) | matching compares like with like |
| Field descriptions (round 14) | written here, copied by the backend into the catalog — see "Fields of work" below | students who don't know the roles yet |
| Languages (suggestions) | frontend constant `LANGUAGES` (14, A–Z), free text allowed | data-model: suggested list |
| Cities, industries, company sizes | **catalog** (`/api/catalog`, unchanged from plan/R5) | server-owned enums |
| Starter prompts for about me / description | frontend constants `ABOUT_PROMPTS`, `DESCRIPTION_PROMPTS` | copy, not data |

**Fields of work (round 14, owner: "What is 'Data'?").** One list for profiles and vacancies (data-model § Enums).
Label · description (exact strings; the backend copies them into `GET /api/catalog` → `fields[].description`):

| value | label | description |
|---|---|---|
| backend | Backend | Builds the server side: APIs, databases, business logic |
| frontend | Frontend | Builds the web pages and apps people see and click |
| mobile | Mobile | Builds apps for iPhone and Android |
| data_analytics | Data Analytics | Turns data into reports and dashboards that answer business questions |
| data_science | Data Science (incl. ML) | Builds models that predict and recommend, including machine learning |
| data_engineering | Data Engineering | Builds the pipelines and storage that collect and clean data |
| qa | QA | Tests software and finds bugs before users do |
| design | UI/UX Design | Designs screens and flows that are clear and easy to use |
| devops | DevOps | Keeps apps running: servers, cloud, releases, monitoring |
| security | Cybersecurity | Protects systems and data from attacks and leaks |
| product | Product | Decides what to build and why, with users and the team |
| other | Other | Support, IT, business analysis and other roles |

**For the builder — 002 vacancy screens (not redesigned):** the vacancy form's Field `SelectField`, the list / browse filters
and `features/company-vacancies/mocks.ts` must use this list (labels from the catalog; `data` → `data_analytics` in mocks,
e.g. "Junior Data Engineer" → `data_engineering`); SelectField options may show the description as their second line.

Round 13 needs the catalog / contract additions already in `contracts/profiles-api.md` (degrees, language levels, `StudentProfileIn`).

## 2. Screen details

### S1 — Student onboarding (`/onboarding`)

**Goal**: a new student creates their profile in about a minute: 5 short steps, the required facts only.

**Structure (round 13)**: each step pairs a question with the one that depends on it or belongs with it:
1 Name · 2 University + degree (the degree decides the years) · 3 Major + year of study · 4 Looking for (fields + position
types) · 5 About (city + about me, optional). GPA, projects, languages and contacts are not asked here (spec Assumptions:
added from the profile page). Step 4 (round 15, owner: "if a person picks 'I'm not sure yet' they still have to scroll past the list"): position type
first, then one two-way question "Do you know which field you want?" — "I know which field" / "I'm not sure yet" (md
radio cards with icon tiles `match` / `search`, nothing preselected). Only "I know which field" reveals the 12 field
cards; with "I'm not sure yet" nothing else appears and Continue sits right under the two cards (measured: Continue
bottom at y 646 of 900 at 1440; fully visible without scrolling at 390 × 844). Switching back to "not sure" collapses the
list but keeps the ticked fields in memory (`fields` stays, `fieldChoice = "unsure"` sends `[]`), so switching again
shows them — no surprise data loss. Focus stays on the radio; the list follows it in tab order and a polite live region
says "12 fields shown below". Stepper labels "Name · University · Major · Looking for · About" fit the `form` column
(560) at every width ≥ 768 (measured at 1440 and 1024); below 768 the kit's "Step n of 5 · Label" + bar.

**Layout** (wizard template, width `form` 560):
```
wizard bar (header): Logo → home · ghost sm "Log out" (icon logout)
main:
  Stepper: Name · University · Major · Looking for · About
  h1 (step question) · sub
  [Alert error "Couldn't save your profile"]                 (save error, last step)
  [Alert error "Fix N fields to continue|save" + labels]     (> 1 wrong field on the step)
  form "Create your profile":
    Tray padding=lg (data-testid student-onboarding-step, data-step=<label>) · footer = step hint
      <step content, below>   (two questions → Stack gap 24, both legends visible)
    footer row: ghost "Back" (from step 2) · primary "Continue →" (steps 1–4) | primary "Save" (step 5)
```

| # | Step (Stepper) | h1 / sub | Content | Tray footer |
|---|---|---|---|---|
| 1 | Name | "Welcome to Novio. What's your name?" / "Five short steps, about a minute. You can change everything later." | TextField Full name | "Use the name you'd put on your CV" |
| 2 | University | "Where do you study?" / "Nice to meet you, {first name}. Find your university, then pick the degree." (no name → "Find your university, then pick the degree.") | `UniversityField` (Combobox, as round 4) · ChoiceCardGroup sm `min=140 columns=3` legend "Degree": College (TVE) · Bachelor's · Master's · Doctoral (PhD) · Residency (3 + 2); nothing preselected | "Every university and college in Kazakhstan is welcome. If yours isn't listed, use the name as you type it" |
| 3 | Major | "What do you study?" / "Your major and the year you're in now." | `MajorField` (Combobox) · ChoiceCardGroup sm `min=100 columns=4` legend "Year of study": the degree's years + "Graduated" (Bachelor's / College / Residency 4 + 1, Master's 3, PhD 4) | "Finished your studies? Choose “Graduated”. You can change it later in your profile" |
| 4 | Looking for | "What would you like to work on?" / "Choose the kind of position first. Not sure about the field yet? That's normal, you can explore." | ChoiceCardGroup checkbox sm `min=88 columns=3` legend "Position type", hint "Choose all that suit you" (one row at every width) · ChoiceCardGroup radio md `min=220 columns=2` legend "Do you know which field you want?": "I know which field" / "Pick up to 3 of 12 fields, each explained" (icon `match`) · "I'm not sure yet" / "Show me vacancies from every field. I'll decide later" (icon `search`) · **only with "I know which field"**: ChoiceCardGroup checkbox md `min=220 columns=2` legend "Pick up to 3 fields", hint "{n} of 3 chosen", the 12 fields with descriptions (disabled at 3) | "You can change this any time in your profile" |
| 5 | About | "Almost done. Anything else to add?" / "Both are optional. Projects, languages and contacts come later, on your profile." | ChoiceCardGroup sm `min=120 columns=4` "City (optional)": catalog cities + "Not specified" (default) · TextareaField "About me (optional)" + "Need a start? Tap one" starters (unchanged) | "Optional · you can leave this step empty" |

**Copy — fields and messages**:
| Element | Text |
|---|---|
| Full name | label "Full name" · placeholder "e.g. Maya Akhmetova" · hint "First and last name · up to 80 characters" |
| About me | placeholder "e.g. Third-year student who likes building APIs and is looking for a backend internship." · hint "{n} of 1000 characters" |
| Field errors | "Enter your full name" · "Enter at least 2 characters" · "Use {max} characters or fewer" · "Choose or enter your university" · "Choose your degree" · "Choose or enter your major" · "Choose your year of study" · "Choose a year from 1 to {max}, or Graduated" (stale data only) · "Choose one: I know which field, or I'm not sure yet" · "Pick at least one field, or choose I'm not sure yet" · "Choose up to 3 fields" (API / stale only) · "Choose at least one position type" |
| Summary (> 1 error on a step) | "Fix {n} fields to continue" (steps 1–4) / "Fix {n} fields to save" (step 5) · labels joined " · " (e.g. "University · Degree") |
| Save error | "Couldn't save your profile" · "Check your connection and try again. Nothing you typed is lost." |
| Load error (catalog) | EmptyState error "Couldn't load the form" · "Check your connection and try again." · [Try again] |
| Toast on success | "Profile saved" |

**States** (`?state=`):
| State | What the user sees | Trigger in the real page |
|---|---|---|
| name | step 1, empty | first visit |
| name-error | step 1, "Enter your full name" | Continue with an empty name |
| university | step 2, empty search field, no degree | |
| university-picked | "Satbayev University" (hint location + "Almaty") · Bachelor's | picked from the list |
| university-typed | "Ekibastuz Engineering and Technical Institute" ("Saved as you typed it") · College (TVE) | not in the list |
| university-error | both errors + summary "Fix 2 fields to continue · University · Degree" | Continue with nothing |
| major | step 3, Computer Science · 3rd year (Bachelor's → 4 years + Graduated) | |
| major-error | step 3, year tiles with the error edge + "Choose your year of study" | Continue without a year |
| looking-for | step 4, nothing chosen: position types, the two field cards, Continue | arrive on step 4 |
| looking-for-fields | Internship · "I know which field" · list open with Backend + Data Engineering ticked | picked fields |
| looking-for-max | list open, Backend, Data Engineering, DevOps ticked, the other 9 disabled; Internship + Part-time | 3 fields chosen |
| looking-for-exploring | Internship + Full-time · "I'm not sure yet": no list, Continue right below (the short path) | student doesn't know yet |
| looking-for-error | nothing chosen + Continue: "Choose at least one position type" + "Choose one: I know which field, or I'm not sure yet" + summary "Fix 2 fields to continue · Position type · Field of work"; focus on Internship. ("I know which field" + no tick → "Pick at least one field, or choose I'm not sure yet" on the list, focus on Backend) | Continue with nothing |
| about | step 5 (Save), Almaty chosen, about empty | |
| saving | step 5, Save loading, Back and Log out disabled | POST in flight |
| save-error | step 5, Alert "Couldn't save your profile", answers kept | POST network / 5xx |
| loading | tray skeleton, Continue disabled, `aria-busy` | catalog pending |
| error | tray EmptyState "Couldn't load the form" + Try again, Continue disabled | catalog error |

**Interactions**:
- Enter in a text field or on a radio / checkbox = the primary button (Continue / Save). Continue →
  `stepErrors(step, validateStudent(values))`; errors → show + focus the first invalid control (a card group → its first
  card); else next step, focus moves to the new h1, scroll to top.
- Tab in University / Major accepts the highlighted option and moves on (kit fix, round 14).
- Picking a degree keeps a year that still fits and clears one that doesn't (`degreePatch`).
- Save → validate everything → first wrong step (if any) → else POST `toStudentIn(values)` (projects / languages `[]`,
  contacts null) → invalidate `["me"]` → toast "Profile saved" → `safeNext(next)` or **`/app/profile`**. 409
  `profile_exists` → `/app/profile`.
- Editing an answer clears its error. Log out → sign-out → `/sign-in`. Logo → `/app` (guard brings the student back).
- Nothing is stored before Save (signing out loses the answers; spec edge case).

**Responsive**: single column (`form` 560); the card grids keep their column caps (degree 3, years 4 → 2 on mobile,
fields / types 3 → 2 on mobile); nothing scrolls sideways at 390 / 1024 / 1440 (measured).

**Test hooks**: `getByRole("heading", { level: 1 })`, `getByLabel("Full name")`, `getByRole("combobox", { name: "University" })`
(+ `getByRole("option", { name: "Satbayev University" })`), `getByRole("radio", { name: "Bachelor's" })`,
`getByRole("combobox", { name: "Major" })`, `getByRole("radio", { name: "3rd year" })` / `{ name: "Graduated" }`,
`getByRole("radio", { name: "I'm not sure yet" })` (S3 edit form: checkbox of the same name), `getByRole("checkbox", { name: "Backend" })` (description = accessible description), `getByRole("checkbox", { name: "Internship" })`, `getByLabel(/About me/)`,
buttons "Continue", "Back", "Save" (exact), "Log out" (click the role: the native input covers the card);
`data-testid`: `student-onboarding-step` (+ `data-step`), `university-input`, `degree-choices`, `major-input`,
`study-year-choices`, `field-choice` (radios: `getByRole("radio", { name: "I know which field" | "I'm not sure yet" })`), `field-choices`, `position-type-choices`, `city-choices`, `about-starters`, `error-summary`, `save-error`.

### S2 — My profile (`/app/profile`)

**Goal**: the student sees their profile as a person's profile (who they are, what they study and want, what they built)
and adds what's missing. Round 7 layout kept (owner): two blocks, avatar identity, Education with its icon tile, missing
items added from the right panel. `views/StudentProfileView.tsx` + `views/profile-parts.tsx`.

**Layout** (Detail (own profile) template, container `page`):
```
PageHeader: title "My profile" · actions [primary sm "Edit profile"]
TwoColumn end 360 sticky (below 1024: the owner panel follows the profile card)
  main: Card padding=lg (data-testid student-profile), Stack gap 24, a divider between blocks
          identity (profile-identity): Avatar lg 56 · name (h2 20/28) · FactList [education "{Major} · {Degree}, {n} year"
                    | "{Major} · {Degree}, graduated", location "{City}" if set]
          Section "Looking for": entry = 40 icon tile (vacancy) · title "Backend, Data Engineering" · meta "Internship or part-time"
                    | no field ("I'm not sure yet"): tile (search) · title "Open to any field" · meta "Still exploring · Internship"
          Section "About": text | empty → prompt + "+ Write about yourself" (→ edit#about)   (below Looking for: round 16)
          Section "Education": entry = 40 icon tile (education) · title row "{University}" ……… "GPA 3.45" (right, if set)
                    · meta "{university city}" (when listed)
          Section "Projects" (only if any): per project tile (project) · title · description (13/20) · link "github.com/…"
          Section "Languages" (only if any), full width: language (ink) · level (muted) pairs
          Section "Contacts" (only if any): ONE block — a hairline-bordered list (radius control), one row per channel;
                    the whole row is the link: logo 20 · label (13, muted, fixed 80 column) · value (14 medium ink) ·
                    external icon 14 at the row end for new-tab links; hover = tray fill + underlined value; focus = kit
                    ring inside the row. Order: Phone · WhatsApp · Telegram · LinkedIn · GitHub · Website. Below 640 the
                    label sits above the value. Logos: real brand marks (`BrandIcon`, brand colour tokens) for WhatsApp,
                    Telegram, LinkedIn, GitHub; Lucide `phone` / `website` (muted-strong) for the rest. Project links keep
                    the inline link + external cue.
  aside: Tray (data-testid owner-panel)
          header: lock "Only you can see your profile for now"
          card:   anything optional missing → "Complete your profile" · "{n} of 6 added" + rows City · About me · GPA ·
                    Projects · Languages · Contacts (added = success icon, muted; missing = add icon + ghost sm "Add",
                    aria-label "Add city" … → `edit#city|about|gpa|projects|languages|contacts`) ── divider
                  everything filled → **no completeness block at all** (FR-006a)
                  "Coming soon": CV · Skills (unchanged)
          footer: "Updated {20 Nov 2026}"
```
**Each fact once**: major, degree and year in the headline; university, its city and GPA in Education; fields and position
types in Looking for. Empty optional sections (Projects, Languages, Contacts) are not drawn in the card; the panel lists
them (one entry point each). About keeps its round 7 prompt.

**Copy**:
| Element | Text |
|---|---|
| Title / primary | My profile · Edit profile |
| Headline | {Major} · {College / Bachelor's / Master's / PhD / Residency}, {1st…6th} year · or "…, graduated" (replaces "{Major} student") |
| Sections | About · Looking for · Education · Projects · Languages · Contacts |
| Looking for meta | position types joined " or ", first capitalised: "Internship or part-time", "Full-time" |
| GPA | "GPA {0.00}" (two decimals) |
| Looking for (no field) | "Open to any field" · "Still exploring · {types}" |
| Contacts | labels Phone · WhatsApp · Telegram · LinkedIn · GitHub · Website · values: phone as typed (tel:, same tab) · WhatsApp as typed (https://wa.me/{digits}) · "@{handle}" (https://t.me/{handle}) · LinkedIn / GitHub / Website without the scheme · accessible name "{Label}: {value} (opens in a new tab)" (phone without the cue) |
| Empty about | "Say what you study, what you enjoy and what you're looking for. Two or three sentences are enough." · [+ Write about yourself] |
| Owner panel | "Only you can see your profile for now" · "Complete your profile" · "{n} of 6 added" · City · About me · GPA · Projects · Languages · Contacts · [Add] · "Coming soon" · CV "Apply to vacancies in one step" · Skills "Get matched with vacancies" · footer "Updated {d Mon yyyy}" |
| Error | EmptyState "Couldn't load your profile" · "Check your connection and try again." · [Try again] |

**States**:
| State | What the user sees | Trigger |
|---|---|---|
| default | everything filled (all six sections); panel = Coming soon only (no completeness) | full profile |
| partial | Master's graduate, city, about, GPA 3.80, languages; panel "4 of 6 added", Add on Projects + Contacts | some optional data |
| minimal | onboarding data only, "I'm not sure yet" (Looking for = "Open to any field"); no city, About prompt, no GPA, no extra sections; panel "0 of 6 added" | required only |
| loading | skeletons (identity, About lines, two entry tiles, panel lines + footer), Edit disabled, `aria-busy` | query pending |
| error | "My profile" + Card EmptyState error + Try again | query error |

**Interactions**: Edit profile → `/app/profile/edit`; Add / Write about yourself → `/app/profile/edit#<section>` (the page
scrolls to the section and focuses its first field; prototype `useSectionFromHash`). Links: projects / LinkedIn / GitHub /
website open in a new tab; Telegram t.me; phone tel:. Toasts "Profile saved" / "Changes saved" on arrival.

**Test hooks**: `getByRole("heading", { level: 1, name: "My profile" })`, `getByRole("button", { name: "Edit profile" })`,
`getByRole("button", { name: "Write about yourself" })`, `getByRole("button", { name: "Add city" | "Add about me" | "Add GPA" |
"Add projects" | "Add languages" | "Add contacts" })`; `data-testid`: `student-profile`, `profile-identity`, `profile-about`,
`profile-about-empty`, `profile-looking-for`, `profile-education`, `profile-gpa`, `profile-projects`, `profile-languages`,
`profile-contacts`, `contact-phone` / `contact-whatsapp` / `contact-telegram` / `contact-linkedinUrl` / `contact-githubUrl` / `contact-websiteUrl`
(`getByRole("link", { name: /GitHub/ })`), `profile-checklist`, `profile-completeness` (absent when complete), `owner-panel`.

### S3 — Edit profile (`/app/profile/edit`)

**Goal**: change any part of the profile, including the optional extras added only here; invalid changes are refused and
the stored data stays.

**Layout** (form template, container `content`):
```
PageHeader: eyebrow BackLink "Profile" → /app/profile · title "Edit profile" · description "Keep your studies, goals and contacts up to date."
PageBody:
  [Alert warning conflict | Alert error save error]
  [Alert error "Fix N fields to save"]
  Card padding=lg → form "Edit profile" (data-testid student-profile-form); FormSection ids = the profile's Add targets
    #about-you "About you" — "Your name, city and a short intro." → Full name · City (#city) · About me (#about)
    #studies "Studies" — "Where and what you study, and your year. GPA is optional." → University · Major ·
             Grid(Degree | Year of study) · GPA (#gpa)
    #looking-for "Looking for" — "The fields and kinds of position you want next." → Fields of work · Position type
    #projects "Projects" — "Things you built: a course project, a bot, a site. Up to 10." → rows · [+ Add project]
    #languages "Languages" — "Each language once, with your level. Up to 10." → rows · [+ Add language]
    #contacts "Contacts" — "How employers can reach you besides your sign-in email. All optional." → Grid min 200:
             Phone | WhatsApp · Telegram | LinkedIn · GitHub | Website
  StickyBar (when dirty, data-testid unsaved-bar): "Unsaved changes" · ghost sm "Discard" · primary sm "Save"
Modal "Leave without saving?" (data-testid leave-dialog)
```

**Fields**:
| Field | Control |
|---|---|
| Full name, City, About me, University, Major | as round 12 |
| Degree | SelectField "Choose a degree" (catalog degrees, long labels) |
| Year of study | SelectField "Choose a year": `studyYearOptions(degree)`; a degree change clears a year that no longer fits |
| GPA (optional) | TextField, `inputMode=decimal`, max 4 chars, placeholder "e.g. 3.45", hint "On the 4.0 scale"; "3,45" accepted |
| Position type | first in the section (as onboarding): `ChoiceGroup` with 3 `Checkbox`es |
| Fields of work | Combobox `multiple max=3` over the 12 fields (descriptions as second lines), hint "Up to 3. Each field says what the role does" · under it Checkbox "I'm not sure yet" / "Show me vacancies from every field" — ticked: `fieldChoice = "unsure"`, the Combobox is disabled with "Open to any field" but the chosen fields stay in memory and come back when unticked. **Why a checkbox here, not round 15's two cards:** a form, not a wizard step — nothing long to scroll past, the fields are a compact Combobox, and the two-card question would weigh more than the answer (patterns.md §16: cards only in wizard steps). |
| Position type | `ChoiceGroup` legend "Position type" with 3 `Checkbox`es (Internship · Full-time · Part-time) |
| Project row | header "Project {n}" + ghost icon button "Remove project {n}" (Tooltip) · TextField Title (hint "Up to 80 characters") · TextareaField "What it does (optional)" rows 2, counter "{n} of 300 characters" · TextField "Link (optional)", hint "Code, demo or write-up · we add https:// if it's missing"; rows separated by a hairline |
| Language row | Combobox "Language {n}" (`LANGUAGES` A–Z, free text, clearable, inFlow) · SelectField "Level" (Native · Fluent · Intermediate · Basic) · ghost icon "Remove language {n}"; desktop 3fr / 2fr / button on one line, < 640 language + remove on one line, level under it, hairline between rows |
| Add buttons | secondary sm "+ Add project" / "+ Add language" (focus moves to the new row's first field); at 10: text "You've added 10, the maximum"; empty list: "No projects yet." / "No languages yet." |
| Contacts | TextFields (all optional): Phone `type=tel` placeholder "+7 701 123 45 67" · WhatsApp `type=tel` placeholder "+7 701 123 45 67", hint "The number you use in WhatsApp" (same rule as phone) · Telegram "@username" · LinkedIn "linkedin.com/in/you" · GitHub "github.com/you" · Website "you.dev" |

Remove acts at once (no dialog): it is undone with Discard; focus moves to the section's Add button.

**Field errors** (in addition to S1): "Enter a GPA from 0.00 to 4.00, like 3.45" · "Enter the project title" · "Use 300 characters or fewer" ·
"Enter a link like github.com/you/project" · "Choose or enter a language" · "{Language} is already in your list" ·
"Choose a level" · "Enter a phone number like +7 701 123 45 67" (phone and WhatsApp) · "Enter a username like @maya_a: 5–32 letters, digits or _" ·
"Enter a link like linkedin.com/in/you" / "github.com/you" / "you.dev". Summary labels: field labels, rows as "Project {n}" /
"Language {n}" (e.g. "Full name · Project 2 · Language 4").

**Copy**:
| Element | Text |
|---|---|
| Sticky bar | Unsaved changes · Discard · Save |
| Conflict Alert | title "Your profile was changed elsewhere" · "A newer version was saved, maybe in another tab, so nothing was saved here. Load it to see the latest data, or save again to replace it with your edits." · action "Load latest version" |
| Save error Alert | title "Couldn't save your profile" · "Check your connection and try again. Nothing you typed is lost." |
| Leave dialog | title "Leave without saving?" · "You have unsaved changes. They'll be lost if you leave this page." · [Keep editing] [Leave without saving] (destructive) |
| Load error | EmptyState "Couldn't load your profile" · "Check your connection and try again." · [Try again] |
| Toasts | "Changes saved" · after Load latest: "Loaded the latest version" |

**States**:
| State | What the user sees | Trigger |
|---|---|---|
| default | form prefilled (2 projects, 3 languages, 4 contacts), no bar | loaded, nothing changed |
| dirty | year 3 → 4th year, a 4th language (Turkish · Basic), sticky bar | values ≠ loaded (trimmed, rows compared without ids) |
| validation | empty Full name + Project 2 link "github maya" + Language 4 "English is already in your list" + summary "Fix 3 fields to save" + bar | client check / 422 (`studentErrorKey(loc)` maps `["body","projects",1,"url"]` → `projects.1.url`) |
| saving | bar Save loading, Discard disabled | PUT in flight |
| save-error | Alert save error, edits kept, bar | PUT network / 5xx |
| conflict | Alert warning + Load latest version, edits kept, bar | 409 `version_conflict` |
| leave-confirm | Modal over the dirty form | router blocker / BackLink / nav while dirty |
| loading | header + card with 4 sections of field skeletons, `aria-busy` | query pending |
| error | header + Card EmptyState error + Try again | query error |

**Interactions**: as round 12 (Save / Enter → validate → focus first invalid → PUT `toStudentIn(values)` + `version` →
toast → `/app/profile`; Discard; 409 keeps edits and stores the server version; leave blocker). Projects and languages are
sent as whole lists (contracts). Arriving with `#section` scrolls to it and focuses its first field.

**Responsive**: < 768 FormSection titles stack above fields; contact grid 2 → 1 column; language rows as above; the sticky
bar spans the viewport bottom. No horizontal scroll at 390 / 1024 / 1440 (measured).

**Test hooks**: `getByLabel("Full name")`, `getByRole("combobox", { name: "University" | "Major" | "Fields of work" | "Language 1" })`,
`getByRole("combobox", { name: "Degree" })`, `getByRole("combobox", { name: "Year of study" })`, `getByLabel(/GPA/)`,
`getByRole("checkbox", { name: "Internship" })`, `getByRole("button", { name: "Add project" | "Add language" | "Remove project 2" | "Remove language 1" })`,
`getByLabel(/Phone/)`, `getByLabel(/Telegram/)`, `getByRole("combobox", { name: /City/ })`, `getByLabel(/About me/)`, Discard, Load latest version;
`data-testid`: `student-profile-form`, `university-input`, `major-input`, `degree-select`, `study-year`, `gpa-input`,
`fields-input`, `exploring-checkbox` ("I'm not sure yet"), `position-types`, `project-rows`, `project-row`, `add-project`, `language-rows`, `language-row`,
`add-language`, `contact-fields`, `student-city`, `unsaved-bar`, `conflict-alert`, `save-error`, `error-summary`,
`leave-dialog`, `confirm-leave`.

### S4 — Company onboarding (`/company/onboarding`)

**Goal**: a new HR representative creates the company profile in 5 short steps; then they can post vacancies.

**Layout**: S1's wizard frame (Stepper Name · Industry · Size · Details · About, Log out, Back / Continue / Save), tray
`data-testid company-onboarding-step` (+ `data-step`).

| # | Step | h1 / sub | Content | Tray footer |
|---|---|---|---|---|
| 1 | Name | "Welcome to Novio. What's your company called?" / "Five quick questions, about a minute. You can change everything later." | TextField Company name | "Students see this name on every vacancy you post" |
| 2 | Industry | "What industry are you in?" / "Thanks, {company name}. Pick the closest one." | ChoiceCardGroup md with icon tiles (`industryIcon(value)`), legend hidden (2 columns desktop, 1 mobile): the 10 catalog industries (incl. "Other") | "“Other” is fine if nothing fits" |
| 3 | Size | "How big is your company?" / "A rough range is enough." | ChoiceCardGroup sm `min=140 columns=3`, legend hidden: the 5 catalog ranges ("1–10 employees" … "1000+ employees") | "Count everyone in the company, not only your team" |
| 4 | Details | "Where can students find you?" / "Both are optional. Add them now or later in Company profile." | TextField Website (optional) · ChoiceCardGroup sm `min=120 columns=4` "City (optional)": catalog cities + "Not specified" (default) | "Optional · you can leave this step empty" |
| 5 | About | "Last one. Describe your company in a few sentences" / "Optional. What you do and what it's like to work with you." | TextareaField Description (optional) + starters "+ We build…", "+ Interns at our company…", "+ We're looking for students who…" | "Optional · you can leave it empty and add it later" |

**Copy — fields and messages**:
| Element | Text |
|---|---|
| Company name | label "Company name" · placeholder "e.g. Kaspi.kz" · hint "Shown on every vacancy you post · up to 120 characters" |
| Website | label "Website (optional)" · placeholder "e.g. kaspi.kz" · hint "We add https:// if it's missing" |
| Description | placeholder "e.g. What your company does and what it's like to work there." · hint "{n} of 1000 characters" |
| Field errors | "Enter the company name" · "Enter at least 2 characters" · "Choose an industry" · "Choose the company size" · "Enter a website like kaspi.kz or https://kaspi.kz" · "Use 1000 characters or fewer" |
| Save error | "Couldn't save your company profile" · "Check your connection and try again. Nothing you typed is lost." |
| Toast | "Company profile saved" |

**States**: `name` · `name-error` ("K" → "Enter at least 2 characters") · `industry` (Finance & banking) · `industry-error`
("Choose an industry") · `size` · `details` · `website-error` ("kaspi kz") · `description` (Save) · `saving` · `save-error` ·
`loading` · `error`.

**Interactions**: as S1. Save → POST `/api/company/profile` → invalidate `["me"]` and `["company-profile"]` → toast →
`safeNext(next)` or `/company/vacancies` (spec US2 sc. 3).

**Test hooks**: `getByLabel("Company name")`, `getByRole("radio", { name: "Finance & banking" })`,
`getByRole("radio", { name: "1000+ employees" })`, `getByLabel(/Website/)`, `getByTestId("city-choices")`, `getByLabel(/Description/)`,
Continue / Back / Save; `data-testid`: `company-onboarding-step`, `industry-choices`, `size-choices`, `city-choices`,
`description-starters`, `error-summary`, `save-error`.

### S5 — Company profile (`/company/profile`)

**Goal**: see the company profile and edit it in place (ia.md: Form, view and edit in one page).

**Layout** (form template, container `content`; no back link — reached from the account menu "Company profile"):
```
PageHeader: title "Company profile" · description "Students see this on your vacancies · Updated {18 Nov 2026}"
PageBody: [conflict / save-error Alert] [summary Alert]
  Card padding=lg → form "Company profile" (data-testid company-profile-form)
    FormSection "Company" — "Who you are. A new name shows on all your vacancies right away." → Company name · Grid(Industry | Company size)
    FormSection "Details" — "Optional, but it helps students decide to apply." → Website · City · Description
  StickyBar when dirty: Unsaved changes · Discard · Save
Modal "Leave without saving?"
```

**Copy**: Company name / Website / Description and all field errors as S4; Industry and Company size are SelectFields ("Choose an industry", "Choose a size", catalog), City as S3; Alerts/dialog as S3 with "your company profile" ("Your company profile was changed
elsewhere", "Couldn't save your company profile"); load error "Couldn't load your company profile".
Toast on save: "Changes saved"; when the name changed, detail line "Your vacancies now show “{new name}”." (US3 sc. 6).

**States**: as S3 — `default` `dirty` (name "Kaspi Bank") `validation` `saving` `save-error` `conflict` `leave-confirm` `loading` `error`.

**Interactions**: Save → PUT → stays on the page: form = saved values, bar hides, header date updates, toast; invalidate
`["company-profile"]` (wizard preview) and the vacancy queries that show the company name. Everything else as S3.

**Test hooks**: `getByLabel("Company name")`, `getByRole("combobox", { name: "Industry" })`, `getByRole("combobox", { name: "Company size" })`, `getByLabel(/Website/)`, `getByRole("combobox", { name: /City/ })`, `getByLabel(/Description/)`; `data-testid`: `company-profile-form`, `company-industry`, `company-size`, `company-city` + S3's bar / alerts / dialog ids.

### Change to 002 — vacancy wizard preview shows the real company name

`frontend/src/features/company-vacancies/NewVacancyPage.tsx` passes the constant `COMPANY = "Your company"` to
`VacancyWizardView company=…` (lines 16–17, 127). The View needs no change. The page should read the company profile
(`useCompanyProfile()` → `GET /api/company/profile`, query key `["company-profile"]`, R7) and pass `company={profile.data.name}`;
treat the profile query like the catalog: `state = catalog.isPending || profile.isPending ? "loading" : catalog.isError || profile.isError ? "error" : "ready"`,
and `onRetry` refetches both. Delete the `COMPANY` constant. (RequireRole guarantees the profile exists on this page.)


## 3. Components

- Existing: `Container`, `PageHeader`, `PageBody`, `BackLink`, `TextLink`, `Card`, `Tray`, `TwoColumn`, `FormSection`, `Grid`,
  `Stack`, `Cluster`, `StickyBar`, `Stepper`, `Logo`, `Button`, `TextField`, `TextareaField`, `SelectField`, `Combobox`,
  `ChoiceCardGroup`, `ChoiceCard`, `Alert`, `EmptyState`, `Modal`, `Skeleton`, `Avatar`, `Tag`, `FactList`, `toast`, `StudentLayout`,
  `EmployerLayout`, `Icon`.
- Feature-local compositions of kit components (no new styling):
  `views/pickers.tsx` — `WizardFrame` (bar · Stepper · head · tray · Back/Continue/Save), `CardChoices` (ChoiceCardGroup + an
  optional "Other" `ChoiceCard` child that opens a TextField; `Choice = { value, label, description?, icon?: IconName }`);
  `views/parts.tsx` — `FullNameField`, `StudyFields` (edit: Combobox + Degree / Year SelectFields + `GpaField`),
  `LookingForFields`, `ProjectRows`, `LanguageRows`, `ContactFields`, `degreePatch`, `CityField`, `AboutField`,
  `PromptedTextarea` (TextareaField + starter buttons), `CompanyNameField`, `WebsiteField`, `CompanyBasicsFields`,
  `CompanyDetailsFields`, `ErrorSummary`, `FormAlert`, `SaveErrorAlert`, `UnsavedBar`, `LeaveDialog`, `FormSkeleton`.
  CSS: `views/profiles.module.css` (tokens only; wizard classes copied from the template).
- **Kit gap — repeatable row list (round 13, report).** The kit has no "list of rows with Add / Remove" component.
  `ProjectRows` / `LanguageRows` compose it from kit parts only (fields, ghost icon `Button` + `Tooltip`, secondary sm
  `Button`, hairline divider token, focus management); if a later feature needs the same (experience, education history),
  the design-architect should promote it to the kit (`RepeatableList`).
- **Kit gap — Combobox width.** The Combobox input keeps its default `size=20` width, so the field doesn't shrink below
  ≈ 224px (in a narrow grid cell the clear button overflows). Language rows use 3fr / 2fr columns to stay clear of it;
  fix in the kit: `min-width: 0; width: 100%` on the input (design-architect).
- **New components**: none in this feature. `ChoiceCard` / `ChoiceCardGroup` (kit, round 3, `components.md` + `patterns.md` §16),
  `industryIcon` (`@/components/icons`) and `Combobox` are used as documented. Feature-local: `UniversityField`,
  `MajorField` (`views/parts.tsx`, compositions of `Combobox`).
- **Kit gaps — `Combobox`: closed (design-architect, round 4).** The kit Combobox now takes object options
  `{ value, label, description?, keywords? }`, matches keywords case-insensitively with ranking (exact label / alias →
  prefix → word start → substring → alias / description substring; list order kept inside a rank; the matched alias is
  shown on the option's second line), has `createLabel`, lists every match (no 50 cap; active option scrolls into view;
  PageUp / PageDown / Ctrl+Home / Ctrl+End), and single mode has opt-in `clearable` (clear button + empty field on blur →
  `""`). `UniversityField` passes the 83 universities as options with `description` = city and `keywords` = aliases
  (KBTU, NU, ENU, KazNU, AITU, SDU, IITU find their university); both fields use `createLabel` "Use “{typed}”"; on Edit
  profile (`StudyFields`) both are `clearable`, so emptying University / Major shows the required error on Save.
  Both fields use the kit's `inFlow` list: the open list pushes Continue / Save down and never covers it (QA bug: typing
  "Kaz" then clicking Continue picked "Al-Farabi Kazakh National University"; patterns.md §16).

### Account menu (StudentLayout / EmployerLayout), for the builder

- Name in the avatar button and ProfileMenu = the profile's name: student `full_name` from the `["student-profile"]` query,
  employer company `name` from `["company-profile"]` (the same queries S2 / S5 and the vacancy wizard use). While the query
  is pending or has failed, show the sign-in email from `["me"]` as the name (initials then come from the email). The layouts
  only render on role pages, where `has_profile` is true, so the query never 404s there.
- The fake profile-setup progress ("3 of 5 · Add your CV") is removed (done in `app/layouts/layouts.tsx`). The mock names
  stay only as the styleguide / prototype fallback until the builder wires the queries.

## 4. Data contract for views

Shared types, labels, limits, validation (`validateStudent` — FR-003 mirror, `validateCompany`), steps (`STUDENT_STEPS`,
`COMPANY_STEPS`, `stepErrors`, `firstStepWithError`), answer lists (`studyYearOptions`, `DEGREE_MAX_YEAR`, `LANGUAGES`),
conversions (`toStudentValues`, `toStudentIn` → `StudentProfileIn`, `studentErrorKey(loc)` for 422 mapping), display
helpers (`studyHeadline`, `formatGpa`, `contactRows`) and toasts are in `frontend/src/features/profiles/model.ts`.
Form values are strings / string arrays / row arrays (rows carry a client-only `id`).

```ts
type LoadState = "ready" | "loading" | "error";
type ProfileFormAlert = "conflict" | "save-error";
type DegreeOption = Option & { maxYear: number };
type ProfileCatalog = {
  cities: Option[]; industries: Option[]; companySizes: Option[];
  degrees: DegreeOption[]; fields: FieldOption[] /* Option & { description } */; types: Option[]; languageLevels: Option[];
};
type StudentValues = {
  fullName; university; degree; major; studyYear /* "1".."4" | "graduated" */; gpa; fieldChoice: "" | "known" | "unsure"; fields: string[] /* kept while "unsure", sent as [] */; positionTypes: string[];
  city; about; phone; whatsapp; telegram; linkedin; github; website;
  projects: { id; title; description; url }[]; languages: { id; language; level }[];
};
type StudentErrors = { [K in StudentField | `projects.${number}.${"title"|"description"|"url"}` | `languages.${number}.${"language"|"level"}`]?: string };
type StudentProfile = {
  fullName; university; degree; major; studyYear: number | null; graduated: boolean; gpa: string | null;
  lookingForFields: string[]; positionTypes: string[]; city: string | null; about: string | null;
  contacts: { phone; whatsapp; telegram /* without @ */; linkedinUrl; githubUrl; websiteUrl /* string | null */ };
  projects: { title; description: string | null; url: string | null }[]; languages: { language; level }[];
  version: number; updatedAt: string;
};

type StudentOnboardingViewProps = {
  state: LoadState; step: number; values: StudentValues; errors?: StudentErrors;
  saveError?: boolean; saving?: boolean; catalog: ProfileCatalog; home: string;
  onChange(patch: Partial<StudentValues>): void; onContinue(): void; onBack(): void; onSave(): void;
  onSignOut(): void; onRetry?(): void;
};
type CompanyOnboardingViewProps = /* unchanged */;
type StudentProfileViewProps = {
  state: LoadState; profile?: StudentProfile; email?: string /* not shown */; catalog: ProfileCatalog;
  routes: { edit: string /* Add buttons append #city|about|gpa|projects|languages|contacts */ }; onRetry?(): void;
};
type StudentProfileEditViewProps = {
  state: LoadState; values: StudentValues; dirty: boolean; errors?: StudentErrors; formAlert?: ProfileFormAlert;
  saving?: boolean; leaveOpen?: boolean; catalog: ProfileCatalog; routes: { profile: string };
  onChange; onSave; onDiscard; onLeaveCancel; onLeaveConfirm; onLoadLatest?; onRetry?;
};
type CompanyProfileViewProps = /* unchanged */;
```
Removed in round 13: `currentYear` (all student views), `cities` on `StudentProfileViewProps` (now `catalog`),
`graduationYear`, `graduationOptions`, `graduationPhrase`, `majorHeadline`. The page owns `step` and the focus moves
(h1 on step change, first invalid control on refusal, `#section` on arrival) — see `src/prototypes/003-profiles.tsx`.

## 5. Open questions

- University list review: the 83-entry list is compiled from public sources, not the accreditation registry. Who curates it?
- ~~Kit Combobox gaps 1–4~~ — closed (round 4a). Since design QA the list opens on a click, typing or ArrowDown, never on focus alone (an error focus after a refused Continue must not open it).
- Required SelectFields on the edit forms show the error message, but the select button gets no red edge (kit behaviour).
- ~~Kit Combobox `multiple` + `max` drops focus on the last pick~~ — fixed in the kit (input stays focusable, read-only at the max).
- ~~Should "Looking for" sit above About?~~ — yes (owner, approval): Looking for comes right after the identity row.
- ~~GPA scale~~ — 4.0 only for now (owner, approval).
- ~~"Open to any field · Still exploring" wording~~ — kept (owner, approval).

## 6. Revision log

| Round | Date | Feedback (user) | Changes made |
|---|---|---|---|
| 1 | 2026-11-22 | — (first review) | — |
| 2 | 2026-11-22 | Onboarding as one form "puts people off"; wants step by step, more interactive, ready-made answers | S1 and S4 rebuilt as 5-step wizards (one question per step, Stepper, Back / Continue / Save); answers as Radio grids with typed "Other"; welcome line on step 1; starter prompts for the optional texts; optional steps can be left empty. Edit forms (S3, S5): University / Major now Combobox with the same lists, Year of study / Graduation year now SelectFields. Validation messages for pickers ("Choose …"). ChoiceCard proposed (not built). |
| 3 | 2026-11-22 | "Pick the best option yourself" (coordinator decided): use the new ChoiceCard, real names in the account menu, land on the profile, no repeated education line | Onboarding answers → `ChoiceCardGroup` (universities md + city, industries md + icons, majors / years / graduation / sizes / cities sm, legends hidden under the step h1); friendlier subs ("Nice to meet you, {name}", "Thanks, {company}", "Almost done", "Last one"). Account menu: fake setup progress removed, names from the profile queries (spec for the builder). Student lands on `next` or `/app/profile`. S2: the avatar + "{Major} / {year} · graduating" row removed from the card (education stays under the name and in Education). |
| 4 | 2026-11-22 | University cards feel discriminating ("popular" schools ranked above others, "Another university" second-class); wants a searchable dropdown | Step 2 → `UniversityField` (kit Combobox, single, typeahead) over a neutral A–Z list of 83 Kazakhstan universities with city; unlisted names offered in the same list and saved as typed (2–120); city shown under the field. Step 3 → `MajorField` (Combobox, 45 majors A–Z) for the same neutrality reason. S3 uses the same two fields. Lists in `features/profiles/universities.ts` (frontend constant, catalog later). Kit Combobox gaps reported (option descriptions, alias matching, "Use" label, 50 cap, clearing). |
| 4a | 2026-11-22 | Combobox gaps from round 4 handed to design-architect ("come up with something") | Kit Combobox extended (object options with description + keywords, ranked alias search, `createLabel`, no 50 cap, opt-in `clearable`); University shows the city per option and finds KBTU / NU / ENU / KazNU / AITU / SDU / IITU; create option reads "Use “…”"; University and Major can be emptied on Edit profile. Screens re-snapped: `onboarding.university-search.*` (typed "kbtu"), `onboarding.university-new.mobile`. QA fix: the University / Major list is in the page flow (`inFlow`) and no longer covers Continue. |
| 5 | 2026-11-22 | "I don't like the Year page… one of them is enough" (year of study + graduation year; 6 years vs a 4-year Bachelor's) | Year of study removed everywhere (model, validation, mocks, S1 step, S3 form, S2 page). Step 4 "Graduation" asks one question: 8 sm tiles for every allowed year (current − 1 … + 6), "2025 · graduated" / "2026 · this year", no typed Other; error "Choose when you expect to graduate". S3: one SelectField of the same years. S2: "graduating in 2027" under the name, "Graduating in 2027" / "Graduated in 2025" in Education (new prop `currentYear`). Prototype states year → graduation, year-error → graduation-error. |
| 6 | 2026-11-23 | "I don't like the profile design — redo it" (+ coordinator critique: no identity, misaligned Edit, unstructured text, noisy aside, empty page) | S2 rebuilt in two variants with the same props: A "Refined detail" (identity in the card, Edit aligned with the h1, About / Education sections, education entry, honest checklist aside) and B "Identity band" (band with avatar + h1 + facts + Edit on the tray footer, About / Education cards, full-width checklist). Shared: empty-about prompt, education entry with university city, checklist n of 3 + "Coming soon" CV / skills (inert), privacy line; sign-in email removed. Recommendation: A. |
| 7 | 2026-11-23 | Owner picked A ("refine A to the max"), B rejected; coordinator visual QA (facts repeated, education hierarchy, checklist padding, Soon tags / icon alignment, polish) | B deleted (view, prototype screen, `?variant`, screenshots). A refined: each fact once (identity = "{Major} student" + city; Education = university + "{city} · Graduating in {year}"); education entry = one title + one meta, 40 = tile; checklist counts only City / About me ("n of 2 added", missing rows with Add) or one line "Profile complete"; Coming soon without tags, icons top-aligned, short texts; "Updated …" on the owner panel footer, privacy on its header; spacing verified with getBoundingClientRect. |
| 8 | 2026-11-23 | "Something about it I don't like, especially in minimal: the way you add information like the city" (two entry points per fact, every Add a detour to the full form, settings-list look) | Missing city / about are added in place and saved instantly: "+ Add your city" slot in the identity line → city picker (Modal + onboarding ChoiceCards, Save city); empty About → starters / "Write your own" → inline composer (Cancel / Save, Esc, Ctrl+Enter). Toast "Saved" with Undo. Inline saving / error / 409 conflict states keep the value. Panel lost its Add rows (one entry point per fact): "n of 2 added" + one hint line, or "Profile complete". New props: `edit`, `onEditStart/Change/Cancel/Save`, `onLoadLatest`. API note: inline save = full PUT + version. |
| 9 (fresh critique) | 2026-11-23 | "I don't like default or minimal; the current one is not good" — a fresh designer re-examined the page instead of patching it | Diagnosis: the page had no job (an echo of onboarding wrapped in three containers), the aside was all filler (2-field completeness, "Coming soon", date, privacy line: 32 % of the width, 0 working controls, +38 % scroll on mobile), the name was demoted under a generic "My profile" h1, an avatar and an Education "section" dressed six facts as a LinkedIn clone, and missing facts were added through bespoke widgets (dashed slot → modal → Save city; prompt + 4 buttons → composer with 6 controls). S2 rebuilt: Detail (own profile) in its no-aside layout, container `content`; h1 = the student's name; one Tray (header = "Only you can see your profile for now") with a 2 × 2 facts sheet (University + its city · Major · Expected graduation · City) and About. A missing fact is filled where its value goes with the edit form's own control: City `SelectField` saves on pick (toast + Undo), About `TextareaField` drafts with Discard / Save. Removed: aside, checklist, coming-soon list, updated date, avatar, education tile, city modal, starter chips. States: city-picker / about-editing → `no-city`, `no-about`, `about-draft` (+ the rest kept). Props: `onEditStart/Change/Cancel/Save` → `onAboutChange`, `onAboutDiscard`, `onAboutSave`, `onCityPick`. CV (next sprint) = a second Tray below, not shown before it works. DS: templates.md (own profile without owner tools), patterns.md §17 (fill an empty value in place). |
| 10: two columns restored | 2026-11-23 | "Bring back how it was. Keep the idea of 2 visual blocks, left and right; just fix the issues" | Two blocks back: `TwoColumn` end 360 sticky (panel after the card below 1024), container `page`. Left Card = round 9's profile (h1 = name, no avatar, facts sheet University + its city · Major · Graduation · City, About; empty City / About filled in place, §17). Right owner panel rebuilt with only true, useful content and no buttons: "Private" tile block (who can see the profile; the CV block of US-14 takes the same shape under it), "Optional details" City / About with Added · Empty · Saving… (no score, no "Profile complete"), one hint line, footer "Updated {date}". No tray header, so card and panel start on one line. Removed for good: "Coming soon" CV / Skills, "n of 2 added", Add rows / slot / modal / starter chips. New icon `pending` (CircleDashed). Props unchanged from round 9. templates.md note reworded (owner panel holds only real tools; empty aside contents forbidden, not the aside). |
| 11 | 2026-11-23 | Owner: "Bring it back as it was" — meaning round 8 (rounds 9 and 10 rejected) | S2 restored exactly to round 8: initials avatar + name, "{Major} student · city" or the "+ Add your city" slot, About with starters / composer, Education entry with its tile; owner panel with privacy header, "Complete your profile · n of 2 added" + hint or "Profile complete", Coming soon (CV, Skills), "Updated …" footer; city picker modal ("Save city"); toast "Saved" + Undo. States and props as in round 8 (`edit`, `onEditStart/Change/Cancel/Save`, `onLoadLatest`). Removed round 9/10 additions: facts sheet, "Private" panel, inline select / textarea, `pending` icon, the templates.md own-profile note; patterns.md §17 reworded to the round 8 in-place-add pattern. |
| 12 | 2026-11-23 | Owner: "Back to round 7: where Education still has its icon, About has no prompts, and adding the city sits in the right block" | S2 restored to round 7: card = initials avatar + name, "{Major} student · city", About (empty → gentle prompt + "+ Write about yourself" → Edit profile), Education entry with its tile; owner panel = privacy header, "Complete your profile · n of 2 added" with City / About me rows and their "Add" buttons → Edit profile, or "Profile complete"; Coming soon (CV, Skills); "Updated …" footer. Removed: "+ Add your city" slot, city picker modal, inline About composer, inline-save states and props (`edit`, `onEditStart/Change/Cancel/Save`, `onLoadLatest`), `InlineEdit` types. States: default, minimal, loading, error. patterns.md §17 removed (the page no longer adds values in place). |
| 13 | 2026-11-23 | 13: degree, year of study, GPA, looking for, projects, languages, contacts (owner) | Model: degree (College (TVE) / Bachelor's / Master's / Doctoral (PhD) / Residency) with max years 4/6/2/3/4, year of study or "Graduated" (graduation year removed everywhere), GPA 0.00–4.00, looking for (1–3 vacancy fields + ≥ 1 position type), projects / languages (≤ 10 each) and contacts; validation mirrors FR-003; `toStudentIn`, `studentErrorKey`. S1: steps Name · University (+ degree tiles) · Major (+ year tiles of the degree) · Looking for (checkbox tiles, max 3) · About. S2 (round 7 layout kept): headline "{Major} · {Degree}, {n} year" instead of "{Major} student"; new Looking for entry (icon tile); GPA right of the university; Projects, Languages \| Contacts sections when filled; panel "n of 6 added" with Add → `edit#section`, and no completeness block at all when everything is filled. S3: Studies (Degree \| Year of study, GPA), Looking for, Projects and Languages rows (add / remove, focus handled), Contacts. States: onboarding major-error, looking-for(-max/-error) (graduation states removed); profile partial; edit states re-made with rows. |
| 14 | 2026-11-23 | Owner: "6 years of a Bachelor's can't be"; "Tab doesn't select in the dropdown"; "What is 'Data'? … guide people who don't know what they want to become"; "Contacts and languages shouldn't be together; give contacts icons so it's clear they're clickable" | Bachelor's 1–4 (+ Graduated) everywhere. Tab: kit Combobox fix re-checked (University, Major, Language accept on Tab). Fields refined to 12 with one-line descriptions (table above; 002 builder note); step 4 rebuilt: "What would you like to work on?", "I'm not sure yet" card first (mutually exclusive with the fields), 12 md cards with descriptions in 2 columns, position types sm in one row; profile shows "Open to any field · Still exploring"; Edit profile: field options with descriptions + "I'm not sure yet" checkbox. Profile: Languages and Contacts separate full-width sections; contacts = icon + link (hover, focus, tel: / t.me / new tab with an accessible cue), project links get the same cue. New icons `telegram`, `linkedin`, `github`, `website`. States: + onboarding `looking-for-exploring`; profile `minimal` is now exploring. |
| 15 | 2026-11-23 | Owner: "If a person picks 'I'm not sure yet' they still have to scroll past the list to Position type and Continue"; "Contacts should be one visual block, not two; add WhatsApp; real logos (GitHub, Telegram, WhatsApp, LinkedIn)" | Step 4 restructured: Position type first, then "Do you know which field you want?" (I know which field / I'm not sure yet, radio cards, nothing preselected); the 12 fields only after "I know" (fields kept in memory when switching); live-region cue; new errors "Choose one: I know which field, or I'm not sure yet" / "Pick at least one field, or choose I'm not sure yet"; model `exploring` → `fieldChoice`. States `looking-for` (nothing chosen), `looking-for-exploring`, `looking-for-fields`, `looking-for-max`, `looking-for-error`. S3: Position type first; the "I'm not sure yet" checkbox kept (justified) and now keeps fields in memory. Contacts: one bordered list, row = brand logo · label · value · external cue, whole row the link; WhatsApp added (model, edit, mocks, validation = phone, wa.me link; still one "Contacts" item in the panel). `BrandIcon` (Simple Icons CC0 GitHub / Telegram / WhatsApp, LinkedIn "in" bug) + `--color-brand-*` tokens [novio]; foundations.md § 6 documents the exception; round 14's Lucide stand-ins removed. |
| 16 | 2026-11-23 | Approved; owner accepted: Looking for above About, GPA 4.0 only, exploring wording kept | S2 section order: identity · Looking for · About · Education · Projects · Languages · Contacts. Kit Combobox max-focus bug fixed. Screens `profile.*` order change applies on the next snap (design QA). |
| 16a | 2026-11-23 | Design QA (fixes, no design change) | Combobox opens on pointer / typing / ArrowDown, not on focus; S2 skeleton in the round 16 order; ChoiceCard titles top-aligned across a row; company-onboarding screenshots re-snapped with the current Stepper; profile.* re-snapped with Looking for above About. |

## 7. Approval

- Approved by the product owner on: 2026-11-23 (in chat: "да"), with the coordinator's recommendations accepted:
  Looking for above About, GPA on the 4.0 scale only, "Open to any field · Still exploring" kept.
- Approved screenshots: `design/screens/` (`<screen>.<state>.<desktop|mobile|1024>.png`)
