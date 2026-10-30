# UI spec: Sign up and sign in

**Feature**: `001-user-auth` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Status**: Approved (2026-10-30)
**Designer**: ui-designer · **Prototype**: `/prototypes/001-user-auth`

## 1. Screens

| # | Screen | Route | Role / layout | Archetype | Reference template | User stories |
|---|---|---|---|---|---|---|
| S1 | Sign in | `/sign-in` | Public / none (Auth frame) | Auth | `/styleguide/templates/auth` | US2 |
| S2 | Sign up (role + email + password) | `/sign-up` | Public / none | Auth | same | US1, US3 |
| S3 | Verify email | `/sign-up/verify` | Public / none | Auth | same (`verify`) | US1, US3 |
| S4 | Forgot password | `/reset-password` | Public / none | Auth | same | US4 |
| S6 | Enter reset code | `/reset-password/verify` | Public / none | Auth | same (`verify`) | US4 |
| S5 | Set new password | `/reset-password/confirm` | Public / none | Auth | same | US4 |

Sign-out = existing `AccountMenu` "Log out" item (no screen). Route guards have no screen.

Shared frame (all five): centred column `--width-auth` (400), logo → h1 (h2 size) + one-line muted subtitle → one `Tray padding=lg` → alternative action on the tray footer (centred) → legal text (S2 only). No app header. Local helper `AuthFrame` in `features/auth/views/auth-parts.tsx` (same structure/CSS as the template, tokens only).

## 2. Screen details

### S1 — Sign in
**Goal**: return to the role's home (or the page originally asked for) in under 20 seconds.

```
AuthFrame  title "Welcome back" · sub "Sign in to see your matches"
Tray lg  footer: "No account? Sign up"
  form: [Alert] · TextField Email · PasswordField Password + right-aligned muted link "Forgot password?" · Button primary lg "Sign in"
```
No "Remember me" (sessions last 30 days, FR-014).

| Element | Text |
|---|---|
| Email label / placeholder | Email / `you@university.edu` |
| Password label | Password |
| Primary | Sign in |
| Invalid (400 `invalid_credentials`) | Alert error "Wrong email or password" · "Check both and try again, or reset your password." (link). Email kept, password cleared, both fields `aria-invalid` |
| Locked (429 `sign_in_locked`, `retry_after`) | Alert warning "Too many attempts" · "Sign-in is paused for **14:32**. Reset your password to sign in now." (live countdown, link). The primary stays enabled; pressing it during the pause only re-announces the same Alert (no request) |
| Field errors (client) | "Enter your email" / "Enter your password" |
| Server error / network | Alert error "Couldn't sign in" · "Check your connection and try again." (the primary is the retry) |

| State (`?state=`) | What the user sees | Trigger |
|---|---|---|
| `default` | empty form | initial |
| `submitting` | primary `loading`, fields stay | request in flight |
| `invalid` | error Alert, email kept | `invalid_credentials` |
| `field-errors` | per-field errors | empty email/password on submit |
| `locked` | warning Alert + countdown; Sign in stays enabled and re-announces the Alert | `sign_in_locked` |
| `server-error` | error Alert | network / 5xx |

**Interactions**: Enter submits; success → redirect to `next` or role home. Countdown ends → Alert hides; pressing Sign in during the pause re-announces the Alert without a request. Focus goes to the first invalid field on error.
**Responsive**: same single column at 390 / 1024 / 1440; side padding = `--gutter`.
**Test hooks**: `getByRole("form", {name:"Sign in"})`, `getByLabel("Email")`, `getByLabel("Password")`, `getByRole("button",{name:"Sign in"})`, `getByRole("alert")`; `data-testid="countdown"`.

### S2 — Sign up
**Goal**: choose a role and start sign-up; a 6-digit code is sent.

```
AuthFrame  title "Create your account" · sub by role (student: "Find internships that match your skills" · employer: "Find candidates ranked by skill match") · legal
Tray lg  footer: "Already have an account? Sign in"
  form: [Alert] · SegmentedControl fullWidth ("I'm a student" | "I'm hiring") · Email · Password (hint) · Button primary lg "Create account"
```

| Element | Text |
|---|---|
| Role switch (aria-label "I am") | I'm a student · I'm hiring (default student) |
| Email placeholder | student `you@university.edu` · employer `you@company.com`, employer hint "Use your work email" |
| Password hint | At least 8 characters (only rule: 8–64) |
| Primary | Create account |
| Legal | By creating an account you agree to the Terms and Privacy Policy. |
| Email taken (409 `email_taken`) | Alert warning "An account with this email already exists" · "Sign in or reset your password." (both links) |
| Field errors | Email "Enter an email like you@university.edu"; Password "Use 8 to 64 characters"; if 2+ → Alert error "Fix 2 fields to continue" · "Email, Password" |
| Server error | Alert error "Couldn't create your account" · "Check your connection and try again." |

