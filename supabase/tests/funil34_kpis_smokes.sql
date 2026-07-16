-- =============================================================================
-- Phase 34 / Plan 34-01 — funil_kpis v2 (+4 keys) + v_fila_trabalho behavioral smoke
-- =============================================================================
-- Load-bearing KPI-04 gate. Run via Supabase MCP `execute_sql` AFTER 34-01 applies.
-- Result-returning: each assertion writes `set_config('smoke34.<x>', 'PASS'|'FAIL …')` and the
-- file ends with a single SELECT of a–h (RAISE NOTICE is invisible over MCP — P33 learning).
-- GREEN gate = a–h all read PASS.
--
-- Assertions:
--   (a) 3 EXISTING keys preserved + non-empty (DBMIG-02 — no dropped CTE).
--   (b) 4 NEW keys present on the jsonb.
--   (c) time_to_hire is a positive bigint (seeded hire).
--   (d) knockout_rate.knockouts>=1, taxa in [0,1] (seeded motivo_rejeicao='knockout_automatico').
--   (e) drop_per_stage['triagem'].dropped>=1 (human reject); inscricao self-loop excluded (no inscricao drop).
--   (f) no_show_rate: recruiter B total>=1 + taxa NOT null; recruiter A (empty vaga) taxa IS null (0-row CASE guard).
--   (g) vaga-scope + PII-free: recruiter A sees no vaga-B numbers; recruiter B output has NO candidate-identity key.
--   (h) v_fila_trabalho: recruiter A sees 0 rows; recruiter B sees its non-terminal candidatura w/ entrou_etapa_em set.
--
-- FIXTURE (disposable 34010034-*, ROLLBACK-free — real rows NEVER deleted):
--   2 distinct REAL 0-vaga usuarios_rh (recruiter A/B — vagas.created_by HAS FK, no synthetic UUIDs) +
--   a 3rd usuarios_rh (admin) + a REAL FK-bound candidato. vagaA(recA, EMPTY) · FOUR recruiter-B vagas
--   (b01..b04 — distinct because candidaturas_candidato_vaga_unique_idx forbids one candidato twice on one vaga):
--   b01→H(hired→aprovado) · b02→K(knockout) · b03→D(drop triagem→rejeitado) · b04→N(entrevista_online + 2 agendamentos).
-- =============================================================================

RESET ROLE;
SELECT set_config('smoke34.a','',false), set_config('smoke34.b','',false), set_config('smoke34.c','',false),
       set_config('smoke34.d','',false), set_config('smoke34.e','',false), set_config('smoke34.f','',false),
       set_config('smoke34.g','',false), set_config('smoke34.h','',false);

