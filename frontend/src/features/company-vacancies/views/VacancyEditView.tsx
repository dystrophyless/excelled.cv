import type { FormEvent, ReactNode } from "react";
import { useNavigate } from "react-router";
import { EmployerLayout } from "@/app/layouts";
import { Cluster, FormSection, PageBody, Stack, StickyBar } from "@/components/layout";
import { Icon } from "@/components/icons";
import { Alert, BackLink, Button, Card, Container, EmptyState, Modal, PageHeader, Skeleton, Tray } from "@/components/ui";
import {
  DRAFT_FIELD_LABEL, statusLine,
  type Catalog, type DraftErrors, type DraftField, type VacancyDraft, type VacancyItem, type VacancyRoutes,
} from "../model";
import { BasicsFields, DetailsFields, SkillsFields, VacancyStatusTag, WhereFields } from "./parts";
import styles from "./vacancies.module.css";

export type VacancyEditState = "ready" | "loading" | "error" | "not-found";

/** A form-level message above the card. The page container picks it from the API error code. */
export type EditFormAlert =
  | { kind: "incomplete"; mode: "publish" | "save"; fields: DraftField[] }
  | { kind: "conflict" }
  | { kind: "save-error" };

export type VacancyEditViewProps = {
  state: VacancyEditState;
  vacancy?: VacancyItem;
  values: VacancyDraft;
  /** Anything differs from what was loaded */
  dirty: boolean;
  errors?: DraftErrors;
  formAlert?: EditFormAlert;
  /** A save or publish request is in flight */
  saving?: boolean;
  /** The "Discard your changes?" dialog is open (user tried to leave with unsaved changes) */
  leaveOpen?: boolean;
  catalog: Catalog;
  skillOptions: string[];
  suggestions?: string[];
  /** Typed text of a skill field: the page searches the server and passes the result as `skillOptions` */
  onSkillQuery?: (query: string) => void;
  /** That search is running */
  skillsLoading?: boolean;
  /** ISO date, earliest deadline for Draft / Open / Paused */
  today: string;
  routes: VacancyRoutes;
  onChange: (patch: Partial<VacancyDraft>) => void;
  /** Draft: "Save draft" · "Publish". Open / Paused / Closed: "Save changes" */
  onSaveDraft: () => void;
  onPublish: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onLeaveCancel: () => void;
  onLeaveConfirm: () => void;
  onLoadLatest?: () => void;
  onRetry?: () => void;
};

