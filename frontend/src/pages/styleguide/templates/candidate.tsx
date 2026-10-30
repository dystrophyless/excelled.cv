import { useState } from "react";
import { useParams } from "react-router";
import { EmployerLayout } from "@/app/layouts";
import { Cluster, PageBody, Stack, StickyBar, TwoColumn } from "@/components/layout";
import { APPLICATION_STATUS, FactList, MatchScore, SkillBreakdown, SkillChip, StatusTag, type ApplicationStatus } from "@/components/domain";
import { Icon } from "@/components/icons";
import { Avatar, BackLink, Button, Card, Container, DropdownMenu, PageHeader, Tray, toast } from "@/components/ui";
import { CANDIDATES, VACANCIES } from "@/mocks/data";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Detail (employer) — one candidate for one vacancy, and the decision to move them.
 * Same archetype as the vacancy detail: PageHeader (BackLink to the pipeline · name · facts · secondary actions) →
 * TwoColumn end 360 sticky: main = Card with the profile; aside = decision Tray
 * (header: current stage · card: MatchScore lg + SkillBreakdown subject="candidate" · footer: next-stage primary + ⋯).
 * Moving a candidate is reversible → toast with Undo. "Not selected" is neutral wording, never "Rejected".
 */

const NEXT: Partial<Record<ApplicationStatus, { to: ApplicationStatus; label: string }>> = {
  applied: { to: "shortlisted", label: "Shortlist" },
  shortlisted: { to: "interview", label: "Invite to interview" },
  interview: { to: "offer", label: "Make an offer" },
  offer: { to: "hired", label: "Mark as hired" },
};

const CANDIDATE_SKILLS: Record<string, string[]> = {
  c1: ["Python", "FastAPI", "SQL", "Git", "PostgreSQL", "English"],
};

export function CandidateTemplate() {
  const { id = "c1" } = useParams();
  const c = CANDIDATES.find((x) => x.id === id) ?? CANDIDATES[0];
  const vacancy = VACANCIES[0];
  const skills = CANDIDATE_SKILLS[c.id] ?? c.skills;
  const [status, setStatus] = useState<ApplicationStatus>(c.status);
  const next = NEXT[status];

  const move = (to: ApplicationStatus) => {
    const before = status;
    setStatus(to);
    toast(to === "rejected" ? `${c.name} · Not selected` : `${c.name} → ${APPLICATION_STATUS[to].label}`, {
      description: to === "interview" ? "We emailed them to pick a time." : undefined,
      action: { label: "Undo", onClick: () => setStatus(before) },
    });
  };

  const primary = next
    ? <Button size="sm" onClick={() => move(next.to)}>{next.label}</Button>
    : <Button size="sm" variant="secondary" disabled>{APPLICATION_STATUS[status].label}</Button>;

  return (
    <EmployerLayout>
      <Container>
        <PageHeader
          eyebrow={<BackLink to={`/company/vacancies/${vacancy.id}`}>{vacancy.title}</BackLink>}
          title={c.name}
          description={<FactList facts={[{ icon: "education", label: `${c.university} · ${c.year}` }, { icon: "location", label: "Almaty" }, { icon: "duration", label: `Applied ${c.appliedAgo}` }]} />}
          actions={
            <Cluster gap={8}>
              <Button variant="secondary" size="sm" icon={<Icon name="download" />} onClick={() => toast("Downloading CV…")}>CV</Button>
              <Button variant="secondary" size="sm" icon={<Icon name="email" />} onClick={() => toast("Email copied", { description: "maya@sdu.edu.kz" })}>Email</Button>
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
                header={<><StatusTag status={status} /><span className={styles.rowMeta}>for {vacancy.title}</span></>}
                footer={
                  <>
                    <DropdownMenu
                      trigger={(p) => <Button {...p} variant="ghost" size="sm" icon={<Icon name="more" />} aria-label="More stage actions" />}
                      items={[
                        ...(Object.keys(NEXT) as ApplicationStatus[]).filter((s) => s !== status && NEXT[s]).map((s) => ({
                          id: s, label: `Move to ${s === "applied" ? "New" : APPLICATION_STATUS[s].label}`, icon: "pipeline" as const, onSelect: () => move(s),
                        })),
                        "separator" as const,
                        { id: "reject", label: "Not selected", icon: "rejected" as const, danger: true, onSelect: () => move("rejected") },
                      ]}
                    />
                    {primary}
                  </>
                }
              >
                <div className={styles.asideBlock}>
                  <MatchScore score={c.match} size="lg" />
                  <div className={styles.divider} />
                  <SkillBreakdown skills={vacancy.skills} have={skills} subject="candidate" />
                </div>
              </Tray>
            }
            main={
              <Card padding="lg">
                <Stack gap={24}>
                  <Cluster gap={12}>
                    <Avatar name={c.name} size="lg" />
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>{c.name}</span>
                      <span className={styles.rowMeta}>Computer Science · {c.university} · graduates 2027</span>
                    </div>
                  </Cluster>
                  <div className={styles.prose}>
                    <p>Third-year CS student who likes building APIs. Interned at a local startup last summer and ships side projects in Python.</p>
                    <h3>Skills</h3>
                    <Cluster gap={6}>{skills.map((s) => <SkillChip key={s} name={s} />)}</Cluster>
                    <h3>Projects</h3>
                    <ul>
                      <li><strong>Campus events API</strong> — FastAPI + PostgreSQL, used by 3 student clubs</li>
                      <li><strong>Exam schedule bot</strong> — Telegram bot with 1 200 users</li>
                    </ul>
                    <h3>Languages</h3>
                    <p>Kazakh (native) · Russian (fluent) · English (B2)</p>
                  </div>
                </Stack>
              </Card>
            }
          />
          <StickyBar mobileOnly>
            <MatchScore score={c.match} compact />
            {primary}
          </StickyBar>
        </PageBody>
      </Container>
    </EmployerLayout>
  );
}
