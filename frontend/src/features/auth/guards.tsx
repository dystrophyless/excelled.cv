import type { ReactNode } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router";
import type { Role } from "./api";
import { homeFor, safeNext, useMe } from "./hooks";

/** Renders children only for a signed-in account with `role`; otherwise redirects. Loading renders nothing. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { data: account, isPending } = useMe();
  const location = useLocation();
  if (isPending) return null;
  if (!account) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?next=${next}`} replace />;
  }
  if (account.role !== role) return <Navigate to={homeFor(account.role)} replace />;
  return <>{children}</>;
}

/** For the public auth pages: a signed-in visitor goes straight to `next` (same-origin only) or their home. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { data: account, isPending } = useMe();
  const [params] = useSearchParams();
  if (isPending) return null;
  if (account) return <Navigate to={safeNext(params.get("next")) ?? homeFor(account.role)} replace />;
  return <>{children}</>;
}
