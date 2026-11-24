import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "@/components/ui";
import { useCompanyProfile } from "@/features/profiles/hooks";
import { ApiError } from "@/lib/api";
import { EMPTY_SALARY, salaryMessage } from "@/lib/money";
import { DEADLINE_ERROR, EMPTY_CATALOG, ROUTES, TITLE_ERROR, errorsFor, incompleteFields, isApiError, salaryRefusal, titleOk } from "./form";
import { focusHeading } from "./focus";
import { todayKz, useCatalog, useCreateVacancy, useSkillSuggestions } from "./hooks";
import { TOASTS, type DraftErrors, type VacancyDraft } from "./model";
import { VacancyWizardView, type WizardAlert, type WizardStep } from "./views/VacancyWizardView";

const EMPTY_DRAFT: VacancyDraft = {
  title: "", type: "", field: "", city: "", format: "", description: "", duration: "", salary: EMPTY_SALARY, applyBy: "",
  requiredSkills: [], niceSkills: [],
};

/** S2 - Post a vacancy (wizard). Everything typed lives in this component until a save succeeds. */
export function NewVacancyPage() {
  const navigate = useNavigate();
  const catalog = useCatalog();
  // the preview card shows the real company name (003-profiles); RequireRole guarantees the profile exists here
  const companyProfile = useCompanyProfile();
  const [skillQuery, setSkillQuery] = useState("");
  const skills = useSkillSuggestions(skillQuery);
  const create = useCreateVacancy();
  const today = todayKz();

  const [step, setStep] = useState<WizardStep>(0);
  const [values, setValues] = useState<VacancyDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<DraftErrors | undefined>();
  const [alert, setAlert] = useState<WizardAlert | undefined>();
  const [busy, setBusy] = useState<"save" | "publish" | undefined>();

  // a step change announces the new step: focus its h1 (not on first render). A failed validation focuses the first invalid field.
  const [attempt, setAttempt] = useState(0);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    focusHeading();
  }, [step]);
  useEffect(() => {
    if (attempt === 0) return;
    const invalid = document.querySelector<HTMLElement>('[data-testid^="wizard-step"] [aria-invalid="true"]');
    // a salary refused by the server marks no amount: the group's first amount takes the focus
    const salary = document.querySelector<HTMLElement>('[data-testid="vacancy-salary"]');
    (invalid ?? (salary?.querySelector('[role="alert"]') ? salary.querySelector<HTMLElement>("input") : null))?.focus();
  }, [attempt]);
  const invalid = (e: DraftErrors) => {
    setErrors(e);
    setAttempt((n) => n + 1);
  };

  const state = catalog.isPending || companyProfile.isPending ? "loading" : catalog.isError || companyProfile.isError ? "error" : "ready";
  const skillOptions = skills.data ?? [];

  const onChange = (patch: Partial<VacancyDraft>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      if (!e) return e;
      const next = { ...e };
      for (const key of Object.keys(patch)) delete next[key as keyof DraftErrors];
      return Object.keys(next).length ? next : undefined;
    });
    setAlert(undefined);
  };

  const goTo = (s: WizardStep) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  /** The Details step's own rules: a deadline in the past, a salary the form refuses (FR-020). */
  const detailsErrors = (): DraftErrors | undefined => {
    const found: DraftErrors = {};
    if (values.applyBy && values.applyBy < today) found.applyBy = DEADLINE_ERROR;
    const salary = salaryMessage(values.salary);
    if (salary) found.salary = salary;
    return Object.keys(found).length ? found : undefined;
  };

  const onContinue = () => {
    if (step === 0 && !titleOk(values.title)) {
      invalid({ title: TITLE_ERROR });
      return;
    }
    if (step === 2) {
      const refused = detailsErrors();
      if (refused) {
        invalid(refused);
        return;
      }
    }
    setErrors(undefined);
    setAlert(undefined);
    goTo(Math.min(3, step + 1) as WizardStep);
  };

  const save = async (publish: boolean) => {
    if (!publish && !titleOk(values.title)) {
      setStep(0);
      invalid({ title: values.title.trim() ? TITLE_ERROR : "Add a title to save a draft" });
      return;
    }
    // the salary is checked wherever the employer is: a refusal goes back to the Details step with nothing sent
    const salary = salaryMessage(values.salary);
    if (salary) {
      setStep(2);
      setAlert(undefined);
      invalid({ salary });
      return;
    }
    setBusy(publish ? "publish" : "save");
    setAlert(undefined);
    try {
      const item = await create.mutateAsync({ draft: values, publish });
      if (publish) toast.success(TOASTS.publish.title, { description: TOASTS.publish.description?.(item) });
      else toast.success("Draft saved");
      navigate(ROUTES.list);
    } catch (error) {
      setBusy(undefined);
      if (isApiError(error, "incomplete")) {
        const fields = incompleteFields(error);
        setErrors(errorsFor(fields));
        setAlert({ kind: "incomplete", fields });
        focusHeading();
      } else if (isApiError(error, "apply_by_not_in_future")) {
        setStep(2);
        invalid({ applyBy: DEADLINE_ERROR });
      } else if (error instanceof ApiError && salaryRefusal(error, values.salary)) {
        setStep(2);
        invalid({ salary: salaryRefusal(error, values.salary) as string });
      } else if (error instanceof ApiError && error.code === "validation" && !titleOk(values.title)) {
        setStep(0);
        setErrors({ title: TITLE_ERROR });
      } else {
        setAlert({ kind: "save-error" });
      }
    }
  };

  return (
    <VacancyWizardView
      state={state}
      step={step}
      values={values}
      errors={errors}
      formAlert={alert}
      busy={busy}
      company={companyProfile.data?.name ?? ""}
      catalog={catalog.data ?? EMPTY_CATALOG}
      skillOptions={skillOptions}
      suggestions={skillOptions}
      skillsLoading={skills.isFetching}
      onSkillQuery={setSkillQuery}
      today={today}
      home="/company"
      onChange={onChange}
      onBack={() => { setErrors(undefined); goTo(Math.max(0, step - 1) as WizardStep); }}
      onContinue={onContinue}
      onGoToStep={(s) => { setAlert(undefined); goTo(s); }}
      onSaveExit={() => void save(false)}
      onPublish={() => void save(true)}
      onRetry={() => {
        void catalog.refetch();
        void companyProfile.refetch();
      }}
    />
  );
}
