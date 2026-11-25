# Research: Student CV

## R1. Storage
- **Decision**: One row per CV in `student_cvs`; content in a `bytea` column (PostgreSQL
  default TOAST storage). The ORM column is deferred and only the download selects it.
- **Rationale**: Owner's decision. One transaction covers metadata and content: no orphan files, atomic replacement,
  deletion by cascade.
- **Alternatives**: server disk (separate backups, orphan cleanup), S3 (new service and credentials).

## R2. Upload transport
- **Decision**: The body is the raw file. The name travels in `X-File-Name`, percent-encoded UTF-8. The handler checks
  `Content-Length` early, then counts streamed bytes and stops with 413 above the limit. Receiving is limited to 60 s (408).
- **Rationale**: Multipart parsing spools the whole body before the handler runs, so a size limit would come too late.
  A header keeps personal file names out of access logs, unlike a query parameter.
- **Alternatives**: multipart `UploadFile`; base64 in JSON (33% larger, whole body in memory).

## R3. Database connection during upload
- **Decision**: Access checks run first; the handler then commits to return the connection to the pool, receives the
  body, and opens a short write transaction that re-checks the profile.
- **Rationale**: The pool has 15 connections; slow uploads would otherwise block the whole API.

## R4. Format detection
- **Decision**: Extension and content must agree. PDF: `%PDF-` in the first 1024 bytes. DOCX: a readable ZIP directory
  containing `[Content_Types].xml` and `word/document.xml`, and no `vbaProject.bin`. Nothing is decompressed; at most
  2000 entries. The browser's `Content-Type` is ignored. Download media type comes from the detected format.
- **Rationale**: Rejects renamed files without a parser dependency or decompression risk.
- **Alternatives**: libmagic (native dependency, awkward on Windows); full parsing (belongs to skill extraction).

## R5. Concurrency
- **Decision**: The CV id is a UUID that changes on every replacement. `POST` creates and is refused when one exists;
  `PUT`/`DELETE` address the id and are refused with 409 `cv_changed` (current CV in the body, or null) when it is no
  longer current. Uniqueness is guaranteed by a unique `profile_id`. Replacement is a single conditional UPDATE.
- **Rationale**: No silent overwrite (FR-011), and one round trip. An unknown id and another student's id are
  indistinguishable.
- **Alternatives**: upsert (overwrites silently); profile version (would conflict with an open profile form).

## R6. Download
- **Decision**: `Content-Disposition: attachment` with an RFC 5987 name and an ASCII fallback,
  `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`, `Cache-Control: private, no-store`.
  The SPA downloads by `fetch` + blob, so a failure can be shown in place.
- **Alternatives**: plain link (errors replace the page with JSON); inline preview (out of scope).

## R7. File names
- **Decision**: Last path segment only, NFC, control and bidi-formatting characters removed, whitespace collapsed,
  trimmed to 150 characters keeping the extension. An empty stem becomes `CV`.

## R8. Submit and confirmation
- **Decision**: Choosing a file never stores it; a separate "Upload CV" / "Replace CV" action does. Replace and remove
  show which file is affected.
- **Rationale**: The acceptance tests say "selects ... and submits" and "confirms replacement".
