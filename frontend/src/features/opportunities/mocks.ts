import { CATALOG as VACANCY_CATALOG } from "@/features/company-vacancies/mocks";
import { CATALOG as PROFILE_CATALOG } from "@/features/profiles/mocks";
import type { Salary } from "@/lib/money";
import { STUDENT_SKILLS } from "@/mocks/data";
import {
  PAGE_SIZE, type OpportunityCatalog, type OpportunityCompanyDetail, type OpportunityDetail, type OpportunityItem, type OpportunityPage,
  type OpportunityQuery,
} from "./model";

/*
 * Mock data for the 004-student-opportunities prototype: 24 active opportunities from Kazakhstan companies and
 * universities (fictional postings under real organisation names). "Today" is fixed so every deadline looks the same
 * on every day. Newest first, as the API returns them.
 */

export const MOCK_TODAY = "2026-11-24";
export const BASE = "/prototypes/004-student-opportunities";
export const LIST_PATH = `${BASE}/list`;
export const DETAILS_PATH = `${BASE}/details`;

export const CATALOG: OpportunityCatalog = {
  types: [...VACANCY_CATALOG.types],
  fields: PROFILE_CATALOG.fields.map(({ value, label }) => ({ value, label })),
  cities: VACANCY_CATALOG.cities,
  formats: VACANCY_CATALOG.formats,
  currencies: VACANCY_CATALOG.currencies,
  industries: PROFILE_CATALOG.industries,
  companySizes: PROFILE_CATALOG.companySizes,
};

/* ── Companies ───────────────────────────────────────────── */

export const COMPANIES: Record<string, OpportunityCompanyDetail> = {
  kaspi: { name: "Kaspi.kz", industry: "finance", size: "1000_plus", city: "almaty", website: "https://kaspi.kz",
    description: "Kaspi.kz runs the super app used by 14 million people in Kazakhstan: payments, marketplace and banking.\nInterns join product teams and ship real features with a mentor from week one." },
  halyk: { name: "Halyk Bank", industry: "finance", size: "1000_plus", city: "almaty", website: "https://halykbank.kz",
    description: "Halyk Bank is one of the largest banks in Kazakhstan, with branches in every region.\nThe data and engineering teams work in small squads and review every change together." },
  kolesa: { name: "Kolesa Group", industry: "it", size: "201_1000", city: "almaty", website: "https://kolesa.group",
    description: "Kolesa Group builds online marketplaces for cars and real estate in Kazakhstan.\nProduct, design and engineering sit in the same teams and release every week." },
  epam: { name: "EPAM Kazakhstan", industry: "it", size: "1000_plus", city: "astana", website: "https://www.epam.com",
    description: "EPAM Kazakhstan is the local office of an international software engineering company.\nEvery intern has a senior engineer as a mentor." },
  indrive: { name: "inDrive", industry: "it", size: "1000_plus", city: "almaty", website: "https://indrive.com",
    description: "inDrive is a mobility platform where passengers and drivers agree on the fare.\nThe Almaty office works on product, design and data for users in many countries." },
  beeline: { name: "Beeline Kazakhstan", industry: "it", size: "1000_plus", city: "astana", website: "https://beeline.kz",
    description: "Beeline Kazakhstan is a mobile operator and digital services company.\nThe data team builds the pipelines behind reports, offers and network planning." },
  choco: { name: "Chocofamily", industry: "retail", size: "201_1000", city: "almaty", website: null,
    description: "Chocofamily is a group of consumer apps for food delivery, shopping and travel." },
  jusan: { name: "Jusan Bank", industry: "finance", size: "1000_plus", city: "astana", website: "https://jusan.kz",
    description: "Jusan Bank is a retail bank with a mobile-first app.\nThe backend team works remotely across several cities of Kazakhstan." },
  issai: { name: "ISSAI, Nazarbayev University", industry: "education", size: "51_200", city: "astana", website: "https://issai.nu.edu.kz",
    description: "The Institute of Smart Systems and Artificial Intelligence (ISSAI) is a research institute of Nazarbayev University in Astana.\nIt works on AI for the Kazakh language and publishes open datasets and models." },
  seds: { name: "NU School of Engineering and Digital Sciences", industry: "education", size: "201_1000", city: "astana", website: "https://seds.nu.edu.kz",
    description: "The School of Engineering and Digital Sciences at Nazarbayev University teaches and researches computer science, robotics and engineering.\nStudents can join faculty-led research projects during the semester." },
  nusom: { name: "NU School of Medicine", industry: "education", size: "51_200", city: "astana", website: "https://med.nu.edu.kz",
    description: "The School of Medicine at Nazarbayev University trains doctors and runs clinical and laboratory research in Astana." },
  iict: { name: "Institute of Information and Computational Technologies", industry: "government", size: "51_200", city: "almaty", website: null, description: null },
  satbayev: { name: "Satbayev University", industry: "education", size: "1000_plus", city: "almaty", website: "https://satbayev.university",
    description: "Satbayev University is a technical university in Almaty known for mining, energy and IT programmes.\nResearch groups invite students to take part in applied projects with industry partners." },
  auezov: { name: "M. Auezov South Kazakhstan University", industry: "education", size: "1000_plus", city: "shymkent", website: "https://auezov.edu.kz",
    description: "M. Auezov South Kazakhstan University is a large regional university in Shymkent." },
  buketov: { name: "E.A. Buketov Karaganda University", industry: "education", size: "1000_plus", city: "karaganda", website: "https://ksu.edu.kz",
    description: "E.A. Buketov Karaganda University is a classical university in Karaganda with research groups in physics, chemistry and informatics." },
  aitu: { name: "Astana IT University", industry: "education", size: "201_1000", city: "astana", website: "https://astanait.edu.kz",
    description: "Astana IT University prepares software engineers, data scientists and cybersecurity specialists in Astana.\nIts research groups work on language technologies and data analysis." },
  kazakhtelecom: { name: "Kazakhtelecom", industry: "it", size: "1000_plus", city: "astana", website: "https://telecom.kz",
    description: "Kazakhtelecom is the national telecommunications operator.\nThe infrastructure team keeps servers, networks and cloud services running." },
  arbuz: { name: "Arbuz.kz", industry: "retail", size: "201_1000", city: "almaty", website: "https://arbuz.kz",
    description: "Arbuz.kz delivers groceries in Almaty and Astana.\nThe web team ships small changes to the shop several times a day." },
  magnum: { name: "Magnum Group", industry: "retail", size: "1000_plus", city: "almaty", website: null,
    description: "Magnum is a supermarket chain with stores across Kazakhstan." },
  kcell: { name: "Kcell", industry: "it", size: "1000_plus", city: "almaty", website: "https://www.kcell.kz",
    description: "Kcell is a mobile operator with its own digital services and a mobile app team in Almaty." },
};

