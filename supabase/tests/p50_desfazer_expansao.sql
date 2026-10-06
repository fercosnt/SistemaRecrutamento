-- =============================================================================
-- Phase 50 — DESFAZER DA EXPANSÃO (migrations 20261005000002..4) — GERADO, NÃO EDITAR À MÃO
-- =============================================================================
-- Gerado por `node scripts/p50_desfazer.cjs --gerar` (WR-04 do 50-REVIEW-ACESSO-1) a partir do
-- catálogo VIVO de PROD lido SÓ-LEITURA em 2026-10-06 00:21:35.758418-03, com o ledger p50 SEM 20261005000002, 20261005000003, 20261005000004.
-- Objetos (por forma, das próprias migrations): 18 funções, 13 policies, 1 vista(s).
--
-- ⚠ NÃO É MIGRATION E NÃO RODA AVULSO. Dois usos, e só esses:
--   1. ENSAIO (ida + volta), numa requisição que ABORTA, ANTES do apply do 50-10:
--        node scripts/p50_ensaio.cjs --vistas --migracoes=supabase/migrations/20261005000002_p50_policies_rh_ativo.sql,supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql,supabase/migrations/20261005000004_p50_rpcs_escrita.sql --mutacao=supabase/tests/p50_desfazer_expansao.sql
--      e, DEPOIS do apply (estado vivo = expandido), o ensaio reverso SEM sonda de vistas (o fechamento
--      «A» reprova na volta por construção):
--        node scripts/p50_ensaio.cjs --sem-migracoes --mutacao=supabase/tests/p50_desfazer_expansao.sql
--   2. Base de uma migration CORRETIVA, só com checkpoint do operador (memória «aditivo autônomo,
--      destrutivo com portão»), pela via do projeto (`node p46apply.cjs migrate`), versão própria: a
--      PRIMEIRA linha da migration é `SELECT set_config('p50.desfazer_corretivo', 'sim', true);` e o
--      resto é este arquivo, byte a byte. Sem essa linha a GUARDA abaixo recusa fora do ensaio.
--   Antes de qualquer uso: `node scripts/p50_desfazer.cjs --conferir` (antes do apply) — a impressão
--   digital viva de cada objeto tem de bater com a embutida aqui.
--
-- O texto restaurado é o VIVO (a ÚLTIMA redefinição de cada função, não a migration que a criou).
-- Nenhum DROP, nenhum CASCADE: o helper `is_active_rh_user()` (0001) fica — é do tracer. A ACL é
-- recalculada por DIFERENÇA contra a capturada. PÓS-PORTÃO: toda impressão digital = a capturada.
-- Varredura de forma (CLAUDE.md §Portões): as 2 linhas `= ANY (ARRAY[…])` deste arquivo (a consulta dos
-- PRÉ/PÓS-portões) listam os objetos que 0002..0004 tocam, lidos POR FORMA delas na geração — ESCOPO, não
-- fotografia; e a comparação é com a impressão digital CAPTURADA antes do apply, que é o alvo do desfazer.
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- GUARDA — a primeira coisa que roda. Mesma marca do smoke p50 (`p50.tx` LOCAL = txid desta transação).
DO $desfazer_guarda$
DECLARE
  v_tx   text := coalesce(current_setting('p50.tx', true), '');
  v_corr text := coalesce(current_setting('p50.desfazer_corretivo', true), '');
BEGIN
  IF v_corr = 'sim' THEN
    RETURN; -- migration corretiva explícita (checkpoint do operador)
  END IF;
  IF v_tx = '' OR v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P50D RECUSADO (fora do ensaio): este desfazer reescreve 13 policies e 18 funcoes lidas por toda tela do RH; so roda dentro de scripts/p50_ensaio.cjs (que marca p50.tx e aborta) ou numa migration corretiva com set_config(''p50.desfazer_corretivo'', ''sim'', true) na primeira linha. Nada rodou.';
  END IF;
END
$desfazer_guarda$;

