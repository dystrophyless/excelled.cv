import type { CSSProperties, ComponentPropsWithRef, ReactNode } from "react";
import styles from "./layout.module.css";

/*
 * Layout primitives. Pages are composed from these + UI kit components, so spacing always
 * comes from the scale and nobody writes ad-hoc grids. `gap` values are --space-* steps (px).
 */

export type Gap = 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 20 | 24 | 32 | 40 | 48 | 64;

const gapVar = (gap: Gap) => ({ "--gap": `var(--space-${gap})` }) as CSSProperties;
const cx = (...c: (string | undefined | false)[]) => c.filter(Boolean).join(" ");

type DivProps = ComponentPropsWithRef<"div">;

/** Vertical stack. Default gap 16. */
export function Stack({ gap = 16, className, style, ...rest }: DivProps & { gap?: Gap }) {
  return <div className={cx(styles.stack, className)} style={{ ...gapVar(gap), ...style }} {...rest} />;
}

/** Horizontal row that wraps. Default gap 8. */
export function Cluster({
  gap = 8, justify, nowrap, className, style, ...rest
}: DivProps & { gap?: Gap; justify?: "start" | "between" | "end"; nowrap?: boolean }) {
  return (
    <div
      className={cx(styles.cluster, className)}
      data-justify={justify}
      data-nowrap={nowrap || undefined}
      style={{ ...gapVar(gap), ...style }}
      {...rest}
    />
  );
}

/** Responsive card grid: as many columns of at least `min` px as fit. */
export function Grid({ min = 320, gap = 16, className, style, ...rest }: DivProps & { min?: number; gap?: Gap }) {
  return (
    <div
      className={cx(styles.grid, className)}
      style={{ ...gapVar(gap), "--min": `${min}px`, ...style } as CSSProperties}
      {...rest}
    />
  );
}

export type TwoColumnProps = {
  main: ReactNode;
  /** Omit (or pass null) to render main alone at full width */
  aside?: ReactNode;
  /** start: filters / section nav on the left · end: summary / actions on the right */
  side?: "start" | "end";
  /** Aside width on desktop: filters 280 · nav 220 · summary 360 */
  asideWidth?: number;
  sticky?: boolean;
  /** Below 1024px show the aside before main (default: after) */
  asideFirstOnMobile?: boolean;
  /** Below 1024px hide the aside (e.g. filters move into a modal) */
  hideAsideOnMobile?: boolean;
  className?: string;
};

/** Main column + aside. One column below 1024px. */
export function TwoColumn({
  main, aside, side = "end", asideWidth = 360, sticky, asideFirstOnMobile, hideAsideOnMobile, className,
}: TwoColumnProps) {
  // no aside (e.g. a preview mode hides it) → main takes the full width instead of leaving an empty column
  if (aside == null || aside === false) return <div className={cx(styles.main, className)}>{main}</div>;
  const asideEl = (
    <aside className={styles.aside} data-sticky={sticky || undefined} data-hide-mobile={hideAsideOnMobile || undefined}>
      {aside}
    </aside>
  );
  return (
    <div
      className={cx(styles.two, className)}
      data-aside={side}
      data-aside-first={asideFirstOnMobile || undefined}
      style={{ "--aside": `${asideWidth}px` } as CSSProperties}
    >
      {side === "start" && asideEl}
      <div className={styles.main}>{main}</div>
      {side === "end" && asideEl}
    </div>
  );
}

/** Vertical rhythm of a page body (between PageHeader and the bottom). */
export function PageBody({ className, ...rest }: DivProps) {
  return <div className={cx(styles.page, className)} {...rest} />;
}

export type SectionProps = Omit<ComponentPropsWithRef<"section">, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  /** Right side of the section header: "See all" link, a small button */
  actions?: ReactNode;
};

/** A titled block of a page (h2-level, 16px). */
export function Section({ title, description, actions, className, children, ...rest }: SectionProps) {
  return (
    <section className={cx(styles.section, className)} {...rest}>
      {(title || actions) && (
        <div className={styles.sectionHead}>
          <div className={styles.sectionText}>
            {title && <h2 className={styles.sectionTitle}>{title}</h2>}
            {description && <p className={styles.sectionDescription}>{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export type FormSectionProps = Omit<ComponentPropsWithRef<"section">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
};

/** Settings / edit-profile block: title + description on the left, fields on the right (≥ 768px). */
export function FormSection({ title, description, className, children, ...rest }: FormSectionProps) {
  return (
    <section className={cx(styles.formSection, className)} {...rest}>
      <div className={styles.sectionText}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {description && <p className={styles.sectionDescription}>{description}</p>}
      </div>
      <div className={styles.formFields}>{children}</div>
    </section>
  );
}

export type StickyBarProps = DivProps & {
  /** Only below 1024px (mobile primary action on detail pages) */
  mobileOnly?: boolean;
};

/** Floating bar at the bottom of the viewport: "Unsaved changes · Discard · Save", or mobile "Apply". */
export function StickyBar({ mobileOnly, className, ...rest }: StickyBarProps) {
  return <div className={cx(styles.sticky, className)} data-mobile-only={mobileOnly || undefined} role="region" aria-label="Actions" {...rest} />;
}

/**
 * Responsive visibility (breakpoint 1024px = "lg", where the header nav and two-column layouts switch).
 * <Show below="lg"> — only on phones/tablets · <Show above="lg"> — only on desktop.
 */
export function Show({ above, below, children }: { above?: "lg"; below?: "lg"; children: ReactNode }) {
  return <span className={above ? styles.aboveLg : below ? styles.belowLg : undefined} style={{ display: "contents" }}>{children}</span>;
}

export type ToolbarProps = {
  /** Grows: SearchField (+ the mobile "Filters" button) */
  start?: ReactNode;
  /** Right side: SegmentedControl md, SelectField size="sm", secondary buttons sm/md */
  end?: ReactNode;
  className?: string;
};

/**
 * One row of list controls above results. All controls share the 36px toolbar height
 * (SearchField / SelectField size="sm", SegmentedControl md). Wraps on small screens.
 */
export function Toolbar({ start, end, className }: ToolbarProps) {
  return (
    <div className={cx(styles.toolbar, className)} role="search">
      {start && <div className={styles.toolbarStart}>{start}</div>}
      {end && <div className={styles.toolbarEnd}>{end}</div>}
    </div>
  );
}
