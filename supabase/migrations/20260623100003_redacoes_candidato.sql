-- =============================================================================
-- Migration: redacoes_candidato (final auditable essay record) + RLS
--            + trg_redacao_rh_only_review_fields BEFORE UPDATE trigger
-- Date: 2026-06-23
-- Phase: 13 (redacao-cultural-revisao-humana — Etapa 3, redacao layer)
-- Requirement: AVAL-06 / AVAL-07 (RF-R-10..28 / RF-17/17a/17b) — essay sink + review
-- =============================================================================
--
-- PURPOSE
-- The final, auditable essay record (one row per candidatura+pergunta). Carries the
-- submitted text + the EF's AI verdict (scores/color/red_flag/flags) + the human
-- reviewer's decision fields. Transcribed VERBATIM from PRD v1.1 §8.1 (CREATE TABLE,
-- lines 303-354) + §8.2 (RLS policies + the BEFORE UPDATE review-fields-only trigger,
-- lines 399-448). D-13: the binding PRD is the source of truth.
--
-- SECURITY MODEL (RNF-07a / [[reference_select_star_leaks_pii]]):
--   * The candidate may SELECT their OWN row (PRD §8.2 line 401) — but the candidate-
--     facing service layer (Plan 03) reads via an explicit allowlist that EXCLUDES
--     every verdict column (analise_ia/scores_dimensao/score_ponderado_0_100/
--     classificacao_cor/red_flag_etico/flags/scores_humanos/notas_revisor/
--     decisao_revisor). RLS is row-level only; column secrecy is the allowlist's job.
--     The EF HTTP response to the candidate is NEUTRAL ({ ok:true }) — never a score.
--   * Client INSERT is DENIED (WITH CHECK false) — rows are written ONLY by the
--     service_role EF (avaliar-redacao-cultural). Score is server-authoritative.
--   * RH/admin SELECT all + UPDATE only the review fields; the BEFORE UPDATE trigger
--     RAISEs if RH mutates any non-review field (texto/hash/IA fields) — DB-enforced
--     tamper protection (PRD §8.2 lines 421-448).
--
-- ROLE-VALUE RECONCILIATION (load-bearing): the PRD writes 'rh','admin'. The LIVE M2
-- policies + the custom_access_token_hook emit 'rh','administrador' (NEVER the stale
-- 'admin'). A mismatched role string silently denies every RH read. We use the LIVE
-- value 'administrador' + the live `#>>` projection so app_metadata.role matches the
-- hook output ([[reference_auth_hook_rls_gap]]). The trigger's role guard is likewise
-- reconciled — it must match the SAME role the RH UPDATE policy admitted.
--
-- COLUMN-NAME RECONCILIATION: the candidate SELECT policy links via candidatos.user_id
-- (the live auth-link column; the PRD's `auth_user_id` does not exist — same fix as
-- the _em_progresso migration).
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). This
-- file has ONE $$ function body (trg_redacao_rh_only_review_fields) + adjacent
-- DDL/policy/trigger statements → it is the canonical 42601-risk push. If
-- `db push --linked` trips, apply via the D-22 SQL-Editor / Supabase MCP apply_migration
-- workaround, then reconcile the version row. NOT applied here — application is the
-- [BLOCKING] 13-04 apply wave (CONTEXT).
-- =============================================================================

-- Final auditable essay record (PRD §8.1 lines 303-354 — verbatim) --------------
CREATE TABLE public.redacoes_candidato (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id           uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  pergunta_id              uuid NOT NULL REFERENCES public.perguntas_redacao(id),
  ordem                    smallint NOT NULL CHECK (ordem BETWEEN 1 AND 3),
  eh_pergunta_padrao       boolean NOT NULL,  -- true se Q1; false se Q2/Q3 customizavel

  -- Texto da redacao
  texto                    text NOT NULL,
  word_count               int NOT NULL CHECK (word_count BETWEEN 200 AND 500),
  texto_hash               text NOT NULL,  -- sha256(normalize(texto)) — anti-plagio
  tempo_gasto_segundos     int NOT NULL,
  submetida_em             timestamptz NOT NULL DEFAULT now(),

  -- Analise IA (preenchida pela Edge Function)
  analise_ia               jsonb,
  scores_dimensao          jsonb,  -- {D1, D2, D3, D4} cada int|'insufficient_evidence'
  score_ponderado_0_100    numeric(5,2) CHECK (score_ponderado_0_100 BETWEEN 0 AND 100),
  classificacao_cor        text CHECK (classificacao_cor IN ('verde','amarelo','vermelho')),
  red_flag_etico           boolean NOT NULL DEFAULT false,
  flags                    text[] NOT NULL DEFAULT ARRAY[]::text[],
  referencia_match         uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],  -- candidatura_ids match no hash
  prompt_version           text,
  model_version            text,
  input_hash               text,
  cost_tokens_input        int,
  cost_tokens_output       int,
  ia_processada_em         timestamptz,

  -- Revisao humana
  revisada_por             uuid REFERENCES auth.users(id),
  revisada_em              timestamptz,
  scores_humanos           jsonb,
  notas_revisor            text CHECK (notas_revisor IS NULL OR length(notas_revisor) >= 50),
  decisao_revisor          text CHECK (decisao_revisor IN ('aprovado','reprovado','duvida')),

  -- Status + bloqueio
  status_analise           text NOT NULL DEFAULT 'pendente'
                             CHECK (status_analise IN ('pendente','processando','concluida','falhou','pendente_humano')),
  bloqueio_avanco          boolean NOT NULL DEFAULT false,  -- true se vermelho — revisao obrigatoria

  CONSTRAINT redacao_uq_pergunta_candidatura UNIQUE (candidatura_id, pergunta_id)
);

