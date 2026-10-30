# Novio — information architecture

Status: **approved** · 2026-10-30. Page archetypes (right column) are defined in `templates/`.

## Roles

| Role | Who | Goal |
|---|---|---|
| Guest | not signed in | understand Novio, browse public vacancies, sign up |
| Student | university student / recent graduate | build a skill profile, find matching internships/jobs, apply, track applications |
| Employer | recruiter / team member of a company | describe the company, post vacancies, review applicants ranked by skill match, move them through a pipeline |

One account has one role, chosen at sign-up. Employers belong to a company (several recruiters per company later; MVP = one).

## Sitemap

### Public (guest)
| Route | Page | Archetype |
|---|---|---|
| `/` | Landing (for students, link "For employers") | Landing |
| `/employers` | Landing for employers | Landing |
| `/vacancies` | Public vacancy search (apply → sign up) | Browse |
| `/vacancies/:id` | Vacancy detail | Detail |
| `/companies/:id` | Company page | Detail |
| `/sign-up` | Choose role → email + password | Auth |
| `/sign-up/verify` | 6-digit email code (affect otp-input) | Auth |
| `/sign-in` | Email + password | Auth |
| `/reset-password` | Request + set new password | Auth |

### Student (`/app/…` after sign-in)
| Route | Page | Archetype |
|---|---|---|
| `/onboarding` | University → skills → preferences → CV (skippable steps) | Wizard |
| `/app` | Home: profile completeness, recommended matches, application updates | Dashboard |
| `/app/vacancies` | Search & filters, sorted by match | Browse |
| `/app/vacancies/:id` | Vacancy + "your match" breakdown (matched / missing skills) + Apply | Detail |
| `/app/applications` | My applications by status (Applied → Viewed → Interview → Offer / Rejected) | Tracker |
| `/app/saved` | Saved vacancies | Browse |
| `/app/profile` | My profile as employers see it | Detail |
| `/app/profile/edit` | Edit profile: about, education, skills, projects, experience, languages, CV | Form |
| `/app/settings` | Account (sign-in email read-only, password), notifications, privacy, delete account | Settings |

### Employer (`/company/…` after sign-in)
| Route | Page | Archetype |
|---|---|---|
| `/company/onboarding` | Company basics → first vacancy (skippable) | Wizard |
| `/company` | Home: open vacancies, new applicants, pipeline summary | Dashboard |
| `/company/vacancies` | My vacancies (draft / open / paused / closed — see Vacancy lifecycle) | Browse (table) |
| `/company/vacancies/new` | Post a vacancy: basics → skills (Required / Nice to have) → details → preview | Wizard |
| `/company/vacancies/:id/edit` | Edit vacancy | Form |
| `/company/vacancies/:id` | Applicants pipeline for one vacancy (New → Shortlisted → Interview → Offer → Hired / Rejected) | Tracker |
| `/company/candidates/:id` | Candidate profile + match breakdown against the vacancy + status actions | Detail |
| `/company/profile` | Company profile edit (logo, about, links, locations) | Form |
| `/company/settings` | Account, team (later), notifications | Settings |

## Vacancy lifecycle (employer)

Every vacancy has one status. HR changes it from the vacancy's "⋯" menu (in `/company/vacancies` and on
`/company/vacancies/:id`); every change shows a toast, closing asks for confirmation.

| Status | Students see it in search | Takes new applications | Moves to |
|---|---|---|---|
| **Draft** | no | no | Open ("Publish": needs all required fields and a deadline in the future) |
| **Open** | yes | yes | Paused ("Pause") · Closed ("Close vacancy", any time before the deadline) · Closed automatically when the deadline passes |
| **Paused** | no | no | Open ("Resume", deadline unchanged) · Closed ("Close vacancy") · Closed automatically when the deadline passes |
| **Closed** | no | no | Open ("Reopen": asks for a new deadline in the future) |

- **Applicants are never touched by a status change.** HR keeps working the pipeline (Shortlist, Interview, Offer,
  Reject) in every status; reopening keeps the same pipeline and new applications join it.
- **Students who saved or applied** can still open a Paused or Closed vacancy: Paused shows "Not accepting applications
  right now", Closed shows "This vacancy is closed" (greyed card with a "Closed" tag in Saved). Their application status
  does not change.
- Editing is allowed in every status; editing an Open vacancy keeps it Open.
- Draft can be deleted; Open / Paused / Closed cannot (they have applicants or a public history) — close instead.

## Navigation model

- **Signed-in app shell:** top header (logo · primary nav · search (student) · notifications · profile menu).
  Desktop ≥ 1024px: nav items inline in the header. Below: header shows logo + menu button → sheet with the nav.
- **Student primary nav:** Home · Vacancies · Applications · Saved. Profile, Settings, Log out live in the profile menu (affect profile-menu, with profile-setup progress).
- **Employer primary nav:** Home · Vacancies. Company profile, Settings, Log out in the profile menu.
  Applicants are reached through a vacancy (no cross-vacancy Candidates section in MVP).
- **Public header:** logo · Vacancies · For employers · Sign in · Sign up (primary).
- No sidebar in MVP — the app is shallow (≤ 5 sections per role); a sidebar is reserved for later depth.

## Core flows

1. **Student sign-up:** `/sign-up` (role: Student) → `/sign-up/verify` → `/onboarding` (4 steps) → `/app` with first matches.
2. **Apply:** `/app/vacancies` → card → `/app/vacancies/:id` (match breakdown) → Apply (modal: CV + optional note) → toast + status "Applied" in `/app/applications`.
3. **Employer sign-up:** `/sign-up` (role: Employer) → verify → `/company/onboarding` → `/company/vacancies/new`.
4. **Review applicants:** `/company/vacancies/:id` → candidate card (match %) → `/company/candidates/:id` → Shortlist / Invite to interview / Reject.

## Matching vocabulary (shared by both sides)

- **Match score** 0–100%, shown as a % with a 3-bar signal (affect smart-recommendation): ≥ 75 Strong · 50–74 Good · < 50 Partial.
- **Skills have no levels.** Students list skills; employers mark each vacancy skill **Required** or **Nice to have**.
- **Score:** required skills carry most of the weight, nice-to-have add less (exact formula is a backend decision).
- **Skill states** on a vacancy: matched ✓ (success tint) · missing required (hairline, ink text) · missing nice-to-have (hairline, muted text).
- **Breakdown copy:** "Required 3 of 4 · Nice to have 1 of 3" + the most valuable missing skill as a hint.
- Students see "your match"; employers see "candidate match". Same component, different copy.

## Out of scope for MVP (decided)

- **No in-app messaging.** Employer → student communication = status change (+ interview date/time/link on "Interview") shown in the student's Applications **and** sent by email. Further talk happens over email.
- **No cross-vacancy Candidates section** for employers.
- **No skill levels.**
- One account = one role (Student or Employer), chosen at sign-up. One recruiter per company.
