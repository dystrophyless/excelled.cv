/*
 * 003-profiles: shared types, labels, limits and the client-side validation that mirrors the API (research R6).
 * Used by the Views (labels), the prototypes and the real pages (validation before PUT/POST, 422 mapping).
 * Form values are strings (what the inputs hold); the page converts them to the API shape.
 */

export type Option = { value: string; label: string };

/** A degree from GET /api/catalog → `degrees`: the Kazakhstan levels with the length of study (FR-003). */
export type DegreeOption = Option & { maxYear: number };

/** A field of work from GET /api/catalog → `fields` (shared with vacancies): one plain line on what the role does. */
export type FieldOption = Option & { description: string };

/**
 * What the forms need from GET /api/catalog. `fields` and `types` are 002's vacancy lists, reused for "Looking for"
 * so matching later compares like with like.
 */
export type ProfileCatalog = {
  cities: Option[];
  industries: Option[];
  companySizes: Option[];
  degrees: DegreeOption[];
  /** vacancy fields of work (refined in round 14): Backend … Other, each with a description */
  fields: FieldOption[];
  /** vacancy position types: Internship, Full-time, Part-time, Research */
  types: Option[];
  languageLevels: Option[];
  /** work formats (On-site, Hybrid, Remote); read by the student opportunities filters, not by the profile forms */
  formats?: Option[];
};

/** A screen that reads data first: catalog (onboarding) or catalog + profile (profile and edit pages). */
export type LoadState = "ready" | "loading" | "error";

/** A message above the form after a refused save (validation errors are shown on the fields instead). */
export type ProfileFormAlert = "conflict" | "save-error";

/* ── Student ─────────────────────────────────────────────── */

/** One project row of the edit form. `id` is a client-only React key (never sent). */
export type ProjectValues = { id: string; title: string; description: string; url: string };
/** One language row of the edit form. */
export type LanguageValues = { id: string; language: string; level: string };

/** The value of "Year of study": "1" … max year of the degree, or "graduated". */
export const GRADUATED = "graduated";

export type StudentValues = {
  fullName: string;
  university: string;
  /** catalog value: college · bachelor · master · doctoral · residency */
  degree: string;
  major: string;
  /** "1" … "6" (within the degree) or "graduated" */
  studyYear: string;
  /** optional, "3.45" (a comma is accepted and sent as a dot) */
  gpa: string;
  /** "" = not answered · "known" = picks up to 3 fields · "unsure" = "I'm not sure yet" (sent as an empty field list) */
  fieldChoice: FieldChoice;
  /** 0–3 vacancy field values; kept in memory while "unsure" (not sent), so switching back loses nothing */
  fields: string[];
  /** ≥ 1 vacancy type values */
  positionTypes: string[];
  /** catalog value, "" = not specified */
  city: string;
  about: string;
  phone: string;
  /** a phone number, same rule as phone; opens https://wa.me/<digits> */
  whatsapp: string;
  /** with or without "@" */
  telegram: string;
  linkedin: string;
  github: string;
  website: string;
  projects: ProjectValues[];
  languages: LanguageValues[];
};
/** Fields with one message each (rows have their own keys, below). */
export type FieldChoice = "" | "known" | "unsure";
export type StudentField = Exclude<keyof StudentValues, "projects" | "languages">;
export type ProjectPart = "title" | "description" | "url";
export type LanguagePart = "language" | "level";
/** Error keys: a field, or a row part ("projects.1.url", "languages.0.language"). */
export type StudentErrorKey = StudentField | `projects.${number}.${ProjectPart}` | `languages.${number}.${LanguagePart}`;
export type StudentErrors = { [K in StudentErrorKey]?: string };

export type StudentContacts = {
  phone: string | null;
  whatsapp: string | null;
  /** without "@" */
  telegram: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
};
export type StudentProject = { title: string; description: string | null; url: string | null };
export type StudentLanguage = { language: string; level: string };

