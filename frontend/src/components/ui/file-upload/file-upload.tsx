import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Button } from "../button";
import { Field } from "../field";
import styles from "./file-upload.module.css";

export type FileUploadProps = {
  label: ReactNode;
  hint?: ReactNode;
  /** External error (e.g. upload failed); size/type errors are produced here */
  error?: ReactNode;
  optional?: boolean;
  /** e.g. ".pdf,.docx" */
  accept?: string;
  maxSizeMb?: number;
  value: File | null;
  onChange: (file: File | null) => void;
  /** Text inside the drop zone */
  prompt?: string;
  "data-testid"?: string;
};

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** One file (CV, logo). Click or drop; the chosen file shows as a row with Replace / Remove. */
export function FileUpload({
  label, hint, error, optional, accept, maxSizeMb = 5, value, onChange, prompt = "Drop a file or click to upload", ...rest
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const shownError = error ?? localError;

  const pick = (file: File | undefined) => {
    if (!file) return;
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (accept && !accept.split(",").map((a) => a.trim().toLowerCase()).includes(ext)) {
      setLocalError(`Upload a ${accept.replaceAll(",", " or ")} file.`);
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setLocalError(`The file is larger than ${maxSizeMb} MB.`);
      return;
    }
    setLocalError(null);
    onChange(file);
  };

  const hintText = hint ?? `${accept ? accept.replaceAll(",", ", ").toUpperCase().replaceAll(".", "") + " · " : ""}up to ${maxSizeMb} MB`;

  return (
    <Field label={label} hint={value ? undefined : hintText} error={shownError} optional={optional}>
      {(control) =>
        value ? (
          <div className={styles.file} data-testid={rest["data-testid"]}>
            <span className={styles.fileIcon} aria-hidden="true"><Icon name="cv" size={18} /></span>
            <span className={styles.fileText}>
              <span className={styles.fileName}>{value.name}</span>
              <span className={styles.fileMeta}>{formatSize(value.size)}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => onChange(null)} aria-label={`Remove ${value.name}`} id={control.id}>
              Remove
            </Button>
          </div>
        ) : (
          <div
            className={styles.zone}
            data-dragging={dragging || undefined}
            data-invalid={shownError ? "" : undefined}
            data-testid={rest["data-testid"]}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
          >
            <input
              {...control}
              type="file"
              className={styles.input}
              accept={accept}
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <span className={styles.zoneIcon} aria-hidden="true"><Icon name="upload" size={18} /></span>
            <span className={styles.zoneTitle}>{prompt}</span>
          </div>
        )
      }
    </Field>
  );
}
