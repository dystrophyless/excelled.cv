import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { ApiError } from "@/lib/api";
import { useFocusOtp, useResendCode, useResetVerify } from "./hooks";
import { ResetVerifyView, type ResetVerifyState } from "./views/ResetVerifyView";

type NavState = { email?: string; resendIn?: number };

/** S6 - Enter the reset code. No email in navigation state (direct visit, reload) -> back to S4. */
export function ResetVerifyPage() {
  const navigate = useNavigate();
  const nav = (useLocation().state ?? {}) as NavState;
  const verify = useResetVerify();
  const resend = useResendCode();
  const [state, setState] = useState<ResetVerifyState>("default");
  const [attemptsLeft, setAttemptsLeft] = useState<1 | 2>(2);
  const [resendIn, setResendIn] = useState(nav.resendIn ?? 60);
  useFocusOtp();

  if (!nav.email) return <Navigate to="/reset-password" replace />;
  const email = nav.email;

  const onSubmit = async (code: string) => {
    setState("verifying");
    try {
      const { reset_token } = await verify.mutateAsync({ email, code });
      setState("success");
      navigate("/reset-password/confirm", { state: { email, resetToken: reset_token } });
    } catch (error) {
      if (!(error instanceof ApiError)) return setState("server-error");
      switch (error.code) {
        case "invalid_code":
          setAttemptsLeft(error.attemptsLeft === 1 ? 1 : 2);
          return setState("invalid-code");
        case "code_expired":
          return setState("expired");
        case "too_many_attempts":
        case "nothing_pending":
          return setState("too-many-attempts");
        default:
          return setState("server-error");
      }
    }
  };

  // always 202: the OtpInput's own resend timer is the client-side cooldown
  const onResend = async () => {
    try {
      const sent = await resend.mutateAsync({ email, purpose: "password_reset" });
      setResendIn(sent.resend_in);
      setState("resent");
    } catch {
      setState("server-error");
    }
  };

  const onStartOver = () => navigate("/reset-password", { state: { email } });

  return (
    <ResetVerifyView
      state={state}
      email={email}
      attemptsLeft={attemptsLeft}
      resendIn={resendIn}
      onSubmit={onSubmit}
      onResend={onResend}
      onStartOver={onStartOver}
    />
  );
}
