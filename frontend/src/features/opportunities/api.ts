import { api } from "@/lib/api";
import type { Salary } from "@/lib/money";
import { kzDate } from "@/features/company-vacancies/api";
import {
  toSearchParams, type OpportunityCompanyDetail, type OpportunityDetail, type OpportunityItem, type OpportunityPage, type OpportunityQuery,
} from "./model";

/* Typed calls for specs/004-student-opportunities/contracts/opportunities-api.md + pure API -> view-model mapping. */

export type ApiOpportunity = {
  id: number;
  title: string;
  type: string;
  field: string;
  city: string;
  format: string;
  duration: string | null;
  salary: Salary | null;
  apply_by: string;
  published_at: string;
  required_skills: string[];
  nice_skills: string[];
  company: { name: string };
};

export type ApiOpportunityDetail = Omit<ApiOpportunity, "company"> & { description: string; company: OpportunityCompanyDetail };
export type ApiOpportunityPage = { items: ApiOpportunity[]; total: number; page: number; page_size: number };

const PATH = "/api/student/opportunities";

/** The query's own address is its cache key: two equal searches share one entry. */
export const opportunitiesKey = (query: OpportunityQuery) => ["opportunities", toSearchParams(query).toString()] as const;
export const opportunityKey = (id: string) => ["opportunity", id] as const;

function common(o: Omit<ApiOpportunity, "company">): Omit<OpportunityItem, "company"> {
  return {
    id: String(o.id),
    title: o.title,
    type: o.type,
    field: o.field,
    city: o.city,
    format: o.format,
    duration: o.duration,
    salary: o.salary,
    applyBy: o.apply_by,
    publishedOn: kzDate(o.published_at),
    requiredSkills: o.required_skills,
    niceSkills: o.nice_skills,
  };
}

export async function listOpportunities(query: OpportunityQuery, signal?: AbortSignal): Promise<OpportunityPage> {
  const params = toSearchParams(query).toString();
  const page = await api<ApiOpportunityPage>(params ? `${PATH}?${params}` : PATH, { signal });
  return {
    items: page.items.map((o) => ({ ...common(o), company: { name: o.company.name } })),
    total: page.total,
    page: page.page,
    pageSize: page.page_size,
  };
}

export async function getOpportunity(id: string, signal?: AbortSignal): Promise<OpportunityDetail> {
  const o = await api<ApiOpportunityDetail>(`${PATH}/${id}`, { signal });
  return { ...common(o), description: o.description, company: o.company };
}
