import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "@/lib/api";
import { me, meKey, register, resendCode, resetConfirm, resetRequest, resetVerify, signIn, signOut, verifyEmail, type Account, type Role } from "./api";

/** Current account, or `null` when signed out (401). The `["me"]` query is the only client auth state. */
export function useMe() {
  return useQuery<Account | null>({
    queryKey: meKey,
    queryFn: async () => {
      try {
        return (await me()).account;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function homeFor(role: Role): string {
  return role === "student" ? "/app" : "/company";
}

/** `next` from the sign-in URL: only a same-origin path ("/x", never "//host" or "/\host"). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/**
 * Move focus to the first invalid field whenever a submit ends in an error state. Returns `markSubmit`: call it at the
 * start of every submit so a second consecutive error (state unchanged) still refocuses.
 */
export function useFocusFirstInvalid(active: boolean) {
  const [submits, setSubmits] = useState(0);
  useEffect(() => {
    if (!active) return;
    // the kit marks a control aria-invalid only when it has its own message; otherwise start at the first field
    (document.querySelector<HTMLElement>('form [aria-invalid="true"]') ?? document.querySelector<HTMLElement>("form input"))?.focus();
  }, [active, submits]);
  return () => setSubmits((n) => n + 1);
}

/** Focus the OTP input once on mount (the View does not pass autoFocus to the affect port). */
export function useFocusOtp() {
  useEffect(() => {
    document.querySelector<HTMLElement>("input.ui-otp__input")?.focus({ preventScroll: true });
  }, []);
}

export function useSignUp() {
  return useMutation({ mutationFn: register });
}

export function useResendCode() {
  return useMutation({ mutationFn: resendCode });
}

/** Success: the new account is the signed-in account. */
export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: ({ account }) => queryClient.setQueryData<Account | null>(meKey, account),
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => signIn(email, password),
    onSuccess: ({ account }) => queryClient.setQueryData<Account | null>(meKey, account),
  });
}

export function useResetRequest() {
  return useMutation({ mutationFn: resetRequest });
}

export function useResetVerify() {
  return useMutation({ mutationFn: resetVerify });
}

/**
 * The server signs the user in on success, but the account is NOT written to `["me"]` here: the page shows the
 * "Password updated" screen first and writes it on Continue (see ResetConfirmPage).
 */
export function useResetConfirm() {
  return useMutation({ mutationFn: resetConfirm });
}

/** Signs out on the server, then drops every cached query and goes to /sign-in (also if the request fails). */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: signOut,
    onSettled: () => {
      queryClient.clear();
      navigate("/sign-in", { replace: true });
    },
  });
}
