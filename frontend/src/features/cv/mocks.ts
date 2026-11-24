import type { CvFile, CvPick } from "./model";

/* Mock data for the 006-cv prototype ("today" is 25 Nov 2026). */

export const CV_STORED: CvFile = { id: "cv-1", fileName: "Maya_Akhmetova_CV.pdf", format: "pdf", sizeBytes: 482 * 1024, uploadedAt: "2026-11-25" };

export const CV_LONG: CvFile = {
  id: "cv-2",
  fileName: "Maya_Akhmetova_curriculum_vitae_software_engineering_internship_application_final_version_2026.docx",
  format: "docx",
  sizeBytes: Math.round(1.3 * 1024 * 1024),
  uploadedAt: "2026-11-25",
};

export const CV_CYRILLIC: CvFile = { id: "cv-3", fileName: "Резюме_Майя_Ахметова_стажировка_в_Алматы_backend_разработчик_2026.pdf", format: "pdf", sizeBytes: 913 * 1024, uploadedAt: "2026-11-25" };

/** The file chosen in the "chosen / uploading / replace" states. */
export const PICK_NEW: CvPick = { name: "Maya_Akhmetova_CV_2026.pdf", size: 530 * 1024 };

/** What the refused states show (the file is not kept). */
export const PICK_TOO_LARGE: CvPick = { name: "Portfolio_scans.pdf", size: Math.round(7.2 * 1024 * 1024) };
