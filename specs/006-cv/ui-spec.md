# UI spec: Student CV

**Feature**: `006-cv` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Status**: Approved (2026-11-25)
**Designer**: ui-designer · **Prototype**: `/prototypes/006-cv/profile`

## 1. Screens

| # | Screen | Route | Role / layout | Archetype | Reference template | User stories |
|---|---|---|---|---|---|---|
| S1 | My profile with CV (changes 003 S2) | `/app/profile` | Student / StudentLayout | Detail (own profile) | `/styleguide/templates/profile` | US1, US2, US3 |
| S1a | Replace dialog | dialog on S1 | Student | Modal | — | US2 |
| S1b | Remove dialog | dialog on S1 | Student | Modal | — | US3 |

## 2. Screen details

### S1 — My profile with CV

**Goal**: keep one CV file on the profile: add it, swap it for a newer one, remove it.

**Where the CV lives, and why**: in the owner panel (the Tray beside the profile card), between "Complete your profile"
and "Coming soon". It takes the place of "Coming soon: CV".
- The panel is the private side of the page ("Only you can see your profile for now"). The CV is a private file, not a
  fact on the profile, so it does not belong in the profile card, which stays exactly as approved.
- The panel is sticky on desktop, so the CV is in view without scrolling the long card.
- Below the checklist, so the checklist never jumps when the CV block changes height.
- Trade-off: below 1024 the panel follows the card, so on mobile the CV is at the bottom of the page.

The two-column structure, header, card and checklist are unchanged. CV is not counted in "n of 6 added" (optional, managed
outside the edit form).

**Layout**:
```
PageHeader: "My profile" · actions [Primary "Edit profile"]            (unchanged)
TwoColumn end 360 sticky
  main:  Card (profile)                                               (unchanged)
  aside: Tray
    header: lock "Only you can see your profile for now"
    card:   Complete your profile (while something is missing)
            ── divider ──
            CvBlock: h2 "CV" · [notice Alert] · one of: drop zone | chosen file | stored CV
            ── divider ──
            Coming soon: Skills
    footer: "Updated …"
Modal S1a (replace) · Modal S1b (remove)
```
`StudentProfileView` gets an optional `cv?: CvBlockProps`. Without it the panel keeps "Coming soon: CV" (fallback while
the design is unapproved). With it the CV row leaves "Coming soon".

**Copy** (exact):
| Element | Text |
|---|---|
| Block heading | CV |
| Status beside the heading (no CV) | No CV yet (muted, right of "CV") |
| Drop zone title | Choose a file or drop it here ("or drop it here" is hidden on touch devices, `pointer: coarse`) |
| Drop zone hint (inside the zone, always visible, also beside an error) | PDF or DOCX, up to 5 MB. |
| Identity link (below 1024 only) | Add CV · CV uploaded · CV (while loading or failed) |
| Chosen file meta | `PDF · 530 KB` (format · size) |
| Upload button (secondary) / cancel (ghost) | Upload CV / Cancel |
| Uploading meta | Uploading… |
| Stored meta / status | `PDF · 482 KB` / `Uploaded 25 Nov 2026` (check icon) |
| Stored actions | Download (secondary) · Replace (secondary) · Remove (ghost) |
| Refused: format | This isn't a PDF or DOCX file. |
| Refused: empty | This file is empty. |
| Refused: too large | This file is larger than 5 MB. |
| Refused: content | This file is damaged or not a real PDF or DOCX. |
| After any refusal | the rule stays visible: in the zone (hint above); with a stored CV as a muted line under the error, "PDF or DOCX, up to 5 MB." |
| Upload failed | Couldn't upload your CV. Your file is still selected, so you can try again. |
| Replace failed (in dialog) | Couldn't replace your CV. Your current CV is unchanged. |
| Remove failed (in dialog) | Couldn't remove your CV. It is still saved. |
| Download failed | Couldn't download your CV. Try again. |
| Load error | title "Couldn't load your CV" · "Check your connection and try again." · [Try again] |
| Notice: added elsewhere | "A CV was added in another tab" · "This is the current CV. Nothing was overwritten." |
| Notice: replaced elsewhere | "Your CV was replaced in another tab" · "This is the current CV. Nothing was overwritten." |
| Notice: removed elsewhere | "Your CV was removed in another tab" · "There is no CV now. You can upload a new one." |

