-- =============================================================================
-- Migration 20261008000003 — a fila de revisões do RH com as TRÊS origens, o id do pedido e o
--                            contexto do knockout
-- Phase 51 / Plano 51-10 · JORN-42 · D-10, D-11, D-12, D-33, C-12
-- =============================================================================
--
-- O QUE ESTAVA ERRADO. A 20261008000002 deu a toda rejeição um pedido de revisão (registro
-- próprio `public.revisao_rejeicao`), mas a FILA do RH (`listar_revisoes_decisao`) e o CONTADOR do
-- menu (`contar_revisoes_pendentes`) só liam `decisao_final`. Um pedido de rejeição pelo RH ou de
-- knockout ficaria invisível para quem tem de respondê-lo — o direito existiria só no papel.
--
-- O QUE MUDA.
--   1. `listar_revisoes_decisao(boolean)` passa a ser o `UNION ALL` de `decisao_final`
--      (`origem = 'humana'`, `pedido_id = decisao_final.id`) e `revisao_rejeicao` (`origem` do
--      pedido — `humana_triagem` ou `automatica` —, `pedido_id = revisao_rejeicao.id`), com DUAS
--      colunas novas NO FIM do `RETURNS TABLE`: `origem text` e `pedido_id uuid` (os consumidores
--      leem por nome). Vocabulário único do sistema; os selos «Decisão final», «Rejeição pelo RH»
--      e «Knockout» (D-33) são do cliente (51-14).
--      · Mesma guarda de papel fail-closed (`coalesce(v_role, '')`, `sub` obrigatório), o MESMO
--        escopo do P50 (`administrador`, ou `rh` ATIVO pelo helper `public.is_active_rh_user()`)
--        em CADA ramo, o mesmo `LIMIT 200` — agora sobre o conjunto.
--      · Ordem `revisao_solicitada_em, pedido_id`: o desempate é o C-12 (uma candidatura pode ter
--        DUAS linhas na fila — a revisão de uma rejeição pelo RH e, depois da reabertura, a da
--        decisão final —, e a ordem só por candidatura/tempo deixaria o empate indeterminado).
--      · Ramo novo: `decisao = 'rejeitado'`; `decidido_por_nome` pelo `usuarios_rh` de
--        `rejeitado_por` (NULL no knockout — sem autor); `pode_responder` = `respondida_em IS NULL
--        AND rejeitado_por IS DISTINCT FROM auth.uid()` (REVISAO-05; no knockout qualquer RH
--        ativo, D-10). É espelho COSMÉTICO: quem impede é `responder_revisao_rejeicao`.
--      · Nada de `justificativa` nem de UUID de funcionário no retorno (p42 (d)).
--   2. `contar_revisoes_pendentes()` soma as DUAS fontes com EXATAMENTE o predicado de pendência e
--      o escopo da fila (`listar_revisoes_decisao(false)`), ramo a ramo — mesmas junções. Tipo de
--      retorno inalterado. Invariante do P50: a contagem e a fila não divergem.
--   3. `ler_contexto_knockout_revisao(uuid) RETURNS jsonb` (D-11) — nova: ao responder a revisão de
--      um knockout, o RH vê a pergunta eliminatória, a resposta do candidato e a opção que eliminou.
--      Guarda de papel e `is_active_rh_user()` ANTES de qualquer busca (sem oráculo de existência);
--      pedido de origem `automatica`, senão P0002. Resolve `revisao_rejeicao.opcao_knockout_id →
--      pergunta_opcao_metadata (opção da vaga da candidatura) → perguntas_formulario` e a resposta
--      em `respostas_formulario`. Devolve `{situacao, pergunta, resposta, opcao_eliminatoria}`:
--      `disponivel`; `removida` quando o motor de exclusão já apagou as respostas (o resto vem
--      nulo — a opção que eliminou É a resposta); `indisponivel` quando a opção não resolve. Não é
--      dado novo para o RH (D-11): ele já lê essas tabelas por RLS de RH ativo (medido no
--      51-RESEARCH). Uma RPC de detalhe em vez de engordar a fila (p42 (d)).
--
-- TROCA DE `RETURNS TABLE` ⇒ DROP + CREATE + ACL RECRIADA POR DIFERENÇA. `CREATE OR REPLACE` não
--   troca o tipo de retorno (42P13). O DROP é SEM a cláusula de cascata: o PRE-PORTAO conta os
--   dependentes em `pg_depend` e recusa se houver algum (medido: nenhum). O CREATE nasce com o ACL
--   padrão do schema (PUBLIC e o `pg_default_acl` de `public`, que concede a anon); o bloco `$acl$`
--   volta ao CONJUNTO capturado no PRE (revoga o que sobra, concede o que falta) e o POS confere
--   o conjunto. O comentário é recriado (o anterior dizia «11 colunas»; agora são 13).
--
-- ⚠ OBSOLESCÊNCIA — `supabase/tests/p50_desfazer_expansao.sql`. Aquele arquivo é GERADO (NÃO
--   EDITAR À MÃO) e restaura os corpos PRÉ-P50 de `listar_revisoes_decisao`,
--   `contar_revisoes_pendentes` e `funil_kpis`. Aplicado depois DESTA migration ele aborta em
--   `listar_revisoes_decisao` (o `CREATE OR REPLACE` dele não troca o tipo de retorno de 13 para 11
--   colunas) e, se alguém o «consertasse» para passar, APAGARIA o JORN-42 da fila e do contador (e
--   o D-35 do funil). Ele não pode ser regerado: a captura pré-P50 não existe mais. Por isso não
--   serve mais de base de migration corretiva para essas três funções — o gerador
--   `scripts/p50_desfazer.cjs` recusa (`OBSOLETO`) quando o ledger tem 20261008000003.
--
-- MEDIDO EM PROD (só leitura, 2026-10-09, Passo 0 do 51-10; igual ao Passo 0 do 51-08):
--   função                                md5(prosrc)                        md5(functiondef)
--   listar_revisoes_decisao(boolean)      85642fe45f6bb786fc7e965476b727a6   a3889a20…
--   contar_revisoes_pendentes()           63b7abffd3eee25a26810d9fc01fbadf   1c5f3ccb…
--   As duas: plpgsql, STABLE, SECURITY DEFINER, `search_path=""`, dono postgres, ACL
--   {postgres, authenticated, service_role} (sem PUBLIC, sem anon), com comentário. O corpo de
--   partida é o `pg_get_functiondef` VIVO (= o do arquivo 20261005000003). Nenhum dependente em
--   `pg_depend`. `ler_contexto_knockout_revisao` ausente. Cabeça do ledger: 20261008000001.
--
-- PRE-PORTAO (P51-03): `revisao_rejeicao` presente (a 0002 vem antes); helper presente; a função
--   nova ausente; md5(prosrc) de cada função reescrita = o medido (senão RAISE e nada muda);
--   captura em GUCs LOCAIS das propriedades, do tipo de retorno, do CONJUNTO do ACL e do
--   comentário; impressão digital D-08 do motor de exclusão.
-- POS-PORTAO (P51-03, fila): `listar` com `origem`/`pedido_id` e sem `justificativa`; propriedades
--   e ACL iguais às capturadas (o `result` de `listar` é a exceção deliberada e declarada:
--   o capturado + as duas colunas novas); `anon` sem EXECUTE nas três; marcadores no código sem
--   comentários; anexa `03a:…` a `p51.evidencia`.
--
-- LOCK. DROP/CREATE/CREATE OR REPLACE de função tocam só linhas de `pg_proc` (lock de objeto da
--   função, sem lock de tabela de dados). `lock_timeout`/`statement_timeout` são as DUAS primeiras
--   instruções; `55P03`/`57014` = fila, não a migration — repetir depois, nunca subir o teto.
--
-- IDEMPOTÊNCIA. Não é reaplicável por desenho: o PRE-PORTAO recusa o md5 novo e a função nova já
--   existente; o `p46apply migrate` recusa versão já no ledger.
--
-- EVIDÊNCIA. `03a:…` em `p51.evidencia`; prova comportamental no smoke
--   `supabase/tests/p51_revisao_rejeicao_smoke.sql` (cláusulas (l), (m), (n)), só pelo ensaio que
--   aborta; mutações MC1a..MC5 em `scripts/p51_mutacoes.cjs`; regressão p42/p50 com esta migration
--   prefixada.
--
-- NÃO APLICADA NO 51-10: o apply é do portão 51-16 (review bloqueante, D-12 da 50). Todo uso em
-- PROD neste plano é ensaio que aborta.
--
-- SEM `BEGIN; … COMMIT;`: o endpoint da Management API já roda a requisição inteira (esta
-- migration + a linha do ledger) numa única transação (CLAUDE.md §«Via de apply ATUAL»).
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261008000003_p51_fila_tres_origens.sql
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P51-03 PRE-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  r       record;
  v_oid   oid;
  v_md5   text;
  v_props text;
  v_res   text;
  v_acl   text;
  v_raw   text;
  v_com   text;
  v_esc   text[] := '{}';
  v_dep   bigint;
  v_d08   text;
  v_d08n  int;
  v_nomes int;
