-- =============================================================================
-- Phase 26 / Plan 26-01 — FUNIL-01 + FUNIL-07 (server) behavioral smoke
-- =============================================================================
-- Proves, AFTER 20260712100001_funil01_pontuar_sjt_v2.sql applies, that pontuar_sjt
-- is NON-MANIPULABLE over an impersonated candidate JWT — the load-bearing acceptance
-- gate (structural greps pass while behavior breaks; Phase 24/25 proved smokes catch
-- what greps miss). A NOTICE 'PASS ...' per assertion = PASS; an EXCEPTION = FAIL.
--
-- ASSERTIONS (the 7 behaviors D-SJT-Integrity locks):
--   (1) duplicate pergunta_id in p_respostas            → EXCEPTION 22023 (dedup)
--   (2) complete honest submit of the full battery      → accepted AND the recorded
--       score_max == Σ MAX(peso) over the FULL battery  (denominator fix, NOT subset)
--   (3) a subset submit (fewer than the battery)        → EXCEPTION 22023 'bateria incompleta'
--   (4) a valid-but-FOREIGN pergunta_id (other battery) → EXCEPTION 42501 (FUNIL-07 server teeth)
--   (5) a SECOND complete submit                        → EXCEPTION 42501 (re-submit lock)
--       AND exactly ONE scores_candidato MC row exists  (no A41 overwrite)
--   (6) RNF-07a — candidaturas.status/etapa_atual are byte-identical before/after scoring
--   (7) EMPTY BATTERY (Open Q2) — an unconfigured battery submit → EXCEPTION 22023
--       'bateria SJT nao configurada' (never a silent 0/0 'sucesso')
--
-- MECHANISM (self-contained disposable fixture — NO PROD candidate mutated):
--   A privileged (RLS-bypassing) setup step discovers a REAL candidato with a user_id
--   (needed so auth.uid() matches ownership) and builds a DISPOSABLE fixture around it:
--   two disposable vagas (one with a 2-item MC SJT battery via testes_aplicaveis.itens_ids,
--   one with NO SJT element), three disposable perguntas (2 in the battery + 1 foreign),
--   and two disposable candidaturas at etapa_atual='avaliacao_assincrona'. Every disposable
--   row uses a fixed 26010001-* UUID so setup + cleanup are idempotent. If the fixture cannot
--   be built (e.g. no candidato with a user_id, or a live-schema NOT NULL gap), the block
--   catches, sets smoke.ready='n', and every assertion SKIPs-with-NOTICE (never false-fails).
--   The candidate is impersonated with SET ROLE authenticated + set_config('request.jwt.claims',
--   …sub = the discovered candidato.user_id…). Mutations run as authenticated; row-value
--   verifications run as the privileged role (RESET ROLE) so RLS never blinds the assertion.
--
-- CLEANUP is ROLLBACK-free: resets claims + role, then deletes the disposable fixture
-- (candidaturas cascade to scores_candidato; perguntas cascade to perguntas_opcao_sjt).
-- The discovered candidato is REAL — it is NEVER deleted.
--
-- RUN: Supabase SQL Editor / MCP `execute_sql` AFTER the migration applies (Wave 4 / 26-07).
--      THIS FILE IS RED until then — pontuar_sjt v2 must be live for the guards to fire.
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
    ('26010001-0000-0000-0000-0000000000d1','26010001-0000-0000-0000-0000000000d2');
  DELETE FROM public.perguntas WHERE id IN
    ('26010001-0000-0000-0000-0000000000f1','26010001-0000-0000-0000-0000000000f2','26010001-0000-0000-0000-0000000000f3');
  DELETE FROM public.vagas WHERE id IN
    ('26010001-0000-0000-0000-0000000000b1','26010001-0000-0000-0000-0000000000b2');

  -- A REAL candidato with a user_id → so the impersonated auth.uid() satisfies ownership.
  SELECT id, user_id INTO v_cand, v_user
    FROM public.candidatos
   WHERE user_id IS NOT NULL
   LIMIT 1;
  IF v_cand IS NULL THEN
    PERFORM set_config('smoke.ready', 'n', false);
    RAISE NOTICE 'FUNIL-01 SKIP: no candidato with a user_id in this DB — cannot build the impersonation fixture';
    RETURN;
  END IF;

  -- Two disposable vagas: b1 carries a 2-item MC SJT battery (itens_ids); b2 has NO SJT element.
  INSERT INTO public.vagas
    (id, titulo, slug, descricao_curta, sobre_cargo, requisitos_formacao, requisitos_experiencia,
     cidade, estado, tipo_contrato, status, testes_aplicaveis)
  VALUES
    ('26010001-0000-0000-0000-0000000000b1', '[SMOKE 26-01] Vaga bateria SJT', 'smoke-2601-battery',
     'disposable smoke fixture', 'disposable', 'x', 'x', 'Sao Paulo', 'SP', 'CLT', 'ativa',
     jsonb_build_array(jsonb_build_object(
       'tipo', 'sjt', 'cargo', 'smoke-2601', 'bateria_size', 2,
       'itens_ids', jsonb_build_array('26010001-0000-0000-0000-0000000000f1', '26010001-0000-0000-0000-0000000000f2'),
       'threshold', jsonb_build_object('mc_min_pct', 60)))),
    ('26010001-0000-0000-0000-0000000000b2', '[SMOKE 26-01] Vaga sem bateria', 'smoke-2601-empty',
     'disposable smoke fixture', 'disposable', 'x', 'x', 'Sao Paulo', 'SP', 'CLT', 'ativa',
     '[]'::jsonb);

  -- Three disposable perguntas: p1/p2 in the battery, p3 foreign (active MC, NOT in itens_ids).
  INSERT INTO public.perguntas (id, tipo, cargo, cenario, formato, status) VALUES
    ('26010001-0000-0000-0000-0000000000f1', 'sjt', 'smoke-2601',         '[SMOKE] cenario p1', 'mc', 'active'),
    ('26010001-0000-0000-0000-0000000000f2', 'sjt', 'smoke-2601',         '[SMOKE] cenario p2', 'mc', 'active'),
    ('26010001-0000-0000-0000-0000000000f3', 'sjt', 'smoke-2601-foreign', '[SMOKE] cenario p3', 'mc', 'active');

  INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem) VALUES
    ('26010001-0000-0000-0000-0000000000f1', '26010001-0000-0000-0000-00000000a101', 'p1 forte',   'fortemente_pontua', 4, 1),
    ('26010001-0000-0000-0000-0000000000f1', '26010001-0000-0000-0000-00000000a102', 'p1 media',   'pontua',            2, 2),
    ('26010001-0000-0000-0000-0000000000f1', '26010001-0000-0000-0000-00000000a103', 'p1 atencao', 'atencao',           0, 3),
    ('26010001-0000-0000-0000-0000000000f2', '26010001-0000-0000-0000-00000000a201', 'p2 forte',   'fortemente_pontua', 4, 1),
    ('26010001-0000-0000-0000-0000000000f2', '26010001-0000-0000-0000-00000000a202', 'p2 media',   'pontua',            2, 2),
    ('26010001-0000-0000-0000-0000000000f2', '26010001-0000-0000-0000-00000000a203', 'p2 atencao', 'atencao',           0, 3),
    ('26010001-0000-0000-0000-0000000000f3', '26010001-0000-0000-0000-00000000a301', 'p3 forte',   'fortemente_pontua', 4, 1);

  -- Two disposable candidaturas at avaliacao_assincrona for the discovered candidato.
  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, status, etapa_atual,
     curriculo_url, curriculo_nome_original, curriculo_tamanho_bytes, data_candidatura, data_formulario_enviado)
  VALUES
    ('26010001-0000-0000-0000-0000000000d1', v_cand, '26010001-0000-0000-0000-0000000000b1',
     'aguardando_resposta'::public.status_candidatura, 'avaliacao_assincrona'::public.etapa_processo,
     'smoke://cv', 'smoke.pdf', 0, now(), now()),
    ('26010001-0000-0000-0000-0000000000d2', v_cand, '26010001-0000-0000-0000-0000000000b2',
     'aguardando_resposta'::public.status_candidatura, 'avaliacao_assincrona'::public.etapa_processo,
     'smoke://cv', 'smoke.pdf', 0, now(), now());

  -- Stash ids + the RNF-07a baseline (status/etapa we just set on d1).
  PERFORM set_config('smoke.user',           v_user::text, false);
  PERFORM set_config('smoke.cand_battery',   '26010001-0000-0000-0000-0000000000d1', false);
  PERFORM set_config('smoke.cand_empty',     '26010001-0000-0000-0000-0000000000d2', false);
  PERFORM set_config('smoke.p1',             '26010001-0000-0000-0000-0000000000f1', false);
  PERFORM set_config('smoke.p2',             '26010001-0000-0000-0000-0000000000f2', false);
  PERFORM set_config('smoke.p3',             '26010001-0000-0000-0000-0000000000f3', false);
  PERFORM set_config('smoke.o1a',            '26010001-0000-0000-0000-00000000a101', false);
  PERFORM set_config('smoke.o1b',            '26010001-0000-0000-0000-00000000a102', false);
  PERFORM set_config('smoke.o2a',            '26010001-0000-0000-0000-00000000a201', false);
  PERFORM set_config('smoke.o3a',            '26010001-0000-0000-0000-00000000a301', false);
  PERFORM set_config('smoke.d1_status_before', 'aguardando_resposta', false);
  PERFORM set_config('smoke.d1_etapa_before',  'avaliacao_assincrona', false);
  PERFORM set_config('smoke.ready',          'y', false);
  RAISE NOTICE 'FUNIL-01 fixture built (candidato % · battery vaga b1 p1/p2 · empty vaga b2)', v_cand;
