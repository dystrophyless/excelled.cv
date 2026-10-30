# Feature Specification: Employer vacancies

**Feature Branch**: `002-employer-vacancies`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "HR should be able to change the status of the vacancies he published, like close them before deadline comes and etc."

## Clarifications

### Session 2026-10-30

- Q: Vacancies do not exist yet — does this feature deliver only the status changes, or also posting, editing and listing vacancies? → A: One feature, "Employer vacancies": post, edit, the employer's vacancy list and the whole status lifecycle.
- Q (from the IA review, same day): Which statuses does a vacancy have? → A: Draft · Open · Paused · Closed.
- Q (from the IA review): Can a Closed vacancy be opened again? → A: Yes, "Reopen" with a new deadline in the future; applicants are kept.
- Q (from the IA review): What happens to applicants when a vacancy closes? → A: Nothing — their applications keep their status and the employer keeps working with them.

## User Scenarios & Testing *(mandatory)*

The status model is agreed in `design-system/ia.md` → "Vacancy lifecycle": **Draft · Open · Paused · Closed**.
The applicant pipeline itself (moving candidates through stages) is a separate feature; this one only guarantees that
vacancy changes never disturb it.

### User Story 1 - Employer posts a vacancy (Priority: P1)

An HR person opens "Post a vacancy", fills in what the role is, where it is, which skills it needs (Required / Nice to
have), the details and the "Apply by" deadline, previews how students will see it, and publishes it. They can also save
an unfinished vacancy as a draft and come back later.

**Why this priority**: Without vacancies there is nothing to match, apply to or manage; every other story depends on it.

**Independent Test**: A signed-in employer with no vacancies posts one; it is listed as Open in their vacancies and its
saved details are exactly what they entered.

**Acceptance Scenarios**:

1. **Given** a signed-in employer, **When** they fill in all required fields with a deadline in the future and publish,
   **Then** the vacancy is Open, a confirmation is shown, and they land on their vacancy list with it under Open.
2. **Given** the form with some fields empty, **When** they save it as a draft, **Then** it is stored as Draft with what was
   entered, and is not visible to students.
3. **Given** a required field is missing or the deadline is not in the future, **When** they publish, **Then** they see
   which fields to fix, nothing is published, and what they typed is kept.
4. **Given** a filled form, **When** they choose Preview, **Then** they see the vacancy as a student would, and can go back
   to editing without losing anything.
5. **Given** a Draft, **When** the employer opens it, completes it and publishes, **Then** it becomes Open.

---

### User Story 2 - Employer sees and finds their vacancies (Priority: P1)

The employer's "Vacancies" page lists every vacancy they own, grouped by status with counts (All, Open, Draft, Paused,
Closed), each with its type, deadline and number of applicants (and how many are new). They can search by title, and
open a vacancy from the list.

**Why this priority**: It is the employer's home for vacancies and the place every status action starts from.

**Independent Test**: An employer with vacancies in every status sees each under the right group with correct counts,
finds one by typing part of its title, and opens it.

**Acceptance Scenarios**:

1. **Given** an employer with vacancies in several statuses, **When** they open Vacancies, **Then** each vacancy appears
   once under its status, and the group counts are correct.
2. **Given** the list, **When** they type part of a title in search, **Then** only matching vacancies of the selected
   group are shown.
3. **Given** an employer with no vacancies, **When** they open Vacancies, **Then** they see an empty state with "Post a
   vacancy".
4. **Given** two employer accounts, **When** each opens Vacancies, **Then** each sees only their own vacancies.

---

### User Story 3 - Employer closes a vacancy before its deadline (Priority: P1)

