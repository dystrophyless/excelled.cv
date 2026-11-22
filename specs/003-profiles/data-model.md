# Data model: Student and company profiles

## `student_profiles`

| Column | Type | Rules |
|---|---|---|
| `id` | int PK | |
| `user_id` | FK `users.id` ON DELETE CASCADE, **unique** | owner; only student accounts (API) |
| `full_name` | varchar(80) | required, trimmed, 2–80 |
| `university` | varchar(120) | required, 2–120 |
| `degree` | `degree` enum | required |
| `major` | varchar(120) | required, 2–120 |
| `study_year` | smallint, null | 1 … max for the degree; NULL exactly when `graduated` |
| `graduated` | boolean, default false | true = finished this degree |
| `gpa` | numeric(3,2), null | optional, 0.00–4.00 |
| `looking_for_fields` | `vacancy_field[]` | 0–3 distinct values (same enum as vacancies); empty = "I'm not sure yet" |
| `position_types` | `vacancy_type[]` | required, 1–3 distinct values (internship, full_time, part_time) |
| `city` | `city` enum, null | optional (existing catalog) |
| `about` | text, null | optional, ≤ 1000 chars |
| `phone` | varchar(20), null | optional; digits, spaces, `+ - ( )`, 7–20 chars |
| `whatsapp` | varchar(20), null | optional; a phone number, same rule as `phone` (opens `https://wa.me/<digits>`) |
| `telegram` | varchar(33), null | optional; stored without "@", 5–32 chars `[A-Za-z0-9_]` |
| `linkedin_url`, `github_url`, `website_url` | varchar(200), null | optional http(s) URLs (scheme added when missing) |
| `version` | int, default 1 | `WHERE version = :v`, +1 per update (projects and languages included) |
| `created_at`, `updated_at` | timestamptz | UTC |

Check constraint: `(graduated AND study_year IS NULL) OR (NOT graduated AND study_year IS NOT NULL)`.

## `student_projects`

| Column | Type | Rules |
|---|---|---|
| `id` | int PK | |
| `profile_id` | FK `student_profiles.id` ON DELETE CASCADE | |
| `position` | smallint | display order, 0-based |
| `title` | varchar(80) | required, 2–80 |
| `description` | varchar(300), null | optional |
| `url` | varchar(200), null | optional http(s) URL |

At most 10 per profile.

## `student_languages`

| Column | Type | Rules |
|---|---|---|
| `id` | int PK | |
| `profile_id` | FK `student_profiles.id` ON DELETE CASCADE | |
| `position` | smallint | display order |
| `language` | varchar(40) | required; suggested from a fixed list (Kazakh, Russian, English, …), free text allowed |
| `level` | `language_level` enum | required |

At most 10 per profile; unique (`profile_id`, lower(`language`)).

## `company_profiles`

| Column | Type | Rules |
|---|---|---|
| `id` | int PK | |
| `user_id` | FK `users.id` ON DELETE CASCADE, **unique** | owner; only employer accounts (API) |
| `name` | varchar(120) | required, 2–120 |
| `industry` | `industry` enum | required |
| `size` | `company_size` enum | required |
| `website` | varchar(200), null | optional, http(s) URL (scheme added when missing) |
| `city` | `city` enum, null | optional |
| `description` | text, null | optional, ≤ 1000 chars |
| `version`, `created_at`, `updated_at` | as above | |

## Enums

- `degree`: `college` (College, TVE), `bachelor`, `master`, `doctoral` (PhD), `residency`.
  Max year: college 4, bachelor 4, master 2, doctoral 3, residency 4.
- `language_level`: `native`, `fluent`, `intermediate`, `basic`.
- `industry`: `it`, `finance`, `education`, `healthcare`, `retail`, `manufacturing`, `media`, `government`, `consulting`, `other`.
- `company_size`: `1_10`, `11_50`, `51_200`, `201_1000`, `1000_plus`.
- Reused from 002: `vacancy_type`, `city`, and `vacancy_field`, **refined in this feature** (owner, design round 14):
  `backend`, `frontend`, `mobile`, `data_analytics`, `data_science` (incl. ML), `data_engineering`, `qa`, `design` (UI/UX),
  `devops`, `security`, `product`, `other` — the old `data` value is migrated to `data_analytics` (existing vacancies
  and the enum: add the new labels, `UPDATE vacancies SET field='data_analytics' WHERE field='data'`; `data` stays in the
  Postgres type but is no longer offered or accepted). Each value has a one-line description in the catalog.

## Rules

- A user has 0 or 1 profile, the one of their role; no deletion in this feature.
- `has_profile` (account) = that row exists.
- Employer vacancy actions require the company profile → 403 `company_profile_required`.
- Owner-only access; `vacancies` keep `employer_id` only and reach the name through the profile.
- Projects and languages are replaced as a whole list on every student-profile write (one version for the profile).
