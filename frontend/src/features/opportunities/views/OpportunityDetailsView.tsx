import { useNavigate } from "react-router";
import { StudentLayout } from "@/app/layouts";
import { Cluster, PageBody, Section, Stack, StickyBar, TwoColumn } from "@/components/layout";
import { FactList, MatchScore, SkillBreakdown, vacancyTypeTone, type Fact } from "@/components/domain";
import { Icon } from "@/components/icons";
import {
  Avatar, BackLink, Button, Card, Container, EmptyState, ExternalLink, PageHeader, Skeleton, Tag, Tray,
} from "@/components/ui";
import { optionLabel } from "@/features/company-vacancies/model";
import { deadlineInfo, postedAgo, type OpportunityCatalog, type OpportunityDetail } from "../model";
import styles from "./opportunities.module.css";

/*
 * Detail archetype: one opportunity, everything the employer published.
 * Presentational: data and callbacks in, JSX out. `match`, `apply` and `save` are slots for the later matching, applying and
 * saving features: the application never passes them. Without them the decision panel is the requirements (Required and Nice to
 * have skills), the facts and the deadline, and stands on its own (research R11).
 */

export type OpportunityDetailsState = "ready" | "loading" | "unavailable" | "error";

export type OpportunityDetailsViewProps = {
  state: OpportunityDetailsState;
  opportunity?: OpportunityDetail;
  catalog: OpportunityCatalog;
  /** ISO date; the deadline is relative to it */
  today: string;
  /** The list with the search, filters, sort and page the student left (router state), else the plain list */
  backTo: string;
  onCopyLink: () => void;
  onRetry: () => void;
  /** Later feature — match percent and the student's skills. Never passed by the application. */
  match?: { score: number; have: string[] };
  /** Later feature — Apply. Never passed by the application. */
  apply?: { applied: boolean; onApply: () => void };
  /** Later feature — bookmark. Never passed by the application. */
  save?: { saved: boolean; onToggle: () => void };
};

const paragraphs = (text: string) => text.split("\n").filter((line) => line.trim());

