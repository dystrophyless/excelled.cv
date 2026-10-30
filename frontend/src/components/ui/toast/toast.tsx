import { useEffect } from "react";
import { Icon } from "@/components/icons";
import { useToastStore, type ToastItem } from "./toast-store";
import styles from "./toast.module.css";

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!item.duration) return;
    const timer = window.setTimeout(() => dismiss(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [item.id, item.duration, dismiss]);

  const name = item.tone === "success" ? "success" : item.tone === "error" ? "error" : "info";

  return (
    <div className={styles.toast} data-tone={item.tone} data-testid="toast">
      <Icon name={name} className={styles.icon} size={18} />
      <div className={styles.text}>
        <p className={styles.title}>{item.title}</p>
        {item.description && <p className={styles.description}>{item.description}</p>}
      </div>
      {item.action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            item.action!.onClick();
            dismiss(item.id);
          }}
        >
          {item.action.label}
        </button>
      )}
      <button type="button" className={styles.close} onClick={() => dismiss(item.id)} aria-label="Dismiss">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

/** Mount once at the app root. Show toasts with `toast()`, `toast.success()`, `toast.error()`. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
