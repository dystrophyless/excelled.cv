import {
  useEffect, useId, useRef, useState, type ComponentPropsWithRef, type KeyboardEvent, type ReactNode,
} from "react";
import { Icon } from "@/components/icons";
import styles from "./field.module.css";

/*
 * Form fields: label above, control, then hint or error.
 * Errors: red edge + red icon, message text stays calm (affect otp-input pattern).
 * The error replaces the hint and is linked to the control with aria-describedby.
 *
 * Sizes: md (40px) in forms · sm (36px) in toolbars, where it lines up with SegmentedControl md.
 * hideLabel: the label is still read by screen readers — use it only in toolbars (search, sort).
 */

export type FieldSize = "md" | "sm";

export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  required?: boolean;
};

export type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  /** Error message; when set the control is marked aria-invalid */
  error?: ReactNode;
  /** Shows "(optional)" after the label instead of marking required fields */
  optional?: boolean;
  required?: boolean;
  /** Visually hide the label (toolbars only) */
  hideLabel?: boolean;
  id?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

export function Field({ label, hint, error, optional, required, hideLabel, id, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const messageId = `${controlId}-message`;
  const message = error ?? hint;

  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label className={hideLabel ? "sr-only" : styles.label} htmlFor={controlId} id={`${controlId}-label`}>
        {label}
        {optional && <span className={styles.optional}>(optional)</span>}
      </label>
      {children({
        id: controlId,
        "aria-describedby": message ? messageId : undefined,
        "aria-invalid": error ? true : undefined,
        required,
      })}
      {error ? (
        <span id={messageId} className={styles.error} role="alert">
          <Icon name="error" className={styles.errorIcon} size={16} />
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

type FieldTextProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  hideLabel?: boolean;
  size?: FieldSize;
  /** Class for the outer field wrapper */
  className?: string;
};

export type TextFieldProps = Omit<ComponentPropsWithRef<"input">, "className" | "size"> & FieldTextProps;

export function TextField({ label, hint, error, optional, required, hideLabel, size = "md", id, className, ...input }: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} required={required} hideLabel={hideLabel} id={id} className={className}>
      {(control) => <input className={styles.control} data-size={size} {...input} {...control} aria-invalid={control["aria-invalid"] ?? input["aria-invalid"]} />}
    </Field>
  );
}

export type SearchFieldProps = Omit<TextFieldProps, "type" | "value" | "onChange" | "defaultValue"> & {
  value: string;
  onChange: (value: string) => void;
};

/** Search input with a leading icon and a clear button. Label hidden by default (toolbars). */
export function SearchField({ label, hint, error, hideLabel = true, size = "sm", id, className, value, onChange, ...input }: SearchFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} id={id} className={className}>
      {(control) => (
        <div className={`${styles.wrap} ${styles.search}`}>
          <Icon name="search" size={16} className={styles.leading} />
          <input
            className={styles.control}
            data-size={size}
            type="search"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && value && onChange("")}
            {...input}
            {...control}
          />
          {value && (
            <button type="button" className={styles.trailing} onClick={() => onChange("")} aria-label="Clear search">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      )}
    </Field>
  );
}

export type PasswordFieldProps = Omit<TextFieldProps, "type">;

export function PasswordField({ label, hint, error, optional, required, hideLabel, size = "md", id, className, ...input }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} optional={optional} required={required} hideLabel={hideLabel} id={id} className={className}>
      {(control) => (
        <div className={styles.wrap}>
          <input
            className={styles.control}
            data-size={size}
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            {...input}
            {...control}
            aria-invalid={control["aria-invalid"] ?? input["aria-invalid"]}
            aria-describedby={[control["aria-describedby"], input["aria-describedby"]].filter(Boolean).join(" ") || undefined}
          />
          <button
            type="button"
            className={styles.trailing}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            <Icon name={visible ? "hide" : "show"} size={16} />
          </button>
        </div>
      )}
    </Field>
  );
}

export type TextareaFieldProps = Omit<ComponentPropsWithRef<"textarea">, "className"> & Omit<FieldTextProps, "size">;

export function TextareaField({ label, hint, error, optional, required, hideLabel, id, className, ...textarea }: TextareaFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} required={required} hideLabel={hideLabel} id={id} className={className}>
      {(control) => <textarea className={`${styles.control} ${styles.textarea}`} {...textarea} {...control} />}
    </Field>
  );
}

/* ── Select ─────────────────────────────────────────────────────────────────────── */

export type SelectOption = { value: string; label: string; description?: string; disabled?: boolean };

export type SelectFieldProps = FieldTextProps & {
  options: SelectOption[];
  /** Controlled value ("" = nothing chosen) */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Shown while nothing is chosen */
  placeholder?: string;
  /** Submitted with forms through a hidden input */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  "data-testid"?: string;
};

/**
 * Select-only combobox (ARIA APG pattern) styled like the fields — never the browser's option list.
 * Keyboard: ↓/↑/Enter/Space open · ↑/↓/Home/End move · Enter/Space choose · Esc closes · letters jump.
 * For long or searchable lists use Combobox; for 2–6 always-visible options use SegmentedControl.
 */
export function SelectField({
  label, hint, error, optional, required, hideLabel, size = "md", className, options, value, defaultValue = "",
  onChange, placeholder = "Choose…", name, disabled, id, ...rest
}: SelectFieldProps) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const typed = useRef({ text: "", at: 0 });
  const selected = options.find((o) => o.value === current);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (o: SelectOption) => {
    if (o.disabled) return;
    if (value === undefined) setInner(o.value);
    onChange?.(o.value);
    setOpen(false);
  };

  const openAt = (index: number) => {
    setActive(Math.max(0, index));
    setOpen(true);
  };

  const move = (from: number, step: 1 | -1) => {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      i = (i + step + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const selectedIndex = Math.max(0, options.findIndex((o) => o.value === current));
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openAt(selectedIndex);
      }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => move(i, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => move(i, -1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(move(-1, 1)); }
    else if (e.key === "End") { e.preventDefault(); setActive(move(options.length, -1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(options[active]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const hit = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
    }
  };

  return (
    <Field label={label} hint={hint} error={error} optional={optional} required={required} hideLabel={hideLabel} id={id} className={className}>
      {(control) => (
        <div ref={root} className={styles.wrap} data-testid={rest["data-testid"]}>
          <button
            type="button"
            {...control}
            className={`${styles.control} ${styles.selectButton}`}
            data-size={size}
            data-empty={!selected || undefined}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-labelledby={`${control.id}-label ${control.id}`}
            aria-activedescendant={open ? `${listId}-${active}` : undefined}
            disabled={disabled}
            onClick={() => (open ? setOpen(false) : openAt(Math.max(0, options.findIndex((o) => o.value === current))))}
            onKeyDown={onKeyDown}
          >
            <span className={styles.selectValue}>{selected?.label ?? placeholder}</span>
          </button>
          <span className={`${styles.trailing} ${styles.chevron}`} aria-hidden="true" data-open={open || undefined}>
            <Icon name="chevronDown" size={16} />
          </span>
          {name && <input type="hidden" name={name} value={current} />}
          {open && (
            <ul id={listId} role="listbox" className={styles.list} aria-labelledby={`${control.id}-label`}>
              {options.map((o, i) => (
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={o.value === current}
                  aria-disabled={o.disabled || undefined}
                  data-active={i === active || undefined}
                  className={styles.option}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                >
                  <span className={styles.optionText}>
                    {o.label}
                    {o.description && <span className={styles.optionDescription}>{o.description}</span>}
                  </span>
                  {o.value === current && <Icon name="check" size={16} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Field>
  );
}
