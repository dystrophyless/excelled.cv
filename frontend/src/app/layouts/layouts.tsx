import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Icon } from "@/components/icons";
import { AppShell, Avatar, Button, NotificationCenter, ProfileMenu, type NavItem } from "@/components/ui";
import { EMPLOYER_NOTIFICATIONS, STUDENT_NOTIFICATIONS } from "@/mocks/data";
import styles from "./layouts.module.css";

/*
 * Role layouts — the shells every page sits in (design-system/ia.md § Navigation).
 * Pages never build their own header.
 */

export const STUDENT_NAV: NavItem[] = [
  { to: "/app", label: "Home", icon: "home", end: true },
  { to: "/app/vacancies", label: "Vacancies", icon: "vacancy" },
  { to: "/app/applications", label: "Applications", icon: "application" },
  { to: "/app/saved", label: "Saved", icon: "saved" },
];

export const EMPLOYER_NAV: NavItem[] = [
  { to: "/company", label: "Home", icon: "home", end: true },
  { to: "/company/vacancies", label: "Vacancies", icon: "vacancy", also: ["/company/candidates"] },
];

export const PUBLIC_NAV: NavItem[] = [
  { to: "/vacancies", label: "Vacancies", icon: "vacancy" },
  { to: "/employers", label: "For employers", icon: "company" },
];

type Account = { name: string; email: string; setup?: { done: number; total: number; next?: string } };

/** Avatar button that opens affect ProfileMenu in a popover. */
export function AccountMenu({ account, items }: { account: Account; items: { id: string; label: string; icon: ReactNode; to?: string; onSelect?: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={styles.account}>
      <button
        type="button"
        className={styles.avatarButton}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="account-menu"
      >
        <Avatar name={account.name} size="sm" decorative />
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div className={styles.popover}>
          <ProfileMenu
            name={account.name}
            email={account.email}
            setup={account.setup && { ...account.setup, onContinue: () => navigate("/app/profile/edit") }}
            items={items.map((i) => ({
              id: i.id,
              label: i.label,
              icon: i.icon,
              onSelect: () => {
                setOpen(false);
                if (i.to) navigate(i.to);
                i.onSelect?.();
              },
            }))}
          />
        </div>
      )}
    </div>
  );
}


const STUDENT: Account = { name: "Maya Akhmetova", email: "maya@sdu.edu.kz", setup: { done: 3, total: 5, next: "Add your CV" } };
const EMPLOYER: Account = { name: "Aruzhan Bekova", email: "aruzhan@kaspi.kz" };

export function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      home="/app"
      nav={STUDENT_NAV}
      actions={
        <>
          <NotificationCenter items={STUDENT_NOTIFICATIONS} settingsTo="/app/settings" />
          <AccountMenu
            account={STUDENT}
            items={[
              { id: "profile", label: "Profile", icon: <Icon name="profile" size={20} />, to: "/app/profile" },
              { id: "settings", label: "Settings", icon: <Icon name="settings" size={20} />, to: "/app/settings" },
              { id: "logout", label: "Log out", icon: <Icon name="logout" size={20} /> },
            ]}
          />
        </>
      }
    >
      {children}
    </AppShell>
  );
}

export function EmployerLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      home="/company"
      nav={EMPLOYER_NAV}
      actions={
        <>
          <NotificationCenter items={EMPLOYER_NOTIFICATIONS} settingsTo="/company/settings" />
          <AccountMenu
            account={EMPLOYER}
            items={[
              { id: "company", label: "Company profile", icon: <Icon name="company" size={20} />, to: "/company/profile" },
              { id: "settings", label: "Settings", icon: <Icon name="settings" size={20} />, to: "/company/settings" },
              { id: "logout", label: "Log out", icon: <Icon name="logout" size={20} /> },
            ]}
          />
        </>
      }
    >
      {children}
    </AppShell>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <AppShell
      home="/"
      nav={PUBLIC_NAV}
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={() => navigate("/sign-in")} data-shell-collapse="">Sign in</Button>
          <Button size="sm" onClick={() => navigate("/sign-up")}>Sign up</Button>
        </>
      }
      sheetActions={<Button variant="secondary" onClick={() => navigate("/sign-in")}>Sign in</Button>}
    >
      {children}
    </AppShell>
  );
}
