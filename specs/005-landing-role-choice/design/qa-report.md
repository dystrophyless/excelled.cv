# Design QA report: 005 landing and role choice

**Verdict: PASS** (no fixes required; one optional note)

Scope: `/`, `/sign-up` (role step, details step), reworded sign-in / reset / verify screens, `<main>` landmark. API mocked (`page.route`). Screenshots: `specs/005-landing-role-choice/design/qa/` (desktop 1440, mobile 390). Approved: `design/screens/`.

| Checklist item | Result | Evidence | Fix |
|---|---|---|---|
| `npm run build` | pass (chunk-size warning only, pre-existing) | build output | none |
| `npm run lint:css` / `npm run lint` | pass, no output | commands | none |
| Raw hex / rgb / inline px in features/landing, features/auth, app/layouts | none | grep | none |
| affect-ui ports / kit edited | none | `git diff --stat -- frontend/src/components/ui` empty | none |
| One primary Button per view | pass (landing has several "Create account" primaries as in the approved design; auth screens one) | screenshots | none |
| Old wording ("Sign in", "Sign up", "signed in/out") in UI code | none in views; only code comments (`guards.tsx:8,23`, `SignInPage.tsx:7`, `SignUpPage.tsx:29`) | grep | none |
| E2E `landing.spec.ts` + `auth.spec.ts`, desktop + mobile | 146 passed, 0 failed, axe clean | test run | none |
| Exactly one `<main>` per page, no horizontal scroll | 1 on all 10 routes at both widths; no overflow | DOM check on snaps | none |
| Landing vs approved | byte-identical (desktop, mobile) | `qa/landing.*.png` vs `screens/..._landing.*.png` (cmp) | none |
| S2 choose role (default, error) vs approved | identical layout, copy, red edges and message; only the prototype state-switcher pill is absent | `qa/sign-up-role*.png` | none |
| S3 details (HR, field errors) vs approved | identical layout and copy (Signing up as, Change role, Step 2 of 2, Log in link, no legal line) | `qa/sign-up-details-*.png` | none |
| Reworded auth screens | sign-in ("Log in to continue", "Log in", "No account? Create account"), reset 1-3, verify render with no layout shift after `<main>` | `qa/sign-in.*`, `reset-password*.*`, `sign-up_verify.*` | none |

## Differences from approved screenshots
1. Prototype state-switcher pill (bottom left) absent in the real routes. Expected.
2. S3 default state in the QA shot shows the email typed by the script, and the email field has a focus ring. Expected.
3. Nothing else visible.

## Notes
- `/sign-up/verify` opened directly (no state) renders the role step; matches e2e "direct visit" expectation.
- The mocked-API snapshots did not cover the email-taken, server-error and submitting states of S3. Those states are covered by e2e (`auth.spec.ts`) and the views are unchanged from the approved prototype.
