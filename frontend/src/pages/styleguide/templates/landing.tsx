import { Link, useNavigate } from "react-router";
import { PublicLayout } from "@/app/layouts";
import { Cluster, Grid, Stack } from "@/components/layout";
import { MatchScore, SkillBreakdown, StatusTag, VacancyCard } from "@/components/domain";
import { Icon, type IconName } from "@/components/icons";
import { Avatar, Button, Card, Container, GridBackground, NumberTicker, Tag, Tray } from "@/components/ui";
import { APPLICATIONS, CANDIDATES, STUDENT_SKILLS, VACANCIES } from "@/mocks/data";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Landing — public marketing page (students `/`, employers `/employers`).
 * Hero on affect GridBackground: eyebrow tag · hero title · one value sentence · 2 lg CTAs (same size) · trust line,
 * with a live product preview built from real components (decorative: aria-hidden + inert) →
 * proof strip (companies) → how it works (3 steps) → 2 feature rows (text + real component) → numbers →
 * employer block → closing CTA → footer. Calm: neutral palette, no stock photos, motion only from affect pieces.
 */

const COMPANIES = ["Kaspi.kz", "Halyk Bank", "Kolesa Group", "EPAM", "inDrive", "Beeline", "Chocofamily", "Jusan"];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "skill", title: "Add your skills", text: "Python, Excel, Figma — whatever you can actually use. Takes two minutes, no CV needed to start." },
  { icon: "match", title: "See your matches", text: "Every vacancy gets a match score and the exact skills you're missing." },
  { icon: "application", title: "Apply and track", text: "Apply in one click and follow each application from Applied to Offer." },
];

