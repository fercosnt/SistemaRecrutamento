-- =============================================================================
-- Migration: reconcile perguntas_formulario.bloco_valido_check constraint
-- Date: 2026-06-06
-- Phase: 05 (perfil-hardening-mvp)
-- Requirement: D-13 / F-04-08-C
-- =============================================================================
--
-- PURPOSE
-- The CHECK constraint `bloco_valido_check` exists in the LIVE database but is
-- NOT captured in any file under supabase/migrations/ — it was added manually in
-- the Studio at some point pre-Phase-1 (schema drift; see Phase 4 04-08-SUMMARY
-- §F-04-08-C). This violates FOUND-09 (migrations are the single source of truth;
-- the DB must be reproducible via `db push` in a fresh environment). This
-- reconciliation migration re-declares the constraint idempotently so that the
-- migration ledger captures it.
--
-- LIVE CONSTRAINT DEFINITION (source of truth reproduced exactly):
--   CONSTRAINT bloco_valido_check CHECK (bloco IN ('jornada','tecnologia','valores','curriculo'))
-- Confirmed against the original canonical DDL
-- (docs/sql/sql/14-tabelas-perguntas-respostas-formulario.sql:50-52),
-- the constraint test runbook (docs/validations/TESTING_CHECKLIST.md:1100-1116),
-- and the Phase 4 UAT seed discovery (04-08-UAT.md:301-310 /
-- 04-08-SUMMARY.md:347-356) — all three independently state the four permitted
-- values are exactly: jornada, tecnologia, valores, curriculo.
--
-- IDEMPOTENCY / SAFETY
-- The DO-block adds the constraint ONLY IF a constraint named bloco_valido_check
-- does not already exist on public.perguntas_formulario. On the live DB it
-- already exists, so this is a no-op there (the `repair --status applied` step
-- records the migration as applied without re-running DDL); on a fresh `db push`
-- it creates the constraint, restoring source-of-truth parity. No backfill is
-- needed because the live data already satisfies the constraint (it has been
-- enforced live since pre-Phase-1).
--
-- PRECONDITION (manual verification BEFORE applying — run in SQL Editor):
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conname = 'bloco_valido_check'
--       AND conrelid = 'public.perguntas_formulario'::regclass;
-- If this returns the constraint with the four-value IN-list above, the live DB
-- already matches this file (expected); applying is a recorded no-op via repair.
-- If it returns 0 rows (fresh env), the DO-block below creates it.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already
-- wraps each migration in its own implicit transaction; an outer BEGIN/COMMIT
-- combined with the `DO $$ ... END $$` PL/pgSQL block breaks the prepared-
-- statement boundary parser (SQLSTATE 42601 in the transaction pooler — see
-- CLAUDE.md D-22 workaround). Apply via the D-22 SQL-Editor workaround, then
-- `supabase migration repair --status applied 20260606000002`.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bloco_valido_check'
      AND conrelid = 'public.perguntas_formulario'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.perguntas_formulario
             ADD CONSTRAINT bloco_valido_check
             CHECK (bloco IN (''jornada'', ''tecnologia'', ''valores'', ''curriculo''))';
  END IF;
END $$;

COMMENT ON CONSTRAINT bloco_valido_check ON public.perguntas_formulario IS
  'Phase 5 / D-13 / F-04-08-C: reconciliation of a pre-Phase-1 manually-added '
  'CHECK constraint into the migration ledger (FOUND-09 source-of-truth). '
  'Restricts perguntas_formulario.bloco to the four canonical triagem blocks: '
  'jornada, tecnologia, valores, curriculo.';
