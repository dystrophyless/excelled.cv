# Research: Student opportunities

## R1 — Which vacancies are active
**Decision**: reuse `rules.visible_in_search(now)` in every student query; run `sweep_expired` first, as 002 does.
**Rationale**: one rule, already tested; the query condition is correct on its own, so a failed sweep cannot leak.
**Alternatives**: filter by status only (wrong between the deadline and the next sweep).

## R2 — Module and shape
**Decision**: new read-only backend module `src/opportunities/` over the `Vacancy`, `VacancySkill`, `Skill` and
`CompanyProfile` models, with its own response schemas. Inner join on the company profile.
**Rationale**: 002's `VacancyOut` carries owner-only data (version, counts, history); a separate schema makes FR-017 hold
by construction. The inner join drops vacancies that have no company to show.
**Alternatives**: extend `/company/vacancies` (mixes roles); a database view (no need yet).

## R3 — Keyword search
**Decision**: split on whitespace, at most 8 words; each word must match (`ILIKE`, escaped) the title, the company name
or one of the skills (`EXISTS`). Description is not searched.
**Rationale**: matches what the card shows, so a result is explainable; with about 1,000 active rows a scan is well
within SC-004. 002 already does escaped `ILIKE`.
**Alternatives**: Postgres full-text (poor on product names such as "C++", stemming surprises); `pg_trgm` index (adds an
extension; reconsider above tens of thousands of rows).

## R4 — Type filter
**Decision**: API values `internship`, `vacancy`, `research`; `vacancy` = `full_time` + `part_time`. The `VacancyType`
enum gains `research`; no separate "kind" column.
**Rationale**: the filter group is presentation over the type; storing it would duplicate data.

## R5 — Existing databases
**Decision**: `create_tables` gains an idempotent `ALTER TYPE vacancy_type ADD VALUE IF NOT EXISTS 'research'` next to
003's field step. `position_types` maximum becomes 4.
**Rationale**: same mechanism as 003; no rows change (FR-015). Adding the value after `part_time` keeps the order.

## R6 — Sorting and paging
**Decision**: `sort=newest` (`published_at` desc, `id` desc) or `closing` (`closes_at` asc, `id` desc); offset paging,
10 per page, the server clamps the page and returns the one it used. Total comes from a `count(*)` of the same filter.
**Rationale**: numbered `Pagination` is in the archetype; the `id` tie-break makes pages stable.
**Alternatives**: cursor paging (no page numbers), infinite scroll (breaks Back).

## R7 — Filter state
**Decision**: the URL is the only store: `q`, `type`, `format`, `city`, `field` (repeated), `sort`, `page`; defaults are
left out. Typing is debounced 250 ms and replaces the history entry; filters, sort and page push one. Opening a card
passes the list's query string in router state; Back uses it, else the plain list.
**Rationale**: reload, share and browser Back work without a client store (FR-006, FR-012).

## R8 — Invalid values
**Decision**: the SPA drops unknown values using the catalog before calling the API; the API itself answers 422.
**Rationale**: the contract stays strict, the page stays forgiving.

## R9 — Unavailable opportunity
**Decision**: 404 `opportunity_unavailable`, same body for closed, paused, draft, expired and missing. For a non-numeric
id the page shows the same state without calling the API. The page does not retry a 404.

## R10 — Demo pages
**Decision**: the student menu holds Opportunities only, the demo notification bell goes, `homePathFor("student")` becomes
`/app/opportunities`; `/app`, `/app/vacancies`, `/app/applications`, `/app/saved` redirect there and
`/app/vacancies/:id` to `/app/opportunities/:id`. The reference templates stay in `/styleguide/templates`; tests
that used demo routes as a vehicle move to the templates.
**Rationale**: owner decision (Clarifications). Settings is still a demo page and stays reachable from the account menu.

## R11 — Mock Match / Apply / Save
**Decision**: the Views take optional `match`, `apply` and `save` props. Only the prototype passes them; the pages never
do, and a test asserts their absence.
**Rationale**: the design is approved once and later features just fill the slots; no invented data reaches students.
