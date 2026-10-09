-- =============================================================================
-- Migration 20261008000001 — chave `raven` em public.get_avaliacao_status(uuid)
-- Phase 51 / Plano 51-06 · JORN-43 · D-38 · correção C-4 do 51-RESEARCH
-- =============================================================================
--
-- O QUE ESTAVA ERRADO (C-4). O candidato não consegue ler o próprio `scores_raven` nem o próprio
-- `respostas_raven`: as duas policies de SELECT comparam `candidaturas.candidato_id` com
-- `auth.uid()`, mas `candidatos.id ≠ candidatos.user_id` em 37 de 37 linhas com usuário (medido
-- em PROD pela pesquisa, sob o JWT do titular de d31c78bb, que TEM linha em `scores_raven`:
-- own_scores_raven = 0). Sem uma fonte de «concluído» legível pelo titular, o card do Raven no
-- painel (51-07, D-13) não teria como sumir depois da conclusão.
--
-- O QUE MUDA.
--   1. `get_avaliacao_status` ganha, irmã de `cognitivo`, a chave `raven` com EXATAMENTE dois
--      booleanos:
--        liberado   = existe linha em `cognitivo_liberacao` da candidatura com `revogado_em IS NULL`;
--        registrado = existe linha em `scores_raven` da candidatura.
--      Nenhum número do Raven sai daqui (RNF-07a). O resto do corpo é o corpo VIVO medido abaixo,
--      byte a byte — nunca o do arquivo de 2026-07-12 (o vivo não tem os comentários dele).
--      A RLS do Raven NÃO muda (D-38): consertá-la daria ao navegador as colunas numéricas.
--   2. ACL — o APERTO NOMEADO (ASSUMPTION A4 do 51-RESEARCH): medido em PROD, `anon` TEM EXECUTE
--      (herança do `pg_default_acl`, contra o próprio COMMENT da FUNIL-12, que declara «GRANT
--      authenticated (REVOKE PUBLIC)»). O `REVOKE ALL … FROM anon` abaixo o retira. Nada que
--      funciona deixa de funcionar: sem JWT, `auth.uid()` é nulo e a guarda de titular já recusava
--      `anon` com 42501 `forbidden`; depois do aperto a recusa vem do ACL (`permission denied for
--      function`, também 42501). O único chamador publicado (`avaliacaoService.getAvaliacaoStatus`)
--      roda sob `RoleGuard role="candidato"` — sessão `authenticated`. Qualquer OUTRA diferença
--      de ACL reprova no POS-PORTAO. Se o operador vetar o aperto (pergunta (f) do checkpoint do
--      51-16), o desfazer é `GRANT EXECUTE ON FUNCTION public.get_avaliacao_status(uuid) TO anon`
--      pela mesma via, com o registro de `51-06-CORPO-ANTES.sql`.
--
-- MEDIDO EM PROD (só leitura, 2026-10-09, Passo 0 do 51-06):
--   md5(p.prosrc)            = 0ad235f334b552ddcf00b65dbe7413be   ← FORMA DO PORTÃO: md5(prosrc)
--   md5(pg_get_functiondef)  = 2b9a8908c13f612a54fe829af21bd2af   (só conferência cruzada)
--   propriedades             = SECURITY DEFINER, VOLATILE, PARALLEL UNSAFE, plpgsql, dono postgres,
--                              SET search_path = '', RETURNS jsonb, (p_candidatura_id uuid)
--   ACL (aclexplode)         = anon, authenticated, postgres, service_role — EXECUTE, grantor postgres
--   has_function_privilege('anon', …, 'EXECUTE') = true
--   cabeça do ledger         = 20261005000004; 20261008000001 ausente
--
-- PRE-PORTAO (P51-01): o md5 do `prosrc` vivo tem de ser o medido — senão RAISE e nada muda (o
-- corpo vivo mudou depois da medição: reler o vivo e refazer esta migration). Captura em GUCs
-- LOCAIS as propriedades, o conjunto de ACL e as chaves `'<k>', jsonb_build_object(` do corpo vivo.
-- POS-PORTAO (P51-01): propriedades iguais; ACL = a capturada MENOS `anon`; `anon` sem EXECUTE;
-- o código sem comentários cita `'raven'`, `scores_raven`, `cognitivo_liberacao` e TODAS as
-- chaves capturadas, e não lê nenhum número do Raven; anexa `01:md5=<md5 novo do prosrc>` a
-- `p51.evidencia` (a Management API não devolve NOTICE; o ensaio carrega a GUC no sentinela).
--
-- LOCK. `CREATE OR REPLACE FUNCTION` sem mudança de assinatura e o REVOKE/GRANT seguram lock só no
-- catálogo da função; nenhuma tabela é alterada. `lock_timeout 3s`/`statement_timeout 5s` (as
-- duas PRIMEIRAS instruções) limitam a espera e cada instrução; `55P03`/`57014` = fila, não a
-- migration — repetir depois, nunca subir o teto.
--
-- IDEMPOTÊNCIA. Não é reaplicável por desenho: o PRE-PORTAO recusa um corpo vivo que não seja o
-- de antes (inclusive o desta migration já aplicada), e o `p46apply migrate` recusa versão já no
-- ledger. Reaplicar exige migration nova.
--
-- EVIDÊNCIA. `01:md5=<md5(prosrc) novo>` em `p51.evidencia`; prova comportamental no smoke
-- `supabase/tests/p51_raven_status_smoke.sql` (7 cláusulas, só pelo ensaio que aborta) e no
-- contrato legado `supabase/tests/funil12_status_rpc_smoke.sql`; mutações MA1..MA5 em
-- `scripts/p51_mutacoes.cjs`.
--
-- SEM `BEGIN; … COMMIT;`: o endpoint da Management API já roda a requisição inteira (esta
-- migration + a linha do ledger) numa única transação (CLAUDE.md §«Via de apply ATUAL»); um
-- wrapper externo é o gatilho do 42601 conhecido e quebraria o ensaio que aborta.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261008000001_p51_raven_em_avaliacao_status.sql
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P51-01 PRE-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  v_md5   text;
  v_src   text;
  v_props text;
  v_acl   text;
  v_keys  text;
