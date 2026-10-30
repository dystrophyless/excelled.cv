import { Stack } from "@/components/layout";
import { Alert, Button, OtpInput, TextLink, Tray, type OtpStatus } from "@/components/ui";
import { AuthFrame, Countdown, resolveRoutes, triesLeft, useCountdown, type AuthRoutes } from "./auth-parts";

export type VerifyEmailState =
  | "default"
  | "verifying"
  | "invalid-code"
  | "success"
  | "expired"
  | "resent"
  | "resend-cooldown"
  | "too-many-attempts"
  | "nothing-pending"
  | "server-error";

export type VerifyEmailViewProps = {
  state: VerifyEmailState;
  email: string;
  /** Wrong tries left (state "invalid-code"): 1 or 2 */
  attemptsLeft?: number;
  /** Seconds until a new code can be requested; starts the OtpInput timer */
  resendIn?: number;
  /** Code shown in the boxes while verifying / success (demo) */
  code?: string;
  onSubmit?: (code: string) => void;
  onResend?: () => void;
  /** Terminal states: back to the sign-up form with the email kept */
  onStartOver?: () => void;
  routes?: Partial<AuthRoutes>;
};

const OTP_STATUS: Partial<Record<VerifyEmailState, OtpStatus>> = {
  verifying: "verifying",
  success: "success",
  "invalid-code": "error",
};

export function VerifyEmailView({ state, email, attemptsLeft = 2, resendIn = 60, code, onSubmit, onResend, onStartOver, routes }: VerifyEmailViewProps) {
  const r = resolveRoutes(routes);
  const left = useCountdown(state === "resend-cooldown" ? resendIn : 0);

  if (state === "too-many-attempts" || state === "nothing-pending") {
    const tooMany = state === "too-many-attempts";
    return (
      <AuthFrame
        title="Start again"
        subtitle={tooMany ? "We cancelled this sign-up. Your email is saved." : "This sign-up expired or was cancelled."}
      >
        <Tray padding="lg" footerAlign="center" footer={<span>Already verified?&nbsp;<TextLink to={r.signIn}>Sign in</TextLink></span>}>
          <Stack gap={14}>
            <Alert tone={tooMany ? "error" : "warning"} title={tooMany ? "Too many wrong codes" : "Nothing to verify"}>
              Start again to get a new code.
            </Alert>
            <Button size="lg" onClick={onStartOver}>Start again</Button>
          </Stack>
        </Tray>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Check your email"
      subtitle={<>We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.</>}
    >
      <Tray padding="lg" footerAlign="center" footer={<span>Wrong email?&nbsp;<TextLink to={r.signUp}>Change it</TextLink></span>}>
        <Stack gap={14}>
          {state === "resent" && (
            <Alert tone="success" title="New code sent">The old code no longer works.</Alert>
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