/* ── Opportunities (newest first) ────────────────────────── */

type Row = Omit<OpportunityItem, "company" | "niceSkills" | "duration" | "salary"> & {
  company: keyof typeof COMPANIES;
  nice?: string[];
  duration?: string;
  salary?: Salary;
  description: string;
};

const ROWS: Row[] = [
  { id: "o1", title: "Backend Intern (Python)", company: "kaspi", type: "internship", field: "backend", city: "almaty", format: "hybrid",
    duration: "3 months", salary: { min: 200000, max: 300000, currency: "KZT" }, applyBy: "2026-12-15", publishedOn: "2026-11-24",
    requiredSkills: ["Python", "SQL", "FastAPI", "Docker"], nice: ["Redis", "Git"],
    description: "Join the Payments team and build services used by 14 million people every day.\nYou will ship real features with a mentor from week one: REST endpoints in FastAPI, SQL for reporting and code review in a friendly team.\nWe offer flexible hours around your studies and a full-time offer for the best interns." },
  { id: "o2", title: "Research Assistant, Kazakh Language Models", company: "issai", type: "research", field: "data_science", city: "astana", format: "on_site",
    duration: "6 months", salary: { min: 150000, max: 150000, currency: "KZT" }, applyBy: "2026-12-20", publishedOn: "2026-11-23",
    requiredSkills: ["Python", "Machine learning", "PyTorch"], nice: ["Linux", "Kazakh"],
    description: "Help the language technology group collect, clean and evaluate Kazakh text and speech data, and train small models on it.\nYou will work with a researcher on one experiment from idea to a written result.\nStudents of any year with solid Python and some machine learning coursework are welcome." },
  { id: "o3", title: "Data Analyst Intern", company: "halyk", type: "internship", field: "data_analytics", city: "almaty", format: "on_site",
    duration: "6 months", applyBy: "2026-11-29", publishedOn: "2026-11-22",
    requiredSkills: ["SQL", "Excel", "Power BI"], nice: ["Python", "Statistics"],
    description: "Support the retail analytics team: prepare weekly reports, check data quality and build dashboards for branch managers.\nYou will learn how a large bank turns transactions into decisions, with a mentor who reviews your queries." },
  { id: "o4", title: "Junior Frontend Developer", company: "kolesa", type: "full_time", field: "frontend", city: "almaty", format: "remote",
    salary: { min: 450000, max: 600000, currency: "KZT" }, applyBy: "2026-12-31", publishedOn: "2026-11-21",
    requiredSkills: ["TypeScript", "React", "Git"], nice: ["Figma"],
    description: "Build and maintain pages of our marketplaces with React and TypeScript.\nYou will pair with a senior developer during the first month, then own small features end to end.\nWe work remotely and meet in the Almaty office once a month." },
  { id: "o5", title: "QA Engineer Intern", company: "epam", type: "internship", field: "qa", city: "astana", format: "hybrid",
    duration: "4 months", applyBy: "2026-12-10", publishedOn: "2026-11-20",
    requiredSkills: ["Python", "SQL", "English"], nice: ["Linux"],
    description: "Learn test design and automation on a real product team. You will write test cases, report bugs and automate checks in Python.\nWorking English is needed: the team talks to colleagues abroad every day." },
  { id: "o6", title: "Student Researcher, Satellite Imagery for Crop Monitoring", company: "seds", type: "research", field: "data_science", city: "astana", format: "hybrid",
    duration: "1 semester", applyBy: "2026-12-12", publishedOn: "2026-11-20",
    requiredSkills: ["Python", "Pandas", "Machine learning"], nice: ["Statistics"],
    description: "Join a faculty-led project that estimates crop health in Kazakhstan from open satellite images.\nYou will prepare image datasets, train a baseline model and compare it with field measurements.\nThe project meets weekly. Ask your department whether the work can count towards a course project." },
  { id: "o7", title: "Product Design Intern", company: "indrive", type: "internship", field: "design", city: "almaty", format: "remote",
    duration: "3 months", salary: { min: 600, max: null, currency: "EUR" }, applyBy: "2026-12-05", publishedOn: "2026-11-19",
    requiredSkills: ["Figma", "UX research"], nice: ["English"],
    description: "Work with a product designer on one feature of the driver app: interviews, flows, prototypes and a final handoff to developers.\nYou will present your result to the team at the end of the internship." },
  { id: "o8", title: "Junior Data Engineer", company: "beeline", type: "full_time", field: "data_engineering", city: "astana", format: "hybrid",
    salary: { min: 500000, max: null, currency: "KZT" }, applyBy: "2027-01-15", publishedOn: "2026-11-18",
    requiredSkills: ["Python", "SQL", "PostgreSQL"], nice: ["Docker"],
    description: "Build and monitor the data pipelines that feed reports and marketing offers.\nYou will start with small fixes, then own one pipeline with a senior engineer reviewing your work." },
  { id: "o9", title: "iOS Developer Intern", company: "choco", type: "internship", field: "mobile", city: "almaty", format: "on_site",
    duration: "3 months", salary: { min: 180000, max: 180000, currency: "KZT" }, applyBy: "2026-11-30", publishedOn: "2026-11-17",
    requiredSkills: ["Swift", "Git"], nice: ["Figma"],
    description: "Build and polish screens of our iPhone app with a senior iOS developer.\nYou will fix real bugs in the first week and ship one small feature before the internship ends." },
  { id: "o10", title: "Python Developer (part-time)", company: "jusan", type: "part_time", field: "backend", city: "astana", format: "remote",
    salary: { min: null, max: 250000, currency: "KZT" }, applyBy: "2026-12-18", publishedOn: "2026-11-16",
    requiredSkills: ["Python", "FastAPI"], nice: ["Git", "Linux"],
    description: "Twenty hours a week, planned around your classes. You will build and test internal APIs in FastAPI and join the team's code reviews.\nA good fit for third and fourth-year students." },
  { id: "o11", title: "Research Intern, Computer Vision", company: "iict", type: "research", field: "data_science", city: "almaty", format: "on_site",
    duration: "3 months", applyBy: "2026-12-25", publishedOn: "2026-11-15",
    requiredSkills: ["Python", "Machine learning"], nice: ["C++"],
    description: "Take part in a project on image recognition for industrial inspection.\nYou will label data, run training experiments and describe the results in a short internal report." },
  { id: "o12", title: "Research Assistant, Physics of Materials", company: "buketov", type: "research", field: "other", city: "karaganda", format: "on_site",
    duration: "1 semester", applyBy: "2027-01-10", publishedOn: "2026-11-14",
    requiredSkills: ["Python", "Excel", "Statistics"],
    description: "Help a laboratory group process measurement data and prepare plots for a paper.\nYou will learn how experiments are documented and how results are checked before publication." },
  { id: "o13", title: "UX Research Intern", company: "kolesa", type: "internship", field: "design", city: "almaty", format: "hybrid",
    duration: "3 months", salary: { min: 70000, max: 90000, currency: "RUB" }, applyBy: "2026-12-12", publishedOn: "2026-11-13",
    requiredSkills: ["UX research", "Figma", "Russian"], nice: ["English"],
    description: "Plan and run user interviews for the real estate marketplace, summarise what you learn and present it to product managers.\nA researcher from our team coaches you through each study." },
  { id: "o14", title: "DevOps Intern", company: "kazakhtelecom", type: "internship", field: "devops", city: "astana", format: "on_site",
    duration: "3 months", applyBy: "2026-12-28", publishedOn: "2026-11-12",
    requiredSkills: ["Linux", "Docker", "Git"], nice: ["Python"],
    description: "Learn how a production platform is run: deployments, monitoring and incident reviews.\nYou will automate one routine task and document it for the team." },
  { id: "o15", title: "Research Assistant, Energy Systems", company: "satbayev", type: "research", field: "other", city: "almaty", format: "on_site",
    duration: "1 semester", applyBy: "2027-01-10", publishedOn: "2026-11-11",
    requiredSkills: ["Python", "Excel", "Statistics"], nice: ["MATLAB"],
    description: "Join a group that models electricity demand for regional networks.\nYou will clean consumption data, run simulations and discuss the results at the group's weekly seminar." },
  { id: "o16", title: "Data Science Intern", company: "kaspi", type: "internship", field: "data_science", city: "almaty", format: "hybrid",
    duration: "4 months", salary: { min: 250000, max: 350000, currency: "KZT" }, applyBy: "2026-12-01", publishedOn: "2026-11-10",
    requiredSkills: ["Python", "Pandas", "Machine learning", "SQL"], nice: ["Statistics"],
    description: "Work on a recommendation model for the marketplace with a data scientist from the team.\nYou will prepare features, run experiments and compare them with the current model." },
  { id: "o17", title: "Junior Java Developer", company: "halyk", type: "full_time", field: "backend", city: "almaty", format: "hybrid",
    salary: { min: 420000, max: null, currency: "KZT" }, applyBy: "2027-01-20", publishedOn: "2026-11-09",
    requiredSkills: ["Java", "Spring", "SQL"], nice: ["Docker", "Git"],
    description: "Develop and support services of the digital banking platform in Java and Spring.\nNew developers get a buddy and a three-month plan with clear goals." },
  { id: "o18", title: "Research Intern, Bioinformatics", company: "nusom", type: "research", field: "data_analytics", city: "astana", format: "on_site",
    duration: "3 months", applyBy: "2026-12-18", publishedOn: "2026-11-08",
    requiredSkills: ["Python", "Statistics"], nice: ["Linux"],
    description: "Help analyse genetic and clinical data for a study run at the School of Medicine.\nYou will clean datasets, run statistical tests and learn how research data is kept anonymous." },
  { id: "o19", title: "Frontend Intern (React)", company: "arbuz", type: "internship", field: "frontend", city: "almaty", format: "remote",
    duration: "3 months", salary: { min: 150000, max: 150000, currency: "KZT" }, applyBy: "2026-12-14", publishedOn: "2026-11-07",
    requiredSkills: ["JavaScript", "React", "Git"], nice: ["TypeScript"],
    description: "Improve the checkout and product pages of the shop. You will take small tasks from the board, open pull requests and get reviews within a day." },
  { id: "o20", title: "Research Assistant, Applied Mathematics", company: "auezov", type: "research", field: "other", city: "shymkent", format: "on_site",
    duration: "1 semester", applyBy: "2026-12-30", publishedOn: "2026-11-06",
    requiredSkills: ["Python", "Statistics", "English"],
    description: "Support a mathematics group working on numerical methods: implement algorithms in Python, test them on examples and help prepare a conference paper." },
  { id: "o21", title: "Data Analyst (part-time)", company: "magnum", type: "part_time", field: "data_analytics", city: "almaty", format: "hybrid",
    salary: { min: 220000, max: 220000, currency: "KZT" }, applyBy: "2026-12-08", publishedOn: "2026-11-05",
    requiredSkills: ["Excel", "SQL", "Power BI"], nice: ["Python"],
    description: "Prepare sales and stock reports for category managers, about 20 hours a week.\nYou will own two regular dashboards and improve them with the managers' feedback." },
  { id: "o22", title: "Android Developer Intern", company: "kcell", type: "internship", field: "mobile", city: "almaty", format: "hybrid",
    duration: "3 months", applyBy: "2026-12-20", publishedOn: "2026-11-04",
    requiredSkills: ["Kotlin", "Git"], nice: ["Java"],
    description: "Build screens of the Kcell app in Kotlin with a mentor from the mobile team, and fix bugs reported by users." },
  { id: "o23", title: "Junior Product Analyst", company: "indrive", type: "full_time", field: "product", city: "almaty", format: "hybrid",
    salary: { min: 1500, max: 2200, currency: "USD" }, applyBy: "2027-01-31", publishedOn: "2026-11-03",
    requiredSkills: ["SQL", "Excel", "Statistics"], nice: ["Python", "English"],
    description: "Measure how new features change user behaviour: write SQL, design simple experiments and explain the results to product managers." },
  { id: "o24", title: "Research Assistant, Natural Language Processing", company: "aitu", type: "research", field: "data_science", city: "astana", format: "hybrid",
    duration: "4 months", applyBy: "2026-12-04", publishedOn: "2026-11-02",
    requiredSkills: ["Python", "Machine learning"], nice: ["Kazakh", "Russian"],
    description: "Work with a lecturer on text classification for Kazakh and Russian news.\nYou will build a labelled dataset, train baseline models and write up the comparison." },
];

