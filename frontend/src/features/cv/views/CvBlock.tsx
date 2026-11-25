import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Alert, Button, FileUpload, Modal, Skeleton } from "@/components/ui";
import { formatDate } from "@/features/profiles/model";
import {
  NOTICE_TEXT, cvErrorText, cvFormatOf, cvHint, formatFileSize, formatLabel,
  type CvError, type CvFile, type CvLimits, type CvLoadState, type CvNotice, type CvPick,
} from "../model";
import styles from "./cv.module.css";

export type CvBlockProps = {
  state: CvLoadState;
  /** The stored CV, or null when there is none */
  cv: CvFile | null;
  limits: CvLimits;
  /**
   * The file the student chose and that is not stored yet. No CV stored: shown with "Upload CV".
   * CV stored: the replace dialog opens, naming both files.
   */
  pending?: CvPick | null;
  /** A request is running */
  busy?: "uploading" | "replacing" | "removing" | "downloading";
  /** The remove dialog is open */
  confirmRemove?: boolean;
  /** What went wrong, shown beside the control that caused it (the stored CV stays visible) */
  error?: CvError;
  /** The CV changed in another tab; explains why the last action was not applied */
  notice?: CvNotice;
  /** A file was picked or dropped — the parent checks it (checkCvFile) and sets `pending` or `error` */
  onChoose: (file: File) => void;
  onUpload: () => void;
  /** Cancels the chosen file, or the replace dialog */
  onCancelPending: () => void;
  onConfirmReplace: () => void;
  onAskRemove: () => void;
  onConfirmRemove: () => void;
  onCancelRemove: () => void;
  onDownload: () => void;
  onRetryLoad?: () => void;
  onDismissError?: () => void;
  onDismissNotice?: () => void;
};

/**
 * A name cut in the middle so the end (the extension and what precedes it) stays visible:
 * "Maya_Akhmetova_curriculum_vi…_2026.docx". The text is fitted to the width by measuring (no gap before the tail);
 * screen readers get the whole name, and so does the tooltip.
 */
function MiddleName({ name, wrap }: { name: string; wrap?: boolean }) {
  const box = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || wrap) return;
    const fit = () => {
      el.textContent = name;
      if (el.scrollWidth <= el.clientWidth) return;
      const dot = name.lastIndexOf(".");
      const tail = name.slice(Math.max(0, (dot > 0 ? dot : name.length) - 6));
      let lo = 0;
      let hi = name.length - tail.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        el.textContent = `${name.slice(0, mid).trimEnd()}…${tail}`;
        if (el.scrollWidth <= el.clientWidth) lo = mid;
        else hi = mid - 1;
      }
      el.textContent = `${name.slice(0, lo).trimEnd()}…${tail}`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [name, wrap]);
  return (
    <span className={styles.name} title={name} data-wrap={wrap || undefined}>
      {wrap ? name : (
        <>
          <span ref={box} className={styles.fit} aria-hidden="true" />
          <span className="sr-only">{name}</span>
        </>
      )}
    </span>
  );
}

/** One file as a flat entry (icon tile · name · meta). Used in the block and in the dialogs. */
export function CvFileRow({ name, meta, wrap, children }: { name: string; meta: ReactNode; wrap?: boolean; children?: ReactNode }) {
  return (
    <div className={styles.row} data-testid="cv-file">
      <span className={styles.tile} aria-hidden="true"><Icon name="cv" size={20} /></span>
      <span className={styles.text}>
        <MiddleName name={name} wrap={wrap} />
        <span className={styles.meta}>{meta}</span>
        {children}
      </span>
    </div>
  );
}

const pickMeta = (p: CvPick) => {
  const f = cvFormatOf(p.name);
  return `${f ? `${formatLabel(f)} · ` : ""}${formatFileSize(p.size)}`;
};

const storedMeta = (cv: CvFile) => `${formatLabel(cv.format)} · ${formatFileSize(cv.sizeBytes)}`;

/**
 * The CV block of the owner panel (S1 on /app/profile): heading "CV", then one of
 * none (drop zone) · chosen (file + Upload CV / Cancel) · stored (file, status, Download / Replace / Remove).
 * Replace and Remove confirm in a Modal. Errors and "changed in another tab" notices sit inside the block;
 * the stored CV stays visible. Focus follows the result: chosen → Upload CV · stored → the CV · none → the drop zone.
 */