/** GET /api/student/profile, in the SPA's shape (contracts/profiles-api.md → StudentProfile). */
export type StudentProfile = {
  fullName: string;
  university: string;
  degree: string;
  major: string;
  /** null exactly when graduated */
  studyYear: number | null;
  graduated: boolean;
  /** "3.45" or null */
  gpa: string | null;
  lookingForFields: string[];
  positionTypes: string[];
  city: string | null;
  about: string | null;
  contacts: StudentContacts;
  projects: StudentProject[];
  languages: StudentLanguage[];
  version: number;
  /** ISO date-time (UTC) */
  updatedAt: string;
};

export const STUDENT_FIELD_LABEL: Record<StudentField, string> = {
  fullName: "Full name",
  university: "University",
  degree: "Degree",
  major: "Major",
  studyYear: "Year of study",
  gpa: "GPA",
  fieldChoice: "Field of work",
  fields: "Fields of work",
  positionTypes: "Position type",
  city: "City",
  about: "About me",
  phone: "Phone",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  linkedin: "LinkedIn",
  github: "GitHub",
  website: "Website",
};

/** Field order of the edit form (= error summary order). Rows sit between positionTypes and the contacts. */
export const STUDENT_FIELDS: StudentField[] = [
  "fullName", "city", "about", "university", "major", "degree", "studyYear", "gpa", "positionTypes", "fieldChoice", "fields",
  "phone", "whatsapp", "telegram", "linkedin", "github", "website",
];

export const EMPTY_STUDENT: StudentValues = {
  fullName: "", university: "", degree: "", major: "", studyYear: "", gpa: "", fieldChoice: "", fields: [], positionTypes: [],
  city: "", about: "", phone: "", whatsapp: "", telegram: "", linkedin: "", github: "", website: "", projects: [], languages: [],
};

let rowSeq = 0;
/** A fresh client-only row key. */
export const newRowId = () => `row-${++rowSeq}`;
export const emptyProject = (): ProjectValues => ({ id: newRowId(), title: "", description: "", url: "" });
export const emptyLanguage = (): LanguageValues => ({ id: newRowId(), language: "", level: "" });

/** At most 10 projects and 10 languages per profile (data-model.md). */
export const MAX_ROWS = 10;
/** At most 3 fields of work (FR-002). */
export const MAX_FIELDS = 3;

/** Max year of study per degree (FR-003); mirrors catalog `degrees[].max_year`. */
export const DEGREE_MAX_YEAR: Record<string, number> = { college: 4, bachelor: 4, master: 2, doctoral: 3, residency: 4 };

/** Short degree names for the headline under the name ("Bachelor's, 3rd year"). Catalog labels stay the long ones. */
const DEGREE_SHORT: Record<string, string> = { college: "College", bachelor: "Bachelor's", master: "Master's", doctoral: "PhD", residency: "Residency" };
export const degreeShort = (degree: string, degrees: Option[]) => DEGREE_SHORT[degree] ?? optionLabel(degrees, degree);

/** The year tiles / select options of one degree: "1st year" … "{max}th year" + "Graduated". */
export const studyYearOptions = (degree: string): Option[] => {
  const max = DEGREE_MAX_YEAR[degree] ?? 0;
  return [
    ...Array.from({ length: max }, (_, i) => ({ value: String(i + 1), label: `${ordinal(i + 1)} year` })),
    ...(max ? [{ value: GRADUATED, label: "Graduated" }] : []),
  ];
};

/** Language suggestions for the language field (free text allowed), A–Z so no language looks preferred. */
export const LANGUAGES = [
  "Arabic", "Chinese", "English", "French", "German", "Italian", "Japanese", "Kazakh", "Korean", "Kyrgyz", "Russian",
  "Spanish", "Turkish", "Uzbek",
];

/* ── Company ─────────────────────────────────────────────── */

export type CompanyValues = {
  name: string;
  /** catalog value */
  industry: string;
  /** catalog value */
  size: string;
  website: string;
  /** catalog value, "" = not specified */
  city: string;
  description: string;
};
export type CompanyField = keyof CompanyValues;
export type CompanyErrors = Partial<Record<CompanyField, string>>;

export type CompanyProfile = {
  name: string;
  industry: string;
  size: string;
  website: string | null;
  city: string | null;
  description: string | null;
  version: number;
  updatedAt: string;
};

