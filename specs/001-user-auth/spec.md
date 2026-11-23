# Feature Specification: Sign up and sign in

**Feature Branch**: `001-user-auth`
**Created**: 2026-10-30
**Status**: Draft
**Input**: User description: "Sign up and sign in for students and employers: choose a role, email + password, verify the email with a 6-digit code, sign in, reset a forgotten password. Uses the existing FastAPI endpoints /auth/register, /auth/verify-email and /auth/token."

## Clarifications

### Session 2026-10-30

- Q: Are the missing backend parts (role, password reset, resend code) part of this feature? → A: Yes — the feature is full-stack.
- Q: How long does a user stay signed in? → A: 30 days on the device, until sign-out; no "remember me" option.
- Q: What happens to the user's other signed-in devices when they reset their password? → A: All other sessions end; the device used for the reset stays signed in.
- Q: What happens when someone keeps entering the wrong password for one account? → A: After 5 failed attempts in a row, sign-in for that email pauses for 15 minutes, with the wait time and a reset-password link shown.
- Q: What rules does a password have besides 8–64 characters? → A: None — length is the only rule.
- Q (design review): Does setting a new password ask for it twice? → A: Yes — "New password" and "Confirm new password"; sign-up still asks once.
- Q (design review): Are the reset code and the new password on one screen? → A: No — the code is entered on its own screen; the new-password screen opens only after a correct code and has no code field.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Student creates an account (Priority: P1)

A student opens Novio for the first time, chooses "I'm a student", enters an email and a password, receives a 6-digit code by email, enters it, and lands in the product already signed in, ready to set up their profile.

**Why this priority**: Without an account nobody can get matches, apply or be found — every other feature depends on it. Students are the larger audience.

**Independent Test**: With an empty account base, a person can go from the landing page to a verified, signed-in student account using only the sign-up screens and their mailbox.

**Acceptance Scenarios**:

1. **Given** a visitor on the sign-up screen, **When** they choose "student", enter a valid email and a password of at least 8 characters and submit, **Then** they are told a 6-digit code was sent to that email and see the code-entry screen with that email shown.
2. **Given** the code-entry screen, **When** they enter the correct code within its validity period, **Then** the account is created as a student account, they are signed in and taken to the student onboarding.
3. **Given** the code-entry screen, **When** they enter a wrong code, **Then** they see that the code didn't work and how many attempts remain, and can try again.
4. **Given** the code-entry screen, **When** they did not receive the code, **Then** they can request a new one after a short waiting period, which is shown as a countdown.
5. **Given** an email that already belongs to an account, **When** someone tries to sign up with it, **Then** they are told an account already exists and are offered to sign in or reset the password.

---

### User Story 2 - Returning user signs in (Priority: P1)

A student or employer who already has an account enters their email and password and is taken to their own home: students to the student home, employers to the company home.

**Why this priority**: Returning users are the majority of visits after launch; a broken sign-in blocks everything.

**Independent Test**: With one existing student and one existing employer account, each can sign in and lands on the home of their own role.

**Acceptance Scenarios**:

1. **Given** an existing account, **When** the user enters the correct email and password, **Then** they are signed in and taken to the home of their role.
2. **Given** a wrong email or password, **When** they submit, **Then** they see one neutral message ("wrong email or password") that does not reveal which of the two was wrong, and their email stays filled in.
3. **Given** a signed-in user, **When** they choose "Log out", **Then** they are signed out and returned to the sign-in screen; protected pages are no longer reachable without signing in again.
4. **Given** a visitor who opens a protected page while signed out, **When** they sign in, **Then** they are taken to the page they originally asked for.

---

### User Story 3 - Employer creates an account (Priority: P2)

A recruiter chooses "I'm hiring", signs up with a work email and a password, verifies the email with the 6-digit code and lands in the employer onboarding (company basics) already signed in.

