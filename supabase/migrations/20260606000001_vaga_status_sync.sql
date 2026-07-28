-- =============================================================================
-- Migration: vaga status/soft-delete sync invariant
-- Date: 2026-06-06
-- Phase: 05 (perfil-hardening-mvp)
-- Requirement: D-13 / F-04-08-B
-- =============================================================================
--
-- PURPOSE
-- A soft-deleted vaga (deleted_at IS NOT NULL) must NOT remain status='ativa'.
-- Otherwise the public listing filter (VAGA-01: WHERE status='ativa' AND
-- deleted_at IS NULL is the *intended* contract, but any code path that filters
-- only on status='ativa' would surface a deleted vaga). This migration:
--   (1) Backfills existing drift: any vaga with deleted_at IS NOT NULL AND
--       status='ativa' is reset to status='arquivada' (the status_vaga enum
--       member that semantically represents a closed/retired vaga; enum members
--       are: 'rascunho','ativa','inativa','arquivada' — confirmed against
--       database.types.ts public.Enums.status_vaga).
--   (2) Enforces the invariant going forward via a BEFORE INSERT OR UPDATE
--       trigger that flips status to 'arquivada' whenever a row is written with
--       deleted_at IS NOT NULL AND status='ativa'.
--
-- DESIGN CHOICE — TRIGGER over CHECK constraint (documented per threat T-05-05-01):
-- A plain CHECK `(deleted_at IS NULL OR status <> 'ativa')` would *reject* (raise)
-- a soft-delete UPDATE that does not also change status in the SAME statement —
-- i.e. the common app pattern `UPDATE vagas SET deleted_at = now() WHERE id = ?`
-- (status untouched, still 'ativa') would FAIL with a constraint violation,
-- breaking the soft-delete code path. A BEFORE trigger instead *coerces* status
-- to 'arquivada' transparently, so soft-delete keeps working AND the invariant
-- holds. The trigger is the correct tool because the soft-delete and the status
-- change are legitimately performed in separate statements by the application.
--
-- PRECONDITION (manual verification BEFORE applying — run in SQL Editor):
--   SELECT id, slug, status, deleted_at FROM public.vagas
--     WHERE deleted_at IS NOT NULL AND status = 'ativa';
-- These are the drift rows the backfill below will repair (expected >= 1 per
-- Phase 4 04-08-SUMMARY). After applying, re-running this SELECT must return 0.
--
-- SMOKE (AFTER applying):
--   -- invariant holds (no drift):
--   SELECT count(*) FROM public.vagas WHERE deleted_at IS NOT NULL AND status='ativa';  -- expect 0
--   -- invariant enforced (coercion): pick any soft-deleted vaga id and try to re-activate it:
--   UPDATE public.vagas SET status='ativa' WHERE deleted_at IS NOT NULL LIMIT 1
--     RETURNING id, status;  -- RETURNING shows status='arquivada' (trigger coerced it)
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already
-- wraps each migration in its own implicit transaction; an outer BEGIN/COMMIT
-- combined with the `DO $$ ... END $$` / function body PL/pgSQL blocks (which
-- contain their own BEGIN/END) breaks the prepared-statement boundary parser
-- (SQLSTATE 42601 in the transaction pooler — see CLAUDE.md D-22 workaround).
-- This migration uses CREATE FUNCTION + DO $$ + COMMENT, so it MUST be applied
-- via the D-22 SQL-Editor workaround (paste + run manually, then
-- `supabase migration repair --status applied 20260606000001`).
-- =============================================================================

-- (1) One-time backfill of existing drift -------------------------------------
UPDATE public.vagas
   SET status = 'arquivada'
 WHERE deleted_at IS NOT NULL
   AND status = 'ativa';

-- (2) Enforcement trigger function (idempotent via CREATE OR REPLACE) ----------
CREATE OR REPLACE FUNCTION public.vagas_enforce_status_soft_delete_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- A soft-deleted vaga can never be 'ativa'. Coerce rather than reject so the
  -- application's soft-delete statement (which may not touch status) still works.
  IF NEW.deleted_at IS NOT NULL AND NEW.status = 'ativa' THEN
    NEW.status := 'arquivada';
  END IF;
  RETURN NEW;
END;
$$;

-- (3) Bind the trigger (idempotent: drop-if-exists then create) ----------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'vagas_status_soft_delete_sync_trg'
      AND tgrelid = 'public.vagas'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER vagas_status_soft_delete_sync_trg
             BEFORE INSERT OR UPDATE ON public.vagas
             FOR EACH ROW
             EXECUTE FUNCTION public.vagas_enforce_status_soft_delete_sync()';
  END IF;
END $$;

COMMENT ON FUNCTION public.vagas_enforce_status_soft_delete_sync() IS
  'Phase 5 / D-13 / F-04-08-B: enforces that a soft-deleted vaga '
  '(deleted_at IS NOT NULL) can never have status=''ativa''. Coerces status to '
  '''arquivada'' on INSERT/UPDATE instead of rejecting, so the application''s '
  'soft-delete path (UPDATE ... SET deleted_at = now()) keeps working while the '
  'listing-correctness invariant (T-05-05-02) holds. Companion: one-time backfill '
  'UPDATE in migration 20260606000001.';
