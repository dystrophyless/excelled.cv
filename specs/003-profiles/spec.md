# Feature Specification: Student and company profiles

**Feature Branch**: `003-profiles`

**Created**: 2026-11-22

**Status**: Draft

**Input**: Product backlog (iteration 2): US-05 Create Student Profile, US-06 Create HR Profile, US-07 Edit Profile —
"A student adds their academic profile and basic information so the platform can understand their background and use it
for future matching. An HR representative adds basic company information so students can identify the organization.
Both can edit their profile later." The backlog's QA sheets (US5QATest, US6QATest, US7QATest) are the acceptance tests.

## Backlog traceability

| Backlog item | Covered by |
|---|---|
| US-05 Create Student Profile (+ US5QATest) | User Story 1, FR-001…FR-006, FR-013 |
| US-06 Create HR Profile (+ US6QATest) | User Story 2, FR-007…FR-010, FR-013 |
| US-07 Edit Profile (+ US7QATest) | User Story 3, FR-011, FR-012 |
| US-08 / US-11 pre-requirement "has an HR / student profile" | FR-014, FR-015 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Student creates their profile (Priority: P1)

A student who has just verified their email is taken to the first onboarding step. They enter their full name, where and what
they study — university, degree, major and year of study — and what they are looking for (fields of work and type of
position), plus, optionally, their city and a few sentences about themselves, and press "Save". Later, on their profile
page, they can add a GPA, projects, languages and contacts. The profile is saved to their account and they can see it on their
profile page.

**Why this priority**: Matching, the opportunity list (US-11 needs "has a student profile"), CV upload (US-14) and every
later student feature build on it.

**Independent Test**: A new student account can fill the form, save, and see the same data on `My profile`; with an
empty required field nothing is saved and the error is shown.

**Acceptance Scenarios** (US5QATest):

1. **Given** a logged-in student without a profile on the create-profile page, **When** they enter valid basic and
   academic information and click "Save", **Then** the profile is saved to their account **and** they can view the
   completed profile on the platform.