The position was filled early, or the role was cancelled. From the list (or the vacancy's own page) the employer chooses
"Close vacancy", confirms, and the vacancy immediately stops taking applications and disappears from student search.
Applicants stay where they are.

**Why this priority**: It is the case the request names. An open vacancy that nobody reviews wastes students' time and
hurts trust in the platform.

**Independent Test**: The employer closes an Open vacancy that has applicants; students can no longer find or apply to
it, and every applicant is still there with an unchanged status.

**Acceptance Scenarios**:

1. **Given** an Open vacancy before its deadline, **When** the employer chooses "Close vacancy" and confirms, **Then** it
   is Closed, a confirmation is shown, and the list shows it under Closed.
2. **Given** the employer chose "Close vacancy", **When** they cancel the confirmation, **Then** nothing changes.
3. **Given** a vacancy was just closed, **When** a student searches or browses vacancies, **Then** it does not appear and
   cannot be applied to.
4. **Given** a student had already applied, **When** the vacancy is closed, **Then** their application keeps its status.

---

### User Story 4 - A vacancy closes by itself at its deadline (Priority: P1)

When the "Apply by" deadline passes, an Open or Paused vacancy closes on its own, exactly as if the employer had closed
it.

**Why this priority**: The deadline is promised to students on every vacancy; it is also the most common way vacancies
end.

**Independent Test**: An Open vacancy whose deadline has passed shows as Closed to the employer and cannot be applied to,
without anyone doing anything.

**Acceptance Scenarios**:

1. **Given** an Open vacancy, **When** its deadline passes, **Then** it is Closed and no new application is accepted.
2. **Given** a Paused vacancy, **When** its deadline passes, **Then** it is Closed.
3. **Given** a student has the vacancy open on screen, **When** the deadline passes and they press Apply, **Then** they are
   told it is closed and no application is created.

---

### User Story 5 - Employer edits a vacancy (Priority: P2)

The employer fixes a typo, adds a skill or moves the deadline. The vacancy keeps its status; an Open vacancy stays
visible to students with the new details.

**Why this priority**: Needed soon after posting, but posting and closing come first.

**Independent Test**: The employer edits an Open vacancy's title and deadline; the vacancy is still Open and shows the
new values to the employer and to students.

**Acceptance Scenarios**:

1. **Given** a vacancy in any status, **When** the employer changes fields and saves, **Then** the changes are kept and the
   status is unchanged.
2. **Given** an Open or Paused vacancy, **When** the employer sets a deadline that is not in the future, **Then** saving is
   refused with a message, and nothing changes.
3. **Given** unsaved changes, **When** the employer tries to leave the page, **Then** they are asked whether to discard
   them.

---

### User Story 6 - Employer pauses and resumes a vacancy (Priority: P2)

Too many applications to review: the employer chooses "Pause" — the vacancy is hidden from search and takes no new
applications. Later "Resume" makes it Open again with the same deadline.

**Why this priority**: Useful for busy employers, but closing already stops applications.

**Independent Test**: The employer pauses an Open vacancy; students cannot find or apply to it; after Resume it is
findable again with the same deadline.

**Acceptance Scenarios**:

1. **Given** an Open vacancy, **When** the employer chooses "Pause", **Then** it is Paused, hidden from search and closed
   to new applications.
2. **Given** a Paused vacancy whose deadline is in the future, **When** the employer chooses "Resume", **Then** it is Open
   with the deadline unchanged.
3. **Given** a Paused vacancy, **When** the employer chooses "Close vacancy" and confirms, **Then** it is Closed.

---

### User Story 7 - Employer reopens a closed vacancy (Priority: P2)

The hired candidate declined. The employer chooses "Reopen" on a Closed vacancy, picks a new deadline in the future, and
the vacancy is Open again with all earlier applicants still in place.

**Why this priority**: Saves re-entering a whole vacancy, but happens less often than closing.

**Independent Test**: The employer reopens a Closed vacancy with a new future deadline; it is Open, earlier applicants
are unchanged, and new applications join the same list.

**Acceptance Scenarios**:

1. **Given** a Closed vacancy, **When** the employer chooses "Reopen" and sets a deadline in the future, **Then** it is Open
   with that deadline.
2. **Given** the employer is reopening, **When** they pick a deadline that is not in the future, **Then** they are told to
   choose a later date and the vacancy stays Closed.

---

### User Story 8 - Employer deletes a draft (Priority: P3)

An unfinished draft is no longer needed; the employer deletes it after confirming. Published vacancies (Open, Paused,
Closed) cannot be deleted — they can only be closed.

**Why this priority**: Housekeeping; drafts are harmless while they stay.

**Independent Test**: The employer deletes a Draft and it is gone from every group; the delete action is not offered for
any other status.

**Acceptance Scenarios**:

1. **Given** a Draft, **When** the employer chooses "Delete draft" and confirms, **Then** it is removed and a confirmation
   is shown.
2. **Given** an Open, Paused or Closed vacancy, **When** the employer opens its "⋯" menu, **Then** there is no delete action.

---

### User Story 9 - Students see the vacancy's real state (Priority: P3)

A student who saved a vacancy or applied to it can still open it after it is paused or closed, and is told it is not
taking applications instead of hitting a dead link.

**Why this priority**: Prevents confusion; the key protection (no new applications) is already in Stories 3, 4 and 6.

**Independent Test**: A student who saved a vacancy opens it after it was paused and after it was closed and sees the
right message, with no way to apply.

**Acceptance Scenarios**:

1. **Given** a student saved a vacancy that is now Paused, **When** they open it, **Then** they see "Not accepting
   applications right now" and no Apply action.
2. **Given** a student applied to a vacancy that is now Closed, **When** they open it, **Then** they see "This vacancy is
   closed", no Apply action, and their application status is unchanged.
3. **Given** a vacancy is Closed, **When** the student views their saved vacancies, **Then** it stays in the list, greyed,
   with a "Closed" tag.

---

### Edge Cases

- Two actions at once (e.g. Close in one tab, Pause in another, or Save in two tabs): the later action sees the current
  state and is refused with a clear message if it no longer applies; nothing is applied twice and no edit is silently
  lost.
- A student presses Apply at the same moment the vacancy is closed, paused or reaches its deadline: the application is
  refused and the student is told why.
- Resume after the deadline has passed: not possible — the vacancy is already Closed by the deadline rule; Reopen with
  a new deadline instead.
- The same skill entered as both Required and Nice to have, or twice with different letter case: kept once, in the
  group chosen last; skills are compared case-insensitively.
- An employer opens or changes another company's vacancy (e.g. by a crafted link): refused, and nothing reveals that
  the vacancy exists. A student account tries any employer action: refused.
- Leaving the posting or editing form with unsaved changes: asked whether to discard them.
- Network or server failure while saving or changing status: what was typed stays, the status shown is unchanged, and
  the action can be retried.

## Requirements *(mandatory)*

### Functional Requirements

**Vacancy content**

- **FR-001**: A vacancy MUST have: title (3–120 characters); type (Internship, Full-time or Part-time); field (from a
  fixed list such as Backend, Frontend, Data, Mobile, QA, Design); city; format (On-site, Hybrid or Remote); 1–10
  Required skills; 0–10 Nice-to-have skills; description (up to 5,000 characters); "Apply by" deadline; and optionally
  duration and salary as free text (up to 60 characters each).
- **FR-002**: Publishing MUST require every non-optional field, at least one Required skill and a deadline in the
  future; saving a Draft MUST require only a title.
- **FR-003**: Skills MUST be chosen from suggestions or typed as new ones, compared case-insensitively, with no skill in
  both groups and no duplicates.

**Posting, editing, listing**

- **FR-004**: An employer MUST be able to create a vacancy, save it as a Draft at any point, preview it as students will
  see it, and publish it (Draft → Open).
- **FR-005**: An employer MUST be able to edit a vacancy in any status; saving MUST keep its status. A deadline set while
  editing an Open or Paused vacancy MUST be in the future.
- **FR-006**: The employer's vacancy list MUST show only that employer's vacancies, grouped by status with counts (All,
  Open, Draft, Paused, Closed), each with title, type, status, deadline, number of applicants and of new applicants;
  it MUST support search by title within the selected group and have an empty state with "Post a vacancy".
- **FR-007**: An employer MUST be able to delete a Draft after confirming; Open, Paused and Closed vacancies MUST NOT be
  deletable.
- **FR-008**: Unsaved changes in the posting or editing form MUST NOT be lost silently: leaving asks to discard them,
  and a failed save keeps everything typed.

**Statuses** (from ia.md "Vacancy lifecycle")

- **FR-009**: Every vacancy MUST have exactly one status: Draft, Open, Paused or Closed. Only Open vacancies MUST appear
  in student search and browsing and accept new applications.
- **FR-010**: The employer MUST be able to: close an Open or Paused vacancy at any time ("Close vacancy"); pause an Open
  vacancy ("Pause"); resume a Paused vacancy whose deadline is in the future ("Resume", deadline unchanged); reopen a
  Closed vacancy by choosing a new deadline in the future ("Reopen").
- **FR-011**: Closing and deleting MUST ask for confirmation; every successful change MUST be confirmed with a short
  message, and the new status MUST show immediately wherever the vacancy appears to the employer.
- **FR-012**: The status actions MUST be offered from the vacancy's "⋯" menu in the list and on the vacancy's own page,
  showing only the actions valid for its current status.
- **FR-013**: An action that does not apply to the current status (e.g. Resume on a Closed vacancy) MUST be refused with
  a message naming the current status.
- **FR-014**: An Open or Paused vacancy MUST become Closed when its deadline passes, without any user action; no
  application MUST be accepted after the deadline even if a student's screen has not refreshed.
- **FR-015**: The system MUST record when a vacancy was published and last closed, and whether it was closed by the
  employer or by its deadline, and show this to the employer (e.g. "Closed by you on 12 Nov" / "Closed on its deadline,
  30 Nov").

**Applicants and students**

- **FR-016**: Editing and status changes MUST NOT change any application or its status; applications after a reopen
  MUST join the same applicant list.
- **FR-017**: A student who saved or applied to a Paused or Closed vacancy MUST still be able to open it and MUST see
  "Not accepting applications right now" (Paused) or "This vacancy is closed" (Closed), without an Apply action; Closed
  vacancies MUST stay in the student's saved list, greyed, with a "Closed" tag.

**Access**

- **FR-018**: Only the employer account that owns a vacancy MUST be able to see it while it is a Draft, edit it, change
  its status or delete it; any other account MUST be refused without revealing whether the vacancy exists. Student
  accounts MUST NOT reach any employer vacancy page.

**Experience**

- **FR-019**: Every screen and action MUST have loading, empty, error and success states, work on phones (from 390 px)
  and desktops, follow the Novio design system (Wizard / Form, Browse-table and Tracker page archetypes), and be fully
  usable with a keyboard and screen reader.

### Key Entities

- **Vacancy**: a job or internship posted by one employer account. Attributes: title, type, field, city, format,
  description, duration, salary, "Apply by" deadline, status (Draft / Open / Paused / Closed), when published, when last
  closed and by whom (employer or deadline), owning employer.
- **Vacancy skill**: a skill on a vacancy, marked Required or Nice to have; the same skill names are what students list
  on their profiles, so matching can compare them.
- **Application** (owned by the applying and pipeline features): a student's application to a vacancy with its own
  status; never changed by this feature.
- **Saved vacancy** (owned by the student features): a student's bookmark; kept whatever the vacancy's status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An employer can post a complete vacancy in under 5 minutes.
- **SC-002**: An employer can close, pause, resume, reopen or delete a draft in under 15 seconds from their vacancy list.
- **SC-003**: Zero applications are accepted for a vacancy after it was closed or paused, or after its deadline.
- **SC-004**: A vacancy disappears from student search within 1 minute of being closed, paused, or reaching its deadline.
- **SC-005**: 100% of applications keep their status across any number of edits and status changes of their vacancy.
- **SC-006**: No account other than the owning employer can see a draft, change a vacancy, or learn that a vacancy it does
  not own exists through an employer action.
- **SC-007**: Every vacancy screen passes an automated accessibility check and works at 390 px and 1440 px widths without
  horizontal scrolling.

## Assumptions

- Status rules come from `design-system/ia.md` → "Vacancy lifecycle", approved by the product owner on 2026-10-30.
- Routes and page archetypes come from ia.md: `/company/vacancies` (list), `/company/vacancies/new` (post),
  `/company/vacancies/:id/edit` (edit), `/company/vacancies/:id` (the vacancy's page). Until the applicant pipeline
  feature exists, the vacancy's page shows the vacancy, its status line and actions, and the applicant counts only.
- Applying, the applicant pipeline, student search / vacancy pages and saved vacancies are other features. This feature
  defines what they must do with each status (FR-009, FR-014, FR-017); where they do not exist yet, it delivers the rule
  on the server side so they inherit it.
- Applicant counts are 0 until the applying feature exists; the list still shows the column.
- The company name and logo shown on a vacancy come from the company profile (employer onboarding, a separate feature);
  until it exists, students do not see employer vacancies anyway.
- Status changes and edits do not notify students in this feature (no in-app messaging in MVP; notifications are later).
- Deadlines are dates; a vacancy closes at the end of its "Apply by" day in Kazakhstan time (UTC+5), and dates are shown
  in the viewer's local time.
- The field and city lists are fixed lists in the product for now (the same ones students filter by); editing them is not
  part of this feature.
- One account per company (team accounts are later), so "the owning employer" is one account.
- Signed-in employers come from 001-user-auth; employer-only pages use its role checks.
