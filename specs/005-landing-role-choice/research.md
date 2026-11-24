# Research: Landing page and role choice

## R1. Where the role step lives
- **Decision**: `/sign-up` has two steps in one mounted page. The step, role and email are in router navigation state;
  Continue pushes an entry, so the browser's Back returns to the role step. The details step renders only when a role is
  in that state, otherwise the role step does. "Start again" on email verification passes role and email, as today, and
  opens the details step. The password lives only in component memory and is never put in history.
- **Rationale**: One address, working Back, and no way to submit without a role.
- **Alternatives**: a `/sign-up/role` route (extra guard, no gain); local state only (Back would leave sign-up); role
  after account creation (needs accounts without a role; rejected by the owner).

## R2. Server behaviour
- **Decision**: No server change. `UserRegisterRequest.role` is a required enum, so a missing or unknown role is refused
  with 422 before anything is stored. `tests/auth/test_sign_up.py` already covers both.
- **Alternatives**: storing the role separately after registration: more states, no benefit.

## R3. Landing and the session check
- **Decision**: A guard variant renders the page while the session is loading or the check fails, and redirects to the
  role's home only when an account is known.
- **Rationale**: `RedirectIfSignedIn` renders nothing while loading, which would blank the page when the API is slow.
- **Alternatives**: reuse `RedirectIfSignedIn` (fails FR-006). Its behaviour on the auth pages stays.

## R4. Removed demo routes
- **Decision**: `/employers`, `/vacancies`, `/vacancies/:id` redirect to `/` with replace. Templates stay under
  `/styleguide/templates`. The public header loses its links to them; anchors to landing sections may replace them.
- **Alternatives**: rely on the `*` route: same result, but the intent is not recorded.

## R5. Content
- **Decision**: No statistics, partner logos, testimonials, or Terms/Privacy links without pages. Illustrations use kit
  components with fictional names and are hidden from assistive technology. Career matching is described as a capability
  (owner's decision). Applying, tracking and saving are not advertised: the spec lists profiles, opportunities and
  matching only.
- **Wording**: the actions are "Create account" and "Log in", and the roles "Student" and "HR Representative", as in the
  acceptance tests.
