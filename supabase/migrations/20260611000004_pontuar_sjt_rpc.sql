-- =============================================================================
-- Migration: pontuar_sjt() — deterministic SJT multiple-choice scoring RPC
-- Date: 2026-06-11
-- Phase: 11 (avaliacao-assincrona — infra + work-sample/SJT, Etapa 3)
-- Requirement: AVAL-02 (RF-13) — server-authoritative Σ peso, never auto-reject
-- =============================================================================
--
-- PURPOSE
-- Given a candidatura_id + the candidate's submitted {pergunta_id, opcao_id}[],
-- compute Σ peso server-side from the DEDICATED perguntas_opcao_sjt weights table
-- (NOT the Phase-7 pergunta_opcao_metadata — that table's FK targets
-- perguntas_formulario; this phase introduced no live ALTER on it), apply the
-- threshold, and persist exactly one scores_candidato MC row. The candidate NEVER
-- submits a score and NEVER receives one back — only answer identifiers in, a
-- NEUTRAL payload out.
--
-- AUTHZ (T-11-02-02 / C1 — [[reference_ef_authenticate_vs_authorize]]): the
-- function is SECURITY DEFINER (runs as owner, bypasses RLS), so it MUST verify
-- inside that auth.uid() OWNS the candidatura AND it is in etapa_atual=
-- 'avaliacao_assincrona' before scoring; otherwise RAISE 42501. auth.uid() is
-- GUC-based (request.jwt.claims), so it survives DEFINER (Phase-6 proof). REVOKE
-- PUBLIC + GRANT authenticated tail.
--
-- THRESHOLD (RNF-07a — T-11-02-06): <mc_min_pct OR ≥1 atencao → status=
-- 'pendente_humano'; else 'sucesso'. mc_min_pct is read per-vaga from the matching
-- SJT element of vagas.testes_aplicaveis (.threshold.mc_min_pct, a percentage 0-100,
-- default 60). This function NEVER writes candidaturas — no auto-advance, no
-- auto-reject, no historico_candidatura row. The ONLY status it sets is on
-- scores_candidato.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands).
-- This is a PL/pgSQL $$ body + adjacent REVOKE/GRANT → the canonical 42601-risk
-- migration. If `db push --linked` trips, apply via the D-22 SQL-Editor / Supabase
-- MCP execute_sql workaround, then `migration repair --status applied 20260611000004`.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.pontuar_sjt(
  p_candidatura_id uuid,
  p_respostas      jsonb              -- [{ "pergunta_id": uuid, "opcao_id": uuid }, ...]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owns        boolean;
  v_score       int := 0;
  v_max         int := 0;
  v_has_atencao boolean := false;
  v_status      public.status_score;
  v_breakdown   jsonb;
  v_mc_min_pct  numeric := 60;        -- default percentage (0-100)
BEGIN
  -- AUTHORIZE (C1): caller owns candidatura AND is in avaliacao_assincrona.
  -- auth.uid() reads the request.jwt GUC → survives SECURITY DEFINER (Phase-6 proof).
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()
       AND c.etapa_atual = 'avaliacao_assincrona'
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Per-vaga mc_min_pct (percentage) from the matching SJT element of
  -- vagas.testes_aplicaveis; default 60 if absent/malformed.
  SELECT COALESCE(
           (SELECT (elem->'threshold'->>'mc_min_pct')::numeric
              FROM public.candidaturas c
              JOIN public.vagas v ON v.id = c.vaga_id,
                   jsonb_array_elements(v.testes_aplicaveis) elem
             WHERE c.id = p_candidatura_id
               AND elem->>'tipo' = 'sjt'
               AND (elem->'threshold'->>'mc_min_pct') IS NOT NULL
             LIMIT 1),
           60
         )
    INTO v_mc_min_pct;

  -- Σ peso(opcao marcada) + Σ max(peso) per pergunta (denominator) + atencao flag.
  WITH marked AS (
    SELECT (r->>'pergunta_id')::uuid AS pergunta_id,
           (r->>'opcao_id')::uuid    AS opcao_id
      FROM jsonb_array_elements(p_respostas) r
  ),
  scored AS (
    SELECT m.pergunta_id, pos.opcao_id, pos.tag, pos.peso
      FROM marked m
      JOIN public.perguntas_opcao_sjt pos
        ON pos.pergunta_id = m.pergunta_id AND pos.opcao_id = m.opcao_id
  ),
  maxes AS (
    SELECT pergunta_id, MAX(peso) AS peso_max
      FROM public.perguntas_opcao_sjt
     WHERE pergunta_id IN (SELECT pergunta_id FROM marked)
     GROUP BY pergunta_id
  )
  SELECT COALESCE(SUM(s.peso), 0),
         COALESCE((SELECT SUM(peso_max) FROM maxes), 0),
         COALESCE(bool_or(s.tag = 'atencao'), false),
         COALESCE(
           jsonb_agg(jsonb_build_object(
             'pergunta_id', s.pergunta_id, 'opcao_id', s.opcao_id,
             'tag', s.tag, 'peso', s.peso)),
           '[]'::jsonb)
    INTO v_score, v_max, v_has_atencao, v_breakdown
    FROM scored s;

  -- Threshold (RNF-07a): <mc_min_pct OR ≥1 atencao → pendente_humano. NEVER
  -- auto-reject / no etapa change. mc_min_pct is a percentage (0-100).
  v_status := CASE
    WHEN v_has_atencao OR (v_max > 0 AND (v_score::numeric / v_max) * 100 < v_mc_min_pct)
    THEN 'pendente_humano'::public.status_score
    ELSE 'sucesso'::public.status_score
  END;

  -- Persist exactly ONE MC row (idempotent on re-submit via NULLS NOT DISTINCT key).
  INSERT INTO public.scores_candidato
    (candidatura_id, tipo, subtipo, score, score_max, status, metadata)
  VALUES
    (p_candidatura_id, 'sjt', 'mc', v_score, v_max, v_status,
     jsonb_build_object('respostas', v_breakdown,
                        'has_atencao', v_has_atencao,
                        'mc_min_pct', v_mc_min_pct))
  ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id)
  DO UPDATE SET score = EXCLUDED.score, score_max = EXCLUDED.score_max,
                status = EXCLUDED.status, metadata = EXCLUDED.metadata,
                updated_at = now();

  -- NEUTRAL payload to the candidate: NO score, NO threshold (RNF-07a / UI-SPEC).
  RETURN jsonb_build_object('ok', true, 'registrado', true);
END;
$$;

REVOKE ALL ON FUNCTION public.pontuar_sjt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pontuar_sjt(uuid, jsonb) TO authenticated;
