-- =============================================================================
-- Migration: salvar_avaliacao_entrevista() — human-override write RPC (RH-only)
-- Date: 2026-06-24
-- Phase: 14 (entrevistas-com-ia-companion-etapas-4-5)
-- Requirement: ENTREV-02 (RF-24) — inline editable scorecard (notas_humanas + scores)
-- =============================================================================
--
-- PURPOSE
-- The reviewer (RH/admin) records their human override on one entrevista_analises
-- row: scores_humanos (BARS slider override) + notas_humanas. This is the
-- human-override write the inline scorecard (14-05) calls — it clones
-- salvar_revisao_redacao verbatim. Resolving an analysis row by candidatura_id
-- (one analysis per candidatura in V1; the most recent if more than one).
--
-- INVARIANT (RNF-07a): this RPC NEVER writes `candidaturas`, NEVER advances the
-- funil, NEVER auto-rejects. It only RECORDS the human's notes/scores on the
-- analysis row. (Confirming review — setting revisao_confirmada_em to release the
-- avancar_etapa guard — is a separate explicit action; this RPC may set it when the
-- reviewer confirms, but it never moves the candidate.) The human always decides.
--
-- AUTHZ (T-14-03-01 — SECURITY DEFINER bypasses RLS, so the guard is the real control):
--   1. role IN ('rh','administrador') — candidato/anon → RAISE insufficient_privilege.
--   2. role='rh' must OWN the candidatura's vaga (entrevista_analises → candidaturas
--      → vagas.created_by = auth.uid()); administrador bypasses ownership.
--   auth.uid() reads the request.jwt GUC → survives SECURITY DEFINER (Phase-6 proof).
--   REVOKE FROM PUBLIC + GRANT EXECUTE TO authenticated.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). This
-- is a PL/pgSQL $$ body + adjacent REVOKE/GRANT → the canonical 42601-risk migration.
-- Applied LIVE in the [BLOCKING] 14-04 wave via Supabase MCP apply_migration — NOT
-- applied here.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.salvar_avaliacao_entrevista(
  p_candidatura_id uuid,
  p_scores_humanos jsonb,
  p_notas          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_analise_id uuid;
BEGIN
  -- (1) Resolve the most recent analysis row for this candidatura + its vaga owner:
  --     entrevista_analises → candidaturas → vagas.
  SELECT ea.id, v.created_by
    INTO v_analise_id, v_vaga_owner
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.candidatura_id = p_candidatura_id
   ORDER BY ea.created_at DESC
   LIMIT 1;

  IF v_analise_id IS NULL THEN
    RAISE EXCEPTION 'analise de entrevista nao encontrada para a candidatura %', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (2) Role + own-vaga guard. candidato/anon → forbidden. rh → must own the vaga.
  --     administrador → bypass ownership. (salvar_revisao_redacao idiom.)
  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (3) Body validation (defense in depth).
  IF p_notas IS NULL OR length(btrim(p_notas)) = 0 THEN
    RAISE EXCEPTION 'notas_humanas obrigatorias' USING ERRCODE = 'check_violation';
  END IF;

  -- (4) Record the human override + confirm review. Setting revisao_confirmada_em
  --     RELEASES the avancar_etapa flag guard (migration 04) — but NEVER advances
  --     the candidate (RNF-07a). Confirming review and advancing are separate
  --     human actions; this RPC only records + unblocks.
  UPDATE public.entrevista_analises
     SET scores_humanos        = p_scores_humanos,
         notas_humanas         = p_notas,
         revisao_confirmada_em = now(),
         revisada_por          = (select auth.uid()),
         status_analise        = 'concluida'
   WHERE id = v_analise_id;

  -- Neutral, RH-facing acknowledgement (no candidaturas mutation occurred).
  RETURN jsonb_build_object('ok', true, 'analise_id', v_analise_id, 'candidatura_id', p_candidatura_id);
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) TO authenticated;

COMMENT ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) IS
  'Phase 14 / ENTREV-02: grava a revisao humana de uma entrevista (scores_humanos + notas_humanas) na entrevista_analises mais recente da candidatura + confirma a revisao (revisao_confirmada_em, libera o guard avancar_etapa). SECURITY DEFINER + search_path=''''. Guard: role IN (rh,administrador); rh deve possuir a vaga (vagas.created_by=auth.uid()); administrador bypassa. NUNCA escreve candidaturas, NUNCA avanca o funil (RNF-07a). GRANT EXECUTE TO authenticated (REVOKE FROM PUBLIC).';