2. **Given** the create-profile page, **When** they leave required fields empty or enter invalid academic data (for
   example a 4th year in a Master's programme) and click "Save", **Then** the profile is not saved
   **and** a validation message names each field to fix, keeping everything they typed.
3. **Given** a logged-in student without a profile, **When** they open any other student page, **Then** they are taken
   to the create-profile page first and, after saving, to the page they asked for (their profile page by default, so they
   see what they saved).
4. **Given** a student who already has a profile, **When** they open the create-profile page, **Then** they are taken to
   their profile page (one profile per account).

---

### User Story 2 - Employer creates the company profile (Priority: P1)

An HR representative who has just verified their email is taken to the company step. They enter the company name,
industry and size, and optionally the website, city and a short description, and press "Save". The company profile is
saved to their account and shown on their company profile page; from then on they can post opportunities.

**Why this priority**: US-08 (post an opportunity) requires an HR profile; students identify the organization by it.

**Independent Test**: A new employer can save the company profile and then open "New vacancy"; without a profile the
vacancy pages send them to the company step.

**Acceptance Scenarios** (US6QATest):

1. **Given** a logged-in HR representative on the create-company-profile page, **When** they enter valid company
   information and click "Save", **Then** the profile is saved to their account **and** they can view the completed
   company profile on the platform.
2. **Given** the same page, **When** they leave required company fields empty (or enter an invalid website) and click
   "Save", **Then** the profile is not saved **and** a validation message names each field to fix.
3. **Given** an HR representative without a company profile — including accounts created before this feature — **When**
   they open any company page, **Then** they are taken to the company step first and returned to the page they asked for
   after saving (their vacancies list by default).

---

### User Story 3 - Edit the profile (Priority: P2)

A student or an HR representative opens their profile, changes some information and clicks "Save". The new information
is shown in their profile and stays after a reload. Invalid changes are refused and the previously saved data stays.

**Why this priority**: Information goes stale (year of study, company size); reuses the create forms.

**Independent Test**: Change one field, save, reload: the new value is shown. Clear a required field, save: an error is
shown and the stored value is unchanged.

**Acceptance Scenarios** (US7QATest):

1. **Given** a logged-in user with a profile, **When** they open the edit form, **Then** it is filled with their current
   profile information.
2. **Given** the edit form, **When** they change fields with valid data and click "Save", **Then** the changes are saved
   **and** shown in their profile **and** still shown after reloading the page.
3. **Given** the edit form, **When** they clear a required field or enter invalid data and click "Save", **Then** the
   invalid changes are not saved **and** a validation message is shown **and** the previously saved data stays.
4. **Given** the edit form with unsaved changes, **When** they try to leave, **Then** they are asked to confirm.
5. **Given** the profile was saved meanwhile in another tab, **When** they save older data, **Then** the save is refused
   with a message and a way to load the latest data — nothing is overwritten silently.
6. **Given** an HR representative renames the company, **When** the change is saved, **Then** their vacancies show the new
   name without being edited.

---

### Edge Cases

- A student opens a company page or an HR representative opens a student page: they are sent to their own role's home
  (existing role rule).
- The user signs out during onboarding: nothing is saved until "Save"; on the next sign-in they return to the step.
- Leading/trailing spaces are removed; a value that is only spaces counts as empty.
- Text containing markup is displayed as plain text.
- A double click on "Save" in onboarding creates one profile, never two.
- Very long input: each field shows its limit and refuses more.
- Changing the role or the account password is not part of this feature (US-07 constraint).

## Requirements *(mandatory)*

### Functional Requirements

**Student profile (US-05)**

- **FR-001**: A logged-in student MUST be able to create exactly one student profile linked to their account.
- **FR-002**: The student profile MUST contain:
  - basic: full name (required), city (optional), about me (optional);
  - academic: university (required), degree (required: College (TVE), Bachelor's, Master's, Doctoral (PhD) or
    Residency — the levels of Kazakhstan's education system), major / field of study (required), year of study
    (required: a year within the degree's length, or "Graduated"), GPA (optional, 0.00–4.00 on the 4-point scale used by
    Kazakhstan's credit system);
  - looking for (required): 1–3 fields of work from the same list vacancies use — each explained in one line, because
    many students don't know yet which role fits them — or "I'm not sure yet" (no field), and at least one position
    type (internship, full-time, part-time);
  - extras (optional, added on the profile page): projects (title, short description, optional link; up to 10),
    languages (language + level: Native, Fluent, Intermediate, Basic; up to 10, each language once) and contacts
    (phone, WhatsApp, Telegram, LinkedIn, GitHub, personal website; the sign-in email is already known).
  The expected graduation year is not asked: the owner chose year of study as the more useful fact for employers
  (design round 13); the two together were confusing.
- **FR-003**: The year of study MUST fit the degree: College 1–4, Bachelor's 1–4, Master's
  1–2, Doctoral 1–3, Residency 1–4, or "Graduated". GPA MUST have at most two decimals. Links MUST be http(s) URLs; a
  Telegram handle may be given with or without "@"; a phone is stored as typed (digits, spaces, "+", "-", "()",
  7–20 characters). Invalid academic data MUST be refused with a message on the field.
- **FR-004**: Required fields MUST NOT be empty or whitespace only; every text field has a maximum length shown to the user.
- **FR-005**: After saving, the student MUST be able to see their saved profile on their profile page.
- **FR-006**: CV upload, skills and automatic skill extraction are NOT part of this feature (backlog US-14…US-18).
- **FR-006a**: The profile page MUST show each filled fact once; optional sections that are empty invite the student to
  add them, and the page MUST NOT show a "complete" message once everything optional is filled — a finished profile
  just shows the profile.

**Company (HR) profile (US-06)**

- **FR-007**: A logged-in HR representative MUST be able to create exactly one company profile linked to their account.
- **FR-008**: The company profile MUST contain: company name (required), industry (required, from a fixed list),
  company size (required, from a fixed list of ranges), website (optional, a valid http/https address), city (optional),
  description (optional).
- **FR-009**: Invalid or missing required company information MUST be refused with a message on each field.
- **FR-010**: After saving, the HR representative MUST be able to see the saved company information on their company
  profile page.

**Editing (US-07)**

- **FR-011**: A user MUST be able to edit their own profile through a form prefilled with the current data; valid
  changes are saved and shown immediately and after reload; invalid changes are refused and the stored data is unchanged.
- **FR-012**: A save based on out-of-date data MUST be refused and offer the latest data; leaving the form with unsaved
  changes MUST ask for confirmation.

**Rules shared by both**

- **FR-013**: Users MUST be able to read and change only their own profile; no account can read or change another's.
- **FR-014**: A logged-in user without a profile MUST be taken to their role's create-profile step before any other page
  of their role, and returned to the requested page after saving.
- **FR-015**: The system MUST refuse every employer vacancy action (list, create, edit, status change, delete) for an HR
  representative without a company profile, so the "has an HR profile" pre-requirement of US-08 holds even without the UI.
- **FR-016**: Vacancies MUST refer to the company profile rather than copy its name, so a rename shows everywhere; the
  employer's vacancy preview MUST show the real company name.
- **FR-017**: Profiles are visible only to their owner in this feature; showing them to the other role comes with the
  features that need it (opportunity details, candidates).

### Key Entities

- **Student profile**: one per student account — full name, university, degree, major, year of study (or graduated),
  GPA, looking-for fields and position types, city, about me, contacts; a version to detect concurrent edits; created and updated times.
- **Company profile**: one per HR account — company name, industry, size range, website, city, description; version;
  created and updated times.
- **Project** / **Language**: belong to one student profile; ordered; a language appears once per profile.
- **Fixed lists**: degrees, language levels, fields of work and position types (shared with vacancies), industries and company-size ranges (shared by validation and the forms), cities (existing list).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new student completes the profile step in under 2 minutes; a new HR representative the company step in
  under 2 minutes.
- **SC-002**: Every QA scenario of US5QATest, US6QATest and US7QATest passes as an automated end-to-end test.
- **SC-003**: 100% of attempts to save with an empty required field or invalid data are refused with a message on the
  field, and the stored data is unchanged.
- **SC-004**: A saved change is shown on the profile page after a reload in 100% of attempts.
- **SC-005**: No account can read or change another account's profile (both roles, both directions, verified by tests).
- **SC-006**: 100% of vacancy actions by an HR representative without a company profile are refused.

## Assumptions

- "Basic information" for a student = full name, city, about me and contacts; "academic information" = university,
  degree, major, year of study and GPA. University and major are free text, suggested from neutral A–Z lists.
- "Looking for" reuses the vacancy catalog (fields of work, position types) so matching later compares like with like.
- Projects, languages and contacts are optional and are added from the profile page, not in onboarding (the wizard
  keeps at most 5 steps).
- Industry list: IT & software, Finance & banking, Education, Healthcare, Retail & e-commerce, Manufacturing,
  Media & marketing, Government & public sector, Consulting, Other. Size ranges: 1–10, 11–50, 51–200, 201–1000, 1000+.
- The profile step is required (the backlog makes a profile a pre-requirement of US-08 and US-11); the later onboarding
  steps from the IA (skills, preferences, CV) arrive with their own features and will be skippable.
- Routes follow `design-system/ia.md`: student `/onboarding`, `/app/profile` (own profile), `/app/profile/edit`;
  employer `/company/onboarding`, `/company/profile` (the company profile form, view and edit in one page).
- Logos, photos, company verification and several recruiters per company are out of scope (US-06 deferred items).
- The current year is taken in Kazakhstan time, like vacancy deadlines.
- Existing sign-up, sessions and role checks are reused unchanged.
