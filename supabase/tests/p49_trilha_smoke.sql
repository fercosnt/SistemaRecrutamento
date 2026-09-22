-- =============================================================================
-- Phase 49 / Plano 49-06 — smoke da TRILHA DA CANDIDATURA
--                          (JORN-25/D-35 · JORN-17 · JORN-37/D-47 · D-39 · JORN-34)
-- =============================================================================
-- O QUE ELE VIGIA.
--   · 20260922000003 — a trava D-35 em `avancar_etapa()`: o banco RECUSA mover candidatura
--     ENCERRADA (`public.candidatura_encerrada(OLD.etapa_atual, OLD.status)`), exceto nas duas
--     transições sancionadas pela GUC `app.transicao_sancionada` — `reabertura`
--     (`responder_revisao_decisao`, D-01/Art. 20) e `decisao` (`registrar_decisao`, inclusive o
--     legado `triagem/finalizado → aprovado`). A sanção é da TRANSIÇÃO e nunca do DESTINO.
--   · 20260922000004 — a justificativa não gruda de uma transição para a outra (JORN-17), a
--     justificativa da decisão final não vaza para a trilha do titular (D-47/JORN-37), o portão
--     de avanço olha só a análise VIGENTE (D-39) e nenhuma tela reabre por status (JORN-34).
--     ⚠ As asserções desta segunda migration entram na PARTE 2, escrita no plano 49-06/Task 2.
--
-- PARTE 1 (20260922000003 — a trava e as duas sanções):
--   (a)  knockout `inscricao/rejeitado`, com claims de RH: UPDATE `etapa_atual='avaliacao_assincrona'`
--        ⇒ `check_violation` «candidatura encerrada (etapa …, status …) — não pode mudar de etapa».
--        É o defeito medido do D-35: antes disto o UPDATE era ACEITO, gravava linha em
--        `historico_candidatura` e o `trg_notif_transicao` despachava o evento `avanco`.
--   (a2) o MESMO UPDATE sem claims nenhuma ⇒ também recusado. A trava NÃO é escopada por JWT
--        (quem é escopado por `auth.uid()` é o ramo JORN-34 do `guard_rejeicao_auditada`, e por
--        outra razão: preservar o idioma de fixture de 8 smokes).
--   (a3) o MESMO knockout, UPDATE `etapa_atual='aprovado'` com claims de RH ⇒ recusado. É a
--        prova de que a sanção é por GUC e NÃO por «destino terminal»: pela regra de destino este
--        PATCH (que a policy `rh_avanca_etapa` permite) passaria, e deixaria `status='rejeitado'`
--        com etapa `aprovado` (RESEARCH §H.1).
--   (b)  reabertura do Art. 20 sobre `rejeitado/rejeitado`, por `responder_revisao_decisao`
--        (veredito `revertida`, revisor ≠ decisor) ⇒ PASSA e deixa `decisao_final/em_analise`.
--        A trava não pode quebrar a D-01.
--   (c)  `registrar_decisao('aprovado')` sobre fixture NÃO encerrada (`decisao_final/em_analise`)
--        ⇒ passa e deixa `aprovado/finalizado`.
--   (c2) `registrar_decisao('aprovado')` sobre fixture JÁ ENCERRADA (`triagem/finalizado`, o caso
--        legado) ⇒ passa pela GUC `decisao` e deixa `aprovado/finalizado`, com UMA linha
--        `triagem → aprovado` no histórico. É esta asserção — e não a (c) — que exercita a
--        exceção; sem ela a sanção `decisao` ficaria sem prova.
--   (g)  a GUC NÃO VAZA: depois de (b), (c) e (c2), na MESMA transação,
--        `current_setting('app.transicao_sancionada', true)` está vazio e um UPDATE cru de etapa
--        sobre uma candidatura encerrada é recusado. `set_config(…, true)` vale até o fim da
--        TRANSAÇÃO (RESEARCH Correção 31) — sem o reset dentro das duas RPCs, a sanção de uma
--        reabertura legítima abriria todo UPDATE seguinte da mesma transação.
-- NEGATIVA:
--   (j)  nada das fixtures sobrevive (candidaturas, titulares, decisão, histórico, fila) e as
--        contagens globais de `candidaturas`, `historico_candidatura`, `decisao_final`,
--        `notificacoes_enviadas` e `net.http_request_queue` são as de antes.
--
-- A FIXTURE NÃO É UMA CANDIDATURA REAL (idioma do 48-08/48-09/48-11): o operador pode estar
-- exercitando as contas `+claude` em PROD e um UPDATE nelas, mesmo revertido, disputa lock de
-- linha com o fluxo vivo. Titular sintético `@invalido.local`; candidatura que nasce
-- `status='rejeitado'` (desarma `trg_notif_confirmacao`) e é levada ao estado desejado por UPDATE
-- só de `status` (que não aciona `candidaturas_avancar_etapa_trg`, que é `... OF etapa_atual`).
-- Os ATORES são reais — RH/admin ATIVOS lidos NA EXECUÇÃO (FK de `decisao_final.por_usuario`,
-- `revisao_por_usuario` e `historico_candidatura.ator`), nunca contas fixas:
--   A decide (administrador), B revisa (RH/admin ≠ A — revisor ≠ decisor, REVISAO-05).
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL encerrada
-- por `RAISE EXCEPTION` com SQLSTATE próprio (`P49T1`), capturado logo acima: ROLLBACK da
-- subtransação inteira, inclusive das linhas que os triggers enfileiram em
-- `net.http_request_queue` (o worker do `pg_net` só vê o que foi COMMITADO). NOTIFICACOES_MODO =
-- 'producao', mas nada daqui é commitado — nenhum e-mail sai a candidato real (D-54). Os valores
-- medidos ficam em variáveis PL/pgSQL (não revertidas) e o julgamento é feito FORA da
-- subtransação. O contador é incrementado fora dela.
--
-- AS CONTAGENS GLOBAIS DE (j) NÃO SÃO FOTOGRAFIA (D-17): baseline capturada NA PRÓPRIA execução.
-- A asserção que decide é a de resíduo ESCOPADA às fixtures; a global é o cinto — divergência com
-- resíduo zero é tráfego concorrente commitado durante a requisição, e a mensagem diz isso.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p49_trilha_smoke.sql` — UMA requisição, UMA
-- sessão. O `SELECT` final devolve `{smoke, pass, esperado, ...}`; qualquer FAIL é
-- `RAISE EXCEPTION` e o `p46apply` sai com código ≠ 0.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de asserções DESTE arquivo (escopo
-- deliberado), não uma fotografia do banco. Hoje: 8 (a, a2, a3, b, c, c2, g, j) — a PARTE 2 do
-- plano 49-06/Task 2 acrescenta as suas e sobe o esperado, registrando o bump aqui.
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('app.transicao_sancionada', '', false);
SELECT set_config('smoke49t.pass', '0', false);
SELECT set_config('smoke49t.fixtures', '', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — atores vivos (leitura) e contagens para a negativa.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_a    uuid;
  v_b    uuid;
  v_vaga uuid;
BEGIN
  -- A: administrador (registrar_decisao exige dona da vaga para 'rh'; administrador não).
  SELECT u.user_id INTO v_a
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  -- B: qualquer RH/admin ativo distinto de A (revisor ≠ decisor, REVISAO-05).
  SELECT u.user_id INTO v_b
    FROM public.usuarios_rh u
   WHERE u.role IN ('administrador', 'recrutador') AND u.ativo AND u.deleted_at IS NULL
     AND u.user_id IS NOT NULL AND u.user_id <> v_a
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_a IS NULL OR v_b IS NULL THEN
    RAISE EXCEPTION 'P49T FAIL (baseline): faltam atores ATIVOS — A=% B=% (preciso de um administrador e de um 2o RH/admin distinto)',
      coalesce(v_a::text, '<nulo>'), coalesce(v_b::text, '<nulo>');
  END IF;

  SELECT v.id INTO v_vaga FROM public.vagas v ORDER BY v.created_at LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P49T FAIL (baseline): nenhuma vaga viva para a fixture';
  END IF;

  PERFORM set_config('smoke49t.a', v_a::text, false);
  PERFORM set_config('smoke49t.b', v_b::text, false);
  -- vocabulário do JWT (o hook mapeia recrutador → rh), nunca o da coluna
  PERFORM set_config('smoke49t.b_role',
    (SELECT CASE WHEN u.role = 'administrador' THEN 'administrador' ELSE 'rh' END
       FROM public.usuarios_rh u WHERE u.user_id = v_b), false);
  PERFORM set_config('smoke49t.vaga', v_vaga::text, false);

  PERFORM set_config('smoke49t.n_cand',  (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke49t.n_hist',  (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke49t.n_df',    (SELECT count(*) FROM public.decisao_final)::text, false);
  PERFORM set_config('smoke49t.n_notif', (SELECT count(*) FROM public.notificacoes_enviadas)::text, false);
  PERFORM set_config('smoke49t.n_netq',  (SELECT count(*) FROM net.http_request_queue)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1 — a trava e as duas sanções: (a) (a2) (a3) (b) (c) (c2) (g).
--   Numa subtransação que reverte (`P49T1`).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p1$
DECLARE
  v_a        uuid := current_setting('smoke49t.a')::uuid;
  v_b        uuid := current_setting('smoke49t.b')::uuid;
  v_b_role   text := current_setting('smoke49t.b_role');
  v_vaga     uuid := current_setting('smoke49t.vaga')::uuid;
  v_claims_a text;
  v_claims_b text;
  v_ids      text := '';
  v_ran      boolean := false;
  v_err      text;
  v_user     uuid;
  v_email    text;
  v_cand     uuid;
  v_k1  uuid;                 -- knockout inscricao/rejeitado
  v_r1  uuid;  v_ur1 uuid;    -- reabertura (Art. 20)
  v_d1  uuid;                 -- decisão sobre NÃO encerrada
  v_c2  uuid;                 -- decisão sobre JÁ encerrada (triagem/finalizado)
  -- (a) (a2) (a3)
  a_state  text;  a2_state text;  a3_state text;
  a_etapa  text;  a_status text;  a_hist_n int;
  -- (b)
  b_state  text;  b_etapa text;  b_status text;  b_ddf timestamptz;  b_hist_n int;
  -- (c)
  c_state  text;  c_etapa text;  c_status text;
  -- (c2)
  c2_state text;  c2_etapa text;  c2_status text;  c2_hist_n int;
  c2_antes_etapa text;  c2_antes_status text;
  -- (g)
  g_guc    text;  g_state text;
BEGIN
  v_claims_a := json_build_object('sub', v_a::text, 'app_metadata', json_build_object('role', 'administrador'))::text;
  v_claims_b := json_build_object('sub', v_b::text, 'app_metadata', json_build_object('role', v_b_role))::text;

  BEGIN
    -- ── fixtures: 4 titulares sintéticos, um por cenário ───────────────────────
    -- K1 · knockout: nasce `inscricao/rejeitado` (é o estado exato do knockout automático
    --      de `submit_candidatura_atomic`) — ENCERRADA por status.
    v_user  := gen_random_uuid();
    v_email := 'p49tsmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P49T Titular K1', v_email, '(11) 95555-5501',
       DATE '1990-01-15', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga, 'inscricao', 'rejeitado', false, now() - interval '20 days')
    RETURNING id INTO v_k1;
    v_ids := v_ids || v_k1::text || ',';

    -- R1 · reabertura: nasce `decisao_final/rejeitado` e vai a `em_analise` por UPDATE só de status.
    v_user  := gen_random_uuid();
    v_email := 'p49tsmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P49T Titular R1', v_email, '(11) 95555-5502',
       DATE '1990-01-15', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;
    v_ur1 := v_user;
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga, 'decisao_final', 'rejeitado', false, now() - interval '20 days')
    RETURNING id INTO v_r1;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_r1;
    v_ids := v_ids || v_r1::text || ',';

    -- D1 · decisão sobre NÃO encerrada.
    v_user  := gen_random_uuid();
    v_email := 'p49tsmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P49T Titular D1', v_email, '(11) 95555-5503',
       DATE '1990-01-15', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga, 'decisao_final', 'rejeitado', false, now() - interval '20 days')
    RETURNING id INTO v_d1;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_d1;
    v_ids := v_ids || v_d1::text || ',';

    -- C2 · decisão sobre JÁ ENCERRADA — o caso legado `triagem/finalizado`. Nasce
    --      `triagem/rejeitado` (desarma o dispatch de confirmação) e vai a `finalizado` por
    --      UPDATE só de `status`: encerrada ANTES e DEPOIS, então o ramo JORN-34 do
    --      `guard_rejeicao_auditada` (que exige NEW não encerrada) não o toca.
    v_user  := gen_random_uuid();
    v_email := 'p49tsmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P49T Titular C2', v_email, '(11) 95555-5504',
       DATE '1990-01-15', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga, 'triagem', 'rejeitado', false, now() - interval '20 days')
    RETURNING id INTO v_c2;
    UPDATE public.candidaturas SET status = 'finalizado' WHERE id = v_c2;
    v_ids := v_ids || v_c2::text || ',';

    -- ── (a) knockout + claims de RH: avançar para a avaliação ───────────────────
    PERFORM set_config('request.jwt.claims', v_claims_a, false);
    BEGIN
      UPDATE public.candidaturas SET etapa_atual = 'avaliacao_assincrona' WHERE id = v_k1;
      a_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN a_state := SQLSTATE || ':' || SQLERRM;
    END;

    -- ── (a3) o mesmo knockout, destino TERMINAL (o PATCH que a regra de destino aceitaria) ──
    BEGIN
      UPDATE public.candidaturas SET etapa_atual = 'aprovado' WHERE id = v_k1;
      a3_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN a3_state := SQLSTATE || ':' || SQLERRM;
    END;

    -- ── (a2) o mesmo UPDATE de (a), SEM claims nenhuma ─────────────────────────
    PERFORM set_config('request.jwt.claims', '', false);
    BEGIN
      UPDATE public.candidaturas SET etapa_atual = 'avaliacao_assincrona' WHERE id = v_k1;
      a2_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN a2_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT c.etapa_atual::text, c.status::text INTO a_etapa, a_status
      FROM public.candidaturas c WHERE c.id = v_k1;
    -- depois das TRÊS tentativas recusadas: nenhuma linha de histórico pode existir
    SELECT count(*) INTO a_hist_n FROM public.historico_candidatura WHERE candidatura_id = v_k1;

    -- ── (b) reabertura do Art. 20: A decide, o titular pede revisão, B reverte ──
    PERFORM set_config('request.jwt.claims', v_claims_a, false);
    PERFORM public.registrar_decisao(v_r1, 'rejeitado',
      'Decisao final sintetica do smoke P49T (R1), rejeitado pelo administrador A, mais de 50 caracteres.');
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_ur1::text, 'app_metadata', json_build_object('role', 'candidato'))::text, false);
    PERFORM public.solicitar_revisao_decisao(v_r1);
    SELECT count(*) INTO b_hist_n FROM public.historico_candidatura WHERE candidatura_id = v_r1;
    PERFORM set_config('request.jwt.claims', v_claims_b, false);
    BEGIN
      PERFORM public.responder_revisao_decisao(v_r1, 'revertida',
        'Revisao sintetica do smoke P49T (b) pelo revisor B: a rejeicao nao se sustenta, reabrir o caso.');
      b_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN b_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT c.etapa_atual::text, c.status::text, c.data_decisao_final INTO b_etapa, b_status, b_ddf
      FROM public.candidaturas c WHERE c.id = v_r1;
    SELECT count(*) - b_hist_n INTO b_hist_n
      FROM public.historico_candidatura WHERE candidatura_id = v_r1;

    -- ── (c) decisão sobre NÃO encerrada ────────────────────────────────────────
    PERFORM set_config('request.jwt.claims', v_claims_a, false);
    BEGIN
      PERFORM public.registrar_decisao(v_d1, 'aprovado',
        'Decisao final sintetica do smoke P49T (c) sobre candidatura em andamento, mais de 50 caracteres.');
      c_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN c_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT c.etapa_atual::text, c.status::text INTO c_etapa, c_status
      FROM public.candidaturas c WHERE c.id = v_d1;

    -- ── (c2) decisão sobre JÁ ENCERRADA — a sanção `decisao` em ação ───────────
    SELECT c.etapa_atual::text, c.status::text INTO c2_antes_etapa, c2_antes_status
      FROM public.candidaturas c WHERE c.id = v_c2;
    BEGIN
      PERFORM public.registrar_decisao(v_c2, 'aprovado',
        'Decisao final sintetica do smoke P49T (c2) sobre candidatura JA encerrada, mais de 50 caracteres.');
      c2_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN c2_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT c.etapa_atual::text, c.status::text INTO c2_etapa, c2_status
      FROM public.candidaturas c WHERE c.id = v_c2;
    SELECT count(*) INTO c2_hist_n
      FROM public.historico_candidatura h
     WHERE h.candidatura_id = v_c2 AND h.etapa_de = 'triagem' AND h.etapa_para = 'aprovado';

    -- ── (g) a GUC não vaza: depois das três transições sancionadas da mesma transação ──
    g_guc := coalesce(current_setting('app.transicao_sancionada', true), '');
    BEGIN
      UPDATE public.candidaturas SET etapa_atual = 'entrevista_online' WHERE id = v_d1;
      g_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN g_state := SQLSTATE || ':' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', '', false);

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P49T1';
  EXCEPTION
    WHEN SQLSTATE 'P49T1' THEN NULL;  -- ROLLBACK: fixtures, decisões, histórico e fila somem
    WHEN OTHERS THEN
      v_err := SQLSTATE || ': ' || SQLERRM;
  END;
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('smoke49t.fixtures', current_setting('smoke49t.fixtures') || v_ids, false);

  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P49T FAIL (parte 1): a fixture/o ciclo não rodou até o fim — %', coalesce(v_err, 'sem erro, mas sem marca de execução');
  END IF;

  -- ── (a) julgamento ──────────────────────────────────────────────────────────
  IF a_state NOT LIKE '23514:%candidatura encerrada%' THEN
    RAISE EXCEPTION 'P49T FAIL (a): avançar um knockout (inscricao/rejeitado → avaliacao_assincrona) com claims de RH devolveu «%» (esperado 23514 check_violation «candidatura encerrada»). Se saiu ACEITO, a trava D-35 não está no ar e o e-mail «você avançou» volta a sair para quem foi eliminado', a_state;
  END IF;
  IF a_etapa IS DISTINCT FROM 'inscricao' OR a_status IS DISTINCT FROM 'rejeitado' THEN
    RAISE EXCEPTION 'P49T FAIL (a): a recusa MOVEU a candidatura — ela ficou %/% (esperado inscricao/rejeitado)', a_etapa, a_status;
  END IF;
  IF a_hist_n IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P49T FAIL (a): depois das três tentativas recusadas o knockout tem % linha(s) em historico_candidatura (esperado 0). Linha de histórico é o que o trg_notif_transicao transforma em e-mail — uma recusa que escreve é pior que nenhuma recusa', a_hist_n;
  END IF;
  PERFORM set_config('smoke49t.pass', (current_setting('smoke49t.pass')::int + 1)::text, false);

  -- ── (a2) julgamento ─────────────────────────────────────────────────────────
  IF a2_state NOT LIKE '23514:%candidatura encerrada%' THEN
    RAISE EXCEPTION 'P49T FAIL (a2): o MESMO UPDATE sem claims devolveu «%» (esperado 23514 «candidatura encerrada») — a trava não pode ser escopada por JWT', a2_state;
  END IF;
  PERFORM set_config('smoke49t.pass', (current_setting('smoke49t.pass')::int + 1)::text, false);

  -- ── (a3) julgamento ─────────────────────────────────────────────────────────
  IF a3_state NOT LIKE '23514:%candidatura encerrada%' THEN
    RAISE EXCEPTION 'P49T FAIL (a3): o PATCH `etapa_atual=aprovado` sobre o knockout devolveu «%» (esperado 23514 «candidatura encerrada»). Aceito = a sanção foi escrita por DESTINO terminal e não por GUC, e a policy rh_avanca_etapa deixaria `status=rejeitado` com etapa `aprovado` (RESEARCH §H.1)', a3_state;
  END IF;
  PERFORM set_config('smoke49t.pass', (current_setting('smoke49t.pass')::int + 1)::text, false);

  -- ── (b) julgamento — a trava não quebrou a D-01 ─────────────────────────────
  IF b_state IS DISTINCT FROM 'ACEITO' THEN
    RAISE EXCEPTION 'P49T FAIL (b): a reabertura do Art. 20 devolveu «%» (esperado aceito). A trava D-35 recusando a própria reabertura é o modo de falha T-49-06-05: a GUC `reabertura` não está sendo declarada, ou o reset veio antes do UPDATE', b_state;
  END IF;
  IF b_etapa IS DISTINCT FROM 'decisao_final' OR b_status IS DISTINCT FROM 'em_analise' OR b_ddf IS NOT NULL THEN
    RAISE EXCEPTION 'P49T FAIL (b): a reabertura deixou a candidatura %/% com data_decisao_final=% (esperado decisao_final/em_analise com data nula; NUNCA aprovado, D-01)', b_etapa, b_status, b_ddf;
  END IF;
  IF b_hist_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P49T FAIL (b): a reabertura gravou % linha(s) novas de histórico (esperado exatamente 1: rejeitado→decisao_final)', b_hist_n;
  END IF;
  PERFORM set_config('smoke49t.pass', (current_setting('smoke49t.pass')::int + 1)::text, false);

  -- ── (c) julgamento ──────────────────────────────────────────────────────────
  IF c_state IS DISTINCT FROM 'ACEITO' THEN
    RAISE EXCEPTION 'P49T FAIL (c): a decisão sobre candidatura EM ANDAMENTO devolveu «%» (esperado aceito — a trava só recusa mover encerrada)', c_state;
  END IF;
  IF c_etapa IS DISTINCT FROM 'aprovado' OR c_status IS DISTINCT FROM 'finalizado' THEN
    RAISE EXCEPTION 'P49T FAIL (c): a decisão deixou a candidatura %/% (esperado aprovado/finalizado)', c_etapa, c_status;
  END IF;
  PERFORM set_config('smoke49t.pass', (current_setting('smoke49t.pass')::int + 1)::text, false);

  -- ── (c2) julgamento — a sanção `decisao` sobre candidatura JÁ encerrada ─────
  IF c2_antes_etapa IS DISTINCT FROM 'triagem' OR c2_antes_status IS DISTINCT FROM 'finalizado' THEN
    RAISE EXCEPTION 'P49T FAIL (c2): pré-condição — a fixture legada ficou %/% (esperado triagem/finalizado, encerrada SÓ pelo status)', c2_antes_etapa, c2_antes_status;
  END IF;
  IF c2_state IS DISTINCT FROM 'ACEITO' THEN
    RAISE EXCEPTION 'P49T FAIL (c2): registrar_decisao sobre candidatura JÁ encerrada (triagem/finalizado → aprovado) devolveu «%» (esperado aceito pela GUC `decisao`). Recusado = a exceção do D-35 não foi instalada e o caso legado fica sem caminho', c2_state;
  END IF;
  IF c2_etapa IS DISTINCT FROM 'aprovado' OR c2_status IS DISTINCT FROM 'finalizado' THEN
    RAISE EXCEPTION 'P49T FAIL (c2): a decisão sancionada deixou a candidatura %/% (esperado aprovado/finalizado)', c2_etapa, c2_status;
  END IF;
  IF c2_hist_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P49T FAIL (c2): % linha(s) triagem→aprovado no histórico (esperado exatamente 1 — a trilha da decisão legada tem de existir)', c2_hist_n;
  END IF;
  PERFORM set_config('smoke49t.pass', (current_setting('smoke49t.pass')::int + 1)::text, false);

  -- ── (g) julgamento — a GUC não vaza ────────────────────────────────────────
  IF g_guc IS DISTINCT FROM '' THEN
    RAISE EXCEPTION 'P49T FAIL (g): depois de uma reabertura e de duas decisões na MESMA transação, app.transicao_sancionada = «%» (esperado vazio). `set_config(…, true)` vale até o fim da TRANSAÇÃO: sem o reset dentro das RPCs, uma sanção legítima abre todo UPDATE seguinte', g_guc;
  END IF;
  IF g_state NOT LIKE '23514:%candidatura encerrada%' THEN
    RAISE EXCEPTION 'P49T FAIL (g): o UPDATE cru de etapa sobre candidatura encerrada, DEPOIS das transições sancionadas, devolveu «%» (esperado 23514 «candidatura encerrada») — a GUC vazou', g_state;
  END IF;
  PERFORM set_config('smoke49t.pass', (current_setting('smoke49t.pass')::int + 1)::text, false);
END
$p1$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (j) NEGATIVA — nada das fixtures sobreviveu; contagens globais iguais às de antes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $j$
DECLARE
  v_ids   uuid[] := coalesce(string_to_array(rtrim(current_setting('smoke49t.fixtures'), ','), ',')::uuid[], '{}');
  l_cand  int;  l_hist int;  l_df int;  l_fila int;  l_tit int;
  g_cand  bigint;  g_hist bigint;  g_df bigint;  g_notif bigint;  g_netq bigint;
BEGIN
  IF cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'P49T FAIL (j): nenhuma fixture registrada — a negativa não teria o que conferir';
  END IF;
  SELECT count(*) INTO l_cand FROM public.candidaturas c WHERE c.id = ANY (v_ids);
  SELECT count(*) INTO l_hist FROM public.historico_candidatura h WHERE h.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_df   FROM public.decisao_final d WHERE d.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_fila FROM net.http_request_queue q
   WHERE convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = ANY (v_ids::text[]);
  SELECT count(*) INTO l_tit  FROM public.candidatos c WHERE c.email LIKE 'p49tsmoke-%@invalido.local';
  IF l_cand <> 0 OR l_hist <> 0 OR l_df <> 0 OR l_fila <> 0 OR l_tit <> 0 THEN
    RAISE EXCEPTION 'P49T FAIL (j): RESÍDUO das fixtures — candidaturas=% historico=% decisao_final=% fila=% titulares=% (a subtransação não reverteu; um despacho COMMITADO sai como e-mail a candidato)',
      l_cand, l_hist, l_df, l_fila, l_tit;
  END IF;

  SELECT count(*) INTO g_cand  FROM public.candidaturas;
  SELECT count(*) INTO g_hist  FROM public.historico_candidatura;
  SELECT count(*) INTO g_df    FROM public.decisao_final;
  SELECT count(*) INTO g_notif FROM public.notificacoes_enviadas;
  SELECT count(*) INTO g_netq  FROM net.http_request_queue;
  IF g_cand  IS DISTINCT FROM current_setting('smoke49t.n_cand')::bigint
     OR g_hist  IS DISTINCT FROM current_setting('smoke49t.n_hist')::bigint
     OR g_df    IS DISTINCT FROM current_setting('smoke49t.n_df')::bigint
     OR g_notif IS DISTINCT FROM current_setting('smoke49t.n_notif')::bigint
     OR g_netq  IS DISTINCT FROM current_setting('smoke49t.n_netq')::bigint THEN
    RAISE EXCEPTION 'P49T FAIL (j): contagem global mudou (candidaturas % -> %, historico % -> %, decisao_final % -> %, notificacoes % -> %, fila % -> %) com resíduo ZERO das fixtures — o delta é de tráfego concorrente commitado durante a requisição; rodar de novo',
      current_setting('smoke49t.n_cand'), g_cand, current_setting('smoke49t.n_hist'), g_hist,
      current_setting('smoke49t.n_df'), g_df, current_setting('smoke49t.n_notif'), g_notif,
      current_setting('smoke49t.n_netq'), g_netq;
  END IF;
  PERFORM set_config('smoke49t.pass', (current_setting('smoke49t.pass')::int + 1)::text, false);
END
$j$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke49t.pass')::int <> 8 THEN
    RAISE EXCEPTION 'P49T FAIL (gate): pass = % de 8 — alguma asserção não incrementou o contador', current_setting('smoke49t.pass');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('app.transicao_sancionada', '', false);
SELECT json_build_object(
  'smoke',    'p49_trilha',
  'pass',     current_setting('smoke49t.pass')::int,
  'esperado', 8,
  'n_cand',   current_setting('smoke49t.n_cand')::int,
  'n_hist',   current_setting('smoke49t.n_hist')::int,
  'n_df',     current_setting('smoke49t.n_df')::int,
  'n_notif',  current_setting('smoke49t.n_notif')::int,
  'n_netq',   current_setting('smoke49t.n_netq')::int
) AS resultado;