const toItem = (r: Row): OpportunityItem => ({
  id: r.id, title: r.title, type: r.type, field: r.field, city: r.city, format: r.format, duration: r.duration ?? null, salary: r.salary ?? null,
  applyBy: r.applyBy, publishedOn: r.publishedOn, requiredSkills: r.requiredSkills, niceSkills: r.nice ?? [], company: { name: COMPANIES[r.company].name },
});

export const OPPORTUNITIES: OpportunityItem[] = ROWS.map(toItem);

export const detailOf = (id: string): OpportunityDetail | undefined => {
  const r = ROWS.find((x) => x.id === id);
  return r && { ...toItem(r), description: r.description, company: COMPANIES[r.company] };
};

/** Salary stress test for 390 px: the longest range the form accepts, and a million. */
export const LONG_SALARY: Salary = { min: 1000000, max: 999999999, currency: "KZT" };

/** The sparest valid opportunity: no salary, duration, nice-to-have skills, company website or company description. */
export const MINIMAL_DETAIL: OpportunityDetail = (() => {
  const d = detailOf("o11")!;
  return { ...d, duration: null, niceSkills: [], description: "Take part in a project on image recognition for industrial inspection.", company: { ...d.company, website: null, description: null } };
})();

/* ── What the server does, faked ─────────────────────────── */

