-- =============================================================================
-- Migration: etapa_processo v2 cutover (backup + enum + in-place ALTER USING)
-- Date: 2026-06-07
-- Phase: 06 (pipeline-backbone-schema)
-- Requirement: FUNIL-01 (D-03, D-04, D-05, D-07)
-- =============================================================================
--
-- PURPOSE
-- Deprecate the legacy 10-value `etapa_processo` enum and cut `candidaturas.etapa_atual`
-- over to the v2 8-value pipeline enum (6 stages + 2 terminals) IN PLACE (D-03 — no table
-- rebuild). A defensive backup of `candidaturas` is taken into schema `backup_m2` BEFORE any
-- DROP (D-04). Live rows map with zero data loss: name-identical survivors keep identity;
-- legacy orphans collapse to `triagem` (D-05). The v2 type is RENAMEd back to the canonical
-- name `etapa_processo` so `submit_candidatura_atomic`'s `'triagem'::public.etapa_processo`
-- cast keeps compiling with no edit (Assumption A2 / Shared Pattern D). Finally the
-- `etapa_justificativa` companion column is added (D-07) for the 06-04 trigger to read.
--
-- v2 enum is declared IN PIPELINE ORDER so the 06-04 trigger computes regression with a
-- native enum ordinal `<` comparison (terminals declared last = "greater" than every stage).
--
-- APPLY ORDER (manual, single SQL-Editor session — D-22 workaround):
--   1. Run §A discovery (06-SQL-SMOKE-RUNBOOK §A) FIRST.
--   2. Run THIS file (20260607000002) — the cutover. It renames v2 -> etapa_processo.
--   3. Run 20260607000001_historico_candidatura.sql in the SAME session (it references
--      public.etapa_processo, which only becomes the v2 type after step 2's RENAME).
--   4. If §A discovery showed orphan rows, run the orphan-audit INSERTs (see inline note
--      below) after the historico table exists.
--   5. Run §B post-cutover SMOKE — post_total MUST equal §A discovery_total_rows.
--
-- PRECONDITION (manual verification BEFORE applying — runbook §A discovery):
--   SELECT etapa_atual, count(*) FROM public.candidaturas GROUP BY etapa_atual ORDER BY 2 DESC;
--   SELECT column_default FROM information_schema.columns
--     WHERE table_schema='public' AND table_name='candidaturas' AND column_name='etapa_atual';
--
-- SMOKE (AFTER applying — runbook §B):
--   SELECT etapa_atual, count(*) FROM public.candidaturas GROUP BY etapa_atual ORDER BY 2 DESC;
--   -- the total row count MUST equal the discovery total (zero data loss / FUNIL-01).
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already wraps each
-- migration in its own implicit transaction; an outer BEGIN/COMMIT combined with the DDL +
-- adjacent statements in this file breaks the prepared-statement boundary parser (SQLSTATE
-- 42601 in the transaction pooler — see CLAUDE.md D-22 workaround). This migration mutates
-- LIVE production data and MUST be applied via the D-22 SQL-Editor workaround (paste + run
-- manually, then `supabase migration repair --status applied 20260607000002`).
-- =============================================================================

-- (0) Defensive backup BEFORE any drop (D-04) -------------------------------------------------
CREATE SCHEMA IF NOT EXISTS backup_m2;
CREATE TABLE backup_m2.candidaturas_pre_funil AS
  SELECT * FROM public.candidaturas;

-- (0a) Detach the backup's etapa_atual from the OLD enum type (FIX 2026-06-07) ----------------
--      CREATE TABLE AS preserves column types, so backup.etapa_atual is public.etapa_processo
--      (the old enum). That dependency would make step (5) `DROP TYPE public.etapa_processo`
--      FAIL with "cannot drop type ... other objects depend on it: column etapa_atual of table
--      backup_m2.candidaturas_pre_funil". Converting the backup column to text removes the
--      dependency AND makes the backup durable across the swap (legacy values preserved as text
--      for restore + the orphan-audit template below, which already casts via ::text).
ALTER TABLE backup_m2.candidaturas_pre_funil ALTER COLUMN etapa_atual TYPE text;

-- (1) Create the v2 enum IN PIPELINE ORDER (so </> computes regression in the 06-04 trigger) ---
CREATE TYPE public.etapa_processo_v2 AS ENUM (
  'inscricao',
  'triagem',
  'avaliacao_assincrona',
  'entrevista_online',
  'entrevista_presencial',
  'decisao_final',
  'aprovado',
  'rejeitado'
);

-- (2) DROP the column DEFAULT first — a default of the old type blocks the type change (Pitfall 3)
ALTER TABLE public.candidaturas ALTER COLUMN etapa_atual DROP DEFAULT;

-- (3) Convert the column, mapping live values through text (D-05 defensive CASE) ----------------
--     Name-identical survivors keep identity; legacy orphans collapse to 'triagem'.
ALTER TABLE public.candidaturas
  ALTER COLUMN etapa_atual TYPE public.etapa_processo_v2
  USING (
    CASE etapa_atual::text
      WHEN 'triagem'               THEN 'triagem'
      WHEN 'aprovado'              THEN 'aprovado'
      WHEN 'rejeitado'             THEN 'rejeitado'
      WHEN 'entrevista_online'     THEN 'entrevista_online'      -- legacy name == v2 name
      WHEN 'entrevista_presencial' THEN 'entrevista_presencial'  -- legacy name == v2 name
      -- orphan legacy values collapse to 'triagem' (D-05 defensive; expected zero rows)
      WHEN 'bigfive'               THEN 'triagem'
      WHEN 'disc'                  THEN 'triagem'
      WHEN 'raven'                 THEN 'triagem'
      WHEN 'cultura'               THEN 'triagem'
      WHEN 'avaliacao_final'       THEN 'triagem'
      ELSE 'triagem'
    END::public.etapa_processo_v2
  );

-- (4) Re-add the DEFAULT (new type) -----------------------------------------------------------
ALTER TABLE public.candidaturas ALTER COLUMN etapa_atual SET DEFAULT 'triagem';

-- (5) Drop the legacy type, then RENAME v2 to the canonical name -------------------------------
--     Restores `etapa_processo` so submit_candidatura_atomic's cast keeps compiling (A2).
DROP TYPE public.etapa_processo;
ALTER TYPE public.etapa_processo_v2 RENAME TO etapa_processo;

-- (6) Companion column the 06-04 trigger reads (D-07) ------------------------------------------
ALTER TABLE public.candidaturas ADD COLUMN IF NOT EXISTS etapa_justificativa text;

COMMENT ON COLUMN public.candidaturas.etapa_justificativa IS
  'Phase 6 / D-07 (FUNIL-02): companion column written in the same UPDATE as etapa_atual. '
  'The avancar_etapa() BEFORE UPDATE trigger (06-04) reads NEW.etapa_justificativa to block '
  'regression when blank and copies it to historico_candidatura.criterio_texto. Atomic, no GUC.';

-- ORPHAN-AUDIT (conditional — run ONLY if runbook §A discovery showed orphan etapa values) -----
-- After 20260607000001_historico_candidatura.sql exists in this same session, log one audit
-- line per collapsed orphan. Template (replace <legacy_value> + scope to the affected rows):
--
--   INSERT INTO public.historico_candidatura
--     (candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em)
--   SELECT id, NULL, 'triagem', 'colapso de valor legado órfão (D-05)', NULL, true, now()
--     FROM backup_m2.candidaturas_pre_funil
--    WHERE etapa_atual::text IN ('bigfive','disc','raven','cultura','avaliacao_final');
--
-- (etapa_de is NULL here because the pre-cutover legacy value no longer exists as an
--  etapa_processo member after the RENAME; criterio_texto records the legacy origin.)
