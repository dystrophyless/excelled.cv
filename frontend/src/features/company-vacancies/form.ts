import { ApiError } from "@/lib/api";
import { toVacancyItem, type ApiVacancy } from "./api";
import type { Catalog, DraftErrors, DraftField, VacancyItem, VacancyRoutes } from "./model";

/* Shared by NewVacancyPage and EditVacancyPage: API error → form messages. */

export const EMPTY_CATALOG: Catalog = { types: [], fields: [], cities: [], formats: [] };

export const ROUTES: VacancyRoutes = {
  list: "/company/vacancies",
  create: "/company/vacancies/new",
  view: (id) => `/company/vacancies/${id}`,
  edit: (id) => `/company/vacancies/${id}/edit`,
};

export const TITLE_ERROR = "Enter a title of 3–120 characters";
export const DEADLINE_ERROR = "Choose today or a later date";

const FIELD_MESSAGE: Record<DraftField, string> = {
  title: TITLE_ERROR,
  type: "Choose a type",
  field: "Choose a field",
  city: "Choose a city",
  format: "Choose a format",
  description: "Add a description",
  applyBy: "Choose an Apply by date",
  requiredSkills: "Add at least one required skill",
};

/** The names the API uses in `incomplete.fields` (snake_case) → the form's field keys. */
const API_FIELD: Record<string, DraftField> = {
  title: "title", type: "type", field: "field", city: "city", format: "format", description: "description",
  apply_by: "applyBy", required_skills: "requiredSkills",
};

export const titleOk = (title: string) => title.trim().length >= 3 && title.trim().length <= 120;

export function errorsFor(fields: DraftField[]): DraftErrors {
  return Object.fromEntries(fields.map((f) => [f, FIELD_MESSAGE[f]])) as DraftErrors;
}

/** `incomplete.fields` of a 422, mapped to form fields (unknown names dropped, duplicates removed). */
export function incompleteFields(error: ApiError): DraftField[] {
  const raw = Array.isArray(error.detail?.fields) ? (error.detail.fields as unknown[]) : [];
  const mapped = raw.map((f) => API_FIELD[String(f)]).filter((f): f is DraftField => Boolean(f));
  return [...new Set(mapped)];
}

/** The current vacancy a `version_conflict` 409 carries, as a view-model item. */
export function conflictVacancy(error: ApiError): VacancyItem | null {
  const v = error.detail?.vacancy;
  return v && typeof v === "object" ? toVacancyItem(v as ApiVacancy) : null;
}

/** A 404 from the vacancy endpoints (missing id or another employer's vacancy — the API answers the same). */
export const isNotFound = (e: unknown): boolean => e instanceof ApiError && (e.code === "vacancy_not_found" || e.status === 404);

export const isApiError = (e: unknown, code: string): e is ApiError => e instanceof ApiError && e.code === code;