| State | What the user sees | Trigger |
|---|---|---|
| `default` | student selected | initial |
| `employer` | employer selected (subtitle, placeholder, hint change) | role = employer |
| `submitting` | primary loading | in flight |
| `email-taken` | warning Alert, email kept | 409 |
| `field-errors` | summary + field errors | client validation / 422 |
| `server-error` | error Alert | network / 5xx |

Success (202) → S3 with the email. A 429 `resend_too_soon` means a code for this email was sent less than a minute ago: go to S3 for that email too, with `resendIn = retry_after` (no state on S2). Terms / Privacy are plain text for now (no pages yet; see open questions).
**Test hooks**: `getByRole("radio"/"tab"…)` of the switch by name "I'm hiring"; labels Email / Password; `getByRole("button",{name:"Create account"})`.

### S3 — Verify email
**Goal**: enter the 6-digit code; the account is created and the user is signed in.

```
AuthFrame  title "Check your email" · sub "We sent a 6-digit code to **<email>**. It expires in 10 minutes."
Tray lg  footer: "Wrong email? Change it" (→ S2)
  [Alert] · OtpInput (6, separator 3, centred, label "Verification code", resend timer)
```
No primary button: the code submits itself on the 6th digit (paste / autofill fill all six). Zero primary buttons on this view is intentional.

| Element | Text |
|---|---|
| Wrong code (400 `invalid_code`, `attempts_left`) | OtpInput error "That code didn't work. 2 tries left." / "1 try left." (boxes shake, clear) |
| Success pill | Verified (then redirect: student → `/app`, employer → `/company`) |
| Resent (202 after resend) | Alert success "New code sent" · "The old code no longer works." |
| Cooldown (429 `resend_too_soon`) | Alert warning "Wait before asking again" · "You can request a new code in **0:45**." + OtpInput timer from that value |
| Expired (400 `code_expired`) | Alert warning "That code expired" · "Codes work for 10 minutes." · action Button sm secondary "Send a new code"; the OtpInput resend countdown line is hidden in this state (the cooldown is over; "Send a new code" is the only resend control) |
| Too many (400 `too_many_attempts`) | Title "Start again" · sub "We cancelled this sign-up. Your email is saved." · Alert error "Too many wrong codes" · "Start again to get a new code." · Button primary lg "Start again" → S2 with email prefilled · footer "Already verified? Sign in" |
| Nothing pending (404/400 `nothing_pending`) | Title "Start again" · sub "This sign-up expired or was cancelled." · Alert warning "Nothing to verify" · same primary |
| Server error | Alert error "Couldn't check the code" · "Check your connection and enter the code again." |

| State | Trigger |
|---|---|
| `default` (idle, timer 1:00) · `verifying` (shimmer) · `invalid-code` · `success` · `resent` · `resend-cooldown` · `expired` · `too-many-attempts` · `nothing-pending` · `server-error` | as in the table |

**Interactions**: the OtpInput "Resend code" link appears when the timer ends; resending resets attempts. Autofocus the first box on mount.
**Test hooks**: `getByLabel("Verification code")` (the single real input), `getByRole("button",{name:"Resend code"})`, `getByRole("button",{name:"Start again"})`.

### S4 — Forgot password
**Goal**: ask for a reset code without revealing whether the account exists.

```
AuthFrame  title "Reset your password" · sub "Enter your email and we'll send you a 6-digit code"
Tray lg  footer: "Remembered it? Sign in"
  form: [Alert] · Email · Button primary lg "Send code"
```
Success (always 202, neutral) → S6 for that email. No `sent` state on S4.

| State | What the user sees |
|---|---|
| `default` · `submitting` (primary loading) · `field-errors` ("Enter an email like you@university.edu") · `server-error` (Alert error "Couldn't send the code" · "Check your connection and try again.") |

There is no 429 here by contract (neutral). The email is passed to S6.

### S6 — Enter reset code
**Goal**: prove access to the mailbox; only then may the user choose a new password.

```
AuthFrame  title "Check your email" · sub "If an account exists for **<email>**, we sent a 6-digit code. It expires in 10 minutes."
Tray lg  footer: "Wrong email? Change it" (→ S4)
  [Alert] · OtpInput (6, separator 3, centred, label "Verification code", resend timer)
```
Same layout and behaviour as S3: no primary button, the code submits itself on the 6th digit. Success (200 `{reset_token, expires_in}`) → S5, passing the token in navigation state.

