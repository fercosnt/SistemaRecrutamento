-- =============================================================================
-- Phase 48 / Plano 48-13 — smoke do ALERTA DE PRAZO da reabertura (JORN-19 · D-10 · A5)
-- =============================================================================
-- O QUE ELE VIGIA — `20260921000015`: `public.varrer_prazos_reabertura()` (job diário
-- `prazo-reabertura-sweep`) ALERTA o RH quando o prazo de 10 dias de uma candidatura reaberta
-- vence sem nova decisão — e SÓ alerta. Nunca aprova, nunca rejeita, nunca mexe na candidatura.
--
--   (a) F1 reaberta, prazo forçado para o passado NA FIXTURE ⇒ a varredura devolve 1 e enfileira
--       EXATAMENTE 1 postagem para `/functions/v1/notificar-rh` com `evento =
--       'prazo_reabertura_vencido'`, `candidatura_id` = F1 e `ciclo` = epoch do prazo;
--       `alerta_prazo_enviado_em` preenchido; a linha de `candidaturas` idêntica (to_jsonb) e a
--       linha de `decisao_final` idêntica fora da coluna do alerta (decisão, decisor, veredito,
--       reabertura e prazo intactos); nenhuma postagem para `notificar-candidato`; nenhuma linha
--       nova em `historico_candidatura` (só alerta — D-10).
--   (b) segunda chamada ⇒ 0, nenhuma postagem nova (um alerta por ciclo — idempotência por estado).
--   (c) F2 reaberta, C registra `em_espera` ANTES do vencimento; prazo forçado para o passado ⇒ a
--       varredura ALERTA F2 (A5: em_espera não é nova decisão, 48-11).
--   (d) F3 reaberta, prazo forçado para o passado, e ENTÃO C registra a nova decisão `aprovado`
--       ⇒ a varredura NÃO alerta F3 (a nova decisão zera o ciclo). A mesma F3, sem a nova decisão,
--       seria alertada — é o que (a) prova para F1; aqui o que muda é só a decisão.
--   (e) `authenticated` e `anon` NÃO têm EXECUTE na varredura (T-48-13-01).
--   (f) NEGATIVA: nada das fixtures sobrevive, e as contagens globais de `decisao_final`,
--       `decisao_final_historico`, `candidaturas`, `historico_candidatura` e da fila do `pg_net`
--       são as de antes (baseline capturada NESTA execução — não fotografia, D-17).
--
-- PRÉ-CONDIÇÃO (checada, não presumida): o predicado da varredura devolve 0 linhas REAIS no
-- início. Sem isso, o «devolve 1» de (a) não discriminaria a fixture — e a varredura dentro da
-- subtransação estaria processando (e revertendo) alertas reais. Se houver prazo real vencido, o
-- smoke para com essa mensagem: aquilo é um alerta a ser dado pelo cron, não um defeito do smoke.
--
-- A FIXTURE NÃO É UMA CANDIDATURA REAL (idioma do 48-08..48-11): o operador pode estar exercitando
-- as contas `+claude` em PROD (48-05) e um UPDATE nelas, mesmo revertido, disputa lock de linha com
-- o fluxo vivo. Titulares sintéticos `@invalido.local`; candidatura que nasce `status='rejeitado'`
-- (desarma `trg_notif_confirmacao`) e é levada a `em_analise`. ATORES reais, ATIVOS, lidos NA
-- EXECUÇÃO: A decide (administrador), B revisa (RH/admin ≠ A), C redecide (administrador ≠ A, B).
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL encerrada por
-- `RAISE EXCEPTION ... ERRCODE 'P48P1'`, capturada logo acima: ROLLBACK de tudo, inclusive das
-- postagens que a varredura e os triggers enfileiram em `net.http_request_queue` (o worker do
-- `pg_net` só vê o que foi COMMITADO). NOTIFICACOES_MODO = 'producao', mas nada daqui é commitado
-- — nenhum e-mail sai, nenhum alerta sai. Os valores medidos ficam em variáveis PL/pgSQL e o
-- julgamento é feito FORA da subtransação.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p48_prazo_reabertura_smoke.sql` — UMA
-- requisição, UMA sessão. O `SELECT` final devolve `{smoke, pass, esperado, ...}`; qualquer FAIL é
-- `RAISE EXCEPTION` e o `p46apply` sai com código ≠ 0.
--
-- GATE VERDE = `pass = esperado` (6). Esperado FIXO: é o número de asserções DESTE arquivo
-- (escopo deliberado), não uma fotografia do banco.
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('smoke48p.pass', '0', false);
SELECT set_config('smoke48p.fixtures', '', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — pré-condição, atores vivos e contagens para a negativa.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_a    uuid;
  v_b    uuid;
  v_c    uuid;
  v_vaga uuid;
  v_real int;
BEGIN
  SELECT count(*) INTO v_real
    FROM public.decisao_final d
    JOIN public.candidaturas c ON c.id = d.candidatura_id
   WHERE d.reaberta_em IS NOT NULL
     AND d.prazo_nova_decisao_em < now()
     AND d.alerta_prazo_enviado_em IS NULL
     AND c.deleted_at IS NULL
     AND NOT public.candidatura_encerrada(c.etapa_atual, c.status);
  IF v_real <> 0 THEN
    RAISE EXCEPTION 'P48P FAIL (baseline): há % prazo(s) de reabertura REAL(IS) vencido(s) sem alerta — é trabalho do cron (alerta real ao RH), não deste smoke; rodar depois das 11:00 UTC ou conferir o job prazo-reabertura-sweep', v_real;
  END IF;

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
  SELECT u.user_id INTO v_b
    FROM public.usuarios_rh u
   WHERE u.role IN ('administrador', 'recrutador') AND u.ativo AND u.deleted_at IS NULL
     AND u.user_id IS NOT NULL AND u.user_id <> v_a AND u.user_id <> v_c
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_a IS NULL OR v_c IS NULL OR v_b IS NULL THEN
    RAISE EXCEPTION 'P48P FAIL (baseline): faltam atores ATIVOS — A=% C=% B=%',
      coalesce(v_a::text, '<nulo>'), coalesce(v_c::text, '<nulo>'), coalesce(v_b::text, '<nulo>');
  END IF;

  SELECT v.id INTO v_vaga FROM public.vagas v ORDER BY v.created_at LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P48P FAIL (baseline): nenhuma vaga viva para a fixture';
  END IF;

  PERFORM set_config('smoke48p.a', v_a::text, false);
  PERFORM set_config('smoke48p.b', v_b::text, false);
  PERFORM set_config('smoke48p.c', v_c::text, false);
  PERFORM set_config('smoke48p.b_role',
    (SELECT CASE WHEN u.role = 'administrador' THEN 'administrador' ELSE 'rh' END
       FROM public.usuarios_rh u WHERE u.user_id = v_b), false);
  PERFORM set_config('smoke48p.vaga', v_vaga::text, false);

  PERFORM set_config('smoke48p.n_df',   (SELECT count(*) FROM public.decisao_final)::text, false);
  PERFORM set_config('smoke48p.n_dfh',  (SELECT count(*) FROM public.decisao_final_historico)::text, false);
  PERFORM set_config('smoke48p.n_hist', (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke48p.n_cand', (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke48p.n_netq', (SELECT count(*) FROM net.http_request_queue)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) (b) (c) (d) — numa subtransação que reverte.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p$
DECLARE
  v_a      uuid := current_setting('smoke48p.a')::uuid;
  v_b      uuid := current_setting('smoke48p.b')::uuid;
  v_c      uuid := current_setting('smoke48p.c')::uuid;
  v_b_role text := current_setting('smoke48p.b_role');
  v_vaga   uuid := current_setting('smoke48p.vaga')::uuid;
  v_ids    text := '';
  v_ran    boolean := false;
  v_err    text;
  v_user   uuid;
  v_email  text;
  v_cand   uuid;
  v_f      uuid[] := '{}';
  v_u      uuid[] := '{}';
  v_i      int;
  v_claims_a text;
  v_claims_c text;
  v_vencido timestamptz := now() - interval '1 day';
  -- (a)
  a_ret int;  a_q_rh int;  a_q_cand int;  a_q_cand_antes int;  a_q_total int;
  a_body_ev text;  a_body_cid text;  a_body_ciclo text;  a_ciclo_esp text;
  a_alerta timestamptz;
  a_cand_antes text;  a_cand_depois text;
  a_df_antes text;  a_df_depois text;
  a_hist_antes int;  a_hist_depois int;
  a_dec text;
  -- (b)
  b_ret int;  b_q_antes int;  b_q_depois int;
  -- (c)
  c_state text;  c_dec text;  c_reab timestamptz;  c_ret int;  c_alerta timestamptz;  c_q int;
  -- (d)
  d_state text;  d_reab timestamptz;  d_ret int;  d_alerta timestamptz;  d_q int;
  v_q0 int;
BEGIN
  BEGIN
    -- ── fixtures: 3 titulares sintéticos, candidaturas em decisao_final/em_analise ──
    FOR v_i IN 1..3 LOOP
      v_user  := gen_random_uuid();
      v_email := 'p48psmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                              created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
      VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              v_email, '', now(), now(),
              '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
      INSERT INTO public.candidatos
        (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
      VALUES
        (v_user, 'SMOKE P48P Titular ' || v_i, v_email, '(11) 96666-57' || lpad(v_i::text, 2, '0'),
         DATE '1990-01-15', 'Santos', 'SP', 'site')
      RETURNING id INTO v_cand;
      INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
      VALUES (v_cand, v_vaga, 'decisao_final', 'rejeitado', false, now() - interval '20 days')
      RETURNING id INTO v_cand;
      UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_cand;
      v_ids := v_ids || v_cand::text || ',';
      v_f := v_f || v_cand;
      v_u := v_u || v_user;
    END LOOP;

    v_claims_a := json_build_object('sub', v_a::text, 'app_metadata', json_build_object('role', 'administrador'))::text;
    v_claims_c := json_build_object('sub', v_c::text, 'app_metadata', json_build_object('role', 'administrador'))::text;

    -- ── as três: A rejeita → titular pede revisão → B reverte (REABERTAS, 48-11) ──
    FOR v_i IN 1..3 LOOP
      PERFORM set_config('request.jwt.claims', v_claims_a, false);
      PERFORM public.registrar_decisao(v_f[v_i], 'rejeitado',
        'Decisao final sintetica do smoke P48P, rejeitado pelo administrador A, com mais de 50 caracteres.');
      PERFORM set_config('request.jwt.claims',
        json_build_object('sub', v_u[v_i]::text, 'app_metadata', json_build_object('role', 'candidato'))::text, false);
      PERFORM public.solicitar_revisao_decisao(v_f[v_i]);
      PERFORM set_config('request.jwt.claims',
        json_build_object('sub', v_b::text, 'app_metadata', json_build_object('role', v_b_role))::text, false);
      PERFORM public.responder_revisao_decisao(v_f[v_i], 'revertida',
        'Revisao sintetica do smoke P48P pelo revisor B: a rejeicao nao se sustenta, reabrir o caso.');
    END LOOP;
    PERFORM set_config('request.jwt.claims', '', false);

    -- ── (a) só F1 vencida ──────────────────────────────────────────────────────────
    UPDATE public.decisao_final SET prazo_nova_decisao_em = v_vencido WHERE candidatura_id = v_f[1];
    a_ciclo_esp := extract(epoch from v_vencido)::bigint::text;

    SELECT to_jsonb(c)::text INTO a_cand_antes FROM public.candidaturas c WHERE c.id = v_f[1];
    SELECT (to_jsonb(d) - 'alerta_prazo_enviado_em')::text INTO a_df_antes
      FROM public.decisao_final d WHERE d.candidatura_id = v_f[1];
    SELECT count(*) INTO a_hist_antes FROM public.historico_candidatura WHERE candidatura_id = ANY (v_f);
    SELECT count(*) INTO v_q0 FROM net.http_request_queue;
    -- as postagens ao candidato que a MONTAGEM da fixture já enfileirou (decisao, revisao_respondida):
    -- (a) julga o DELTA da varredura, não o acumulado.
    SELECT count(*) INTO a_q_cand_antes
      FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-candidato'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = ANY (v_f::text[]);

    a_ret := public.varrer_prazos_reabertura();

    SELECT count(*) INTO a_q_total FROM net.http_request_queue;
    a_q_total := a_q_total - v_q0;
    SELECT count(*),
           max(convert_from(q.body, 'UTF8')::jsonb ->> 'evento'),
           max(convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id'),
           max(convert_from(q.body, 'UTF8')::jsonb ->> 'ciclo')
      INTO a_q_rh, a_body_ev, a_body_cid, a_body_ciclo
      FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-rh'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'evento' = 'prazo_reabertura_vencido';
    SELECT count(*) INTO a_q_cand
      FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-candidato'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = ANY (v_f::text[]);
    a_q_cand := a_q_cand - a_q_cand_antes;
    SELECT to_jsonb(c)::text INTO a_cand_depois FROM public.candidaturas c WHERE c.id = v_f[1];
    SELECT (to_jsonb(d) - 'alerta_prazo_enviado_em')::text, d.alerta_prazo_enviado_em, d.decisao::text
      INTO a_df_depois, a_alerta, a_dec
      FROM public.decisao_final d WHERE d.candidatura_id = v_f[1];
    SELECT count(*) INTO a_hist_depois FROM public.historico_candidatura WHERE candidatura_id = ANY (v_f);

    -- ── (b) de novo ─────────────────────────────────────────────────────────────────
    SELECT count(*) INTO b_q_antes FROM net.http_request_queue;
    b_ret := public.varrer_prazos_reabertura();
    SELECT count(*) INTO b_q_depois FROM net.http_request_queue;

    -- ── (c) F2: em_espera de C antes do vencimento, depois vence ───────────────────
    PERFORM set_config('request.jwt.claims', v_claims_c, false);
    BEGIN
      PERFORM public.registrar_decisao(v_f[2], 'em_espera',
        'Em espera registrado pelo administrador C durante a reabertura (smoke P48P c), 50+ caracteres.');
      c_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN c_state := SQLSTATE || ':' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', '', false);
    UPDATE public.decisao_final SET prazo_nova_decisao_em = v_vencido WHERE candidatura_id = v_f[2];
    SELECT d.decisao::text, d.reaberta_em INTO c_dec, c_reab
      FROM public.decisao_final d WHERE d.candidatura_id = v_f[2];
    c_ret := public.varrer_prazos_reabertura();
    SELECT d.alerta_prazo_enviado_em INTO c_alerta FROM public.decisao_final d WHERE d.candidatura_id = v_f[2];
    SELECT count(*) INTO c_q FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-rh'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = v_f[2]::text
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'evento' = 'prazo_reabertura_vencido';

    -- ── (d) F3: vence, e ENTÃO C registra a nova decisão ──────────────────────────
    UPDATE public.decisao_final SET prazo_nova_decisao_em = v_vencido WHERE candidatura_id = v_f[3];
    PERFORM set_config('request.jwt.claims', v_claims_c, false);
    BEGIN
      PERFORM public.registrar_decisao(v_f[3], 'aprovado',
        'Nova decisao do administrador C apos a reabertura (smoke P48P d), com mais de 50 caracteres.');
      d_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN d_state := SQLSTATE || ':' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', '', false);
    SELECT d.reaberta_em INTO d_reab FROM public.decisao_final d WHERE d.candidatura_id = v_f[3];
    d_ret := public.varrer_prazos_reabertura();
    SELECT d.alerta_prazo_enviado_em INTO d_alerta FROM public.decisao_final d WHERE d.candidatura_id = v_f[3];
    SELECT count(*) INTO d_q FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-rh'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = v_f[3]::text
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'evento' = 'prazo_reabertura_vencido';

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P48P1';
  EXCEPTION
    WHEN SQLSTATE 'P48P1' THEN NULL;  -- ROLLBACK: fixtures, decisões, alertas e fila somem
    WHEN OTHERS THEN
      v_err := SQLSTATE || ': ' || SQLERRM;
  END;
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('smoke48p.fixtures', current_setting('smoke48p.fixtures') || v_ids, false);

  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P48P FAIL (fixture): a fixture/o ciclo não rodou até o fim — %', coalesce(v_err, 'sem erro, mas sem marca de execução');
  END IF;

  -- ── (a) julgamento ────────────────────────────────────────────────────────────
  IF a_ret IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P48P FAIL (a): a varredura devolveu % com UMA reabertura vencida (esperado 1)', a_ret;
  END IF;
  IF a_q_rh IS DISTINCT FROM 1 OR a_q_total IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P48P FAIL (a): % postagem(ns) prazo_reabertura_vencido para notificar-rh e % no total (esperado 1 e 1)', a_q_rh, a_q_total;
  END IF;
  IF a_body_ev IS DISTINCT FROM 'prazo_reabertura_vencido' OR a_body_cid IS DISTINCT FROM v_f[1]::text
     OR a_body_ciclo IS DISTINCT FROM a_ciclo_esp THEN
    RAISE EXCEPTION 'P48P FAIL (a): corpo da postagem evento=% candidatura=% ciclo=% (esperado prazo_reabertura_vencido / F1 / %)', a_body_ev, a_body_cid, a_body_ciclo, a_ciclo_esp;
  END IF;
  IF a_alerta IS NULL THEN
    RAISE EXCEPTION 'P48P FAIL (a): alerta_prazo_enviado_em não foi gravado — o alerta sairia todo dia';
  END IF;
  IF a_cand_depois IS DISTINCT FROM a_cand_antes THEN
    RAISE EXCEPTION 'P48P FAIL (a): a varredura MEXEU na candidatura — o vencimento do prazo NÃO decide nada (D-10)';
  END IF;
  IF a_df_depois IS DISTINCT FROM a_df_antes OR a_dec IS DISTINCT FROM 'rejeitado' THEN
    RAISE EXCEPTION 'P48P FAIL (a): a varredura mexeu em decisao_final além da coluna do alerta (decisao=%) — D-10', a_dec;
  END IF;
  IF a_q_cand <> 0 OR a_hist_depois IS DISTINCT FROM a_hist_antes THEN
    RAISE EXCEPTION 'P48P FAIL (a): a varredura postou % aviso(s) ao CANDIDATO e o histórico foi % -> % (esperado 0 e inalterado — só alerta ao RH)', a_q_cand, a_hist_antes, a_hist_depois;
  END IF;
  PERFORM set_config('smoke48p.pass', (current_setting('smoke48p.pass')::int + 1)::text, false);

  -- ── (b) julgamento ────────────────────────────────────────────────────────────
  IF b_ret IS DISTINCT FROM 0 OR b_q_depois IS DISTINCT FROM b_q_antes THEN
    RAISE EXCEPTION 'P48P FAIL (b): a segunda varredura devolveu % e a fila foi % -> % (esperado 0 e inalterada — um alerta por ciclo)', b_ret, b_q_antes, b_q_depois;
  END IF;
  PERFORM set_config('smoke48p.pass', (current_setting('smoke48p.pass')::int + 1)::text, false);

  -- ── (c) julgamento ────────────────────────────────────────────────────────────
  IF c_state IS DISTINCT FROM 'ACEITO' OR c_dec IS DISTINCT FROM 'em_espera' OR c_reab IS NULL THEN
    RAISE EXCEPTION 'P48P FAIL (c): em_espera de C devolveu «%» (decisao=%, reaberta_em=%) — esperado aceito e o ciclo preservado (A5)', c_state, c_dec, c_reab;
  END IF;
  IF c_ret IS DISTINCT FROM 1 OR c_alerta IS NULL OR c_q IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P48P FAIL (c): com em_espera e prazo vencido a varredura devolveu % (alerta=%, postagens=%) — esperado 1: em_espera NÃO é nova decisão (A5)', c_ret, c_alerta, c_q;
  END IF;
  PERFORM set_config('smoke48p.pass', (current_setting('smoke48p.pass')::int + 1)::text, false);

  -- ── (d) julgamento ────────────────────────────────────────────────────────────
  IF d_state IS DISTINCT FROM 'ACEITO' OR d_reab IS NOT NULL THEN
    RAISE EXCEPTION 'P48P FAIL (d): a nova decisão de C devolveu «%» e reaberta_em=% (esperado aceito e ciclo zerado)', d_state, d_reab;
  END IF;
  IF d_ret IS DISTINCT FROM 0 OR d_alerta IS NOT NULL OR d_q IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P48P FAIL (d): depois da nova decisão a varredura devolveu % (alerta=%, postagens=%) — esperado 0: o caso já foi decidido', d_ret, d_alerta, d_q;
  END IF;
  PERFORM set_config('smoke48p.pass', (current_setting('smoke48p.pass')::int + 1)::text, false);
END
$p$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) ACL — a varredura não é chamável por usuário.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $e$
BEGIN
  IF has_function_privilege('authenticated', 'public.varrer_prazos_reabertura()', 'EXECUTE') THEN
    RAISE EXCEPTION 'P48P FAIL (e): authenticated tem EXECUTE em varrer_prazos_reabertura (T-48-13-01)';
  END IF;
  IF has_function_privilege('anon', 'public.varrer_prazos_reabertura()', 'EXECUTE') THEN
    RAISE EXCEPTION 'P48P FAIL (e): anon tem EXECUTE em varrer_prazos_reabertura (T-48-13-01)';
  END IF;
  PERFORM set_config('smoke48p.pass', (current_setting('smoke48p.pass')::int + 1)::text, false);
END
$e$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) NEGATIVA — nada das fixtures sobreviveu; contagens globais iguais às de antes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $f$
DECLARE
  v_ids   uuid[] := coalesce(string_to_array(rtrim(current_setting('smoke48p.fixtures'), ','), ',')::uuid[], '{}');
  l_cand  int;  l_df int;  l_dfh int;  l_hist int;  l_fila int;  l_tit int;
  g_df bigint;  g_dfh bigint;  g_hist bigint;  g_cand bigint;  g_netq bigint;
BEGIN
  IF cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'P48P FAIL (f): nenhuma fixture registrada — a negativa não teria o que conferir';
  END IF;
  SELECT count(*) INTO l_cand FROM public.candidaturas c WHERE c.id = ANY (v_ids);
  SELECT count(*) INTO l_df   FROM public.decisao_final d WHERE d.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_dfh  FROM public.decisao_final_historico h WHERE h.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_hist FROM public.historico_candidatura h WHERE h.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_fila FROM net.http_request_queue q
   WHERE convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = ANY (v_ids::text[]);
  SELECT count(*) INTO l_tit  FROM public.candidatos c WHERE c.email LIKE 'p48psmoke-%@invalido.local';
  IF l_cand <> 0 OR l_df <> 0 OR l_dfh <> 0 OR l_hist <> 0 OR l_fila <> 0 OR l_tit <> 0 THEN
    RAISE EXCEPTION 'P48P FAIL (f): RESÍDUO das fixtures — candidaturas=% decisao_final=% arquivo=% historico=% fila=% titulares=% (a subtransação não reverteu; uma postagem COMMITADA sai como e-mail)',
      l_cand, l_df, l_dfh, l_hist, l_fila, l_tit;
  END IF;

  SELECT count(*) INTO g_df   FROM public.decisao_final;
  SELECT count(*) INTO g_dfh  FROM public.decisao_final_historico;
  SELECT count(*) INTO g_hist FROM public.historico_candidatura;
  SELECT count(*) INTO g_cand FROM public.candidaturas;
  SELECT count(*) INTO g_netq FROM net.http_request_queue;
  IF g_df   IS DISTINCT FROM current_setting('smoke48p.n_df')::bigint
     OR g_dfh  IS DISTINCT FROM current_setting('smoke48p.n_dfh')::bigint
     OR g_hist IS DISTINCT FROM current_setting('smoke48p.n_hist')::bigint
     OR g_cand IS DISTINCT FROM current_setting('smoke48p.n_cand')::bigint
     OR g_netq IS DISTINCT FROM current_setting('smoke48p.n_netq')::bigint THEN
    RAISE EXCEPTION 'P48P FAIL (f): contagem global mudou (decisao_final % -> %, arquivo % -> %, historico % -> %, candidaturas % -> %, fila % -> %) com resíduo ZERO das fixtures — o delta é de tráfego concorrente commitado durante a requisição; rodar de novo',
      current_setting('smoke48p.n_df'), g_df, current_setting('smoke48p.n_dfh'), g_dfh,
      current_setting('smoke48p.n_hist'), g_hist, current_setting('smoke48p.n_cand'), g_cand,
      current_setting('smoke48p.n_netq'), g_netq;
  END IF;
  PERFORM set_config('smoke48p.pass', (current_setting('smoke48p.pass')::int + 1)::text, false);
END
$f$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke48p.pass')::int <> 6 THEN
    RAISE EXCEPTION 'P48P FAIL (gate): pass = % de 6 — alguma asserção não incrementou o contador', current_setting('smoke48p.pass');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',    'p48_prazo_reabertura',
  'pass',     current_setting('smoke48p.pass')::int,
  'esperado', 6,
  'n_df',     current_setting('smoke48p.n_df')::int,
  'n_dfh',    current_setting('smoke48p.n_dfh')::int,
  'n_hist',   current_setting('smoke48p.n_hist')::int,
  'n_cand',   current_setting('smoke48p.n_cand')::int,
  'n_netq',   current_setting('smoke48p.n_netq')::int
) AS resultado;
