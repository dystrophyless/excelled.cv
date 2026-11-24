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
    "format": "hybrid", "duration": "3 months", "salary": {"min": 200000, "max": 300000, "currency": "KZT"}, "apply_by": "2026-12-15",
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
- `salary` in `/api/company/vacancies` (input and output) and in both student endpoints is
  `{"min": int|null, "max": int|null, "currency": "KZT"|"USD"|"EUR"|"RUB"}` or `null`. Input: `currency` defaults to `KZT`;
  no amounts means `null`; an amount outside 1–999 999 999, a non-integer or min > max → 422 (min > max at
  `loc: ["body", "salary", "max"]`). A text is refused (422).
- `GET /api/catalog` gains `"currencies": [{"value": "KZT", "label": "Tenge", "symbol": "₸"}, …]` (KZT, USD, EUR, RUB).
