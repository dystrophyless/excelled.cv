import type { FormEvent } from "react";
import { StudentLayout } from "@/app/layouts";
import { FormSection, PageBody } from "@/components/layout";
import { Icon } from "@/components/icons";
import { BackLink, Button, Card, Container, EmptyState, PageHeader } from "@/components/ui";
import {
  MAX_ROWS, studentErrorLabels,
  type LoadState, type ProfileCatalog, type ProfileFormAlert, type StudentErrors, type StudentValues,
} from "../model";
import {
  AboutField, CityField, ContactFields, ErrorSummary, FormAlert, FormSkeleton, FullNameField, LanguageRows, LeaveDialog,
  LookingForFields, ProjectRows, StudyFields, UnsavedBar,
} from "./parts";

export type StudentProfileEditViewProps = {
  /** Profile + catalog query */
  state: LoadState;
  /** Form values (prefilled from the loaded profile) */
  values: StudentValues;
  /** Anything differs from what was loaded → the unsaved-changes bar shows */
  dirty: boolean;
  errors?: StudentErrors;
  /** 409 version_conflict → "conflict"; network / 5xx → "save-error" */
  formAlert?: ProfileFormAlert;
  /** PUT in flight */
  saving?: boolean;
  /** The "Leave without saving?" dialog is open (router blocker) */
  leaveOpen?: boolean;
  catalog: ProfileCatalog;
  routes: { profile: string };
  onChange: (patch: Partial<StudentValues>) => void;
  onSave: () => void;
  onDiscard: () => void;
  onLeaveCancel: () => void;
  onLeaveConfirm: () => void;
  onLoadLatest?: () => void;
  onRetry?: () => void;
};

/**
 * S3 — /app/profile/edit. Archetype: Form, reference /styleguide/templates/form.
 * Sections carry ids (about-you · about · studies · looking-for · projects · languages · contacts): the profile page's
 * "Add" buttons open `edit#<id>` and the page scrolls there and focuses its first field.
 */
export function StudentProfileEditView(p: StudentProfileEditViewProps) {
  const header = (
    <PageHeader
      eyebrow={<BackLink to={p.routes.profile}>Profile</BackLink>}
      title="Edit profile"
      description="Keep your studies, goals and contacts up to date."
    />
  );

  if (p.state !== "ready") {
    return (
      <StudentLayout>
        <Container width="content">
          {header}
          <PageBody aria-busy={p.state === "loading" || undefined}>
            <Card padding={p.state === "loading" ? "lg" : undefined}>
              {p.state === "loading" ? (
                <FormSkeleton sections={[3, 4, 2, 2]} />
              ) : (
                <EmptyState
                  tone="error"
                  title="Couldn't load your profile"
                  description="Check your connection and try again."
                  actions={<Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={p.onRetry}>Try again</Button>}
                />
              )}
            </Card>
          </PageBody>
        </Container>
      </StudentLayout>
    );
  }

  const common = { values: p.values, errors: p.errors, onChange: p.onChange };
  const invalid = studentErrorLabels(p.errors);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!p.saving) p.onSave();
  };

  return (
    <StudentLayout>
      <Container width="content">
        {header}
        <PageBody>
          <FormAlert alert={p.formAlert} what="your profile" onLoadLatest={p.onLoadLatest} />
          <ErrorSummary labels={invalid} />
          <Card padding="lg">
            <form onSubmit={submit} aria-label="Edit profile" noValidate data-testid="student-profile-form">
              <FormSection id="about-you" title="About you" description="Your name, city and a short intro.">
                <FullNameField {...common} />
                <div id="city"><CityField value={p.values.city} error={p.errors?.city} cities={p.catalog.cities} onChange={(city) => p.onChange({ city })} testId="student-city" /></div>
                <div id="about"><AboutField {...common} /></div>
              </FormSection>
              <FormSection id="studies" title="Studies" description="Where and what you study, and your year. GPA is optional.">
                <StudyFields {...common} catalog={p.catalog} />
              </FormSection>
              <FormSection id="looking-for" title="Looking for" description="The fields and kinds of position you want next.">
                <LookingForFields {...common} catalog={p.catalog} />
              </FormSection>
              <FormSection id="projects" title="Projects" description={`Things you built: a course project, a bot, a site. Up to ${MAX_ROWS}.`}>
                <ProjectRows {...common} />
              </FormSection>
              <FormSection id="languages" title="Languages" description={`Each language once, with your level. Up to ${MAX_ROWS}.`}>
                <LanguageRows {...common} catalog={p.catalog} />
              </FormSection>
              <FormSection id="contacts" title="Contacts" description="How employers can reach you besides your sign-in email. All optional.">
                <ContactFields {...common} />
              </FormSection>
              <button type="submit" hidden />
            </form>
          </Card>
          {p.dirty && <UnsavedBar saving={p.saving} onDiscard={p.onDiscard} onSave={p.onSave} />}
        </PageBody>
      </Container>
      <LeaveDialog open={Boolean(p.leaveOpen)} onCancel={p.onLeaveCancel} onConfirm={p.onLeaveConfirm} />
    </StudentLayout>
  );
}
