import type { ComponentType } from "react";

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

export const PROTOTYPES: PrototypeEntry[] = [];
