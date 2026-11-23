import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "@/components/ui";
import { safeNext, useSignOut } from "@/features/auth/hooks";
import { EMPTY_PROFILE_CATALOG } from "./api";
import { ROUTES, focusHeading, focusInvalid, isApiError, studentErrorsFrom, withoutErrorsFor } from "./form";
import { useCreateStudentProfile, useProfileCatalog, useProfileExists } from "./hooks";
import {
  EMPTY_STUDENT, PROFILE_TOASTS, STUDENT_STEPS, firstStepWithError, stepErrors, validateStudent,
  type StudentErrors, type StudentValues,
} from "./model";
import { StudentOnboardingView } from "./views/StudentOnboardingView";

/**
 * S1 — /onboarding: the student's profile in 5 steps. Continue checks the current step; Save checks everything and jumps
 * back to the first wrong step (ui-spec S1). Nothing is stored before Save. Step state and focus moves as the prototype.
 */
export function StudentOnboardingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const catalog = useProfileCatalog();
  const create = useCreateStudentProfile();
  const profileExists = useProfileExists();
  const signOut = useSignOut();

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<StudentValues>(EMPTY_STUDENT);
  const [errors, setErrors] = useState<StudentErrors | undefined>();
  const [saveError, setSaveError] = useState(false);
  // the latest answers, also for a click that lands in the same tick as a Combobox commit on blur
  const latest = useRef(values);

  const state = catalog.isPending ? "loading" : catalog.isError ? "error" : "ready";

  const go = (s: number) => {
    setErrors(undefined);
    setStep(s);
    focusHeading();
  };

  /** Show the errors of step `s` and focus its first invalid control. */
  const refuse = (s: number, all: StudentErrors) => {
    setStep(s);
    setErrors(stepErrors(STUDENT_STEPS[s], all));
    focusInvalid();
  };

  const onChange = (patch: Partial<StudentValues>) => {
    latest.current = { ...latest.current, ...patch };
    setValues(latest.current);
    setErrors((e) => withoutErrorsFor(e, patch));
  };

  const onContinue = () => {
    const all = validateStudent(latest.current);
    if (Object.keys(stepErrors(STUDENT_STEPS[step], all)).length) {
      refuse(step, all);
      return;
    }
    go(Math.min(step + 1, STUDENT_STEPS.length - 1));
  };

  const onSave = async () => {
    const v = latest.current;
    const clientErrors = validateStudent(v);
    const wrong = firstStepWithError(STUDENT_STEPS, clientErrors);
    setSaveError(false);
    if (wrong >= 0) {
      refuse(wrong, clientErrors);
      return;
    }
    try {
      await create.mutateAsync(v);
      toast.success(PROFILE_TOASTS.studentCreated);
      // render the next page at once: the onboarding guard must not see `has_profile` first and pick /app/profile
      navigate(safeNext(params.get("next")) ?? ROUTES.studentProfile, { replace: true, flushSync: true });
    } catch (error) {
      if (isApiError(error, "profile_exists")) {
        profileExists();
        navigate(ROUTES.studentProfile, { replace: true });
        return;
      }
      const serverErrors = studentErrorsFrom(error, v, clientErrors);
      const at = serverErrors ? firstStepWithError(STUDENT_STEPS, serverErrors) : -1;
      if (serverErrors && at >= 0) {
        refuse(at, serverErrors);
        return;
      }
      setSaveError(true);
    }
  };

  return (
    <StudentOnboardingView
      state={state}
      step={step}
      values={values}
      errors={errors}
      saveError={saveError}
      saving={create.isPending}
      catalog={catalog.data ?? EMPTY_PROFILE_CATALOG}
      home="/app"
      onChange={onChange}
      onBack={() => go(Math.max(0, step - 1))}
      onContinue={onContinue}
      onSave={() => void onSave()}
      onSignOut={() => signOut.mutate()}
      onRetry={() => void catalog.refetch()}
    />
  );
}
