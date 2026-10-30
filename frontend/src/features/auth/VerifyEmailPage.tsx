import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { ApiError } from "@/lib/api";
import type { Role } from "./api";
import { homeFor, useFocusOtp, useResendCode, useVerifyEmail } from "./hooks";
import { VerifyEmailView, type VerifyEmailState } from "./views/VerifyEmailView";

type NavState = { email?: string; resendIn?: number; role?: Role; cooldown?: boolean };

/** S3 - Verify email. No email in navigation state (direct visit, reload) -> back to S2. */
export function VerifyEmailPage() {
  const navigate = useNavigate();
  const nav = (useLocation().state ?? {}) as NavState;
  const verify = useVerifyEmail();
  const resend = useResendCode();
  const [state, setState] = useState<VerifyEmailState>(nav.cooldown ? "resend-cooldown" : "default");
  const [attemptsLeft, setAttemptsLeft] = useState<1 | 2>(2);
  const [resendIn, setResendIn] = useState(nav.resendIn ?? 60);
  // the View's countdown starts from its first render: remount it whenever a new cooldown begins
  const [round, setRound] = useState(0);
  useFocusOtp();

  if (!nav.email) return <Navigate to="/sign-up" replace />;
  const email = nav.email;

  const onSubmit = async (code: string) => {
    setState("verifying");
    try {
      const { account } = await verify.mutateAsync({ email, code });
      setState("success");
      navigate(homeFor(account.role), { replace: true });
    } catch (error) {
      if (!(error instanceof ApiError)) return setState("server-error");
      switch (error.code) {
        case "invalid_code":
          setAttemptsLeft(error.attemptsLeft === 1 ? 1 : 2);
          return setState("invalid-code");
        case "code_expired":
          return setState("expired");
        case "too_many_attempts":
          return setState("too-many-attempts");
        case "nothing_pending":
          return setState("nothing-pending");
        default:
          return setState("server-error");
      }
    }
  };

  const onResend = async () => {
    try {
      const sent = await resend.mutateAsync({ email, purpose: "sign_up" });
      setResendIn(sent.resend_in);
      setState("resent");
    } catch (error) {
      if (error instanceof ApiError && error.code === "resend_too_soon") {
        setResendIn(error.retryAfter ?? 60);
        setRound((n) => n + 1);
        return setState("resend-cooldown");
      }
      if (error instanceof ApiError && error.code === "nothing_pending") return setState("nothing-pending");
      setState("server-error");
    }
  };

  const onStartOver = () => navigate("/sign-up", { state: { email, role: nav.role } });

  return (
    <VerifyEmailView
      key={round}
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