BEGIN
  SELECT md5(p.prosrc), p.prosrc,
         concat_ws('|', p.prosecdef, p.provolatile, p.proparallel, p.prokind, p.proisstrict, p.proleakproof, p.proretset,
                   coalesce(p.proconfig::text, '<null>'), l.lanname, pg_catalog.pg_get_userbyid(p.proowner),
                   pg_catalog.pg_get_function_arguments(p.oid), pg_catalog.pg_get_function_result(p.oid)),
         (SELECT string_agg(x, ',' ORDER BY x)
            FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':'
                         || a.is_grantable::text || ':' || a.grantor::regrole::text AS x
                    FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s)
    INTO v_md5, v_src, v_props, v_acl
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE p.oid = to_regprocedure('public.get_avaliacao_status(uuid)');

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'P51-01 PRE-PORTAO: public.get_avaliacao_status(uuid) nao existe — nada a estender';
  END IF;
  IF v_md5 IS DISTINCT FROM '0ad235f334b552ddcf00b65dbe7413be' THEN
    RAISE EXCEPTION 'P51-01 PRE-PORTAO: md5(prosrc) vivo = % (medido em 2026-10-09: 0ad235f334b552ddcf00b65dbe7413be) — o corpo vivo mudou depois da medicao: reler o vivo e refazer esta migration', v_md5;
  END IF;

  SELECT string_agg(DISTINCT k[1], ',' ORDER BY k[1]) INTO v_keys
    FROM regexp_matches(v_src, '''([a-z_]+)'', jsonb_build_object\(', 'g') k;
  IF v_keys IS NULL THEN
    RAISE EXCEPTION 'P51-01 PRE-PORTAO: nenhuma chave jsonb_build_object legivel no corpo vivo — o POS-PORTAO nao teria o que preservar';
  END IF;

  PERFORM set_config('p51.pre01_props', v_props, true);
  PERFORM set_config('p51.pre01_acl',   coalesce(v_acl, ''), true);
  PERFORM set_config('p51.pre01_keys',  v_keys, true);
END
$pre$;

-- ─────────────────────────────────────────────────────────────────────────────
-- A função: corpo VIVO + a chave `raven` (irmã de `cognitivo`).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_avaliacao_status(p_candidatura_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_owns boolean;
  r      jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT jsonb_build_object(
    'sjt_mc', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                            WHERE candidatura_id = p_candidatura_id
                              AND tipo = 'sjt' AND subtipo = 'mc')),
    'sjt_caso_aberto', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                            WHERE candidatura_id = p_candidatura_id
                              AND tipo = 'sjt' AND subtipo = 'caso_aberto'),
      'iniciado',   EXISTS(SELECT 1 FROM public.respostas_avaliacao
                            WHERE candidatura_id = p_candidatura_id
                              AND teste = 'sjt_caso_aberto')),
    'redacao', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.redacoes_candidato
                            WHERE candidatura_id = p_candidatura_id),
      'iniciado',   EXISTS(SELECT 1 FROM public.respostas_avaliacao
                            WHERE candidatura_id = p_candidatura_id
                              AND teste = 'redacao')),
    'big_five', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                            WHERE candidatura_id = p_candidatura_id
                              AND tipo = 'big_five'),
      'iniciado',   EXISTS(SELECT 1 FROM public.respostas_avaliacao
                            WHERE candidatura_id = p_candidatura_id
                              AND teste = 'big_five')),
    'cognitivo', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                            WHERE candidatura_id = p_candidatura_id
                              AND tipo = 'cognitivo')),
    -- JORN-43 (D-38, C-4): so presenca; o resultado do Raven nunca sai daqui.
    'raven', jsonb_build_object(
      'liberado',   EXISTS (SELECT 1 FROM public.cognitivo_liberacao l
                             WHERE l.candidatura_id = p_candidatura_id
                               AND l.revogado_em IS NULL),
      'registrado', EXISTS (SELECT 1 FROM public.scores_raven s
                             WHERE s.candidatura_id = p_candidatura_id))
  ) INTO r;

  RETURN r;
END;
$function$;

COMMENT ON FUNCTION public.get_avaliacao_status(uuid) IS
  'Phase 26 / FUNIL-12 (26-02) + Phase 51 / JORN-43 (51-06): fonte de verdade NEUTRA do estado dos cards de avaliacao do candidato — booleans de PRESENCA por teste (registrado/iniciado), NUNCA score/veredito/threshold (RNF-07a). redacao vem de redacoes_candidato, sjt_caso_aberto de scores_candidato subtipo=caso_aberto. Chave raven (D-38, C-4): liberado = liberacao em cognitivo_liberacao sem revogado_em; registrado = existe linha em scores_raven — so os dois booleanos, nenhum numero do Raven; a RLS do Raven nao muda. SECURITY DEFINER; guard de posse (candidatos.user_id=auth.uid()) sem clausula de etapa; 42501 em candidatura alheia (IDOR). scores_candidato mantem candidate-DENY. GRANT authenticated; REVOKE PUBLIC e anon (aperto nomeado A4, 51-06).';

REVOKE ALL ON FUNCTION public.get_avaliacao_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_avaliacao_status(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_avaliacao_status(uuid) TO authenticated;

-- Os demais grants capturados no PRE, recalculados por DIFERENÇA (o conjunto de antes MENOS anon,
-- PUBLIC e o dono): CREATE OR REPLACE já os preserva; isto só os torna explícitos e idempotentes.
DO $acl$
DECLARE
  v_g text;
BEGIN
  FOR v_g IN
    SELECT DISTINCT split_part(e, ':', 1)
      FROM unnest(string_to_array(current_setting('p51.pre01_acl'), ',')) e
     WHERE split_part(e, ':', 2) = 'EXECUTE'
       AND split_part(e, ':', 1) NOT IN ('anon', 'PUBLIC')
       AND split_part(e, ':', 1) IS DISTINCT FROM (SELECT pg_catalog.pg_get_userbyid(p.proowner) FROM pg_catalog.pg_proc p
                                                     WHERE p.oid = to_regprocedure('public.get_avaliacao_status(uuid)'))
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.get_avaliacao_status(uuid) TO %I', v_g);
  END LOOP;
END
$acl$;

-- ─────────────────────────────────────────────────────────────────────────────
-- P51-01 POS-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  v_src     text;
  v_cod     text;
  v_props   text;
  v_acl     text;
  v_acl_esp text;
  v_falta   text;
  v_num     text;
BEGIN
  SELECT p.prosrc,
         concat_ws('|', p.prosecdef, p.provolatile, p.proparallel, p.prokind, p.proisstrict, p.proleakproof, p.proretset,
                   coalesce(p.proconfig::text, '<null>'), l.lanname, pg_catalog.pg_get_userbyid(p.proowner),
                   pg_catalog.pg_get_function_arguments(p.oid), pg_catalog.pg_get_function_result(p.oid)),
         (SELECT string_agg(x, ',' ORDER BY x)
            FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':'
                         || a.is_grantable::text || ':' || a.grantor::regrole::text AS x
                    FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s)
    INTO v_src, v_props, v_acl
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE p.oid = to_regprocedure('public.get_avaliacao_status(uuid)');

  IF v_props IS DISTINCT FROM current_setting('p51.pre01_props') THEN
    RAISE EXCEPTION 'P51-01 POS-PORTAO: propriedades mudaram (% -> %)', current_setting('p51.pre01_props'), v_props;
  END IF;

  SELECT string_agg(e, ',' ORDER BY e) INTO v_acl_esp
    FROM unnest(string_to_array(current_setting('p51.pre01_acl'), ',')) e
   WHERE split_part(e, ':', 1) <> 'anon';
  IF v_acl IS DISTINCT FROM v_acl_esp THEN
    RAISE EXCEPTION 'P51-01 POS-PORTAO: ACL = % (esperado a capturada MENOS anon = %) — a unica diferenca aceita e o aperto nomeado', v_acl, v_acl_esp;
  END IF;
  IF has_function_privilege('anon', 'public.get_avaliacao_status(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'P51-01 POS-PORTAO: anon ainda tem EXECUTE (via PUBLIC ou grant direto)';
  END IF;

  v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');
  SELECT string_agg(w, ',' ORDER BY w) INTO v_falta
    FROM unnest(ARRAY['''raven'', jsonb_build_object(', 'scores_raven', 'cognitivo_liberacao', 'revogado_em IS NULL']
                || ARRAY(SELECT '''' || k || ''', jsonb_build_object('
                           FROM unnest(string_to_array(current_setting('p51.pre01_keys'), ',')) k)) w
   WHERE position(w IN v_cod) = 0;
  IF v_falta IS NOT NULL THEN
    RAISE EXCEPTION 'P51-01 POS-PORTAO: o codigo novo nao contem: %', v_falta;
  END IF;
  SELECT string_agg(w, ',' ORDER BY w) INTO v_num
    FROM unnest(ARRAY['percentil', 'classificacao', 'total_acertos']) w
   WHERE position(w IN lower(v_cod)) > 0;
  IF v_num IS NOT NULL THEN
    RAISE EXCEPTION 'P51-01 POS-PORTAO: o codigo novo le numero do Raven (%) — RNF-07a', v_num;
  END IF;

  PERFORM set_config('p51.evidencia',
    btrim(coalesce(current_setting('p51.evidencia', true), '') || ' 01:md5=' || md5(v_src)), false);
END
$pos$;
