import type { ReactNode } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router";
import type { Role } from "./api";
import { homeFor, profileHomeFor, profilePageFor, safeNext, useMe } from "./hooks";

/**
 * Renders children only for a signed-in account with `role` that has its profile; otherwise redirects
 * (signed out → sign-in, other role → its home, no profile → its onboarding, research R3). Loading renders nothing.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { data: account, isPending } = useMe();
  const location = useLocation();
  if (isPending) return null;
  const next = encodeURIComponent(location.pathname + location.search);
  if (!account) return <Navigate to={`/sign-in?next=${next}`} replace />;
  if (account.role !== role) return <Navigate to={homeFor(account.role)} replace />;
  if (!account.has_profile) return <Navigate to={`${profileHomeFor(role)}?next=${next}`} replace />;
  return <>{children}</>;
}

/**
 * For the onboarding pages: renders only for a signed-in account of `role` WITHOUT a profile. With a profile → its
 * profile page; other role → its home; signed out → sign-in (back here afterwards).
 */
export function RequireOnboarding({ role, children }: { role: Role; children: ReactNode }) {
  const { data: account, isPending } = useMe();
  const location = useLocation();
  if (isPending) return null;
  if (!account) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?next=${next}`} replace />;
  }
  if (account.role !== role) return <Navigate to={homeFor(account.role)} replace />;
  if (account.has_profile) return <Navigate to={profilePageFor(role)} replace />;
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
