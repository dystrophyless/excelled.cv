# UI spec: Landing page and role choice

**Feature**: `005-landing-role-choice` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Status**: Approved (2026-11-24)
**Designer**: ui-designer · **Prototype**: `/prototypes/005-landing-role-choice`

## 1. Screens

| # | Screen | Route | Role / layout | Archetype | Reference template | User stories |
|---|---|---|---|---|---|---|
| S1 | Landing | `/` | Public / `PublicLayout variant="landing"` | Landing | `/styleguide/templates/landing` | US1 |
| S2 | Choose role (sign-up step 1) | `/sign-up` (no role in router state) | Public / none | Auth | `/styleguide/templates/auth` | US2 |
| S3 | Account details (sign-up step 2, 001 S2 without the role switch) | `/sign-up` (role in router state) | Public / none | Auth | `/styleguide/templates/auth` | US2 (AS 5, 6) |

Prototype addresses: `/prototypes/005-landing-role-choice/landing`, `/choose-role`, `/account-details`. The three are linked:
S1 "Create account" → S2 → Continue → S3 → "Change role" → S2 (role and email kept) → S3; "Log in" → 001 sign-in prototype; S3 submit → 001 verify prototype.

## 2. Screen details

### S1 — Landing

**Goal**: A visitor learns what Novio is, whom it serves and what it does, and can create an account or log in in one click.

**Layout**
```
PublicLayout variant="landing": header = logo · [ghost sm "Log in"] [primary sm "Create account"]  (no nav, no menu button; same on mobile)
GridBackground hero → Container: 2 columns ≥1024 (text | preview), 1 column below
  text: Tag accent · h1 · one sentence · [primary lg "Create account" + arrowRight] [secondary lg "For HR representatives" (scrolls to #hr and focuses its heading)]
  preview (aria-hidden, inert): back Card with two rows (Vacancy, Research) above a front Tray (Internship) with MatchScore lg + SkillBreakdown, footer "Sample opportunity"; all three types visible at every width (mobile: stacked, no overlap)
section#students: Tag success · h2 · lead · Grid min 300 of 3 Cards (icon tile · 01/02/03 · h3 · text · hairline · sample illustration)
Tray lg #hr: Tag violet · h2 · lead · secondary "Create account" | Card padding sm with company row + 3 opportunity rows (Open / Draft / Closed tags)
closing CTA: h2 · lead · primary lg "Create account" · "Already have an account? Log in"
footer: brand + statement · "Learn more" (#students, #hr) · "Account" (Create account, Log in) · © 2026 Novio
```
Differences from the reference template (invented parts removed): no trust line, no company logo strip, no numbers strip, no
Apply / tracking feature rows, no Terms / Privacy / Vacancies / Employers links. The template's two alternating feature rows are
replaced by three capability cards (profile, opportunities, matching) because only these exist.

