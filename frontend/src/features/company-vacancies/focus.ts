import { useEffect, useRef } from "react";

/* Focus helpers for the pages: the Views and the kit do not manage focus when a dialog closes or a step changes. */

/** Moves focus to the page's h1 (made focusable from here, so the View stays as designed). */
export function focusHeading() {
  const h1 = document.querySelector<HTMLElement>("h1");
  if (!h1) return;
  h1.tabIndex = -1;
  h1.focus({ preventScroll: false });
}

const INSIDE_OVERLAY = '[role="menu"], dialog, [role="dialog"]';

/**
 * Remembers which control opened a dialog and gives focus back to it when the dialog closes.
 * `remember()` at open time; `restore()` at close. If the opener is gone (row deleted, list re-filtered) the h1 gets focus.
 */
export function useRestoreFocus() {
  const last = useRef<HTMLElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  // the last focused control outside a menu / dialog: that is the "⋯" trigger or the notice button, not the menu item
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && !t.closest(INSIDE_OVERLAY)) last.current = t;
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  const remember = () => {
    opener.current = last.current;
  };

  /** `gone`: the opener is known to disappear (a deleted row), so go straight to the heading. */
  const restore = ({ gone = false }: { gone?: boolean } = {}) => {
    const el = opener.current;
    window.setTimeout(() => {
      if (!gone && el?.isConnected) el.focus();
      else focusHeading();
    }, 50);
    // the opener may vanish after the refetch (e.g. the row left the filtered list): never leave focus on <body>
    window.setTimeout(() => {
      if (document.activeElement === document.body || !document.activeElement) focusHeading();
    }, 600);
  };

  return { remember, restore };
}
