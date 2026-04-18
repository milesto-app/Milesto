-- Restore the per-row coach_id range guarantee that was lost when the
-- coaches table was collapsed into coaches.config.ts (PR #1, 201f4f8).
--
-- coach_id is a "soft FK" against the four entries in
-- backend/src/coach/coaches.config.ts (ids 1..4). Without this constraint,
-- any client/admin write can persist e.g. coach_id = 999, after which
-- CoachService.getCoach throws NotFoundException at read time and the
-- chat / voice prompt paths fail with no in-app recovery.
--
-- Apply via the Supabase MCP `apply_migration` tool, or run directly
-- against the database. Idempotent.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_coach_id_range_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_coach_id_range_check
  CHECK (coach_id IS NULL OR coach_id BETWEEN 1 AND 4)
  NOT VALID;

-- Validate against existing rows (will fail loudly if a stale value exists).
ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_coach_id_range_check;
