import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { Icon, type IconName } from "@/components/icons";
import { Container } from "../page";
import { EYE_LEFT_PATH, EYE_RIGHT_PATH, STAR_PATH } from "./logo-paths";
import styles from "./app-shell.module.css";

/*
 * App shell: sticky header (logo · primary nav · actions) and the page body.
 * ≥1024px the nav sits in the header; below it collapses into a full-screen sheet behind a menu button.
 * Mark header actions that should hide on small screens with `data-shell-collapse`
 * and repeat them in `sheetActions`.
 */

export type NavItem = {
  to: string;
  label: string;
  icon?: IconName;
  /** Match only the exact path (for section roots like /app) */
  end?: boolean;
  /** Other path prefixes that belong to this section (e.g. /company/candidates under Vacancies) */
  also?: string[];
};

export type AppShellProps = {
  nav: NavItem[];
  /** Right side of the header: search, notifications, profile menu, sign-in buttons */
  actions?: ReactNode;
  /** Extra actions at the bottom of the mobile sheet (e.g. Sign in / Sign up) */
  sheetActions?: ReactNode;
  /** Where the logo links to */
  home?: string;
  children: ReactNode;
};

/** Product name — a placeholder until the final name is chosen; change it here only. */
export const BRAND_NAME = "Novio";

/** The brand mark: the A* star on the accent-blue tile (--brand-* tokens, identical in both themes). */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <span className={styles.mark} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 1254 1254" width={size} height={size} focusable="false">
        {/* inset ~9% so the star's tips don't touch the tile edge */}
        <g transform="translate(113 113) scale(0.82)">
          <path className={styles.markStar} d={STAR_PATH} />
          <path className={styles.markEye} d={EYE_LEFT_PATH} />
          <path className={styles.markEye} d={EYE_RIGHT_PATH} />
        </g>
      </svg>
    </span>
  );
}

export function Logo({ to = "/", onClick }: { to?: string; onClick?: () => void }) {
  return (
    <Link to={to} className={styles.logo} onClick={onClick}>
      <LogoMark />
      {/* mark only — the name stays for screen readers until the final name is chosen */}
      <span className="sr-only">{BRAND_NAME}</span>
    </Link>
  );
}

export function AppShell({ nav, actions, sheetActions, home = "/", children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();
  // the section is current for its own path, its sub-paths (unless `end`) and any `also` prefixes
  const current = (item: NavItem) =>
    pathname === item.to ||
    (!item.end && pathname.startsWith(`${item.to}/`)) ||
    Boolean(item.also?.some((p) => pathname.startsWith(p)))
      ? ("page" as const)
      : undefined;

  useEffect(() => {
    const dialog = sheet.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Container>
          <div className={styles.bar}>
            <Logo to={home} />
            <nav className={styles.nav} aria-label="Main">
              {nav.map((item) => (
                <Link key={item.to} to={item.to} className={styles.navLink} aria-current={current(item)}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className={styles.actions}>
              {actions}
              <button
                type="button"
                className={styles.menuButton}
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                aria-expanded={open}
              >
                <Icon name="menu" size={20} />
              </button>
            </div>
          </div>
        </Container>
      </header>

      <dialog
        ref={sheet}
        className={styles.sheet}
        aria-label="Menu"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
      >
        <div className={styles.sheetBar}>
          <Logo to={home} onClick={() => setOpen(false)} />
          <button type="button" className={styles.menuButton} onClick={() => setOpen(false)} aria-label="Close menu">
            <Icon name="close" size={20} />
          </button>
        </div>
        <nav className={styles.sheetNav} aria-label="Main">
          {nav.map((item) => (
            <Link key={item.to} to={item.to} className={styles.sheetLink} aria-current={current(item)} onClick={() => setOpen(false)}>
              {item.icon && <Icon name={item.icon} size={20} />}
              {item.label}
            </Link>
          ))}
        </nav>
        {sheetActions && <div className={styles.sheetActions}>{sheetActions}</div>}
      </dialog>

      <main className={styles.main} id="main">
        {children}
      </main>
    </div>
  );
}
