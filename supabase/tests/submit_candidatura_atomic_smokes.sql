-- =============================================================================
-- Phase 27 / Plan 27-03 — CI-03 + DBMIG-02 behavioral smoke: submit_candidatura_atomic
-- =============================================================================
-- Proves that the system's ONLY sanctioned auto-reject path (the submit-candidatura
-- knockout sweep) behaves correctly over a disposable fixture. A NOTICE 'PASS ...'
-- per assertion = PASS; an EXCEPTION = FAIL. Structural greps pass while behavior
-- breaks — Phase 24/25/26 proved smokes catch what greps miss.
--
-- ASSERTIONS:
--   (1) KNOCKOUT sanctioned-reject → the RPC auto-rejects in the same txn:
--         candidaturas.status='rejeitado', etapa_atual='inscricao',
--         motivo_rejeicao='knockout_automatico', AND exactly ONE historico_candidatura
--         row with auto_rejeitado=true, ator IS NULL (the explicit knockout row, D-13).
--   (2) SURVIVOR advance + DBMIG-02 → a non-knockout answer advances etapa_atual to
--         'triagem' (status stays 'aguardando_resposta'), AND — post-DBMIG-02 — the
--         trigger-written survivor history row has auto_rejeitado=false (a system
--         advance is NOT a rejection). THIS ASSERTION IS RED until the DBMIG-02 trigger
--         fix (20260712110001_avancar_etapa_auto_rejeitado_fix.sql) applies in 27-05:
--         the Phase-6 predicate `(v_ator IS NULL)` marks EVERY system write true.
--   (3) DEDUP → a second RPC call with the same candidato_id+vaga_id raises the UNIQUE
--         violation (23505) → the caller maps it to DUPLICATE_CANDIDATURA.
--
-- RNF-07a: the sweep reads ONLY objective knockout-tagged option TEXT
-- (@> to_jsonb(opcao_texto), tag='knockout') — no trait/score/age. No score-driven
-- reject is asserted anywhere (T-27-03-04). The knockout is the ONE sanctioned path.
--
-- MECHANISM (self-contained disposable fixture — NO PROD candidate mutated):
--   submit_candidatura_atomic is SECURITY DEFINER, REVOKE PUBLIC / GRANT EXECUTE
--   service_role ONLY — so it CANNOT be called under `SET ROLE authenticated` (42501
--   permission denied). The real submit-candidatura EF invokes it via its service_role
--   client, where auth.uid() is NULL (a system write). This smoke therefore runs the RPC
--   under the privileged (RLS-bypassing) role with `request.jwt.claims` CLEARED —
--   set_config('request.jwt.claims', '', true) pins auth.uid()=NULL, faithfully
--   impersonating the EF's service_role NULL-actor context (the survivor auto_rejeitado=
--   false predicate requires ator IS NULL). A privileged setup step discovers a REAL
--   candidato and builds a DISPOSABLE fixture: two disposable vagas (b_ko / b_surv), two
--   disposable perguntas (each with a knockout-tagged option 'Não'). On b_ko the answer is
--   ['Não'] (knockout); on b_surv the answer is ['Sim'] (survivor — proves the sweep is
--   answer-specific, not metadata-presence). Every disposable row uses a fixed 27010001-*
--   UUID so setup + cleanup are idempotent. The candidaturas are created BY the RPC (random
--   ids), captured into GUCs. If the fixture cannot be built (e.g. a live-schema NOT NULL
--   gap the ledger did not encode yet), the block catches, sets smoke.ready='n', and every
--   assertion SKIPs-with-NOTICE (never a false-fail) — tune the fixture to the live schema
--   at apply time.
--
-- CLEANUP is ROLLBACK-free: clears the simulated claims, deletes the RPC-created
-- candidaturas (+ their historico/respostas children first — historico_candidatura FKs
-- NO ACTION) and the disposable perguntas/metadata/vagas. The discovered candidato is
-- REAL and is NEVER deleted.
--
-- RUN: Supabase SQL Editor / MCP execute_sql AFTER 20260712110001 (DBMIG-02) applies
--      in the [BLOCKING] wave 27-05. THIS FILE IS RED until then (assertion 2 depends on
--      the trigger fix). It is NOT run by the CI runner (branch/PROD idiom).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP — privileged discovery + disposable fixture (RLS bypass)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_cand uuid;
BEGIN
  -- Idempotent: clear any prior run's RPC-created candidaturas (+ children) and the
  -- disposable fixture. historico_candidatura + respostas_formulario FK candidaturas.
  DELETE FROM public.historico_candidatura WHERE candidatura_id IN (
    SELECT id FROM public.candidaturas WHERE vaga_id IN
      ('27010001-0000-0000-0000-0000000000b1','27010001-0000-0000-0000-0000000000b2'));
  DELETE FROM public.respostas_formulario WHERE candidatura_id IN (
    SELECT id FROM public.candidaturas WHERE vaga_id IN
      ('27010001-0000-0000-0000-0000000000b1','27010001-0000-0000-0000-0000000000b2'));
  DELETE FROM public.candidaturas WHERE vaga_id IN
    ('27010001-0000-0000-0000-0000000000b1','27010001-0000-0000-0000-0000000000b2');
  DELETE FROM public.pergunta_opcao_metadata WHERE pergunta_id IN
    ('27010001-0000-0000-0000-0000000000f1','27010001-0000-0000-0000-0000000000f2');
  DELETE FROM public.perguntas_formulario WHERE id IN
    ('27010001-0000-0000-0000-0000000000f1','27010001-0000-0000-0000-0000000000f2');
  DELETE FROM public.vagas WHERE id IN
    ('27010001-0000-0000-0000-0000000000b1','27010001-0000-0000-0000-0000000000b2');

  -- A REAL candidato (any — the RPC takes candidato_id as a trusted param; auth.uid() is
  -- NULL under the service_role context this smoke reproduces, so no user_id is needed).
  SELECT id INTO v_cand FROM public.candidatos LIMIT 1;
  IF v_cand IS NULL THEN
    PERFORM set_config('smoke.ready', 'n', false);
    RAISE NOTICE 'CI-03 SKIP: no candidato row in this DB — cannot build the fixture';
    RETURN;
  END IF;

  -- Two disposable vagas: b_ko (knockout path), b_surv (survivor path).
  INSERT INTO public.vagas
    (id, titulo, slug, descricao_curta, sobre_cargo, requisitos_formacao, requisitos_experiencia,
     cidade, estado, tipo_contrato, status, testes_aplicaveis)
  VALUES
    ('27010001-0000-0000-0000-0000000000b1', '[SMOKE 27-03] Vaga knockout', 'smoke-2703-ko',
     'disposable smoke fixture', 'disposable', 'x', 'x', 'Sao Paulo', 'SP', 'CLT', 'ativa', '[]'::jsonb),
    ('27010001-0000-0000-0000-0000000000b2', '[SMOKE 27-03] Vaga survivor', 'smoke-2703-surv',
     'disposable smoke fixture', 'disposable', 'x', 'x', 'Sao Paulo', 'SP', 'CLT', 'ativa', '[]'::jsonb);

  -- Two disposable single_choice perguntas, each with a knockout-tagged option 'Não'.
  INSERT INTO public.perguntas_formulario (id, vaga_id, bloco, ordem, texto_pergunta, tipo_resposta) VALUES
    ('27010001-0000-0000-0000-0000000000f1', '27010001-0000-0000-0000-0000000000b1',
     'geral', 1, '[SMOKE] Você tem CNH?', 'single_choice'),
    ('27010001-0000-0000-0000-0000000000f2', '27010001-0000-0000-0000-0000000000b2',
     'geral', 1, '[SMOKE] Você tem CNH?', 'single_choice');

  -- The knockout answer-key: option TEXT 'Não' tagged 'knockout' (the sweep joins on
  -- pergunta_id + text-containment; peso/opcao_id are audit-only, never the trigger).
  INSERT INTO public.pergunta_opcao_metadata (id, pergunta_id, opcao_id, opcao_texto, tag, peso, ordem) VALUES
    (gen_random_uuid(), '27010001-0000-0000-0000-0000000000f1',
     '27010001-0000-0000-0000-00000000a101', 'Não', 'knockout', 0, 1),
    (gen_random_uuid(), '27010001-0000-0000-0000-0000000000f2',
     '27010001-0000-0000-0000-00000000a201', 'Não', 'knockout', 0, 1);

  PERFORM set_config('smoke.cand',   v_cand::text, false);
  PERFORM set_config('smoke.b_ko',   '27010001-0000-0000-0000-0000000000b1', false);
  PERFORM set_config('smoke.b_surv', '27010001-0000-0000-0000-0000000000b2', false);
  PERFORM set_config('smoke.p_ko',   '27010001-0000-0000-0000-0000000000f1', false);
  PERFORM set_config('smoke.p_surv', '27010001-0000-0000-0000-0000000000f2', false);
  PERFORM set_config('smoke.ready',  'y', false);
  RAISE NOTICE 'CI-03 fixture built (candidato % · knockout vaga b1 · survivor vaga b2)', v_cand;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke.ready', 'n', false);
  RAISE NOTICE 'CI-03 SKIP: disposable fixture could not be built (%: %) — adjust to live schema in 27-05', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) KNOCKOUT sanctioned-reject — status/etapa/motivo + exactly ONE history row
