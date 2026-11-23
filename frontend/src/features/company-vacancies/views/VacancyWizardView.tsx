import { Cluster, Stack } from "@/components/layout";
import { FactList, SkillChip, type Fact } from "@/components/domain";
import { Icon } from "@/components/icons";
import { Alert, Avatar, Button, Container, EmptyState, Skeleton, Stepper, Tag, Tray } from "@/components/ui";
import { Logo } from "@/components/ui/app-shell";
import {
  DRAFT_FIELD_LABEL, formatDayYear, optionLabel,
  type Catalog, type DraftErrors, type DraftField, type VacancyDraft,
} from "../model";
import { BasicsFields, DetailsFields, SkillsFields, WhereFields } from "./parts";
import styles from "./vacancies.module.css";

export const WIZARD_STEPS = ["Basics", "Skills", "Details", "Preview"] as const;
export type WizardStep = 0 | 1 | 2 | 3;
export type VacancyWizardState = "ready" | "loading" | "error";

/** Which step holds each field the API can name in `incomplete.fields`. */
export const FIELD_STEP: Record<DraftField, WizardStep> = {
  title: 0, type: 0, field: 0, city: 0, format: 0, requiredSkills: 1, description: 2, applyBy: 2,
};

export type WizardAlert = { kind: "incomplete"; fields: DraftField[] } | { kind: "save-error" };

export type VacancyWizardViewProps = {
  state: VacancyWizardState;
  step: WizardStep;
  values: VacancyDraft;
  errors?: DraftErrors;
  formAlert?: WizardAlert;
  /** Which request is in flight: the draft save ("Save and exit") or Publish */
  busy?: "save" | "publish";
  /** Company name shown in the preview (from the company profile) */
  company: string;
  catalog: Catalog;
  skillOptions: string[];
  suggestions?: string[];
  /** Typed text of a skill field: the page searches the server and passes the result as `skillOptions` */
  onSkillQuery?: (query: string) => void;
  /** That search is running */
  skillsLoading?: boolean;
  /** ISO date, earliest deadline */
  today: string;
  /** Where the logo leads */
  home: string;
  onChange: (patch: Partial<VacancyDraft>) => void;
  onBack: () => void;
  onContinue: () => void;
  onGoToStep: (step: WizardStep) => void;
  onSaveExit: () => void;
  onPublish: () => void;
  onRetry?: () => void;
};

const COPY: { title: string; sub: string; hint: (v: VacancyDraft) => string }[] = [
  { title: "What's the role?", sub: "Students search by title, field and city.", hint: () => "Only the title is needed to save a draft" },
  { title: "Which skills does it need?", sub: "Required skills carry most of the match score.", hint: (v) => `${v.requiredSkills.length} of 10 required · ${v.niceSkills.length} nice to have` },
  { title: "Tell students about it", sub: "A clear description and a deadline help them decide to apply.", hint: () => "Duration and salary are optional" },
  { title: "Check how students will see it", sub: "Publish when it looks right. You can edit it any time.", hint: () => "Not visible to students until you publish" },
];

