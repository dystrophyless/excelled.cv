import type { IconName } from "@/components/icons";
import type { TagTone } from "@/components/ui";
import { draftToSalary, salaryToDraft, type CurrencyOption, type Salary, type SalaryDraft } from "@/lib/money";

/*
 * View-model of the employer's vacancies (what the views render). The page containers map the API
 * (contracts/vacancies-api.md) onto these types: snake_case → camelCase, timestamps → ISO dates, ids → strings.
 * Pure helpers only — no fetching, no URL.
 */

export type VacancyStatus = "draft" | "open" | "paused" | "closed";
export type ClosedBy = "employer" | "deadline";
export type VacancyAction = "publish" | "pause" | "resume" | "close" | "reopen" | "delete";
export type MenuAction = "edit" | VacancyAction;

export type VacancyItem = {
  id: string;
  title: string;
  /** catalog values; null while a draft is incomplete */
  type: string | null;
  field: string | null;
  city: string | null;
  format: string | null;
  description: string | null;
  duration: string | null;
  /** monthly amounts + currency (FR-020); null = none */
  salary: Salary | null;
  /** ISO date YYYY-MM-DD */
  applyBy: string | null;
  requiredSkills: string[];
  niceSkills: string[];
  status: VacancyStatus;
  /** ISO date the vacancy was last closed (Closed only) */
  closedOn: string | null;
  closedBy: ClosedBy | null;
  applicants: number;
  newApplicants: number;
  version: number;
  /** ISO date of the last change */
  updatedOn: string;
};

export type CatalogOption = { value: string; label: string };
export type Catalog = {
  types: CatalogOption[]; fields: CatalogOption[]; cities: CatalogOption[]; formats: CatalogOption[];
  /** tenge first (the default), then USD, EUR, RUB */
  currencies: CurrencyOption[];
};

/** The form values of the wizard and the edit form (VacancyInput in the API). */
export type VacancyDraft = {
  title: string;
  type: string;
  field: string;
  city: string;
  format: string;
  description: string;
  duration: string;
  /** digits as typed, see SalaryField */
  salary: SalaryDraft;
  applyBy: string;
  requiredSkills: string[];
  niceSkills: string[];
};

/** Field keys the API names in `incomplete.fields`. */
export type DraftField = "title" | "type" | "field" | "city" | "format" | "description" | "applyBy" | "requiredSkills" | "salary";
export type DraftErrors = Partial<Record<DraftField, string>>;

export type VacancyRoutes = {
  list: string;
  create: string;
  view: (id: string) => string;
  edit: (id: string) => string;
};

/** A message that must stay visible on the page (a refused action, an unfinished draft). */
export type VacancyNotice = {
  tone: "info" | "warning" | "error";
  title: string;
  text: string;
  action?: { label: string; onClick?: () => void; to?: string };
};

export const STATUS_META: Record<VacancyStatus, { label: string; tone: TagTone }> = {
  draft: { label: "Draft", tone: "warning" },
  open: { label: "Open", tone: "success" },
  paused: { label: "Paused", tone: "accent" },
  closed: { label: "Closed", tone: "neutral" },
};

export const ACTION_META: Record<MenuAction, { label: string; icon: IconName; danger?: boolean }> = {
  edit: { label: "Edit", icon: "edit" },
  publish: { label: "Publish", icon: "postVacancy" },
  pause: { label: "Pause", icon: "hide" },
  resume: { label: "Resume", icon: "show" },
  close: { label: "Close vacancy", icon: "lock", danger: true },
  reopen: { label: "Reopen", icon: "retry" },
  delete: { label: "Delete draft", icon: "delete", danger: true },
};

/** Only the actions valid for the status (data-model.md state machine), in menu order. */
export function actionsFor(status: VacancyStatus): MenuAction[] {
  switch (status) {
    case "draft": return ["edit", "publish", "delete"];
    case "open": return ["edit", "pause", "close"];
    case "paused": return ["edit", "resume", "close"];
    case "closed": return ["edit", "reopen"];
  }
}

/** Actions that open a dialog first; the rest act immediately and confirm with a toast. */
export const DIALOG_ACTIONS: VacancyAction[] = ["close", "reopen", "delete"];

export const TOASTS: Record<VacancyAction, { title: string; description?: (v: VacancyItem) => string | undefined }> = {
  publish: { title: "Vacancy published", description: () => "Students can find it now" },
  pause: { title: "Vacancy paused", description: () => "Hidden from search until you resume it" },
  resume: { title: "Vacancy resumed", description: (v) => (v.applyBy ? `Open until ${formatDay(v.applyBy)}` : undefined) },
  close: { title: "Vacancy closed", description: () => "Students can no longer apply" },
  reopen: { title: "Vacancy reopened", description: (v) => (v.applyBy ? `Open until ${formatDay(v.applyBy)}` : undefined) },
  delete: { title: "Draft deleted" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-30" → "30 Nov". No Date object, so the result never depends on the viewer's time zone. */
export function formatDay(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "2026-11-30" → "30 Nov 2026" */
export function formatDayYear(iso: string): string {
  return `${formatDay(iso)} ${iso.slice(0, 4)}`;
}

/** Who closed it and when — shown to the employer (FR-015). Null unless Closed. */
export function closedLine(v: VacancyItem): string | null {
  if (v.status !== "closed" || !v.closedOn) return null;
  return v.closedBy === "deadline" ? `Closed on its deadline, ${formatDay(v.closedOn)}` : `Closed by you on ${formatDay(v.closedOn)}`;
}

/** Short version for table cells: "by you on 22 Oct" / "on its deadline". */
export function closedShort(v: VacancyItem): string | null {
  if (v.status !== "closed" || !v.closedOn) return null;
  return v.closedBy === "deadline" ? "on its deadline" : `by you on ${formatDay(v.closedOn)}`;
}

/** The status line of the vacancy page and the edit form. */
export function statusLine(v: VacancyItem): string {
  switch (v.status) {
    case "draft": return "Not visible to students yet";
    case "open": return v.applyBy ? `Closes ${formatDay(v.applyBy)}` : "Open";
    case "paused": return v.applyBy ? `Hidden from search · closes ${formatDay(v.applyBy)}` : "Hidden from search";
    case "closed": return closedLine(v) ?? "Closed";
  }
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const STATUS_FILTERS: { value: "all" | VacancyStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "draft", label: "Draft" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
];

export type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];
export type StatusCounts = Record<StatusFilter, number>;

export const optionLabel = (options: CatalogOption[], value: string | null) => options.find((o) => o.value === value)?.label ?? null;

/** Draft form values from a vacancy (null fields become empty strings). */
export function toDraft(v: VacancyItem): VacancyDraft {
  return {
    title: v.title, type: v.type ?? "", field: v.field ?? "", city: v.city ?? "", format: v.format ?? "",
    description: v.description ?? "", duration: v.duration ?? "", salary: salaryToDraft(v.salary), applyBy: v.applyBy ?? "",
    requiredSkills: v.requiredSkills, niceSkills: v.niceSkills,
  };
}

/** Do two form states hold the same vacancy? The salary is compared by value: a currency with no amounts is no salary. */
export const sameDraft = (a: VacancyDraft, b: VacancyDraft) =>
  JSON.stringify({ ...a, salary: draftToSalary(a.salary) }) === JSON.stringify({ ...b, salary: draftToSalary(b.salary) });

export const DRAFT_FIELD_LABEL: Record<DraftField, string> = {
  title: "Title", type: "Type", field: "Field", city: "City", format: "Format", description: "Description",
  applyBy: "Apply by", requiredSkills: "Required skills", salary: "Salary",
};
