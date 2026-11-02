import { Logo } from "@/components/ui/app-shell";
import { Stack } from "@/components/layout";
import { Alert, Button, Checkbox, OtpInput, PasswordField, SegmentedControl, TextField, TextLink, Tray } from "@/components/ui";
import { StateSwitcher, useViewState } from "@/components/dev";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Auth — sign in / sign up / verify / reset.
 * Centered column (400px): logo → title + one-line subtitle → one tray+card with the form →
 * the alternative action ("No account? Sign up") on the tray footer → legal text.
 * No app header, no nav. One primary button, full width, label = the action ("Sign in").
 */

const STATES = ["sign-in", "sign-up", "submitting", "error", "verify", "verify-error"] as const;

export function AuthTemplate() {
  const state = useViewState(STATES);
  const verifying = state === "verify" || state === "verify-error";

  return (
    <div className={styles.authPage}>
      <div className={styles.authColumn}>
        <div className={styles.authLogo}><Logo /></div>

        {verifying ? (
          <>
            <div className={styles.authHead}>
              <h1 className={styles.authTitle}>Check your email</h1>
              <p className={styles.authSub}>We sent a 6-digit code to <strong>maya@sdu.edu.kz</strong></p>
            </div>
            <Tray padding="lg" footerAlign="center" footer={<span>Wrong email?&nbsp;<TextLink to="?state=sign-up">Change it</TextLink></span>}>
              <OtpInput
                label="Verification code"
                length={6}
                separator={3}
                align="center"
                status={state === "verify-error" ? "error" : "idle"}
                errorMessage="That code didn't work. 2 tries left."
                resendIn={30}
                onResend={() => undefined}
              />
            </Tray>
          </>
        ) : (
          <>
            <div className={styles.authHead}>
              <h1 className={styles.authTitle}>{state === "sign-up" ? "Create your account" : "Welcome back"}</h1>
              <p className={styles.authSub}>
                {state === "sign-up" ? "Find internships that match your skills" : "Sign in to see your matches"}
              </p>
            </div>
            <Tray
              padding="lg"
              footerAlign="center"
              footer={
                state === "sign-up"
                  ? <span>Already have an account?&nbsp;<TextLink to="?">Sign in</TextLink></span>
                  : <span>No account?&nbsp;<TextLink to="?state=sign-up">Sign up</TextLink></span>
              }
            >
              <form onSubmit={(e) => e.preventDefault()} aria-label={state === "sign-up" ? "Sign up" : "Sign in"} noValidate>
                <Stack gap={14}>
                  {state === "error" && (
                    <Alert tone="error" title="Wrong email or password">Check both and try again, or reset your password.</Alert>
                  )}
                  {state === "sign-up" && (
                    <SegmentedControl
                      aria-label="I am"
                      fullWidth
                      defaultValue="student"
                      options={[{ value: "student", label: "I'm a student" }, { value: "employer", label: "I'm hiring" }]}
                    />
                  )}
                  <TextField label="Email" type="email" autoComplete="email" placeholder="you@university.edu" defaultValue={state === "sign-in" || state === "sign-up" ? "" : "maya@sdu.edu.kz"} />
                  {state === "sign-up" ? (
                    <PasswordField label="Password" autoComplete="new-password" hint="At least 8 characters" />
                  ) : (
                    <Stack gap={6}>
                      <PasswordField label="Password" defaultValue={state === "sign-in" ? "" : "password123"} aria-invalid={state === "error" || undefined} />
                      <div className={styles.rowBetween}>
                        <Checkbox label="Remember me" defaultChecked />
                        <TextLink to="?" tone="muted">Forgot password?</TextLink>
                      </div>
                    </Stack>
                  )}
                  <Button type="submit" size="lg" loading={state === "submitting"}>
                    {state === "sign-up" ? "Create account" : "Sign in"}
                  </Button>
                </Stack>
              </form>
            </Tray>
          </>
        )}

        {state === "sign-up" && (
          <p className={styles.authLegal}>By creating an account you agree to the Terms and Privacy Policy.</p>
        )}
      </div>
      <StateSwitcher states={STATES} />
    </div>
  );
}
