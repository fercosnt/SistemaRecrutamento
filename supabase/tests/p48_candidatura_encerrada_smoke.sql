-- =============================================================================
-- Phase 48 / Plano 48-01 — smoke do predicado canônico `candidatura_encerrada`
-- (JORN-26 · D-11 · D-21) e das cinco instâncias que ele consertou (D1–D6)
-- =============================================================================
-- O QUE ELE VIGIA. `public.candidatura_encerrada(etapa, status)` é o ÚNICO critério
-- de «esta candidatura acabou» no banco (migrations 20260921000001 e …000002). Os
-- Defeitos 22 e 26 foram código que decidia isso só por `etapa_atual` — e o knockout
-- mantém `etapa_atual = 'inscricao'` com `status = 'rejeitado'` POR DESENHO. Este
-- arquivo prova, por EXECUÇÃO em PROD:
--
--   (a) TABELA-VERDADE — todos os pares (etapa × status) do vocabulário VIVO, mais os
--       casos com NULL de cada lado, contra uma expressão independente escrita aqui.
--   (b) BORDAS nomeadas pela varredura: (triagem, finalizado) → true;
--       (inscricao, rejeitado) → true; (triagem, NULL) → false; (NULL, rejeitado) → true.
--   (c) D1 · registrar_pedido_exclusao marca a em andamento e NÃO marca knockout nem
--       `finalizado` legado.
--   (d) D2 · retirar_candidatura recusa 22023 knockout e `finalizado`; aceita a em andamento.
--   (e) D3 · rejeitar_candidatura recusa check_violation knockout e `finalizado`; aceita
--       a em andamento.
--   (f) D4 · v_fila_trabalho não tem NENHUMA linha encerrada (global, sem fixture) E,
--       sobre fixture, lista a em andamento e omite knockout e `finalizado`.
--   (g) D6 · funil_kpis: volume de cada etapa = contagem direta pela regra (global) E,
--       sobre fixture, a em andamento soma em `triagem` e knockout/`finalizado` não somam.
--   (h) ⊖ NEGATIVA DE RESÍDUO — contagens de candidatos, candidaturas, auth.users,
--       historico_candidatura, solicitacoes_dados e notificacoes_enviadas idênticas
--       antes e depois.
--
-- POR QUE A TABELA-VERDADE É LIDA DO CATÁLOGO (D-17 — CLAUDE.md §Portões). Uma lista
-- literal de etapas/status aqui seria uma FOTOGRAFIA: um valor de enum novo ficaria
-- fora da vigilância e o portão seguiria verde. Os pares vêm de `pg_enum` NA EXECUÇÃO.
-- A expressão independente codifica o CONJUNTO TERMINAL (é a especificação — não dá
-- para derivá-la do catálogo), e a asserção (a) também exige que cada valor terminal
-- nomeado exista no enum vivo: um rename faria o portão reprovar em vez de passar
-- por vacuidade.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p48_candidatura_encerrada_smoke.sql`
-- — UMA requisição, UMA sessão (o contador `smoke48e.pass` é GUC de sessão). O
-- `SELECT` final devolve `{smoke, pass, esperado}`; qualquer FAIL é `RAISE EXCEPTION`
-- e o `p46apply` sai com código ≠ 0.
--
-- ⚠ ESTE SMOKE ESCREVE — e toda escrita acontece dentro de uma subtransação PL/pgSQL
-- encerrada por `RAISE EXCEPTION` com SQLSTATE próprio (`P48E1`), capturado logo
-- acima: ROLLBACK da subtransação inteira, inclusive das linhas que os triggers de
-- dispatch enfileiram em `net.http_request_queue` (a fila do `pg_net` é
-- transacional). O `net.http_post` só sai depois do COMMIT — e nada daqui é commitado.
-- Fixtures no idioma do `p45_motor_exclusao_smoke.sql`: candidatura nasce com
-- `status = 'rejeitado'` (desarma `trg_notif_confirmacao`) e é levada ao estado
-- desejado por UPDATE (`guard_rejeicao_auditada` só olha a ENTRADA em `rejeitado`).
-- O contador é incrementado FORA da subtransação (GUC é transacional).
-- Escreve em `auth.users` — precedente: SONDA 6 da Phase 45 e o próprio p45.
--
-- GATE VERDE = `pass = 8` (a..h). Esperado FIXO: é o número de asserções DESTE
-- arquivo (escopo deliberado), não uma fotografia do banco.
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('smoke48e.pass', '0', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — identidades vivas (leitura) e contagens para (h).
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_admin uuid;
  v_vagas uuid[];
BEGIN
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P48E FAIL (baseline): nenhum administrador vivo — (e) e (g) precisam de ator real (historico_candidatura.ator -> auth.users)';
  END IF;

  SELECT array_agg(t.id ORDER BY t.created_at) INTO v_vagas
    FROM (SELECT v.id, v.created_at FROM public.vagas v ORDER BY v.created_at LIMIT 3) t;
  IF coalesce(array_length(v_vagas, 1), 0) < 3 THEN
    RAISE EXCEPTION 'P48E FAIL (baseline): menos de 3 vagas vivas — as 3 candidaturas do titular sintetico precisam de vagas distintas (UNIQUE (candidato_id, vaga_id))';
  END IF;

  PERFORM set_config('smoke48e.admin', v_admin::text, false);
  PERFORM set_config('smoke48e.vaga1', v_vagas[1]::text, false);
  PERFORM set_config('smoke48e.vaga2', v_vagas[2]::text, false);
  PERFORM set_config('smoke48e.vaga3', v_vagas[3]::text, false);

  PERFORM set_config('smoke48e.n_candos', (SELECT count(*) FROM public.candidatos)::text, false);
  PERFORM set_config('smoke48e.n_cands',  (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke48e.n_users',  (SELECT count(*) FROM auth.users)::text, false);
  PERFORM set_config('smoke48e.n_hist',   (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke48e.n_solic',  (SELECT count(*) FROM public.solicitacoes_dados)::text, false);
  PERFORM set_config('smoke48e.n_notif',  (SELECT count(*) FROM public.notificacoes_enviadas)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) TABELA-VERDADE sobre o vocabulário VIVO (pg_enum) + NULL de cada lado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $a$
DECLARE
  r            record;
  v_pares      int := 0;
  v_esperados  int;
  v_diverg     text := '';
  v_n_etapa    int;
  v_n_status   int;
  v_faltando   text;
BEGIN
  -- Os valores terminais que a expressão independente nomeia TÊM de existir no enum.
  SELECT string_agg(t.v, ', ') INTO v_faltando
    FROM (VALUES ('etapa_processo', 'aprovado'), ('etapa_processo', 'rejeitado'),
                 ('status_candidatura', 'rejeitado'), ('status_candidatura', 'finalizado')) AS t(tipo, v)
   WHERE NOT EXISTS (SELECT 1 FROM pg_enum e
                      WHERE e.enumtypid = ('public.' || t.tipo)::regtype AND e.enumlabel = t.v);
  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'P48E FAIL (a): valores terminais % nao existem mais no enum vivo — a especificacao desta asserção precisa ser revista, nao silenciada', v_faltando;
  END IF;

  SELECT count(*) INTO v_n_etapa  FROM pg_enum WHERE enumtypid = 'public.etapa_processo'::regtype;
  SELECT count(*) INTO v_n_status FROM pg_enum WHERE enumtypid = 'public.status_candidatura'::regtype;
  v_esperados := (v_n_etapa + 1) * (v_n_status + 1);

  FOR r IN
    SELECT e.etapa, s.status,
           public.candidatura_encerrada(e.etapa, s.status) AS obtido,
           -- EXPRESSÃO INDEPENDENTE: CASE explícito, sem IN, sem COALESCE.
           CASE
             WHEN e.etapa::text = 'aprovado'    THEN true
             WHEN e.etapa::text = 'rejeitado'   THEN true
             WHEN s.status::text = 'rejeitado'  THEN true
             WHEN s.status::text = 'finalizado' THEN true
             ELSE false
           END AS esperado
      FROM (SELECT enumlabel::public.etapa_processo AS etapa FROM pg_enum
             WHERE enumtypid = 'public.etapa_processo'::regtype
            UNION ALL SELECT NULL::public.etapa_processo) e
     CROSS JOIN
           (SELECT enumlabel::public.status_candidatura AS status FROM pg_enum
             WHERE enumtypid = 'public.status_candidatura'::regtype
            UNION ALL SELECT NULL::public.status_candidatura) s
  LOOP
    v_pares := v_pares + 1;
    IF r.obtido IS DISTINCT FROM r.esperado THEN
      v_diverg := v_diverg || format('(%s, %s): obtido %s esperado %s; ',
                                     coalesce(r.etapa::text, 'NULL'), coalesce(r.status::text, 'NULL'),
                                     coalesce(r.obtido::text, 'NULL'), r.esperado);
    END IF;
  END LOOP;

  IF v_pares <> v_esperados OR v_pares = 0 THEN
    RAISE EXCEPTION 'P48E FAIL (a): iterou % pares, o catalogo pede % — a tabela-verdade nao cobriu o vocabulario', v_pares, v_esperados;
  END IF;
  IF v_diverg <> '' THEN
    RAISE EXCEPTION 'P48E FAIL (a): candidatura_encerrada diverge da especificacao em: %', v_diverg;
  END IF;

  PERFORM set_config('smoke48e.pass', (current_setting('smoke48e.pass')::int + 1)::text, false);
  RAISE NOTICE 'P48E PASS (a): % pares do vocabulario vivo (% etapas x % status, + NULL) batem a especificacao', v_pares, v_n_etapa, v_n_status;
END
$a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) BORDAS explícitas da varredura.
-- ─────────────────────────────────────────────────────────────────────────────
DO $b$
BEGIN
  IF public.candidatura_encerrada('triagem', 'finalizado') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P48E FAIL (b): (triagem, finalizado) — o legado com status terminal em etapa de trabalho — NAO e encerrada';
  END IF;
  IF public.candidatura_encerrada('inscricao', 'rejeitado') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P48E FAIL (b): (inscricao, rejeitado) — o knockout — NAO e encerrada. E o Defeito 26';
  END IF;
  IF public.candidatura_encerrada('triagem', NULL) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'P48E FAIL (b): (triagem, NULL) nao devolveu false — NULL nao e terminal, e nulo tambem nao pode vazar como NULL';
  END IF;
  IF public.candidatura_encerrada(NULL, 'rejeitado') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P48E FAIL (b): (NULL, rejeitado) NAO e encerrada';
  END IF;
  PERFORM set_config('smoke48e.pass', (current_setting('smoke48e.pass')::int + 1)::text, false);
  RAISE NOTICE 'P48E PASS (b): as quatro bordas da varredura';
END
$b$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) (d) (e) (f) (g) — comportamento, sobre um titular sintético com TRÊS
--     candidaturas: A em andamento (triagem, em_analise), K com a forma do knockout
--     (inscricao, rejeitado), F legado (triagem, finalizado). Cada seção reconstrói
--     a fixture numa subtransação própria e a reverte — as seções não se contaminam
--     (a (c) encerra A a pedido; a (e) rejeita A).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $cdefg$
DECLARE
  v_admin   uuid := current_setting('smoke48e.admin')::uuid;
  v_vaga1   uuid := current_setting('smoke48e.vaga1')::uuid;
  v_vaga2   uuid := current_setting('smoke48e.vaga2')::uuid;
  v_vaga3   uuid := current_setting('smoke48e.vaga3')::uuid;
  v_secao   text;
  v_user    uuid;
  v_email   text;
  v_cand    uuid;
  v_a       uuid;
  v_k       uuid;
  v_f       uuid;
  v_ts      timestamptz;
  v_state   text;
  v_msg     text;

  -- (c)
  c_a_marc  timestamptz;  c_k_marc timestamptz;  c_f_marc timestamptz;
  c_n       int;          c_ran    boolean := false;
  -- (d)
  d_k_state text;  d_k_msg text;  d_f_state text;  d_f_msg text;
  d_a_ts    timestamptz;  d_a_err text;  d_ran boolean := false;
  -- (e)
  e_k_state text;  e_k_msg text;  e_f_state text;  e_f_msg text;
  e_a_err   text;  e_a_etapa text; e_a_status text; e_ran boolean := false;
  -- (f)
  f_a int;  f_k int;  f_f int;  f_global int;  f_ran boolean := false;
  -- (g)
  g_tri_antes int;  g_tri_depois int;  g_ins_antes int;  g_ins_depois int;
  g_diverg text;  g_ran boolean := false;
  r record;
  v_vol jsonb;
  v_exp int;
BEGIN
  FOREACH v_secao IN ARRAY ARRAY['c', 'd', 'e', 'f', 'g'] LOOP
    BEGIN
      -- (g) mede o volume ANTES da fixture, dentro da mesma subtransação.
      IF v_secao = 'g' THEN
        PERFORM set_config('request.jwt.claims',
          json_build_object('sub', v_admin::text,
                            'app_metadata', json_build_object('role', 'administrador'))::text, false);
        v_vol := public.funil_kpis(NULL) -> 'volume_by_stage';
        g_tri_antes := coalesce((v_vol ->> 'triagem')::int, 0);
        g_ins_antes := coalesce((v_vol ->> 'inscricao')::int, 0);
        PERFORM set_config('request.jwt.claims', '', false);
      END IF;

      -- ── fixture ──────────────────────────────────────────────────────────────
      v_user  := gen_random_uuid();
      v_email := 'p48smoke-' || replace(v_user::text, '-', '') || '@invalido.local';
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                              created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
      VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              v_email, '', now(), now(),
              '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
      INSERT INTO public.candidatos
        (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
      VALUES
        (v_user, 'SMOKE P48 Titular', v_email, '(11) 96666-5555',
         DATE '1990-01-15', 'Santos', 'SP', 'site')
      RETURNING id INTO v_cand;

      -- A: em andamento DE VERDADE (INSERT rejeitado desarma o dispatch; UPDATE leva a em_analise)
      INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
      VALUES (v_cand, v_vaga1, 'triagem', 'rejeitado', false, now() - interval '10 days')
      RETURNING id INTO v_a;
      UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_a;
      -- K: a forma exata do knockout
      INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
      VALUES (v_cand, v_vaga2, 'inscricao', 'rejeitado', false, now() - interval '9 days')
      RETURNING id INTO v_k;
      -- F: legado — status terminal em etapa de trabalho
      INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
      VALUES (v_cand, v_vaga3, 'triagem', 'rejeitado', false, now() - interval '8 days')
      RETURNING id INTO v_f;
      UPDATE public.candidaturas SET status = 'finalizado' WHERE id = v_f;

      -- ── (c) D1 · registrar_pedido_exclusao ────────────────────────────────────
      IF v_secao = 'c' THEN
        PERFORM set_config('request.jwt.claims',
          json_build_object('sub', v_user::text,
                            'app_metadata', json_build_object('role', 'candidato'))::text, false);
        SELECT r2.candidaturas_encerradas INTO c_n FROM public.registrar_pedido_exclusao(v_cand) r2;
        PERFORM set_config('request.jwt.claims', '', false);
        SELECT encerrada_a_pedido_em INTO c_a_marc FROM public.candidaturas WHERE id = v_a;
        SELECT encerrada_a_pedido_em INTO c_k_marc FROM public.candidaturas WHERE id = v_k;
        SELECT encerrada_a_pedido_em INTO c_f_marc FROM public.candidaturas WHERE id = v_f;
        c_ran := true;
      END IF;

      -- ── (d) D2 · retirar_candidatura ──────────────────────────────────────────
      IF v_secao = 'd' THEN
        PERFORM set_config('request.jwt.claims',
          json_build_object('sub', v_user::text,
                            'app_metadata', json_build_object('role', 'candidato'))::text, false);
        BEGIN
          PERFORM public.retirar_candidatura(v_k);
          d_k_state := 'aceitou';
        EXCEPTION WHEN OTHERS THEN
          d_k_state := SQLSTATE; d_k_msg := SQLERRM;
        END;
        BEGIN
          PERFORM public.retirar_candidatura(v_f);
          d_f_state := 'aceitou';
        EXCEPTION WHEN OTHERS THEN
          d_f_state := SQLSTATE; d_f_msg := SQLERRM;
        END;
        BEGIN
          d_a_ts := public.retirar_candidatura(v_a);
        EXCEPTION WHEN OTHERS THEN
          d_a_err := SQLSTATE || ': ' || SQLERRM;
        END;
        PERFORM set_config('request.jwt.claims', '', false);
        d_ran := true;
      END IF;

      -- ── (e) D3 · rejeitar_candidatura (administrador, justificativa >= 50) ─────
      IF v_secao = 'e' THEN
        PERFORM set_config('request.jwt.claims',
          json_build_object('sub', v_admin::text,
                            'app_metadata', json_build_object('role', 'administrador'))::text, false);
        BEGIN
          PERFORM public.rejeitar_candidatura(v_k, 'outro', repeat('Justificativa sintetica do smoke P48. ', 3));
          e_k_state := 'aceitou';
        EXCEPTION WHEN OTHERS THEN
          e_k_state := SQLSTATE; e_k_msg := SQLERRM;
        END;
        BEGIN
          PERFORM public.rejeitar_candidatura(v_f, 'outro', repeat('Justificativa sintetica do smoke P48. ', 3));
          e_f_state := 'aceitou';
        EXCEPTION WHEN OTHERS THEN
          e_f_state := SQLSTATE; e_f_msg := SQLERRM;
        END;
        BEGIN
          PERFORM public.rejeitar_candidatura(v_a, 'outro', repeat('Justificativa sintetica do smoke P48. ', 3));
        EXCEPTION WHEN OTHERS THEN
          e_a_err := SQLSTATE || ': ' || SQLERRM;
        END;
        PERFORM set_config('request.jwt.claims', '', false);
        SELECT etapa_atual::text, status::text INTO e_a_etapa, e_a_status FROM public.candidaturas WHERE id = v_a;
        e_ran := true;
      END IF;

      -- ── (f) D4 · v_fila_trabalho (como postgres: RLS não recorta) ────────────
      IF v_secao = 'f' THEN
        SELECT count(*) INTO f_a FROM public.v_fila_trabalho WHERE candidatura_id = v_a;
        SELECT count(*) INTO f_k FROM public.v_fila_trabalho WHERE candidatura_id = v_k;
        SELECT count(*) INTO f_f FROM public.v_fila_trabalho WHERE candidatura_id = v_f;
        SELECT count(*) INTO f_global
          FROM public.v_fila_trabalho fq JOIN public.candidaturas c ON c.id = fq.candidatura_id
         WHERE c.status::text IN ('rejeitado', 'finalizado') OR c.etapa_atual::text IN ('aprovado', 'rejeitado');
        f_ran := true;
      END IF;

      -- ── (g) D6 · funil_kpis ───────────────────────────────────────────────────
      IF v_secao = 'g' THEN
        PERFORM set_config('request.jwt.claims',
          json_build_object('sub', v_admin::text,
                            'app_metadata', json_build_object('role', 'administrador'))::text, false);
        v_vol := public.funil_kpis(NULL) -> 'volume_by_stage';
        PERFORM set_config('request.jwt.claims', '', false);
        g_tri_depois := coalesce((v_vol ->> 'triagem')::int, 0);
        g_ins_depois := coalesce((v_vol ->> 'inscricao')::int, 0);

        -- Global: cada etapa do enum VIVO contra a contagem direta pela regra,
        -- escrita aqui sem chamar a função (status terminal não soma em etapa de
        -- trabalho; baldes terminais somam tudo). Inclui a fixture — é a mesma leitura.
        g_diverg := '';
        FOR r IN
          SELECT e.enumlabel AS etapa FROM pg_enum e
           WHERE e.enumtypid = 'public.etapa_processo'::regtype
        LOOP
          SELECT count(*) INTO v_exp
            FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
           WHERE c.deleted_at IS NULL
             AND c.etapa_atual::text = r.etapa
             AND (r.etapa IN ('aprovado', 'rejeitado')
                  OR c.status IS NULL
                  OR c.status::text NOT IN ('rejeitado', 'finalizado'));
          IF coalesce((v_vol ->> r.etapa)::int, 0) <> v_exp THEN
            g_diverg := g_diverg || format('%s: funil_kpis %s, direto %s; ',
                                           r.etapa, coalesce(v_vol ->> r.etapa, '0'), v_exp);
          END IF;
        END LOOP;
        g_ran := true;
      END IF;

      RAISE EXCEPTION 'rollback_smoke48e_%', v_secao USING ERRCODE = 'P48E1';
    EXCEPTION
      WHEN sqlstate 'P48E1' THEN
        NULL;  -- reversão esperada
    END;
  END LOOP;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);

  -- ── julgamento (c) ──────────────────────────────────────────────────────────
  IF NOT c_ran THEN RAISE EXCEPTION 'P48E FAIL (c): a secao nao rodou'; END IF;
  IF c_a_marc IS NULL THEN
    RAISE EXCEPTION 'P48E FAIL (c): a candidatura EM ANDAMENTO nao foi encerrada a pedido — as duas negativas abaixo passariam por vacuidade';
  END IF;
  IF c_k_marc IS NOT NULL THEN
    RAISE EXCEPTION 'P48E FAIL (c): registrar_pedido_exclusao marcou o KNOCKOUT (%). Defeito 26', c_k_marc;
  END IF;
  IF c_f_marc IS NOT NULL THEN
    RAISE EXCEPTION 'P48E FAIL (c): registrar_pedido_exclusao marcou o FINALIZADO legado (%)', c_f_marc;
  END IF;
  IF c_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P48E FAIL (c): candidaturas_encerradas = %, esperado 1 (so a em andamento)', c_n;
  END IF;
  PERFORM set_config('smoke48e.pass', (current_setting('smoke48e.pass')::int + 1)::text, false);
  RAISE NOTICE 'P48E PASS (c): D1 — pedido de exclusao encerra so a em andamento';

  -- ── julgamento (d) ──────────────────────────────────────────────────────────
  IF NOT d_ran THEN RAISE EXCEPTION 'P48E FAIL (d): a secao nao rodou'; END IF;
  IF d_k_state IS DISTINCT FROM '22023' OR d_k_msg NOT LIKE 'CANDIDATURA_NAO_RETIRAVEL%' THEN
    RAISE EXCEPTION 'P48E FAIL (d): retirar o KNOCKOUT deu % (%) — esperado 22023 CANDIDATURA_NAO_RETIRAVEL', d_k_state, d_k_msg;
  END IF;
  IF d_f_state IS DISTINCT FROM '22023' OR d_f_msg NOT LIKE 'CANDIDATURA_NAO_RETIRAVEL%' THEN
    RAISE EXCEPTION 'P48E FAIL (d): retirar o FINALIZADO deu % (%) — esperado 22023 CANDIDATURA_NAO_RETIRAVEL', d_f_state, d_f_msg;
  END IF;
  IF d_a_err IS NOT NULL OR d_a_ts IS NULL THEN
    RAISE EXCEPTION 'P48E FAIL (d): retirar a EM ANDAMENTO nao completou (erro %, retorno %) — so a recusa medida nao e cobertura', d_a_err, d_a_ts;
  END IF;
  PERFORM set_config('smoke48e.pass', (current_setting('smoke48e.pass')::int + 1)::text, false);
  RAISE NOTICE 'P48E PASS (d): D2 — retirada recusa knockout e finalizado (22023), aceita a em andamento';

  -- ── julgamento (e) ──────────────────────────────────────────────────────────
  IF NOT e_ran THEN RAISE EXCEPTION 'P48E FAIL (e): a secao nao rodou'; END IF;
  IF e_k_state IS DISTINCT FROM '23514' OR e_k_msg NOT LIKE '%encerrada%' THEN
    RAISE EXCEPTION 'P48E FAIL (e): re-rejeitar o KNOCKOUT deu % (%) — esperado check_violation «ja encerrada». Com a chave de dedupe do JORN-18 isto seria um 2o e-mail de rejeicao', e_k_state, e_k_msg;
  END IF;
  IF e_f_state IS DISTINCT FROM '23514' OR e_f_msg NOT LIKE '%encerrada%' THEN
    RAISE EXCEPTION 'P48E FAIL (e): rejeitar o FINALIZADO deu % (%) — esperado check_violation «ja encerrada»', e_f_state, e_f_msg;
  END IF;
  IF e_a_err IS NOT NULL OR e_a_etapa IS DISTINCT FROM 'rejeitado' OR e_a_status IS DISTINCT FROM 'rejeitado' THEN
    RAISE EXCEPTION 'P48E FAIL (e): rejeitar a EM ANDAMENTO nao completou (erro %, etapa %, status %)', e_a_err, e_a_etapa, e_a_status;
  END IF;
  PERFORM set_config('smoke48e.pass', (current_setting('smoke48e.pass')::int + 1)::text, false);
  RAISE NOTICE 'P48E PASS (e): D3 — rejeicao recusa knockout e finalizado (check_violation), aceita a em andamento';

  -- ── julgamento (f) ──────────────────────────────────────────────────────────
  IF NOT f_ran THEN RAISE EXCEPTION 'P48E FAIL (f): a secao nao rodou'; END IF;
  IF f_global <> 0 THEN
    RAISE EXCEPTION 'P48E FAIL (f): v_fila_trabalho lista % candidatura(s) encerrada(s) como trabalho pendente', f_global;
  END IF;
  IF f_a <> 1 THEN
    RAISE EXCEPTION 'P48E FAIL (f): a EM ANDAMENTO nao aparece na fila (% linhas) — o filtro ficou largo demais e a negativa passaria por vacuidade', f_a;
  END IF;
  IF f_k <> 0 OR f_f <> 0 THEN
    RAISE EXCEPTION 'P48E FAIL (f): a fila lista o knockout (%) ou o finalizado (%)', f_k, f_f;
  END IF;
  PERFORM set_config('smoke48e.pass', (current_setting('smoke48e.pass')::int + 1)::text, false);
  RAISE NOTICE 'P48E PASS (f): D4 — fila sem encerradas (global) e fixture: em andamento dentro, knockout/finalizado fora';

  -- ── julgamento (g) ──────────────────────────────────────────────────────────
  IF NOT g_ran THEN RAISE EXCEPTION 'P48E FAIL (g): a secao nao rodou'; END IF;
  IF g_diverg <> '' THEN
    RAISE EXCEPTION 'P48E FAIL (g): volume_by_stage diverge da contagem direta pela regra: %', g_diverg;
  END IF;
  IF g_tri_depois - g_tri_antes <> 1 THEN
    RAISE EXCEPTION 'P48E FAIL (g): triagem variou % com a fixture (esperado +1: a em andamento soma, o finalizado nao)', g_tri_depois - g_tri_antes;
  END IF;
  IF g_ins_depois - g_ins_antes <> 0 THEN
    RAISE EXCEPTION 'P48E FAIL (g): inscricao variou % com a fixture (esperado 0: o knockout nao e volume de trabalho)', g_ins_depois - g_ins_antes;
  END IF;
  PERFORM set_config('smoke48e.pass', (current_setting('smoke48e.pass')::int + 1)::text, false);
  RAISE NOTICE 'P48E PASS (g): D6 — volume por etapa pela regra; fixture: triagem +1, inscricao +0';
END
$cdefg$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (h) ⊖ NEGATIVA DE RESÍDUO + gate de contagem.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $h$
DECLARE
  r         record;
  v_agora   bigint;
  v_diverg  text := '';
  v_pass    int;
  v_esperado int := 8;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('public.candidatos',            'n_candos'),
      ('public.candidaturas',          'n_cands'),
      ('auth.users',                   'n_users'),
      ('public.historico_candidatura', 'n_hist'),
      ('public.solicitacoes_dados',    'n_solic'),
      ('public.notificacoes_enviadas', 'n_notif')
    ) AS t(tabela, chave)
  LOOP
    EXECUTE format('SELECT count(*) FROM %s', r.tabela) INTO v_agora;
    IF v_agora <> current_setting('smoke48e.' || r.chave)::bigint THEN
      v_diverg := v_diverg || format('%s: %s -> %s; ', r.tabela, current_setting('smoke48e.' || r.chave), v_agora);
    END IF;
  END LOOP;
  IF v_diverg <> '' THEN
    RAISE EXCEPTION 'P48E FAIL (h): RESIDUO EM PROD — as subtransacoes nao reverteram: %', v_diverg;
  END IF;
  PERFORM set_config('smoke48e.pass', (current_setting('smoke48e.pass')::int + 1)::text, false);

  v_pass := current_setting('smoke48e.pass')::int;
  IF v_pass <> v_esperado THEN
    RAISE EXCEPTION 'P48E FAIL (z): % PASS de % esperadas — run parcial, NAO tratar como verde', v_pass, v_esperado;
  END IF;
  RAISE NOTICE 'P48E RESUMO: % de % — zero residuo', v_pass, v_esperado;
END
$h$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT jsonb_build_object('smoke', 'p48_candidatura_encerrada',
                          'pass', current_setting('smoke48e.pass')::int,
                          'esperado', 8) AS resultado;
