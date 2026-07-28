-- =============================================================================
-- Migration: Phase 14 code-review gap closure (CR-01, CR-02, CR-03, WR-04)
-- Date: 2026-06-25
-- Phase: 14 (entrevistas-com-ia-companion-etapas-4-5)
-- Requirement: ENTREV-03 / ENTREV-04 / ENTREV-05 (14-REVIEW.md blockers + WR-04)
-- =============================================================================
--
-- PURPOSE
-- Closes the Phase-14 code-review DB findings in ONE idempotent migration:
--
--   * CR-01 — pontuar_cognitivo refuses to persist a misleading na_media row when
--     the item bank is empty (v_n_total = 0 → RAISE no_data_found). The CC0 content
--     seed stays deferred (cc0-cognitive-item-bank-sourcing.md). Better an explicit
--     "prova não configurada" error than a fabricated Banda-3-for-everyone score.
--
--   * CR-02 — pontuar_cognitivo now ALSO persists the candidate's raw picks +
--     proctoring context to cognitivo_respostas (the table previously had zero
--     writers — dead table + dead back-lock RLS). The DEFINER RPC already verifies
--     ownership + interview etapa before this point, so the privileged INSERT is
--     safe; it stays RAW-PICKS-ONLY (NEVER a score/band/gabarito in cognitivo_respostas).
--     The function signature gains p_shuffle_seed / p_completion_time_seconds /
--     p_proctoring (the 14-01 SubmitCognitivoBodySchema already carries shuffle_seed +
--     client_timings; the client now passes them — 14-07 Task 2).
--
--   * CR-03 — new confirmar_revisao_entrevista(p_analise_id uuid) SECURITY DEFINER
--     RPC. The "Confirmar revisão humana" release path was a direct client UPDATE on
--     entrevista_analises, which has ONLY a SELECT policy → the UPDATE was RLS-filtered
--     to a silent 0-row no-op (flagged candidates were permanently un-advanceable).
--     This RPC mirrors salvar_avaliacao_entrevista's role + vaga-ownership guard,
--     sets revisao_confirmada_em, and RETURNS the updated row so the client asserts
--     the marker landed. NEVER writes candidaturas / advances the funil (RNF-07a).
--
--   * WR-04 — vaga-ownership scoping on the RH SELECT policies. The reads on
--     entrevista_analises / entrevista_guias / scores_candidato were role-only
--     (rh|administrador) and NOT scoped to the RH's own vagas — a recrutador could
--     read any candidate's interview transcript analysis / BARS scores / cognitive
--     band / guide by candidatura id (horizontal-access gap; the writes already
--     enforce ownership). We DROP the broad role-only SELECT and CREATE an
--     ownership-scoped one (role='rh' → must own the candidatura's vaga via
--     candidaturas → vagas.created_by = auth.uid(); administrador bypasses).
--     Candidate-DENY stays intact (no candidato/anon policy anywhere).
--
-- INVARIANT (RNF-07a): no path here writes candidaturas, advances the funil, or
-- auto-rejects. The cognitive band remains CONTEXTUAL; the language/accent flag only
-- SEGURA the advance; the human always decides.
--
-- AUTHZ idiom (Phase-6 proof): auth.uid() / auth.jwt() read the request.jwt GUC and
-- survive SECURITY DEFINER. SET search_path = '' on the DEFINER functions.
--
-- IDEMPOTENCY: CREATE OR REPLACE FUNCTION (CR-03) / DROP FUNCTION + CREATE (CR-01/02,
-- signature change) / DROP POLICY IF EXISTS before CREATE POLICY (WR-04). Re-runnable.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). These
-- are PL/pgSQL $$ bodies + adjacent REVOKE/GRANT → the canonical 42601-risk shape.
-- AUTHORED-NOT-APPLIED: the orchestrator applies this LIVE via Supabase MCP
-- apply_migration (+ redeploys avaliar-transcricao-entrevista) AFTER the executor
-- returns, with the user's authorization. NOT applied here.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- CR-01 + CR-02: pontuar_cognitivo — empty-bank guard + cognitivo_respostas persist
-- ─────────────────────────────────────────────────────────────────────────────
-- Signature change (adds shuffle_seed / completion_time / proctoring) → DROP the old
-- 2-arg overload first so we do not leave a stale signature behind. The client calls
-- with named params, so the new 5-arg signature is the only live one.
DROP FUNCTION IF EXISTS public.pontuar_cognitivo(uuid, jsonb);

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
  'Phase 14 / ENTREV-05 (14-07 gap closure CR-01/CR-02): pontua o raciocinio (CTT soma 0/1 + banda 5 faixas) server-side a partir de cognitivo_itens.gabarito_idx E persiste as escolhas brutas + proctoring em cognitivo_respostas (raw-picks-only, NUNCA score/gabarito). CR-01: RAISE no_data_found quando v_n_total=0 (recusa gravar na_media falso com banco vazio). SECURITY DEFINER; guard: candidato dono (candidatos.user_id=auth.uid()) + etapa de entrevista, senao 42501. NUNCA escreve candidaturas, NUNCA auto-rejeita. Payload NEUTRO. GRANT authenticated (REVOKE PUBLIC).';

