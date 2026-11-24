# Feature Specification: Student CV

**Feature Branch**: `006-cv`

**Created**: 2026-11-25

**Status**: Draft

**Input**: User description: "006 CV: upload, replace and remove the student's CV (US-14, US-15, US-16)."

## Clarifications

### Session 2026-11-25

- Q: Which file formats are accepted? → A: PDF and DOCX, checked by content as well as by extension.
- Q: What is the maximum size? → A: 5 MB. Empty files are refused.
- Q: Where are the files kept? → A: In the platform's database.
- Q: Who can see and download a CV? → A: Only the student who owns it. Employer access arrives with applications or
  recommended candidates and is out of scope here.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload a CV (Priority: P1)

A student with a profile adds a CV file on the profile page and sees that it is stored.

**Why this priority**: Nothing else in this feature, nor later skill extraction, works without a stored CV.

**Independent Test**: With a profile and no CV, upload a valid file, reload, and see its name and status; try invalid files.

**Acceptance Scenarios**:

1. **Given** a student with a profile and no CV, **When** they open the profile page, **Then** it says no CV is uploaded,
   names the accepted formats and size limit, and offers to upload one.
2. **Given** that page, **When** they choose a valid PDF or DOCX and submit the upload, **Then** the file is saved to
   their profile and its name and status are shown.
3. **Given** an uploaded CV, **When** the page is reloaded, **Then** the same CV is shown.
4. **Given** that page, **When** they choose an unsupported, empty or oversized file, **Then** it is not saved and a
   message says what is wrong and what is accepted.
5. **Given** a chosen valid file, **When** the upload fails (connection or server), **Then** an error is shown, nothing
   is saved, and the student can retry without choosing the file again.
6. **Given** an uploaded CV, **When** the student downloads it, **Then** they receive the same file under its name.

---

### User Story 2 - Replace the CV (Priority: P2)

A student swaps the stored CV for a newer file.

**Why this priority**: An out-of-date CV is worse than none once it is used for matching.

**Independent Test**: With a CV stored, replace it with a valid file, then try an invalid file.

**Acceptance Scenarios**:

1. **Given** an uploaded CV, **When** the student chooses a valid new file, **Then** they see which file will be replaced
   by which and must confirm.
2. **Given** that confirmation, **When** they confirm, **Then** the new file becomes the only CV and is shown as such,
   also after a reload; the old file is no longer stored.
3. **Given** that confirmation, **When** they cancel, **Then** the existing CV is unchanged.
4. **Given** an uploaded CV, **When** the replacement is invalid or fails, **Then** the existing CV stays and a clear
   error is shown.

---

### User Story 3 - Remove the CV (Priority: P3)

A student removes the stored CV and keeps the rest of the profile.

**Why this priority**: Control over a personal document; needed less often than adding or updating.

**Independent Test**: With a CV stored, remove it, confirm, reload; check that no remove action is offered without a CV.

**Acceptance Scenarios**:

1. **Given** an uploaded CV, **When** the student chooses to remove it, **Then** they are asked to confirm.
2. **Given** that confirmation, **When** they confirm, **Then** the file is permanently removed and the profile shows
   that no CV is uploaded, also after a reload; the account and profile are unchanged.
3. **Given** that confirmation, **When** they cancel, **Then** the CV stays.
4. **Given** no CV, **When** the student views the profile, **Then** no remove, replace or download action is shown.
5. **Given** that confirmation, **When** removal fails, **Then** an error is shown and the CV stays.

### Edge Cases

- A file whose content does not match its extension, or a damaged document container: refused as unsupported.
- A file at exactly 5 MB is accepted; one byte more is refused.
- Names that are long, non-Latin or contain special characters are shown and downloaded safely; the extension survives.
- The CV was added, replaced or removed in another tab: a later action does not silently overwrite or remove a file the
  student has not seen; the current state is shown with an explanation.
- The same action is triggered twice: at most one CV is stored.
- The CV cannot be loaded: the rest of the profile is usable, and the CV part offers a retry without claiming none exists.
- The session ends during an action: the student is led to sign in; the stored CV is unchanged.
- Editing the profile does not affect the CV, and changing the CV does not cause a conflict in an open profile form.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A signed-in student with a profile MUST be able to upload one CV from the profile page.
- **FR-002**: PDF and DOCX files of 1 byte to 5 MB (5 × 1024 × 1024 bytes) MUST be accepted; everything else MUST be refused.
- **FR-003**: Format and size MUST be checked before upload for quick feedback and always again by the server, which MUST
  check content and extension together and stop receiving once the limit is exceeded.
- **FR-004**: The profile page MUST show the CV's name, size, upload date and status, or that none is uploaded.
- **FR-005**: The stored CV MUST be exactly the uploaded file; the owner MUST be able to download it.
- **FR-006**: Choosing a file MUST NOT store it until the student submits; replacing MUST require confirmation that names
  both files.
- **FR-007**: A profile MUST have at most one CV. Replacement MUST be all-or-nothing and MUST NOT keep the previous file.
- **FR-008**: Removal MUST require confirmation, permanently delete the file, and leave the profile and account unchanged.
- **FR-009**: Replace, download and remove MUST be offered only when a CV exists.
- **FR-010**: A failed action MUST leave the stored CV unchanged, show what happened, and allow another attempt.
- **FR-011**: A replace or remove based on an outdated view, or a first upload when a CV already exists, MUST be refused
  and the current CV shown.
- **FR-012**: Only the owner MUST be able to read, download, replace or remove the CV. Guests, employers and other
  students MUST be refused without learning whether a CV exists.
- **FR-013**: A student without a profile MUST be refused.
- **FR-014**: Downloads MUST never be run or displayed as active content in the platform's origin, nor kept in shared caches.
- **FR-015**: Deleting an account or profile MUST delete its CV.
- **FR-016**: The profile page MUST no longer announce CV as "Coming soon", and MUST NOT promise what does not exist
  (applying with the CV, employers viewing it, skill extraction).
- **FR-017**: All actions, results and errors MUST be usable by keyboard and announced to screen readers.

### Key Entities

- **CV**: the one document of a student profile: original name, format, size, upload time, content. Its identity changes
  with each replacement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After choosing a file, a student stores it with one action.
- **SC-002**: 100% of unsupported, mismatched, empty and oversized files in the test set are refused with a stated reason.
- **SC-003**: In 100% of failed replacements and removals the earlier CV is still available and byte-identical.
- **SC-004**: 100% of access attempts by anyone but the owner are refused.
- **SC-005**: Every acceptance scenario of the upload, replace and remove QA sheets passes.

## Assumptions

- "Status" means that the CV is uploaded and when; there is no review or processing status until skill extraction exists.
- CV is not part of onboarding and stays optional; it is managed on the profile page, outside the profile edit form.
- Malware scanning, previews, version history, skill extraction and employer access are out of scope.
- Password-protected PDF files are accepted; whether text can be read from them matters to skill extraction later.
