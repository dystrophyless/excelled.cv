# Contract: Employer vacancies API

JSON in and out. Auth and conventions from 001 ([../../001-user-auth/contracts/auth-api.md](../../001-user-auth/contracts/auth-api.md)):
`novio_session` cookie, Origin check on state-changing requests, error shape
`{ "detail": { "code", "message", ...extra } }`, 422 for schema errors keeps FastAPI's default shape unless a `code`
is listed below.

Employer endpoints (`/api/company/vacancies…`) require `require_role("employer")`: **401 `not_signed_in`**, **403
`wrong_role`**. A vacancy that does not exist **or** belongs to another employer → **404 `vacancy_not_found`** (same
body, research R4). Every employer request first runs the deadline sweep (research R1).

## Shared objects

```jsonc
// Vacancy (employer view)
{
  "id": 17,
  "title": "Backend Intern (Python)",
  "type": "internship",            // vacancy_type | null (draft)
  "field": "backend",              // vacancy_field | null
  "city": "almaty",                // city | null
  "format": "hybrid",              // work_format | null
  "description": "Join the Payments team…",   // string | null
  "duration": "3 months",          // string | null
  "salary": "200 000 ₸ / month",   // string | null
  "apply_by": "2026-11-30",        // ISO date | null
  "closes_at": "2026-11-30T19:00:00Z",        // end of apply_by in UTC+5 | null
  "required_skills": ["Python", "SQL", "Git"],
  "nice_skills": ["Docker"],
  "status": "open",                // draft | open | paused | closed
  "published_at": "2026-10-28T09:12:00Z",     // | null
  "closed_at": null,               // | timestamp
  "closed_by": null,               // employer | deadline | null
  "applicants": 0, "new_applicants": 0,       // 0 until the applying feature exists (research R9)
  "version": 3,
  "created_at": "…", "updated_at": "…"
}

// VacancyInput (create / edit) — everything optional except title (research R7)
{
  "title": "Backend Intern (Python)",          // 3–120 chars
  "type": "internship", "field": "backend", "city": "almaty", "format": "hybrid",
  "description": "…",                          // ≤ 5000
  "duration": "3 months", "salary": "…",       // ≤ 60 each
  "apply_by": "2026-11-30",
  "required_skills": ["Python", "SQL"],        // ≤ 10, each 1–40 chars
  "nice_skills": ["Docker"]                    // ≤ 10
}
```

Validation errors with a stable `code` (all 422):

| code | extra | When |
|---|---|---|
| `incomplete` | `fields: ["type", "required_skills", …]` | the result must be Open (publish / create with `publish:true` / edit of Open or Paused) and something required is missing |
| `apply_by_not_in_future` | — | a deadline before today (UTC+5) where the vacancy is or becomes Open/Paused |

---

## GET `/api/catalog`

Public, cacheable. `{ "types": [{ "value": "internship", "label": "Internship" }, …], "fields": […], "cities": […], "formats": […] }`

## GET `/api/skills?q=py`

Signed-in (any role). Up to 10 skills whose `key` starts with the normalised `q` (empty `q` → most used):
`{ "skills": ["Python", "PyTorch"] }`.

## GET `/api/company/vacancies?status=open&q=intern`

`status`: `all` (default) | `draft` | `open` | `paused` | `closed`. `q`: case-insensitive title substring.

200:
```json
{
  "items": [ /* Vacancy, newest updated first */ ],
  "counts": { "all": 4, "draft": 1, "open": 2, "paused": 0, "closed": 1 }
}
```
`counts` ignore `q` and `status` (they label the status groups).

## POST `/api/company/vacancies`

Body: `VacancyInput` + `"publish": false | true`.

| Status | Body | When |
|---|---|---|
| 201 | `Vacancy` (`draft`, or `open` when `publish: true`) | saved |
| 422 | `incomplete` / `apply_by_not_in_future` / schema | `publish: true` and not complete, or bad input |

## GET `/api/company/vacancies/{id}`

200 `Vacancy` · 404 `vacancy_not_found`.

## PUT `/api/company/vacancies/{id}`

Body: `VacancyInput` + `"version": 3`. Replaces the content (skills included); status unchanged.

| Status | Body | When |
|---|---|---|
| 200 | `Vacancy` (version + 1) | saved |
| 409 | `code: "version_conflict"`, `vacancy: Vacancy` (current) | changed since `version` |
| 422 | `incomplete` / `apply_by_not_in_future` / schema | Open/Paused would become incomplete or get a past deadline |
| 404 | `vacancy_not_found` | |

## POST `/api/company/vacancies/{id}/status`

Body: `{ "action": "publish" | "pause" | "resume" | "close" | "reopen", "version": 3, "apply_by": "2026-12-31" }`
(`apply_by` only and always for `reopen`).

| Status | Body | When |
|---|---|---|
| 200 | `Vacancy` | transition done (state machine in data-model.md) |
| 409 | `code: "invalid_transition"`, `status: "<current>"`, `message` naming it | action not allowed from the current status (e.g. resume on closed, resume after the deadline) |
| 409 | `code: "version_conflict"`, `vacancy` | changed since `version` |
| 422 | `incomplete` | `publish` of an incomplete draft |
| 422 | `apply_by_not_in_future` | `publish` with a past deadline, `reopen` without a future one |
| 404 | `vacancy_not_found` | |

## DELETE `/api/company/vacancies/{id}?version=3`

| Status | Body | When |
|---|---|---|
| 204 | — | draft deleted with its skills |
| 409 | `code: "not_a_draft"`, `status` | Open / Paused / Closed cannot be deleted (FR-007) |
| 409 | `code: "version_conflict"`, `vacancy` | changed since `version` |
| 404 | `vacancy_not_found` | |

---

## Server-side rules for later features (no endpoint here)

`src/vacancies/rules.py`: `accepting_applications(vacancy, now)` and `visible_in_search()` (research R8). The applying
feature must reject applications with **409 `vacancy_not_accepting`** (`status: "paused" | "closed"`) using this rule.
