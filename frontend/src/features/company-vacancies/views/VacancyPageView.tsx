import { useNavigate } from "react-router";
import { EmployerLayout } from "@/app/layouts";
import { Cluster, PageBody, Section, Stack, TwoColumn } from "@/components/layout";
import { FactList, SkillChip, type Fact } from "@/components/domain";
import { Icon } from "@/components/icons";
import { BackLink, Button, Card, Container, DropdownMenu, EmptyState, PageHeader, SectionLabel, Skeleton, Tag, Tray } from "@/components/ui";
import {
  formatDay, optionLabel, plural, statusLine,
  type Catalog, type VacancyAction, type VacancyItem, type VacancyNotice, type VacancyRoutes,
} from "../model";
import { NoticeAlert, VacancyDialogs, VacancyStatusTag, vacancyMenuItems, type VacancyDialogState } from "./parts";
import styles from "./vacancies.module.css";

export type VacancyPageState = "ready" | "loading" | "error" | "not-found";

export type VacancyPageViewProps = {
  state: VacancyPageState;
  vacancy?: VacancyItem;
  catalog: Catalog;
  today: string;
  notice?: VacancyNotice;
  dialog?: VacancyDialogState;
  busy?: boolean;
  reopenError?: string;
  routes: VacancyRoutes;
  onAction: (action: VacancyAction, vacancy: VacancyItem) => void;
  onRetry?: () => void;
  onDialogCancel: () => void;
  onDialogConfirm: (kind: "close" | "reopen" | "delete", applyBy?: string) => void;
};

const APPLICANTS_EMPTY: Record<VacancyItem["status"], { title: string; description: string }> = {
  draft: { title: "No applicants yet", description: "Publish the vacancy and students can start applying." },
  open: { title: "No applicants yet", description: "When students apply, they appear here ranked by skill match." },
  paused: { title: "No applicants yet", description: "New applications are paused. Resume the vacancy to receive them." },
  closed: { title: "No applicants", description: "Reopen the vacancy with a new deadline to receive applications." },
};

