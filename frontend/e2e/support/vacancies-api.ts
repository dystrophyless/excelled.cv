import type { Page, Route } from "@playwright/test";

/*
 * page.route mocks for /api/catalog, /api/skills and /api/company/vacancies… — bodies follow
 * specs/002-employer-vacancies/contracts/vacancies-api.md. Call before page.goto(); later registrations win.
 * Write helpers take a `sink` array and push each parsed request body into it so tests can assert them
 * (DELETE pushes `{ version }` from the query string).
 */

export type ApiVacancy = {
  id: number; title: string; type: string | null; field: string | null; city: string | null; format: string | null;
  description: string | null; duration: string | null; salary: string | null; apply_by: string | null; closes_at: string | null;
  required_skills: string[]; nice_skills: string[]; status: "draft" | "open" | "paused" | "closed";
  published_at: string | null; closed_at: string | null; closed_by: "employer" | "deadline" | null;
  applicants: number; new_applicants: number; version: number; created_at: string; updated_at: string;
};
export type Sink = Record<string, unknown>[];
type Status = ApiVacancy["status"];

export const CATALOG = {
  types: [{ value: "internship", label: "Internship" }, { value: "junior", label: "Junior job" }],
  fields: [{ value: "backend", label: "Backend" }, { value: "frontend", label: "Frontend" }, { value: "design", label: "Design" }],
  cities: [{ value: "almaty", label: "Almaty" }, { value: "astana", label: "Astana" }, { value: "remote", label: "Remote" }],
  formats: [{ value: "onsite", label: "On-site" }, { value: "hybrid", label: "Hybrid" }, { value: "remote", label: "Remote" }],
};

/** An API-shaped Vacancy (an Open internship with a far-future deadline by default). */
export const vacancyFixture = (overrides: Partial<ApiVacancy> = {}): ApiVacancy => ({
  id: 17, title: "Backend Intern (Python)", type: "internship", field: "backend", city: "almaty", format: "hybrid",
  description: "Join the Payments team.", duration: "3 months", salary: "200 000 ₸ / month",
  apply_by: "2099-11-30", closes_at: "2099-11-30T19:00:00Z", required_skills: ["Python", "SQL", "Git"], nice_skills: ["Docker"],
  status: "open", published_at: "2026-10-28T09:12:00Z", closed_at: null, closed_by: null,
  applicants: 0, new_applicants: 0, version: 3, created_at: "2026-10-27T10:00:00Z", updated_at: "2026-10-28T09:12:00Z",
  ...overrides,
});

export const countsFor = (items: ApiVacancy[]) => ({
  all: items.length,
  draft: items.filter((v) => v.status === "draft").length,
  open: items.filter((v) => v.status === "open").length,
  paused: items.filter((v) => v.status === "paused").length,
  closed: items.filter((v) => v.status === "closed").length,
});

const json = (route: Route, status: number, body?: unknown) =>
  route.fulfill(body === undefined ? { status } : { status, contentType: "application/json", body: JSON.stringify(body) });

const err = (route: Route, status: number, code: string, extra: Record<string, unknown> = {}) =>
  json(route, status, { detail: { code, message: `mock ${code}`, ...extra } });

type Handler = (route: Route) => Promise<void>;
type Register = (page: Page, handler: Handler) => Promise<void>;

/** Matches `/api/company/vacancies<suffix>` with an optional query string, for one HTTP method. */
const at = (page: Page, method: string, suffix: string, handler: Handler) =>
  page.route(new RegExp(`/api/company/vacancies${suffix}(\\?.*)?$`), (route) => (route.request().method() === method ? handler(route) : route.fallback()));

