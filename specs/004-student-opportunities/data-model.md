# Data model: Student opportunities

No new tables. Phase 1 of [plan.md](./plan.md).

## Changed enum

| Enum | Before | After |
|---|---|---|
| `vacancy_type` | `internship` · `full_time` · `part_time` | + `research` ("Research"), last |

`student_profiles.position_types`: 1–4 distinct values (was 1–3). Existing databases: research R5.

## Changed: `vacancies`

| Field | Type | Rules |
|---|---|---|
| salary_min, salary_max | int, null | "1–999 999 999; min ≤ max when both are set" (also check constraints) |
| salary_currency | enum `currency` (`KZT` · `USD` · `EUR` · `RUB`) NOT NULL, default `KZT` | used only with an amount |
| salary (text) | removed from the model | converted by the upgrade, research R12 |

## Read model: Opportunity

`vacancies` JOIN `company_profiles` ON `company_profiles.user_id = vacancies.employer_id`
WHERE `status = 'open' AND closes_at > now` (`rules.visible_in_search`).

| Field | Source | List | Details |
|---|---|---|---|
| id, title, type, field, city, format, duration, salary, apply_by, published_at | `vacancies` | ✓ | ✓ |
| required_skills, nice_skills | `vacancy_skills` ordered by `position` | ✓ | ✓ |
| description | `vacancies` | — | ✓ |
| company.name | `company_profiles` | ✓ | ✓ |
| company.industry, size, city, website, description | `company_profiles` | — | ✓ |

Never included: `employer_id`, email, `version`, `status`, `closed_*`, applicant counts (FR-017).

## Filter

| Parameter | Rule |
|---|---|
| q | ≤ 120 chars; words combined with AND; each in title OR company name OR any skill |
| type | `internship` → internship · `vacancy` → full_time, part_time · `research` → research |
| format, city, field | any of the values given |
| sort | `newest` (default) · `closing` |
| page | ≥ 1, clamped to the last page; page size 10 |
