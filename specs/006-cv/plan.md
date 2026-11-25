# Implementation Plan: Student CV

**Branch**: `006-cv` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-cv/spec.md`

## Summary

A student keeps one PDF or DOCX CV (up to 5 MB) on the profile page. A new `src/cv/` module adds one table, which holds
metadata and content, and owner-only endpoints to read, upload, replace, download and remove. Uploads are raw request
bodies limited while they arrive; format is decided from content and extension. Every replace or remove names the CV it
is based on, so an outdated tab cannot overwrite a newer file. The profile page gains a CV block; CV leaves "Coming
soon". Decisions: [research.md](./research.md).

## Technical Context

**Language/Version**: Python 3.13; TypeScript strict, React 19

**Primary Dependencies**: FastAPI, SQLAlchemy 2 async (psycopg 3); Vite, TanStack Query 5, Novio UI kit. No new dependency.

**Storage**: PostgreSQL, new table `student_cvs` ([data-model.md](./data-model.md)), created by `create_tables`

**Testing**: pytest on `TEST_DATABASE_URL` (`novio_test`), `tests/cv/`; Playwright + axe `frontend/e2e/cv.spec.ts`
(mocked API), one suite at a time in the foreground

**Target Platform**: Linux server; current browsers, 1440 and 390

**Project Type**: Web application

**Performance Goals**: reading the profile and CV metadata never loads file content; at most 5 MB + one chunk buffered per upload

**Constraints**: owner-only; all-or-nothing writes; no database connection held while a body is received; English UI

**Scale/Scope**: 1 changed screen, its dialogs, 5 endpoints, 1 table

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec-driven delivery | Pass: the owner settled formats, size, storage and access before planning |
| II. One design system | Pass: Detail (own profile), existing `FileUpload` and `Modal`; no new archetype expected |
| III. Owner approves design | Pass: `/speckit-design` follows this plan |
| IV. Every state designed | Pass: states listed below |
| V. Verify, then claim | Pass: [quickstart.md](./quickstart.md) |

Re-checked after Phase 1: no violations.

## UI Surface

| Screen | Route | Role | Archetype (proposed) | API it needs |
|--------|-------|------|----------------------|--------------|
| S1 My profile with CV (changed 003 S2) | `/app/profile` | Student | Detail (own profile) | [cv-api.md](./contracts/cv-api.md), `GET /student/profile` (existing) |
| S1a Confirm replacement | dialog or inline on S1 | Student | — | `PUT /student/cv/{id}` |
| S1b Confirm removal | dialog on S1 | Student | — | `DELETE /student/cv/{id}` |

CV states: loading; load error with retry (rest of the page works); none; file chosen; refused (format, empty, too large,
content mismatch); uploading; upload failed (file kept, retry); uploaded; replacing: chosen / refused / saving / failed
(old CV visible); removing: confirm / saving / failed; changed in another tab (added / replaced / removed); downloading
failed; long and Cyrillic file names.

Design constraints: the approved two-column profile stays; the CV block has one clear place and is not a second page or a
settings row; no promises about applying, employers or skills (FR-016); CV is optional. `FileUpload` currently claims
"Replace" in its comment but offers only Remove on a local `File`; the stored CV is server metadata, so it needs its own
presentation.

## Project Structure

### Documentation (this feature)

```text
specs/006-cv/
├── spec.md  plan.md  research.md  data-model.md  quickstart.md
├── contracts/cv-api.md
├── ui-spec.md, design/    # /speckit-design
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
src/cv/{__init__,models,formats,repository,router,schemas}.py
src/main.py, src/models.py, src/scripts/create_tables.py   # registration
src/profiles/dependencies.py                               # shared "student with a profile" guard
tests/cv/{test_upload,test_replace,test_remove,test_download,test_access}.py
frontend/src/lib/api.ts                                    # raw body, extra headers
frontend/src/features/cv/{api,hooks,model}.ts, views/
frontend/src/features/profiles/StudentProfilePage.tsx, views/
frontend/src/prototypes/006-cv.tsx
frontend/e2e/cv.spec.ts
design-system/ia.md, README.md, CHANGELOG.md, specs/backlog.md
```

**Structure Decision**: a separate `cv` module on both sides: the CV has its own lifecycle, independent of the profile
form and its version.