EXCEPTION WHEN OTHERS THEN
  -- Savepoint rollback already undid partial inserts; mark skip so no assertion false-fails.
  PERFORM set_config('smoke.ready', 'n', false);
  RAISE NOTICE 'FUNIL-01 SKIP: disposable fixture could not be built (%: %) — adjust to live schema in 26-07', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) DEDUP — a repeated pergunta_id must be rejected (22023). Runs while d1 has
--     NO MC row so the re-submit lock cannot mask the dedup error.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-01 SKIP (1 dedup): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.user'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  BEGIN
    PERFORM public.pontuar_sjt(current_setting('smoke.cand_battery')::uuid, jsonb_build_array(
      jsonb_build_object('pergunta_id', current_setting('smoke.p1'), 'opcao_id', current_setting('smoke.o1a')),
      jsonb_build_object('pergunta_id', current_setting('smoke.p1'), 'opcao_id', current_setting('smoke.o1b'))));
    RAISE EXCEPTION 'FUNIL-01 FAIL (1 dedup): duplicate pergunta_id accepted (expected 22023 resposta duplicada)';
  EXCEPTION WHEN sqlstate '22023' THEN
    IF SQLERRM LIKE '%duplicada%' THEN
      RAISE NOTICE 'PASS (1 dedup): duplicate pergunta_id rejected (22023 resposta duplicada)';
    ELSE RAISE EXCEPTION 'FUNIL-01 FAIL (1 dedup): 22023 but unexpected message: %', SQLERRM; END IF;
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) SUBSET — an incomplete submit (1 of 2) must be rejected 'bateria incompleta' (22023).
--     Runs before the complete submit so d1 still has no MC row.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-01 SKIP (3 subset): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.user'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  BEGIN
    PERFORM public.pontuar_sjt(current_setting('smoke.cand_battery')::uuid, jsonb_build_array(
      jsonb_build_object('pergunta_id', current_setting('smoke.p1'), 'opcao_id', current_setting('smoke.o1a'))));
    RAISE EXCEPTION 'FUNIL-01 FAIL (3 subset): incomplete battery accepted (expected 22023 bateria incompleta)';
  EXCEPTION WHEN sqlstate '22023' THEN
    IF SQLERRM LIKE '%bateria incompleta%' THEN
      RAISE NOTICE 'PASS (3 subset): incomplete battery rejected (22023 bateria incompleta)';
    ELSE RAISE EXCEPTION 'FUNIL-01 FAIL (3 subset): 22023 but unexpected message: %', SQLERRM; END IF;
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (4) FOREIGN pergunta_id — FUNIL-07 server teeth: a valid-but-out-of-battery
--     pergunta must be rejected 42501 (the client filter is UX only).
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-07 SKIP (4 foreign): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.user'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  BEGIN
    PERFORM public.pontuar_sjt(current_setting('smoke.cand_battery')::uuid, jsonb_build_array(
      jsonb_build_object('pergunta_id', current_setting('smoke.p1'), 'opcao_id', current_setting('smoke.o1a')),
      jsonb_build_object('pergunta_id', current_setting('smoke.p3'), 'opcao_id', current_setting('smoke.o3a'))));
    RAISE EXCEPTION 'FUNIL-07 FAIL (4 foreign): out-of-battery pergunta accepted (expected 42501 pergunta fora da bateria)';
  EXCEPTION WHEN sqlstate '42501' THEN
    IF SQLERRM LIKE '%fora da bateria%' THEN
      RAISE NOTICE 'PASS (4 foreign): out-of-battery pergunta_id rejected server-side (42501 pergunta fora da bateria)';
    ELSE RAISE EXCEPTION 'FUNIL-07 FAIL (4 foreign): 42501 but unexpected message: %', SQLERRM; END IF;
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (2a) COMPLETE honest submit — the full battery must be accepted.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-01 SKIP (2 complete): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.user'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  BEGIN
    PERFORM public.pontuar_sjt(current_setting('smoke.cand_battery')::uuid, jsonb_build_array(
      jsonb_build_object('pergunta_id', current_setting('smoke.p1'), 'opcao_id', current_setting('smoke.o1a')),
      jsonb_build_object('pergunta_id', current_setting('smoke.p2'), 'opcao_id', current_setting('smoke.o2a'))));
    RAISE NOTICE 'PASS (2a complete): full honest battery accepted';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'FUNIL-01 FAIL (2a complete): honest full battery rejected (%: %)', SQLSTATE, SQLERRM;
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (2b) DENOMINATOR — the recorded score_max must equal Σ MAX(peso) over the FULL
--      battery (NOT the answered subset). Verified as the privileged role (RLS deny).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_max numeric; v_score numeric; v_full numeric;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-01 SKIP (2b denominator): fixture not built'; RETURN; END IF;
  SELECT SUM(mx) INTO v_full FROM (
    SELECT MAX(peso) AS mx FROM public.perguntas_opcao_sjt
     WHERE pergunta_id = ANY(ARRAY[current_setting('smoke.p1')::uuid, current_setting('smoke.p2')::uuid])
     GROUP BY pergunta_id) t;
  SELECT score, score_max INTO v_score, v_max
    FROM public.scores_candidato
   WHERE candidatura_id = current_setting('smoke.cand_battery')::uuid
     AND tipo = 'sjt' AND subtipo = 'mc' AND pergunta_id IS NULL;
  IF v_max IS NULL THEN RAISE EXCEPTION 'FUNIL-01 FAIL (2b): no MC row written by the complete submit'; END IF;
  IF v_max <> v_full THEN
    RAISE EXCEPTION 'FUNIL-01 FAIL (2b denominator): score_max=% but full-battery Σ MAX(peso)=% (denominator not over full battery)', v_max, v_full;
  END IF;
  IF v_max <> 8 THEN RAISE EXCEPTION 'FUNIL-01 FAIL (2b): expected score_max 8 (4+4), got %', v_max; END IF;
  RAISE NOTICE 'PASS (2b denominator): score_max=% equals Σ MAX(peso) over the FULL battery (score=%)', v_max, v_score;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (5) RE-SUBMIT LOCK — a second complete submit must be rejected 42501, and exactly
