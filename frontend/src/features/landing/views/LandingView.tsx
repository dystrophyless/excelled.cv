import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { PublicLayout } from "@/app/layouts";
import { Cluster, Grid, Stack } from "@/components/layout";
import { FactList, MatchScore, SkillBreakdown, SkillChip, vacancyTypeTone } from "@/components/domain";
import { Icon, type IconName } from "@/components/icons";
import { Avatar, Button, Card, Container, GridBackground, SearchField, Tag, TextLink, Tray } from "@/components/ui";
import {
  SAMPLE_COMPANY, SAMPLE_COMPANY_ROWS, SAMPLE_SEARCH, SAMPLE_OPPORTUNITIES, SAMPLE_REQUIREMENTS, SAMPLE_SKILLS, SAMPLE_STUDENT,
} from "../mocks";
import styles from "./landing.module.css";

/*
 * 005 S1 — Landing (archetype: Landing, reference /styleguide/templates/landing).
 * Hero on GridBackground → "For students" (3 numbered capability cards) → "For HR representatives" tray → closing CTA → footer.
 * Presentational: no data, no URL. Illustrations are sample content (fictional names), aria-hidden + inert.
 */

export type LandingRoutes = { signUp: string; signIn: string; home?: string };

export type LandingViewProps = {
  routes?: Partial<LandingRoutes>;
};

const CAPABILITIES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "profile",
    title: "Create your profile",
    text: "Keep your education, skills, projects and languages in one place, and update them as you learn.",
  },
  {
    icon: "search",
    title: "Find opportunities",
    text: "Search internships, vacancies and research opportunities, and filter them by type, format, city and field.",
  },
  {
    icon: "match",
    title: "See your match",
    text: "Every opportunity shows how well your skills fit what it asks for, and which skills you are missing.",
  },
];

/** Scroll to a section and move focus to its heading, so keyboard and screen-reader users land there too. Respects reduced motion. */
function goTo(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  document.getElementById(`${id}-title`)?.focus({ preventScroll: true });
  window.history.replaceState(null, "", `#${id}`);
}

const jump = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  goTo(id);
};

