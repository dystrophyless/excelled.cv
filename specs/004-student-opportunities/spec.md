# Feature Specification: Student opportunities

**Feature Branch**: `004-student-opportunities`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "004 student opportunities: US-11, US-12, US-13 and the \"research\" opportunity type from US-08."

## Clarifications

### Session 2026-11-24

- Q: What is the student section called, now that it also holds research? → A: "Opportunities" (menu, page title, address
  `/app/opportunities`). Employers keep "Vacancies".
- Q: Which filters? → A: Keyword search and type (the QA sheet), plus format, city and field; the state is in the address.
- Q: Match %, Apply and Save have no backend yet — what is shown? → A: They are drawn with mock data in the design
  prototype only. The application shows none of them until their own features deliver them.
- Q: What happens to the student demo pages (Home, Applications, Saved)? → A: Hidden until they are real; `/app` leads
  to Opportunities.
- Q (owner's manual check): "1000000" is unreadable. How is salary given and shown? → A: Amounts "from" and "to" (either may
  be empty) in a chosen currency: KZT (default), USD, EUR, RUB; always per month; digits grouped, currency shown.

## User Scenarios & Testing *(mandatory)*

An **opportunity** is a vacancy as a student sees it. It is **active** while it is Open and its deadline has not passed
(002 FR-009). Every student page here needs a signed-in student with a profile (003).

### User Story 1 - Student views active opportunities (Priority: P1)

A student opens Opportunities and sees every active internship, vacancy and research opportunity with its title, type
and deadline, plus the company, place and required skills that help decide whether to open it.

**Why this priority**: It is what students come for, and what makes posted vacancies visible at all.

**Independent Test**: With Open, Paused, Closed, Draft and expired vacancies, the list holds exactly the Open ones whose
deadline has not passed.

**Acceptance Scenarios**:

1. **Given** a signed-in student with a profile and active opportunities, **When** they open Opportunities, **Then** each
   active one is listed with title, type and deadline, and no closed, paused, draft or expired one is.
2. **Given** no active opportunities, **When** they open Opportunities, **Then** a clear message says none are available yet.
3. **Given** a student without a profile, **When** they open Opportunities, **Then** they are sent to create it first and
   come back afterwards.
4. **Given** a guest or an employer, **When** they try to reach Opportunities, **Then** they do not see it.
5. **Given** an employer edits, pauses or closes a vacancy, **When** the student next loads the list, **Then** it shows
   the new details or no longer shows the vacancy.

---

### User Story 2 - Student opens an opportunity (Priority: P1)

The student opens an opportunity from the list and reads everything the employer published: title, type, description,
requirements, deadline and the facts about the job and company. Back returns them to the list as they left it.

**Why this priority**: The list alone is not enough to decide anything.

**Independent Test**: Open an active opportunity, compare every field with what the employer entered, press Back.

**Acceptance Scenarios**:

1. **Given** the list, **When** the student selects an opportunity, **Then** its page shows title, type, description,
   requirements (Required and Nice to have skills) and deadline.
2. **Given** that page, **When** they choose Back, **Then** they are on the list with the same search, filters and page.
3. **Given** an opportunity that is closed, paused, a draft, past its deadline or does not exist, **When** the student
   opens its address, **Then** no details are shown and a message says it is no longer available, with a way back.

---

### User Story 3 - Student searches and filters (Priority: P1)

The student types a keyword, picks a type (Internship, Vacancy or Research) and narrows by format, city and field.

**Why this priority**: Without it a long list is not usable.

**Independent Test**: With known data, each keyword and filter combination returns exactly the matching active
opportunities, and Clear restores all.

**Acceptance Scenarios**:

1. **Given** several active opportunities, **When** the student enters a keyword and selects a type, **Then** only active
   opportunities matching both are shown, with their number.
2. **Given** a search or filters, **When** they choose Clear, **Then** the full active list is back.
3. **Given** a combination nothing matches, **When** it is applied, **Then** no opportunity is shown and a message says no
   matching opportunities were found, with a way to clear.
4. **Given** a filtered list, **When** they reload, share or use the browser's Back, **Then** the same search is shown.

---

### User Story 4 - Employer posts a research opportunity (Priority: P2)

Research is one more type next to Internship, Full-time and Part-time when posting or editing; students can also say they
look for research positions in their profile.

**Why this priority**: Students can browse without it, but the Research filter has nothing to show.

**Independent Test**: Post a Research vacancy; it is listed as Research for the employer and for students.

**Acceptance Scenarios**:

1. **Given** an employer with a company profile, **When** they post an opportunity, **Then** they can choose Research, and
   after publishing students find it in Opportunities under Research.
2. **Given** an existing vacancy, **When** the employer changes its type to or from Research, **Then** it is saved.
3. **Given** required fields are empty, **When** they publish a Research opportunity, **Then** it is refused with the
   fields to fix, as for every type.
4. **Given** a student's profile, **When** they choose what they look for, **Then** Research is among the choices.

---

### User Story 5 - Salary is readable and has a currency (Priority: P1)

The employer enters a monthly salary as from / to amounts and picks a currency (tenge by default). Everyone sees grouped
digits with the currency.

**Why this priority**: "1000000" cannot be read at a glance and says nothing about the currency.

**Independent Test**: Post 1000000 tenge; the form, the employer's pages and the student's card and page show it grouped
with ₸.

**Acceptance Scenarios**:

1. **Given** the salary fields, **When** the employer types 1000000, **Then** the field shows "1 000 000" and the currency is ₸.
2. **Given** from 200 000 and to 300 000, **When** published, **Then** students see "200 000 – 300 000 ₸ / month"; with only
   one amount "From 200 000 ₸ / month" or "Up to 300 000 ₸ / month"; with equal amounts one number; with none, no salary.
