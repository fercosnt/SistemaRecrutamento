-- =============================================================================
-- Phase 48 / Plano 48-11 — smoke da REABERTURA pelo veredito `revertida`
--                          (JORN-19 · D-01 · D-10 · D-23)
-- =============================================================================
-- O QUE ELE VIGIA.
--   · 20260921000011 — `responder_revisao_decisao('revertida')` REABRE a candidatura na mesma
--     transação: `decisao_final/em_analise`, `data_decisao_final = NULL`, `reaberta_em` e
--     `prazo_nova_decisao_em` (10 dias corridos em SP) no MESMO UPDATE do veredito, histórico
--     `rejeitado→decisao_final` com justificativa PRÓPRIA; `snapshot_decisao_final` arquiva o
--     ciclo. Nunca aprova (D-01, RNF-07a).
--   · 20260921000012 — `registrar_decisao`: D-23 (quem teve a decisão revertida não registra a
--     nova decisão do caso), fail-closed sem JWT, e a zeragem do ciclo na nova decisão de uma
--     linha reaberta (o snapshot AFTER UPDATE arquiva OLD antes). Parte 2, abaixo.
--
-- PARTE 1 (20260921000011):
--   (a) REABRIR: A decide `rejeitado`; o TITULAR pede revisão; B responde `revertida` ⇒
--       candidatura `decisao_final`/`em_analise`, `data_decisao_final IS NULL`; EXATAMENTE 1 linha
--       nova `rejeitado→decisao_final` em `historico_candidatura` com `criterio_texto` =
--       «Candidatura reaberta após revisão (Art. 20) — aguardando nova decisão até DD/MM/AAAA.»
--       (data = hoje em SP + 10) e `ator` = B; `reaberta_em` preenchido; `prazo_nova_decisao_em` =
--       00:00 de SP do dia (hoje em SP + 11); `decisao` segue `rejeitado` (reabrir ≠ aprovar); o
--       snapshot arquivou a linha anterior COM o ciclo (pedido de revisão, veredito ainda nulo); a
--       fila tem o `revisao_respondida` e NENHUM despacho `decisao` novo (a regressão para
--       `decisao_final` é silenciosa).
--   (b) `mantida` numa 2ª fixture ⇒ `candidaturas` intacta (to_jsonb da linha igual), nenhuma
--       linha nova de histórico, `reaberta_em`/`prazo_nova_decisao_em` nulos.
--   (c) `revertida` sobre decisão `aprovado` ⇒ 22023 «nada a reabrir» e ZERO escrita (linha de
--       `decisao_final`, candidatura, contagens do arquivo e do histórico idênticas); idem sobre
--       decisão `rejeitado` com a candidatura FORA de `rejeitado/rejeitado`.
--   (d) A (o decisor) tenta responder a revisão da própria decisão ⇒ 42501 «decisor» (invariante
--       REVISAO-05 preservada pela redefinição).
--   (m) ACRESCENTADA na Phase 49 / plano 49-06 (D-35): a trava de `avancar_etapa()` recusa mover
--       candidatura ENCERRADA, e a fixture F4 abaixo é exatamente esse UPDATE. Ela passa a entrar
--       pela GUC sancionada — e (m) prova, numa subtransação que reverte, que o MESMO UPDATE SEM
--       a GUC é recusado com `check_violation` «candidatura encerrada». Sem esta asserção o
--       `set_config` da fixture seria um afrouxamento invisível: o smoke ficaria verde tanto com
--       a trava quanto sem ela.
-- PARTE 2 (20260921000012) — descrita no bloco dela: (e) D-23 pela linha vigente, (f) em_espera
--   de C aceito sem zerar o ciclo (A5), (g) D-23 pelo ARQUIVO, (h) nova decisão de C zera o ciclo e
--   o arquivo guarda a decisão revertida de A, (i) A não sobrescreve a decisão de C, (j) fail-closed
--   sem JWT (id existente e inexistente), (k) redecisão fora de reabertura não zera nada.
-- NEGATIVA:
--   (l) nada das fixtures sobrevive (candidaturas, decisão, arquivo, histórico, fila) e as
--       contagens globais de `decisao_final`, `decisao_final_historico`, `historico_candidatura`,
--       `candidaturas` e `net.http_request_queue` são as de antes.
--
-- A FIXTURE NÃO É UMA CANDIDATURA REAL (desvio deliberado da letra do plano, idioma do 48-08 e do
-- 48-09): o operador pode estar exercitando as contas `+claude` em PROD (48-05) e um UPDATE nelas,
-- mesmo revertido, disputa lock de linha com o fluxo vivo. Titular sintético `@invalido.local`,
-- candidatura que nasce `status='rejeitado'` (desarma `trg_notif_confirmacao`) e é levada a
-- `em_analise` por UPDATE. Os ATORES são reais — três RH/admin ATIVOS lidos NA EXECUÇÃO (FK de
-- `por_usuario` / `revisao_por_usuario` / `historico_candidatura.ator`), nunca contas fixas:
--   A decide (administrador), C redecide (administrador ≠ A), B revisa (RH/admin ≠ A, C).
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL encerrada
-- por `RAISE EXCEPTION` com SQLSTATE próprio (`P48R1`/`P48R2`), capturado logo acima: ROLLBACK da
-- subtransação inteira, inclusive das linhas que os triggers enfileiram em `net.http_request_queue`
-- (o worker do `pg_net` só vê o que foi COMMITADO). NOTIFICACOES_MODO = 'producao', mas nada daqui
-- é commitado — nenhum e-mail sai. Os valores medidos ficam em variáveis PL/pgSQL (não revertidas)
-- e o julgamento é feito FORA da subtransação. O contador é incrementado fora dela.
--
-- AS CONTAGENS GLOBAIS DE (l) NÃO SÃO FOTOGRAFIA (D-17): baseline capturada NA PRÓPRIA execução.
-- A asserção que decide é a de resíduo ESCOPADA às fixtures; a global é o cinto — divergência com
-- resíduo zero é tráfego concorrente commitado durante a requisição, e a mensagem diz isso.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p48_reabertura_smoke.sql` — UMA requisição,
-- UMA sessão. O `SELECT` final devolve `{smoke, pass, esperado, ...}`; qualquer FAIL é
-- `RAISE EXCEPTION` e o `p46apply` sai com código ≠ 0.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO: é o número de asserções DESTE arquivo (escopo
-- deliberado), não uma fotografia do banco.
--
-- ⚠ BUMP DO ESPERADO: 12 → 13 na Phase 49 / plano 49-06, pela asserção (m) acrescentada acima
-- (o idioma do 48-01: o re-pin/bump é ato consciente, registrado no cabeçalho, na MESMA entrega
-- da migration que o motiva — `20260922000003_p49_trava_encerrada.sql`).
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('smoke48r.pass', '0', false);
SELECT set_config('smoke48r.fixtures', '', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — atores vivos (leitura) e contagens para a negativa.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_a    uuid;
  v_b    uuid;
  v_c    uuid;
  v_vaga uuid;
BEGIN
  -- A e C: administradores (registrar_decisao exige dono da vaga para 'rh'; administrador não).
  SELECT u.user_id INTO v_a
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  SELECT u.user_id INTO v_c
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
     AND u.user_id <> v_a
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  -- B: qualquer RH/admin ativo distinto dos dois (o revisor ≠ decisor, REVISAO-05).
  SELECT u.user_id INTO v_b
    FROM public.usuarios_rh u
   WHERE u.role IN ('administrador', 'recrutador') AND u.ativo AND u.deleted_at IS NULL
     AND u.user_id IS NOT NULL AND u.user_id <> v_a AND u.user_id <> v_c
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_a IS NULL OR v_c IS NULL OR v_b IS NULL THEN
    RAISE EXCEPTION 'P48R FAIL (baseline): faltam atores ATIVOS — A=% C=% B=% (preciso de 2 administradores e de um 3o RH/admin, todos distintos)',
      coalesce(v_a::text, '<nulo>'), coalesce(v_c::text, '<nulo>'), coalesce(v_b::text, '<nulo>');
  END IF;

  SELECT v.id INTO v_vaga FROM public.vagas v ORDER BY v.created_at LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P48R FAIL (baseline): nenhuma vaga viva para a fixture';
  END IF;

  PERFORM set_config('smoke48r.a', v_a::text, false);
  PERFORM set_config('smoke48r.b', v_b::text, false);
  PERFORM set_config('smoke48r.c', v_c::text, false);
  -- vocabulário do JWT (o hook mapeia recrutador → rh), nunca o da coluna
  PERFORM set_config('smoke48r.b_role',
    (SELECT CASE WHEN u.role = 'administrador' THEN 'administrador' ELSE 'rh' END
       FROM public.usuarios_rh u WHERE u.user_id = v_b), false);
  PERFORM set_config('smoke48r.vaga', v_vaga::text, false);

  PERFORM set_config('smoke48r.n_df',   (SELECT count(*) FROM public.decisao_final)::text, false);
  PERFORM set_config('smoke48r.n_dfh',  (SELECT count(*) FROM public.decisao_final_historico)::text, false);
  PERFORM set_config('smoke48r.n_hist', (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke48r.n_cand', (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke48r.n_netq', (SELECT count(*) FROM net.http_request_queue)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1 — (a) (b) (c) (d), numa subtransação que reverte.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p1$
DECLARE
  v_a      uuid := current_setting('smoke48r.a')::uuid;
  v_b      uuid := current_setting('smoke48r.b')::uuid;
  v_b_role text := current_setting('smoke48r.b_role');
  v_vaga   uuid := current_setting('smoke48r.vaga')::uuid;
  v_ids    text := '';
  v_ran    boolean := false;
  v_err    text;
  v_user   uuid;
  v_email  text;
  v_cand   uuid;
  v_f1     uuid;  v_u1 uuid;
  v_f2     uuid;  v_u2 uuid;
  v_f3     uuid;
  v_f4     uuid;  v_u4 uuid;
  v_i      int;
  v_lim    date;
  -- (a)
  a_etapa  text;  a_status text;  a_ddf timestamptz;  a_decisao text;
  a_hist_n int;   a_crit text;    a_ator uuid;
  a_reab   timestamptz;  a_prazo timestamptz;  a_prazo_esp timestamptz;  a_crit_esp text;
  a_dfh_ciclo int;  a_resp_n int;  a_dec_n int;  a_veredito text;
  -- (b)
  b_cand_antes text;  b_cand_depois text;  b_hist_antes int;  b_hist_depois int;
  b_reab timestamptz;  b_prazo timestamptz;  b_veredito text;
  -- (c)
  c1_state text;  c1_df_antes text;  c1_df_depois text;  c1_cand_antes text;  c1_cand_depois text;
  c1_dfh_antes int;  c1_dfh_depois int;  c1_hist_antes int;  c1_hist_depois int;
  c2_state text;  c2_df_antes text;  c2_df_depois text;  c2_cand_antes text;  c2_cand_depois text;
  c2_dfh_antes int;  c2_dfh_depois int;  c2_hist_antes int;  c2_hist_depois int;
  -- (d)
  d_state text;  d_resp timestamptz;
  -- (m) P49 / D-35
  m_state text;
BEGIN
  BEGIN
    -- ── fixtures: 4 titulares sintéticos, candidaturas em decisao_final/em_analise ──
    FOR v_i IN 1..4 LOOP
      v_user  := gen_random_uuid();
      v_email := 'p48rsmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                              created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
      VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              v_email, '', now(), now(),
              '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
      INSERT INTO public.candidatos
        (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
      VALUES
        (v_user, 'SMOKE P48R Titular ' || v_i, v_email, '(11) 96666-55' || lpad(v_i::text, 2, '0'),
         DATE '1990-01-15', 'Santos', 'SP', 'site')
      RETURNING id INTO v_cand;
      INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
      VALUES (v_cand, v_vaga, 'decisao_final', 'rejeitado', false, now() - interval '20 days')
      RETURNING id INTO v_cand;
      UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_cand;
      v_ids := v_ids || v_cand::text || ',';
      IF v_i = 1 THEN v_f1 := v_cand; v_u1 := v_user;
      ELSIF v_i = 2 THEN v_f2 := v_cand; v_u2 := v_user;
      ELSIF v_i = 3 THEN v_f3 := v_cand;
      ELSE v_f4 := v_cand; v_u4 := v_user;
      END IF;
    END LOOP;

    -- ── A decide: F1, F2, F4 rejeitado; F3 aprovado ──────────────────────────────
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_a::text, 'app_metadata', json_build_object('role', 'administrador'))::text, false);
    PERFORM public.registrar_decisao(v_f1, 'rejeitado',
      'Decisao final sintetica do smoke P48R (F1), rejeitado pelo administrador A, mais de 50 caracteres.');
    PERFORM public.registrar_decisao(v_f2, 'rejeitado',
      'Decisao final sintetica do smoke P48R (F2), rejeitado pelo administrador A, mais de 50 caracteres.');
    PERFORM public.registrar_decisao(v_f3, 'aprovado',
      'Decisao final sintetica do smoke P48R (F3), aprovado pelo administrador A, mais de 50 caracteres.');
    PERFORM public.registrar_decisao(v_f4, 'rejeitado',
      'Decisao final sintetica do smoke P48R (F4), rejeitado pelo administrador A, mais de 50 caracteres.');

    -- ── os TITULARES pedem revisão (F1, F2, F4) ──────────────────────────────────
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_u1::text, 'app_metadata', json_build_object('role', 'candidato'))::text, false);
    PERFORM public.solicitar_revisao_decisao(v_f1);
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_u2::text, 'app_metadata', json_build_object('role', 'candidato'))::text, false);
    PERFORM public.solicitar_revisao_decisao(v_f2);
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_u4::text, 'app_metadata', json_build_object('role', 'candidato'))::text, false);
    PERFORM public.solicitar_revisao_decisao(v_f4);
    PERFORM set_config('request.jwt.claims', '', false);
    -- F3 (aprovado): solicitar_revisao só existe para rejeitado; o pedido é posto direto (postgres)
    -- para que (c) chegue ao guard novo e não pare em «sem pedido de revisão».
    UPDATE public.decisao_final SET revisao_solicitada_em = now() WHERE candidatura_id = v_f3;
    -- F4: decisão rejeitado, mas a candidatura sai de rejeitado/rejeitado (regressão justificada).
    --
    -- PROVENIÊNCIA (Phase 49 / plano 49-06 / D-35): depois de `registrar_decisao(v_f4,'rejeitado')`
    -- a candidatura está `rejeitado/rejeitado` — ENCERRADA pelo predicado canônico. A trava de
    -- `avancar_etapa()` (migration 20260922000003) RECUSA este UPDATE cru, e é por isso que ele
    -- passa a declarar a sanção. A fixture não foi afrouxada: (m) logo abaixo prova, na mesma
    -- transação e numa subtransação que reverte, que sem a GUC a trava morde.
    --
    -- ── (m) o MESMO UPDATE, SEM a GUC ⇒ recusado ────────────────────────────────
    BEGIN
      UPDATE public.candidaturas
         SET etapa_atual = 'decisao_final', status = 'em_analise',
             etapa_justificativa = 'Sonda P48R (m): o mesmo UPDATE da F4 sem a GUC sancionada.'
       WHERE id = v_f4;
      m_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN
      m_state := SQLSTATE || ':' || SQLERRM;   -- a subtransação implícita já reverteu
    END;

    PERFORM set_config('app.transicao_sancionada', 'reabertura', true);
    UPDATE public.candidaturas
       SET etapa_atual = 'decisao_final', status = 'em_analise',
           etapa_justificativa = 'Fixture do smoke P48R (c): candidatura fora de rejeitado/rejeitado.'
     WHERE id = v_f4;
    PERFORM set_config('app.transicao_sancionada', '', true);

    -- ── (d) A (o decisor) tenta responder a revisão da PRÓPRIA decisão ───────────
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_a::text, 'app_metadata', json_build_object('role', 'administrador'))::text, false);
    BEGIN
      PERFORM public.responder_revisao_decisao(v_f1, 'revertida',
        'Tentativa do DECISOR de responder a propria revisao no smoke P48R (d), mais de 50 caracteres.');
      d_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN
      d_state := SQLSTATE || ':' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', '', false);
    SELECT revisao_respondida_em INTO d_resp FROM public.decisao_final WHERE candidatura_id = v_f1;

    -- ── (a) B responde `revertida` em F1 ─────────────────────────────────────────
    SELECT count(*) INTO b_hist_antes FROM public.historico_candidatura WHERE candidatura_id = v_f2;
    SELECT to_jsonb(c)::text INTO b_cand_antes FROM public.candidaturas c WHERE c.id = v_f2;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_b::text, 'app_metadata', json_build_object('role', v_b_role))::text, false);
    PERFORM public.responder_revisao_decisao(v_f1, 'revertida',
      'Revisao sintetica do smoke P48R (a) pelo revisor B: a rejeicao nao se sustenta, reabrir o caso.');

    -- ── (b) B responde `mantida` em F2 ───────────────────────────────────────────
    PERFORM public.responder_revisao_decisao(v_f2, 'mantida',
      'Revisao sintetica do smoke P48R (b) pelo revisor B: a rejeicao se sustenta, decisao mantida.');

    -- ── (c) `revertida` sobre F3 (aprovado) e sobre F4 (candidatura fora de rejeitado) ──
    SELECT to_jsonb(d)::text INTO c1_df_antes FROM public.decisao_final d WHERE d.candidatura_id = v_f3;
    SELECT to_jsonb(c)::text INTO c1_cand_antes FROM public.candidaturas c WHERE c.id = v_f3;
    SELECT count(*) INTO c1_dfh_antes FROM public.decisao_final_historico WHERE candidatura_id = v_f3;
    SELECT count(*) INTO c1_hist_antes FROM public.historico_candidatura WHERE candidatura_id = v_f3;
    BEGIN
      PERFORM public.responder_revisao_decisao(v_f3, 'revertida',
        'Revisao sintetica do smoke P48R (c.1): revertida sobre decisao aprovado, mais de 50 caracteres.');
      c1_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN
      c1_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT to_jsonb(d)::text INTO c1_df_depois FROM public.decisao_final d WHERE d.candidatura_id = v_f3;
    SELECT to_jsonb(c)::text INTO c1_cand_depois FROM public.candidaturas c WHERE c.id = v_f3;
    SELECT count(*) INTO c1_dfh_depois FROM public.decisao_final_historico WHERE candidatura_id = v_f3;
    SELECT count(*) INTO c1_hist_depois FROM public.historico_candidatura WHERE candidatura_id = v_f3;

    SELECT to_jsonb(d)::text INTO c2_df_antes FROM public.decisao_final d WHERE d.candidatura_id = v_f4;
    SELECT to_jsonb(c)::text INTO c2_cand_antes FROM public.candidaturas c WHERE c.id = v_f4;
    SELECT count(*) INTO c2_dfh_antes FROM public.decisao_final_historico WHERE candidatura_id = v_f4;
    SELECT count(*) INTO c2_hist_antes FROM public.historico_candidatura WHERE candidatura_id = v_f4;
    BEGIN
      PERFORM public.responder_revisao_decisao(v_f4, 'revertida',
        'Revisao sintetica do smoke P48R (c.2): revertida com candidatura fora de rejeitado, 50+ caracteres.');
      c2_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN
      c2_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT to_jsonb(d)::text INTO c2_df_depois FROM public.decisao_final d WHERE d.candidatura_id = v_f4;
    SELECT to_jsonb(c)::text INTO c2_cand_depois FROM public.candidaturas c WHERE c.id = v_f4;
    SELECT count(*) INTO c2_dfh_depois FROM public.decisao_final_historico WHERE candidatura_id = v_f4;
    SELECT count(*) INTO c2_hist_depois FROM public.historico_candidatura WHERE candidatura_id = v_f4;
    PERFORM set_config('request.jwt.claims', '', false);

    -- ── medições de (a) ──────────────────────────────────────────────────────────
    SELECT c.etapa_atual::text, c.status::text, c.data_decisao_final
      INTO a_etapa, a_status, a_ddf
      FROM public.candidaturas c WHERE c.id = v_f1;
    SELECT count(*), max(h.criterio_texto), max(h.ator::text)::uuid
      INTO a_hist_n, a_crit, a_ator
      FROM public.historico_candidatura h
     WHERE h.candidatura_id = v_f1 AND h.etapa_de = 'rejeitado' AND h.etapa_para = 'decisao_final';
    SELECT d.reaberta_em, d.prazo_nova_decisao_em, d.decisao::text, d.revisao_veredito
      INTO a_reab, a_prazo, a_decisao, a_veredito
      FROM public.decisao_final d WHERE d.candidatura_id = v_f1;
    v_lim       := (now() AT TIME ZONE 'America/Sao_Paulo')::date + 10;
    a_prazo_esp := ((v_lim + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo');
    a_crit_esp  := 'Candidatura reaberta após revisão (Art. 20) — aguardando nova decisão até '
                   || to_char(v_lim, 'DD/MM/YYYY') || '.';
    -- o snapshot da resposta arquivou a linha ANTERIOR com o ciclo (pedido presente, veredito nulo)
    SELECT count(*) INTO a_dfh_ciclo
      FROM public.decisao_final_historico h
     WHERE h.candidatura_id = v_f1 AND h.decisao = 'rejeitado' AND h.por_usuario = v_a
       AND h.revisao_solicitada_em IS NOT NULL AND h.revisao_veredito IS NULL;
    SELECT count(*) FILTER (WHERE convert_from(q.body, 'UTF8')::jsonb ->> 'evento' = 'revisao_respondida'),
           count(*) FILTER (WHERE convert_from(q.body, 'UTF8')::jsonb ->> 'evento' = 'decisao')
      INTO a_resp_n, a_dec_n
      FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-candidato'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = v_f1::text;

    -- ── medições de (b) ──────────────────────────────────────────────────────────
    SELECT count(*) INTO b_hist_depois FROM public.historico_candidatura WHERE candidatura_id = v_f2;
    SELECT to_jsonb(c)::text INTO b_cand_depois FROM public.candidaturas c WHERE c.id = v_f2;
    SELECT d.reaberta_em, d.prazo_nova_decisao_em, d.revisao_veredito
      INTO b_reab, b_prazo, b_veredito
      FROM public.decisao_final d WHERE d.candidatura_id = v_f2;

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P48R1';
  EXCEPTION
    WHEN SQLSTATE 'P48R1' THEN NULL;  -- ROLLBACK: fixtures, decisões, ciclo, histórico e fila somem
    WHEN OTHERS THEN
      v_err := SQLSTATE || ': ' || SQLERRM;
  END;
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('smoke48r.fixtures', current_setting('smoke48r.fixtures') || v_ids, false);

  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P48R FAIL (parte 1): a fixture/o ciclo não rodou até o fim — %', coalesce(v_err, 'sem erro, mas sem marca de execução');
  END IF;

  -- ── (a) julgamento ────────────────────────────────────────────────────────────
  IF a_etapa IS DISTINCT FROM 'decisao_final' OR a_status IS DISTINCT FROM 'em_analise' THEN
    RAISE EXCEPTION 'P48R FAIL (a): revertida não reabriu — candidatura ficou %/% (esperado decisao_final/em_analise; NUNCA aprovado, D-01)', a_etapa, a_status;
  END IF;
  IF a_ddf IS NOT NULL THEN
    RAISE EXCEPTION 'P48R FAIL (a): data_decisao_final = % na reabertura (A4: tem de ser NULL — o cartão «Entenda a decisão» apontaria para a decisão revertida)', a_ddf;
  END IF;
  IF a_hist_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P48R FAIL (a): % linha(s) rejeitado→decisao_final no histórico (esperado exatamente 1)', a_hist_n;
  END IF;
  IF a_crit IS DISTINCT FROM a_crit_esp THEN
    RAISE EXCEPTION 'P48R FAIL (a): criterio_texto da reabertura = «%», esperado «%» (texto PRÓPRIO — nunca o residual nem o do revisor)', a_crit, a_crit_esp;
  END IF;
  IF a_ator IS DISTINCT FROM v_b THEN
    RAISE EXCEPTION 'P48R FAIL (a): ator da reabertura = %, esperado o revisor B %', a_ator, v_b;
  END IF;
  IF a_reab IS NULL THEN
    RAISE EXCEPTION 'P48R FAIL (a): reaberta_em não foi gravado';
  END IF;
  IF a_prazo IS DISTINCT FROM a_prazo_esp THEN
    RAISE EXCEPTION 'P48R FAIL (a): prazo_nova_decisao_em = %, esperado % (00:00 de SP do dia hoje-em-SP + 11 — fim do 10o dia corrido, D-10/A3)', a_prazo, a_prazo_esp;
  END IF;
  IF a_decisao IS DISTINCT FROM 'rejeitado' OR a_veredito IS DISTINCT FROM 'revertida' THEN
    RAISE EXCEPTION 'P48R FAIL (a): decisao_final ficou decisao=% veredito=% (esperado rejeitado/revertida — reabrir não decide nada)', a_decisao, a_veredito;
  END IF;
  IF a_dfh_ciclo < 1 THEN
    RAISE EXCEPTION 'P48R FAIL (a): o snapshot da resposta não arquivou o ciclo (nenhuma linha do arquivo com revisao_solicitada_em e veredito nulo) — snapshot_decisao_final sem as colunas novas?';
  END IF;
  IF a_resp_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P48R FAIL (a): % despacho(s) revisao_respondida para a fixture (esperado 1 — é o aviso da reabertura)', a_resp_n;
  END IF;
  IF a_dec_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P48R FAIL (a): % despacho(s) decisao para a fixture (esperado 1 — só o da rejeição de A; a regressão para decisao_final não despacha)', a_dec_n;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── (b) julgamento ────────────────────────────────────────────────────────────
  IF b_veredito IS DISTINCT FROM 'mantida' THEN
    RAISE EXCEPTION 'P48R FAIL (b): o veredito mantida não foi gravado (%)', b_veredito;
  END IF;
  IF b_cand_depois IS DISTINCT FROM b_cand_antes OR b_hist_depois IS DISTINCT FROM b_hist_antes THEN
    RAISE EXCEPTION 'P48R FAIL (b): mantida MEXEU na candidatura (linha mudou: %; histórico % -> %)',
      (b_cand_depois IS DISTINCT FROM b_cand_antes), b_hist_antes, b_hist_depois;
  END IF;
  IF b_reab IS NOT NULL OR b_prazo IS NOT NULL THEN
    RAISE EXCEPTION 'P48R FAIL (b): mantida gravou reaberta_em=% prazo=%', b_reab, b_prazo;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── (c) julgamento ────────────────────────────────────────────────────────────
  IF c1_state NOT LIKE '22023:%nada a reabrir%' THEN
    RAISE EXCEPTION 'P48R FAIL (c.1): revertida sobre decisão aprovado devolveu «%» (esperado 22023 nada a reabrir)', c1_state;
  END IF;
  IF c1_df_depois IS DISTINCT FROM c1_df_antes OR c1_cand_depois IS DISTINCT FROM c1_cand_antes
     OR c1_dfh_depois IS DISTINCT FROM c1_dfh_antes OR c1_hist_depois IS DISTINCT FROM c1_hist_antes THEN
    RAISE EXCEPTION 'P48R FAIL (c.1): a recusa ESCREVEU (decisao mudou=% candidatura mudou=% arquivo % -> % histórico % -> %)',
      (c1_df_depois IS DISTINCT FROM c1_df_antes), (c1_cand_depois IS DISTINCT FROM c1_cand_antes),
      c1_dfh_antes, c1_dfh_depois, c1_hist_antes, c1_hist_depois;
  END IF;
  IF c2_state NOT LIKE '22023:%nada a reabrir%' THEN
    RAISE EXCEPTION 'P48R FAIL (c.2): revertida com candidatura fora de rejeitado/rejeitado devolveu «%» (esperado 22023 nada a reabrir)', c2_state;
  END IF;
  IF c2_df_depois IS DISTINCT FROM c2_df_antes OR c2_cand_depois IS DISTINCT FROM c2_cand_antes
     OR c2_dfh_depois IS DISTINCT FROM c2_dfh_antes OR c2_hist_depois IS DISTINCT FROM c2_hist_antes THEN
    RAISE EXCEPTION 'P48R FAIL (c.2): a recusa ESCREVEU (decisao mudou=% candidatura mudou=% arquivo % -> % histórico % -> %)',
      (c2_df_depois IS DISTINCT FROM c2_df_antes), (c2_cand_depois IS DISTINCT FROM c2_cand_antes),
      c2_dfh_antes, c2_dfh_depois, c2_hist_antes, c2_hist_depois;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── (d) julgamento ────────────────────────────────────────────────────────────
  IF d_state NOT LIKE '42501:%decisor%' THEN
    RAISE EXCEPTION 'P48R FAIL (d): o decisor respondendo a própria revisão devolveu «%» (esperado 42501 decisor — REVISAO-05)', d_state;
  END IF;
  IF d_resp IS NOT NULL THEN
    RAISE EXCEPTION 'P48R FAIL (d): a tentativa recusada do decisor gravou revisao_respondida_em';
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── (m) julgamento — a trava D-35 morde sem a GUC (P49 / 49-06) ──────────────
  IF m_state NOT LIKE '23514:%candidatura encerrada%' THEN
    RAISE EXCEPTION 'P48R FAIL (m): o MESMO UPDATE da fixture F4 SEM a GUC sancionada devolveu «%» (esperado 23514 check_violation «candidatura encerrada (etapa …, status …) — não pode mudar de etapa»). Se saiu ACEITO, a trava D-35 de avancar_etapa NÃO está no ar e o set_config da fixture acima virou afrouxamento invisível', m_state;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);
END
$p1$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 2 (20260921000012) — (e)..(k), numa subtransação que reverte.
--   G1: A rejeita → titular pede revisão → B `revertida` (G1 REABERTA, como em (a)). Então:
--   (e) A (o decisor revertido) `registrar_decisao` ⇒ 42501 D-23 (trava pela linha VIGENTE).
--   (f) C `registrar_decisao('em_espera')` ⇒ aceito; `reaberta_em`, `prazo_nova_decisao_em` e
--       `revisao_veredito` seguem preenchidos (A5: em_espera NÃO é nova decisão); candidatura
--       segue `decisao_final/em_analise`.
--   (g) A de novo ⇒ 42501 D-23 — agora a trava vem do ARQUIVO: a linha vigente é o em_espera
--       de C (por_usuario = C) e a linha revertida de A foi arquivada pelo snapshot.
--   (h) C `registrar_decisao('aprovado')` ⇒ aceito; candidatura `aprovado/finalizado`; as 9
--       colunas do ciclo NULL na linha vigente; existe no arquivo a linha `revertida` de A.
--   (i) A `registrar_decisao('rejeitado')` ⇒ 42501 (não sobrescreve a decisão de C).
--   (j) sem claims ⇒ 42501 (fail-closed) — também com um id INEXISTENTE (sem oráculo P0002).
--   G2: A rejeita → titular pede revisão (pendente, NÃO reaberta). Então:
--   (k) C redecide `rejeitado` FORA de reabertura ⇒ `revisao_solicitada_em` intacto (hoje).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p2$
DECLARE
  v_a      uuid := current_setting('smoke48r.a')::uuid;
  v_b      uuid := current_setting('smoke48r.b')::uuid;
  v_c      uuid := current_setting('smoke48r.c')::uuid;
  v_b_role text := current_setting('smoke48r.b_role');
  v_vaga   uuid := current_setting('smoke48r.vaga')::uuid;
  v_ids    text := '';
  v_ran    boolean := false;
  v_err    text;
  v_user   uuid;
  v_email  text;
  v_cand   uuid;
  v_g1     uuid;  v_ug1 uuid;
  v_g2     uuid;  v_ug2 uuid;
  v_i      int;
  v_claims_a text;
  v_claims_c text;
  -- medições
  e_state text;  f_state text;  g_state text;  h_state text;  i_state text;
  j_state text;  j2_state text;  k_state text;
  f_reab timestamptz;  f_prazo timestamptz;  f_ver text;  f_dec text;  f_por uuid;
  f_etapa text;  f_status text;
  g_vig_dec text;  g_vig_por uuid;  g_arq_a int;
  h_etapa text;  h_status text;  h_ddf timestamptz;  h_dec text;  h_por uuid;  h_ciclo_nn int;  h_arq_a int;
  k_sol_antes timestamptz;  k_sol_depois timestamptz;  k_reab timestamptz;  k_dec text;
BEGIN
  BEGIN
    -- ── fixtures ────────────────────────────────────────────────────────────────
    FOR v_i IN 1..2 LOOP
      v_user  := gen_random_uuid();
      v_email := 'p48rsmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                              created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
      VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              v_email, '', now(), now(),
              '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
      INSERT INTO public.candidatos
        (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
      VALUES
        (v_user, 'SMOKE P48R Titular G' || v_i, v_email, '(11) 96666-56' || lpad(v_i::text, 2, '0'),
         DATE '1990-01-15', 'Santos', 'SP', 'site')
      RETURNING id INTO v_cand;
      INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
      VALUES (v_cand, v_vaga, 'decisao_final', 'rejeitado', false, now() - interval '20 days')
      RETURNING id INTO v_cand;
      UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_cand;
      v_ids := v_ids || v_cand::text || ',';
      IF v_i = 1 THEN v_g1 := v_cand; v_ug1 := v_user; ELSE v_g2 := v_cand; v_ug2 := v_user; END IF;
    END LOOP;

    v_claims_a := json_build_object('sub', v_a::text, 'app_metadata', json_build_object('role', 'administrador'))::text;
    v_claims_c := json_build_object('sub', v_c::text, 'app_metadata', json_build_object('role', 'administrador'))::text;

    -- ── G1 e G2: A rejeita; os titulares pedem revisão; B reverte G1 ─────────────
    PERFORM set_config('request.jwt.claims', v_claims_a, false);
    PERFORM public.registrar_decisao(v_g1, 'rejeitado',
      'Decisao final sintetica do smoke P48R (G1), rejeitado pelo administrador A, mais de 50 caracteres.');
    PERFORM public.registrar_decisao(v_g2, 'rejeitado',
      'Decisao final sintetica do smoke P48R (G2), rejeitado pelo administrador A, mais de 50 caracteres.');
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_ug1::text, 'app_metadata', json_build_object('role', 'candidato'))::text, false);
    PERFORM public.solicitar_revisao_decisao(v_g1);
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_ug2::text, 'app_metadata', json_build_object('role', 'candidato'))::text, false);
    PERFORM public.solicitar_revisao_decisao(v_g2);
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_b::text, 'app_metadata', json_build_object('role', v_b_role))::text, false);
    PERFORM public.responder_revisao_decisao(v_g1, 'revertida',
      'Revisao sintetica do smoke P48R (G1) pelo revisor B: a rejeicao nao se sustenta, reabrir o caso.');

    -- ── (e) A, o decisor revertido, tenta a nova decisão ─────────────────────────
    PERFORM set_config('request.jwt.claims', v_claims_a, false);
    BEGIN
      PERFORM public.registrar_decisao(v_g1, 'aprovado',
        'Tentativa do decisor revertido de registrar a nova decisao (smoke P48R e), mais de 50 caracteres.');
      e_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN e_state := SQLSTATE || ':' || SQLERRM;
    END;

    -- ── (f) C registra em_espera ─────────────────────────────────────────────────
    PERFORM set_config('request.jwt.claims', v_claims_c, false);
    BEGIN
      PERFORM public.registrar_decisao(v_g1, 'em_espera',
        'Em espera registrado pelo administrador C durante a reabertura (smoke P48R f), 50+ caracteres.');
      f_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN f_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT d.reaberta_em, d.prazo_nova_decisao_em, d.revisao_veredito, d.decisao::text, d.por_usuario
      INTO f_reab, f_prazo, f_ver, f_dec, f_por
      FROM public.decisao_final d WHERE d.candidatura_id = v_g1;
    SELECT c.etapa_atual::text, c.status::text INTO f_etapa, f_status
      FROM public.candidaturas c WHERE c.id = v_g1;

    -- ── (g) A de novo — a trava tem de vir do ARQUIVO ────────────────────────────
    SELECT d.decisao::text, d.por_usuario INTO g_vig_dec, g_vig_por
      FROM public.decisao_final d WHERE d.candidatura_id = v_g1;
    SELECT count(*) INTO g_arq_a FROM public.decisao_final_historico h
     WHERE h.candidatura_id = v_g1 AND h.revisao_veredito = 'revertida'
       AND h.decisao = 'rejeitado' AND h.por_usuario = v_a;
    PERFORM set_config('request.jwt.claims', v_claims_a, false);
    BEGIN
      PERFORM public.registrar_decisao(v_g1, 'em_espera',
        'Segunda tentativa do decisor revertido, agora com a linha vigente de C (smoke P48R g), 50+.');
      g_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN g_state := SQLSTATE || ':' || SQLERRM;
    END;

    -- ── (h) C registra a nova decisão: aprovado ──────────────────────────────────
    PERFORM set_config('request.jwt.claims', v_claims_c, false);
    BEGIN
      PERFORM public.registrar_decisao(v_g1, 'aprovado',
        'Nova decisao registrada pelo administrador C depois da reabertura (smoke P48R h), 50+ caracteres.');
      h_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN h_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT c.etapa_atual::text, c.status::text, c.data_decisao_final INTO h_etapa, h_status, h_ddf
      FROM public.candidaturas c WHERE c.id = v_g1;
    SELECT d.decisao::text, d.por_usuario,
           num_nonnulls(d.explicacao_solicitada_em, d.revisao_solicitada_em, d.revisao_veredito,
                        d.revisao_resultado, d.revisao_por_usuario, d.revisao_respondida_em,
                        d.reaberta_em, d.prazo_nova_decisao_em, d.alerta_prazo_enviado_em)
      INTO h_dec, h_por, h_ciclo_nn
      FROM public.decisao_final d WHERE d.candidatura_id = v_g1;
    SELECT count(*) INTO h_arq_a FROM public.decisao_final_historico h
     WHERE h.candidatura_id = v_g1 AND h.revisao_veredito = 'revertida'
       AND h.decisao = 'rejeitado' AND h.por_usuario = v_a
       AND h.reaberta_em IS NOT NULL AND h.prazo_nova_decisao_em IS NOT NULL;

    -- ── (i) A tenta sobrescrever a decisão de C ──────────────────────────────────
    PERFORM set_config('request.jwt.claims', v_claims_a, false);
    BEGIN
      PERFORM public.registrar_decisao(v_g1, 'rejeitado',
        'Tentativa do decisor revertido de sobrescrever a decisao de C (smoke P48R i), mais de 50 caracteres.');
      i_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN i_state := SQLSTATE || ':' || SQLERRM;
    END;

    -- ── (j) sem claims — fail-closed; id existente e id inexistente ──────────────
    PERFORM set_config('request.jwt.claims', '', false);
    BEGIN
      PERFORM public.registrar_decisao(v_g1, 'rejeitado',
        'Chamada sem JWT nenhum ao write-path da decisao final (smoke P48R j), mais de 50 caracteres.');
      j_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN j_state := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      PERFORM public.registrar_decisao(gen_random_uuid(), 'rejeitado',
        'Chamada sem JWT com id inexistente — nao pode virar oraculo (smoke P48R j), mais de 50 caracteres.');
      j2_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN j2_state := SQLSTATE || ':' || SQLERRM;
    END;

    -- ── (k) G2: redecisão FORA de reabertura, com revisão pendente ───────────────
    SELECT d.revisao_solicitada_em INTO k_sol_antes FROM public.decisao_final d WHERE d.candidatura_id = v_g2;
    PERFORM set_config('request.jwt.claims', v_claims_c, false);
    BEGIN
      PERFORM public.registrar_decisao(v_g2, 'rejeitado',
        'Redecisao do administrador C fora de reabertura, revisao pendente (smoke P48R k), 50+ caracteres.');
      k_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN k_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT d.revisao_solicitada_em, d.reaberta_em, d.decisao::text INTO k_sol_depois, k_reab, k_dec
      FROM public.decisao_final d WHERE d.candidatura_id = v_g2;
    PERFORM set_config('request.jwt.claims', '', false);

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P48R2';
  EXCEPTION
    WHEN SQLSTATE 'P48R2' THEN NULL;  -- ROLLBACK: fixtures, decisões, ciclo, histórico e fila somem
    WHEN OTHERS THEN
      v_err := SQLSTATE || ': ' || SQLERRM;
  END;
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('smoke48r.fixtures', current_setting('smoke48r.fixtures') || v_ids, false);

  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P48R FAIL (parte 2): a fixture/o ciclo não rodou até o fim — %', coalesce(v_err, 'sem erro, mas sem marca de execução');
  END IF;

  -- ── (e) ───────────────────────────────────────────────────────────────────────
  IF e_state NOT LIKE '42501:%D-23%' THEN
    RAISE EXCEPTION 'P48R FAIL (e): o decisor revertido registrando a nova decisão devolveu «%» (esperado 42501 D-23)', e_state;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── (f) ───────────────────────────────────────────────────────────────────────
  IF f_state IS DISTINCT FROM 'ACEITO' THEN
    RAISE EXCEPTION 'P48R FAIL (f): C registrando em_espera na reabertura devolveu «%» (esperado aceito — D-23 não pode travar outra pessoa)', f_state;
  END IF;
  IF f_dec IS DISTINCT FROM 'em_espera' OR f_por IS DISTINCT FROM v_c THEN
    RAISE EXCEPTION 'P48R FAIL (f): a linha vigente ficou decisao=% por=% (esperado em_espera por C)', f_dec, f_por;
  END IF;
  IF f_reab IS NULL OR f_prazo IS NULL OR f_ver IS DISTINCT FROM 'revertida' THEN
    RAISE EXCEPTION 'P48R FAIL (f): em_espera ZEROU o ciclo (reaberta_em=% prazo=% veredito=%) — A5: em_espera não é nova decisão', f_reab, f_prazo, f_ver;
  END IF;
  IF f_etapa IS DISTINCT FROM 'decisao_final' OR f_status IS DISTINCT FROM 'em_analise' THEN
    RAISE EXCEPTION 'P48R FAIL (f): em_espera moveu a candidatura para %/%', f_etapa, f_status;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── (g) ───────────────────────────────────────────────────────────────────────
  IF g_vig_dec IS DISTINCT FROM 'em_espera' OR g_vig_por IS DISTINCT FROM v_c OR g_arq_a < 1 THEN
    RAISE EXCEPTION 'P48R FAIL (g): pré-condição — vigente decisao=% por=%, linhas revertidas de A no arquivo=% (esperado em_espera por C e >= 1)', g_vig_dec, g_vig_por, g_arq_a;
  END IF;
  IF g_state NOT LIKE '42501:%D-23%' THEN
    RAISE EXCEPTION 'P48R FAIL (g): com a linha revertida só no ARQUIVO, o decisor revertido devolveu «%» (esperado 42501 D-23)', g_state;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── (h) ───────────────────────────────────────────────────────────────────────
  IF h_state IS DISTINCT FROM 'ACEITO' THEN
    RAISE EXCEPTION 'P48R FAIL (h): C registrando a nova decisão devolveu «%» (esperado aceito)', h_state;
  END IF;
  IF h_etapa IS DISTINCT FROM 'aprovado' OR h_status IS DISTINCT FROM 'finalizado' OR h_ddf IS NULL THEN
    RAISE EXCEPTION 'P48R FAIL (h): a nova decisão deixou a candidatura %/% data_decisao_final=% (esperado aprovado/finalizado com data)', h_etapa, h_status, h_ddf;
  END IF;
  IF h_dec IS DISTINCT FROM 'aprovado' OR h_por IS DISTINCT FROM v_c THEN
    RAISE EXCEPTION 'P48R FAIL (h): a linha vigente ficou decisao=% por=% (esperado aprovado por C)', h_dec, h_por;
  END IF;
  IF h_ciclo_nn IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P48R FAIL (h): % coluna(s) do ciclo seguem preenchidas na nova decisão — ela apareceria como «revertida» e o Art. 20 ficaria inalcançável', h_ciclo_nn;
  END IF;
  IF h_arq_a < 1 THEN
    RAISE EXCEPTION 'P48R FAIL (h): o arquivo não guarda a decisão revertida de A com o ciclo (reaberta_em/prazo) — a zeragem PERDEU a trilha';
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── (i) ───────────────────────────────────────────────────────────────────────
  IF i_state NOT LIKE '42501:%D-23%' THEN
    RAISE EXCEPTION 'P48R FAIL (i): o decisor revertido sobrescrevendo a decisão de C devolveu «%» (esperado 42501 D-23)', i_state;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── (j) ───────────────────────────────────────────────────────────────────────
  IF j_state NOT LIKE '42501:%' OR j2_state NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P48R FAIL (j): sem JWT registrar_decisao devolveu «%» (id existente) e «%» (id inexistente) — esperado 42501 nos dois (fail-closed, sem oráculo)', j_state, j2_state;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── (k) ───────────────────────────────────────────────────────────────────────
  IF k_state IS DISTINCT FROM 'ACEITO' OR k_dec IS DISTINCT FROM 'rejeitado' THEN
    RAISE EXCEPTION 'P48R FAIL (k): redecisão fora de reabertura devolveu «%» decisao=%', k_state, k_dec;
  END IF;
  IF k_sol_antes IS NULL OR k_sol_depois IS DISTINCT FROM k_sol_antes OR k_reab IS NOT NULL THEN
    RAISE EXCEPTION 'P48R FAIL (k): redecisão FORA de reabertura mexeu no ciclo (revisao_solicitada_em % -> %, reaberta_em=%) — comportamento de hoje não preservado', k_sol_antes, k_sol_depois, k_reab;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);
END
$p2$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (l) NEGATIVA — nada das fixtures sobreviveu; contagens globais iguais às de antes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $l$
DECLARE
  v_ids   uuid[] := coalesce(string_to_array(rtrim(current_setting('smoke48r.fixtures'), ','), ',')::uuid[], '{}');
  l_cand  int;  l_df int;  l_dfh int;  l_hist int;  l_fila int;  l_tit int;
  g_df bigint;  g_dfh bigint;  g_hist bigint;  g_cand bigint;  g_netq bigint;
BEGIN
  IF cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'P48R FAIL (l): nenhuma fixture registrada — a negativa não teria o que conferir';
  END IF;
  SELECT count(*) INTO l_cand FROM public.candidaturas c WHERE c.id = ANY (v_ids);
  SELECT count(*) INTO l_df   FROM public.decisao_final d WHERE d.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_dfh  FROM public.decisao_final_historico h WHERE h.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_hist FROM public.historico_candidatura h WHERE h.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_fila FROM net.http_request_queue q
   WHERE convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = ANY (v_ids::text[]);
  SELECT count(*) INTO l_tit  FROM public.candidatos c WHERE c.email LIKE 'p48rsmoke-%@invalido.local';
  IF l_cand <> 0 OR l_df <> 0 OR l_dfh <> 0 OR l_hist <> 0 OR l_fila <> 0 OR l_tit <> 0 THEN
    RAISE EXCEPTION 'P48R FAIL (l): RESÍDUO das fixtures — candidaturas=% decisao_final=% arquivo=% historico=% fila=% titulares=% (a subtransação não reverteu; um despacho COMMITADO sai como e-mail)',
      l_cand, l_df, l_dfh, l_hist, l_fila, l_tit;
  END IF;

  SELECT count(*) INTO g_df   FROM public.decisao_final;
  SELECT count(*) INTO g_dfh  FROM public.decisao_final_historico;
  SELECT count(*) INTO g_hist FROM public.historico_candidatura;
  SELECT count(*) INTO g_cand FROM public.candidaturas;
  SELECT count(*) INTO g_netq FROM net.http_request_queue;
  IF g_df   IS DISTINCT FROM current_setting('smoke48r.n_df')::bigint
     OR g_dfh  IS DISTINCT FROM current_setting('smoke48r.n_dfh')::bigint
     OR g_hist IS DISTINCT FROM current_setting('smoke48r.n_hist')::bigint
     OR g_cand IS DISTINCT FROM current_setting('smoke48r.n_cand')::bigint
     OR g_netq IS DISTINCT FROM current_setting('smoke48r.n_netq')::bigint THEN
    RAISE EXCEPTION 'P48R FAIL (l): contagem global mudou (decisao_final % -> %, arquivo % -> %, historico % -> %, candidaturas % -> %, fila % -> %) com resíduo ZERO das fixtures — o delta é de tráfego concorrente commitado durante a requisição; rodar de novo',
      current_setting('smoke48r.n_df'), g_df, current_setting('smoke48r.n_dfh'), g_dfh,
      current_setting('smoke48r.n_hist'), g_hist, current_setting('smoke48r.n_cand'), g_cand,
      current_setting('smoke48r.n_netq'), g_netq;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);
END
$l$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke48r.pass')::int <> 13 THEN
    RAISE EXCEPTION 'P48R FAIL (gate): pass = % de 13 — alguma asserção não incrementou o contador', current_setting('smoke48r.pass');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',    'p48_reabertura',
  'pass',     current_setting('smoke48r.pass')::int,
  'esperado', 13,
  'n_df',     current_setting('smoke48r.n_df')::int,
  'n_dfh',    current_setting('smoke48r.n_dfh')::int,
  'n_hist',   current_setting('smoke48r.n_hist')::int,
  'n_cand',   current_setting('smoke48r.n_cand')::int,
  'n_netq',   current_setting('smoke48r.n_netq')::int
) AS resultado;