**Copy** (exact)
| Element | Text |
|---|---|
| Header | Log in · Create account |
| Hero tag | For students and HR representatives |
| h1 | Students and employers, connected by skills |
| Hero sentence | Novio connects students with internships, vacancies, research opportunities and employers. |
| Hero buttons | Create account · For HR representatives |
| Preview footer | Sample opportunity |
| Sample type labels | Internship · Vacancy · Research (the kinds of the student's Opportunities filter: Internships · Vacancies · Research) |
| Students tag / h2 / lead | For students · Build a profile, find what fits · Tell Novio what you can do, then look through the opportunities employers publish. |
| Card 01 | Create your profile — Keep your education, skills, projects and languages in one place, and update them as you learn. Sample: avatar, name, education, languages, a project, skill chips. |
| Card 02 | Find opportunities — Search internships, vacancies and research opportunities, and filter them by type, format, city and field. Sample: search field "Python" + three rows, one per type. |
| Card 03 | See your match — Every opportunity shows how well your skills fit what it asks for, and which skills you are missing. Sample: match score + full skill breakdown with the hint. |
| HR tag / h2 | For HR representatives · Publish opportunities and present your company |
| HR lead | Create a company profile, then post internships, vacancies and research opportunities. List the skills each one needs, so students see how well they match. Edit an opportunity any time and close it when it is filled. |
| HR button | Create account |
| CTA h2 / lead | Start by choosing your role · Pick Student or HR Representative, then add your email and a password. |
| CTA button / link line | Create account · Already have an account? Log in |
| Footer | Novio · Connects students with internships, vacancies, research opportunities and employers. · Learn more: For students, For HR representatives · Account: Create account, Log in · © 2026 Novio |

Sample content uses fictional names only (Aida Sarsen, Northwind Labs, Birchwood Analytics, Lumen Institute); sample titles are short (Backend Intern, Junior Data Analyst, Research Assistant) so nothing truncates at 360; no figures except the sample match scores inside the aria-hidden illustrations.

**States**
| State | What the user sees | Trigger in the real page |
|---|---|---|
| default (only state) | the page above; no data, so no loading / empty / error | always; the session check never hides it (research R3); signed-in users are redirected |

**Interactions**: "Create account" (header, hero, HR, CTA, footer) → `/sign-up`, never with a role. "Log in" (header, CTA, footer) → `/sign-in`.
"For HR representatives" (hero) and the footer anchors scroll to `#hr` / `#students`: smooth scroll, or an instant jump under `prefers-reduced-motion: reduce`; focus moves to the section heading (`h2` with `tabIndex=-1`, `preventScroll`), so the next Tab continues inside the section; the address gets `#hr` / `#students`; sections clear the 60 px sticky header.
Buttons use the existing kit `Button` + `navigate` (like the current public header); footer links are real `<a>` / `Link`.
Keyboard: Tab order = header, hero, cards (illustrations are inert), HR, CTA, footer.

**Responsive**: 1440 hero 2 columns; ≥1024 same; 390 hero stacks, preview shows both cards stacked, secondary hero button wraps under the primary,
capability cards stack, HR tray stacks with tighter padding (rows never truncate at 390 or 360), h2 drops from 32 to 24 px below 768. Header keeps Log in + Create account at 390 (no menu).

**Test hooks**: `getByRole("button", { name: "Create account" })` (several: use `.first()` for the header or scope by region), `getByRole("button", { name: "Log in" })`,
`getByRole("heading", { level: 1 })`, `data-testid="capability"` (3), anchors `#students`, `#hr`.

### S2 — Choose role

**Goal**: Deliberately choose Student or HR Representative before entering account details.

**Layout** (Auth template, column 400): logo · h1 "Choose your role" · muted subtitle · `Tray padding=lg` { `form` { `ChoiceCardGroup` (md, 2 cards, 1 column, icon tiles, hidden legend "Your role") · primary lg "Continue" } , footer "Already have an account? Log in" }.
Nothing preselected. Cards: **Student** (icon education) "Find internships, vacancies and research opportunities that fit your skills" · **HR Representative** (icon company) "Publish opportunities and present your company to students". Step is shown as plain text ("Step 1 of 2"), no stepper (nothing in the kit fits a 2-step auth page; avoids a new style).

**Copy**
| Element | Text |
|---|---|
| Title / subtitle | Choose your role · Step 1 of 2 · You can't change your role after signing up |
| Button | Continue |
| Error (under the cards, red edge on both) | Select a role to continue |
| Footer | Already have an account? Log in |

**States**
| State (`?state=`) | What the user sees | Trigger |
|---|---|---|
| default | no card selected | step opened |
| selected | one card with ink edge + filled dot (select to see it) | user selects; selecting the other moves the selection |
| error | message + red edges on both cards | Continue without a role (prototype opens it with `?state=error`) |
| returned | the role previously chosen is selected | "Change role" from S3 (`role` prop; never a default) |

**Interactions**: Continue without a role stays, shows the error (`role="alert"`, fieldset `aria-describedby`, inputs `aria-invalid`) and moves focus to the first radio. Selecting a role clears the error. Arrow keys move between radios (native). Continue with a role → S3. Two actions: select, continue.
The group is a native radio group in a fieldset with a legend (kit `ChoiceCardGroup`), which is what screen readers announce as a radio group.

**Responsive**: identical at 390 and 1440 (single column).
**Test hooks**: `getByRole("radio", { name: "Student" })`, `getByRole("radio", { name: "HR Representative" })`, `getByRole("button", { name: "Continue" })`, `getByRole("alert")`, `data-testid="role-choices"`.

### S3 — Account details

**Goal**: Enter email and password for the chosen role, or go back and change the role.

**Layout**: 001 S2 unchanged except the role switch (SegmentedControl "I'm a student / I'm hiring") is replaced by a `roleRow`: muted "Signing up as" + bold role name, secondary sm button "Change role". Subtitle "Step 2 of 2 · Add your email and a password". Placeholder / hint per role as in 001 (HR: `you@company.com`, "Use your work email"). The one primary stays "Create account".

**Copy**: unchanged from 001 S2 except: sign-in link text "Log in" (was "Sign in"), subtitle, "Signing up as", "Change role"; the legal line "By creating an account you agree to the Terms and Privacy Policy." is removed (no such pages).

**States** (all 001 S2 states kept)
| State (`?state=`) | What the user sees |
|---|---|
| default | Student, empty fields |
| hr | HR Representative in the row, work-email placeholder and hint |
| submitting | email kept, "Create account" loading |
| email-taken | warning Alert "An account with this email already exists" (Log in · reset your password), email field invalid |
| field-errors | error Alert "Fix 2 fields to continue" + both field errors |
| server-error | error Alert "Couldn't create your account" |

**Interactions**: "Change role" → S2 with the role selected and the typed email kept (password is not kept). Submit as in 001.
**Responsive**: as 001. **Test hooks**: `getByTestId("chosen-role")`, `getByRole("button", { name: "Change role" })`, labels Email / Password.

## 3. Components

- Existing: `PublicLayout`, `GridBackground`, `Tag`, `Button`, `Card`, `Tray`, `Container`, `Grid`, `Stack`, `Cluster`, `Avatar`, `VacancyCard`, `MatchScore`, `SkillBreakdown`, `SkillMatchRow`, `SkillChip`, `ChoiceCardGroup`, `TextField`, `PasswordField`, `Alert`, `TextLink`, `AuthFrame`.
- **New components**: none. Backward-compatible additions to shared code:
  - `PublicLayout` gets optional `variant="landing"` (+ `homeTo`, `signInTo`, `signUpTo`); default variant is unchanged (still "Sign in" / "Sign up" + demo nav) until the implementation switches over.
  - `AppShell` renders no `<nav>` for an empty `nav` and hides the menu button for `nav.length <= 1` (was `=== 1`); an empty nav was not used before.
  - `AuthFrame` gets optional `home` (logo link).
- Local CSS only for the landing (copied values of the template's landing classes) and `.roleRow` in `auth.module.css`; tokens only.

## 4. Data contract for views

```ts
type LandingViewProps = { routes?: { signUp: string; signIn: string; home?: string } };            // defaults "/sign-up", "/sign-in", "/"
type RoleStepViewProps = { state: "default" | "error"; role?: SignUpRole; onContinue?: (role: SignUpRole) => void; routes?; home? };
type AccountDetailsViewProps = { state: SignUpState; role: SignUpRole; email?: string; errors?: { email?: string; password?: string };
  onSubmit?: (v: { email: string; password: string }) => void; onChangeRole?: (email: string) => void; routes?; home? };
```
`SignUpRole` is `"student" | "employer"` (API value); labels "Student" / "HR Representative" come from `features/auth/views/roles.ts`.

**What implementation replaces**: `SignUpPage` renders `RoleStepView` or `AccountDetailsView` from router state `{ role, email }` (research R1) instead of `SignUpView`; `SignUpView` (role switch) is then removed. `PublicLayout` default variant and its demo nav are removed; `/` renders `LandingView` (`variant="landing"` becomes the only variant). Other auth screens follow §5a.

## 5. Open questions

None. Resolved at approval: samples keep "Internship", "Vacancy", "Research" (the student filter); the real tags Full-time / Part-time stay. The hero button "For HR representatives" stays.

## 5a. Wording: "Log in" / "Create account" for implementation

New views already use it. Implementation changes these existing 001 texts (views stay untouched in the design phase) and the e2e selectors that use them (14 occurrences of "Sign in" / "Sign up" in `frontend/e2e`):

| Where | Now | Replace with |
|---|---|---|
| `SignInView` subtitle | Sign in to see your matches | Log in to continue |
| `SignInView` form aria-label | Sign in | Log in |
| `SignInView` submit button | Sign in | Log in |
| `SignInView` locked alert | Sign-in is paused for {timer}. Reset your password to sign in now. | Logging in is paused for {timer}. Reset your password to log in now. |
| `SignInView` server error title | Couldn't sign in | Couldn't log in |
| `SignInView` footer | No account? Sign up | No account? Create account |
| `SignUpView` (removed, replaced by `AccountDetailsView`) | footer "Sign in"; alert link "Sign in"; form aria-label "Sign up" | already "Log in" / "Account details" |
| `ResetRequestView`, `ResetVerifyView`, `ResetConfirmView` footer | Remembered it? Sign in | Remembered it? Log in |
| `ResetConfirmView` success subtitle | You're signed in with your new password | You're logged in with your new password |
| `ResetConfirmView` success alert | Other devices were signed out. | Other devices were logged out. |
| `VerifyEmailView` footer (terminal states) | Already verified? Sign in | Already verified? Log in |
| `VerifyEmailView` subtitles | We cancelled this sign-up. Your email is saved. / This sign-up expired or was cancelled. | We cancelled this registration. Your email is saved. / This registration expired or was cancelled. |
| Default `PublicLayout` header and sheet | Sign in · Sign up | removed with the default variant; the landing header has Log in · Create account |
| Account menu | Log out | unchanged |
| Toasts | none in auth | — |
| Route / code names (`/sign-in`, `/sign-up`, `signIn`) | — | unchanged |

Also for implementation: `AuthFrame` wraps its content in `<main id="main">` (the 001 auth frame has none; axe reports `landmark-one-main` and `region` on S2 and S3 in the prototype; the landing, which uses the app shell's `<main>`, is clean).

## 6. Revision log

| Round | Date | Feedback (user) | Changes made |
|---|---|---|---|
| 1 | 2026-11-24 | — (first review) | — |
| 2 | 2026-11-24 | Fix and do everything recommended (owner) | Samples show Internship, Vacancy and Research (hero, Find opportunities, HR block); HR rows use those labels and shorter titles; tighter HR padding on mobile, no truncation at 390 / 360; profile and match cards balanced (project line; full breakdown + hint); "Log in" / "Create account" wording listed in §5a; Terms line removed from S3; hero HR button respects reduced motion and focuses the HR heading; `<main>` landmark recorded for implementation |

## 7. Approval

- Approved by the product owner on: 2026-11-24 (round 2)
- Approved screenshots: `design/screens/` (screen × state × desktop/mobile)
