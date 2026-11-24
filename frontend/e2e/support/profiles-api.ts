import type { Page, Route } from "@playwright/test";
import { account, type Role } from "./auth-api";
import { mockCv } from "./cv-api";
import { CATALOG } from "./vacancies-api";

/*
 * page.route mocks for /api/student/profile, /api/company/profile and the catalog the profile forms use — bodies follow
 * specs/003-profiles/contracts/profiles-api.md. Call before page.goto(); later registrations win (Playwright semantics).
 * Every helper that serves a student profile also registers the default CV mock ("no CV", 006-cv) for the profile page;
 * a spec that cares about the CV registers its own cvServer AFTER these calls. Write helpers push each parsed request body into a `sink` so tests can assert them.
 */

export type Sink = Record<string, unknown>[];
export { CATALOG as PROFILE_CATALOG };

const json = (route: Route, status: number, body?: unknown) =>
  route.fulfill(body === undefined ? { status } : { status, contentType: "application/json", body: JSON.stringify(body) });

const err = (route: Route, status: number, code: string, extra: Record<string, unknown> = {}) =>
  json(route, status, { detail: { code, message: `mock ${code}`, ...extra } });

const NO_CONTACTS = { phone: null, whatsapp: null, telegram: null, linkedin_url: null, github_url: null, website_url: null };

/** An API-shaped StudentProfile: what onboarding saves (no extras), unless overridden. */
export const studentProfileFixture = (overrides: Record<string, unknown> = {}) => ({
  full_name: "Maya Akhmetova", university: "Satbayev University", degree: "bachelor", major: "Computer Science",
  study_year: 3, graduated: false, gpa: null, looking_for_fields: ["backend"], position_types: ["internship"],
  city: null, about: null, contacts: NO_CONTACTS, projects: [], languages: [], version: 1,
  created_at: "2026-11-22T06:40:00Z", updated_at: "2026-11-22T06:40:00Z",
  ...overrides,
});

/** The stored profile the API returns for a POST body (StudentProfileIn + version and timestamps). */
const createdFrom = (body: Record<string, unknown>) => ({
  ...studentProfileFixture(),
  ...body,
  version: 1,
  created_at: "2026-11-23T09:00:00Z",
  updated_at: "2026-11-23T09:00:00Z",
});

type Handler = (route: Route) => Promise<void>;
/** `times`: answer only the first n matching calls, then fall back to earlier registrations (a failure that recovers). */
const at = (page: Page, method: string, path: string, handler: Handler, times?: number) => {
  let left = times ?? Infinity;
  return page.route(`**${path}`, (route) => {
    if (route.request().method() !== method || left <= 0) return route.fallback();
    left -= 1;
    return handler(route);
  });
};

const STUDENT = "/api/student/profile";

export const mockProfileCatalog = {
  ok: (page: Page) => at(page, "GET", "/api/catalog", (r) => json(r, 200, CATALOG)),
  network: (page: Page, times?: number) => at(page, "GET", "/api/catalog", (r) => r.abort("failed"), times),
};

export const mockStudentProfile = {
  ok: async (page: Page, profile = studentProfileFixture()) => {
    await mockCv.none(page);
    await at(page, "GET", STUDENT, (r) => json(r, 200, profile));
  },
  notFound: (page: Page) => at(page, "GET", STUDENT, (r) => err(r, 404, "profile_not_found")),
  /** `times`: fail only the first n calls (the page retries once by itself, so 2 = the load fails, Try again works). */
  serverError: (page: Page, times?: number) => at(page, "GET", STUDENT, (r) => err(r, 500, "server_error"), times),
  network: (page: Page, times?: number) => at(page, "GET", STUDENT, (r) => r.abort("failed"), times),
};

export const mockStudentCreate = {
  serverError: (page: Page, sink: Sink = [], times?: number) =>
    at(page, "POST", STUDENT, (r) => { sink.push(r.request().postDataJSON()); return err(r, 500, "server_error"); }, times),
  network: (page: Page, sink: Sink = [], times?: number) =>
    at(page, "POST", STUDENT, (r) => { sink.push(r.request().postDataJSON()); return r.abort("failed"); }, times),
  exists: (page: Page) => at(page, "POST", STUDENT, (r) => err(r, 409, "profile_exists")),
  /** FastAPI's default 422 list for one field. */
  validation: (page: Page, loc: (string | number)[], sink: Sink = []) =>
    at(page, "POST", STUDENT, (r) => {
      sink.push(r.request().postDataJSON());
      return json(r, 422, { detail: [{ loc, msg: "Value error, mock", type: "value_error" }] });
    }),
};

/**
 * A signed-in account of `role` with no profile yet, served like the real backend: GET /me says `has_profile: false`
 * and GET profile is 404 until a POST succeeds; then both reflect the created profile. Returns the POST bodies.
 */