export function VacancyPageView(p: VacancyPageViewProps) {
  const navigate = useNavigate();
  const v = p.vacancy;
  const dialogs = (
    <VacancyDialogs dialog={p.dialog ?? null} today={p.today} busy={p.busy} reopenError={p.reopenError} onCancel={p.onDialogCancel} onConfirm={p.onDialogConfirm} />
  );

  if (p.state === "not-found" || (p.state === "ready" && !v)) {
    return (
      <EmployerLayout>
        <Container width="content">
          <PageBody className={styles.notFound}>
            <Tray>
              <EmptyState
                icon={<Icon name="vacancy" size={20} />}
                title="Vacancy not found"
                description="It may have been deleted, or the link is wrong."
                actions={<Button size="sm" onClick={() => navigate(p.routes.list)}>Back to vacancies</Button>}
              />
            </Tray>
          </PageBody>
        </Container>
      </EmployerLayout>
    );
  }

  if (p.state === "error") {
    return (
      <EmployerLayout>
        <Container>
          <PageHeader eyebrow={<BackLink to={p.routes.list}>Vacancies</BackLink>} title="Vacancy" />
          <PageBody>
            <Card>
              <EmptyState
                tone="error"
                title="Couldn't load this vacancy"
                description="Check your connection and try again."
                actions={<Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={p.onRetry}>Try again</Button>}
              />
            </Card>
          </PageBody>
        </Container>
      </EmployerLayout>
    );
  }

  if (p.state === "loading" || !v) {
    return (
      <EmployerLayout>
        <Container>
          <PageHeader
            eyebrow={<BackLink to={p.routes.list}>Vacancies</BackLink>}
            title={<Skeleton width={320} height={24} />}
            description={<Skeleton width={260} height={14} />}
          />
          <PageBody aria-busy="true">
            <TwoColumn
              sticky
              aside={<Tray><Stack gap={12}><Skeleton width={160} height={14} /><Skeleton height={14} /><Skeleton width="70%" height={14} /><Skeleton height={48} /></Stack></Tray>}
              main={
                <Stack gap={24}>
                  <Card><Stack gap={12}><Skeleton width={160} height={16} /><Skeleton height={64} /></Stack></Card>
                  <Card padding="lg"><Stack gap={12}>{[1, 2, 3].map((i) => <Skeleton key={i} height={14} width={i === 3 ? "60%" : "100%"} />)}</Stack></Card>
                </Stack>
              }
            />
          </PageBody>
        </Container>
      </EmployerLayout>
    );
  }

  const isDraft = v.status === "draft";
  const facts: Fact[] = [
    ...(v.format === "remote"
      ? [{ icon: "remote" as const, label: "Remote" }]
      : v.city || v.format
        ? [{ icon: "location" as const, label: [optionLabel(p.catalog.cities, v.city), optionLabel(p.catalog.formats, v.format)].filter(Boolean).join(" · ") }]
        : []),
    ...(v.duration ? [{ icon: "duration" as const, label: v.duration }] : []),
    ...(v.salary ? [{ icon: "salary" as const, label: v.salary }] : []),
    ...(v.applyBy ? [{ icon: "deadline" as const, label: `Apply by ${formatDay(v.applyBy)}` }] : []),
  ];
  // Until the pipeline feature exists the area only reports the numbers; with none it is an empty state.
  const empty = v.applicants > 0
    ? { title: `${plural(v.applicants, "applicant")}${v.newApplicants > 0 ? ` · ${v.newApplicants} new` : ""}`, description: "The applicants board arrives with the next update. Applicants keep their stage whatever the vacancy status." }
    : APPLICANTS_EMPTY[v.status];

  // One message at most: a refused action wins over the status explanation.
  const statusNotice: VacancyNotice | undefined = p.notice ?? (
    v.status === "paused"
      ? { tone: "info", title: "Paused · hidden from search", text: `Students can't find it or apply. Resume to take applications again${v.applyBy ? `; the deadline stays ${formatDay(v.applyBy)}` : ""}.`, action: { label: "Resume", onClick: () => p.onAction("resume", v) } }
      : v.status === "closed"
        ? { tone: "info", title: "This vacancy is closed", text: "Students can't find it or apply, and your applicants stay exactly where they are. Reopen it with a new deadline to take applications again.", action: { label: "Reopen", onClick: () => p.onAction("reopen", v) } }
        : undefined
  );

  return (
    <EmployerLayout>
      <Container>
        <PageHeader
          eyebrow={<BackLink to={p.routes.list}>Vacancies</BackLink>}
          title={v.title}
          description={
            <span className={styles.statusLine} data-testid="vacancy-status-line">
              <VacancyStatusTag status={v.status} />
              <span>{statusLine(v)}</span>
              {!isDraft && <span>· {plural(v.applicants, "applicant")}{v.newApplicants > 0 ? ` (${v.newApplicants} new)` : ""}</span>}
            </span>
          }
          actions={
            <Cluster gap={8}>
              {isDraft && <Button size="sm" icon={<Icon name="postVacancy" />} onClick={() => p.onAction("publish", v)}>Publish</Button>}
              <Button variant="secondary" size="sm" icon={<Icon name="edit" />} onClick={() => navigate(p.routes.edit(v.id))}>Edit vacancy</Button>
              <DropdownMenu
                trigger={(t) => <Button {...t} variant="secondary" size="sm" icon={<Icon name="more" />} aria-label="More actions" />}
                items={vacancyMenuItems(v, { editHref: p.routes.edit(v.id), onAction: p.onAction, withEdit: false })}
              />
            </Cluster>
          }
        />
        <PageBody>
          {statusNotice && <NoticeAlert notice={statusNotice} />}
          <TwoColumn
            sticky
            aside={
              <Tray
                data-testid="vacancy-summary"
                header={
                  <>
                    {v.type ? <Tag tone={v.type === "internship" ? "accent" : "neutral"}>{optionLabel(p.catalog.types, v.type)}</Tag> : <Tag>No type yet</Tag>}
                    <span className={styles.rowMeta}>{optionLabel(p.catalog.fields, v.field) ?? "No field yet"}</span>
                  </>
                }
                footer={<span>Updated {formatDay(v.updatedOn)}</span>}
              >
                <div className={styles.asideBlock}>
                  {facts.length > 0 ? <FactList layout="list" facts={facts} /> : <span className={styles.rowMeta}>No details yet</span>}
                  <div className={styles.divider} />
                  <div className={styles.skillGroup}>
                    <SectionLabel>Required</SectionLabel>
                    <div className={styles.skillRow}>
                      {v.requiredSkills.length ? v.requiredSkills.map((s) => <SkillChip key={s} name={s} />) : <span className={styles.rowMeta}>None yet</span>}
                    </div>
                  </div>
                  <div className={styles.skillGroup}>
                    <SectionLabel>Nice to have</SectionLabel>
                    <div className={styles.skillRow}>
                      {v.niceSkills.length ? v.niceSkills.map((s) => <SkillChip key={s} name={s} nice />) : <span className={styles.rowMeta}>None</span>}
                    </div>
                  </div>
                </div>
              </Tray>
            }
            main={
              <Stack gap={24}>
                <Section title="Applicants">
                  <Card data-testid="applicants-area">
                    <EmptyState icon={<Icon name="candidates" size={20} />} title={empty.title} description={empty.description} />
                  </Card>
                </Section>
                <Section title="About this vacancy">
                  <Card padding="lg">
                    {v.description ? (
                      <div className={styles.prose}><p>{v.description}</p></div>
                    ) : (
                      <span className={styles.rowMeta}>No description yet. Add one in Edit vacancy.</span>
                    )}
                  </Card>
                </Section>
              </Stack>
            }
          />
        </PageBody>
      </Container>
      {dialogs}
    </EmployerLayout>
  );
}