const ID = "/\\d+";
const bodyOf = (route: Route): Record<string, unknown> => (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
const recording = (sink: Sink, handler: Handler): Handler => (route) => {
  sink.push(bodyOf(route));
  return handler(route);
};

export const mockCatalog = {
  ok: (page: Page) => page.route("**/api/catalog", (r) => json(r, 200, CATALOG)),
  network: (page: Page) => page.route("**/api/catalog", (r) => r.abort("failed")),
};

export const mockSkills = {
  /** Case-insensitive prefix match on `q`; an empty q returns the first ten. */
  ok: (page: Page, all: string[] = ["Python", "PyTorch", "SQL", "Git", "Docker", "React", "TypeScript"]) =>
    page.route("**/api/skills**", (r) => {
      const q = (new URL(r.request().url()).searchParams.get("q") ?? "").toLowerCase();
      return json(r, 200, { skills: all.filter((s) => s.toLowerCase().startsWith(q)).slice(0, 10) });
    }),
  network: (page: Page) => page.route("**/api/skills**", (r) => r.abort("failed")),
};

/** Failures every /api/company/vacancies… endpoint can return. */
const failures = (register: Register) => ({
  notSignedIn: (page: Page) => register(page, (r) => err(r, 401, "not_signed_in")),
  wrongRole: (page: Page) => register(page, (r) => err(r, 403, "wrong_role")),
  notFound: (page: Page) => register(page, (r) => err(r, 404, "vacancy_not_found")),
  serverError: (page: Page) => register(page, (r) => err(r, 500, "server_error")),
  network: (page: Page) => register(page, (r) => r.abort("failed")),
});

const onList: Register = (page, h) => at(page, "GET", "", h);
export const mockVacancyList = {
  /** Serves `items` filtered by the `status` and `q` query params; counts cover all items (contract). */
  ok: (page: Page, items: ApiVacancy[]) =>
    onList(page, (r) => {
      const params = new URL(r.request().url()).searchParams;
      const status = params.get("status") ?? "all";
      const q = (params.get("q") ?? "").toLowerCase();
      const shown = items.filter((v) => (status === "all" || v.status === status) && v.title.toLowerCase().includes(q));
      return json(r, 200, { items: shown, counts: countsFor(items) });
    }),
  empty: (page: Page) => onList(page, (r) => json(r, 200, { items: [], counts: countsFor([]) })),
  ...failures(onList),
};

const onGet: Register = (page, h) => at(page, "GET", ID, h);
export const mockVacancyGet = {
  ok: (page: Page, vacancy: ApiVacancy) => onGet(page, (r) => json(r, 200, vacancy)),
  ...failures(onGet),
};

const onCreate: Register = (page, h) => at(page, "POST", "", h);
export const mockVacancyCreate = {
  /** 201 built from the request body: Open when `publish`, else Draft. */
  ok: (page: Page, sink: Sink = []) =>
    onCreate(page, recording(sink, (r) => {
      const { publish, ...b } = bodyOf(r);
      return json(r, 201, vacancyFixture({ id: 99, version: 1, status: publish ? "open" : "draft", ...b } as Partial<ApiVacancy>));
    })),
  incomplete: (page: Page, fields: string[] = ["type", "required_skills"], sink: Sink = []) =>
    onCreate(page, recording(sink, (r) => err(r, 422, "incomplete", { fields }))),
  applyByNotInFuture: (page: Page, sink: Sink = []) =>
    onCreate(page, recording(sink, (r) => err(r, 422, "apply_by_not_in_future"))),
  ...failures(onCreate),
};

const onUpdate: Register = (page, h) => at(page, "PUT", ID, h);
export const mockVacancyUpdate = {
  /** 200: `current` with the request content applied and version + 1. */
  ok: (page: Page, current: ApiVacancy, sink: Sink = []) =>
    onUpdate(page, recording(sink, (r) => {
      const { version: _version, ...content } = bodyOf(r);
      return json(r, 200, { ...current, ...content, version: current.version + 1 });
    })),
  incomplete: (page: Page, fields: string[] = ["description"], sink: Sink = []) =>
    onUpdate(page, recording(sink, (r) => err(r, 422, "incomplete", { fields }))),
  applyByNotInFuture: (page: Page, sink: Sink = []) =>
    onUpdate(page, recording(sink, (r) => err(r, 422, "apply_by_not_in_future"))),
  versionConflict: (page: Page, current: ApiVacancy, sink: Sink = []) =>
    onUpdate(page, recording(sink, (r) => err(r, 409, "version_conflict", { vacancy: current }))),
  ...failures(onUpdate),
};

const onStatus: Register = (page, h) => at(page, "POST", `${ID}/status`, h);
export const mockVacancyStatus = {
  /** 200 with `next` (the vacancy after the transition). */
  ok: (page: Page, next: ApiVacancy, sink: Sink = []) => onStatus(page, recording(sink, (r) => json(r, 200, next))),
  invalidTransition: (page: Page, current: Status = "closed", sink: Sink = []) =>
    onStatus(page, recording(sink, (r) => err(r, 409, "invalid_transition", { status: current, message: `This vacancy is ${current}.` }))),
  versionConflict: (page: Page, current: ApiVacancy, sink: Sink = []) =>
    onStatus(page, recording(sink, (r) => err(r, 409, "version_conflict", { vacancy: current }))),
  incomplete: (page: Page, fields: string[] = ["type", "required_skills"], sink: Sink = []) =>
    onStatus(page, recording(sink, (r) => err(r, 422, "incomplete", { fields }))),
  applyByNotInFuture: (page: Page, sink: Sink = []) =>
    onStatus(page, recording(sink, (r) => err(r, 422, "apply_by_not_in_future"))),
  ...failures(onStatus),
};

const onDelete: Register = (page, h) => at(page, "DELETE", ID, h);
export const mockVacancyDelete = {
  /** 204; `sink` receives `{ version }` from the query string. */
  ok: (page: Page, sink: Sink = []) =>
    onDelete(page, (r) => {
      sink.push({ version: Number(new URL(r.request().url()).searchParams.get("version")) });
      return json(r, 204);
    }),
  notADraft: (page: Page, current: Exclude<Status, "draft"> = "open") =>
    onDelete(page, (r) => err(r, 409, "not_a_draft", { status: current })),
  versionConflict: (page: Page, current: ApiVacancy) =>
    onDelete(page, (r) => err(r, 409, "version_conflict", { vacancy: current })),
  ...failures(onDelete),
};