BEGIN
  IF pg_catalog.to_regclass('public.revisao_rejeicao') IS NULL THEN
    RAISE EXCEPTION 'P51-03 PRE-PORTAO: public.revisao_rejeicao nao existe — aplicar 20261008000002 primeiro (a fila nova le o registro do pedido); nada mudou';
  END IF;
  IF pg_catalog.to_regprocedure('public.is_active_rh_user()') IS NULL THEN
    RAISE EXCEPTION 'P51-03 PRE-PORTAO: public.is_active_rh_user() nao existe — as funcoes desta migration chamam o helper; nada mudou';
  END IF;
  IF pg_catalog.to_regprocedure('public.ler_contexto_knockout_revisao(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'P51-03 PRE-PORTAO: public.ler_contexto_knockout_revisao(uuid) JA existe — esta migration nao e reaplicavel; nada mudou';
  END IF;

  -- ESCOPO DELIBERADO deste arquivo, não fotografia (CLAUDE.md §Portões): as funções que ele
  -- reescreve, cada uma com o md5(prosrc) medido em 2026-10-09.
  FOR r IN
    SELECT * FROM (VALUES
      ('public.listar_revisoes_decisao(boolean)', 'listar_revisoes_decisao',   '85642fe45f6bb786fc7e965476b727a6'),
      ('public.contar_revisoes_pendentes()',      'contar_revisoes_pendentes', '63b7abffd3eee25a26810d9fc01fbadf')
    ) AS e(sig, nome, md5)
  LOOP
    v_oid := pg_catalog.to_regprocedure(r.sig);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'P51-03 PRE-PORTAO: % nao existe — medir de novo e decidir A MAO; nada mudou', r.sig;
    END IF;
    SELECT md5(p.prosrc),
           concat_ws(' | ',
             'config=' || coalesce(p.proconfig::text, '<nulo>'),
             'vol=' || p.provolatile::text,
             'definer=' || p.prosecdef::text,
             'lang=' || l.lanname,
             'dono=' || pg_catalog.pg_get_userbyid(p.proowner),
             'kind=' || p.prokind::text,
             'strict=' || p.proisstrict::text,
             'leakproof=' || p.proleakproof::text,
             'parallel=' || p.proparallel::text,
             'retset=' || p.proretset::text,
             'args=' || pg_catalog.pg_get_function_arguments(p.oid),
             'idargs=' || pg_catalog.pg_get_function_identity_arguments(p.oid)),
           pg_catalog.pg_get_function_result(p.oid),
           (SELECT coalesce(string_agg(x, ',' ORDER BY x), '')
              FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':' || a.is_grantable::text AS x
                      FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s),
           coalesce(p.proacl::text, ''),
           coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '')
      INTO v_md5, v_props, v_res, v_acl, v_raw, v_com
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_language l ON l.oid = p.prolang
     WHERE p.oid = v_oid;
    IF v_md5 IS DISTINCT FROM r.md5 THEN
      RAISE EXCEPTION 'P51-03 PRE-PORTAO: md5(prosrc) de % = % (medido em 2026-10-09: %) — alguem mudou o corpo depois da medicao (ou esta migration ja rodou); este arquivo partiu do corpo medido e apagaria a mudanca em silencio. Medir de novo e reconciliar A MAO; nada mudou', r.sig, v_md5, r.md5;
    END IF;
    IF v_raw = '' THEN
      RAISE EXCEPTION 'P51-03 PRE-PORTAO: % com proacl NULO (= EXECUTE para PUBLIC por padrao) — medido com ACL explicita; nada mudou', r.sig;
    END IF;
    IF v_com = '' THEN
      RAISE EXCEPTION 'P51-03 PRE-PORTAO: % sem comentario — medido com comentario; nada mudou', r.sig;
    END IF;
    PERFORM set_config('p51.p03.' || r.nome || '.props', v_props, true);
    PERFORM set_config('p51.p03.' || r.nome || '.result', v_res, true);
    PERFORM set_config('p51.p03.' || r.nome || '.aclset', v_acl, true);
    v_esc := v_esc || r.sig;
  END LOOP;

  -- DROP sem cascata: um dependente faria o DROP falhar; aqui a recusa vem com o motivo.
  SELECT count(*) INTO v_dep
    FROM pg_catalog.pg_depend d
   WHERE d.refclassid = 'pg_catalog.pg_proc'::regclass
     AND d.refobjid = pg_catalog.to_regprocedure('public.listar_revisoes_decisao(boolean)')
     AND d.deptype = 'n';
  IF v_dep <> 0 THEN
    RAISE EXCEPTION 'P51-03 PRE-PORTAO: listar_revisoes_decisao(boolean) tem % dependente(s) em pg_depend — o DROP + CREATE os quebraria; medir e decidir A MAO; nada mudou', v_dep;
  END IF;

  -- D-08 (idioma P50): o motor de exclusão sai desta transação como entrou — impressão digital da
  -- LINHA INTEIRA de pg_proc. Piso: os DOIS nomes presentes (senão antes = depois por vacuidade).
  SELECT count(*)::int,
         count(DISTINCT p.proname)::int,
         string_agg(p.oid::regprocedure::text || '=' || md5(to_jsonb(p)::text), ',' ORDER BY p.oid)
    INTO v_d08n, v_nomes, v_d08
    FROM pg_catalog.pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace
     AND p.proname IN ('anonimizar_candidato', 'plano_exclusao_titular');
  IF v_nomes IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'P51-03 PRE-PORTAO: D-08 — so % dos 2 nomes do motor de exclusao existem (% sobrecargas); a prova antes = depois seria vacua; nada mudou', v_nomes, v_d08n;
  END IF;
  PERFORM set_config('p51.p03.d08', v_d08, true);
  PERFORM set_config('p51.p03.d08n', v_d08n::text, true);
  PERFORM set_config('p51.p03.escopo', array_to_string(v_esc, ';'), true);
