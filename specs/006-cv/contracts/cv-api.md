# Contract: CV API

Base `/api/student/cv`. Session cookie, role `student`, profile required. Errors: `{"detail": {"code", "message", ...}}`.

`Cv` = `{"id": uuid, "file_name": str, "format": "pdf"|"docx", "size_bytes": int, "uploaded_at": datetime}`

| Method | Path | Body | Success |
|---|---|---|---|
| GET | `/` (no trailing slash) | — | 200 `{"cv": Cv \| null, "limits": {"formats": ["pdf","docx"], "max_bytes": 5242880}}`, `Cache-Control: no-store` |
| POST | same | raw file + `X-File-Name` | 201 `Cv` |
| PUT | `/{id}` | raw file + `X-File-Name` | 200 `Cv` (new id) |
| DELETE | `/{id}` | — | 204 |
| GET | `/{id}/file` | — | 200 file bytes, headers as in research R6 |

| Status | Code | When |
|---|---|---|
| 401 | `not_signed_in` | no session |
| 403 | `wrong_role` / `student_profile_required` / `origin_not_allowed` | employer / no profile / foreign origin |
| 408 | `cv_upload_timeout` | body not received in 60 s |
| 409 | `cv_exists` | POST while a CV exists; `cv`: current |
| 409 | `cv_changed` | PUT, DELETE or file GET for an id that is not current; `cv`: current or `null` |
| 413 | `cv_too_large` | over 5 MB; `max_bytes` |
| 422 | `cv_name_invalid` | `X-File-Name` missing or not decodable |
| 422 | `cv_empty` | 0 bytes |
| 422 | `cv_format_unsupported` | extension or content is not PDF/DOCX, or they disagree |
| 422 | (validation) | `id` is not a uuid |

Order for uploads: access → name and extension → size → content → current state. A refused request changes nothing.
