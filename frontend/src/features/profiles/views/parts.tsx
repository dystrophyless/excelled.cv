import { useEffect, useId, useRef } from "react";
import { Cluster, Grid, Stack, StickyBar } from "@/components/layout";
import { Icon } from "@/components/icons";
import {
  Alert, Button, Checkbox, ChoiceGroup, Combobox, Modal, type ComboboxOption, SelectField, Skeleton, TextareaField, TextField,
  Tooltip,
} from "@/components/ui";
import { MAJORS, UNIVERSITIES, findUniversity } from "../universities";
import {
  GRADUATED, LANGUAGES, LIMITS, MAX_FIELDS, MAX_ROWS, emptyLanguage, emptyProject, studyYearOptions,
  type CompanyErrors, type CompanyValues, type LanguageValues, type Option, type ProfileCatalog, type ProfileFormAlert,
  type ProjectValues, type StudentErrors, type StudentValues,
} from "../model";
import styles from "./profiles.module.css";

/*
 * Fields shared by the onboarding wizards and the edit forms. Both use the same answer lists (model.ts):
 * the wizard shows them as one-tap choices (pickers.tsx), the edit forms as Combobox / SelectField.
 */

const NO_CITY: Option = { value: "", label: "Not specified" };
export const charCount = (v: string, max: number) => <span className={styles.charCount}>{v.length} of {max} characters</span>;

type StudentFieldsProps = {
  values: StudentValues;
  errors?: StudentErrors;
  onChange: (patch: Partial<StudentValues>) => void;
};

export function FullNameField({ values, errors, onChange, hint }: StudentFieldsProps & { hint?: string }) {
  return (
    <TextField
      label="Full name"
      name="fullName"
      autoComplete="name"
      value={values.fullName}
      maxLength={LIMITS.fullName}
      placeholder="e.g. Maya Akhmetova"
      hint={hint ?? `First and last name · up to ${LIMITS.fullName} characters`}
      error={errors?.fullName}
      onChange={(e) => onChange({ fullName: e.target.value })}
    />
  );
}

/** Every listed university as one equal option: the city as the second line, aliases (KBTU, NU…) as search terms. */
const UNIVERSITY_OPTIONS: ComboboxOption[] = UNIVERSITIES.map((u) => ({
  value: u.name, label: u.name, description: u.city, keywords: u.aliases,
}));

const typedLabel = (typed: string) => <>Use <strong>“{typed}”</strong></>;

type SearchFieldProps = StudentFieldsProps & {
  /** Edit profile: the value can be emptied (the required-field error then shows on Save) */
  clearable?: boolean;
};

/**
 * University search: every university of the neutral alphabetical list (universities.ts) is one equal option; a name
 * that is not listed is used exactly as typed (the list offers "Use “…”" as a normal option). Short names find their
 * university (KBTU, NU, ENU…). The hint shows the city of a listed university. Same component on onboarding step 2 and
 * on Edit profile (clearable there).
 */
export function UniversityField({ values, errors, onChange, clearable }: SearchFieldProps) {
  const listed = findUniversity(values.university);
  const hint = listed
    ? <span className={styles.cityHint}><Icon name="location" size={14} />{listed.city}</span>
    : values.university.trim()
      ? `Saved as you typed it · up to ${LIMITS.university} characters`
      : `Type the name or a short name like KBTU · up to ${LIMITS.university} characters`;
  return (
    <Combobox
      label="University"
      value={values.university}
      onChange={(university) => onChange({ university })}
      options={UNIVERSITY_OPTIONS}
      allowCreate
      createLabel={typedLabel}
      clearable={clearable}
      inFlow // the list pushes Continue / Save down instead of covering it
      placeholder="Search, e.g. Satbayev University or KBTU"
      hint={hint}
      error={errors?.university}
      data-testid="university-input"
    />
  );
}