export function VacancyWizardView(p: VacancyWizardViewProps) {
  const copy = COPY[p.step];
  const last = p.step === 3;
  const common = { values: p.values, errors: p.errors, onChange: p.onChange };

  return (
    <div className={styles.wizardPage}>
      <Container width="form">
        <div className={styles.wizardBar}>
          <Logo to={p.home} />
          <Button variant="ghost" size="sm" loading={p.busy === "save"} disabled={p.busy === "publish"} onClick={p.onSaveExit}>Save and exit</Button>
        </div>
        <div className={styles.wizardBody}>
          <Stepper steps={[...WIZARD_STEPS]} current={p.step} />
          <div className={styles.wizardHead}>
            <h1 className={styles.wizardTitle}>{copy.title}</h1>
            <p className={styles.wizardSub}>{copy.sub}</p>
          </div>

          {p.formAlert?.kind === "save-error" && (
            <Alert tone="error" title="Couldn't save your draft">Check your connection and try again. Nothing you typed is lost.</Alert>
          )}
          {p.formAlert?.kind === "incomplete" && (
            <Alert tone="error" title={`Fix ${p.formAlert.fields.length} ${p.formAlert.fields.length === 1 ? "thing" : "things"} to publish`}>
              <ul className={styles.fixList}>
                {p.formAlert.fields.map((f) => (
                  <li key={f}>
                    <button type="button" className={styles.fixLink} onClick={() => p.onGoToStep(FIELD_STEP[f])}>
                      {DRAFT_FIELD_LABEL[f]} · {WIZARD_STEPS[FIELD_STEP[f]]}
                    </button>
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          {p.state === "error" ? (
            <Tray>
              <EmptyState
                tone="error"
                title="Couldn't load the form"
                description="Check your connection and try again."
                actions={<Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={p.onRetry}>Try again</Button>}
              />
            </Tray>
          ) : p.state === "loading" ? (
            <Tray padding="lg" aria-busy="true" footer={<Skeleton width={180} height={12} />}>
              <Stack gap={16}>
                <Skeleton width={80} height={12} />
                <Skeleton height={40} />
                <Skeleton width={80} height={12} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </Stack>
            </Tray>
          ) : (
            <Tray padding="lg" footer={<span>{copy.hint(p.values)}</span>} data-testid={`wizard-step-${WIZARD_STEPS[p.step].toLowerCase()}`}>
              {p.step === 0 && (
                <Stack gap={16}>
                  <BasicsFields {...common} catalog={p.catalog} />
                  <WhereFields {...common} catalog={p.catalog} />
                </Stack>
              )}
              {p.step === 1 && <SkillsFields {...common} skillOptions={p.skillOptions} suggestions={p.suggestions} onSkillQuery={p.onSkillQuery} skillsLoading={p.skillsLoading} />}
              {p.step === 2 && <DetailsFields {...common} today={p.today} />}
              {p.step === 3 && <Preview values={p.values} catalog={p.catalog} company={p.company} />}
            </Tray>
          )}

          <div className={styles.wizardFoot}>
            {p.step > 0 ? (
              <Button variant="ghost" icon={<Icon name="arrowLeft" />} disabled={p.busy !== undefined} onClick={p.onBack}>Back</Button>
            ) : (
              <span />
            )}
            {last ? (
              <Button icon={<Icon name="postVacancy" />} loading={p.busy === "publish"} disabled={p.state !== "ready"} onClick={p.onPublish}>Publish vacancy</Button>
            ) : (
              <Button iconRight={<Icon name="arrowRight" />} disabled={p.state !== "ready" || p.busy !== undefined} onClick={p.onContinue}>Continue</Button>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}

/** The vacancy as a student sees it: one card, no links (nothing to click in a preview). */
function Preview({ values: v, catalog, company }: { values: VacancyDraft; catalog: Catalog; company: string }) {
  const typeLabel = optionLabel(catalog.types, v.type);
  const city = optionLabel(catalog.cities, v.city);
  const format = optionLabel(catalog.formats, v.format);
  const facts: Fact[] = [
    ...(v.format === "remote" ? [{ icon: "remote" as const, label: "Remote" }] : city || format ? [{ icon: "location" as const, label: [city, format].filter(Boolean).join(" · ") }] : []),
    ...(v.duration ? [{ icon: "duration" as const, label: v.duration }] : []),
    ...(v.salary ? [{ icon: "salary" as const, label: v.salary }] : []),
    ...(v.applyBy ? [{ icon: "deadline" as const, label: `Apply by ${formatDayYear(v.applyBy)}` }] : []),
  ];
  return (
    <Stack gap={20} data-testid="vacancy-preview">
      <Cluster gap={12} nowrap>
        <Avatar name={company} shape="square" />
        <div className={styles.rowMain}>
          <h2 className={styles.previewTitle}>{v.title || "Untitled vacancy"}</h2>
          <span className={styles.rowMeta}>{company}{optionLabel(catalog.fields, v.field) ? ` · ${optionLabel(catalog.fields, v.field)}` : ""}</span>
        </div>
        {typeLabel && <Tag tone={v.type === "internship" ? "accent" : "neutral"}>{typeLabel}</Tag>}
      </Cluster>
      {facts.length > 0 && <FactList facts={facts} />}
      <div className={styles.divider} />
      <div className={styles.prose}>
        {v.description ? <p>{v.description}</p> : <span className={styles.rowMeta}>No description yet</span>}
      </div>
      <div className={styles.skillGroup}>
        <span className={styles.rowMeta}>Required</span>
        <div className={styles.skillRow}>
          {v.requiredSkills.length ? v.requiredSkills.map((s) => <SkillChip key={s} name={s} />) : <span className={styles.rowMeta}>None yet</span>}
        </div>
      </div>
      {v.niceSkills.length > 0 && (
        <div className={styles.skillGroup}>
          <span className={styles.rowMeta}>Nice to have</span>
          <div className={styles.skillRow}>{v.niceSkills.map((s) => <SkillChip key={s} name={s} nice />)}</div>
        </div>
      )}
    </Stack>
  );
}

