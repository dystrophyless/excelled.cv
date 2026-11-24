# Feature Specification: Landing page and role choice

**Feature Branch**: `005-landing-role-choice`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "005: landing page (US-01) and role choice fix (US-03)."

## Clarifications

### Session 2026-11-24

- Q: Where is the role chosen? → A: On the first step of sign-up: two roles, none preselected, "Continue"; email and
  password follow. The role is saved with the account, as today. (The QA sheet places the step after account creation;
  the backlog's pre-requirement also allows "registration is in progress".)
- Q: How is career matching presented while it is not built? → A: As a regular platform capability, with no
  "coming soon" label.
- Q: What happens to the public demo pages `/employers`, `/vacancies` and `/vacancies/:id`? → A: Removed; the
  addresses lead to the landing page, which serves both roles. The reference templates stay in the styleguide.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor learns what Novio offers (Priority: P1)

A visitor opens Novio without an account and understands what it is, whom it serves and what it can do.

**Why this priority**: It is the entry to the product; today the address shows a demo page with invented data.

**Independent Test**: Signed out, open the landing page; purpose, capabilities and both roles are readable without
filling in any form.

**Acceptance Scenarios**:

1. **Given** a visitor who is not signed in, **When** the landing page loads, **Then** a clear description of the
   platform and its purpose is shown: it connects students with internships, vacancies, research opportunities and
   employers.
2. **Given** the landing page, **When** the visitor reads it, **Then** the main capabilities (profiles, opportunities,
   career matching) and the Student and HR Representative roles are shown.
3. **Given** the landing page, **When** the visitor clicks "Create account", **Then** the registration page opens and
   the visitor can begin creating an account.
4. **Given** the landing page, **When** the visitor clicks "Log in", **Then** the sign-in page opens.
5. **Given** a signed-in user, **When** they open the landing page, **Then** they are sent to their role's home.

---

### User Story 2 - New user chooses a role (Priority: P1)

A new user deliberately chooses Student or HR Representative before entering their account details.

**Why this priority**: The role cannot be changed later; with Student preselected, an HR representative can create the
wrong account by accident.

**Independent Test**: Open registration, continue without a role (message), then complete it once with each role.

**Acceptance Scenarios**:

1. **Given** the role step, **When** it opens, **Then** Student and HR Representative are shown and neither is selected.
2. **Given** no role is selected, **When** the user clicks "Continue", **Then** the step is not completed and a message
   asks to select a role.
3. **Given** that message, **When** the user selects a role, **Then** the message disappears.
4. **Given** one role is selected, **When** the user selects the other, **Then** only the latter is selected.
5. **Given** Student or HR Representative is selected, **When** the user clicks "Continue" and completes registration,
   **Then** the role is saved to the account and the user continues into that role's onboarding.
6. **Given** the account details step, **When** the user goes back, **Then** the chosen role is still selected and can
   be changed, and the typed email is kept.

### Edge Cases

- The session check is slow or fails on the landing page: the page content is shown anyway.
- The account details step is opened directly or reloaded without a chosen role: the role step is shown.
- The user restarts from email verification: their email and role are kept.
- Registration without a role, or with an unknown role, reaches the server: it is refused and no account is created.
- The role choice and its message work with a keyboard and are announced by a screen reader.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The landing page MUST be readable without authentication and without completing any form.
- **FR-002**: It MUST state that Novio connects students with internships, vacancies, research opportunities and employers.
- **FR-003**: It MUST present profiles, opportunities and career matching, and both roles, Student and HR Representative.
- **FR-004**: It MUST show visible "Create account" and "Log in" actions at the top of the page on desktop and mobile;
  "Create account" MUST NOT preselect a role.
- **FR-005**: It MUST NOT contain invented statistics, partner companies, reviews or links that lead nowhere. Sample
  product content MUST use fictional names.
- **FR-006**: Signed-in users opening the landing page MUST be sent to their role's home; a slow or failed session check
  MUST NOT hide the page.
- **FR-007**: Registration MUST begin with a role step offering exactly Student and HR Representative, with none
  preselected and one selectable at a time.
- **FR-008**: "Continue" without a role MUST keep the user on the step and show a message asking to select a role.
- **FR-009**: The account details step MUST require a chosen role and MUST allow going back to change it before the
  account is created; the role and email typed MUST be kept.
- **FR-010**: The chosen role MUST be saved to the account; the server MUST refuse registration without a valid role.
- **FR-011**: The public demo pages MUST no longer be reachable: `/employers`, `/vacancies` and `/vacancies/:id` lead to the
  landing page. One landing page serves students and HR, with its own section for HR, and no navigation links to the
  removed pages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can name what Novio does and for whom after reading only the first screen.
- **SC-002**: Registration and sign-in are each one click away from the landing page on desktop and mobile.
- **SC-003**: No account can be created without an explicit role choice.
- **SC-004**: The role step takes two actions: select and continue.
- **SC-005**: Every link and button on the landing page leads to a working page or section.

## Assumptions

- The interface is English only; role labels follow the backlog: "Student" and "HR Representative".
- The existing account, email verification and onboarding behaviour is reused; the server already requires a role.
- Changing the role after registration is out of scope.
- Public browsing of opportunities without an account is out of scope.
