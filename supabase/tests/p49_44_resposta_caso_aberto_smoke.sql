-- =============================================================================
-- Phase 49 / Plano 49-44 — smoke da LEITURA DO CASO ABERTO PELO RH (WR-07 / JORN-41)
-- =============================================================================
-- O QUE ELE VIGIA.
--   · 20261003000001 — `public.ler_resposta_caso_aberto_sjt(uuid)`: o RH dono da vaga (e o
--     administrador) lê o texto que o candidato gravou na resposta do caso aberto da SJT; RH de
--     outra vaga, chamada sem claims e o próprio candidato recebem 42501; `anon` não tem EXECUTE.
--
-- FIXTURE — NÃO É UMA CANDIDATURA REAL (idioma do `p49_revisao_por_analise_smoke`):
--   titular sintético `@invalido.local` inserido em `auth.users` e `candidatos`; candidatura A que
--   nasce `status = 'rejeitado'` (desarma `trg_notif_confirmacao`) e vai a `em_analise` por UPDATE
--   só de status, em `etapa_atual = 'decisao_final'`, numa vaga VIVA com `created_by` não nulo
--   LIDA NA EXECUÇÃO (o dono da vaga é o RH que lê); linha `scores_candidato` `sjt`/`caso_aberto`
--   `sucesso` com `motivos_revisao = ["instrucao_ao_modelo"]`; autosave `sjt_caso_aberto` com um
--   texto conhecido que tem quebra de linha e acento.
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL encerrada por
-- `RAISE EXCEPTION` com SQLSTATE próprio (`P49C1`), capturado logo acima: ROLLBACK de tudo,
-- inclusive do que os triggers enfileiram em `net.http_request_queue`. Nenhum e-mail sai (D-54).
--
-- ⚠ CADA chamada de RPC vai no SEU PRÓPRIO bloco `BEGIN … EXCEPTION WHEN OTHERS` que guarda
-- `SQLSTATE:SQLERRM`. O julgamento roda FORA da subtransação e reprova a PRIMEIRA cláusula
-- quebrada, na ordem a, b, d, z.
--
-- CLÁUSULAS (versão tracer):
--   (a) ACL: `anon` sem EXECUTE e `authenticated` com EXECUTE; sob `SET LOCAL ROLE anon` a chamada
--       falha com `permission denied for function`, e NÃO com `forbidden` — o ACL e a guarda dão o
--       mesmo SQLSTATE (42501), e só a mensagem os distingue.
--   (b) claims `rh` com `sub` = `created_by` da vaga ⇒ `disponivel`, md5(texto) = md5 da fixture.
--   (d) sobre a fixture POVOADA: `rh` com `sub` aleatório ⇒ 42501; sem claims ⇒ 42501; claims
--       `candidato` com `sub` = o titular ⇒ 42501.
--   (z) nada das fixtures sobrevive; contagens globais = baseline capturada NA execução.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p49_44_resposta_caso_aberto_smoke.sql` —
-- UMA requisição, UMA sessão. O `SELECT` final devolve `{smoke, pass, esperado, ...}`; qualquer
-- FAIL é `RAISE EXCEPTION` e o `p46apply` sai com código ≠ 0.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), não uma fotografia do banco. Hoje: 4 — a, b, d, z.
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('smoke4944.pass', '0', false);
SELECT set_config('smoke4944.fixtures', '', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — atores vivos (leitura) e contagens para a negativa.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_vaga uuid;
  v_dono uuid;
BEGIN
  SELECT v.id, v.created_by INTO v_vaga, v_dono
    FROM public.vagas v
   WHERE v.created_by IS NOT NULL AND v.deleted_at IS NULL
   ORDER BY v.created_at, v.id
   LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P49C FAIL (baseline): nenhuma vaga viva com created_by — sem dono nao ha RH que leia pela posse';
  END IF;

  PERFORM set_config('smoke4944.vaga', v_vaga::text, false);
  PERFORM set_config('smoke4944.dono', v_dono::text, false);

  PERFORM set_config('smoke4944.n_users', (SELECT count(*) FROM auth.users)::text, false);
  PERFORM set_config('smoke4944.n_candidatos', (SELECT count(*) FROM public.candidatos)::text, false);
  PERFORM set_config('smoke4944.n_cand',  (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke4944.n_sc',    (SELECT count(*) FROM public.scores_candidato)::text, false);
  PERFORM set_config('smoke4944.n_ra',    (SELECT count(*) FROM public.respostas_avaliacao)::text, false);
  PERFORM set_config('smoke4944.n_hist',  (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke4944.n_notif', (SELECT count(*) FROM public.notificacoes_enviadas)::text, false);
  PERFORM set_config('smoke4944.n_netq',  (SELECT count(*) FROM net.http_request_queue)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1 — fixtures + medições, numa subtransação que reverte (`P49C1`).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p1$
DECLARE
  v_vaga   uuid := current_setting('smoke4944.vaga')::uuid;
  v_dono   uuid := current_setting('smoke4944.dono')::uuid;
  v_ids    text := '';
  v_ran    boolean := false;
  v_err    text;
  v_user   uuid;
  v_email  text;
  v_cand   uuid;
  v_a      uuid;    -- candidatura A (enviada, com texto)
  v_tit_a  uuid;    -- titular de A
  v_ret    jsonb;
  c_texto constant text := E'Primeiro eu ouviria a paciente com atenção.\nDepois explicaria o protocolo de biossegurança, com calma e sem pressa.';
  -- (a)
  a_anon_state text := '<nao rodou>';
  -- (b)
  b_state text := '<nao rodou>';  b_situacao text;  b_md5 text;
  -- (d)
  d_alheio text := '<nao rodou>';  d_sem text := '<nao rodou>';  d_cand text := '<nao rodou>';
BEGIN
  BEGIN
    -- ── fixture A · titular sintético + candidatura em decisao_final ─────────────
    v_user  := gen_random_uuid();
    v_email := 'p4944smoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P49C Titular A', v_email, '(11) 94444-4901',
       DATE '1992-03-10', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga, 'decisao_final', 'rejeitado', false, now() - interval '10 days')
    RETURNING id INTO v_a;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_a;
    v_tit_a := v_user;
    v_ids := v_ids || v_a::text || ',';

    INSERT INTO public.scores_candidato (candidatura_id, tipo, subtipo, pergunta_id, score, score_max, status, metadata)
    VALUES (v_a, 'sjt', 'caso_aberto', NULL, 18, 25, 'sucesso',
            jsonb_build_object('motivos_revisao', jsonb_build_array('instrucao_ao_modelo')));
    INSERT INTO public.respostas_avaliacao (candidatura_id, teste, respostas)
    VALUES (v_a, 'sjt_caso_aberto', jsonb_build_object('texto', c_texto));

    -- ── (a) · sob anon a chamada morre no ACL, não na guarda ───────────────────
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_a);
      a_anon_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN a_anon_state := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;

    -- ── (b) · RH dono da vaga lê o texto ───────────────────────────────────────
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_a);
      b_situacao := v_ret ->> 'situacao';
      b_md5      := md5(v_ret ->> 'texto');
      b_state    := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN b_state := SQLSTATE || ':' || SQLERRM;
    END;

    -- ── (d) · negativas sobre a fixture POVOADA ────────────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_a);
      d_alheio := 'ACEITO:' || coalesce(v_ret ->> 'situacao', '?');
    EXCEPTION WHEN OTHERS THEN d_alheio := SQLSTATE || ':' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_a);
      d_sem := 'ACEITO:' || coalesce(v_ret ->> 'situacao', '?');
    EXCEPTION WHEN OTHERS THEN d_sem := SQLSTATE || ':' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tit_a::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'candidato'))::text, true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_a);
      d_cand := 'ACEITO:' || coalesce(v_ret ->> 'situacao', '?');
    EXCEPTION WHEN OTHERS THEN d_cand := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P49C1';
  EXCEPTION
    WHEN SQLSTATE 'P49C1' THEN
      NULL;  -- ROLLBACK da subtransação. Os valores medidos estão nas variáveis acima.
    WHEN OTHERS THEN
      v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;

  RESET ROLE;
  PERFORM set_config('smoke4944.fixtures', v_ids, false);
  PERFORM set_config('request.jwt.claims', '', false);

  IF v_err IS NOT NULL THEN
    RAISE EXCEPTION 'P49C FAIL (parte 1): a subtransacao abortou por erro INESPERADO (%) — nenhuma clausula foi julgada; o defeito e da FIXTURE, nao da RPC (cada chamada tem bloco de excecao proprio)', v_err;
  END IF;
  IF NOT v_ran THEN
    RAISE EXCEPTION 'P49C FAIL (parte 1): a subtransacao nao chegou ao fim e nao houve erro capturado — estado impossivel';
  END IF;

  -- ═══ JULGAMENTO, FORA da subtransação ═══

  -- (a) — a metade comportamental; a metade de catálogo vem no bloco $acl$ abaixo.
  IF a_anon_state NOT LIKE '42501:%permission denied for function%' THEN
    RAISE EXCEPTION 'P49C FAIL (a): sob SET LOCAL ROLE anon a chamada devolveu «%» (esperado 42501 permission denied for function — o ACL, nao a guarda: um «forbidden» aqui quer dizer que anon TEM EXECUTE e so a guarda segurou)', a_anon_state;
  END IF;

  -- (b)
  IF b_state IS DISTINCT FROM 'ACEITO' OR b_situacao IS DISTINCT FROM 'disponivel' OR b_md5 IS DISTINCT FROM md5(c_texto) THEN
    RAISE EXCEPTION 'P49C FAIL (b): o RH dono da vaga (%) leu A com estado «%», situacao=% e md5(texto)=% (esperado ACEITO, disponivel, %) — o dono tem de ler o texto byte a byte',
      v_dono, b_state, b_situacao, b_md5, md5(c_texto);
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);

  -- (d)
  IF d_alheio NOT LIKE '42501:%' OR d_sem NOT LIKE '42501:%' OR d_cand NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P49C FAIL (d): sobre a fixture POVOADA, rh de outra vaga=«%», sem claims=«%», candidato titular=«%» (esperado 42501 nos tres) — alguem fora do predicado WR-04 leu o texto',
      d_alheio, d_sem, d_cand;
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);
END
$p1$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) ACL — lido do catálogo, fora de qualquer subtransação. Conta a cláusula (a) inteira:
--     a metade comportamental já reprovou acima se falhou.
-- ─────────────────────────────────────────────────────────────────────────────
DO $acl$
DECLARE
  v_rpc  regprocedure := to_regprocedure('public.ler_resposta_caso_aberto_sjt(uuid)');
  v_anon boolean;  v_auth boolean;
BEGIN
  v_anon := coalesce(has_function_privilege('anon',          v_rpc, 'EXECUTE'), true);
  v_auth := coalesce(has_function_privilege('authenticated', v_rpc, 'EXECUTE'), false);
  IF v_rpc IS NULL OR v_anon OR NOT v_auth THEN
    RAISE EXCEPTION 'P49C FAIL (a): ACL da RPC (existe=%): anon=% (esperado false — o grant do pg_default_acl e DIRETO), authenticated=% (esperado true — e o JWT do RH que chama)',
      v_rpc IS NOT NULL, v_anon, v_auth;
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);
END
$acl$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) NEGATIVA — nada das fixtures sobreviveu; contagens globais iguais às de antes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE
  v_ids  uuid[] := coalesce(string_to_array(rtrim(current_setting('smoke4944.fixtures'), ','), ',')::uuid[], '{}');
  l_cand int;  l_sc int;  l_ra int;  l_tit int;  l_usr int;  l_fila int;
  g_users bigint;  g_candidatos bigint;  g_cand bigint;  g_sc bigint;  g_ra bigint;
  g_hist bigint;  g_notif bigint;  g_netq bigint;
BEGIN
  IF cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'P49C FAIL (z): nenhuma fixture registrada — a negativa nao teria o que conferir';
  END IF;
  SELECT count(*) INTO l_cand FROM public.candidaturas c WHERE c.id = ANY (v_ids);
  SELECT count(*) INTO l_sc   FROM public.scores_candidato sc WHERE sc.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_ra   FROM public.respostas_avaliacao ra WHERE ra.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_tit  FROM public.candidatos c WHERE c.email LIKE 'p4944smoke-%@invalido.local';
  SELECT count(*) INTO l_usr  FROM auth.users u WHERE u.email LIKE 'p4944smoke-%@invalido.local';
  SELECT count(*) INTO l_fila FROM net.http_request_queue q
   WHERE convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = ANY (v_ids::text[]);
  IF l_cand <> 0 OR l_sc <> 0 OR l_ra <> 0 OR l_tit <> 0 OR l_usr <> 0 OR l_fila <> 0 THEN
    RAISE EXCEPTION 'P49C FAIL (z): RESIDUO das fixtures — candidaturas=% notas=% respostas=% titulares=% usuarios=% fila=% (a subtransacao nao reverteu)',
      l_cand, l_sc, l_ra, l_tit, l_usr, l_fila;
  END IF;

  SELECT count(*) INTO g_users      FROM auth.users;
  SELECT count(*) INTO g_candidatos FROM public.candidatos;
  SELECT count(*) INTO g_cand       FROM public.candidaturas;
  SELECT count(*) INTO g_sc         FROM public.scores_candidato;
  SELECT count(*) INTO g_ra         FROM public.respostas_avaliacao;
  SELECT count(*) INTO g_hist       FROM public.historico_candidatura;
  SELECT count(*) INTO g_notif      FROM public.notificacoes_enviadas;
  SELECT count(*) INTO g_netq       FROM net.http_request_queue;
  IF g_users         IS DISTINCT FROM current_setting('smoke4944.n_users')::bigint
     OR g_candidatos IS DISTINCT FROM current_setting('smoke4944.n_candidatos')::bigint
     OR g_cand       IS DISTINCT FROM current_setting('smoke4944.n_cand')::bigint
     OR g_sc         IS DISTINCT FROM current_setting('smoke4944.n_sc')::bigint
     OR g_ra         IS DISTINCT FROM current_setting('smoke4944.n_ra')::bigint
     OR g_hist       IS DISTINCT FROM current_setting('smoke4944.n_hist')::bigint
     OR g_notif      IS DISTINCT FROM current_setting('smoke4944.n_notif')::bigint
     OR g_netq       IS DISTINCT FROM current_setting('smoke4944.n_netq')::bigint THEN
    RAISE EXCEPTION 'P49C FAIL (z): contagem global mudou (users % -> %, candidatos % -> %, candidaturas % -> %, notas % -> %, respostas % -> %, historico % -> %, notificacoes % -> %, fila % -> %) com residuo ZERO das fixtures — o delta e de trafego concorrente commitado durante a requisicao; rodar de novo',
      current_setting('smoke4944.n_users'), g_users, current_setting('smoke4944.n_candidatos'), g_candidatos,
      current_setting('smoke4944.n_cand'), g_cand, current_setting('smoke4944.n_sc'), g_sc,
      current_setting('smoke4944.n_ra'), g_ra, current_setting('smoke4944.n_hist'), g_hist,
      current_setting('smoke4944.n_notif'), g_notif, current_setting('smoke4944.n_netq'), g_netq;
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);
END
$z$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke4944.pass')::int <> 4 THEN
    RAISE EXCEPTION 'P49C FAIL (gate): pass = % de 4 — alguma clausula nao incrementou o contador', current_setting('smoke4944.pass');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',     'p49_44_resposta_caso_aberto',
  'pass',      current_setting('smoke4944.pass')::int,
  'esperado',  4,
  'n_cand',    current_setting('smoke4944.n_cand')::int,
  'n_sc',      current_setting('smoke4944.n_sc')::int,
  'n_ra',      current_setting('smoke4944.n_ra')::int,
  'n_netq',    current_setting('smoke4944.n_netq')::int
) AS resultado;