/** Major search: same rule as the university — a broad alphabetical list, or the major as typed. */
export function MajorField({ values, errors, onChange, clearable }: SearchFieldProps) {
  const listed = MAJORS.some((m) => m.toLowerCase() === values.major.trim().toLowerCase());
  const hint = !listed && values.major.trim()
    ? `Saved as you typed it · up to ${LIMITS.major} characters`
    : `Type to search, or use your own wording · up to ${LIMITS.major} characters`;
  return (
    <Combobox
      label="Major"
      value={values.major}
      onChange={(major) => onChange({ major })}
      options={MAJORS}
      allowCreate
      createLabel={typedLabel}
      clearable={clearable}
      inFlow // the list pushes Continue / Save down instead of covering it
      placeholder="Search, e.g. Computer Science"
      hint={hint}
      error={errors?.major}
      data-testid="major-input"
    />
  );
}

/** Degree change: a year of study the new degree doesn't have is cleared ("Graduated" always fits). */
export const degreePatch = (degree: string, studyYear: string): Partial<StudentValues> =>
  studyYear && studyYear !== GRADUATED && !studyYearOptions(degree).some((o) => o.value === studyYear)
    ? { degree, studyYear: "" }
    : { degree };

export function GpaField({ values, errors, onChange }: StudentFieldsProps) {
  return (
    <TextField
      label="GPA"
      optional
      name="gpa"
      inputMode="decimal"
      value={values.gpa}
      maxLength={4}
      placeholder="e.g. 3.45"
      hint="On the 4.0 scale"
      error={errors?.gpa}
      onChange={(e) => onChange({ gpa: e.target.value })}
      data-testid="gpa-input"
    />
  );
}

/** Edit form "Studies": university, major (search + free text) · degree | year of study (selects) · GPA. */
export function StudyFields({ values, errors, onChange, catalog }: StudentFieldsProps & { catalog: ProfileCatalog }) {
  return (
    <Stack gap={16}>
      <UniversityField values={values} errors={errors} onChange={onChange} clearable />
      <MajorField values={values} errors={errors} onChange={onChange} clearable />
      <Grid min={200} gap={14}>
        <SelectField
          label="Degree"
          value={values.degree}
          placeholder="Choose a degree"
          options={catalog.degrees}
          error={errors?.degree}
          onChange={(degree) => onChange(degreePatch(degree, values.studyYear))}
          data-testid="degree-select"
        />
        <SelectField
          label="Year of study"
          value={values.studyYear}
          placeholder="Choose a year"
          options={studyYearOptions(values.degree)}
          error={errors?.studyYear}
          onChange={(studyYear) => onChange({ studyYear })}
          data-testid="study-year"
        />
      </Grid>
      <div id="gpa"><GpaField values={values} errors={errors} onChange={onChange} /></div>
    </Stack>
  );
}

/**
 * Edit form "Looking for": position types (checkboxes, at least one) first, as in onboarding; then fields of work
 * (Combobox, up to 3) with an "I'm not sure yet" checkbox. A form, not a wizard step: no long list to scroll past, so the
 * compact checkbox stays (round 15). Ticking it disables the Combobox but keeps the chosen fields in memory, so unticking
 * brings them back; only "unsure" saves an empty list.
 */
export function LookingForFields({ values, errors, onChange, catalog }: StudentFieldsProps & { catalog: ProfileCatalog }) {
  const toggle = (type: string, on: boolean) =>
    onChange({ positionTypes: on ? [...values.positionTypes, type] : values.positionTypes.filter((t) => t !== type) });
  const unsure = values.fieldChoice === "unsure";
  return (
    <Stack gap={16}>
      <ChoiceGroup legend="Position type" error={errors?.positionTypes}>
        <Cluster gap={16} data-testid="position-types">
          {catalog.types.map((t) => (
            <Checkbox
              key={t.value}
              label={t.label}
              name="positionTypes"
              value={t.value}
              checked={values.positionTypes.includes(t.value)}
              aria-invalid={errors?.positionTypes ? true : undefined}
              onChange={(e) => toggle(t.value, e.target.checked)}
            />
          ))}
        </Cluster>
      </ChoiceGroup>
      <Stack gap={10}>
        <Combobox
          multiple
          max={MAX_FIELDS}
          label="Fields of work"
          value={unsure ? [] : values.fields}
          onChange={(fields) => onChange({ fields, fieldChoice: "known" })}
          options={catalog.fields}
          disabled={unsure}
          placeholder={unsure ? "Open to any field" : values.fields.length >= MAX_FIELDS ? undefined : "Choose a field"}
          hint={`Up to ${MAX_FIELDS}. Each field says what the role does`}
          error={errors?.fields}
          data-testid="fields-input"
        />
        <Checkbox
          label="I'm not sure yet"
          description="Show me vacancies from every field"
          name="fieldChoice"
          checked={unsure}
          onChange={(e) => onChange({ fieldChoice: e.target.checked ? "unsure" : "known" })}
          data-testid="exploring-checkbox"
        />
      </Stack>
    </Stack>
  );
}