export async function newStudent(page: Page, { email = "maya@sdu.edu.kz" }: { email?: string } = {}) {
  const posted: Sink = [];
  let stored: Record<string, unknown> | undefined;
  const role: Role = "student";
  await mockCv.none(page);
  await page.route("**/api/auth/me", (r) =>
    r.request().method() === "GET" ? json(r, 200, { account: account(role, email, Boolean(stored)) }) : r.fallback());
  await at(page, "GET", STUDENT, (r) => (stored ? json(r, 200, stored) : err(r, 404, "profile_not_found")));
  await at(page, "POST", STUDENT, (r) => {
    const body = r.request().postDataJSON() as Record<string, unknown>;
    posted.push(body);
    stored = createdFrom(body);
    return json(r, 201, stored);
  });
  return { posted };
}

const COMPANY = "/api/company/profile";

/** An API-shaped CompanyProfile built from a POST body (CompanyProfileIn; the API adds https:// to a bare website). */
const companyFrom = (body: Record<string, unknown>) => ({
  ...body,
  website: typeof body.website === "string" && !/^https?:\/\//.test(body.website) ? `https://${body.website}` : body.website ?? null,
  version: 1, created_at: "2026-11-23T09:00:00Z", updated_at: "2026-11-23T09:00:00Z",
});

/**
 * A signed-in employer with no company profile, served like the real backend: /me `has_profile: false`, GET company
 * profile 404 and every /api/company/vacancies* call 403 `company_profile_required` until a POST succeeds; afterwards
 * the vacancy list is empty. Returns the POST bodies.
 */
export async function newEmployer(page: Page, { email = "hr@kaspi.kz" }: { email?: string } = {}) {
  const posted: Sink = [];
  let stored: Record<string, unknown> | undefined;
  await page.route("**/api/auth/me", (r) =>
    r.request().method() === "GET" ? json(r, 200, { account: account("employer", email, Boolean(stored)) }) : r.fallback());
  await page.route(/\/api\/company\/vacancies(\/.*)?(\?.*)?$/, (r) =>
    stored
      ? json(r, 200, { items: [], counts: { all: 0, draft: 0, open: 0, paused: 0, closed: 0 } })
      : err(r, 403, "company_profile_required"));
  await at(page, "GET", COMPANY, (r) => (stored ? json(r, 200, stored) : err(r, 404, "profile_not_found")));
  await at(page, "POST", COMPANY, (r) => {
    const body = r.request().postDataJSON() as Record<string, unknown>;
    posted.push(body);
    stored = companyFrom(body);
    return json(r, 201, stored);
  });
  return { posted };
}

/**
 * A stored profile served like the real backend: GET returns it; PUT with the current `version` stores the body
 * (version + 1), a stale version → 409 `version_conflict` with `profile` = current. `elsewhere(patch)` simulates a save
 * from another tab. `fail` makes the next PUTs answer an error instead. Returns the PUT bodies and the current copy.
 */
async function profileServer(page: Page, path: string, initial: Record<string, unknown>, toStored: (b: Record<string, unknown>) => Record<string, unknown>) {
  const puts: Sink = [];
  const state = { current: { ...initial } as Record<string, unknown>, fail: [] as ("server" | "validation")[], validationLoc: [] as (string | number)[] };
  await at(page, "GET", path, (r) => json(r, 200, state.current));
  await at(page, "PUT", path, (r) => {
    const body = r.request().postDataJSON() as Record<string, unknown>;
    puts.push(body);
    const failure = state.fail.shift();
    if (failure === "server") return err(r, 500, "server_error");
    if (failure === "validation") return json(r, 422, { detail: [{ loc: state.validationLoc, msg: "Value error, mock", type: "value_error" }] });
    if (body.version !== state.current.version) return err(r, 409, "version_conflict", { profile: state.current });
    const { version: _v, ...content } = body;
    state.current = { ...state.current, ...toStored(content), version: Number(state.current.version) + 1, updated_at: "2026-11-23T10:00:00Z" };
    return json(r, 200, state.current);
  });
  return {
    puts,
    current: () => state.current,
    elsewhere: (patch: Record<string, unknown>) => {
      state.current = { ...state.current, ...patch, version: Number(state.current.version) + 1, updated_at: "2026-11-23T09:30:00Z" };
    },
    failNext: (kind: "server" | "validation", loc: (string | number)[] = []) => { state.fail.push(kind); state.validationLoc = loc; },
  };
}

export const studentServer = async (page: Page, initial = studentProfileFixture()) => {
  await mockCv.none(page);
  return profileServer(page, STUDENT, initial, (b) => b);
};

export const companyServer = (page: Page, initial: Record<string, unknown>) =>
  profileServer(page, COMPANY, initial, (b) => companyFrom(b));

export const mockCompanyCreate = {
  serverError: (page: Page, sink: Sink = [], times?: number) =>
    at(page, "POST", COMPANY, (r) => { sink.push(r.request().postDataJSON()); return err(r, 500, "server_error"); }, times),
};
