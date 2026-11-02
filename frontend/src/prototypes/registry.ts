import type { ComponentType } from "react";
import {
  ResetConfirmPrototype, ResetRequestPrototype, RESET_CONFIRM_STATES, RESET_REQUEST_STATES, RESET_VERIFY_STATES, ResetVerifyPrototype, SIGN_IN_STATES, SIGN_UP_STATES,
  SignInPrototype, SignUpPrototype, VERIFY_STATES, VerifyEmailPrototype,
} from "./001-user-auth";
import {
  EDIT_STATES, LIST_STATES, NEW_STATES, PAGE_STATES, VacancyEditPrototype, VacancyListPrototype, VacancyNewPrototype, VacancyPagePrototype,
} from "./002-employer-vacancies";

/*
 * Feature prototypes, added by the ui-designer during /speckit-design.
 * Route: /prototypes/<id>/<screen>?state=<state>
 *
 * Example entry:
 *   import { SignInPrototype } from "./001-auth";
 *   { id: "001-auth", title: "Auth", screens: { "sign-in": { title: "Sign in", states: ["default", "error"], Component: SignInPrototype } } }
 */

export type PrototypeScreen = { title: string; states: readonly string[]; Component: ComponentType };
export type PrototypeEntry = { id: string; title: string; screens: Record<string, PrototypeScreen> };

export const PROTOTYPES: PrototypeEntry[] = [
  {
    id: "001-user-auth",
    title: "Sign up and sign in",
    screens: {
      "sign-in": { title: "Sign in", states: SIGN_IN_STATES, Component: SignInPrototype },
      "sign-up": { title: "Sign up", states: SIGN_UP_STATES, Component: SignUpPrototype },
      verify: { title: "Verify email", states: VERIFY_STATES, Component: VerifyEmailPrototype },
      "reset-password": { title: "Forgot password", states: RESET_REQUEST_STATES, Component: ResetRequestPrototype },
      "reset-verify": { title: "Enter reset code", states: RESET_VERIFY_STATES, Component: ResetVerifyPrototype },
      "reset-confirm": { title: "Set new password", states: RESET_CONFIRM_STATES, Component: ResetConfirmPrototype },
    },
  },
  {
    id: "002-employer-vacancies",
    title: "Employer vacancies",
    screens: {
      list: { title: "My vacancies", states: LIST_STATES, Component: VacancyListPrototype },
      new: { title: "Post a vacancy", states: NEW_STATES, Component: VacancyNewPrototype },
      edit: { title: "Edit vacancy", states: EDIT_STATES, Component: VacancyEditPrototype },
      vacancy: { title: "Vacancy page", states: PAGE_STATES, Component: VacancyPagePrototype },
    },
  },
];
