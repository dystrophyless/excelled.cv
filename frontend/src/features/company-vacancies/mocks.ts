import { SKILL_OPTIONS as SHARED_SKILLS } from "@/mocks/data";
import type {
  Catalog, DraftErrors, DraftField, StatusCounts, StatusFilter, VacancyDraft, VacancyItem, VacancyRoutes,
} from "./model";

/*
 * Mock data for the 002-employer-vacancies prototypes (fictional company, no real people).
 * "Today" is fixed so every state looks the same on every day.
 */

export const MOCK_TODAY = "2026-10-30";
export const MOCK_COMPANY = "Kaspi.kz";

export const CATALOG: Catalog = {
  types: [
    { value: "internship", label: "Internship" },
    { value: "full_time", label: "Full-time" },
    { value: "part_time", label: "Part-time" },
  ],
  fields: [
    { value: "backend", label: "Backend" }, { value: "frontend", label: "Frontend" }, { value: "mobile", label: "Mobile" },
    { value: "data", label: "Data" }, { value: "qa", label: "QA" }, { value: "design", label: "Design" },
    { value: "devops", label: "DevOps" }, { value: "product", label: "Product" }, { value: "other", label: "Other" },
  ],
  cities: [
    { value: "almaty", label: "Almaty" }, { value: "astana", label: "Astana" }, { value: "shymkent", label: "Shymkent" },
    { value: "karaganda", label: "Karaganda" }, { value: "aktobe", label: "Aktobe" }, { value: "other", label: "Other" },
  ],
  formats: [
    { value: "on_site", label: "On-site" }, { value: "hybrid", label: "Hybrid" }, { value: "remote", label: "Remote" },
  ],
};

export const SKILL_OPTIONS = SHARED_SKILLS;
export const SKILL_SUGGESTIONS = ["Python", "SQL", "Git", "Docker", "FastAPI"];

export const BASE = "/prototypes/002-employer-vacancies";
/** Prototype links carry the vacancy id and whether the applicant numbers are shown, so every screen agrees on the data. */
export const routesFor = (numbers = false): VacancyRoutes => ({
  list: `${BASE}/list${numbers ? "?state=with-applicants" : ""}`,
  create: `${BASE}/new`,
  view: (id) => `${BASE}/vacancy?id=${id}${numbers ? "&applicants=1" : ""}`,
  edit: (id) => `${BASE}/edit?id=${id}`,
});
export const ROUTES = routesFor();

const DESCRIPTION =
  "Join the Payments team and build services used by 14 million people every day.\nYou will ship real features with a mentor from week one: REST endpoints in FastAPI, SQL for reporting and code review in a friendly team.\nWe offer flexible hours around your studies and a full-time offer for the best interns.";

const base = (v: Partial<VacancyItem> & Pick<VacancyItem, "id" | "title" | "status">): VacancyItem => ({
  type: null, field: null, city: null, format: null, description: null, duration: null, salary: null, applyBy: null,
  requiredSkills: [], niceSkills: [], closedOn: null, closedBy: null, applicants: 0, newApplicants: 0, version: 1, updatedOn: "2026-10-28",
  ...v,
});

/** Applicant numbers the list shows once the applying feature exists. Today they are all 0. */
export const FUTURE_APPLICANTS: Record<string, [number, number]> = { v1: [48, 6], v2: [21, 2], v4: [14, 0], v5: [112, 0], v6: [37, 0] };

export const VACANCIES: VacancyItem[] = [
  base({
    id: "v1", title: "Backend Intern (Python)", status: "open", type: "internship", field: "backend", city: "almaty", format: "hybrid",
    description: DESCRIPTION, duration: "3 months", salary: "200 000 ₸ / month", applyBy: "2026-11-30",
    requiredSkills: ["Python", "SQL", "FastAPI", "Docker"], niceSkills: ["Redis", "Git"], version: 3, updatedOn: "2026-10-28",
  }),
  base({
    id: "v2", title: "iOS Developer Intern", status: "open", type: "internship", field: "mobile", city: "almaty", format: "on_site",
    description: "Build and polish screens of the Kaspi mobile app with a senior iOS engineer.", duration: "3 months", salary: "180 000 ₸ / month",
    applyBy: "2026-11-20", requiredSkills: ["Swift", "Git"], niceSkills: ["Figma"], version: 2, updatedOn: "2026-10-26",
  }),
  base({
    id: "v3", title: "Junior Data Engineer", status: "draft", type: "full_time", field: "data", city: "astana",
    requiredSkills: ["Python", "SQL"], updatedOn: "2026-10-29",
  }),
  base({
    id: "v4", title: "QA Automation Intern", status: "paused", type: "internship", field: "qa", city: "astana", format: "hybrid",
    description: "Write automated tests for payment flows and report what you find.", duration: "4 months", applyBy: "2026-12-15",
    requiredSkills: ["Python", "SQL"], niceSkills: ["Linux"], version: 4, updatedOn: "2026-10-24",
  }),
  base({
    id: "v5", title: "Product Design Intern", status: "closed", type: "internship", field: "design", city: "almaty", format: "remote",
    description: "Design flows and prototypes for the merchant app.", duration: "3 months", applyBy: "2026-11-15",
    requiredSkills: ["Figma", "UX research"], niceSkills: ["English"], closedOn: "2026-10-22", closedBy: "employer", version: 5, updatedOn: "2026-10-22",
  }),
  base({
    id: "v6", title: "Python Developer (part-time)", status: "closed", type: "part_time", field: "backend", city: "astana", format: "remote",
    description: "Maintain internal services in FastAPI, 20 hours a week.", salary: "250 000 ₸ / month", applyBy: "2026-10-15",
    requiredSkills: ["Python", "FastAPI"], niceSkills: ["Git", "Linux"], closedOn: "2026-10-15", closedBy: "deadline", version: 3, updatedOn: "2026-10-15",
  }),
  base({ id: "v7", title: "Frontend Intern (React)", status: "draft", updatedOn: "2026-10-20" }),
];