-- PRÉ-PORTÃO — todo objeto existe, e o estado NÃO é o capturado (há expansão a desfazer).
DO $desfazer_pre$
DECLARE
  c_fp   constant jsonb := '{"fn:public.funil_kpis(uuid)":"c3f5be888fb8f4d91284c41562eaf859","vista:public.v_analises_presas":"71832f53afc3979b7736f7965cd2153c","fn:public.reprocessar_analise(uuid)":"4bea8b6f2051bee17031cad6a68f3ee2","fn:public.contar_revisoes_pendentes()":"de12281b8498eb32757b1075c15bc369","fn:public.liberar_cognitivo(uuid,text)":"00cf5f97501b7a1661b86e70e8f15699","fn:public.revogar_cognitivo(uuid,text)":"3fc33ad02c5831ed2095e196e4c993d6","fn:public.listar_pedidos_dados(boolean)":"f4492833b9ffb47576f67c82c7994162","pol:public.candidaturas.rh_avanca_etapa":"f72dba47adc49dd5f3e1953689f75f67","pol:public.scores_candidato.rh_le_scores":"a2190c8769d164066c7b5453b8c986e0","fn:public.contar_pedidos_dados_pendentes()":"3a8911335675a391c3345c45468c2bfd","fn:public.listar_revisoes_decisao(boolean)":"381c9c00374986f4d1c6e5eb4ae61527","fn:public.confirmar_revisao_entrevista(uuid)":"bd19426d58f1c9a319d64a85eeb3c9a4","fn:public.ler_resposta_caso_aberto_sjt(uuid)":"6137a7f93c8bff45be94cf09d14543fc","fn:public.listar_historico_candidatura(uuid)":"961a390230f2d7e4d88e2db1b4b30ab0","pol:public.decisao_final.rh_le_decisao_final":"5786b3bd19704996368f6de488e801e2","pol:public.analise_candidato_vaga.rh_le_analise":"b6db173759d7088f400acba61eb49e45","pol:public.redacoes_candidato.redacao_rh_select":"fd037029dd8b2bb6d51f1369a3aba2eb","pol:public.redacoes_candidato.redacao_rh_update":"80b2d481ed864c1a9682fd61f4f10288","pol:public.historico_candidatura.rh_le_historico":"fd037029dd8b2bb6d51f1369a3aba2eb","pol:public.entrevista_guias.rh_le_entrevista_guias":"a2190c8769d164066c7b5453b8c986e0","pol:public.comparativo_solicitado.rh_le_comparativo":"b6db173759d7088f400acba61eb49e45","pol:public.notificacoes_enviadas.rh_le_notificacoes":"30005b100375d1b3db4b28bb31b42e34","fn:public.save_entrevista_guia_edits(uuid,text,jsonb)":"dff57f3f88da043f317c45c3259b3753","fn:public.upsert_pergunta_opcoes_metadata(uuid,jsonb)":"e2bf4970bd5909cc0cf44abef94685a5","fn:public.salvar_avaliacao_entrevista(uuid,jsonb,text)":"ce0641415cb7746f1906d20717828901","fn:public.salvar_revisao_redacao(uuid,text,text,jsonb)":"5cd809ae3d2cda2c4a85a6643969af37","pol:public.entrevista_analises.rh_le_entrevista_analises":"a2190c8769d164066c7b5453b8c986e0","pol:public.agendamentos_entrevista.rh_gerencia_agendamento":"7b090d29c40046dbb861c5e3bd254fb0","fn:public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)":"83aa5e19d933daa802b1d4b348df7be7","pol:public.decisao_final_historico.rh_le_decisao_final_historico":"3cf02446dab98a8cb939260fd0256a66","fn:public.rejeitar_candidatura(uuid,public.motivo_rejeicao_rh,text)":"cade41e974a311ec8e39275bb03510cb","fn:public.registrar_decisao(uuid,public.decisao_final_resultado,text)":"fa1a729dc4a5196181475ba7dc3260c7"}'::jsonb;
  c_q    constant text  := 'SELECT coalesce(jsonb_object_agg(s.k, s.f), ''{}''::jsonb) FROM ( SELECT ''fn:'' || p.oid::regprocedure::text AS k, md5(((to_jsonb(p) - ''proacl'' - ''proargdefaults'')::text) || ''|'' || pg_catalog.pg_get_function_arguments(p.oid) || ''|'' || coalesce((SELECT string_agg(x, '','' ORDER BY x) FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, ''PUBLIC'') || '':'' || a.privilege_type || '':'' || a.is_grantable::text || '':'' || a.grantor::regrole::text AS x FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault(''f'', p.proowner))) a) s), '''') || ''|'' || coalesce(pg_catalog.obj_description(p.oid, ''pg_proc''), ''<null>'')) AS f FROM pg_catalog.pg_proc p WHERE p.oid = ANY (SELECT to_regprocedure(x)::oid FROM unnest(ARRAY[''public.confirmar_revisao_entrevista(uuid)'', ''public.contar_pedidos_dados_pendentes()'', ''public.contar_revisoes_pendentes()'', ''public.funil_kpis(uuid)'', ''public.ler_resposta_caso_aberto_sjt(uuid)'', ''public.liberar_cognitivo(uuid, text)'', ''public.listar_historico_candidatura(uuid)'', ''public.listar_pedidos_dados(boolean)'', ''public.listar_revisoes_decisao(boolean)'', ''public.registrar_decisao(uuid, public.decisao_final_resultado, text)'', ''public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text)'', ''public.reprocessar_analise(uuid)'', ''public.revogar_cognitivo(uuid, text)'', ''public.salvar_avaliacao_entrevista(uuid, jsonb, text)'', ''public.salvar_avaliacao_entrevista(uuid, uuid, jsonb, text)'', ''public.salvar_revisao_redacao(uuid, text, text, jsonb)'', ''public.save_entrevista_guia_edits(uuid, text, jsonb)'', ''public.upsert_pergunta_opcoes_metadata(uuid, jsonb)'']::text[]) x) UNION ALL SELECT ''pol:'' || n.nspname || ''.'' || c.relname || ''.'' || pol.polname, md5(pol.polcmd::text || ''|'' || pol.polpermissive::text || ''|'' || coalesce((SELECT string_agg(CASE WHEN r = 0 THEN ''public'' ELSE r::regrole::text END, '','' ORDER BY CASE WHEN r = 0 THEN ''public'' ELSE r::regrole::text END) FROM unnest(pol.polroles) r), '''') || ''|'' || coalesce(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid), ''<null>'') || ''|'' || coalesce(pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid), ''<null>'') || ''|'' || coalesce(pg_catalog.obj_description(pol.oid, ''pg_policy''), ''<null>'')) FROM pg_catalog.pg_policy pol JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE (n.nspname || ''.'' || c.relname || ''.'' || pol.polname) = ANY (ARRAY[''public.agendamentos_entrevista.rh_gerencia_agendamento'', ''public.analise_candidato_vaga.rh_le_analise'', ''public.candidaturas.rh_avanca_etapa'', ''public.comparativo_solicitado.rh_le_comparativo'', ''public.decisao_final_historico.rh_le_decisao_final_historico'', ''public.decisao_final.rh_le_decisao_final'', ''public.entrevista_analises.rh_le_entrevista_analises'', ''public.entrevista_guias.rh_le_entrevista_guias'', ''public.historico_candidatura.rh_le_historico'', ''public.notificacoes_enviadas.rh_le_notificacoes'', ''public.redacoes_candidato.redacao_rh_select'', ''public.redacoes_candidato.redacao_rh_update'', ''public.scores_candidato.rh_le_scores'']::text[]) UNION ALL SELECT ''vista:'' || n.nspname || ''.'' || c.relname, md5(coalesce((SELECT string_agg(o, '','' ORDER BY o) FROM unnest(c.reloptions) o), '''') || ''|'' || md5(pg_catalog.pg_get_viewdef(c.oid)) || ''|'' || coalesce(pg_catalog.obj_description(c.oid, ''pg_class''), ''<null>'')) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.oid = ANY (SELECT to_regclass(x)::oid FROM unnest(ARRAY[''public.v_analises_presas'']::text[]) x)) s';
  v_sp   text := current_setting('search_path');
  v_fp   jsonb;
  v_dif  text;
  v_falt text;
  v_n    int;
BEGIN
  PERFORM set_config('search_path', '', true);
  EXECUTE c_q INTO v_fp;
  PERFORM set_config('search_path', v_sp, true);
  SELECT string_agg(k, ',' ORDER BY k) INTO v_falt FROM jsonb_object_keys(c_fp) k WHERE NOT v_fp ? k;
  SELECT string_agg(k, ',' ORDER BY k), count(*) INTO v_dif, v_n FROM jsonb_object_keys(c_fp) k WHERE v_fp ? k AND (v_fp ->> k) IS DISTINCT FROM (c_fp ->> k);
  IF v_falt IS NOT NULL THEN
    RAISE EXCEPTION 'P50D FAIL (pre): objeto(s) ausente(s) — %; medir de novo e decidir A MAO', v_falt;
  END IF;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'P50D FAIL (pre): nada a desfazer — as % impressoes digitais ja sao as capturadas antes do apply (a expansao nao esta presente)', (SELECT count(*) FROM jsonb_object_keys(c_fp));
  END IF;
  PERFORM set_config('p50.desfazer_pre', v_n || '/' || (SELECT count(*) FROM jsonb_object_keys(c_fp)), true);
END
$desfazer_pre$;

-- ═══ 18 FUNÇÕES — o texto VIVO de antes do apply (pg_get_functiondef) ═══

-- public.confirmar_revisao_entrevista(uuid)
CREATE OR REPLACE FUNCTION public.confirmar_revisao_entrevista(p_analise_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_confirmada timestamptz;
  v_superada   timestamptz;
  v_status     text;
  v_comp       jsonb;
BEGIN
  -- O estado da análise entra no MESMO SELECT da posse: são a mesma leitura, e separá-las
  -- abriria uma janela entre «achei» e «ainda vale».
  SELECT v.created_by, ea.superada_em, ea.status_analise, ea.competencias
    INTO v_vaga_owner, v_superada, v_status, v_comp
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.id = p_analise_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'analise de entrevista nao encontrada (%)', p_analise_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  -- Fail-closed (ver a razão no cabeçalho, defeito (3)).
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- A confirmação só vale na análise VIGENTE. `revisao_confirmada_em` é o que o
  -- `avancar_etapa` lê para LIBERAR a trava de língua/sotaque, e desde o 49-06 ele só
  -- olha a vigente: confirmar numa superada não libera nada (o RH fica sem entender por
  -- que o avanço continua travado), e confirmar numa FALHA liberaria o avanço sem
  -- ninguém ter lido análise nenhuma.
  IF NOT public.entrevista_analise_vigente(v_superada, v_status, v_comp) THEN
    RAISE EXCEPTION 'analise superada ou sem resultado: confirme a revisao da analise vigente (analise %, superada_em %, status %)',
      p_analise_id, v_superada, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.entrevista_analises
     SET revisao_confirmada_em = now(),
         revisada_por          = (select auth.uid())
   WHERE id = p_analise_id
  RETURNING revisao_confirmada_em INTO v_confirmada;

  RETURN jsonb_build_object(
    'ok', true,
    'id', p_analise_id,
    'revisao_confirmada_em', v_confirmada
  );
END;
$function$;
COMMENT ON FUNCTION public.confirmar_revisao_entrevista(uuid) IS 'Marca revisao_confirmada_em/revisada_por na analise de entrevista — o marcador que o avancar_etapa le para LIBERAR a trava de lingua/sotaque (RF-24 / RNF-07a; o humano sempre decide). Phase 49 / 49-10: RECUSA com check_violation quando a analise nao e VIGENTE pelo predicado unico public.entrevista_analise_vigente (superada ou falha) — confirmar numa superada nao libera nada porque o portao so olha a vigente desde o 49-06, e confirmar numa falha liberaria o avanco sem ninguem ter lido analise nenhuma. Guard de papel fail-closed. Assinatura inalterada.';

-- public.contar_pedidos_dados_pendentes()
CREATE OR REPLACE FUNCTION public.contar_pedidos_dados_pendentes()
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
  -- Guard NULL-safe idêntico ao da seção 3. Ver o comentário de lá.
  IF v_role IS DISTINCT FROM 'administrador' AND v_role IS DISTINCT FROM 'rh' THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT count(*) INTO v_n
    FROM public.solicitacoes_dados s
   WHERE s.tipo = 'acesso'
     AND s.situacao = 'pendente'
     -- ESCOPO DO BD-8 — prosa IDÊNTICA à de listar_pedidos_dados.
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh'
              AND EXISTS (
                    SELECT 1
                      FROM public.candidaturas cd
                     WHERE cd.candidato_id = s.candidato_id
                       AND cd.deleted_at IS NULL
                       AND cd.is_rascunho = false
                       AND cd.vaga_id IN (SELECT vg.id
                                            FROM public.vagas vg
                                           WHERE vg.created_by = v_uid)))
         );

  RETURN v_n;
END;
$function$;
COMMENT ON FUNCTION public.contar_pedidos_dados_pendentes() IS 'Phase 44 / EXPORT-05: contagem dos pedidos de acesso PENDENTES que alimenta o badge do menu do RH. SECURITY DEFINER + STABLE com search_path vazio, com o MESMO guard de papel, o MESMO filtro tipo = ''acesso'' e o MESMO escopo do BD-8 de listar_pedidos_dados. ⚠ SE OS DOIS PREDICADOS DIVERGIREM, O BADGE CONTA O QUE A FILA NAO MOSTRA — e aqui esse trabalho invisivel corre contra o prazo de 15 dias corridos do Art. 19, II. O smoke (m) assere a igualdade entre esta contagem e as linhas pendentes devolvidas pela fila, em dois papeis distintos, exatamente para que essa divergencia nao possa nascer em silencio. Sem cap: um contador truncado mentiria por construcao. Guard NULL-safe com IS DISTINCT FROM; recusa 42501. REVOKE de PUBLIC e de anon NOMINALMENTE, GRANT EXECUTE a authenticated.';

-- public.contar_revisoes_pendentes()
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

  SELECT count(*) INTO v_n
    FROM public.decisao_final d
    JOIN public.candidaturas c ON c.id = d.candidatura_id
   WHERE d.revisao_solicitada_em IS NOT NULL
     AND d.revisao_respondida_em IS NULL
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh'
              AND c.deleted_at IS NULL
              AND c.is_rascunho = false
              AND c.vaga_id IN (SELECT vg2.id FROM public.vagas vg2 WHERE vg2.created_by = v_uid))
         );

  RETURN v_n;
END;
$function$;
COMMENT ON FUNCTION public.contar_revisoes_pendentes() IS 'Contador de revisoes Art. 20 pendentes para o badge da sidebar do RH. Mesmo escopo por vaga de listar_revisoes_decisao, reimplementado dentro do DEFINER. Guard FAIL-CLOSED: papel resolvido com coalesce (sem JWT -> 42501, nunca no-op) e sub obrigatorio. Recusa: 42501 se o papel nao for rh/administrador. REVOKE de PUBLIC e de anon, GRANT EXECUTE a authenticated.';

-- public.funil_kpis(uuid)
CREATE OR REPLACE FUNCTION public.funil_kpis(p_vaga_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_is_admin boolean := (auth.jwt() #>> '{app_metadata,role}') = 'administrador';
  v_uid      uuid    := auth.uid();
  r          jsonb;
BEGIN
  WITH scoped_hist AS (
    SELECT h.candidatura_id, h.etapa_de, h.etapa_para, h.criado_em, c.vaga_id
      FROM public.historico_candidatura h
      JOIN public.candidaturas c ON c.id = h.candidatura_id
      JOIN public.vagas        v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
  ),
  deltas AS (
    SELECT etapa_para AS stage,
           (LEAD(criado_em) OVER (PARTITION BY candidatura_id ORDER BY criado_em) - criado_em) AS dwell
      FROM scoped_hist
  ),
  median AS (
    SELECT stage, percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM dwell)) AS median_seconds
      FROM deltas WHERE dwell IS NOT NULL GROUP BY stage
  ),
  conversion AS (
    SELECT etapa_de AS from_stage, etapa_para AS to_stage, COUNT(*) AS n
      FROM scoped_hist WHERE etapa_de IS NOT NULL GROUP BY etapa_de, etapa_para
  ),
  -- Phase 48 / JORN-26 (D6): o volume de uma etapa de TRABALHO nao conta candidatura
  -- encerrada (knockout em `inscricao`, `finalizado` legado parado em etapa de
  -- trabalho). Os baldes terminais `aprovado`/`rejeitado` contam tudo o que esta
  -- neles, como antes. O knockout segue medido em `knockout_rate`.
  volume AS (
    SELECT c.etapa_atual AS stage, COUNT(*) AS n
      FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
       AND (c.etapa_atual IN ('aprovado', 'rejeitado')
            OR NOT public.candidatura_encerrada(c.etapa_atual, c.status))
     GROUP BY c.etapa_atual
  ),
  tth AS (
    SELECT EXTRACT(EPOCH FROM (sh.criado_em - COALESCE(c.data_candidatura, c.created_at))) AS secs
      FROM scoped_hist sh
      JOIN public.candidaturas c ON c.id = sh.candidatura_id
     WHERE sh.etapa_para = 'aprovado'
       AND COALESCE(c.data_candidatura, c.created_at) IS NOT NULL
       AND sh.criado_em >= COALESCE(c.data_candidatura, c.created_at)
  ),
  ko AS (
    SELECT count(*) FILTER (WHERE c.motivo_rejeicao = 'knockout_automatico') AS knockouts,
           count(*)                                                          AS total
      FROM public.candidaturas c
      JOIN public.vagas v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
  ),
  drop_flow AS (
    SELECT sh.etapa_de AS stage,
           count(*) FILTER (WHERE sh.etapa_para = 'rejeitado') AS dropped,
           count(*)                                            AS saidas
      FROM scoped_hist sh
     WHERE sh.etapa_de IS NOT NULL
       AND sh.etapa_de <> sh.etapa_para
       AND sh.etapa_de NOT IN ('aprovado', 'rejeitado')
     GROUP BY sh.etapa_de
  ),
  ns AS (
    SELECT count(*) FILTER (WHERE a.compareceu = false) AS no_shows,
           count(*)                                     AS total
      FROM public.agendamentos_entrevista a
      JOIN public.candidaturas c ON c.id = a.candidatura_id
      JOIN public.vagas        v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
       AND a.deleted_at IS NULL
       AND a.compareceu IS NOT NULL
  )
  SELECT jsonb_build_object(
    'median_time_per_stage', COALESCE((SELECT jsonb_object_agg(stage, round(median_seconds)::bigint) FROM median), '{}'::jsonb),
    'conversion_stage_to_stage', COALESCE((SELECT jsonb_agg(jsonb_build_object('de', from_stage, 'para', to_stage, 'n', n)) FROM conversion), '[]'::jsonb),
    'volume_by_stage', COALESCE((SELECT jsonb_object_agg(stage, n) FROM volume), '{}'::jsonb),
    'time_to_hire', (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY secs))::bigint FROM tth WHERE secs IS NOT NULL),
    'knockout_rate', (SELECT jsonb_build_object(
        'knockouts', knockouts, 'total', total,
        'taxa', CASE WHEN total > 0 THEN round(knockouts::numeric / total, 4) ELSE NULL END) FROM ko),
    'drop_per_stage', COALESCE((SELECT jsonb_object_agg(stage, jsonb_build_object(
        'dropped', dropped, 'saidas', saidas,
        'taxa', CASE WHEN saidas > 0 THEN round(dropped::numeric / saidas, 4) ELSE NULL END)) FROM drop_flow), '{}'::jsonb),
    'no_show_rate', (SELECT jsonb_build_object(
        'no_shows', no_shows, 'total', total,
        'taxa', CASE WHEN total > 0 THEN round(no_shows::numeric / total, 4) ELSE NULL END) FROM ns)
  ) INTO r;
  RETURN r;
END;
$function$;
COMMENT ON FUNCTION public.funil_kpis(uuid) IS 'Phase 32 (3 keys) + Phase 34 KPI-04 (4 keys). SECURITY DEFINER, owner-scoped (v_is_admin OR vagas.created_by=auth.uid()), PII-free by construction (never ator/candidatos). Keys: median_time_per_stage, conversion_stage_to_stage, volume_by_stage (P32) + time_to_hire, knockout_rate, drop_per_stage, no_show_rate (0-agendamento -> taxa=null). Single-arg (uuid) all-time cohort. Proven by supabase/tests/funil34_kpis_smokes.sql. Phase 48 / JORN-26 (D6): volume_by_stage of a WORKING stage excludes candidaturas encerradas (public.candidatura_encerrada — knockout in inscricao, legacy finalizado); the terminal buckets aprovado/rejeitado count everything in them, as before. Proven by supabase/tests/p48_candidatura_encerrada_smoke.sql (g).';

-- public.ler_resposta_caso_aberto_sjt(uuid)
CREATE OR REPLACE FUNCTION public.ler_resposta_caso_aberto_sjt(p_candidatura_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role  text;
  v_uid   uuid;
  v_dono  uuid;
  v_achou boolean;
  v_resp  jsonb;
BEGIN
  -- (i) Guarda de papel ANTES de qualquer leitura (não revela existência a quem não é RH).
  --     Fail-closed: sem `sub` recusa; sem papel recusa.
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  v_uid  := (select auth.uid());
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (ii) Posse da vaga — o predicado WR-04 de `rh_le_scores`. Para `rh`, inexistente e alheia
  --      dão o MESMO 42501. Sem filtro de `deleted_at`, como o WR-04.
  SELECT v.created_by INTO v_dono
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;
  v_achou := FOUND;

  IF v_role = 'rh' AND (NOT v_achou OR v_dono IS DISTINCT FROM v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT v_achou THEN
    RAISE EXCEPTION 'candidatura % nao encontrada', p_candidatura_id USING ERRCODE = 'no_data_found';
  END IF;

  -- (iii) Só depois do envio: sem a linha de score do caso aberto, o rascunho NUNCA sai.
  IF NOT EXISTS (
    SELECT 1 FROM public.scores_candidato sc
     WHERE sc.candidatura_id = p_candidatura_id
       AND sc.tipo = 'sjt'
       AND sc.subtipo = 'caso_aberto'
  ) THEN
    RETURN jsonb_build_object('situacao', 'sem_resposta_enviada', 'texto', NULL);
  END IF;

  -- (iv) O texto gravado. `removida` não nomeia causa: o marcador prova a redação pelo motor,
  --      e o motor grava o mesmo marcador no direito do titular e na purga de retenção.
  SELECT ra.respostas INTO v_resp
    FROM public.respostas_avaliacao ra
   WHERE ra.candidatura_id = p_candidatura_id
     AND ra.teste = 'sjt_caso_aberto';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('situacao', 'indisponivel', 'texto', NULL);
  END IF;
  IF jsonb_typeof(v_resp) = 'object' AND v_resp ? 'redigido' THEN
    RETURN jsonb_build_object('situacao', 'removida', 'texto', NULL);
  END IF;
  IF jsonb_typeof(v_resp) = 'object'
     AND jsonb_typeof(v_resp -> 'texto') = 'string'
     AND btrim(v_resp ->> 'texto') <> '' THEN
    RETURN jsonb_build_object('situacao', 'disponivel', 'texto', v_resp ->> 'texto');
  END IF;
  RETURN jsonb_build_object('situacao', 'indisponivel', 'texto', NULL);
END
$function$;
COMMENT ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) IS 'P49-44 / WR-07: devolve ao RH o texto que o candidato gravou na resposta do caso aberto da SJT, para revisar o sinal da Decisao Final. Predicado WR-04 (o de rh_le_scores): administrador, ou rh dono da vaga (vagas.created_by = auth.uid()); guarda fail-closed. So depois do envio (linha scores_candidato sjt/caso_aberto) — nunca o rascunho. Retorno {situacao, texto}: disponivel | sem_resposta_enviada | indisponivel | removida. removida e neutro: o marcador redigido prova a redacao pelo motor de exclusao, nao quem a pediu (o motor grava o mesmo marcador no direito do titular e na purga de retencao).';

-- public.liberar_cognitivo(uuid,text)
CREATE OR REPLACE FUNCTION public.liberar_cognitivo(p_candidatura_id uuid, p_motivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role   text;
  v_uid    uuid;
  v_owner  uuid;
  v_status public.status_candidatura;
BEGIN
  v_uid  := (SELECT auth.uid());
  v_role := (auth.jwt() #>> '{app_metadata,role}');

  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT v.created_by, c.status INTO v_owner, v_status
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada' USING errcode = 'no_data_found';
  END IF;

  -- rh so libera na propria vaga; administrador passa por cima (mesma regra do
  -- resto do escopo do recrutador nesta base).
  IF v_role = 'rh' AND v_owner IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Quem saiu do funil nao faz avaliacao.
  IF v_status IN ('rejeitado', 'finalizado') THEN
    RAISE EXCEPTION 'candidatura % — nao se libera avaliacao para quem saiu do funil', v_status
      USING errcode = 'P0001';
  END IF;

  -- Re-liberar uma revogada e legitimo (o operador mudou de ideia, a agenda mudou):
  -- limpa a revogacao e recarimba o autor.
  INSERT INTO public.cognitivo_liberacao (candidatura_id, liberado_por, motivo)
  VALUES (p_candidatura_id, v_uid, p_motivo)
  ON CONFLICT (candidatura_id) DO UPDATE
    SET liberado_por = v_uid,
        liberado_em  = now(),
        revogado_em  = NULL,
        revogado_por = NULL,
        motivo       = COALESCE(EXCLUDED.motivo, public.cognitivo_liberacao.motivo);

  RETURN jsonb_build_object('candidatura_id', p_candidatura_id, 'liberado', true);
END;
$function$;
COMMENT ON FUNCTION public.liberar_cognitivo(uuid,text) IS 'Libera a avaliacao cognitiva para UMA candidatura. Papel rh/administrador; rh so na propria vaga. Nao libera para quem saiu do funil. Re-liberar uma revogada e permitido e limpa a revogacao. Ver 20260826000007.';

-- public.listar_historico_candidatura(uuid)
CREATE OR REPLACE FUNCTION public.listar_historico_candidatura(p_candidatura_id uuid)
 RETURNS TABLE(etapa_de public.etapa_processo, etapa_para public.etapa_processo, ator_rotulo text, criterio_texto text, criado_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
BEGIN
  -- (1) GUARD DE PAPEL — PRIMEIRO STATEMENT, E NULL-SAFE.
  --
  -- ⚠ `IS DISTINCT FROM`, NUNCA o idioma difundido `NOT IN ('rh','administrador')`.
  -- Com a claim ausente a expressão de pertinência negativa avalia NULL, o `IF` **não
  -- é tomado**, e o guard FALHA ABERTO exatamente para o chamador mais suspeito.
  -- Defeito REAL medido na 42-06
  -- (`.planning/todos/pending/42-anon-execute-definer-sistemico.md`).
  --
  -- ⚠ E aqui ele é o ÚNICO controle contra um vazamento NOVO: a policy própria do
  -- candidato (`candidato_le_proprio_historico`, 20260607000006:60-70) continua VIVA,
  -- então o candidato não é recusado pelo banco — só por este guard. Sem ele, o
  -- `GRANT EXECUTE TO authenticated` abaixo entregaria `nome_completo` de recrutadores
  -- a qualquer candidato autenticado.
  IF v_role IS DISTINCT FROM 'administrador' AND v_role IS DISTINCT FROM 'rh' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas rh ou administrador podem ler o historico da candidatura'
      USING ERRCODE = '42501';
  END IF;

  -- (2) REIMPOSIÇÃO DO ESCOPO POR VAGA — o bloco sem o qual esta fase REGRIDE.
  --
  -- ⚠ `SECURITY DEFINER` BYPASSA a RLS de linha, e `rh_le_historico` não é role-only
  -- desde a Phase 32: ela é vaga-scoped (`20260715000002` Part 2, WR-04, e a própria
  -- migration escreve "DEFINER bypasses row RLS"). Trocar o `select` direto do serviço
  -- por esta RPC REMOVE esse escopo a menos que ele seja reimposto AQUI.
  --
  -- O predicado é COPIADO da policy, não reinventado — reescrevê-lo reabriria uma
  -- auditoria já fechada (SEG-02 / WR-04). `administrador` continua vendo tudo, que é
  -- exatamente o que a policy diz.
  --
  -- Sem este bloco a regressão é SILENCIOSA NA UI: nada muda de aparência e um
  -- recrutador passa a ler o histórico de candidaturas de vagas que não são dele.
  IF v_role = 'rh' AND NOT EXISTS (
    SELECT 1
      FROM public.candidaturas c
      JOIN public.vagas v
        ON v.id = c.vaga_id
       AND c.id = p_candidatura_id
       AND v.created_by = (select auth.uid())
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: a candidatura pedida nao pertence a uma vaga criada por este recrutador'
      USING ERRCODE = '42501';
  END IF;

  -- (3) A PROJEÇÃO E OS QUATRO RÓTULOS (D-47-U08).
  --
  -- ⚠ A ORDEM DOS RAMOS É CONTRATO, NÃO ESTILO. O ramo de ator nulo vem PRIMEIRO:
  -- se ele não viesse, a comparação `h.ator = cand.user_id` avaliaria NULL para a
  -- transição automática, o `CASE` cairia no `ELSE`, e "Sistema" viraria "Recrutador
  -- removido" — a colisão que a Correção factual 3 da 47-UI-SPEC identificou,
  -- reintroduzida por ordem de cláusula. `ator IS NULL` JÁ significa "Sistema" hoje
  -- (`HistoricoBlock.tsx:68`), e é o caso MAJORITÁRIO da trilha.
  RETURN QUERY
  SELECT h.etapa_de,
         h.etapa_para,
         CASE
           -- 1 · transição automática/serviço: `ator` nulo (D-09). O RAMO É O PRIMEIRO.
           WHEN h.ator IS NULL THEN 'Sistema'::text
           -- 2 · o ator é o próprio titular daquela candidatura (a inscrição, tipicamente)
           WHEN h.ator = cand.user_id THEN 'O próprio candidato'::text
           -- 3 · resolveu para um usuário RH vivo → o NOME COMPLETO, nunca abreviado.
           --     ⚠ `::text` OBRIGATÓRIO: `nome_completo` é varchar(255) e `RETURN QUERY`
           --     sob `RETURNS TABLE` exige IDENTIDADE de tipo — sem o cast, 42804 em
           --     TODA chamada bem-sucedida. Já aconteceu neste repositório.
           WHEN u.nome_completo IS NOT NULL THEN u.nome_completo::text
           -- 4 · ator NÃO-nulo que não resolve para nenhum usuário vivo → falha de
           --     RESOLUÇÃO (nunca derivada de `ator IS NULL`, que é o ramo 1).
           ELSE 'Recrutador removido'::text
         END,
         h.criterio_texto,
         h.criado_em
    FROM public.historico_candidatura h
    JOIN public.candidaturas cv   ON cv.id = h.candidatura_id
    JOIN public.candidatos   cand ON cand.id = cv.candidato_id
    -- ⚠ ARMADILHA 1, DESARMADA AQUI: a junção é por `u.user_id`, NUNCA por `u.id`.
    -- `ator` é FK para **auth.users** (20260607000001:43); `usuarios_rh.id` é a PK
    -- interna e nunca aparece em `historico_candidatura`. Junção pelo outro lado ⇒
    -- ZERO linhas resolvem e todas caem no ramo 4, em silêncio.
    --
    -- ⚠ `u.deleted_at IS NULL` vive NO `ON`, jamais no `WHERE`: no `WHERE` o `LEFT
    -- JOIN` viraria `INNER` e apagaria justamente as linhas que o ramo 4 existe para
    -- mostrar. E só `deleted_at` participa — `ativo = false` com `deleted_at` nulo
    -- CONTINUA exibindo o nome: desativado não é removido, e quem agiu naquela data
    -- agiu (regra travada da 47-UI-SPEC).
    LEFT JOIN public.usuarios_rh u
           ON u.user_id = h.ator
          AND u.deleted_at IS NULL
   WHERE h.candidatura_id = p_candidatura_id
   ORDER BY h.criado_em DESC
   LIMIT 100;   -- espelha o bound defensivo que o serviço já aplica hoje (WR-05)
END;
$function$;
COMMENT ON FUNCTION public.listar_historico_candidatura(uuid) IS 'Phase 47 / CONSOL-02 (VISRH-03): le a trilha de transicoes de UMA candidatura com o ROTULO de quem agiu ja resolvido no servidor. O uuid do ator NUNCA sai da funcao. STABLE SECURITY DEFINER com search_path vazio. Existe para que a tela de RH nunca precise de acesso a usuarios_rh (admin-only desde a SEG-02). CHAVE DE JUNCAO: usuarios_rh.user_id = historico_candidatura.ator. ⚠ NAO e a chave do precedente listar_matriz_retencao, que junta pela PK interna: ator e FK de auth.users (20260607000001:43), nao de usuarios_rh. usuarios_rh tem AS DUAS colunas e ambas sao uuid, entao a juncao pelo lado errado nao falha — ela resolve ZERO linhas em silencio. CAST: nome_completo e varchar(255) e o RETURNS TABLE declara text; sem ::text a funcao levanta 42804 em toda chamada bem-sucedida (defeito ja shippado nesta coluna, STATE.md:752). ESCOPO POR VAGA NO CORPO: DEFINER bypassa a RLS rh_le_historico, que a Phase 32 tornou vaga-scoped (WR-04); o predicado da policy e reimposto no bloco 2 e um recrutador que peca candidatura de vaga alheia recebe 42501. Sem esse bloco a regressao seria SILENCIOSA na UI. GUARD DE PAPEL NULL-SAFE (IS DISTINCT FROM, nunca NOT IN — o NOT IN falha ABERTO com claim nula, defeito medido na 42-06): e o unico controle que impede o CANDIDATO de chamar esta funcao, porque a policy candidato_le_proprio_historico continua VIVA no banco e o GRANT e a authenticated. QUATRO ROTULOS, e a ORDEM DOS RAMOS e contrato: (1) ator nulo -> Sistema, PRIMEIRO ramo; (2) ator = user_id do titular -> O proprio candidato; (3) resolveu para RH vivo -> nome_completo completo, nunca abreviado; (4) nao resolveu -> Recrutador removido. Se (1) nao vier primeiro, a comparacao com o titular avalia nulo, cai no ELSE, e Sistema vira Recrutador removido. deleted_at IS NULL vive no ON do LEFT JOIN (no WHERE viraria INNER e apagaria as linhas do rotulo 4); ativo NAO participa — desativado nao e removido e quem agiu naquela data agiu. ⚠ RESIDUO DECLARADO, ACEITO POR DECISAO (D-47-U09): depois de uma exclusao da Phase 45 o ponteiro do titular e severado (ator := NULL, 20260805000006) e a linha de inscricao passa a ler Sistema. Um 5o rotulo descreveria o fato — e informaria a um recrutador, numa tela de funil, que aquela pessoa exerceu o direito de exclusao, vazamento proibido textualmente pela Invariante 9 da 45-UI-SPEC. Entre imprecisao de autoria numa linha e vazamento de exercicio de direito, o contrato escolhe a imprecisao — escrita aqui, nao descoberta depois.';

-- public.listar_pedidos_dados(boolean)
CREATE OR REPLACE FUNCTION public.listar_pedidos_dados(p_incluir_atendidos boolean DEFAULT true)
 RETURNS TABLE(id uuid, candidato_id uuid, candidato_nome text, situacao text, causa text, solicitado_em timestamp with time zone, atendido_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_uid  uuid := auth.uid();
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
BEGIN
  -- GUARD DE PAPEL, NULL-SAFE. `IS DISTINCT FROM` e NUNCA `NOT IN`: com v_role NULL
  -- (chamador sem JWT) a expressão `NOT IN` avalia NULL, o `IF` não é tomado, e o
  -- guard FALHA ABERTO justamente para o chamador mais suspeito. Em SECURITY
  -- DEFINER isso é grave porque o DEFINER bypassa RLS e o guard do corpo é o ÚNICO
  -- controle. Defeito REAL medido na 42-06
  -- (`.planning/todos/pending/42-anon-execute-definer-sistemico.md`).
  IF v_role IS DISTINCT FROM 'administrador' AND v_role IS DISTINCT FROM 'rh' THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
      s.id,
      s.candidato_id,
      -- LEFT JOIN, não INNER: um pedido cujo candidato não é resolvível continua
      -- aparecendo na fila (a UI mostra "Não identificado"). Sumir com a linha
      -- esconderia justamente o pedido que consome prazo sem ter dono.
      ca.nome_completo::text,
      s.situacao::text,
      s.causa::text,
      s.solicitado_em,
      s.atendido_em
    FROM public.solicitacoes_dados s
    LEFT JOIN public.candidatos ca ON ca.id = s.candidato_id
   WHERE s.tipo = 'acesso'
     AND (p_incluir_atendidos OR s.situacao = 'pendente')
     -- ESCOPO DO BD-8 — prosa IDÊNTICA à de contar_pedidos_dados_pendentes.
     -- O administrador vê a fila inteira, INCLUSIVE os órfãos (pedido de candidato
     -- sem candidatura nenhuma): o órfão é precisamente o pedido que queima o
     -- relógio do Art. 19, II sem ter dono natural, e o admin é esse dono.
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh'
              AND EXISTS (
                    SELECT 1
                      FROM public.candidaturas cd
                     WHERE cd.candidato_id = s.candidato_id
                       AND cd.deleted_at IS NULL
                       AND cd.is_rascunho = false
                       AND cd.vaga_id IN (SELECT vg.id
                                            FROM public.vagas vg
                                           WHERE vg.created_by = v_uid)))
         )
   -- ORDENAÇÃO COMPOSTA: não atendidos primeiro (do mais antigo ao mais recente),
   -- depois os atendidos (do mais recente ao mais antigo). Ver o COMMENT abaixo —
   -- ela é o que torna VERDADEIRO o aviso de corte da tela.
   ORDER BY (s.situacao = 'atendido'),
            CASE WHEN s.situacao = 'pendente' THEN s.solicitado_em END ASC,
            CASE WHEN s.situacao = 'atendido' THEN s.solicitado_em END DESC
   LIMIT 200;
END;
$function$;
COMMENT ON FUNCTION public.listar_pedidos_dados(boolean) IS 'Phase 44 / EXPORT-05 (LGPD Art. 18, II / Art. 19, II): fila de SUPERVISAO dos pedidos de copia de dados. RETURNS TABLE com EXATAMENTE 7 colunas nomeadas — jamais a row inteira: RLS e row-level e nao esconde coluna, e a fila e sobre o PEDIDO e nao sobre o DADO (Invariante 5 da 44-UI-SPEC). Zero e-mail, CPF, documento ou caminho de Storage. SECURITY DEFINER + STABLE com search_path vazio, porque o nome do candidato vive em public.candidatos atras de RLS que um recrutador nao atravessa para candidato que nao e dele. Como o DEFINER bypassa RLS, o escopo e predicado EXPLICITO (BD-8): administrador ve tudo, INCLUSIVE os orfaos (pedido de candidato sem candidatura nenhuma) — o orfao e justamente o pedido que consome prazo legal sem ter dono natural, e o admin e esse dono; rh ve pedidos de candidatos com candidatura nao-rascunho e nao-deletada em vaga sua. ⚠ INVARIANTE: este predicado e o de contar_pedidos_dados_pendentes sao O MESMO. Se divergirem, o badge do menu conta o que a tela nao mostra, e o operador vai cacar trabalho invisivel num relogio de 15 dias corridos. Filtro fixo tipo = ''acesso'' no SERVIDOR: sem ele, as linhas de exclusao da Phase 45 entram nesta tela em silencio. Guard NULL-safe com IS DISTINCT FROM (nunca NOT IN, que falha ABERTO para chamador sem claim); recusa 42501. ⚠ ORDENACAO COMPOSTA (nao atendidos ASC, depois atendidos DESC) e cap de 200 linhas no servidor. A ordenacao e o que torna VERDADEIRA a copy do aviso de corte ("todos os nao atendidos aparecem; os atendidos mais antigos podem ter ficado de fora"). MUDAR ESTA ORDENACAO SEM MUDAR AQUELA COPY FAZ A FILA MENTIR POR OMISSAO. REVOKE de PUBLIC e de anon NOMINALMENTE (o pg_default_acl de public concede EXECUTE a anon em todo CREATE FUNCTION, como grant direto: revogar so de PUBLIC remove um grant que nunca existiu), GRANT EXECUTE a authenticated.';

-- public.listar_revisoes_decisao(boolean)
CREATE OR REPLACE FUNCTION public.listar_revisoes_decisao(p_incluir_respondidos boolean DEFAULT false)
 RETURNS TABLE(candidatura_id uuid, candidato_nome text, vaga_titulo text, decisao text, decidido_por_nome text, revisao_solicitada_em timestamp with time zone, revisao_respondida_em timestamp with time zone, revisao_veredito text, revisao_resultado text, respondida_por_nome text, pode_responder boolean)
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
  SELECT
      d.candidatura_id,
      ca.nome_completo::text,
      vg.titulo::text,
      d.decisao::text,
      (SELECT ur.nome_completo::text
         FROM public.usuarios_rh ur
        WHERE ur.user_id = d.por_usuario
        ORDER BY ur.deleted_at ASC NULLS FIRST
        LIMIT 1),
      d.revisao_solicitada_em,
      d.revisao_respondida_em,
      d.revisao_veredito,
      d.revisao_resultado,
      (SELECT ur.nome_completo::text
         FROM public.usuarios_rh ur
        WHERE ur.user_id = d.revisao_por_usuario
        ORDER BY ur.deleted_at ASC NULLS FIRST
        LIMIT 1),
      (d.revisao_respondida_em IS NULL AND d.por_usuario IS DISTINCT FROM v_uid)
    FROM public.decisao_final d
    JOIN public.candidaturas c  ON c.id  = d.candidatura_id
    JOIN public.candidatos   ca ON ca.id = c.candidato_id
    JOIN public.vagas        vg ON vg.id = c.vaga_id
   WHERE d.revisao_solicitada_em IS NOT NULL
     AND (p_incluir_respondidos OR d.revisao_respondida_em IS NULL)
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh'
              AND c.deleted_at IS NULL
              AND c.is_rascunho = false
              AND c.vaga_id IN (SELECT vg2.id FROM public.vagas vg2 WHERE vg2.created_by = v_uid))
         )
   ORDER BY d.revisao_solicitada_em ASC
   LIMIT 200;
END;
$function$;
COMMENT ON FUNCTION public.listar_revisoes_decisao(boolean) IS 'Leitor da fila de revisao Art. 20 (REVISAO-02). RETURNS TABLE com 11 colunas NOMEADAS — nunca SETOF decisao_final, que arrastaria toda coluna futura — e NAO projeta decisao_final.justificativa (texto interno do recrutador). Reimplementa o escopo por vaga DENTRO do DEFINER porque SECURITY DEFINER bypassa RLS. Guard FAIL-CLOSED: papel resolvido com coalesce (sem JWT -> 42501) e sub obrigatorio. pode_responder e espelho COSMETICO do guard — quem impede e o RPC de escrita. REVOKE de PUBLIC e de anon, GRANT EXECUTE a authenticated.';

-- public.registrar_decisao(uuid,public.decisao_final_resultado,text)
CREATE OR REPLACE FUNCTION public.registrar_decisao(p_candidatura_id uuid, p_decisao public.decisao_final_resultado, p_justificativa text)
 RETURNS public.decisao_final
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_row        public.decisao_final;
  v_uid        uuid := (select auth.uid());
BEGIN
  -- (P48-11) Role guard FIRST and FAIL-CLOSED. The live guard was `v_role NOT IN (...)`, which
  --     evaluates NULL for a caller without JWT and is NOT taken (the call only failed later, by
  --     accident, on por_usuario NOT NULL) — and it ran AFTER the candidatura lookup, so a caller
  --     without JWT could tell an existing candidatura id (42501) from a missing one (P0002).
  --     coalesce + before any read: no JWT -> 42501, nothing learned. sub is mandatory too.
  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (0) Re-assert justificativa length server-side (the DB CHECK >= 50 is also live).
  IF p_justificativa IS NULL OR length(p_justificativa) < 50 THEN
    RAISE EXCEPTION 'justificativa deve ter ao menos 50 caracteres'
      USING ERRCODE = 'check_violation';
  END IF;

  -- (1) Resolve the candidatura -> its vaga owner. A missing candidatura -> not found.
  SELECT v.created_by
    INTO v_vaga_owner
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada (%)', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (2) Own-vaga guard (the role guard moved to the top, fail-closed). rh -> must own.
  --     administrador -> bypass.
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (2b) D-23 (Phase 48 / JORN-19): quem teve a decisao REVERTIDA nao registra a nova decisao
  --     deste caso — bloqueio duro, qualquer p_decisao, no mesmo espirito do revisor != decisor.
  --     A decisao revertida e a linha com revisao_veredito = 'revertida' E decisao = 'rejeitado'
  --     (responder_revisao_decisao so aceita revertida sobre rejeitado). Procurada em DOIS lugares:
  --       · a linha VIGENTE — a janela entre a reabertura e a nova decisao;
  --       · o ARQUIVO (decisao_final_historico) — depois que um em_espera ou a nova decisao
  --         arquivou a linha revertida; impede o decisor revertido de sobrescrever a decisao de outro.
  --     `decisao = 'rejeitado'` e load-bearing: um em_espera registrado por C durante a reabertura
  --     herda revisao_veredito = 'revertida' na linha (em_espera nao zera o ciclo, A5) com
  --     por_usuario = C — sem esse filtro, C ficaria travado pela reversao da decisao de A.
  IF EXISTS (SELECT 1 FROM public.decisao_final d
              WHERE d.candidatura_id = p_candidatura_id
                AND d.revisao_veredito = 'revertida'
                AND d.decisao = 'rejeitado'
                AND d.por_usuario = v_uid)
     OR EXISTS (SELECT 1 FROM public.decisao_final_historico h
                 WHERE h.candidatura_id = p_candidatura_id
                   AND h.revisao_veredito = 'revertida'
                   AND h.decisao = 'rejeitado'
                   AND h.por_usuario = v_uid) THEN
    RAISE EXCEPTION 'quem teve a decisao revertida nao registra a nova decisao deste caso (D-23)'
      USING ERRCODE = '42501';
  END IF;

  -- (3) UPSERT the CURRENT decisao_final row (amendment history archived by the AFTER UPDATE
  --     snapshot_decisao_final trigger). por_usuario := auth.uid() ALWAYS (LGPD-02).
  INSERT INTO public.decisao_final AS df
    (candidatura_id, decisao, justificativa, por_usuario)
  VALUES
    (p_candidatura_id, p_decisao, p_justificativa, (select auth.uid()))
  ON CONFLICT (candidatura_id)
  DO UPDATE SET decisao       = EXCLUDED.decisao,
                justificativa = EXCLUDED.justificativa,
                por_usuario   = (select auth.uid()),
                em            = now(),
                -- (P48-11) the NEW decision (aprovado/rejeitado) of a REOPENED row starts clean:
                -- the revision cycle is zeroed in THIS upsert. It is not lost — the AFTER UPDATE
                -- snapshot_decisao_final reads OLD and has just archived it (20260921000011).
                -- Without this, the new rejection would show «revertida» and solicitar_revisao
                -- would be a no-op (Art. 20 unreachable). em_espera during the reopening is NOT a
                -- new decision (A5): the cycle and the deadline stand. Redecision outside a
                -- reopening (reaberta_em IS NULL) keeps today's behavior: nothing is zeroed.
                explicacao_solicitada_em = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.explicacao_solicitada_em END,
                revisao_solicitada_em = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.revisao_solicitada_em END,
                revisao_veredito = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.revisao_veredito END,
                revisao_resultado = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.revisao_resultado END,
                revisao_por_usuario = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.revisao_por_usuario END,
                revisao_respondida_em = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.revisao_respondida_em END,
                reaberta_em = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.reaberta_em END,
                prazo_nova_decisao_em = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.prazo_nova_decisao_em END,
                alerta_prazo_enviado_em = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.alerta_prazo_enviado_em END
  RETURNING * INTO v_row;

  -- (4) Terminal funnel transition. Map ONLY aprovado/rejeitado to etapa_atual; em_espera leaves
  --     etapa as-is. Fold status + etapa_atual + etapa_justificativa into ONE UPDATE. The
  --     candidaturas UPDATE fires avancar_etapa() which writes the ONE historico_candidatura row.
  --
  -- (P49-06 / D-35) A candidatura pode JA estar encerrada quando a decisao e registrada — o
  --     caso legado `triagem/finalizado → aprovado` e exatamente esse. «Decisao» e uma das
  --     DUAS transicoes sancionadas: a GUC e ligada antes de CADA UPDATE e zerada logo depois
  --     (Correcao 31: `set_config(…, true)` vale ate o fim da TRANSACAO e vazaria para o
  --     UPDATE seguinte num smoke).
  --
  -- (P49-06 / D-47 / JORN-37 / BD-9) `etapa_justificativa` recebe uma CONSTANTE sem PII, e nao
  --     `p_justificativa`. O motivo e o caminho: avancar_etapa() copia
  --     NEW.etapa_justificativa para historico_candidatura.criterio_texto, e o historico ENTRA
  --     na copia do titular (exportAllowlist). A justificativa da decisao final e deliberacao
  --     interna guardada pelo BD-9 — a trilha registra que HOUVE a decisao, e o TEXTO continua
  --     na fonte, decisao_final.justificativa (gravada no upsert acima, com autor).
  --     ⚠ Isto NAO se estende a rejeitar_candidatura: a justificativa de ETAPA chega ao titular
  --     por decisao ja tomada, com aviso na tela (Correcao 28). So a da decisao final e BD-9.
  IF p_decisao = 'aprovado' THEN
    PERFORM set_config('app.transicao_sancionada', 'decisao', true);
    UPDATE public.candidaturas
       SET etapa_atual = 'aprovado',
           status = 'finalizado',
           data_decisao_final = now(),
           etapa_justificativa = 'Decisão final registrada.'
     WHERE id = p_candidatura_id;
    PERFORM set_config('app.transicao_sancionada', '', true);
  ELSIF p_decisao = 'rejeitado' THEN
    -- FUNIL-02: sanction this status->rejeitado for the guard_rejeicao_auditada trigger
    -- (is_local=true -> SET LOCAL, txn-scoped, pooler-safe) BEFORE the UPDATE.
    PERFORM set_config('app.rejeicao_sancionada', 'on', true);
    PERFORM set_config('app.transicao_sancionada', 'decisao', true);
    UPDATE public.candidaturas
       SET etapa_atual = 'rejeitado',
           status = 'rejeitado',
           data_decisao_final = now(),
           etapa_justificativa = 'Decisão final registrada.'
     WHERE id = p_candidatura_id;
    PERFORM set_config('app.transicao_sancionada', '', true);
  END IF;
  -- em_espera: NO etapa change (decision row only).

  -- RETURN the decisao_final row (readback — no silent no-op).
  RETURN v_row;
END;
$function$;
COMMENT ON FUNCTION public.registrar_decisao(uuid,public.decisao_final_resultado,text) IS 'Phase 15 + Phase 25 / DECISAO-03 + FUNIL-02/09: captura a decisao final de RH gravando decisao_final (UNICO writer). por_usuario := auth.uid() SEMPRE (LGPD-02). UPSERT via ON CONFLICT(candidatura_id); historico de emendas arquivado pelo trigger snapshot_decisao_final. rejeitado -> set_config(app.rejeicao_sancionada=on, is_local) + UPDATE unico {etapa_atual, status, data_decisao_final, etapa_justificativa}; aprovado -> etapa_atual=aprovado + status=finalizado + data_decisao_final + justificativa; em_espera NAO muda etapa. Dispara avancar_etapa (UMA row). NUNCA auto-decide (RNF-07a). Phase 48 / 48-11 (JORN-19): (i) FAIL-CLOSED — papel com coalesce e sub obrigatorio, ANTES de ler a candidatura (sem JWT -> 42501, sem oraculo de existencia). (ii) D-23 — quem teve a decisao revertida (linha com revisao_veredito=revertida e decisao=rejeitado, na vigente OU em decisao_final_historico) nao registra a nova decisao do caso, qualquer p_decisao -> 42501; qualquer outro RH/admin decide. (iii) na NOVA decisao (aprovado/rejeitado) de uma linha REABERTA (reaberta_em IS NOT NULL) o ciclo e ZERADO no mesmo upsert (explicacao_solicitada_em, revisao_*, reaberta_em, prazo_nova_decisao_em, alerta_prazo_enviado_em) — depois de o snapshot AFTER UPDATE (que le OLD) te-lo arquivado nas colunas do ciclo de decisao_final_historico; sem isso a nova rejeicao pareceria revertida e o Art. 20 ficaria inalcancavel nela. A5: em_espera durante a reabertura NAO e nova decisao (ciclo e prazo continuam). Redecisao fora de reabertura: comportamento de antes, nada zerado. Texto vivo transcrito de pg_get_functiondef (o patch dinamico 20260826000004 nao deixava o corpo em arquivo). GRANT EXECUTE TO authenticated, service_role.';

-- public.rejeitar_candidatura(uuid,public.motivo_rejeicao_rh,text)
CREATE OR REPLACE FUNCTION public.rejeitar_candidatura(p_candidatura_id uuid, p_motivo public.motivo_rejeicao_rh, p_justificativa text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_etapa      public.etapa_processo;
  v_status     public.status_candidatura;
  v_just       text := btrim(coalesce(p_justificativa, ''));
BEGIN
  -- (0) Role membership guard FIRST (WR-02): candidato/anon rejected before any lookup -> no existence oracle
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (1) Server-authoritative >=50 gate
  IF char_length(v_just) < 50 THEN
    RAISE EXCEPTION 'A justificativa da rejeição precisa de pelo menos 50 caracteres'
      USING ERRCODE = 'check_violation';
  END IF;

  -- (2) Resolve candidatura -> vaga owner + etapa + status
  SELECT v.created_by, c.etapa_atual, c.status
    INTO v_vaga_owner, v_etapa, v_status
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada (%)', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (2b) Own-vaga guard (WR-04): rh must own; administrador bypasses
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (3) Early terminal guard — Phase 48 / JORN-26 (D3 da varredura): «encerrada» e o
  --     predicado canonico, etapa E status. O guard antigo so olhava a etapa e aceitava
  --     re-rejeitar um knockout (`inscricao`, `rejeitado`): reescrevia `motivo_rejeicao`,
  --     gravava historico `inscricao -> rejeitado` e, com a chave de dedupe por
  --     transicao do JORN-18, mandaria um SEGUNDO e-mail de rejeicao.
  IF public.candidatura_encerrada(v_etapa, v_status) THEN
    RAISE EXCEPTION 'candidatura já encerrada (etapa %, status %) — não pode ser rejeitada novamente', v_etapa, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- (4) ONE UPDATE -> trigger writes the single audit row + guard_rejeicao_auditada satisfied
  --     Phase 48 / JORN-22 / D-12: `feedback_rejeicao` NEUTRO, no MESMO UPDATE — e o que
  --     faz o cartao «Entenda a decisao» aparecer no painel do candidato. E uma
  --     CONSTANTE: nunca v_just, nunca p_motivo (o texto chega ao candidato).
  UPDATE public.candidaturas
     SET etapa_atual         = 'rejeitado',
         status              = 'rejeitado',
         motivo_rejeicao     = p_motivo::text,
         etapa_justificativa = v_just,
         feedback_rejeicao   = 'Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.'
   WHERE id = p_candidatura_id;
END;
$function$;
COMMENT ON FUNCTION public.rejeitar_candidatura(uuid,public.motivo_rejeicao_rh,text) IS 'Phase 31 / OPER-02/04: rejeicao auditada pelo RH em qualquer etapa. Server-authoritative: btrim + char_length(justificativa) >= 50 -> RAISE check_violation (contador do cliente e apenas UX). Motivo estruturado via enum motivo_rejeicao_rh (parametro; invalido -> 22P02), gravado ::text em candidaturas.motivo_rejeicao. UMA UPDATE seta etapa_atual=rejeitado + status=rejeitado (satisfaz guard_rejeicao_auditada) + etapa_justificativa (trigger avancar_etapa copia para historico_candidatura.criterio_texto e escreve UMA row; ator=auth.uid() -> auto_rejeitado=false, RNF-07a). NUNCA INSERT manual em historico_candidatura, NUNCA auto-rejeita por score. SECURITY DEFINER + search_path vazio; guard: role IN (rh,administrador), rh deve possuir a vaga, administrador bypassa. GRANT EXECUTE TO authenticated.';

-- public.reprocessar_analise(uuid)
CREATE OR REPLACE FUNCTION public.reprocessar_analise(p_candidatura_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_vaga_id       uuid;
  v_vaga_owner    uuid;
  v_role          text;
  v_project_url   text;
  v_invoke_key    text;
BEGIN
  SELECT c.vaga_id, v.created_by
    INTO v_vaga_id, v_vaga_owner
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;

  IF v_vaga_id IS NULL THEN
    RAISE EXCEPTION 'candidatura % not found', p_candidatura_id USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';

  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/analise-candidato-individual',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_invoke_key
    ),
    body := jsonb_build_object(
      'candidatura_id', p_candidatura_id,
      'vaga_id', v_vaga_id
    )
  );
END;
$function$;
COMMENT ON FUNCTION public.reprocessar_analise(uuid) IS 'Phase 10 / TRIAGEM-02: re-fires the analise-candidato-individual dispatch on demand (panel reprocess button / backfill). SECURITY DEFINER. Guard: role IN (rh,administrador) — candidato/anon RAISE forbidden; role=rh must own the candidatura vaga (vagas.created_by = auth.uid()); administrador bypasses. GRANT EXECUTE TO authenticated only (REVOKE FROM PUBLIC).';

-- public.revogar_cognitivo(uuid,text)
CREATE OR REPLACE FUNCTION public.revogar_cognitivo(p_candidatura_id uuid, p_motivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role  text;
  v_uid   uuid;
  v_owner uuid;
BEGIN
  v_uid  := (SELECT auth.uid());
  v_role := (auth.jwt() #>> '{app_metadata,role}');

  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT v.created_by INTO v_owner
    FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada' USING errcode = 'no_data_found';
  END IF;

  IF v_role = 'rh' AND v_owner IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Revoga sem apagar: o rastro de quem liberou e quando permanece.
  UPDATE public.cognitivo_liberacao
     SET revogado_em = now(), revogado_por = v_uid,
         motivo = COALESCE(p_motivo, motivo)
   WHERE candidatura_id = p_candidatura_id AND revogado_em IS NULL;

  RETURN jsonb_build_object('candidatura_id', p_candidatura_id, 'revogado', true);
END;
$function$;
COMMENT ON FUNCTION public.revogar_cognitivo(uuid,text) IS NULL;

-- public.salvar_avaliacao_entrevista(uuid,jsonb,text)
CREATE OR REPLACE FUNCTION public.salvar_avaliacao_entrevista(p_candidatura_id uuid, p_scores_humanos jsonb, p_notas text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role       text;
  v_vaga_owner uuid;
  v_n          integer;
  v_analise_id uuid;
BEGIN
  -- Guard de papel PRIMEIRO, fail-closed: quem chega sem papel recebe 42501 antes de
  -- qualquer leitura (inclusive com duas vigentes — p49_analise_vigente_smoke (h)).
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Posse ANTES da contagem: um RH de outra vaga não aprende quantas vigentes há.
  SELECT v.created_by INTO v_vaga_owner
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Quantas vigentes, pelo predicado único. Uma POR TIPO desde o 49-10.
  SELECT count(*), (array_agg(ea.id))[1]
    INTO v_n, v_analise_id
    FROM public.entrevista_analises ea
   WHERE ea.candidatura_id = p_candidatura_id
     AND public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias);

  IF coalesce(v_n, 0) = 0 THEN
    RAISE EXCEPTION 'nenhuma analise vigente para revisar na candidatura %', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_n > 1 THEN
    RAISE EXCEPTION 'a candidatura % tem % analises de entrevista vigentes: informe a analise que esta sendo avaliada (p_analise_id)',
      p_candidatura_id, v_n
      USING ERRCODE = 'check_violation';
  END IF;

  -- Exatamente uma: o singular é verdade, e a primária faz o resto (um corpo só).
  RETURN public.salvar_avaliacao_entrevista(p_candidatura_id, v_analise_id, p_scores_humanos, p_notas);
END;
$function$;
COMMENT ON FUNCTION public.salvar_avaliacao_entrevista(uuid,jsonb,text) IS 'COMPATIBILIDADE (bundle antigo em cache) — Phase 49 / 49-30: NAO escolhe mais a analise. Guard de papel fail-closed e posse da vaga primeiro; depois conta as vigentes da candidatura (uma por tipo desde o 49-10): 0 => no_data_found; mais de 1 => check_violation pedindo p_analise_id; exatamente 1 => delega a salvar_avaliacao_entrevista(uuid,uuid,jsonb,text). Antes (20260922000008) escolhia a vigente mais recente entre os dois tipos em silencio (CR-03).';

-- public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)
CREATE OR REPLACE FUNCTION public.salvar_avaliacao_entrevista(p_candidatura_id uuid, p_analise_id uuid, p_scores_humanos jsonb, p_notas text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_analise_id uuid;
  v_superada   timestamptz;
  v_status     text;
  v_comp       jsonb;
  v_media      numeric;
  v_n          integer;
BEGIN
  -- A análise a revisar é a que o CLIENTE nomeia — a que a tela mostra (D-39). A condição
  -- de candidatura fecha o IDOR: SECURITY DEFINER ignora RLS, e sem ela um RH dono da vaga
  -- de A gravaria nota numa análise de B. O estado entra no MESMO SELECT (e sob lock) para
  -- não abrir janela entre «é vigente» e o UPDATE.
  SELECT ea.id, v.created_by, ea.superada_em, ea.status_analise, ea.competencias
    INTO v_analise_id, v_vaga_owner, v_superada, v_status, v_comp
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.id = p_analise_id
     AND ea.candidatura_id = p_candidatura_id
     FOR UPDATE OF ea;

  IF v_analise_id IS NULL THEN
    RAISE EXCEPTION 'analise de entrevista % nao encontrada na candidatura %', p_analise_id, p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  -- Fail-closed: sem papel nenhum, RECUSA (a comparação direta sobre um v_role nulo
  -- devolve NULL e o IF não dispara).
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- A nota humana só vale na análise VIGENTE (predicado único do 49-01): numa SUPERADA ela
  -- revisaria um texto que não vale mais; numa FALHA não há competências para pontuar.
  IF NOT public.entrevista_analise_vigente(v_superada, v_status, v_comp) THEN
    RAISE EXCEPTION 'analise superada ou sem resultado: a avaliacao so pode ser registrada na analise vigente (analise %, superada_em %, status %)',
      p_analise_id, v_superada, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_notas IS NULL OR length(btrim(p_notas)) = 0 THEN
    RAISE EXCEPTION 'notas_humanas obrigatorias' USING ERRCODE = 'check_violation';
  END IF;

  -- Média das notas humanas (BARS 1–5). Só valores numéricos contam; um objeto sem
  -- nenhuma nota numérica é erro de contrato do cliente, não um score zero.
  SELECT avg(kv.v::numeric), count(*)
    INTO v_media, v_n
    FROM jsonb_each_text(coalesce(p_scores_humanos, '{}'::jsonb)) AS kv(k, v)
   WHERE kv.v ~ '^[0-9]+(\.[0-9]+)?$'
     AND kv.v::numeric BETWEEN 1 AND 5;

  IF coalesce(v_n, 0) = 0 THEN
    RAISE EXCEPTION 'scores_humanos sem notas numericas entre 1 e 5' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.entrevista_analises
     SET scores_humanos        = p_scores_humanos,
         notas_humanas         = p_notas,
         revisao_confirmada_em = now(),
         revisada_por          = (select auth.uid()),
         status_analise        = 'concluida'
   WHERE id = v_analise_id;

  -- A linha que o consolidador pondera. status='sucesso' SÓ nasce aqui, pela mão humana
  -- (RNF-07a): a EF de IA deixa pendente_humano e score NULL.
  INSERT INTO public.scores_candidato
    (candidatura_id, tipo, subtipo, pergunta_id, score, score_max, status, metadata)
  VALUES
    (p_candidatura_id, 'entrevista', NULL, NULL, round(v_media, 2), 5, 'sucesso',
     jsonb_build_object(
       'scores_humanos', p_scores_humanos,
       'analise_id', v_analise_id,
       'confirmado_por', (select auth.uid()),
       'fonte', 'salvar_avaliacao_entrevista'))
  ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id) DO UPDATE
    SET score      = EXCLUDED.score,
        score_max  = EXCLUDED.score_max,
        status     = 'sucesso',
        metadata   = public.scores_candidato.metadata || EXCLUDED.metadata,
        updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'analise_id', v_analise_id,
    'candidatura_id', p_candidatura_id,
    'score_entrevista', round(v_media, 2),
    'score_max', 5);
END;
$function$;
COMMENT ON FUNCTION public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text) IS 'Registra a avaliacao humana da entrevista NA ANALISE QUE O CLIENTE NOMEIA (p_analise_id): scores_humanos, notas, revisao_confirmada_em, status concluida; e grava o score humano em scores_candidato tipo=entrevista (media BARS 1-5, score_max 5, status sucesso, metadata.analise_id) — a unica origem do status sucesso dessa linha (RNF-07a). Phase 49 / 49-30 (CR-03, D-39): a analise tem de ser DA candidatura (IDOR) e VIGENTE pelo predicado unico public.entrevista_analise_vigente. Nao achou: no_data_found; nao vigente: check_violation. Guard de papel fail-closed + posse da vaga. Sem DEFAULT (nao pode casar com a sobrecarga de 3).';

-- public.salvar_revisao_redacao(uuid,text,text,jsonb)
CREATE OR REPLACE FUNCTION public.salvar_revisao_redacao(p_redacao_id uuid, p_decisao text, p_notas text, p_scores_humanos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_found      boolean;
  v_candidatura_id uuid;
BEGIN
  SELECT v.created_by, true, r.candidatura_id
    INTO v_vaga_owner, v_found, v_candidatura_id
    FROM public.redacoes_candidato r
    JOIN public.candidaturas c ON c.id = r.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE r.id = p_redacao_id;

  IF v_found IS NOT TRUE THEN
    RAISE EXCEPTION 'redacao % not found', p_redacao_id USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_decisao NOT IN ('aprovado', 'reprovado', 'duvida') THEN
    RAISE EXCEPTION 'decisao invalida' USING ERRCODE = 'check_violation';
  END IF;

  IF p_notas IS NULL OR length(p_notas) < 50 THEN
    RAISE EXCEPTION 'notas_revisor exige no minimo 50 caracteres' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.redacoes_candidato
     SET scores_humanos = p_scores_humanos,
         notas_revisor  = p_notas,
         decisao_revisor = p_decisao,
         revisada_por   = (select auth.uid()),
         revisada_em    = now(),
         status_analise = CASE
           WHEN p_decisao = 'duvida' THEN status_analise
           ELSE 'concluida'
         END
   WHERE id = p_redacao_id;

  -- 2026-09-06: a linha que o consolidar-decisao-final pondera. Antes disto o peso
  -- `redacao_cultural` era N/A em TODA vaga (ver cabeçalho da migration).
  PERFORM public.sincronizar_score_redacao(v_candidatura_id);

  RETURN jsonb_build_object('ok', true, 'redacao_id', p_redacao_id, 'decisao', p_decisao);
END;
$function$;
COMMENT ON FUNCTION public.salvar_revisao_redacao(uuid,text,text,jsonb) IS 'Grava a revisao humana da redacao cultural em redacoes_candidato E sincroniza a linha scores_candidato tipo=redacao (sincronizar_score_redacao). Antes de 2026-09-06 nao tocava scores_candidato e o peso redacao_cultural era sempre N/A na decisao final.';

-- public.save_entrevista_guia_edits(uuid,text,jsonb)
CREATE OR REPLACE FUNCTION public.save_entrevista_guia_edits(p_candidatura_id uuid, p_tipo text, p_guia jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_vaga_owner uuid;
  v_role_db    text;
  v_role       text;
BEGIN
  IF p_tipo NOT IN ('online', 'presencial') THEN
    RAISE EXCEPTION 'tipo invalido: %', p_tipo USING ERRCODE = 'check_violation';
  END IF;

  -- Role from public.usuarios_rh (NOT the JWT claim) — the ENTREV-08 deviation.
  SELECT role INTO v_role_db
    FROM public.usuarios_rh
   WHERE user_id = (select auth.uid())
     AND ativo = true
     AND deleted_at IS NULL
   LIMIT 1;
  v_role := CASE
    WHEN v_role_db = 'recrutador'    THEN 'rh'
    WHEN v_role_db = 'administrador' THEN 'administrador'
    ELSE v_role_db
  END;
  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Ownership: rh must OWN the vaga; administrador bypasses.
  SELECT v.created_by INTO v_vaga_owner
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id
   LIMIT 1;
  IF v_vaga_owner IS NULL THEN
    RAISE EXCEPTION 'candidatura % nao encontrada', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Shape guard.
  IF p_guia IS NULL OR jsonb_typeof(p_guia) <> 'object' THEN
    RAISE EXCEPTION 'guia invalida' USING ERRCODE = 'check_violation';
  END IF;

  -- Upsert — the single write-path. RNF-07a: never touches public.candidaturas.
  INSERT INTO public.entrevista_guias (candidatura_id, tipo, guia, updated_at)
       VALUES (p_candidatura_id, p_tipo, p_guia, now())
  ON CONFLICT (candidatura_id, tipo)
  DO UPDATE SET guia = EXCLUDED.guia, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'candidatura_id', p_candidatura_id, 'tipo', p_tipo);
END;
$function$;
COMMENT ON FUNCTION public.save_entrevista_guia_edits(uuid,text,jsonb) IS 'Phase 20 / ENTREV-06/07/08: grava edicoes do guia de entrevista via upsert ON CONFLICT (candidatura_id, tipo). SECURITY DEFINER + search_path=. AUTHZ: role de public.usuarios_rh (NAO claim JWT; ativo + deleted_at IS NULL; recrutador->rh, administrador->administrador); rh deve possuir a vaga; administrador bypassa; RH-sem-posse + candidato -> 42501. NUNCA escreve candidaturas (RNF-07a). GRANT authenticated, REVOKE PUBLIC. Sem policy RH UPDATE ampla.';

-- public.upsert_pergunta_opcoes_metadata(uuid,jsonb)
CREATE OR REPLACE FUNCTION public.upsert_pergunta_opcoes_metadata(p_pergunta_id uuid, p_opcoes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_opcao        jsonb;
  v_opcao_id     uuid;
  v_new_jsonb    jsonb := '[]'::jsonb;
  v_role         text;
  v_status       public.status_vaga;
  v_owner        uuid;
BEGIN
  -- Authorization inside the DEFINER body (RLS does not apply here — must check explicitly):
  v_role := (auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- (A29) Resolve the pergunta's vaga (status + owner) BEFORE any DELETE/regenerate.
  SELECT v.status, v.created_by
    INTO v_status, v_owner
    FROM public.perguntas_formulario p
    JOIN public.vagas v ON v.id = p.vaga_id
   WHERE p.id = p_pergunta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pergunta não encontrada' USING ERRCODE = 'no_data_found';
  END IF;

  -- (A29) Status hard-block — editing options of a non-rascunho vaga would orphan
  --       opcao_knockout_id / desync qualificacao_etapa1.
  IF v_status <> 'rascunho' THEN
    RAISE EXCEPTION 'Não é possível editar opções de uma vaga % (apenas rascunho).', v_status
      USING ERRCODE = 'P0001';
  END IF;

  -- (A29) Ownership: rh must own the vaga; administrador bypasses (closes IDOR T-25-03).
  IF v_role = 'rh' AND v_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Replace metadata for this pergunta (idempotent):
  DELETE FROM public.pergunta_opcao_metadata WHERE pergunta_id = p_pergunta_id;

  FOR v_opcao IN SELECT * FROM jsonb_array_elements(p_opcoes)
  LOOP
    -- ensure a stable opcao_id (generate if client sent null = new option / backfill):
    v_opcao_id := COALESCE(NULLIF(v_opcao->>'opcao_id','')::uuid, gen_random_uuid());

    -- accumulate the new opcoes_resposta jsonb in object shape [{id, texto}]:
    v_new_jsonb := v_new_jsonb || jsonb_build_object(
      'id',    v_opcao_id,
      'texto', v_opcao->>'texto'
    );

    INSERT INTO public.pergunta_opcao_metadata
      (pergunta_id, opcao_id, opcao_texto, tag, peso, nota_ia, ordem)
    VALUES (
      p_pergunta_id,
      v_opcao_id,
      v_opcao->>'texto',
      COALESCE(v_opcao->>'tag','neutro')::public.enum_tag_opcao,
      COALESCE((v_opcao->>'peso')::int, 0),
      v_opcao->>'nota_ia',
      COALESCE((v_opcao->>'ordem')::int, 0)
    );
  END LOOP;

  -- write the id-bearing jsonb back to the source of truth:
  UPDATE public.perguntas_formulario
     SET opcoes_resposta = v_new_jsonb, updated_at = now()
   WHERE id = p_pergunta_id;

  RETURN jsonb_build_object('pergunta_id', p_pergunta_id,
                            'opcoes_count', jsonb_array_length(v_new_jsonb));
END;
$function$;
COMMENT ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid,jsonb) IS 'Phase 7 + Phase 25 / VAGACFG-03 + FUNIL-11 (A29): atomic sync of opcoes_resposta jsonb (with stable opcao_id) and pergunta_opcao_metadata. Idempotent (DELETE+re-INSERT). Guards (in-body): role IN (rh,administrador); the pergunta''s vaga must be rascunho (else P0001); rh must own the vaga (else 42501), administrador bypasses. Pergunta-not-found -> no_data_found. GRANT to authenticated.';

-- ACL por DIFERENÇA contra a capturada (`grantee|privilégio|grant_option`; NULL capturado = acldefault).
DO $desfazer_acl$
DECLARE
  c_acl constant jsonb := '{"public.confirmar_revisao_entrevista(uuid)":["postgres|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.contar_pedidos_dados_pendentes()":["postgres|EXECUTE|false","service_role|EXECUTE|false","authenticated|EXECUTE|false"],"public.contar_revisoes_pendentes()":["postgres|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.funil_kpis(uuid)":["postgres|EXECUTE|false","anon|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.ler_resposta_caso_aberto_sjt(uuid)":["postgres|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.liberar_cognitivo(uuid,text)":["postgres|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.listar_historico_candidatura(uuid)":["postgres|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.listar_pedidos_dados(boolean)":["postgres|EXECUTE|false","service_role|EXECUTE|false","authenticated|EXECUTE|false"],"public.listar_revisoes_decisao(boolean)":["postgres|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.registrar_decisao(uuid,public.decisao_final_resultado,text)":["postgres|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.rejeitar_candidatura(uuid,public.motivo_rejeicao_rh,text)":["postgres|EXECUTE|false","anon|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.reprocessar_analise(uuid)":["postgres|EXECUTE|false","anon|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.revogar_cognitivo(uuid,text)":["postgres|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.salvar_avaliacao_entrevista(uuid,jsonb,text)":["postgres|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)":["postgres|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.salvar_revisao_redacao(uuid,text,text,jsonb)":["postgres|EXECUTE|false","anon|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.save_entrevista_guia_edits(uuid,text,jsonb)":["postgres|EXECUTE|false","anon|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"],"public.upsert_pergunta_opcoes_metadata(uuid,jsonb)":["postgres|EXECUTE|false","anon|EXECUTE|false","authenticated|EXECUTE|false","service_role|EXECUTE|false"]}'::jsonb;
  r      record;
  v_oid  oid;
  v_atu  text[];
  v_quer text[];
  e      text;
  g      text;
BEGIN
  FOR r IN SELECT key AS sig, value AS quer FROM jsonb_each(c_acl) LOOP
    v_oid := to_regprocedure(r.sig)::oid;
    SELECT coalesce(array_agg(coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || '|' || a.privilege_type || '|' || a.is_grantable::text), '{}')
      INTO v_atu
      FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
     WHERE p.oid = v_oid;
    SELECT coalesce(array_agg(x), '{}') INTO v_quer FROM jsonb_array_elements_text(r.quer) x;
    FOREACH e IN ARRAY v_atu LOOP
      CONTINUE WHEN e = ANY (v_quer);
      g := split_part(e, '|', 1);
      EXECUTE format('REVOKE %s ON FUNCTION %s FROM %s', split_part(e, '|', 2), v_oid::regprocedure, g);
    END LOOP;
    FOREACH e IN ARRAY v_quer LOOP
      CONTINUE WHEN e = ANY (v_atu);
      g := split_part(e, '|', 1);
      EXECUTE format('GRANT %s ON FUNCTION %s TO %s%s', split_part(e, '|', 2), v_oid::regprocedure, g,
                     CASE WHEN split_part(e, '|', 3) = 'true' THEN ' WITH GRANT OPTION' ELSE '' END);
    END LOOP;
  END LOOP;
END
$desfazer_acl$;

-- ═══ 13 POLICIES — papéis, USING, WITH CHECK e comentário de antes do apply ═══

ALTER POLICY rh_gerencia_agendamento ON public.agendamentos_entrevista
  TO authenticated
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (public.candidaturas c
     JOIN public.vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid)))))))
  WITH CHECK (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (public.candidaturas c
     JOIN public.vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY rh_gerencia_agendamento ON public.agendamentos_entrevista IS 'WR-04 vaga-scoped (join-through-candidaturas): admin bypass OR rh owning the candidatura''s vaga. Sole policy; no candidate policy exists. The denormalized vaga_id is authorization-irrelevant here (scope keyed on candidatura_id -> real vaga) — a spoofed vaga_id cannot cross scope (Pitfall 1; direct form forbidden).';

ALTER POLICY rh_le_analise ON public.analise_candidato_vaga
  TO public
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (vaga_id IN ( SELECT vagas.id
   FROM public.vagas
  WHERE (vagas.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY rh_le_analise ON public.analise_candidato_vaga IS NULL;

ALTER POLICY rh_avanca_etapa ON public.candidaturas
  TO public
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (vaga_id IN ( SELECT vagas.id
   FROM public.vagas
  WHERE (vagas.created_by = ( SELECT auth.uid() AS uid)))))))
  WITH CHECK (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (vaga_id IN ( SELECT vagas.id
   FROM public.vagas
  WHERE (vagas.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY rh_avanca_etapa ON public.candidaturas IS NULL;

ALTER POLICY rh_le_comparativo ON public.comparativo_solicitado
  TO public
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (vaga_id IN ( SELECT vagas.id
   FROM public.vagas
  WHERE (vagas.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY rh_le_comparativo ON public.comparativo_solicitado IS NULL;

ALTER POLICY rh_le_decisao_final ON public.decisao_final
  TO public
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (public.candidaturas c
     JOIN public.vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY rh_le_decisao_final ON public.decisao_final IS 'Phase 15 / WR-03 (15-07 gap closure): leitura de decisao_final escopada por posse da vaga. administrador le tudo; rh le APENAS candidaturas de vagas que possui (candidaturas.vaga_id -> vagas.created_by = auth.uid()). Fecha o gap de acesso horizontal (RH nao-dono lia decisao/justificativa de pares). Espelha o precedente Phase-14 WR-04 (rh_le_scores / rh_le_entrevista_analises). candidato_le_propria_decisao + decisao_final_no_client_insert permanecem intactas.';

ALTER POLICY rh_le_decisao_final_historico ON public.decisao_final_historico
  TO public
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (public.candidaturas c
     JOIN public.vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY rh_le_decisao_final_historico ON public.decisao_final_historico IS 'Phase 25 / FUNIL-09 (A3): leitura de decisao_final_historico escopada por posse da vaga. administrador le tudo; rh le APENAS candidaturas de vagas que possui (candidaturas.vaga_id -> vagas.created_by = auth.uid()). Sem policy candidato-facing — o historico interno de decisao/justificativa/ator nunca e visivel ao candidato. Espelha rh_le_decisao_final (20260625100002).';

ALTER POLICY rh_le_entrevista_analises ON public.entrevista_analises
  TO public
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (public.candidaturas c
     JOIN public.vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY rh_le_entrevista_analises ON public.entrevista_analises IS NULL;

ALTER POLICY rh_le_entrevista_guias ON public.entrevista_guias
  TO public
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (public.candidaturas c
     JOIN public.vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY rh_le_entrevista_guias ON public.entrevista_guias IS NULL;

ALTER POLICY rh_le_historico ON public.historico_candidatura
  TO authenticated
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (public.candidaturas c
     JOIN public.vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY rh_le_historico ON public.historico_candidatura IS NULL;

ALTER POLICY rh_le_notificacoes ON public.notificacoes_enviadas
  TO authenticated
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (public.candidaturas c
     JOIN public.vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY rh_le_notificacoes ON public.notificacoes_enviadas IS 'LEDGER-03 vaga-scoped (join-through-candidaturas): admin bypass OR rh owning the candidatura''s vaga. SOLE policy; no candidate policy exists (candidato-DENY).';

ALTER POLICY redacao_rh_select ON public.redacoes_candidato
  TO authenticated
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (public.candidaturas c
     JOIN public.vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY redacao_rh_select ON public.redacoes_candidato IS NULL;

ALTER POLICY redacao_rh_update ON public.redacoes_candidato
  TO authenticated
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (public.candidaturas c
     JOIN public.vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid)))))))
  WITH CHECK (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (public.candidaturas c
     JOIN public.vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY redacao_rh_update ON public.redacoes_candidato IS NULL;

ALTER POLICY rh_le_scores ON public.scores_candidato
  TO public
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (public.candidaturas c
     JOIN public.vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid)))))));
COMMENT ON POLICY rh_le_scores ON public.scores_candidato IS NULL;

-- ═══ 1 VISTA(S) — reloptions por diferença + comentário ═══
DO $desfazer_vista$
DECLARE
  c_opc constant jsonb := '{"public.v_analises_presas":[]}'::jsonb;
  r      record;
  v_atu  text[];
  v_quer text[];
  o      text;
BEGIN
  FOR r IN SELECT key AS vista, value AS quer FROM jsonb_each(c_opc) LOOP
    SELECT coalesce(c.reloptions, '{}') INTO v_atu FROM pg_catalog.pg_class c WHERE c.oid = to_regclass(r.vista);
    SELECT coalesce(array_agg(x), '{}') INTO v_quer FROM jsonb_array_elements_text(r.quer) x;
    FOREACH o IN ARRAY v_atu LOOP
      CONTINUE WHEN o = ANY (v_quer);
      EXECUTE format('ALTER VIEW %s RESET (%s)', to_regclass(r.vista), split_part(o, '=', 1));
    END LOOP;
    FOREACH o IN ARRAY v_quer LOOP
      CONTINUE WHEN o = ANY (v_atu);
      EXECUTE format('ALTER VIEW %s SET (%s = %L)', to_regclass(r.vista), split_part(o, '=', 1), substr(o, length(split_part(o, '=', 1)) + 2));
    END LOOP;
  END LOOP;
END
$desfazer_vista$;
COMMENT ON VIEW public.v_analises_presas IS 'Candidaturas ACIONAVEIS cuja analise de IA comecou e nao terminou (pendente ha >10 min) ou nunca comecou (sem linha). Restrita a vaga ativa/rascunho e candidatura ainda no funil — em estado saudavel fica VAZIA, e e isso que a faz servir de sinal. Existe porque o dispatch nao serve: net.http_post registrava timeout em toda execucao, inclusive nas bem-sucedidas. Ver 20260826000002.';

-- PÓS-PORTÃO — as 32 impressões digitais = as capturadas antes do apply.
DO $desfazer_pos$
DECLARE
  c_fp   constant jsonb := '{"fn:public.funil_kpis(uuid)":"c3f5be888fb8f4d91284c41562eaf859","vista:public.v_analises_presas":"71832f53afc3979b7736f7965cd2153c","fn:public.reprocessar_analise(uuid)":"4bea8b6f2051bee17031cad6a68f3ee2","fn:public.contar_revisoes_pendentes()":"de12281b8498eb32757b1075c15bc369","fn:public.liberar_cognitivo(uuid,text)":"00cf5f97501b7a1661b86e70e8f15699","fn:public.revogar_cognitivo(uuid,text)":"3fc33ad02c5831ed2095e196e4c993d6","fn:public.listar_pedidos_dados(boolean)":"f4492833b9ffb47576f67c82c7994162","pol:public.candidaturas.rh_avanca_etapa":"f72dba47adc49dd5f3e1953689f75f67","pol:public.scores_candidato.rh_le_scores":"a2190c8769d164066c7b5453b8c986e0","fn:public.contar_pedidos_dados_pendentes()":"3a8911335675a391c3345c45468c2bfd","fn:public.listar_revisoes_decisao(boolean)":"381c9c00374986f4d1c6e5eb4ae61527","fn:public.confirmar_revisao_entrevista(uuid)":"bd19426d58f1c9a319d64a85eeb3c9a4","fn:public.ler_resposta_caso_aberto_sjt(uuid)":"6137a7f93c8bff45be94cf09d14543fc","fn:public.listar_historico_candidatura(uuid)":"961a390230f2d7e4d88e2db1b4b30ab0","pol:public.decisao_final.rh_le_decisao_final":"5786b3bd19704996368f6de488e801e2","pol:public.analise_candidato_vaga.rh_le_analise":"b6db173759d7088f400acba61eb49e45","pol:public.redacoes_candidato.redacao_rh_select":"fd037029dd8b2bb6d51f1369a3aba2eb","pol:public.redacoes_candidato.redacao_rh_update":"80b2d481ed864c1a9682fd61f4f10288","pol:public.historico_candidatura.rh_le_historico":"fd037029dd8b2bb6d51f1369a3aba2eb","pol:public.entrevista_guias.rh_le_entrevista_guias":"a2190c8769d164066c7b5453b8c986e0","pol:public.comparativo_solicitado.rh_le_comparativo":"b6db173759d7088f400acba61eb49e45","pol:public.notificacoes_enviadas.rh_le_notificacoes":"30005b100375d1b3db4b28bb31b42e34","fn:public.save_entrevista_guia_edits(uuid,text,jsonb)":"dff57f3f88da043f317c45c3259b3753","fn:public.upsert_pergunta_opcoes_metadata(uuid,jsonb)":"e2bf4970bd5909cc0cf44abef94685a5","fn:public.salvar_avaliacao_entrevista(uuid,jsonb,text)":"ce0641415cb7746f1906d20717828901","fn:public.salvar_revisao_redacao(uuid,text,text,jsonb)":"5cd809ae3d2cda2c4a85a6643969af37","pol:public.entrevista_analises.rh_le_entrevista_analises":"a2190c8769d164066c7b5453b8c986e0","pol:public.agendamentos_entrevista.rh_gerencia_agendamento":"7b090d29c40046dbb861c5e3bd254fb0","fn:public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)":"83aa5e19d933daa802b1d4b348df7be7","pol:public.decisao_final_historico.rh_le_decisao_final_historico":"3cf02446dab98a8cb939260fd0256a66","fn:public.rejeitar_candidatura(uuid,public.motivo_rejeicao_rh,text)":"cade41e974a311ec8e39275bb03510cb","fn:public.registrar_decisao(uuid,public.decisao_final_resultado,text)":"fa1a729dc4a5196181475ba7dc3260c7"}'::jsonb;
  c_q    constant text  := 'SELECT coalesce(jsonb_object_agg(s.k, s.f), ''{}''::jsonb) FROM ( SELECT ''fn:'' || p.oid::regprocedure::text AS k, md5(((to_jsonb(p) - ''proacl'' - ''proargdefaults'')::text) || ''|'' || pg_catalog.pg_get_function_arguments(p.oid) || ''|'' || coalesce((SELECT string_agg(x, '','' ORDER BY x) FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, ''PUBLIC'') || '':'' || a.privilege_type || '':'' || a.is_grantable::text || '':'' || a.grantor::regrole::text AS x FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault(''f'', p.proowner))) a) s), '''') || ''|'' || coalesce(pg_catalog.obj_description(p.oid, ''pg_proc''), ''<null>'')) AS f FROM pg_catalog.pg_proc p WHERE p.oid = ANY (SELECT to_regprocedure(x)::oid FROM unnest(ARRAY[''public.confirmar_revisao_entrevista(uuid)'', ''public.contar_pedidos_dados_pendentes()'', ''public.contar_revisoes_pendentes()'', ''public.funil_kpis(uuid)'', ''public.ler_resposta_caso_aberto_sjt(uuid)'', ''public.liberar_cognitivo(uuid, text)'', ''public.listar_historico_candidatura(uuid)'', ''public.listar_pedidos_dados(boolean)'', ''public.listar_revisoes_decisao(boolean)'', ''public.registrar_decisao(uuid, public.decisao_final_resultado, text)'', ''public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text)'', ''public.reprocessar_analise(uuid)'', ''public.revogar_cognitivo(uuid, text)'', ''public.salvar_avaliacao_entrevista(uuid, jsonb, text)'', ''public.salvar_avaliacao_entrevista(uuid, uuid, jsonb, text)'', ''public.salvar_revisao_redacao(uuid, text, text, jsonb)'', ''public.save_entrevista_guia_edits(uuid, text, jsonb)'', ''public.upsert_pergunta_opcoes_metadata(uuid, jsonb)'']::text[]) x) UNION ALL SELECT ''pol:'' || n.nspname || ''.'' || c.relname || ''.'' || pol.polname, md5(pol.polcmd::text || ''|'' || pol.polpermissive::text || ''|'' || coalesce((SELECT string_agg(CASE WHEN r = 0 THEN ''public'' ELSE r::regrole::text END, '','' ORDER BY CASE WHEN r = 0 THEN ''public'' ELSE r::regrole::text END) FROM unnest(pol.polroles) r), '''') || ''|'' || coalesce(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid), ''<null>'') || ''|'' || coalesce(pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid), ''<null>'') || ''|'' || coalesce(pg_catalog.obj_description(pol.oid, ''pg_policy''), ''<null>'')) FROM pg_catalog.pg_policy pol JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE (n.nspname || ''.'' || c.relname || ''.'' || pol.polname) = ANY (ARRAY[''public.agendamentos_entrevista.rh_gerencia_agendamento'', ''public.analise_candidato_vaga.rh_le_analise'', ''public.candidaturas.rh_avanca_etapa'', ''public.comparativo_solicitado.rh_le_comparativo'', ''public.decisao_final_historico.rh_le_decisao_final_historico'', ''public.decisao_final.rh_le_decisao_final'', ''public.entrevista_analises.rh_le_entrevista_analises'', ''public.entrevista_guias.rh_le_entrevista_guias'', ''public.historico_candidatura.rh_le_historico'', ''public.notificacoes_enviadas.rh_le_notificacoes'', ''public.redacoes_candidato.redacao_rh_select'', ''public.redacoes_candidato.redacao_rh_update'', ''public.scores_candidato.rh_le_scores'']::text[]) UNION ALL SELECT ''vista:'' || n.nspname || ''.'' || c.relname, md5(coalesce((SELECT string_agg(o, '','' ORDER BY o) FROM unnest(c.reloptions) o), '''') || ''|'' || md5(pg_catalog.pg_get_viewdef(c.oid)) || ''|'' || coalesce(pg_catalog.obj_description(c.oid, ''pg_class''), ''<null>'')) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.oid = ANY (SELECT to_regclass(x)::oid FROM unnest(ARRAY[''public.v_analises_presas'']::text[]) x)) s';
  v_sp   text := current_setting('search_path');
  v_fp   jsonb;
  v_dif  text;
  v_falt text;
  v_n    int;
BEGIN
  PERFORM set_config('search_path', '', true);
  EXECUTE c_q INTO v_fp;
  PERFORM set_config('search_path', v_sp, true);
  SELECT string_agg(k, ',' ORDER BY k) INTO v_falt FROM jsonb_object_keys(c_fp) k WHERE NOT v_fp ? k;
  SELECT string_agg(k, ',' ORDER BY k), count(*) INTO v_dif, v_n FROM jsonb_object_keys(c_fp) k WHERE v_fp ? k AND (v_fp ->> k) IS DISTINCT FROM (c_fp ->> k);
  IF v_falt IS NOT NULL OR v_n > 0 THEN
    RAISE EXCEPTION 'P50D FAIL (pos): o desfazer NAO devolveu o catalogo ao estado capturado — ausentes=% diferentes=%', coalesce(v_falt, '-'), coalesce(v_dif, '-');
  END IF;
  PERFORM set_config('p50.evidencia', concat_ws(';', nullif(current_setting('p50.evidencia', true), ''),
            'desfazer:pre_diferentes=' || current_setting('p50.desfazer_pre', true) || ',pos=iguais:' || (SELECT count(*) FROM jsonb_object_keys(c_fp))), true);
END
$desfazer_pos$;
