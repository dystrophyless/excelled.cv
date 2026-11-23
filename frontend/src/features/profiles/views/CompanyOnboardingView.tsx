import { Stack } from "@/components/layout";
import { industryIcon } from "@/components/icons";
import {
  COMPANY_FIELD_LABEL, COMPANY_STEPS, DESCRIPTION_PROMPTS, LIMITS, errorFields,
  type CompanyErrors, type CompanyValues, type LoadState, type ProfileCatalog,
} from "../model";
import { CompanyNameField, ErrorSummary, PromptedTextarea, SaveErrorAlert, WebsiteField } from "./parts";
import { CardChoices, WizardFrame } from "./pickers";

export type CompanyOnboardingViewProps = {
  /** The catalog (industries, sizes, cities): loading → skeleton, error → retry */
  state: LoadState;
  /** 0-based index into COMPANY_STEPS */
  step: number;
  values: CompanyValues;
  errors?: CompanyErrors;
  saveError?: boolean;
  saving?: boolean;
  catalog: ProfileCatalog;
  home: string;
  onChange: (patch: Partial<CompanyValues>) => void;
  onContinue: () => void;
  onBack: () => void;
  onSave: () => void;
  onSignOut: () => void;
  onRetry?: () => void;
};

const COPY = [
  { title: "Welcome to Novio. What's your company called?", sub: "Five quick questions, about a minute. You can change everything later.", hint: "Students see this name on every vacancy you post" },
  { title: "What industry are you in?", sub: "Pick the closest one.", hint: "“Other” is fine if nothing fits" },
  { title: "How big is your company?", sub: "A rough range is enough.", hint: "Count everyone in the company, not only your team" },
  { title: "Where can students find you?", sub: "Both are optional. Add them now or later in Company profile.", hint: "Optional · you can leave this step empty" },
  { title: "Last one. Describe your company in a few sentences", sub: "Optional. What you do and what it's like to work with you.", hint: "Optional · you can leave it empty and add it later" },
];

/** S4 — /company/onboarding: the company profile, one question per step. Archetype: Wizard. */
export function CompanyOnboardingView(p: CompanyOnboardingViewProps) {
  const name = p.values.name.trim();
  const copy = p.step === 1 && name ? { ...COPY[1], sub: `Thanks, ${name}. Pick the closest one.` } : COPY[p.step];
  const common = { values: p.values, errors: p.errors, onChange: p.onChange };
  const invalid = errorFields(COMPANY_STEPS[p.step].fields, p.errors);

  return (
    <WizardFrame
      state={p.state}
      steps={COMPANY_STEPS.map((s) => s.label)}
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
      formLabel="Create your company profile"
      testId="company-onboarding-step"
      skeletonFields={4}
      alerts={
        <>
          {p.saveError && <SaveErrorAlert what="your company profile" />}
          <ErrorSummary labels={invalid.map((f) => COMPANY_FIELD_LABEL[f])} verb={p.step === COMPANY_STEPS.length - 1 ? "save" : "continue"} />
        </>
      }
    >
      {p.step === 0 && <CompanyNameField {...common} />}

      {p.step === 1 && (
        <CardChoices
          legend="Industry"
          hideLegend
          name="industry"
          options={p.catalog.industries.map((o) => ({ ...o, icon: industryIcon(o.value) }))}
          value={p.values.industry}
          error={p.errors?.industry}
          onChange={(industry) => p.onChange({ industry })}
          data-testid="industry-choices"
        />
      )}

      {p.step === 2 && (
        <CardChoices
          legend="Company size"
          hideLegend
          name="size"
          size="sm"
          min={140}
          columns={3}
          options={p.catalog.companySizes}
          value={p.values.size}
          error={p.errors?.size}
          onChange={(size) => p.onChange({ size })}
          data-testid="size-choices"
        />
      )}

      {p.step === 3 && (
        <Stack gap={24}>
          <WebsiteField {...common} />
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
        </Stack>
      )}

      {p.step === 4 && (
        <PromptedTextarea
          label="Description"
          name="description"
          value={p.values.description}
          max={LIMITS.description}
          rows={5}
          prompts={DESCRIPTION_PROMPTS}
          placeholder="e.g. What your company does and what it's like to work there."
          error={p.errors?.description}
          onChange={(description) => p.onChange({ description })}
        />
      )}
    </WizardFrame>
  );
}
