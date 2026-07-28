-- =============================================================================
-- Phase 26 / Plan 26-02 — FUNIL-12 get_avaliacao_status neutral-RPC behavioral smoke
-- =============================================================================
-- Proves, AFTER 20260712100003_funil12_get_avaliacao_status.sql applies, that the
-- neutral card-status RPC returns per-test PRESENCE BOOLEANS ONLY (never a score /
-- verdict / threshold), reflects the candidate's OWN rows, and RAISEs 42501 on a
-- foreign candidatura (IDOR) — the load-bearing acceptance gate for D-Card-Status.
-- A NOTICE 'PASS ...' per assertion = PASS; an EXCEPTION = FAIL.
--
-- ASSERTIONS (Pitfall 8 / T-26-02-02/03):
--   (1) the payload is BOOLEANS-ONLY — every leaf value is a jsonb boolean AND no leaf
--       key is score / score_max / status / metadata / veredito (no verdict leak).
--   (2) an owner with a scored SJT MC row reads sjt_mc.registrado = true
--       (the card derives from the candidate's OWN scores_candidato row, not entry.status).
--   (3) impersonating a DIFFERENT user for the SAME candidatura → EXCEPTION 42501 (IDOR).
--
-- MECHANISM (self-contained disposable fixture — NO PROD candidate mutated):
--   A privileged (RLS-bypassing) setup discovers a REAL candidato with a user_id (so the
--   impersonated auth.uid() satisfies ownership) and builds a DISPOSABLE fixture: one
--   disposable vaga, one disposable candidatura, and ONE seeded scores_candidato MC row
--   (tipo=sjt, subtipo=mc) so sjt_mc.registrado is true. Fixed 26020012-* UUIDs → setup +
--   cleanup are idempotent. If the fixture cannot be built the block catches, sets
--   smoke.ready='n', and every assertion SKIPs-with-NOTICE (never false-fails). The owner
--   is impersonated with SET ROLE authenticated + set_config('request.jwt.claims', …sub =
--   the discovered candidato.user_id…); the IDOR case impersonates a synthetic sub that
--   owns no candidato.
--
-- CLEANUP is ROLLBACK-free: resets claims + role, then deletes the disposable fixture
-- (candidatura cascades → scores_candidato). The discovered candidato is REAL — NEVER deleted.
--
-- RUN: Supabase SQL Editor / MCP `execute_sql` AFTER the migration applies (Wave 4 / 26-07).
--      THIS FILE IS RED until then — the RPC must be live for the guards to fire.
-- =============================================================================

-- A synthetic user that owns NO candidato → its ownership check is always false.
--   FOREIGN sub = 00000000-0000-0000-0000-0000000000ff

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP — privileged discovery + disposable fixture (RLS bypass)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_cand uuid; v_user uuid;
BEGIN
  -- Idempotent: clear any prior run's disposable rows (children cascade).
  DELETE FROM public.candidaturas WHERE id = '26020012-0000-0000-0000-0000000000d1';
  DELETE FROM public.vagas WHERE id = '26020012-0000-0000-0000-0000000000b1';

  SELECT id, user_id INTO v_cand, v_user
    FROM public.candidatos
   WHERE user_id IS NOT NULL
   LIMIT 1;
  IF v_cand IS NULL THEN
    PERFORM set_config('smoke.ready', 'n', false);
    RAISE NOTICE 'FUNIL-12 SKIP: no candidato with a user_id in this DB — cannot build the impersonation fixture';
    RETURN;
  END IF;

  INSERT INTO public.vagas
    (id, titulo, slug, descricao_curta, sobre_cargo, requisitos_formacao, requisitos_experiencia,
     cidade, estado, tipo_contrato, status, testes_aplicaveis)
  VALUES
    ('26020012-0000-0000-0000-0000000000b1', '[SMOKE 26-02] Vaga status RPC', 'smoke-2602-status',
     'disposable smoke fixture', 'disposable', 'x', 'x', 'Sao Paulo', 'SP', 'CLT', 'ativa', '[]'::jsonb);

  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, status, etapa_atual,
     curriculo_url, curriculo_nome_original, curriculo_tamanho_bytes, data_candidatura, data_formulario_enviado)
  VALUES
    ('26020012-0000-0000-0000-0000000000d1', v_cand, '26020012-0000-0000-0000-0000000000b1',
     'aguardando_resposta'::public.status_candidatura, 'avaliacao_assincrona'::public.etapa_processo,
     'smoke://cv', 'smoke.pdf', 0, now(), now());

  -- Seed ONE MC score row so sjt_mc.registrado is true (content is irrelevant — the RPC
  -- never returns it; only its PRESENCE flips the boolean).
  INSERT INTO public.scores_candidato
    (candidatura_id, tipo, subtipo, score, score_max, status, metadata)
  VALUES
    ('26020012-0000-0000-0000-0000000000d1', 'sjt', 'mc', 5, 8, 'sucesso', '{}'::jsonb);

  PERFORM set_config('smoke.user', v_user::text, false);
  PERFORM set_config('smoke.cand', '26020012-0000-0000-0000-0000000000d1', false);
  PERFORM set_config('smoke.ready', 'y', false);
  RAISE NOTICE 'FUNIL-12 fixture built (candidato % · candidatura d1 · 1 seeded sjt/mc score row)', v_cand;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke.ready', 'n', false);
  RAISE NOTICE 'FUNIL-12 SKIP: disposable fixture could not be built (%: %) — adjust to live schema in 26-07', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) BOOLEANS-ONLY — every leaf is a jsonb boolean; no verdict/numeric key reachable.