The notices make sense with or without a pending file of the student (a draft is dropped when it appears).
| Replace dialog | title "Replace your CV?" · "The new file becomes your only CV. The current file is deleted and can't be restored." · labels Current / New (name, `PDF · size`, current also "Uploaded date") · [Keep current CV] (secondary) [Replace CV] (primary) |
| Remove dialog | title "Remove your CV?" · "The file is deleted from your profile and can't be restored. The rest of your profile stays as it is." · the file · [Keep CV] (secondary) [Remove CV] (destructive) |
| Toasts | CV uploaded · CV replaced · CV removed |

No sentence says employers see the CV, that it is used to apply, or that skills are read from it (FR-016).

**States** (`?state=`):
| State | What the user sees | Real page trigger |
|---|---|---|
| uploaded (default) | stored CV, three actions | CV exists |
| loading | skeleton of the stored row + 2 buttons; rest of panel real | CV query pending |
| load-error | inline error + Try again; rest of page works; never says "no CV" | CV query failed |
| none | drop zone | `cv: null` |
| refused-format / -empty / -size / -content | zone with error beneath, nothing kept | client check or 413/422 |
| chosen | file row + Upload CV + Cancel | file passed the client check |
| uploading | Upload CV shows loading, Cancel disabled, meta "Uploading…", block `aria-busy` | POST pending |
| upload-failed | chosen state + error; same file, retry by Upload CV | POST failed |
| replace-refused | stored CV stays + dismissible error beneath | replacement file refused |
| replace-confirm | dialog naming Current and New | valid file chosen while a CV exists |
| replacing / replace-failed | dialog buttons busy / error inside the dialog, old CV visible behind | PUT pending / failed |
| remove-confirm / removing / remove-failed | dialog / busy / error inside the dialog | DELETE |
| changed-added / -replaced / -removed | warning notice above the (now current) CV or zone; the student's draft is dropped | 409 `cv_exists` / `cv_changed` (with `cv` or null) |
| downloading / download-failed | Download busy / error beneath actions, CV intact | fetch + blob |
| long-name / cyrillic-name | cut in the middle ("Maya_Akhmetova_curri…n_2026.docx"): the end with the extension stays, no gap before it; fitted by measuring and refitted on resize; whole name in `title`, in the accessible text and, wrapped, in dialogs | — |

**Mobile identity link** (`CvJump`, only with the `cv` prop, hidden from 1024 where the panel is beside the card): the last item of the identity facts row (icon + text like "Almaty", underlined as a link), `href="#cv-block"`. Click scrolls the block to the centre of the screen (instantly with `prefers-reduced-motion`) and focuses the block (labelled "CV"). It is not a banner and not a settings row.

**Interactions**:
- Choosing or dropping a file never stores it. The zone checks extension, empty, size, then the first bytes (PDF `%PDF-`,
  DOCX `PK`) — same order as the server — and shows the first problem beside the zone.
- Replace opens the file picker (a kit button over a hidden input). A valid file opens the dialog; Keep current CV,
  Esc and the backdrop cancel; while saving they are disabled.
- Remove opens its dialog; Keep CV, Esc and the backdrop cancel.
- Download fetches the file and saves it under the stored name; failure shows inline.
- Errors from a refused replace or download are dismissible; notices are dismissible.
- Resolved (owner left the choice to us): "Upload CV" stays secondary; Download stays.
  layer: Replace CV is that dialog's primary, Remove CV is destructive.

**Keyboard and screen reader (FR-017)**:
- Tab order inside the block: zone (focusable file input; Enter / Space opens the picker) → or Upload CV → Cancel →
  or Download → Replace → Remove. Dialogs use the native `<dialog>` focus trap; Esc closes; focus returns to the opener. Initial focus in both dialogs is the safe button ("Keep current CV" / "Keep CV"), not the Close X (kit `Modal`: an element with `data-autofocus` takes the first focus).
- Focus after a result: file chosen → **Upload CV**; upload or replacement succeeded → the stored-CV group (`tabIndex=-1`,
  labelled "Your CV: <name>"); removed, cancelled or refused → the drop zone's input.
- Announcements: toasts (`role=status`) for uploaded / replaced / removed; every error and notice is an Alert with
  `role=alert`; the zone's refusal is the Field error (`role=alert`, linked with `aria-describedby`); the block has
  `aria-busy` while loading or uploading. The visible heading "CV" labels the section.