CREATE INDEX idx_redacoes_candidatura ON public.redacoes_candidato (candidatura_id);
CREATE INDEX idx_redacoes_status      ON public.redacoes_candidato (status_analise);
CREATE INDEX idx_redacoes_cor         ON public.redacoes_candidato (classificacao_cor);
CREATE INDEX idx_redacoes_hash        ON public.redacoes_candidato (texto_hash);  -- anti-plagio
CREATE INDEX idx_redacoes_bloqueio    ON public.redacoes_candidato (candidatura_id) WHERE bloqueio_avanco = true;

COMMENT ON TABLE public.redacoes_candidato IS
  'Registro final auditavel. 1 row por (candidatura, pergunta). RLS: candidato R proprio; RH/admin R todas + UPDATE so em campos de revisao (trigger valida). INSERT apenas via Edge Function service_role.';

-- RLS (PRD §8.2 lines 399-419, role/column reconciled to live — see header) ------
ALTER TABLE public.redacoes_candidato ENABLE ROW LEVEL SECURITY;

-- Candidate R own row (the app reads via an allowlist that excludes every verdict
-- column — the row policy alone does not hide columns). Link via candidatos.user_id.
DROP POLICY IF EXISTS redacao_candidato_select ON public.redacoes_candidato;
CREATE POLICY redacao_candidato_select ON public.redacoes_candidato
  FOR SELECT TO authenticated
  USING (
    candidatura_id IN (
      SELECT id FROM public.candidaturas
      WHERE candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = auth.uid())
    )
  );

-- Client INSERT denied — only the service_role EF writes rows (server-authoritative).
DROP POLICY IF EXISTS redacao_no_client_insert ON public.redacoes_candidato;
CREATE POLICY redacao_no_client_insert ON public.redacoes_candidato
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- RH/admin: SELECT all.
DROP POLICY IF EXISTS redacao_rh_select ON public.redacoes_candidato;
CREATE POLICY redacao_rh_select ON public.redacoes_candidato
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));

-- RH/admin: UPDATE only review fields — the BEFORE UPDATE trigger enforces the column
-- restriction (the policy admits the row; the trigger rejects non-review-field changes).
DROP POLICY IF EXISTS redacao_rh_update ON public.redacoes_candidato;
CREATE POLICY redacao_rh_update ON public.redacoes_candidato
  FOR UPDATE TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'))
  WITH CHECK (true);

-- Review-fields-only trigger (PRD §8.2 lines 421-448 — verbatim; role reconciled to
-- the live 'rh','administrador'). RAISEs if RH/admin mutates any non-review field.
CREATE OR REPLACE FUNCTION public.trg_redacao_rh_only_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador') THEN
    IF NEW.texto                 IS DISTINCT FROM OLD.texto                 OR
       NEW.candidatura_id        IS DISTINCT FROM OLD.candidatura_id        OR
       NEW.pergunta_id           IS DISTINCT FROM OLD.pergunta_id           OR
       NEW.word_count            IS DISTINCT FROM OLD.word_count            OR
       NEW.texto_hash            IS DISTINCT FROM OLD.texto_hash            OR
       NEW.tempo_gasto_segundos  IS DISTINCT FROM OLD.tempo_gasto_segundos  OR
       NEW.submetida_em          IS DISTINCT FROM OLD.submetida_em          OR
       NEW.analise_ia            IS DISTINCT FROM OLD.analise_ia            OR
       NEW.scores_dimensao       IS DISTINCT FROM OLD.scores_dimensao       OR
       NEW.score_ponderado_0_100 IS DISTINCT FROM OLD.score_ponderado_0_100 OR
       NEW.classificacao_cor     IS DISTINCT FROM OLD.classificacao_cor     OR
       NEW.red_flag_etico        IS DISTINCT FROM OLD.red_flag_etico        OR
       NEW.prompt_version        IS DISTINCT FROM OLD.prompt_version        OR
       NEW.model_version         IS DISTINCT FROM OLD.model_version         OR
       NEW.input_hash            IS DISTINCT FROM OLD.input_hash            THEN
      RAISE EXCEPTION 'RH/admin so pode atualizar campos de revisao (scores_humanos, notas_revisor, decisao_revisor, revisada_*, status_analise, bloqueio_avanco).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS redacao_rh_only_review_fields ON public.redacoes_candidato;
CREATE TRIGGER redacao_rh_only_review_fields
  BEFORE UPDATE ON public.redacoes_candidato
  FOR EACH ROW EXECUTE FUNCTION public.trg_redacao_rh_only_review_fields();
