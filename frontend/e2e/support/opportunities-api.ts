import type { Page, Route } from "@playwright/test";
import type { ApiSalary } from "./vacancies-api";
import { signedInAs } from "./auth-api";
import { mockStudentProfile } from "./profiles-api";
import { mockCatalog } from "./vacancies-api";

/*
 * page.route mocks for /api/student/opportunities… — bodies follow specs/004-student-opportunities/contracts/opportunities-api.md.
 * Call before page.goto(); later registrations win. `serve` behaves like the real list endpoint (search words, type, filters,
 * sort, 10 per page, clamped page) and records every request's query string so tests can assert what was asked.
 */

export type ApiOpportunity = {
  id: number; title: string; type: string; field: string; city: string; format: string; duration: string | null; salary: ApiSalary | null;
  apply_by: string; published_at: string; required_skills: string[]; nice_skills: string[]; company: { name: string };
};
export type ApiCompanyDetail = { name: string; industry: string | null; size: string | null; city: string | null; website: string | null; description: string | null };
export type ApiOpportunityDetail = Omit<ApiOpportunity, "company"> & { description: string; company: ApiCompanyDetail };

const json = (route: Route, status: number, body?: unknown) =>
  route.fulfill(body === undefined ? { status } : { status, contentType: "application/json", body: JSON.stringify(body) });
const err = (route: Route, status: number, code: string) => json(route, status, { detail: { code, message: `mock ${code}` } });

/** A far-future deadline keeps "Apply by …" (not "Closes in …") stable; the clock is not mocked. */
export const opportunityFixture = (overrides: Partial<ApiOpportunity> = {}): ApiOpportunity => ({
  id: 1, title: "Backend Intern (Python)", type: "internship", field: "backend", city: "almaty", format: "hybrid",
  duration: "3 months", salary: { min: 200000, max: 300000, currency: "KZT" }, apply_by: "2099-12-15", published_at: "2026-11-20T08:00:00Z",
  required_skills: ["Python", "SQL", "Git"], nice_skills: ["Docker"], company: { name: "Kaspi.kz" },
  ...overrides,
});

export const detailFixture = (overrides: Partial<ApiOpportunityDetail> = {}): ApiOpportunityDetail => {
  const { company: _company, ...item } = opportunityFixture();
  return {
    ...item,
    description: "Join the Payments team.\nYou will build and test internal APIs.",
    company: {
      name: "Kaspi.kz", industry: "finance", size: "1000_plus", city: "almaty", website: "https://kaspi.kz",
      description: "Payments, marketplace and banking in one app.",
    },
    ...overrides,
  };
};

/** `n` distinct opportunities, newest first (ids n … 1), titles "Opportunity <id>". */
export const manyOpportunities = (n: number, make: (id: number) => Partial<ApiOpportunity> = () => ({})): ApiOpportunity[] =>
  Array.from({ length: n }, (_, i) => {
    const id = n - i;
    const day = String(28 - Math.min(27, Math.floor(i / 2))).padStart(2, "0");
    return opportunityFixture({ id, title: `Opportunity ${id}`, published_at: `2026-11-${day}T08:00:00Z`, ...make(id) });
  });

const PAGE_SIZE = 10;
const LIST = /\/api\/student\/opportunities(\?.*)?$/;
const ONE = /\/api\/student\/opportunities\/[^/?]+(\?.*)?$/;
const KINDS: Record<string, string[]> = { internship: ["internship"], vacancy: ["full_time", "part_time"], research: ["research"] };

const matches = (o: ApiOpportunity, p: URLSearchParams) => {
  const words = (p.get("q") ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [o.title, o.company.name, ...o.required_skills, ...o.nice_skills].map((s) => s.toLowerCase());
  const kind = p.get("type");
  const inAny = (key: string, value: string) => !p.getAll(key).length || p.getAll(key).includes(value);
  return (
    words.every((w) => haystack.some((h) => h.includes(w))) &&
    (!kind || KINDS[kind]?.includes(o.type)) &&
    inAny("format", o.format) && inAny("city", o.city) && inAny("field", o.field)
  );
};

/** The real endpoint's answer for `items` and the request's query. */
export function pageFor(items: ApiOpportunity[], p: URLSearchParams) {
  const shown = items.filter((o) => matches(o, p));
  shown.sort(p.get("sort") === "closing" ? (a, b) => a.apply_by.localeCompare(b.apply_by) || b.id - a.id : (a, b) => b.published_at.localeCompare(a.published_at) || b.id - a.id);
  const last = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const page = shown.length ? Math.min(Math.max(1, Number(p.get("page") ?? 1)), last) : 1;
  return { items: shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: shown.length, page, page_size: PAGE_SIZE };
}

type Handler = (route: Route) => Promise<void>;
/** `times`: answer only the first n calls, then fall back to earlier registrations (a failure that recovers). */
const onList = (page: Page, handler: Handler, times?: number) => {
  let left = times ?? Infinity;
  return page.route(LIST, (route) => {
    if (route.request().method() !== "GET" || left <= 0) return route.fallback();
    left -= 1;
    return handler(route);
  });
};
const onOne = (page: Page, handler: Handler, times?: number) => {
  let left = times ?? Infinity;
  return page.route(ONE, (route) => {
    if (route.request().method() !== "GET" || left <= 0) return route.fallback();
    left -= 1;
    return handler(route);
  });
};

export const mockOpportunities = {
  /** Serves `items` like the real endpoint; `requests` collects each request's query string; `delay(params)` may hold an answer back. */
  serve: (page: Page, items: ApiOpportunity[], { requests = [], delay }: { requests?: string[]; delay?: (p: URLSearchParams) => number } = {}) =>
    onList(page, async (r) => {
      const params = new URL(r.request().url()).searchParams;
      requests.push(params.toString());
      const wait = delay?.(params) ?? 0;
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      await json(r, 200, pageFor(items, params)).catch(() => undefined); // an aborted request has nothing to answer
    }),
  empty: (page: Page) => onList(page, (r) => json(r, 200, { items: [], total: 0, page: 1, page_size: PAGE_SIZE })),
  serverError: (page: Page, times?: number) => onList(page, (r) => err(r, 500, "server_error"), times),
  network: (page: Page, times?: number) => onList(page, (r) => r.abort("failed"), times),
  profileRequired: (page: Page) => onList(page, (r) => err(r, 403, "student_profile_required")),
  notSignedIn: (page: Page) => onList(page, (r) => err(r, 401, "not_signed_in")),
};

export const mockOpportunity = {
  ok: (page: Page, detail: ApiOpportunityDetail = detailFixture(), requests: string[] = []) =>
    onOne(page, (r) => { requests.push(new URL(r.request().url()).pathname); return json(r, 200, detail); }),
  /** Same body for every id (closed, paused, draft, expired, missing). */
  unavailable: (page: Page, requests: string[] = []) =>
    onOne(page, (r) => { requests.push(new URL(r.request().url()).pathname); return err(r, 404, "opportunity_unavailable"); }),
  serverError: (page: Page, times?: number) => onOne(page, (r) => err(r, 500, "server_error"), times),
  network: (page: Page, times?: number) => onOne(page, (r) => r.abort("failed"), times),
};

/** A signed-in student with a profile and the catalog, as every student page needs (the layout reads the profile name). */
export async function signedInStudent(page: Page) {
  await signedInAs(page, "student");
  await mockCatalog.ok(page);
  await mockStudentProfile.ok(page);
}
