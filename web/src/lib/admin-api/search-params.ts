export type AdminSearchParams = Record<string, string | string[] | undefined>;

const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 100;
const DEFAULT_RANGE_DAYS = 30;

export type DateRangeQuery = { from: string; to: string };

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultRange(days: number): DateRangeQuery {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: isoDate(from), to: isoDate(to) };
}

export function readDateRange(
  params: AdminSearchParams,
  rangeDays: number = DEFAULT_RANGE_DAYS,
): DateRangeQuery {
  const fallback = defaultRange(rangeDays);
  const from = readString(params, "from") ?? fallback.from;
  const to = readString(params, "to") ?? fallback.to;
  return { from, to };
}

export function dateRangeToDays(range: DateRangeQuery): number {
  const fromDate = new Date(`${range.from}T00:00:00Z`);
  const toDate = new Date(`${range.to}T23:59:59Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return DEFAULT_RANGE_DAYS;
  }
  const ms = toDate.getTime() - fromDate.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}

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
