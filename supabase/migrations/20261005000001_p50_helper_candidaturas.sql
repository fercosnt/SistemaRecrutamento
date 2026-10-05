-- =============================================================================
-- 20261005000001 — public.is_active_rh_user() : o helper VIVO «o chamador é um usuário RH
--                  ativo e não excluído» ; candidaturas.rh_le_candidaturas : o ramo `rh`
--                  deixa de exigir posse da vaga e passa a exigir o helper
-- =============================================================================
-- Phase 50 / Plano 50-01 · EXPORT-05 (metade «visível ao RH», gap G4-b) · D-01, D-02, D-07,
-- D-11, D-12 · TRACER da fase: UM helper + UMA policy, antes das outras 13 policies, 18 funções
-- e 5 Edge Functions (que reusam exatamente este helper).
--
-- O QUE ESTAVA ERRADO.
--   O ramo `rh` de `rh_le_candidaturas` só deixava ver candidaturas de vagas que o próprio
--   recrutador criou (`vaga_id IN (SELECT vagas.id FROM vagas WHERE vagas.created_by =
--   auth.uid())`). Medido em 2026-10-05 por impersonação só-leitura: um usuário RH ATIVO que não
--   criou nenhuma vaga via 15 vagas e 0 candidaturas; o administrador, 40. A tela do recrutador
--   mostrava «0 Candidatos» em vagas cheias.
--
--   Decisão do operador (`44-PENDENCIAS-2026-10-03.md` §G4-b, 2026-10-04), verbatim: «acho nesse
--   momento melhor deixar o recrutador ver todas as vagas abertas, nao precisamos selecionar
--   neste momento, ou se achar melhor assiciar vagas a recrutadores, mas nao ele so ver as que
--   ele criou». Registro: «**Decidido:** o predicado `vagas.created_by = auth.uid()` **sai**.»
--   «todas» = inclusive inativas e arquivadas (resposta do operador de 2026-10-05).
--   50-CONTEXT D-01: «Recrutador ativo vê **todas** as vagas e tudo que pende delas — sem
--   associação por vaga». D-02: «Um único helper vivo (`public.is_active_rh_user()`, checa
--   `usuarios_rh.ativo` em tempo real) em todo ramo alargado — fecha a janela de até 1 h do JWT
--   de um recrutador desativado. O ramo do administrador fica byte-idêntico.»
--
-- MEDIDO EM PROD (2026-10-05, só leitura, `set transaction read only`, re-medido na execução do
-- 50-01):
--   · `rh_le_candidaturas`: PERMISSIVE, SELECT, roles `{public}`, WITH CHECK nulo;
--     md5(coalesce(qual,'')||'|'||coalesce(with_check,'')) = 34060c39f6f61e65613e15a093222691;
--   · `public.is_active_rh_user()` não existe; o ledger termina em 20261003000001;
--   · `usuarios_rh_user_id_key` (btree único em `user_id`) existe: o helper é uma sonda de índice;
--   · `pg_roles.rolconfig`: `authenticated` e `authenticator` com `statement_timeout=8s`;
--   · candidaturas: 40, todas vivas (`deleted_at IS NULL AND is_rascunho = false`).
--
-- POR QUE OS DOIS SET LOCAL NO TOPO. O `ALTER POLICY` toma `AccessExclusiveLock` em
--   `candidaturas` (tabela quente: listas do RH, painel do candidato) até o fim da transação do
--   apply. Uma leitura que espere mais de ~8 s atrás do lock FALHA (`statement_timeout` de
--   `authenticated`/`authenticator`, medido acima). `lock_timeout = 3s` limita quanto tempo o
--   pedido de lock do apply fica na fila, onde faria toda leitura nova enfileirar atrás dele;
--   `statement_timeout = 5s` limita cada instrução enquanto o lock está seguro. O limite tem de
--   estar NO ARQUIVO, porque o `p46apply.cjs migrate` manda o arquivo byte a byte e o md5 do
--   ledger é o dele. Fora de transação, `SET LOCAL` só emite WARNING e não tem efeito — inócuo
--   para outras ferramentas.
--
-- AUTHZ.
--   · Helper `public.is_active_rh_user()`: plpgsql (idioma da casa: `is_active_rh_admin`,
--     `caso_aberto_sjt_enviado`), STABLE, SECURITY DEFINER (lê `usuarios_rh` como dono, sem
--     recursão de RLS), `SET search_path = ''`, tudo qualificado. Verdadeiro sse existe linha
--     `usuarios_rh` com `user_id = auth.uid()`, `ativo = true` e `deleted_at IS NULL`.
--   · ROLE-AGNÓSTICO de propósito (escolha 2 do planejador, vetável no 50-02): qualquer papel
--     ativo. Todo chamador já exige o claim `rh`, que o `custom_access_token_hook` só emite para
--     `recrutador`. Resíduo aceito: um token emitido enquanto `recrutador` vale ≤ 1 h se a linha
--     for trocada para `visualizador` ainda `ativo`. É o mesmo predicado de `vagas."RH vê todas
--     vagas"` e `candidatos."RH pode ler todos os candidatos"`, que já valem hoje.
--   · POR QUE VIVO E NÃO SÓ O JWT: `jwt_exp = 3600` (config de Auth medida) e «desativar»
--     (`gerenciar-usuario-rh`) não desloga ninguém — é só um UPDATE. Um predicado só de JWT
--     deixaria o recrutador desativado vendo tudo por até 1 h com o token antigo.
--   · ACL: `REVOKE ALL … FROM PUBLIC`, `REVOKE ALL … FROM anon` com `anon` NOMEADO (o
--     `pg_default_acl` concede EXECUTE a `anon` como grant direto), `GRANT EXECUTE … TO
--     authenticated, service_role`. A policy roda com o papel de quem consulta, que precisa de
--     EXECUTE — e é por isso que ela passa a `TO authenticated`.
--   · O ramo do administrador é reescrito com o MESMO texto-fonte de hoje; o pós-portão compara
--     o disjunto desparseado antes e depois.
--
-- POR QUE TO authenticated. Hoje a policy é `{public}`: `anon` a avalia. Com o EXECUTE do helper
--   revogado de `anon`, uma policy `{public}` que o chama faria leituras de `anon` falharem por
--   «permission denied for function», ou — pior — alguém «consertaria» dando EXECUTE a `anon`.
--   `TO authenticated` tira `anon` desta policy: para ele, nenhuma policy nova, negação padrão.
--
-- O RAMO `rh` CONTINUA SÓ COM CANDIDATURAS VIVAS: `deleted_at IS NULL AND is_rascunho = false`
--   (semântica efetiva de hoje, mantida). O administrador segue vendo todas, inclusive mortas.
--   Nenhum filtro esconde dado de teste (`fixture-p46`, vagas `[TESTE]`) — D-07.
--
-- IDEMPOTÊNCIA: o pré-portão exige o helper AUSENTE e a policy com o md5 e os papéis medidos;
--   reaplicar por cima de si mesma aborta em vez de sobrescrever em silêncio. `CREATE FUNCTION`
--   (sem OR REPLACE) é a segunda trava. Nenhum DML de dado.
--
-- EVIDÊNCIA: a Management API não devolve NOTICE; o pós-portão ANEXA o que mediu à GUC de sessão
--   `p50.evidencia` (`01:md5=<novo md5>,anon=…,auth=…`), que o `scripts/p50_ensaio.cjs` copia na
--   linha de veredito do ensaio.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- REVOKE/COMMENT adjacentes é a forma exata do 42601, e o endpoint já roda a requisição inteira
-- numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261005000001_p50_helper_candidaturas.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação). NÃO aplicar
-- antes da review bloqueante do 50-02 (D-12).
-- =============================================================================

