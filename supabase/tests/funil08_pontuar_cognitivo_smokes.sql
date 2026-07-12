-- =============================================================================
-- Phase 26 / Plan 26-02 — FUNIL-08 pontuar_cognitivo etapa-relax behavioral smoke
-- =============================================================================
-- Proves, AFTER 20260712100002_funil08_pontuar_cognitivo_gate.sql applies, that the
-- LIVE 5-arg pontuar_cognitivo authorizes a cognitivo submit during the ASYNC hub
-- (etapa_atual='avaliacao_assincrona') AND still authorizes an INTERVIEW-stage submit
-- (no regression) — the load-bearing acceptance gate for D-Cognitive-Reachability
-- (Option A). A NOTICE 'PASS ...' per assertion = PASS; an EXCEPTION = FAIL.
--
-- ASSERTIONS (the reachability contract FUNIL-08 locks):
--   (1) submit during etapa_atual='avaliacao_assincrona'  → registrado (no 42501)  ← THE fix
--   (2) submit during etapa_atual='entrevista_online'     → still registrado       ← no regression
--   (3) exactly one scores_candidato tipo='cognitivo' row exists per candidatura
--       (verified as the privileged role — the candidate has NO read policy).
--
-- MECHANISM (self-contained disposable fixture — NO PROD candidate mutated):
--   A privileged (RLS-bypassing) setup step discovers a REAL candidato with a user_id
--   (so the impersonated auth.uid() satisfies ownership) and builds a DISPOSABLE
--   fixture around it: one disposable vaga (aplica_cognitivo=true), ONE disposable
--   cognitivo_itens row (so the CR-01 empty-bank guard does NOT fire — pontuar_cognitivo
--   scores over ALL cognitivo_itens, so a real bank, if present, is harmless; a missing
--   bank is why we seed one), and TWO disposable candidaturas — d1 at 'avaliacao_assincrona'
--   and d2 at 'entrevista_online'. Every disposable row uses a fixed 26020008-* UUID so
--   setup + cleanup are idempotent. If the fixture cannot be built (no candidato with a
--   user_id, or a live-schema NOT NULL gap), the block catches, sets smoke.ready='n', and
--   every assertion SKIPs-with-NOTICE (never false-fails). The candidate is impersonated
--   with SET ROLE authenticated + set_config('request.jwt.claims', …sub = the discovered
--   candidato.user_id…). Row verifications run as the privileged role (RESET ROLE) so RLS
--   never blinds the assertion.
--
-- CLEANUP is ROLLBACK-free: resets claims + role, then deletes the disposable fixture
-- (candidaturas cascade → cognitivo_respostas + scores_candidato; the disposable
-- cognitivo_itens row is deleted explicitly — it is GLOBAL, not candidatura-scoped).
-- The discovered candidato is REAL — it is NEVER deleted.
--
-- RUN: Supabase SQL Editor / MCP `execute_sql` AFTER the migration applies (Wave 4 / 26-07).
--      THIS FILE IS RED until then — the relaxed gate must be live for (1) to pass.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP — privileged discovery + disposable fixture (RLS bypass)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_cand uuid; v_user uuid;
BEGIN
  -- Idempotent: clear any prior run's disposable rows (children cascade).
  DELETE FROM public.candidaturas WHERE id IN
    ('26020008-0000-0000-0000-0000000000d1','26020008-0000-0000-0000-0000000000d2');
  DELETE FROM public.cognitivo_itens WHERE id = '26020008-0000-0000-0000-0000000000c1';
  DELETE FROM public.vagas WHERE id = '26020008-0000-0000-0000-0000000000b1';

  -- A REAL candidato with a user_id → so the impersonated auth.uid() satisfies ownership.
  SELECT id, user_id INTO v_cand, v_user
    FROM public.candidatos
   WHERE user_id IS NOT NULL
   LIMIT 1;
  IF v_cand IS NULL THEN
    PERFORM set_config('smoke.ready', 'n', false);
    RAISE NOTICE 'FUNIL-08 SKIP: no candidato with a user_id in this DB — cannot build the impersonation fixture';
    RETURN;
  END IF;

  -- One disposable vaga (aplica_cognitivo=true — semantic parity with Option A).
  INSERT INTO public.vagas
    (id, titulo, slug, descricao_curta, sobre_cargo, requisitos_formacao, requisitos_experiencia,
     cidade, estado, tipo_contrato, status, aplica_cognitivo, testes_aplicaveis)
  VALUES
    ('26020008-0000-0000-0000-0000000000b1', '[SMOKE 26-02] Vaga cognitivo', 'smoke-2602-cognitivo',
     'disposable smoke fixture', 'disposable', 'x', 'x', 'Sao Paulo', 'SP', 'CLT', 'ativa', true,
     '[]'::jsonb);

  -- ONE disposable cognitivo item so v_n_total > 0 (CR-01 empty-bank guard does NOT fire).
  -- gabarito_idx=0; the smoke answers it correctly so the score is deterministic (not asserted).
  INSERT INTO public.cognitivo_itens (id, secao, enunciado, alternativas, ordem, gabarito_idx)
  VALUES
    ('26020008-0000-0000-0000-0000000000c1', 'matriz', '[SMOKE] item cognitivo',
     jsonb_build_array('A', 'B', 'C', 'D'), 0, 0);

  -- Two disposable candidaturas: d1 async (THE fix), d2 interview (no-regression).
  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, status, etapa_atual,
     curriculo_url, curriculo_nome_original, curriculo_tamanho_bytes, data_candidatura, data_formulario_enviado)
  VALUES
    ('26020008-0000-0000-0000-0000000000d1', v_cand, '26020008-0000-0000-0000-0000000000b1',
     'aguardando_resposta'::public.status_candidatura, 'avaliacao_assincrona'::public.etapa_processo,
     'smoke://cv', 'smoke.pdf', 0, now(), now()),
    ('26020008-0000-0000-0000-0000000000d2', v_cand, '26020008-0000-0000-0000-0000000000b1',
     'aguardando_resposta'::public.status_candidatura, 'entrevista_online'::public.etapa_processo,
     'smoke://cv', 'smoke.pdf', 0, now(), now());

  PERFORM set_config('smoke.user',       v_user::text, false);
  PERFORM set_config('smoke.cand_async', '26020008-0000-0000-0000-0000000000d1', false);
  PERFORM set_config('smoke.cand_interv','26020008-0000-0000-0000-0000000000d2', false);
  PERFORM set_config('smoke.item',       '26020008-0000-0000-0000-0000000000c1', false);
  PERFORM set_config('smoke.ready',      'y', false);
  RAISE NOTICE 'FUNIL-08 fixture built (candidato % · async d1 + interview d2 · 1 cognitivo item)', v_cand;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke.ready', 'n', false);
  RAISE NOTICE 'FUNIL-08 SKIP: disposable fixture could not be built (%: %) — adjust to live schema in 26-07', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) ASYNC SUBMIT — the fix: a cognitivo submit during 'avaliacao_assincrona' must
