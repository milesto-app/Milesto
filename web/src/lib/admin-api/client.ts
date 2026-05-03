import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { ApiError } from "./errors";

const RETRY_STATUSES = new Set([502, 503, 504]);
const RETRY_BACKOFF_MS = 200;
const TOKEN_BEARER_PREFIX = "Bearer ";

type NextFetchOptions = {
  tags?: string[];
  revalidate?: number | false;
};

type ApiCacheOptions =
  | { cache: "no-store"; next?: never }
  | { cache?: never; next: NextFetchOptions };

type ApiFetchOptions = ApiCacheOptions & {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

type ErrorEnvelope = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

function getApiBaseUrl(): string {
  const url = process.env.ADMIN_API_URL;
  if (!url) {
    throw new ApiError("ADMIN_API_URL is not configured", {
      status: 500,
      code: "config_missing",
    });
  }
  return url.replace(/\/+$/, "");
}

async function getAccessToken(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error !== null && error !== undefined) {
    throw new ApiError("Failed to read Supabase session", {
      status: 401,
      code: "session_read_failed",
      details: error.message,
    });
  }

  const token = session?.access_token;
  if (!token) {
    throw new ApiError("No active Supabase session", {
      status: 401,
      code: "no_session",
    });
  }

  return token;
}

function buildUrl(
  path: string,
  query: ApiFetchOptions["query"],
): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function extractMessage(envelope: ErrorEnvelope, fallback: string): string {
  const { message } = envelope;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string" && message.length > 0) return message;
  if (envelope.error) return envelope.error;
  return fallback;
}

async function parseError(response: Response): Promise<ApiError> {
  let envelope: ErrorEnvelope = {};
  try {
    envelope = (await response.json()) as ErrorEnvelope;
  } catch {
    // Body wasn't JSON; fall through to status-text fallback.
  }

  return new ApiError(
    extractMessage(envelope, response.statusText || "Request failed"),
    {
      status: response.status,
      code: envelope.error,
      details: envelope,
    },
  );
}

async function performFetch(
  url: string,
  init: RequestInit & ApiCacheOptions,
): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok && RETRY_STATUSES.has(response.status)) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));
    return fetch(url, init);
  }
  return response;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions,
): Promise<T> {
  const token = await getAccessToken();
  const url = buildUrl(path, options.query);
  const method = options.method ?? "GET";

  const headers: Record<string, string> = {
    Authorization: `${TOKEN_BEARER_PREFIX}${token}`,
    Accept: "application/json",
    ...options.headers,
  };

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }

  const init: RequestInit & ApiCacheOptions = {
    method,
    headers,
    ...(body === undefined ? {} : { body }),
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.cache === "no-store"
      ? { cache: "no-store" }
      : { next: options.next }),
  };

  const response = await performFetch(url, init);

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
