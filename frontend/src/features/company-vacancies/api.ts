import { api } from "@/lib/api";
import type { Catalog, ClosedBy, StatusCounts, StatusFilter, VacancyAction, VacancyDraft, VacancyItem, VacancyStatus } from "./model";

/* Typed calls for specs/002-employer-vacancies/contracts/vacancies-api.md + pure API <-> view-model mapping. */

export type ApiVacancy = {
  id: number;
  title: string;
  type: string | null;
  field: string | null;
  city: string | null;
  format: string | null;
  description: string | null;
  duration: string | null;
  salary: string | null;
  apply_by: string | null;
  closes_at: string | null;
  required_skills: string[];
  nice_skills: string[];
  status: VacancyStatus;
  published_at: string | null;
  closed_at: string | null;
  closed_by: ClosedBy | null;
  applicants: number;
  new_applicants: number;
  version: number;
  created_at: string;
  updated_at: string;
};

export type VacancyInput = {
  title: string;
  type: string | null;
  field: string | null;
  city: string | null;
  format: string | null;
  description: string | null;
  duration: string | null;
  salary: string | null;
  apply_by: string | null;
  required_skills: string[];
  nice_skills: string[];
};

export type ApiCatalog = { types: Catalog["types"]; fields: Catalog["fields"]; cities: Catalog["cities"]; formats: Catalog["formats"] };
export type ListResponse = { items: ApiVacancy[]; counts: StatusCounts };
export type VacancyList = { items: VacancyItem[]; counts: StatusCounts };
export type StatusBody = { action: Exclude<VacancyAction, "delete">; version: number; apply_by?: string };

export const catalogKey = ["catalog"] as const;
export const skillsKey = (q: string) => ["skills", q] as const;
export const vacanciesKey = (status: StatusFilter, q: string) => ["vacancies", status, q] as const;
export const vacancyKey = (id: string) => ["vacancy", id] as const;

const UTC_PLUS_5_MS = 5 * 3_600_000;

/** Calendar date (YYYY-MM-DD) of an instant in Kazakhstan time (UTC+5), the product's day boundary. */
export function kzDate(instant: Date | string): string {
  return new Date(new Date(instant).getTime() + UTC_PLUS_5_MS).toISOString().slice(0, 10);
}

export function toVacancyItem(v: ApiVacancy): VacancyItem {
  return {
    id: String(v.id),
    title: v.title,
    type: v.type,
    field: v.field,
    city: v.city,
    format: v.format,
    description: v.description,
    duration: v.duration,
    salary: v.salary,
    applyBy: v.apply_by,
    requiredSkills: v.required_skills,
    niceSkills: v.nice_skills,
    status: v.status,
    // closed on its deadline: `closed_at` is the instant the deadline day ended (00:00 of the next day, UTC+5), but the
    // employer thinks of the deadline day itself ("Closed on its deadline, 15 Oct")
    closedOn: v.closed_by === "deadline" && v.apply_by ? v.apply_by : v.closed_at ? kzDate(v.closed_at) : null,
    closedBy: v.closed_by,
    applicants: v.applicants,
    newApplicants: v.new_applicants,
    version: v.version,
    updatedOn: kzDate(v.updated_at),
  };
}

const orNull = (s: string): string | null => (s.trim() === "" ? null : s);

export function toVacancyInput(d: VacancyDraft): VacancyInput {
  return {
    title: d.title.trim(),
    type: orNull(d.type),
    field: orNull(d.field),
    city: orNull(d.city),
    format: orNull(d.format),
    description: orNull(d.description),
    duration: orNull(d.duration),
    salary: orNull(d.salary),
    apply_by: orNull(d.applyBy),
    required_skills: d.requiredSkills,
    nice_skills: d.niceSkills,
  };
}

export const toCatalog = (c: ApiCatalog): Catalog => ({ types: c.types, fields: c.fields, cities: c.cities, formats: c.formats });

const BASE = "/api/company/vacancies";

export const catalog = async (): Promise<Catalog> => toCatalog(await api<ApiCatalog>("/api/catalog"));

export const skills = async (q: string): Promise<string[]> =>
  (await api<{ skills: string[] }>(`/api/skills?q=${encodeURIComponent(q)}`)).skills;

export async function list(status: StatusFilter, q: string): Promise<VacancyList> {
  const params = new URLSearchParams({ status });
  if (q.trim()) params.set("q", q.trim());
  const res = await api<ListResponse>(`${BASE}?${params}`);
  return { items: res.items.map(toVacancyItem), counts: res.counts };
}

export const get = async (id: string): Promise<VacancyItem> => toVacancyItem(await api<ApiVacancy>(`${BASE}/${id}`));

export const create = async (draft: VacancyDraft, publish: boolean): Promise<VacancyItem> =>
  toVacancyItem(await api<ApiVacancy>(BASE, { method: "POST", json: { ...toVacancyInput(draft), publish } }));

export const update = async (id: string, draft: VacancyDraft, version: number): Promise<VacancyItem> =>
  toVacancyItem(await api<ApiVacancy>(`${BASE}/${id}`, { method: "PUT", json: { ...toVacancyInput(draft), version } }));

/** `applyBy` is sent only (and always) for `reopen`. */
export const changeStatus = async (id: string, action: StatusBody["action"], version: number, applyBy?: string): Promise<VacancyItem> => {
  const body: StatusBody = { action, version, ...(action === "reopen" ? { apply_by: applyBy ?? "" } : {}) };
  return toVacancyItem(await api<ApiVacancy>(`${BASE}/${id}/status`, { method: "POST", json: body }));
};

export const remove = (id: string, version: number) => api<void>(`${BASE}/${id}?version=${version}`, { method: "DELETE" });
