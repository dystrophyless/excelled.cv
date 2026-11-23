import type { CompanyProfile, ProfileCatalog, StudentProfile } from "./model";

/*
 * Mock data for the 003-profiles prototypes (fictional people and companies).
 * "Today" is fixed (22 Nov 2026, UTC+5) so every state looks the same on every day.
 */

export const MOCK_EMAIL = "maya@sdu.edu.kz";

export const CATALOG: ProfileCatalog = {
  cities: [
    { value: "almaty", label: "Almaty" }, { value: "astana", label: "Astana" }, { value: "shymkent", label: "Shymkent" },
    { value: "karaganda", label: "Karaganda" }, { value: "aktobe", label: "Aktobe" }, { value: "other", label: "Other" },
  ],
  industries: [
    { value: "it", label: "IT & software" }, { value: "finance", label: "Finance & banking" }, { value: "education", label: "Education" },
    { value: "healthcare", label: "Healthcare" }, { value: "retail", label: "Retail & e-commerce" }, { value: "manufacturing", label: "Manufacturing" },
    { value: "media", label: "Media & marketing" }, { value: "government", label: "Government & public sector" },
    { value: "consulting", label: "Consulting" }, { value: "other", label: "Other" },
  ],
  companySizes: [
    { value: "1_10", label: "1–10 employees" }, { value: "11_50", label: "11–50 employees" }, { value: "51_200", label: "51–200 employees" },
    { value: "201_1000", label: "201–1000 employees" }, { value: "1000_plus", label: "1000+ employees" },
  ],
  degrees: [
    { value: "college", label: "College (TVE)", maxYear: 4 }, { value: "bachelor", label: "Bachelor's", maxYear: 4 },
    { value: "master", label: "Master's", maxYear: 2 }, { value: "doctoral", label: "Doctoral (PhD)", maxYear: 3 },
    { value: "residency", label: "Residency", maxYear: 4 },
  ],
  /** Refined vacancy fields (round 14, owner): the backend copies labels and descriptions into the catalog. */
  fields: [
    { value: "backend", label: "Backend", description: "Builds the server side: APIs, databases, business logic" },
    { value: "frontend", label: "Frontend", description: "Builds the web pages and apps people see and click" },
    { value: "mobile", label: "Mobile", description: "Builds apps for iPhone and Android" },
    { value: "data_analytics", label: "Data Analytics", description: "Turns data into reports and dashboards that answer business questions" },
    { value: "data_science", label: "Data Science (incl. ML)", description: "Builds models that predict and recommend, including machine learning" },
    { value: "data_engineering", label: "Data Engineering", description: "Builds the pipelines and storage that collect and clean data" },
    { value: "qa", label: "QA", description: "Tests software and finds bugs before users do" },
    { value: "design", label: "UI/UX Design", description: "Designs screens and flows that are clear and easy to use" },
    { value: "devops", label: "DevOps", description: "Keeps apps running: servers, cloud, releases, monitoring" },
    { value: "security", label: "Cybersecurity", description: "Protects systems and data from attacks and leaks" },
    { value: "product", label: "Product", description: "Decides what to build and why, with users and the team" },
    { value: "other", label: "Other", description: "Support, IT, business analysis and other roles" },
  ],
  types: [
    { value: "internship", label: "Internship" }, { value: "full_time", label: "Full-time" }, { value: "part_time", label: "Part-time" },
  ],
  languageLevels: [
    { value: "native", label: "Native" }, { value: "fluent", label: "Fluent" }, { value: "intermediate", label: "Intermediate" },
    { value: "basic", label: "Basic" },
  ],
};

export const BASE = "/prototypes/003-profiles";
export const ROUTES = {
  studentOnboarding: `${BASE}/onboarding`,
  profile: `${BASE}/profile`,
  edit: `${BASE}/profile-edit`,
  companyOnboarding: `${BASE}/company-onboarding`,
  company: `${BASE}/company-profile`,
  /** after the company step: the employer's vacancies (002 prototype) */
  vacancies: "/prototypes/002-employer-vacancies/list",
  signIn: "/prototypes/001-user-auth/sign-in",
};

