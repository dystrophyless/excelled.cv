import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ApiError } from "@/lib/api";
import type { Role } from "./api";
import { useFocusFirstInvalid, useSignUp } from "./hooks";
import { SignUpView, type SignUpState } from "./views/SignUpView";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = { email?: string; password?: string };

function validate(email: string, password: string): Errors {
  const errors: Errors = {};
  if (!EMAIL_RE.test(email)) errors.email = "Enter an email like you@university.edu";
  if (password.length < 8 || password.length > 64) errors.password = "Use 8 to 64 characters";
  return errors;
}

/** S2 - Sign up. Container: submit -> code sent -> S3 with `{email, resendIn}` in navigation state. */
export function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state ?? {}) as { email?: string; role?: Role };
  const signUp = useSignUp();
  const [state, setState] = useState<SignUpState>("default");
  const [errors, setErrors] = useState<Errors>({});
  const [email, setEmail] = useState(prefill.email ?? "");
  const [role, setRole] = useState<Role>(prefill.role ?? "student");

  const markSubmit = useFocusFirstInvalid(state === "field-errors" || state === "email-taken");

  const onSubmit = async (values: { role: Role; email: string; password: string }) => {
    markSubmit();
    const cleanEmail = values.email.trim();
    setEmail(cleanEmail);
    setRole(values.role);
    const invalid = validate(cleanEmail, values.password);
    if (invalid.email || invalid.password) {
      setErrors(invalid);
      setState("field-errors");
      return;
    }
    setErrors({});
    setState("submitting");
    try {
      const sent = await signUp.mutateAsync({ email: cleanEmail, password: values.password, role: values.role });
      navigate("/sign-up/verify", { state: { email: sent.email, resendIn: sent.resend_in, role: values.role } });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "email_taken") return setState("email-taken");
        if (error.code === "resend_too_soon") {
          // a code for this email was sent less than a minute ago: go and enter it
          return navigate("/sign-up/verify", {
            state: { email: cleanEmail, resendIn: error.retryAfter ?? 60, role: values.role, cooldown: true },
          });
        }
        if (error.status === 422) {
          setErrors({ password: "Use 8 to 64 characters" });
          return setState("field-errors");
        }
      }
      setState("server-error");
    }
  };

  return <SignUpView state={state} role={role} email={email} errors={errors} onSubmit={onSubmit} />;
}
