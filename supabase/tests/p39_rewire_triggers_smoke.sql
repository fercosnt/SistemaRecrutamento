-- =============================================================================
-- Phase 39 / Plano 39-03 — smoke do rewire de triggers + aposentadoria do n8n
-- (DISPATCH-01 · DISPATCH-02 · DISPATCH-03 · DISPATCH-04)
-- =============================================================================
-- O gate de aceitação da fase de MAIOR RISCO. Rodar via Supabase MCP `execute_sql`
-- (ou psql num Postgres descartável) DEPOIS que o Plano 39-04 aplicar a migration
-- `20260726000001_p39_rewire_triggers_aposenta_n8n.sql`. RED até lá — os 3
-- `trg_notif_*` precisam existir para as asserções estruturais resolverem.
--
-- Um schema pode ter a FORMA certa e vazar no COMPORTAMENTO. Este smoke prova:
--   • ESTRUTURALMENTE (via pg_get_functiondef — SEM INSERT, SEGURO EM PROD VIVO):
--       os predicados, o body ids-only, o header Bearer self-auth e o fail-open.
--   • Por CATÁLOGO (SEM INSERT): a aposentadoria do n8n (0 trg_n8n_*) e os 3 novos.
--   • COMPORTAMENTALMENTE (fixture descartável — SÓ quando o Vault está AUSENTE):
--       graceful-skip / fail-open (o funil avança sem a EF/secret) e o survivor-guard.
--
-- GATE VERDE = a contagem AUTO-EXIGIDA `smoke39.pass` bate no RESUMO (z). NÃO é
-- "não levantou exceção" (um run todo-SKIP mascara falha). Cada asserção incrementa
-- o GUC; o RESUMO levanta exceção se o total ≠ o esperado.
--
-- ⚠ CONTAGEM ADAPTATIVA AO AMBIENTE:
--   • estruturais + catálogo (a..f) = 6 asserções — SEMPRE rodam (pós-apply).
--   • comportamentais (g,h,i) = 3 asserções — rodam SÓ com o Vault AUSENTE
--     (Postgres descartável). Em PROD o Vault está SETADO (project_url +
--     edge_invoke_key), então a metade comportamental faz SKIP-com-NOTICE para
--     NÃO disparar e-mail real por fixture, e o RESUMO espera 6 (não 9).
--   O GUC `smoke39.behavioral` ('y'/'n') registra qual caminho; o RESUMO usa
--   esperado = 6 + (behavioral='y' ? 3 : 0). Ambos os caminhos são um gate honesto.
--
-- ⚠ O QUE ESTE SMOKE NÃO PROVA (delegado ao 39-04 Task 3, exige EF viva + secret):
--   a prova ponta-a-ponta do dispatch REAL por evento em `net._http_response`, e a
--   decisão-só-humana via impersonação de RH (auto_rejeitado=false → dispara decisao).
--   Aqui a decisão-só-humana é coberta ESTRUTURALMENTE por (a) (`auto_rejeitado = false`).
--
-- FIXTURE comportamental (descartável, namespace 39010039-*, ROLLBACK-free — linhas
--   REAIS nunca são apagadas): candidato REAL (resolvido por e-mail, fallback logado)
--   + usuarios_rh REAL (vagas.created_by TEM FK — P32 Pitfall 4) + vaga/candidaturas/
--   historico/agendamento descartáveis. Destinatário sintético, nunca PII de pessoa real.
--
-- HIGIENE: RESET ROLE nas trocas de identidade; NOTICEs carregam contagens/booleanos,
--   nunca e-mail real. Namespace de UUID 39010039-* → setup e cleanup idempotentes.
-- =============================================================================

