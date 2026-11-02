import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Field } from "../field";
import styles from "./combobox.module.css";

/*
 * Combobox: a text field with a suggestion list (ARIA combobox + listbox).
 * - single: pick one value from a long list (university, city). For ≤ 7 fixed options use SelectField.
 * - multiple: chips inside the field (skills, languages). Backspace on an empty input removes the last chip.
 * `allowCreate` adds an "Add “…”" option only when the typed text matches no option (case-insensitive, spaces collapsed);
 * an exact match is listed first and is what Enter picks, so "python" never creates a second "Python".
 * `onQueryChange` reports the typed text (also when it is cleared) so a page can search on the server; `loading` shows
 * a "Searching…" row. In multiple mode the list stays open after a pick and sits IN the flow (pushes what follows down)
 * so it can never cover the primary action below the field.
 */

type BaseProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  required?: boolean;
  options: string[];
  placeholder?: string;
  allowCreate?: boolean;
  /** Called whenever the typed text changes, including when it is cleared after a pick */
  onQueryChange?: (query: string) => void;
  /** Options for the typed text are being fetched */
  loading?: boolean;
  /** Shown when nothing matches and creating is not allowed */
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
};

type SingleProps = BaseProps & { multiple?: false; value: string; onChange: (value: string) => void };
type MultipleProps = BaseProps & { multiple: true; value: string[]; onChange: (value: string[]) => void; max?: number };

export type ComboboxProps = SingleProps | MultipleProps;

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const same = (a: string, b: string) => norm(a) === norm(b);

function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

export function Combobox(props: ComboboxProps) {
  const { label, hint, error, optional, required, options, placeholder, allowCreate, emptyText = "No matches", disabled, className, onQueryChange, loading } = props;
  const multiple = props.multiple === true;
  const selected = multiple ? (props.value as string[]) : [];
  const single = multiple ? "" : (props.value as string);

  const [query, setQuery] = useState(multiple ? "" : single);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const typed = query.trim().replace(/\s+/g, " ");
  const showAll = !multiple && same(query, single);
  const filtered = options
    .filter((o) => (showAll || !typed ? true : o.toLowerCase().includes(typed.toLowerCase())))
    .filter((o) => !selected.some((s) => same(s, o)))
    .sort((a, b) => Number(same(b, typed)) - Number(same(a, typed))) // an exact match first: Enter picks it
    .slice(0, 50);
  const canCreate = Boolean(allowCreate && typed && !options.some((o) => same(o, typed)) && !selected.some((s) => same(s, typed)));
  const items = canCreate ? [...filtered, typed] : filtered;
  const full = multiple && (props as MultipleProps).max !== undefined && selected.length >= (props as MultipleProps).max!;

  const choose = (picked: string) => {
    const option = options.find((o) => same(o, picked)) ?? picked; // never a second spelling of an existing option
    if (multiple) {
      if (full) return;
      if (selected.some((s) => same(s, option))) return;
      (props as MultipleProps).onChange([...selected, option]);
      setQuery("");
      onQueryChange?.("");
    } else {
      (props as SingleProps).onChange(option);
      setQuery(option);
      setOpen(false);
    }
    setActive(0);
  };

  const remove = (option: string) => {
    if (multiple) (props as MultipleProps).onChange(selected.filter((s) => s !== option));
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && items[active] !== undefined) {
        e.preventDefault();
        choose(items[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === "Backspace" && multiple && !query && selected.length) {
      remove(selected[selected.length - 1]);
    }
  };

  // True while a mouse button / finger is down anywhere. The multiple-mode list sits in the page flow, so closing it on the
  // blur that a press causes would move the next control up before the press ends, and its click would be lost.
  const pressed = useRef(false);
  useEffect(() => {
    const down = () => { pressed.current = true; };
    const up = () => { pressed.current = false; };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
    };
  }, []);

  const onBlur = () => {
    if (multiple && pressed.current) {
      // the press has already picked its target; closing after it ends cannot cost the click
      const close = () => setOpen(false);
      document.addEventListener("pointerup", close, { once: true });
      document.addEventListener("pointercancel", close, { once: true });
    } else {
      setOpen(false);
    }
    // single mode: free text that is not a valid choice snaps back to the current value
    if (!multiple && !same(query, single)) {
      const exact = options.find((o) => same(o, query));
      if (exact) (props as SingleProps).onChange(exact);
      else if (allowCreate && typed) (props as SingleProps).onChange(typed);
      else setQuery(single);
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;
  const filled = multiple ? selected.length > 0 : Boolean(single);

  return (
    <Field label={label} hint={hint} error={error} optional={optional} required={required} className={className}>
      {(control) => (
        <div className={styles.wrap} data-testid={props["data-testid"]} data-flow={multiple || undefined}>
          <div
            className={styles.box}
            data-filled={filled || undefined}
            data-invalid={error ? "" : undefined}
            data-multiple={multiple || undefined}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
                inputRef.current?.focus();
              }
            }}
          >
            {multiple &&
              selected.map((s) => (
                <span key={s} className={styles.chip}>
                  {s}
                  <button
                    type="button"
                    className={styles.chipRemove}
                    onClick={() => remove(s)}
                    aria-label={`Remove ${s}`}
                    disabled={disabled}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </span>
              ))}
            <input
              ref={inputRef}
              {...control}
              className={styles.input}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={listId}
              aria-activedescendant={open && items.length ? optionId(active) : undefined}
              autoComplete="off"
              value={query}
              placeholder={multiple && selected.length ? (full ? "" : "Add more…") : placeholder}
              disabled={disabled || full}
              onChange={(e) => {
                setQuery(e.target.value);
                onQueryChange?.(e.target.value);
                setOpen(true);
                setActive(0);
              }}
              onFocus={() => setOpen(true)}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
            />
          </div>
          {open && (
            <ul id={listId} role="listbox" className={styles.list} aria-multiselectable={multiple || undefined}>
              {loading && <li className={styles.empty} role="status">Searching…</li>}
              {items.length === 0 && !loading && <li className={styles.empty}>{emptyText}</li>}
              {items.map((item, i) => {
                const isCreate = canCreate && i === items.length - 1;
                return (
                  <li
                    key={`${item}-${i}`}
                    id={optionId(i)}
                    role="option"
                    aria-selected={!multiple && same(item, single)}
                    data-active={i === active || undefined}
                    className={[styles.option, isCreate ? styles.create : ""].join(" ")}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(item)}
                  >
                    {isCreate ? (
                      <span>Add <strong>“{item}”</strong></span>
                    ) : (
                      <span><Highlight text={item} query={showAll ? "" : typed} /></span>
                    )}
                    {!multiple && same(item, single) && <Icon name="check" size={16} />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Field>
  );
}
