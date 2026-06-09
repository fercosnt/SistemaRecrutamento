-- =============================================================================
-- Migration: Phase 10 analysis tables — analise_candidato_vaga + comparativo_solicitado
-- Date: 2026-06-10
-- Phase: 10 (triagem-rh-com-ia-comparativo-etapa-2)
-- Requirements: TRIAGEM-01 (analysis row), TRIAGEM-03 (comparativo audit / RF-09)
-- =============================================================================
--
-- PURPOSE
--   - analise_candidato_vaga: the per-candidatura IA analysis row the analise EF writes
--     in <=30s (score_match / pontos_fortes / gaps / flags / resumos). UNIQUE(candidatura_id)
--     makes the EF write an idempotent upsert (ON CONFLICT DO UPDATE) — a reprocess overwrites,
--     never duplicates.
--   - comparativo_solicitado: the TRIAGEM-03 audit trail (RF-09) — one row per comparativo
--     invocation carrying candidatura_ids + ranking jsonb + latencia_ms.
--
-- RLS (V8 PII — [[reference_select_star_leaks_pii]]):
--   These rows carry score_match / flags / gaps / resumo_cv — PII that must NEVER reach a
--   candidato. We grant a SELECT policy ONLY to app_metadata.role IN ('rh','administrador')
--   (the shipped subselect idiom from 20260607000006_rls_policies_m2_backbone.sql:48). There is
--   deliberately NO candidato/anon policy → candidato SELECT is denied entirely. There is NO
--   INSERT/UPDATE/DELETE policy → only service_role (the EFs) writes, bypassing RLS.
--
-- NOTE: No `BEGIN; ... COMMIT;` wrapper (CLI wraps each migration in its own implicit
--   transaction — CLAUDE.md D-22). This file is plain DDL with no $$ function bodies, so the
--   COMMENT statements below are safe. PROD apply is the separate [BLOCKING] Plan 10-04.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (1) analise_candidato_vaga — the per-candidatura IA analysis row (TRIAGEM-01)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analise_candidato_vaga (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id   uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  vaga_id          uuid NOT NULL,
  score_match      int CHECK (score_match BETWEEN 0 AND 100),  -- nullable while pendente/falhou
  pontos_fortes    text[] NOT NULL DEFAULT '{}',
  gaps             text[] NOT NULL DEFAULT '{}',
  flags            text[] NOT NULL DEFAULT '{}',
  resumo_cv        text,
  resumo_respostas text,
  status           text NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente', 'sucesso', 'falhou')),
  erro             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- Idempotency: one analise row per candidatura. The EF upserts ON CONFLICT (candidatura_id)
  -- DO UPDATE — a reprocess overwrites the same row, never duplicates (SMOKE-4).
  CONSTRAINT analise_candidato_vaga_candidatura_id_key UNIQUE (candidatura_id)
);

-- Ranking-by-vaga read path (the panel orders survivors by score desc).
CREATE INDEX IF NOT EXISTS idx_analise_vaga_score
  ON public.analise_candidato_vaga (vaga_id, score_match DESC);

-- -----------------------------------------------------------------------------
-- (2) comparativo_solicitado — the TRIAGEM-03 comparativo audit trail (RF-09)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comparativo_solicitado (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id         uuid NOT NULL,
  candidatura_ids uuid[] NOT NULL,
  ranking         jsonb NOT NULL,
  latencia_ms     int,
  solicitado_por  uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comparativo_vaga_created
  ON public.comparativo_solicitado (vaga_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- (3) RLS — candidato DENY, RH/admin SELECT only, service_role writes (bypass RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.analise_candidato_vaga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparativo_solicitado ENABLE ROW LEVEL SECURITY;

-- analise_candidato_vaga: ONLY RH/admin may read. NO candidato/anon policy → candidato denied.
DROP POLICY IF EXISTS rh_le_analise ON public.analise_candidato_vaga;
CREATE POLICY rh_le_analise ON public.analise_candidato_vaga
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')
  );

-- comparativo_solicitado: same role-gated SELECT. NO candidato/anon policy.
DROP POLICY IF EXISTS rh_le_comparativo ON public.comparativo_solicitado;
CREATE POLICY rh_le_comparativo ON public.comparativo_solicitado
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')
  );

-- NO INSERT/UPDATE/DELETE policy on either table: only service_role (the Phase-10 EFs) writes,
-- bypassing RLS. The candidato has NO policy of any kind → score_match/flags/gaps/resumo_cv can
-- never leak to a candidato (V8 PII — [[reference_select_star_leaks_pii]]).

COMMENT ON TABLE public.analise_candidato_vaga IS
  'Phase 10 / TRIAGEM-01: per-candidatura IA analysis row (score_match, pontos_fortes, gaps, '
  'flags, resumos). UNIQUE(candidatura_id) makes the analise EF write an idempotent upsert. '
  'RLS: candidato DENIED (no policy); RH/admin SELECT only; service_role (EF) writes bypass RLS — '
  'score/flags/gaps/resumo_cv are PII and must NEVER reach a candidato.';

COMMENT ON TABLE public.comparativo_solicitado IS
  'Phase 10 / TRIAGEM-03 (RF-09): comparativo audit trail — one row per invocation carrying '
  'candidatura_ids, ranking jsonb, latencia_ms. RLS: candidato DENIED (no policy); RH/admin '
  'SELECT only; service_role (EF) writes bypass RLS.';
