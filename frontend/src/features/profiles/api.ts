import { api } from "@/lib/api";
import { currenciesOrKnown, type CurrencyOption } from "@/lib/money";
import type { CompanyProfile, CompanyValues, Option, ProfileCatalog, StudentProfile, StudentValues } from "./model";
import { toStudentIn } from "./model";

/* Typed calls for specs/003-profiles/contracts/profiles-api.md + pure API <-> view-model mapping. */

export type ApiContacts = {
  phone: string | null;
  whatsapp: string | null;
  telegram: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
};

export type ApiStudentProfile = {
  full_name: string;
  university: string;
  degree: string;
  major: string;
  study_year: number | null;
  graduated: boolean;
  gpa: string | null;
  looking_for_fields: string[];
  position_types: string[];
  city: string | null;
  about: string | null;
  contacts: ApiContacts;
  projects: { title: string; description: string | null; url: string | null }[];
  languages: { language: string; level: string }[];
  version: number;
  created_at: string;
  updated_at: string;
};

export type StudentProfileIn = ReturnType<typeof toStudentIn>;

export type ApiCompanyProfile = {
  name: string;
  industry: string;
  size: string;
  website: string | null;
  city: string | null;
  description: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type CompanyProfileIn = {
  name: string;
  industry: string;
  size: string;
  website: string | null;
  city: string | null;
  description: string | null;
};

type ApiOption = Option;
export type ApiProfileCatalog = {
  cities: ApiOption[];
  industries: ApiOption[];
  company_sizes: ApiOption[];
  degrees: (ApiOption & { max_year: number })[];
  fields: (ApiOption & { description: string })[];
  types: ApiOption[];
  language_levels: ApiOption[];
  formats?: ApiOption[];
  currencies?: CurrencyOption[];
};

/** One FastAPI 422 item (default validation shape). */
export type ValidationItem = { loc: (string | number)[]; msg: string; type: string };

export const studentProfileKey = ["student-profile"] as const;
export const companyProfileKey = ["company-profile"] as const;
/** Not 002's ["catalog"]: that key caches the vacancy-form shape of the same response. */
export const profileCatalogKey = ["profile-catalog"] as const;

export const toStudentProfile = (p: ApiStudentProfile): StudentProfile => ({
  fullName: p.full_name,
  university: p.university,
  degree: p.degree,
  major: p.major,
  studyYear: p.study_year,
  graduated: p.graduated,
  gpa: p.gpa,
  lookingForFields: p.looking_for_fields,
  positionTypes: p.position_types,
  city: p.city,
  about: p.about,
  contacts: {
    phone: p.contacts.phone,
    whatsapp: p.contacts.whatsapp,
    telegram: p.contacts.telegram,
    linkedinUrl: p.contacts.linkedin_url,
    githubUrl: p.contacts.github_url,
    websiteUrl: p.contacts.website_url,
  },
  projects: p.projects.map((x) => ({ title: x.title, description: x.description, url: x.url })),
  languages: p.languages.map((x) => ({ language: x.language, level: x.level })),
  version: p.version,
  updatedAt: p.updated_at,
});

export const toCompanyProfile = (p: ApiCompanyProfile): CompanyProfile => ({
  name: p.name,
  industry: p.industry,
  size: p.size,
  website: p.website,
  city: p.city,
  description: p.description,
  version: p.version,
  updatedAt: p.updated_at,
});

const orNull = (s: string) => s.trim() || null;

/** Form values → `CompanyProfileIn`. The API adds https:// to a bare website. */
export const toCompanyIn = (v: CompanyValues): CompanyProfileIn => ({
  name: v.name.trim(),
  industry: v.industry,
  size: v.size,
  website: orNull(v.website),
  city: v.city || null,
  description: orNull(v.description),
});

export const toProfileCatalog = (c: ApiProfileCatalog): ProfileCatalog => ({
  cities: c.cities,
  industries: c.industries,
  companySizes: c.company_sizes,
  degrees: c.degrees.map((d) => ({ value: d.value, label: d.label, maxYear: d.max_year })),
  fields: c.fields.map((f) => ({ value: f.value, label: f.label, description: f.description })),
  types: c.types,
  languageLevels: c.language_levels,
  formats: c.formats ?? [],
  currencies: currenciesOrKnown(c.currencies),
});

export const EMPTY_PROFILE_CATALOG: ProfileCatalog = {
  cities: [], industries: [], companySizes: [], degrees: [], fields: [], types: [], languageLevels: [],
};

const STUDENT = "/api/student/profile";
const COMPANY = "/api/company/profile";

export const profileCatalog = async (): Promise<ProfileCatalog> => toProfileCatalog(await api<ApiProfileCatalog>("/api/catalog"));

export const getStudent = async (): Promise<StudentProfile> => toStudentProfile(await api<ApiStudentProfile>(STUDENT));

export const createStudent = async (values: StudentValues): Promise<StudentProfile> =>
  toStudentProfile(await api<ApiStudentProfile>(STUDENT, { method: "POST", json: toStudentIn(values) }));

export const updateStudent = async (values: StudentValues, version: number): Promise<StudentProfile> =>
  toStudentProfile(await api<ApiStudentProfile>(STUDENT, { method: "PUT", json: { ...toStudentIn(values), version } }));

export const getCompany = async (): Promise<CompanyProfile> => toCompanyProfile(await api<ApiCompanyProfile>(COMPANY));

export const createCompany = async (values: CompanyValues): Promise<CompanyProfile> =>
  toCompanyProfile(await api<ApiCompanyProfile>(COMPANY, { method: "POST", json: toCompanyIn(values) }));

export const updateCompany = async (values: CompanyValues, version: number): Promise<CompanyProfile> =>
  toCompanyProfile(await api<ApiCompanyProfile>(COMPANY, { method: "PUT", json: { ...toCompanyIn(values), version } }));
