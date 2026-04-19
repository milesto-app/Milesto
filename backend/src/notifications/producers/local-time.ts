export interface LocalMoment {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface ScheduledSlot {
  utc: Date;
  localDate: string;
  localHour: number;
}

const MINUTES_PER_HOUR = 60;
const DATE_FIELD_PAD_WIDTH = 2;
const MIDNIGHT_HOUR_ALIAS = 24;

const DATE_TIME_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = DATE_TIME_FORMATTER_CACHE.get(timezone);
  if (cached !== undefined) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  DATE_TIME_FORMATTER_CACHE.set(timezone, formatter);
  return formatter;
}

export function toLocalMoment(instant: Date, timezone: string): LocalMoment {
  const parts = getFormatter(timezone).formatToParts(instant);
  const lookup = (type: string): number => {
    const value = parts.find((p) => p.type === type)?.value ?? "0";
    return Number.parseInt(value, 10);
  };
  const hour = lookup("hour");
  return {
    year: lookup("year"),
    month: lookup("month"),
    day: lookup("day"),
    hour: hour === MIDNIGHT_HOUR_ALIAS ? 0 : hour,
    minute: lookup("minute"),
  };
}

export function formatLocalDate(moment: LocalMoment): string {
  const pad = (n: number): string =>
    n.toString().padStart(DATE_FIELD_PAD_WIDTH, "0");
  return `${String(moment.year)}-${pad(moment.month)}-${pad(moment.day)}`;
}

export function localToUtc(moment: LocalMoment, timezone: string): Date {
  const naive = Date.UTC(
    moment.year,
    moment.month - 1,
    moment.day,
    moment.hour,
    moment.minute,
    0,
  );
  const projected = toLocalMoment(new Date(naive), timezone);
  const projectedNaive = Date.UTC(
    projected.year,
    projected.month - 1,
    projected.day,
    projected.hour,
    projected.minute,
    0,
  );
  return new Date(naive + (naive - projectedNaive));
}

function addDays(moment: LocalMoment, days: number): LocalMoment {
  const utc = Date.UTC(
    moment.year,
    moment.month - 1,
    moment.day + days,
    moment.hour,
    moment.minute,
    0,
  );
  const next = new Date(utc);
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
    hour: moment.hour,
    minute: moment.minute,
  };
}

export function isInQuietHours(
  hour: number,
  start: number,
  end: number,
): boolean {
  if (start === end) {
    return false;
  }
  if (start < end) {
    return hour >= start && hour < end;
  }
  return hour >= start || hour < end;
}

function quietHoursSpansMidnight(start: number, end: number): boolean {
  return start > end;
}

export interface NextSlotInput {
  now: Date;
  timezone: string;
  targetHour: number;
  quietStart: number;
  quietEnd: number;
}

export function nextQuietHoursEnd(
  now: Date,
  timezone: string,
  quietEnd: number,
): Date {
  const nowLocal = toLocalMoment(now, timezone);
  const target: LocalMoment = {
    year: nowLocal.year,
    month: nowLocal.month,
    day: nowLocal.day,
    hour: quietEnd,
    minute: 0,
  };
  const minutesNow = nowLocal.hour * MINUTES_PER_HOUR + nowLocal.minute;
  const minutesTarget = quietEnd * MINUTES_PER_HOUR;
  const adjusted = minutesTarget <= minutesNow ? addDays(target, 1) : target;
  return localToUtc(adjusted, timezone);
}

export function computeNextDailyCheckInSlot(
  input: NextSlotInput,
): ScheduledSlot {
  const { now, timezone, targetHour, quietStart, quietEnd } = input;
  const nowLocal = toLocalMoment(now, timezone);
  let target: LocalMoment = {
    year: nowLocal.year,
    month: nowLocal.month,
    day: nowLocal.day,
    hour: targetHour,
    minute: 0,
  };
  const minutesNow = nowLocal.hour * MINUTES_PER_HOUR + nowLocal.minute;
  const minutesTarget = targetHour * MINUTES_PER_HOUR;
  if (minutesTarget <= minutesNow) {
    target = addDays(target, 1);
  }
  if (isInQuietHours(target.hour, quietStart, quietEnd)) {
    if (
      quietHoursSpansMidnight(quietStart, quietEnd) &&
      target.hour < quietEnd
    ) {
      target = { ...target, hour: quietEnd, minute: 0 };
    } else if (quietHoursSpansMidnight(quietStart, quietEnd)) {
      target = { ...addDays(target, 1), hour: quietEnd, minute: 0 };
    } else {
      target = { ...target, hour: quietEnd, minute: 0 };
    }
  }
  return {
    utc: localToUtc(target, timezone),
    localDate: formatLocalDate(target),
    localHour: target.hour,
  };
}
