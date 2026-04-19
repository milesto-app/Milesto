// M2.9.4 — shared tenure guardrail.
//
// §5.7 of notification-plan.md bans streak-framed copy for users in their
// first 60 days ("recently-acquired" users, where a 2-week streak being
// called out can feel like manipulation). The streak producers have always
// honored this; M2.9.4's week-3 rollout adds more kinds (milestone_hit,
// goal_hit, week_completed, streak_milestone) where the LLM could lean on
// streak metaphors — so all producers of those kinds now read the same
// helper to decide whether to flip `suppressStreakCopy`.

const TENURE_GUARDRAIL_DAYS = 60;
const MS_PER_DAY = 86_400_000;

/**
 * Returns `true` when `tenure_start_date` is within the last 60 days, in
 * which case `suppressStreakCopy` must be set on the copy-gen context so the
 * validator rejects streak-framed outputs.
 *
 * `tenureStartDate` is the `YYYY-MM-DD` column on `profiles`. `null` /
 * unparseable values return `false` (fail-open: we prefer allowing a streak
 * mention over blocking a generation for a user whose tenure was never
 * backfilled — the validator still enforces the rest of §11.9).
 */
export function isWithinTenureGuardrail(
  tenureStartDate: string | null,
  now: Date = new Date(),
): boolean {
  if (tenureStartDate === null) {
    return false;
  }
  const tenureStart = Date.parse(`${tenureStartDate}T00:00:00.000Z`);
  if (Number.isNaN(tenureStart)) {
    return false;
  }
  const daysSince = Math.floor((now.getTime() - tenureStart) / MS_PER_DAY);
  return daysSince < TENURE_GUARDRAIL_DAYS;
}
