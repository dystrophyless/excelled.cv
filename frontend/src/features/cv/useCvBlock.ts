import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { cvKey, currentCvOf, downloadCv, uploadCv, type CvState } from "./api";
import { handleSessionError, useCv } from "./hooks";
import { CV_LIMITS, checkCvFile, type CvError, type CvFile, type CvNotice, type CvRefusal } from "./model";
import type { CvBlockProps } from "./views/CvBlock";

/** The server's refusal codes (413 / 422) as the model's errors. A refused request stores nothing. */
const REFUSALS: Record<string, CvRefusal> = {
  cv_empty: "empty",
  cv_format_unsupported: "format",
  cv_too_large: "too-large",
  cv_name_invalid: "format",
};

export const CV_TOASTS = { uploaded: "CV uploaded", replaced: "CV replaced", removed: "CV removed" } as const;

const refusalOf = (error: unknown): CvRefusal | undefined => {
  if (!(error instanceof ApiError)) return undefined;
  return REFUSALS[error.code] ?? (error.status === 413 ? "too-large" : undefined);
};

/** The server cleans a name (last segment, NFC, collapsed whitespace); do the same to compare it with the chosen file's. */
const cleanName = (name: string) => (name.split(/[\\/]/).pop() ?? name).normalize("NFC").replace(/\s+/g, " ").trim();

/** The stored CV is the file this tab just sent: an upload whose answer was lost, then retried. */
const isSameFile = (cv: CvFile, file: File) => cv.sizeBytes === file.size && cv.fileName === cleanName(file.name);

/** Save a blob under `name` (the object URL is revoked right after the click). */
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * The CV block of /app/profile (ui-spec S1): CV query, the chosen file, upload and download, mapped to `CvBlockProps`.
 * Replace (T010) and remove (T012) slot into the same state: `pending` + `busy`, `error`, `notice`, `confirmRemove`.
 */
export function useCvBlock(): CvBlockProps {
  const queryClient = useQueryClient();
  const query = useCv();
  const [pending, setPending] = useState<File | null>(null);
  const [error, setError] = useState<CvError | undefined>();
  const [notice, setNotice] = useState<CvNotice | undefined>();
  const [busy, setBusy] = useState<CvBlockProps["busy"]>();

  const limits = query.data?.limits ?? CV_LIMITS;
  const cv = query.data?.cv ?? null;

  // a request in flight (state would lag behind a fast double click) and the latest file choice (checks are async)
  const running = useRef(false);
  const choice = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const store = useCallback((state: CvState) => queryClient.setQueryData<CvState>(cvKey, state), [queryClient]);

  /** The server says the CV is `current` now (409): show it, drop the draft, explain. */
  const adopt = useCallback((current: CvFile | null | undefined, why: CvNotice) => {
    if (current === undefined) {
      void queryClient.invalidateQueries({ queryKey: cvKey });
    } else {
      store({ cv: current, limits: queryClient.getQueryData<CvState>(cvKey)?.limits ?? limits });
    }
    setPending(null);
    setError(undefined);
    setNotice(why);
  }, [limits, queryClient, store]);

  const onChoose = useCallback(async (file: File) => {
    if (running.current) return;
    // T010: with a CV stored the chosen file opens the replace dialog; until then the choice is ignored (no inert dialog)
    if (cv) return;
    const mine = ++choice.current;
    setNotice(undefined);
    let refusal: CvRefusal | null;
    try {
      refusal = await checkCvFile(file, limits);
    } catch {
      refusal = "content"; // the file could not be read (moved, permission): same wording as a damaged file
    }
    if (mine !== choice.current || !mounted.current) return; // another file was chosen meanwhile
    setPending(refusal ? null : file);
    setError(refusal ?? undefined);
  }, [cv, limits]);

  const onUpload = useCallback(async () => {
    if (!pending || running.current) return;
    running.current = true;
    const file = pending;
    setBusy("uploading");
    setError(undefined);
    try {
      const stored = await uploadCv(file);
      store({ cv: stored, limits });
      setPending(null);
      toast.success(CV_TOASTS.uploaded);
    } catch (e) {
      if (!mounted.current) return;
      const refusal = refusalOf(e);
      if (refusal) {
        setPending(null);
        setError(refusal);
      } else if (e instanceof ApiError && e.code === "cv_exists") {
        const current = currentCvOf(e.detail);
        if (current && isSameFile(current, file)) {
          // our own earlier attempt arrived although its answer was lost
          store({ cv: current, limits });
          setPending(null);
          toast.success(CV_TOASTS.uploaded);
        } else {
          adopt(current, "added");
        }
      } else if (!handleSessionError(queryClient, e)) {
        setError("upload-failed"); // network, 5xx, 408: the file stays selected for a retry
      }
    } finally {
      running.current = false;
      if (mounted.current) setBusy(undefined);
    }
  }, [adopt, limits, pending, queryClient, store]);

  const onDownload = useCallback(async () => {
    if (!cv || running.current) return;
    running.current = true;
    setBusy("downloading");
    setError(undefined);
    try {
      saveBlob(await downloadCv(cv.id), cv.fileName);
    } catch (e) {
      if (!mounted.current) return;
      if (e instanceof ApiError && e.code === "cv_changed") {
        const current = currentCvOf(e.detail);
        adopt(current, current ? "replaced" : "removed");
      } else if (!handleSessionError(queryClient, e)) {
        setError("download-failed");
      }
    } finally {
      running.current = false;
      if (mounted.current) setBusy(undefined);
    }
  }, [adopt, cv, queryClient]);

  const onCancelPending = useCallback(() => {
    choice.current++;
    setPending(null);
    setError(undefined);
  }, []);

  return {
    state: query.data ? "ready" : query.isError ? "error" : "loading",
    cv,
    limits,
    pending,
    busy,
    confirmRemove: false, // T012
    error,
    notice,
    onChoose: (file) => void onChoose(file),
    onUpload: () => void onUpload(),
    onCancelPending,
    onConfirmReplace: () => { /* T010 */ },
    onAskRemove: () => { /* T012 */ },
    onConfirmRemove: () => { /* T012 */ },
    onCancelRemove: () => { /* T012 */ },
    onDownload: () => void onDownload(),
    onRetryLoad: () => void query.refetch(),
    onDismissError: () => setError(undefined),
    onDismissNotice: () => setNotice(undefined),
  };
}
