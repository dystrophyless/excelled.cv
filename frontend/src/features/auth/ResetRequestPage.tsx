import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ApiError } from "@/lib/api";
import { useFocusFirstInvalid, useResetRequest } from "./hooks";
import { ResetRequestView, type ResetRequestState } from "./views/ResetRequestView";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** S4 - Request a reset code. Always 202 (no account-existence leak) -> S6 with `{email}` in navigation state. */
export function ResetRequestPage() {
  const navigate = useNavigate();
  const prefill = (useLocation().state ?? {}) as { email?: string };
  const request = useResetRequest();
  const [state, setState] = useState<ResetRequestState>("default");
  const [email, setEmail] = useState(prefill.email ?? "");
  const [errors, setErrors] = useState<{ email?: string }>({});

  const markSubmit = useFocusFirstInvalid(state === "field-errors");

  const onSubmit = async (values: { email: string }) => {
    markSubmit();
    const clean = values.email.trim();
    setEmail(clean);
    if (!EMAIL_RE.test(clean)) {
      setErrors({ email: "Enter an email like you@university.edu" });
      return setState("field-errors");
    }
    setErrors({});
    setState("submitting");
    try {
      const sent = await request.mutateAsync({ email: clean });
      navigate("/reset-password/verify", { state: { email: clean, resendIn: sent.resend_in } });
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setErrors({ email: "Enter an email like you@university.edu" });
        return setState("field-errors");
      }
      setState("server-error");
    }
  };

  return <ResetRequestView state={state} email={email} errors={errors} onSubmit={onSubmit} />;
}
