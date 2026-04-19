-- M2.9.3 — Pre-dispatch copy-gen consumer: claim RPC + release RPC.
--
-- `claim_notification_copy` is the atomic `FOR UPDATE SKIP LOCKED` claim that
-- the CopyGenConsumerService pulls from every 30 s. Matches the pattern used
-- by `claim_notification_jobs` (M2.1): a thin pg function that only does the
-- atomic update. All business logic (retry ladder, validator, stamping the
-- ledger) stays in the NestJS consumer so it can be exercised in unit tests.
--
-- `release_notification_copy_claim` is the inverse: when the NestJS layer
-- decides a claim cannot proceed (e.g. payload missing a required hook), it
-- releases the lease so another tick can retry. Orphan recovery handles the
-- case where the worker dies before releasing.

CREATE OR REPLACE FUNCTION public.claim_notification_copy(
    p_worker_id text,
    p_batch_size integer DEFAULT 20,
    p_lookahead_minutes integer DEFAULT 15,
    p_max_attempts integer DEFAULT 3
)
RETURNS SETOF public.notification_jobs
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
        UPDATE public.notification_jobs nj
           SET copy_status     = 'generating',
               copy_claimed_at = now(),
               copy_claimed_by = p_worker_id,
               copy_attempts   = nj.copy_attempts + 1
         WHERE nj.id IN (
            SELECT id
              FROM public.notification_jobs
             WHERE copy_status = 'pending'
               AND status = 'pending'
               AND scheduled_for_utc
                   BETWEEN now() AND now() + make_interval(mins => p_lookahead_minutes)
               AND copy_attempts < p_max_attempts
             ORDER BY scheduled_for_utc
             FOR UPDATE SKIP LOCKED
             LIMIT p_batch_size
        )
       RETURNING nj.*;
END;
$function$;

-- Release a single claim back to `pending` (without incrementing attempts).
-- Called by the consumer when it detects the claimed row is malformed (e.g.
-- missing payload.language) before it runs the LLM, so the job can retry on
-- a later tick if the producer heals the row in the meantime.
CREATE OR REPLACE FUNCTION public.release_notification_copy_claim(
    p_job_id uuid,
    p_worker_id text
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_updated integer;
BEGIN
    UPDATE public.notification_jobs
       SET copy_status     = 'pending',
           copy_claimed_at = NULL,
           copy_claimed_by = NULL,
           copy_attempts   = GREATEST(copy_attempts - 1, 0)
     WHERE id = p_job_id
       AND copy_status = 'generating'
       AND copy_claimed_by = p_worker_id;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated = 1;
END;
$function$;

-- Lock down execute: only service_role calls these RPCs.
REVOKE EXECUTE ON FUNCTION public.claim_notification_copy(text, integer, integer, integer)
    FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.release_notification_copy_claim(uuid, text)
    FROM PUBLIC, authenticated, anon;
