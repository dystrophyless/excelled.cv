---
description: "Task list for 006-cv: Student CV"
---

# Tasks: Student CV

**Input**: Design documents from `/specs/006-cv/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cv-api.md, quickstart.md, ui-spec.md
(**Approved 2026-11-25**)

**Tests**: REQUIRED (constitution IV, V): API tests on `novio_test`, Playwright + axe with a mocked API per story.

## Novio UI rules for tasks

- Views are wired, not redesigned: `frontend/src/features/cv/views/CvBlock.tsx`, `StudentProfileView`. UI tasks are marked
  **(ui-builder)**; the screen is ui-spec S1 with S1a (replace) and S1b (remove).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

No setup tasks: no new dependency.

## Phase 2: Foundational

- [ ] T001 Model `StudentCv` in `src/cv/models.py` per data-model.md (`id` uuid; `profile_id` unique, not null, FK `student_profiles.id` `ON DELETE CASCADE`; `file_name` varchar(150); `format` enum `cv_format` (`pdf`, `docx`); `size_bytes` check 1..5242880; `content` bytea deferred, check `octet_length(content) = size_bytes`; `uploaded_at` timestamptz); register in `src/models.py`, `src/scripts/create_tables.py`, `tests/conftest.py`
- [ ] T002 `src/cv/formats.py`: name cleaning (research R7) and format detection (R4), with unit tests in `tests/cv/test_formats.py`
- [ ] T003 `src/cv/receive.py`: streamed body with the size limit and 60 s timeout (R2)
- [ ] T004 (ui-builder) `frontend/src/lib/api.ts`: raw body with extra headers and a blob download, reusing the error mapping; `frontend/src/features/cv/api.ts` and `hooks.ts` (contracts/cv-api.md), server refusal codes mapped to the model's errors

## Phase 3: User Story 1 - Upload a CV (P1) 🎯 MVP

**Independent test**: upload a valid file, reload, see it, download it; invalid files are refused.

- [ ] T005 [US1] `GET` and `POST /api/student/cv`, `GET /api/student/cv/{id}/file` in `src/cv/{router,repository,schemas}.py`, registered in `src/main.py`; the student-with-profile check is in one place; the connection is released while the body arrives (R3)
- [ ] T006 [US1] `tests/cv/test_upload.py`, `test_download.py`, `test_access.py`: every contract status; exactly 5 MB and one byte more, with and without `Content-Length`; mismatched, damaged, macro, empty; names (Cyrillic, path, control, bidi, long); second POST and concurrent POSTs; byte-identical download and headers; guest, employer, no profile, other student, foreign origin; profile deletion removes the CV; profile version untouched
- [ ] T007 [US1] (ui-builder) S1: wire loading, error with retry, none, chosen, refused, uploading, failed with retry, stored, download into `frontend/src/features/profiles/StudentProfilePage.tsx` through `frontend/src/features/cv/useCvBlock.ts`; the CV request failing never hides the profile
- [ ] T008 [US1] (ui-builder) `frontend/e2e/cv.spec.ts` and `frontend/e2e/support/cv-api.ts`: the QA scenarios, refusals by client and server, retry without re-choosing, reload, download, changed-added, focus, mobile link, axe; CV mock defaults in specs that open the profile page (`frontend/e2e/profiles.spec.ts`)

## Phase 4: User Story 2 - Replace the CV (P2)

**Independent test**: replace with a valid file; an invalid one leaves the old CV.

- [ ] T009 [US2] `PUT /api/student/cv/{id}` as one conditional UPDATE (R5) and `tests/cv/test_replace.py`: new id and date, old bytes gone, refusals keep bytes, stale and foreign ids give 409 `cv_changed`, concurrent replacements, removed meanwhile
- [ ] T010 [US2] (ui-builder) S1a wiring and e2e in `frontend/e2e/cv.spec.ts`: both names, confirm, cancel, Esc, invalid, failure with retry, changed-replaced, axe

## Phase 5: User Story 3 - Remove the CV (P3)

**Independent test**: confirm removal, reload: no CV and no remove action.

- [ ] T011 [US3] `DELETE /api/student/cv/{id}` and `tests/cv/test_remove.py`: row gone, profile unchanged, stale and foreign ids, repeated, upload after removal
- [ ] T012 [US3] (ui-builder) S1b wiring and e2e: confirm, cancel, failure keeps the CV, reload, no replace / remove / download without a CV, changed-removed, axe; then make `cv` a required prop of `StudentProfileView`, drop the "Coming soon: CV" fallback, and pass a CV in the 003 prototype

## Phase 6: Polish

- [ ] T013 [P] Documentation (Sonnet worker): `design-system/ia.md`, `README.md`, `CHANGELOG.md`, `specs/backlog.md`
- [ ] T014 Run quickstart.md checks one at a time: pytest, build, lint, lint:css, every e2e file
- [ ] T015 Design QA (`/speckit-design-qa`) and its fixes

## Dependencies

T001–T003 → T005 → T006 → T009 → T011. T004 → T007 → T008 → T010 → T012. Backend and frontend touch different files and
may run side by side; heavy checks run one at a time.

## Strategy

US1 alone is a usable increment; US2 and US3 each add one action on top.
