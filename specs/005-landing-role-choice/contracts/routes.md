# Routes contract

| Address | Signed out | Signed in |
|---|---|---|
| `/` | Landing page | Role's home (replace) |
| `/employers`, `/vacancies`, `/vacancies/:id` | `/` (replace) | `/`, then the role's home |
| `/sign-up` | Role step, or details when a role was chosen | Role's home (unchanged) |

`POST /auth/register` is unchanged (`specs/001-user-auth/contracts/auth-api.md`): `role` is required; a missing or unknown
role → 422 and no pending sign-up.
