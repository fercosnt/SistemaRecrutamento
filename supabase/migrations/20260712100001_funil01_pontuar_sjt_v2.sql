-- =============================================================================
-- Migration: pontuar_sjt() v2 — non-manipulable SJT multiple-choice scoring RPC
-- Date: 2026-07-12
-- Phase: 26 (Correção do Funil — lado candidato / alcançabilidade & scoring)
-- Requirements: FUNIL-01 (A8) + FUNIL-07 server teeth (A17)
-- =============================================================================
--
-- WHY THIS REWRITE
-- The Phase-11 pontuar_sjt (20260611000004) had four holes that let a candidate
-- manipulate the SJT %:
--   (1) FUNIL-01 — no DISTINCT on the submitted picks → duplicate answers could
--       inflate the numerator > 100%.
--   (2) FUNIL-01 — the denominator (maxes CTE) was restricted to the ANSWERED
--       questions (its WHERE matched only the marked picks), so a subset submit
--       scored subset/subset (artificially high). v2 spans the FULL battery instead.
--   (3) FUNIL-01 / A41 — ON CONFLICT DO UPDATE let a second submit silently
--       overwrite a recorded score without a trail.
--   (4) FUNIL-07 — no server-side battery-membership check → a crafted call could
--       submit a foreign (other-cargo) pergunta_id; the client filter is bypassable.
--
-- This v2 closes all four via server-authoritative guards (D-SJT-Integrity):
--   (A) AUTHZ (unchanged posture) — owner via candidatos.user_id = auth.uid()
--       (NEVER candidato_id) AND etapa_atual = 'avaliacao_assincrona' else 42501.
--   (B) RE-SUBMIT LOCK — a non-'falhou' MC row already exists → RAISE 42501
--       (closes A41; keys the EXACT MC tuple tipo='sjt',subtipo='mc',pergunta_id=NULL).
--   (C) BATTERY — resolve from vagas.testes_aplicaveis SJT element (itens_ids when
--       present, else cargo), scoped to formato='mc' AND status='active' ONLY so the
--       caso_aberto item (scored by the avaliar-redacao EF) is excluded (Pitfall 2).
--   (C2) EMPTY BATTERY (Open Q2 resolved) — v_expected = 0 → RAISE 22023 'bateria SJT
--        nao configurada' BEFORE completeness, so an empty/unconfigured battery fails
--        loudly instead of short-circuiting to 'sucesso' at v_max = 0 (a real hole:
--        an empty p_respostas submit would otherwise pass completeness 0<>0=false).
--   (D) DEDUP — count(*) <> count(DISTINCT pergunta_id) → RAISE 22023.
--   (E) BATTERY MEMBERSHIP (FUNIL-07 server) — any submitted pergunta_id ∉ battery
--       → RAISE 42501. The client filter is presentation only; THIS is the teeth.
--   (F) COMPLETENESS — answered DISTINCT <> v_expected → RAISE 22023.
--   (H) numerator = Σ peso over marked picks; DENOMINATOR = Σ MAX(peso) over the FULL
--       active-MC battery (ANY(v_battery)), replacing the answered-only bug.
--   (I) INSERT exactly one scores_candidato MC row (metadata carries expected /
--       answered / versao:2 for audit) and RETURN a NEUTRAL {ok,registrado}.
--
-- INVARIANT (RNF-07a): this function writes ONLY scores_candidato — it NEVER touches
-- candidaturas.status / etapa_atual and NEVER auto-rejects. No score/threshold/gabarito
-- ever crosses the wire; the candidate posts picks and gets a neutral acknowledgement.
--
-- APPLY MECHANIC (D-22 / CLAUDE.md §Migrations): apply via Supabase MCP
-- `apply_migration` (bypasses the 42601 "cannot insert multiple commands into a
-- prepared statement" error that `db push --linked` throws on $$ bodies + adjacent
-- REVOKE/GRANT). Do NOT run `db push` for this file. NO `BEGIN;/COMMIT;` wrapper —
-- the CLI driver wraps each migration in its own implicit transaction; an outer one
-- is the 42601 trigger. `SET search_path = ''` on the function. Applied live in the
-- Wave 4 BLOCKING plan (26-07); the behavioral smoke (funil01_pontuar_sjt_smokes.sql)
-- is the load-bearing acceptance gate, run AFTER this applies. Do NOT edit
-- database.types.ts (regen is Phase 27).
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
  v_vaga        uuid;
  v_cargo       text;
  v_itens_ids   uuid[];
  v_battery     uuid[];
  v_expected    int;
  v_answered    int;
  v_score       int := 0;
  v_max         int := 0;
  v_has_atencao boolean := false;
  v_status      public.status_score;
  v_breakdown   jsonb;
  v_mc_min_pct  numeric := 60;        -- default percentage (0-100)
