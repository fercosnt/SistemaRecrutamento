-- =============================================================================
-- Migration: get_avaliacao_status — neutral per-test presence-booleans RPC
-- Date: 2026-07-12
-- Phase: 26 (Correção do Funil — lado candidato / alcançabilidade & scoring)
-- Requirement: FUNIL-12 (A41) — card completion derived from the candidate's OWN rows
-- =============================================================================
--
-- WHY THIS RPC
-- The avaliacao container derives each card's completion from a PHANTOM field
-- `entry.status` on the testes_aplicaveis element (A41) — that jsonb is vaga-level
-- CONFIG and carries NO per-candidate state (testeAplicavelSchema has no status field),
-- so a completed test never flips the card to Concluído. Per D-Card-Status, the truth
-- lives in the candidate's OWN rows (scores_candidato / redacoes_candidato /
-- respostas_avaliacao). scores_candidato has NO candidate read policy by design
-- (row-deny hides the verdict entirely; RLS is row-level and cannot hide a column —
-- [[reference_select_star_leaks_pii]]), so the candidate cannot SELECT it directly.
-- This neutral SECURITY DEFINER reader is the ONLY safe channel: it returns per-test
-- PRESENCE BOOLEANS (a row exists / an autosave draft exists) and NEVER the row's
-- content — no verdict, no numeric, no threshold (RNF-07a / Pitfall 8).
--
-- CARD → SOURCE MAP (the container recognizes FIVE candidate-facing cards):
--   sjt_mc          registrado = a scores_candidato row (tipo=sjt, subtipo=mc) exists.
--                   (no `iniciado` — SjtMultiplaEscolhaScreen has NO autosave; there is
--                    no respostas_avaliacao draft for it, so a boolean would be dead.)
--   sjt_caso_aberto registrado = a scores_candidato row (tipo=sjt, subtipo=caso_aberto)
--                   exists — written by the avaliar-redacao EF (open case);
--                   iniciado   = a respostas_avaliacao draft (teste=sjt_caso_aberto) exists.
--   redacao         registrado = a redacoes_candidato row exists (the essay write-path is
--                   redacoes_candidato ONLY — the avaliar-redacao-cultural EF upsert +
--                   salvar_revisao_redacao RPC; there is NO scores_candidato redacao
--                   writer, so keying the card on scores would keep it eternally Pendente);
--                   iniciado   = a respostas_avaliacao draft (teste=redacao) exists.
--   big_five        registrado = a scores_candidato row (tipo=big_five) exists;
--                   iniciado   = a respostas_avaliacao draft (teste=big_five) exists.
--   cognitivo       registrado = a scores_candidato row (tipo=cognitivo) exists.
--                   (no confirmed autosave draft → registrado only.)
--
-- SECURITY (Pitfall 8 / T-26-02-02/03):
--   * Ownership gate FIRST — owner via candidatos.user_id=auth.uid() (NEVER candidato_id);
--     a foreign candidatura RAISEs 42501 (IDOR guard). NO etapa clause — card state is
--     readable across etapas (unlike the submit RPCs).
--   * Returns booleans ONLY — no score / score_max / verdict / metadata key anywhere in
--     the payload. The behavioral smoke asserts no numeric/verdict field is reachable.
--   * scores_candidato keeps its candidate-DENY row policy — this migration adds NO
--     candidate SELECT policy (T-26-02-04). SECURITY DEFINER SET search_path=''.
--
-- APPLY MECHANIC (D-22 / CLAUDE.md §Migrations): apply via Supabase MCP
-- `apply_migration` (bypasses the 42601 error `db push --linked` throws on $$ bodies +
-- adjacent REVOKE/GRANT). Do NOT run `db push` for this file. NO `BEGIN;/COMMIT;`
-- wrapper. Applied live in the Wave 4 BLOCKING plan (26-07); the behavioral smoke
-- (funil12_status_rpc_smoke.sql) is the load-bearing acceptance gate, run AFTER this
-- applies. Do NOT edit database.types.ts (regen is Phase 27 — the client uses a narrow
-- confined cast in 26-05).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_avaliacao_status(p_candidatura_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owns boolean;
  r      jsonb;
BEGIN
  -- OWNERSHIP (IDOR guard) — owner via candidatos.user_id=auth.uid() (NEVER candidato_id).
  -- auth.uid() reads the request.jwt GUC → survives SECURITY DEFINER (Phase-6 proof).
  -- NO etapa clause: card state is readable across etapas.
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Per-test PRESENCE BOOLEANS only — never the row's content (RNF-07a / Pitfall 8).
  SELECT jsonb_build_object(
    'sjt_mc', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                            WHERE candidatura_id = p_candidatura_id
                              AND tipo = 'sjt' AND subtipo = 'mc')),
    'sjt_caso_aberto', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                            WHERE candidatura_id = p_candidatura_id
                              AND tipo = 'sjt' AND subtipo = 'caso_aberto'),
      'iniciado',   EXISTS(SELECT 1 FROM public.respostas_avaliacao
                            WHERE candidatura_id = p_candidatura_id
                              AND teste = 'sjt_caso_aberto')),
    'redacao', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.redacoes_candidato
                            WHERE candidatura_id = p_candidatura_id),
      'iniciado',   EXISTS(SELECT 1 FROM public.respostas_avaliacao
                            WHERE candidatura_id = p_candidatura_id
                              AND teste = 'redacao')),
    'big_five', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                            WHERE candidatura_id = p_candidatura_id
                              AND tipo = 'big_five'),
      'iniciado',   EXISTS(SELECT 1 FROM public.respostas_avaliacao
                            WHERE candidatura_id = p_candidatura_id
                              AND teste = 'big_five')),
    'cognitivo', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                            WHERE candidatura_id = p_candidatura_id
                              AND tipo = 'cognitivo'))
  ) INTO r;

  RETURN r;   -- NEUTRAL — presence booleans only (RNF-07a).
END;
$$;

REVOKE ALL ON FUNCTION public.get_avaliacao_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_avaliacao_status(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_avaliacao_status(uuid) IS
  'Phase 26 / FUNIL-12 (26-02): fonte de verdade NEUTRA do estado dos 5 cards de avaliacao (sjt_mc, sjt_caso_aberto, big_five, redacao, cognitivo) — booleans de PRESENCA por teste (registrado = existe row de score/redacao; iniciado = existe rascunho respostas_avaliacao), NUNCA score/veredito/threshold (fecha o entry.status fantasma A41). redacao vem de redacoes_candidato (a via de escrita do essay), sjt_caso_aberto de scores_candidato subtipo=caso_aberto. SECURITY DEFINER; guard de posse (candidatos.user_id=auth.uid()) sem clausula de etapa → 42501 em candidatura alheia (IDOR). scores_candidato mantem candidate-DENY (sem SELECT policy de candidato). GRANT authenticated (REVOKE PUBLIC).';
