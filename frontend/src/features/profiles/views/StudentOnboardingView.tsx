import { Stack } from "@/components/layout";
import { ChoiceCardGroup } from "@/components/ui";
import {
  ABOUT_PROMPTS, MAX_FIELDS, STUDENT_STEPS, studentErrorLabels, studyYearOptions,
  type FieldChoice, type LoadState, type ProfileCatalog, type StudentErrors, type StudentValues,
} from "../model";
import { AboutField, ErrorSummary, FullNameField, MajorField, SaveErrorAlert, UniversityField, degreePatch } from "./parts";
import { CardChoices, WizardFrame } from "./pickers";

export type StudentOnboardingViewProps = {
  /** The city catalog: loading → skeleton, error → retry */
  state: LoadState;
  /** 0-based index into STUDENT_STEPS */
  step: number;
  values: StudentValues;
  /** Errors to show (the page passes the current step's errors) */
  errors?: StudentErrors;
  /** POST failed for a reason other than validation */
  saveError?: boolean;
  /** POST in flight */
  saving?: boolean;
  catalog: ProfileCatalog;
  home: string;
  onChange: (patch: Partial<StudentValues>) => void;
  /** Validate the current step, then go to the next */
  onContinue: () => void;
  onBack: () => void;
  /** Last step: validate everything, POST */
  onSave: () => void;
  onSignOut: () => void;
  onRetry?: () => void;
};

/** "Maya Akhmetova" → "Maya" (for the friendly greeting on step 2). */
const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? "";

/** S1 — /onboarding: the student's profile, one question per step. Archetype: Wizard. */
export function StudentOnboardingView(p: StudentOnboardingViewProps) {
  const common = { values: p.values, errors: p.errors, onChange: p.onChange };
  const invalid = studentErrorLabels(p.errors, STUDENT_STEPS[p.step].fields);
  const name = firstName(p.values.fullName);

  const copy = [
    { title: "Welcome to Novio. What's your name?", sub: "Five short steps, about a minute. You can change everything later.", hint: "Use the name you'd put on your CV" },
    { title: "Where do you study?", sub: name ? `Nice to meet you, ${name}. Find your university, then pick the degree.` : "Find your university, then pick the degree.", hint: "Every university and college in Kazakhstan is welcome. If yours isn't listed, use the name as you type it" },
    { title: "What do you study?", sub: "Your major and the year you're in now.", hint: "Finished your studies? Choose “Graduated”. You can change it later in your profile" },
    { title: "What would you like to work on?", sub: "Choose the kind of position first. Not sure about the field yet? That's normal, you can explore.", hint: "You can change this any time in your profile" },
    { title: "Almost done. Anything else to add?", sub: "Both are optional. Projects, languages and contacts come later, on your profile.", hint: "Optional · you can leave this step empty" },
  ][p.step];

  return (
    <WizardFrame
      state={p.state}
      steps={STUDENT_STEPS.map((s) => s.label)}
      current={p.step}
      title={copy.title}
      sub={copy.sub}
      hint={copy.hint}
      home={p.home}
      saving={p.saving}
      onBack={p.onBack}
      onContinue={p.onContinue}
      onSave={p.onSave}
      onSignOut={p.onSignOut}
      onRetry={p.onRetry}
      formLabel="Create your profile"
      testId="student-onboarding-step"
      skeletonFields={4}
      alerts={
        <>
          {p.saveError && <SaveErrorAlert what="your profile" />}
          <ErrorSummary labels={invalid} verb={p.step === STUDENT_STEPS.length - 1 ? "save" : "continue"} />
        </>
      }
    >
      {p.step === 0 && <FullNameField {...common} />}

      {p.step === 1 && (
        <Stack gap={24}>
          <UniversityField {...common} />
          <CardChoices
            legend="Degree"
            name="degree"
            size="sm"
            min={140}
            columns={3}
            options={p.catalog.degrees}
            value={p.values.degree}
            error={p.errors?.degree}
            onChange={(degree) => p.onChange(degreePatch(degree, p.values.studyYear))}
            data-testid="degree-choices"
          />
        </Stack>
      )}

      {p.step === 2 && (
        <Stack gap={24}>
          <MajorField {...common} />
          <CardChoices
            legend="Year of study"
            name="studyYear"
            size="sm"
            min={100}
            columns={4}
            options={studyYearOptions(p.values.degree)}
            value={p.values.studyYear}
            error={p.errors?.studyYear}
            onChange={(studyYear) => p.onChange({ studyYear })}
            data-testid="study-year-choices"
          />
        </Stack>
      )}

      {p.step === 3 && (
        <Stack gap={24}>
          {/* round 15: the short path is short — position type, then one two-way question; the 12 fields only on "I know" */}
          <ChoiceCardGroup
            type="checkbox"
            legend="Position type"
            hint="Choose all that suit you"
            name="positionTypes"
            size="sm"
            min={88}
            columns={3}
            options={p.catalog.types}
            value={p.values.positionTypes}
            error={p.errors?.positionTypes}
            onChange={(positionTypes) => p.onChange({ positionTypes })}
            data-testid="position-type-choices"
          />
          <div>
            <ChoiceCardGroup
              legend="Do you know which field you want?"
              name="fieldChoice"
              size="md"
              min={220}
              columns={2}
              options={[
                { value: "known", label: "I know which field", description: `Pick up to ${MAX_FIELDS} of ${p.catalog.fields.length} fields, each explained`, icon: "match" },
                { value: "unsure", label: "I'm not sure yet", description: "Show me vacancies from every field. I'll decide later", icon: "search" },
              ]}
              value={p.values.fieldChoice}
              error={p.errors?.fieldChoice}
              // switching to "unsure" keeps the ticked fields in memory (not sent); switching back shows them again
              onChange={(v) => p.onChange({ fieldChoice: v as FieldChoice })}
              data-testid="field-choice"
            />
            {/* the revealed list follows the radios in tab order; screen readers hear that it appeared */}
            <span className="sr-only" aria-live="polite">
              {p.values.fieldChoice === "known" ? `${p.catalog.fields.length} fields shown below` : ""}
            </span>
          </div>
          {p.values.fieldChoice === "known" && (
            <ChoiceCardGroup
              type="checkbox"
              legend={`Pick up to ${MAX_FIELDS} fields`}
              hint={`${p.values.fields.length} of ${MAX_FIELDS} chosen`}
              name="fields"
              size="md"
              min={220}
              columns={2}
              options={p.catalog.fields.map((f) => ({
                value: f.value,
                label: f.label,
                description: f.description,
                // the 4th field can't be ticked: untick one first (FR-002: up to 3)
                disabled: p.values.fields.length >= MAX_FIELDS && !p.values.fields.includes(f.value),
              }))}
              value={p.values.fields}
              error={p.errors?.fields}
              onChange={(fields) => p.onChange({ fields })}
              data-testid="field-choices"
            />
          )}
        </Stack>
      )}

      {p.step === 4 && (
        <Stack gap={24}>
          <CardChoices
            legend="City (optional)"
            name="city"
            size="sm"
            min={120}
            columns={4}
            options={[...p.catalog.cities, { value: "", label: "Not specified" }]}
            value={p.values.city}
            error={p.errors?.city}
            onChange={(city) => p.onChange({ city })}
            data-testid="city-choices"
          />
          <AboutField {...common} prompts={ABOUT_PROMPTS} />
        </Stack>
      )}
    </WizardFrame>
  );
}