BEGIN
  -- (A) AUTHORIZE — caller owns the candidatura AND it is in avaliacao_assincrona.
  -- auth.uid() reads the request.jwt GUC → survives SECURITY DEFINER (Phase-6 proof).
  -- Ownership is via candidatos.user_id (NEVER candidato_id).
  SELECT c.vaga_id
    INTO v_vaga
    FROM public.candidaturas c
    JOIN public.candidatos ca ON ca.id = c.candidato_id
   WHERE c.id = p_candidatura_id
     AND ca.user_id = auth.uid()
     AND c.etapa_atual = 'avaliacao_assincrona';
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- (B) RE-SUBMIT LOCK (FUNIL-01 / A41) — refuse if a non-'falhou' MC row already
  -- exists. Predicate matches the EXACT MC row tuple (Pitfall 3): a prior 'falhou'
  -- row (scoring errored) is the ONLY case that passes the lock AND can conflict on
  -- INSERT below → it is re-scored via the guarded ON CONFLICT, never overwriting a
  -- valid score (no A41 trail hole).
  IF EXISTS (
    SELECT 1 FROM public.scores_candidato
     WHERE candidatura_id = p_candidatura_id
       AND tipo = 'sjt' AND subtipo = 'mc' AND pergunta_id IS NULL
       AND status <> 'falhou'
  ) THEN
    RAISE EXCEPTION 'avaliacao ja registrada' USING errcode = '42501';
  END IF;

  -- (C) Resolve the vaga SJT battery — itens_ids-when-present-else-cargo, restricted
  -- to formato='mc' AND status='active' so the caso_aberto item is EXCLUDED (Pitfall 2;
  -- the open case is a separate subtipo='caso_aberto' score written by avaliar-redacao).
  SELECT elem->>'cargo',
         ARRAY(SELECT jsonb_array_elements_text(elem->'itens_ids'))::uuid[]
    INTO v_cargo, v_itens_ids
    FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) elem
   WHERE v.id = v_vaga AND elem->>'tipo' = 'sjt'
   LIMIT 1;

  SELECT array_agg(p.id)
    INTO v_battery
    FROM public.perguntas p
   WHERE p.status = 'active' AND p.formato = 'mc'
     AND ( (v_itens_ids IS NOT NULL AND array_length(v_itens_ids, 1) > 0 AND p.id = ANY(v_itens_ids))
           OR ((v_itens_ids IS NULL OR array_length(v_itens_ids, 1) IS NULL) AND p.cargo = v_cargo) );
  v_expected := COALESCE(array_length(v_battery, 1), 0);

  -- (C2) EMPTY BATTERY (Open Q2 — RESOLVED) — an unconfigured/empty battery must fail
  -- LOUDLY, never short-circuit to a 0/0 'sucesso'. This RAISE MUST precede the
  -- completeness check (F): an empty p_respostas submit passes completeness (0<>0=false)
  -- and would otherwise score 0/0 'sucesso' — a real manipulability hole.
  IF v_expected = 0 THEN
    RAISE EXCEPTION 'bateria SJT nao configurada' USING errcode = '22023';
  END IF;

  -- (D) DEDUP (FUNIL-01) — one answer per pergunta; a repeated pergunta_id is tampering.
  IF (SELECT count(*) FROM jsonb_array_elements(p_respostas))
     <> (SELECT count(DISTINCT r->>'pergunta_id') FROM jsonb_array_elements(p_respostas) r) THEN
    RAISE EXCEPTION 'resposta duplicada' USING errcode = '22023';
  END IF;

  -- (E) BATTERY MEMBERSHIP (FUNIL-07 server teeth) — every submitted pergunta ∈ battery.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_respostas) r
     WHERE (r->>'pergunta_id')::uuid <> ALL(v_battery)
  ) THEN
    RAISE EXCEPTION 'pergunta fora da bateria' USING errcode = '42501';
  END IF;

  -- (F) COMPLETENESS — answered DISTINCT == expected battery size (no subset gaming).
  SELECT count(DISTINCT r->>'pergunta_id')
    INTO v_answered
    FROM jsonb_array_elements(p_respostas) r;
  IF v_answered <> v_expected THEN
    RAISE EXCEPTION 'bateria incompleta (% de %)', v_answered, v_expected USING errcode = '22023';
  END IF;

  -- (G) Per-vaga mc_min_pct (percentage 0-100) from the SJT element threshold; default 60.
  SELECT COALESCE(
           (SELECT (elem->'threshold'->>'mc_min_pct')::numeric
              FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) elem
             WHERE v.id = v_vaga
               AND elem->>'tipo' = 'sjt'
               AND (elem->'threshold'->>'mc_min_pct') IS NOT NULL
             LIMIT 1),
           60
         )
    INTO v_mc_min_pct;

  -- (H) Numerator over marked picks; DENOMINATOR over the FULL active-MC battery
  -- (ANY(v_battery)) — this is the FUNIL-01 fix that replaces the answered-only bug.
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
     WHERE pergunta_id = ANY(v_battery)          -- ← full battery, NOT only answered
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

  -- (H2) GABARITO-LESS BATTERY (code-review WR-01) — the battery has active MC perguntas
  -- but none carry a perguntas_opcao_sjt gabarito → v_max = 0. This is the SAME "silent 0/0
  -- sucesso" hole as (C2), for a different config state: the status CASE below short-circuits
  -- to 'sucesso' when v_max = 0. Fail LOUDLY instead of scoring a fabricated 0/0.
  IF v_max = 0 THEN
    RAISE EXCEPTION 'bateria SJT nao configurada' USING errcode = '22023';
  END IF;

  -- Threshold (RNF-07a): <mc_min_pct OR ≥1 atencao → pendente_humano. NEVER
  -- auto-reject / no etapa change. mc_min_pct is a percentage (0-100).
  v_status := CASE
    WHEN v_has_atencao OR (v_max > 0 AND (v_score::numeric / v_max) * 100 < v_mc_min_pct)
    THEN 'pendente_humano'::public.status_score
    ELSE 'sucesso'::public.status_score
  END;

  -- (I) Persist exactly ONE MC row. With the hard lock (B), a valid second submit
  -- never reaches here; ON CONFLICT DO UPDATE fires ONLY on a prior 'falhou' row
  -- (a scoring-error retry), never on a valid recorded score → no A41 overwrite hole.
  INSERT INTO public.scores_candidato
    (candidatura_id, tipo, subtipo, score, score_max, status, metadata)
  VALUES
    (p_candidatura_id, 'sjt', 'mc', v_score, v_max, v_status,
     jsonb_build_object('respostas', v_breakdown,
                        'has_atencao', v_has_atencao,
                        'mc_min_pct', v_mc_min_pct,
                        'expected', v_expected,
                        'answered', v_answered,
                        'versao', 2))
  ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id)
  DO UPDATE SET score = EXCLUDED.score, score_max = EXCLUDED.score_max,
                status = EXCLUDED.status, metadata = EXCLUDED.metadata,
                updated_at = now()
  WHERE public.scores_candidato.status = 'falhou';   -- only re-score a failed row

  -- NEUTRAL payload to the candidate: NO score, NO threshold (RNF-07a / UI-SPEC).
  RETURN jsonb_build_object('ok', true, 'registrado', true);
END;
$$;

REVOKE ALL ON FUNCTION public.pontuar_sjt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pontuar_sjt(uuid, jsonb) TO authenticated;
