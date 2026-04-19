-- M2.9 gap — issue #61
-- RPC to immediately cancel pending implementation_intention jobs for a task
-- whose intention has just been upserted/updated/deleted. `p_captured_at` is
-- carried through for audit/version traceability; cancellation targets every
-- pending job for the task because any prior enqueue is stale once a new
-- captured_at exists. Callers log the p_captured_at they passed.

-- Drop the legacy 1-arg variant (pre-M2.9 proof-of-concept) which used
-- status='cancelled' / skip_reason='intention_changed'. The new 2-arg variant
-- below replaces it with the versioned contract documented in #61.
drop function if exists public.cancel_pending_intention_jobs(uuid);

create or replace function public.cancel_pending_intention_jobs(
  p_task_id uuid,
  p_captured_at timestamptz
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.notification_jobs
     set status = 'skipped',
         skip_reason = 'intention_superseded'
   where kind = 'implementation_intention'
     and status = 'pending'
     and payload -> 'kind_specific' ->> 'task_id' = p_task_id::text;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.cancel_pending_intention_jobs(uuid, timestamptz) to service_role;
