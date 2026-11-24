# Product backlog — status by iteration

Source: the team's Google Sheet "Smart Internship and Career Matching Platform — Product Backlog" (sheet `main`, plus one
`User Story N` and one `USNQATest` sheet per story with responsibilities, constraints, test scripts and Given/When/Then
acceptance criteria). The QA sheets are the acceptance tests for each story. Last checked: 2026-11-24.

| Iteration (deadline) | Story | Status | Feature |
|---|---|---|---|
| 1 (18.09.2026) | US-01 Learn About the Platform | ✅ one public landing at `/` for students and HR with Create account / Log in; `/employers`, `/vacancies`, `/vacancies/:id` lead to `/`; signed-in users go to their home | 005-landing-role-choice |
| 1 | US-02 Create an Account | ✅ | 001-user-auth |
| 1 | US-03 Choose User Role | ✅ the role is chosen on the first registration step, before the account is created (owner's decision), with nothing preselected, so the QA case "continue without selecting a role → message" is covered | 005-landing-role-choice |
| 1 | US-04 Log In | ✅ | 001-user-auth |
| 2 (02.10.2026) | US-05 Create Student Profile | ✅ | 003-profiles |
| 2 | US-06 Create HR Profile | ✅ | 003-profiles |
| 2 | US-07 Edit Profile | ✅ | 003-profiles |
| 3 (16.10.2026) | US-08 Create Opportunity | ✅ the "research" type was added in 004; the "has an HR profile" pre-requirement is enforced since 003 | 002 + 004 |
| 3 | US-09 Edit Opportunity | ✅ (students see the update in Opportunities since 004) | 002-employer-vacancies |
| 3 | US-10 Close Opportunity | ✅ (closed vacancies are hidden from students since 004) | 002-employer-vacancies |
| 4 (30.10.2026) | US-11 View Opportunities | ✅ | 004-student-opportunities |
| 4 | US-12 View Opportunity Details | ✅ | 004-student-opportunities |
| 4 | US-13 Search and Filter Opportunities | ✅ (filter by type internship / vacancy / research) | 004-student-opportunities |
| 5 (13.11.2026) | US-14 Upload CV | ❌ | 006 |
| 5 | US-15 Replace Uploaded CV | ❌ | 006 |
| 5 | US-16 Remove Uploaded CV | ❌ | 006 |
| 6 (27.11.2026) | US-17 Extract Skills from CV · US-18 Review Extracted Skills · US-19 View Profile Analysis | — | later |
| 7 (11.12.2026) | US-20 AI-Matched Opportunities · US-21 Match Score · US-22 Career Recommendations · US-23 Recommended Candidates | — | later |

Order of work: next 006 CV. (Done: 003 profiles, 004 student opportunities with the research type, 005 landing and
role choice.)
