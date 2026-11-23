# Contract: opportunities API

Base `/api/student/opportunities`. Session cookie, role `student`. Errors use the 001 shape
`{"detail": {"code", "message"}}`.

| Status | Code | When |
|---|---|---|
| 401 | `not_signed_in` | no session |
| 403 | `wrong_role` | employer |
| 403 | `student_profile_required` | student without a profile |
| 404 | `opportunity_unavailable` | details only: not active or missing, always the same body |
| 422 | (validation) | unknown enum value, `q` over 120 chars, `page` < 1 |

## `GET /api/student/opportunities`

Query: `q`, `type` (`internship` \| `vacancy` \| `research`), `format`*, `city`*, `field`* (*repeatable), `sort`
(`newest` \| `closing`), `page`.

```json
{
  "items": [{
    "id": 17, "title": "Backend Intern (Python)", "type": "internship", "field": "backend", "city": "almaty",
    "format": "hybrid", "duration": "3 months", "salary": "200 000 ₸", "apply_by": "2026-12-15",
    "published_at": "2026-11-20T08:00:00Z", "required_skills": ["Python", "SQL"], "nice_skills": ["Docker"],
    "company": {"name": "Acme"}
  }],
  "total": 1, "page": 1, "page_size": 10
}
```

No matches: `items: []`, `total: 0`, `page: 1`.

## `GET /api/student/opportunities/{id}`

The same item plus `"description"` and
`"company": {"name", "industry", "size", "city", "website", "description"}` (last three nullable).

## Changed

- `GET /api/catalog` → `types` ends with `{"value": "research", "label": "Research"}`.
- `/api/company/vacancies`: `type` accepts `research`. `/api/student/profile`: `position_types` accepts it, up to 4 values.
