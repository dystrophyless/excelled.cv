import { useState } from "react";
import { useNavigate } from "react-router";
import { StudentLayout } from "@/app/layouts";
import { Cluster, FormSection, Grid, PageBody, StickyBar } from "@/components/layout";
import { Icon } from "@/components/icons";
import {
  Alert, BackLink, Button, Card, Combobox, Container, FileUpload, PageHeader, SelectField, TextareaField, TextField,
} from "@/components/ui";
import { CITIES, SKILL_OPTIONS, STUDENT_SKILLS, UNIVERSITIES } from "@/mocks/data";
import { StateSwitcher, useViewState } from "@/components/dev";

/*
 * TEMPLATE: Form — edit a record with several groups of fields (profile, company profile, vacancy edit).
 * PageHeader (eyebrow back link; secondary "View profile") → one Card with FormSections
 * (title + why-it-matters on the left, fields on the right; one column below 768px) →
 * StickyBar "Unsaved changes · Discard · Save changes" appears only when something changed.
 * Validate on blur and on submit; on submit errors show an Alert at the top listing what to fix
 * and focus the first invalid field. Never disable Save to signal errors.
 */

const STATES = ["default", "dirty", "saving", "error"] as const;

export function FormTemplate() {
  const state = useViewState(STATES);
  const navigate = useNavigate();
  const [skills, setSkills] = useState(STUDENT_SKILLS);
  const [university, setUniversity] = useState(UNIVERSITIES[0]);
  const [cv, setCv] = useState<File | null>(new File([new Uint8Array(180_000)], "Maya_Akhmetova_CV.pdf"));
  const dirty = state !== "default";

  return (
    <StudentLayout>
      <Container width="content">
        <PageHeader
          eyebrow={<BackLink to="/app/profile">Profile</BackLink>}
          title="Edit profile"
          description="Employers see this when you apply. Skills drive your matches."
          actions={<Button variant="secondary" size="sm" icon={<Icon name="show" />} onClick={() => navigate("/app/profile?preview=1")}>Preview</Button>}
        />
        <PageBody>
          {state === "error" && (
            <Alert tone="error" title="Fix 2 fields to save">Graduation year · Portfolio link</Alert>
          )}
          <Card padding="lg">
            <form onSubmit={(e) => e.preventDefault()} aria-label="Edit profile" noValidate>
              <FormSection title="About you" description="Your name and a short intro recruiters read first.">
                <Grid min={200} gap={14}>
                  <TextField label="First name" defaultValue="Maya" autoComplete="given-name" />
                  <TextField label="Last name" defaultValue="Akhmetova" autoComplete="family-name" />
                </Grid>
                <TextareaField label="Bio" optional defaultValue="Third-year CS student who likes building APIs." hint="2–3 sentences" />
                <SelectField label="City" defaultValue="Almaty" options={CITIES.map((c) => ({ value: c, label: c }))} />
              </FormSection>
              <FormSection title="Education">
                <Combobox label="University" value={university} onChange={setUniversity} options={UNIVERSITIES} allowCreate />
                <TextField label="Graduation year" inputMode="numeric" defaultValue={state === "error" ? "20277" : "2027"}
                  error={state === "error" ? "Enter a year like 2027" : undefined} />
              </FormSection>
              <FormSection title="Skills" description="Add every skill you'd be happy to use at work. No levels — just yes or no.">
                <Combobox label="Skills" multiple value={skills} onChange={setSkills} options={SKILL_OPTIONS} allowCreate hint={`${skills.length} skills`} />
              </FormSection>
              <FormSection title="CV and links">
                <FileUpload label="CV" accept=".pdf,.docx" value={cv} onChange={setCv} />
                <TextField label="Portfolio or GitHub" optional type="url" placeholder="https://"
                  defaultValue={state === "error" ? "github/maya" : ""} error={state === "error" ? "Enter a full link starting with https://" : undefined} />
              </FormSection>
            </form>
          </Card>
          {dirty && (
            <StickyBar>
              <span>Unsaved changes</span>
              <Cluster gap={6}>
                <Button variant="ghost" size="sm">Discard</Button>
                <Button size="sm" loading={state === "saving"}>Save changes</Button>
              </Cluster>
            </StickyBar>
          )}
        </PageBody>
      </Container>
      <StateSwitcher states={STATES} />
    </StudentLayout>
  );
}
