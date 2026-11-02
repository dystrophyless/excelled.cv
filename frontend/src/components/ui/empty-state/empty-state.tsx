import type { ComponentPropsWithRef, ReactNode } from "react";
import { Icon } from "@/components/icons";
import styles from "./empty-state.module.css";

export type EmptyStateProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  /** Icon shown in a 44px tile; defaults to an inbox (empty) or alert (error) */
  icon?: ReactNode;
  /** An affect illustration instead of the icon tile */
  illustration?: ReactNode;
  /** One or two buttons */
  actions?: ReactNode;
  /** "error": a failed load — pair with a "Try again" button */
  tone?: "empty" | "error";
};

/** Centered message for an empty list or a failed load. Place it inside a Card/Tray. */
export function EmptyState({
  title, description, icon, illustration, actions, tone = "empty", className, ...rest
}: EmptyStateProps) {
  return (
    <div
      className={[styles.empty, className].filter(Boolean).join(" ")}
      data-tone={tone}
      role={tone === "error" ? "alert" : undefined}
      {...rest}
    >
      {illustration ? (
        <div className={styles.illustration} aria-hidden="true">{illustration}</div>
      ) : (
        <div className={styles.icon} aria-hidden="true">
          {icon ?? (tone === "error" ? <Icon name="error" size={20} /> : <Icon name="inbox" size={20} />)}
        </div>
      )}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
