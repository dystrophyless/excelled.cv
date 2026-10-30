import { createElement as h } from "react";
import type { ApplicationStatus, CandidateSummary, VacancySummary } from "@/components/domain";
import type { NotificationItem } from "@/components/ui";

/*
 * Mock data for styleguide templates and prototypes (/prototypes/*).
 * Realistic Kazakhstan context, EN copy. Never put real people's data here.
 */

export const STUDENT_SKILLS = ["Python", "FastAPI", "SQL", "Git", "PostgreSQL", "English"];

export const SKILL_OPTIONS = [
  "Python", "FastAPI", "Django", "SQL", "PostgreSQL", "Docker", "Redis", "Git", "Linux", "JavaScript", "TypeScript",
  "React", "Node.js", "Java", "Spring", "Kotlin", "Swift", "C++", "Go", "Figma", "UX research", "Data analysis",
  "Excel", "Power BI", "Pandas", "Machine learning", "Statistics", "English", "Kazakh", "Russian", "Public speaking",
];

export const UNIVERSITIES = [
  "Suleyman Demirel University", "Nazarbayev University", "KBTU", "Astana IT University", "Satbayev University",
  "Al-Farabi Kazakh National University", "KIMEP University", "Narxoz University",
];

export const CITIES = ["Almaty", "Astana", "Shymkent", "Karaganda", "Aktobe"];

export const VACANCIES: VacancySummary[] = [
  {
    id: "v1", title: "Backend Intern (Python)", company: "Kaspi.kz", field: "Backend", type: "Internship", location: "Almaty", format: "Hybrid",
    duration: "3 months", salary: "200 000 ₸ / month", postedAgo: "2 days ago", match: 86,
    skills: [
      { name: "Python", required: true }, { name: "SQL", required: true }, { name: "FastAPI", required: true },
      { name: "Docker", required: true }, { name: "Redis", required: false }, { name: "Git", required: false },
    ],
  },
  {
    id: "v2", title: "Data Analyst Intern", company: "Halyk Bank", field: "Data", type: "Internship", location: "Almaty", format: "On-site",
    duration: "6 months", postedAgo: "5 days ago", match: 62,
    skills: [
      { name: "SQL", required: true }, { name: "Excel", required: true }, { name: "Power BI", required: true },
      { name: "Python", required: false }, { name: "Statistics", required: false },
    ],
  },
  {
    id: "v3", title: "Junior Frontend Developer", company: "Kolesa Group", field: "Frontend", type: "Full-time", location: "Almaty", format: "Remote",
    salary: "450 000 ₸ / month", postedAgo: "1 week ago", match: 38,
    skills: [
      { name: "TypeScript", required: true }, { name: "React", required: true }, { name: "Git", required: true },
      { name: "Figma", required: false },
    ],
  },
  {
    id: "v4", title: "QA Engineer Intern", company: "EPAM Kazakhstan", field: "QA", type: "Internship", location: "Astana", format: "Hybrid",
    duration: "4 months", postedAgo: "3 days ago", match: 71,
    skills: [
      { name: "Python", required: true }, { name: "SQL", required: true }, { name: "Linux", required: false },
      { name: "English", required: true },
    ],
  },
  {
    id: "v5", title: "iOS Developer Intern", company: "Chocofamily", field: "Mobile", type: "Internship", location: "Almaty", format: "On-site",
    duration: "3 months", salary: "180 000 ₸ / month", postedAgo: "4 days ago", match: 28,
    skills: [{ name: "Swift", required: true }, { name: "Git", required: true }, { name: "Figma", required: false }],
  },
  {
    id: "v6", title: "Junior Data Engineer", company: "Beeline Kazakhstan", field: "Data", type: "Full-time", location: "Astana", format: "Hybrid",
    salary: "500 000 ₸ / month", postedAgo: "6 days ago", match: 74,
    skills: [{ name: "Python", required: true }, { name: "SQL", required: true }, { name: "PostgreSQL", required: true }, { name: "Docker", required: false }],
  },
  {
    id: "v7", title: "Product Design Intern", company: "inDrive", field: "Design", type: "Internship", location: "Almaty", format: "Remote",
    duration: "3 months", postedAgo: "1 day ago", match: 22,
    skills: [{ name: "Figma", required: true }, { name: "UX research", required: true }, { name: "English", required: false }],
  },
  {
    id: "v8", title: "Python Developer (part-time)", company: "Jusan Bank", field: "Backend", type: "Part-time", location: "Astana", format: "Remote",
    salary: "250 000 ₸ / month", postedAgo: "2 weeks ago", match: 81,
    skills: [{ name: "Python", required: true }, { name: "FastAPI", required: true }, { name: "Git", required: false }, { name: "Linux", required: false }],
  },
];

export type StudentApplication = {
  id: string;
  vacancy: VacancySummary;
  status: ApplicationStatus;
  updatedAgo: string;
  /** Next step shown under the title */
  note?: string;
};

