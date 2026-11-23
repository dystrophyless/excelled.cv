import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Field } from "../field";
import styles from "./combobox.module.css";

/*
 * Combobox: a text field with a suggestion list (ARIA combobox + listbox).
 * - single: pick one value from a long list (university, city). For ≤ 7 fixed options use SelectField.
 * - multiple: chips inside the field (skills, languages). Backspace on an empty input removes the last chip.
 *
 * Options are plain strings or objects `{ value, label, description?, keywords? }`: the description is a muted second line
 * (a university's city), keywords are extra search terms (aliases, abbreviations: "KBTU", "NU"). Matching is
 * case-insensitive and ranked: exact label / keyword → label or keyword starts with the text → a word of the label starts
 * with it → anywhere in the label → anywhere in a keyword or the description; the list order is kept inside a rank.
 * An option found through a keyword shows that keyword (highlighted) on its second line.
 *
 * `allowCreate` adds a create option (`createLabel`, default "Add “…”") only when the typed text matches no option label
 * or keyword (spaces collapsed); an exact match is listed first and is what Enter picks, so "python" never creates a
 * second "Python" and "kbtu" picks Kazakh-British Technical University.
 * `onQueryChange` reports the typed text (also when it is cleared) so a page can search on the server; `loading` shows
 * a "Searching…" row. The list shows every match (scrolls inside its max height; the active option scrolls into view);
 * `limit` caps it for very long server lists. In multiple mode — and in single mode with `inFlow` — the list sits IN the
 * flow (pushes what follows down) so it can never cover the primary action below the field; multiple mode also stays open
 * after a pick. The list opens on a pointer press on the field, on typing and on ArrowDown (Alt+ArrowDown), never on focus
 * alone: tabbing in or a programmatic focus (error focus) shows no list until the user types or presses ArrowDown.
 * `clearable` (single): emptying the field and leaving it clears the value (onChange("")), and a clear button shows.
 */

export type ComboboxOption = {
  value: string;
  label: string;
  /** Muted second line, e.g. the city */
  description?: string;
  /** Extra search terms that are not shown unless they matched: aliases, abbreviations, former names */
  keywords?: string[];
};

type BaseProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  required?: boolean;
  options: (string | ComboboxOption)[];
  placeholder?: string;
  allowCreate?: boolean;
  /** Text of the create option; default `Add “{typed}”` */
  createLabel?: (typed: string) => ReactNode;
  /** Called whenever the typed text changes, including when it is cleared after a pick */
  onQueryChange?: (query: string) => void;
  /** Options for the typed text are being fetched */
  loading?: boolean;
  /** Shown when nothing matches and creating is not allowed */
  emptyText?: string;
  /** At most this many options are listed (default: all) */
  limit?: number;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
};

type SingleProps = BaseProps & {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
  /** The user may empty the value: clear button + empty field on blur → onChange("") */
  clearable?: boolean;
  /**
   * The list sits in the page flow (pushes what follows down) instead of floating over it — use it whenever a primary
   * action sits below the field (wizard steps, forms with Save under the field). Multiple mode always does this.
   */
  inFlow?: boolean;
};
type MultipleProps = BaseProps & { multiple: true; value: string[]; onChange: (value: string[]) => void; max?: number };

export type ComboboxProps = SingleProps | MultipleProps;

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const same = (a: string, b: string) => norm(a) === norm(b);
const toOption = (o: string | ComboboxOption): ComboboxOption => (typeof o === "string" ? { value: o, label: o } : o);

type Match = { option: ComboboxOption; rank: number; keyword?: string };

/** Rank of `o` for the typed text `q` (normalised, non-empty); undefined = no match. */
function match(o: ComboboxOption, q: string): Match | undefined {
  const label = norm(o.label);
  const keys = (o.keywords ?? []).map((k) => [k, norm(k)] as const);
  if (label === q) return { option: o, rank: 0 };
  const exactKey = keys.find(([, k]) => k === q);
  if (exactKey) return { option: o, rank: 0, keyword: exactKey[0] };
  if (label.startsWith(q)) return { option: o, rank: 1 };
  const prefixKey = keys.find(([, k]) => k.startsWith(q));
  if (prefixKey) return { option: o, rank: 1, keyword: prefixKey[0] };
  if (label.split(/[\s\-–.,()/]+/).some((w) => w.startsWith(q))) return { option: o, rank: 2 };
  if (label.includes(q)) return { option: o, rank: 3 };
  const anyKey = keys.find(([, k]) => k.includes(q));
  if (anyKey) return { option: o, rank: 4, keyword: anyKey[0] };
  if (o.description && norm(o.description).includes(q)) return { option: o, rank: 4 };
  return undefined;
}

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

type Item = { kind: "option"; option: ComboboxOption; keyword?: string } | { kind: "create"; text: string };