export const COMPANY_FIELD_LABEL: Record<CompanyField, string> = {
  name: "Company name",
  industry: "Industry",
  size: "Company size",
  website: "Website",
  city: "City",
  description: "Description",
};

export const COMPANY_FIELDS: CompanyField[] = ["name", "industry", "size", "website", "city", "description"];

export const EMPTY_COMPANY: CompanyValues = { name: "", industry: "", size: "", website: "", city: "", description: "" };

/* ── Limits and validation (R6) ──────────────────────────── */

export const LIMITS = {
  fullName: 80,
  university: 120,
  major: 120,
  about: 1000,
  companyName: 120,
  website: 200,
  description: 1000,
  projectTitle: 80,
  projectDescription: 300,
  language: 40,
  phone: 20,
  telegram: 33,
} as const;

/** http(s) URL with a host; a bare "kaspi.kz" is fine (the API adds https://). */
const WEBSITE = /^(https?:\/\/)?[^\s/$.?#]+\.[^\s]{2,}$/i;
/** 0.00–4.00, at most two decimals; "3,45" is accepted as 3.45. */
const GPA = /^\d(?:[.,]\d{1,2})?$/;
const PHONE = /^[\d\s+\-()]{7,20}$/;
const TELEGRAM = /^@?[A-Za-z0-9_]{5,32}$/;

const link = (v: string, example: string) => {
  const t = v.trim();
  return t && (t.length > LIMITS.website || !WEBSITE.test(t)) ? `Enter a link like ${example}` : undefined;
};

const text = (v: string, min: number, max: number, empty: string) => {
  const t = v.trim();
  if (!t) return empty;
  if (t.length < min) return `Enter at least ${min} characters`;
  if (t.length > max) return `Use ${max} characters or fewer`;
  return undefined;
};

/** Client-side mirror of FR-002 / FR-003 / R6. Keys are built in edit-form order. */
export function validateStudent(v: StudentValues): StudentErrors {
  const e: StudentErrors = {};
  const set = (f: StudentErrorKey, msg: string | undefined) => { if (msg) e[f] = msg; };
  set("fullName", text(v.fullName, 2, LIMITS.fullName, "Enter your full name"));
  if (v.about.trim().length > LIMITS.about) e.about = `Use ${LIMITS.about} characters or fewer`;
  set("university", text(v.university, 2, LIMITS.university, "Choose or enter your university"));
  set("major", text(v.major, 2, LIMITS.major, "Choose or enter your major"));

  const max = DEGREE_MAX_YEAR[v.degree];
  if (!max) e.degree = "Choose your degree";
  const year = v.studyYear;
  if (!year) e.studyYear = "Choose your year of study";
  else if (max && year !== GRADUATED && !(+year >= 1 && +year <= max)) e.studyYear = `Choose a year from 1 to ${max}, or Graduated`;

  const gpa = v.gpa.trim();
  if (gpa && (!GPA.test(gpa) || Number(gpa.replace(",", ".")) > 4)) e.gpa = "Enter a GPA from 0.00 to 4.00, like 3.45";

  // screen order (round 15): position type first, then the field question
  if (v.positionTypes.length === 0) e.positionTypes = "Choose at least one position type";
  if (!v.fieldChoice) e.fieldChoice = "Choose one: I know which field, or I'm not sure yet";
  else if (v.fieldChoice === "known" && v.fields.length === 0) e.fields = "Pick at least one field, or choose I'm not sure yet";
  else if (v.fieldChoice === "known" && v.fields.length > MAX_FIELDS) e.fields = `Choose up to ${MAX_FIELDS} fields`;

  v.projects.forEach((p, i) => {
    set(`projects.${i}.title`, text(p.title, 2, LIMITS.projectTitle, "Enter the project title"));
    if (p.description.trim().length > LIMITS.projectDescription) e[`projects.${i}.description`] = `Use ${LIMITS.projectDescription} characters or fewer`;
    set(`projects.${i}.url`, link(p.url, "github.com/you/project"));
  });
  const seen = new Set<string>();
  v.languages.forEach((l, i) => {
    const name = l.language.trim();
    const key = name.toLowerCase();
    set(`languages.${i}.language`, text(name, 2, LIMITS.language, "Choose or enter a language") ?? (seen.has(key) ? `${name} is already in your list` : undefined));
    seen.add(key);
    if (!l.level) e[`languages.${i}.level`] = "Choose a level";
  });

  const phone = v.phone.trim();
  if (phone && !PHONE.test(phone)) e.phone = "Enter a phone number like +7 701 123 45 67";
  const wa = v.whatsapp.trim();
  if (wa && !PHONE.test(wa)) e.whatsapp = "Enter a phone number like +7 701 123 45 67";
  const tg = v.telegram.trim();
  if (tg && !TELEGRAM.test(tg)) e.telegram = "Enter a username like @maya_a: 5–32 letters, digits or _";
  set("linkedin", link(v.linkedin, "linkedin.com/in/you"));
  set("github", link(v.github, "github.com/you"));
  set("website", link(v.website, "you.dev"));
  return e;
}

/** Summary labels of a student form's errors, in screen order ("Project 2 · link", "Language 1"). */
export function studentErrorLabels(errors: StudentErrors | undefined, only?: StudentField[]): string[] {
  if (!errors) return [];
  const fields = (only ?? STUDENT_FIELDS).filter((f) => errors[f]).map((f) => STUDENT_FIELD_LABEL[f]);
  if (only) return fields;
  const rows = (kind: "projects" | "languages", noun: string) => {
    const idx = [...new Set(Object.keys(errors).filter((k) => k.startsWith(`${kind}.`)).map((k) => Number(k.split(".")[1])))].sort((a, b) => a - b);
    return idx.map((i) => `${noun} ${i + 1}`);
  };
  const contactsAt = fields.findIndex((l) => ["Phone", "Telegram", "LinkedIn", "GitHub", "Website"].includes(l));
  const at = contactsAt < 0 ? fields.length : contactsAt;
  return [...fields.slice(0, at), ...rows("projects", "Project"), ...rows("languages", "Language"), ...fields.slice(at)];
}

export function validateCompany(v: CompanyValues): CompanyErrors {
  const e: CompanyErrors = {};
  const name = text(v.name, 2, LIMITS.companyName, "Enter the company name");
  if (name) e.name = name;
  if (!v.industry) e.industry = "Choose an industry";
  if (!v.size) e.size = "Choose the company size";
  const site = v.website.trim();
  if (site && (site.length > LIMITS.website || !WEBSITE.test(site))) e.website = "Enter a website like kaspi.kz or https://kaspi.kz";
  if (v.description.trim().length > LIMITS.description) e.description = `Use ${LIMITS.description} characters or fewer`;
  return e;
}

/** Fields with an error, in screen order (for the summary Alert and focusing the first one). */
export const errorFields = <F extends string>(order: F[], errors?: Partial<Record<F, string>>): F[] =>
  order.filter((f) => errors?.[f]);

/* ── Conversions ─────────────────────────────────────────── */

export const toStudentValues = (p: StudentProfile): StudentValues => ({
  fullName: p.fullName,
  university: p.university,
  degree: p.degree,
  major: p.major,
  studyYear: p.graduated ? GRADUATED : String(p.studyYear ?? ""),
  gpa: p.gpa ?? "",
  fields: [...p.lookingForFields],
  fieldChoice: p.lookingForFields.length === 0 ? "unsure" : "known",
  positionTypes: [...p.positionTypes],
  city: p.city ?? "",
  about: p.about ?? "",
  phone: p.contacts.phone ?? "",
  whatsapp: p.contacts.whatsapp ?? "",
  telegram: p.contacts.telegram ? `@${p.contacts.telegram}` : "",
  linkedin: p.contacts.linkedinUrl ?? "",
  github: p.contacts.githubUrl ?? "",
  website: p.contacts.websiteUrl ?? "",
  projects: p.projects.map((x) => ({ id: newRowId(), title: x.title, description: x.description ?? "", url: x.url ?? "" })),
  languages: p.languages.map((x) => ({ id: newRowId(), language: x.language, level: x.level })),
});

const orNull = (s: string) => s.trim() || null;
const withScheme = (s: string) => { const t = s.trim(); return t ? (/^https?:\/\//i.test(t) ? t : `https://${t}`) : null; };

/** Form values → `StudentProfileIn` (contracts/profiles-api.md). The page adds `version` for PUT. */
export const toStudentIn = (v: StudentValues) => ({
  full_name: v.fullName.trim(),
  university: v.university.trim(),
  degree: v.degree,
  major: v.major.trim(),
  study_year: v.studyYear === GRADUATED ? null : Number(v.studyYear),
  graduated: v.studyYear === GRADUATED,
  gpa: v.gpa.trim() ? v.gpa.trim().replace(",", ".") : null,
  looking_for_fields: v.fieldChoice === "unsure" ? [] : v.fields,
  position_types: v.positionTypes,
  city: v.city || null,
  about: orNull(v.about),
  contacts: {
    phone: orNull(v.phone),
    whatsapp: orNull(v.whatsapp),
    telegram: orNull(v.telegram.replace(/^@/, "")),
    linkedin_url: withScheme(v.linkedin),
    github_url: withScheme(v.github),
    website_url: withScheme(v.website),
  },
  projects: v.projects.map((p) => ({ title: p.title.trim(), description: orNull(p.description), url: withScheme(p.url) })),
  languages: v.languages.map((l) => ({ language: l.language.trim(), level: l.level })),
});

/**
 * 422 `loc` → the form's error key: ["body","study_year"] → "studyYear", ["body","projects",1,"url"] → "projects.1.url",
 * ["body","contacts","github_url"] → "github".
 */
export function studentErrorKey(loc: (string | number)[]): StudentErrorKey | undefined {
  const [, a, b, c] = loc;
  const camel: Record<string, StudentField> = {
    full_name: "fullName", university: "university", degree: "degree", major: "major", study_year: "studyYear",
    graduated: "studyYear", gpa: "gpa", looking_for_fields: "fields", position_types: "positionTypes", city: "city",
    about: "about", phone: "phone", whatsapp: "whatsapp", telegram: "telegram", linkedin_url: "linkedin", github_url: "github", website_url: "website",
  };
  if (a === "contacts" && typeof b === "string") return camel[b];
  if ((a === "projects" || a === "languages") && typeof b === "number" && typeof c === "string") {
    return `${a}.${b}.${c}` as StudentErrorKey;
  }
  return typeof a === "string" ? camel[a] : undefined;
}

export const toCompanyValues =(p: CompanyProfile): CompanyValues => ({
  name: p.name,
  industry: p.industry,
  size: p.size,
  website: p.website ?? "",
  city: p.city ?? "",
  description: p.description ?? "",
});

/** Trimmed strings, rows without their client-only `id`, keys sorted — for the dirty check. */
const comparable = (v: unknown): unknown => {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.map(comparable);
  if (v && typeof v === "object") {
    return Object.keys(v).filter((k) => k !== "id").sort().map((k) => [k, comparable((v as Record<string, unknown>)[k])]);
  }
  return v;
};
export const sameValues = <T extends object>(a: T, b: T) => JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));

/* ── Display helpers ─────────────────────────────────────── */

export const optionLabel = (options: Option[], value: string | null | undefined) =>
  (value && options.find((o) => o.value === value)?.label) || "";

/** 1 → "1st", 3 → "3rd" */
export function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-11-22T09:30:00Z" → "22 Nov 2026" (content.md date style) */
export function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** The website as typed or stored, shown without the scheme: "https://kaspi.kz/" → "kaspi.kz" */
export const displayWebsite = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

/** Exact strings of the toasts (ui-spec § copy). */
export const PROFILE_TOASTS = {
  studentCreated: "Profile saved",
  companyCreated: "Company profile saved",
  saved: "Changes saved",
  renamed: (name: string) => `Your vacancies now show “${name}”.`,
  latestLoaded: "Loaded the latest version",
} as const;

/* ── Onboarding wizards: one question per step (≤ 5, templates.md) ── */

export type WizardStep<F extends string> = { label: string; fields: F[] };

/**
 * Five steps (round 13): each pairs a question with the one that depends on it — the degree sets the years of study, so
 * university + degree come first and major + year of study next. Projects, languages, GPA and contacts are added later
 * on the profile page (spec Assumptions).
 */
export const STUDENT_STEPS: WizardStep<StudentField>[] = [
  { label: "Name", fields: ["fullName"] },
  { label: "University", fields: ["university", "degree"] },
  { label: "Major", fields: ["major", "studyYear"] },
  { label: "Looking for", fields: ["positionTypes", "fieldChoice", "fields"] },
  { label: "About", fields: ["city", "about"] },
];

export const COMPANY_STEPS: WizardStep<CompanyField>[] = [
  { label: "Name", fields: ["name"] },
  { label: "Industry", fields: ["industry"] },
  { label: "Size", fields: ["size"] },
  { label: "Details", fields: ["website", "city"] },
  { label: "About", fields: ["description"] },
];

/** Errors of one step only (Continue checks the step; Save checks everything and jumps to the first wrong step). */
export const stepErrors = <F extends string>(step: WizardStep<F>, all: Partial<Record<F, string>>): Partial<Record<F, string>> =>
  Object.fromEntries(step.fields.filter((f) => all[f]).map((f) => [f, all[f]])) as Partial<Record<F, string>>;

/** Index of the first step with an error, or -1. */
export const firstStepWithError = <F extends string>(steps: WizardStep<F>[], all: Partial<Record<F, string>>) =>
  steps.findIndex((s) => s.fields.some((f) => all[f]));

/* ── Ready-made answers ──────────────────────────────────
 * Universities and majors: alphabetical, neutral lists in ./universities.ts (searched with the kit Combobox).
 */

/**
 * The headline under the student's name: "Computer Science · Bachelor's, 3rd year" / "… · Master's, graduated".
 * Replaces "{Major} student" (owner, round 13).
 */
export const studyHeadline = (pr: Pick<StudentProfile, "major" | "degree" | "studyYear" | "graduated">, degrees: Option[]) =>
  `${pr.major} · ${degreeShort(pr.degree, degrees)}, ${pr.graduated || !pr.studyYear ? "graduated" : `${ordinal(pr.studyYear)} year`}`;

/** "3.45" / "3,5" → "3.50" */
export const formatGpa = (gpa: string) => Number(gpa.replace(",", ".")).toFixed(2);

/** Contacts as shown on the profile: value without scheme / with "@", and where it links. */
export function contactRows(c: StudentContacts): { id: keyof StudentContacts; label: string; value: string; href: string }[] {
  const rows: { id: keyof StudentContacts; label: string; value: string; href: string }[] = [];
  if (c.phone) rows.push({ id: "phone", label: "Phone", value: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, "")}` });
  if (c.whatsapp) rows.push({ id: "whatsapp", label: "WhatsApp", value: c.whatsapp, href: `https://wa.me/${c.whatsapp.replace(/\D/g, "")}` });
  if (c.telegram) rows.push({ id: "telegram", label: "Telegram", value: `@${c.telegram}`, href: `https://t.me/${c.telegram}` });
  if (c.linkedinUrl) rows.push({ id: "linkedinUrl", label: "LinkedIn", value: displayWebsite(c.linkedinUrl), href: c.linkedinUrl });
  if (c.githubUrl) rows.push({ id: "githubUrl", label: "GitHub", value: displayWebsite(c.githubUrl), href: c.githubUrl });
  if (c.websiteUrl) rows.push({ id: "websiteUrl", label: "Website", value: displayWebsite(c.websiteUrl), href: c.websiteUrl });
  return rows;
}

/** Sentence starters for the optional free-text steps; a tap appends the text to the field. */
export const ABOUT_PROMPTS = ["I'm good at ", "I'm looking for ", "Recently I built "];
export const DESCRIPTION_PROMPTS = ["We build ", "Interns at our company ", "We're looking for students who "];
