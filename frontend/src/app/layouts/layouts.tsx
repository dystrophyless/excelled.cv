import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Icon } from "@/components/icons";
import { AppShell, Avatar, Button, NotificationCenter, ProfileMenu, type NavItem } from "@/components/ui";
import { useMe, useSignOut } from "@/features/auth/hooks";
import { useCompanyProfile, useStudentProfile } from "@/features/profiles/hooks";
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


// Mock account shown when nobody of the layout's role is signed in (styleguide templates / prototypes). Signed in: name = the
// profile name (["student-profile"] / ["company-profile"]), the sign-in email while it loads or if it fails
// (003-profiles ui-spec § Account menu). No setup progress until a real checklist exists.
const STUDENT: Account = { name: "Maya Akhmetova", email: "maya@sdu.edu.kz" };
const EMPLOYER: Account = { name: "Aruzhan Bekova", email: "aruzhan@kaspi.kz" };

/** The account menu's name and email: profile name → sign-in email (loading / failed) → the mock account (signed out). */
function menuAccount(me: { email: string } | null | undefined, profileName: string | undefined, mock: Account): Account {
  if (!me) return mock;
  return { name: profileName || me.email, email: me.email };
}

export function StudentLayout({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  // only a student with a profile has one to read (the layout also renders in the styleguide and prototypes)
  const profile = useStudentProfile({ enabled: me?.role === "student" && me.has_profile });
  const account = menuAccount(me, me?.role === "student" ? profile.data?.fullName : undefined, STUDENT);
  const signOut = useSignOut();
  return (
    <AppShell
      home="/app"
      nav={STUDENT_NAV}
      actions={
        <>
          <NotificationCenter items={STUDENT_NOTIFICATIONS} settingsTo="/app/settings" />
          <AccountMenu
            account={account}
            items={[
              { id: "profile", label: "Profile", icon: <Icon name="profile" size={20} />, to: "/app/profile" },
              { id: "settings", label: "Settings", icon: <Icon name="settings" size={20} />, to: "/app/settings" },
              { id: "logout", label: "Log out", icon: <Icon name="logout" size={20} />, onSelect: () => signOut.mutate() },
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
  const { data: me } = useMe();
  const profile = useCompanyProfile({ enabled: me?.role === "employer" && me.has_profile });
  const account = menuAccount(me, me?.role === "employer" ? profile.data?.name : undefined, EMPLOYER);
  const signOut = useSignOut();
  return (
    <AppShell
      home="/company"
      nav={EMPLOYER_NAV}
      actions={
        <>
          <NotificationCenter items={EMPLOYER_NOTIFICATIONS} settingsTo="/company/settings" />
          <AccountMenu
            account={account}
            items={[
              { id: "company", label: "Company profile", icon: <Icon name="company" size={20} />, to: "/company/profile" },
              { id: "settings", label: "Settings", icon: <Icon name="settings" size={20} />, to: "/company/settings" },
              { id: "logout", label: "Log out", icon: <Icon name="logout" size={20} />, onSelect: () => signOut.mutate() },
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
