-- M2.9.1 — Coach-voiced notification copy-gen: schema foundation.
--
-- Adds the lifecycle columns producers use at enqueue and the pre-dispatch
-- consumer claims on, plus the notification_copy_generations ledger and
-- observability views. All RLS follows the existing notification_* deny-all
-- pattern — service-role bypasses, authenticated/anon are fully denied.
--
-- Sibling migrations (already applied):
--   20260420_notif_01 … 09 — core tables + columns
--   20260421_notif_10      — claim_notification_jobs() RPC

-- ---------------------------------------------------------------------------
-- 1. notification_copy_generations — ledger of every LLM generation attempt.
-- ---------------------------------------------------------------------------

CREATE TABLE public.notification_copy_generations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.notification_jobs(id) ON DELETE CASCADE,
    kind text NOT NULL,
    language text NOT NULL,
    coach_id integer,
    prompt_version text NOT NULL,
    model text NOT NULL,
    status text NOT NULL,
    error_code text,
    provider_status smallint,
    latency_ms integer,
    output jsonb,
    input_hash text NOT NULL,
    attempt_no smallint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT notification_copy_generations_status_check
        CHECK (status IN ('generated', 'failed')),
    CONSTRAINT notification_copy_generations_output_consistency_check
        CHECK (
            (status = 'generated' AND output IS NOT NULL)
            OR (status = 'failed' AND output IS NULL)
        ),
    CONSTRAINT notification_copy_generations_error_code_consistency_check
        CHECK ((status = 'failed') = (error_code IS NOT NULL))
);

CREATE INDEX notification_copy_generations_job_idx
    ON public.notification_copy_generations(job_id);

CREATE INDEX notification_copy_generations_kind_created_idx
    ON public.notification_copy_generations(kind, created_at DESC);

CREATE INDEX notification_copy_generations_failed_idx
    ON public.notification_copy_generations(status)
    WHERE status = 'failed';

ALTER TABLE public.notification_copy_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY deny_all_select ON public.notification_copy_generations
    FOR SELECT TO authenticated, anon USING (false);
CREATE POLICY deny_all_insert ON public.notification_copy_generations
    FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY deny_all_update ON public.notification_copy_generations
    FOR UPDATE TO authenticated, anon USING (false);
CREATE POLICY deny_all_delete ON public.notification_copy_generations
    FOR DELETE TO authenticated, anon USING (false);

-- ---------------------------------------------------------------------------
-- 2. notification_jobs — copy-gen lifecycle columns.
-- ---------------------------------------------------------------------------

ALTER TABLE public.notification_jobs
    ADD COLUMN copy_status text NOT NULL DEFAULT 'pending',
    ADD COLUMN copy_claimed_at timestamptz,
    ADD COLUMN copy_claimed_by text,
    ADD COLUMN copy_attempts smallint NOT NULL DEFAULT 0,
    ADD COLUMN copy_input_hash text,
    ADD COLUMN copy_generation_id uuid
        REFERENCES public.notification_copy_generations(id) ON DELETE SET NULL,
    ADD CONSTRAINT notification_jobs_copy_status_check
        CHECK (copy_status IN ('pending', 'generating', 'generated', 'failed', 'skipped_stub'));

-- Partial index on (copy_status, scheduled_for_utc) feeds the pre-dispatch
-- consumer's "claim what's due in the next 15 min" query (M2.9.3).
CREATE INDEX notification_jobs_copy_pending_due_idx
    ON public.notification_jobs(scheduled_for_utc)
    WHERE copy_status = 'pending';

-- Partial index on (copy_status, copy_claimed_at) supports orphan recovery
-- of stuck 'generating' leases (M2.9.3).
CREATE INDEX notification_jobs_copy_generating_idx
    ON public.notification_jobs(copy_claimed_at)
    WHERE copy_status = 'generating';

-- Covering index for the copy_generation_id FK, used by the dispatcher's
-- LEFT JOIN into notification_copy_generations at send time (M2.9.3).
CREATE INDEX notification_jobs_copy_generation_id_idx
    ON public.notification_jobs(copy_generation_id)
    WHERE copy_generation_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. notification_deliveries — send_source (stub vs generated).
-- ---------------------------------------------------------------------------

ALTER TABLE public.notification_deliveries
    ADD COLUMN send_source text NOT NULL DEFAULT 'stub',
    ADD CONSTRAINT notification_deliveries_send_source_check
        CHECK (send_source IN ('stub', 'generated'));

-- ---------------------------------------------------------------------------
-- 4. Observability views. security_invoker=true so RLS on the base tables
--    is enforced against the caller's role (service-role bypasses; auth/anon
--    see nothing because the base tables deny-all).
-- ---------------------------------------------------------------------------

CREATE VIEW public.v_copy_gen_success_rate_24h
    WITH (security_invoker = true) AS
SELECT
    kind,
    count(*)::int AS total,
    count(*) FILTER (WHERE status = 'generated')::int AS generated,
    count(*) FILTER (WHERE status = 'failed')::int AS failed,
    (count(*) FILTER (WHERE status = 'generated'))::float
        / NULLIF(count(*), 0) AS success_rate
FROM public.notification_copy_generations
WHERE created_at > now() - interval '24 hours'
GROUP BY kind;

CREATE VIEW public.v_copy_gen_fallback_by_reason
    WITH (security_invoker = true) AS
SELECT
    kind,
    error_code,
    count(*)::int AS failures
FROM public.notification_copy_generations
WHERE status = 'failed'
  AND created_at > now() - interval '24 hours'
GROUP BY kind, error_code
ORDER BY failures DESC;

-- Open-rate lift: compares stub vs generated open rate over the last 7 days.
CREATE VIEW public.v_copy_gen_open_rate_lift
    WITH (security_invoker = true) AS
SELECT
    j.kind,
    d.send_source,
    count(*)::int AS sent,
    count(*) FILTER (WHERE d.opened_at IS NOT NULL)::int AS opened,
    (count(*) FILTER (WHERE d.opened_at IS NOT NULL))::float
        / NULLIF(count(*), 0) AS open_rate
FROM public.notification_deliveries d
JOIN public.notification_jobs j ON j.id = d.job_id
WHERE d.sent_at > now() - interval '7 days'
GROUP BY j.kind, d.send_source;

-- Fleet-wide AI-generated share over the last 24h. Per M2.9.4:
-- coach_reply_ready is counted as AI copy because its teaser IS the LLM
-- response content, even though send_source='stub' (never runs through copy-gen).
CREATE VIEW public.v_copy_gen_slo_24h
    WITH (security_invoker = true) AS
SELECT
    count(*)::int AS total,
    count(*) FILTER (
        WHERE d.send_source = 'generated' OR j.kind = 'coach_reply_ready'
    )::int AS ai_generated,
    (count(*) FILTER (
        WHERE d.send_source = 'generated' OR j.kind = 'coach_reply_ready'
    ))::float / NULLIF(count(*), 0) AS ai_share
FROM public.notification_deliveries d
JOIN public.notification_jobs j ON j.id = d.job_id
WHERE d.sent_at > now() - interval '24 hours';
