import type { ComponentPropsWithRef, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { Icon } from "@/components/icons";
import styles from "./page.module.css";

export type ContainerProps = ComponentPropsWithRef<"div"> & {
  /** page: 1120px · content: 760px (reading, detail pages) · form: 560px */
  width?: "page" | "content" | "form";
};

/** Centers page content with responsive side gutters. */
export function Container({ width = "page", className, ...rest }: ContainerProps) {
  return (
    <div
      className={[styles.container, className].filter(Boolean).join(" ")}
      data-width={width === "page" ? undefined : width}
      {...rest}
    />
  );
}

export type PageHeaderProps = Omit<ComponentPropsWithRef<"header">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  /** Small muted line above the title (breadcrumb-like context) */
  eyebrow?: ReactNode;
  /** Buttons aligned right; at most one primary */
  actions?: ReactNode;
};

/** The page's h1 with description and actions. Exactly one per page. */
export function PageHeader({ title, description, eyebrow, actions, className, ...rest }: PageHeaderProps) {
  return (
    <header className={[styles.header, className].filter(Boolean).join(" ")} {...rest}>
      <div className={styles.headerText}>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}

export type SectionTitleProps = ComponentPropsWithRef<"h2">;

/** h2 for a page section. */
export function SectionTitle({ className, ...rest }: SectionTitleProps) {
  return <h2 className={[styles.sectionTitle, className].filter(Boolean).join(" ")} {...rest} />;
}

export type SectionLabelProps = ComponentPropsWithRef<"p">;

/** Small muted label above a group of controls inside a card. */
export function SectionLabel({ className, ...rest }: SectionLabelProps) {
  return <p className={[styles.label, className].filter(Boolean).join(" ")} {...rest} />;
}

export type TextLinkProps = LinkProps & { tone?: "default" | "muted" };

/** In-app navigation link (React Router). For external URLs use ExternalLink. */
export function TextLink({ tone = "default", className, ...rest }: TextLinkProps) {
  return (
    <Link
      className={[styles.link, className].filter(Boolean).join(" ")}
      data-tone={tone === "default" ? undefined : tone}
      {...rest}
    />
  );
}

export type BackLinkProps = Omit<LinkProps, "children"> & { children: ReactNode };

/** "← Vacancies" — the back link for PageHeader eyebrow on detail / edit pages. Uses the arrowLeft icon, never a text arrow. */
export function BackLink({ className, children, ...rest }: BackLinkProps) {
  return (
    <Link className={[styles.link, styles.back, className].filter(Boolean).join(" ")} data-tone="muted" {...rest}>
      <Icon name="arrowLeft" size={14} />
      {children}
    </Link>
  );
}

export type ExternalLinkProps = ComponentPropsWithRef<"a"> & { tone?: "default" | "muted" };

/** Link to another site; opens in a new tab. */
export function ExternalLink({ tone = "default", className, ...rest }: ExternalLinkProps) {
  return (
    <a
      className={[styles.link, className].filter(Boolean).join(" ")}
      data-tone={tone === "default" ? undefined : tone}
      target="_blank"
      rel="noreferrer"
      {...rest}
    />
  );
}
