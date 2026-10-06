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
--   (f) no_show_rate: recruiter B total>=1 + taxa NOT null; funil_kpis(p_vaga_id => vagaA) (the EMPTY vaga) taxa IS
--       null (0-row CASE guard); recruiter A's no_show_rate of vaga b04 = the administrador's, with total>=1.
--   (g) Phase 50 PAIR + PII-free: recruiter A (ACTIVE, authors only the empty vagaA) sees, for each of b01..b04,
--       funil_kpis(p_vaga_id => b0x) EQUAL to the administrador's, and funil_kpis() equal to the administrador's;
--       the STALE TOKEN (claim rh + an INACTIVE recrutador row, read at run time) gets EMPTY KPIs with and without
--       p_vaga_id; neither A's nor B's output carries a candidate-identity key.
--   (h) v_fila_trabalho: recruiter A (active, non-author) sees B's non-terminal candidatura w/ entrou_etapa_em set;
--       recruiter B still sees it; the stale token sees 0 rows of the fixture.
--
-- PHASE 50 / D-01, D-02 (operator, 2026-10-04/05). Until Phase 49, (f)/(g)/(h) required recruiter A to see NOTHING
--   of vaga B (vaga scope by vagas.created_by). D-01: an ACTIVE recrutador sees every vaga and what hangs from it;
--   D-02: the live helper public.is_active_rh_user() is the only scope, so a deactivated recrutador with a still-valid
--   token sees nothing. Actors are read from usuarios_rh at run time — no rh impersonation takes its sub from
--   vagas.created_by (A/B are 0-vaga active rows; the stale token is `role = 'recrutador' AND NOT ativo`).
--   GATE (Phase 50): the final DO block RAISEs unless a–h all read PASS — the result-set SELECT alone is invisible
--   inside the aborting envelope (the sentinel aborts the request), and a SKIP/FAIL in a set_config would read green.
--   RUN only through the aborting envelope: `node scripts/p50_ensaio.cjs supabase/tests/funil34_kpis_smokes.sql`
--   (before the 50-10 apply it prefixes 20261005000002..4; after it, `--sem-migracoes`). Red without
--   20261005000003 (A's vaga-B numbers stay empty), green with it.
--
-- FIXTURE (disposable 34010034-*, ROLLBACK-free — real rows NEVER deleted):
--   2 distinct REAL 0-vaga ACTIVE usuarios_rh (recruiter A/B — vagas.created_by HAS FK, no synthetic UUIDs) +
--   a 3rd usuarios_rh (admin — impersonated with the administrador claim, the reference of (f)/(g)) + an INACTIVE
--   recrutador (the stale token, Phase 50) + a REAL FK-bound candidato. vagaA(recA, EMPTY) · FOUR recruiter-B vagas
--   (b01..b04 — distinct because candidaturas_candidato_vaga_unique_idx forbids one candidato twice on one vaga):
--   b01→H(hired→aprovado) · b02→K(knockout) · b03→D(drop triagem→rejeitado) · b04→N(entrevista_online + 2 agendamentos).
-- =============================================================================

RESET ROLE;
SELECT set_config('smoke34.a','',false), set_config('smoke34.b','',false), set_config('smoke34.c','',false),
       set_config('smoke34.d','',false), set_config('smoke34.e','',false), set_config('smoke34.f','',false),
       set_config('smoke34.g','',false), set_config('smoke34.h','',false);

DO $$
DECLARE v_cand uuid; v_cand_user uuid; v_recA uuid; v_recB uuid; v_admin uuid; v_velho uuid;
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
  -- Phase 50 / D-02: the stale token — an INACTIVE recrutador row, read at run time.
  SELECT user_id INTO v_velho FROM public.usuarios_rh u WHERE user_id IS NOT NULL AND u.role = 'recrutador' AND NOT u.ativo
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.user_id) ORDER BY user_id LIMIT 1;

  IF v_cand IS NULL OR v_cand_user IS NULL OR v_recA IS NULL OR v_recB IS NULL OR v_admin IS NULL OR v_velho IS NULL THEN
    PERFORM set_config('smoke.ready','n',false);
    RAISE NOTICE 'SEG-34 SKIP: cand=% recA=% recB=% admin=% velho=%', v_cand, v_recA, v_recB, v_admin, v_velho; RETURN;
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
  -- 20260921000003 (Phase 48 / JORN-D5): local_ou_link passou a ser obrigatório na escrita
  -- (link http(s) no online, endereço no presencial) — sem ele o BEFORE trigger recusa e a
  -- fixture cairia no SKIP silencioso do EXCEPTION WHEN OTHERS abaixo.
  INSERT INTO public.agendamentos_entrevista (id, candidatura_id, vaga_id, tipo, data_hora, compareceu, local_ou_link) VALUES
    ('34010034-0000-4000-8000-000000000e01','34010034-0000-4000-8000-000000000d04','34010034-0000-4000-8000-000000000b04','online'::public.tipo_entrevista_avaliacao, now() - interval '2 days', false, 'https://meet.example.com/smoke34'),
    ('34010034-0000-4000-8000-000000000e02','34010034-0000-4000-8000-000000000d04','34010034-0000-4000-8000-000000000b04','presencial'::public.tipo_entrevista_avaliacao, now() + interval '2 days', NULL, 'Rua do Smoke, 34 - sala 1');

  PERFORM set_config('smoke.recruiterA', v_recA::text, false);
  PERFORM set_config('smoke.recruiterB', v_recB::text, false);
  PERFORM set_config('smoke.admin',      v_admin::text, false);
  PERFORM set_config('smoke.velho',      v_velho::text, false);
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