export function LandingTemplate() {
  const navigate = useNavigate();
  const top = VACANCIES[0];

  return (
    <PublicLayout>
      <GridBackground className={styles.heroBg} size={48} fade={65}>
        <Container>
          <div className={styles.hero}>
            <div className={styles.heroText}>
              <Tag tone="accent" className={styles.heroTag}><Icon name="recommendation" size={12} />For students in Kazakhstan</Tag>
              <h1 className={styles.heroTitle}>Internships that fit what you already know</h1>
              <p className={styles.heroSub}>
                Add your skills once. Novio ranks every internship and junior job by how well you match — and shows what to learn next.
              </p>
              <Cluster gap={8} className={styles.heroCtas}>
                <Button size="lg" iconRight={<Icon name="arrowRight" size={20} />} onClick={() => navigate("/sign-up")}>Find my matches</Button>
                <Button size="lg" variant="secondary" onClick={() => navigate("/employers")}>I'm hiring</Button>
              </Cluster>
              <ul className={styles.trust}>
                {["Free for students", "No CV needed to start", "Vacancies checked by our team"].map((t) => (
                  <li key={t}><Icon name="check" size={14} />{t}</li>
                ))}
              </ul>
            </div>

            <div className={styles.heroPreview} aria-hidden="true" inert>
              <div className={styles.previewBack}>
                <VacancyCard vacancy={VACANCIES[1]} have={STUDENT_SKILLS} to="/sign-up" />
              </div>
              <div className={styles.previewFront}>
                <Tray header={<><Tag tone="accent">Internship</Tag><span className={styles.rowMeta}>{top.company}</span></>}
                  footer={<><span>Takes 1 minute</span><Button size="sm">Apply now</Button></>}>
                  <div className={styles.asideBlock}>
                    <span className={styles.rowTitle}>{top.title}</span>
                    <MatchScore score={top.match!} size="lg" />
                    <SkillBreakdown skills={top.skills.slice(0, 5)} have={STUDENT_SKILLS} />
                  </div>
                </Tray>
              </div>
            </div>
          </div>
        </Container>
      </GridBackground>

      <Container>
        <div className={styles.landingBody}>
          <section className={styles.proof} aria-label="Companies hiring on Novio">
            <p className={styles.rowMeta}>Companies hiring students on Novio</p>
            <ul className={styles.logoRow}>
              {COMPANIES.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </section>

          <section className={styles.landingSection} aria-labelledby="how">
            <div className={styles.landingHead}>
              <h2 id="how" className={styles.landingH2}>How it works</h2>
              <p className={styles.heroSubSm}>Three steps from "I don't know where to start" to your first interview.</p>
            </div>
            <Grid min={280} gap={12}>
              {STEPS.map((s, i) => (
                <Card key={s.title} padding="lg">
                  <Stack gap={12}>
                    <Cluster justify="between">
                      <span className={styles.iconTile}><Icon name={s.icon} size={20} /></span>
                      <span className={styles.stepIndex}>0{i + 1}</span>
                    </Cluster>
                    <h3 className={styles.landingH3}>{s.title}</h3>
                    <p className={styles.rowMeta}>{s.text}</p>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </section>

          <section className={styles.feature} aria-labelledby="gap">
            <div className={styles.featureText}>
              <Tag tone="success">Skill match</Tag>
              <h2 id="gap" className={styles.landingH2}>See exactly what you're missing</h2>
              <p className={styles.heroSubSm}>
                Every vacancy splits its skills into Required and Nice to have. You see which ones you already have and the one
                skill that would raise your match the most.
              </p>
            </div>
            <div aria-hidden="true" inert>
              <Tray footer={<><MatchScore score={top.match!} /><span>{top.company}</span></>}>
                <SkillBreakdown skills={top.skills} have={STUDENT_SKILLS} />
              </Tray>
            </div>
          </section>

          <section className={`${styles.feature} ${styles.featureReverse}`} aria-labelledby="track">
            <div className={styles.featureText}>
              <Tag tone="warning">Applications</Tag>
              <h2 id="track" className={styles.landingH2}>Never wonder “did they see it?”</h2>
              <p className={styles.heroSubSm}>
                Follow each application from Applied to Offer. Interview invites come with the date and the link, and land in your email too.
              </p>
            </div>
            <div aria-hidden="true" inert>
              <Card padding="sm">
                <div className={styles.rows}>
                  {APPLICATIONS.slice(0, 3).map((a) => (
                    <div key={a.id} className={styles.rowItem}>
                      <Avatar name={a.vacancy.company} shape="square" size="sm" />
                      <div className={styles.rowMain}>
                        <span className={styles.rowTitle}>{a.vacancy.title}</span>
                        <span className={styles.rowMeta}>{a.note ?? a.vacancy.company}</span>
                      </div>
                      <StatusTag status={a.status} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>

          <Card padding="none" className={styles.numbers}>
            {[
              { value: 1200, suffix: "+", label: "open internships and junior jobs" },
              { value: 340, suffix: "", label: "companies hiring students" },
              { value: 18000, suffix: "+", label: "students matched by skills" },
            ].map((n) => (
              <div key={n.label} className={styles.number}>
                <span className={styles.numberValue}><NumberTicker value={n.value} />{n.suffix}</span>
                <span className={styles.rowMeta}>{n.label}</span>
              </div>
            ))}
          </Card>

          <Tray size="lg" className={styles.employers} aria-labelledby="employers">
            <div className={styles.feature}>
              <div className={styles.featureText}>
                <Tag tone="violet">For employers</Tag>
                <h2 id="employers" className={styles.landingH2}>Hire interns ranked by skill, not by luck</h2>
                <p className={styles.heroSubSm}>Post a vacancy, mark the skills that matter, and review applicants sorted by match — in one pipeline.</p>
                <Cluster gap={8}>
                  <Button onClick={() => navigate("/employers")}>Post a vacancy for free</Button>
                  <Button variant="ghost" onClick={() => navigate("/employers")}>How it works</Button>
                </Cluster>
              </div>
              <div className={styles.miniBoard} aria-hidden="true" inert>
                {(["applied", "shortlisted"] as const).map((stage) => (
                  <div key={stage} className={styles.column}>
                    <div className={styles.columnHead}><span>{stage === "applied" ? "New" : "Shortlisted"}</span></div>
                    {CANDIDATES.filter((c) => c.status === stage).slice(0, 2).map((c) => (
                      <Card key={c.id} padding="sm">
                        <Cluster gap={8} justify="between" nowrap>
                          <Cluster gap={8} nowrap><Avatar name={c.name} size="sm" /><span className={styles.rowTitle}>{c.name}</span></Cluster>
                          <MatchScore score={c.match} compact />
                        </Cluster>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Tray>

          <section className={styles.cta} aria-labelledby="cta">
            <h2 id="cta" className={styles.landingH2}>Your first internship is closer than you think</h2>
            <p className={styles.heroSubSm}>Free for students. Always.</p>
            <Button size="lg" onClick={() => navigate("/sign-up")}>Create a free account</Button>
          </section>
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerCols}>
            <div className={styles.footerBrand}>
              <span className={styles.rowTitle}>Novio</span>
              <span>Skill-based internships and junior jobs in Kazakhstan.</span>
            </div>
            {[
              { title: "Students", links: [["Browse vacancies", "/vacancies"], ["Sign up", "/sign-up"], ["Sign in", "/sign-in"]] },
              { title: "Employers", links: [["Post a vacancy", "/employers"], ["How matching works", "/employers"]] },
              { title: "Novio", links: [["About", "/"], ["Privacy", "/"], ["Terms", "/"]] },
            ].map((col) => (
              <nav key={col.title} aria-label={col.title} className={styles.footerCol}>
                <span className={styles.footerTitle}>{col.title}</span>
                {col.links.map(([label, to]) => <Link key={label} to={to}>{label}</Link>)}
              </nav>
            ))}
          </div>
          <p>© 2026 Novio · Almaty</p>
        </footer>
      </Container>
    </PublicLayout>
  );
}
