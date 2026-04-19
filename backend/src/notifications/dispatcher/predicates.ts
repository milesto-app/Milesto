import { Logger } from "@nestjs/common";

import type { Database } from "../../supabase/database.types.js";
import type { SupabaseService } from "../../supabase/supabase.service.js";
import { NOTIFICATION_KIND } from "../outbox/outbox.types.js";

type NotificationJobRow =
  Database["public"]["Tables"]["notification_jobs"]["Row"];

export type PredicateResult =
  | { valid: true }
  | { valid: false; reason: string };

type PredicateFn = (
  job: NotificationJobRow,
  supabaseService: SupabaseService,
) => Promise<PredicateResult>;

const logger = new Logger("DispatcherPredicates");

const dailyCheckInPredicate: PredicateFn = async (job, supabaseService) => {
  const supabase = supabaseService.getAdminClient();
  const { data: isValid, error } = await supabase.rpc(
    "daily_check_in_predicate",
    { p_user_id: job.user_id },
  );
  if (error !== null) {
    logger.warn(
      `daily_check_in predicate re-check failed for job ${job.id}: ${error.message} — allowing send (fail-open)`,
    );
    return { valid: true };
  }
  if (isValid) {
    return { valid: true };
  }
  return { valid: false, reason: "predicate_invalidated" };
};

const PREDICATES: Partial<Record<string, PredicateFn>> = {
  [NOTIFICATION_KIND.DAILY_CHECK_IN]: dailyCheckInPredicate,
};

export async function recheckPredicate(
  job: NotificationJobRow,
  supabaseService: SupabaseService,
): Promise<PredicateResult> {
  const predicate = PREDICATES[job.kind];
  if (predicate === undefined) {
    return { valid: true };
  }
  return predicate(job, supabaseService);
}