--     ONE MC row must remain (no A41 overwrite).
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-01 SKIP (5 re-submit): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.user'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  BEGIN
    PERFORM public.pontuar_sjt(current_setting('smoke.cand_battery')::uuid, jsonb_build_array(
      jsonb_build_object('pergunta_id', current_setting('smoke.p1'), 'opcao_id', current_setting('smoke.o1a')),
      jsonb_build_object('pergunta_id', current_setting('smoke.p2'), 'opcao_id', current_setting('smoke.o2a'))));
    RAISE EXCEPTION 'FUNIL-01 FAIL (5 re-submit): second submit accepted (expected 42501 avaliacao ja registrada)';
  EXCEPTION WHEN sqlstate '42501' THEN
    IF SQLERRM LIKE '%ja registrada%' THEN
      RAISE NOTICE 'PASS (5 re-submit lock): second submit rejected (42501 avaliacao ja registrada)';
    ELSE RAISE EXCEPTION 'FUNIL-01 FAIL (5 re-submit): 42501 but unexpected message: %', SQLERRM; END IF;
  END;
END $$;

RESET ROLE;
DO $$
DECLARE n int;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-01 SKIP (5 single-row): fixture not built'; RETURN; END IF;
  SELECT count(*) INTO n FROM public.scores_candidato
   WHERE candidatura_id = current_setting('smoke.cand_battery')::uuid AND tipo = 'sjt' AND subtipo = 'mc';
  IF n <> 1 THEN RAISE EXCEPTION 'FUNIL-01 FAIL (5 single-row): expected exactly 1 MC row, found %', n; END IF;
  RAISE NOTICE 'PASS (5 single-row): exactly one scores_candidato MC row for the candidatura';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (6) RNF-07a — scoring never writes candidaturas: status/etapa_atual byte-identical.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_status text; v_etapa text;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'RNF-07a SKIP (6): fixture not built'; RETURN; END IF;
  SELECT status::text, etapa_atual::text INTO v_status, v_etapa
    FROM public.candidaturas WHERE id = current_setting('smoke.cand_battery')::uuid;
  IF v_status IS DISTINCT FROM current_setting('smoke.d1_status_before')
     OR v_etapa IS DISTINCT FROM current_setting('smoke.d1_etapa_before') THEN
    RAISE EXCEPTION 'RNF-07a FAIL (6): scoring changed candidatura (status % / etapa % — expected % / %)',
      v_status, v_etapa, current_setting('smoke.d1_status_before'), current_setting('smoke.d1_etapa_before');
  END IF;
  RAISE NOTICE 'PASS (6 RNF-07a): candidaturas.status/etapa_atual byte-identical before/after scoring';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (7) EMPTY BATTERY (Open Q2) — an unconfigured battery submit must fail loudly
