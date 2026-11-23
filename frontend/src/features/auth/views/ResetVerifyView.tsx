import { Stack } from "@/components/layout";
import { Alert, Button, OtpInput, TextLink, Tray, type OtpStatus } from "@/components/ui";
import { AuthFrame, Countdown, resolveRoutes, triesLeft, useCountdown, type AuthRoutes } from "./auth-parts";

/* S6: enter the 6-digit reset code. Same layout as VerifyEmailView; copy stays neutral (no account-existence leak). */

export type ResetVerifyState =
  | "default"
  | "verifying"
  | "invalid-code"
  | "success"
  | "resent"
  | "resend-cooldown"
  | "expired"
  | "too-many-attempts"
  | "server-error";

export type ResetVerifyViewProps = {
  state: ResetVerifyState;
  email: string;
  /** Wrong tries left (state "invalid-code"): 1 or 2 */
  attemptsLeft?: number;
  /** Seconds until a new code can be requested; starts the OtpInput timer */
  resendIn?: number;
  /** Code shown in the boxes while verifying / success (demo) */
  code?: string;
  onSubmit?: (code: string) => void;
  onResend?: () => void;
  /** "too-many-attempts" (also used for nothing_pending): back to the email form with the email kept */
  onStartOver?: () => void;
  routes?: Partial<AuthRoutes>;
};

const OTP_STATUS: Partial<Record<ResetVerifyState, OtpStatus>> = {
  verifying: "verifying",
  success: "success",
  "invalid-code": "error",
};

export function ResetVerifyView({ state, email, attemptsLeft = 2, resendIn = 60, code, onSubmit, onResend, onStartOver, routes }: ResetVerifyViewProps) {
  const r = resolveRoutes(routes);
  const left = useCountdown(state === "resend-cooldown" ? resendIn : 0);

  if (state === "too-many-attempts") {
    return (
      <AuthFrame title="Start again" subtitle="We cancelled this reset. Your password is unchanged.">
        <Tray padding="lg" footerAlign="center" footer={<span>Remembered it?&nbsp;<TextLink to={r.signIn}>Sign in</TextLink></span>}>
          <Stack gap={14}>
            <Alert tone="error" title="That code can't be used">Too many wrong tries, or the reset ended. Request a new code to continue.</Alert>
            <Button size="lg" onClick={onStartOver}>Request a new code</Button>
          </Stack>
        </Tray>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Check your email"
      subtitle={<>If an account exists for <strong>{email}</strong>, we sent a 6-digit code. It expires in 10 minutes.</>}
    >
      <Tray padding="lg" footerAlign="center" footer={<span>Wrong email?&nbsp;<TextLink to={r.reset}>Change it</TextLink></span>}>
        <Stack gap={14}>
          {state === "resent" && (
            <Alert tone="success" title="New code sent">If an account exists, the old code no longer works.</Alert>
          )}
          {state === "resend-cooldown" && left > 0 && (
            <Alert tone="warning" title="Wait before asking again">
              You can request a new code in <Countdown left={left} />.
            </Alert>
          )}
          {state === "expired" && (
            <Alert
              tone="warning"
              title="That code expired"
              action={<Button size="sm" variant="secondary" onClick={onResend}>Send a new code</Button>}
            >
              Codes work for 10 minutes.
            </Alert>
          )}
          {state === "server-error" && (
            <Alert tone="error" title="Couldn't check the code">Check your connection and enter the code again.</Alert>
          )}
          <OtpInput
            key={`${resendIn}-${state === "resent" ? "resent" : "x"}`}
            label="Verification code"
            length={6}
            separator={3}
            align="center"
            status={OTP_STATUS[state] ?? "idle"}
            defaultValue={code}
            errorMessage={`That code didn't work. ${triesLeft(attemptsLeft)}.`}
            successLabel="Verified"
            resendIn={resendIn}
            onResend={state === "expired" ? undefined : onResend}
            onComplete={onSubmit}
          />
        </Stack>
      </Tray>
    </AuthFrame>
  );
}