export function CvBlock(p: CvBlockProps) {
  const { cv, pending, limits } = p;
  const phase = cv ? "stored" : pending ? "chosen" : "none";
  const ready = p.state === "ready";
  const busy = p.busy;

  const uploadRef = useRef<HTMLButtonElement>(null);
  const storedRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  // Focus management (FR-017): the control that just disappeared is replaced by the next logical one.
  const seen = useRef<{ phase: string; id?: string } | null>(null);
  useEffect(() => {
    if (!ready) return;
    const before = seen.current;
    seen.current = { phase, id: cv?.id };
    if (!before) return;
    if (phase === "chosen" && before.phase !== "chosen") uploadRef.current?.focus();
    else if (phase === "stored" && (before.phase !== "stored" || before.id !== cv?.id)) storedRef.current?.focus();
    else if (phase === "none" && before.phase !== "none") zoneRef.current?.querySelector<HTMLElement>("input[type=file]")?.focus();
  }, [ready, phase, cv?.id]);

  // A file dropped beside the zone must not make the browser open it and leave the page; the zone's own drop still works
  const dropZoneShown = ready && phase === "none";
  useEffect(() => {
    if (!dropZoneShown) return;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const stop = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, [dropZoneShown]);

  const accept = limits.formats.map((f) => `.${f}`).join(",");
  const maxMb = Math.round(limits.maxBytes / 1024 / 1024);
  const dialogError = p.error === "replace-failed" || p.error === "remove-failed";
  const inlineError = p.error && !dialogError ? cvErrorText(p.error, limits) : undefined;

  const refusal = p.error === "format" || p.error === "empty" || p.error === "too-large" || p.error === "content";
  const errorAlert = (text: string) => (
    <>
      <Alert tone="error" onDismiss={p.onDismissError} data-testid="cv-error">{text}</Alert>
      {/* after a refusal the rules stay in sight (the zone keeps its own hint) */}
      {refusal && phase !== "none" && <span className={styles.meta}>{cvHint(limits)}.</span>}
    </>
  );

  let body: ReactNode;
  if (p.state === "loading") {
    body = (
      <div className={styles.block} aria-hidden="true">
        <div className={styles.skeletonRow}>
          <Skeleton width={40} height={40} radius="var(--radius-control)" />
          <span className={styles.skeletonText}><Skeleton width="70%" height={14} /><Skeleton width="40%" height={12} /></span>
        </div>
        <div className={styles.skeletonActions}>
          <Skeleton width={96} height={32} radius="var(--radius-control-sm)" />
          <Skeleton width={84} height={32} radius="var(--radius-control-sm)" />
        </div>
      </div>
    );
  } else if (p.state === "error") {
    body = (
      <Alert tone="error" title="Couldn't load your CV" data-testid="cv-load-error">
        <span className={styles.alertBody}>
          Check your connection and try again.
          <Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={p.onRetryLoad}>Try again</Button>
        </span>
      </Alert>
    );
  } else if (phase === "stored" && cv) {
    body = (
      <div className={styles.stored} ref={storedRef} tabIndex={-1} role="group" aria-label={`Your CV: ${cv.fileName}`} data-testid="cv-stored">
        <CvFileRow name={cv.fileName} meta={storedMeta(cv)}>
          <span className={`${styles.meta} ${styles.status}`} data-testid="cv-status">
            <Icon name="success" size={14} className={styles.statusIcon} aria-hidden="true" />
            Uploaded {formatDate(cv.uploadedAt)}
          </span>
        </CvFileRow>
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" icon={<Icon name="download" />} loading={busy === "downloading"} onClick={p.onDownload}>
            Download
          </Button>
          <Button variant="secondary" size="sm" icon={<Icon name="upload" />} onClick={() => replaceInput.current?.click()}>
            Replace
          </Button>
          <Button variant="ghost" size="sm" onClick={p.onAskRemove}>
            Remove
          </Button>
        </div>
        {inlineError && errorAlert(inlineError)}
      </div>
    );
  } else if (phase === "chosen" && pending) {
    const uploading = busy === "uploading";
    body = (
      <div className={styles.pending} data-testid="cv-chosen">
        <CvFileRow name={pending.name} meta={uploading ? "Uploading…" : pickMeta(pending)} />
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" icon={<Icon name="upload" />} loading={uploading} onClick={p.onUpload} ref={uploadRef}>
            Upload CV
          </Button>
          <Button variant="ghost" size="sm" disabled={uploading} onClick={p.onCancelPending}>Cancel</Button>
        </div>
        {inlineError && errorAlert(inlineError)}
      </div>
    );
  } else {
    body = (
      <div ref={zoneRef}>
        <FileUpload
          label="CV file"
          hideLabel
          accept={accept}
          maxSizeMb={maxMb}
          onFile={p.onChoose}
          prompt={<>Choose a file<span className={styles.dropHint}> or drop it here</span></>}
          zoneHint={`${cvHint(limits)}.`}
          hint={false}
          error={inlineError}
          data-testid="cv-zone"
        />
      </div>
    );
  }

  const replacing = Boolean(cv && pending && ready);
  const saving = busy === "replacing";
  const removing = busy === "removing";

  return (
    <section className={styles.block} id="cv-block" tabIndex={-1} aria-labelledby="cv-heading" aria-busy={p.state === "loading" || busy === "uploading" || undefined} data-testid="cv-block">
      <div className={styles.head}>
        <h2 className={styles.heading} id="cv-heading">CV</h2>
        {ready && phase === "none" && <span className={styles.meta} data-testid="cv-none">No CV yet</span>}
      </div>
      {ready && p.notice && (
        <Alert tone="warning" title={NOTICE_TEXT[p.notice].title} onDismiss={p.onDismissNotice} data-testid="cv-notice">
          {NOTICE_TEXT[p.notice].body}
        </Alert>
      )}
      {body}
      {/* Replace: the stored CV's Replace button opens the file picker through this hidden input */}
      <input
        ref={replaceInput}
        className={styles.hidden}
        type="file"
        accept={accept}
        tabIndex={-1}
        aria-hidden="true"
        data-testid="cv-replace-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) p.onChoose(file);
        }}
      />

      <Modal
        open={replacing}
        onClose={() => { if (!saving) p.onCancelPending(); }}
        dismissible={!saving}
        busy={saving}
        title="Replace your CV?"
        description="The new file becomes your only CV. The current file is deleted and can't be restored."
        data-testid="cv-replace-dialog"
        footer={
          <>
            <Button variant="secondary" size="sm" disabled={saving} onClick={p.onCancelPending} data-autofocus>Keep current CV</Button>
            <Button size="sm" loading={saving} onClick={p.onConfirmReplace}>Replace CV</Button>
          </>
        }
      >
        {cv && pending && (
          <div className={styles.dialogBody}>
            {p.error === "replace-failed" && errorAlert(cvErrorText("replace-failed"))}
            <div className={styles.swap}>
              <div className={styles.swapItem}>
                <span className={styles.swapLabel}>Current</span>
                <CvFileRow name={cv.fileName} meta={`${storedMeta(cv)} · Uploaded ${formatDate(cv.uploadedAt)}`} wrap />
              </div>
              <div className={styles.swapItem}>
                <span className={styles.swapLabel}>New</span>
                <CvFileRow name={pending.name} meta={pickMeta(pending)} wrap />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(p.confirmRemove && cv && ready)}
        onClose={() => { if (!removing) p.onCancelRemove(); }}
        dismissible={!removing}
        busy={removing}
        title="Remove your CV?"
        description="The file is deleted from your profile and can't be restored. The rest of your profile stays as it is."
        data-testid="cv-remove-dialog"
        footer={
          <>
            <Button variant="secondary" size="sm" disabled={removing} onClick={p.onCancelRemove} data-autofocus>Keep CV</Button>
            <Button variant="destructive" size="sm" loading={removing} onClick={p.onConfirmRemove}>Remove CV</Button>
          </>
        }
      >
        {cv && (
          <div className={styles.dialogBody}>
            {p.error === "remove-failed" && errorAlert(cvErrorText("remove-failed"))}
            <CvFileRow name={cv.fileName} meta={`${storedMeta(cv)} · Uploaded ${formatDate(cv.uploadedAt)}`} wrap />
          </div>
        )}
      </Modal>
    </section>
  );
}

/**
 * Mobile shortcut in the identity facts of the profile (shown below 1024, where the owner panel stacks under the card):
 * "Add CV" / "CV uploaded" ("CV" while loading or failed). Scrolls to the block (instantly with reduced motion) and focuses it.
 * Render it as the `trailing` item of FactList.
 */
export function CvJump({ state, hasCv }: { state: CvLoadState; hasCv: boolean }) {
  const label = state !== "ready" ? "CV" : hasCv ? "CV uploaded" : "Add CV";
  return (
    <li className={styles.jumpItem}>
      <a
        className={styles.jump}
        href="#cv-block"
        data-testid="cv-jump"
        onClick={(e) => {
          e.preventDefault();
          const target = document.getElementById("cv-block");
          if (!target) return;
          const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
          target.focus({ preventScroll: true });
        }}
      >
        <Icon name="cv" size={14} />
        {label}
      </a>
    </li>
  );
}