export function OpportunityDetailsView(p: OpportunityDetailsViewProps) {
  const navigate = useNavigate();
  const o = p.opportunity;
  const loading = p.state === "loading";

  if (p.state === "unavailable" || (p.state === "ready" && !o)) {
    return (
      <StudentLayout>
        <Container width="content">
          <PageBody className={styles.notFound}>
            <Tray data-testid="opportunity-unavailable">
              <EmptyState
                icon={<Icon name="vacancy" size={20} />}
                title="This opportunity is no longer available"
                description="It may have closed, been paused or been removed by the company."
                actions={<Button size="sm" onClick={() => navigate(p.backTo)}>Browse opportunities</Button>}
              />
            </Tray>
          </PageBody>
        </Container>
      </StudentLayout>
    );
  }

  if (p.state === "error") {
    return (
      <StudentLayout>
        <Container width="content">
          <PageHeader eyebrow={<BackLink to={p.backTo}>Opportunities</BackLink>} title="Opportunity" />
          <PageBody>
            <Tray>
              <EmptyState
                tone="error"
                title="Couldn't load this opportunity"
                description="Check your connection and try again."
                actions={<Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={p.onRetry}>Try again</Button>}
              />
            </Tray>
          </PageBody>
        </Container>
      </StudentLayout>
    );
  }

  if (loading || !o) {
    return (
      <StudentLayout>
        <Container>
          <PageHeader
            eyebrow={<BackLink to={p.backTo}>Opportunities</BackLink>}
            title={<Skeleton width={320} height={24} />}
            description={<Skeleton width={220} height={14} />}
          />
          <PageBody>
            <TwoColumn
              sticky
              asideFirstOnMobile
              aside={
                <Tray header={<Skeleton width={80} height={20} radius={8} />} footer={<Skeleton width={140} height={14} />} aria-busy="true">
                  <Stack gap={14}>
                    <Skeleton width="70%" height={14} />
                    <Skeleton width="50%" height={14} />
                    <Skeleton height={1} />
                    <Skeleton width={80} height={12} />
                    <Cluster gap={6}><Skeleton width={64} height={26} radius={8} /><Skeleton width={52} height={26} radius={8} /><Skeleton width={72} height={26} radius={8} /></Cluster>
                  </Stack>
                </Tray>
              }
              main={
                <Stack gap={24} aria-busy="true">
                  <Card padding="lg"><Stack gap={12}>{[1, 2, 3, 4].map((i) => <Skeleton key={i} height={14} width={i === 4 ? "60%" : "100%"} />)}</Stack></Card>
                  <Card><Cluster gap={12} nowrap><Skeleton width={40} height={40} radius={10} /><Stack gap={6}><Skeleton width={160} height={14} /><Skeleton width={220} height={12} /></Stack></Cluster></Card>
                </Stack>
              }
            />
          </PageBody>
        </Container>
      </StudentLayout>
    );
  }

  const typeLabel = optionLabel(p.catalog.types, o.type) ?? "";
  const city = optionLabel(p.catalog.cities, o.city);
  const format = optionLabel(p.catalog.formats, o.format);
  const deadline = deadlineInfo(o.applyBy, p.today, true);
  const facts: Fact[] = [
    o.format === "remote"
      ? { icon: "remote", label: "Remote" }
      : { icon: "location", label: [city, format].filter(Boolean).join(" · ") },
    ...(o.duration ? [{ icon: "duration" as const, label: o.duration }] : []),
    ...(o.salary ? [{ icon: "salary" as const, label: o.salary }] : []),
  ];
  const skills = [
    ...o.requiredSkills.map((name) => ({ name, required: true })),
    ...o.niceSkills.map((name) => ({ name, required: false })),
  ];
  const c = o.company;
  const companyMeta = [optionLabel(p.catalog.industries, c.industry), optionLabel(p.catalog.companySizes, c.size), optionLabel(p.catalog.cities, c.city)].filter(Boolean);
  const host = c.website?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

  const apply = p.apply && (
    p.apply.applied
      ? <Button variant="secondary" size="sm" icon={<Icon name="check" />} disabled>Applied</Button>
      : <Button size="sm" onClick={p.apply.onApply}>Apply now</Button>
  );

  return (
    <StudentLayout>
      <Container>
        <PageHeader
          eyebrow={<BackLink to={p.backTo}>Opportunities</BackLink>}
          title={o.title}
          description={`${c.name} · ${postedAgo(o.publishedOn, p.today)}`}
          actions={
            <Cluster gap={8}>
              {p.save && (
                <Button variant="secondary" size="sm" icon={<Icon name="saved" fill={p.save.saved ? "currentColor" : "none"} />} aria-pressed={p.save.saved} onClick={p.save.onToggle}>
                  {p.save.saved ? "Saved" : "Save"}
                </Button>
              )}
              <Button variant="secondary" size="sm" icon={<Icon name="copy" />} onClick={p.onCopyLink}>Copy link</Button>
            </Cluster>
          }
        />
        <PageBody>
          <TwoColumn
            sticky
            asideFirstOnMobile
            aside={
              <Tray
                data-testid="decision-panel"
                header={
                  <>
                    <Tag tone={vacancyTypeTone(o.type)}>{typeLabel}</Tag>
                    <span className={styles.rowMeta}>{optionLabel(p.catalog.fields, o.field)}</span>
                  </>
                }
                footer={
                  <>
                    <span className={styles.deadline} data-soon={deadline.soon || undefined} data-testid="opportunity-deadline">
                      <Icon name={deadline.soon ? "interview" : "deadline"} size={16} />
                      {deadline.label}
                    </span>
                    {apply}
                  </>
                }
              >
                <div className={styles.asideBlock}>
                  {p.match && (
                    <>
                      <MatchScore score={p.match.score} size="lg" />
                      <div className={styles.divider} />
                    </>
                  )}
                  <SkillBreakdown skills={skills} have={p.match?.have} />
                  <div className={styles.divider} />
                  <FactList layout="list" facts={facts} />
                </div>
              </Tray>
            }
            main={
              <Stack gap={24}>
                <Section title="About this opportunity">
                  <Card padding="lg">
                    <div className={styles.prose} data-testid="opportunity-description">
                      {paragraphs(o.description).map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  </Card>
                </Section>
                <Section title={`About ${c.name}`}>
                  <Card padding="lg" data-testid="company-card">
                    <div className={styles.company}>
                      <Cluster gap={12} nowrap>
                        <Avatar name={c.name} shape="square" />
                        <div className={styles.rowMain}>
                          <span className={styles.rowTitle}>{c.name}</span>
                          {companyMeta.length > 0 && <span className={styles.rowMeta}>{companyMeta.join(" · ")}</span>}
                        </div>
                      </Cluster>
                      {c.description && (
                        <div className={styles.prose}>
                          {paragraphs(c.description).map((line, i) => <p key={i}>{line}</p>)}
                        </div>
                      )}
                      {c.website && host && (
                        <ExternalLink href={c.website} target="_blank" rel="noopener noreferrer">{host}</ExternalLink>
                      )}
                    </div>
                  </Card>
                </Section>
              </Stack>
            }
          />
          {p.match && p.apply && (
            <StickyBar mobileOnly>
              <MatchScore score={p.match.score} compact />
              {apply}
            </StickyBar>
          )}
        </PageBody>
      </Container>
    </StudentLayout>
  );
}