/*
 * Repeatable rows (projects, languages), composed from kit parts only: each row has a ghost icon "Remove …" (Tooltip);
 * "Add …" (secondary sm) sits under the list until the maximum. A new row focuses its first field. Removing is undone
 * with Discard (the edit form's unsaved bar), so it needs no confirmation.
 */
function useRowFocus(count: number) {
  const box = useRef<HTMLDivElement>(null);
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current) {
      // a new row: its first field
      const rows = box.current?.querySelectorAll<HTMLElement>("[data-row]");
      rows?.[rows.length - 1]?.querySelector<HTMLElement>("input, textarea")?.focus();
    } else if (count < prev.current) {
      // a removed row: focus would fall to <body>; hand it to "Add …"
      box.current?.querySelector<HTMLElement>("[data-add]")?.focus();
    }
    prev.current = count;
  }, [count]);
  return box;
}

function RemoveRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tooltip content={label}>
      <Button variant="ghost" size="sm" icon={<Icon name="delete" />} aria-label={label} onClick={onClick} />
    </Tooltip>
  );
}

function AddRow({ label, count, onClick, testId }: { label: string; count: number; onClick: () => void; testId: string }) {
  if (count >= MAX_ROWS) return <p className={styles.rowMeta}>{`You've added ${MAX_ROWS}, the maximum`}</p>;
  return (
    <div>
      <Button variant="secondary" size="sm" icon={<Icon name="add" />} onClick={onClick} data-add data-testid={testId}>{label}</Button>
    </div>
  );
}