export const APPLICATIONS: StudentApplication[] = [
  { id: "a1", vacancy: VACANCIES[0], status: "interview", updatedAgo: "today", note: "Interview Tue, 4 Nov · 14:00 · Google Meet" },
  { id: "a2", vacancy: VACANCIES[3], status: "viewed", updatedAgo: "yesterday" },
  { id: "a3", vacancy: VACANCIES[1], status: "applied", updatedAgo: "3 days ago" },
  { id: "a4", vacancy: VACANCIES[2], status: "rejected", updatedAgo: "1 week ago" },
];

export const CANDIDATES: CandidateSummary[] = [
  { id: "c1", name: "Maya Akhmetova", university: "SDU", year: "3rd year", match: 86, skills: ["Python", "FastAPI", "SQL"], appliedAgo: "2h ago", status: "applied" },
  { id: "c2", name: "Daniyar Seitkali", university: "KBTU", year: "4th year", match: 79, skills: ["Python", "Docker", "SQL"], appliedAgo: "1 day ago", status: "applied" },
  { id: "c3", name: "Aigerim Nurlanovna", university: "NU", year: "Graduate", match: 92, skills: ["Python", "FastAPI", "Redis"], appliedAgo: "2 days ago", status: "shortlisted" },
  { id: "c4", name: "Timur Abenov", university: "AITU", year: "3rd year", match: 64, skills: ["Python", "Git"], appliedAgo: "3 days ago", status: "shortlisted" },
  { id: "c5", name: "Dana Sultanova", university: "SDU", year: "4th year", match: 88, skills: ["Python", "SQL", "Docker"], appliedAgo: "4 days ago", status: "interview" },
  { id: "c6", name: "Arman Kassym", university: "Satbayev", year: "Graduate", match: 81, skills: ["Python", "FastAPI"], appliedAgo: "1 week ago", status: "offer" },
];

export type EmployerVacancy = {
  id: string;
  title: string;
  type: VacancySummary["type"];
  status: "open" | "draft" | "closed";
  applicants: number;
  newApplicants: number;
  postedAt: string;
  deadline: string;
};

export const EMPLOYER_VACANCIES: EmployerVacancy[] = [
  { id: "v1", title: "Backend Intern (Python)", type: "Internship", status: "open", applicants: 48, newApplicants: 6, postedAt: "2026-10-28", deadline: "2026-11-30" },
  { id: "v5", title: "iOS Developer Intern", type: "Internship", status: "open", applicants: 21, newApplicants: 2, postedAt: "2026-10-20", deadline: "2026-11-20" },
  { id: "v6", title: "Junior Data Engineer", type: "Full-time", status: "draft", applicants: 0, newApplicants: 0, postedAt: "—", deadline: "—" },
  { id: "v7", title: "Product Design Intern", type: "Internship", status: "closed", applicants: 112, newApplicants: 0, postedAt: "2026-08-01", deadline: "2026-09-01" },
];

const b = (text: string) => h("strong", null, text);

export const STUDENT_NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", icon: "interview", tone: "warning", group: "Today", unread: true, time: "2h ago", to: "/app/applications",
    title: h("span", null, b("Kaspi.kz"), " invited you to an interview"), detail: "Backend Intern (Python) · Tue, 4 Nov · 14:00" },
  { id: "n2", icon: "show", tone: "accent", group: "Today", unread: true, time: "5h ago", to: "/app/applications",
    title: h("span", null, b("EPAM Kazakhstan"), " viewed your application"), detail: "QA Engineer Intern" },
  { id: "n3", icon: "match", tone: "success", group: "Earlier", time: "2 days ago", to: "/app/vacancies/v6",
    title: h("span", null, "New strong match: ", b("Junior Data Engineer")), detail: "Beeline Kazakhstan · 74% match" },
  { id: "n4", icon: "rejected", group: "Earlier", time: "1 week ago", to: "/app/applications",
    title: h("span", null, b("Kolesa Group"), " chose other candidates"), detail: "Junior Frontend Developer" },
];

export const EMPLOYER_NOTIFICATIONS: NotificationItem[] = [
  { id: "e1", icon: "candidate", tone: "accent", group: "Today", unread: true, time: "1h ago", to: "/company/candidates/c1",
    title: h("span", null, b("Maya Akhmetova"), " applied · 86% match"), detail: "Backend Intern (Python)" },
  { id: "e2", icon: "candidates", tone: "accent", group: "Today", unread: true, time: "3h ago", to: "/company/vacancies/v1",
    title: h("span", null, b("5 new applicants"), " for Backend Intern (Python)") },
  { id: "e3", icon: "interview", tone: "warning", group: "Earlier", unread: true, time: "Yesterday", to: "/company/candidates/c5",
    title: h("span", null, b("Dana Sultanova"), " confirmed the interview"), detail: "Thu, 6 Nov · 11:00" },
  { id: "e4", icon: "deadline", group: "Earlier", time: "2 days ago", to: "/company/vacancies",
    title: h("span", null, b("iOS Developer Intern"), " closes in 3 weeks") },
];
