/*
 * Salary: monthly amounts "from" / "to" (either may be empty) in one currency.
 * One pure formatter for every place a salary is shown (student card and details, employer page, wizard preview),
 * plus the helpers the salary field and the forms share. No React, no fetching.
 * Rules: design-system/content.md → Money.
 */

/** What the API carries (contracts/opportunities-api.md): `null` = no salary. */
export type Salary = { min: number | null; max: number | null; currency: string };

/** One entry of `GET /api/catalog` → `currencies`. */
export type CurrencyOption = { value: string; label: string; symbol: string };

/** The form's text values: digits only, no spaces ("" = empty). */
export type SalaryDraft = { min: string; max: string; currency: string };

export const DEFAULT_CURRENCY = "KZT";
export const EMPTY_SALARY: SalaryDraft = { min: "", max: "", currency: DEFAULT_CURRENCY };

export const MAX_AMOUNT = 999_999_999;
/** Typing stops at 12 digits; anything above 9 is refused at the field, not silently cut. */
export const MAX_DIGITS = 12;

/** Non-breaking space: a grouped number and its symbol never split across lines. */
const NBSP = " ";

/** Symbols the interface knows; the catalog's own `symbol` wins when it is passed. `after`: ₸ and ₽ follow the amount, $ and € lead it. */
const CURRENCIES: Record<string, { symbol: string; after: boolean }> = {
  KZT: { symbol: "₸", after: true },
  USD: { symbol: "$", after: false },
  EUR: { symbol: "€", after: false },
  RUB: { symbol: "₽", after: true },
};

export const currencySymbol = (code: string, options?: CurrencyOption[]) =>
  options?.find((o) => o.value === code)?.symbol ?? CURRENCIES[code]?.symbol ?? code;

/** "1000000" → "1 000 000" (non-breaking spaces). Digits only in, grouped out. */
export const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

/** Everything that is not a digit removed: "1,000,000 ₸" → "1000000". Leading zeros go ("007" → "7", "000" → "0"). */
export function digitsOf(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, MAX_DIGITS);
  return digits.replace(/^0+(?=\d)/, "");
}

/** 1000000 → "1 000 000". */
export const formatAmount = (n: number) => groupDigits(String(Math.trunc(n)));

/**
 * The display text of a salary, or null when there is none:
 *   200 000 – 300 000 ₸ / month · From 200 000 ₸ / month · Up to 300 000 ₸ / month · 200 000 ₸ / month (equal)
 *   $2 000 – 3 000 / month · From €1 500 / month
 * Spaces inside numbers and before the symbol are non-breaking; only the spaces around the dash may wrap.
 */
export function formatSalary(salary: Salary | null | undefined, options?: CurrencyOption[]): string | null {
  if (!salary) return null;
  const { min, max, currency } = salary;
  if (min == null && max == null) return null;
  const sym = currencySymbol(currency, options);
  const after = CURRENCIES[currency]?.after ?? true;
  const one = (n: number) => (after ? `${formatAmount(n)}${NBSP}${sym}` : `${sym}${formatAmount(n)}`);
  const tail = `${NBSP}/${NBSP}month`;
  if (min != null && max != null) {
    if (min === max) return `${one(min)}${tail}`;
    // a range names the currency once: after the second amount (₸ ₽) or before the first ($ €)
    return after
      ? `${formatAmount(min)} – ${formatAmount(max)}${NBSP}${sym}${tail}`
      : `${sym}${formatAmount(min)} – ${formatAmount(max)}${tail}`;
  }
  return min != null ? `From${NBSP}${one(min)}${tail}` : `Up${NBSP}to${NBSP}${one(max as number)}${tail}`;
}

/* ── Form side ─────────────────────────────────────────── */

export const salaryToDraft = (s: Salary | null | undefined): SalaryDraft =>
  s ? { min: s.min == null ? "" : String(s.min), max: s.max == null ? "" : String(s.max), currency: s.currency || DEFAULT_CURRENCY } : EMPTY_SALARY;

const amountOf = (digits: string) => (digits === "" ? null : Number(digits));

/** Draft → API value; null when both amounts are empty (the currency alone is no salary). */
export function draftToSalary(d: SalaryDraft): Salary | null {
  const min = amountOf(d.min);
  const max = amountOf(d.max);
  return min == null && max == null ? null : { min, max, currency: d.currency || DEFAULT_CURRENCY };
}

export const AMOUNT_ERROR = "Enter a whole amount from 1 to 999 999 999";
export const RANGE_ERROR = "“From” can’t be more than “To”";

export type SalaryErrors = { min?: string; max?: string; range?: string };

const validAmount = (n: number | null) => n == null || (Number.isInteger(n) && n >= 1 && n <= MAX_AMOUNT);

/** Refusals shown at the field (FR-020): an amount outside 1–999 999 999, or "from" above "to". */
export function validateSalary(d: SalaryDraft): SalaryErrors {
  const min = amountOf(d.min);
  const max = amountOf(d.max);
  const errors: SalaryErrors = {};
  if (!validAmount(min)) errors.min = AMOUNT_ERROR;
  if (!validAmount(max)) errors.max = AMOUNT_ERROR;
  if (!errors.min && !errors.max && min != null && max != null && min > max) errors.range = RANGE_ERROR;
  return errors;
}

/** The one message the group shows (amounts first, then the range), or undefined. */
export const salaryMessage = (d: SalaryDraft): string | undefined => {
  const e = validateSalary(d);
  return e.min ?? e.max ?? e.range;
};
