import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/ui/app-shell";
import styles from "./auth.module.css";

/* Shared pieces of the five auth views: the centred frame, the route map and a ticking countdown. */

export type AuthRoutes = {
  signIn: string;
  signUp: string;
  verify: string;
  reset: string;
  resetVerify: string;
  resetConfirm: string;
};

export const AUTH_ROUTES: AuthRoutes = {
  signIn: "/sign-in",
  signUp: "/sign-up",
  verify: "/sign-up/verify",
  reset: "/reset-password",
  resetVerify: "/reset-password/verify",
  resetConfirm: "/reset-password/confirm",
};

export function resolveRoutes(routes?: Partial<AuthRoutes>): AuthRoutes {
  return { ...AUTH_ROUTES, ...routes };
}

export function AuthFrame({ title, subtitle, legal, children }: { title: string; subtitle: ReactNode; legal?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.column}>
        <div className={styles.logo}><Logo /></div>
        <div className={styles.head}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.sub}>{subtitle}</p>
        </div>
        {children}
        {legal && <p className={styles.legal}>{legal}</p>}
      </div>
    </div>
  );
}

/** "14:32" */
export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Seconds left, ticking once a second. Starts from the initial `seconds`; remount (key) to restart. */
export function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);
  return left;
}

export function Countdown({ left }: { left: number }) {
  return <strong className={styles.timer} data-testid="countdown">{clock(left)}</strong>;
}

export const triesLeft = (n: number) => `${n} ${n === 1 ? "try" : "tries"} left`;