/* ── Student ─────────────────────────────────────────────── */

/** Default: everything filled, every optional section included. */
export const STUDENT: StudentProfile = {
  fullName: "Maya Akhmetova",
  university: "Suleyman Demirel University",
  degree: "bachelor",
  major: "Computer Science",
  studyYear: 3,
  graduated: false,
  gpa: "3.45",
  lookingForFields: ["backend", "data_engineering"],
  positionTypes: ["internship", "part_time"],
  city: "almaty",
  about:
    "Third-year CS student who likes building APIs. I interned at a local startup last summer and ship side projects in Python.\nLooking for a backend internship from June 2027.",
  contacts: {
    phone: "+7 701 123 45 67",
    whatsapp: "+7 701 123 45 67",
    telegram: "maya_akh",
    linkedinUrl: "https://linkedin.com/in/maya-akhmetova",
    githubUrl: "https://github.com/maya-akh",
    websiteUrl: null,
  },
  projects: [
    {
      title: "Campus timetable bot",
      description: "Telegram bot that sends SDU students their timetable and room changes. FastAPI + PostgreSQL, about 900 users.",
      url: "https://github.com/maya-akh/timetable-bot",
    },
    {
      title: "Almaty air quality dashboard",
      description: "Course project: hourly AQI from public sensors on a map, with a daily summary.",
      url: null,
    },
  ],
  languages: [
    { language: "Kazakh", level: "native" },
    { language: "Russian", level: "fluent" },
    { language: "English", level: "intermediate" },
  ],
  version: 2,
  updatedAt: "2026-11-20T08:15:00Z",
};

const NO_CONTACTS = { phone: null, whatsapp: null, telegram: null, linkedinUrl: null, githubUrl: null, websiteUrl: null };

/** Only what onboarding asks for (no city, about, GPA, projects, languages, contacts); "I'm not sure yet" about the field. */
export const STUDENT_MINIMAL: StudentProfile = {
  ...STUDENT, city: null, about: null, gpa: null, contacts: NO_CONTACTS, projects: [], languages: [],
  lookingForFields: [], positionTypes: ["internship"], version: 1, updatedAt: "2026-11-22T06:40:00Z",
};

/** Partly filled: city, about, GPA and languages; no projects, no contacts. A graduate of a Master's. */
export const STUDENT_PARTIAL: StudentProfile = {
  ...STUDENT, degree: "master", major: "Data Science", studyYear: null, graduated: true, gpa: "3.8",
  lookingForFields: ["data_science", "data_analytics", "product"], positionTypes: ["full_time"],
  about: "Finished a Master's in Data Science this summer. I like turning messy data into dashboards people actually use.",
  contacts: NO_CONTACTS, projects: [], version: 4, updatedAt: "2026-11-21T12:00:00Z",
};

/** Saved in another tab meanwhile (version_conflict carries it). */
export const STUDENT_NEWER: StudentProfile = { ...STUDENT, studyYear: 4, version: 3, updatedAt: "2026-11-22T07:05:00Z" };

/* ── Company ─────────────────────────────────────────────── */

export const COMPANY: CompanyProfile = {
  name: "Kaspi.kz",
  industry: "finance",
  size: "1000_plus",
  website: "https://kaspi.kz",
  city: "almaty",
  description:
    "Kaspi.kz runs the super app used by 14 million people in Kazakhstan: payments, marketplace and banking.\nInterns join product teams and ship real features with a mentor from week one.",
  version: 4,
  updatedAt: "2026-11-18T10:00:00Z",
};

export const COMPANY_NEWER: CompanyProfile = { ...COMPANY, size: "1000_plus", description: `${COMPANY.description}\nWe hire about 60 interns a year.`, version: 5, updatedAt: "2026-11-22T07:05:00Z" };


