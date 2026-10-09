-- =============================================================================
-- Phase 51 / Plano 51-06 — smoke da CHAVE `raven` em `public.get_avaliacao_status(uuid)`
--                          (JORN-43, D-38, correção C-4 do 51-RESEARCH)
-- =============================================================================
-- O QUE ELE VIGIA (migration 20261008000001).
--   · O candidato NÃO lê o próprio `scores_raven` (C-4: a policy compara `candidato_id` com
--     `auth.uid()`, e 37 de 37 linhas diferem). A fonte legível de «liberado» e «concluído» do
--     Raven passa a ser a chave `raven` de `get_avaliacao_status`, que já é SECURITY DEFINER com
--     guarda de titular (`candidatos.user_id = auth.uid()`, 42501 `forbidden`) e devolve só
--     booleanos (FUNIL-12). A RLS do Raven NÃO muda (D-38).
--   · `raven` = {liberado, registrado}, EXATAMENTE essas duas chaves, as duas booleanas:
--       liberado   = existe linha em `cognitivo_liberacao` da candidatura com `revogado_em IS NULL`;
--       registrado = existe linha em `scores_raven` da candidatura.
--     Nenhum número do Raven (percentil, classificação, acertos) chega ao navegador (RNF-07a).
--   · A ACL da função = a medida em PROD em 2026-10-09 MENOS o EXECUTE de `anon` — o APERTO
--     NOMEADO (ASSUMPTION A4 do 51-RESEARCH): `anon` tinha EXECUTE por herança do
--     `pg_default_acl`, contra o próprio COMMENT da FUNIL-12; a guarda já o recusava (sem JWT,
--     `auth.uid()` é nulo). Depois da migration a recusa vem do ACL (`permission denied for
--     function`, também 42501). Propriedades da função iguais às medidas.
--
-- FIXTURES — NÃO SÃO CANDIDATURAS REAIS (idioma do `p49_44_resposta_caso_aberto_smoke`): dois
-- titulares sintéticos `p51a-smoke-<hex>@invalido.local` (auth.users + candidatos) — T, dono da
-- candidatura da fixture, e X, intruso sem candidatura —; UMA candidatura de T que nasce
-- `status = 'rejeitado'` (desarma `trg_notif_confirmacao`) e vai a `em_analise` por UPDATE só de
-- status, em `avaliacao_assincrona`, numa vaga VIVA lida na execução. A liberação é gravada com
-- `liberado_por` = um administrador ATIVO real lido na execução; a linha de `scores_raven` usa
-- valores mínimos válidos LIDOS das constraints da tabela. O ator RH de (d) é uma linha ATIVA de
-- `usuarios_rh` lida na execução.
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL encerrada
-- por `RAISE EXCEPTION` com SQLSTATE próprio (`P51A1`), capturado logo acima: ROLLBACK de tudo,
-- inclusive do que os triggers enfileiram em `net.http_request_queue` (o
-- `trg_notif_cognitivo_liberado` da liberação). Nenhum e-mail sai. E o arquivo inteiro só roda
-- dentro do ensaio que ABORTA (bloco `$p51_so_ensaio$` abaixo): fora dele, nada roda.
--
-- ⚠ CADA chamada vai no SEU PRÓPRIO bloco `BEGIN … EXCEPTION WHEN OTHERS` que guarda
-- `SQLSTATE:SQLERRM`. As medições ficam numa GUC de sessão (`smoke51a.m`); o julgamento roda
-- FORA da subtransação, UMA cláusula por bloco `DO`, na ordem a, b, c, d, e, f, z — a primeira
-- que reprova encerra a requisição, e as letras seguintes não aparecem nessa corrida.
--
-- CLÁUSULAS.
--   (a) forma/ACL: propriedades da função (`prosecdef`, volatilidade, paralelismo, tipo,
--       estrita, leakproof, retset, `proconfig`, linguagem, dono, argumentos, retorno) IGUAIS às
--       medidas em PROD em 2026-10-09; conjunto de ACL = o medido MENOS a entrada de `anon`
--       (escopo deliberado: a ÚNICA diferença aceita é o aperto nomeado); `has_function_privilege`
--       de `anon` falso; a chamada sob `SET LOCAL ROLE anon` falha com `permission denied for
--       function get_avaliacao_status` (e NÃO com `forbidden`: ACL e guarda dão o mesmo SQLSTATE,
--       e só a mensagem os distingue); `authenticated` com EXECUTE.
--   (b) só booleanos: nas quatro leituras do titular em (c), toda folha do jsonb (percorrido
--       recursivamente) é booleana, e `raven` tem exatamente as chaves `liberado` e `registrado`.
--   (c) semântica, na fixture: sem liberação → {false,false}; com `cognitivo_liberacao` →
--       {true,false}; com linha em `scores_raven` → registrado = true; com `revogado_em`
--       preenchido → liberado = false (registrado segue true).
--   (d) guarda de titular: X (outro usuário sintético) → 42501 `forbidden`; claims `rh` de uma
--       linha ATIVA de `usuarios_rh` → 42501 `forbidden`; `authenticated` sem claims → 42501
--       `forbidden`.
--   (e) RNF-07a por forma: o corpo vivo da função, sem comentários, cita `scores_raven` (a
--       cláusula não é vácua) e NÃO contém `percentil`, `classificacao` nem `total_acertos`.
--   (f) população real, SEM escrita: para toda candidatura com linha em `cognitivo_liberacao`
--       cujo titular tem `user_id`, sob o JWT DESSE titular, `raven.liberado` = (há linha sem
--       `revogado_em`) e `raven.registrado` = (há linha em `scores_raven`). A população é
--       impressa em `p51.evidencia` (`51a.f=<n>`); população vazia = FALHA (nunca pula). Mede a
--       população LIDA NA EXECUÇÃO, não um número fixo (o 51-RESEARCH mediu 4 liberações, 0
--       revogadas, 2 concluídas).
--   (z) resíduo: nenhum id da fixture sobrevive ao envelope; contagens globais de `auth.users`,
--       `candidatos`, `candidaturas`, `cognitivo_liberacao`, `scores_raven`,
--       `historico_candidatura`, `notificacoes_enviadas` e `net.http_request_queue` = baseline
--       capturada NESTA execução.
--
-- O PORTÃO MORDE — mutações MA1..MA5 por `scripts/p51_mutacoes.cjs` (Task 2 do 51-06), cada uma
-- numa requisição que aborta: prefixo do ensaio + migration intacta + MUTAÇÃO + este smoke +
-- sentinela. Cada uma tem de reprovar na letra abaixo e NÃO chegar ao sentinela. Uma cláusula nova
-- sem mutação que a reprove é cláusula não vigiada:
--   (tabela preenchida na Task 2 com a letra e a duração medidas)
--
-- Varredura D-56 (forma) — 2026-10-09, padrão LITERAL do CLAUDE.md §«Portões» sobre
-- `supabase/tests/*.sql` (antes deste arquivo existir):
--   População da forma: 368 linhas. Achados que tocam `get_avaliacao_status`,
--   `cognitivo_liberacao` ou `scores_raven`: 0. O padrão de linha não vê consulta que atravessa
--   linhas; por isso, lidos à mão, os smokes que citam esses objetos:
--   · funil12_status_rpc_smoke.sql — o contrato legado da função: (1) toda folha booleana e sem
--     chave proibida (`score`, `score_max`, `status`, `metadata`, `veredito`, `threshold`,
--     `banda`) — `liberado`/`registrado` não estão na lista; (2) `sjt_mc.registrado`; (3) IDOR.
--     Não muda e continua verde com a migration (verify do 51-06).
--   · p44_export_drift_smoke.sql — lista de colunas de `cognitivo_liberacao`/`scores_raven`
--     (escopo do export; a migration não cria coluna).
--   · p45_motor_exclusao_smoke.sql — contagem global de `scores_raven` em (z), baseline da
--     própria execução; não muda.
--   · p48_cognitivo_notifica_smoke.sql — o trigger de aviso da liberação; não muda.
--   Este arquivo tem constantes DELIBERADAS, todas escopo: o esperado 7 (o número de cláusulas
--   DESTE arquivo), as propriedades e o conjunto de ACL de (a) (o contrato da função depois do
--   A4 — uma mudança legítima delas é decisão que tem de passar por aqui) e as contagens 1 das
--   escritas da fixture. As contagens globais de (z) são baseline capturada na execução.
--
-- COMO RODAR: SÓ pelo envelope que aborta — `node scripts/p51_ensaio.cjs
-- supabase/tests/p51_raven_status_smoke.sql` (antes do apply ele prefixa 20261008000001; depois,
-- `--sem-migracoes`). VERMELHO sem a migration (primeiro em (a): `anon` ainda tem EXECUTE), VERDE
-- com ela. ⚠ PROIBIDO: `node p46apply.cjs run` deste arquivo — o `run` COMMITA; o bloco
-- `$p51_so_ensaio$` recusa antes de qualquer escrita.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), não uma fotografia do banco. Vive num ÚNICO literal (`smoke51a.esperado`,
-- abaixo); o gate e o JSON final LEEM a GUC. Hoje: 7 — a, b, c, d, e, f, z.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- GUARDA ESTRUTURAL — PRIMEIRA instrução do arquivo. Este smoke ESCREVE (envelope P51A1) e só
-- pode rodar dentro de `scripts/p51_ensaio.cjs` (ou de `p51_mutacoes.cjs`, que compõe pelo mesmo
-- `compor`): o PREFIXO do ensaio grava o txid da requisição na GUC LOCAL `p51.tx` e aborta tudo
-- no sentinela. Fora dele a marca não existe e o arquivo para AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
DO $p51_so_ensaio$
DECLARE
  v_tx text := coalesce(current_setting('p51.tx', true), '');