export const withApplicants = (items: VacancyItem[]): VacancyItem[] =>
  items.map((v) => {
    const f = FUTURE_APPLICANTS[v.id];
    return f ? { ...v, applicants: f[0], newApplicants: f[1] } : v;
  });

export const byId = (id: string) => VACANCIES.find((v) => v.id === id) as VacancyItem;

/** What the API does for GET /api/company/vacancies: filter by group and title, counts ignore both. */
export function filterItems(items: VacancyItem[], status: StatusFilter, q: string): VacancyItem[] {
  const needle = q.trim().toLowerCase();
  return items.filter((v) => (status === "all" || v.status === status) && v.title.toLowerCase().includes(needle));
}

export function countsOf(items: VacancyItem[]): StatusCounts {
  const n = (s: VacancyItem["status"]) => items.filter((v) => v.status === s).length;
  return { all: items.length, open: n("open"), draft: n("draft"), paused: n("paused"), closed: n("closed") };
}

/* ── Form values ─────────────────────────────────────────── */

export const EMPTY_DRAFT: VacancyDraft = {
  title: "", type: "", field: "", city: "", format: "", description: "", duration: "", salary: "", applyBy: "",
  requiredSkills: [], niceSkills: [],
};

export const COMPLETE_DRAFT: VacancyDraft = {
  title: "Backend Intern (Python)", type: "internship", field: "backend", city: "almaty", format: "hybrid",
  description: DESCRIPTION, duration: "3 months", salary: "200 000 ₸ / month", applyBy: "2026-11-30",
  requiredSkills: ["Python", "SQL", "FastAPI"], niceSkills: ["Docker"],
};

/** A half-finished post: enough for a draft, not for publishing. */
export const PARTIAL_DRAFT: VacancyDraft = {
  ...EMPTY_DRAFT, title: "Junior Data Engineer", type: "full_time", field: "data", city: "astana", requiredSkills: ["Python"],
};

export const PAST_DEADLINE = "2026-10-12";

/* ── Prototype helpers: what the server decides, faked locally ───────────── */


const REQUIRED_TO_PUBLISH: DraftField[] = ["title", "type", "field", "city", "format", "description", "applyBy", "requiredSkills"];

/** Which fields stop this draft from becoming Open (the API answers `incomplete` with the same list). */
export function missingFields(d: VacancyDraft, today = MOCK_TODAY): { fields: DraftField[]; errors: DraftErrors } {
  const errors: DraftErrors = {};
  for (const f of REQUIRED_TO_PUBLISH) {
    if (f === "title") { if (d.title.trim().length < 3) errors.title = "Enter a title of 3–120 characters"; }
    else if (f === "requiredSkills") { if (d.requiredSkills.length === 0) errors.requiredSkills = "Add at least one required skill"; }
    else if (f === "applyBy") {
      if (!d.applyBy) errors.applyBy = "Choose an Apply by date";
      else if (d.applyBy < today) errors.applyBy = "Choose today or a later date";
    } else if (!d[f].trim()) {
      errors[f] = { type: "Choose a type", field: "Choose a field", city: "Choose a city", format: "Choose a format", description: "Add a description" }[f];
    }
  }
  return { fields: REQUIRED_TO_PUBLISH.filter((f) => errors[f]), errors };
}

/** Same check for a stored vacancy (publish from the list or the vacancy page). */
export const missingOf = (v: VacancyItem) =>
  missingFields({
    title: v.title, type: v.type ?? "", field: v.field ?? "", city: v.city ?? "", format: v.format ?? "", description: v.description ?? "",
    duration: v.duration ?? "", salary: v.salary ?? "", applyBy: v.applyBy ?? "", requiredSkills: v.requiredSkills, niceSkills: v.niceSkills,
  });
