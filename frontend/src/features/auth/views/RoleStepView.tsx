import { useRef, useState, type FormEvent } from "react";
import { Stack } from "@/components/layout";
import { Button, ChoiceCardGroup, TextLink, Tray } from "@/components/ui";
import { AuthFrame, resolveRoutes, type AuthRoutes } from "./auth-parts";
import { ROLE_OPTIONS } from "./roles";
import type { SignUpRole } from "./SignUpView";

/* 005 S2 — sign-up step 1: choose a role. Nothing preselected; Continue without a role stays and shows the error. */

export type RoleStepState = "default" | "error";

export type RoleStepViewProps = {
  /** `error` opens with the "no role" message already shown (the message otherwise appears after Continue) */
  state: RoleStepState;
  /** Set only when the user comes back from the details step; never a default */
  role?: SignUpRole;
  onContinue?: (role: SignUpRole) => void;
  routes?: Partial<AuthRoutes>;
  /** Where the logo goes (prototype: the landing screen) */
  home?: string;
};

export const ROLE_ERROR = "Select a role to continue";

export function RoleStepView({ state, role: initialRole, onContinue, routes, home }: RoleStepViewProps) {
  const r = resolveRoutes(routes);
  const [role, setRole] = useState<SignUpRole | undefined>(initialRole);
  const [showError, setShowError] = useState(state === "error" && !initialRole);
  const form = useRef<HTMLFormElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!role) {
      setShowError(true);
      // the message is announced (role="alert") and focus lands on the group, like any invalid field
      form.current?.querySelector<HTMLElement>('input[type="radio"]')?.focus();
      return;
    }
    onContinue?.(role);
  };

  return (
    <AuthFrame title="Choose your role" subtitle="Step 1 of 2 · You can't change your role after signing up" home={home}>
      <Tray padding="lg" footerAlign="center" footer={<span>Already have an account?&nbsp;<TextLink to={r.signIn}>Log in</TextLink></span>}>
        <form ref={form} onSubmit={submit} aria-label="Choose your role" noValidate>
          <Stack gap={14}>
            <ChoiceCardGroup
              legend="Your role"
              hideLegend
              name="role"
              size="md"
              min={220}
              columns={1}
              options={ROLE_OPTIONS}
              value={role ?? ""}
              error={showError && !role ? ROLE_ERROR : undefined}
              onChange={(v) => {
                setRole(v as SignUpRole);
                setShowError(false);
              }}
              data-testid="role-choices"
            />
            <Button type="submit" size="lg">Continue</Button>
          </Stack>
        </form>
      </Tray>
    </AuthFrame>
  );
}
