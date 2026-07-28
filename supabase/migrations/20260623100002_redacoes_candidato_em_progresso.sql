-- =============================================================================
-- Migration: redacoes_candidato_em_progresso (essay autosave) + RLS
-- Date: 2026-06-23
-- Phase: 13 (redacao-cultural-revisao-humana — Etapa 3, redacao layer)
-- Requirement: AVAL-05 (RF-R-01..09 / RF-16) — incremental autosave
-- =============================================================================
--
-- PURPOSE
-- Per-(candidatura, pergunta) incremental autosave of the essay draft (30s local +
-- 30s DB, reusing the Phase-11 useAutosaveAvaliacao hook). Transcribed VERBATIM from
-- PRD v1.1 §8.1 (CREATE TABLE, lines 281-296) + §8.2 RLS (lines 378-397). D-13: the
-- binding PRD is the source of truth.
--
-- RLS: the candidate R/W only their OWN drafts while the candidatura is in
-- etapa_atual='avaliacao_assincrona' (etapa-gated back-lock — a denied post-advance
-- write surfaces as the hook's neutral `locked` state, never an error). RH/admin read
-- only (drop-off telemetry). No INSERT/UPDATE for RH (drafts are candidate-authored).
--
-- COLUMN-NAME RECONCILIATION (load-bearing): the PRD §8.2 USING clause references
-- `candidatos.auth_user_id`. The LIVE `candidatos` table has NO such column — the
-- auth-link column is `user_id` (confirmed against database.types.ts; the live
-- pontuar_sjt RPC uses `ca.user_id = auth.uid()`). Transcribing `auth_user_id`
-- verbatim would silently deny EVERY candidate read/write (the subquery matches no
-- row). We use the LIVE column `user_id` here.
--
-- ROLE-VALUE RECONCILIATION: PRD writes 'rh','admin'; the live hook emits
-- 'rh','administrador'. We use the live value + the live `#>>` projection idiom
-- (same as scores_candidato.sql) so the RH SELECT policy actually matches.
--
-- LGPD / RNF-R-14: a monthly cron anonymizes texto_em_progresso + zeroes it 90d after
-- completou_em (or 30d without activity). That cron is a deferred V1+ operational job
-- (RESEARCH Runtime State Inventory) — NOT created here.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). This
-- file is table-only DDL + policies (no $$ bodies) → pushes clean. NOT applied here —
-- application is the [BLOCKING] 13-04 apply wave (CONTEXT).
-- =============================================================================

-- Essay autosave draft (PRD §8.1 lines 281-296 — verbatim) ----------------------
CREATE TABLE public.redacoes_candidato_em_progresso (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id        uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  pergunta_id           uuid NOT NULL REFERENCES public.perguntas_redacao(id),
  texto_em_progresso    text,
  word_count            int,
  iniciado_em           timestamptz NOT NULL DEFAULT now(),
  ultima_atividade_em   timestamptz NOT NULL DEFAULT now(),
  completou_em          timestamptz,
  user_agent            text,
  CONSTRAINT em_progresso_uq UNIQUE (candidatura_id, pergunta_id)
);

COMMENT ON TABLE public.redacoes_candidato_em_progresso IS
  'Phase 13 / AVAL-05: autosave incremental da redacao (PRD v1.1 §8.1). RLS: candidato R/W proprio enquanto candidatura em avaliacao_assincrona (link via candidatos.user_id); RH/admin so R (telemetria de drop-off). TTL cron (RNF-R-14) e job operacional diferido.';

CREATE INDEX idx_em_progresso_atividade
  ON public.redacoes_candidato_em_progresso (ultima_atividade_em);

-- RLS (PRD §8.2 lines 378-397, columns/role reconciled to live — see header) -----
ALTER TABLE public.redacoes_candidato_em_progresso ENABLE ROW LEVEL SECURITY;

-- Candidate R/W own draft while the candidatura is in avaliacao_assincrona.
-- USING gates the etapa (back-lock); WITH CHECK only verifies ownership so a draft
-- already written stays valid even on the activity-bump UPDATE.
DROP POLICY IF EXISTS em_progresso_candidato_own ON public.redacoes_candidato_em_progresso;
CREATE POLICY em_progresso_candidato_own ON public.redacoes_candidato_em_progresso
  FOR ALL TO authenticated
  USING (
    candidatura_id IN (
      SELECT id FROM public.candidaturas
      WHERE candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = auth.uid())
        AND etapa_atual = 'avaliacao_assincrona'
    )
  )
  WITH CHECK (
    candidatura_id IN (
      SELECT id FROM public.candidaturas
      WHERE candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = auth.uid())
    )
  );

-- RH/admin read all drafts (drop-off telemetry) — live role value + projection.
DROP POLICY IF EXISTS em_progresso_rh_select ON public.redacoes_candidato_em_progresso;
CREATE POLICY em_progresso_rh_select ON public.redacoes_candidato_em_progresso
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