DO $$
DECLARE v_cand uuid; v_cand_user uuid; v_recA uuid; v_recB uuid; v_admin uuid;
BEGIN
  DELETE FROM public.agendamentos_entrevista WHERE id::text LIKE '34010034-%';
  DELETE FROM public.historico_candidatura WHERE candidatura_id::text LIKE '34010034-%';
  DELETE FROM public.candidaturas WHERE id::text LIKE '34010034-%';
  DELETE FROM public.vagas WHERE id::text LIKE '34010034-%';

  SELECT id, user_id INTO v_cand, v_cand_user FROM public.candidatos WHERE user_id IS NOT NULL ORDER BY id LIMIT 1;
  SELECT user_id INTO v_recA FROM public.usuarios_rh u WHERE user_id IS NOT NULL AND deleted_at IS NULL AND ativo
     AND NOT EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = u.user_id) ORDER BY user_id LIMIT 1;
  SELECT user_id INTO v_recB FROM public.usuarios_rh u WHERE user_id IS NOT NULL AND deleted_at IS NULL AND ativo AND user_id <> v_recA
     AND NOT EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = u.user_id) ORDER BY user_id LIMIT 1;
  SELECT user_id INTO v_admin FROM public.usuarios_rh u WHERE user_id IS NOT NULL AND deleted_at IS NULL AND user_id NOT IN (v_recA, v_recB) ORDER BY user_id LIMIT 1;

  IF v_cand IS NULL OR v_cand_user IS NULL OR v_recA IS NULL OR v_recB IS NULL OR v_admin IS NULL THEN
    PERFORM set_config('smoke.ready','n',false);
    RAISE NOTICE 'SEG-34 SKIP: cand=% recA=% recB=% admin=%', v_cand, v_recA, v_recB, v_admin; RETURN;
  END IF;

  INSERT INTO public.vagas (id, titulo, slug, status, created_by) VALUES
    ('34010034-0000-4000-8000-000000000a01','[SMOKE 34] Vaga A (empty)','smoke-34-vaga-a','ativa'::public.status_vaga, v_recA),
    ('34010034-0000-4000-8000-000000000b01','[SMOKE 34] Vaga B1','smoke-34-vaga-b1','ativa'::public.status_vaga, v_recB),
    ('34010034-0000-4000-8000-000000000b02','[SMOKE 34] Vaga B2','smoke-34-vaga-b2','ativa'::public.status_vaga, v_recB),
    ('34010034-0000-4000-8000-000000000b03','[SMOKE 34] Vaga B3','smoke-34-vaga-b3','ativa'::public.status_vaga, v_recB),
    ('34010034-0000-4000-8000-000000000b04','[SMOKE 34] Vaga B4','smoke-34-vaga-b4','ativa'::public.status_vaga, v_recB);

  -- H (hired → aprovado, vaga b01): time_to_hire endpoint + an inscricao exit (not a drop)
  INSERT INTO public.candidaturas (id, candidato_id, vaga_id, status, etapa_atual, data_candidatura) VALUES
    ('34010034-0000-4000-8000-000000000d01', v_cand, '34010034-0000-4000-8000-000000000b01','aguardando_resposta'::public.status_candidatura,'aprovado'::public.etapa_processo, now() - interval '30 days');
  INSERT INTO public.historico_candidatura (candidatura_id, etapa_de, etapa_para, ator, criado_em) VALUES
    ('34010034-0000-4000-8000-000000000d01', NULL, 'inscricao'::public.etapa_processo, NULL, now() - interval '30 days'),
    ('34010034-0000-4000-8000-000000000d01', 'inscricao'::public.etapa_processo, 'triagem'::public.etapa_processo, NULL, now() - interval '25 days'),
    ('34010034-0000-4000-8000-000000000d01', 'decisao_final'::public.etapa_processo, 'aprovado'::public.etapa_processo, NULL, now() - interval '10 days');

  -- K (knockout, vaga b02): motivo_rejeicao marker + an inscricao SELF-LOOP (must be excluded from drop_flow)
  INSERT INTO public.candidaturas (id, candidato_id, vaga_id, status, etapa_atual, data_candidatura, motivo_rejeicao) VALUES
    ('34010034-0000-4000-8000-000000000d02', v_cand, '34010034-0000-4000-8000-000000000b02','aguardando_resposta'::public.status_candidatura,'rejeitado'::public.etapa_processo, now() - interval '5 days', 'knockout_automatico');
  INSERT INTO public.historico_candidatura (candidatura_id, etapa_de, etapa_para, ator, criado_em) VALUES
    ('34010034-0000-4000-8000-000000000d02', 'inscricao'::public.etapa_processo, 'inscricao'::public.etapa_processo, NULL, now() - interval '5 days');

  -- D (human drop at triagem, vaga b03)
  INSERT INTO public.candidaturas (id, candidato_id, vaga_id, status, etapa_atual, data_candidatura) VALUES
    ('34010034-0000-4000-8000-000000000d03', v_cand, '34010034-0000-4000-8000-000000000b03','aguardando_resposta'::public.status_candidatura,'rejeitado'::public.etapa_processo, now() - interval '8 days');
  INSERT INTO public.historico_candidatura (candidatura_id, etapa_de, etapa_para, ator, criado_em) VALUES
    ('34010034-0000-4000-8000-000000000d03', NULL, 'inscricao'::public.etapa_processo, NULL, now() - interval '8 days'),
    ('34010034-0000-4000-8000-000000000d03', 'inscricao'::public.etapa_processo, 'triagem'::public.etapa_processo, NULL, now() - interval '7 days'),
    ('34010034-0000-4000-8000-000000000d03', 'triagem'::public.etapa_processo, 'rejeitado'::public.etapa_processo, NULL, now() - interval '6 days');

  -- N (non-terminal, entrevista_online, vaga b04): the v_fila_trabalho row + the 2 agendamentos
  INSERT INTO public.candidaturas (id, candidato_id, vaga_id, status, etapa_atual, data_candidatura) VALUES
    ('34010034-0000-4000-8000-000000000d04', v_cand, '34010034-0000-4000-8000-000000000b04','aguardando_resposta'::public.status_candidatura,'entrevista_online'::public.etapa_processo, now() - interval '4 days');
  INSERT INTO public.historico_candidatura (candidatura_id, etapa_de, etapa_para, ator, criado_em) VALUES
    ('34010034-0000-4000-8000-000000000d04', NULL, 'inscricao'::public.etapa_processo, NULL, now() - interval '4 days'),
    ('34010034-0000-4000-8000-000000000d04', 'inscricao'::public.etapa_processo, 'triagem'::public.etapa_processo, NULL, now() - interval '3 days'),
    ('34010034-0000-4000-8000-000000000d04', 'avaliacao_assincrona'::public.etapa_processo, 'entrevista_online'::public.etapa_processo, NULL, now() - interval '1 day');
  INSERT INTO public.agendamentos_entrevista (id, candidatura_id, vaga_id, tipo, data_hora, compareceu) VALUES
    ('34010034-0000-4000-8000-000000000e01','34010034-0000-4000-8000-000000000d04','34010034-0000-4000-8000-000000000b04','online'::public.tipo_entrevista_avaliacao, now() - interval '2 days', false),
    ('34010034-0000-4000-8000-000000000e02','34010034-0000-4000-8000-000000000d04','34010034-0000-4000-8000-000000000b04','presencial'::public.tipo_entrevista_avaliacao, now() + interval '2 days', NULL);

  PERFORM set_config('smoke.recruiterA', v_recA::text, false);
  PERFORM set_config('smoke.recruiterB', v_recB::text, false);
  PERFORM set_config('smoke.admin',      v_admin::text, false);
  PERFORM set_config('smoke.ready',      'y', false);
  RAISE NOTICE 'SEG-34 fixture built (recA % · recB % · 4 candidaturas on 4 B-vagas)', v_recA, v_recB;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke.ready','n',false);
  RAISE NOTICE 'SEG-34 SKIP: fixture error %: %', SQLSTATE, SQLERRM;
