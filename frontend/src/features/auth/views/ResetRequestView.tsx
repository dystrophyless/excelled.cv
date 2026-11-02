import { useState, type FormEvent } from "react";
import { Stack } from "@/components/layout";
import { Alert, Button, TextField, TextLink, Tray } from "@/components/ui";
import { AuthFrame, resolveRoutes, type AuthRoutes } from "./auth-parts";

export type ResetRequestState = "default" | "submitting" | "field-errors" | "server-error";

export type ResetRequestViewProps = {
  state: ResetRequestState;
  email?: string;
  errors?: { email?: string };
  onSubmit?: (values: { email: string }) => void;
  routes?: Partial<AuthRoutes>;
};

export function ResetRequestView({ state, email = "", errors, onSubmit, routes }: ResetRequestViewProps) {
  const r = resolveRoutes(routes);
  const [emailValue, setEmailValue] = useState(email);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.({ email: emailValue });
  };

  return (
    <AuthFrame title="Reset your password" subtitle="Enter your email and we'll send you a 6-digit code">
      <Tray padding="lg" footerAlign="center" footer={<span>Remembered it?&nbsp;<TextLink to={r.signIn}>Sign in</TextLink></span>}>
        <form onSubmit={submit} aria-label="Reset password" noValidate>
          <Stack gap={14}>
            {state === "server-error" && (
              <Alert tone="error" title="Couldn't send the code">Check your connection and try again.</Alert>
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
            />
            <Button type="submit" size="lg" loading={state === "submitting"}>Send code</Button>
          </Stack>
        </form>
      </Tray>
    </AuthFrame>
  );
}
