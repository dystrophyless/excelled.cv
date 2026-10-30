import type { ComponentPropsWithRef, ReactNode } from "react";
import { Icon } from "@/components/icons";
import styles from "./tag.module.css";

export type TagTone = "neutral" | "accent" | "success" | "warning" | "danger" | "rose" | "violet";

export type TagProps = ComponentPropsWithRef<"span"> & {
  /** neutral: category · accent: highlight · success: done/applied · warning: needs attention · rose: "New" */
  tone?: TagTone;
};

/** A small pill label for status or category. Not clickable. */
export function Tag({ tone = "neutral", className, ...rest }: TagProps) {
  return <span className={[styles.tag, className].filter(Boolean).join(" ")} data-tone={tone} {...rest} />;
}

export type ChipProps = Omit<ComponentPropsWithRef<"span">, "children"> & {
  children: ReactNode;
  /** Shows an ✕ button; the label is used for its accessible name ("Remove Python") */
  onRemove?: () => void;
  removeLabel?: string;
};

/** A selected value — an applied filter or a chosen skill. Removable when `onRemove` is set. */
export function Chip({ children, onRemove, removeLabel, className, ...rest }: ChipProps) {
  return (
    <span
      className={[styles.chip, className].filter(Boolean).join(" ")}
      data-removable={onRemove ? "" : undefined}
      {...rest}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          className={styles.chipRemove}
          onClick={onRemove}
          aria-label={removeLabel ?? (typeof children === "string" ? `Remove ${children}` : "Remove")}
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </span>
  );
}

export type CountProps = ComponentPropsWithRef<"span">;

/** A number next to a label (tab counts, unread). */
export function Count({ className, ...rest }: CountProps) {
  return <span className={[styles.count, className].filter(Boolean).join(" ")} {...rest} />;
}