--     be authorized (registrado), NOT 42501.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
DECLARE v_res jsonb;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-08 SKIP (1 async): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.user'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  BEGIN
    v_res := public.pontuar_cognitivo(
      current_setting('smoke.cand_async')::uuid,
      jsonb_build_object(current_setting('smoke.item'), 0));
    IF (v_res->>'registrado')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'FUNIL-08 FAIL (1 async): submit returned non-registrado payload: %', v_res;
    END IF;
    RAISE NOTICE 'PASS (1 async submit): cognitivo submit during avaliacao_assincrona registrado';
  EXCEPTION WHEN sqlstate '42501' THEN
    RAISE EXCEPTION 'FUNIL-08 FAIL (1 async): submit during avaliacao_assincrona was 42501 — the gate was NOT relaxed';
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (2) INTERVIEW SUBMIT — no regression: a cognitivo submit during 'entrevista_online'
--     must STILL be authorized (registrado).
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
DECLARE v_res jsonb;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-08 SKIP (2 interview): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.user'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  BEGIN
    v_res := public.pontuar_cognitivo(
      current_setting('smoke.cand_interv')::uuid,
      jsonb_build_object(current_setting('smoke.item'), 0));
    IF (v_res->>'registrado')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'FUNIL-08 FAIL (2 interview): submit returned non-registrado payload: %', v_res;
    END IF;
    RAISE NOTICE 'PASS (2 interview submit): cognitivo submit during entrevista_online still registrado (no regression)';
  EXCEPTION WHEN sqlstate '42501' THEN
    RAISE EXCEPTION 'FUNIL-08 FAIL (2 interview): interview-stage submit regressed to 42501 — the interview stages were dropped';
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) ROWS — exactly one scores_candidato tipo='cognitivo' row per candidatura
--     (verified as the privileged role — the candidate has NO read policy).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE n_async int; n_interv int;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-08 SKIP (3 rows): fixture not built'; RETURN; END IF;
  SELECT count(*) INTO n_async  FROM public.scores_candidato
   WHERE candidatura_id = current_setting('smoke.cand_async')::uuid  AND tipo = 'cognitivo';
  SELECT count(*) INTO n_interv FROM public.scores_candidato
   WHERE candidatura_id = current_setting('smoke.cand_interv')::uuid AND tipo = 'cognitivo';
  IF n_async <> 1 OR n_interv <> 1 THEN
    RAISE EXCEPTION 'FUNIL-08 FAIL (3 rows): expected 1 cognitivo row each, got async=% interview=%', n_async, n_interv;
  END IF;
  RAISE NOTICE 'PASS (3 rows): one scores_candidato cognitivo row per candidatura (async + interview)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — ROLLBACK-free: reset the simulated context + drop the disposable fixture.
--   (candidaturas cascade → cognitivo_respostas + scores_candidato; the disposable
--    cognitivo_itens row is GLOBAL → deleted explicitly.) The candidato is REAL and
--    is NEVER deleted.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
DELETE FROM public.candidaturas WHERE id IN
  ('26020008-0000-0000-0000-0000000000d1', '26020008-0000-0000-0000-0000000000d2');
DELETE FROM public.cognitivo_itens WHERE id = '26020008-0000-0000-0000-0000000000c1';
DELETE FROM public.vagas WHERE id = '26020008-0000-0000-0000-0000000000b1';
-- Clear the disposable session GUCs.
SELECT set_config('smoke.ready', '', false);
