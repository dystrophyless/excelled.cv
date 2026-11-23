import {
  createContext, useContext, useId, useState, type ChangeEvent, type ComponentPropsWithRef, type CSSProperties,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "@/components/icons";
import styles from "./choice-card.module.css";

/*
 * ChoiceCard / ChoiceCardGroup — a radio or checkbox drawn as a selectable tile, for "pick a ready-made answer"
 * steps (onboarding wizards). design-system/components.md → Forms, patterns.md §16.
 *
 * Each card is a real <input> covering its <label>, so clicks, Space, arrow keys inside a radio group (native),
 * form submission and getByRole("radio" | "checkbox", { name }) all work with no extra wiring.
 * The accessible name is the label only; the description is linked with aria-describedby.
 *
 * Inside a white card it is a control, not a nested card: hairline edge, --radius-control, no shadow.
 * Selected = ink edge (--shadow-selected) + filled indicator; focus = the kit's focus outline.
 *
 * Sizes: sm — compact text-only answers (year of study, company size): 40px, centred; selected = ink edge + ink label.
 *        md — answers with a description line and / or an icon tile (university + city, industry): indicator at the end.
 */

export type ChoiceCardSize = "sm" | "md";
export type ChoiceCardType = "radio" | "checkbox";

type GroupContext = {
  type: ChoiceCardType;
  name: string;
  size: ChoiceCardSize;
  invalid: boolean;
  disabled: boolean;
  required: boolean;
};

const GroupCtx = createContext<GroupContext | null>(null);

export type ChoiceCardProps = Omit<ComponentPropsWithRef<"input">, "type" | "size" | "children"> & {
  label: ReactNode;
  /** Muted second line (md only), e.g. the university's city */
  description?: ReactNode;
  /** Icon tile before the text (md only), e.g. industries — a semantic name from the icon dictionary */
  icon?: IconName;
  /** Defaults to the group's type, or "radio" outside a group */
  type?: ChoiceCardType;
  /** Defaults to the group's size, or "md" outside a group */
  size?: ChoiceCardSize;
  "data-testid"?: string;
};

export function ChoiceCard({
  label, description, icon, type, size, name, disabled, required, className, style, "aria-invalid": ariaInvalid,
  "data-testid": testId, ...input
}: ChoiceCardProps) {
  const group = useContext(GroupCtx);
  const kind = type ?? group?.type ?? "radio";
  const sz = size ?? group?.size ?? "md";
  const off = Boolean(disabled ?? group?.disabled);
  const invalid = ariaInvalid ?? (group?.invalid ? true : undefined);
  const labelId = useId();
  const descId = useId();
  const showDesc = sz === "md" && description != null && description !== "";

  return (
    <label
      className={[styles.card, className].filter(Boolean).join(" ")}
      style={style}
      data-size={sz}
      data-type={kind}
      data-disabled={off || undefined}
      data-testid={testId}
    >
      <input
        type={kind}
        className={styles.input}
        name={name ?? group?.name}
        disabled={off}
        required={kind === "radio" ? (required ?? group?.required) || undefined : required}
        aria-invalid={invalid}
        aria-labelledby={labelId}
        aria-describedby={showDesc ? descId : undefined}
        {...input}
      />
      <span className={styles.frame} aria-hidden="true" />
      {sz === "md" && icon && (
        <span className={styles.tile} aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
      )}
      <span className={styles.text}>
        <span id={labelId} className={styles.label}>{label}</span>
        {showDesc && <span id={descId} className={styles.description}>{description}</span>}
      </span>
      {sz === "md" && (
        <span className={styles.indicator} aria-hidden="true">
          {kind === "checkbox" ? <Icon name="check" size={13} strokeWidth={3} /> : <span className={styles.dot} />}
        </span>
      )}
    </label>
  );
}

export type ChoiceCardOption = {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  disabled?: boolean;
  "data-testid"?: string;
};

type GroupBase = {
  /** The question. Always rendered as the fieldset's <legend>; `hideLegend` keeps it for screen readers only */
  legend: ReactNode;
  /** Hide the legend visually when the page title already asks the question (wizard step h1) */
  hideLegend?: boolean;
  /** Muted line under the legend */
  hint?: ReactNode;
  /** Shared input name (radios in one group must share it) */
  name: string;
  options?: ChoiceCardOption[];
  /** Extra ChoiceCards after the options (e.g. an "Other" card that opens a text field); they inherit name / type / size */
  children?: ReactNode;
  size?: ChoiceCardSize;
  /** Minimum column width in px; cards flow into as many columns as fit (default sm 88 · md 220) */
  min?: number;
  /** Maximum number of columns (e.g. 3 for six years → 3 × 2 on every width) */
  columns?: number;
  /** Error message under the cards; marks every input aria-invalid and links the message to the fieldset */
  error?: ReactNode;
  disabled?: boolean;
  /** Radio groups only: native `required` on the inputs */
  required?: boolean;
  className?: string;
  "data-testid"?: string;
};

export type RadioCardGroupProps = GroupBase & {
  type?: "radio";
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export type CheckboxCardGroupProps = GroupBase & {
  type: "checkbox";
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
};

export type ChoiceCardGroupProps = RadioCardGroupProps | CheckboxCardGroupProps;

/** A fieldset of ChoiceCards on a responsive grid. Controlled (`value`) or uncontrolled (`defaultValue`). */
export function ChoiceCardGroup(props: ChoiceCardGroupProps) {
  const {
    legend, hideLegend, hint, name, options = [], children, size = "md", min, columns, error, disabled = false,
    required = false, className, "data-testid": testId,
  } = props;
  const kind: ChoiceCardType = props.type ?? "radio";
  const [inner, setInner] = useState<string | string[]>(props.defaultValue ?? (kind === "checkbox" ? [] : ""));
  const current = props.value ?? inner;
  const hintId = useId();
  const errorId = useId();
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const isOn = (v: string) => (Array.isArray(current) ? current.includes(v) : current === v);
  const change = (v: string) => (e: ChangeEvent<HTMLInputElement>) => {
    if (props.type === "checkbox") {
      const list = Array.isArray(current) ? current : [];
      const next = e.target.checked ? [...list, v] : list.filter((x) => x !== v);
      setInner(next);
      props.onChange?.(next);
    } else {
      setInner(v);
      props.onChange?.(v);
    }
  };

  const gridStyle = {
    "--min": `${min ?? (size === "sm" ? 88 : 220)}px`,
    ...(columns ? { "--cols": columns } : null),
  } as CSSProperties;

  return (
    <GroupCtx.Provider value={{ type: kind, name, size, invalid: Boolean(error), disabled, required }}>
      <fieldset
        className={[styles.group, className].filter(Boolean).join(" ")}
        aria-describedby={describedBy}
        disabled={disabled || undefined}
        data-testid={testId}
      >
        <legend className={hideLegend ? "sr-only" : styles.legend}>{legend}</legend>
        {hint && <p id={hintId} className={styles.hint}>{hint}</p>}
        <div className={styles.grid} style={gridStyle}>
          {options.map((o) => (
            <ChoiceCard
              key={o.value}
              value={o.value}
              label={o.label}
              description={o.description}
              icon={o.icon}
              disabled={o.disabled || disabled}
              checked={isOn(o.value)}
              onChange={change(o.value)}
              data-testid={o["data-testid"]}
            />
          ))}
          {children}
        </div>
        {error && (
          <span id={errorId} className={styles.error} role="alert">
            <Icon name="error" size={16} />
            {error}
          </span>
        )}
      </fieldset>
    </GroupCtx.Provider>
  );
}