- Buttons have visible text as their names; no icon-only controls.

**Responsive**: 1440 / 1024: panel in the right column, sticky. Below 1024 (390): the panel follows the card at full
width; the actions wrap; dialogs use the kit Modal width. No horizontal scroll with 100-character and Cyrillic names.

**Test hooks**: roles and names (`Upload CV`, `Cancel`, `Download`, `Replace`, `Remove`, `Replace CV`, `Remove CV`,
`Keep current CV`, `Keep CV`, `Try again`); `data-testid`: `cv-block`, `cv-zone`, `cv-chosen`, `cv-stored`, `cv-file`,
`cv-status`, `cv-error`, `cv-notice`, `cv-load-error`, `cv-replace-input` (hidden file input for Replace),
`cv-replace-dialog`, `cv-remove-dialog`.

## 3. Components

- Existing: `Tray`, `Card`, `Button`, `Alert`, `Modal`, `Skeleton`, `Icon`, `FileUpload`.
- **Changed kit components** (Novio-owned, not affect ports): `FileUpload` gains `onFile` (the caller validates; the zone only reports the file and shows the caller's `error`), `zoneHint` (line inside the zone, linked by `aria-describedby`), `hideLabel`, `prompt` as ReactNode, optional `value` / `onChange`. `Modal`: `data-autofocus` takes the first focus. `FactList`: optional `trailing` `<li>`. Documented in `components.md`.
- **Feature views** (not kit): `CvBlock`, `CvFileRow` in `features/cv/views/`, own `cv.module.css` (tokens only).
  The file row is flat (icon tile + name + meta), like Education entries, so there is no card inside the card.

## 4. Data contract for views

```ts
type CvBlockProps = {
  state: "loading" | "error" | "ready";
  cv: { id: string; fileName: string; format: "pdf" | "docx"; sizeBytes: number; uploadedAt: string } | null;
  limits: { formats: ("pdf" | "docx")[]; maxBytes: number };
  pending?: { name: string; size: number } | null;   // chosen, not stored. With a CV stored it opens the replace dialog
  busy?: "uploading" | "replacing" | "removing" | "downloading";
  confirmRemove?: boolean;                             // remove dialog open
  error?: "format" | "empty" | "too-large" | "content" | "upload-failed" | "replace-failed" | "remove-failed" | "download-failed";
  notice?: "added" | "replaced" | "removed";           // changed in another tab
  onChoose(file: File): void;                          // parent runs checkCvFile() and sets pending or error
  onUpload(): void; onCancelPending(): void; onConfirmReplace(): void;
  onAskRemove(): void; onConfirmRemove(): void; onCancelRemove(): void;
  onDownload(): void; onRetryLoad?(): void; onDismissError?(): void; onDismissNotice?(): void;
};
// StudentProfileViewProps gains: cv?: CvBlockProps
```
`checkCvFile`, types and `cvErrorText` are in `features/cv/model.ts`. `replace-failed` / `remove-failed` render inside
their dialogs; all other errors render in the block.

## 5. Open questions

- Resolved (owner left the choice to us): "Upload CV" stays secondary; Download stays.
- Resolved: the panel stays below the card on mobile; the identity link leads to it.
- The prototype fails a file whose name contains "fail" once, to demo failure; real behaviour comes from the API.

## 6. Revision log

| Round | Date | Feedback (user) | Changes made |
|---|---|---|---|
| 1 | 2026-11-25 | — (first review) | — |
| 2 | 2026-11-25 | Owner: empty state is a status, not an instruction; keep the rules visible after a refusal and shorten errors; demo names must match the profile (Maya Akhmetova); no gap before the extension in a long name; mobile link to the CV under the identity; also fix whatever else is wrong, choose the best | Status "No CV yet" beside the heading; zone says "Choose a file or drop it here" + always-visible hint; errors shortened, rules stay visible (also with a stored CV); names Maya_Akhmetova_*; middle truncation by measuring; `CvJump` identity link below 1024 (scroll + focus, reduced motion); notices reworded to fit with nothing pending; dialogs focus "Keep …" first; state bar hidden in screenshots |

## 7. Approval

- Approved by the product owner on: 2026-11-25
- Approved screenshots: `design/screens/` (every state × desktop/mobile)
