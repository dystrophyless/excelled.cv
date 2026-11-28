# Extract skills from the CV (008, US-17)

`POST /api/student/skills/extract`: owner only (a signed-in student with a profile). No body.

Reads the student's current CV (PDF or DOCX), finds the skills named in it and stores them on the student's skill list
as **not confirmed** `cv` skills, for the review in US-18. The text of the CV is not stored and is never sent outside
the server.

## What is found

- The built-in vocabulary (`src/skills/vocabulary.py`: about 150 technical and soft skills, with other spellings such as
  `k8s` for Kubernetes) plus the skills employers already use in vacancies.
- A skill counts only as a whole word (`java` is not found in `javascript`). Words that are also ordinary words (Excel,
  Swift, Ruby, Unity) count only in their capitalised form; Go only as `Golang`.
- Ordered by how often a skill is mentioned, then by where it first appears.

## What is stored

- Skills the student already has (typed, or confirmed earlier) are never changed or duplicated.
- Unreviewed skills from an earlier reading are replaced by this reading (a new CV leaves no old guesses behind).
- New skills are `source: "cv"`, `confirmed: false`. The list holds at most 30 skills; when more are found, the most
  mentioned are kept and `truncated` is `true`.
- Reading twice gives the same list.

## Response `200`

```json
{
  "skills": [{ "name": "Python", "source": "cv", "confirmed": false }],
  "max_skills": 30,
  "added": ["Python"],
  "truncated": false
}
```

`skills` is the whole list (as `GET /api/student/skills`); `added` is what this reading added. A CV with no known skills
gives `200` with `added: []`.

## Errors

| Status | `code` | When |
|---|---|---|
| 401 / 403 | `not_signed_in`, `wrong_role`, `student_profile_required`, `origin_not_allowed` | as for the other student endpoints |
| 409 | `cv_required` | the student has no CV |
| 409 | `cv_changed` | the CV was replaced or removed while it was being read; try again |
| 422 | `cv_unreadable` | no usable text: a scan or photo, an empty, damaged or locked file, or a DOCX that unpacks to over 50 MB |

Limits while reading: the first 40 pages of a PDF, 200 000 characters of text.
