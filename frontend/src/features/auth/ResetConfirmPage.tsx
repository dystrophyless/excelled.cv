import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate } from "react-router";
import { ApiError } from "@/lib/api";
import { meKey, type Account } from "./api";
import { homeFor, useFocusFirstInvalid, useResetConfirm } from "./hooks";
import { ResetConfirmView, type ResetConfirmState } from "./views/ResetConfirmView";

type NavState = { email?: string; resetToken?: string };

/** S5 - Choose a new password. The reset token lives only in navigation state; without it -> back to S4. */
export function ResetConfirmPage() {
  const navigate = useNavigate();
  const nav = (useLocation().state ?? {}) as NavState;
  const confirm = useResetConfirm();
  const [state, setState] = useState<ResetConfirmState>("default");
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<{ password?: string }>({});
  // held until Continue: ["me"] stays null so RedirectIfSignedIn does not bounce the user off the success screen
  const [account, setAccount] = useState<Account | null>(null);

  // the server already set the session cookie: keep a window-focus refetch from pulling the account into ["me"] early
  useEffect(() => {
    if (state !== "success") return;
    queryClient.setQueryDefaults(meKey, { refetchOnWindowFocus: false, refetchOnReconnect: false });
    return () => queryClient.setQueryDefaults(meKey, {});
  }, [state, queryClient]);

  const markSubmit = useFocusFirstInvalid(state === "invalid-password");

  if (!nav.resetToken) return <Navigate to="/reset-password" replace />;
  const { resetToken } = nav;
  const email = nav.email ?? "";

  const onSubmit = async ({ password }: { password: string }) => {
    markSubmit();
    if (password.length < 8 || password.length > 64) {
      setErrors({ password: "That password is too short" });
      return setState("invalid-password");
    }
    setErrors({});
    setState("submitting");
    try {
      const result = await confirm.mutateAsync({ reset_token: resetToken, password });
      setAccount(result.account);
      setState("success");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "reset_token_invalid") return setState("link-expired");
        if (error.status === 422) {
          setErrors({ password: "That password is too short" });
          return setState("invalid-password");
        }
      }
      setState("server-error");
    }
  };

  const onStartOver = () => navigate("/reset-password", { state: { email } });

  return (
    <ResetConfirmView
      state={state}
      email={email}
      errors={errors}
      onSubmit={onSubmit}
      onStartOver={onStartOver}
      onEdit={() => setErrors((e) => (e.password ? {} : e))}
      onContinue={() => {
        if (!account) return;
        queryClient.setQueryData<Account | null>(meKey, account);
        navigate(homeFor(account.role), { replace: true });
      }}
    />
  );
}
