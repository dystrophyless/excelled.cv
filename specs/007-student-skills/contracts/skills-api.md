# Student skills API (007)

Owner only: a signed-in student who already has a profile. Errors use the common shape `{"detail": {"code", "message"}}`.
Skill names are the shared vocabulary of `GET /api/skills?q=` (case-insensitive: "Python" and "python" are one skill).

| Call | Purpose |
|---|---|
| `GET /api/student/skills` | The student's skills, in the order the student saved them. `Cache-Control: no-store`. |
| `PUT /api/student/skills` | Makes the sent list the student's skills (replaces the old one). |

## Response (both calls)

```json
{
  "skills": [{ "name": "Python", "source": "manual", "confirmed": true }],
  "max_skills": 30
}
```

- `source`: `manual` (typed or picked by the student) or `cv` (found by the CV extraction, US-17).
- `confirmed`: `false` for a CV skill the student has not reviewed yet. Matching and the profile analysis use confirmed
  skills only. Saving a list confirms every skill in it (US-18: review and edit).

## PUT body

```json
{ "skills": ["Python", "SQL", "Docker"] }
```

- 0 to 30 names, each 1 to 40 characters after trimming; inner whitespace is collapsed.
- A name given twice (any letter case) is kept once, in its first form. The order sent is the order kept.
- A skill that was already in the list keeps its `source`; a new one is `manual`.
- A skill left out is removed from the student (the vocabulary entry stays).

## Errors

| Status | `code` | When |
|---|---|---|
| 401 | `not_signed_in` | no session |
| 403 | `wrong_role` | the account is an employer |
| 403 | `student_profile_required` | the student has no profile yet |
| 403 | `origin_not_allowed` | a state-changing call from another origin |
| 422 | (validation list) | empty name, name over 40 characters, more than 30 skills, missing `skills` |

Two saves at once run one after the other (the profile row is locked); the last one wins.