--     auto_rejeitado=true, ator NULL. Runs under the privileged (service_role-like)
--     role with claims cleared → auth.uid()=NULL (the EF's system-write context).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_ret jsonb; v_ko uuid; v_status text; v_etapa text; v_motivo text;
        v_n int; v_auto boolean; v_ator uuid;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'CI-03 SKIP (1 knockout): fixture not built'; RETURN; END IF;
  -- Clear the JWT claims → auth.uid()=NULL, faithfully reproducing the service_role
  -- NULL-actor context under which the EF invokes this service_role-only RPC.
  PERFORM set_config('request.jwt.claims', '', true);
  BEGIN
    v_ret := public.submit_candidatura_atomic(
      current_setting('smoke.cand')::uuid, current_setting('smoke.b_ko')::uuid,
      'smoke://cv', 'smoke.pdf', 0,
      jsonb_build_array(jsonb_build_object(
        'pergunta_id', current_setting('smoke.p_ko'),
        'resposta_opcoes', jsonb_build_array('Não'))));
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'CI-03 FAIL (1 knockout): RPC raised (%: %)', SQLSTATE, SQLERRM;
  END;
  v_ko := (v_ret->>'candidatura_id')::uuid;
  PERFORM set_config('smoke.ko_cand', v_ko::text, false);

  SELECT status::text, etapa_atual::text, motivo_rejeicao
    INTO v_status, v_etapa, v_motivo
    FROM public.candidaturas WHERE id = v_ko;
  IF v_status <> 'rejeitado' OR v_etapa <> 'inscricao' OR v_motivo IS DISTINCT FROM 'knockout_automatico' THEN
    RAISE EXCEPTION 'CI-03 FAIL (1 knockout): expected rejeitado/inscricao/knockout_automatico, got %/%/%',
      v_status, v_etapa, v_motivo;
  END IF;

  SELECT count(*) INTO v_n FROM public.historico_candidatura WHERE candidatura_id = v_ko;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'CI-03 FAIL (1 knockout): expected exactly 1 history row, found % (D-13 no double-write)', v_n;
  END IF;
  SELECT auto_rejeitado, ator INTO v_auto, v_ator
    FROM public.historico_candidatura WHERE candidatura_id = v_ko;
  IF v_auto IS DISTINCT FROM true OR v_ator IS NOT NULL THEN
    RAISE EXCEPTION 'CI-03 FAIL (1 knockout): history row must be auto_rejeitado=true, ator NULL — got %/%', v_auto, v_ator;
  END IF;
  RAISE NOTICE 'PASS (1 knockout): sanctioned reject → rejeitado/inscricao/knockout_automatico + 1 history row (auto_rejeitado=true, ator NULL)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (2) SURVIVOR advance + DBMIG-02 — a non-knockout answer advances to 'triagem'
--     (status stays aguardando_resposta) and the trigger-written history row is
--     auto_rejeitado=false. RED until 20260712110001 applies (27-05).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_ret jsonb; v_surv uuid; v_status text; v_etapa text;
        v_n int; v_auto boolean;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'CI-03 SKIP (2 survivor): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '', true);   -- auth.uid()=NULL (system write)
  BEGIN
    v_ret := public.submit_candidatura_atomic(
      current_setting('smoke.cand')::uuid, current_setting('smoke.b_surv')::uuid,
      'smoke://cv', 'smoke.pdf', 0,
      jsonb_build_array(jsonb_build_object(
        'pergunta_id', current_setting('smoke.p_surv'),
        'resposta_opcoes', jsonb_build_array('Sim'))));   -- 'Sim' does NOT match the 'Não' knockout
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'CI-03 FAIL (2 survivor): RPC raised (%: %)', SQLSTATE, SQLERRM;
  END;
  v_surv := (v_ret->>'candidatura_id')::uuid;

  SELECT status::text, etapa_atual::text INTO v_status, v_etapa
    FROM public.candidaturas WHERE id = v_surv;
  IF v_status <> 'aguardando_resposta' OR v_etapa <> 'triagem' THEN
    RAISE EXCEPTION 'CI-03 FAIL (2 survivor): expected aguardando_resposta/triagem, got %/%', v_status, v_etapa;
  END IF;

  SELECT count(*) INTO v_n FROM public.historico_candidatura WHERE candidatura_id = v_surv;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'CI-03 FAIL (2 survivor): expected exactly 1 history row (trigger-owned), found %', v_n;
  END IF;
  SELECT auto_rejeitado INTO v_auto
    FROM public.historico_candidatura WHERE candidatura_id = v_surv;
  IF v_auto IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'CI-03 FAIL (2 survivor / DBMIG-02): survivor advance to triagem must record auto_rejeitado=false, got % (RED until 20260712110001 applies)', v_auto;
  END IF;
  RAISE NOTICE 'PASS (2 survivor / DBMIG-02): advance to triagem records auto_rejeitado=false (a system advance is not a rejection)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) DEDUP — a second submit for the same candidato_id+vaga_id (b_ko, still live
--     from assertion 1) must raise the UNIQUE violation (23505) → DUPLICATE.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'CI-03 SKIP (3 dedup): fixture not built'; RETURN; END IF;
  IF current_setting('smoke.ko_cand', true) IS NULL OR current_setting('smoke.ko_cand', true) = '' THEN
    RAISE NOTICE 'CI-03 SKIP (3 dedup): assertion 1 did not create the first candidatura'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '', true);
  BEGIN
    PERFORM public.submit_candidatura_atomic(
      current_setting('smoke.cand')::uuid, current_setting('smoke.b_ko')::uuid,
      'smoke://cv', 'smoke.pdf', 0,
      jsonb_build_array(jsonb_build_object(
        'pergunta_id', current_setting('smoke.p_ko'),
        'resposta_opcoes', jsonb_build_array('Não'))));
    RAISE EXCEPTION 'CI-03 FAIL (3 dedup): a duplicate candidato_id+vaga_id was accepted (expected 23505 → DUPLICATE_CANDIDATURA)';
  EXCEPTION
    WHEN unique_violation THEN   -- 23505
      RAISE NOTICE 'PASS (3 dedup): duplicate candidato_id+vaga_id rejected (23505 → DUPLICATE_CANDIDATURA)';
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — ROLLBACK-free: reset the simulated claims + drop the RPC-created
--   candidaturas (+ their history/respostas children) and the disposable fixture.
--   The discovered candidato is REAL and is NEVER deleted.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
DELETE FROM public.historico_candidatura WHERE candidatura_id IN (
  SELECT id FROM public.candidaturas WHERE vaga_id IN
    ('27010001-0000-0000-0000-0000000000b1','27010001-0000-0000-0000-0000000000b2'));
DELETE FROM public.respostas_formulario WHERE candidatura_id IN (
  SELECT id FROM public.candidaturas WHERE vaga_id IN
    ('27010001-0000-0000-0000-0000000000b1','27010001-0000-0000-0000-0000000000b2'));
DELETE FROM public.candidaturas WHERE vaga_id IN
  ('27010001-0000-0000-0000-0000000000b1','27010001-0000-0000-0000-0000000000b2');
DELETE FROM public.pergunta_opcao_metadata WHERE pergunta_id IN
  ('27010001-0000-0000-0000-0000000000f1','27010001-0000-0000-0000-0000000000f2');
DELETE FROM public.perguntas_formulario WHERE id IN
  ('27010001-0000-0000-0000-0000000000f1','27010001-0000-0000-0000-0000000000f2');
DELETE FROM public.vagas WHERE id IN
  ('27010001-0000-0000-0000-0000000000b1','27010001-0000-0000-0000-0000000000b2');
SELECT set_config('smoke.ready', '', false);
SELECT set_config('smoke.ko_cand', '', false);
