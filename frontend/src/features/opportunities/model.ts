import type { Salary } from "@/lib/money";
import { formatDay, formatDayYear, type Catalog, type CatalogOption } from "@/features/company-vacancies/model";

/*
 * View-model of the student opportunities (what the views render). The page containers map the API
 * (contracts/opportunities-api.md) onto these types: snake_case → camelCase, ids → strings.
 * Pure helpers only — no fetching, no URL objects (the page reads / writes the address with parseQuery / toSearchParams).
 */

export type { Catalog, CatalogOption };

/** Catalog of vacancy values (types, fields, cities, formats) + the company values the details page shows. */
export type OpportunityCatalog = Catalog & { industries: CatalogOption[]; companySizes: CatalogOption[] };

export const EMPTY_CATALOG: OpportunityCatalog = { types: [], fields: [], cities: [], formats: [], currencies: [], industries: [], companySizes: [] };

/** What the student filters by: Internship · Vacancy (Full-time + Part-time) · Research. "" = All. */
export type OpportunityKind = "" | "internship" | "vacancy" | "research";
export type OpportunitySort = "newest" | "closing";

export const KIND_OPTIONS: { value: OpportunityKind; label: string }[] = [
  { value: "", label: "All" },
  { value: "internship", label: "Internships" },
  { value: "vacancy", label: "Vacancies" },
  { value: "research", label: "Research" },
];

export const SORT_OPTIONS: { value: OpportunitySort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "closing", label: "Closing soon" },
];

export const PAGE_SIZE = 10;
/** Upper bound for a page taken from the address: far past any real list, the server clamps it to the last page. */
export const MAX_PAGE = 1_000_000;

/** Everything the list address carries (R7). Defaults are left out of the address. */
export type OpportunityQuery = {
  q: string;
  type: OpportunityKind;
  format: string[];
  city: string[];
  field: string[];
  sort: OpportunitySort;
  page: number;
};

export const DEFAULT_QUERY: OpportunityQuery = { q: "", type: "", format: [], city: [], field: [], sort: "newest", page: 1 };

/** Is anything narrowing the list? (sort and page do not narrow it) */
export const hasFilters = (q: OpportunityQuery) => Boolean(q.q.trim() || q.type || q.format.length || q.city.length || q.field.length);

/** Number of side-filter values picked (the "Filters (n)" button). */
export const filterCount = (q: OpportunityQuery) => q.format.length + q.city.length + q.field.length;

/** Address → query. Unknown values are dropped using the catalog (R8); a bad page falls back to 1. */
export function parseQuery(params: URLSearchParams, catalog: OpportunityCatalog): OpportunityQuery {
  const known = (all: string[], options: CatalogOption[]) => {
    const values = new Set(options.map((o) => o.value));
    return [...new Set(all)].filter((v) => values.has(v));
  };
  const type = params.get("type") as OpportunityKind;
  const sort = params.get("sort") as OpportunitySort;
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  return {
    q: (params.get("q") ?? "").slice(0, 120),
    type: KIND_OPTIONS.some((o) => o.value && o.value === type) ? type : "",
    format: known(params.getAll("format"), catalog.formats),
    city: known(params.getAll("city"), catalog.cities),
    field: known(params.getAll("field"), catalog.fields),
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? sort : "newest",
    page: Number.isFinite(page) && page > 1 ? Math.min(page, MAX_PAGE) : 1,
  };
}

/** Query → address; defaults are left out so the plain list has a plain address. */
export function toSearchParams(query: OpportunityQuery, into = new URLSearchParams()): URLSearchParams {
  for (const key of ["q", "type", "format", "city", "field", "sort", "page"]) into.delete(key);
  if (query.q.trim()) into.set("q", query.q.trim());
  if (query.type) into.set("type", query.type);
  for (const key of ["format", "city", "field"] as const) query[key].forEach((v) => into.append(key, v));
  if (query.sort !== "newest") into.set("sort", query.sort);
  if (query.page > 1) into.set("page", String(query.page));
  return into;
}

export type OpportunityCompany = { name: string };

/** One row of the list (GET /api/student/opportunities → items[]). */
export type OpportunityItem = {
  id: string;
  title: string;
  /** catalog values */
  type: string;
  field: string;
  city: string;
  format: string;
  duration: string | null;
  /** monthly amounts + currency; null = none */
  salary: Salary | null;
  /** ISO date YYYY-MM-DD, the deadline */
  applyBy: string;
  /** ISO date YYYY-MM-DD */
  publishedOn: string;
  requiredSkills: string[];
  niceSkills: string[];
  company: OpportunityCompany;
};

export type OpportunityCompanyDetail = {
  name: string;
  industry: string | null;
  size: string | null;
  city: string | null;
  website: string | null;
  description: string | null;
};

/** The details page (GET /api/student/opportunities/{id}). */
export type OpportunityDetail = Omit<OpportunityItem, "company"> & {
  description: string;
  company: OpportunityCompanyDetail;
};

export type OpportunityPage = { items: OpportunityItem[]; total: number; page: number; pageSize: number };

/* ── Dates (today is passed in, so views and tests are deterministic) ───────────── */

const DAY = 86_400_000;
const utc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Whole days from `today` to `iso` (negative = in the past). */
export const daysUntil = (iso: string, today: string) => Math.round((utc(iso) - utc(today)) / DAY);

/** Last days that get the calm emphasis. */
export const SOON_DAYS = 7;

export type DeadlineInfo = { label: string; soon: boolean };

/**
 * The deadline line, one rule for cards and details (content.md: "30 Nov", digits, no countdown shouting):
 * more than a week → "Apply by 15 Dec" · the last week → "Closes in 3 days" / "Closes tomorrow" / "Closes today".
 * `long` adds the year and, in the last week, the date: "Apply by 15 Dec 2026" · "Closes in 3 days · 27 Nov".
 */
export function deadlineInfo(applyBy: string, today: string, long = false): DeadlineInfo {
  const days = daysUntil(applyBy, today);
  if (days > SOON_DAYS) return { label: `Apply by ${long ? formatDayYear(applyBy) : formatDay(applyBy)}`, soon: false };
  const when = days <= 0 ? "Closes today" : days === 1 ? "Closes tomorrow" : `Closes in ${days} days`;
  return { label: long && days > 1 ? `${when} · ${formatDay(applyBy)}` : when, soon: true };
}

/** "today", "yesterday", "3 days ago" up to 7 days, then a date (content.md). */
export function postedAgo(publishedOn: string, today: string): string {
  const days = -daysUntil(publishedOn, today);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days <= 7) return `Posted ${days} days ago`;
  return `Posted ${formatDay(publishedOn)}`;
}

export const pluralOpportunities = (n: number) => `${n} ${n === 1 ? "opportunity" : "opportunities"}`;

/** Position of the first and last shown item: "11–20 of 24". */
export const rangeText = (p: OpportunityPage) =>
  p.total === 0 ? "" : `${(p.page - 1) * p.pageSize + 1}–${Math.min(p.total, p.page * p.pageSize)} of ${p.total}`;
