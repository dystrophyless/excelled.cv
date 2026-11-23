import { ApiError } from "@/lib/api";
import {
  DEGREE_MAX_YEAR, MAX_FIELDS, studentErrorKey, type CompanyErrors, type CompanyField, type CompanyValues, type StudentErrors,
  type StudentValues,
} from "./model";

/*
 * Page-side helpers shared by the profile pages: focus moves and error bookkeeping, copied from the approved prototype
 * (src/prototypes/003-profiles.tsx), and the 422 → field-error mapping (ui-spec §4).
 */

export const ROUTES = {
  studentOnboarding: "/onboarding",
  studentProfile: "/app/profile",
  studentEdit: "/app/profile/edit",
  companyOnboarding: "/company/onboarding",
  companyProfile: "/company/profile",
  vacancies: "/company/vacancies",
} as const;

/** After a refused step / save, focus the first invalid control (a fieldset hands focus to its first answer). */
export function focusInvalid() {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>('form [aria-invalid="true"]');
    if (!el) return;
    const target = el.tagName === "FIELDSET" ? el.querySelector<HTMLElement>('[tabindex="0"], input, button') : el;
    target?.focus();
  }, 0);
}

/** A new step announces itself: focus its h1 and scroll to the top. */
export function focusHeading() {
  window.setTimeout(() => {
    const h1 = document.querySelector<HTMLElement>("h1");
    if (!h1) return;
    h1.tabIndex = -1;
    h1.focus();
    window.scrollTo({ top: 0 });
  }, 0);
}

/** Clears the error of each field the user changes; a changed row list clears its rows' errors. */
export function withoutErrorsFor<E extends object>(e: E | undefined, patch: object): E | undefined {
  if (!e) return e;
  const next = { ...e } as Record<string, unknown>;
  for (const k of Object.keys(patch)) {
    for (const key of Object.keys(next)) if (key === k || key.startsWith(k + ".")) delete next[key];
  }
  return Object.keys(next).length ? (next as E) : undefined;
}

export const isApiError = (error: unknown, code?: string): error is ApiError =>
  error instanceof ApiError && (code === undefined || error.code === code);

/**
 * A 422 from POST / PUT /api/student/profile → the form's errors. The client check mirrors the API, so the field
 * usually already has a message for the value; otherwise the step's "choose / enter" copy from the ui-spec is used.
 */
export function studentErrorsFrom(error: unknown, values: StudentValues, clientErrors: StudentErrors): StudentErrors | undefined {
  if (!isApiError(error, "validation") || !error.validation?.length) return undefined;
  const out: StudentErrors = {};
  for (const item of error.validation) {
    const key = studentErrorKey(item.loc);
    if (!key || out[key]) continue;
    out[key] = clientErrors[key] ?? fallbackMessage(key, values);
  }
  return Object.keys(out).length ? out : undefined;
}

function fallbackMessage(key: keyof StudentErrors, values: StudentValues): string {
  const max = DEGREE_MAX_YEAR[values.degree];
  if (key.startsWith("projects.")) {
    return key.endsWith(".url") ? "Enter a link like github.com/you/project"
      : key.endsWith(".description") ? "Use 300 characters or fewer" : "Enter the project title";
  }
  if (key.startsWith("languages.")) return key.endsWith(".level") ? "Choose a level" : "Choose or enter a language";
  switch (key) {
    case "fullName": return "Enter your full name";
    case "university": return "Choose or enter your university";
    case "degree": return "Choose your degree";
    case "major": return "Choose or enter your major";
    case "studyYear": return max ? `Choose a year from 1 to ${max}, or Graduated` : "Choose your year of study";
    case "fields": return `Choose up to ${MAX_FIELDS} fields`;
    case "positionTypes": return "Choose at least one position type";
    case "about": return "Use 1000 characters or fewer";
    case "gpa": return "Enter a GPA from 0.00 to 4.00, like 3.45";
    case "phone":
    case "whatsapp": return "Enter a phone number like +7 701 123 45 67";
    case "telegram": return "Enter a username like @maya_a: 5–32 letters, digits or _";
    case "linkedin": return "Enter a link like linkedin.com/in/you";
    case "github": return "Enter a link like github.com/you";
    case "website": return "Enter a link like you.dev";
    default: return "Check this answer";
  }
}

const COMPANY_KEYS: Record<string, CompanyField> = {
  name: "name", industry: "industry", size: "size", website: "website", city: "city", description: "description",
};

/** A 422 from POST /api/company/profile → field errors (the client check mirrors the API; else the ui-spec copy). */
export function companyErrorsFrom(error: unknown, _values: CompanyValues, clientErrors: CompanyErrors): CompanyErrors | undefined {
  if (!isApiError(error, "validation") || !error.validation?.length) return undefined;
  const fallback: CompanyErrors = {
    name: "Enter the company name", industry: "Choose an industry", size: "Choose the company size",
    website: "Enter a website like kaspi.kz or https://kaspi.kz", description: "Use 1000 characters or fewer",
  };
  const out: CompanyErrors = {};
  for (const item of error.validation) {
    const key = typeof item.loc[1] === "string" ? COMPANY_KEYS[item.loc[1]] : undefined;
    if (key && !out[key]) out[key] = clientErrors[key] ?? fallback[key] ?? "Check this answer";
  }
  return Object.keys(out).length ? out : undefined;
}
