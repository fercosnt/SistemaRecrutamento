-- =============================================================================
-- Migration: pontuar_cognitivo — relax the etapa gate to reach the async hub
-- Date: 2026-07-12
-- Phase: 26 (Correção do Funil — lado candidato / alcançabilidade & scoring)
-- Requirement: FUNIL-08 (A18) — cognitive assessment reachable (Option A: async hub)
-- =============================================================================
--
-- WHY THIS CHANGE
-- The cognitivo screen is unreachable (A18): the card is rendered inside the async
-- hub (AvaliacaoContainer) during etapa_atual='avaliacao_assincrona', but the LIVE
-- 5-arg pontuar_cognitivo (20260625000001:99) only authorizes submits during the two
-- INTERVIEW stages — so a candidate reaching the screen in the async stage 42501s on
-- submit. Per D-Cognitive-Reachability (Option A, 26-CONTEXT), the fix is to ADD
-- 'avaliacao_assincrona' to the etapa IN list — treating cognitivo as an async
-- assessment (same mental model as SJT) — WITHOUT dropping the interview stages, so
-- an interview-stage cognitivo submit does NOT regress (Pitfall 5). The client half
-- (card gate on vaga.aplica_cognitivo + real /candidato/prova-cognitiva/:id route) is
-- plan 26-05/26-06; the DB back-stop is here.
--
-- WHAT IS PRESERVED (byte-for-byte vs 20260625000001:68-199)
-- This is a CREATE OR REPLACE of the SAME 5-arg overload
-- (uuid, jsonb, text, int, jsonb) — the ONLY overload live (the old 2-arg was DROPed
-- at 20260625000001:66; it is NOT re-touched here). Every other block is copied
-- unchanged:
--   * CR-01 empty-bank guard — v_n_total = 0 → RAISE no_data_found 'prova cognitiva
--     sem itens configurados' BEFORE any INSERT (refuses a fabricated na_media score).
--   * CR-02 cognitivo_respostas raw-picks persistence (the table's only writer;
--     RAW-PICKS-ONLY, never a score/band/gabarito).
--   * CTT soma 0/1 per item from cognitivo_itens.gabarito_idx + the 5-band scoring
--     (identical cutoffs to scoring.ts bandaFromTotal — TS/SQL no-drift).
--   * the neutral scores_candidato insert (tipo='cognitivo', informational status) +
--     the NEUTRAL {ok,registrado} return, and the REVOKE PUBLIC / GRANT authenticated
--     tail.
-- The SINGLE delta is the etapa IN list. SECURITY DEFINER SET search_path='' unchanged.
--
-- INVARIANT (RNF-07a): unchanged — cognitivo NEVER drives etapa; this function writes
-- ONLY cognitivo_respostas + scores_candidato, NEVER candidaturas, NEVER auto-rejects.
--
-- APPLY MECHANIC (D-22 / CLAUDE.md §Migrations): apply via Supabase MCP
-- `apply_migration` (bypasses the 42601 "cannot insert multiple commands into a
-- prepared statement" error that `db push --linked` throws on $$ bodies + adjacent
-- REVOKE/GRANT/COMMENT). Do NOT run `db push` for this file. NO `BEGIN;/COMMIT;`
-- wrapper — the CLI driver wraps each migration in its own implicit transaction; an
-- outer one is the 42601 trigger. Applied live in the Wave 4 BLOCKING plan (26-07);
-- the behavioral smoke (funil08_pontuar_cognitivo_smokes.sql) is the load-bearing
-- acceptance gate, run AFTER this applies. Do NOT edit database.types.ts (Phase 27).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.pontuar_cognitivo(
  p_candidatura_id          uuid,
  p_respostas               jsonb,             -- { "itemId": optionIndex, ... }  (raw picks only)
  p_shuffle_seed            text  DEFAULT NULL, -- advisory anti-cheat context (NOT a score)
  p_completion_time_seconds int   DEFAULT NULL, -- soft-timer elapsed (advisory)
  p_proctoring              jsonb DEFAULT '{}'::jsonb  -- tab-blur/paste context (NEVER auto-rejects)
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
  -- AUTHORIZE (C1): caller owns candidatura AND is in a submit-eligible etapa.
  -- auth.uid() reads the request.jwt GUC → survives SECURITY DEFINER (Phase-6 proof).
  -- Ownership via candidatos.user_id=auth.uid() (NEVER candidato_id===user.id).
  -- FUNIL-08 (A18): 'avaliacao_assincrona' ADDED to the interview stages — the
  -- cognitivo card lives in the async hub (Option A); the interview stages are KEPT
  -- so interview-stage cognitivo submits do not regress (Pitfall 5).
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()
       AND c.etapa_atual IN ('entrevista_online', 'entrevista_presencial', 'avaliacao_assincrona')
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- CTT soma 0/1 per item, server-side from cognitivo_itens.gabarito_idx (the DEFINER
  -- RPC bypasses RLS to read the answer key). A client pick equal to gabarito_idx → 1;
  -- a missing/wrong pick → 0. Per-section subtotals (matriz / letra_numero). The
  -- gabarito (cognitivo_itens) is the source of truth for the item set — any extra key
  -- in p_respostas (e.g. a forged score) is structurally ignored (anti-tamper).
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

  -- CR-01: REFUSE to persist a misleading na_media row when the item bank is empty.
  -- An empty cognitivo_itens (CC0 seed still deferred) would otherwise score over
  -- COUNT(*)=0 → score=0/score_max=0 + band defaulting to na_media for EVERY
  -- candidate (worse than an explicit "not configured" state). Raise instead — the
  -- client surfaces "prova não configurada". This MUST come BEFORE any INSERT.
  IF v_n_total = 0 THEN
    RAISE EXCEPTION 'prova cognitiva sem itens configurados' USING ERRCODE = 'no_data_found';
  END IF;

  v_total := v_matriz_raw + v_ln_raw;

  -- Banding — IDENTICAL cutoffs to scoring.ts bandaFromTotal (TS/SQL no-drift).
  -- (v_n_total > 0 is guaranteed here by the CR-01 guard above.)
  v_pct := v_total::numeric / v_n_total;
  v_banda := CASE
    WHEN v_pct <= 0.2 THEN 'bem_abaixo'
    WHEN v_pct <= 0.4 THEN 'abaixo'
    WHEN v_pct <= 0.6 THEN 'na_media'
    WHEN v_pct <= 0.8 THEN 'acima'
    ELSE 'bem_acima'
  END;

  -- CR-02: persist the candidate's RAW PICKS + proctoring context to
  -- cognitivo_respostas (this is the table's ONLY writer — closes the dead-table gap).
  -- RAW-PICKS-ONLY: NO score / band / gabarito ever lands here (the score lives in
  -- scores_candidato). The DEFINER RPC already verified ownership + etapa above, so
  -- this INSERT is safe; the UNIQUE(candidatura_id) makes re-submit an idempotent
  -- upsert. The back-lock RLS protects the candidate's own client writes; this
  -- privileged write is the server's authoritative record of what they answered.
  INSERT INTO public.cognitivo_respostas
    (candidatura_id, raw_responses, shuffle_seed, completion_time_seconds, proctoring)
  VALUES
    (p_candidatura_id, p_respostas, p_shuffle_seed, p_completion_time_seconds,
     COALESCE(p_proctoring, '{}'::jsonb))
  ON CONFLICT (candidatura_id)
  DO UPDATE SET raw_responses           = EXCLUDED.raw_responses,
                shuffle_seed            = EXCLUDED.shuffle_seed,
                completion_time_seconds = EXCLUDED.completion_time_seconds,
                proctoring              = EXCLUDED.proctoring;

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

REVOKE ALL ON FUNCTION
  public.pontuar_cognitivo(uuid, jsonb, text, int, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  public.pontuar_cognitivo(uuid, jsonb, text, int, jsonb) TO authenticated;

COMMENT ON FUNCTION public.pontuar_cognitivo(uuid, jsonb, text, int, jsonb) IS
  'Phase 26 / FUNIL-08 (26-02): pontua o raciocinio (CTT soma 0/1 + banda 5 faixas) server-side a partir de cognitivo_itens.gabarito_idx E persiste as escolhas brutas + proctoring em cognitivo_respostas (raw-picks-only, NUNCA score/gabarito). CR-01: RAISE no_data_found quando v_n_total=0 (recusa gravar na_media falso com banco vazio). SECURITY DEFINER; guard: candidato dono (candidatos.user_id=auth.uid()) + etapa IN (entrevista_online, entrevista_presencial, avaliacao_assincrona) — FUNIL-08 ADICIONOU avaliacao_assincrona (Option A: card no hub assincrono) mantendo as etapas de entrevista (sem regressao), senao 42501. NUNCA escreve candidaturas, NUNCA auto-rejeita. Payload NEUTRO. GRANT authenticated (REVOKE PUBLIC).';
