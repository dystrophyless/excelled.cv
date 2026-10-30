import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import styles from "./choice.module.css";

/*
 * Checkbox, Radio, Switch. Each is a real <input> inside its <label>, so clicks on the text,
 * keyboard, form submission and getByRole/getByLabel all work without extra wiring.
 */

type ChoiceProps = Omit<ComponentPropsWithRef<"input">, "type" | "children"> & {
  label: ReactNode;
  /** Muted second line under the label */
  description?: ReactNode;
};

function ChoiceText({ label, description }: { label: ReactNode; description?: ReactNode }) {
  return (
    <span className={styles.text}>
      <span>{label}</span>
      {description && <span className={styles.description}>{description}</span>}
    </span>
  );
}

export type CheckboxProps = ChoiceProps;

export function Checkbox({ label, description, className, disabled, ...input }: CheckboxProps) {
  return (
    <label className={[styles.choice, className].filter(Boolean).join(" ")} data-disabled={disabled || undefined}>
      <input type="checkbox" className={styles.input} disabled={disabled} {...input} />
      <span className={styles.box} aria-hidden="true">
        <Icon name="check" size={13} strokeWidth={3} />
      </span>
      <ChoiceText label={label} description={description} />
    </label>
  );
}

export type RadioProps = ChoiceProps;

export function Radio({ label, description, className, disabled, ...input }: RadioProps) {
  return (
    <label
      className={[styles.choice, styles.radio, className].filter(Boolean).join(" ")}
      data-disabled={disabled || undefined}
    >
      <input type="radio" className={styles.input} disabled={disabled} {...input} />
      <span className={styles.box} aria-hidden="true">
        <span className={styles.dot} />
      </span>
      <ChoiceText label={label} description={description} />
    </label>
  );
}

export type SwitchProps = ChoiceProps;

/** An on/off setting that applies immediately. For choices confirmed with Save, use Checkbox. */
export function Switch({ label, description, className, disabled, ...input }: SwitchProps) {
  return (
    <label className={[styles.choice, className].filter(Boolean).join(" ")} data-disabled={disabled || undefined}>
      <input type="checkbox" role="switch" className={styles.input} disabled={disabled} {...input} />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      <ChoiceText label={label} description={description} />
    </label>
  );
}

export type ChoiceGroupProps = {
  legend: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Groups checkboxes or radios under one legend (a <fieldset>). Give radios the same `name`. */
export function ChoiceGroup({ legend, error, className, children }: ChoiceGroupProps) {
  const errorId = useId();
  return (
    <fieldset
      className={[styles.group, className].filter(Boolean).join(" ")}
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className={styles.legend}>{legend}</legend>
      {children}
      {error && (
        <span id={errorId} className={styles.groupError} role="alert">
          <Icon name="error" size={16} />
          {error}
        </span>
      )}
    </fieldset>
  );
}
