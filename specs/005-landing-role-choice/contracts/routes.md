# Routes contract

| Address | Signed out | Signed in |
|---|---|---|
| `/` | Landing page | Role's home (replace) |
| `/employers`, `/vacancies`, `/vacancies/:id` | `/` (replace) | `/`, then the role's home |
| `/sign-up` | Role step, or details when a role was chosen | Role's home (unchanged) |

`POST /auth/register` is unchanged (`specs/001-user-auth/contracts/auth-api.md`): `role` is required; a missing or unknown
role → 422 and no pending sign-up. `POST /auth/verify-email` gains an optional `role` (same enum, unknown → 422): when
present and the code is correct the account is created with it instead of the pending role, so a role changed during the
60 s register cooldown (429) is still honoured. The client sends the role it currently has chosen.
