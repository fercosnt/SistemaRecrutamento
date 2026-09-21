-- =============================================================================
-- Phase 48 / Plano 48-08 — smoke do discriminador de dedupe no corpo do despacho
--                          (JORN-18 · JORN-20 · pré-requisito do JORN-19)
-- =============================================================================
-- O QUE ELE VIGIA. O banco passou a dizer às EFs QUAL decisão e QUAL ciclo de revisão
-- cada e-mail anuncia:
--   · 20260921000006 — `trg_notif_transicao` põe `'historico_id', NEW.id` no corpo do
--     `net.http_post` (a EF versiona a chave por transição e tira o desfecho dessa linha);
--   · 20260921000007 — `trg_notif_revisao_solicitada` e `trg_notif_revisao_respondida`
--     põem `'ciclo', extract(epoch from NEW.revisao_solicitada_em)::bigint::text` (as EFs
--     versionam as chaves do ciclo de revisão — pré-requisito da reabertura, JORN-19).
--
-- Prova, por EXECUÇÃO em PROD:
--   (a) catálogo — a definição instalada de `trg_notif_transicao` contém
--       `'historico_id', NEW.id`.
--   (b) comportamento — numa subtransação que REVERTE, com claim de administrador,
--       `rejeitar_candidatura` sobre uma candidatura em andamento gera UMA linha de
--       `historico_candidatura` (etapa_para = 'rejeitado') e UMA linha em
--       `net.http_request_queue` para `/functions/v1/notificar-candidato` cujo corpo
--       (`convert_from(body,'UTF8')::jsonb`) tem `evento = 'decisao'`, a
--       `candidatura_id` da fixture e `historico_id` IGUAL ao `id` dessa linha de
--       histórico. É o contrato que a EF v10 consome.
--   (c) ⊖ NEGATIVA — nada da fixture sobrevive (candidatura, histórico, fila) e as
--       contagens globais de `historico_candidatura` e `net.http_request_queue` são as
--       mesmas antes e depois.
--   (d) catálogo — as duas funções de trigger do ciclo de revisão contêm `'ciclo'`.
--   (e) comportamento — numa subtransação que REVERTE: `registrar_decisao` rejeitado com
--       claim do administrador A; `solicitar_revisao_decisao` com claim do candidato
--       TITULAR ⇒ UMA linha nova na fila para `/functions/v1/notificar-rh` com
--       `evento='revisao_solicitada'` e `ciclo` = epoch de `revisao_solicitada_em`;
--       `responder_revisao_decisao('mantida')` com claim do administrador B (≠ A) ⇒ UMA
--       linha nova para `/functions/v1/notificar-candidato` com `evento='revisao_respondida'`
--       e o MESMO `ciclo`.
--   (f) ⊖ NEGATIVA — nada da fixture sobrevive e as contagens globais de `decisao_final`,
--       `decisao_final_historico`, `historico_candidatura` e da fila são as mesmas.
--
-- A FIXTURE NÃO É UMA CANDIDATURA REAL (desvio deliberado da letra do plano, no
-- idioma do 48-09). O plano pedia «uma candidatura real de conta de teste em
-- andamento». As contas `+claude` estão sendo exercitadas pelo operador em PROD
-- (plano 48-05) — um UPDATE nelas, mesmo revertido, disputa lock de linha com o fluxo
-- vivo. O que (b) prova é o corpo que o TRIGGER monta, e o trigger não distingue
-- conta de teste de fixture: titular sintético (`@invalido.local`), candidatura que
-- nasce `status = 'rejeitado'` (desarma `trg_notif_confirmacao`) e é levada a
-- `em_analise` por UPDATE — idioma do `p48_candidatura_encerrada_smoke.sql`.
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL
-- encerrada por `RAISE EXCEPTION` com SQLSTATE próprio (`P48D1`), capturado logo
-- acima: ROLLBACK da subtransação inteira, inclusive das linhas que os triggers de
-- dispatch enfileiram em `net.http_request_queue` (a fila do `pg_net` é
-- transacional: o worker só vê o que foi COMMITADO). NOTIFICACOES_MODO = 'producao',
-- mas nada daqui é commitado — nenhum e-mail sai. Os valores medidos ficam em
-- variáveis PL/pgSQL (que NÃO são revertidas) e o julgamento é feito depois, fora da
-- subtransação. O contador é incrementado fora dela (GUC é transacional).
--
-- POR QUE AS CONTAGENS GLOBAIS DE (c) NÃO SÃO FOTOGRAFIA (D-17). São baseline
-- capturada NA PRÓPRIA execução, não constante. A asserção que decide é a de resíduo
-- ESCOPADA à fixture (zero linha com os ids dela); a global é o cinto — e se ela
-- divergir com resíduo zero, a mensagem diz que o delta veio de tráfego concorrente
-- (outra transação commitou no meio da requisição), para não ser lida como vazamento.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p48_dedupe_smoke.sql` — UMA
-- requisição, UMA sessão. O `SELECT` final devolve `{smoke, pass, esperado, ...}`;
-- qualquer FAIL é `RAISE EXCEPTION` e o `p46apply` sai com código ≠ 0.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO: é o número de asserções DESTE
-- arquivo (escopo deliberado), não uma fotografia do banco.
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('smoke48d.pass', '0', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — identidades vivas (leitura) e contagens para as negativas.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_admin  uuid;
  v_admin2 uuid;
  v_vaga   uuid;
BEGIN
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P48D FAIL (baseline): nenhum administrador vivo — (b) precisa de ator real (historico_candidatura.ator -> auth.users)';
  END IF;
  -- (e): o revisor tem de ser OUTRA pessoa (REVISAO-05: responder_revisao_decisao recusa o
  -- decisor). RH/admin ATIVOS lidos na execução — FK de por_usuario / revisao_por_usuario.
  SELECT u.user_id INTO v_admin2
    FROM public.usuarios_rh u
   WHERE u.role IN ('administrador', 'recrutador') AND u.ativo AND u.deleted_at IS NULL
     AND u.user_id IS NOT NULL AND u.user_id <> v_admin
   ORDER BY u.created_at
   LIMIT 1;
  IF v_admin2 IS NULL THEN
    RAISE EXCEPTION 'P48D FAIL (baseline): só há UM RH/admin ativo — (e) precisa de um revisor distinto do decisor';
  END IF;
  PERFORM set_config('smoke48d.admin2', v_admin2::text, false);
  -- vocabulário do JWT (o hook mapeia recrutador → rh), nunca o da coluna
  PERFORM set_config('smoke48d.admin2_role',
    (SELECT CASE WHEN u.role = 'administrador' THEN 'administrador' ELSE 'rh' END
       FROM public.usuarios_rh u WHERE u.user_id = v_admin2), false);

  SELECT v.id INTO v_vaga FROM public.vagas v ORDER BY v.created_at LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P48D FAIL (baseline): nenhuma vaga viva para a fixture';
  END IF;

  PERFORM set_config('smoke48d.admin', v_admin::text, false);
  PERFORM set_config('smoke48d.vaga',  v_vaga::text, false);
  PERFORM set_config('smoke48d.n_hist', (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke48d.n_netq', (SELECT count(*) FROM net.http_request_queue)::text, false);
  PERFORM set_config('smoke48d.n_df',   (SELECT count(*) FROM public.decisao_final)::text, false);
  PERFORM set_config('smoke48d.n_dfh',  (SELECT count(*) FROM public.decisao_final_historico)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) catálogo — o corpo do despacho carrega o id da transição.
-- ─────────────────────────────────────────────────────────────────────────────
DO $a$
DECLARE
  v_def text := pg_get_functiondef('public.trg_notif_transicao()'::regprocedure);
BEGIN
  IF position('''historico_id'', NEW.id' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P48D FAIL (a): trg_notif_transicao NÃO passa historico_id no corpo — a EF segue caindo na chave legada {candidatura}:decisao e a 2ª decisão é engolida (Defeito 18). Migration 20260921000006 não aplicada?';
  END IF;
  IF position('ELSIF NEW.auto_rejeitado THEN' IN v_def) = 0
     OR position('auto_rejeitado = false' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P48D FAIL (a): trg_notif_transicao perdeu o ramo do knockout ou o da decisão humana';
  END IF;
  PERFORM set_config('smoke48d.pass', (current_setting('smoke48d.pass')::int + 1)::text, false);
END
$a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) + (c) — a rejeição humana na triagem enfileira o corpo com o historico_id.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $bc$
DECLARE
  v_admin   uuid := current_setting('smoke48d.admin')::uuid;
  v_vaga    uuid := current_setting('smoke48d.vaga')::uuid;
  v_user    uuid := gen_random_uuid();
  v_email   text;
  v_cand    uuid;
  v_a       uuid;
  v_ran     boolean := false;
  v_err     text;
  -- medido dentro da subtransação
  b_hist_n  int;
  b_hist_id uuid;
  b_fila_n  int;
  b_corpo   jsonb;
  -- (c)
  c_cand    int;
  c_hist    int;
  c_fila    int;
  c_hist_g  bigint;
  c_netq_g  bigint;
BEGIN
  BEGIN
    -- ── fixture ────────────────────────────────────────────────────────────────
    v_email := 'p48dsmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P48D Titular', v_email, '(11) 96666-5543',
       DATE '1990-01-15', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;

    -- em andamento DE VERDADE (INSERT rejeitado desarma o dispatch da confirmação; UPDATE leva a em_analise)
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga, 'triagem', 'rejeitado', false, now() - interval '10 days')
    RETURNING id INTO v_a;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_a;

    -- ── a rejeição humana na triagem, pelo administrador ───────────────────────
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);
    PERFORM public.rejeitar_candidatura(
      v_a, 'reprovado_entrevista',
      'Justificativa sintetica do smoke P48D, escrita pelo RH, com mais de cinquenta caracteres.');
    PERFORM set_config('request.jwt.claims', '', false);

    SELECT count(*), max(h.id::text)::uuid INTO b_hist_n, b_hist_id
      FROM public.historico_candidatura h
     WHERE h.candidatura_id = v_a AND h.etapa_para = 'rejeitado';

    SELECT count(*), max(convert_from(q.body, 'UTF8'))::jsonb INTO b_fila_n, b_corpo
      FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-candidato'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = v_a::text;

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P48D1';
  EXCEPTION
    WHEN SQLSTATE 'P48D1' THEN NULL;  -- ROLLBACK da subtransação: fixture, histórico e fila somem
    WHEN OTHERS THEN
      v_err := SQLSTATE || ': ' || SQLERRM;
  END;
  PERFORM set_config('request.jwt.claims', '', false);

  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P48D FAIL (b): a fixture/rejeição não rodou até o fim — %', coalesce(v_err, 'sem erro, mas sem marca de execução');
  END IF;

  -- ── (b) julgamento ────────────────────────────────────────────────────────────
  IF b_hist_n <> 1 OR b_hist_id IS NULL THEN
    RAISE EXCEPTION 'P48D FAIL (b): rejeitar_candidatura gerou % linha(s) de historico_candidatura com etapa_para=rejeitado (esperado exatamente 1)', b_hist_n;
  END IF;
  IF b_fila_n <> 1 THEN
    RAISE EXCEPTION 'P48D FAIL (b): % linha(s) em net.http_request_queue para notificar-candidato desta candidatura (esperado exatamente 1 — o despacho da decisão)', b_fila_n;
  END IF;
  IF b_corpo ->> 'evento' IS DISTINCT FROM 'decisao' THEN
    RAISE EXCEPTION 'P48D FAIL (b): o despacho da rejeição na triagem não é o evento decisao: %', b_corpo;
  END IF;
  IF b_corpo ->> 'historico_id' IS DISTINCT FROM b_hist_id::text THEN
    RAISE EXCEPTION 'P48D FAIL (b): o corpo do despacho não carrega o id da transição — historico_id no corpo = %, id da linha de histórico = %. Corpo: %',
      coalesce(b_corpo ->> 'historico_id', '<ausente>'), b_hist_id, b_corpo;
  END IF;
  PERFORM set_config('smoke48d.pass', (current_setting('smoke48d.pass')::int + 1)::text, false);

  -- ── (c) NEGATIVA — nada da fixture sobreviveu; globais iguais ────────────────
  SELECT count(*) INTO c_cand FROM public.candidaturas c WHERE c.id = v_a;
  SELECT count(*) INTO c_hist FROM public.historico_candidatura h WHERE h.candidatura_id = v_a;
  SELECT count(*) INTO c_fila FROM net.http_request_queue q
   WHERE convert_from(q.body, 'UTF8') LIKE '%' || v_a::text || '%';
  IF c_cand <> 0 OR c_hist <> 0 OR c_fila <> 0 THEN
    RAISE EXCEPTION 'P48D FAIL (c): RESÍDUO da fixture — candidatura=% historico=% fila=% (a subtransação não reverteu; um despacho na fila COMMITADO sai como e-mail)', c_cand, c_hist, c_fila;
  END IF;
  SELECT count(*) INTO c_hist_g FROM public.historico_candidatura;
  SELECT count(*) INTO c_netq_g FROM net.http_request_queue;
  IF c_hist_g <> current_setting('smoke48d.n_hist')::bigint
     OR c_netq_g <> current_setting('smoke48d.n_netq')::bigint THEN
    RAISE EXCEPTION 'P48D FAIL (c): contagem global mudou (historico % -> %, fila % -> %) com resíduo ZERO da fixture — o delta é de tráfego concorrente commitado durante a requisição; rodar de novo',
      current_setting('smoke48d.n_hist'), c_hist_g, current_setting('smoke48d.n_netq'), c_netq_g;
  END IF;
  PERFORM set_config('smoke48d.pass', (current_setting('smoke48d.pass')::int + 1)::text, false);
END
$bc$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) catálogo — o ciclo está nos dois despachos do ciclo de revisão.
-- ─────────────────────────────────────────────────────────────────────────────
DO $d$
DECLARE
  v_sol text := pg_get_functiondef('public.trg_notif_revisao_solicitada()'::regprocedure);
  v_res text := pg_get_functiondef('public.trg_notif_revisao_respondida()'::regprocedure);
BEGIN
  IF position('''ciclo''' IN v_sol) = 0 THEN
    RAISE EXCEPTION 'P48D FAIL (d): trg_notif_revisao_solicitada NÃO passa o ciclo — um 2º pedido de revisão após reabertura colide com a chave do 1º e nenhum RH é avisado. Migration 20260921000007 não aplicada?';
  END IF;
  IF position('''ciclo''' IN v_res) = 0 THEN
    RAISE EXCEPTION 'P48D FAIL (d): trg_notif_revisao_respondida NÃO passa o ciclo — a resposta do 2º ciclo seria engolida (skipped:duplicate). Migration 20260921000007 não aplicada?';
  END IF;
  PERFORM set_config('smoke48d.pass', (current_setting('smoke48d.pass')::int + 1)::text, false);
END
$d$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) + (f) — o ciclo inteiro (decisão → pedido → resposta) numa subtransação revertida.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $ef$
DECLARE
  v_admin   uuid := current_setting('smoke48d.admin')::uuid;
  v_admin2  uuid := current_setting('smoke48d.admin2')::uuid;
  v_role2   text := current_setting('smoke48d.admin2_role');
  v_vaga    uuid := current_setting('smoke48d.vaga')::uuid;
  v_user    uuid := gen_random_uuid();
  v_email   text;
  v_cand    uuid;
  v_a       uuid;
  v_ran     boolean := false;
  v_err     text;
  -- medido dentro da subtransação
  e_ciclo   text;
  e_sol_n   int;
  e_sol     jsonb;
  e_res_n   int;
  e_res     jsonb;
  -- (f)
  f_cand    int;  f_df int;  f_dfh int;  f_hist int;  f_fila int;
  f_df_g    bigint;  f_dfh_g bigint;  f_hist_g bigint;  f_netq_g bigint;
BEGIN
  BEGIN
    -- ── fixture ────────────────────────────────────────────────────────────────
    v_email := 'p48dsmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P48D Titular Revisao', v_email, '(11) 96666-5542',
       DATE '1990-01-15', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;

    -- em decisao_final DE VERDADE (INSERT rejeitado desarma a confirmação; UPDATE leva a em_analise)
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga, 'decisao_final', 'rejeitado', false, now() - interval '20 days')
    RETURNING id INTO v_a;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_a;

    -- ── decisão: administrador A rejeita ───────────────────────────────────────
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);
    PERFORM public.registrar_decisao(
      v_a, 'rejeitado',
      'Decisao final sintetica do smoke P48D (e), escrita pelo administrador A, mais de 50 caracteres.');

    -- ── pedido de revisão: o TITULAR ───────────────────────────────────────────
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_user::text,
                        'app_metadata', json_build_object('role', 'candidato'))::text, false);
    PERFORM public.solicitar_revisao_decisao(v_a);
    PERFORM set_config('request.jwt.claims', '', false);

    SELECT extract(epoch from d.revisao_solicitada_em)::bigint::text INTO e_ciclo
      FROM public.decisao_final d WHERE d.candidatura_id = v_a;

    SELECT count(*), max(convert_from(q.body, 'UTF8'))::jsonb INTO e_sol_n, e_sol
      FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-rh'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = v_a::text
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'evento' = 'revisao_solicitada';

    -- ── resposta: administrador B (≠ decisor) ──────────────────────────────────
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin2::text,
                        'app_metadata', json_build_object('role', v_role2))::text, false);
    PERFORM public.responder_revisao_decisao(
      v_a, 'mantida',
      'Revisao sintetica do smoke P48D (e) pelo administrador B: decisao mantida, mais de 50 caracteres.');
    PERFORM set_config('request.jwt.claims', '', false);

    SELECT count(*), max(convert_from(q.body, 'UTF8'))::jsonb INTO e_res_n, e_res
      FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-candidato'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = v_a::text
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'evento' = 'revisao_respondida';

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P48D2';
  EXCEPTION
    WHEN SQLSTATE 'P48D2' THEN NULL;  -- ROLLBACK: fixture, decisão, pedido, resposta e fila somem
    WHEN OTHERS THEN
      v_err := SQLSTATE || ': ' || SQLERRM;
  END;
  PERFORM set_config('request.jwt.claims', '', false);

  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P48D FAIL (e): o ciclo decisão→pedido→resposta não rodou até o fim — %', coalesce(v_err, 'sem erro, mas sem marca de execução');
  END IF;

  -- ── (e) julgamento ────────────────────────────────────────────────────────────
  IF e_ciclo IS NULL OR e_ciclo !~ '^\d{1,12}$' THEN
    RAISE EXCEPTION 'P48D FAIL (e): revisao_solicitada_em não virou um ciclo válido (%)', coalesce(e_ciclo, '<nulo>');
  END IF;
  IF e_sol_n <> 1 THEN
    RAISE EXCEPTION 'P48D FAIL (e): % despacho(s) revisao_solicitada para notificar-rh (esperado exatamente 1)', e_sol_n;
  END IF;
  IF e_sol ->> 'ciclo' IS DISTINCT FROM e_ciclo THEN
    RAISE EXCEPTION 'P48D FAIL (e): o pedido de revisão não carrega o ciclo — ciclo no corpo = %, epoch de revisao_solicitada_em = %. Corpo: %',
      coalesce(e_sol ->> 'ciclo', '<ausente>'), e_ciclo, e_sol;
  END IF;
  IF e_res_n <> 1 THEN
    RAISE EXCEPTION 'P48D FAIL (e): % despacho(s) revisao_respondida para notificar-candidato (esperado exatamente 1)', e_res_n;
  END IF;
  IF e_res ->> 'ciclo' IS DISTINCT FROM e_ciclo THEN
    RAISE EXCEPTION 'P48D FAIL (e): a resposta da revisão não carrega o MESMO ciclo do pedido — ciclo no corpo = %, ciclo do pedido = %. Corpo: %',
      coalesce(e_res ->> 'ciclo', '<ausente>'), e_ciclo, e_res;
  END IF;
  PERFORM set_config('smoke48d.pass', (current_setting('smoke48d.pass')::int + 1)::text, false);

  -- ── (f) NEGATIVA — nada da fixture sobreviveu; globais iguais ────────────────
  SELECT count(*) INTO f_cand FROM public.candidaturas c WHERE c.id = v_a;
  SELECT count(*) INTO f_df   FROM public.decisao_final d WHERE d.candidatura_id = v_a;
  SELECT count(*) INTO f_dfh  FROM public.decisao_final_historico h WHERE h.candidatura_id = v_a;
  SELECT count(*) INTO f_hist FROM public.historico_candidatura h WHERE h.candidatura_id = v_a;
  SELECT count(*) INTO f_fila FROM net.http_request_queue q
   WHERE convert_from(q.body, 'UTF8') LIKE '%' || v_a::text || '%';
  IF f_cand <> 0 OR f_df <> 0 OR f_dfh <> 0 OR f_hist <> 0 OR f_fila <> 0 THEN
    RAISE EXCEPTION 'P48D FAIL (f): RESÍDUO da fixture — candidatura=% decisao_final=% historico_df=% historico=% fila=%',
      f_cand, f_df, f_dfh, f_hist, f_fila;
  END IF;
  SELECT count(*) INTO f_df_g   FROM public.decisao_final;
  SELECT count(*) INTO f_dfh_g  FROM public.decisao_final_historico;
  SELECT count(*) INTO f_hist_g FROM public.historico_candidatura;
  SELECT count(*) INTO f_netq_g FROM net.http_request_queue;
  IF f_df_g   <> current_setting('smoke48d.n_df')::bigint
     OR f_dfh_g  <> current_setting('smoke48d.n_dfh')::bigint
     OR f_hist_g <> current_setting('smoke48d.n_hist')::bigint
     OR f_netq_g <> current_setting('smoke48d.n_netq')::bigint THEN
    RAISE EXCEPTION 'P48D FAIL (f): contagem global mudou (decisao_final % -> %, historico_df % -> %, historico % -> %, fila % -> %) com resíduo ZERO da fixture — o delta é de tráfego concorrente commitado durante a requisição; rodar de novo',
      current_setting('smoke48d.n_df'), f_df_g, current_setting('smoke48d.n_dfh'), f_dfh_g,
      current_setting('smoke48d.n_hist'), f_hist_g, current_setting('smoke48d.n_netq'), f_netq_g;
  END IF;
  PERFORM set_config('smoke48d.pass', (current_setting('smoke48d.pass')::int + 1)::text, false);
END
$ef$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke48d.pass')::int <> 6 THEN
    RAISE EXCEPTION 'P48D FAIL (gate): pass = % de 6 — alguma asserção não incrementou o contador', current_setting('smoke48d.pass');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',    'p48_dedupe',
  'pass',     current_setting('smoke48d.pass')::int,
  'esperado', 6,
  'n_hist',   current_setting('smoke48d.n_hist')::int,
  'n_netq',   current_setting('smoke48d.n_netq')::int,
  'n_df',     current_setting('smoke48d.n_df')::int,
  'n_dfh',    current_setting('smoke48d.n_dfh')::int
) AS resultado;