3. **Given** another currency is chosen, **When** saved, **Then** it is shown everywhere and kept when editing.
4. **Given** "from" is greater than "to", or an amount is not a whole number from 1 to 999 999 999, **When** saving, **Then**
   it is refused at the field and what was typed is kept.
5. **Given** a vacancy saved earlier with a plain number as text, **When** the database is upgraded, **Then** it shows as that
   amount in tenge.

---

### Edge Cases

- The opportunity closes while the student reads the list: opening it shows "no longer available".
- Keyword with extra spaces, different letter case, or `%` / `_`: spaces are ignored, case does not matter, the symbols
  are matched literally. Several words must all match, in any order.
- An address with unknown filter values or a page beyond the last: unknown values are ignored, the last page is shown.
- Changing the search or any filter returns to the first page.
- Fast typing: the shown results always belong to the latest search.
- An employer account without a company profile: its vacancies are not listed (there is no company to show).
- Two opportunities with the same date keep a stable order, so paging never repeats or skips one.
- Loading or network failure: an error with "Try again"; the search and filters stay.

## Requirements *(mandatory)*

### Functional Requirements

**List**

- **FR-001**: The system MUST list active opportunities only, to signed-in students with a profile only.
- **FR-002**: Each listed opportunity MUST show title, type and deadline, and company name, city, format, Required
  skills, and duration and salary when given.
- **FR-003**: The list MUST be sorted by newest published (default) or by closing soonest, and paged 10 at a time.
- **FR-004**: The list MUST show a message that none are available yet when there are no active opportunities.

**Details**

- **FR-005**: A student MUST be able to open each listed opportunity and see title, type, description, Required and Nice
  to have skills, deadline, city, format, field, and duration and salary when given, with the company's name, industry,
  size, city, description and website when given.
- **FR-006**: The page MUST offer Back to the list, keeping its search, filters, sort and page.
- **FR-007**: An opportunity that is not active or does not exist MUST show no details, only that it is no longer
  available; the answer MUST be the same in every such case.

**Search and filters**

- **FR-008**: Students MUST be able to search by keyword in title, company name and skills, case-insensitively; every
  word MUST match.
- **FR-009**: Students MUST be able to filter by one type: Internship, Vacancy (Full-time and Part-time) or Research.
- **FR-010**: Students MUST be able to filter by format, city and field; several values of one filter widen it,
  different filters combine, and all combine with the keyword and type.
- **FR-011**: "Clear filters" MUST remove the keyword, type and filters; no results MUST be told apart from "none yet".
- **FR-012**: Search, filters, sort and page MUST be kept in the page's address; unknown values MUST be ignored.

**Research type**

- **FR-013**: Research MUST be a type an employer can choose when posting and editing, with the same rules as the others,
  and MUST be shown wherever a type is shown.
- **FR-014**: Students MUST be able to choose Research among the position types in their profile.
- **FR-015**: Existing vacancies and profiles MUST stay unchanged (salary: FR-022).

**Salary**

- **FR-020**: Salary MUST be optional monthly amounts "from" and "to" (whole numbers 1–999 999 999, from ≤ to, either may be
  empty) with a currency: KZT (default), USD, EUR, RUB. This replaces the free text of 002 FR-001.
- **FR-021**: Amounts MUST be shown with grouped thousands that never break across lines and with the currency, wherever a
  salary is shown and while it is typed. Pasting an amount with spaces, commas or a currency sign MUST work.
- **FR-022**: Earlier text salaries that are a plain amount MUST become that amount in tenge (from = to); other texts MUST
  NOT be destroyed by the upgrade.

**Access and scope**

- **FR-016**: Guests MUST be sent to sign in, employers refused and students without a profile sent to create it.
- **FR-017**: Students MUST NOT receive a vacancy's owner account, sign-in email, version, status history or counts.
- **FR-018**: The application MUST NOT show match scores, Apply, Save, or the student demo pages (Home, Applications,
  Saved) and demo notifications; their addresses lead to Opportunities.
- **FR-019**: Every screen MUST have loading, empty, error and success states, work from 390 px, and be usable by keyboard
  and screen reader; results MUST be announced when they change.

### Key Entities

- **Opportunity**: an active vacancy (002) together with its employer's company profile (003), read-only for students.
- **Opportunity type**: Internship, Full-time, Part-time, Research; students filter by Internship, Vacancy, Research.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A student finds a known opportunity by keyword and opens it in under 30 seconds.
- **SC-002**: 100% of listed and opened opportunities are active at that moment.
- **SC-003**: Every QA-sheet scenario of the source stories passes as an automated test.
- **SC-004**: With 1,000 active opportunities, results appear within 1 second of the last keystroke or click.
- **SC-005**: Returning from an opportunity restores the same list in 100% of cases.
- **SC-006**: Every screen passes an automated accessibility check and has no horizontal scroll at 390 px and 1440 px.

## Assumptions

- Statuses, deadline rule and "active" come from 002; company data and the profile requirement from 003.
- "Requirements" in the backlog are the Required and Nice to have skills plus the description's text.
- Guest browsing (`/vacancies`), applying, saving, matching and ranking are separate features. The rule that students who
  saved or applied can still open a paused or closed vacancy (002 FR-017) arrives with those features.
- `design-system/ia.md` is amended: student section name, addresses and menu. `/app/vacancies` addresses redirect.
- The list is refreshed when opened or searched; it is not live.
- Research is posted by the same employer accounts; universities as separate organisations are out of scope.
