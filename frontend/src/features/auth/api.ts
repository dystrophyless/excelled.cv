import { api } from "@/lib/api";

export type Role = "student" | "employer";
export type Account = { id: number; email: string; role: Role };
export type CodePurpose = "sign_up" | "password_reset";

/** The only client auth state (research R4). `null` data = signed out. */
export const meKey = ["me"] as const;

type AccountResponse = { account: Account };
type CodeSent = { resend_in: number; expires_in: number };

const BASE = "/api/auth";

export const me = () => api<AccountResponse>(`${BASE}/me`);

export const signIn = (email: string, password: string) =>
  api<AccountResponse>(`${BASE}/token`, { method: "POST", form: { username: email, password } });

export const signOut = () => api<void>(`${BASE}/sign-out`, { method: "POST" });

export const register = (body: { email: string; password: string; role: Role }) =>
  api<{ email: string } & CodeSent>(`${BASE}/register`, { method: "POST", json: body });

export const resendCode = (body: { email: string; purpose: CodePurpose }) =>
  api<CodeSent>(`${BASE}/resend-code`, { method: "POST", json: body });

export const verifyEmail = (body: { email: string; code: string }) =>
  api<AccountResponse>(`${BASE}/verify-email`, { method: "POST", json: body });

export const resetRequest = (body: { email: string }) =>
  api<CodeSent>(`${BASE}/password-reset/request`, { method: "POST", json: body });

export const resetVerify = (body: { email: string; code: string }) =>
  api<{ reset_token: string; expires_in: number }>(`${BASE}/password-reset/verify`, { method: "POST", json: body });

export const resetConfirm = (body: { reset_token: string; password: string }) =>
  api<AccountResponse>(`${BASE}/password-reset/confirm`, { method: "POST", json: body });
