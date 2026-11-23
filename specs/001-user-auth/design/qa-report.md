# Design QA report: 001-user-auth (re-run after fixes)

**Date**: 2026-10-30 · **Verdict**: **PASS** (all 5 previous findings and both notes are fixed in the real flow; nothing left to fix; 2 minor notes)

Method: vite preview of the production build on port 4180 (stopped afterwards), API mocked with `page.route`, Chrome at 1440 and 390, probe script in the scratchpad. New screenshots are in `specs/001-user-auth/design/qa/` as `r2-*.{desktop,mobile}.png`.

## Static and automated checks

| Check | Result | Evidence |
|---|---|---|
| `npm run build` | PASS | built, only the usual chunk-size warning |
| `npm run lint:css` / `npm run lint` | PASS | no output |
| `npm run test:e2e -- e2e/auth.spec.ts` | PASS 88/88 | desktop and mobile, axe included. The spec now also asserts `aria-invalid` (`auth.spec.ts:158,255-256`), OTP focus (`:65,478`), refocus on a repeated error (`:270-273`), S5 focus (`:525,534`) and the success screen (`:437,448`) |
| `git diff --stat -- frontend/src/components/ui` | PASS | only `field/field.tsx` (+3/-1, not an affect port) |

## Previous findings, verified in the real flow

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | `aria-invalid` on S1 `invalid` / S2 `email-taken` | FIXED | DOM probe, both viewports. S1 after `invalid_credentials`: `email:true password:true`. S2 after `email_taken`: `email:true`, password `null` (only the email is wrong, correct). `qa/r2-s1-invalid.*.png`, `qa/r2-s2-email-taken.*.png`. `field.tsx` merges `control["aria-invalid"] ?? input["aria-invalid"]` in TextField and PasswordField |
| 2 | S5 error copy | FIXED | Alert text is exactly "That password is too short" (`qa/r2-s5-invalid-password.*.png`); the shared hint "At least 8 characters" stays visible. `ResetConfirmPage.tsx:34,45` |
| 3 | S5 stale password error after mismatch | FIXED | Short password, submit, then edit New password: the "too short" error disappears at once (`password:null`). After a mismatch submit only the confirm field is red with "Passwords don't match" (`qa/r2-s5-mismatch.*.png`); it matches the approved `reset-confirm_state_mismatch` screenshots except for the focus ring |
| 3b | Focus on mismatch | FIXED | `document.activeElement` is the Confirm input after a mismatch submit (desktop and mobile) |
| 4 | OTP autofocus | FIXED | Right after mount on S3 and S6 `activeElement` is `input.ui-otp__input` ("Verification code, 6 digits"), desktop and mobile (`qa/r2-s3-focus.*.png`, `qa/r2-s6-focus.*.png`). Done through `useFocusOtp` in `hooks.ts:48-52` (affect port untouched) |
| 5 | S5 success screen and Continue | FIXED | After a valid confirm the URL stays `/reset-password/confirm`, h1 "Password updated", subtitle "You're signed in with your new password", Alert "All set / Other devices were signed out.", primary "Continue" (`qa/r2-s5-success-student.*.png`, `qa/r2-s5-success-employer.*.png`). It stays after a window `focus` event (no early bounce). Continue: student lands on `/app`, employer on `/company` (which redirects to `/company/vacancies`), both viewports |
| 7 | Refocus on repeated errors | FIXED | S1: empty submit focuses Email; second submit with only Password empty focuses Password; a third identical submit keeps it there. S5: second identical short-password submit keeps focus on New password. S2 `email-taken` second submit also keeps focus on Email. Same hook is used on S2, S4, S5 |

## Regression check on the approved Views

| Check | Result | Evidence |
|---|---|---|
| `ResetConfirmView.tsx` vs ui-spec §2 S5 | PASS | Titles, subtitles, labels, the single shared hint with `aria-describedby` on both inputs, the "Passwords don't match" error (blur + submit, request blocked), link-expired block (title, alert, "Start again", footer), server-error alert, success block: all as specified. Changes are additive: an optional `onEdit` prop (`:33-34,91,101`) and `confirmRef` focus on mismatch (`:70-73`); no visual change |
| Other Views changed | PASS (by inspection) | `features/` is untracked. `grep` shows no new props or copy in the S1-S4, S6 Views; the Pages only gained `useFocusFirstInvalid` / `useFocusOtp` calls. Spot screenshots (S1, S2, S3, S5) look identical to the approved layout |
| One primary Button per view | PASS | S5 default: one; success: one; link-expired: one |
| Raw values / kit | PASS | no new CSS; no inline styles added |

## Notes (no action required)

1. `ResetConfirmPage.tsx:20-24` sets `refetchOnWindowFocus: false` on `meKey` while the success screen is shown, to keep the server-set session from pulling the account into `["me"]` early. It works (verified with a `focus` event), but a hard reload on the success screen drops the navigation state and sends the user to `/reset-password`, or to their home if the cookie is already live. Acceptable.
2. S3/S6 "Verified" pill is still visible only for the length of the redirect (spec says "then S5 / home"); accepted earlier. S6 `resend-cooldown` is prototype-only because resend is always 202 (contract).

Muted-grey contrast not flagged (accepted exception). The dev/preview server on port 4180 was stopped.

## Top fixes

None required. Optional: add a short hold on S3/S6 `success` if the owner wants the "Verified" pill to be seen.
