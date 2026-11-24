import { useState, type FormEvent } from "react";
import { Stack } from "@/components/layout";
import { Alert, Button, PasswordField, TextField, TextLink, Tray } from "@/components/ui";
import { AuthFrame, resolveRoutes, type AuthRoutes } from "./auth-parts";
import styles from "./auth.module.css";
import { ROLE_LABEL } from "./roles";
import type { SignUpRole, SignUpState } from "./SignUpView";

/*
 * 005 S3 — sign-up step 2: email + password for the role chosen in step 1.
 * Same states and fields as 001 S2 (SignUpView) minus the role switch; the role is shown with a "Change role" button.
 * The implementation replaces SignUpView with this view; the role switch goes away.
 */

export type AccountDetailsViewProps = {
  state: SignUpState;
  /** Always chosen: without a role the page shows the role step instead */
  role: SignUpRole;
  email?: string;
  errors?: { email?: string; password?: string };
  onSubmit?: (values: { email: string; password: string }) => void;
  /** Back to the role step; the email typed so far travels with it */
  onChangeRole?: (email: string) => void;
  routes?: Partial<AuthRoutes>;
  home?: string;
};

export function AccountDetailsView({ state, role, email = "", errors, onSubmit, onChangeRole, routes, home }: AccountDetailsViewProps) {
  const r = resolveRoutes(routes);
  const [emailValue, setEmailValue] = useState(email);
  const [password, setPassword] = useState("");
  const errorCount = Object.values(errors ?? {}).filter(Boolean).length;
  const hr = role === "employer";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.({ email: emailValue, password });
  };

  return (
    <AuthFrame
      title="Create your account"
      subtitle="Step 2 of 2 · Add your email and a password"
      home={home}
    >
      <Tray padding="lg" footerAlign="center" footer={<span>Already have an account?&nbsp;<TextLink to={r.signIn}>Log in</TextLink></span>}>
        <form onSubmit={submit} aria-label="Account details" noValidate>
          <Stack gap={14}>
            {state === "field-errors" && errorCount > 1 && (
              <Alert tone="error" title={`Fix ${errorCount} fields to continue`}>Email, Password</Alert>
            )}
            {state === "email-taken" && (
              <Alert tone="warning" title="An account with this email already exists">
                <TextLink to={r.signIn}>Log in</TextLink> or <TextLink to={r.reset}>reset your password</TextLink>.
              </Alert>
            )}
            {state === "server-error" && (
              <Alert tone="error" title="Couldn't create your account">Check your connection and try again.</Alert>
            )}
            <div className={styles.roleRow} data-testid="chosen-role">
              <div className={styles.roleText}>
                <span className={styles.roleLabel}>Signing up as</span>
                <strong className={styles.roleName}>{ROLE_LABEL[role]}</strong>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => onChangeRole?.(emailValue)}>Change role</Button>
            </div>
            <TextField
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder={hr ? "you@company.com" : "you@university.edu"}
              hint={hr ? "Use your work email" : undefined}
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              error={errors?.email}
              aria-invalid={state === "email-taken" || undefined}
            />
            <PasswordField
              label="Password"
              name="password"
              autoComplete="new-password"
              hint="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors?.password}
            />
            <Button type="submit" size="lg" loading={state === "submitting"}>Create account</Button>
          </Stack>
        </form>
      </Tray>
    </AuthFrame>
  );
}
