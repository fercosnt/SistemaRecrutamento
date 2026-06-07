-- =============================================================================
-- Migration: vagas.testes_aplicaveis + vagas.pesos_avaliacao jsonb columns
-- Date: 2026-06-07
-- Phase: 07 (configuracao-de-vaga-tags)
-- Requirement: VAGACFG-01 (RF-33), VAGACFG-02 (RF-34) — vaga test selection + weights
-- =============================================================================
--
-- PURPOSE
-- The ONLY new vagas columns added this phase (D-06):
--   - `testes_aplicaveis jsonb`  — which evaluations apply to the vaga (RF-11 shape)
--   - `pesos_avaliacao jsonb`    — the 4 weighted-stage scores (D-07)
-- `qualificacao_etapa1 jsonb` is explicitly NOT added here — it is Phase 8 (D-06).
--
-- testes_aplicaveis shape (RF-11):
--   [ { "teste": <slug>, "obrigatorio": bool, "customizado": bool, "perguntas"?: [] } ]
--   where <slug> ∈ {triagem, work_sample_sjt, redacao_cultural, big_five, cognitivo, entrevista}.
--   `perguntas?` is the optional pointer the F11 SJT bank will populate; F7 leaves it empty (D-05).
--
-- pesos_avaliacao shape (D-07): the 4 weighted keys that must sum to 100 at publish.
--   { "triagem": int, "work_sample_sjt": int, "redacao_cultural": int, "entrevista": int }
--   big_five and cognitivo are context-only (NOT weighted keys — D-07).
--
-- NO sum=100 CHECK on the column: drafts (status='rascunho') are allowed to be invalid —
-- the sum is gated ONLY at publish by the publish_vaga RPC (D-12). A column CHECK would
-- block every draft save.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already wraps each
-- migration in its own implicit transaction; an outer BEGIN/COMMIT combined with adjacent
-- COMMENT statements can trip the prepared-statement boundary parser and raise SQLSTATE 42601
-- at push time (CLAUDE.md §Commands / D-22). If `supabase db push` fails with 42601, apply via
-- the D-22 SQL-Editor (or Supabase MCP execute_sql) workaround, then
-- `supabase migration repair --status applied 20260607010002`.
-- =============================================================================

ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS testes_aplicaveis jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pesos_avaliacao  jsonb NOT NULL DEFAULT
    '{"triagem":0,"work_sample_sjt":0,"redacao_cultural":0,"entrevista":0}'::jsonb;

COMMENT ON COLUMN public.vagas.testes_aplicaveis IS
  'Phase 7 / VAGACFG-01 (RF-11): array of applicable evaluations. Shape: [{teste, obrigatorio, customizado, perguntas?}]. teste ∈ {triagem, work_sample_sjt, redacao_cultural, big_five, cognitivo, entrevista}. perguntas? populated by the F11 SJT bank (empty in F7, D-05).';

COMMENT ON COLUMN public.vagas.pesos_avaliacao IS
  'Phase 7 / VAGACFG-02 (D-07): 4 weighted-stage scores {triagem, work_sample_sjt, redacao_cultural, entrevista}. Must sum to 100 — enforced at publish by publish_vaga RPC (D-12), NOT by a column CHECK (drafts may be invalid). big_five/cognitivo are context-only, not keys here.';
