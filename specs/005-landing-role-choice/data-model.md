# Data model: Landing page and role choice

No database change. `role` (`student` | `employer`) stays required on pending sign-ups and accounts; the label
"HR Representative" maps to `employer`. `/verify-email` may carry the chosen role, which overrides `pending_users.role`
when the account is created.

Sign-up client state:

| Field | Values | Kept in |
|---|---|---|
| role | none, `student`, `employer` | navigation state after Continue; component state before |
| email | text | component state; navigation state when returning from verification |
| password | text | component state only |

Transitions: role step → (Continue with a role) → details → (account submitted) → verify. Details → Back → role step with
the role and email kept. Verify → Start again → details with role and email. Details without a role → role step.
