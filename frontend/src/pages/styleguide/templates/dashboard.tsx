import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { StudentLayout } from "@/app/layouts";
import { Cluster, PageBody, Section, Stack, TwoColumn } from "@/components/layout";
import { MatchScore, type ApplicationStatus } from "@/components/domain";
import { Icon, type IconName } from "@/components/icons";
import { Alert, Avatar, Button, Card, Container, EmptyState, PageHeader, Skeleton, Tag, TextLink, Tooltip, Tray, toast } from "@/components/ui";
import { STUDENT_SKILLS, VACANCIES } from "@/mocks/data";
import { StateSwitcher, useViewState } from "@/components/dev";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Dashboard — the role's home. It answers four questions, in this order:
 *   1. What's next?             → overview row: Up next (dated event) · Profile strength · This week
 *   2. What fits me best?       → Top matches: a compact list (rows, not big cards), max 4
 *   3. How are my applications? → aside: status funnel + recent activity
 *   4. How do I get better?     → Skills that unlock more vacancies (the matching insight)
 *
 * STATES ARE PER SECTION. Each block is its own query in the real page, so each block has its own
 * loading / ready / empty / error — never a full-page spinner or a full-page error.
 *   loading → skeleton in the exact shape of that block, footers kept (no layout jump), header summary skeleton
 *   empty   → first run: every block explains what will appear and offers the one next step
 *   error   → only the blocks that failed show an inline Alert with "Try again"; the rest stay usable
 * Overview trays share one height (Tray stretch).
 */

const STATES = ["default", "loading", "empty", "error"] as const;
type Status = "loading" | "ready" | "empty" | "error";
type Block = "upNext" | "profile" | "week" | "matches" | "skills" | "funnel" | "activity";

const FUNNEL: { status: ApplicationStatus; label: string; count: number }[] = [
  { status: "applied", label: "Applied", count: 4 },
  { status: "viewed", label: "Viewed", count: 2 },
  { status: "interview", label: "Interview", count: 1 },
  { status: "offer", label: "Offer", count: 0 },
];

const ACTIVITY: { icon: IconName; text: ReactNode; when: string; tone?: "warning" | "accent" | "success" }[] = [
  { icon: "interview", text: <><strong>Kaspi.kz</strong> invited you to an interview</>, when: "Today", tone: "warning" },
  { icon: "show", text: <><strong>EPAM Kazakhstan</strong> viewed your application</>, when: "Yesterday", tone: "accent" },
  { icon: "match", text: <>New strong match: <strong>Junior Data Engineer</strong></>, when: "2 days ago", tone: "success" },
  { icon: "application", text: <>You applied to <strong>Data Analyst Intern</strong></>, when: "3 days ago" },
];

/* For each missing skill: who asks for it (concrete) and how much the match would rise (the payoff) */
const SKILL_GAPS = [
  { skill: "Docker", companies: ["Kaspi.kz", "Beeline", "Jusan Bank", "EPAM", "Kolesa"], lift: 12 },
  { skill: "Redis", companies: ["Kaspi.kz", "Chocofamily", "inDrive"], lift: 6 },
  { skill: "Linux", companies: ["EPAM", "Jusan Bank", "Beeline"], lift: 5 },
];

const requiredBy = (companies: string[]) =>
  companies.length > 2 ? `${companies.slice(0, 2).join(", ")} + ${companies.length - 2} more` : companies.join(" and ");

/** Which blocks fail in the "error" preview: the realistic case — one service is down, the rest works. */
const FAILING: Block[] = ["matches", "skills"];

/** Compact error inside a block: what failed + Try again. */
function BlockError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <Alert tone="error" title={`Couldn't load ${what}`} action={<Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={onRetry}>Try again</Button>}>
      Check your connection — the rest of the page still works.
    </Alert>
  );
}

/** Small first-run note inside a block: icon tile + what will appear here. */
function BlockEmpty({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <div className={styles.blockEmpty}>
      <span className={styles.activityIcon}><Icon name={icon} size={14} /></span>
      <span className={styles.rowMain}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowMeta}>{text}</span>
      </span>
    </div>
  );
}

