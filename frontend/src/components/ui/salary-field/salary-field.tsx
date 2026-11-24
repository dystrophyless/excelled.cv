import { useId, type ChangeEvent } from "react";
import { Icon } from "@/components/icons";
import { digitsOf, groupDigits, validateSalary, type CurrencyOption, type SalaryDraft } from "@/lib/money";
import fieldStyles from "../field/field.module.css";
import { SelectField } from "../field";
import styles from "./salary-field.module.css";

/*
 * SalaryField — monthly salary as "From – To" amounts and a currency, in one row (design-system/components.md → Forms).
 * A group (fieldset + legend) of two text inputs with digit grouping and a custom select: no number spinners, no native select.
 *
 * The inputs hold digits only in the model (`value.min = "1000000"`) and show them grouped ("1 000 000"). Typing, deleting
 * anywhere (also over a space), and pasting "1,000,000 ₸" keep the caret after the same digit. Numeric keyboard on mobile.
 * Wide: one row; narrow (< 452px): From, To and currency on separate lines. One message line for the group (hint, or the error that replaces it); the offending amounts are marked aria-invalid.
 */

export type SalaryFieldProps = {
  label: string;
  hint?: string;
  /** Message that replaces the hint; the inputs it concerns are marked invalid (an amount outside 1–999 999 999, or from > to) */
  error?: string;
  optional?: boolean;
  value: SalaryDraft;
  onChange: (next: SalaryDraft) => void;
  currencies: CurrencyOption[];
  name?: string;
  "data-testid"?: string;
};

type AmountProps = {
  label: string;
  value: string;
  onValue: (digits: string) => void;
  invalid?: boolean;
  describedBy?: string;
  name?: string;
};

/** Index in `formatted` right after the n-th digit (0 = before everything). */
function caretAfterDigits(formatted: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]) && ++seen === n) return i + 1;
  }
  return formatted.length;
}

function AmountInput({ label, value, onValue, invalid, describedBy, name }: AmountProps) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const type = (e.nativeEvent as InputEvent).inputType ?? "";
    const raw = el.value;
    const pos = el.selectionStart ?? raw.length;
    let digits = digitsOf(raw);
    let before = raw.slice(0, pos).replace(/\D/g, "").length;

    // Backspace / Delete over a separator removes no digit in the text: remove the neighbouring digit instead
    if (digits === value && digits !== "") {
      if (type === "deleteContentBackward" && before > 0) { digits = value.slice(0, before - 1) + value.slice(before); before -= 1; }
      else if (type === "deleteContentForward" && before < value.length) { digits = value.slice(0, before) + value.slice(before + 1); }
      digits = digitsOf(digits);
    }

    const formatted = groupDigits(digits);
    el.value = formatted;
    const at = caretAfterDigits(formatted, Math.min(before, digits.length));
    el.setSelectionRange(at, at);
    onValue(digits);
  };

  return (
    <div className={styles.amountBox}>
      <span className={styles.prefix} aria-hidden="true">{label}</span>
      <input
        className={`${fieldStyles.control} ${styles.amount}`}
        data-size="md"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="next"
        // a blank placeholder keeps the kit's empty / filled look (:placeholder-shown); the visible word is the prefix
        placeholder=" "
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        name={name}
        value={groupDigits(value)}
        onChange={onChange}
      />
    </div>
  );
}

export function SalaryField({ label, hint, error, optional, value, onChange, currencies, name, ...rest }: SalaryFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;
  const problems = error ? validateSalary(value) : {};
  // "from > to" marks both amounts
  const minBad = Boolean(error) && Boolean(problems.min ?? problems.range);
  const maxBad = Boolean(error) && Boolean(problems.max ?? problems.range);
  const options = currencies.map((c) => ({ value: c.value, label: `${c.symbol} ${c.value}`, description: c.label }));
  const describedBy = message ? messageId : undefined;

  return (
    <fieldset className={styles.group} aria-describedby={describedBy} data-testid={rest["data-testid"]}>
      <legend className={`${fieldStyles.label} ${styles.legend}`}>
        {label}
        {optional && <span className={fieldStyles.optional}>(optional)</span>}
      </legend>
      <div className={styles.body}>
      <div className={styles.row}>
        <AmountInput label="From" name={name && `${name}Min`} value={value.min} invalid={minBad} describedBy={describedBy} onValue={(min) => onChange({ ...value, min })} />
        <AmountInput label="To" name={name && `${name}Max`} value={value.max} invalid={maxBad} describedBy={describedBy} onValue={(max) => onChange({ ...value, max })} />
        <SelectField
          className={styles.currency}
          label="Currency"
          hideLabel
          name={name && `${name}Currency`}
          options={options}
          value={value.currency}
          onChange={(currency) => onChange({ ...value, currency })}
        />
      </div>
      </div>
      {error ? (
        <span id={messageId} className={fieldStyles.error} role="alert">
          <Icon name="error" className={fieldStyles.errorIcon} size={16} />
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className={fieldStyles.hint}>{hint}</span>
      ) : null}
    </fieldset>
  );
}
