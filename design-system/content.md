# Content and microcopy

Novio speaks English (US spelling). Copy is part of the design: a ui-spec lists the exact strings.

## Voice

- **Students:** friendly, direct, encouraging. They are early in their careers — explain, don't judge.
- **Employers:** professional, brief, efficient. They scan; lead with numbers and status.
- Both: plain words, short sentences, no jargon ("ATS", "pipeline velocity"), no exclamation marks except a real celebration ("Offer received!").

## Mechanics

| Rule | Do | Don't |
|---|---|---|
| Case | Sentence case: "Post a vacancy" | Title Case, ALL CAPS (except tiny affect labels that already use it) |
| Buttons | verb (+ object): "Apply now", "Save changes", "Add skills" | "OK", "Submit", "Yes", "Click here" |
| Links | say where they go: "See all vacancies" | "here", "more" |
| Labels | noun, no colon: "Email" | "Enter your email:" |
| Placeholders | an example: "you@university.edu" | repeat the label; instructions |
| Hints | why / format, one line: "At least 8 characters" | rules that belong in validation |
| Numbers | digits: "3 of 5", "48 applicants" | "three of five" |
| Money | `200 000 ₸ / month` (space thousands, ₸ after) | "200,000 KZT" |
| Dates | "30 Nov", "Tue, 4 Nov · 14:00" (24h) | "11/30/2026", "2pm" |
| Relative time | "2h ago", "yesterday", "3 days ago" up to 7 days, then a date | "48 hours ago" |
| Separators | " · " between meta items | commas, pipes |
| Ellipsis | "…" (one char) for loading: "Searching…" | "..." |

## Patterns

**Errors** — what happened + how to fix, no blame:
- Field: "Enter a year like 2027", "Enter a full link starting with https://". Never "Invalid input".
- Form summary (Alert): "Fix 2 fields to save" + list.
- Load error: title "Couldn't load vacancies", body "Check your connection and try again.", button "Try again".
- Auth: "Wrong email or password" (never say which one).

**Empty states** — title says what's empty or what to do; one sentence on why it matters; one action:
- First run: "No applications yet" · "When you apply, you'll follow each step here." · [Browse vacancies]
- No results: "No vacancies match these filters" · "Try removing a filter…" · [Clear filters]

**Confirmations** (Modal): title is the question with the object — "Withdraw application?";
description names the consequence — "Kaspi.kz will no longer see…"; buttons name the actions — [Keep it] [Withdraw].

**Toasts** — past tense, ≤ 5 words, optional one-line detail: "Application sent", "Saved", "Link copied".

**Statuses** (`APPLICATION_STATUS`): Applied · Viewed · Shortlisted · Interview · Offer · Hired · Not selected · Withdrawn.
Students never see "Rejected".

**Matching:** "Strong match" (≥ 75) · "Good match" (50–74) · "Partial match" (< 50) · "Required 3 of 4" ·
"Nice to have 1 of 2" · "Add Docker to your profile if you know it — it raises your match the most."
Never shame: no "You're missing 4 skills", no red for missing skills.

## Glossary

| Use | Not |
|---|---|
| vacancy (an internship or job) | job posting, opening, position |
| internship / full-time / part-time | stage, practice |
| apply, application | submit, request |
| candidate (employer side), applicant (counts: "48 applicants") | user, student (on employer screens) |
| skills, Required / Nice to have | requirements, competencies, levels |
| match, match score | compatibility, rating |
| saved | favorites, bookmarks |
| company profile | organization |
