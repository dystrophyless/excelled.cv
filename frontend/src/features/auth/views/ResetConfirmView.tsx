import { useRef, useState, type FormEvent } from "react";
import { Stack } from "@/components/layout";
import { Alert, Button, PasswordField, TextLink, Tray } from "@/components/ui";
import { AuthFrame, resolveRoutes, type AuthRoutes } from "./auth-parts";
import styles from "./auth.module.css";

/* S5: choose a new password. The code was already checked on S6; the page holds the reset_token. No code input here. */

export type ResetConfirmState =
  | "default"
  | "submitting"
  | "invalid-password"
  | "mismatch"
  | "link-expired"
  | "server-error"
  | "success";

export type ResetConfirmViewProps = {
  state: ResetConfirmState;
  email: string;
  /** Demo only: starting values of the two fields */
  initialPassword?: string;
  initialConfirm?: string;
  errors?: { password?: string; confirm?: string };
  onSubmit?: (values: { password: string }) => void;
  /** "link-expired": back to the email form */
  onStartOver?: () => void;
  /** "success": continue to the role's home */
  onContinue?: () => void;
  /** Called when the user edits either password field (lets the page drop a stale error) */
  onEdit?: () => void;
  routes?: Partial<AuthRoutes>;
};

export function ResetConfirmView({
  state, email, initialPassword = "", initialConfirm = "", errors, onSubmit, onStartOver, onContinue, onEdit, routes,
}: ResetConfirmViewProps) {
  const r = resolveRoutes(routes);
  const [password, setPassword] = useState(initialPassword);
  const [confirm, setConfirm] = useState(initialConfirm);
  const [showMismatch, setShowMismatch] = useState(state === "mismatch");
  const confirmRef = useRef<HTMLInputElement>(null);
  const mismatch = showMismatch && confirm !== password;

  if (state === "success") {
    return (
      <AuthFrame title="Password updated" subtitle="You're signed in with your new password">
        <Tray padding="lg">
          <Stack gap={14}>
            <Alert tone="success" title="All set">Other devices were signed out.</Alert>
            <Button size="lg" onClick={onContinue}>Continue</Button>
          </Stack>
        </Tray>
      </AuthFrame>
    );
  }

  if (state === "link-expired") {
    return (
      <AuthFrame title="Start again" subtitle="Your password is unchanged.">
        <Tray padding="lg" footerAlign="center" footer={<span>Remembered it?&nbsp;<TextLink to={r.signIn}>Sign in</TextLink></span>}>
          <Stack gap={14}>
            <Alert tone="warning" title="Your reset session expired">Reset sessions last 10 minutes and work once. Request a new code to continue.</Alert>
            <Button size="lg" onClick={onStartOver}>Start again</Button>
          </Stack>
        </Tray>
      </AuthFrame>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (confirm !== password) {
      setShowMismatch(true);
      confirmRef.current?.focus();
      return;
    }
    onSubmit?.({ password });
  };

  return (
    <AuthFrame title="Set a new password" subtitle={<>Choose a new password for <strong>{email}</strong>.</>}>
      <Tray padding="lg">
        <form onSubmit={submit} aria-label="Set a new password" noValidate>
          <Stack gap={14}>
            {state === "server-error" && (
              <Alert tone="error" title="Couldn't set your password">Check your connection and try again.</Alert>
            )}
            <PasswordField
              label="New password"
              name="password"
              autoComplete="new-password"
              aria-describedby="new-password-hint"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                onEdit?.();
              }}
              error={errors?.password}
            />
            <Stack gap={6}>
              <PasswordField
                label="Confirm new password"
                name="confirm"
                autoComplete="new-password"
                aria-describedby="new-password-hint"
                value={confirm}
                ref={confirmRef}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  onEdit?.();
                }}
                onBlur={() => confirm && setShowMismatch(true)}
                error={errors?.confirm ?? (mismatch ? "Passwords don't match" : undefined)}
              />
              <span id="new-password-hint" className={styles.hint}>At least 8 characters</span>
            </Stack>
            <Button type="submit" size="lg" loading={state === "submitting"}>Set new password</Button>
          </Stack>
        </form>
      </Tray>
    </AuthFrame>
  );
}