export function LandingView({ routes }: LandingViewProps) {
  const r = { signUp: "/sign-up", signIn: "/sign-in", home: "/", ...routes };
  const navigate = useNavigate();
  const [top, ...others] = SAMPLE_OPPORTUNITIES;

  return (
    <PublicLayout variant="landing" homeTo={r.home} signInTo={r.signIn} signUpTo={r.signUp}>
      <GridBackground className={styles.heroBg} size={48} fade={65}>
        <Container>
          <div className={styles.hero}>
            <div className={styles.heroText}>
              <Tag tone="accent">For students and HR representatives</Tag>
              <h1 className={styles.heroTitle}>Students and employers, connected by skills</h1>
              <p className={styles.heroSub}>
                Novio connects students with internships, vacancies, research opportunities and employers.
              </p>
              <Cluster gap={8} className={styles.heroCtas}>
                <Button size="lg" iconRight={<Icon name="arrowRight" size={20} />} onClick={() => navigate(r.signUp)}>Create account</Button>
                <Button size="lg" variant="secondary" onClick={() => goTo("hr")}>For HR representatives</Button>
              </Cluster>
            </div>

            <div className={styles.heroPreview} aria-hidden="true" inert>
              <div className={styles.previewBack}>
                <Card padding="sm">
                  <div className={styles.rows}>
                    {others.map((o) => (
                      <div key={o.id} className={styles.rowItem}>
                        <Avatar name={o.company} shape="square" size="sm" />
                        <div className={styles.rowMain}>
                          <span className={styles.rowTitle}>{o.title}</span>
                          <span className={styles.meta}>{o.company}</span>
                        </div>
                        <Tag tone={vacancyTypeTone(o.kind)}>{o.kind}</Tag>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <div className={styles.previewFront}>
                <Tray
                  header={<><Tag tone={vacancyTypeTone(top.kind)}>{top.kind}</Tag><span className={styles.meta}>{top.company}</span></>}
                  footer={<span>Sample opportunity</span>}
                >
                  <Stack gap={12}>
                    <span className={styles.rowTitle}>{top.title}</span>
                    <MatchScore score={top.match} size="lg" />
                    <SkillBreakdown skills={SAMPLE_REQUIREMENTS.slice(0, 5)} have={SAMPLE_SKILLS} />
                  </Stack>
                </Tray>
              </div>
            </div>
          </div>
        </Container>
      </GridBackground>

      <Container>
        <div className={styles.body}>
          <section className={styles.section} id="students" aria-labelledby="students-title">
            <div className={styles.head}>
              <Tag tone="success">For students</Tag>
              <h2 id="students-title" tabIndex={-1} className={styles.h2}>Build a profile, find what fits</h2>
              <p className={styles.lead}>Tell Novio what you can do, then look through the opportunities employers publish.</p>
            </div>
            <Grid min={300} gap={12}>
              {CAPABILITIES.map((c, i) => (
                <Card key={c.title} padding="lg" className={styles.capability} data-testid="capability">
                  <Stack gap={12}>
                    <Cluster justify="between">
                      <span className={styles.iconTile}><Icon name={c.icon} size={20} /></span>
                      <span className={styles.stepIndex}>0{i + 1}</span>
                    </Cluster>
                    <h3 className={styles.h3}>{c.title}</h3>
                    <p className={styles.meta}>{c.text}</p>
                    <div className={styles.illustration} aria-hidden="true" inert>
                      {i === 0 && (
                        <Stack gap={12}>
                          <Cluster gap={10} nowrap>
                            <Avatar name={SAMPLE_STUDENT.name} />
                            <div className={styles.person}>
                              <span className={styles.rowTitle}>{SAMPLE_STUDENT.name}</span>
                              <span className={styles.meta}>Student</span>
                            </div>
                          </Cluster>
                          <FactList
                            layout="list"
                            facts={[
                              { icon: "education", label: SAMPLE_STUDENT.education },
                              { icon: "language", label: SAMPLE_STUDENT.languages },
                              { icon: "project", label: SAMPLE_STUDENT.project },
                            ]}
                          />
                          <Cluster gap={6}>{SAMPLE_STUDENT.skills.map((s) => <SkillChip key={s} name={s} />)}</Cluster>
                        </Stack>
                      )}
                      {i === 1 && (
                        <Stack gap={10}>
                          <SearchField label="Search opportunities" value={SAMPLE_SEARCH} onChange={() => undefined} readOnly tabIndex={-1} />
                          {SAMPLE_OPPORTUNITIES.map((o) => (
                            <Cluster key={o.id} gap={10} nowrap>
                              <Avatar name={o.company} shape="square" size="sm" />
                              <div className={styles.person}>
                                <span className={styles.rowTitle}>{o.title}</span>
                                <span className={styles.meta}>{o.company}</span>
                              </div>
                              <Tag tone={vacancyTypeTone(o.kind)}>{o.kind}</Tag>
                            </Cluster>
                          ))}
                        </Stack>
                      )}
                      {i === 2 && (
                        <Stack gap={10}>
                          <MatchScore score={top.match} />
                          <SkillBreakdown skills={SAMPLE_REQUIREMENTS} have={SAMPLE_SKILLS} />
                        </Stack>
                      )}
                    </div>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </section>

          <Tray size="lg" className={styles.hr} id="hr" aria-labelledby="hr-title">
            <div className={styles.split}>
              <div className={styles.splitText}>
                <Tag tone="violet">For HR representatives</Tag>
                <h2 id="hr-title" tabIndex={-1} className={styles.h2}>Publish opportunities and present your company</h2>
                <p className={styles.lead}>
                  Create a company profile, then post internships, vacancies and research opportunities. List the skills each one needs, so students see how well they match. Edit an opportunity any time and close it when it is filled.
                </p>
                <Button variant="secondary" onClick={() => navigate(r.signUp)}>Create account</Button>
              </div>
              <div aria-hidden="true" inert>
                <Card padding="sm">
                  <div className={styles.rows}>
                    <div className={styles.rowItem}>
                      <Avatar name={SAMPLE_COMPANY.name} shape="square" />
                      <div className={styles.rowMain}>
                        <span className={styles.rowTitle}>{SAMPLE_COMPANY.name}</span>
                        <span className={styles.meta}>{SAMPLE_COMPANY.line}</span>
                      </div>
                    </div>
                    {SAMPLE_COMPANY_ROWS.map((o) => (
                      <div key={o.title} className={styles.rowItem}>
                        <div className={styles.rowMain}>
                          <span className={styles.rowTitle}>{o.title}</span>
                          <span className={styles.rowTags}>
                            <Tag tone={vacancyTypeTone(o.kind)}>{o.kind}</Tag>
                          </span>
                        </div>
                        <Tag tone={o.status === "Open" ? "success" : "neutral"}>{o.status}</Tag>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </Tray>

          <section className={styles.cta} aria-labelledby="cta-title">
            <h2 id="cta-title" className={styles.h2}>Start by choosing your role</h2>
            <p className={styles.lead}>Pick Student or HR Representative, then add your email and a password.</p>
            <Button size="lg" onClick={() => navigate(r.signUp)}>Create account</Button>
            <span className={styles.meta}>Already have an account?&nbsp;<TextLink to={r.signIn}>Log in</TextLink></span>
          </section>
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerCols}>
            <div className={styles.footerBrand}>
              <span className={styles.rowTitle}>Novio</span>
              <span>Connects students with internships, vacancies, research opportunities and employers.</span>
            </div>
            <nav aria-label="On this page" className={styles.footerCol}>
              <span className={styles.footerTitle}>Learn more</span>
              <a href="#students" onClick={jump("students")}>For students</a>
              <a href="#hr" onClick={jump("hr")}>For HR representatives</a>
            </nav>
            <nav aria-label="Account" className={styles.footerCol}>
              <span className={styles.footerTitle}>Account</span>
              <Link to={r.signUp}>Create account</Link>
              <Link to={r.signIn}>Log in</Link>
            </nav>
          </div>
          <p>© 2026 Novio</p>
        </footer>
      </Container>
    </PublicLayout>
  );
}
