/*
 * 006-cv: types and the client-side checks of the CV block (quick feedback only — the server checks again, FR-003).
 * Shapes follow specs/006-cv/contracts/cv-api.md.
 */

export type CvFormat = "pdf" | "docx";

/** The stored CV (server metadata; never the file content). */
export type CvFile = { id: string; fileName: string; format: CvFormat; sizeBytes: number; uploadedAt: string };

export type CvLimits = { formats: CvFormat[]; maxBytes: number };

export const CV_LIMITS: CvLimits = { formats: ["pdf", "docx"], maxBytes: 5 * 1024 * 1024 };

/** A file the student chose and that is not stored yet (a browser `File` fits). */
export type CvPick = { name: string; size: number };

/** Why a chosen file is refused (client check first, the server's 413 / 422 codes map to the same). */
export type CvRefusal = "format" | "empty" | "too-large" | "content";

/** What can go wrong beside the control. */
export type CvError = CvRefusal | "upload-failed" | "replace-failed" | "remove-failed" | "download-failed";

/** The CV changed in another tab: it was added / replaced / removed there (409 cv_exists / cv_changed). */
export type CvNotice = "added" | "replaced" | "removed";

export type CvLoadState = "loading" | "error" | "ready";

export function cvFormatOf(name: string): CvFormat | null {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return ext === "pdf" || ext === "docx" ? ext : null;
}

export function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const formatLabel = (f: CvFormat) => f.toUpperCase();

const hasAt = (bytes: Uint8Array, text: string) => {
  const needle = Array.from(text, (c) => c.charCodeAt(0));
  for (let i = 0; i + needle.length <= bytes.length; i++) if (needle.every((b, j) => bytes[i + j] === b)) return true;
  return false;
};

/**
 * Same order as the server: extension → empty / size → content. Content: a PDF has "%PDF-" in its first 1024 bytes,
 * a DOCX starts like a ZIP ("PK"). Returns the refusal or null when the file may be sent.
 */
export async function checkCvFile(file: File, limits: CvLimits = CV_LIMITS): Promise<CvRefusal | null> {
  const format = cvFormatOf(file.name);
  if (!format || !limits.formats.includes(format)) return "format";
  if (file.size === 0) return "empty";
  if (file.size > limits.maxBytes) return "too-large";
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const ok = format === "pdf" ? hasAt(head, "%PDF-") : head[0] === 0x50 && head[1] === 0x4b;
  return ok ? null : "content";
}

/** The accepted formats and size, one line: "PDF or DOCX, up to 5 MB". */
export const cvHint = (l: CvLimits = CV_LIMITS) => `${l.formats.map(formatLabel).join(" or ")}, up to ${maxMb(l)} MB`;

const maxMb = (l: CvLimits) => Math.round(l.maxBytes / 1024 / 1024);

/** Exact copy of every CV error (ui-spec §2 copy table). */
export function cvErrorText(error: CvError, limits: CvLimits = CV_LIMITS): string {
  switch (error) {
    case "format": return "This isn't a PDF or DOCX file.";
    case "empty": return "This file is empty.";
    case "too-large": return `This file is larger than ${maxMb(limits)} MB.`;
    case "content": return "This file is damaged or not a real PDF or DOCX.";
    case "upload-failed": return "Couldn't upload your CV. Your file is still selected, so you can try again.";
    case "replace-failed": return "Couldn't replace your CV. Your current CV is unchanged.";
    case "remove-failed": return "Couldn't remove your CV. It is still saved.";
    case "download-failed": return "Couldn't download your CV. Try again.";
  }
}

/** Wording that also fits when the student had nothing pending (the change was found on a refresh). */
export const NOTICE_TEXT: Record<CvNotice, { title: string; body: string }> = {
  added: { title: "A CV was added in another tab", body: "This is the current CV. Nothing was overwritten." },
  replaced: { title: "Your CV was replaced in another tab", body: "This is the current CV. Nothing was overwritten." },
  removed: { title: "Your CV was removed in another tab", body: "There is no CV now. You can upload a new one." },
};
