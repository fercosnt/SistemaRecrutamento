-- =============================================================================
-- Migration: salvar_revisao_redacao() — human-review write RPC (RH-only)
-- Date: 2026-06-23
-- Phase: 13 (redacao-cultural-revisao-humana — Etapa 3, redacao layer)
-- Requirement: AVAL-07 (RF-R-21/24/25/27/28) — mandatory human review write
-- =============================================================================
--
-- PURPOSE
-- The reviewer (RH/admin) records their decision on one redacoes_candidato row:
-- scores_humanos (BARS slider override) + notas_revisor (≥50 chars) + decisao_revisor
-- (aprovado/reprovado/duvida) + revisada_por/em. Per PRD v1.1 §6.3:
--   * aprovado / reprovado  → status_analise = 'concluida' (RF-R-28 — recorded; the
--     candidate may then advance, but advancing is a SEPARATE human action).
--   * duvida                → status stays 'pendente_humano' (RF-R-27 — escalated to
--     the gestor; the decision is NOT finalized). The gestor list (Plan 05) reads
--     decisao_revisor='duvida'.
-- D-13: AVAL-07 review-write transcribed from the binding PRD.
--
-- INVARIANT (RNF-07a — T-13-02-03): this RPC NEVER writes `candidaturas`, NEVER
-- advances the funil, NEVER auto-rejects. aprovado/reprovado only RECORD the decision
-- and flip the redação's own status to 'concluida'; advancing the candidate is a
-- separate explicit human action elsewhere. The human always decides.
--
-- AUTHZ (T-13-02-07 — SECURITY DEFINER bypasses RLS, so the guard is the real control):
--   1. role IN ('rh','administrador') — candidato/anon → RAISE insufficient_privilege.
--   2. role='rh' must OWN the redação's vaga (redacoes_candidato → candidaturas →
--      vagas.created_by = auth.uid()); administrador bypasses ownership.
--   auth.uid() reads the request.jwt GUC → survives SECURITY DEFINER (Phase-6 proof).
--   REVOKE FROM PUBLIC + GRANT EXECUTE TO authenticated.
--
-- TRIGGER INTERACTION: every column this RPC writes (scores_humanos, notas_revisor,
-- decisao_revisor, revisada_por, revisada_em, status_analise) is in the ALLOWED set
-- of trg_redacao_rh_only_review_fields — none is in the trigger's forbidden set, so
-- the UPDATE passes cleanly (defense in depth: this RPC + the trigger both gate the
-- review surface).
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). This
-- is a PL/pgSQL $$ body + adjacent REVOKE/GRANT → the canonical 42601-risk migration.
-- If `db push --linked` trips, apply via the D-22 SQL-Editor / Supabase MCP
-- apply_migration workaround, then reconcile the version row. NOT applied here —
-- application is the [BLOCKING] 13-04 apply wave (CONTEXT).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.salvar_revisao_redacao(
  p_redacao_id      uuid,
  p_decisao         text,
  p_notas           text,
  p_scores_humanos  jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_found      boolean;
BEGIN
  -- (1) Resolve the redação's vaga owner: redacoes_candidato → candidaturas → vagas.
  SELECT v.created_by, true
    INTO v_vaga_owner, v_found
    FROM public.redacoes_candidato r
    JOIN public.candidaturas c ON c.id = r.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE r.id = p_redacao_id;

  IF v_found IS NOT TRUE THEN
    RAISE EXCEPTION 'redacao % not found', p_redacao_id USING ERRCODE = 'no_data_found';
  END IF;

  -- (2) Role + own-vaga guard. candidato/anon → forbidden. rh → must own the vaga.
  --     administrador → bypass ownership. (reprocessar_rpc.sql:50-59 idiom.)
  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (3) Body validation (defense in depth — mirrors the DB CHECKs).
  IF p_decisao NOT IN ('aprovado', 'reprovado', 'duvida') THEN
    RAISE EXCEPTION 'decisao invalida' USING ERRCODE = 'check_violation';
  END IF;

  IF p_notas IS NULL OR length(p_notas) < 50 THEN
    RAISE EXCEPTION 'notas_revisor exige no minimo 50 caracteres' USING ERRCODE = 'check_violation';
  END IF;

  -- (4) Record the review. aprovado/reprovado → status 'concluida' (RF-R-28); duvida →
  --     status stays as-is (pendente_humano — escalated to the gestor, RF-R-27, NOT
  --     finalized). NEVER touches candidaturas (RNF-07a). Only review fields change →
  --     passes trg_redacao_rh_only_review_fields cleanly.
  UPDATE public.redacoes_candidato
     SET scores_humanos = p_scores_humanos,
         notas_revisor  = p_notas,
         decisao_revisor = p_decisao,
         revisada_por   = (select auth.uid()),
         revisada_em    = now(),
         status_analise = CASE
           WHEN p_decisao = 'duvida' THEN status_analise  -- stays pendente_humano (escalate)
           ELSE 'concluida'
         END
   WHERE id = p_redacao_id;

  -- Neutral, RH-facing acknowledgement (no candidaturas mutation occurred).
  RETURN jsonb_build_object('ok', true, 'redacao_id', p_redacao_id, 'decisao', p_decisao);
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_revisao_redacao(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_revisao_redacao(uuid, text, text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.salvar_revisao_redacao(uuid, text, text, jsonb) IS
  'Phase 13 / AVAL-07: grava a revisao humana de uma redacao (scores_humanos + notas_revisor>=50 + decisao_revisor + revisada_*). aprovado/reprovado → status_analise=concluida (RF-R-28); duvida → fica pendente_humano (escala gestor, RF-R-27). SECURITY DEFINER + search_path=''. Guard: role IN (rh,administrador); rh deve possuir a vaga (vagas.created_by=auth.uid()); administrador bypassa. NUNCA escreve candidaturas (RNF-07a). GRANT EXECUTE TO authenticated (REVOKE FROM PUBLIC).';
