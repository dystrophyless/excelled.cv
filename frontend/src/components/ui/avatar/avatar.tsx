import { useState, type ComponentPropsWithRef } from "react";
import styles from "./avatar.module.css";

export type AvatarProps = Omit<ComponentPropsWithRef<"span">, "children"> & {
  /** Full name — used for initials and the accessible label */
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  /** circle: people · square: companies */
  shape?: "circle" | "square";
  tone?: "accent" | "neutral";
  /** Hide from assistive tech when the surrounding control already names the person */
  decorative?: boolean;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({ name, src, size = "md", shape = "circle", tone = "accent", decorative, className, ...rest }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      className={[styles.avatar, className].filter(Boolean).join(" ")}
      data-size={size}
      data-shape={shape}
      data-tone={tone}
      {...rest}
    >
      {src && !failed ? (
        <img className={styles.image} src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
