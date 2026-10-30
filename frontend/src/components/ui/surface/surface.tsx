import type { ComponentPropsWithRef, ReactNode } from "react";
import styles from "./surface.module.css";

/*
 * Tray: the gray shell around a white card. `header` sits on the tray above the card,
 * `footer` on the tray below it (meta on the left, sm buttons on the right).
 * Never nest a Tray inside a Card or another Tray.
 */

export type TrayProps = Omit<ComponentPropsWithRef<"section">, "title"> & {
  /** "md": 22/16 radii, "lg": 24/20 radii for roomier panels */
  size?: "md" | "lg";
  header?: ReactNode;
  footer?: ReactNode;
  footerAlign?: "between" | "center" | "end";
  /** Card padding */
  padding?: CardPadding;
  /** Fill the grid cell height (card grows) — for rows of trays that must line up */
  stretch?: boolean;
};

export function Tray({ size = "md", header, footer, footerAlign = "between", padding, stretch, className, children, ...rest }: TrayProps) {
  return (
    <section className={[styles.tray, className].filter(Boolean).join(" ")} data-size={size} data-stretch={stretch || undefined} {...rest}>
      {header && <div className={styles.trayHeader}>{header}</div>}
      <div className={styles.card} data-padding={padding}>
        {children}
      </div>
      {footer && (
        <div className={styles.trayFooter} data-align={footerAlign === "between" ? undefined : footerAlign}>
          {footer}
        </div>
      )}
    </section>
  );
}

type CardPadding = "none" | "sm" | "md" | "lg";

export type CardProps = ComponentPropsWithRef<"div"> & {
  padding?: CardPadding;
  /** Hover border for clickable cards (wrap content in a link/button for the actual action) */
  interactive?: boolean;
};

/** A standalone white card for page sections and grids. Inside a tray use Tray instead. */
export function Card({ padding, interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={[styles.card, className].filter(Boolean).join(" ")}
      data-standalone=""
      data-padding={padding === "md" ? undefined : padding}
      data-interactive={interactive || undefined}
      {...rest}
    />
  );
}
