import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Cluster, Grid, Stack } from "@/components/layout";
import { SkillSuggestion } from "@/components/domain";
import {
  Alert, Button, ChoiceGroup, Combobox, DateField, Modal, Radio, SelectField, Tag, TextareaField, TextField, type MenuItem,
} from "@/components/ui";
import {
  ACTION_META, STATUS_META, actionsFor, formatDayYear, plural,
  type Catalog, type DraftErrors, type VacancyAction, type VacancyDraft, type VacancyItem, type VacancyNotice, type VacancyStatus,
} from "../model";

/* ── Status tag ──────────────────────────────────────────── */

/** The one way to show a vacancy's status to its employer (Draft · Open · Paused · Closed). */
export function VacancyStatusTag({ status }: { status: VacancyStatus }) {
  const s = STATUS_META[status];
  return <Tag tone={s.tone} data-testid="vacancy-status" data-status={status}>{s.label}</Tag>;
}

/* ── "⋯" menu: only the actions valid for the status ───────── */

/** Edit · lifecycle actions · (separator) · destructive ones last. `withEdit: false` on the vacancy page, which has an Edit button. */
export function vacancyMenuItems(
  v: VacancyItem,
  { editHref, onAction, withEdit = true }: { editHref: string; onAction: (action: VacancyAction, v: VacancyItem) => void; withEdit?: boolean },
): MenuItem[] {
  const items: MenuItem[] = [];
  actionsFor(v.status).forEach((a) => {
    if (a === "edit") {
      if (withEdit) items.push({ id: "edit", label: ACTION_META.edit.label, icon: ACTION_META.edit.icon, to: editHref });
      return;
    }
    const meta = ACTION_META[a];
    if (meta.danger && items.length > 0 && items[items.length - 1] !== "separator") items.push("separator");
    items.push({ id: a, label: meta.label, icon: meta.icon, danger: meta.danger, onSelect: () => onAction(a, v) });
  });
  return items;
}

/* ── Notice (a refused action, an unfinished draft) ───────── */

export function NoticeAlert({ notice }: { notice: VacancyNotice }) {
  const { action } = notice;
  const navigate = useNavigate();
  return (
    <Alert
      tone={notice.tone}
      title={notice.title}
      data-testid="vacancy-notice"
      action={
        action && (
          <Button variant="secondary" size="sm" onClick={() => (action.to ? navigate(action.to) : action.onClick?.())}>{action.label}</Button>
        )
      }
    >
      {notice.text}
    </Alert>
  );
}

/* ── Form fields shared by the wizard and the edit form ───── */

export type FieldsProps = {
  values: VacancyDraft;
  errors?: DraftErrors;
  catalog: Catalog;
  onChange: (patch: Partial<VacancyDraft>) => void;
};

