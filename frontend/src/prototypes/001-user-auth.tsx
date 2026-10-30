import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { StateSwitcher, useViewState } from "@/components/dev";
import {
  LOCK_RETRY_AFTER, MOCK_CODE, MOCK_EMAIL, NEW_PASSWORD_ERROR, RESEND_COOLDOWN, RESEND_FULL, RESET_EMAIL_ERROR,
  SIGN_IN_FIELD_ERRORS, SIGN_UP_FIELD_ERRORS,
} from "@/features/auth/mocks";
import { ResetConfirmView, type ResetConfirmState } from "@/features/auth/views/ResetConfirmView";
import { ResetVerifyView, type ResetVerifyState } from "@/features/auth/views/ResetVerifyView";
import { ResetRequestView, type ResetRequestState } from "@/features/auth/views/ResetRequestView";
import { SignInView, type SignInState } from "@/features/auth/views/SignInView";
import { SignUpView, type SignUpState } from "@/features/auth/views/SignUpView";
import { VerifyEmailView, type VerifyEmailState } from "@/features/auth/views/VerifyEmailView";
import type { AuthRoutes } from "@/features/auth/views/auth-parts";

/* Prototype wiring for 001-user-auth: each View rendered with mock props; ?state= picks the state. */

const BASE = "/prototypes/001-user-auth";
const ROUTES: AuthRoutes = {
  signIn: `${BASE}/sign-in`,
  signUp: `${BASE}/sign-up`,
  verify: `${BASE}/verify`,
  reset: `${BASE}/reset-password`,
  resetVerify: `${BASE}/reset-verify`,
  resetConfirm: `${BASE}/reset-confirm`,
};

export const SIGN_IN_STATES = ["default", "submitting", "invalid", "field-errors", "locked", "server-error"] as const satisfies readonly SignInState[];
export const SIGN_UP_STATES = ["default", "employer", "submitting", "email-taken", "field-errors", "server-error"] as const;
export const VERIFY_STATES = ["default", "verifying", "invalid-code", "success", "resent", "resend-cooldown", "expired", "too-many-attempts", "nothing-pending", "server-error"] as const satisfies readonly VerifyEmailState[];
export const RESET_REQUEST_STATES = ["default", "submitting", "field-errors", "server-error"] as const satisfies readonly ResetRequestState[];
export const RESET_VERIFY_STATES = ["default", "verifying", "invalid-code", "success", "resent", "resend-cooldown", "expired", "too-many-attempts", "server-error"] as const satisfies readonly ResetVerifyState[];
export const RESET_CONFIRM_STATES = ["default", "submitting", "invalid-password", "mismatch", "link-expired", "server-error", "success"] as const satisfies readonly ResetConfirmState[];

/** The OtpInput animates on status changes, so a prototype opened on "invalid-code" starts idle and switches a moment later. */
function useSettled<T extends string>(target: T, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const t = window.setTimeout(() => setValue(target), 150);
    return () => window.clearTimeout(t);
  }, [target]);
  return value;
}

export function SignInPrototype() {
  const state = useViewState(SIGN_IN_STATES);
  return (
    <>
      <SignInView
        key={state}
        state={state}
        email={state === "default" || state === "field-errors" ? "" : MOCK_EMAIL}
        retryAfter={LOCK_RETRY_AFTER}
        errors={state === "field-errors" ? SIGN_IN_FIELD_ERRORS : undefined}
        routes={ROUTES}
      />
      <StateSwitcher states={SIGN_IN_STATES} />
    </>
  );
}

export function SignUpPrototype() {
  const state = useViewState(SIGN_UP_STATES);
  const employer = state === "employer";
  const viewState: SignUpState = employer ? "default" : state;
  const navigate = useNavigate();
  const keepsEmail = viewState === "email-taken" || viewState === "submitting" || viewState === "server-error";
  return (
    <>
      <SignUpView
        key={state}
        state={viewState}
        role={employer ? "employer" : "student"}
        email={keepsEmail ? MOCK_EMAIL : ""}
        errors={viewState === "field-errors" ? SIGN_UP_FIELD_ERRORS : undefined}
        onSubmit={() => navigate(ROUTES.verify)}
        routes={ROUTES}
      />
      <StateSwitcher states={SIGN_UP_STATES} />
    </>
  );
}

export function VerifyEmailPrototype() {
  const state = useViewState(VERIFY_STATES);
  const settled = useSettled<VerifyEmailState>(state, "default");
  const navigate = useNavigate();
  return (
    <>
      <VerifyEmailView
        key={state === "resent" ? "resent" : state === "resend-cooldown" ? "cooldown" : "view"}
        state={settled}
        email={MOCK_EMAIL}
        attemptsLeft={2}
        resendIn={state === "resend-cooldown" ? RESEND_COOLDOWN : RESEND_FULL}
        code={state === "verifying" || state === "success" ? MOCK_CODE : undefined}
        onStartOver={() => navigate(ROUTES.signUp)}
        onResend={() => undefined}
        routes={ROUTES}
      />
      <StateSwitcher states={VERIFY_STATES} />
    </>
  );
}

export function ResetRequestPrototype() {
  const state = useViewState(RESET_REQUEST_STATES);
  const navigate = useNavigate();
  return (
    <>
      <ResetRequestView
        key={state}
        state={state}
        email={state === "default" || state === "field-errors" ? "" : MOCK_EMAIL}
        errors={state === "field-errors" ? RESET_EMAIL_ERROR : undefined}
        onSubmit={() => navigate(ROUTES.resetVerify)}
        routes={ROUTES}
      />
      <StateSwitcher states={RESET_REQUEST_STATES} />
    </>
  );
}

export function ResetVerifyPrototype() {
  const state = useViewState(RESET_VERIFY_STATES);
  const settled = useSettled<ResetVerifyState>(state, "default");
  const navigate = useNavigate();
  return (
    <>
      <ResetVerifyView
        key={state === "resent" ? "resent" : state === "resend-cooldown" ? "cooldown" : "view"}
        state={settled}
        email={MOCK_EMAIL}
        attemptsLeft={2}
        resendIn={state === "resend-cooldown" ? RESEND_COOLDOWN : RESEND_FULL}
        code={state === "verifying" || state === "success" ? MOCK_CODE : undefined}
        onSubmit={() => navigate(ROUTES.resetConfirm)}
        onStartOver={() => navigate(ROUTES.reset)}
        onResend={() => undefined}
        routes={ROUTES}
      />
      <StateSwitcher states={RESET_VERIFY_STATES} />
    </>
  );
}

export function ResetConfirmPrototype() {
  const state = useViewState(RESET_CONFIRM_STATES);
  const navigate = useNavigate();
  const filled = state === "submitting" || state === "server-error";
  return (
    <>
      <ResetConfirmView
        key={state}
        state={state}
        email={MOCK_EMAIL}
        initialPassword={state === "mismatch" ? "river-lamp-42" : state === "invalid-password" ? "short" : filled ? "river-lamp-42" : ""}
        initialConfirm={state === "mismatch" ? "river-lamp-24" : state === "invalid-password" ? "short" : filled ? "river-lamp-42" : ""}
        errors={state === "invalid-password" ? NEW_PASSWORD_ERROR : undefined}
        onStartOver={() => navigate(ROUTES.reset)}
        onContinue={() => navigate(ROUTES.signIn)}
        routes={ROUTES}
      />
      <StateSwitcher states={RESET_CONFIRM_STATES} />
    </>
  );
}
