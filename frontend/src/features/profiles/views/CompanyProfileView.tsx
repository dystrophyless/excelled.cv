import type { FormEvent } from "react";
import { EmployerLayout } from "@/app/layouts";
import { FormSection, PageBody } from "@/components/layout";
import { Icon } from "@/components/icons";
import { Button, Card, Container, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import {
  COMPANY_FIELDS, COMPANY_FIELD_LABEL, errorFields, formatDate,
  type CompanyErrors, type CompanyValues, type LoadState, type ProfileCatalog, type ProfileFormAlert,
} from "../model";
import { CompanyBasicsFields, CompanyDetailsFields, ErrorSummary, FormAlert, FormSkeleton, LeaveDialog, UnsavedBar } from "./parts";

export type CompanyProfileViewProps = {
  /** Company profile + catalog query */
  state: LoadState;
  values: CompanyValues;
  /** ISO date-time of the last save (shown in the header) */
  updatedAt?: string;
  dirty: boolean;
  errors?: CompanyErrors;
  formAlert?: ProfileFormAlert;
  saving?: boolean;
  leaveOpen?: boolean;
  catalog: ProfileCatalog;
  onChange: (patch: Partial<CompanyValues>) => void;
  onSave: () => void;
  onDiscard: () => void;
  onLeaveCancel: () => void;
  onLeaveConfirm: () => void;
  onLoadLatest?: () => void;
  onRetry?: () => void;
};

/**
 * S5 — /company/profile: the company profile shown in its form and edited in place (ia.md).
 * Archetype: Form, reference /styleguide/templates/form. No back link: it is reached from the account menu.
 */
export function CompanyProfileView(p: CompanyProfileViewProps) {
  const description = (
    <>
      Students see this on your vacancies
      {p.state === "ready" && p.updatedAt && <> · Updated {formatDate(p.updatedAt)}</>}
      {p.state === "loading" && <> · <Skeleton width={120} height={12} /></>}
    </>
  );
  const header = <PageHeader title="Company profile" description={description} />;

  if (p.state !== "ready") {
    return (
      <EmployerLayout>
        <Container width="content">
          {header}
          <PageBody aria-busy={p.state === "loading" || undefined}>
            <Card padding={p.state === "loading" ? "lg" : undefined}>
              {p.state === "loading" ? (
                <FormSkeleton sections={[3, 3]} />
              ) : (
                <EmptyState
                  tone="error"
                  title="Couldn't load your company profile"
                  description="Check your connection and try again."
                  actions={<Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={p.onRetry}>Try again</Button>}
                />
              )}
            </Card>
          </PageBody>
        </Container>
      </EmployerLayout>
    );
  }

  const common = { values: p.values, errors: p.errors, catalog: p.catalog, onChange: p.onChange };
  const invalid = errorFields(COMPANY_FIELDS, p.errors);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!p.saving) p.onSave();
  };

  return (
    <EmployerLayout>
      <Container width="content">
        {header}
        <PageBody>
          <FormAlert alert={p.formAlert} what="your company profile" onLoadLatest={p.onLoadLatest} />
          <ErrorSummary labels={invalid.map((f) => COMPANY_FIELD_LABEL[f])} />
          <Card padding="lg">
            <form onSubmit={submit} aria-label="Company profile" noValidate data-testid="company-profile-form">
              <FormSection title="Company" description="Who you are. A new name shows on all your vacancies right away.">
                <CompanyBasicsFields {...common} />
              </FormSection>
              <FormSection title="Details" description="Optional, but it helps students decide to apply.">
                <CompanyDetailsFields {...common} />
              </FormSection>
              <button type="submit" hidden />
            </form>
          </Card>
          {p.dirty && <UnsavedBar saving={p.saving} onDiscard={p.onDiscard} onSave={p.onSave} />}
        </PageBody>
      </Container>
      <LeaveDialog open={Boolean(p.leaveOpen)} onCancel={p.onLeaveCancel} onConfirm={p.onLeaveConfirm} />
    </EmployerLayout>
  );
}