**Why this priority**: Employers are needed for vacancies to exist, but there are fewer of them and the flow reuses everything from Story 1; only the role choice and the destination differ.

**Independent Test**: A person can create an employer account and arrive at the employer onboarding; signing in later takes them to the company home, never to student pages.

**Acceptance Scenarios**:

1. **Given** the sign-up screen, **When** the visitor chooses "I'm hiring" and completes email verification, **Then** the account is an employer account and they land on the employer onboarding.
2. **Given** an employer account, **When** it is signed in, **Then** student-only pages are not available to it, and vice versa.

---

### User Story 4 - User resets a forgotten password (Priority: P2)

A user who forgot their password asks for a reset from the sign-in screen, receives a 6-digit code by email, enters it together with a new password, and is signed in with the new password.

**Why this priority**: Without it, a forgotten password means a lost account and a support request; it is expected by every user of a sign-in form.

**Independent Test**: For an existing account, a person can replace the password using only the email inbox, then sign in with the new password; the old password no longer works.

**Acceptance Scenarios**:

1. **Given** the sign-in screen, **When** the user chooses "Forgot password?" and enters their email, **Then** they are told that if an account exists for that email, a code was sent — the same message whether or not the account exists.
2. **Given** the code from the email, **When** the user enters it on the code screen, **Then** they move on to the new-password screen; only then can they enter a new password of at least 8 characters twice (the two entries match), and **When** they submit it, **Then** the password is replaced, they are signed in on this device, the old password stops working, and every other device where the account was signed in is signed out.
3. **Given** an expired or wrong reset code, **When** they submit it, **Then** they see what went wrong and can request a new code.

---

### Edge Cases

- The verification or reset code expires (10 minutes): the user is told the code expired and can request a new one without retyping the email.
- Too many wrong codes (3 attempts): the pending sign-up is cancelled; the user is told to start again and the email field is kept.
- A new code is requested too soon (within 1 minute of the last one): the request is refused with the remaining wait time shown.
- The user pastes the code from the email or uses SMS/email autofill: all six digits fill at once.
- Sign-up is started again for an email that already has an unfinished sign-up: a fresh code is sent and the previous one stops working.
- Email typed in different letter case on sign-up and sign-in ("Maya@SDU.edu.kz" vs "maya@sdu.edu.kz"): treated as the same account.
- Network or server failure on any step: the form stays filled, an error explains that it's a connection problem, and the action can be retried.
- A signed-in user opens the sign-in or sign-up page: they are sent to their role's home instead.
- Five wrong passwords in a row (see FR-009a): sign-in pauses for 15 minutes; password reset still works during the pause.
- The session ends while the user is working (see FR-014): the next protected action sends them to sign-in and back to where they were afterwards.

## Requirements *(mandatory)*

### Functional Requirements

**Sign-up and email verification**

- **FR-001**: Visitors MUST choose a role — student or employer — before creating an account; the role cannot be changed later by the user.
- **FR-002**: Sign-up MUST require an email address and a password of 8 to 64 characters; length is the only password rule (no required character classes, no blocklist), the same for sign-up and reset. The password field MUST offer show/hide and show the rule as a hint ("At least 8 characters").
- **FR-003**: The system MUST send a 6-digit verification code to the email and MUST NOT create the account until the correct code is entered.
- **FR-004**: A verification code MUST be valid for 10 minutes, allow at most 3 wrong attempts, and a new code MUST NOT be sent more than once per minute; the screen MUST show remaining attempts and the time until a new code can be requested.
- **FR-005**: Entering the correct code MUST create the account with the chosen role and sign the user in immediately, without asking for the password again.
- **FR-006**: An email that already has an account MUST NOT be registered again; the user MUST be offered sign-in and password reset instead.
- **FR-007**: Emails MUST be treated case-insensitively everywhere.

**Sign-in and sign-out**