--     (22023 'bateria SJT nao configurada'), never score a silent 0/0 'sucesso'.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-01 SKIP (7 empty battery): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.user'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  BEGIN
    PERFORM public.pontuar_sjt(current_setting('smoke.cand_empty')::uuid, '[]'::jsonb);
    RAISE EXCEPTION 'FUNIL-01 FAIL (7 empty battery): unconfigured battery scored (expected 22023 bateria SJT nao configurada)';
  EXCEPTION WHEN sqlstate '22023' THEN
    IF SQLERRM LIKE '%bateria SJT nao configurada%' THEN
      RAISE NOTICE 'PASS (7 empty battery): unconfigured battery rejected (22023 bateria SJT nao configurada)';
    ELSE RAISE EXCEPTION 'FUNIL-01 FAIL (7 empty battery): 22023 but unexpected message: %', SQLERRM; END IF;
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — ROLLBACK-free: reset the simulated context + drop the disposable fixture.
--   (candidaturas cascade → scores_candidato · perguntas cascade → perguntas_opcao_sjt)
--   The discovered candidato is REAL and is NEVER deleted.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
DELETE FROM public.candidaturas WHERE id IN
  ('26010001-0000-0000-0000-0000000000d1', '26010001-0000-0000-0000-0000000000d2');
DELETE FROM public.perguntas WHERE id IN
  ('26010001-0000-0000-0000-0000000000f1', '26010001-0000-0000-0000-0000000000f2', '26010001-0000-0000-0000-0000000000f3');
DELETE FROM public.vagas WHERE id IN
  ('26010001-0000-0000-0000-0000000000b1', '26010001-0000-0000-0000-0000000000b2');
-- Clear the disposable session GUCs.
SELECT set_config('smoke.ready', '', false);
