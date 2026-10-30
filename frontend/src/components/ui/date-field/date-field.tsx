import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Field, type FieldSize } from "../field";
import fieldStyles from "../field/field.module.css";
import styles from "./date-field.module.css";

/*
 * DateField — a field that opens a month calendar in a popover (never the browser's date picker).
 * Value is an ISO date string "YYYY-MM-DD" ("" = empty); shown as "30 Nov 2026".
 * Keyboard in the calendar: arrows move by day/week, PageUp/PageDown by month, Enter picks, Esc closes.
 */

export type DateFieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  required?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  /** Earliest selectable ISO date, e.g. today for deadlines */
  min?: string;
  placeholder?: string;
  name?: string;
  size?: FieldSize;
  className?: string;
  "data-testid"?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : null);
const format = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function DateField({
  label, hint, error, optional, required, value, defaultValue = "", onChange, min, placeholder = "Pick a date", name,
  size = "md", className, ...rest
}: DateFieldProps) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const selected = fromIso(current);
  const minDate = fromIso(min);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<Date>(() => fromIso(value ?? defaultValue) ?? new Date());
  const [today] = useState(() => toIso(new Date()));
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    grid.current?.querySelector<HTMLButtonElement>("[data-focus]")?.focus();
  }, [open, focus]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const days = useMemo(() => {
    const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i - offset + 1));
  }, [focus]);

  const disabled = (d: Date) => Boolean(minDate && d < minDate);
  const pick = (d: Date) => {
    if (disabled(d)) return;
    const iso = toIso(d);
    if (value === undefined) setInner(iso);
    onChange?.(iso);
    setOpen(false);
  };
  const shift = (days: number, months = 0) =>
    setFocus((f) => new Date(f.getFullYear(), f.getMonth() + months, f.getDate() + days));

  const onGridKey = (e: KeyboardEvent) => {
    const map: Record<string, () => void> = {
      ArrowLeft: () => shift(-1), ArrowRight: () => shift(1), ArrowUp: () => shift(-7), ArrowDown: () => shift(7),
      PageUp: () => shift(0, -1), PageDown: () => shift(0, 1),
      Enter: () => pick(focus), " ": () => pick(focus), Escape: () => setOpen(false),
    };
    if (map[e.key]) { e.preventDefault(); map[e.key](); }
  };

  return (
    <Field label={label} hint={hint} error={error} optional={optional} required={required} className={className}>
      {(control) => (
        <div ref={root} className={fieldStyles.wrap} data-testid={rest["data-testid"]}>
          <button
            type="button"
            {...control}
            className={`${fieldStyles.control} ${fieldStyles.selectButton}`}
            data-size={size}
            data-empty={!selected || undefined}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => { setFocus(selected ?? new Date()); setOpen((o) => !o); }}
          >
            <span className={fieldStyles.selectValue}>{selected ? format(selected) : placeholder}</span>
          </button>
          <span className={`${fieldStyles.trailing} ${fieldStyles.chevron}`} aria-hidden="true">
            <Icon name="deadline" size={16} />
          </span>
          {name && <input type="hidden" name={name} value={current} />}
          {open && (
            <div className={styles.popover} role="dialog" aria-label="Choose a date">
              <div className={styles.head}>
                <button type="button" className={styles.nav} onClick={() => shift(0, -1)} aria-label="Previous month"><Icon name="chevronLeft" size={16} /></button>
                <span className={styles.month} aria-live="polite">{focus.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
                <button type="button" className={styles.nav} onClick={() => shift(0, 1)} aria-label="Next month"><Icon name="chevronRight" size={16} /></button>
              </div>
              <div className={styles.weekdays} aria-hidden="true">{WEEKDAYS.map((d) => <span key={d}>{d}</span>)}</div>
              <div ref={grid} className={styles.grid} role="grid" onKeyDown={onGridKey}>
                {days.map((d) => {
                  const iso = toIso(d);
                  const isFocus = iso === toIso(focus);
                  return (
                    <button
                      key={iso}
                      type="button"
                      role="gridcell"
                      className={styles.day}
                      tabIndex={isFocus ? 0 : -1}
                      data-focus={isFocus || undefined}
                      data-outside={d.getMonth() !== focus.getMonth() || undefined}
                      data-today={iso === today || undefined}
                      aria-selected={iso === current}
                      aria-label={format(d)}
                      disabled={disabled(d)}
                      onClick={() => pick(d)}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Field>
  );
}
