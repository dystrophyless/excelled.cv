import type { ComponentType } from "react";
import { Link, useLocation, useParams } from "react-router";
import { Grid, PageBody } from "@/components/layout";
import { Card, Container, PageHeader, Tag, BackLink } from "@/components/ui";
import { AuthTemplate } from "./auth";
import { BrowseTemplate } from "./browse";
import { CandidateTemplate } from "./candidate";
import { DashboardTemplate } from "./dashboard";
import { DetailTemplate } from "./detail";
import { FormTemplate } from "./form";
import { LandingTemplate } from "./landing";
import { PipelineTemplate } from "./pipeline";
import { ProfileTemplate } from "./profile";
import { SavedTemplate } from "./saved";
import { SettingsTemplate } from "./settings";
import { TableTemplate } from "./table";
import { TrackerTemplate } from "./tracker";
import { VacancyEditTemplate } from "./vacancy-edit";
import { WizardTemplate } from "./wizard";
import styles from "./templates.module.css";

/* Page archetypes — design-system/templates.md describes each one. */
export const TEMPLATES: { id: string; name: string; role: "Public" | "Student" | "Employer"; use: string; states: string; Component: ComponentType }[] = [
  { id: "auth", name: "Auth", role: "Public", use: "Sign in, sign up, verify email, reset password", states: "sign-in · sign-up · submitting · error · verify · verify-error", Component: AuthTemplate },
  { id: "wizard", name: "Wizard", role: "Student", use: "Onboarding, posting a vacancy — ordered steps", states: "default · empty · saving", Component: WizardTemplate },
  { id: "dashboard", name: "Dashboard", role: "Student", use: "Role home: what to do next", states: "default · loading · empty", Component: DashboardTemplate },
  { id: "browse", name: "Browse", role: "Student", use: "Search + filters + result cards", states: "default · loading · empty · error", Component: BrowseTemplate },
  { id: "saved", name: "Browse · saved", role: "Student", use: "Own bookmarked items: search, sort, remove + undo, closed items stay", states: "default · loading · empty", Component: SavedTemplate },
  { id: "profile", name: "Detail · own profile", role: "Student", use: "Profile as employers see it + owner panel; ?preview=1 from Edit", states: "default · loading", Component: ProfileTemplate },
  { id: "detail", name: "Detail", role: "Student", use: "One record + decision panel", states: "default · applied · loading · not-found", Component: DetailTemplate },
  { id: "tracker", name: "Tracker (list)", role: "Student", use: "My items by status (tabs filter, withdraw + undo)", states: "default · loading · empty", Component: TrackerTemplate },
  { id: "pipeline", name: "Pipeline (board)", role: "Employer", use: "Board · List · Not selected, move + undo", states: "default · loading · empty", Component: PipelineTemplate },
  { id: "table", name: "Table", role: "Employer", use: "Records in columns, row actions, delete confirm", states: "default · loading · empty", Component: TableTemplate },
  { id: "candidate", name: "Detail · candidate", role: "Employer", use: "One candidate + stage decision", states: "—", Component: CandidateTemplate },
  { id: "vacancy-edit", name: "Form · vacancy", role: "Employer", use: "Post / edit a vacancy, Required vs Nice to have skills", states: "default · error · saving", Component: VacancyEditTemplate },
  { id: "form", name: "Form", role: "Student", use: "Edit a record with field groups", states: "default · dirty · saving · error", Component: FormTemplate },
  { id: "settings", name: "Settings", role: "Student", use: "Grouped preferences with scroll-spy nav, danger zone", states: "default · confirm-delete", Component: SettingsTemplate },
  { id: "landing", name: "Landing", role: "Public", use: "Marketing page for guests", states: "—", Component: LandingTemplate },
];

export function TemplateRoute() {
  const { name } = useParams();
  const t = TEMPLATES.find((x) => x.id === name);
  const location = useLocation();
  if (!t) return <TemplatesIndex />;
  // remount on ?state= changes so every state starts from its own initial data
  return <t.Component key={location.search} />;
}

export function TemplatesIndex() {
  return (
    <Container>
      <PageHeader eyebrow={<BackLink to="/styleguide">Styleguide</BackLink>} title="Page templates"
        description="Reference implementations of every page archetype. Copy the structure of the closest one; switch states with ?state=." />
      <PageBody>
        <Grid min={300} gap={12}>
          {TEMPLATES.map((t) => (
            <Card key={t.id} interactive>
              <Link to={`/styleguide/templates/${t.id}`} className={styles.indexLink} data-testid={`template-${t.id}`}>
                <span className={styles.indexTitle}>{t.name} <Tag tone={t.role === "Employer" ? "violet" : t.role === "Public" ? "neutral" : "accent"}>{t.role}</Tag></span>
                <span className={styles.indexMeta}>{t.use}</span>
                <span className={styles.indexMeta}>States: {t.states}</span>
              </Link>
            </Card>
          ))}
        </Grid>
      </PageBody>
    </Container>
  );
}
