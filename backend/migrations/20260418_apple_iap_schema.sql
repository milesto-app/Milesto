-- Apple IAP server-side verification schema.
--
-- Adds the columns the subscription service writes on every verify / webhook:
--   - subscription_apple_signed_at: Apple's signedDate, used for monotonicity.
--   - subscription_auto_renew_status: tracked from renewalInfo / DID_CHANGE_RENEWAL_STATUS.
--   - subscription_environment: 'Sandbox' | 'Production' | 'Xcode' | 'LocalTesting'.
--
-- Creates processed_notifications: dedupe table for Apple Server Notifications V2.
-- PK on notification_uuid enforces idempotency; RLS deny-all keeps it admin-only
-- (the service uses the service_role client, which bypasses RLS).
--
-- Apply via the Supabase MCP `apply_migration` tool, or run directly against
-- the database. Idempotent.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_apple_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_auto_renew_status boolean,
  ADD COLUMN IF NOT EXISTS subscription_environment text;

CREATE TABLE IF NOT EXISTS public.processed_notifications (
  notification_uuid uuid PRIMARY KEY,
  notification_type text NOT NULL,
  subtype text,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_select ON public.processed_notifications;
DROP POLICY IF EXISTS deny_all_insert ON public.processed_notifications;
DROP POLICY IF EXISTS deny_all_update ON public.processed_notifications;
DROP POLICY IF EXISTS deny_all_delete ON public.processed_notifications;

CREATE POLICY deny_all_select ON public.processed_notifications
  FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY deny_all_insert ON public.processed_notifications
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY deny_all_update ON public.processed_notifications
  FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY deny_all_delete ON public.processed_notifications
  FOR DELETE TO anon, authenticated USING (false);