END $$;

-- (a) existing keys preserved + (b) 4 new keys + (c) time_to_hire + (d) knockout + (e) drop — recruiter B
SET ROLE authenticated;
DO $$
DECLARE r jsonb;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    PERFORM set_config('smoke34.a','SKIP',false); PERFORM set_config('smoke34.b','SKIP',false);
    PERFORM set_config('smoke34.c','SKIP',false); PERFORM set_config('smoke34.d','SKIP',false);
    PERFORM set_config('smoke34.e','SKIP',false); RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterB'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  r := public.funil_kpis();
  IF (r -> 'volume_by_stage') = '{}'::jsonb OR (r -> 'median_time_per_stage') IS NULL OR (r -> 'conversion_stage_to_stage') = '[]'::jsonb
     OR NOT (r ? 'median_time_per_stage' AND r ? 'conversion_stage_to_stage' AND r ? 'volume_by_stage') THEN
    PERFORM set_config('smoke34.a', 'FAIL: existing key dropped/empty: '||r::text, false);
  ELSE PERFORM set_config('smoke34.a','PASS',false); END IF;
  IF r ? 'time_to_hire' AND r ? 'knockout_rate' AND r ? 'drop_per_stage' AND r ? 'no_show_rate'
  THEN PERFORM set_config('smoke34.b','PASS',false);
  ELSE PERFORM set_config('smoke34.b','FAIL: missing new key: '||r::text,false); END IF;
  IF (r ->> 'time_to_hire') IS NOT NULL AND (r ->> 'time_to_hire')::bigint > 0
  THEN PERFORM set_config('smoke34.c','PASS',false);
  ELSE PERFORM set_config('smoke34.c','FAIL: time_to_hire='||COALESCE(r->>'time_to_hire','null'),false); END IF;
  IF (r -> 'knockout_rate' ->> 'knockouts')::int >= 1 AND (r -> 'knockout_rate' ->> 'taxa')::numeric BETWEEN 0 AND 1
  THEN PERFORM set_config('smoke34.d','PASS',false);
  ELSE PERFORM set_config('smoke34.d','FAIL: knockout_rate='||(r->'knockout_rate')::text,false); END IF;
  IF (r -> 'drop_per_stage' -> 'triagem' ->> 'dropped')::int >= 1
     AND COALESCE((r -> 'drop_per_stage' -> 'inscricao' ->> 'dropped')::int, 0) = 0
  THEN PERFORM set_config('smoke34.e','PASS',false);
  ELSE PERFORM set_config('smoke34.e','FAIL: drop_per_stage='||(r->'drop_per_stage')::text,false); END IF;