-- (f) no_show — recruiter B total>=1 & taxa not null; the EMPTY vagaA (p_vaga_id) taxa null (0-row CASE
--     guard); Phase 50: recruiter A's no_show of vaga b04 = the administrador's, total>=1.
SET ROLE authenticated;
DO $$
DECLARE rb jsonb; ra_a jsonb; ra_b4 jsonb; radm_b4 jsonb;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN PERFORM set_config('smoke34.f','SKIP',false); RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.admin'),'role','authenticated','app_metadata', jsonb_build_object('role','administrador'))::text, false);
  radm_b4 := public.funil_kpis('34010034-0000-4000-8000-000000000b04'::uuid);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterB'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  rb := public.funil_kpis();
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterA'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  ra_a  := public.funil_kpis('34010034-0000-4000-8000-000000000a01'::uuid);
  ra_b4 := public.funil_kpis('34010034-0000-4000-8000-000000000b04'::uuid);
  IF NOT ((rb -> 'no_show_rate' ->> 'total')::int >= 1 AND (rb -> 'no_show_rate' ->> 'taxa') IS NOT NULL) THEN
    PERFORM set_config('smoke34.f','FAIL: B.ns='||coalesce((rb->'no_show_rate')::text,'null'),false);
  ELSIF (ra_a -> 'no_show_rate' ->> 'taxa') IS NOT NULL THEN
    PERFORM set_config('smoke34.f','FAIL: empty vagaA taxa not null (0-row CASE guard): '||coalesce((ra_a->'no_show_rate')::text,'null'),false);
  ELSIF coalesce((ra_b4 -> 'no_show_rate' ->> 'total')::int, 0) < 1
     OR (ra_b4 -> 'no_show_rate') IS DISTINCT FROM (radm_b4 -> 'no_show_rate') THEN
    PERFORM set_config('smoke34.f','FAIL: recruiter A (ativo, nao-autor) no_show de b04 difere do administrador — D-01 nao vale: A='||coalesce((ra_b4->'no_show_rate')::text,'null')||' admin='||coalesce((radm_b4->'no_show_rate')::text,'null'),false);
  ELSE PERFORM set_config('smoke34.f','PASS',false); END IF;
END $$;

