import { api, apiBlob, encodeHeaderText } from "@/lib/api";
import type { CvFile, CvFormat, CvLimits } from "./model";

/* Typed calls for specs/006-cv/contracts/cv-api.md + the API <-> view-model mapping. */

export type ApiCv = { id: string; file_name: string; format: CvFormat; size_bytes: number; uploaded_at: string };
export type ApiCvState = { cv: ApiCv | null; limits: { formats: CvFormat[]; max_bytes: number } };

/** What the CV query caches: the stored CV (or none) and the limits the server enforces. */
export type CvState = { cv: CvFile | null; limits: CvLimits };

/** Not under the profile's key: the CV request failing must never take the profile with it. Cleared at sign-out with the rest. */
export const cvKey = ["student-cv"] as const;

const BASE = "/api/student/cv";

export const toCv = (c: ApiCv): CvFile => ({ id: c.id, fileName: c.file_name, format: c.format, sizeBytes: c.size_bytes, uploadedAt: c.uploaded_at });

export const toCvState = (s: ApiCvState): CvState => ({
  cv: s.cv ? toCv(s.cv) : null,
  limits: { formats: s.limits.formats, maxBytes: s.limits.max_bytes },
});

/** The `cv` of a 409 body (`cv_exists`, `cv_changed`): the current CV, null when none, undefined when the body had none. */
export const currentCvOf = (detail: Record<string, unknown> | undefined): CvFile | null | undefined => {
  if (!detail || !("cv" in detail)) return undefined;
  const c = detail.cv as ApiCv | null;
  return c ? toCv(c) : null;
};

export const getCv = async (signal?: AbortSignal): Promise<CvState> => toCvState(await api<ApiCvState>(BASE, { signal }));

const fileRequest = (file: File) => ({
  body: file,
  headers: { "Content-Type": "application/octet-stream", "X-File-Name": encodeHeaderText(file.name) },
});

export const uploadCv = async (file: File): Promise<CvFile> => toCv(await api<ApiCv>(BASE, { method: "POST", ...fileRequest(file) }));

export const downloadCv = (id: string): Promise<Blob> => apiBlob(`${BASE}/${encodeURIComponent(id)}/file`);
