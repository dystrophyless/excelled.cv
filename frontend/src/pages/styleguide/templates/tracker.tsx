import { useState } from "react";
import { Link } from "react-router";
import { StudentLayout } from "@/app/layouts";
import { PageBody, Stack } from "@/components/layout";
import { StatusTag, type ApplicationStatus } from "@/components/domain";
import { Icon } from "@/components/icons";
import { Avatar, Button, Card, Container, DropdownMenu, EmptyState, PageHeader, SegmentedControl, Skeleton, toast } from "@/components/ui";
import { APPLICATIONS, type StudentApplication } from "@/mocks/data";
import { StateSwitcher, useViewState } from "@/components/dev";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Tracker (list) — things moving through statuses, owned by the viewer (student applications).
 * PageHeader → SegmentedControl underline = status groups with live counts → one Card of rows:
 * logo · title link + meta · next-step note · StatusTag · "⋯" menu. Tabs filter for real.
 * Withdraw is reversible → act immediately + toast with Undo (no confirmation modal).
 * An empty group gets its own short empty message; a user with no applications at all gets the first-run EmptyState.
 */

const STATES = ["default", "loading", "empty"] as const;

const GROUPS: { value: string; label: string; statuses: ApplicationStatus[]; empty: string }[] = [
  { value: "active", label: "Active", statuses: ["applied", "viewed", "shortlisted", "interview"], empty: "No active applications." },
  { value: "interview", label: "Interviews", statuses: ["interview"], empty: "No interviews yet — they show up here with the date and link." },
  { value: "offer", label: "Offers", statuses: ["offer", "hired"], empty: "No offers yet. Keep applying — offers appear here first." },
  { value: "closed", label: "Closed", statuses: ["rejected", "withdrawn"], empty: "Nothing closed." },
];

export function TrackerTemplate() {
  const state = useViewState(STATES);
  const [apps, setApps] = useState<StudentApplication[]>(state === "empty" ? [] : APPLICATIONS);
  const [group, setGroup] = useState("active");
  const current = GROUPS.find((g) => g.value === group)!;
  const rows = apps.filter((a) => current.statuses.includes(a.status));

  const withdraw = (a: StudentApplication) => {
    const before = apps;
    setApps(apps.map((x) => (x.id === a.id ? { ...x, status: "withdrawn", note: undefined, updatedAgo: "just now" } : x)));
    toast("Application withdrawn", {
      description: `${a.vacancy.company} will no longer see it.`,
      action: { label: "Undo", onClick: () => setApps(before) },
    });
  };

  return (
    <StudentLayout>
      <Container width="content">
        <PageHeader title="Applications" description="Follow every application from Applied to Offer." />
        <PageBody>
          {state !== "loading" && apps.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Icon name="application" size={20} />}
                title="You haven't applied yet"
                description="Find a vacancy that matches your skills and apply in one minute."
                actions={<Button size="sm" icon={<Icon name="search" />}>Browse vacancies</Button>}
              />
            </Card>
          ) : (
            <Stack gap={16}>
              <SegmentedControl
                aria-label="Status"
                variant="underline"
                value={group}
                onChange={setGroup}
                options={GROUPS.map((g) => ({ value: g.value, label: g.label, count: apps.filter((a) => g.statuses.includes(a.status)).length }))}
              />
              <Card padding="sm" data-testid="applications-list">
                <div className={styles.rows}>
                  {state === "loading" &&
                    [1, 2, 3].map((i) => (
                      <div key={i} className={styles.rowItem}><Skeleton width={40} height={40} radius={12} /><Stack gap={6}><Skeleton width={220} height={14} /><Skeleton width={140} height={12} /></Stack></div>
                    ))}
                  {state !== "loading" && rows.length === 0 && <p className={styles.rowsEmpty}>{current.empty}</p>}
                  {state !== "loading" &&
                    rows.map((a) => (
                      <div key={a.id} className={styles.rowItem} data-testid="application-row" data-status={a.status}>
                        <Avatar name={a.vacancy.company} shape="square" />
                        <div className={styles.rowMain}>
                          <span className={styles.rowTitle}><Link to={`/app/vacancies/${a.vacancy.id}`}>{a.vacancy.title}</Link></span>
                          <span className={styles.rowMeta}>{a.vacancy.company} · updated {a.updatedAgo}</span>
                          {a.note && <span className={styles.rowNote}><Icon name="interview" size={14} />{a.note}</span>}
                        </div>
                        <StatusTag status={a.status} />
                        <DropdownMenu
                          trigger={(p) => <Button {...p} variant="ghost" size="sm" icon={<Icon name="more" />} aria-label={`Actions for ${a.vacancy.title}`} />}
                          items={[
                            { id: "open", label: "Open vacancy", icon: "external", to: `/app/vacancies/${a.vacancy.id}` },
                            ...(current.value !== "closed"
                              ? ["separator" as const, { id: "withdraw", label: "Withdraw application", icon: "delete" as const, danger: true, onSelect: () => withdraw(a) }]
                              : []),
                          ]}
                        />
                      </div>
                    ))}
                </div>
              </Card>
            </Stack>
          )}
        </PageBody>
      </Container>
      <StateSwitcher states={STATES} />
    </StudentLayout>
  );
}
