import { Icon } from "@/components/icons";
import styles from "./steps.module.css";

export type StepperProps = {
  steps: string[];
  /** 0-based index of the current step */
  current: number;
  className?: string;
};

/**
 * Progress through a multi-step flow (onboarding, posting a vacancy).
 * Desktop: numbered steps with connectors. Below 768px: "Step 2 of 4 · Skills" + a bar.
 * For a rewarding to-do list (not ordered steps) use affect ProgressTracker instead.
 */
export function Stepper({ steps, current, className }: StepperProps) {
  const pct = Math.round(((current + 1) / steps.length) * 100);
  return (
    <div className={className}>
      <ol className={styles.stepper} aria-label="Progress">
        {steps.map((label, i) => {
          const state = i < current ? "done" : i === current ? "current" : "upcoming";
          return (
            <li key={label} className={styles.step} data-state={state} aria-current={state === "current" ? "step" : undefined}>
              <span className={styles.dot} aria-hidden="true">
                {state === "done" ? <Icon name="check" size={12} /> : i + 1}
              </span>
              <span className={styles.stepLabel}>{label}</span>
            </li>
          );
        })}
      </ol>
      <div className={styles.compact} aria-hidden="true">
        <p className={styles.compactText}>
          Step {current + 1} of {steps.length} · <strong>{steps[current]}</strong>
        </p>
        <div className={styles.bar}><span style={{ width: `${pct}%` }} /></div>
      </div>
    </div>
  );
}

export type PaginationProps = {
  /** 1-based */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function pages(page: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const set = new Set([1, count, page - 1, page, page + 1]);
  const sorted = [...set].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

/** Page numbers for long result lists. Prefer it over infinite scroll so results stay linkable. */
export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav className={[styles.pagination, className].filter(Boolean).join(" ")} aria-label="Pagination">
      <button type="button" className={styles.page} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
        <Icon name="chevronLeft" size={16} />
      </button>
      {pages(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className={styles.gap} aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={styles.page}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={styles.page} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Next page">
        <Icon name="chevronRight" size={16} />
      </button>
    </nav>
  );
}
