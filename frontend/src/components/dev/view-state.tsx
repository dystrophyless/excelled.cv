import { useSearchParams } from "react-router";
import { SegmentedControl } from "@/components/ui";
import styles from "./view-state.module.css";

/*
 * Every template and prototype renders all its states from one URL param:
 *   ?state=default | loading | empty | error  (plus template-specific ones)
 * so reviewers, QA and Playwright can open any state directly.
 */

export type ViewState = "default" | "loading" | "empty" | "error" | (string & {});

export function useViewState<T extends string>(states: readonly T[]): T {
  const [params] = useSearchParams();
  const s = params.get("state") as T | null;
  return s && states.includes(s) ? s : states[0];
}

/** Floating switcher (bottom-left) for reviewing states. Only in styleguide templates and prototypes — never in real pages. */
export function StateSwitcher({ states }: { states: readonly string[] }) {
  const [params, setParams] = useSearchParams();
  const current = params.get("state") ?? states[0];
  return (
    <div className={styles.switcher} data-testid="state-switcher">
      <SegmentedControl
        aria-label="Preview state"
        size="sm"
        value={states.includes(current) ? current : states[0]}
        onChange={(value) => {
          const next = new URLSearchParams(params);
          if (value === states[0]) next.delete("state");
          else next.set("state", value);
          setParams(next, { replace: true });
        }}
        options={states.map((s) => ({ value: s, label: s }))}
      />
    </div>
  );
}