-- ─────────────────────────────────────────────────────────────────────────────
-- CR-03: confirmar_revisao_entrevista — the human-confirm release RPC (RH-only)
-- ─────────────────────────────────────────────────────────────────────────────
-- Mirrors salvar_avaliacao_entrevista's auth idiom. Sets revisao_confirmada_em on the
-- analysis row (releases the avancar_etapa flag guard, migration 04) and RETURNS the
-- updated row so the client can assert the marker landed (no silent 0-row success).
-- NEVER writes candidaturas / advances the funil (RNF-07a).
CREATE OR REPLACE FUNCTION public.confirmar_revisao_entrevista(
  p_analise_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_confirmada timestamptz;
BEGIN
  -- (1) Resolve the analysis row + its vaga owner: entrevista_analises → candidaturas
  --     → vagas. A missing row → no_data_found (the client maps to NOT_FOUND).
  SELECT v.created_by
    INTO v_vaga_owner
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.id = p_analise_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'analise de entrevista nao encontrada (%)', p_analise_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (2) Role + own-vaga guard. candidato/anon → forbidden. rh → must own the vaga.
  --     administrador → bypass ownership. (salvar_avaliacao_entrevista idiom.)
  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (3) Confirm the human review — set revisao_confirmada_em + revisada_por. This
  --     RELEASES the avancar_etapa flag guard (migration 04) but NEVER advances the
  --     candidate (RNF-07a). Confirming review and advancing are separate human actions.
  UPDATE public.entrevista_analises
     SET revisao_confirmada_em = now(),
         revisada_por          = (select auth.uid())
   WHERE id = p_analise_id
  RETURNING revisao_confirmada_em INTO v_confirmada;

  -- RETURN the updated row so the client asserts the marker landed (WR-07).
  RETURN jsonb_build_object(
    'ok', true,
    'id', p_analise_id,
    'revisao_confirmada_em', v_confirmada
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_revisao_entrevista(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_revisao_entrevista(uuid) TO authenticated;

COMMENT ON FUNCTION public.confirmar_revisao_entrevista(uuid) IS
  'Phase 14 / ENTREV-03 (14-07 gap closure CR-03): confirma a revisao humana de uma analise de transcricao (seta revisao_confirmada_em + revisada_por, libera o guard avancar_etapa migration 04). Substitui o UPDATE direto do client (que era filtrado pela RLS SELECT-only → no-op silencioso). SECURITY DEFINER + search_path=''''. Guard: role IN (rh,administrador); rh deve possuir a vaga (vagas.created_by=auth.uid()); administrador bypassa. RETORNA a row atualizada (readback). NUNCA escreve candidaturas, NUNCA avanca o funil (RNF-07a). GRANT EXECUTE TO authenticated (REVOKE FROM PUBLIC).';

-- ─────────────────────────────────────────────────────────────────────────────
-- WR-04: vaga-ownership-scoped RH SELECT policies (horizontal-access close)
-- ─────────────────────────────────────────────────────────────────────────────
-- The RH read path was role-only; scope it to the RH's own vagas (administrador
-- bypasses). Join: <row>.candidatura_id → candidaturas.vaga_id → vagas.created_by.
-- Candidate-DENY stays intact (no candidato/anon policy added anywhere).

-- entrevista_guias ------------------------------------------------------------
DROP POLICY IF EXISTS rh_le_entrevista_guias ON public.entrevista_guias;
CREATE POLICY rh_le_entrevista_guias ON public.entrevista_guias
  FOR SELECT
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR (
      (select auth.jwt() #>> '{app_metadata,role}') = 'rh'
      AND candidatura_id IN (
        SELECT c.id FROM public.candidaturas c
          JOIN public.vagas v ON v.id = c.vaga_id
         WHERE v.created_by = (select auth.uid())
      )
    )
  );

-- entrevista_analises ---------------------------------------------------------
DROP POLICY IF EXISTS rh_le_entrevista_analises ON public.entrevista_analises;
CREATE POLICY rh_le_entrevista_analises ON public.entrevista_analises
  FOR SELECT
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR (
      (select auth.jwt() #>> '{app_metadata,role}') = 'rh'
      AND candidatura_id IN (
        SELECT c.id FROM public.candidaturas c
          JOIN public.vagas v ON v.id = c.vaga_id
         WHERE v.created_by = (select auth.uid())
      )
    )
  );

-- scores_candidato (covers interview + cognitive reads — and every other tipo) -
-- Table-wide policy: a recrutador only reads scores for candidaturas on their own
-- vagas (consistent with the write RPCs). administrador sees all. Candidate-DENY
-- preserved (no candidato/anon SELECT policy exists).
DROP POLICY IF EXISTS rh_le_scores ON public.scores_candidato;
CREATE POLICY rh_le_scores ON public.scores_candidato
  FOR SELECT
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR (
      (select auth.jwt() #>> '{app_metadata,role}') = 'rh'
      AND candidatura_id IN (
        SELECT c.id FROM public.candidaturas c
          JOIN public.vagas v ON v.id = c.vaga_id
         WHERE v.created_by = (select auth.uid())
      )
    )
  );
