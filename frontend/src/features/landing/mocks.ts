import type { VacancySkill } from "@/components/domain";

/* Sample content for the landing illustrations. Fictional names only: nothing here is a real person or company. */

/** The three kinds of opportunity, labelled as the student's Opportunities page filters them (Internships · Vacancies · Research). */
export type SampleKind = "Internship" | "Vacancy" | "Research";

export const SAMPLE_STUDENT = {
  name: "Aida Sarsen",
  education: "Software engineering · 3rd year",
  languages: "English, Kazakh",
  project: "Campus timetable app",
  skills: ["Python", "SQL", "Git", "FastAPI"],
};

export const SAMPLE_SKILLS = ["Python", "FastAPI", "SQL", "Git"];

export type SampleOpportunity = { id: string; title: string; company: string; kind: SampleKind; match: number };

export const SAMPLE_OPPORTUNITIES: SampleOpportunity[] = [
  { id: "s1", title: "Backend Intern", company: "Northwind Labs", kind: "Internship", match: 86 },
  { id: "s2", title: "Junior Data Analyst", company: "Birchwood Analytics", kind: "Vacancy", match: 62 },
  { id: "s3", title: "Research Assistant", company: "Lumen Institute", kind: "Research", match: 71 },
];

/** Skills of the featured sample (the internship) */
export const SAMPLE_REQUIREMENTS: VacancySkill[] = [
  { name: "Python", required: true }, { name: "SQL", required: true }, { name: "FastAPI", required: true },
  { name: "Docker", required: true }, { name: "Redis", required: false }, { name: "Git", required: false },
];

/** What the sample student typed into the search */
export const SAMPLE_SEARCH = "Python";

export const SAMPLE_COMPANY = { name: "Northwind Labs", line: "Company profile" };

export const SAMPLE_COMPANY_ROWS: { title: string; kind: SampleKind; status: "Open" | "Draft" | "Closed" }[] = [
  { title: "Backend Intern", kind: "Internship", status: "Open" },
  { title: "Junior Data Analyst", kind: "Vacancy", status: "Draft" },
  { title: "Research Assistant", kind: "Research", status: "Closed" },
];
