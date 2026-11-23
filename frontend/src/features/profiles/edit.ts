import { useEffect, useRef, useState } from "react";
import { useBlocker, useLocation } from "react-router";
import { toast } from "@/components/ui";
import { focusHeading, focusInvalid, isApiError, withoutErrorsFor } from "./form";
import { PROFILE_TOASTS, sameValues, type ProfileFormAlert } from "./model";

/*
 * The edit pages' shared behaviour (S3, S5), as in the prototype's `useEditForm`: dirty check against the server copy,
 * validation → focus the first invalid field, PUT with the base version, 409 → conflict alert (the 409's profile becomes
 * the base, so a second Save replaces it; "Load latest version" loads it into the form), leave guard (router blocker +
 * beforeunload).
 */

type Versioned = { version: number };

export type EditFormOptions<P extends Versioned, V extends object, E extends object> = {
  loaded: P;
  toValues: (p: P) => V;
  validate: (v: V) => E;
  /** PUT; resolves with the stored profile */
  save: (values: V, version: number) => Promise<P>;
  /** The server's current profile carried by a 409 `version_conflict` (`detail.profile`) */
  conflictProfile: (error: unknown) => P | undefined;
  /** A 422 → field errors (undefined: show the save-error alert) */
  serverErrors: (error: unknown, values: V, clientErrors: E) => E | undefined;
  /** After a successful save (toast, navigation); `leave()` lets the next navigation pass the blocker */
  onSaved: (before: P, after: P, leave: () => void) => void;
};

export function useEditForm<P extends Versioned, V extends object, E extends object>(o: EditFormOptions<P, V, E>) {
  // `base` = the server copy the form was last in sync with; the PUT version always comes from it
  const [base, setBase] = useState<P>(o.loaded);
  const [values, setValues] = useState<V>(() => o.toValues(o.loaded));
  const [errors, setErrors] = useState<E | undefined>();
  const [alert, setAlert] = useState<ProfileFormAlert | undefined>();
  const [saving, setSaving] = useState(false);
  const latest = useRef(values);

  const dirty = !sameValues(values, o.toValues(base));

  const allowLeave = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && !saving && !allowLeave.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const onChange = (patch: Partial<V>) => {
    latest.current = { ...latest.current, ...patch };
    setValues(latest.current);
    setErrors((e) => withoutErrorsFor(e, patch));
    setAlert((a) => (a === "conflict" ? a : undefined));
  };

  const reset = (to: P) => {
    setBase(to);
    latest.current = o.toValues(to);
    setValues(latest.current);
    setErrors(undefined);
    setAlert(undefined);
  };

  const onSave = async () => {
    const v = latest.current;
    const clientErrors = o.validate(v);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setAlert(undefined);
      focusInvalid();
      return;
    }
    setErrors(undefined);
    setAlert(undefined);
    setSaving(true);
    try {
      const saved = await o.save(v, base.version);
      const before = base;
      setBase(saved);
      latest.current = o.toValues(saved);
      setValues(latest.current);
      setSaving(false);
      o.onSaved(before, saved, () => { allowLeave.current = true; });
    } catch (error) {
      setSaving(false);
      if (isApiError(error, "version_conflict")) {
        const current = o.conflictProfile(error);
        // keep what the user typed; a second Save goes against the newest version and replaces it
        if (current) setBase(current);
        setAlert("conflict");
        focusHeading();
        return;
      }
      const mapped = o.serverErrors(error, v, clientErrors);
      if (mapped) {
        setErrors(mapped);
        focusInvalid();
        return;
      }
      setAlert("save-error");
      focusHeading();
    }
  };

  return {
    base, values, errors, alert, saving, dirty,
    leaveOpen: blocker.state === "blocked",
    onChange,
    onSave: () => void onSave(),
    onDiscard: () => reset(base),
    /** The base is already the 409's profile: load it into the form */
    onLoadLatest: () => { reset(base); toast(PROFILE_TOASTS.latestLoaded); },
    onLeaveCancel: () => { if (blocker.state === "blocked") blocker.reset(); },
    onLeaveConfirm: () => { if (blocker.state === "blocked") blocker.proceed(); },
  };
}

/** The profile page's "Add" buttons open `edit#<section>`: scroll there and focus its first field once the form is shown. */
export function useSectionFromHash(ready: boolean) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash || !ready) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(hash.slice(1));
      if (!el) return;
      el.scrollIntoView({ block: "start" });
      (el.querySelector<HTMLElement>("input:not([type=hidden]), textarea, [role=combobox]") ?? el.querySelector<HTMLElement>("button"))
        ?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [hash, ready]);
}
