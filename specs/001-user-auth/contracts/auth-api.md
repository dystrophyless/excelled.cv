# Contract: Auth API

Base path `/api/auth` (router already mounted there in `src/main.py`). JSON in and out unless noted.
Authentication = the `novio_session` HttpOnly cookie (research R1). Every state-changing request must carry an
`Origin` that matches `FRONTEND_ORIGIN`, otherwise **403 `origin_not_allowed`** (R2).

## Error shape (all endpoints)

```json
{ "detail": { "code": "invalid_code", "message": "That code didn't work.", "attempts_left": 2 } }
```

`code` is stable and drives the UI; `message` is a human fallback; extra fields per error below.
Validation errors (422) keep FastAPI's default shape.

## Account object

```json
{ "id": 42, "email": "maya@sdu.edu.kz", "role": "student" }
```

---

## POST `/register` — start sign-up (changed: adds `role`)

Request `{ "email": "maya@sdu.edu.kz", "password": "••••••••", "role": "student" | "employer" }`
— password 8–64 chars (only rule, FR-002).

| Status | Body | When |
|---|---|---|
| 202 | `{ "email": "maya@sdu.edu.kz", "resend_in": 60, "expires_in": 600 }` | code sent |
| 409 | `code: "email_taken"` | an account already exists (FR-006) |
| 429 | `code: "resend_too_soon", retry_after: <s>` | a code was sent < 60 s ago for this email |

Repeating `/register` for a pending email (after the cooldown) replaces password, role and code.

## POST `/resend-code` — new code (new)

Request `{ "email": "...", "purpose": "sign_up" | "password_reset" }`

| Status | Body | When |
|---|---|---|
| 202 | `{ "resend_in": 60, "expires_in": 600 }` | sent. For `password_reset` this is the **only** response (same neutrality rule as `/password-reset/request`: in cooldown or with no account nothing is sent) |
| 404 | `code: "nothing_pending"` | `sign_up` only: no pending sign-up (expired / cancelled) → UI sends the user back to sign-up |
| 429 | `code: "resend_too_soon", retry_after` | `sign_up` only: cooldown |

Resend resets `attempts` to 0 and `expires_at` to now + 10 min.

## POST `/verify-email` — finish sign-up (changed: sets a session)

Request `{ "email": "...", "code": "123456" }`

| Status | Body | When |
|---|---|---|
| 200 | `{ "account": Account }` + `Set-Cookie: novio_session=…; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=2592000` | account created with the pending role, signed in (FR-005) |
| 400 | `code: "invalid_code", attempts_left: 1–2` | wrong code |
| 400 | `code: "too_many_attempts"` | 3rd wrong code — pending sign-up deleted |
| 400 | `code: "code_expired"` | > 10 min |
| 400 | `code: "nothing_pending"` | no pending sign-up |

## POST `/token` — sign in (changed: cookie session, throttling)

Request (unchanged form encoding, `application/x-www-form-urlencoded`): `username=<email>&password=<password>`

| Status | Body | When |
|---|---|---|
| 200 | `{ "account": Account }` + `Set-Cookie` as above | correct credentials |
| 400 | `code: "invalid_credentials"` | wrong email or password — identical for unknown emails (FR-009) |
| 429 | `code: "sign_in_locked", retry_after: <s>` | 5 failures in a row → 15-min pause (FR-009a), also for unknown emails |

## POST `/sign-out` (new)

No body. Revokes the current session, clears the cookie (`Max-Age=0`). Always **204** (idempotent).

## GET `/me` (new)

| Status | Body | When |
|---|---|---|
| 200 | `{ "account": Account }` | valid session |
| 401 | `code: "not_signed_in"` | no / expired / revoked session — the SPA treats this as "signed out" |

## POST `/password-reset/request` (new)

Request `{ "email": "..." }` → **always 202** `{ "resend_in": 60, "expires_in": 600 }`, never 429 — whether or not an
account exists and whether or not a code was sent recently (FR-013, SC-005). Behind the identical response:
account exists and no code in the last 60 s → new code sent; account exists but in cooldown → nothing sent;
no account → nothing sent, but a decoy request is recorded so that `/password-reset/verify` then counts attempts, cooldown and expiry exactly as for a real account. Any other behaviour would let an attacker tell existing accounts apart.

## POST `/password-reset/verify` (new) — step 2: prove the code

Request `{ "email": "...", "code": "123456" }`

| Status | Body | When |
|---|---|---|
| 200 | `{ "reset_token": "<opaque>", "expires_in": 600 }` | code correct; the request is marked verified and a one-time reset token issued |
| 400 | `invalid_code` (`attempts_left`) / `too_many_attempts` / `code_expired` | as in `/verify-email` |
| 400 | `code: "too_many_attempts"` | also returned when **no** reset is pending for this email — identical to a used-up request, so it reveals nothing |

The reset token is 32 random bytes; only its SHA-256 is stored; valid 10 minutes, single use.

## POST `/password-reset/confirm` (new) — step 3: set the password

Request `{ "reset_token": "<from verify>", "password": "new password 8–64" }`
(the UI asks for the password twice and compares client-side; the API takes it once)

| Status | Body | When |
|---|---|---|
| 200 | `{ "account": Account }` + new `Set-Cookie` | password replaced; all **other** sessions revoked; throttle cleared; token consumed |
| 400 | `code: "reset_token_invalid"` | token unknown, expired or already used → UI sends the user back to "Forgot password" |

---

## Role guard (backend dependency, for later features)

`require_role("student" | "employer")` → **401 `not_signed_in`** without a session, **403 `wrong_role`** for the other
role (FR-012). Used by every role-specific API route from now on.

## Cookie

`novio_session` — 32 random bytes, URL-safe base64. Only its SHA-256 is stored. `Secure` is relaxed to
`Secure=false` only when `ENVIRONMENT=development` (plain-HTTP localhost).
