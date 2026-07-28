-- =============================================================================
-- Migration: candidaturas UNIQUE constraint on (candidato_id, vaga_id)
-- Date: 2026-04-25
-- Phase: 04 (Vagas + Candidatura)
-- Requirement: CAND-04 — server-side defense against duplicate candidatura
-- =============================================================================
--
-- PURPOSE
-- Enforce uniqueness of (candidato_id, vaga_id) WHERE deleted_at IS NULL.
-- Partial index allows soft-deleted rows to coexist (re-apply after deletion
-- of prior candidatura is permitted).
--
-- COMPANION COMPONENTS
-- - Client-side hint: candidaturasService.checkDuplicateApplication (line ~148)
-- - Server-side mapping: Edge Function submit-candidatura catches Postgres
--   error code 23505 and returns error_code: 'DUPLICATE_CANDIDATURA'.
-- - Atomic RPC: submit_candidatura_atomic (migration 20260425000003) raises
--   23505 when this index rejects the insert.
--
-- PRECONDITION (manual verification BEFORE applying):
-- Run `SELECT candidato_id, vaga_id, COUNT(*) FROM public.candidaturas
--   WHERE deleted_at IS NULL GROUP BY 1, 2 HAVING COUNT(*) > 1;`
-- If any rows returned, CLEAN UP duplicates first; otherwise CREATE UNIQUE
-- INDEX will fail. Phase 4 dev DB is expected to be clean per RESEARCH §A2.
-- =============================================================================
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver
-- already wraps each migration in its own implicit transaction; an outer
-- BEGIN/COMMIT combined with the `DO $$ ... END $$` PL/pgSQL block (which
-- contains its own BEGIN/END) can break the prepared-statement boundary
-- parser. Removed for consistency with migration 03 fix.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'candidaturas_candidato_vaga_unique_idx'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX candidaturas_candidato_vaga_unique_idx
             ON public.candidaturas (candidato_id, vaga_id)
             WHERE deleted_at IS NULL';
  END IF;
END $$;

COMMENT ON INDEX public.candidaturas_candidato_vaga_unique_idx IS
  'Phase 4 / CAND-04: Server-side defense against duplicate candidatura. '
  'Partial WHERE deleted_at IS NULL allows re-application after soft-delete. '
  'Companion to candidaturasService.checkDuplicateApplication (client hint) '
  'and Edge Function submit-candidatura mapping of Postgres code 23505 → DUPLICATE_CANDIDATURA.';
