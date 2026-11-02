# Data model: Employer vacancies

Phase 1 of [plan.md](./plan.md). PostgreSQL, SQLAlchemy 2 declarative models in `src/vacancies/`. Timestamps are
`timestamptz` UTC. New tables only — no change to 001 tables.

## Enums

| Enum | Values |
|---|---|
| `vacancy_status` | `draft` · `open` · `paused` · `closed` |
| `vacancy_type` | `internship` · `full_time` · `part_time` |
| `work_format` | `on_site` · `hybrid` · `remote` |
| `vacancy_field` | `backend` · `frontend` · `mobile` · `data` · `qa` · `design` · `devops` · `product` · `other` |
| `city` | `almaty` · `astana` · `shymkent` · `karaganda` · `aktobe` · `other` |
| `closed_by` | `employer` · `deadline` |
| `skill_kind` | `required` · `nice` |

Display labels come from `GET /api/catalog` (research R6).

## `vacancies` (new)

| Field | Type | Rules |
|---|---|---|
| id | int PK | |
| employer_id | int FK → users.id, ON DELETE CASCADE, indexed | owner; a `users.role = employer` account |
| title | text NOT NULL | 3–120 chars (trimmed) — the only field a Draft needs |
| type | `vacancy_type`, nullable | required to be Open |
| field | `vacancy_field`, nullable | required to be Open |
| city | `city`, nullable | required to be Open |
| format | `work_format`, nullable | required to be Open |
| description | text, nullable | ≤ 5,000 chars; required (non-empty) to be Open |
| duration | text, nullable | ≤ 60 chars, optional |
| salary | text, nullable | ≤ 60 chars, optional |
| apply_by | date, nullable | required to be Open; must be today or later in UTC+5 when set on an Open/Paused vacancy or on reopen |
| closes_at | timestamptz, nullable | derived: `apply_by + 1 day` at 00:00 UTC+5; set whenever `apply_by` changes |
| status | `vacancy_status` NOT NULL, default `draft` | see state machine |
| published_at | timestamptz, nullable | first time it became Open |
| closed_at | timestamptz, nullable | last time it became Closed |
| closed_by | `closed_by`, nullable | who closed it last; NULL unless Closed |
| version | int NOT NULL, default 1 | +1 on every write (research R3) |
| created_at / updated_at | timestamptz | |

Indexes: `(employer_id, status)` for the list; `(status, closes_at)` for the deadline sweep and search filter.
"Complete" (can be Open) = title, type, field, city, format, non-empty description, `apply_by`, and ≥ 1 required skill.

## `skills` (new)

| Field | Type | Rules |
|---|---|---|
| id | int PK | |
| name | text NOT NULL | display form, as first typed (trimmed), ≤ 40 chars |
| key | text NOT NULL, unique | `name` trimmed, lower-cased, inner whitespace collapsed — used for de-duplication and matching |

## `vacancy_skills` (new)

| Field | Type | Rules |
|---|---|---|
| vacancy_id | int FK → vacancies.id, ON DELETE CASCADE | PK part |
| skill_id | int FK → skills.id | PK part — a skill appears once per vacancy |
| kind | `skill_kind` NOT NULL | `required` (1–10 per vacancy when Open) · `nice` (0–10) |
| position | int NOT NULL | order within its kind, as entered |

## State machine (ia.md "Vacancy lifecycle")

```
            publish (complete, apply_by ≥ today)
  Draft ─────────────────────────────────────► Open ◄──── resume (closes_at > now) ──── Paused
    │                                           │  └──── pause ─────────────────────────►  │
    │ delete (confirm)                          │ close (confirm) / deadline               │ close (confirm) / deadline
    ▼                                           ▼                                          ▼
  (gone)                                      Closed ◄─────────────────────────────────────┘
                                                │
                                                └── reopen (new apply_by ≥ today) ──► Open
```

| Action | From | To | Sets |
|---|---|---|---|
| publish | draft | open | `published_at` (if NULL); requires complete + future deadline |
| pause | open | paused | — |
| resume | paused (`closes_at > now`) | open | — |
| close | open, paused | closed | `closed_at = now`, `closed_by = employer` |
| *deadline sweep* | open, paused (`closes_at ≤ now`) | closed | `closed_at = closes_at`, `closed_by = deadline` |
| reopen | closed | open | new `apply_by` / `closes_at`; `closed_at`, `closed_by` cleared |
| delete | draft | — | row removed with its skills |

Every action bumps `version`. Edits keep the status; an edit of an Open/Paused vacancy must stay complete and keep a
future deadline.

## Derived rules (research R8)

- **accepting applications** = `status = 'open' AND closes_at > now()`
- **visible in search** = same as accepting applications
- Applications and saved vacancies (other features) reference `vacancies.id`; this feature never changes them.

## Relationships

```
users (employer) 1 ── 0..* vacancies
vacancies 1 ── 1..* vacancy_skills *── 1 skills
```