| State | What the user sees | Trigger |
|---|---|---|
| `default` | idle boxes, "Resend in 1:00" | initial |
| `verifying` | shimmer | request in flight |
| `invalid-code` | "That code didn't work. 2 tries left." / "1 try left." | `invalid_code` + `attempts_left` |
| `success` | "Verified" pill, then S5 | 200 |
| `resent` | Alert success "New code sent" · "If an account exists, the old code no longer works." | resend 202 (always) |
| `resend-cooldown` | Alert warning "Wait before asking again" · "You can request a new code in **0:45**." | cooldown known |
| `expired` | Alert warning "That code expired" · "Codes work for 10 minutes." · Button sm secondary "Send a new code"; resend countdown line hidden | `code_expired` |
| `too-many-attempts` | Title "Start again" · sub "We cancelled this reset. Your password is unchanged." · Alert error "That code can't be used" · "Too many wrong tries, or the reset ended. Request a new code to continue." · Button primary lg "Request a new code" (→ S4, email kept) · footer "Remembered it? Sign in" | `too_many_attempts` **and** `nothing_pending` |
| `server-error` | Alert error "Couldn't check the code" · "Check your connection and enter the code again." | network / 5xx |

**Guard**: S6 without an email in navigation state redirects to S4. **Test hooks**: `getByLabel("Verification code")`, `getByRole("button",{name:"Resend code"})`, `getByRole("button",{name:"Request a new code"})`.

### S5 — Set new password
**Goal**: choose a new password after the code was accepted; the user is signed in.

```
AuthFrame  title "Set a new password" · sub "Choose a new password for **<email>**."
Tray lg
  form: [Alert] · PasswordField "New password" · PasswordField "Confirm new password" (autocomplete new-password) · one shared hint "At least 8 characters" below BOTH fields · Button primary lg "Set new password"
```
The shared hint is a plain element in the Field hint style (`.hint` in `auth.module.css`), referenced by `aria-describedby` on both inputs, and it stays visible when an error is shown. No code input, no resend line, no tray footer (the code step lives on S6).

| Element | Text |
|---|---|
| Password error | "That password is too short" (under New password). The rule itself is only in the shared hint, so "8 characters" is never repeated |
| Mismatch (client) | Confirm field error "Passwords don't match" (on blur of the confirm field and on submit; submit blocked, no request) |
| Link expired (400 `reset_token_invalid`: 10-minute token expired or already used) | Title "Start again" · sub "Your password is unchanged." · Alert warning "Your reset session expired" · "Reset sessions last 10 minutes and work once. Request a new code to continue." · Button primary lg "Start again" (→ S4) · footer "Remembered it? Sign in" |
| Server error | Alert error "Couldn't set your password" · "Check your connection and try again." |
| Success | Title "Password updated" · sub "You're signed in with your new password" · Alert success "All set" · "Other devices were signed out." · Button primary lg "Continue" (→ role home) |

| State | Trigger |
|---|---|
| `default` · `submitting` (button loading) · `invalid-password` (short password shown in both fields) · `mismatch` (two different values filled in) · `link-expired` · `server-error` · `success` | as above |

**Guard**: S5 without a `reset_token` in navigation state redirects to S4. **Responsive (all screens)**: column is max 400 and shrinks to viewport minus `--gutter` at 390; nothing scrolls horizontally; controls >= 40 px (lg button 48). Verified at 390 and 1440.
**Keyboard / a11y**: one h1 per page; forms have names; errors use `role=alert` (Alert) or the Field wiring; OtpInput announces verifying / error / resend through its live region; show/hide password button is in `PasswordField`.

## 3. Components

