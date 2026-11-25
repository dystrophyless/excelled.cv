/** Typed error for every failed API call. `code` drives the UI; `message` is a human fallback. */
export class ApiError extends Error {
  status: number;
  code: string;
  retryAfter?: number;
  attemptsLeft?: number;
  /** The whole `detail` object, for codes that carry extra data (`fields`, `vacancy`, `status`). */
  detail?: Record<string, unknown>;
  /** FastAPI's default 422 list (`code` "validation"): which fields were refused, by `loc`. */
  validation?: { loc: (string | number)[]; msg: string; type: string }[];

  constructor(init: {
    status: number; code: string; message: string; retryAfter?: number; attemptsLeft?: number; detail?: Record<string, unknown>;
    validation?: { loc: (string | number)[]; msg: string; type: string }[];
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.retryAfter = init.retryAfter;
    this.attemptsLeft = init.attemptsLeft;
    this.detail = init.detail;
    this.validation = init.validation;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON body. */
  json?: unknown;
  /** application/x-www-form-urlencoded body (used by POST /api/auth/token). */
  form?: Record<string, string>;
  /** Raw body (a File or Blob), sent as is. */
  body?: BodyInit;
  /** Extra request headers. */
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

function toApiError(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail) && typeof (detail as { code?: unknown }).code === "string") {
    const d = detail as { code: string; message?: string; retry_after?: number; attempts_left?: number };
    return new ApiError({
      status,
      code: d.code,
      message: d.message ?? "Something went wrong.",
      retryAfter: d.retry_after,
      attemptsLeft: d.attempts_left,
      detail: detail as Record<string, unknown>,
    });
  }
  // Non-contract body, e.g. FastAPI's default 422 shape.
  if (status === 422) {
    const validation = Array.isArray(detail) ? (detail as ApiError["validation"]) : undefined;
    return new ApiError({ status: 422, code: "validation", message: "Check the highlighted fields.", validation });
  }
  return new ApiError({ status, code: "unknown", message: "Something went wrong." });
}

/** Percent-encoded UTF-8 for a header value; lone surrogates (which `encodeURIComponent` rejects) become U+FFFD. */
export function encodeHeaderText(text: string): string {
  return encodeURIComponent(text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "�"));
}

async function send(path: string, { method, json, form, body: raw, headers: extra, signal }: RequestOptions, accept: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: accept };
  let body: BodyInit | undefined;
  if (raw !== undefined) {
    body = raw;
  } else if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form);
  } else if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }
  Object.assign(headers, extra);

  let res: Response;
  try {
    res = await fetch(path, { method: method ?? (body ? "POST" : "GET"), headers, body, credentials: "include", signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({ status: 0, code: "network", message: "Can't reach Novio. Check your connection." });
  }
  if (!res.ok) throw toApiError(res.status, await res.json().catch(() => null));
  return res;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(path, options, "application/json");
  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => null)) as T;
}

/** A file download: the same request and error mapping as `api`, the body comes back as a Blob. */
export async function apiBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const res = await send(path, options, "*/*");
  try {
    return await res.blob();
  } catch {
    // the connection broke while the body was arriving
    throw new ApiError({ status: 0, code: "network", message: "Can't reach Novio. Check your connection." });
  }
}
