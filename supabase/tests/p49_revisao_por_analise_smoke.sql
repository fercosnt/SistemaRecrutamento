-- =============================================================================
-- Phase 49 / Plano 49-30 — smoke da REVISÃO HUMANA POR ANÁLISE
--                          (JORN-12 / D-39 / gap CR-03 do 49-VERIFICATION)
-- =============================================================================
-- O QUE ELE VIGIA.
--   · 20260929000003 — `salvar_avaliacao_entrevista(p_candidatura_id, p_analise_id,
--     p_scores_humanos, p_notas)`: a nota humana vai para a análise que o CLIENTE nomeia
--     por id, e só se ela for VIGENTE e for DAQUELA candidatura. A forma antiga de três
--     argumentos deixa de escolher: com mais de uma vigente RECUSA pedindo a análise; com
--     exatamente uma, delega à forma nova com o id dela.
--   · 20260922000004 — o portão de `avancar_etapa` (EXISTS sobre TODAS as vigentes), que
--     não muda: a bandeira da vigente MAIS ANTIGA bloqueia, e a confirmação DA MESMA análise
--     libera. É o caminho que o painel do 49-31 passa a oferecer.
--
--   O defeito (CR-03): o 49-10 tornou a vigência POR `(candidatura, tipo)` — online e
--   presencial podem ter uma vigente cada —, e `salvar_avaliacao_entrevista` continuou no
--   singular: `ORDER BY created_at DESC LIMIT 1` sobre as vigentes dos DOIS tipos. Com a
--   online bandeirada e a presencial mais nova, a nota do RH ia para a presencial em
--   silêncio, e a tela não dizia qual.
--
-- FIXTURE — a candidatura A tem, por INSERT direto (molde `p49_trilha_smoke.sql:334`), com
-- `created_at` EXPLÍCITO (dentro de uma transação `now()` é constante):
--   ONLINE vigente, a MAIS ANTIGA das vigentes, `bloqueio_avanco=true`, sem revisão;
--   PRESENCIAL vigente, MAIS NOVA, sem bandeira;
--   uma ONLINE SUPERADA (`superada_em` preenchida);
--   uma FALHA (`status_analise='falhou'`, sem competências) — a linha MAIS NOVA de todas.
-- A candidatura B, na MESMA vaga, tem uma vigente — é o alvo do caso de IDOR.
--
-- PARTE 1 — numa subtransação que reverte (`P49A1`):
--   (a)  forma de TRÊS argumentos, claims de administrador, duas vigentes ⇒ 23514 pedindo
--        a análise; nenhuma das duas vigentes muda e nenhuma linha `scores_candidato`
--        `tipo='entrevista'` nasce para A.
--   (b)  avançar A de `entrevista_presencial` para `decisao_final` ⇒ 23514 «revise a
--        bandeira» — a bandeira pendente é a da ONLINE, a mais antiga; A não se move.
--   (c)  `confirmar_revisao_entrevista(<online>)` ⇒ ok; o MESMO avanço passa em seguida.
--   (d)  forma de QUATRO argumentos com `p_analise_id = <online>` ⇒ grava `scores_humanos`
--        e `revisada_por` na online, a presencial fica INTACTA,
--        `scores_candidato.metadata->>'analise_id'` = online e o retorno `analise_id` = online.
--   (e)  quatro argumentos com o id da SUPERADA ⇒ 23514; com o id da FALHA ⇒ 23514; com o
--        id da vigente da candidatura B (e `p_candidatura_id` = A) ⇒ P0002 — e nenhuma das
--        três escreve em linha nenhuma (as três linhas e as notas de A e B conferidas).
--   (f)  quatro argumentos SEM claims ⇒ 42501; `anon` sem EXECUTE e `authenticated` com
--        EXECUTE nas DUAS assinaturas.
-- NEGATIVA:
--   (z)  nada das fixtures sobrevive e as contagens globais são as de antes.
--
-- ⚠ CADA chamada de RPC e cada UPDATE de etapa vão no SEU PRÓPRIO bloco
-- `BEGIN … EXCEPTION WHEN OTHERS` que grava `SQLSTATE:SQLERRM` numa variável. Antes da
-- migration a assinatura de quatro argumentos não existe (42883): isso vira ESTADO MEDIDO
-- em (d)/(e)/(f), nunca um aborto que esconda (a). É a lição da Deviation 1 do 49-10 — uma
-- RPC estourando dentro da subtransação deixa o portão vermelho pelo motivo certo
-- apontando o lugar errado. O julgamento, fora da subtransação, reprova a PRIMEIRA
-- cláusula quebrada, na ordem a, b, c, d, e, f, z.
--
-- A FIXTURE NÃO É UMA CANDIDATURA REAL (idioma do `p49_analise_vigente_smoke`): titular
-- sintético `@invalido.local`; candidatura que nasce `status='rejeitado'` (desarma
-- `trg_notif_confirmacao`) e vai a `em_analise` por UPDATE só de `status` — o INSERT não
-- aciona `candidaturas_avancar_etapa_trg` (`BEFORE UPDATE OF etapa_atual`), então A pode
-- nascer já em `entrevista_presencial`. O ATOR é real — administrador ATIVO lido NA
-- EXECUÇÃO (FK de `entrevista_analises.revisada_por`), nunca conta fixa.
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL
-- encerrada por `RAISE EXCEPTION` com SQLSTATE próprio (`P49A1`), capturado logo acima:
-- ROLLBACK de tudo, inclusive do que os triggers enfileiram em `net.http_request_queue`
-- (o avanço de (c) dispara o despacho de `avanco`; o worker do `pg_net` só vê o que foi
-- COMMITADO). Nenhum e-mail sai (D-54).
--
-- AS CONTAGENS GLOBAIS DE (z) NÃO SÃO FOTOGRAFIA (D-17): baseline capturada NA PRÓPRIA
-- execução. A asserção que decide é a de resíduo ESCOPADA às fixtures; a global é o cinto.
--
-- O PORTÃO MORDE — mutações provadas no 49-30 (Task 2, 2026-09-29), cada uma numa
-- requisição que aborta: `CREATE OR REPLACE` da função MUTADA + este smoke +
-- `RAISE 'MUTACAO_TERMINOU'`. Cada uma reprovou na letra abaixo e nenhuma chegou ao
-- marcador; depois das cinco, os md5(prosrc) vivos eram os do pós-portão. A próxima
-- redefinição destas funções tem de re-provar esta tabela (re-pin consciente,
-- PATTERNS §C) — uma cláusula nova sem mutação que a reprove é cláusula não vigiada:
--   | Mutação | Inversão                                                           | Reprova |
--   |---------|--------------------------------------------------------------------|---------|
--   | M1      | três argumentos com o corpo ANTERIOR (o do 20260922000008)          | (a)     |
--   | M2      | quatro argumentos SEM `ea.candidatura_id = p_candidatura_id`        | (e)     |
--   | M3      | quatro argumentos SEM a exigência de vigente                        | (e)     |
--   | M4      | quatro argumentos que ignoram o id e pegam a vigente mais recente   | (d)     |
--   | M5      | quatro argumentos com o guard de papel sem o `coalesce`             | (f)     |
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p49_revisao_por_analise_smoke.sql` —
-- UMA requisição, UMA sessão. O `SELECT` final devolve `{smoke, pass, esperado, ...}`;
-- qualquer FAIL é `RAISE EXCEPTION` e o `p46apply` sai com código ≠ 0.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de asserções DESTE arquivo
-- (escopo deliberado), não uma fotografia do banco. Hoje: 7 — a, b, c, d, e, f, z.
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('smoke49a.pass', '0', false);
SELECT set_config('smoke49a.fixtures', '', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — ator vivo (leitura) e contagens para a negativa.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_admin uuid;
  v_vaga  uuid;
BEGIN
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P49A FAIL (baseline): nenhum administrador ATIVO — sem ele nenhuma RPC de revisão tem quem a chame';
  END IF;

  SELECT v.id INTO v_vaga FROM public.vagas v ORDER BY v.created_at LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P49A FAIL (baseline): nenhuma vaga viva para a fixture';
  END IF;

  PERFORM set_config('smoke49a.admin', v_admin::text, false);
  PERFORM set_config('smoke49a.vaga',  v_vaga::text,  false);

  PERFORM set_config('smoke49a.n_cand',  (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke49a.n_ea',    (SELECT count(*) FROM public.entrevista_analises)::text, false);
  PERFORM set_config('smoke49a.n_sc',    (SELECT count(*) FROM public.scores_candidato)::text, false);
  PERFORM set_config('smoke49a.n_hist',  (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke49a.n_notif', (SELECT count(*) FROM public.notificacoes_enviadas)::text, false);
  PERFORM set_config('smoke49a.n_netq',  (SELECT count(*) FROM net.http_request_queue)::text, false);
  -- Cinto próprio: as análises com revisão carimbada. Este smoke carimba revisão nas
  -- FIXTURES; nenhuma marca pode escapar para uma linha viva.
  PERFORM set_config('smoke49a.n_rev',
    (SELECT count(*) FROM public.entrevista_analises WHERE revisao_confirmada_em IS NOT NULL)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1 — (a) … (f), numa subtransação que reverte (`P49A1`).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p1$
DECLARE
  v_admin   uuid := current_setting('smoke49a.admin')::uuid;
  v_vaga    uuid := current_setting('smoke49a.vaga')::uuid;
  v_claims  text;
  v_ids     text := '';
  v_ran     boolean := false;
  v_err     text;
  v_user    uuid;
  v_email   text;
  v_cand    uuid;
  v_a       uuid;   -- candidatura A (duas vigentes)
  v_b       uuid;   -- candidatura B (IDOR)
  v_on      uuid;   -- A · online vigente, MAIS ANTIGA, bandeirada
  v_pr      uuid;   -- A · presencial vigente, MAIS NOVA
  v_sup     uuid;   -- A · online SUPERADA
  v_fal     uuid;   -- A · FALHA (a linha mais nova de todas)
  v_bvig    uuid;   -- B · vigente
  v_ret     jsonb;
  c_comp  constant jsonb :=
    '[{"competency":"Resolucao de conflitos","score":4},{"competency":"Responsabilizacao","score":4}]'::jsonb;
  c_notas constant text := 'Notas humanas da entrevista, escritas pelo gestor no smoke P49A.';
  -- (a)
  a_state text := '<nao rodou>';  a_ret_id uuid;
  a_on_rev timestamptz;  a_on_scores jsonb;  a_pr_rev timestamptz;  a_pr_scores jsonb;  a_sc_n int;
  -- (b)
  b_state text := '<nao rodou>';  b_etapa text;
  -- (c)
  c_conf_state text := '<nao rodou>';  c_conf_ok boolean;  c_state text := '<nao rodou>';  c_etapa text;
  -- (d)
  d_state text := '<nao rodou>';  d_ret_id uuid;
  d_on_scores jsonb;  d_on_por uuid;  d_on_notas text;
  d_pr_scores jsonb;  d_pr_notas text;  d_pr_por uuid;  d_pr_rev timestamptz;
  d_sc_analise text;  d_sc_score numeric;  d_sc_status text;
  -- (e)
  e_sup_state text := '<nao rodou>';  e_fal_state text := '<nao rodou>';  e_b_state text := '<nao rodou>';
  e_toques text;  e_sc_analise text;  e_sc_score numeric;  e_sc_b int;
  -- (f)
  f_state text := '<nao rodou>';
BEGIN
  v_claims := json_build_object('sub', v_admin::text,
                'app_metadata', json_build_object('role', 'administrador'))::text;

  BEGIN
    -- ── fixture A · titular sintético + candidatura já em entrevista_presencial ─
    v_user  := gen_random_uuid();
    v_email := 'p49asmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P49A Titular A', v_email, '(11) 95555-5901',
       DATE '1992-03-10', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga, 'entrevista_presencial', 'rejeitado', false, now() - interval '10 days')
    RETURNING id INTO v_a;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_a;
    v_ids := v_ids || v_a::text || ',';

    -- ── fixture B · outro titular, MESMA vaga ────────────────────────────────
    v_user  := gen_random_uuid();
    v_email := 'p49asmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P49A Titular B', v_email, '(11) 95555-5902',
       DATE '1992-03-10', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga, 'entrevista_online', 'rejeitado', false, now() - interval '10 days')
    RETURNING id INTO v_b;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_b;
    v_ids := v_ids || v_b::text || ',';

    -- ── as análises, com created_at EXPLÍCITO ─────────────────────────────────
    INSERT INTO public.entrevista_analises
      (candidatura_id, tipo, competencias, bloqueio_avanco, revisao_confirmada_em,
       status_analise, superada_em, prompt_version, created_at)
    VALUES (v_a, 'online', c_comp, false, NULL, 'pendente_humano',
            now() - interval '5 hours', '1.0.0', now() - interval '6 hours')
    RETURNING id INTO v_sup;
    INSERT INTO public.entrevista_analises
      (candidatura_id, tipo, competencias, bloqueio_avanco, revisao_confirmada_em,
       status_analise, superada_em, prompt_version, created_at)
    VALUES (v_a, 'online', c_comp, true, NULL, 'pendente_humano',
            NULL, '1.0.0', now() - interval '5 hours')
    RETURNING id INTO v_on;
    INSERT INTO public.entrevista_analises
      (candidatura_id, tipo, competencias, bloqueio_avanco, revisao_confirmada_em,
       status_analise, superada_em, prompt_version, created_at)
    VALUES (v_a, 'presencial', c_comp, false, NULL, 'pendente_humano',
            NULL, '1.0.0', now() - interval '2 hours')
    RETURNING id INTO v_pr;
    INSERT INTO public.entrevista_analises
      (candidatura_id, tipo, competencias, bloqueio_avanco, revisao_confirmada_em,
       status_analise, superada_em, prompt_version, created_at)
    VALUES (v_a, 'online', NULL, false, NULL, 'falhou',
            NULL, '1.0.0', now() - interval '1 hour')
    RETURNING id INTO v_fal;
    INSERT INTO public.entrevista_analises
      (candidatura_id, tipo, competencias, bloqueio_avanco, revisao_confirmada_em,
       status_analise, superada_em, prompt_version, created_at)
    VALUES (v_b, 'online', c_comp, false, NULL, 'pendente_humano',
            NULL, '1.0.0', now() - interval '3 hours')
    RETURNING id INTO v_bvig;

    PERFORM set_config('request.jwt.claims', v_claims, false);

    -- ── (a) · três argumentos, duas vigentes ⇒ recusa pedindo a análise ─────
    BEGIN
      v_ret := public.salvar_avaliacao_entrevista(
        v_a, '{"Resolucao de conflitos": 3, "Responsabilizacao": 3}'::jsonb, c_notas);
      a_ret_id := (v_ret ->> 'analise_id')::uuid;
      a_state  := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN a_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT ea.revisao_confirmada_em, ea.scores_humanos INTO a_on_rev, a_on_scores
      FROM public.entrevista_analises ea WHERE ea.id = v_on;
    SELECT ea.revisao_confirmada_em, ea.scores_humanos INTO a_pr_rev, a_pr_scores
      FROM public.entrevista_analises ea WHERE ea.id = v_pr;
    SELECT count(*) INTO a_sc_n FROM public.scores_candidato sc
     WHERE sc.candidatura_id = v_a AND sc.tipo = 'entrevista';

    -- ── (b) · a bandeira da ONLINE (a mais antiga) bloqueia o avanço ───────────
    BEGIN
      UPDATE public.candidaturas SET etapa_atual = 'decisao_final' WHERE id = v_a;
      b_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN b_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT c.etapa_atual::text INTO b_etapa FROM public.candidaturas c WHERE c.id = v_a;

    -- ── (c) · confirmar a ONLINE libera o MESMO avanço ───────────────────────
    BEGIN
      v_ret := public.confirmar_revisao_entrevista(v_on);
      c_conf_ok    := (v_ret ->> 'ok')::boolean;
      c_conf_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN c_conf_state := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      UPDATE public.candidaturas SET etapa_atual = 'decisao_final' WHERE id = v_a;
      c_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN c_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT c.etapa_atual::text INTO c_etapa FROM public.candidaturas c WHERE c.id = v_a;

    -- ── (d) · quatro argumentos com a ONLINE ⇒ grava nela, presencial intacta ─
    BEGIN
      v_ret := public.salvar_avaliacao_entrevista(
        v_a, v_on, '{"Resolucao de conflitos": 4, "Responsabilizacao": 5}'::jsonb, c_notas);
      d_ret_id := (v_ret ->> 'analise_id')::uuid;
      d_state  := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN d_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT ea.scores_humanos, ea.revisada_por, ea.notas_humanas INTO d_on_scores, d_on_por, d_on_notas
      FROM public.entrevista_analises ea WHERE ea.id = v_on;
    SELECT ea.scores_humanos, ea.notas_humanas, ea.revisada_por, ea.revisao_confirmada_em
      INTO d_pr_scores, d_pr_notas, d_pr_por, d_pr_rev
      FROM public.entrevista_analises ea WHERE ea.id = v_pr;
    SELECT sc.metadata ->> 'analise_id', sc.score, sc.status::text INTO d_sc_analise, d_sc_score, d_sc_status
      FROM public.scores_candidato sc
     WHERE sc.candidatura_id = v_a AND sc.tipo = 'entrevista'
       AND sc.subtipo IS NULL AND sc.pergunta_id IS NULL;

    -- ── (e) · superada, falha e a vigente de OUTRA candidatura ⇒ recusadas ──
    --   Notas 1..2 (média ≠ 4.5): se alguma das três gravasse, o score de A mudaria.
    BEGIN
      PERFORM public.salvar_avaliacao_entrevista(
        v_a, v_sup, '{"Resolucao de conflitos": 1}'::jsonb, c_notas);
      e_sup_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN e_sup_state := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      PERFORM public.salvar_avaliacao_entrevista(
        v_a, v_fal, '{"Resolucao de conflitos": 2}'::jsonb, c_notas);
      e_fal_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN e_fal_state := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      PERFORM public.salvar_avaliacao_entrevista(
        v_a, v_bvig, '{"Resolucao de conflitos": 1, "Responsabilizacao": 2}'::jsonb, c_notas);
      e_b_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN e_b_state := SQLSTATE || ':' || SQLERRM;
    END;
    SELECT string_agg(
             CASE ea.id WHEN v_sup THEN 'superada' WHEN v_fal THEN 'falha' ELSE 'vigente_de_B' END,
             ', ')
      INTO e_toques
      FROM public.entrevista_analises ea
     WHERE ea.id IN (v_sup, v_fal, v_bvig)
       AND (ea.scores_humanos IS NOT NULL OR ea.notas_humanas IS NOT NULL
            OR ea.revisada_por IS NOT NULL OR ea.revisao_confirmada_em IS NOT NULL);
    SELECT sc.metadata ->> 'analise_id', sc.score INTO e_sc_analise, e_sc_score
      FROM public.scores_candidato sc
     WHERE sc.candidatura_id = v_a AND sc.tipo = 'entrevista'
       AND sc.subtipo IS NULL AND sc.pergunta_id IS NULL;
    SELECT count(*) INTO e_sc_b FROM public.scores_candidato sc
     WHERE sc.candidatura_id = v_b AND sc.tipo = 'entrevista';

    -- ── (f) · quatro argumentos SEM claims ⇒ fail-closed ─────────────────────
    PERFORM set_config('request.jwt.claims', '', false);
    BEGIN
      PERFORM public.salvar_avaliacao_entrevista(
        v_a, v_on, '{"Resolucao de conflitos": 3}'::jsonb, 'Tentativa sem papel nenhum.');
      f_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN f_state := SQLSTATE || ':' || SQLERRM;
    END;

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P49A1';
  EXCEPTION
    WHEN SQLSTATE 'P49A1' THEN
      NULL;  -- ROLLBACK da subtransação. Os valores medidos estão nas variáveis acima.
    WHEN OTHERS THEN
      v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;

  -- FORA da subtransação: um set_config feito dentro dela é revertido junto.
  PERFORM set_config('smoke49a.fixtures', v_ids, false);
  PERFORM set_config('request.jwt.claims', '', false);

  IF v_err IS NOT NULL THEN
    RAISE EXCEPTION 'P49A FAIL (parte 1): a subtransação abortou por erro INESPERADO (%) — nenhuma asserção foi julgada; o defeito é da FIXTURE, não das RPCs (cada RPC tem bloco de exceção próprio)', v_err;
  END IF;
  IF NOT v_ran THEN
    RAISE EXCEPTION 'P49A FAIL (parte 1): a subtransação não chegou ao fim e não houve erro capturado — estado impossível';
  END IF;

  -- ═══ JULGAMENTO, FORA da subtransação ═══

  -- (a)
  IF a_state = 'ACEITO' THEN
    RAISE EXCEPTION 'P49A FAIL (a): a forma de TRES argumentos, com duas vigentes na candidatura, GRAVOU a nota humana na analise % (%) — escolheu SOZINHA, pela mais recente, sem o chamador dizer qual. A online (%) e a que tem a bandeira pendente; a presencial (%) e a mais nova. E o CR-03: a forma antiga tem de RECUSAR (23514) pedindo a analise',
      a_ret_id,
      CASE a_ret_id WHEN v_pr THEN 'a PRESENCIAL, a mais recente' WHEN v_on THEN 'a ONLINE' ELSE 'outra' END,
      v_on, v_pr;
  END IF;
  IF a_state NOT LIKE '23514:%informe a analise%' THEN
    RAISE EXCEPTION 'P49A FAIL (a): a forma de tres argumentos com duas vigentes devolveu «%» (esperado 23514 pedindo que se informe a analise)', a_state;
  END IF;
  IF a_on_rev IS NOT NULL OR a_on_scores IS NOT NULL OR a_pr_rev IS NOT NULL OR a_pr_scores IS NOT NULL THEN
    RAISE EXCEPTION 'P49A FAIL (a): a recusa escreveu mesmo assim (online rev=% scores=%; presencial rev=% scores=%)',
      a_on_rev, a_on_scores, a_pr_rev, a_pr_scores;
  END IF;
  IF a_sc_n IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P49A FAIL (a): a recusa deixou % linha(s) scores_candidato tipo=entrevista para a fixture (esperado 0)', a_sc_n;
  END IF;
  PERFORM set_config('smoke49a.pass', (current_setting('smoke49a.pass')::int + 1)::text, false);

  -- (b)
  IF b_state NOT LIKE '23514:%revise a bandeira%' THEN
    RAISE EXCEPTION 'P49A FAIL (b): com a bandeira da ONLINE (a vigente MAIS ANTIGA) pendente, o avanco entrevista_presencial -> decisao_final devolveu «%» (esperado 23514 «revise a bandeira»). O portao do avancar_etapa olha TODAS as vigentes — uma bandeira que so a mais nova veria e o CR-03 do lado do portao',
      b_state;
  END IF;
  IF b_etapa IS DISTINCT FROM 'entrevista_presencial' THEN
    RAISE EXCEPTION 'P49A FAIL (b): a recusa MOVEU a candidatura para %', b_etapa;
  END IF;
  PERFORM set_config('smoke49a.pass', (current_setting('smoke49a.pass')::int + 1)::text, false);

  -- (c)
  IF c_conf_state IS DISTINCT FROM 'ACEITO' OR c_conf_ok IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P49A FAIL (c): confirmar_revisao_entrevista na ONLINE vigente (%) devolveu «%» (ok=%) — a analise que BLOQUEIA tem de ser a que se confirma',
      v_on, c_conf_state, c_conf_ok;
  END IF;
  IF c_state IS DISTINCT FROM 'ACEITO' OR c_etapa IS DISTINCT FROM 'decisao_final' THEN
    RAISE EXCEPTION 'P49A FAIL (c): depois de confirmar a ONLINE o MESMO avanco devolveu «%» e a etapa ficou % (esperado aceito, decisao_final) — confirmar a analise que bloqueia tem de liberar o portao',
      c_state, c_etapa;
  END IF;
  PERFORM set_config('smoke49a.pass', (current_setting('smoke49a.pass')::int + 1)::text, false);

  -- (d)
  IF d_state IS DISTINCT FROM 'ACEITO' THEN
    RAISE EXCEPTION 'P49A FAIL (d): a forma de QUATRO argumentos com p_analise_id = ONLINE (%) devolveu «%» (esperado gravar). 42883 = a assinatura (uuid,uuid,jsonb,text) nao existe',
      v_on, d_state;
  END IF;
  IF d_ret_id IS DISTINCT FROM v_on THEN
    RAISE EXCEPTION 'P49A FAIL (d): pedida a ONLINE (%), a RPC devolveu analise_id % (%) — ela ignorou o id que o cliente mandou',
      v_on, d_ret_id,
      CASE d_ret_id WHEN v_pr THEN 'a PRESENCIAL, a mais recente' ELSE 'outra' END;
  END IF;
  IF d_on_scores IS DISTINCT FROM '{"Resolucao de conflitos": 4, "Responsabilizacao": 5}'::jsonb
     OR d_on_por IS DISTINCT FROM v_admin OR d_on_notas IS DISTINCT FROM c_notas THEN
    RAISE EXCEPTION 'P49A FAIL (d): a ONLINE nao recebeu a revisao (scores_humanos=%, revisada_por=% esperado %, notas=%)',
      d_on_scores, d_on_por, v_admin, d_on_notas;
  END IF;
  IF d_pr_scores IS NOT NULL OR d_pr_notas IS NOT NULL OR d_pr_por IS NOT NULL OR d_pr_rev IS NOT NULL THEN
    RAISE EXCEPTION 'P49A FAIL (d): a PRESENCIAL (%) foi tocada por uma revisao que nomeou a ONLINE (scores=%, notas=%, por=%, rev=%)',
      v_pr, d_pr_scores, d_pr_notas, d_pr_por, d_pr_rev;
  END IF;
  IF d_sc_analise IS DISTINCT FROM v_on::text OR d_sc_score IS DISTINCT FROM 4.50 OR d_sc_status IS DISTINCT FROM 'sucesso' THEN
    RAISE EXCEPTION 'P49A FAIL (d): scores_candidato tipo=entrevista de A ficou analise_id=% score=% status=% (esperado %, 4.50, sucesso) — metadata.analise_id e o que diz de qual analise a nota veio (D-65)',
      d_sc_analise, d_sc_score, d_sc_status, v_on;
  END IF;
  PERFORM set_config('smoke49a.pass', (current_setting('smoke49a.pass')::int + 1)::text, false);

  -- (e)
  IF e_sup_state NOT LIKE '23514:%' THEN
    RAISE EXCEPTION 'P49A FAIL (e): quatro argumentos com o id da SUPERADA (%) devolveu «%» (esperado 23514) — a nota humana cairia numa analise que nao vale mais',
      v_sup, e_sup_state;
  END IF;
  IF e_fal_state NOT LIKE '23514:%' THEN
    RAISE EXCEPTION 'P49A FAIL (e): quatro argumentos com o id da FALHA (%) devolveu «%» (esperado 23514) — a falha nao tem competencias para pontuar',
      v_fal, e_fal_state;
  END IF;
  IF e_b_state NOT LIKE 'P0002:%' THEN
    RAISE EXCEPTION 'P49A FAIL (e): quatro argumentos com p_candidatura_id = A e o id da vigente de OUTRA candidatura (B, %) devolveu «%» (esperado P0002) — sem a condicao ea.candidatura_id = p_candidatura_id um RH dono da vaga de A grava nota numa analise de B (IDOR, T-49-30-01)',
      v_bvig, e_b_state;
  END IF;
  IF e_toques IS NOT NULL THEN
    RAISE EXCEPTION 'P49A FAIL (e): recusada ou nao, a chamada ESCREVEU em: % — nenhuma das tres pode tocar linha', e_toques;
  END IF;
  IF e_sc_analise IS DISTINCT FROM v_on::text OR e_sc_score IS DISTINCT FROM 4.50 OR e_sc_b IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P49A FAIL (e): a nota consolidada mudou depois das tres recusas (A: analise_id=% score=%, esperado % / 4.50; linhas de B=%, esperado 0)',
      e_sc_analise, e_sc_score, v_on, e_sc_b;
  END IF;
  PERFORM set_config('smoke49a.pass', (current_setting('smoke49a.pass')::int + 1)::text, false);

  -- (f)
  IF f_state NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P49A FAIL (f): a forma de quatro argumentos SEM claims devolveu «%» (esperado 42501). O guard fail-OPEN compara v_role direto: com v_role nulo o NOT IN devolve NULL, o IF nao dispara, e quem chega sem papel passa', f_state;
  END IF;
  PERFORM set_config('smoke49a.pass', (current_setting('smoke49a.pass')::int + 1)::text, false);
END
$p1$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f, cont.) ACL — lido do catálogo, fora de qualquer subtransação. É a segunda metade
--   da (f): não incrementa o contador; reprova sozinha se o ACL de alguma das duas
--   assinaturas estiver errado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $acl$
DECLARE
  v_nova   regprocedure := to_regprocedure('public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)');
  v_antiga regprocedure := to_regprocedure('public.salvar_avaliacao_entrevista(uuid,jsonb,text)');
  v_anon_n boolean;  v_auth_n boolean;  v_anon_a boolean;  v_auth_a boolean;
BEGIN
  v_anon_n := coalesce(has_function_privilege('anon',          v_nova,   'EXECUTE'), true);
  v_auth_n := coalesce(has_function_privilege('authenticated', v_nova,   'EXECUTE'), false);
  v_anon_a := coalesce(has_function_privilege('anon',          v_antiga, 'EXECUTE'), true);
  v_auth_a := coalesce(has_function_privilege('authenticated', v_antiga, 'EXECUTE'), false);
  IF v_nova IS NULL OR v_antiga IS NULL OR v_anon_n OR v_anon_a OR NOT v_auth_n OR NOT v_auth_a THEN
    RAISE EXCEPTION 'P49A FAIL (f): ACL das duas assinaturas (nova existe=%, antiga existe=%): anon nova=% antiga=% (esperado false/false — o grant do pg_default_acl e DIRETO); authenticated nova=% antiga=% (esperado true/true — e o JWT do RH que chama)',
      v_nova IS NOT NULL, v_antiga IS NOT NULL, v_anon_n, v_anon_a, v_auth_n, v_auth_a;
  END IF;
END
$acl$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) NEGATIVA — nada das fixtures sobreviveu; contagens globais iguais às de antes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE
  v_ids  uuid[] := coalesce(string_to_array(rtrim(current_setting('smoke49a.fixtures'), ','), ',')::uuid[], '{}');
  l_cand int;  l_ea int;  l_sc int;  l_hist int;  l_fila int;  l_tit int;
  g_cand bigint;  g_ea bigint;  g_sc bigint;  g_hist bigint;  g_notif bigint;  g_netq bigint;  g_rev bigint;
BEGIN
  IF cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'P49A FAIL (z): nenhuma fixture registrada — a negativa não teria o que conferir';
  END IF;
  SELECT count(*) INTO l_cand FROM public.candidaturas c WHERE c.id = ANY (v_ids);
  SELECT count(*) INTO l_ea   FROM public.entrevista_analises ea WHERE ea.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_sc   FROM public.scores_candidato sc WHERE sc.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_hist FROM public.historico_candidatura h WHERE h.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_fila FROM net.http_request_queue q
   WHERE convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = ANY (v_ids::text[]);
  SELECT count(*) INTO l_tit  FROM public.candidatos c WHERE c.email LIKE 'p49asmoke-%@invalido.local';
  IF l_cand <> 0 OR l_ea <> 0 OR l_sc <> 0 OR l_hist <> 0 OR l_fila <> 0 OR l_tit <> 0 THEN
    RAISE EXCEPTION 'P49A FAIL (z): RESÍDUO das fixtures — candidaturas=% analises=% notas=% historico=% fila=% titulares=% (a subtransação não reverteu; um despacho COMMITADO sai como e-mail)',
      l_cand, l_ea, l_sc, l_hist, l_fila, l_tit;
  END IF;

  SELECT count(*) INTO g_cand  FROM public.candidaturas;
  SELECT count(*) INTO g_ea    FROM public.entrevista_analises;
  SELECT count(*) INTO g_sc    FROM public.scores_candidato;
  SELECT count(*) INTO g_hist  FROM public.historico_candidatura;
  SELECT count(*) INTO g_notif FROM public.notificacoes_enviadas;
  SELECT count(*) INTO g_netq  FROM net.http_request_queue;
  SELECT count(*) INTO g_rev   FROM public.entrevista_analises WHERE revisao_confirmada_em IS NOT NULL;
  IF g_cand  IS DISTINCT FROM current_setting('smoke49a.n_cand')::bigint
     OR g_ea    IS DISTINCT FROM current_setting('smoke49a.n_ea')::bigint
     OR g_sc    IS DISTINCT FROM current_setting('smoke49a.n_sc')::bigint
     OR g_hist  IS DISTINCT FROM current_setting('smoke49a.n_hist')::bigint
     OR g_notif IS DISTINCT FROM current_setting('smoke49a.n_notif')::bigint
     OR g_netq  IS DISTINCT FROM current_setting('smoke49a.n_netq')::bigint
     OR g_rev   IS DISTINCT FROM current_setting('smoke49a.n_rev')::bigint THEN
    RAISE EXCEPTION 'P49A FAIL (z): contagem global mudou (candidaturas % -> %, analises % -> %, notas % -> %, historico % -> %, notificacoes % -> %, fila % -> %, revisadas % -> %) com resíduo ZERO das fixtures — o delta é de tráfego concorrente commitado durante a requisição; rodar de novo',
      current_setting('smoke49a.n_cand'), g_cand, current_setting('smoke49a.n_ea'), g_ea,
      current_setting('smoke49a.n_sc'), g_sc, current_setting('smoke49a.n_hist'), g_hist,
      current_setting('smoke49a.n_notif'), g_notif, current_setting('smoke49a.n_netq'), g_netq,
      current_setting('smoke49a.n_rev'), g_rev;
  END IF;
  PERFORM set_config('smoke49a.pass', (current_setting('smoke49a.pass')::int + 1)::text, false);
END
$z$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke49a.pass')::int <> 7 THEN
    RAISE EXCEPTION 'P49A FAIL (gate): pass = % de 7 — alguma asserção não incrementou o contador', current_setting('smoke49a.pass');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',     'p49_revisao_por_analise',
  'pass',      current_setting('smoke49a.pass')::int,
  'esperado',  7,
  'n_cand',    current_setting('smoke49a.n_cand')::int,
  'n_ea',      current_setting('smoke49a.n_ea')::int,
  'n_ea_revisadas', current_setting('smoke49a.n_rev')::int,
  'n_sc',      current_setting('smoke49a.n_sc')::int,
  'n_netq',    current_setting('smoke49a.n_netq')::int
) AS resultado;
