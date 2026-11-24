import type { Page, Route } from "@playwright/test";

/*
 * page.route mocks for /api/student/cv — bodies follow specs/006-cv/contracts/cv-api.md. Call before page.goto();
 * later registrations win (Playwright semantics). Fixture files are built in memory (no files on disk).
 */

export type ApiCvFixture = { id: string; file_name: string; format: "pdf" | "docx"; size_bytes: number; uploaded_at: string };

const json = (route: Route, status: number, body?: unknown, headers: Record<string, string> = {}) =>
  route.fulfill(body === undefined ? { status, headers } : { status, headers, contentType: "application/json", body: JSON.stringify(body) });

const err = (route: Route, status: number, code: string, extra: Record<string, unknown> = {}) =>
  json(route, status, { detail: { code, message: `mock ${code}`, ...extra } });

export const CV_LIMITS_API = { formats: ["pdf", "docx"], max_bytes: 5 * 1024 * 1024 };

export const cvFixture = (overrides: Partial<ApiCvFixture> = {}): ApiCvFixture => ({
  id: "cv-1", file_name: "Maya_Akhmetova_CV.pdf", format: "pdf", size_bytes: 482 * 1024, uploaded_at: "2026-11-25T09:00:00Z", ...overrides,
});

/* ── files, built in memory ───────────────────────────────────────────────── */

export type TestFile = { name: string; mimeType: string; buffer: Buffer };

const padTo = (head: string, size: number) => Buffer.concat([Buffer.from(head, "latin1"), Buffer.alloc(Math.max(0, size - head.length), 0x20)]);

export const pdfFile = (name = "Maya_Akhmetova_CV.pdf", size = 2048): TestFile => ({ name, mimeType: "application/pdf", buffer: padTo("%PDF-1.4\n", size) });
export const docxFile = (name = "Maya_Akhmetova_CV.docx", size = 2048): TestFile => ({
  name, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: padTo("PK\x03\x04", size),
});
/** A name that says PDF over bytes that are not one. */
export const fakePdf = (name = "notes.pdf"): TestFile => ({ name, mimeType: "application/pdf", buffer: Buffer.from("just some text, not a PDF at all") });
export const emptyFile = (name = "empty.pdf"): TestFile => ({ name, mimeType: "application/pdf", buffer: Buffer.alloc(0) });
export const textFile = (name = "cv.txt"): TestFile => ({ name, mimeType: "text/plain", buffer: Buffer.from("hello") });
export const bigPdf = (name = "Portfolio_scans.pdf"): TestFile => ({ name, mimeType: "application/pdf", buffer: padTo("%PDF-1.4\n", 5 * 1024 * 1024 + 1) });

/* ── the server ───────────────────────────────────────────────────────────── */

/** What the next POSTs do instead of storing: the request is still recorded. */
export type PostFailure =
  | "network"          // the request never gets an answer
  | "server"           // 500
  | "timeout"          // 408 cv_upload_timeout
  | "lose-answer"      // stored, but the answer is lost (an ambiguous failure)
  | "empty" | "format" | "too-large" | "name"  // 422 / 413 refusals
  | "unauthorized" | "no-profile";

export type CvPost = { name: string; size: number; contentType: string | undefined };

const format = (name: string): "pdf" | "docx" => (name.toLowerCase().endsWith(".docx") ? "docx" : "pdf");

/**
 * A CV served like the real backend: GET returns it and the limits; POST stores (409 `cv_exists` when one exists);
 * the file GET returns the stored bytes (409 `cv_changed` for a stale id). `elsewhere(cv)` simulates another tab
 * (null removes the CV). Returns the recorded requests and controls.
 */
export async function cvServer(page: Page, initial: ApiCvFixture | null = null, initialBytes: Buffer = pdfFile().buffer) {
  const state = {
    cv: initial,
    bytes: initialBytes,
    postFailures: [] as PostFailure[],
    getFailures: [] as ("server" | "network")[],
    fileFailures: [] as ("server" | "network")[],
    nextId: 2,
  };
  const posts: CvPost[] = [];
  const gets: number[] = [];
  const downloads: string[] = [];

  await page.route(/\/api\/student\/cv(\?.*)?$/, async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      gets.push(Date.now());
      const failure = state.getFailures.shift();
      if (failure === "network") return route.abort("failed");
      if (failure === "server") return err(route, 500, "server_error");
      return json(route, 200, { cv: state.cv, limits: CV_LIMITS_API }, { "Cache-Control": "no-store" });
    }
    if (request.method() !== "POST") return route.fallback();
    const body = request.postDataBuffer() ?? Buffer.alloc(0);
    const headerName = request.headers()["x-file-name"] ?? "";
    const name = decodeURIComponent(headerName);
    posts.push({ name, size: body.length, contentType: request.headers()["content-type"] });
    const failure = state.postFailures.shift();
    switch (failure) {
      case "network": return route.abort("failed");
      case "server": return err(route, 500, "server_error");
      case "timeout": return err(route, 408, "cv_upload_timeout");
      case "empty": return err(route, 422, "cv_empty");
      case "format": return err(route, 422, "cv_format_unsupported");
      case "name": return err(route, 422, "cv_name_invalid");
      case "too-large": return err(route, 413, "cv_too_large", { max_bytes: CV_LIMITS_API.max_bytes });
      case "unauthorized": return err(route, 401, "not_signed_in");
      case "no-profile": return err(route, 403, "student_profile_required");
      default:
    }
    if (state.cv) return err(route, 409, "cv_exists", { cv: state.cv });
    state.cv = cvFixture({ id: `cv-${state.nextId++}`, file_name: name, format: format(name), size_bytes: body.length, uploaded_at: "2026-11-25T10:00:00Z" });
    state.bytes = body;
    if (failure === "lose-answer") return route.abort("failed");
    return json(route, 201, state.cv);
  });

  await page.route(/\/api\/student\/cv\/[^/]+\/file$/, async (route) => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split("/").at(-2)!);
    downloads.push(id);
    const failure = state.fileFailures.shift();
    if (failure === "network") return route.abort("failed");
    if (failure === "server") return err(route, 500, "server_error");
    if (!state.cv || state.cv.id !== id) return err(route, 409, "cv_changed", { cv: state.cv });
    return route.fulfill({
      status: 200,
      body: state.bytes,
      headers: {
        "Content-Type": state.cv.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(state.cv.file_name)}`,
        "Cache-Control": "private, no-store",
      },
    });
  });

  return {
    posts,
    gets,
    downloads,
    current: () => state.cv,
    failPost: (...kinds: PostFailure[]) => { state.postFailures.push(...kinds); },
    failGet: (...kinds: ("server" | "network")[]) => { state.getFailures.push(...kinds); },
    failFile: (...kinds: ("server" | "network")[]) => { state.fileFailures.push(...kinds); },
    /** Another tab changed the CV (null: removed). `bytes` is what a download then returns. */
    elsewhere: (cv: ApiCvFixture | null, bytes?: Buffer) => { state.cv = cv; if (bytes) state.bytes = bytes; },
  };
}

/** Default for every page that shows My profile: the CV request answers "no CV". */
export const mockCv = {
  none: (page: Page) => cvServer(page, null),
  stored: (page: Page, cv: ApiCvFixture = cvFixture()) => cvServer(page, cv),
  serverError: (page: Page) => page.route(/\/api\/student\/cv(\?.*)?$/, (r) => err(r, 500, "server_error")),
};
