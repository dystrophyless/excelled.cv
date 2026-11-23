# Profiles API

All routes need a session cookie (401 `not_signed_in` otherwise). Errors: `{detail: {code, message, ...}}`; validation
errors are FastAPI's 422 list with `loc` = `["body", "<field>"]`. State-changing calls keep 001's Origin check.

## Changed

- `GET /api/auth/me`, `POST /api/auth/token` → `{account: {id, email, role, has_profile}}`.
- `GET /api/catalog` → adds `industries`, `company_sizes`, `degrees` (`[{value, label, max_year}]`) and
  `language_levels`, all `[{value, label}]`; `fields` and `types` (from 002) are reused for "looking for". `fields` is
  refined (data → data_analytics / data_science / data_engineering, + security) and each item gains `description`
  (one line: what this role does). The vacancy API accepts the same refined values; `data` is no longer accepted.
- Every `/api/company/vacancies*` call → 403 `company_profile_required` when the employer has no company profile
  (checked after the role check, before anything else).

## Student profile — role `student` (an employer gets 403 `wrong_role`)

| Call | Success | Errors |
|---|---|---|
| `GET /api/student/profile` | 200 `StudentProfile` | 404 `profile_not_found` |
| `POST /api/student/profile` (`StudentProfileIn`) | 201 `StudentProfile` (`version` 1) | 409 `profile_exists`, 422 |
| `PUT /api/student/profile` (`StudentProfileIn` + `version`) | 200 `StudentProfile` (`version` + 1) | 404 `profile_not_found`, 409 `version_conflict` with `profile` = current, 422 |

`StudentProfileIn`:

```json
{
  "full_name": "Maya Akhmetova",
  "university": "Suleyman Demirel University",
  "degree": "bachelor",
  "major": "Computer Science",
  "study_year": 3,            // null when graduated
  "graduated": false,
  "gpa": "3.45",              // string or number, null when not given
  "looking_for_fields": ["backend", "data"],
  "position_types": ["internship"],
  "city": "almaty",           // null allowed
  "about": "…",               // null allowed
  "contacts": { "phone": null, "whatsapp": null, "telegram": "maya_a", "linkedin_url": null, "github_url": "https://github.com/maya", "website_url": null },
  "projects": [ { "title": "Campus bot", "description": "Telegram bot for timetables", "url": "https://github.com/maya/bot" } ],
  "languages": [ { "language": "Kazakh", "level": "native" }, { "language": "English", "level": "intermediate" } ]
}
```

`StudentProfile`: the same + `version`, `created_at`, `updated_at` (UTC, `Z`). `projects` and `languages` are whole lists:
every POST/PUT replaces them (order = array order). Onboarding sends `[]` and empty contacts.

Validation codes in the 422 body come from pydantic (`loc` e.g. `["body", "study_year"]`,
`["body", "projects", 0, "url"]`); cross-field rules raise `value_error` on the field they concern:
`study_year` out of range for the degree, `study_year` given with `graduated: true` (or missing without it),
duplicate language, more than 10 projects or languages.

## Company profile — role `employer` (a student gets 403 `wrong_role`)

Same three calls on `/api/company/profile`.
`CompanyProfileIn`: `{name, industry, size, website: string|null, city: City|null, description: string|null}`.
`CompanyProfile`: the same + `version`, `created_at`, `updated_at`.

## Validation

Lengths and ranges per [data-model.md](../data-model.md) / research R6. Strings trimmed; empty optional → null;
whitespace-only required → 422.
