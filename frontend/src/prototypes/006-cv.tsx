import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { StateSwitcher, useViewState } from "@/components/dev";
import { toast } from "@/components/ui";
import { CATALOG, ROUTES, STUDENT } from "@/features/profiles/mocks";
import { StudentProfileView } from "@/features/profiles/views/StudentProfileView";
import { CV_CYRILLIC, CV_LONG, CV_STORED, PICK_NEW } from "@/features/cv/mocks";
import { CV_LIMITS, checkCvFile, cvFormatOf, type CvError, type CvFile, type CvLoadState, type CvNotice, type CvPick } from "@/features/cv/model";
import type { CvBlockProps } from "@/features/cv/views/CvBlock";

/*
 * Prototype wiring for 006-cv: the profile page with the CV block, clickable end to end.
 * Real file picking and real client checks (checkCvFile); the "server" is a timer.
 * A file whose name contains "fail" is refused by the fake server once (upload and replace), then works on retry.
 * Preview states that show a request in flight (uploading, replacing, removing, downloading) hold until the state changes.
 */

export const CV_STATES = [
  "uploaded", "loading", "load-error", "none",
  "refused-format", "refused-empty", "refused-size", "refused-content",
  "chosen", "uploading", "upload-failed",
  "replace-refused", "replace-confirm", "replacing", "replace-failed",
  "remove-confirm", "removing", "remove-failed",
  "changed-added", "changed-replaced", "changed-removed",
  "downloading", "download-failed", "long-name", "cyrillic-name",
] as const;
type CvPreviewState = (typeof CV_STATES)[number];

type Model = {
  load: CvLoadState;
  cv: CvFile | null;
  pending: CvPick | null;
  busy?: CvBlockProps["busy"];
  confirmRemove: boolean;
  error?: CvError;
  notice?: CvNotice;
};

function initial(s: CvPreviewState): Model {
  const base: Model = { load: "ready", cv: CV_STORED, pending: null, confirmRemove: false };
  switch (s) {
    case "loading": return { ...base, load: "loading", cv: null };
    case "load-error": return { ...base, load: "error", cv: null };
    case "none": return { ...base, cv: null };
    case "refused-format": return { ...base, cv: null, error: "format" };
    case "refused-empty": return { ...base, cv: null, error: "empty" };
    case "refused-size": return { ...base, cv: null, error: "too-large" };
    case "refused-content": return { ...base, cv: null, error: "content" };
    case "chosen": return { ...base, cv: null, pending: PICK_NEW };
    case "uploading": return { ...base, cv: null, pending: PICK_NEW, busy: "uploading" };
    case "upload-failed": return { ...base, cv: null, pending: PICK_NEW, error: "upload-failed" };
    case "replace-refused": return { ...base, error: "format" };
    case "replace-confirm": return { ...base, pending: PICK_NEW };
    case "replacing": return { ...base, pending: PICK_NEW, busy: "replacing" };
    case "replace-failed": return { ...base, pending: PICK_NEW, error: "replace-failed" };
    case "remove-confirm": return { ...base, confirmRemove: true };
    case "removing": return { ...base, confirmRemove: true, busy: "removing" };
    case "remove-failed": return { ...base, confirmRemove: true, error: "remove-failed" };
    case "changed-added": return { ...base, notice: "added" };
    case "changed-replaced": return { ...base, notice: "replaced" };
    case "changed-removed": return { ...base, cv: null, notice: "removed" };
    case "downloading": return { ...base, busy: "downloading" };
    case "download-failed": return { ...base, error: "download-failed" };
    case "long-name": return { ...base, cv: CV_LONG };
    case "cyrillic-name": return { ...base, cv: CV_CYRILLIC };
    default: return base;
  }
}

const SERVER_MS = 1100;

function useCvModel(start: CvPreviewState) {
  const [m, setM] = useState<Model>(() => initial(start));
  const failOnce = useRef(true);
  const set = (patch: Partial<Model>) => setM((x) => ({ ...x, ...patch }));
  const later = (fn: () => void) => window.setTimeout(fn, SERVER_MS);
  const fails = (name: string) => name.toLowerCase().includes("fail") && failOnce.current;

  const stored = (file: CvPick): CvFile => ({
    id: `cv-${Date.now()}`, fileName: file.name, format: cvFormatOf(file.name) ?? "pdf", sizeBytes: file.size, uploadedAt: "2026-11-25",
  });

  const props: CvBlockProps = {
    state: m.load,
    cv: m.cv,
    limits: CV_LIMITS,
    pending: m.pending,
    busy: m.busy,
    confirmRemove: m.confirmRemove,
    error: m.error,
    notice: m.notice,
    onChoose: async (file) => {
      const refusal = await checkCvFile(file, CV_LIMITS);
      if (refusal) set({ error: refusal, pending: null, notice: undefined });
      else set({ pending: { name: file.name, size: file.size }, error: undefined, notice: undefined });
    },
    onUpload: () => {
      const file = m.pending;
      if (!file) return;
      set({ busy: "uploading", error: undefined });
      later(() => {
        if (fails(file.name)) { failOnce.current = false; set({ busy: undefined, error: "upload-failed" }); return; }
        set({ busy: undefined, cv: stored(file), pending: null });
        toast.success("CV uploaded");
      });
    },
    onCancelPending: () => set({ pending: null, error: undefined }),
    onConfirmReplace: () => {
      const file = m.pending;
      if (!file) return;
      set({ busy: "replacing", error: undefined });
      later(() => {
        if (fails(file.name)) { failOnce.current = false; set({ busy: undefined, error: "replace-failed" }); return; }
        set({ busy: undefined, cv: stored(file), pending: null });
        toast.success("CV replaced");
      });
    },
    onAskRemove: () => set({ confirmRemove: true, error: undefined, notice: undefined }),
    onCancelRemove: () => set({ confirmRemove: false, error: undefined }),
    onConfirmRemove: () => {
      set({ busy: "removing", error: undefined });
      later(() => {
        set({ busy: undefined, cv: null, confirmRemove: false });
        toast.success("CV removed");
      });
    },
    onDownload: () => {
      const cv = m.cv;
      if (!cv) return;
      set({ busy: "downloading", error: undefined });
      later(() => {
        // The prototype has no server file: it hands over a tiny stand-in under the stored name
        const url = URL.createObjectURL(new Blob(["%PDF-1.4\n% prototype stand-in\n"], { type: "application/octet-stream" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = cv.fileName;
        a.click();
        URL.revokeObjectURL(url);
        set({ busy: undefined });
      });
    },
    onRetryLoad: () => { set({ load: "loading" }); later(() => set({ load: "ready", cv: CV_STORED })); },
    onDismissError: () => set({ error: undefined }),
    onDismissNotice: () => set({ notice: undefined }),
  };
  return props;
}

function Inner({ state }: { state: CvPreviewState }) {
  const navigate = useNavigate();
  const cv = useCvModel(state);
  return (
    <StudentProfileView
      state="ready"
      profile={STUDENT}
      catalog={CATALOG}
      routes={{ edit: ROUTES.edit }}
      onRetry={() => navigate(ROUTES.profile)}
      cv={cv}
    />
  );
}

export function CvProfilePrototype() {
  const state = useViewState(CV_STATES);
  return (
    <>
      <Inner key={state} state={state} />
      <StateSwitcher states={CV_STATES} />
    </>
  );
}