END
$pre$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · listar_revisoes_decisao — DROP + CREATE (tipo de retorno novo)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION public.listar_revisoes_decisao(boolean);

CREATE FUNCTION public.listar_revisoes_decisao(p_incluir_respondidos boolean DEFAULT false)
 RETURNS TABLE(candidatura_id uuid, candidato_nome text, vaga_titulo text, decisao text, decidido_por_nome text, revisao_solicitada_em timestamp with time zone, revisao_respondida_em timestamp with time zone, revisao_veredito text, revisao_resultado text, respondida_por_nome text, pode_responder boolean, origem text, pedido_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_uid  uuid := auth.uid();
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
BEGIN
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT f.x_candidatura_id, f.x_candidato_nome, f.x_vaga_titulo, f.x_decisao, f.x_decidido_por_nome,
         f.x_solicitada_em, f.x_respondida_em, f.x_veredito, f.x_resultado, f.x_respondida_por_nome,
         f.x_pode_responder, f.x_origem, f.x_pedido_id
    FROM (
      -- Ramo 1 · a decisão final (origem 'humana'). Corpo do P50, coluna a coluna.
      SELECT
          d.candidatura_id                AS x_candidatura_id,
          ca.nome_completo::text          AS x_candidato_nome,
          vg.titulo::text                 AS x_vaga_titulo,
          d.decisao::text                 AS x_decisao,
          (SELECT ur.nome_completo::text
             FROM public.usuarios_rh ur
            WHERE ur.user_id = d.por_usuario
            ORDER BY ur.deleted_at ASC NULLS FIRST
            LIMIT 1)                      AS x_decidido_por_nome,
          d.revisao_solicitada_em         AS x_solicitada_em,
          d.revisao_respondida_em         AS x_respondida_em,
          d.revisao_veredito              AS x_veredito,
          d.revisao_resultado             AS x_resultado,
          (SELECT ur.nome_completo::text
             FROM public.usuarios_rh ur
            WHERE ur.user_id = d.revisao_por_usuario
            ORDER BY ur.deleted_at ASC NULLS FIRST
            LIMIT 1)                      AS x_respondida_por_nome,
          (d.revisao_respondida_em IS NULL AND d.por_usuario IS DISTINCT FROM v_uid) AS x_pode_responder,
          'humana'::text                  AS x_origem,
          d.id                            AS x_pedido_id
        FROM public.decisao_final d
        JOIN public.candidaturas c  ON c.id  = d.candidatura_id
        JOIN public.candidatos   ca ON ca.id = c.candidato_id
        JOIN public.vagas        vg ON vg.id = c.vaga_id
       WHERE d.revisao_solicitada_em IS NOT NULL
         AND (p_incluir_respondidos OR d.revisao_respondida_em IS NULL)
         -- P50 / D-03: o ramo rh é o conjunto do administrador (rh ATIVO pelo helper vivo).
         AND (
              v_role = 'administrador'
              OR (v_role = 'rh' AND public.is_active_rh_user())
             )
      UNION ALL
      -- Ramo 2 · o registro próprio do pedido (P51 / JORN-42, D-10): rejeição pelo RH em qualquer
      -- etapa (origem 'humana_triagem') e knockout (origem 'automatica'). O MESMO escopo.
      SELECT
          rr.candidatura_id,
          ca.nome_completo::text,
          vg.titulo::text,
          'rejeitado'::text,
          -- NULL no knockout: não há autor (a tela diz «Automático», não «Não identificado»).
          (SELECT ur.nome_completo::text
             FROM public.usuarios_rh ur
            WHERE ur.user_id = rr.rejeitado_por
            ORDER BY ur.deleted_at ASC NULLS FIRST
            LIMIT 1),
          rr.solicitada_em,
          rr.respondida_em,
          rr.veredito,
          rr.resultado,
          (SELECT ur.nome_completo::text
             FROM public.usuarios_rh ur
            WHERE ur.user_id = rr.respondida_por
            ORDER BY ur.deleted_at ASC NULLS FIRST
            LIMIT 1),
          -- REVISAO-05: quem rejeitou não responde; no knockout (rejeitado_por NULL) qualquer RH ativo.
          (rr.respondida_em IS NULL AND rr.rejeitado_por IS DISTINCT FROM v_uid),
          rr.origem,
          rr.id
        FROM public.revisao_rejeicao rr
        JOIN public.candidaturas c  ON c.id  = rr.candidatura_id
        JOIN public.candidatos   ca ON ca.id = c.candidato_id
        JOIN public.vagas        vg ON vg.id = c.vaga_id
       WHERE (p_incluir_respondidos OR rr.respondida_em IS NULL)
         AND (
              v_role = 'administrador'
              OR (v_role = 'rh' AND public.is_active_rh_user())
             )
    ) f
   -- C-12: desempate pelo id do pedido (uma candidatura pode ter duas linhas).
   ORDER BY f.x_solicitada_em ASC, f.x_pedido_id ASC
   LIMIT 200;
END;
$function$;

-- ACL POR DIFERENÇA: volta ao conjunto capturado no PRE (o CREATE nasce com o ACL padrão).
DO $acl$
DECLARE
  v_oid   oid := 'public.listar_revisoes_decisao(boolean)'::regprocedure;
  v_alvo  text[] := string_to_array(nullif(current_setting('p51.p03.listar_revisoes_decisao.aclset', true), ''), ',');
  v_agora text[];
  x       text;
  g       text;
BEGIN
  IF v_alvo IS NULL THEN
    RAISE EXCEPTION 'P51-03 ACL: conjunto capturado ausente — o PRE-PORTAO nao rodou nesta transacao';
  END IF;
  SELECT array_agg(coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':' || a.is_grantable::text)
    INTO v_agora
    FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
   WHERE p.oid = v_oid;
  FOREACH x IN ARRAY coalesce(v_agora, '{}'::text[]) LOOP
    IF NOT (x = ANY (v_alvo)) THEN
      g := split_part(x, ':', 1);
      EXECUTE format('REVOKE %s ON FUNCTION public.listar_revisoes_decisao(boolean) FROM %s',
                     split_part(x, ':', 2), CASE WHEN g = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(g) END);
    END IF;
  END LOOP;
  FOREACH x IN ARRAY v_alvo LOOP
    IF NOT (x = ANY (coalesce(v_agora, '{}'::text[]))) THEN
      g := split_part(x, ':', 1);
      EXECUTE format('GRANT %s ON FUNCTION public.listar_revisoes_decisao(boolean) TO %s%s',
                     split_part(x, ':', 2), CASE WHEN g = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(g) END,
                     CASE WHEN split_part(x, ':', 3) = 'true' THEN ' WITH GRANT OPTION' ELSE '' END);
    END IF;
  END LOOP;
END
$acl$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · contar_revisoes_pendentes — as duas fontes, o predicado da fila
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.contar_revisoes_pendentes()
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid  uuid := auth.uid();
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
  v_n    integer;
BEGIN
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- ⚠ INVARIANTE (P50, D-10 da 51): ramo a ramo, as junções, o predicado de pendência e o escopo
  -- abaixo são os de listar_revisoes_decisao(false). Se divergirem, o badge conta o que a fila não
  -- mostra. O smoke (m) do p51_revisao_rejeicao assere a igualdade com pedido respondido na fixture.
  SELECT
    (SELECT count(*)
       FROM public.decisao_final d
       JOIN public.candidaturas c  ON c.id  = d.candidatura_id
       JOIN public.candidatos   ca ON ca.id = c.candidato_id
       JOIN public.vagas        vg ON vg.id = c.vaga_id
      WHERE d.revisao_solicitada_em IS NOT NULL
        AND d.revisao_respondida_em IS NULL
        AND (
             v_role = 'administrador'
             OR (v_role = 'rh' AND public.is_active_rh_user())
            ))
    +
    (SELECT count(*)
       FROM public.revisao_rejeicao rr
       JOIN public.candidaturas c  ON c.id  = rr.candidatura_id
       JOIN public.candidatos   ca ON ca.id = c.candidato_id
       JOIN public.vagas        vg ON vg.id = c.vaga_id
      WHERE rr.respondida_em IS NULL
        AND (
             v_role = 'administrador'
             OR (v_role = 'rh' AND public.is_active_rh_user())
            ))
    INTO v_n;

  RETURN v_n;
END;
$function$;

REVOKE ALL ON FUNCTION public.contar_revisoes_pendentes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.contar_revisoes_pendentes() FROM anon;
GRANT EXECUTE ON FUNCTION public.contar_revisoes_pendentes() TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · ler_contexto_knockout_revisao — D-11
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION public.ler_contexto_knockout_revisao(p_pedido_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_uid     uuid := auth.uid();
  v_role    text := (select auth.jwt() #>> '{app_metadata,role}');
  v_cand    uuid;
  v_origem  text;
  v_opcao   uuid;
  v_vaga    uuid;
  v_perg    uuid;
  v_texto   text;
  v_opc     text;
  v_opcoes  jsonb;
  v_rtexto  text;
  v_rnum    numeric;
  v_resp    text;
BEGIN
  -- Papel fail-closed (coalesce: sem JWT -> 42501) e sub obrigatório.
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  -- D-02 da 50: rh ATIVO, ANTES de qualquer busca — o token velho não aprende se o pedido existe.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT r.candidatura_id, r.origem, r.opcao_knockout_id
    INTO v_cand, v_origem, v_opcao
    FROM public.revisao_rejeicao r
   WHERE r.id = p_pedido_id;
  IF NOT FOUND OR v_origem IS DISTINCT FROM 'automatica' THEN
    RAISE EXCEPTION 'pedido de revisao de knockout inexistente' USING ERRCODE = 'no_data_found';
  END IF;

  -- O motor de exclusão apaga as respostas do titular: sem elas, nada do contexto sai (a opção
  -- que eliminou É a resposta).
  IF NOT EXISTS (SELECT 1 FROM public.respostas_formulario rf WHERE rf.candidatura_id = v_cand) THEN
    RETURN jsonb_build_object('situacao', 'removida', 'pergunta', NULL, 'resposta', NULL, 'opcao_eliminatoria', NULL);
  END IF;

  -- A opção é única por PERGUNTA (não globalmente): resolve-se dentro da vaga da candidatura.
  SELECT c.vaga_id INTO v_vaga FROM public.candidaturas c WHERE c.id = v_cand;
  SELECT m.pergunta_id, m.opcao_texto, p.texto_pergunta
    INTO v_perg, v_opc, v_texto
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario p ON p.id = m.pergunta_id
   WHERE m.opcao_id = v_opcao
     AND p.vaga_id = v_vaga
   ORDER BY p.ordem, m.id
   LIMIT 1;
  IF v_perg IS NULL THEN
    RETURN jsonb_build_object('situacao', 'indisponivel', 'pergunta', NULL, 'resposta', NULL, 'opcao_eliminatoria', NULL);
  END IF;

  SELECT rf.resposta_opcoes, rf.resposta_texto, rf.resposta_numerica
    INTO v_opcoes, v_rtexto, v_rnum
    FROM public.respostas_formulario rf
   WHERE rf.candidatura_id = v_cand
     AND rf.pergunta_id = v_perg;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('situacao', 'removida', 'pergunta', NULL, 'resposta', NULL, 'opcao_eliminatoria', NULL);
  END IF;

  v_resp := nullif(btrim(coalesce(
              CASE WHEN jsonb_typeof(v_opcoes) = 'array'
                   THEN (SELECT string_agg(e.txt, ', ' ORDER BY e.ord)
                           FROM jsonb_array_elements_text(v_opcoes) WITH ORDINALITY AS e(txt, ord)) END,
              v_rtexto,
              v_rnum::text,
              '')), '');
  IF v_resp IS NULL OR btrim(coalesce(v_texto, '')) = '' OR btrim(coalesce(v_opc, '')) = '' THEN
    RETURN jsonb_build_object('situacao', 'indisponivel', 'pergunta', NULL, 'resposta', NULL, 'opcao_eliminatoria', NULL);
  END IF;

  RETURN jsonb_build_object('situacao', 'disponivel', 'pergunta', v_texto, 'resposta', v_resp, 'opcao_eliminatoria', v_opc);
END;
$function$;

REVOKE ALL ON FUNCTION public.ler_contexto_knockout_revisao(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ler_contexto_knockout_revisao(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ler_contexto_knockout_revisao(uuid) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- Comentários
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.listar_revisoes_decisao(boolean) IS
  'Leitor da fila de revisao Art. 20 (REVISAO-02), com as TRES origens (P51 / JORN-42, D-10, D-12, C-12): '
  'UNION ALL de decisao_final (origem humana, pedido_id = decisao_final.id) e revisao_rejeicao (origem '
  'humana_triagem = rejeicao pelo RH em qualquer etapa, automatica = knockout; pedido_id = revisao_rejeicao.id). '
  'RETURNS TABLE com 13 colunas NOMEADAS — as 11 de antes + origem e pedido_id no fim — nunca SETOF de uma '
  'tabela, que arrastaria toda coluna futura; NAO projeta decisao_final.justificativa (texto interno do '
  'recrutador) nem UUID de funcionario. Ordem revisao_solicitada_em, pedido_id (desempate C-12: uma '
  'candidatura pode ter duas linhas); LIMIT 200 sobre o conjunto. Escopo explicito DENTRO do DEFINER, em '
  'CADA ramo, porque SECURITY DEFINER bypassa RLS — P50 / D-03: administrador, ou rh ATIVO pelo helper vivo '
  'public.is_active_rh_user, com a MESMA fila (sem posse da vaga, sem filtro proprio do ramo rh). Guard '
  'FAIL-CLOSED: papel resolvido com coalesce (sem JWT -> 42501) e sub obrigatorio. pode_responder (por '
  'chamador: REVISAO-05 — quem decidiu/rejeitou nao responde; no knockout, sem autor, qualquer RH ativo) e '
  'espelho COSMETICO do guard — quem impede e o RPC de escrita. decidido_por_nome NULL no knockout. '
  'Recriada por DROP + CREATE em 20261008000003 (troca de RETURNS TABLE), com o ACL capturado: REVOKE de '
  'PUBLIC e de anon, GRANT EXECUTE a authenticated e service_role.';
COMMENT ON FUNCTION public.contar_revisoes_pendentes() IS
  'Contador de revisoes Art. 20 pendentes para o badge da sidebar do RH, sobre as DUAS fontes (P51 / '
  'JORN-42, D-10): decisao_final com revisao pendente + revisao_rejeicao sem resposta. ⚠ INVARIANTE: ramo a '
  'ramo, as juncoes, o predicado de pendencia e o escopo sao OS MESMOS de listar_revisoes_decisao(false) — '
  'se divergirem, o badge conta o que a fila nao mostra (o smoke (m) de p51_revisao_rejeicao assere a '
  'igualdade, com um pedido respondido na fixture). Escopo (P50 / D-03): administrador, ou rh ATIVO pelo '
  'helper vivo public.is_active_rh_user — a MESMA fila do administrador, sem posse da vaga. Sem cap: um '
  'contador truncado mentiria por construcao. Guard FAIL-CLOSED: papel resolvido com coalesce (sem JWT -> '
  '42501, nunca no-op) e sub obrigatorio. REVOKE de PUBLIC e de anon, GRANT EXECUTE a authenticated.';
COMMENT ON FUNCTION public.ler_contexto_knockout_revisao(uuid) IS
  'P51 / JORN-42 (D-11): ao responder a revisao de um KNOCKOUT, o RH ve a pergunta eliminatoria, a resposta '
  'do candidato e a opcao que eliminou. Devolve {situacao, pergunta, resposta, opcao_eliminatoria}: '
  'disponivel | removida (o motor de exclusao apagou as respostas — o resto vem nulo, porque a opcao que '
  'eliminou E a resposta) | indisponivel (a opcao nao resolve na vaga). Guarda FAIL-CLOSED (sem sub ou sem '
  'papel rh/administrador: 42501) e, no ramo rh, public.is_active_rh_user ANTES de qualquer busca (o token '
  'de recrutador desativado recebe 42501 sem aprender se o pedido existe). Pedido inexistente ou de origem '
  'que nao e automatica: P0002. Nao e dado novo para o RH: ele ja le perguntas_formulario, '
  'pergunta_opcao_metadata e respostas_formulario por RLS de RH ativo; a RPC so evita engordar a fila (p42 '
  '(d)). STABLE SECURITY DEFINER, search_path vazio. REVOKE de PUBLIC e de anon NOMINALMENTE '
  '(pg_default_acl), GRANT EXECUTE a authenticated.';


-- ─────────────────────────────────────────────────────────────────────────────
-- P51-03 POS-PORTAO (fila)
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos_fila$
DECLARE
  v_sig   text;
  v_nome  text;
  v_oid   oid;
  v_src   text;
  v_cod   text;
  v_props text;
  v_res   text;
  v_acl   text;
  v_com   text;
  v_esp   text;
  v_ev    text[] := '{}';
  k       text;
BEGIN
  IF nullif(current_setting('p51.p03.escopo', true), '') IS NULL THEN
    RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): escopo do PRE-PORTAO ausente — o PRE nao rodou nesta transacao';
  END IF;

  FOREACH v_sig IN ARRAY ARRAY['public.listar_revisoes_decisao(boolean)', 'public.contar_revisoes_pendentes()'] LOOP
    v_oid := pg_catalog.to_regprocedure(v_sig);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): % sumiu', v_sig;
    END IF;
    SELECT p.proname, p.prosrc,
           concat_ws(' | ',
             'config=' || coalesce(p.proconfig::text, '<nulo>'),
             'vol=' || p.provolatile::text,
             'definer=' || p.prosecdef::text,
             'lang=' || l.lanname,
             'dono=' || pg_catalog.pg_get_userbyid(p.proowner),
             'kind=' || p.prokind::text,
             'strict=' || p.proisstrict::text,
             'leakproof=' || p.proleakproof::text,
             'parallel=' || p.proparallel::text,
             'retset=' || p.proretset::text,
             'args=' || pg_catalog.pg_get_function_arguments(p.oid),
             'idargs=' || pg_catalog.pg_get_function_identity_arguments(p.oid)),
           pg_catalog.pg_get_function_result(p.oid),
           (SELECT coalesce(string_agg(x, ',' ORDER BY x), '')
              FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':' || a.is_grantable::text AS x
                      FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s),
           coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '')
      INTO v_nome, v_src, v_props, v_res, v_acl, v_com
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_language l ON l.oid = p.prolang
     WHERE p.oid = v_oid;
    v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');

    IF v_props IS DISTINCT FROM current_setting('p51.p03.' || v_nome || '.props', true) THEN
      RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): propriedades de % mudaram — antes «%», depois «%»', v_sig,
        current_setting('p51.p03.' || v_nome || '.props', true), v_props;
    END IF;
    -- result: igual ao capturado, exceto em listar (o capturado + as duas colunas novas no fim).
    v_esp := current_setting('p51.p03.' || v_nome || '.result', true);
    IF v_nome = 'listar_revisoes_decisao' THEN
      v_esp := regexp_replace(v_esp, '\)$', ', origem text, pedido_id uuid)');
    END IF;
    IF v_res IS DISTINCT FROM v_esp THEN
      RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): RETURNS de % = «%» (esperado «%»)', v_sig, v_res, v_esp;
    END IF;
    IF v_acl IS DISTINCT FROM current_setting('p51.p03.' || v_nome || '.aclset', true) THEN
      RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): ACL de % = «%» (capturado «%»)', v_sig, v_acl,
        current_setting('p51.p03.' || v_nome || '.aclset', true);
    END IF;
    IF v_com = '' THEN
      RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): % sem comentario', v_sig;
    END IF;
    IF v_src ~* '\mv_role\s+NOT\s+IN\s*\(' THEN
      RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): % tem guard `v_role NOT IN (` sem coalesce — falha ABERTO com v_role nulo', v_sig;
    END IF;
    FOREACH k IN ARRAY ARRAY['IF coalesce(v_role, '''') NOT IN (''rh'', ''administrador'') THEN', 'IF v_uid IS NULL THEN',
                             'revisao_rejeicao', 'decisao_final'] LOOP
      IF position(k IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): % (sem comentarios) nao contem «%»', v_sig, k;
      END IF;
    END LOOP;
    -- o escopo do P50 nos DOIS ramos.
    IF (SELECT count(*) FROM regexp_matches(v_cod, 'OR \(v_role = ''rh'' AND public\.is_active_rh_user\(\)\)', 'g')) < 2
       OR (SELECT count(*) FROM regexp_matches(v_cod, 'v_role = ''administrador''', 'g')) < 2 THEN
      RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): % sem o escopo «administrador OR (rh AND helper)» nos dois ramos', v_sig;
    END IF;
    IF v_nome = 'listar_revisoes_decisao' THEN
      FOREACH k IN ARRAY ARRAY['#variable_conflict use_column', 'UNION ALL', 'LIMIT 200;',
                               '(d.revisao_respondida_em IS NULL AND d.por_usuario IS DISTINCT FROM v_uid)',
                               '(rr.respondida_em IS NULL AND rr.rejeitado_por IS DISTINCT FROM v_uid)',
                               'ORDER BY f.x_solicitada_em ASC, f.x_pedido_id ASC'] LOOP
        IF position(k IN v_cod) = 0 THEN
          RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): listar_revisoes_decisao (sem comentarios) nao contem «%»', k;
        END IF;
      END LOOP;
      IF position('justificativa' IN v_res) > 0 OR position('justificativa' IN v_cod) > 0 THEN
        RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): listar_revisoes_decisao projeta/le justificativa (p42 (d))';
      END IF;
    END IF;
    IF has_function_privilege('anon', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): anon tem EXECUTE em %', v_sig;
    END IF;
    v_ev := v_ev || (v_nome || '=' || left(md5(v_src), 12));
  END LOOP;

  -- a função nova.
  v_oid := pg_catalog.to_regprocedure('public.ler_contexto_knockout_revisao(uuid)');
  SELECT p.prosrc INTO v_src FROM pg_catalog.pg_proc p
   WHERE p.oid = v_oid AND p.prosecdef AND p.provolatile = 's' AND p.proconfig = ARRAY['search_path=""']
     AND pg_catalog.pg_get_function_result(p.oid) = 'jsonb'
     AND pg_catalog.obj_description(p.oid, 'pg_proc') IS NOT NULL;
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): ler_contexto_knockout_revisao ausente ou fora do contrato (DEFINER, STABLE, search_path vazio, jsonb, comentario)';
  END IF;
  IF has_function_privilege('anon', v_oid, 'EXECUTE') OR NOT has_function_privilege('authenticated', v_oid, 'EXECUTE')
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
                 WHERE p.oid = v_oid AND a.grantee = 0) THEN
    RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): ACL de ler_contexto_knockout_revisao fora do contrato (anon/PUBLIC sem EXECUTE, authenticated com)';
  END IF;
  v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');
  FOREACH k IN ARRAY ARRAY['coalesce(v_role', 'is_active_rh_user', 'no_data_found', 'revisao_rejeicao'] LOOP
    IF position(k IN v_cod) = 0 THEN
      RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): ler_contexto_knockout_revisao (sem comentarios) nao contem «%»', k;
    END IF;
  END LOOP;
  IF position('IF v_role = ''rh'' AND NOT public.is_active_rh_user() THEN' IN v_cod) = 0
     OR position('IF v_role = ''rh'' AND NOT public.is_active_rh_user() THEN' IN v_cod) > position('FROM public.revisao_rejeicao' IN v_cod) THEN
    RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): ler_contexto_knockout_revisao nao checa o helper do rh ANTES da busca do pedido (oraculo de existencia)';
  END IF;
  v_ev := v_ev || ('ctx=' || left(md5(v_src), 12));

  -- D-08: o motor de exclusão sai desta transação como entrou.
  IF (SELECT string_agg(p.oid::regprocedure::text || '=' || md5(to_jsonb(p)::text), ',' ORDER BY p.oid)
        FROM pg_catalog.pg_proc p
       WHERE p.pronamespace = 'public'::regnamespace
         AND p.proname IN ('anonimizar_candidato', 'plano_exclusao_titular'))
     IS DISTINCT FROM nullif(current_setting('p51.p03.d08', true), '') THEN
    RAISE EXCEPTION 'P51-03 POS-PORTAO (fila): D-08 — anonimizar_candidato/plano_exclusao_titular mudaram dentro desta migration';
  END IF;

  PERFORM set_config('p51.evidencia',
    btrim(coalesce(current_setting('p51.evidencia', true), '') || ' 03a:' || array_to_string(v_ev, ',') || ',anon=false,d08=igual'), false);
END
$pos_fila$;