export function VacancyEditView(p: VacancyEditViewProps) {
  const navigate = useNavigate();
  const v = p.vacancy;

  if (p.state === "not-found" || (p.state === "ready" && !v)) {
    return (
      <EmployerLayout>
        <Container width="content">
          <PageBody className={styles.notFound}>
            <Tray>
              <EmptyState
                icon={<Icon name="vacancy" size={20} />}
                title="Vacancy not found"
                description="It may have been deleted, or the link is wrong."
                actions={<Button size="sm" onClick={() => navigate(p.routes.list)}>Back to vacancies</Button>}
              />
            </Tray>
          </PageBody>
        </Container>
      </EmployerLayout>
    );
  }

  const header = (title: ReactNode, description?: ReactNode, back = p.routes.list, backLabel = "Vacancies") => (
    <PageHeader eyebrow={<BackLink to={back}>{backLabel}</BackLink>} title={title} description={description} />
  );

  if (p.state === "error") {
    return (
      <EmployerLayout>
        <Container width="content">
          {header("Edit vacancy")}
          <PageBody>
            <Card>
              <EmptyState
                tone="error"
                title="Couldn't load this vacancy"
                description="Check your connection and try again."
                actions={<Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={p.onRetry}>Try again</Button>}
              />
            </Card>
          </PageBody>
        </Container>
      </EmployerLayout>
    );
  }

  if (p.state === "loading" || !v) {
    return (
      <EmployerLayout>
        <Container width="content">
          {header("Edit vacancy", <Skeleton width={220} height={14} />)}
          <PageBody aria-busy="true">
            <Card padding="lg">
              <Stack gap={32}>
                {[1, 2, 3].map((i) => (
                  <Stack key={i} gap={12}>
                    <Skeleton width={120} height={16} />
                    <Skeleton height={40} />
                    <Skeleton height={40} />
                  </Stack>
                ))}
              </Stack>
            </Card>
          </PageBody>
        </Container>
      </EmployerLayout>
    );
  }

  const isDraft = v.status === "draft";
  const closed = v.status === "closed";
  const errorFields = Object.keys(p.errors ?? {}) as DraftField[];
  const alert = p.formAlert;
  const submit = (e: FormEvent) => { e.preventDefault(); (isDraft ? p.onPublish : p.onSave)(); };
  const common = { values: p.values, errors: p.errors, onChange: p.onChange };

  return (
    <EmployerLayout>
      <Container width="content">
        <PageHeader
          eyebrow={<BackLink to={p.routes.view(v.id)}>{v.title}</BackLink>}
          title="Edit vacancy"
          description={
            <span className={styles.statusLine}>
              <VacancyStatusTag status={v.status} />
              <span>{statusLine(v)}</span>
            </span>
          }
        />
        <PageBody>
          {alert?.kind === "incomplete" && (
            <Alert tone="error" title={`Fix ${alert.fields.length} ${alert.fields.length === 1 ? "field" : "fields"} to ${alert.mode === "publish" ? "publish" : "save"}`}>
              {alert.fields.map((f) => DRAFT_FIELD_LABEL[f]).join(" · ")}
            </Alert>
          )}
          {alert?.kind === "conflict" && (
            <Alert
              tone="warning"
              title="This vacancy was changed elsewhere"
              action={<Button variant="secondary" size="sm" onClick={p.onLoadLatest}>Load latest version</Button>}
            >
              Someone saved a newer version, maybe in another tab. Your edits are still here: save again to replace it.
            </Alert>
          )}
          {alert?.kind === "save-error" && (
            <Alert tone="error" title="Couldn't save your changes">Check your connection and try again. Nothing you typed is lost.</Alert>
          )}
          {!alert && errorFields.length > 1 && (
            <Alert tone="error" title={`Fix ${errorFields.length} fields to save`}>{errorFields.map((f) => DRAFT_FIELD_LABEL[f]).join(" · ")}</Alert>
          )}

          <Card padding="lg">
            <form onSubmit={submit} aria-label="Edit vacancy" noValidate data-testid="vacancy-form">
              <FormSection title="Basics" description="What the role is and who it's for.">
                <BasicsFields {...common} catalog={p.catalog} />
              </FormSection>
              <FormSection title="Where" description="Students filter by city and format.">
                <WhereFields {...common} catalog={p.catalog} />
              </FormSection>
              <FormSection title="Skills" description="Required skills carry most of the match. Keep it to the 3–6 that really matter.">
                <SkillsFields {...common} skillOptions={p.skillOptions} suggestions={p.suggestions} onSkillQuery={p.onSkillQuery} skillsLoading={p.skillsLoading} />
              </FormSection>
              <FormSection title="Details" description="The description and the deadline students see.">
                <DetailsFields
                  {...common}
                  today={closed ? undefined : p.today}
                  deadlineHint={closed ? "This vacancy is closed. Use Reopen to take applications again." : undefined}
                />
              </FormSection>
            </form>
          </Card>

          {(isDraft || p.dirty) && (
            <StickyBar>
              <span>{p.dirty ? "Unsaved changes" : "Draft · not visible to students"}</span>
              <Cluster gap={6}>
                {isDraft ? (
                  <>
                    <Button variant="secondary" size="sm" disabled={p.saving} onClick={p.onSaveDraft}>Save draft</Button>
                    <Button size="sm" loading={p.saving} onClick={p.onPublish}>Publish</Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" disabled={p.saving} onClick={p.onDiscard}>Discard</Button>
                    <Button size="sm" loading={p.saving} onClick={p.onSave}>Save changes</Button>
                  </>
                )}
              </Cluster>
            </StickyBar>
          )}
        </PageBody>
      </Container>

      <Modal
        open={Boolean(p.leaveOpen)}
        onClose={p.onLeaveCancel}
        title="Discard your changes?"
        description="You have unsaved changes to this vacancy. They'll be lost if you leave."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={p.onLeaveCancel}>Keep editing</Button>
            <Button variant="destructive" size="sm" onClick={p.onLeaveConfirm} data-testid="confirm-discard">Discard changes</Button>
          </>
        }
        data-testid="discard-dialog"
      />
    </EmployerLayout>
  );
}
