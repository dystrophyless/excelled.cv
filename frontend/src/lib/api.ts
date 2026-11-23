/** Typed error for every failed API call. `code` drives the UI; `message` is a human fallback. */
export class ApiError extends Error {
  status: number;
  code: string;
  retryAfter?: number;
  attemptsLeft?: number;

  constructor(init: { status: number; code: string; message: string; retryAfter?: number; attemptsLeft?: number }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.retryAfter = init.retryAfter;
    this.attemptsLeft = init.attemptsLeft;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON body. */
  json?: unknown;
  /** application/x-www-form-urlencoded body (used by POST /api/auth/token). */
  form?: Record<string, string>;
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
    });
  }
  // Non-contract body, e.g. FastAPI's default 422 shape.
  if (status === 422) return new ApiError({ status: 422, code: "validation", message: "Check the highlighted fields." });
  return new ApiError({ status, code: "unknown", message: "Something went wrong." });
}

export async function api<T>(path: string, { method, json, form, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form);
  } else if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }

  let res: Response;
  try {
    res = await fetch(path, { method: method ?? (body ? "POST" : "GET"), headers, body, credentials: "include", signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({ status: 0, code: "network", message: "Can't reach Novio. Check your connection." });
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res.status, data);
  return data as T;
}
