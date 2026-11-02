import { useParams } from "react-router";
import { StudentLayout } from "@/app/layouts";
import { Cluster, PageBody, Stack, StickyBar, TwoColumn } from "@/components/layout";
import { FactList, MatchScore, SkillBreakdown } from "@/components/domain";
import { Icon } from "@/components/icons";
import { Avatar, Button, Card, Container, EmptyState, PageHeader, Skeleton, Tag, Tray, BackLink } from "@/components/ui";
import { STUDENT_SKILLS, VACANCIES } from "@/mocks/data";
import { StateSwitcher, useViewState } from "@/components/dev";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Detail — one record and what to do with it (vacancy, candidate, company).
 * PageHeader (eyebrow = back link, title, facts as description, secondary actions) →
 * TwoColumn side=end: main = Card with prose sections (h3 + text / lists);
 * aside (360, sticky) = the decision panel: match summary + breakdown + primary action on the tray footer.
 * Below 1024px the aside moves ABOVE the content (asideFirstOnMobile) and the primary action is
 * repeated in a mobile StickyBar. States: loading (skeleton), not-found, applied.
 */

const STATES = ["default", "applied", "loading", "not-found"] as const;

export function DetailTemplate() {
  const state = useViewState(STATES);
  const { id } = useParams();
  const v = VACANCIES.find((x) => x.id === id) ?? VACANCIES[0];

  if (state === "not-found") {
    return (
      <StudentLayout>
        <Container width="content">
          <PageBody className={styles.notFound}>
            <Tray>
              <EmptyState icon={<Icon name="vacancy" size={20} />} title="This vacancy is closed" description="The company stopped accepting applications. Similar vacancies are still open."
                actions={<Button size="sm">See similar vacancies</Button>} />
            </Tray>
          </PageBody>
        </Container>
        <StateSwitcher states={STATES} />
      </StudentLayout>
    );
  }

  const loading = state === "loading";
  const applied = state === "applied";
  const primary = applied
    ? <Button variant="secondary" size="sm" icon={<Icon name="check" />} disabled>Applied</Button>
    : <Button size="sm">Apply now</Button>;

  return (
    <StudentLayout>
      <Container>
        <PageHeader
          eyebrow={<BackLink to="/app/vacancies">Vacancies</BackLink>}
          title={loading ? <Skeleton width={320} height={24} /> : v.title}
          description={
            loading ? <Skeleton width={240} height={14} /> : (
              <FactList facts={[
                { icon: "company", label: v.company },
                { icon: "location", label: `${v.location} · ${v.format}` },
                { icon: "duration", label: v.duration },
                { icon: "salary", label: v.salary },
              ]} />
            )
          }
          actions={
            <Cluster gap={8}>
              <Button variant="secondary" size="sm" icon={<Icon name="saved" />}>Save</Button>
              <Button variant="ghost" size="sm" icon={<Icon name="copy" />} aria-label="Copy link" />
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
                header={loading ? undefined : <><Tag tone="accent">Internship</Tag><span className={styles.rowMeta}>Apply by 30 Nov</span></>}
                footer={loading ? undefined : <><span>{applied ? "Applied 2 days ago" : "Takes 1 minute"}</span>{primary}</>}
              >
                {loading ? (
                  <Stack gap={12}><Skeleton width={120} height={28} /><Skeleton height={60} /></Stack>
                ) : (
                  <div className={styles.asideBlock}>
                    <MatchScore score={v.match ?? 0} size="lg" />
                    <div className={styles.divider} />
                    <SkillBreakdown skills={v.skills} have={STUDENT_SKILLS} />
                  </div>
                )}
              </Tray>
            }
            main={
              <Card padding="lg">
                {loading ? (
                  <Stack gap={12}>{[1, 2, 3, 4].map((i) => <Skeleton key={i} height={14} width={i === 4 ? "60%" : "100%"} />)}</Stack>
                ) : (
                  <Stack gap={24}>
                    <Cluster gap={12}>
                      <Avatar name={v.company} shape="square" />
                      <div className={styles.rowMain}>
                        <span className={styles.rowTitle}>{v.company}</span>
                        <span className={styles.rowMeta}>Fintech · 10 000+ employees</span>
                      </div>
                    </Cluster>
                    <div className={styles.prose}>
                      <p>Join the Payments team and build services used by 14 million people every day. You'll ship real features with a mentor from week one.</p>
                      <h3>What you'll do</h3>
                      <ul>
                        <li>Build and test REST endpoints in Python (FastAPI)</li>
                        <li>Write SQL for reporting and fix slow queries</li>
                        <li>Take part in code review and weekly demos</li>
                      </ul>
                      <h3>What we offer</h3>
                      <ul>
                        <li>200 000 ₸ per month, flexible hours around your studies</li>
                        <li>A full-time offer for the best interns</li>
                      </ul>
                    </div>
                  </Stack>
                )}
              </Card>
            }
          />
          <StickyBar mobileOnly>
            <MatchScore score={v.match ?? 0} compact />
            {primary}
          </StickyBar>
        </PageBody>
      </Container>
      <StateSwitcher states={STATES} />
    </StudentLayout>
  );
}