- **FR-008**: Users MUST be able to sign in with email and password.
- **FR-009**: A failed sign-in MUST show one neutral message that does not reveal whether the email exists.
- **FR-009a**: After 5 failed sign-in attempts in a row for one email, sign-in for that email MUST pause for 15 minutes; the screen MUST show the remaining wait and a link to reset the password. The pause MUST apply whether or not the email has an account, so it reveals nothing. A successful sign-in or password reset clears the counter.
- **FR-010**: After sign-in users MUST land on their role's home (student home or company home), or on the protected page they originally requested.
- **FR-011**: Users MUST be able to sign out from any signed-in page; after signing out, protected pages MUST require signing in again.
- **FR-012**: Pages of one role MUST NOT be reachable by accounts of the other role.

**Password reset**

- **FR-013**: Users MUST be able to reset a forgotten password in three steps — email, then the 6-digit code from the email on its own screen, then the new password (reachable only after a correct code, valid for 10 minutes) — following the same validity, attempt and resend limits as FR-004; the request MUST respond identically whether or not the email has an account. The new password MUST be entered twice; if the two entries differ, the form MUST say so before submitting. A successful reset MUST end every other session of the account; the device used for the reset stays signed in.
- **FR-014**: A signed-in user MUST stay signed in on that device for 30 days, or until they sign out; there is no "remember me" choice. Being active MUST NOT end the session early, and an ended session MUST send the user to sign-in and back to where they were.

**Scope**

- **FR-015**: This feature is full-stack: it MUST deliver the server-side behaviour it needs that does not exist yet — storing the role chosen at sign-up, password reset by email code, a dedicated "send a new code" action (for sign-up and reset), the 30-day session from FR-014, and role checks that keep each role out of the other role's pages.

**Experience**

- **FR-016**: Every screen MUST have its loading, error and success states and work on phones (from 390 px wide) and desktops, following the Novio design system (Auth page template).
- **FR-017**: All forms MUST be fully usable with a keyboard and screen reader; errors MUST be announced and linked to their fields.

### Key Entities

- **Account**: a person who can sign in. Attributes: email (unique, case-insensitive), password (stored securely), role (student or employer), created date.
- **Pending sign-up**: an unfinished sign-up waiting for email verification. Attributes: email, chosen role, chosen password, current code, expiry time, wrong-attempt count, time the last code was sent. Removed when verified, expired or after too many wrong attempts.
- **Password reset request**: a pending password change for an existing account. Attributes: account, current code, expiry time, wrong-attempt count, time the last code was sent.
- **Session**: a signed-in state of one account on one device, ending on sign-out, after 30 days, or when the password is reset from another device. Sessions must be individually revocable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can go from the sign-up screen to a signed-in account in under 2 minutes, including reading the code from their inbox.
- **SC-002**: A returning user can sign in in under 20 seconds.
- **SC-003**: At least 90% of people who request a verification code complete sign-up (measured over the first month).
- **SC-004**: A user who forgot their password can sign in again within 3 minutes without contacting support.
- **SC-005**: No sign-in or reset response reveals whether a given email has an account.
- **SC-006**: Every auth screen passes an automated accessibility check and works at 390 px and 1440 px widths without horizontal scrolling.

## Assumptions

- Verification and reset use the same 6-digit email code rules as the existing sign-up (10 minutes, 3 attempts, 1 code per minute).
- After email verification, students land on the student onboarding and employers on the employer onboarding; those onboarding screens are separate features — until they exist, users land on their role's home.
- The company name and other employer details are collected in employer onboarding, not at sign-up.
- Social sign-in (Google, etc.), phone numbers and two-factor authentication are out of scope.
- Email delivery uses the existing email sending already used for sign-up codes; the reset code uses the same sender with its own wording.
- The existing sign-up, verification and sign-in behaviour (code rules, neutral errors) is kept and extended, not replaced.
- Accounts created before roles existed (development data only) can be removed; no migration is needed.
- English is the only interface language.
