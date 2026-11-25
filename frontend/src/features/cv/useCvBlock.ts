import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { cvKey, currentCvOf, downloadCv, removeCv, replaceCv, uploadCv, type CvState } from "./api";
import { handleSessionError, useCv } from "./hooks";
import { CV_LIMITS, checkCvFile, type CvError, type CvFile, type CvNotice, type CvRefusal } from "./model";
import type { CvBlockProps } from "./views/CvBlock";

/** The server's refusal codes (413 / 422) as the model's errors. A refused request stores nothing. */
const REFUSALS: Record<string, CvRefusal> = {
  cv_empty: "empty",
  // the client already accepted the extension, so the server saying "not PDF/DOCX" means the content disagrees with it
  cv_format_unsupported: "content",
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

/** The stored CV is the file this tab sent: a request whose answer was lost, then retried or seen on a refresh. */
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

/** A file the student chose, and the id of the CV they were looking at (null: none) when they chose it. */
type Draft = { file: File; forId: string | null };

type Busy = NonNullable<CvBlockProps["busy"]>;

/**
 * The CV block of /app/profile (ui-spec S1, S1a, S1b): CV query, the chosen file, upload, replace, remove and download,
 * mapped to `CvBlockProps`.
 *
 * Safety rules (spec FR-011): a replace or remove only ever targets the id the student saw when choosing / asking.
 * If the CV changes underneath (a refetch shows another id), the draft or dialog is dropped and a notice explains.
 * A request that finishes after the page is gone never writes into the cache (it could show this account's CV to the
 * next one); it only invalidates.
 */
export function useCvBlock(): CvBlockProps {
  const queryClient = useQueryClient();
  const query = useCv();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [askedId, setAskedId] = useState<string | null>(null);
  const [error, setError] = useState<CvError | undefined>();
  const [notice, setNotice] = useState<CvNotice | undefined>();
  const [busy, setBusy] = useState<Busy | undefined>();

  const limits = query.data?.limits ?? CV_LIMITS;
  const cv = query.data?.cv ?? null;
  const cvId = cv?.id ?? null;

  // The file is only "pending" (and the replace dialog only open) while the CV is the one the student chose it for.
  const pending = draft && draft.forId === cvId ? draft.file : null;
  const confirmRemove = askedId !== null && askedId === cvId;

  const running = useRef(false); // a request in flight (state lags behind a fast double click)
  const choice = useRef(0); // the latest file choice (checks are async)
  const mounted = useRef(true);
  const cvIdRef = useRef(cvId);
  const baseline = useRef<string | null | undefined>(undefined); // the CV id the student has been shown last
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { cvIdRef.current = cvId; });

  /** Our own result goes into the cache: stop a refetch that started earlier from overwriting it, then write. */
  const apply = useCallback(async (next: CvFile | null): Promise<boolean> => {
    await queryClient.cancelQueries({ queryKey: cvKey });
    if (!mounted.current) {
      void queryClient.invalidateQueries({ queryKey: cvKey });
      return false;
    }
    baseline.current = next?.id ?? null;
    const cached = queryClient.getQueryData<CvState>(cvKey);
    queryClient.setQueryData<CvState>(cvKey, { cv: next, limits: cached?.limits ?? limits });
    return true;
  }, [limits, queryClient]);

  /**
   * The CV changed under the draft / dialog (a refetch showed another id): drop them and say why. Runs on every cache
   * update of the CV query, and when our own request ends; never while it runs (it writes its own result).
   */
  const lostRemove = useRef<string | null>(null); // the id of a DELETE whose answer was lost (it may have been applied)
  const draftRef = useRef(draft);
  useEffect(() => { draftRef.current = draft; });
  const checkChange = useCallback(() => {
    const data = queryClient.getQueryData<CvState>(cvKey);
    if (!data || running.current || !mounted.current) return;
    const now = data.cv?.id ?? null;
    const before = baseline.current;
    baseline.current = now;
    if (before === undefined || before === now) return;
    if (now === null && lostRemove.current === before) {
      // our own removal arrived although its answer was lost
      lostRemove.current = null;
      toast.success(CV_TOASTS.removed);
      setAskedId(null);
      setError(undefined);
      return;
    }
    const d = draftRef.current;
    if (d && data.cv && d.forId !== now && isSameFile(data.cv, d.file)) {
      // our own request arrived although its answer was lost
      toast.success(d.forId === null ? CV_TOASTS.uploaded : CV_TOASTS.replaced);
      setDraft(null);
      setError(undefined);
      return;
    }
    setDraft(null);
    setAskedId(null);
    setError(undefined);
    setNotice(before === null ? "added" : now === null ? "removed" : "replaced");
  }, [queryClient]);
  useEffect(() => {
    checkChange();
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.query.queryKey[0] === cvKey[0]) checkChange();
    });
  }, [queryClient, checkChange]);

  /** The server answered 409: `current` is the CV now. */
  const adopt = useCallback(async (current: CvFile | null | undefined, why: CvNotice) => {
    if (current === undefined) void queryClient.invalidateQueries({ queryKey: cvKey });
    else if (!(await apply(current))) return;
    setDraft(null);
    setAskedId(null);
    setError(undefined);
    setNotice(why);
  }, [apply, queryClient]);

  /** One request at a time. Refetches are cancelled first; a request finishing after unmount only invalidates. */
  const exec = useCallback(async <T,>(
    kind: Busy,
    request: () => Promise<T>,
    ok: (value: T) => Promise<void>,
    fail: (error: unknown) => Promise<void> | void,
  ) => {
    if (running.current) return;
    running.current = true;
    setBusy(kind);
    setError(undefined);
    try {
      await queryClient.cancelQueries({ queryKey: cvKey });
      let value: T;
      try {
        value = await request();
      } catch (e) {
        if (!mounted.current) void queryClient.invalidateQueries({ queryKey: cvKey });
        else if (!handleSessionError(queryClient, e)) await fail(e);
        return;
      }
      if (!mounted.current) {
        void queryClient.invalidateQueries({ queryKey: cvKey });
        return;
      }
      await ok(value);
    } finally {
      running.current = false;
      if (mounted.current) {
        setBusy(undefined);
        checkChange(); // a refetch during our request may have shown another CV
      }
    }
  }, [queryClient, checkChange]);

  const onChoose = useCallback(async (file: File) => {
    if (running.current) return;
    const seen = cvIdRef.current;
    const mine = ++choice.current;
    setNotice(undefined);
    let refusal: CvRefusal | null;
    try {
      refusal = await checkCvFile(file, limits);
    } catch {
      refusal = "content"; // the file could not be read (moved, permission): same wording as a damaged file
    }
    if (mine !== choice.current || !mounted.current) return; // another file was chosen meanwhile
    if (cvIdRef.current !== seen) return; // the CV changed while the file was read: the notice already says so
    setDraft(refusal ? null : { file, forId: seen });
    setError(refusal ?? undefined);
  }, [limits]);

  const succeeded = async (stored: CvFile, message: string) => {
    if (!(await apply(stored))) return;
    setDraft(null);
    toast.success(message);
  };

  const onUpload = () => {
    if (!draft || draft.forId !== null || cvId !== null) return;
    const file = draft.file;
    void exec("uploading", () => uploadCv(file), (stored) => succeeded(stored, CV_TOASTS.uploaded), async (e) => {
      const refusal = refusalOf(e);
      if (refusal) {
        setDraft(null);
        setError(refusal);
      } else if (e instanceof ApiError && e.code === "cv_exists") {
        const current = currentCvOf(e.detail);
        if (current && isSameFile(current, file)) await succeeded(current, CV_TOASTS.uploaded); // our earlier attempt arrived
        else await adopt(current, "added");
      } else {
        setError("upload-failed"); // network, 5xx, 408: the file stays selected for a retry
      }
    });
  };

  const onConfirmReplace = () => {
    if (!draft || draft.forId === null || draft.forId !== cvId) return;
    const { file, forId } = draft;
    void exec("replacing", () => replaceCv(forId, file), (stored) => succeeded(stored, CV_TOASTS.replaced), async (e) => {
      const refusal = refusalOf(e);
      if (refusal) {
        setDraft(null); // the dialog closes, the old CV stays, the refusal shows in the block
        setError(refusal);
      } else if (e instanceof ApiError && e.code === "cv_changed") {
        const current = currentCvOf(e.detail);
        if (current && isSameFile(current, file)) await succeeded(current, CV_TOASTS.replaced); // our earlier attempt arrived
        else await adopt(current, current === null ? "removed" : "replaced");
      } else {
        setError("replace-failed"); // the dialog stays with the error; the old CV is unchanged
      }
    });
  };

  const onConfirmRemove = () => {
    const id = askedId;
    if (id === null || id !== cvId) return;
    const removed = async () => {
      lostRemove.current = null;
      if (!(await apply(null))) return;
      setAskedId(null);
      toast.success(CV_TOASTS.removed);
    };
    void exec("removing", () => removeCv(id), removed, async (e) => {
      if (e instanceof ApiError && e.code === "cv_changed") {
        const current = currentCvOf(e.detail);
        // gone after an attempt of ours whose answer was lost: that attempt did it, so it is a success
        if (current === null && lostRemove.current === id) await removed();
        else {
          lostRemove.current = null;
          await adopt(current, current === null ? "removed" : "replaced");
        }
      } else {
        lostRemove.current = id;
        setError("remove-failed"); // the dialog stays with the error; the CV is still saved
      }
    });
  };

  const onDownload = () => {
    if (!cv) return;
    const { id, fileName } = cv;
    void exec("downloading", () => downloadCv(id), async (blob) => saveBlob(blob, fileName), async (e) => {
      if (e instanceof ApiError && e.code === "cv_changed") {
        const current = currentCvOf(e.detail);
        await adopt(current, current ? "replaced" : "removed");
      } else {
        setError("download-failed");
      }
    });
  };

  return {
    state: query.data ? "ready" : query.isError ? "error" : "loading",
    cv,
    limits,
    pending,
    busy,
    confirmRemove,
    error,
    notice,
    onChoose: (file) => void onChoose(file),
    onUpload,
    onCancelPending: () => {
      if (running.current) return; // a request is running: the dialog cannot be dismissed into a lost state
      choice.current++;
      setDraft(null);
      setError(undefined);
    },
    onConfirmReplace,
    onAskRemove: () => {
      if (!cv || running.current) return;
      setAskedId(cv.id);
      setError(undefined);
    },
    onConfirmRemove,
    onCancelRemove: () => {
      if (running.current) return;
      lostRemove.current = null;
      setAskedId(null);
      setError(undefined);
    },
    onDownload,
    onRetryLoad: () => void query.refetch(),
    onDismissError: () => setError(undefined),
    onDismissNotice: () => setNotice(undefined),
  };
}