const KINDS: Record<string, string[]> = { internship: ["internship"], vacancy: ["full_time", "part_time"], research: ["research"] };

/** Stands in for GET /api/student/opportunities: every word matches title, company or a skill; filters widen within a group. */
export function searchOpportunities(all: OpportunityItem[], query: OpportunityQuery): OpportunityPage {
  const words = query.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  const hit = all.filter((o) => {
    const text = [o.title, o.company.name, ...o.requiredSkills, ...o.niceSkills].join(" ").toLowerCase();
    return (
      words.every((w) => text.includes(w)) &&
      (!query.type || KINDS[query.type].includes(o.type)) &&
      (!query.format.length || query.format.includes(o.format)) &&
      (!query.city.length || query.city.includes(o.city)) &&
      (!query.field.length || query.field.includes(o.field))
    );
  });
  const num = (id: string) => Number(id.slice(1));
  const ordered = query.sort === "closing"
    ? [...hit].sort((a, b) => a.applyBy.localeCompare(b.applyBy) || num(b.id) - num(a.id))
    : [...hit].sort((a, b) => b.publishedOn.localeCompare(a.publishedOn) || num(b.id) - num(a.id));
  const pages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  return { items: ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: ordered.length, page, pageSize: PAGE_SIZE };
}

/* ── Prototype-only previews of the later features (R11) ─── */

export const STUDENT_HAS = STUDENT_SKILLS;

/** A made-up score for the preview only: required skills weigh 3 to 1 against nice-to-have. The shipped pages never compute one. */
export function previewScore(o: Pick<OpportunityItem, "requiredSkills" | "niceSkills">, have = STUDENT_HAS): number {
  const owned = new Set(have.map((s) => s.toLowerCase()));
  const share = (list: string[]) => (list.length ? list.filter((s) => owned.has(s.toLowerCase())).length / list.length : 0);
  const nice = o.niceSkills.length ? share(o.niceSkills) : share(o.requiredSkills);
  return Math.round(100 * (0.75 * share(o.requiredSkills) + 0.25 * nice));
}
