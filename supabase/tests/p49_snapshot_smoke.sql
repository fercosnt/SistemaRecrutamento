-- =============================================================================
-- Phase 49 / Plano 49-07 — smoke do ARQUIVO DA DECISÃO (JORN-3b / D-44 / D-45)
-- =============================================================================
-- O QUE ELE VIGIA.
--   · 20260922000006 — `trg_decisao_final_snapshot` passa a ser
--     `AFTER UPDATE … FOR EACH ROW WHEN ((to_jsonb(OLD) - 'explicacao_solicitada_em'
--     - 'alerta_prazo_enviado_em') IS DISTINCT FROM (to_jsonb(NEW) - as mesmas duas))`:
--     arquiva quando a linha MUDA, e só isso. As duas exclusões são o carimbo de LEITURA
--     da explicação (escrito pelo titular ao abrir a página) e a telemetria do alerta de
--     prazo (escrita pelo cron) — nenhuma das duas é mudança da DECISÃO.
--   · 20260922000006 — `stamp_explicacao_acessada` fica IDEMPOTENTE
--     (`UPDATE … AND explicacao_solicitada_em IS NULL` + re-SELECT da linha). São dois
--     consertos porque são dois defeitos: o trigger arquivava UPDATE sem mudança, e a RPC
--     fazia um UPDATE a cada leitura. Cada um sozinho deixa um caminho aberto.
--
-- PARTE 1 (o trigger e a RPC):
--   (y)  CATÁLOGO: `public.decisao_final` não tem NENHUM trigger BEFORE UPDATE. É a
--        premissa que torna a lista de exclusão do D-44 COMPLETA — um carimbador de
--        `updated_at` mudaria uma coluna em TODO UPDATE, e um UPDATE sem mudança voltaria
--        a arquivar. Medido 0 em 2026-09-22; se um nascer, isto reprova e a decisão é do
--        operador (D-14), não «acrescentar a coluna à exclusão».
--   (a)  CINCO chamadas de `stamp_explicacao_acessada` com o JWT do TITULAR ⇒ ZERO linha
--        nova em `decisao_final_historico`; a 1ª carimba; as 4 seguintes NÃO ESCREVEM.
--        ⚠ O instrumento das 4 seguintes é o `ctid` da linha, e não o valor da coluna:
--        `COALESCE(col, now())` preservava o VALOR e ainda assim ESCREVIA — era o defeito.
--        `ctid` muda a cada versão de linha, inclusive dentro da mesma transação, então
--        `ctid` imutável é prova de que o UPDATE não aconteceu. O valor do carimbo é posto
--        num instante DISTINTIVO (2020-03-04) entre a 1ª e a 2ª chamada de propósito:
--        dentro de uma transação `now()` é constante, e comparar `now()` com `now()` não
--        distinguiria nada.
--   (a2) a 2ª chamada devolve A LINHA, não NULL (Correção 30): com o filtro `IS NULL` o
--        `RETURNING * INTO` sai vazio, e sem o re-SELECT a RPC devolveria NULL ao front.
--   (b)  `UPDATE decisao_final SET justificativa = justificativa` (no-op puro) ⇒ ZERO linha
--        nova — e o `ctid` MUDA, o que é o que torna esta asserção não-vácua: o UPDATE
--        aconteceu de verdade (o Postgres grava nova versão de linha mesmo com valores
--        idênticos) e o trigger simplesmente não disparou.
--   (c)  UPDATE só das DUAS colunas excluídas (`alerta_prazo_enviado_em` e
--        `explicacao_solicitada_em`) ⇒ ZERO linha nova, `ctid` muda.
--   (d)  mudança REAL de `justificativa` — que é a FORMA do tombstone do motor de exclusão
--        (`anonimizar_candidato`, passo `tombstone_decisao_final`) ⇒ UMA linha nova, com o
--        valor ANTIGO. É a asserção que prova que a exclusão do D-44 não passou do ponto:
--        ali a ordem «arquiva a linha viva, depois raspa o arquivo» é o mecanismo, e um
--        `WHEN` largo demais a desligaria sem nenhum erro.
--
-- PARTE 2 (o que tem de CONTINUAR arquivando — a metade que mantém o conserto honesto):
--   (e)  REDECISÃO: `registrar_decisao` sobre linha existente (o `ON CONFLICT DO UPDATE`)
--        ⇒ UMA linha nova, com a decisão e a justificativa ANTERIORES. É o histórico de
--        emendas da decisão, e é o que o titular recebe.
--   (f)  CICLO DE REVISÃO (Art. 20): `solicitar_revisao_decisao` (JWT do titular) ⇒ 1 ·
--        `responder_revisao_decisao('mantida')` (revisor B ≠ decisor A) ⇒ 1. Cada linha
--        arquivada guarda o estado ANTES (o snapshot lê OLD), o que é conferido coluna a
--        coluna: o arquivo do pedido vem com `revisao_solicitada_em` NULL.
--   (f2) REABERTURA (`responder_revisao_decisao('revertida')`) ⇒ 1, com `reaberta_em`
--        preenchido na linha viva e NULL no arquivo, e a candidatura em
--        `decisao_final/em_analise` (reabrir, NUNCA aprovar — D-01/RNF-07a). É a transição
--        mais cara de perder: veredito, reabertura e prazo vão no MESMO UPDATE, então um
--        snapshot suprimido apaga os três de uma vez.
--   (g)  PARIDADE DE COLUNAS, lida na EXECUÇÃO de TRÊS fontes independentes:
--          A = colunas(decisao_final) − {id, em} ∪ {decidido_em}
--          B = colunas(decisao_final_historico) − {id, arquivado_em}
--          C = a lista do INSERT no corpo VIVO de `snapshot_decisao_final()`
--        A = B = C, e a reprovação NOMEIA a coluna que falta de qual lado. ⚠ Não existe
--        nenhuma lista literal de colunas neste arquivo: é a forma que não envelhece.
--        Uma coluna nova em `decisao_final` que não entre no arquivo passa a REPROVAR em
--        vez de sumir em silêncio — o ponto cego que o CLAUDE.md §«Portões» nomeia.
-- NEGATIVA:
--   (z)  nada das fixtures sobrevive (candidaturas, titulares, decisão, arquivo, histórico,
--        fila) e as contagens globais são as de antes.
--
-- A FIXTURE NÃO É UMA CANDIDATURA REAL (idioma do 48-08/48-09/48-11/49-06): o operador pode
-- estar exercitando as contas `+claude` em PROD, e um UPDATE nelas — mesmo revertido —
-- disputa lock de linha com o fluxo vivo. Titular sintético `@invalido.local`; candidatura
-- que nasce `status='rejeitado'` (desarma `trg_notif_confirmacao`) e vai a `em_analise` por
-- UPDATE só de `status`. Os ATORES são reais — RH/admin ATIVOS lidos NA EXECUÇÃO (FK de
-- `decisao_final.por_usuario` e `revisao_por_usuario`), nunca contas fixas:
--   A decide (administrador), B responde a revisão (RH/admin ≠ A — revisor ≠ decisor,
--   REVISAO-05).
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL
-- encerrada por `RAISE EXCEPTION` com SQLSTATE próprio (`P49S1`), capturado logo acima:
-- ROLLBACK da subtransação inteira, inclusive das linhas que os triggers enfileiram em
-- `net.http_request_queue` (o worker do `pg_net` só vê o que foi COMMITADO).
-- NOTIFICACOES_MODO = 'producao', mas nada daqui é commitado — nenhum e-mail sai a
-- candidato real (D-54). Os valores medidos ficam em variáveis PL/pgSQL (não revertidas) e
-- o julgamento é feito FORA da subtransação. O contador é incrementado fora dela.
--
-- AS CONTAGENS GLOBAIS DE (z) NÃO SÃO FOTOGRAFIA (D-17): baseline capturada NA PRÓPRIA
-- execução. A asserção que decide é a de resíduo ESCOPADA às fixtures; a global é o cinto —
-- divergência com resíduo zero é tráfego concorrente commitado durante a requisição, e a
-- mensagem diz isso.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p49_snapshot_smoke.sql` — UMA
-- requisição, UMA sessão. O `SELECT` final devolve `{smoke, pass, esperado, ...}`; qualquer
-- FAIL é `RAISE EXCEPTION` e o `p46apply` sai com código ≠ 0.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de asserções DESTE arquivo
-- (escopo deliberado), não uma fotografia do banco. Hoje: 11 — y, a, a2, b, c, d, e, f,
-- f2, g, z.
-- ⚠ BUMP registrado: nasceu 7 (y, a, a2, b, c, d, z) na Task 1 do plano 49-07, com a
-- migration `…000006`; subiu a 11 na Task 2 (e, f, f2, g).
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('app.transicao_sancionada', '', false);
SELECT set_config('smoke49s.pass', '0', false);
SELECT set_config('smoke49s.fixtures', '', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — ator vivo (leitura) e contagens para a negativa.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_a    uuid;
  v_b    uuid;
  v_vaga uuid;
BEGIN
  -- A decide: administrador ATIVO (registrar_decisao exige dona da vaga para 'rh';
  -- administrador não). Lido na execução — conta fixa envelhece.
  SELECT u.user_id INTO v_a
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_a IS NULL THEN
    RAISE EXCEPTION 'P49S FAIL (baseline): nenhum administrador ATIVO para assinar a decisão da fixture';
  END IF;
  -- B revisa: qualquer RH/admin ativo distinto de A (revisor ≠ decisor, REVISAO-05 —
  -- `responder_revisao_decisao` recusa com 42501 se v_uid = por_usuario).
  SELECT u.user_id INTO v_b
    FROM public.usuarios_rh u
   WHERE u.role IN ('administrador', 'recrutador') AND u.ativo AND u.deleted_at IS NULL
     AND u.user_id IS NOT NULL AND u.user_id <> v_a
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_b IS NULL THEN
    RAISE EXCEPTION 'P49S FAIL (baseline): falta um 2o RH/admin ATIVO distinto de A (%) — sem revisor ≠ decisor o ciclo de revisão de (f)/(f2) não roda', v_a;
  END IF;

  SELECT v.id INTO v_vaga FROM public.vagas v ORDER BY v.created_at LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P49S FAIL (baseline): nenhuma vaga viva para a fixture';
  END IF;

  PERFORM set_config('smoke49s.a',    v_a::text, false);
  PERFORM set_config('smoke49s.b',    v_b::text, false);
  -- vocabulário do JWT (o hook mapeia recrutador → rh), nunca o da coluna
  PERFORM set_config('smoke49s.b_role',
    (SELECT CASE WHEN u.role = 'administrador' THEN 'administrador' ELSE 'rh' END
       FROM public.usuarios_rh u WHERE u.user_id = v_b), false);
  PERFORM set_config('smoke49s.vaga', v_vaga::text, false);

  PERFORM set_config('smoke49s.n_cand',  (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke49s.n_hist',  (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke49s.n_df',    (SELECT count(*) FROM public.decisao_final)::text, false);
  PERFORM set_config('smoke49s.n_dfh',   (SELECT count(*) FROM public.decisao_final_historico)::text, false);
  PERFORM set_config('smoke49s.n_notif', (SELECT count(*) FROM public.notificacoes_enviadas)::text, false);
  PERFORM set_config('smoke49s.n_netq',  (SELECT count(*) FROM net.http_request_queue)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (y) CATÁLOGO — nenhum trigger BEFORE UPDATE em `decisao_final`.
--   Só leitura; não precisa de fixture. É a premissa da lista de exclusão do D-44.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $y$
DECLARE
  v_n     int;
  v_nomes text;
BEGIN
  SELECT count(*), coalesce(string_agg(t.tgname, ', ' ORDER BY t.tgname), '<nenhum>')
    INTO v_n, v_nomes
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.decisao_final'::regclass
     AND NOT t.tgisinternal
     AND (t.tgtype & 2) = 2      -- BEFORE
     AND (t.tgtype & 16) = 16;   -- UPDATE
  IF v_n IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P49S FAIL (y): decisao_final ganhou % trigger(s) BEFORE UPDATE (%) — medido 0 em 2026-09-22. Se um deles carimba uma coluna de tempo em TODO UPDATE, a exclusão de duas colunas do D-44 deixa de bastar e um UPDATE sem mudança volta a arquivar. A decisão é do operador (D-14): NÃO acrescentar a coluna à exclusão por conta própria',
      v_n, v_nomes;
  END IF;
  PERFORM set_config('smoke49s.pass', (current_setting('smoke49s.pass')::int + 1)::text, false);
END
$y$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1 — (a) (a2) (b) (c) (d), numa subtransação que reverte (`P49S1`).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p1$
DECLARE
  v_a        uuid := current_setting('smoke49s.a')::uuid;
  v_vaga     uuid := current_setting('smoke49s.vaga')::uuid;
  v_claims_a text;
  v_ids      text := '';
  v_ran      boolean := false;
  v_err      text;
  v_user     uuid;
  v_email    text;
  v_cand     uuid;
  v_f1       uuid;
  v_u1       uuid;
  v_i        int;
  v_ret      public.decisao_final;
  c_distinto constant timestamptz := timestamptz '2020-03-04 05:06:07-03';
  c_tomb     constant text := '[justificativa preservada de forma desidentificada — smoke P49S (d), a FORMA do tombstone]';
  -- (a) (a2)
  a_h0        bigint;  a_hfim bigint;
  a_carimbo1  timestamptz;  a_carimbo_fim timestamptz;
  a_ctid0     tid;  a_ctid1 tid;
  a2_cand     uuid;
  -- (b)
  b_h0 bigint;  b_hfim bigint;  b_ctid0 tid;  b_ctid1 tid;
  -- (c)
  c_h0 bigint;  c_hfim bigint;  c_ctid0 tid;  c_ctid1 tid;
  -- (d)
  d_h0 bigint;  d_hfim bigint;  d_just_antes text;  d_arq_just text;  d_viva text;
BEGIN
  v_claims_a := json_build_object('sub', v_a::text, 'app_metadata', json_build_object('role', 'administrador'))::text;

  BEGIN
    -- ── fixture F1 · titular sintético + candidatura em decisao_final/em_analise ──
    v_user  := gen_random_uuid();
    v_email := 'p49ssmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P49S Titular F1', v_email, '(11) 95555-5701',
       DATE '1990-01-15', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;
    v_u1 := v_user;
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga, 'decisao_final', 'rejeitado', false, now() - interval '20 days')
    RETURNING id INTO v_f1;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_f1;
    v_ids := v_ids || v_f1::text || ',';

    -- A decide: é o INSERT da linha de `decisao_final` (ON CONFLICT não é alcançado), e
    -- INSERT não passa pelo trigger, que é AFTER UPDATE. Nasce sem carimbo de leitura.
    PERFORM set_config('request.jwt.claims', v_claims_a, false);
    PERFORM public.registrar_decisao(v_f1, 'rejeitado',
      'Decisao final sintetica do smoke P49S (F1), rejeitado pelo administrador A, mais de 50 caracteres.');
    PERFORM set_config('request.jwt.claims', '', false);

    -- ── (a) e (a2) · CINCO leituras da explicação ────────────────────────────────
    SELECT count(*) INTO a_h0 FROM public.decisao_final_historico WHERE candidatura_id = v_f1;
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_u1::text, 'app_metadata', json_build_object('role', 'candidato'))::text, false);
    -- 1ª chamada: carimba.
    v_ret := public.stamp_explicacao_acessada(v_f1);
    a_carimbo1 := v_ret.explicacao_solicitada_em;

    -- O carimbo vai a um instante DISTINTIVO. Dentro de uma transação `now()` é constante,
    -- então sem isto «o valor da 1ª chamada» e «o valor da 5ª» seriam iguais por acidente
    -- e a asserção de preservação não afirmaria nada. Este UPDATE toca SÓ uma coluna
    -- excluída — ele próprio não pode arquivar.
    PERFORM set_config('request.jwt.claims', '', false);
    UPDATE public.decisao_final SET explicacao_solicitada_em = c_distinto WHERE candidatura_id = v_f1;
    SELECT d.ctid INTO a_ctid0 FROM public.decisao_final d WHERE d.candidatura_id = v_f1;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_u1::text, 'app_metadata', json_build_object('role', 'candidato'))::text, false);
    FOR v_i IN 2..5 LOOP
      v_ret := public.stamp_explicacao_acessada(v_f1);
      IF v_i = 2 THEN
        a2_cand := v_ret.candidatura_id;   -- (a2) a 2ª chamada devolve A LINHA
      END IF;
    END LOOP;
    PERFORM set_config('request.jwt.claims', '', false);

    SELECT d.ctid, d.explicacao_solicitada_em INTO a_ctid1, a_carimbo_fim
      FROM public.decisao_final d WHERE d.candidatura_id = v_f1;
    SELECT count(*) INTO a_hfim FROM public.decisao_final_historico WHERE candidatura_id = v_f1;

    -- ── (b) · no-op puro ────────────────────────────────────────────────────────
    SELECT count(*) INTO b_h0 FROM public.decisao_final_historico WHERE candidatura_id = v_f1;
    SELECT d.ctid INTO b_ctid0 FROM public.decisao_final d WHERE d.candidatura_id = v_f1;
    UPDATE public.decisao_final SET justificativa = justificativa WHERE candidatura_id = v_f1;
    SELECT d.ctid INTO b_ctid1 FROM public.decisao_final d WHERE d.candidatura_id = v_f1;
    SELECT count(*) INTO b_hfim FROM public.decisao_final_historico WHERE candidatura_id = v_f1;

    -- ── (c) · só as duas colunas EXCLUÍDAS ──────────────────────────────────────
    SELECT count(*) INTO c_h0 FROM public.decisao_final_historico WHERE candidatura_id = v_f1;
    SELECT d.ctid INTO c_ctid0 FROM public.decisao_final d WHERE d.candidatura_id = v_f1;
    UPDATE public.decisao_final
       SET alerta_prazo_enviado_em = now(),
           explicacao_solicitada_em = c_distinto + interval '1 day'
     WHERE candidatura_id = v_f1;
    SELECT d.ctid INTO c_ctid1 FROM public.decisao_final d WHERE d.candidatura_id = v_f1;
    SELECT count(*) INTO c_hfim FROM public.decisao_final_historico WHERE candidatura_id = v_f1;

    -- ── (d) · mudança REAL de justificativa (a forma do tombstone) ──────────────
    SELECT count(*) INTO d_h0 FROM public.decisao_final_historico WHERE candidatura_id = v_f1;
    SELECT d.justificativa INTO d_just_antes FROM public.decisao_final d WHERE d.candidatura_id = v_f1;
    UPDATE public.decisao_final SET justificativa = c_tomb WHERE candidatura_id = v_f1;
    SELECT count(*) INTO d_hfim FROM public.decisao_final_historico WHERE candidatura_id = v_f1;
    SELECT h.justificativa INTO d_arq_just
      FROM public.decisao_final_historico h
     WHERE h.candidatura_id = v_f1
     ORDER BY h.arquivado_em DESC, h.id DESC LIMIT 1;
    SELECT d.justificativa INTO d_viva FROM public.decisao_final d WHERE d.candidatura_id = v_f1;

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P49S1';
  EXCEPTION
    WHEN SQLSTATE 'P49S1' THEN NULL;  -- ROLLBACK: fixtures, decisão, arquivo e fila somem
    WHEN OTHERS THEN
      v_err := SQLSTATE || ': ' || SQLERRM;
  END;
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('smoke49s.fixtures', current_setting('smoke49s.fixtures') || v_ids, false);

  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P49S FAIL (parte 1): a fixture/o ciclo não rodou até o fim — %', coalesce(v_err, 'sem erro, mas sem marca de execução');
  END IF;

  -- ── (a) julgamento ──────────────────────────────────────────────────────────
  IF a_carimbo1 IS NULL THEN
    RAISE EXCEPTION 'P49S FAIL (a): a 1ª chamada de stamp_explicacao_acessada NÃO carimbou explicacao_solicitada_em (veio nula). O conserto de idempotência não pode virar «nunca carimba» — o carimbo é o que a tela do titular mostra como «explicação acessada em»';
  END IF;
  IF a_hfim - a_h0 IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P49S FAIL (a): 5 leituras da explicação criaram % linha(s) em decisao_final_historico (esperado 0). O titular veria a própria LEITURA registrada como uma alteração da decisão dele — é o defeito medido do JORN-3b (1 dos 11 snapshots de PROD é exatamente isto)', a_hfim - a_h0;
  END IF;
  IF a_ctid1 IS DISTINCT FROM a_ctid0 THEN
    RAISE EXCEPTION 'P49S FAIL (a): as chamadas 2..5 ESCREVERAM na linha (ctid % -> %). O arquivo pode ter ficado quieto só porque a coluna está fora do WHEN — a RPC continua fazendo um UPDATE por leitura, e qualquer coluna que entre no WHEN depois traz o defeito de volta. Falta o filtro `AND explicacao_solicitada_em IS NULL`',
      a_ctid0, a_ctid1;
  END IF;
  IF a_carimbo_fim IS DISTINCT FROM c_distinto THEN
    RAISE EXCEPTION 'P49S FAIL (a): o carimbo mudou de % para % nas chamadas 2..5 (esperado o PRIMEIRO valor, preservado)', c_distinto, a_carimbo_fim;
  END IF;
  PERFORM set_config('smoke49s.pass', (current_setting('smoke49s.pass')::int + 1)::text, false);

  -- ── (a2) julgamento ─────────────────────────────────────────────────────────
  IF a2_cand IS DISTINCT FROM v_f1 THEN
    RAISE EXCEPTION 'P49S FAIL (a2): a 2ª chamada de stamp_explicacao_acessada devolveu % (esperado a linha da candidatura %). Com o filtro `IS NULL` o `RETURNING * INTO` sai VAZIO na 2ª chamada — sem o re-SELECT da linha a RPC devolve NULL e o front perde a explicação na recarga (Correção 30)',
      coalesce(a2_cand::text, '<NULL>'), v_f1;
  END IF;
  PERFORM set_config('smoke49s.pass', (current_setting('smoke49s.pass')::int + 1)::text, false);

  -- ── (b) julgamento ──────────────────────────────────────────────────────────
  IF b_ctid1 IS NOT DISTINCT FROM b_ctid0 THEN
    RAISE EXCEPTION 'P49S FAIL (b): o UPDATE no-op não gerou versão nova de linha (ctid % igual) — a asserção seria VÁCUA: ela provaria que o Postgres não escreveu, não que o trigger não disparou', b_ctid0;
  END IF;
  IF b_hfim - b_h0 IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P49S FAIL (b): um UPDATE que não muda nada criou % linha(s) no arquivo (esperado 0) — o trigger está sem WHEN, que é o defeito medido: 5 dos 11 snapshots de PROD são idênticos ao anterior em TODAS as colunas', b_hfim - b_h0;
  END IF;
  PERFORM set_config('smoke49s.pass', (current_setting('smoke49s.pass')::int + 1)::text, false);

  -- ── (c) julgamento ──────────────────────────────────────────────────────────
  IF c_ctid1 IS NOT DISTINCT FROM c_ctid0 THEN
    RAISE EXCEPTION 'P49S FAIL (c): o UPDATE das duas colunas excluídas não gerou versão nova de linha (ctid % igual) — asserção vácua', c_ctid0;
  END IF;
  IF c_hfim - c_h0 IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P49S FAIL (c): mexer só em alerta_prazo_enviado_em + explicacao_solicitada_em criou % linha(s) no arquivo (esperado 0) — as DUAS colunas do D-44 têm de estar fora do WHEN, e a telemetria do cron de prazo versionaria a decisão de todo mundo toda noite', c_hfim - c_h0;
  END IF;
  PERFORM set_config('smoke49s.pass', (current_setting('smoke49s.pass')::int + 1)::text, false);

  -- ── (d) julgamento ──────────────────────────────────────────────────────────
  IF d_hfim - d_h0 IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P49S FAIL (d): mudar `justificativa` criou % linha(s) no arquivo (esperado EXATAMENTE 1). Zero = o WHEN exclui uma coluna de mudança real (Pitfall 5) e o tombstone do motor de exclusão deixa de arquivar a justificativa viva ANTES de raspar o arquivo — a ordem é o mecanismo. Mais de 1 = dois triggers apontando para snapshot_decisao_final', d_hfim - d_h0;
  END IF;
  IF d_arq_just IS DISTINCT FROM d_just_antes THEN
    RAISE EXCEPTION 'P49S FAIL (d): a linha arquivada guardou «%» (esperado o valor ANTIGO, «%»). O snapshot lê OLD — se ele passar a ler NEW, o arquivo deixa de ter a versão anterior e o histórico do titular vira uma lista de cópias da linha atual',
      left(coalesce(d_arq_just, '<NULL>'), 60), left(coalesce(d_just_antes, '<NULL>'), 60);
  END IF;
  IF d_viva IS DISTINCT FROM c_tomb THEN
    RAISE EXCEPTION 'P49S FAIL (d): a linha VIVA ficou com «%» (esperado o texto novo) — o arquivamento não pode reverter a escrita', left(coalesce(d_viva, '<NULL>'), 60);
  END IF;
  PERFORM set_config('smoke49s.pass', (current_setting('smoke49s.pass')::int + 1)::text, false);
END
$p1$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 2 — o que tem de CONTINUAR arquivando: (e) (f) (f2).
--   Numa subtransação que reverte (`P49S1`). É a metade que mantém o conserto
--   honesto: suprimir o snapshot de uma mudança REAL é repúdio (T-49-07-01), e
--   nenhuma asserção da Parte 1 o perceberia.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p2$
DECLARE
  v_a        uuid := current_setting('smoke49s.a')::uuid;
  v_b        uuid := current_setting('smoke49s.b')::uuid;
  v_b_role   text := current_setting('smoke49s.b_role');
  v_vaga     uuid := current_setting('smoke49s.vaga')::uuid;
  v_claims_a text;
  v_claims_b text;
  v_ids      text := '';
  v_ran      boolean := false;
  v_err      text;
  v_user     uuid;
  v_email    text;
  v_cand     uuid;
  v_i        int;
  v_f2 uuid;  v_f3 uuid;  v_u3 uuid;  v_f4 uuid;  v_u4 uuid;
  c_j_rej constant text := 'Decisao final sintetica do smoke P49S (F2) — a PRIMEIRA, rejeitado, mais de 50 caracteres.';
  c_j_apr constant text := 'Decisao final sintetica do smoke P49S (F2) — a SEGUNDA, aprovado, mais de 50 caracteres.';
  -- (e)
  e_h0 bigint;  e_hfim bigint;  e_arq_dec text;  e_arq_just text;  e_viva_dec text;
  -- (f)
  f_h0 bigint;  f_h1 bigint;  f_h2 bigint;
  f_arq_sol timestamptz;  f_arq_ver text;  f_viva_ver text;
  -- (f2)
  f2_h0 bigint;  f2_hfim bigint;  f2_reab timestamptz;  f2_etapa text;  f2_status text;
  f2_arq_reab timestamptz;
BEGIN
  v_claims_a := json_build_object('sub', v_a::text, 'app_metadata', json_build_object('role', 'administrador'))::text;
  v_claims_b := json_build_object('sub', v_b::text, 'app_metadata', json_build_object('role', v_b_role))::text;

  BEGIN
    -- ── fixtures F2, F3, F4 — três titulares sintéticos, num laço ──────────────
    FOR v_i IN 2..4 LOOP
      v_user  := gen_random_uuid();
      v_email := 'p49ssmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                              created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
      VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              v_email, '', now(), now(),
              '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
      INSERT INTO public.candidatos
        (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
      VALUES
        (v_user, 'SMOKE P49S Titular F' || v_i, v_email,
         '(11) 95555-57' || lpad(v_i::text, 2, '0'),
         DATE '1990-01-15', 'Santos', 'SP', 'site')
      RETURNING id INTO v_cand;
      INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
      VALUES (v_cand, v_vaga, 'decisao_final', 'rejeitado', false, now() - interval '20 days')
      RETURNING id INTO v_cand;
      UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_cand;
      v_ids := v_ids || v_cand::text || ',';
      IF v_i = 2 THEN v_f2 := v_cand;
      ELSIF v_i = 3 THEN v_f3 := v_cand; v_u3 := v_user;
      ELSE v_f4 := v_cand; v_u4 := v_user;
      END IF;
    END LOOP;

    -- ── (e) · REDECISÃO — o upsert de `registrar_decisao` sobre linha existente ──
    -- A 1ª chamada INSERE (ON CONFLICT não é alcançado) e não arquiva nada. A 2ª cai
    -- no DO UPDATE e tem de arquivar a decisão ANTERIOR: é o histórico de emendas que
    -- o titular recebe.
    PERFORM set_config('request.jwt.claims', v_claims_a, false);
    PERFORM public.registrar_decisao(v_f2, 'rejeitado', c_j_rej);
    SELECT count(*) INTO e_h0 FROM public.decisao_final_historico WHERE candidatura_id = v_f2;
    PERFORM public.registrar_decisao(v_f2, 'aprovado', c_j_apr);
    SELECT count(*) INTO e_hfim FROM public.decisao_final_historico WHERE candidatura_id = v_f2;
    SELECT h.decisao::text, h.justificativa INTO e_arq_dec, e_arq_just
      FROM public.decisao_final_historico h
     WHERE h.candidatura_id = v_f2
     ORDER BY h.arquivado_em DESC, h.id DESC LIMIT 1;
    SELECT d.decisao::text INTO e_viva_dec FROM public.decisao_final d WHERE d.candidatura_id = v_f2;

    -- ── (f) · O CICLO DE REVISÃO (Art. 20) — pedido e resposta `mantida` ────────
    PERFORM public.registrar_decisao(v_f3, 'rejeitado',
      'Decisao final sintetica do smoke P49S (F3), rejeitado pelo administrador A, mais de 50 caracteres.');
    SELECT count(*) INTO f_h0 FROM public.decisao_final_historico WHERE candidatura_id = v_f3;
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_u3::text, 'app_metadata', json_build_object('role', 'candidato'))::text, false);
    PERFORM public.solicitar_revisao_decisao(v_f3);
    SELECT count(*) INTO f_h1 FROM public.decisao_final_historico WHERE candidatura_id = v_f3;
    SELECT h.revisao_solicitada_em INTO f_arq_sol
      FROM public.decisao_final_historico h
     WHERE h.candidatura_id = v_f3
     ORDER BY h.arquivado_em DESC, h.id DESC LIMIT 1;
    PERFORM set_config('request.jwt.claims', v_claims_b, false);
    PERFORM public.responder_revisao_decisao(v_f3, 'mantida',
      'Revisao sintetica do smoke P49S (f) pelo revisor B: a rejeicao se sustenta, veredito mantido.');
    SELECT count(*) INTO f_h2 FROM public.decisao_final_historico WHERE candidatura_id = v_f3;
    SELECT h.revisao_veredito INTO f_arq_ver
      FROM public.decisao_final_historico h
     WHERE h.candidatura_id = v_f3
     ORDER BY h.arquivado_em DESC, h.id DESC LIMIT 1;
    SELECT d.revisao_veredito INTO f_viva_ver FROM public.decisao_final d WHERE d.candidatura_id = v_f3;

    -- ── (f2) · A REABERTURA (`revertida`) — a transição mais cara de perder ─────
    PERFORM set_config('request.jwt.claims', v_claims_a, false);
    PERFORM public.registrar_decisao(v_f4, 'rejeitado',
      'Decisao final sintetica do smoke P49S (F4), rejeitado pelo administrador A, mais de 50 caracteres.');
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_u4::text, 'app_metadata', json_build_object('role', 'candidato'))::text, false);
    PERFORM public.solicitar_revisao_decisao(v_f4);
    SELECT count(*) INTO f2_h0 FROM public.decisao_final_historico WHERE candidatura_id = v_f4;
    PERFORM set_config('request.jwt.claims', v_claims_b, false);
    PERFORM public.responder_revisao_decisao(v_f4, 'revertida',
      'Revisao sintetica do smoke P49S (f2) pelo revisor B: a rejeicao nao se sustenta, reabrir o caso.');
    SELECT count(*) INTO f2_hfim FROM public.decisao_final_historico WHERE candidatura_id = v_f4;
    SELECT d.reaberta_em INTO f2_reab FROM public.decisao_final d WHERE d.candidatura_id = v_f4;
    SELECT h.reaberta_em INTO f2_arq_reab
      FROM public.decisao_final_historico h
     WHERE h.candidatura_id = v_f4
     ORDER BY h.arquivado_em DESC, h.id DESC LIMIT 1;
    SELECT c.etapa_atual::text, c.status::text INTO f2_etapa, f2_status
      FROM public.candidaturas c WHERE c.id = v_f4;
    PERFORM set_config('request.jwt.claims', '', false);

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P49S1';
  EXCEPTION
    WHEN SQLSTATE 'P49S1' THEN NULL;
    WHEN OTHERS THEN
      v_err := SQLSTATE || ': ' || SQLERRM;
  END;
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('smoke49s.fixtures', current_setting('smoke49s.fixtures') || v_ids, false);

  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P49S FAIL (parte 2): a fixture/o ciclo não rodou até o fim — %', coalesce(v_err, 'sem erro, mas sem marca de execução');
  END IF;

  -- ── (e) julgamento ──────────────────────────────────────────────────────────
  IF e_hfim - e_h0 IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P49S FAIL (e): a REDECISÃO (registrar_decisao sobre linha existente) criou % linha(s) no arquivo (esperado EXATAMENTE 1). Zero = o WHEN suprimiu o histórico de emendas da decisão, que é o que o titular recebe — repúdio (T-49-07-01)', e_hfim - e_h0;
  END IF;
  IF e_arq_dec IS DISTINCT FROM 'rejeitado' OR e_arq_just IS DISTINCT FROM c_j_rej THEN
    RAISE EXCEPTION 'P49S FAIL (e): a linha arquivada guardou decisao=% justificativa=«%» (esperado a decisão ANTERIOR, rejeitado, com a 1ª justificativa)',
      coalesce(e_arq_dec, '<NULL>'), left(coalesce(e_arq_just, '<NULL>'), 60);
  END IF;
  IF e_viva_dec IS DISTINCT FROM 'aprovado' THEN
    RAISE EXCEPTION 'P49S FAIL (e): a linha VIVA ficou com decisao=% (esperado aprovado)', coalesce(e_viva_dec, '<NULL>');
  END IF;
  PERFORM set_config('smoke49s.pass', (current_setting('smoke49s.pass')::int + 1)::text, false);

  -- ── (f) julgamento ──────────────────────────────────────────────────────────
  IF f_h1 - f_h0 IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P49S FAIL (f): o PEDIDO de revisão do titular criou % linha(s) no arquivo (esperado 1). `revisao_solicitada_em` NÃO está entre as duas colunas excluídas do D-44 — pedir revisão é um evento do ciclo, e o titular tem direito ao registro dele (Art. 20)', f_h1 - f_h0;
  END IF;
  IF f_arq_sol IS NOT NULL THEN
    RAISE EXCEPTION 'P49S FAIL (f): a linha arquivada no pedido já traz revisao_solicitada_em = % (esperado NULL — o snapshot lê OLD, o estado ANTES do pedido)', f_arq_sol;
  END IF;
  IF f_h2 - f_h1 IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P49S FAIL (f): a RESPOSTA da revisão (mantida) criou % linha(s) no arquivo (esperado 1)', f_h2 - f_h1;
  END IF;
  IF f_arq_ver IS NOT NULL OR f_viva_ver IS DISTINCT FROM 'mantida' THEN
    RAISE EXCEPTION 'P49S FAIL (f): arquivo com revisao_veredito=% e linha viva com % (esperado NULL no arquivo — o estado ANTES — e «mantida» na viva)',
      coalesce(f_arq_ver, '<NULL>'), coalesce(f_viva_ver, '<NULL>');
  END IF;
  PERFORM set_config('smoke49s.pass', (current_setting('smoke49s.pass')::int + 1)::text, false);

  -- ── (f2) julgamento ─────────────────────────────────────────────────────────
  IF f2_hfim - f2_h0 IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P49S FAIL (f2): a REABERTURA (revertida) criou % linha(s) no arquivo (esperado 1). É a transição mais cara de perder: o veredito, a reabertura e o prazo entram no MESMO UPDATE, então um snapshot suprimido apaga os três de uma vez', f2_hfim - f2_h0;
  END IF;
  IF f2_reab IS NULL THEN
    RAISE EXCEPTION 'P49S FAIL (f2): a linha viva ficou sem reaberta_em — a reabertura não aconteceu e a asserção acima mediu outra coisa';
  END IF;
  IF f2_arq_reab IS NOT NULL THEN
    RAISE EXCEPTION 'P49S FAIL (f2): a linha arquivada já traz reaberta_em = % (esperado NULL — o snapshot lê OLD)', f2_arq_reab;
  END IF;
  IF f2_etapa IS DISTINCT FROM 'decisao_final' OR f2_status IS DISTINCT FROM 'em_analise' THEN
    RAISE EXCEPTION 'P49S FAIL (f2): a reabertura deixou a candidatura %/% (esperado decisao_final/em_analise — reabrir, NUNCA aprovar, D-01/RNF-07a)', f2_etapa, f2_status;
  END IF;
  PERFORM set_config('smoke49s.pass', (current_setting('smoke49s.pass')::int + 1)::text, false);
END
$p2$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (g) PARIDADE DE COLUNAS — lida na EXECUÇÃO, de três fontes independentes.
--   Só leitura. É a asserção que não envelhece: nenhuma lista literal de colunas
--   vive neste arquivo. Uma coluna nova em `decisao_final` que não entre no arquivo
--   passa a REPROVAR aqui em vez de sumir em silêncio — o modo de falha que o
--   CLAUDE.md §«Portões» nomeia (a lista literal que não vigia nada).
--     A = colunas(decisao_final) − {id, em} ∪ {decidido_em}
--     B = colunas(decisao_final_historico) − {id, arquivado_em}
--     C = a lista do INSERT no corpo VIVO de snapshot_decisao_final()
--   `em → decidido_em` é o único renome do mapeamento (o trigger grava `OLD.em` em
--   `decidido_em`); `arquivado_em` é do arquivo e não tem par na linha viva.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $g$
DECLARE
  g_a     text[];
  g_b     text[];
  g_c     text[];
  v_src   text;
  v_lista text;
  v_d1    text[];  v_d2 text[];  v_d3 text[];  v_d4 text[];
BEGIN
  SELECT array_agg(c ORDER BY c) INTO g_a FROM (
    SELECT column_name::text AS c FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'decisao_final'
       AND column_name NOT IN ('id', 'em')
    UNION SELECT 'decidido_em'
  ) s;

  SELECT array_agg(column_name::text ORDER BY column_name::text) INTO g_b
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'decisao_final_historico'
     AND column_name NOT IN ('id', 'arquivado_em');

  SELECT p.prosrc INTO v_src
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.snapshot_decisao_final()'::regprocedure;
  v_lista := substring(v_src from 'decisao_final_historico[[:space:]]*\(([^)]*)\)');
  IF v_lista IS NULL THEN
    RAISE EXCEPTION 'P49S FAIL (g): não foi possível extrair a lista de colunas do INSERT no corpo VIVO de snapshot_decisao_final. O corpo mudou de forma — reler antes de confiar em qualquer paridade';
  END IF;
  SELECT array_agg(btrim(x, E' \n\r\t') ORDER BY btrim(x, E' \n\r\t')) INTO g_c
    FROM regexp_split_to_table(v_lista, ',') AS x;

  IF g_a IS DISTINCT FROM g_b THEN
    SELECT array_agg(x ORDER BY x) INTO v_d1 FROM (SELECT unnest(g_a) EXCEPT SELECT unnest(g_b)) q(x);
    SELECT array_agg(x ORDER BY x) INTO v_d2 FROM (SELECT unnest(g_b) EXCEPT SELECT unnest(g_a)) q(x);
    RAISE EXCEPTION 'P49S FAIL (g): decisao_final e decisao_final_historico DIVERGEM de colunas. Em decisao_final e NÃO no arquivo: %. No arquivo e NÃO em decisao_final: %. A primeira lista é o que o titular deixa de receber no histórico da decisão dele — coluna nova sem par no arquivo',
      coalesce(v_d1::text, '{}'), coalesce(v_d2::text, '{}');
  END IF;

  IF g_a IS DISTINCT FROM g_c THEN
    SELECT array_agg(x ORDER BY x) INTO v_d3 FROM (SELECT unnest(g_a) EXCEPT SELECT unnest(g_c)) q(x);
    SELECT array_agg(x ORDER BY x) INTO v_d4 FROM (SELECT unnest(g_c) EXCEPT SELECT unnest(g_a)) q(x);
    RAISE EXCEPTION 'P49S FAIL (g): o INSERT de snapshot_decisao_final não grava todas as colunas. Falta no INSERT: %. No INSERT e sem origem em decisao_final: %. A tabela pode até ter a coluna — se o trigger não a copia, o arquivo guarda NULL e ninguém erra',
      coalesce(v_d3::text, '{}'), coalesce(v_d4::text, '{}');
  END IF;

  PERFORM set_config('smoke49s.pass', (current_setting('smoke49s.pass')::int + 1)::text, false);
  PERFORM set_config('smoke49s.n_paridade', cardinality(g_a)::text, false);
END
$g$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) NEGATIVA — nada das fixtures sobreviveu; contagens globais iguais às de antes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE
  v_ids   uuid[] := coalesce(string_to_array(rtrim(current_setting('smoke49s.fixtures'), ','), ',')::uuid[], '{}');
  l_cand  int;  l_hist int;  l_df int;  l_dfh int;  l_fila int;  l_tit int;
  g_cand  bigint;  g_hist bigint;  g_df bigint;  g_dfh bigint;  g_notif bigint;  g_netq bigint;
BEGIN
  IF cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'P49S FAIL (z): nenhuma fixture registrada — a negativa não teria o que conferir';
  END IF;
  SELECT count(*) INTO l_cand FROM public.candidaturas c WHERE c.id = ANY (v_ids);
  SELECT count(*) INTO l_hist FROM public.historico_candidatura h WHERE h.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_df   FROM public.decisao_final d WHERE d.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_dfh  FROM public.decisao_final_historico h WHERE h.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_fila FROM net.http_request_queue q
   WHERE convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = ANY (v_ids::text[]);
  SELECT count(*) INTO l_tit  FROM public.candidatos c WHERE c.email LIKE 'p49ssmoke-%@invalido.local';
  IF l_cand <> 0 OR l_hist <> 0 OR l_df <> 0 OR l_dfh <> 0 OR l_fila <> 0 OR l_tit <> 0 THEN
    RAISE EXCEPTION 'P49S FAIL (z): RESÍDUO das fixtures — candidaturas=% historico=% decisao_final=% arquivo=% fila=% titulares=% (a subtransação não reverteu; um despacho COMMITADO sai como e-mail a candidato)',
      l_cand, l_hist, l_df, l_dfh, l_fila, l_tit;
  END IF;

  SELECT count(*) INTO g_cand  FROM public.candidaturas;
  SELECT count(*) INTO g_hist  FROM public.historico_candidatura;
  SELECT count(*) INTO g_df    FROM public.decisao_final;
  SELECT count(*) INTO g_dfh   FROM public.decisao_final_historico;
  SELECT count(*) INTO g_notif FROM public.notificacoes_enviadas;
  SELECT count(*) INTO g_netq  FROM net.http_request_queue;
  IF g_cand  IS DISTINCT FROM current_setting('smoke49s.n_cand')::bigint
     OR g_hist  IS DISTINCT FROM current_setting('smoke49s.n_hist')::bigint
     OR g_df    IS DISTINCT FROM current_setting('smoke49s.n_df')::bigint
     OR g_dfh   IS DISTINCT FROM current_setting('smoke49s.n_dfh')::bigint
     OR g_notif IS DISTINCT FROM current_setting('smoke49s.n_notif')::bigint
     OR g_netq  IS DISTINCT FROM current_setting('smoke49s.n_netq')::bigint THEN
    RAISE EXCEPTION 'P49S FAIL (z): contagem global mudou (candidaturas % -> %, historico % -> %, decisao_final % -> %, arquivo % -> %, notificacoes % -> %, fila % -> %) com resíduo ZERO das fixtures — o delta é de tráfego concorrente commitado durante a requisição; rodar de novo',
      current_setting('smoke49s.n_cand'), g_cand, current_setting('smoke49s.n_hist'), g_hist,
      current_setting('smoke49s.n_df'), g_df, current_setting('smoke49s.n_dfh'), g_dfh,
      current_setting('smoke49s.n_notif'), g_notif, current_setting('smoke49s.n_netq'), g_netq;
  END IF;
  PERFORM set_config('smoke49s.pass', (current_setting('smoke49s.pass')::int + 1)::text, false);
END
$z$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke49s.pass')::int <> 11 THEN
    RAISE EXCEPTION 'P49S FAIL (gate): pass = % de 11 — alguma asserção não incrementou o contador', current_setting('smoke49s.pass');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',    'p49_snapshot',
  'pass',     current_setting('smoke49s.pass')::int,
  'esperado', 11,
  'paridade', current_setting('smoke49s.n_paridade')::int,
  'n_cand',   current_setting('smoke49s.n_cand')::int,
  'n_hist',   current_setting('smoke49s.n_hist')::int,
  'n_df',     current_setting('smoke49s.n_df')::int,
  'n_dfh',    current_setting('smoke49s.n_dfh')::int,
  'n_notif',  current_setting('smoke49s.n_notif')::int,
  'n_netq',   current_setting('smoke49s.n_netq')::int
) AS resultado;