export function ProjectRows({ values, errors, onChange }: StudentFieldsProps) {
  const rows = values.projects;
  const box = useRowFocus(rows.length);
  const set = (i: number, patch: Partial<ProjectValues>) => onChange({ projects: rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  return (
    <Stack ref={box} gap={16} data-testid="project-rows">
      {rows.length === 0 && <p className={styles.rowMeta}>No projects yet.</p>}
      {rows.length > 0 && (
        <div className={styles.rowList}>
          {rows.map((r, i) => (
            <div key={r.id} className={styles.rowItem} data-row data-testid="project-row">
              <div className={styles.rowHead}>
                <span className={styles.rowTitle}>Project {i + 1}</span>
                <RemoveRow label={`Remove project ${i + 1}`} onClick={() => onChange({ projects: rows.filter((_, j) => j !== i) })} />
              </div>
              <TextField
                label="Title"
                value={r.title}
                maxLength={LIMITS.projectTitle}
                placeholder="e.g. Campus timetable bot"
                hint={`Up to ${LIMITS.projectTitle} characters`}
                error={errors?.[`projects.${i}.title`]}
                onChange={(e) => set(i, { title: e.target.value })}
              />
              <TextareaField
                label="What it does"
                optional
                rows={2}
                value={r.description}
                maxLength={LIMITS.projectDescription}
                placeholder="One or two sentences: what you built, with what, for whom."
                hint={charCount(r.description, LIMITS.projectDescription)}
                error={errors?.[`projects.${i}.description`]}
                onChange={(e) => set(i, { description: e.target.value })}
              />
              <TextField
                label="Link"
                optional
                type="url"
                inputMode="url"
                value={r.url}
                maxLength={LIMITS.website}
                placeholder="e.g. github.com/you/project"
                hint="Code, demo or write-up · we add https:// if it's missing"
                error={errors?.[`projects.${i}.url`]}
                onChange={(e) => set(i, { url: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}
      <AddRow label="Add project" count={rows.length} onClick={() => onChange({ projects: [...rows, emptyProject()] })} testId="add-project" />
    </Stack>
  );
}

export function LanguageRows({ values, errors, onChange, catalog }: StudentFieldsProps & { catalog: ProfileCatalog }) {
  const rows = values.languages;
  const box = useRowFocus(rows.length);
  const set = (i: number, patch: Partial<LanguageValues>) => onChange({ languages: rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  return (
    <Stack ref={box} gap={16} data-testid="language-rows">
      {rows.length === 0 && <p className={styles.rowMeta}>No languages yet.</p>}
      {rows.length > 0 && (
        <div className={styles.langList}>
          {rows.map((r, i) => (
            <div key={r.id} className={styles.langRow} data-row data-testid="language-row">
              <Combobox
                label={`Language ${i + 1}`}
                value={r.language}
                onChange={(language) => set(i, { language })}
                options={LANGUAGES}
                allowCreate
                createLabel={typedLabel}
                clearable
                inFlow
                placeholder="e.g. English"
                error={errors?.[`languages.${i}.language`]}
              />
              <SelectField
                label="Level"
                value={r.level}
                placeholder="Choose a level"
                options={catalog.languageLevels}
                error={errors?.[`languages.${i}.level`]}
                onChange={(level) => set(i, { level })}
              />
              <span className={styles.langRemove}>
                <RemoveRow label={`Remove language ${i + 1}`} onClick={() => onChange({ languages: rows.filter((_, j) => j !== i) })} />
              </span>
            </div>
          ))}
        </div>
      )}
      <AddRow label="Add language" count={rows.length} onClick={() => onChange({ languages: [...rows, emptyLanguage()] })} testId="add-language" />
    </Stack>
  );
}

/** Edit form "Contacts": all optional; the sign-in email is already known, so it isn't asked. */
export function ContactFields({ values, errors, onChange }: StudentFieldsProps) {
  return (
    <Grid min={200} gap={14} data-testid="contact-fields">
      <TextField label="Phone" optional type="tel" inputMode="tel" autoComplete="tel" value={values.phone} maxLength={LIMITS.phone}
        placeholder="+7 701 123 45 67" error={errors?.phone} onChange={(e) => onChange({ phone: e.target.value })} />
      <TextField label="WhatsApp" optional type="tel" inputMode="tel" value={values.whatsapp} maxLength={LIMITS.phone}
        placeholder="+7 701 123 45 67" hint="The number you use in WhatsApp" error={errors?.whatsapp} onChange={(e) => onChange({ whatsapp: e.target.value })} />
      <TextField label="Telegram" optional autoComplete="off" value={values.telegram} maxLength={LIMITS.telegram}
        placeholder="@username" error={errors?.telegram} onChange={(e) => onChange({ telegram: e.target.value })} />
      <TextField label="LinkedIn" optional type="url" inputMode="url" value={values.linkedin} maxLength={LIMITS.website}
        placeholder="linkedin.com/in/you" error={errors?.linkedin} onChange={(e) => onChange({ linkedin: e.target.value })} />
      <TextField label="GitHub" optional type="url" inputMode="url" value={values.github} maxLength={LIMITS.website}
        placeholder="github.com/you" error={errors?.github} onChange={(e) => onChange({ github: e.target.value })} />
      <TextField label="Website" optional type="url" inputMode="url" autoComplete="url" value={values.website} maxLength={LIMITS.website}
        placeholder="you.dev" error={errors?.website} onChange={(e) => onChange({ website: e.target.value })} />
    </Grid>
  );
}

export function CityField({
  value, error, cities, onChange, testId,
}: { value: string; error?: string; cities: Option[]; onChange: (city: string) => void; testId: string }) {
  return (
    <SelectField
      label="City"
      optional
      value={value}
      placeholder="Choose a city"
      // "Not specified" appears once a city is chosen, so an optional value can be cleared; before that the placeholder shows
      options={value ? [NO_CITY, ...cities] : cities}
      error={error}
      onChange={onChange}
      data-testid={testId}
    />
  );
}

/** A textarea with sentence starters: a tap appends the starter and puts the cursor at the end. */
export function PromptedTextarea({
  label, name, value, max, rows, placeholder, prompts, error, onChange,
}: {
  label: string; name: string; value: string; max: number; rows: number; placeholder: string; prompts: string[];
  error?: string; onChange: (value: string) => void;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const add = (starter: string) => {
    const base = value.trimEnd();
    const next = (base ? `${base}\n${starter}` : starter).slice(0, max);
    onChange(next);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length, next.length);
    });
  };
  return (
    <Stack gap={10}>
      <TextareaField
        ref={ref}
        id={id}
        label={label}
        optional
        name={name}
        rows={rows}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        hint={charCount(value, max)}
        error={error}
        onChange={(e) => onChange(e.target.value)}
      />
      <Stack gap={6}>
        <span className={styles.rowMeta} id={`${id}-starters`}>Need a start? Tap one</span>
        <Cluster gap={6} role="group" aria-labelledby={`${id}-starters`} data-testid={`${name}-starters`}>
          {prompts.map((p) => (
            <Button key={p} variant="secondary" size="sm" icon={<Icon name="add" />} onClick={() => add(p)}>
              {p.trim()}…
            </Button>
          ))}
        </Cluster>
      </Stack>
    </Stack>
  );
}

export function AboutField({ values, errors, onChange, prompts }: StudentFieldsProps & { prompts?: string[] }) {
  if (prompts) {
    return (
      <PromptedTextarea label="About me" name="about" value={values.about} max={LIMITS.about} rows={4} prompts={prompts}
        placeholder="e.g. Third-year student who likes building APIs and is looking for a backend internship."
        error={errors?.about} onChange={(about) => onChange({ about })} />
    );
  }
  return (
    <TextareaField
      label="About me"
      optional
      name="about"
      rows={4}
      value={values.about}
      maxLength={LIMITS.about}
      placeholder="e.g. Third-year student who likes building APIs and is looking for a backend internship."
      hint={charCount(values.about, LIMITS.about)}
      error={errors?.about}
      onChange={(e) => onChange({ about: e.target.value })}
    />
  );
}

type CompanyFieldsProps = {
  values: CompanyValues;
  errors?: CompanyErrors;
  catalog: ProfileCatalog;
  onChange: (patch: Partial<CompanyValues>) => void;
};

export function CompanyNameField({ values, errors, onChange }: Omit<CompanyFieldsProps, "catalog">) {
  return (
    <TextField
      label="Company name"
      name="name"
      autoComplete="organization"
      value={values.name}
      maxLength={LIMITS.companyName}
      placeholder="e.g. Kaspi.kz"
      hint={`Shown on every vacancy you post · up to ${LIMITS.companyName} characters`}
      error={errors?.name}
      onChange={(e) => onChange({ name: e.target.value })}
    />
  );
}

export function WebsiteField({ values, errors, onChange }: Omit<CompanyFieldsProps, "catalog">) {
  return (
    <TextField
      label="Website"
      optional
      name="website"
      type="url"
      inputMode="url"
      autoComplete="url"
      value={values.website}
      maxLength={LIMITS.website}
      placeholder="e.g. kaspi.kz"
      hint="We add https:// if it's missing"
      error={errors?.website}
      onChange={(e) => onChange({ website: e.target.value })}
    />
  );
}

/** Edit form: company name, industry, size (all required). */
export function CompanyBasicsFields({ values, errors, catalog, onChange }: CompanyFieldsProps) {
  return (
    <Stack gap={16}>
      <CompanyNameField values={values} errors={errors} onChange={onChange} />
      <Grid min={200} gap={14}>
        <SelectField label="Industry" value={values.industry} placeholder="Choose an industry" options={catalog.industries}
          error={errors?.industry} onChange={(industry) => onChange({ industry })} data-testid="company-industry" />
        <SelectField label="Company size" value={values.size} placeholder="Choose a size" options={catalog.companySizes}
          error={errors?.size} onChange={(size) => onChange({ size })} data-testid="company-size" />
      </Grid>
    </Stack>
  );
}

/** Edit form: website, city, description (all optional). */
export function CompanyDetailsFields({ values, errors, catalog, onChange }: CompanyFieldsProps) {
  return (
    <Stack gap={16}>
      <WebsiteField values={values} errors={errors} onChange={onChange} />
      <CityField value={values.city} error={errors?.city} cities={catalog.cities} onChange={(city) => onChange({ city })} testId="company-city" />
      <TextareaField
        label="Description"
        optional
        name="description"
        rows={5}
        value={values.description}
        maxLength={LIMITS.description}
        placeholder="e.g. What your company does and what it's like to work there."
        hint={charCount(values.description, LIMITS.description)}
        error={errors?.description}
        onChange={(e) => onChange({ description: e.target.value })}
      />
    </Stack>
  );
}

/* ── Messages above a form ───────────────────────────────── */

/** "Fix 3 fields to save" + the field names; only when more than one field is wrong (patterns.md § Forms). */
export function ErrorSummary({ labels, verb = "save" }: { labels: string[]; verb?: "save" | "continue" }) {
  if (labels.length < 2) return null;
  return (
    <Alert tone="error" title={`Fix ${labels.length} fields to ${verb}`} data-testid="error-summary">
      {labels.join(" · ")}
    </Alert>
  );
}

export function SaveErrorAlert({ what }: { what: string }) {
  return (
    <Alert tone="error" title={`Couldn't save ${what}`} data-testid="save-error">
      Check your connection and try again. Nothing you typed is lost.
    </Alert>
  );
}

export function FormAlert({ alert, what, onLoadLatest }: { alert?: ProfileFormAlert; what: string; onLoadLatest?: () => void }) {
  if (alert === "save-error") return <SaveErrorAlert what={what} />;
  if (alert === "conflict") {
    return (
      <Alert
        tone="warning"
        title={`${what[0].toUpperCase()}${what.slice(1)} was changed elsewhere`}
        action={<Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={onLoadLatest}>Load latest version</Button>}
        data-testid="conflict-alert"
      >
        A newer version was saved, maybe in another tab, so nothing was saved here. Load it to see the latest data, or save again to
        replace it with your edits.
      </Alert>
    );
  }
  return null;
}

/* ── Edit pages: unsaved-changes bar and the leave dialog ──── */

export function UnsavedBar({ saving, onDiscard, onSave }: { saving?: boolean; onDiscard: () => void; onSave: () => void }) {
  return (
    <StickyBar data-testid="unsaved-bar">
      <span>Unsaved changes</span>
      <Cluster gap={6}>
        <Button variant="ghost" size="sm" disabled={saving} onClick={onDiscard}>Discard</Button>
        <Button size="sm" loading={saving} onClick={onSave}>Save</Button>
      </Cluster>
    </StickyBar>
  );
}

export function LeaveDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Leave without saving?"
      description="You have unsaved changes. They'll be lost if you leave this page."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel}>Keep editing</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} data-testid="confirm-leave">Leave without saving</Button>
        </>
      }
      data-testid="leave-dialog"
    />
  );
}

/** Loading shape of a form card: section title + fields, per section. */
export function FormSkeleton({ sections }: { sections: number[] }) {
  return (
    <Stack gap={32}>
      {sections.map((fields, i) => (
        <Stack key={i} gap={12}>
          <Skeleton width={120} height={16} />
          {Array.from({ length: fields }, (_, j) => <Skeleton key={j} height={40} />)}
        </Stack>
      ))}
    </Stack>
  );
}