-- Limites de espera e de posse do lock (ver «POR QUE OS DOIS SET LOCAL NO TOPO»).
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- PRÉ-PORTÃO — helper ausente; rh_le_candidaturas com o md5 e os papéis medidos. Guarda o
-- disjunto do administrador (texto desparseado antes do primeiro ` OR ` de nível superior) para
-- o pós-portão comparar.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre_portao$
DECLARE
  c_md5   constant text := '34060c39f6f61e65613e15a093222691';
  c_roles constant text := '{public}';
  v_qual  text;
  v_wc    text;
  v_roles text;
  v_md5   text;
  v_depth int := 0;
  v_inq   boolean := false;
  v_cut   int;
  v_ch    text;
  i       int;
BEGIN
  IF to_regprocedure('public.is_active_rh_user()') IS NOT NULL THEN
    RAISE EXCEPTION 'P50-01 PRE-PORTAO: public.is_active_rh_user() JA existe — esta migration o cria; reaplicar por cima sobrescreveria um corpo que ninguem mediu. Medir de novo e decidir A MAO.';
  END IF;

  SELECT p.qual, p.with_check, p.roles::text,
         md5(coalesce(p.qual, '') || '|' || coalesce(p.with_check, ''))
    INTO v_qual, v_wc, v_roles, v_md5
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'candidaturas' AND p.policyname = 'rh_le_candidaturas';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'P50-01 PRE-PORTAO: a policy candidaturas.rh_le_candidaturas nao existe — medir de novo e decidir A MAO.';
  END IF;
  IF v_md5 IS DISTINCT FROM c_md5 THEN
    RAISE EXCEPTION 'P50-01 PRE-PORTAO: md5(qual|with_check) de rh_le_candidaturas = % (medido em 2026-10-05: %) — alguem mudou a policy depois da medicao; medir de novo e decidir A MAO.', v_md5, c_md5;
  END IF;
  IF v_roles IS DISTINCT FROM c_roles THEN
    RAISE EXCEPTION 'P50-01 PRE-PORTAO: roles de rh_le_candidaturas = % (medido: %) — medir de novo e decidir A MAO.', v_roles, c_roles;
  END IF;

  -- Disjunto do administrador: o qual desparseado é `((A) OR (B))`; corta no primeiro ` OR `
  -- de profundidade 1, fora de literal.
  IF left(v_qual, 1) IS DISTINCT FROM '(' THEN
    RAISE EXCEPTION 'P50-01 PRE-PORTAO: qual de rh_le_candidaturas nao comeca com parentese («%») — forma inesperada; medir de novo e decidir A MAO.', left(v_qual, 80);
  END IF;
  FOR i IN 1 .. length(v_qual) LOOP
    v_ch := substr(v_qual, i, 1);
    IF v_ch = '''' THEN
      v_inq := NOT v_inq;
    ELSIF NOT v_inq AND v_ch = '(' THEN
      v_depth := v_depth + 1;
    ELSIF NOT v_inq AND v_ch = ')' THEN
      v_depth := v_depth - 1;
    ELSIF NOT v_inq AND v_depth = 1 AND substr(v_qual, i, 4) = ' OR ' THEN
      v_cut := i;
      EXIT;
    END IF;
  END LOOP;
  IF v_cut IS NULL THEN
    RAISE EXCEPTION 'P50-01 PRE-PORTAO: qual de rh_le_candidaturas sem OR de nivel superior — forma inesperada; medir de novo e decidir A MAO.';
  END IF;
  PERFORM set_config('p50.admin_disjunto', substr(v_qual, 2, v_cut - 2), true);

  RAISE NOTICE 'P50-01 PRE-PORTAO OK — helper ausente ; rh_le_candidaturas md5=% roles=% ; admin=%',
    v_md5, v_roles, current_setting('p50.admin_disjunto');
END
$pre_portao$;


-- ─────────────────────────────────────────────────────────────────────────────
-- public.is_active_rh_user() — o helper VIVO (D-02).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION public.is_active_rh_user()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $helper$
DECLARE
  ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM public.usuarios_rh u
     WHERE u.user_id = (SELECT auth.uid())
       AND u.ativo = true
       AND u.deleted_at IS NULL
  ) INTO ok;
  RETURN coalesce(ok, false);
END
$helper$;

REVOKE ALL ON FUNCTION public.is_active_rh_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_rh_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_active_rh_user() TO authenticated, service_role;

COMMENT ON FUNCTION public.is_active_rh_user() IS
  'P50 / D-02: verdadeiro sse o chamador (auth.uid()) tem linha em usuarios_rh com ativo = true e deleted_at IS NULL — lida AO VIVO, porque o JWT vive 3600 s e desativar nao desloga. Role-agnostico de proposito: todo chamador ja exige o claim rh, que o hook so emite para recrutador. plpgsql SECURITY DEFINER, search_path vazio: le usuarios_rh como dono, sem recursao de RLS. ACL: anon sem EXECUTE (nomeado); authenticated e service_role com.';


-- ─────────────────────────────────────────────────────────────────────────────
-- rh_le_candidaturas — ramo `rh` pelo helper, sem posse; administrador com o texto de hoje.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER POLICY rh_le_candidaturas ON public.candidaturas
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (deleted_at IS NULL) AND (is_rascunho = false) AND (SELECT public.is_active_rh_user()))
  );

COMMENT ON POLICY rh_le_candidaturas ON public.candidaturas IS
  'P50 / D-01, D-02: rh ATIVO (helper vivo is_active_rh_user) ve todas as candidaturas vivas (deleted_at IS NULL, is_rascunho = false) de todas as vagas, de qualquer status — sem posse da vaga; administrador inalterado (ve todas). TO authenticated: anon nao avalia esta policy.';


-- ─────────────────────────────────────────────────────────────────────────────
-- PÓS-PORTÃO — o que ficou no catálogo é o que este arquivo diz.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos_portao$
DECLARE
  c_sig    constant text := 'public.is_active_rh_user()';
  v_secdef boolean;
  v_vol    "char";
  v_conf   text[];
  v_anon   boolean;
  v_auth   boolean;
  v_qual   text;
  v_wc     text;
  v_roles  text;
  v_md5    text;
  v_admin  text;
  v_depth  int := 0;
  v_inq    boolean := false;
  v_cut    int;
  v_ch     text;
  i        int;
BEGIN
  SELECT p.prosecdef, p.provolatile, p.proconfig INTO v_secdef, v_vol, v_conf
    FROM pg_catalog.pg_proc p WHERE p.oid = c_sig::regprocedure;
  IF v_secdef IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P50-01 POS-PORTAO: % nao e SECURITY DEFINER — sem ela o helper leria usuarios_rh pela RLS de quem consulta', c_sig;
  END IF;
  IF v_vol IS DISTINCT FROM 's' THEN
    RAISE EXCEPTION 'P50-01 POS-PORTAO: % nao e STABLE (provolatile = %)', c_sig, v_vol;
  END IF;
  IF v_conf IS NULL OR NOT ('search_path=""' = ANY (v_conf)) THEN
    RAISE EXCEPTION 'P50-01 POS-PORTAO: % sem search_path vazio (proconfig = %)', c_sig, v_conf;
  END IF;
  v_anon := has_function_privilege('anon',          c_sig::regprocedure, 'EXECUTE');
  v_auth := has_function_privilege('authenticated', c_sig::regprocedure, 'EXECUTE');
  IF v_anon THEN
    RAISE EXCEPTION 'P50-01 POS-PORTAO: anon tem EXECUTE em % — o grant do pg_default_acl e DIRETO; o REVOKE nominal falhou', c_sig;
  END IF;
  IF NOT v_auth THEN
    RAISE EXCEPTION 'P50-01 POS-PORTAO: authenticated sem EXECUTE em % — a policy roda com o papel de quem consulta e falharia para todo RH', c_sig;
  END IF;

  SELECT p.qual, p.with_check, p.roles::text,
         md5(coalesce(p.qual, '') || '|' || coalesce(p.with_check, ''))
    INTO v_qual, v_wc, v_roles, v_md5
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'candidaturas' AND p.policyname = 'rh_le_candidaturas';
  IF v_roles IS DISTINCT FROM '{authenticated}' THEN
    RAISE EXCEPTION 'P50-01 POS-PORTAO: roles de rh_le_candidaturas = % (esperado {authenticated})', v_roles;
  END IF;
  -- Desparse mostra o helper SEM o schema quando `public` está no search_path: casar o nome solto.
  IF position('is_active_rh_user' IN coalesce(v_qual, '')) = 0 THEN
    RAISE EXCEPTION 'P50-01 POS-PORTAO: o qual de rh_le_candidaturas nao chama is_active_rh_user: %', v_qual;
  END IF;
  IF coalesce(v_qual, '') || coalesce(v_wc, '') ~* 'created_by' THEN
    RAISE EXCEPTION 'P50-01 POS-PORTAO: rh_le_candidaturas ainda casa created_by: %', v_qual;
  END IF;

  FOR i IN 1 .. length(v_qual) LOOP
    v_ch := substr(v_qual, i, 1);
    IF v_ch = '''' THEN
      v_inq := NOT v_inq;
    ELSIF NOT v_inq AND v_ch = '(' THEN
      v_depth := v_depth + 1;
    ELSIF NOT v_inq AND v_ch = ')' THEN
      v_depth := v_depth - 1;
    ELSIF NOT v_inq AND v_depth = 1 AND substr(v_qual, i, 4) = ' OR ' THEN
      v_cut := i;
      EXIT;
    END IF;
  END LOOP;
  v_admin := CASE WHEN v_cut IS NULL OR left(v_qual, 1) <> '(' THEN NULL ELSE substr(v_qual, 2, v_cut - 2) END;
  IF v_admin IS DISTINCT FROM current_setting('p50.admin_disjunto', true) THEN
    RAISE EXCEPTION 'P50-01 POS-PORTAO: o disjunto do administrador mudou — antes «%», depois «%» (D-02: byte-identico)',
      current_setting('p50.admin_disjunto', true), v_admin;
  END IF;

  PERFORM set_config('p50.evidencia',
    concat_ws(';', nullif(current_setting('p50.evidencia', true), ''),
              format('01:md5=%s,anon=%s,auth=%s', v_md5, v_anon, v_auth)),
    false);

  RAISE NOTICE 'P50-01 POS-PORTAO OK — helper DEFINER/STABLE/search_path vazio, anon=% authenticated=% ; rh_le_candidaturas roles=% md5=% ; admin inalterado',
    v_anon, v_auth, v_roles, v_md5;
END
$pos_portao$;
