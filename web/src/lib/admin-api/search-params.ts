export type AdminSearchParams = Record<string, string | string[] | undefined>;

const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 100;

export function readString(
  params: AdminSearchParams,
  key: string,
): string | undefined {
  const value = params[key];
  if (typeof value !== "string") return undefined;
  if (value.length === 0) return undefined;
  return value;
}

export function readPage(params: AdminSearchParams): number {
  const value = readString(params, "page");
  if (!value) return 1;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export function readPerPage(
  params: AdminSearchParams,
  fallback: number = DEFAULT_PER_PAGE,
): number {
  const value = readString(params, "perPage");
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, MAX_PER_PAGE);
}
