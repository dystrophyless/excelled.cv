import { useEffect, useState } from "react";
import { StudentLayout } from "@/app/layouts";
import { FormSection, PageBody, Stack, TwoColumn } from "@/components/layout";
import { Icon, type IconName } from "@/components/icons";
import { Button, Card, Container, Modal, PageHeader, PasswordField, Switch, TextField, toast } from "@/components/ui";
import { StateSwitcher, useViewState } from "@/components/dev";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Settings — account-level preferences, rarely visited.
 * PageHeader → TwoColumn side=start: aside 220 = section nav grouped by category (group label + links), sticky,
 * the section in view is highlighted (scroll spy); main = one Card per category with FormSections.
 * Switches save instantly (+ toast "Saved"); text changes have their own small button inside the section.
 * The danger zone is the last card; deleting goes through a confirmation Modal that names the consequence.
 */

const STATES = ["default", "confirm-delete"] as const;

const NAV: { group: string; items: { id: string; label: string; icon: IconName }[] }[] = [
  { group: "Account", items: [{ id: "email", label: "Email", icon: "email" }, { id: "password", label: "Password", icon: "lock" }] },
  { group: "Preferences", items: [{ id: "notifications", label: "Notifications", icon: "notifications" }, { id: "privacy", label: "Privacy", icon: "hide" }] },
  { group: "Danger zone", items: [{ id: "delete", label: "Delete account", icon: "delete" }] },
];
const IDS = NAV.flatMap((g) => g.items.map((i) => i.id));

/** Highlights the section closest to the top of the viewport. */
function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -55% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return [active, setActive] as const;
}

export function SettingsTemplate() {
  const state = useViewState(STATES);
  const [confirm, setConfirm] = useState(state === "confirm-delete");
  const [active, setActive] = useScrollSpy(IDS);
  const saved = () => toast("Saved");

  const jump = (id: string) => {
    setActive(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <StudentLayout>
      <Container>
        <PageHeader title="Settings" description="Your account, notifications and privacy." />
        <PageBody>
          <TwoColumn
            side="start"
            asideWidth={220}
            sticky
            hideAsideOnMobile
            aside={
              <nav className={styles.settingsNav} aria-label="Settings sections">
                {NAV.map((g) => (
                  <div key={g.group} className={styles.settingsGroup}>
                    <span className={styles.settingsGroupLabel}>{g.group}</span>
                    {g.items.map((s) => (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        className={styles.settingsLink}
                        aria-current={active === s.id ? "true" : undefined}
                        onClick={(e) => { e.preventDefault(); jump(s.id); }}
                      >
                        <Icon name={s.icon} size={16} />{s.label}
                      </a>
                    ))}
                  </div>
                ))}
              </nav>
            }
            main={
              <Stack gap={24}>
                <Card padding="lg">
                  {/* the sign-in email can't be changed — shown read-only, no action next to it */}
                  <FormSection id="email" className={styles.anchor} title="Email" description="We send interview invites and status updates here.">
                    <TextField label="Email" type="email" value="maya@sdu.edu.kz" readOnly hint="This is your sign-in email and can't be changed." />
                  </FormSection>
                  <FormSection id="password" className={styles.anchor} title="Password" description="Use at least 8 characters you don't use elsewhere.">
                    <PasswordField label="Current password" autoComplete="current-password" />
                    <PasswordField label="New password" autoComplete="new-password" hint="At least 8 characters" />
                    <div><Button variant="secondary" size="sm" onClick={() => toast.success("Password updated")}>Update password</Button></div>
                  </FormSection>
                </Card>

                <Card padding="lg">
                  <FormSection id="notifications" className={styles.anchor} title="Notifications" description="Email only. Changes save automatically.">
                    <Switch label="Application status changes" description="Viewed, interview invites, offers" defaultChecked onChange={saved} />
                    <Switch label="New matching vacancies" description="A weekly digest, at most once a week" defaultChecked onChange={saved} />
                    <Switch label="Tips and product news" onChange={saved} />
                  </FormSection>
                  <FormSection id="privacy" className={styles.anchor} title="Privacy" description="Who can find your profile.">
                    <Switch label="Visible to employers" description="Companies can find you in search and invite you to apply" defaultChecked onChange={saved} />
                    <Switch label="Show my university" description="Shown on your profile and applications" defaultChecked onChange={saved} />
                  </FormSection>
                </Card>

                <Card padding="lg">
                  <FormSection id="delete" className={styles.anchor} title="Delete account" description="Your profile and applications are removed for good.">
                    <p className={styles.danger}>Companies you applied to keep the copy of your application they already received.</p>
                    <div><Button variant="destructive" size="sm" onClick={() => setConfirm(true)}>Delete account</Button></div>
                  </FormSection>
                </Card>
              </Stack>
            }
          />
        </PageBody>
      </Container>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete your account?"
        description="Your profile, skills and all 4 applications will be deleted. This can't be undone."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirm(false)}>Keep account</Button>
            <Button variant="destructive" size="sm" onClick={() => { setConfirm(false); toast("Account deleted"); }}>Delete account</Button>
          </>
        }
      />
      <StateSwitcher states={STATES} />
    </StudentLayout>
  );
}