-- (g) Phase 50 pair + PII-free — A (active, non-author) = administrador per B vaga and unfiltered; stale token
--     → EMPTY KPIs (with and without p_vaga_id); no candidate-identity key in A's or B's output.
SET ROLE authenticated;
DO $$
DECLARE ra jsonb; rb jsonb; radm jsonb; ra_t jsonb; radm_t jsonb; rv jsonb; v_vaga text; v_falha text;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN PERFORM set_config('smoke34.g','SKIP',false); RETURN; END IF;
  FOREACH v_vaga IN ARRAY ARRAY['34010034-0000-4000-8000-000000000b01','34010034-0000-4000-8000-000000000b02',
                                '34010034-0000-4000-8000-000000000b03','34010034-0000-4000-8000-000000000b04'] LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.admin'),'role','authenticated','app_metadata', jsonb_build_object('role','administrador'))::text, false);
    radm := public.funil_kpis(v_vaga::uuid);
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterA'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
    ra := public.funil_kpis(v_vaga::uuid);
    IF (radm -> 'volume_by_stage') = '{}'::jsonb THEN
      v_falha := coalesce(v_falha, 'FAIL: administrador funil_kpis('||v_vaga||') vazio — a populacao do par nao existe'); END IF;
    IF ra IS DISTINCT FROM radm THEN
      v_falha := coalesce(v_falha, 'FAIL: recruiter A (ativo, nao-autor) funil_kpis('||v_vaga||') difere do administrador — D-01 nao vale: A='||ra::text||' admin='||radm::text); END IF;
    IF ra::text ~* '"(ator|candidato_id|candidatura_id|candidato|nome|email|cpf|user_id)"[[:space:]]*:' THEN
      v_falha := coalesce(v_falha, 'FAIL: PII key in recruiter A funil_kpis output: '||ra::text); END IF;
  END LOOP;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.admin'),'role','authenticated','app_metadata', jsonb_build_object('role','administrador'))::text, false);
  radm_t := public.funil_kpis();
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterA'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  ra_t := public.funil_kpis();
  IF ra_t IS DISTINCT FROM radm_t THEN
    v_falha := coalesce(v_falha, 'FAIL: recruiter A funil_kpis() difere do administrador: A='||ra_t::text||' admin='||radm_t::text); END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterB'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  rb := public.funil_kpis();
  IF rb::text ~* '"(ator|candidato_id|candidatura_id|candidato|nome|email|cpf|user_id)"[[:space:]]*:' THEN
    v_falha := coalesce(v_falha, 'FAIL: PII key in funil_kpis output: '||rb::text); END IF;
  -- negativo: token velho (claim rh + recrutador INATIVO) → KPIs vazios, com e sem p_vaga_id
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.velho'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  FOREACH v_vaga IN ARRAY ARRAY['34010034-0000-4000-8000-000000000b01', 'todas'] LOOP
    rv := CASE v_vaga WHEN 'todas' THEN public.funil_kpis() ELSE public.funil_kpis(v_vaga::uuid) END;
    IF (rv -> 'volume_by_stage') IS DISTINCT FROM '{}'::jsonb
       OR (rv -> 'median_time_per_stage') IS DISTINCT FROM '{}'::jsonb
       OR (rv -> 'conversion_stage_to_stage') IS DISTINCT FROM '[]'::jsonb
       OR coalesce((rv -> 'knockout_rate' ->> 'total')::int, 0) <> 0 THEN
      v_falha := coalesce(v_falha, 'FAIL: token velho (recrutador INATIVO) recebeu KPIs nao vazios em funil_kpis('||v_vaga||') — D-02 nao vale: '||rv::text); END IF;
  END LOOP;
  PERFORM set_config('smoke34.g', coalesce(v_falha, 'PASS'), false);
END $$;

-- (h) v_fila_trabalho — Phase 50: recruiter A (active, non-author) sees B's non-terminal candidatura with
--     entrou_etapa_em set; recruiter B still sees it; the stale token sees 0 fixture rows.
SET ROLE authenticated;
DO $$
DECLARE v_a integer; v_a_entrou timestamptz; v_b integer; v_entrou timestamptz; v_v integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN PERFORM set_config('smoke34.h','SKIP',false); RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterA'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  SELECT count(*), max(entrou_etapa_em) INTO v_a, v_a_entrou FROM public.v_fila_trabalho WHERE candidatura_id = '34010034-0000-4000-8000-000000000d04';
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterB'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  SELECT count(*), max(entrou_etapa_em) INTO v_b, v_entrou FROM public.v_fila_trabalho WHERE candidatura_id = '34010034-0000-4000-8000-000000000d04';
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.velho'),'role','authenticated','app_metadata', jsonb_build_object('role','rh'))::text, false);
  SELECT count(*) INTO v_v FROM public.v_fila_trabalho WHERE candidatura_id::text LIKE '34010034-%';
  IF v_a < 1 OR v_a_entrou IS NULL THEN PERFORM set_config('smoke34.h','FAIL: recruiter A (ativo, nao-autor) fila count='||v_a||' entrou='||COALESCE(v_a_entrou::text,'null')||' — D-01 nao vale',false);
  ELSIF v_b < 1 OR v_entrou IS NULL THEN PERFORM set_config('smoke34.h','FAIL: recruiter B fila count='||v_b||' entrou='||COALESCE(v_entrou::text,'null'),false);
  ELSIF v_v <> 0 THEN PERFORM set_config('smoke34.h','FAIL: token velho (recrutador INATIVO) saw '||v_v||' fixture fila rows — D-02 nao vale',false);
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

-- GATE (Phase 50) — the result set above is invisible inside the aborting envelope (and to any batch whose last
-- statement errors): RAISE unless every column reads PASS. A SKIP (fixture not built) fails here too.
RESET ROLE;
DO $$
DECLARE v_l text; v_falhas text;
BEGIN
  FOREACH v_l IN ARRAY ARRAY['a','b','c','d','e','f','g','h'] LOOP
    IF current_setting('smoke34.' || v_l, true) IS DISTINCT FROM 'PASS' THEN
      v_falhas := concat_ws(' | ', v_falhas, v_l || '=' || coalesce(nullif(current_setting('smoke34.' || v_l, true), ''), '(vazio)'));
    END IF;
  END LOOP;
  IF v_falhas IS NOT NULL THEN
    RAISE EXCEPTION 'SEG-34 FAIL (gate): %', left(v_falhas, 1500);
  END IF;
  RAISE NOTICE 'PASS (gate): a–h all PASS';
END $$;
