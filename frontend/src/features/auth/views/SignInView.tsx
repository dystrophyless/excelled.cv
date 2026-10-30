import { useState, type FormEvent } from "react";
import { Stack } from "@/components/layout";
import { Alert, Button, PasswordField, TextField, TextLink, Tray } from "@/components/ui";
import { AuthFrame, Countdown, resolveRoutes, useCountdown, type AuthRoutes } from "./auth-parts";
import styles from "./auth.module.css";

export type SignInState = "default" | "submitting" | "invalid" | "field-errors" | "locked" | "server-error";

export type SignInViewProps = {
  state: SignInState;
  /** Email to keep in the field (after a failed attempt or a redirect) */
  email?: string;
  /** Seconds left of the 15-minute pause (state "locked") */
  retryAfter?: number;
  errors?: { email?: string; password?: string };
  onSubmit?: (values: { email: string; password: string }) => void;
  routes?: Partial<AuthRoutes>;
};

export function SignInView({ state, email = "", retryAfter = 0, errors, onSubmit, routes }: SignInViewProps) {
  const r = resolveRoutes(routes);
  const [emailValue, setEmailValue] = useState(email);
  const [password, setPassword] = useState("");
  const left = useCountdown(state === "locked" ? retryAfter : 0);
  const locked = state === "locked" && left > 0;
  const [nudge, setNudge] = useState(0);
  const invalid = state === "invalid";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (locked) {
      setNudge((n) => n + 1); // same Alert again, announced again; no request while the pause runs
      return;
    }
    onSubmit?.({ email: emailValue, password });
  };

  return (
    <AuthFrame title="Welcome back" subtitle="Sign in to see your matches">
      <Tray padding="lg" footerAlign="center" footer={<span>No account?&nbsp;<TextLink to={r.signUp}>Sign up</TextLink></span>}>
        <form onSubmit={submit} aria-label="Sign in" noValidate>
          <Stack gap={14}>
            {invalid && (
              <Alert tone="error" title="Wrong email or password">
                Check both and try again, or <TextLink to={r.reset}>reset your password</TextLink>.
              </Alert>
            )}
            {locked && (
              <Alert key={nudge} tone="warning" title="Too many attempts">
                Sign-in is paused for <Countdown left={left} />. <TextLink to={r.reset}>Reset your password</TextLink> to sign in now.
              </Alert>
            )}
            {state === "server-error" && (
              <Alert tone="error" title="Couldn't sign in">Check your connection and try again.</Alert>
            )}
            <TextField
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@university.edu"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              error={errors?.email}
              aria-invalid={invalid || undefined}
            />
            <Stack gap={8}>
              <PasswordField
                label="Password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors?.password}
                aria-invalid={invalid || undefined}
              />
              <div className={styles.rowEnd}>
                <TextLink to={r.reset} tone="muted">Forgot password?</TextLink>
              </div>
            </Stack>
            <Button type="submit" size="lg" loading={state === "submitting"}>Sign in</Button>
          </Stack>
        </form>
      </Tray>
    </AuthFrame>
  );
}