- Existing: `Tray`, `Alert`, `Button`, `TextField`, `PasswordField`, `SegmentedControl`, `OtpInput` (affect, untouched), `TextLink`, `Logo`, `Stack`.
- **New components**: none. `AuthFrame`, `useCountdown`, `Countdown` are feature-local helpers in `features/auth/views/auth-parts.tsx` (the frame copies the template's layout; the countdown is plain text).

## 4. Data contract for views

```ts
// features/auth/views/*View.tsx — presentational; local state only for field values / role / countdown ticking.
type AuthRoutes = { signIn; signUp; verify; reset; resetVerify; resetConfirm: string };   // defaults = real routes; prototype overrides

SignInView        { state: "default"|"submitting"|"invalid"|"field-errors"|"locked"|"server-error"; email?; retryAfter?: number /*s*/;
                    errors?: {email?; password?}; onSubmit?({email,password}); routes? }
SignUpView        { state: "default"|"submitting"|"email-taken"|"field-errors"|"server-error"; role?: "student"|"employer"; email?;
                    errors?: {email?; password?}; onSubmit?({role,email,password}); routes? }
VerifyEmailView   { state: "default"|"verifying"|"invalid-code"|"success"|"expired"|"resent"|"resend-cooldown"|"too-many-attempts"|"nothing-pending"|"server-error";
                    email; attemptsLeft?: 1|2; resendIn?: number; onSubmit?(code); onResend?(); onStartOver?(); routes? }
ResetRequestView  { state: "default"|"submitting"|"field-errors"|"server-error"; email?; errors?: {email?};
                    onSubmit?({email}); routes? }
ResetVerifyView   { state: "default"|"verifying"|"invalid-code"|"success"|"resent"|"resend-cooldown"|"expired"|"too-many-attempts"|"server-error";
                    email; attemptsLeft?: 1|2; resendIn?: number; onSubmit?(code); onResend?(); onStartOver?(); routes? }
ResetConfirmView  { state: "default"|"submitting"|"invalid-password"|"mismatch"|"link-expired"|"server-error"|"success"; email;
                    errors?: {password?; confirm?}; onSubmit?({password}) /* match checked inside the view */; onStartOver?(); onContinue?();
                    initialPassword?; initialConfirm? /* demo only */; routes? }
// AuthRoutes also has resetVerify ("/reset-password/verify").
```
Mapping for the builder: `invalid_credentials`→`invalid`; `sign_in_locked`+`retry_after`→`locked`+`retryAfter`; `email_taken`→`email-taken`; `resend_too_soon` on register → navigate to S3 (`resend-cooldown`, `resendIn = retry_after`); `resend_too_soon` on resend → `resend-cooldown`; `invalid_code`+`attempts_left`→`invalid-code`; `too_many_attempts`, `code_expired`, `nothing_pending` → same-named states; `/password-reset/request` 202 → navigate to S6 with the email; `/password-reset/verify` 200 → navigate to S5 with `reset_token` in navigation state; on S6 `invalid_code`+`attempts_left`→`invalid-code`, `code_expired`→`expired`, `too_many_attempts` and `nothing_pending` → `too-many-attempts`; `/password-reset/confirm` 400 `reset_token_invalid` → `link-expired`; resend (`purpose: password_reset`) is always 202 → `resent`; network/5xx → `server-error`. Mount the OtpInput in `idle` and switch status afterwards (it animates on changes only).

## 5. Open questions

1. ~~Terms and Privacy Policy are plain text in the legal line — OK until those pages exist?~~ Resolved by approval: kept as prototyped (plain text until those pages exist).
2. ~~S3 has no visible submit button. Add a "Verify" primary?~~ Resolved by approval: kept as prototyped (auto-submit on the 6th digit, no Verify button; applies to S3 and S6).

## 6. Revision log

| Round | Date | Feedback (user) | Changes made |
|---|---|---|---|
| 1 | 2026-10-30 | — (first review) | — |
| 2 | 2026-10-30 | (1) `sign-up?state=resend-too-soon` illogical; (2) show the code page instead of the empty "sent" page; (3) ask for the new password twice; (4) do not disable Sign in while locked; (5) no product name in copy; (6) expired state contradicts the resend timer | (1) S2 `resend-too-soon` removed; 429 on register goes to S3 with the remaining seconds as the resend countdown. (2) S4 `sent` removed; "Send code" goes straight to S5. (3) S5 gets "Confirm new password" and a `mismatch` state ("Passwords don't match"). (4) Sign in stays enabled while locked and re-announces the Alert. (5) Sign-in subtitle "Sign in to your Novio account" -> "Sign in to see your matches"; no other product name in visible copy. (6) In `expired` (S3 and S5) the OtpInput resend line is hidden; only "Send a new code" in the Alert remains |
| 3 | 2026-10-30 | The reset code must be on its own page; Set new password has no code input | New screen S6 `/reset-password/verify` (OtpInput, 9 states). S4 "Send code" now goes to S6. S5 reduced to New password + Confirm new password (no OtpInput, no resend line, no code states); states now `default`, `submitting`, `invalid-password`, `mismatch` (both fields filled, different), `link-expired`, `server-error`, `success`. Guards documented (S5 needs reset_token, S6 needs email). Prototype screen id `reset-verify` |
| 4 | 2026-10-30 | S5: write the minimum-8 rule below both fields, not after the first | S5 layout is now New password, Confirm new password, one shared hint "At least 8 characters", button. Hint linked to both inputs via `aria-describedby` and visible in every state. `invalid-password` error reworded "Use 8 to 64 characters" -> "That password is too short" so the rule appears once. Kit change: `PasswordField` now merges a caller-supplied `aria-describedby` with its own message id (before, the Field wiring overwrote it) |

## 7. Approval

- Approved by the product owner on: 2026-10-30 (after round 4)
- Approved screenshots: `design/screens/` (screen × state × desktop/mobile; file names `prototypes_001-user-auth_<screen>_state_<state>.<viewport>.png`) — 84 files: 42 states × desktop/mobile (S1 6, S2 6, S3 10, S4 4, S6 9, S5 7)