RESET ROLE;
-- Inicializa os contadores/flags (idempotente entre runs).
SELECT set_config('smoke39.pass', '0', false);
SELECT set_config('smoke39.behavioral', 'n', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) DISPATCH-01 — trg_notif_transicao: mapeamento evento→fonte + decisão-só-humana.
--     pg_get_functiondef contém avaliacao_assincrona (avanço) E aprovado/rejeitado +
--     auto_rejeitado = false (decisão humana). SEM INSERT — seguro em PROD vivo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.trg_notif_transicao()'::regprocedure);
  IF strpos(v_def, 'avaliacao_assincrona') = 0 THEN
    RAISE EXCEPTION 'P39 FAIL (a): trg_notif_transicao não ramifica em avaliacao_assincrona — o avanço não seria disparado';
  END IF;
  IF strpos(v_def, 'aprovado') = 0 OR strpos(v_def, 'rejeitado') = 0 THEN
    RAISE EXCEPTION 'P39 FAIL (a): trg_notif_transicao não cobre aprovado/rejeitado — o ramo de decisão está incompleto';
  END IF;
  IF strpos(v_def, 'auto_rejeitado = false') = 0 THEN
    RAISE EXCEPTION 'P39 FAIL (a): trg_notif_transicao não exige auto_rejeitado = false — auto-rejeição dispararia e-mail de decisão (RNF-07a)';
  END IF;
  PERFORM set_config('smoke39.pass', (coalesce(nullif(current_setting('smoke39.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): trg_notif_transicao — avanço só em avaliacao_assincrona, decisão só humana (aprovado/rejeitado + auto_rejeitado=false)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (b) DISPATCH-02 — trg_notif_confirmacao: survivor-guard estrutural.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.trg_notif_confirmacao()'::regprocedure);
  IF strpos(v_def, 'opcao_knockout_id IS NOT NULL') = 0 THEN
    RAISE EXCEPTION 'P39 FAIL (b): trg_notif_confirmacao não tem o survivor-guard opcao_knockout_id IS NOT NULL — knockout receberia confirmação (D-03/D-05)';
  END IF;
  IF strpos(v_def, 'rejeitado') = 0 THEN
    RAISE EXCEPTION 'P39 FAIL (b): trg_notif_confirmacao não checa status rejeitado no survivor-guard';
  END IF;
  PERFORM set_config('smoke39.pass', (coalesce(nullif(current_setting('smoke39.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (b): trg_notif_confirmacao carrega o survivor-guard (status rejeitado OR opcao_knockout_id IS NOT NULL)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (c) DISPATCH-02/D-04 — trg_notif_convite: body carrega agendamento_id (a EF exige).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.trg_notif_convite()'::regprocedure);
  IF strpos(v_def, 'agendamento_id') = 0 THEN
    RAISE EXCEPTION 'P39 FAIL (c): trg_notif_convite não carrega agendamento_id no body — a EF do convite (index.ts:107-113) exige agendamento_id';
  END IF;
  PERFORM set_config('smoke39.pass', (coalesce(nullif(current_setting('smoke39.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (c): trg_notif_convite carrega agendamento_id no body';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (d) DISPATCH-04 — body ids-only: NENHUM dos 3 corpos referencia coluna de PII.
--     O body só usa evento/candidatura_id/agendamento_id. Checagem case-insensitive.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_fn   text;
  v_def  text;
  v_pii  text;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY[
    'public.trg_notif_transicao()',
    'public.trg_notif_confirmacao()',
    'public.trg_notif_convite()'
  ] LOOP
    v_def := lower(pg_get_functiondef(v_fn::regprocedure));
    FOREACH v_pii IN ARRAY ARRAY['nome', 'email', 'cpf', 'telefone'] LOOP
      IF strpos(v_def, v_pii) > 0 THEN
        RAISE EXCEPTION 'P39 FAIL (d): % contém a substring PII "%" no corpo — o payload ids-only vazaria dado pessoal (DISPATCH-04)', v_fn, v_pii;
      END IF;
    END LOOP;
  END LOOP;
  PERFORM set_config('smoke39.pass', (coalesce(nullif(current_setting('smoke39.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (d): os 3 trg_notif_* têm body ids-only — nenhum nome/email/cpf/telefone no corpo';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (e) DISPATCH-04 hardening — os 3 são SECURITY DEFINER, search_path='', Bearer
--     self-auth do Vault e fail-open (EXCEPTION WHEN OTHERS).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_fn text; v_def text;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY[
    'public.trg_notif_transicao()',
    'public.trg_notif_confirmacao()',
    'public.trg_notif_convite()'
  ] LOOP
    v_def := pg_get_functiondef(v_fn::regprocedure);
    IF strpos(v_def, 'SECURITY DEFINER') = 0 THEN
      RAISE EXCEPTION 'P39 FAIL (e): % não é SECURITY DEFINER', v_fn;
    END IF;
    -- pg_get_functiondef renderiza `SET search_path = ''` como `SET search_path TO ''`
    -- (confirmado em PG17). Aceita ambas as formas via chr(39) (evita bug de escape de aspas).
    IF strpos(v_def, 'search_path TO ' || chr(39) || chr(39)) = 0
       AND strpos(v_def, 'search_path = ' || chr(39) || chr(39)) = 0 THEN
      RAISE EXCEPTION 'P39 FAIL (e): % nao fixa search_path vazio (EoP via objeto homonimo)', v_fn;
    END IF;
    IF strpos(v_def, 'Bearer '' || v_invoke_key') = 0 THEN
      RAISE EXCEPTION 'P39 FAIL (e): % não usa o header Bearer self-auth do Vault', v_fn;
    END IF;
    IF strpos(v_def, 'EXCEPTION WHEN OTHERS') = 0 THEN
      RAISE EXCEPTION 'P39 FAIL (e): % não tem o wrapper fail-open EXCEPTION WHEN OTHERS — uma falha de dispatch reverteria o funil', v_fn;
    END IF;
  END LOOP;
  PERFORM set_config('smoke39.pass', (coalesce(nullif(current_setting('smoke39.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (e): os 3 trg_notif_* são SECURITY DEFINER + search_path='''' + Bearer self-auth + fail-open';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (f) DISPATCH-03 catálogo — n8n APOSENTADO (0 trg_n8n_* trigger e função) e
--     EXATAMENTE 3 trg_notif_* triggers. SEM INSERT — seguro em PROD vivo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_n8n_trg int; v_n8n_fn int; v_notif_trg int;
BEGIN
  -- NB: em LIKE, '_' é curinga de 1 caractere. Escapar (\_) para casar underscore LITERAL —
  -- senão 'trg_notif_%' também casaria o touch trigger trg_notificacoes_atualizado_em (P37),
  -- inflando a contagem para 4 e reprovando (f) por FALSO-NEGATIVO. O escape mantém a
  -- propriedade "exatamente 3 dispatch + nenhum inesperado". (Confirmado ao vivo P39-04.)
  SELECT count(*) INTO v_n8n_trg FROM pg_trigger WHERE tgname LIKE 'trg\_n8n\_%' AND NOT tgisinternal;
  SELECT count(*) INTO v_n8n_fn  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'trg\_n8n\_%';
  SELECT count(*) INTO v_notif_trg FROM pg_trigger WHERE tgname LIKE 'trg\_notif\_%' AND NOT tgisinternal;

  IF v_n8n_trg <> 0 THEN
    RAISE EXCEPTION 'P39 FAIL (f): ainda existem % trigger(s) trg_n8n_* — n8n não foi aposentado (superfície de double-send viva)', v_n8n_trg;
  END IF;
  IF v_n8n_fn <> 0 THEN
    RAISE EXCEPTION 'P39 FAIL (f): ainda existem % função(ões) trg_n8n_* — o DROP FUNCTION não fechou', v_n8n_fn;
  END IF;
  IF v_notif_trg <> 3 THEN
    RAISE EXCEPTION 'P39 FAIL (f): há % trigger(s) trg_notif_* (esperado 3) — a nova topologia está incompleta', v_notif_trg;
  END IF;

  PERFORM set_config('smoke39.pass', (coalesce(nullif(current_setting('smoke39.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (f): 0 trg_n8n_* (trigger+função) e exatamente 3 trg_notif_* — n8n aposentado por substituição';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP COMPORTAMENTAL — precondição de segredo + fixture descartável (RLS bypass).
--   Se o Vault tiver project_url + edge_invoke_key SETADOS (o caso em PROD), TODA a
--   metade comportamental faz SKIP para NÃO disparar e-mail real por fixture. Só roda
--   quando o Vault está ausente/ilegível (Postgres descartável) — o caminho graceful-skip.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_secret_set boolean := false;
  v_cand uuid; v_cand_user uuid; v_rec uuid;
BEGIN
  -- Idempotente: limpa qualquer fixture anterior (namespace 39010039-*).
  DELETE FROM public.agendamentos_entrevista WHERE id = '39010039-0000-4000-8000-0000000000f1';
  DELETE FROM public.historico_candidatura   WHERE id = '39010039-0000-4000-8000-0000000000e1';
  DELETE FROM public.candidaturas WHERE id IN (
    '39010039-0000-4000-8000-0000000000d1', '39010039-0000-4000-8000-0000000000d2');
  DELETE FROM public.vagas WHERE id = '39010039-0000-4000-8000-0000000000a1';

  -- Precondição: Vault setado → SKIP comportamental (evita dispatch real em PROD).
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url'      AND decrypted_secret IS NOT NULL
    ) AND EXISTS (
      SELECT 1 FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key' AND decrypted_secret IS NOT NULL
    ) INTO v_secret_set;
  EXCEPTION WHEN OTHERS THEN
    v_secret_set := false;  -- role não lê o Vault → tratar como ausente (Postgres descartável)
  END;

  IF v_secret_set THEN
    PERFORM set_config('smoke39.behavioral', 'n', false);
    RAISE NOTICE 'P39 SKIP (comportamental): Vault SETADO (project_url + edge_invoke_key) — graceful-skip não é o caminho vivo; pulando para não disparar e-mail real. Prova ponta-a-ponta = 39-04 Task 3.';
    RETURN;
  END IF;

  -- Vault ausente → construir a fixture descartável. Resolve candidato + usuarios_rh REAIS.
  SELECT id, user_id INTO v_cand, v_cand_user
    FROM public.candidatos WHERE user_id IS NOT NULL ORDER BY id LIMIT 1;
  SELECT user_id INTO v_rec FROM public.usuarios_rh
    WHERE user_id IS NOT NULL AND deleted_at IS NULL ORDER BY user_id LIMIT 1;
  IF v_cand IS NULL OR v_rec IS NULL THEN
    PERFORM set_config('smoke39.behavioral', 'n', false);
    RAISE NOTICE 'P39 SKIP (comportamental): sem candidato/usuarios_rh reais para a fixture (cand=% rec=%)', v_cand IS NOT NULL, v_rec IS NOT NULL;
    RETURN;
  END IF;

  INSERT INTO public.vagas (id, titulo, slug, status, created_by)
  VALUES ('39010039-0000-4000-8000-0000000000a1', '[SMOKE 39] Vaga', 'smoke-39-vaga',
          'ativa'::public.status_vaga, v_rec);

  PERFORM set_config('smoke39.cand',  v_cand::text, false);
  PERFORM set_config('smoke39.behavioral', 'y', false);
  RAISE NOTICE 'P39 fixture comportamental construída (Vault ausente — caminho graceful-skip)';
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke39.behavioral', 'n', false);
  RAISE NOTICE 'P39 SKIP (comportamental): fixture não pôde ser construída (%: %) — só a metade estrutural conta', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (g) invariante 3 — graceful-skip/fail-open: INSERT de candidatura SURVIVOR commita
--     com o Vault ausente (o trigger faz RETURN NEW; se levantasse, o INSERT abortaria).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE n int;
BEGIN
  IF current_setting('smoke39.behavioral', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P39 SKIP (g graceful-skip)'; RETURN; END IF;
  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, status, etapa_atual, data_candidatura)
  VALUES ('39010039-0000-4000-8000-0000000000d1', current_setting('smoke39.cand')::uuid,
     '39010039-0000-4000-8000-0000000000a1', 'aguardando_resposta'::public.status_candidatura,
     'triagem'::public.etapa_processo, now());
  SELECT count(*) INTO n FROM public.candidaturas WHERE id = '39010039-0000-4000-8000-0000000000d1';
  IF n <> 1 THEN
    RAISE EXCEPTION 'P39 FAIL (g): a candidatura survivor não commitou — trg_notif_confirmacao abortou o INSERT (graceful-skip/fail-open quebrado)';
  END IF;
  PERFORM set_config('smoke39.pass', (coalesce(nullif(current_setting('smoke39.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (g): candidatura survivor INSERT commitou com o Vault ausente — o funil avança sem a EF/secret (graceful-skip + fail-open)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (h) invariante 5 — survivor-guard não-erra: INSERT de candidatura KNOCKOUT
--     (status='rejeitado') também commita (o guard faz RETURN NEW antes do Vault).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE n int;
BEGIN
  IF current_setting('smoke39.behavioral', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P39 SKIP (h survivor-guard)'; RETURN; END IF;
  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, status, etapa_atual, data_candidatura)
  VALUES ('39010039-0000-4000-8000-0000000000d2', current_setting('smoke39.cand')::uuid,
     '39010039-0000-4000-8000-0000000000a1', 'rejeitado'::public.status_candidatura,
     'inscricao'::public.etapa_processo, now());
  SELECT count(*) INTO n FROM public.candidaturas WHERE id = '39010039-0000-4000-8000-0000000000d2';
  IF n <> 1 THEN
    RAISE EXCEPTION 'P39 FAIL (h): a candidatura knockout não commitou — o survivor-guard errou';
  END IF;
  PERFORM set_config('smoke39.pass', (coalesce(nullif(current_setting('smoke39.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (h): candidatura knockout (status=rejeitado) INSERT commitou — survivor-guard faz RETURN NEW antes de ler o Vault';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (i) invariante 3 estendida — historico + agendamento commitam (graceful-skip nas
--     3 fontes: transicao e convite também nunca bloqueiam o funil).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE n int;
BEGIN
  IF current_setting('smoke39.behavioral', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P39 SKIP (i historico+agendamento)'; RETURN; END IF;

  INSERT INTO public.historico_candidatura
    (id, candidatura_id, etapa_de, etapa_para, auto_rejeitado)
  VALUES ('39010039-0000-4000-8000-0000000000e1', '39010039-0000-4000-8000-0000000000d1',
     'triagem'::public.etapa_processo, 'avaliacao_assincrona'::public.etapa_processo, false);

  INSERT INTO public.agendamentos_entrevista
    (id, candidatura_id, vaga_id, tipo, data_hora)
  VALUES ('39010039-0000-4000-8000-0000000000f1', '39010039-0000-4000-8000-0000000000d1',
     '39010039-0000-4000-8000-0000000000a1', 'online', now() + interval '1 day');

  SELECT count(*) INTO n FROM public.historico_candidatura WHERE id = '39010039-0000-4000-8000-0000000000e1';
  IF n <> 1 THEN RAISE EXCEPTION 'P39 FAIL (i): historico não commitou — trg_notif_transicao bloqueou o funil'; END IF;
  SELECT count(*) INTO n FROM public.agendamentos_entrevista WHERE id = '39010039-0000-4000-8000-0000000000f1';
  IF n <> 1 THEN RAISE EXCEPTION 'P39 FAIL (i): agendamento não commitou — trg_notif_convite bloqueou o funil'; END IF;

  PERFORM set_config('smoke39.pass', (coalesce(nullif(current_setting('smoke39.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (i): historico (avaliacao_assincrona) e agendamento INSERT commitaram — graceful-skip nas 3 fontes';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — ROLLBACK-free: remove só o namespace descartável 39010039-*. As linhas
--   REAIS (candidato/usuarios_rh resolvidos) nunca são tocadas.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DELETE FROM public.agendamentos_entrevista WHERE id = '39010039-0000-4000-8000-0000000000f1';
DELETE FROM public.historico_candidatura   WHERE id = '39010039-0000-4000-8000-0000000000e1';
DELETE FROM public.candidaturas WHERE id IN (
  '39010039-0000-4000-8000-0000000000d1', '39010039-0000-4000-8000-0000000000d2');
DELETE FROM public.vagas WHERE id = '39010039-0000-4000-8000-0000000000a1';

-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem adaptativo. Esperado = 6 estruturais + (3 se
--     comportamental rodou, 0 se fez SKIP em PROD). Run parcial/todo-SKIP falha AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_n int; v_esperado int; v_beh text;
BEGIN
  v_n   := coalesce(nullif(current_setting('smoke39.pass', true), ''), '0')::int;
  v_beh := coalesce(nullif(current_setting('smoke39.behavioral', true), ''), 'n');
  v_esperado := 6 + (CASE WHEN v_beh = 'y' THEN 3 ELSE 0 END);
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P39 FAIL (z): RESUMO % PASS de % esperadas (comportamental=%) — run parcial; NÃO tratar como verde', v_n, v_esperado, v_beh;
  END IF;
  RAISE NOTICE 'RESUMO: % asserções PASS de % esperadas (estruturais 6 + comportamental %) — gate VERDE',
    v_n, v_esperado, CASE WHEN v_beh = 'y' THEN '3' ELSE '0 (SKIP: Vault setado — dispatch real fica no 39-04)' END;
END $$;

SELECT set_config('smoke39.behavioral', '', false);
RESET ROLE;
