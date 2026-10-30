import { useState, type FormEvent } from "react";
import { Stack } from "@/components/layout";
import { Alert, Button, PasswordField, SegmentedControl, TextField, TextLink, Tray } from "@/components/ui";
import { AuthFrame, resolveRoutes, type AuthRoutes } from "./auth-parts";

export type SignUpRole = "student" | "employer";
export type SignUpState = "default" | "submitting" | "email-taken" | "field-errors" | "server-error";

export type SignUpViewProps = {
  state: SignUpState;
  role?: SignUpRole;
  email?: string;
  errors?: { email?: string; password?: string };
  onSubmit?: (values: { role: SignUpRole; email: string; password: string }) => void;
  routes?: Partial<AuthRoutes>;
};

const SUBTITLE: Record<SignUpRole, string> = {
  student: "Find internships that match your skills",
  employer: "Find candidates ranked by skill match",
};

export function SignUpView({ state, role: initialRole = "student", email = "", errors, onSubmit, routes }: SignUpViewProps) {
  const r = resolveRoutes(routes);
  const [role, setRole] = useState<SignUpRole>(initialRole);
  const [emailValue, setEmailValue] = useState(email);
  const [password, setPassword] = useState("");
  const errorCount = Object.values(errors ?? {}).filter(Boolean).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.({ role, email: emailValue, password });
  };

  return (
    <AuthFrame
      title="Create your account"
      subtitle={SUBTITLE[role]}
      legal="By creating an account you agree to the Terms and Privacy Policy."
    >
      <Tray padding="lg" footerAlign="center" footer={<span>Already have an account?&nbsp;<TextLink to={r.signIn}>Sign in</TextLink></span>}>
        <form onSubmit={submit} aria-label="Sign up" noValidate>
          <Stack gap={14}>
            {state === "field-errors" && errorCount > 1 && (
              <Alert tone="error" title={`Fix ${errorCount} fields to continue`}>Email, Password</Alert>
            )}
            {state === "email-taken" && (
              <Alert tone="warning" title="An account with this email already exists">
                <TextLink to={r.signIn}>Sign in</TextLink> or <TextLink to={r.reset}>reset your password</TextLink>.
              </Alert>
            )}
            {state === "server-error" && (
              <Alert tone="error" title="Couldn't create your account">Check your connection and try again.</Alert>
            )}
            <SegmentedControl<SignUpRole>
              aria-label="I am"
              fullWidth
              value={role}
              onChange={setRole}
              options={[{ value: "student", label: "I'm a student" }, { value: "employer", label: "I'm hiring" }]}
            />
            <TextField
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder={role === "student" ? "you@university.edu" : "you@company.com"}
              hint={role === "employer" ? "Use your work email" : undefined}
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
