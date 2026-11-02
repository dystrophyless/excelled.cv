import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { EmployerLayout } from "@/app/layouts";
import { Cluster, FormSection, Grid, PageBody, StickyBar } from "@/components/layout";
import { Icon } from "@/components/icons";
import {
  Alert, BackLink, Button, Card, ChoiceGroup, Combobox, Container, DateField, PageHeader, Radio, SelectField, TextareaField, TextField, toast,
} from "@/components/ui";
import { CITIES, SKILL_OPTIONS } from "@/mocks/data";
import { StateSwitcher, useViewState } from "@/components/dev";

/*
 * TEMPLATE: Form (employer) — post or edit a vacancy. Same archetype as the student profile form:
 * PageHeader (BackLink · title · Preview) → one Card of FormSections → StickyBar when dirty.
 * Skills are split into Required and Nice to have (no levels) — this is what matching uses.
 * Choices that are confirmed with Save are Radio groups, not SegmentedControl.
 * Primary action: "Publish" for a new/draft vacancy, "Save changes" for an open one; "Save draft" is secondary.
 */

const STATES = ["default", "error", "saving"] as const;

export function VacancyEditTemplate() {
  const state = useViewState(STATES);
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [dirty, setDirty] = useState(state !== "default");
  const [required, setRequired] = useState(isNew ? [] : ["Python", "SQL", "FastAPI", "Docker"]);
  const [nice, setNice] = useState(isNew ? [] : ["Redis", "Git"]);
  const touch = () => setDirty(true);
  const error = state === "error";

  return (
    <EmployerLayout>
      <Container width="content">
        <PageHeader
          eyebrow={<BackLink to="/company/vacancies">Vacancies</BackLink>}
          title={isNew ? "Post a vacancy" : "Edit vacancy"}
          description="Students see the skills you mark as Required first — they drive the match score."
          actions={<Button variant="secondary" size="sm" icon={<Icon name="show" />} onClick={() => navigate("/app/vacancies/v1")}>Preview</Button>}
        />
        <PageBody>
          {error && <Alert tone="error" title="Fix 2 fields to publish">Title · At least one required skill</Alert>}
          <Card padding="lg">
            <form onSubmit={(e) => e.preventDefault()} onChange={touch} aria-label={isNew ? "Post a vacancy" : "Edit vacancy"} noValidate>
              <FormSection title="Basics" description="What the role is and who it's for.">
                <TextField label="Title" defaultValue={isNew || error ? "" : "Backend Intern (Python)"} placeholder="e.g. Backend Intern (Python)"
                  error={error ? "Add a title students will search for" : undefined} />
                <Grid min={200} gap={14}>
                  <SelectField label="Type" defaultValue="intern" onChange={touch}
                    options={[{ value: "intern", label: "Internship" }, { value: "full", label: "Full-time" }, { value: "part", label: "Part-time" }]} />
                  <SelectField label="Field" defaultValue={isNew ? "" : "backend"} placeholder="Choose a field" onChange={touch}
                    options={["Backend", "Frontend", "Data", "QA", "Mobile", "Design"].map((f) => ({ value: f.toLowerCase(), label: f }))} />
                </Grid>
              </FormSection>

              <FormSection title="Where" description="Students filter by city and format.">
                <SelectField label="City" defaultValue="Almaty" onChange={touch} options={CITIES.map((c) => ({ value: c, label: c }))} />
                <ChoiceGroup legend="Format">
                  <Radio name="format" label="On-site" />
                  <Radio name="format" label="Hybrid" defaultChecked />
                  <Radio name="format" label="Remote" description="Anywhere in Kazakhstan" />
                </ChoiceGroup>
              </FormSection>

              <FormSection title="Skills" description="Required skills carry most of the match. Keep it to the 3–6 that really matter.">
                <Combobox label="Required" multiple value={required} onChange={(v) => { setRequired(v); touch(); }} options={SKILL_OPTIONS} allowCreate
                  placeholder="e.g. Python" error={error ? "Add at least one required skill" : undefined} />
                <Combobox label="Nice to have" optional multiple value={nice} onChange={(v) => { setNice(v); touch(); }}
                  options={SKILL_OPTIONS.filter((s) => !required.includes(s))} allowCreate placeholder="e.g. Docker" />
              </FormSection>

              <FormSection title="Details">
                <TextareaField label="Description" defaultValue={isNew ? "" : "Join the Payments team and build services used by 14 million people every day."}
                  hint="What the intern will do and what you offer" />
                <Grid min={200} gap={14}>
                  <TextField label="Duration" optional defaultValue={isNew ? "" : "3 months"} placeholder="e.g. 3 months" />
                  <TextField label="Salary" optional defaultValue={isNew ? "" : "200 000 ₸ / month"} placeholder="e.g. 200 000 ₸ / month" />
                </Grid>
                <DateField label="Apply by" defaultValue={isNew ? "" : "2026-11-30"} min="2026-10-30" onChange={touch} />
              </FormSection>
            </form>
          </Card>
          {dirty && (
            <StickyBar>
              <span>{isNew ? "Draft not saved" : "Unsaved changes"}</span>
              <Cluster gap={6}>
                <Button variant="ghost" size="sm" onClick={() => { setDirty(false); toast("Saved as a draft"); }}>Save draft</Button>
                <Button size="sm" loading={state === "saving"} onClick={() => { toast.success(isNew ? "Vacancy published" : "Changes saved"); navigate("/company/vacancies"); }}>
                  {isNew ? "Publish" : "Save changes"}
                </Button>
              </Cluster>
            </StickyBar>
          )}
        </PageBody>
      </Container>
      <StateSwitcher states={STATES} />
    </EmployerLayout>
  );
}