-- (2) OWN-ROW TRUTH — sjt_mc.registrado = true (the seeded MC row is present).
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
DECLARE
  v_res     jsonb;
  test_key  text; test_val jsonb;
  leaf_key  text; leaf_val jsonb;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-12 SKIP (1/2 neutral): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.user'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);

  v_res := public.get_avaliacao_status(current_setting('smoke.cand')::uuid);

  -- (1) walk every card object → every leaf must be a boolean AND no forbidden key.
  FOR test_key, test_val IN SELECT * FROM jsonb_each(v_res) LOOP
    IF jsonb_typeof(test_val) <> 'object' THEN
      RAISE EXCEPTION 'FUNIL-12 FAIL (1 neutral): card % is not an object (shape leak): %', test_key, test_val;
    END IF;
    FOR leaf_key, leaf_val IN SELECT * FROM jsonb_each(test_val) LOOP
      IF leaf_key IN ('score', 'score_max', 'status', 'metadata', 'veredito', 'threshold', 'banda') THEN
        RAISE EXCEPTION 'FUNIL-12 FAIL (1 neutral): forbidden verdict/numeric key % under card %', leaf_key, test_key;
      END IF;
      IF jsonb_typeof(leaf_val) <> 'boolean' THEN
        RAISE EXCEPTION 'FUNIL-12 FAIL (1 neutral): non-boolean leaf %.% (%) — content leak', test_key, leaf_key, jsonb_typeof(leaf_val);
      END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'PASS (1 booleans-only): every card leaf is a boolean; no score/status/verdict key reachable';

  -- (2) own-row truth: the seeded MC row → sjt_mc.registrado true.
  IF (v_res->'sjt_mc'->>'registrado')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'FUNIL-12 FAIL (2 own-row): sjt_mc.registrado is not true despite a seeded MC score row: %', v_res;
  END IF;
  RAISE NOTICE 'PASS (2 own-row): sjt_mc.registrado = true from the candidate own scores_candidato row';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) IDOR — a DIFFERENT user reading the SAME candidatura must be rejected 42501.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'FUNIL-12 SKIP (3 IDOR): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000ff', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  BEGIN
    PERFORM public.get_avaliacao_status(current_setting('smoke.cand')::uuid);
    RAISE EXCEPTION 'FUNIL-12 FAIL (3 IDOR): a foreign user read the status (expected 42501 forbidden)';
  EXCEPTION WHEN sqlstate '42501' THEN
    RAISE NOTICE 'PASS (3 IDOR): foreign candidatura status read rejected (42501 forbidden)';
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — ROLLBACK-free: reset the simulated context + drop the disposable fixture.
--   (candidatura cascades → scores_candidato.) The candidato is REAL and is NEVER deleted.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
DELETE FROM public.candidaturas WHERE id = '26020012-0000-0000-0000-0000000000d1';
DELETE FROM public.vagas WHERE id = '26020012-0000-0000-0000-0000000000b1';
-- Clear the disposable session GUCs.
SELECT set_config('smoke.ready', '', false);
