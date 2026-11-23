import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "@/components/ui";
import { safeNext, useSignOut } from "@/features/auth/hooks";
import { EMPTY_PROFILE_CATALOG } from "./api";
import { ROUTES, companyErrorsFrom, focusHeading, focusInvalid, isApiError, withoutErrorsFor } from "./form";
import { useCreateCompanyProfile, useProfileCatalog, useProfileExists } from "./hooks";
import {
  COMPANY_STEPS, EMPTY_COMPANY, PROFILE_TOASTS, firstStepWithError, stepErrors, validateCompany,
  type CompanyErrors, type CompanyValues,
} from "./model";
import { CompanyOnboardingView } from "./views/CompanyOnboardingView";

/**
 * S4 — /company/onboarding: the company profile in 5 steps (ui-spec S4, behaviour as S1 and the prototype).
 * After Save: `next` (e.g. the vacancy page that sent the employer here) or the vacancies list.
 */
export function CompanyOnboardingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const catalog = useProfileCatalog();
  const create = useCreateCompanyProfile();
  const profileExists = useProfileExists();
  const signOut = useSignOut();

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<CompanyValues>(EMPTY_COMPANY);
  const [errors, setErrors] = useState<CompanyErrors | undefined>();
  const [saveError, setSaveError] = useState(false);
  const latest = useRef(values);

  const state = catalog.isPending ? "loading" : catalog.isError ? "error" : "ready";

  const go = (s: number) => {
    setErrors(undefined);
    setStep(s);
    focusHeading();
  };

  const refuse = (s: number, all: CompanyErrors) => {
    setStep(s);
    setErrors(stepErrors(COMPANY_STEPS[s], all));
    focusInvalid();
  };

  const onChange = (patch: Partial<CompanyValues>) => {
    latest.current = { ...latest.current, ...patch };
    setValues(latest.current);
    setErrors((e) => withoutErrorsFor(e, patch));
  };

  const onContinue = () => {
    const all = validateCompany(latest.current);
    if (Object.keys(stepErrors(COMPANY_STEPS[step], all)).length) {
      refuse(step, all);
      return;
    }
    go(Math.min(step + 1, COMPANY_STEPS.length - 1));
  };

  const onSave = async () => {
    const v = latest.current;
    const clientErrors = validateCompany(v);
    const wrong = firstStepWithError(COMPANY_STEPS, clientErrors);
    setSaveError(false);
    if (wrong >= 0) {
      refuse(wrong, clientErrors);
      return;
    }
    try {
      await create.mutateAsync(v);
      toast.success(PROFILE_TOASTS.companyCreated);
      // render the next page at once: the onboarding guard must not see `has_profile` first and pick /company/profile
      navigate(safeNext(params.get("next")) ?? ROUTES.vacancies, { replace: true, flushSync: true });
    } catch (error) {
      if (isApiError(error, "profile_exists")) {
        profileExists();
        navigate(ROUTES.vacancies, { replace: true });
        return;
      }
      const serverErrors = companyErrorsFrom(error, v, clientErrors);
      const at = serverErrors ? firstStepWithError(COMPANY_STEPS, serverErrors) : -1;
      if (serverErrors && at >= 0) {
        refuse(at, serverErrors);
        return;
      }
      setSaveError(true);
    }
  };

  return (
    <CompanyOnboardingView
      state={state}
      step={step}
      values={values}
      errors={errors}
      saveError={saveError}
      saving={create.isPending}
      catalog={catalog.data ?? EMPTY_PROFILE_CATALOG}
      home="/company"
      onChange={onChange}
      onBack={() => go(Math.max(0, step - 1))}
      onContinue={onContinue}
      onSave={() => void onSave()}
      onSignOut={() => signOut.mutate()}
      onRetry={() => void catalog.refetch()}
    />
  );
}
