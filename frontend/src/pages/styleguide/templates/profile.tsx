import { useNavigate, useSearchParams } from "react-router";
import { StudentLayout } from "@/app/layouts";
import { Cluster, PageBody, Stack, TwoColumn } from "@/components/layout";
import { FactList, SkillChip } from "@/components/domain";
import { Icon } from "@/components/icons";
import { Alert, Avatar, Button, Card, Container, PageHeader, Skeleton, Tag, Tray, toast } from "@/components/ui";
import { STUDENT_SKILLS } from "@/mocks/data";
import { StateSwitcher, useViewState } from "@/components/dev";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Detail (own profile) — the student's profile exactly as employers see it, plus the owner's tools.
 * PageHeader (avatar-free title = name · FactList · actions: Copy link + primary "Edit profile") →
 * TwoColumn end 360: main = Card with About · Skills · Projects · Education · Languages;
 * aside = owner panel Tray (profile strength · CV · visibility), which employers never see.
 * Preview mode (?preview=1, opened from Edit profile → Preview): an info Alert "This is what companies see"
 * with "Back to editing", and the owner panel is hidden — the page shows only what an employer sees.
 */

const STATES = ["default", "loading"] as const;

export function ProfileTemplate() {
  const state = useViewState(STATES);
  const [params] = useSearchParams();
  const preview = params.get("preview") === "1";
  const navigate = useNavigate();
  const loading = state === "loading";

  const ownerPanel = (
    <Tray
      data-testid="owner-panel"
      header={<span className={styles.trayLabel}><Icon name="lock" size={14} />Only you see this</span>}
      footer={<><span>3 of 5 steps</span><Button variant="secondary" size="sm" onClick={() => navigate("/app/profile/edit")}>Complete</Button></>}
    >
      <Stack gap={14}>
        <Stack gap={8}>
          <Cluster justify="between"><span className={styles.rowTitle}>Profile strength</span><span className={styles.rowMeta}>60%</span></Cluster>
          <div className={styles.meter} role="progressbar" aria-label="Profile strength" aria-valuenow={60} aria-valuemin={0} aria-valuemax={100}><span style={{ width: "60%" }} /></div>
        </Stack>
        <div className={styles.divider} />
        <Cluster justify="between" nowrap>
          <span className={styles.rowMain}>
            <span className={styles.rowTitle}>CV</span>
            <span className={styles.rowMeta}>Not uploaded — profiles with a CV get 3× more replies</span>
          </span>
          <Button variant="secondary" size="sm" icon={<Icon name="upload" />} onClick={() => navigate("/app/profile/edit")}>Upload</Button>
        </Cluster>
        <div className={styles.divider} />
        <Cluster justify="between" nowrap>
          <span className={styles.rowMain}>
            <span className={styles.rowTitle}>Visible to employers</span>
            <span className={styles.rowMeta}>Companies can find you and invite you to apply</span>
          </span>
          <Tag tone="success">On</Tag>
        </Cluster>
      </Stack>
    </Tray>
  );

  return (
    <StudentLayout>
      <Container width={preview ? "content" : "page"}>
        <PageHeader
          eyebrow={preview ? "Preview" : "Your profile · as employers see it"}
          title={loading ? <Skeleton width={220} height={24} /> : "Maya Akhmetova"}
          description={loading ? <Skeleton width={300} height={14} /> : (
            <FactList facts={[
              { icon: "education", label: "Suleyman Demirel University · 3rd year" },
              { icon: "location", label: "Almaty" },
              { icon: "email", label: "maya@sdu.edu.kz" },
            ]} />
          )}
          // preview = the employer's view: no owner actions ("Back to editing" lives in the Alert)
          actions={preview ? undefined : (
            <Cluster gap={8}>
              <Button variant="secondary" size="sm" icon={<Icon name="link" />} onClick={() => toast("Profile link copied")}>Copy link</Button>
              <Button size="sm" icon={<Icon name="edit" />} onClick={() => navigate("/app/profile/edit")}>Edit profile</Button>
            </Cluster>
          )}
        />
        <PageBody>
          {preview && (
            <Alert
              tone="info"
              title="This is what companies see when you apply"
              action={<Button variant="secondary" size="sm" icon={<Icon name="arrowLeft" />} onClick={() => navigate("/app/profile/edit")}>Back to editing</Button>}
            >
              Your private settings and profile strength are hidden in this view.
            </Alert>
          )}
          <TwoColumn
            sticky
            aside={preview ? undefined : ownerPanel}
            main={
              <Card padding="lg" data-testid="public-profile">
                {loading ? (
                  <Stack gap={12}>{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={14} width={i === 5 ? "50%" : "100%"} />)}</Stack>
                ) : (
                  <Stack gap={24}>
                    <Cluster gap={12} nowrap>
                      <Avatar name="Maya Akhmetova" size="lg" />
                      <span className={styles.rowMain}>
                        <span className={styles.rowTitle}>Computer Science, 3rd year</span>
                        <span className={styles.rowMeta}>Looking for a backend internship · available from June 2027</span>
                      </span>
                    </Cluster>
                    <div className={styles.prose}>
                      <h3>About</h3>
                      <p>Third-year CS student who likes building APIs. Interned at a local startup last summer and ships side projects in Python.</p>
                      <h3>Skills</h3>
                      <Cluster gap={6}>{STUDENT_SKILLS.map((sk) => <SkillChip key={sk} name={sk} />)}</Cluster>
                      <h3>Projects</h3>
                      <ul>
                        <li><strong>Campus events API</strong> — FastAPI + PostgreSQL, used by 3 student clubs</li>
                        <li><strong>Exam schedule bot</strong> — Telegram bot with 1 200 users</li>
                      </ul>
                      <h3>Education</h3>
                      <p>Suleyman Demirel University — BSc Computer Science, 2023–2027</p>
                      <h3>Languages</h3>
                      <p>Kazakh (native) · Russian (fluent) · English (B2)</p>
                    </div>
                  </Stack>
                )}
              </Card>
            }
          />
        </PageBody>
      </Container>
      <StateSwitcher states={STATES} />
    </StudentLayout>
  );
}
