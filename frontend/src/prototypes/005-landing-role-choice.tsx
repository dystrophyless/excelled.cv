import { useLocation, useNavigate } from "react-router";
import { StateSwitcher, useViewState } from "@/components/dev";
import { MOCK_EMAIL } from "@/features/auth/mocks";
import { AccountDetailsView, type SignUpState } from "@/features/auth/views/AccountDetailsView";
import type { AuthRoutes } from "@/features/auth/views/auth-parts";
import { RoleStepView, type RoleStepState } from "@/features/auth/views/RoleStepView";
import type { SignUpRole } from "@/features/auth/views/roles";
import { SIGN_UP_FIELD_ERRORS } from "@/features/auth/mocks";
import { LandingView } from "@/features/landing/views/LandingView";

/*
 * Prototype wiring for 005-landing-role-choice. The three screens link to each other (S1 -> S2 -> S3, Change role, Log in),
 * mirroring the router state the real sign-up page will use (research R1): { role, email }.
 * "Log in" and "Verify" lead to the 001 prototype screens.
 */

const BASE = "/prototypes/005-landing-role-choice";
const AUTH = "/prototypes/001-user-auth";
const LANDING = `${BASE}/landing`;
const ROLE = `${BASE}/choose-role`;
const DETAILS = `${BASE}/account-details`;

const ROUTES: Partial<AuthRoutes> = {
  signIn: `${AUTH}/sign-in`,
  signUp: ROLE,
  verify: `${AUTH}/verify`,
  reset: `${AUTH}/reset-password`,
};

export const LANDING_STATES = ["default"] as const;
export const ROLE_STATES = ["default", "error"] as const satisfies readonly RoleStepState[];
export const DETAILS_STATES = ["default", "hr", "submitting", "email-taken", "field-errors", "server-error"] as const;

type Carried = { role?: SignUpRole; email?: string };
const carried = (state: unknown): Carried => (state ?? {}) as Carried;

export function LandingPrototype() {
  return <LandingView routes={{ signUp: ROLE, signIn: ROUTES.signIn, home: LANDING }} />;
}

export function RoleStepPrototype() {
  const state = useViewState(ROLE_STATES);
  const { state: nav } = useLocation();
  const navigate = useNavigate();
  const back = carried(nav);
  return (
    <>
      <RoleStepView
        key={`${state}-${back.role ?? ""}`}
        state={state}
        role={back.role}
        onContinue={(role) => navigate(DETAILS, { state: { role, email: back.email } satisfies Carried })}
        routes={ROUTES}
        home={LANDING}
      />
      <StateSwitcher states={ROLE_STATES} />
    </>
  );
}

export function AccountDetailsPrototype() {
  const state = useViewState(DETAILS_STATES);
  const { state: nav } = useLocation();
  const navigate = useNavigate();
  const from = carried(nav);
  const viewState: SignUpState = state === "hr" ? "default" : state;
  const role: SignUpRole = from.role ?? (state === "hr" ? "employer" : "student");
  const keepsEmail = viewState === "email-taken" || viewState === "submitting" || viewState === "server-error";
  return (
    <>
      <AccountDetailsView
        key={`${state}-${role}`}
        state={viewState}
        role={role}
        email={from.email ?? (keepsEmail ? MOCK_EMAIL : "")}
        errors={viewState === "field-errors" ? SIGN_UP_FIELD_ERRORS : undefined}
        onSubmit={() => navigate(ROUTES.verify!)}
        onChangeRole={(email) => navigate(ROLE, { state: { role, email } satisfies Carried })}
        routes={ROUTES}
        home={LANDING}
      />
      <StateSwitcher states={DETAILS_STATES} />
    </>
  );
}
