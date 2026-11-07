/**
 * Ahia API client.
 *
 * - Access token lives in memory only (never localStorage). The refresh token is
 *   an httpOnly cookie (`ahia_rt`) handled by the browser.
 * - On `401 TOKEN_EXPIRED` it refreshes ONCE (shared promise, because refresh
 *   tokens are single-use) and retries the request.
 * - Success responses are unwrapped to `data`; failures throw `ApiError`.
 *
 * Use from client components / browser code (it relies on cookies).
 */

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/$/, "");

export const BASE_URL = `${API_URL}/api/v1`;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type Currency = "NGN" | "CAD" | "XRP" | "RLUSD";

export interface PageInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ValidationDetail {
  path: string;
  message: string;
}

export interface User {
  id: number;
  email: string;
  phone: string | null;
  role: "user" | "admin";
  kyc_status: "none" | "pending" | "approved" | "rejected";
  email_verified_at: string | null;
  created_at: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  campus_location: string | null;
  university_id: number;
  university_name: string;
  university_short_name: string | null;
  currency: "NGN" | "CAD";
  country_code: string;
  country_name: string;
}

export interface University {
  id: number;
  name: string;
  short_name: string | null;
  city: string | null;
  currency: "NGN" | "CAD";
  country_code: string;
  country_name: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export class ApiError extends Error {
  status: number;
  code: string;
  details?: ValidationDetail[];

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ValidationDetail[]
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Map of field path -> message for VALIDATION_ERROR responses. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details ?? []) out[d.path] ??= d.message;
    return out;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    if (body?.error) {
      return new ApiError(
        res.status,
        body.error.code ?? "UNKNOWN",
        body.error.message ?? "Something went wrong",
        body.error.details
      );
    }
  } catch {
    /* non-JSON body */
  }
  return new ApiError(res.status, "UNKNOWN", "Something went wrong");
}

/* -------------------------------------------------------------------------- */
/* Session state                                                              */
/* -------------------------------------------------------------------------- */

let accessToken: string | null = null;
let refreshing: Promise<void> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

/** Called when a refresh fails mid-session (e.g. redirect to /login). */
export const onSessionExpired = (fn: (() => void) | null) => {
  sessionExpiredHandler = fn;
};

function refresh(): Promise<void> {
  refreshing ??= (async () => {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      accessToken = null;
      throw await toApiError(res);
    }
    const body = await res.json();
    accessToken = body.data.accessToken;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * Call once on app start to restore a session from the refresh cookie.
 * Returns the access token, or null if there is no valid session.
 */
export async function restoreSession(): Promise<string | null> {
  try {
    await refresh();
    return accessToken;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Core request                                                               */
/* -------------------------------------------------------------------------- */

export type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Query;
  /** JSON body */
  json?: unknown;
  /** FormData body (do not set Content-Type yourself) */
  form?: FormData;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function send(path: string, opts: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.json !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? "GET",
    credentials: "include",
    headers,
    body: opts.form ?? (opts.json !== undefined ? JSON.stringify(opts.json) : undefined),
    signal: opts.signal,
  });
}

async function execute(path: string, opts: RequestOptions): Promise<Response> {
  let res = await send(path, opts);

  if (res.status === 401) {
    const err = await toApiError(res.clone());
    if (err.code === "TOKEN_EXPIRED") {
      try {
        await refresh();
      } catch {
        sessionExpiredHandler?.();
        throw err;
      }
      res = await send(path, opts); // retry once
    }
  }

  if (!res.ok) throw await toApiError(res);
  return res;
}

export async function request<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const res = await execute(path, opts);
  const body = await res.json();
  return body.data as T;
}

/* -------------------------------------------------------------------------- */
/* Convenience helpers                                                        */
/* -------------------------------------------------------------------------- */

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>(path, { query, signal }),
  post: <T>(path: string, json?: unknown) =>
    request<T>(path, { method: "POST", json }),
  patch: <T>(path: string, json?: unknown) =>
    request<T>(path, { method: "PATCH", json }),
  delete: <T = null>(path: string) => request<T>(path, { method: "DELETE" }),
  /** multipart/form-data uploads (KYC, avatar, product images) */
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", form }),
  /** Fetch a protected file (e.g. admin KYC image) as a Blob. */
  blob: async (path: string): Promise<Blob> => (await execute(path, {})).blob(),
};

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  universityId: number;
  phone?: string;
}

export const auth = {
  async login(email: string, password: string) {
    const data = await api.post<AuthResult>("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    return data.user;
  },

  async register(input: RegisterInput) {
    const data = await api.post<AuthResult>("/auth/register", input);
    setAccessToken(data.accessToken);
    return data.user;
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },

  async logoutAll() {
    try {
      await api.post("/auth/logout-all");
    } finally {
      setAccessToken(null);
    }
  },

  me: () => api.get<{ user: User }>("/auth/me").then((d) => d.user),
};

/* -------------------------------------------------------------------------- */
/* Money                                                                      */
/* -------------------------------------------------------------------------- */

/** Minor units per major unit. API amounts are always integers in minor units. */
export const MINOR_FACTOR: Record<Currency, number> = {
  NGN: 100, // kobo
  CAD: 100, // cents
  XRP: 1_000_000, // drops (older orders)
  RLUSD: 1_000_000, // micro-RLUSD
};

export function toMajor(minor: number, currency: Currency): number {
  return minor / MINOR_FACTOR[currency];
}

export function formatMoney(minor: number, currency: Currency): string {
  const major = toMajor(minor, currency);
  if (currency === "XRP" || currency === "RLUSD") {
    return `${major.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${currency}`;
  }
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-CA", {
    style: "currency",
    currency,
  }).format(major);
}
