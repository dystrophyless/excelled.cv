# Product backlog — status by iteration

Source: the team's Google Sheet "Smart Internship and Career Matching Platform — Product Backlog" (sheet `main`, plus one
`User Story N` and one `USNQATest` sheet per story with responsibilities, constraints, test scripts and Given/When/Then
acceptance criteria). The QA sheets are the acceptance tests for each story. Last checked: 2026-11-22.

| Iteration (deadline) | Story | Status | Feature |
|---|---|---|---|
| 1 (18.09.2026) | US-01 Learn About the Platform | ❌ demo landing only — real page with Create Account / Log In needed | 005 |
| 1 | US-02 Create an Account | ✅ | 001-user-auth |
| 1 | US-03 Choose User Role | ⚠️ role is chosen on the sign-up form with Student preselected, so the QA case "continue without selecting a role → message" cannot occur | 005 (fix) |
| 1 | US-04 Log In | ✅ | 001-user-auth |
| 2 (02.10.2026) | US-05 Create Student Profile | ✅ | 003-profiles |
| 2 | US-06 Create HR Profile | ✅ | 003-profiles |
| 2 | US-07 Edit Profile | ✅ | 003-profiles |
| 3 (16.10.2026) | US-08 Create Opportunity | ⚠️ done except the type "research opportunity" (types are internship / full-time / part-time); the "has an HR profile" pre-requirement is enforced since 003 | 002 + 004 |
| 3 | US-09 Edit Opportunity | ✅ (students seeing the update arrives with US-11) | 002-employer-vacancies |
| 3 | US-10 Close Opportunity | ✅ (hiding from students arrives with US-11; rules already exported) | 002-employer-vacancies |
| 4 (30.10.2026) | US-11 View Opportunities | ❌ | 004 |
| 4 | US-12 View Opportunity Details | ❌ | 004 |
| 4 | US-13 Search and Filter Opportunities | ❌ (filter by type internship / vacancy / research) | 004 |
| 5 (13.11.2026) | US-14 Upload CV | ❌ | 006 |
| 5 | US-15 Replace Uploaded CV | ❌ | 006 |
| 5 | US-16 Remove Uploaded CV | ❌ | 006 |
| 6 (27.11.2026) | US-17 Extract Skills from CV · US-18 Review Extracted Skills · US-19 View Profile Analysis | — | later |
| 7 (11.12.2026) | US-20 AI-Matched Opportunities · US-21 Match Score · US-22 Career Recommendations · US-23 Recommended Candidates | — | later |

Order of work: 003 (profiles are a pre-requirement of US-08 and US-11) → 004 student opportunities (+ research type) →
005 landing + role-choice fix → 006 CV.