export function DashboardTemplate() {
  const state = useViewState(STATES);
  const navigate = useNavigate();
  const [added, setAdded] = useState<string[]>([]);
  const [retried, setRetried] = useState<Partial<Record<Block, Status>>>({});
  const top = [...VACANCIES].sort((a, b) => (b.match ?? 0) - (a.match ?? 0)).slice(0, 4);

  const status = (block: Block): Status => {
    if (retried[block]) return retried[block]!;
    if (state === "loading") return "loading";
    if (state === "empty") return "empty";
    if (state === "error" && FAILING.includes(block)) return "error";
    return "ready";
  };

  // In the real page: refetch() of that block's query. Here: loading for a moment, then data.
  const retry = (block: Block) => {
    setRetried((r) => ({ ...r, [block]: "loading" }));
    window.setTimeout(() => setRetried((r) => ({ ...r, [block]: "ready" })), 900);
  };

  const s = {
    upNext: status("upNext"), profile: status("profile"), week: status("week"), matches: status("matches"),
    skills: status("skills"), funnel: status("funnel"), activity: status("activity"),
  };
  const firstRun = state === "empty";

  return (
    <StudentLayout>
      <Container>
        <PageHeader
          eyebrow="Thursday, 30 October"
          title="Good afternoon, Maya"
          description={
            state === "loading" ? <Skeleton width={340} height={14} /> :
            firstRun ? "Let's set up your profile — matches appear as soon as you add skills." :
            "You have an interview on Tuesday and 3 new matches this week."
          }
          // first run: "Add skills" is the one primary action, so the header button steps down to secondary
          actions={<Button variant={firstRun ? "secondary" : "primary"} icon={<Icon name="search" />} onClick={() => navigate("/app/vacancies")}>Find vacancies</Button>}
        />
        <PageBody>
          {/* 1 · What's next */}
          <div className={styles.overview} data-testid="dashboard-overview">
            <Tray
              stretch
              data-status={s.upNext}
              header={<span className={styles.trayLabel}><Icon name="interview" size={14} />Up next</span>}
              footer={
                s.upNext === "loading" ? <><Skeleton width={120} height={14} /><Skeleton width={64} height={28} radius={10} /></> :
                s.upNext === "empty" ? <><span>Invites come from applications</span><Button variant="secondary" size="sm" onClick={() => navigate("/app/vacancies")}>Find vacancies</Button></> :
                <>
                  <Button variant="ghost" size="sm" icon={<Icon name="deadline" />} onClick={() => toast("Added to your calendar")}>Add to calendar</Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate("/app/applications")}>Details</Button>
                </>
              }
            >
              {s.upNext === "loading" ? (
                <div className={styles.event}>
                  <Skeleton width={52} height={64} radius={12} />
                  <Stack gap={8}><Skeleton width={170} height={14} /><Skeleton width={130} height={12} /><Skeleton width={150} height={12} /></Stack>
                </div>
              ) : s.upNext === "empty" ? (
                <BlockEmpty icon="interview" title="No interviews yet" text="When a company invites you, the date and link show up here." />
              ) : (
                <div className={styles.event}>
                  <div className={styles.eventDate} aria-hidden="true">
                    <span className={styles.eventDay}>Tue</span>
                    <span className={styles.eventNum}>4</span>
                    <span className={styles.eventDay}>Nov</span>
                  </div>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>Interview with Kaspi.kz</span>
                    <span className={styles.rowMeta}>Backend Intern (Python)</span>
                    <span className={styles.rowNote}><Icon name="duration" size={14} />14:00–14:45 · Google Meet</span>
                  </div>
                </div>
              )}
            </Tray>

            <Tray
              stretch
              data-status={s.profile}
              header={<span className={styles.trayLabel}><Icon name="profile" size={14} />Profile strength</span>}
              footer={
                s.profile === "loading" ? <><Skeleton width={130} height={14} /><Skeleton width={84} height={28} radius={10} /></> :
                <>
                  <span>Next: {firstRun ? "add your skills" : "upload your CV"}</span>
                  <Button variant={firstRun ? "primary" : "secondary"} size="sm" onClick={() => navigate("/app/profile/edit")}>{firstRun ? "Add skills" : "Upload CV"}</Button>
                </>
              }
            >
              {s.profile === "loading" ? (
                <Stack gap={10}>
                  <Cluster justify="between"><Skeleton width={64} height={28} /><Skeleton width={70} height={12} /></Cluster>
                  <Skeleton height={6} radius={999} />
                  <Skeleton width="70%" height={12} />
                </Stack>
              ) : (
                <Stack gap={10}>
                  <Cluster justify="between">
                    <span className={styles.bigNumber}>{firstRun ? "20%" : "60%"}</span>
                    <span className={styles.rowMeta}>{firstRun ? "1 of 5 steps" : "3 of 5 steps"}</span>
                  </Cluster>
                  <div className={styles.meter} role="progressbar" aria-label="Profile strength" aria-valuenow={firstRun ? 20 : 60} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: firstRun ? "20%" : "60%" }} />
                  </div>
                  <span className={styles.rowMeta}>{firstRun ? "Skills are what we match you on." : "Profiles with a CV get 3× more replies."}</span>
                </Stack>
              )}
            </Tray>

            <Tray
              stretch
              data-status={s.week}
              header={<span className={styles.trayLabel}><Icon name="analytics" size={14} />This week</span>}
              footer={
                s.week === "loading" ? <><Skeleton width={90} height={14} /><Skeleton width={92} height={28} radius={10} /></> :
                s.week === "empty" ? <span>Starts after your first match</span> :
                <><span>Since Monday</span><Button variant="secondary" size="sm" onClick={() => navigate("/app/applications")}>See activity</Button></>
              }
            >
              {s.week === "loading" ? (
                <div className={styles.miniStats}>
                  {[1, 2, 3].map((i) => <Stack key={i} gap={6}><Skeleton width={32} height={28} /><Skeleton width={72} height={12} /></Stack>)}
                </div>
              ) : s.week === "empty" ? (
                <BlockEmpty icon="analytics" title="Nothing to count yet" text="New matches, profile views and replies will be tracked here." />
              ) : (
                <div className={styles.miniStats}>
                  {[["New matches", "3"], ["Profile views", "18"], ["Replies", "1"]].map(([label, value]) => (
                    <div key={label} className={styles.miniStat}>
                      <span className={styles.bigNumber}>{value}</span>
                      <span className={styles.rowMeta}>{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </Tray>
          </div>

          <TwoColumn
            main={
              <Stack gap={40}>
                {/* 2 · What fits me best */}
                <Section title="Top matches" description="Ranked by how well your skills fit" actions={s.matches === "ready" && <TextLink to="/app/vacancies">See all</TextLink>}>
                  <Card padding="sm" data-testid="top-matches" data-status={s.matches}>
                    {s.matches === "loading" ? (
                      <div className={styles.rows} role="status" aria-busy="true" aria-label="Loading top matches">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={styles.rowItem}>
                            <Skeleton width={40} height={40} radius={12} />
                            <Stack gap={6} className={styles.grow}><Skeleton width="55%" height={14} /><Skeleton width="38%" height={12} /></Stack>
                            <Skeleton width={56} height={14} />
                          </div>
                        ))}
                      </div>
                    ) : s.matches === "error" ? (
                      <div className={styles.blockPad}><BlockError what="your top matches" onRetry={() => retry("matches")} /></div>
                    ) : s.matches === "empty" ? (
                      <EmptyState icon={<Icon name="skill" size={20} />} title="Add skills to see your matches"
                        description="We compare your skills with every vacancy and rank the best fits here."
                        actions={<Button variant="secondary" size="sm" icon={<Icon name="add" />} onClick={() => navigate("/app/profile/edit")}>Add skills</Button>} />
                    ) : (
                      <div className={styles.rows}>
                        {top.map((v) => {
                          const required = v.skills.filter((sk) => sk.required);
                          const have = required.filter((sk) => STUDENT_SKILLS.includes(sk.name)).length;
                          return (
                            <div key={v.id} className={`${styles.rowItem} ${styles.matchRow}`}>
                              <Avatar name={v.company} shape="square" />
                              <div className={styles.rowMain}>
                                <span className={styles.rowTitle}><Link to={`/app/vacancies/${v.id}`}>{v.title}</Link></span>
                                <span className={styles.rowMeta}>{v.company} · {v.format === "Remote" ? "Remote" : v.location} · Required {have} of {required.length}</span>
                              </div>
                              <MatchScore score={v.match ?? 0} compact />
                              <Button variant="ghost" size="sm" icon={<Icon name="saved" />} aria-label={`Save ${v.title}`} onClick={() => toast.success("Saved", { description: v.title })} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </Section>

                {/* 4 · How do I get better — hidden on first run (no matches to learn from yet) */}
                {s.skills !== "empty" && (
                  <Section title="Skills that unlock more vacancies" description="Missing most often in your top matches — add the ones you know">
                    <Card padding="sm" data-status={s.skills}>
                      {s.skills === "loading" ? (
                        <div className={styles.rows}>
                          {[1, 2, 3].map((i) => (
                            <div key={i} className={styles.rowItem}>
                              <Stack gap={6} className={styles.grow}><Skeleton width={80} height={14} /><Skeleton width="55%" height={12} /></Stack>
                              <Skeleton width={80} height={18} radius={999} />
                              <Skeleton width={76} height={26} radius={8} />
                            </div>
                          ))}
                        </div>
                      ) : s.skills === "error" ? (
                        <div className={styles.blockPad}><BlockError what="skill suggestions" onRetry={() => retry("skills")} /></div>
                      ) : (
                        <div className={styles.rows}>
                          {SKILL_GAPS.map((g) => (
                            <div key={g.skill} className={styles.rowItem}>
                              <div className={styles.rowMain}>
                                <span className={styles.rowTitle}>{g.skill}</span>
                                <span className={styles.rowMeta}>Required by {requiredBy(g.companies)}</span>
                              </div>
                              <Tooltip content={`Your average match rises by about ${g.lift}% if you add ${g.skill}`}>
                                <span tabIndex={0} className={styles.liftTag}><Tag tone="success">+{g.lift}% match</Tag></span>
                              </Tooltip>
                              <span className={styles.addSlot}>
                              {added.includes(g.skill) ? (
                                <span className={styles.addedNote}><Icon name="check" size={14} />Added</span>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={<Icon name="add" />}
                                  aria-label={`Add ${g.skill}`}
                                  onClick={() => { setAdded([...added, g.skill]); toast.success(`${g.skill} added to your skills`, { action: { label: "Undo", onClick: () => setAdded((a) => a.filter((x) => x !== g.skill)) } }); }}
                                >
                                  Add
                                </Button>
                              )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </Section>
                )}
              </Stack>
            }
            aside={
              <Stack gap={40}>
                {/* 3 · How are my applications */}
                <Section title="Applications" description="Where each application stands" actions={s.funnel === "ready" && <TextLink to="/app/applications">See all</TextLink>}>
                  <Card data-status={s.funnel}>
                    {s.funnel === "loading" ? (
                      <div className={styles.funnel}>
                        {FUNNEL.map((f) => (
                          <div key={f.status} className={styles.funnelRow}><Skeleton width={60} height={12} /><Skeleton height={8} radius={999} /><Skeleton width={12} height={12} /></div>
                        ))}
                      </div>
                    ) : s.funnel === "empty" ? (
                      <BlockEmpty icon="application" title="No applications yet" text="Apply to a vacancy and follow it from Applied to Offer here." />
                    ) : (
                      <div className={styles.funnel} data-testid="applications-funnel">
                        {FUNNEL.map((f) => (
                          <div key={f.status} className={styles.funnelRow}>
                            <span className={styles.funnelLabel}>{f.label}</span>
                            <div className={styles.funnelBar} data-status={f.status} aria-hidden="true"><span style={{ width: `${(f.count / FUNNEL[0].count) * 100}%` }} /></div>
                            <span className={styles.funnelCount}>{f.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </Section>
                <Section title="Activity" description="Latest updates from companies">
                  <Card padding="sm" data-status={s.activity}>
                    {s.activity === "loading" ? (
                      <ol className={styles.activity}>
                        {[1, 2, 3, 4].map((i) => (
                          <li key={i} className={styles.activityItem}><Skeleton width={28} height={28} radius={8} /><Stack gap={6} className={styles.grow}><Skeleton width="80%" height={12} /><Skeleton width={60} height={12} /></Stack></li>
                        ))}
                      </ol>
                    ) : s.activity === "empty" ? (
                      <div className={styles.blockPad}>
                        <BlockEmpty icon="notifications" title="Quiet for now" text="Views, invites and status changes from companies appear here." />
                      </div>
                    ) : (
                      <ol className={styles.activity}>
                        {ACTIVITY.map((a, i) => (
                          <li key={i} className={styles.activityItem}>
                            <span className={styles.activityIcon} data-tone={a.tone}><Icon name={a.icon} size={14} /></span>
                            <span className={styles.rowMain}>
                              <span className={styles.activityText}>{a.text}</span>
                              <span className={styles.rowMeta}>{a.when}</span>
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </Card>
                </Section>
              </Stack>
            }
          />
        </PageBody>
      </Container>
      <StateSwitcher states={STATES} />
    </StudentLayout>
  );
}