BEGIN
  IF v_tx = '' THEN
    RAISE EXCEPTION 'P51A RECUSADO (fora do ensaio): este smoke ESCREVE (envelope P51A1) e so roda dentro de scripts/p51_ensaio.cjs, que marca a requisicao (p51.tx) e a aborta no sentinela; p46apply.cjs run COMMITA e e proibido. Nada rodou. Use: node scripts/p51_ensaio.cjs [--sem-migracoes] supabase/tests/p51_raven_status_smoke.sql';
  END IF;
  IF v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P51A RECUSADO (fora do ensaio): a marca p51.tx (%) nao e desta transacao (%): a requisicao nao e a que o ensaio abriu. Nada rodou', v_tx, txid_current();
  END IF;
END
$p51_so_ensaio$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('smoke51a.pass', '0', false);
SELECT set_config('smoke51a.esperado', '7', false);
SELECT set_config('smoke51a.fixtures', '', false);
SELECT set_config('smoke51a.m', '', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — atores vivos (leitura, como postgres), valores mínimos de `scores_raven` lidos das
-- constraints, e as contagens globais para (z).
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_vaga  uuid;
  v_admin uuid;
  v_rh    uuid;
  v_cls   text;
  v_min   jsonb := '{}'::jsonb;
  v_col   text;
  v_lim   text;
BEGIN
  SELECT v.id INTO v_vaga
    FROM public.vagas v
   WHERE v.deleted_at IS NULL
   ORDER BY v.created_at, v.id
   LIMIT 1;
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  SELECT u.user_id INTO v_rh
    FROM public.usuarios_rh u
   WHERE u.user_id IS NOT NULL AND u.ativo AND u.deleted_at IS NULL
   ORDER BY (u.role = 'recrutador') DESC, u.created_at, u.user_id
   LIMIT 1;
  IF v_vaga IS NULL OR v_admin IS NULL OR v_rh IS NULL THEN
    RAISE EXCEPTION 'P51A FAIL (baseline): falta ator (vaga viva = %, administrador ativo = %, rh ativo = %) — ausencia de ator REPROVA, nunca pula',
      v_vaga IS NOT NULL, v_admin IS NOT NULL, v_rh IS NOT NULL;
  END IF;

  -- valores minimos validos de scores_raven, LIDOS das constraints CHECK (limite inferior de
  -- cada coluna numerica; sem constraint, 0 e valido) e o primeiro rotulo aceito de classificacao.
  FOREACH v_col IN ARRAY ARRAY['total_acertos', 'percentual_acerto', 'percentil', 'tempo_total_segundos'] LOOP
    SELECT (regexp_match(pg_catalog.pg_get_constraintdef(co.oid), v_col || ' >= \(?(-?[0-9]+)'))[1] INTO v_lim
      FROM pg_catalog.pg_constraint co
     WHERE co.conrelid = 'public.scores_raven'::regclass AND co.contype = 'c'
       AND pg_catalog.pg_get_constraintdef(co.oid) ~ (v_col || ' >= ')
     ORDER BY co.conname
     LIMIT 1;
    v_min := v_min || jsonb_build_object(v_col, coalesce(v_lim, '0')::int);
  END LOOP;
  SELECT (regexp_match(pg_catalog.pg_get_constraintdef(co.oid), '''([^'']+)''::text'))[1] INTO v_cls
    FROM pg_catalog.pg_constraint co
   WHERE co.conrelid = 'public.scores_raven'::regclass AND co.contype = 'c'
     AND pg_catalog.pg_get_constraintdef(co.oid) ~ 'classificacao'
   ORDER BY co.conname
   LIMIT 1;
  IF v_cls IS NULL THEN
    RAISE EXCEPTION 'P51A FAIL (baseline): nenhum rotulo de classificacao legivel nas constraints de scores_raven — a fixture nao teria valor valido';
  END IF;

  PERFORM set_config('smoke51a.vaga',  v_vaga::text,  false);
  PERFORM set_config('smoke51a.admin', v_admin::text, false);
  PERFORM set_config('smoke51a.rh',    v_rh::text,    false);
  PERFORM set_config('smoke51a.cls',   v_cls,         false);
  PERFORM set_config('smoke51a.min',   v_min::text,   false);

  PERFORM set_config('smoke51a.n_users',      (SELECT count(*) FROM auth.users)::text, false);
  PERFORM set_config('smoke51a.n_candidatos', (SELECT count(*) FROM public.candidatos)::text, false);
  PERFORM set_config('smoke51a.n_cand',       (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke51a.n_lib',        (SELECT count(*) FROM public.cognitivo_liberacao)::text, false);
  PERFORM set_config('smoke51a.n_sr',         (SELECT count(*) FROM public.scores_raven)::text, false);
  PERFORM set_config('smoke51a.n_hist',       (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke51a.n_notif',      (SELECT count(*) FROM public.notificacoes_enviadas)::text, false);
  PERFORM set_config('smoke51a.n_netq',       (SELECT count(*) FROM net.http_request_queue)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1 — fixture + medições de (a), (b), (c), (d) numa subtransação que reverte (`P51A1`).
-- O que foi medido vai para a GUC de sessão `smoke51a.m`; o julgamento roda nos blocos seguintes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p1$
DECLARE
  v_vaga  uuid  := current_setting('smoke51a.vaga')::uuid;
  v_admin uuid  := current_setting('smoke51a.admin')::uuid;
  v_rh    uuid  := current_setting('smoke51a.rh')::uuid;
  v_cls   text  := current_setting('smoke51a.cls');
  v_min   jsonb := current_setting('smoke51a.min')::jsonb;
  v_ran   boolean := false;
  v_err   text;
  v_user  uuid;
  v_email text;
  v_cand  uuid;
  v_tit   uuid;   -- titular T
  v_int   uuid;   -- intruso X
  v_cid   uuid;   -- candidatura da fixture
  v_ret   jsonb;
  v_rc    bigint;
  i       int;
  m       jsonb := '{}'::jsonb;
  st      text;
BEGIN
  BEGIN
    -- ── fixture · titular T e intruso X ───────────────────────────────────────
    FOR i IN 1 .. 2 LOOP
      v_user  := gen_random_uuid();
      v_email := 'p51a-smoke-' || replace(v_user::text, '-', '') || '@invalido.local';
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                              created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
      VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              v_email, '', now(), now(),
              '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
      INSERT INTO public.candidatos
        (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
      VALUES
        (v_user, 'SMOKE P51A Titular ' || i, v_email, '(11) 95106-51' || lpad(i::text, 2, '0'),
         DATE '1992-03-10', 'Santos', 'SP', 'site')
      RETURNING id INTO v_cand;
      IF i = 1 THEN
        v_tit := v_user;
        INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
        VALUES (v_cand, v_vaga, 'avaliacao_assincrona'::public.etapa_processo, 'rejeitado', false, now() - interval '10 days')
        RETURNING id INTO v_cid;
        UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_cid;
      ELSE
        v_int := v_user;
      END IF;
    END LOOP;

    -- ── (a) · sob anon a chamada morre no ACL, não na guarda ──────────────────
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN
      v_ret := public.get_avaliacao_status(v_cid);
      st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;
    m := m || jsonb_build_object('a_anon', st);

    -- ── (c) s0 · sem liberação ────────────────────────────────────────────────
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tit::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'candidato'))::text, true);
    BEGIN
      v_ret := public.get_avaliacao_status(v_cid);
      m := m || jsonb_build_object('s0', jsonb_build_object('estado', 'ACEITO', 'ret', v_ret));
    EXCEPTION WHEN OTHERS THEN m := m || jsonb_build_object('s0', jsonb_build_object('estado', SQLSTATE || ':' || SQLERRM));
    END;
    RESET ROLE;

    -- ── (c) s1 · com liberação vigente ────────────────────────────────────────
    INSERT INTO public.cognitivo_liberacao (candidatura_id, liberado_por) VALUES (v_cid, v_admin);
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    m := m || jsonb_build_object('rc_lib', v_rc);
    SET LOCAL ROLE authenticated;
    BEGIN
      v_ret := public.get_avaliacao_status(v_cid);
      m := m || jsonb_build_object('s1', jsonb_build_object('estado', 'ACEITO', 'ret', v_ret));
    EXCEPTION WHEN OTHERS THEN m := m || jsonb_build_object('s1', jsonb_build_object('estado', SQLSTATE || ':' || SQLERRM));
    END;
    RESET ROLE;

    -- ── (c) s2 · com linha em scores_raven (valores mínimos válidos) ──────────
    INSERT INTO public.scores_raven
      (candidatura_id, total_acertos, percentual_acerto, percentil, classificacao, acertos_por_serie, tempo_total_segundos)
    VALUES
      (v_cid, (v_min ->> 'total_acertos')::int, (v_min ->> 'percentual_acerto')::numeric,
       (v_min ->> 'percentil')::int, v_cls, '{}'::jsonb, (v_min ->> 'tempo_total_segundos')::int);
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    m := m || jsonb_build_object('rc_sr', v_rc);
    SET LOCAL ROLE authenticated;
    BEGIN
      v_ret := public.get_avaliacao_status(v_cid);
      m := m || jsonb_build_object('s2', jsonb_build_object('estado', 'ACEITO', 'ret', v_ret));
    EXCEPTION WHEN OTHERS THEN m := m || jsonb_build_object('s2', jsonb_build_object('estado', SQLSTATE || ':' || SQLERRM));
    END;
    RESET ROLE;

    -- ── (c) s3 · liberação revogada ───────────────────────────────────────────
    UPDATE public.cognitivo_liberacao SET revogado_em = now(), revogado_por = v_admin WHERE candidatura_id = v_cid;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    m := m || jsonb_build_object('rc_rev', v_rc);
    SET LOCAL ROLE authenticated;
    BEGIN
      v_ret := public.get_avaliacao_status(v_cid);
      m := m || jsonb_build_object('s3', jsonb_build_object('estado', 'ACEITO', 'ret', v_ret));
    EXCEPTION WHEN OTHERS THEN m := m || jsonb_build_object('s3', jsonb_build_object('estado', SQLSTATE || ':' || SQLERRM));
    END;

    -- ── (d) · negativas da guarda de titular ──────────────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_int::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'candidato'))::text, true);
    BEGIN
      v_ret := public.get_avaliacao_status(v_cid);
      st := 'ACEITO:' || coalesce(v_ret::text, '<null>');
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM;
    END;
    m := m || jsonb_build_object('d_intruso', st);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_rh::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN
      v_ret := public.get_avaliacao_status(v_cid);
      st := 'ACEITO:' || coalesce(v_ret::text, '<null>');
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM;
    END;
    m := m || jsonb_build_object('d_rh', st);
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN
      v_ret := public.get_avaliacao_status(v_cid);
      st := 'ACEITO:' || coalesce(v_ret::text, '<null>');
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM;
    END;
    m := m || jsonb_build_object('d_sem', st);
    RESET ROLE;

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P51A1';
  EXCEPTION
    WHEN SQLSTATE 'P51A1' THEN
      NULL;  -- ROLLBACK da subtransação. Os valores medidos estão em `m`.
    WHEN OTHERS THEN
      v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  -- FORA da subtransação: um set_config dentro dela volta junto com o ROLLBACK (até o de sessão).
  PERFORM set_config('smoke51a.fixtures', coalesce(v_cid::text, ''), false);

  IF v_err IS NOT NULL THEN
    RAISE EXCEPTION 'P51A FAIL (fixture): a subtransacao abortou por erro INESPERADO (%) — nenhuma clausula foi julgada; o defeito e da FIXTURE, nao do objeto vigiado (cada chamada tem bloco de excecao proprio)', v_err;
  END IF;
  IF NOT v_ran THEN
    RAISE EXCEPTION 'P51A FAIL (fixture): a subtransacao nao chegou ao fim e nao houve erro capturado — estado impossivel';
  END IF;
  PERFORM set_config('smoke51a.m', m::text, false);
END
$p1$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) FORMA / ACL — o contrato da função depois do aperto nomeado (A4).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a$
DECLARE
  m        jsonb := current_setting('smoke51a.m')::jsonb;
  -- ESCOPO DELIBERADO (não fotografia): medidos em PROD em 2026-10-09 (Passo 0 do 51-06). A ACL é
  -- a medida MENOS `anon:EXECUTE:false:postgres` — a única diferença aceita (A4).
  c_props  constant text := 't|v|u|f|f|f|f|{"search_path=\"\""}|plpgsql|postgres|p_candidatura_id uuid|jsonb';
  c_acl    constant text := 'authenticated:EXECUTE:false:postgres,postgres:EXECUTE:false:postgres,service_role:EXECUTE:false:postgres';
  v_props  text;
  v_acl    text;
  v_anon   boolean;
  v_auth   boolean;
BEGIN
  SELECT concat_ws('|', p.prosecdef, p.provolatile, p.proparallel, p.prokind, p.proisstrict, p.proleakproof, p.proretset,
                   coalesce(p.proconfig::text, '<null>'), l.lanname, pg_catalog.pg_get_userbyid(p.proowner),
                   pg_catalog.pg_get_function_arguments(p.oid), pg_catalog.pg_get_function_result(p.oid)),
         (SELECT string_agg(x, ',' ORDER BY x)
            FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':'
                         || a.is_grantable::text || ':' || a.grantor::regrole::text AS x
                    FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s)
    INTO v_props, v_acl
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE p.oid = to_regprocedure('public.get_avaliacao_status(uuid)');
  v_anon := coalesce(has_function_privilege('anon',          to_regprocedure('public.get_avaliacao_status(uuid)'), 'EXECUTE'), true);
  v_auth := coalesce(has_function_privilege('authenticated', to_regprocedure('public.get_avaliacao_status(uuid)'), 'EXECUTE'), false);

  IF v_props IS DISTINCT FROM c_props THEN
    RAISE EXCEPTION 'P51A FAIL (a): propriedades da funcao = «%» (esperado «%», medido em 2026-10-09) — a migration nao pode mudar seguranca, volatilidade, search_path, dono, assinatura nem retorno',
      v_props, c_props;
  END IF;
  IF v_acl IS DISTINCT FROM c_acl OR v_anon OR NOT v_auth THEN
    RAISE EXCEPTION 'P51A FAIL (a): ACL = «%» (esperado «%»: a medida em 2026-10-09 MENOS anon, o aperto nomeado A4), anon EXECUTE=% (esperado false), authenticated EXECUTE=% (esperado true)',
      v_acl, c_acl, v_anon, v_auth;
  END IF;
  IF coalesce(m ->> 'a_anon', '<nao rodou>') NOT LIKE '42501:permission denied for function get_avaliacao_status%' THEN
    RAISE EXCEPTION 'P51A FAIL (a): sob SET LOCAL ROLE anon a chamada deu «%» (esperado 42501 permission denied for function get_avaliacao_status — o ACL, nao a guarda: um «forbidden» quer dizer que anon TEM EXECUTE e so a guarda segurou)',
      coalesce(m ->> 'a_anon', '<nao rodou>');
  END IF;
  PERFORM set_config('smoke51a.pass', (current_setting('smoke51a.pass')::int + 1)::text, false);
END
$a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) SÓ BOOLEANOS — toda folha do jsonb, recursivamente; `raven` = {liberado, registrado}.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $b$
DECLARE
  m      jsonb := current_setting('smoke51a.m')::jsonb;
  k      text;
  v      jsonb;
  r      jsonb;
  n_bad  bigint;
  n_bool bigint;
  v_ruim text;
  v_kr   text[];
BEGIN
  FOREACH k IN ARRAY ARRAY['s0', 's1', 's2', 's3'] LOOP
    v := m -> k;
    IF coalesce(v ->> 'estado', '<nao rodou>') <> 'ACEITO' THEN
      RAISE EXCEPTION 'P51A FAIL (b): a leitura % do TITULAR falhou com «%» (esperado o jsonb de status — o titular le a propria candidatura)',
        k, coalesce(v ->> 'estado', '<nao rodou>');
    END IF;
    r := v -> 'ret';
    IF jsonb_typeof(r) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'P51A FAIL (b): leitura % devolveu % (esperado objeto)', k, coalesce(jsonb_typeof(r), 'null');
    END IF;
    SELECT count(*) FILTER (WHERE jsonb_typeof(x) NOT IN ('object', 'boolean')),
           count(*) FILTER (WHERE jsonb_typeof(x) = 'boolean'),
           string_agg(x::text, ', ') FILTER (WHERE jsonb_typeof(x) NOT IN ('object', 'boolean'))
      INTO n_bad, n_bool, v_ruim
      FROM jsonb_path_query(r, 'strict $.**') x;
    IF n_bad > 0 OR n_bool = 0 THEN
      RAISE EXCEPTION 'P51A FAIL (b): leitura % tem % folha(s) NAO booleana(s) [%] e % booleana(s) — so presenca chega ao navegador (RNF-07a): %',
        k, n_bad, coalesce(v_ruim, '-'), n_bool, r;
    END IF;
    SELECT array_agg(x ORDER BY x) INTO v_kr FROM jsonb_object_keys(CASE WHEN jsonb_typeof(r -> 'raven') = 'object' THEN r -> 'raven' ELSE '{}'::jsonb END) x;
    IF jsonb_typeof(r -> 'raven') IS DISTINCT FROM 'object' OR v_kr IS DISTINCT FROM ARRAY['liberado', 'registrado'] THEN
      RAISE EXCEPTION 'P51A FAIL (b): leitura % — chave raven = % com chaves % (esperado objeto com exatamente liberado e registrado)',
        k, coalesce((r -> 'raven')::text, '<ausente>'), coalesce(v_kr::text, '{}');
    END IF;
  END LOOP;
  PERFORM set_config('smoke51a.pass', (current_setting('smoke51a.pass')::int + 1)::text, false);
END
$b$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) SEMÂNTICA — liberado e registrado seguem a liberação, a revogação e a linha de score.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c$
DECLARE
  m  jsonb := current_setting('smoke51a.m')::jsonb;
  r0 jsonb := m -> 's0' -> 'ret' -> 'raven';
  r1 jsonb := m -> 's1' -> 'ret' -> 'raven';
  r2 jsonb := m -> 's2' -> 'ret' -> 'raven';
  r3 jsonb := m -> 's3' -> 'ret' -> 'raven';
BEGIN
  IF (m ->> 'rc_lib') IS DISTINCT FROM '1' OR (m ->> 'rc_sr') IS DISTINCT FROM '1' OR (m ->> 'rc_rev') IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'P51A FAIL (c): escritas da fixture afetaram liberacao=% score=% revogacao=% linha(s) (esperado 1 cada) — a semantica abaixo seria vacua',
      m ->> 'rc_lib', m ->> 'rc_sr', m ->> 'rc_rev';
  END IF;
  IF r0 IS DISTINCT FROM '{"liberado": false, "registrado": false}'::jsonb THEN
    RAISE EXCEPTION 'P51A FAIL (c): sem liberacao e sem score, raven = % (esperado {liberado:false, registrado:false})', coalesce(r0::text, '<ausente>');
  END IF;
  IF r1 IS DISTINCT FROM '{"liberado": true, "registrado": false}'::jsonb THEN
    RAISE EXCEPTION 'P51A FAIL (c): com liberacao vigente e sem score, raven = % (esperado {liberado:true, registrado:false}) — registrado tem de vir de scores_raven', coalesce(r1::text, '<ausente>');
  END IF;
  IF r2 IS DISTINCT FROM '{"liberado": true, "registrado": true}'::jsonb THEN
    RAISE EXCEPTION 'P51A FAIL (c): com liberacao vigente e linha em scores_raven, raven = % (esperado {liberado:true, registrado:true})', coalesce(r2::text, '<ausente>');
  END IF;
  IF r3 IS DISTINCT FROM '{"liberado": false, "registrado": true}'::jsonb THEN
    RAISE EXCEPTION 'P51A FAIL (c): com a liberacao REVOGADA (revogado_em preenchido), raven = % (esperado {liberado:false, registrado:true}) — liberado ignora a revogacao?', coalesce(r3::text, '<ausente>');
  END IF;
  PERFORM set_config('smoke51a.pass', (current_setting('smoke51a.pass')::int + 1)::text, false);
END
$c$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) GUARDA DE TITULAR — quem não é o titular recebe 42501 `forbidden`.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $d$
DECLARE
  m jsonb := current_setting('smoke51a.m')::jsonb;
BEGIN
  IF coalesce(m ->> 'd_intruso', '<nao rodou>') IS DISTINCT FROM '42501:forbidden'
     OR coalesce(m ->> 'd_rh', '<nao rodou>') IS DISTINCT FROM '42501:forbidden'
     OR coalesce(m ->> 'd_sem', '<nao rodou>') IS DISTINCT FROM '42501:forbidden' THEN
    RAISE EXCEPTION 'P51A FAIL (d): outro usuario sintetico=«%», claims rh de linha ATIVA=«%», authenticated sem claims=«%» (esperado 42501:forbidden nos tres) — alguem que nao e o titular leu o status',
      coalesce(m ->> 'd_intruso', '<nao rodou>'), coalesce(m ->> 'd_rh', '<nao rodou>'), coalesce(m ->> 'd_sem', '<nao rodou>');
  END IF;
  PERFORM set_config('smoke51a.pass', (current_setting('smoke51a.pass')::int + 1)::text, false);
END
$d$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) RNF-07a POR FORMA — o corpo vivo, sem comentários, não lê número do Raven.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $e$
DECLARE
  v_src  text;
  v_hits text;
BEGIN
  SELECT regexp_replace(p.prosrc, '--[^\n]*', '', 'g') INTO v_src
    FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.get_avaliacao_status(uuid)');
  IF v_src IS NULL OR position('scores_raven' IN v_src) = 0 THEN
    RAISE EXCEPTION 'P51A FAIL (e): o corpo da funcao nao cita scores_raven — a clausula seria vacua (a chave raven nao existe?)';
  END IF;
  SELECT string_agg(w, ',' ORDER BY w) INTO v_hits
    FROM unnest(ARRAY['percentil', 'classificacao', 'total_acertos']) w
   WHERE position(w IN lower(v_src)) > 0;
  IF v_hits IS NOT NULL THEN
    RAISE EXCEPTION 'P51A FAIL (e): o corpo da funcao (sem comentarios) cita % — numero do Raven no caminho do navegador (RNF-07a)', v_hits;
  END IF;
  PERFORM set_config('smoke51a.pass', (current_setting('smoke51a.pass')::int + 1)::text, false);
END
$e$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) POPULAÇÃO REAL, SEM ESCRITA — sob o JWT de cada titular, raven = o que o banco diz.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $f$
DECLARE
  r      record;
  v_ret  jsonb;
  v_st   text;
  v_n    int := 0;
  v_lib  int := 0;
  v_reg  int := 0;
  v_div  text := '';
BEGIN
  FOR r IN
    SELECT l.candidatura_id, ca.user_id,
           (l.revogado_em IS NULL) AS lib,
           EXISTS (SELECT 1 FROM public.scores_raven s WHERE s.candidatura_id = l.candidatura_id) AS reg
      FROM public.cognitivo_liberacao l
      JOIN public.candidaturas c ON c.id = l.candidatura_id
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE ca.user_id IS NOT NULL
     ORDER BY l.candidatura_id
  LOOP
    v_n := v_n + 1;
    v_lib := v_lib + CASE WHEN r.lib THEN 1 ELSE 0 END;
    v_reg := v_reg + CASE WHEN r.reg THEN 1 ELSE 0 END;
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', r.user_id::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'candidato'))::text, true);
    BEGIN
      v_ret := public.get_avaliacao_status(r.candidatura_id);
      v_st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN v_st := SQLSTATE || ':' || SQLERRM;  v_ret := NULL;
    END;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    IF v_st <> 'ACEITO'
       OR (v_ret -> 'raven') IS DISTINCT FROM jsonb_build_object('liberado', r.lib, 'registrado', r.reg) THEN
      v_div := v_div || format('%s: estado=%s raven=%s banco={liberado:%s,registrado:%s}; ',
                               r.candidatura_id, v_st, coalesce((v_ret -> 'raven')::text, '<ausente>'), r.lib, r.reg);
    END IF;
  END LOOP;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'P51A FAIL (f): populacao VAZIA — nenhuma candidatura com liberacao cujo titular tem user_id; a clausula nao provaria nada (populacao vazia mente nas duas direcoes)';
  END IF;
  IF v_div <> '' THEN
    RAISE EXCEPTION 'P51A FAIL (f): na populacao real (% candidaturas: % liberadas vigentes, % com score), raven diverge do banco: %', v_n, v_lib, v_reg, v_div;
  END IF;
  PERFORM set_config('p51.evidencia',
    btrim(coalesce(current_setting('p51.evidencia', true), '') || format(' 51a.f=%s(lib=%s,reg=%s)', v_n, v_lib, v_reg)), false);
  PERFORM set_config('smoke51a.pass', (current_setting('smoke51a.pass')::int + 1)::text, false);
END
$f$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) NEGATIVA — nada da fixture sobreviveu; contagens globais iguais às de antes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE
  v_cid  uuid := nullif(current_setting('smoke51a.fixtures'), '')::uuid;
  l_cand int;  l_lib int;  l_sr int;  l_tit int;  l_usr int;
BEGIN
  IF v_cid IS NULL THEN
    RAISE EXCEPTION 'P51A FAIL (z): nenhuma fixture registrada — a negativa nao teria o que conferir';
  END IF;
  SELECT count(*) INTO l_cand FROM public.candidaturas c WHERE c.id = v_cid;
  SELECT count(*) INTO l_lib  FROM public.cognitivo_liberacao l WHERE l.candidatura_id = v_cid;
  SELECT count(*) INTO l_sr   FROM public.scores_raven s WHERE s.candidatura_id = v_cid;
  SELECT count(*) INTO l_tit  FROM public.candidatos c WHERE c.email LIKE 'p51a-smoke-%@invalido.local';
  SELECT count(*) INTO l_usr  FROM auth.users u WHERE u.email LIKE 'p51a-smoke-%@invalido.local';
  IF l_cand <> 0 OR l_lib <> 0 OR l_sr <> 0 OR l_tit <> 0 OR l_usr <> 0 THEN
    RAISE EXCEPTION 'P51A FAIL (z): RESIDUO da fixture — candidatura=% liberacao=% score=% titulares=% usuarios=% (a subtransacao nao reverteu)',
      l_cand, l_lib, l_sr, l_tit, l_usr;
  END IF;
  IF (SELECT count(*) FROM auth.users)                    IS DISTINCT FROM current_setting('smoke51a.n_users')::bigint
     OR (SELECT count(*) FROM public.candidatos)           IS DISTINCT FROM current_setting('smoke51a.n_candidatos')::bigint
     OR (SELECT count(*) FROM public.candidaturas)         IS DISTINCT FROM current_setting('smoke51a.n_cand')::bigint
     OR (SELECT count(*) FROM public.cognitivo_liberacao)  IS DISTINCT FROM current_setting('smoke51a.n_lib')::bigint
     OR (SELECT count(*) FROM public.scores_raven)         IS DISTINCT FROM current_setting('smoke51a.n_sr')::bigint
     OR (SELECT count(*) FROM public.historico_candidatura) IS DISTINCT FROM current_setting('smoke51a.n_hist')::bigint
     OR (SELECT count(*) FROM public.notificacoes_enviadas) IS DISTINCT FROM current_setting('smoke51a.n_notif')::bigint
     OR (SELECT count(*) FROM net.http_request_queue)      IS DISTINCT FROM current_setting('smoke51a.n_netq')::bigint THEN
    RAISE EXCEPTION 'P51A FAIL (z): contagem global mudou com residuo ZERO da fixture (baseline users=% candidatos=% candidaturas=% liberacoes=% scores_raven=% historico=% notificacoes=% fila=%) — sob REPEATABLE READ isso nao e trafego: algo escapou do envelope',
      current_setting('smoke51a.n_users'), current_setting('smoke51a.n_candidatos'), current_setting('smoke51a.n_cand'),
      current_setting('smoke51a.n_lib'), current_setting('smoke51a.n_sr'), current_setting('smoke51a.n_hist'),
      current_setting('smoke51a.n_notif'), current_setting('smoke51a.n_netq');
  END IF;
  PERFORM set_config('smoke51a.pass', (current_setting('smoke51a.pass')::int + 1)::text, false);
END
$z$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado — o esperado vive SÓ em `smoke51a.esperado` (topo do arquivo).
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke51a.pass')::int IS DISTINCT FROM current_setting('smoke51a.esperado')::int THEN
    RAISE EXCEPTION 'P51A FAIL (gate): pass = % de % — alguma clausula nao incrementou o contador',
      current_setting('smoke51a.pass'), current_setting('smoke51a.esperado');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',     'p51_raven_status',
  'pass',      current_setting('smoke51a.pass')::int,
  'esperado',  current_setting('smoke51a.esperado')::int,
  'n_lib',     current_setting('smoke51a.n_lib')::int,
  'n_sr',      current_setting('smoke51a.n_sr')::int
) AS resultado;
