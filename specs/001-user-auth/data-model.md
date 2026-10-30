# Data model: Sign up and sign in

Phase 1 of [plan.md](./plan.md). PostgreSQL, SQLAlchemy 2 declarative models in `src/`. All timestamps are
`timestamptz` in UTC. Emails are stored lower-cased and compared case-insensitively (FR-007).

## Enum `user_role`

`student` | `employer` — chosen at sign-up, never changed by the user (FR-001).

## `users` (existing — changed)

| Field | Type | Rules |
|---|---|---|
| id | int PK | |
| email | text, unique, indexed | lower-cased on write |
| hashed_password | text | pwdlib recommended hasher (existing) |
| **role** | `user_role` NOT NULL | **new** |
| username | text, nullable, unique | existing, unused by this feature |
| **created_at** | timestamptz, default now() | **new** |
| **password_changed_at** | timestamptz, nullable | **new** — set on reset |

## `pending_users` (existing — changed)

An unfinished sign-up. Removed when verified, expired, or after 3 wrong attempts.

| Field | Type | Rules |
|---|---|---|
| id | int PK | |
| email | text, unique, indexed | lower-cased |
| hashed_password | text | password chosen at sign-up |
| **role** | `user_role` NOT NULL | **new** — copied to `users.role` on verification |
| hashed_code | text | HMAC-SHA256(`email:code`) |
| expires_at | timestamptz | now + 10 min on every (re)send |
| attempts | int, default 0 | wrong codes; ≥ 3 → row deleted |
| last_sent_at | timestamptz | resend allowed when now ≥ last_sent_at + 60 s |
| created_at / updated_at | timestamptz | existing |

**Lifecycle**: `created (code sent)` → `resent` (new code, attempts = 0) → `verified` (row deleted, `users` row +
session created) | `expired` (deleted on next touch) | `locked` (3 wrong codes → deleted).

## `password_reset_requests` (new)

| Field | Type | Rules |
|---|---|---|
| id | int PK | |
| email | text, unique, indexed | normalised; one active request per email |
| user_id | int FK → users.id, unique, nullable, ON DELETE CASCADE | NULL for an email without an account (decoy row) |
| hashed_code | text | same scheme as sign-up |
| expires_at | timestamptz | now + 10 min |
| attempts | int, default 0 | ≥ 3 → row deleted |
| last_sent_at | timestamptz | 60 s cooldown |
| verified_at | timestamptz, nullable | set when the code is proven (step 2) |
| reset_token_hash | char(64), nullable, unique | SHA-256 of the one-time reset token issued at step 2 |
| reset_token_expires_at | timestamptz, nullable | verified_at + 10 min |
| created_at | timestamptz | |

**Lifecycle**: `requested` → `resent` → `verified` (code proven, reset token issued) → `confirmed` (password replaced, row deleted, other sessions revoked,
throttle cleared, new session for this device) | `expired` | `locked`.
A request for an email with no account creates a **decoy row** (`user_id` NULL, a code nobody receives, no email sent) so that attempts, cooldown and expiry behave exactly as for a real account and every response is identical (SC-005). A decoy can never reach `verified`: its code is unknown to everyone.

## `sessions` (new)

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| user_id | int FK → users.id, indexed, ON DELETE CASCADE | |
| token_hash | char(64), unique, indexed | SHA-256 of the cookie value; the raw token is never stored |
| created_at | timestamptz | |
| expires_at | timestamptz | created_at + 30 days (FR-014) |
| revoked_at | timestamptz, nullable | set on sign-out or by a password reset |
| last_seen_at | timestamptz | updated at most once per hour (cheap activity signal) |
| user_agent | text, nullable, ≤ 255 chars | for a future "your devices" list |

A session is **valid** when `revoked_at IS NULL AND expires_at > now()`.
**Revocation rules**: sign-out → revoke this session; password reset → revoke every session of the user except the
one created for the resetting device.

## `sign_in_throttles` (new)

| Field | Type | Rules |
|---|---|---|
| email | text PK | normalised (lower-cased, trimmed); exists for unknown emails too |
| failed_count | int, default 0 | consecutive failures |
| locked_until | timestamptz, nullable | set to now + 15 min when failed_count reaches 5 |
| updated_at | timestamptz | |

**Rules (FR-009a)**: while `locked_until > now()` sign-in answers 429 without checking the password. Wrong password
or unknown email → `failed_count += 1`; at 5 → lock and reset the count. Successful sign-in or password reset →
row deleted.

## Relationships

```
users 1 ── 0..1 password_reset_requests   (decoy rows have no user)
users 1 ── 0..* sessions
pending_users ─(verified)→ users        (no FK; email is the link)
sign_in_throttles ── keyed by email      (no FK; works for unknown emails)
```