export function Combobox(props: ComboboxProps) {
  const {
    label, hint, error, optional, required, placeholder, allowCreate, emptyText = "No matches", disabled, className,
    onQueryChange, loading, limit, createLabel = (t: string) => <>Add <strong>“{t}”</strong></>,
  } = props;
  const options = props.options.map(toOption);
  const multiple = props.multiple === true;
  const clearable = !multiple && (props as SingleProps).clearable === true;
  // in the flow, the list can never cover the action below the field (patterns.md §16)
  const flow = multiple || (props as SingleProps).inFlow === true;
  const selected = multiple ? (props.value as string[]) : [];
  const single = multiple ? "" : (props.value as string);
  const labelOf = (value: string) => options.find((o) => o.value === value)?.label ?? value;
  const singleLabel = single ? labelOf(single) : "";

  const [query, setQuery] = useState(multiple ? "" : singleLabel);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  // a new value from outside (Discard, Load latest version) shows in the field
  const lastSingle = useRef(single);
  useEffect(() => {
    if (!multiple && lastSingle.current !== single) {
      lastSingle.current = single;
      setQuery(singleLabel);
    }
  }, [multiple, single, singleLabel]);

  const typed = query.trim().replace(/\s+/g, " ");
  const q = norm(typed);
  const showAll = !multiple && same(query, singleLabel);
  const isSelected = (o: ComboboxOption) => selected.some((s) => s === o.value || same(s, o.label));
  const matches: Match[] = (showAll || !q
    ? options.map((option) => ({ option, rank: 0 }))
    : options.map((o) => match(o, q)).filter((m): m is Match => m !== undefined)
  )
    .filter((m) => !isSelected(m.option))
    .map((m, i) => ({ m, i }))
    .sort((a, b) => a.m.rank - b.m.rank || a.i - b.i) // stable: list order inside a rank
    .map(({ m }) => m)
    .slice(0, limit ?? Infinity);
  const exact = (text: string) =>
    options.find((o) => same(o.label, text)) ?? options.find((o) => o.keywords?.some((k) => same(k, text)));
  const canCreate = Boolean(allowCreate && typed && !exact(typed) && !selected.some((s) => same(s, typed)));
  const items: Item[] = [
    ...matches.map((m): Item => ({ kind: "option", option: m.option, keyword: m.keyword })),
    ...(canCreate ? [{ kind: "create", text: typed } as Item] : []),
  ];
  const full = multiple && (props as MultipleProps).max !== undefined && selected.length >= (props as MultipleProps).max!;

  const choose = (item: Item) => {
    // never a second spelling of an existing option
    const option = item.kind === "option" ? item.option : exact(item.text) ?? { value: item.text, label: item.text };
    if (multiple) {
      if (full) return;
      if (isSelected(option)) return;
      (props as MultipleProps).onChange([...selected, option.value]);
      setQuery("");
      onQueryChange?.("");
      // the pick that reaches the max closes the list; the input keeps focus (read-only, see below)
      const max = (props as MultipleProps).max;
      if (max !== undefined && selected.length + 1 >= max) setOpen(false);
    } else {
      lastSingle.current = option.value;
      (props as SingleProps).onChange(option.value);
      setQuery(option.label);
      setOpen(false);
    }
    setActive(0);
  };

  const clear = () => {
    lastSingle.current = "";
    (props as SingleProps).onChange("");
    setQuery("");
    onQueryChange?.("");
    setActive(0);
    inputRef.current?.focus();
  };

  const remove = (value: string) => {
    if (multiple) (props as MultipleProps).onChange(selected.filter((s) => s !== value));
    inputRef.current?.focus();
  };

  // keyboard navigation keeps the active option visible inside the scrolling list
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const move = (to: number) => setActive(Math.max(0, Math.min(to, items.length - 1)));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { if (!full) setOpen(true); }
      else move(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(active - 1);
    } else if (open && (e.key === "PageDown" || e.key === "PageUp")) {
      e.preventDefault();
      move(active + (e.key === "PageDown" ? 8 : -8));
    } else if (open && (e.key === "Home" || e.key === "End") && e.ctrlKey) {
      e.preventDefault();
      move(e.key === "Home" ? 0 : items.length - 1);
    } else if (e.key === "Enter") {
      if (open && items[active] !== undefined) {
        e.preventDefault();
        choose(items[active]);
      }
    } else if (
      e.key === "Tab" && !e.shiftKey && open && typed && items[active] !== undefined &&
      (multiple || !same(query, singleLabel))
    ) {
      // Tab accepts the highlighted option (as in most autocompletes) and lets focus move on — no preventDefault.
      // Only after the user typed something new: tabbing through an untouched field must not change it.
      choose(items[active]);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === "Backspace" && multiple && !query && selected.length) {
      remove(selected[selected.length - 1]);
    }
  };

  // True while a mouse button / finger is down anywhere. An in-flow list (multiple, or single `inFlow`) sits in the page flow, so closing it on the
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
    if (flow && pressed.current) {
      // The press has already picked its target. Closing the list AND committing the typed text both change the layout
      // (the list shrinks, a hint appears under the field), so both wait until the press ends — otherwise the control
      // below moves away from under the pointer and its click is lost.
      let done = false;
      const later = () => {
        if (done) return;
        done = true;
        document.removeEventListener("pointerup", later);
        document.removeEventListener("pointercancel", later);
        settle();
      };
      document.addEventListener("pointerup", later);
      document.addEventListener("pointercancel", later);
    } else {
      settle();
    }
  };

  const settle = () => {
    setOpen(false);
    // single mode: free text that is not a valid choice snaps back to the current value
    if (!multiple && !same(query, singleLabel)) {
      const found = exact(query);
      if (found) {
        lastSingle.current = found.value;
        (props as SingleProps).onChange(found.value);
        setQuery(found.label);
      } else if (clearable && !typed) {
        lastSingle.current = "";
        (props as SingleProps).onChange("");
        setQuery("");
      } else if (allowCreate && typed) {
        lastSingle.current = typed;
        (props as SingleProps).onChange(typed);
      } else setQuery(singleLabel);
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;
  const filled = multiple ? selected.length > 0 : Boolean(single);
  const hl = showAll ? "" : typed;

  return (
    <Field label={label} hint={hint} error={error} optional={optional} required={required} className={className}>
      {(control) => (
        <div className={styles.wrap} data-testid={props["data-testid"]} data-flow={flow || undefined}>
          <div
            className={styles.box}
            data-filled={filled || undefined}
            data-invalid={error ? "" : undefined}
            data-multiple={multiple || undefined}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
                inputRef.current?.focus();
                // a press on the field's box is a press on the field
                if (!full && !disabled) setOpen(true);
              }
            }}
          >
            {multiple &&
              selected.map((s) => (
                <span key={s} className={styles.chip}>
                  {labelOf(s)}
                  <button
                    type="button"
                    className={styles.chipRemove}
                    onClick={() => remove(s)}
                    aria-label={`Remove ${labelOf(s)}`}
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
              // At the max the input stays focusable (read-only), so picking the last allowed value never drops focus
              // to <body>; Backspace still removes the last chip and the chips' remove buttons stay reachable.
              disabled={disabled}
              readOnly={full}
              aria-readonly={full || undefined}
              onChange={(e) => {
                if (full) return;
                setQuery(e.target.value);
                onQueryChange?.(e.target.value);
                setOpen(true);
                setActive(0);
              }}
              // The list opens on a pointer press, on typing and on ArrowDown — never on focus alone, so tabbing in or a
              // programmatic focus (an error moving focus to the field) leaves the layout as it is.
              onPointerDown={() => { if (!full && !disabled) setOpen(true); }}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
            />
            {clearable && query && !disabled && (
              // mouse convenience; keyboard users empty the field (the value clears on blur)
              <button
                type="button"
                tabIndex={-1}
                className={styles.clear}
                aria-label="Clear"
                onMouseDown={(e) => e.preventDefault()}
                onClick={clear}
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
          {open && (
            <ul ref={listRef} id={listId} role="listbox" className={styles.list} aria-multiselectable={multiple || undefined}>
              {loading && <li className={styles.empty} role="status">Searching…</li>}
              {items.length === 0 && !loading && <li className={styles.empty}>{emptyText}</li>}
              {items.map((item, i) => {
                const on = item.kind === "option" && !multiple && item.option.value === single && single !== "";
                return (
                  <li
                    key={item.kind === "option" ? `o-${item.option.value}` : `c-${item.text}`}
                    id={optionId(i)}
                    data-index={i}
                    role="option"
                    aria-selected={on}
                    data-active={i === active || undefined}
                    className={[styles.option, item.kind === "create" ? styles.create : ""].join(" ")}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(item)}
                  >
                    {item.kind === "create" ? (
                      <span>{createLabel(item.text)}</span>
                    ) : (
                      <span className={styles.optionText}>
                        <span><Highlight text={item.option.label} query={hl} /></span>
                        {(item.option.description || item.keyword) && (
                          <span className={styles.optionDescription}>
                            {item.option.description && <Highlight text={item.option.description} query={item.keyword ? "" : hl} />}
                            {item.option.description && item.keyword && " · "}
                            {item.keyword && <Highlight text={item.keyword} query={hl} />}
                          </span>
                        )}
                      </span>
                    )}
                    {on && <Icon name="check" size={16} />}
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
