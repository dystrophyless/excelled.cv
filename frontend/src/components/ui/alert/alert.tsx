import type { ComponentPropsWithRef, ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import styles from "./alert.module.css";

export type AlertTone = "neutral" | "info" | "success" | "warning" | "error";

const TONE_ICON: Record<AlertTone, IconName> = {
  neutral: "info",
  info: "info",
  success: "success",
  warning: "warning",
  error: "error",
};

export type AlertProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  /** A small button or link on the right */
  action?: ReactNode;
  onDismiss?: () => void;
};

/**
 * Inline message inside a page or form: a form-level error, a warning about the profile,
 * a success note that should stay. For short confirmations after an action use toast().
 */
export function Alert({ tone = "neutral", title, children, action, onDismiss, className, ...rest }: AlertProps) {
  return (
    <div
      className={[styles.alert, className].filter(Boolean).join(" ")}
      data-tone={tone}
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      {...rest}
    >
      <Icon name={TONE_ICON[tone]} size={16} className={styles.icon} />
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
      {onDismiss && (
        <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
