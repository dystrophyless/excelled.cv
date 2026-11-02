import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ApiError } from "@/lib/api";
import { homeFor, safeNext, useFocusFirstInvalid, useSignIn } from "./hooks";
import { SignInView, type SignInState } from "./views/SignInView";

/** S1 - Sign in. Success goes to `next` (same-origin path) or the role's home. */
export function SignInPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const signIn = useSignIn();
  const [state, setState] = useState<SignInState>("default");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [retryAfter, setRetryAfter] = useState(0);
  // remount the View after a failure: clears the password and restarts the countdown
  const [attempt, setAttempt] = useState(0);

  const markSubmit = useFocusFirstInvalid(state === "field-errors" || state === "invalid");

  const onSubmit = async (values: { email: string; password: string }) => {
    markSubmit();
    const cleanEmail = values.email.trim();
    setEmail(cleanEmail);
    const invalid = {
      email: cleanEmail ? undefined : "Enter your email",
      password: values.password ? undefined : "Enter your password",
    };
    if (invalid.email || invalid.password) {
      setErrors(invalid);
      return setState("field-errors");
    }
    setErrors({});
    setState("submitting");
    try {
      const { account } = await signIn.mutateAsync({ email: cleanEmail, password: values.password });
      navigate(safeNext(params.get("next")) ?? homeFor(account.role), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === "invalid_credentials") {
        setAttempt((n) => n + 1);
        return setState("invalid");
      }
      if (error instanceof ApiError && error.code === "sign_in_locked") {
        setRetryAfter(error.retryAfter ?? 900);
        setAttempt((n) => n + 1);
        return setState("locked");
      }
      setState("server-error");
    }
  };

  return <SignInView key={attempt} state={state} email={email} retryAfter={retryAfter} errors={errors} onSubmit={onSubmit} />;
}
