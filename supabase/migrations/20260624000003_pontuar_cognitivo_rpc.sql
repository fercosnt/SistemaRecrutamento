-- =============================================================================
-- Migration: pontuar_cognitivo() — deterministic cognitive scoring RPC (no LLM)
-- Date: 2026-06-24
-- Phase: 14 (entrevistas-com-ia-companion-etapas-4-5)
-- Requirement: ENTREV-05 (RF-26c) — server-authoritative CTT soma, never auto-reject
-- =============================================================================
--
-- PURPOSE
-- Given a candidatura_id + the candidate's raw picks {itemId -> optionIndex}, recompute
-- the cognitive score server-side from cognitivo_itens.gabarito_idx (CTT soma 0/1 per
-- item + per-section subtotals matriz/letra_numero + the 5-faixa banding), and persist
-- exactly one scores_candidato row (tipo='cognitivo', subtipo='raciocinio_logico'). The
-- candidate NEVER submits a score and NEVER receives one back — only raw picks in, a
-- NEUTRAL payload out (RNF-07a). Cognitive is CONTEXTUAL and decides nothing.
--
-- NO-LLM RPC (resolved Q3): scoring is deterministic (no model call), so an RPC is the
-- right primitive (cheaper than an EF, matches pontuar_sjt). NO ALTER TYPE — 'cognitivo'
-- already exists in tipo_score (resolved Q1); subtipo='raciocinio_logico' reconciles the
-- PRD-prose label (documented deviation, 14-RESEARCH Open Q1).
--
-- BANDING (must stay IDENTICAL to scoring.ts §8.2 to avoid TS/SQL drift): proportion-
-- correct quintiles over nTotal items —
--   pct <= 0.2 → bem_abaixo · <= 0.4 → abaixo · <= 0.6 → na_media · <= 0.8 → acima · else bem_acima.
--   nTotal <= 0 → 'na_media' (defensive; never divide by zero — matches bandaFromTotal).
--
-- AUTHZ (T-14-03-01 / C1): SECURITY DEFINER bypasses RLS, so the function MUST verify
-- inside that auth.uid() OWNS the candidatura (via candidatos.user_id=auth.uid(), NEVER
-- candidato_id===user.id) AND it is in an interview etapa before scoring; else RAISE
-- 42501. auth.uid() is GUC-based, survives DEFINER (Phase-6 proof). REVOKE PUBLIC +
-- GRANT authenticated.
--
-- INVARIANT (RNF-07a): this function NEVER writes candidaturas — no auto-advance, no
-- auto-reject. status='sucesso' on scores_candidato is INFORMATIONAL ONLY; it never
-- drives etapa. The band/score never reaches the candidate.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). This is a
-- PL/pgSQL $$ body + adjacent REVOKE/GRANT → the canonical 42601-risk migration. Applied
-- LIVE in the [BLOCKING] 14-04 wave via Supabase MCP apply_migration — NOT applied here.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.pontuar_cognitivo(
  p_candidatura_id uuid,
  p_respostas      jsonb              -- { "itemId": optionIndex, ... }  (raw picks only)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owns        boolean;
  v_total       int := 0;
  v_n_total     int := 0;
  v_matriz_raw  int := 0;
  v_matriz_n    int := 0;
  v_ln_raw      int := 0;
  v_ln_n        int := 0;
  v_pct         numeric := 0;
  v_banda       text;
BEGIN
  -- AUTHORIZE (C1): caller owns candidatura AND is in an interview etapa.
  -- auth.uid() reads the request.jwt GUC → survives SECURITY DEFINER (Phase-6 proof).
  -- Ownership via candidatos.user_id=auth.uid() (NEVER candidato_id===user.id).
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()
       AND c.etapa_atual IN ('entrevista_online', 'entrevista_presencial')
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- CTT soma 0/1 per item, server-side from cognitivo_itens.gabarito_idx (the DEFINER
  -- RPC bypasses RLS to read the answer key). A client pick equal to gabarito_idx → 1;
  -- a missing/wrong pick → 0. Per-section subtotals (matriz / letra_numero). The
  -- gabarito (cognitivo_itens) is the source of truth for the item set — any extra key
  -- in p_respostas (e.g. a forged score) is structurally ignored (anti-tamper, mirrors
  -- scoreRaciocinio).
  SELECT
    COALESCE(SUM(CASE WHEN i.secao = 'matriz' THEN i.hit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN i.secao = 'matriz' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN i.secao = 'letra_numero' THEN i.hit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN i.secao = 'letra_numero' THEN 1 ELSE 0 END), 0),
    COALESCE(COUNT(*), 0)
  INTO v_matriz_raw, v_matriz_n, v_ln_raw, v_ln_n, v_n_total
  FROM (
    SELECT ci.secao,
           CASE
             WHEN (p_respostas ->> ci.id::text) IS NOT NULL
              AND (p_respostas ->> ci.id::text)::int = ci.gabarito_idx
             THEN 1 ELSE 0
           END AS hit
      FROM public.cognitivo_itens ci
  ) i;

  v_total := v_matriz_raw + v_ln_raw;

  -- Banding — IDENTICAL cutoffs to scoring.ts bandaFromTotal (TS/SQL no-drift).
  IF v_n_total <= 0 THEN
    v_banda := 'na_media';
  ELSE
    v_pct := v_total::numeric / v_n_total;
    v_banda := CASE
      WHEN v_pct <= 0.2 THEN 'bem_abaixo'
      WHEN v_pct <= 0.4 THEN 'abaixo'
      WHEN v_pct <= 0.6 THEN 'na_media'
      WHEN v_pct <= 0.8 THEN 'acima'
      ELSE 'bem_acima'
    END;
  END IF;

  -- Persist exactly ONE cognitivo row (idempotent on re-submit). status='sucesso' is
  -- INFORMATIONAL ONLY — cognitive NEVER drives etapa (RNF-07a). NEVER writes candidaturas.
  INSERT INTO public.scores_candidato
    (candidatura_id, tipo, subtipo, score, score_max, status, metadata)
  VALUES
    (p_candidatura_id, 'cognitivo', 'raciocinio_logico', v_total, v_n_total, 'sucesso',
     jsonb_build_object(
       'instrumento', 'raciocinio_logico_cc0',
       'banda', v_banda,
       'secoes', jsonb_build_object(
         'matriz', jsonb_build_object('raw', v_matriz_raw, 'n_itens', v_matriz_n),
         'letra_numero', jsonb_build_object('raw', v_ln_raw, 'n_itens', v_ln_n)
       ),
       'raw_responses', p_respostas,
       'flags', '[]'::jsonb
     ))
  ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id)
  DO UPDATE SET score = EXCLUDED.score, score_max = EXCLUDED.score_max,
                status = EXCLUDED.status, metadata = EXCLUDED.metadata,
                updated_at = now();

  -- NEUTRAL payload to the candidate: NO score, NO band (RNF-07a / UI-SPEC).
  RETURN jsonb_build_object('ok', true, 'registrado', true);
END;
$$;

REVOKE ALL ON FUNCTION public.pontuar_cognitivo(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pontuar_cognitivo(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.pontuar_cognitivo(uuid, jsonb) IS
  'Phase 14 / ENTREV-05: pontua determinísticamente o raciocinio (CTT soma 0/1 + subtotais matriz/letra_numero + banda 5 faixas) server-side a partir de cognitivo_itens.gabarito_idx. tipo=cognitivo + subtipo=raciocinio_logico (sem ALTER TYPE). SECURITY DEFINER; guard: candidato dono (candidatos.user_id=auth.uid()) + etapa de entrevista, senao 42501. Banding identico a scoring.ts (no-drift). NUNCA escreve candidaturas, NUNCA auto-rejeita; status informacional. Payload NEUTRO. GRANT authenticated (REVOKE PUBLIC).';