/** Title, type and field. */
export function BasicsFields({ values, errors, catalog, onChange }: FieldsProps) {
  return (
    <Stack gap={16}>
      <TextField
        label="Title"
        name="title"
        value={values.title}
        maxLength={120}
        placeholder="e.g. Backend Intern (Python)"
        hint="What students will search for"
        error={errors?.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <Grid min={200} gap={14}>
        <SelectField label="Type" value={values.type} placeholder="Choose a type" options={catalog.types} error={errors?.type}
          onChange={(type) => onChange({ type })} data-testid="vacancy-type" />
        <SelectField label="Field" value={values.field} placeholder="Choose a field" options={catalog.fields} error={errors?.field}
          onChange={(field) => onChange({ field })} data-testid="vacancy-field" />
      </Grid>
    </Stack>
  );
}

/** City and format. */
export function WhereFields({ values, errors, catalog, onChange }: FieldsProps) {
  return (
    <Stack gap={16}>
      <SelectField label="City" value={values.city} placeholder="Choose a city" options={catalog.cities} error={errors?.city}
        onChange={(city) => onChange({ city })} data-testid="vacancy-city" />
      <ChoiceGroup legend="Format" error={errors?.format}>
        {catalog.formats.map((f) => (
          <Radio key={f.value} name="format" label={f.label} checked={values.format === f.value} onChange={() => onChange({ format: f.value })} />
        ))}
      </ChoiceGroup>
    </Stack>
  );
}

/** Required and Nice to have skills (no levels). */
export function SkillsFields({
  values, errors, onChange, skillOptions, suggestions = [], onSkillQuery, skillsLoading,
}: Pick<FieldsProps, "values" | "errors" | "onChange"> & {
  skillOptions: string[];
  suggestions?: string[];
  /** The typed text of either skill field (the page searches GET /api/skills?q= and passes the result as skillOptions) */
  onSkillQuery?: (query: string) => void;
  /** The search for the typed text is running: the list shows "Searching…" */
  skillsLoading?: boolean;
}) {
  const taken = new Set([...values.requiredSkills, ...values.niceSkills].map((s) => s.toLowerCase()));
  const open = suggestions.filter((s) => !taken.has(s.toLowerCase()));
  return (
    <Stack gap={16}>
      <Combobox
        label="Required"
        multiple
        max={10}
        value={values.requiredSkills}
        onChange={(requiredSkills) => onChange({ requiredSkills, niceSkills: values.niceSkills.filter((s) => !requiredSkills.includes(s)) })}
        options={skillOptions}
        allowCreate
        placeholder="e.g. Python"
        onQueryChange={onSkillQuery}
        loading={skillsLoading}
        hint="1 to 10 skills a student must have"
        error={errors?.requiredSkills}
        data-testid="required-skills-input"
      />
      {open.length > 0 && values.requiredSkills.length < 10 && (
        <Stack gap={8}>
          <span className="sr-only">Suggested skills</span>
          <Cluster gap={6} data-testid="skill-suggestions">
            {open.slice(0, 5).map((s) => (
              <SkillSuggestion key={s} name={s} onAdd={() => onChange({ requiredSkills: [...values.requiredSkills, s] })} />
            ))}
          </Cluster>
        </Stack>
      )}
      <Combobox
        label="Nice to have"
        optional
        multiple
        max={10}
        value={values.niceSkills}
        onChange={(niceSkills) => onChange({ niceSkills })}
        options={skillOptions.filter((s) => !values.requiredSkills.includes(s))}
        allowCreate
        placeholder="e.g. Docker"
        onQueryChange={onSkillQuery}
        loading={skillsLoading}
        hint="Up to 10 skills that add to the match"
        data-testid="nice-skills-input"
      />
    </Stack>
  );
}

/** Description, duration, salary and the deadline. */
export function DetailsFields({
  values, errors, onChange, today, deadlineHint,
}: Pick<FieldsProps, "values" | "errors" | "onChange"> & { today?: string; deadlineHint?: ReactNode }) {
  return (
    <Stack gap={16}>
      <TextareaField
        label="Description"
        name="description"
        value={values.description}
        maxLength={5000}
        rows={6}
        hint="What the role involves and what you offer. Up to 5000 characters"
        error={errors?.description}
        onChange={(e) => onChange({ description: e.target.value })}
      />
      <Grid min={200} gap={14}>
        <TextField label="Duration" optional name="duration" value={values.duration} maxLength={60} placeholder="e.g. 3 months"
          onChange={(e) => onChange({ duration: e.target.value })} />
        <TextField label="Salary" optional name="salary" value={values.salary} maxLength={60} placeholder="e.g. 200 000 ₸ / month"
          onChange={(e) => onChange({ salary: e.target.value })} />
      </Grid>
      <DateField
        label="Apply by"
        value={values.applyBy}
        min={today}
        hint={deadlineHint ?? "Students can apply until the end of this day"}
        error={errors?.applyBy}
        onChange={(applyBy) => onChange({ applyBy })}
        data-testid="apply-by"
      />
    </Stack>
  );
}

/* ── Dialogs: close · reopen · delete draft ───────────────── */

export type VacancyDialogState = { kind: "close" | "reopen" | "delete"; vacancy: VacancyItem } | null;

export type VacancyDialogsProps = {
  dialog: VacancyDialogState;
  /** Earliest date allowed for Reopen (today, ISO) */
  today: string;
  /** The request is in flight: the confirm button shows a spinner */
  busy?: boolean;
  /** Server refused the date (apply_by_not_in_future) */
  reopenError?: string;
  onCancel: () => void;
  onConfirm: (kind: "close" | "reopen" | "delete", applyBy?: string) => void;
};

export function VacancyDialogs({ dialog, today, busy, reopenError, onCancel, onConfirm }: VacancyDialogsProps) {
  if (!dialog) return null;
  const v = dialog.vacancy;
  const cancel = (label: string) => (
    <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>{label}</Button>
  );

  if (dialog.kind === "close") {
    return (
      <Modal
        open
        onClose={onCancel}
        title={`Close “${v.title}”?`}
        description={
          v.applicants > 0
            ? `Students will no longer find it or apply. Your ${plural(v.applicants, "applicant")} stay exactly where they are, and you can reopen it later.`
            : "Students will no longer find it or apply. You can reopen it later with a new deadline."
        }
        footer={
          <>
            {cancel("Keep it open")}
            <Button size="sm" loading={busy} onClick={() => onConfirm("close")} data-testid="confirm-close">Close vacancy</Button>
          </>
        }
        data-testid="close-dialog"
      />
    );
  }

  if (dialog.kind === "delete") {
    return (
      <Modal
        open
        onClose={onCancel}
        title="Delete this draft?"
        description={`“${v.title}” will be deleted for good. This can't be undone.`}
        footer={
          <>
            {cancel("Keep draft")}
            <Button variant="destructive" size="sm" loading={busy} onClick={() => onConfirm("delete")} data-testid="confirm-delete">Delete draft</Button>
          </>
        }
        data-testid="delete-dialog"
      />
    );
  }

  return <ReopenDialog key={v.id} vacancy={v} today={today} busy={busy} serverError={reopenError} onCancel={onCancel} onConfirm={(d) => onConfirm("reopen", d)} />;
}

function ReopenDialog({
  vacancy: v, today, busy, serverError, onCancel, onConfirm,
}: { vacancy: VacancyItem; today: string; busy?: boolean; serverError?: string; onCancel: () => void; onConfirm: (applyBy: string) => void }) {
  const [date, setDate] = useState("");
  const [clientError, setClientError] = useState<string | undefined>();
  // A refusal from the server is shown while the date has not been changed since; it never resets the date.
  const [dismissed, setDismissed] = useState(false);
  const field = useRef<HTMLDivElement>(null);
  const error = clientError ?? (!dismissed && !busy ? serverError : undefined);

  useEffect(() => {
    if (serverError && !busy) field.current?.querySelector("button")?.focus();
  }, [serverError, busy]);

  const submit = () => {
    if (!date || date < today) {
      setClientError("Choose today or a later date");
      return;
    }
    setClientError(undefined);
    setDismissed(false);
    onConfirm(date);
  };
  return (
    <Modal
      open
      overflow="visible"
      onClose={onCancel}
      title={`Reopen “${v.title}”?`}
      description={
        v.applicants > 0
          ? `It becomes Open again with its ${plural(v.applicants, "applicant")}. New applications join the same list.`
          : "It becomes Open again and students can find and apply to it."
      }
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button size="sm" loading={busy} onClick={submit} data-testid="confirm-reopen">Reopen vacancy</Button>
        </>
      }
      data-testid="reopen-dialog"
    >
      <div ref={field}>
        <DateField
          label="New Apply by date"
          value={date}
          min={today}
          hint={date ? `Open until the end of ${formatDayYear(date)}` : "Students can apply until the end of this day"}
          error={error}
          onChange={(d) => { setDate(d); setClientError(undefined); setDismissed(true); }}
          data-testid="reopen-date"
        />
      </div>
    </Modal>
  );
}