END $$;

-- (f) no_show — recruiter B total>=1 & taxa not null; recruiter A empty vaga taxa null
SET ROLE authenticated;
DO $$
DECLARE rb jsonb; ra jsonb;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN PERFORM set_config('smoke34.f','SKIP',false); RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterB'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  rb := public.funil_kpis();
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterA'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  ra := public.funil_kpis();
  IF (rb -> 'no_show_rate' ->> 'total')::int >= 1 AND (rb -> 'no_show_rate' ->> 'taxa') IS NOT NULL
     AND (ra -> 'no_show_rate' ->> 'taxa') IS NULL
  THEN PERFORM set_config('smoke34.f','PASS',false);
  ELSE PERFORM set_config('smoke34.f','FAIL: B.ns='||(rb->'no_show_rate')::text||' A.ns='||(ra->'no_show_rate')::text,false); END IF;
END $$;

-- (g) vaga-scope + PII-free
SET ROLE authenticated;
DO $$
DECLARE ra jsonb; rb jsonb;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN PERFORM set_config('smoke34.g','SKIP',false); RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterA'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  ra := public.funil_kpis();
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterB'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  rb := public.funil_kpis();
  IF (ra -> 'volume_by_stage') <> '{}'::jsonb OR (ra -> 'knockout_rate' ->> 'total')::int <> 0 THEN
    PERFORM set_config('smoke34.g','FAIL: recruiter A saw vaga-B numbers: '||ra::text,false);
  ELSIF rb::text ~* '"(ator|candidato_id|candidatura_id|candidato|nome|email|cpf|user_id)"[[:space:]]*:' THEN
    PERFORM set_config('smoke34.g','FAIL: PII key in funil_kpis output: '||rb::text,false);
  ELSE PERFORM set_config('smoke34.g','PASS',false); END IF;
END $$;

-- (h) v_fila_trabalho isolation + entrou_etapa_em
SET ROLE authenticated;
DO $$
DECLARE v_a integer; v_b integer; v_entrou timestamptz;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN PERFORM set_config('smoke34.h','SKIP',false); RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterA'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  SELECT count(*) INTO v_a FROM public.v_fila_trabalho WHERE candidatura_id::text LIKE '34010034-%';
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterB'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  SELECT count(*), max(entrou_etapa_em) INTO v_b, v_entrou FROM public.v_fila_trabalho WHERE candidatura_id = '34010034-0000-4000-8000-000000000d04';
  IF v_a <> 0 THEN PERFORM set_config('smoke34.h','FAIL: recruiter A saw '||v_a||' vaga-B fila rows',false);
  ELSIF v_b < 1 OR v_entrou IS NULL THEN PERFORM set_config('smoke34.h','FAIL: recruiter B fila count='||v_b||' entrou='||COALESCE(v_entrou::text,'null'),false);
  ELSE PERFORM set_config('smoke34.h','PASS',false); END IF;
END $$;

-- CLEANUP — ROLLBACK-free, disposable 34010034-* only
SELECT set_config('request.jwt.claims','',false);
RESET ROLE;
DELETE FROM public.agendamentos_entrevista WHERE id::text LIKE '34010034-%';
DELETE FROM public.historico_candidatura WHERE candidatura_id::text LIKE '34010034-%';
DELETE FROM public.candidaturas WHERE id::text LIKE '34010034-%';
DELETE FROM public.vagas WHERE id::text LIKE '34010034-%';
SELECT set_config('smoke.ready','',false);

-- FINAL result set (machine gate): every column must read PASS.
SELECT current_setting('smoke34.a', true) AS a, current_setting('smoke34.b', true) AS b,
       current_setting('smoke34.c', true) AS c, current_setting('smoke34.d', true) AS d,
       current_setting('smoke34.e', true) AS e, current_setting('smoke34.f', true) AS f,
       current_setting('smoke34.g', true) AS g, current_setting('smoke34.h', true) AS h;
