-- =============================================================================
-- 20261005000002 — as 13 policies restantes do predicado de posse (`created_by`) passam a
--                  «rh ATIVO vê todas» pelo helper vivo ; public.v_analises_presas passa a
--                  security_invoker = true
-- =============================================================================
-- Phase 50 / Plano 50-03 · EXPORT-05 (metade «visível ao RH», gap G4-b) · D-01, D-02, D-05,
-- D-07, D-09, D-12 · EXPANSÃO do tracer: o mesmo helper (`public.is_active_rh_user()`, vivo
-- desde o 50-02, migration 20261005000001) e a mesma forma que o tracer provou em
-- `candidaturas.rh_le_candidaturas`, agora nas tabelas filhas.
--
-- O QUE ESTAVA ERRADO.
--   Depois do 50-02 o recrutador ativo vê as linhas de `candidaturas` de todas as vagas, mas as
--   tabelas FILHAS seguem escopadas por posse da vaga: `vaga_id IN (SELECT vagas.id FROM vagas
--   WHERE vagas.created_by = auth.uid())` (Forma A) ou `candidatura_id IN (SELECT c.id FROM
--   candidaturas c JOIN vagas v ON v.id = c.vaga_id WHERE v.created_by = auth.uid())` (Forma B).
--   Um recrutador que não criou a vaga vê a candidatura e 0 decisões, 0 scores, 0 histórico,
--   0 guias, 0 análises, 0 redações, 0 agendamentos, 0 notificações — a página de decisão e o
--   hub ficam vazios para ele.
--
--   Decisão do operador (`44-PENDENCIAS-2026-10-03.md` §G4-b, 2026-10-04), verbatim: «acho nesse
--   momento melhor deixar o recrutador ver todas as vagas abertas, nao precisamos selecionar
--   neste momento, ou se achar melhor assiciar vagas a recrutadores, mas nao ele so ver as que
--   ele criou». 50-CONTEXT D-01: «Recrutador ativo vê **todas** as vagas e tudo que pende delas
--   — sem associação por vaga». D-02: «Um único helper vivo (`public.is_active_rh_user()`,
--   checa `usuarios_rh.ativo` em tempo real) em todo ramo alargado — fecha a janela de até 1 h
--   do JWT de um recrutador desativado. O ramo do administrador fica byte-idêntico.» D-05:
--   `v_analises_presas` ganha `security_invoker = true`.
--
-- MEDIDO EM PROD (2026-10-05 ~20:15Z, só leitura, `set transaction read only`, re-medido na
-- execução do 50-03 — igual à medição do RESEARCH §A):
--   md5(coalesce(qual,'')||'|'||coalesce(with_check,''))      cmd     roles            WITH CHECK
--   agendamentos_entrevista.rh_gerencia_agendamento
--                                  c754871ab4282a43970ac4ff7adcc2a3  ALL     {authenticated}  sim
--   analise_candidato_vaga.rh_le_analise
--                                  d4e7e94c496cb493efc9c31e923f6cbd  SELECT  {public}         não
--   candidaturas.rh_avanca_etapa   7cbcf97ad0b1da27c508eaacba5ab0aa  UPDATE  {public}         sim
--   comparativo_solicitado.rh_le_comparativo
--                                  d4e7e94c496cb493efc9c31e923f6cbd  SELECT  {public}         não
--   decisao_final.rh_le_decisao_final
--                                  b6abcc34e20e42c3d08fbe81251d381c  SELECT  {public}         não
--   decisao_final_historico.rh_le_decisao_final_historico
--                                  b6abcc34e20e42c3d08fbe81251d381c  SELECT  {public}         não
--   entrevista_analises.rh_le_entrevista_analises
--                                  b6abcc34e20e42c3d08fbe81251d381c  SELECT  {public}         não
--   entrevista_guias.rh_le_entrevista_guias
--                                  b6abcc34e20e42c3d08fbe81251d381c  SELECT  {public}         não
--   historico_candidatura.rh_le_historico
--                                  b6abcc34e20e42c3d08fbe81251d381c  SELECT  {authenticated}  não
--   notificacoes_enviadas.rh_le_notificacoes
--                                  b6abcc34e20e42c3d08fbe81251d381c  SELECT  {authenticated}  não
--   redacoes_candidato.redacao_rh_select
--                                  b6abcc34e20e42c3d08fbe81251d381c  SELECT  {authenticated}  não
--   redacoes_candidato.redacao_rh_update
--                                  c754871ab4282a43970ac4ff7adcc2a3  UPDATE  {authenticated}  sim
--   scores_candidato.rh_le_scores  b6abcc34e20e42c3d08fbe81251d381c  SELECT  {public}         não
--   Todas PERMISSIVE. Além delas, só `candidaturas.rh_le_candidaturas` (já reescrita pelo 0001)
--   tem `= 'rh'::text`; nenhuma outra policy, em nenhum schema, casa `created_by`.
--   `public.v_analises_presas`: dono postgres, `reloptions` NULL (sem security_invoker), ACL
--   `{postgres=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}`,
--   anon sem SELECT, authenticated com SELECT, 0 linhas hoje.
--
-- POR QUE TO authenticated EM TODAS. Oito delas são `{public}` hoje: `anon` as avalia. O helper
--   tem EXECUTE revogado de `anon` (0001); uma policy `{public}` que o chama faria leituras de
--   `anon` falharem por «permission denied for function» — ou alguém «consertaria» dando
--   EXECUTE a `anon`. `TO authenticated` tira `anon` destas policies: negação padrão para ele.
--   As cinco que já são `{authenticated}` são reescritas com o mesmo `TO` (inócuo, explícito).
--
-- AS DUAS FORMAS DO RAMO `rh` (o ramo do administrador é reescrito com o MESMO texto-fonte de
--   hoje em todas; o pós-portão compara o disjunto desparseado antes × depois, por policy, no
--   USING e no WITH CHECK):
--   · Forma A (chave `vaga_id`: rh_le_analise, rh_le_comparativo, rh_avanca_etapa USING+CHECK):
--     claim `rh` AND `(SELECT public.is_active_rh_user())` — nada mais. A posse sai.
--   · Forma B (chave `candidatura_id`: as outras 10; WITH CHECK também em
--     rh_gerencia_agendamento e redacao_rh_update): claim `rh` AND helper AND `candidatura_id IN
--     (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho =
--     false)`. POR QUE O FILTRO DE CANDIDATURA VIVA FICA (RESEARCH A5): é a semântica EFETIVA de
--     hoje — a subconsulta antiga sobre `candidaturas` já era filtrada, para o chamador rh, pelas
--     condições `deleted_at IS NULL AND is_rascunho = false` de `rh_le_candidaturas`, porque a
--     RLS se aplica dentro de subconsultas de policy. Escrever o filtro deixa a regra visível em
--     vez de depender do aninhamento. O administrador segue vendo tudo, inclusive filhas de
--     candidaturas mortas. Nenhum filtro esconde dado de teste (`fixture-p46`, `[TESTE]`) — D-07.
--
-- UM TEXTO PARA NOTIFICAÇÕES E AGENDAMENTO. `p37_fidelidade_schema_smoke.sql` (e) exige
--   `notificacoes_enviadas.rh_le_notificacoes.qual` BYTE-IDÊNTICO a
--   `agendamentos_entrevista.rh_gerencia_agendamento.qual` e os dois `{authenticated}`. As duas
--   cláusulas USING abaixo são a MESMA linha copiada; o pós-portão compara os quals
--   desparseados. (A narrativa da cláusula (e), «join-through vaga-scoped», fica velha — o
--   conserto do texto daquele smoke é de outro plano da fase.)
--
-- INTEGRIDADE QUE FICA (D-09: alargar não é remover integridade). `trg_agendamento_normaliza_vaga`
--   (mantém `agendamentos_entrevista.vaga_id` igual à vaga da candidatura) não é tocado. As
--   policies do TITULAR (candidato lê o que é seu) não são tocadas. Nenhum DROP/CREATE POLICY:
--   só `ALTER POLICY` das 13, no lugar (nome, comando e PERMISSIVE ficam).
--
-- v_analises_presas (D-05). Dono postgres SEM security_invoker: lê as tabelas base como dono e
--   IGNORA a RLS — qualquer autenticado (candidato inclusive) leria candidatura_id, vaga_id,
--   vaga_slug, situação e erro de análises presas. Hoje ela está vazia, e é por isso que não vaza
--   NADA hoje — a armadilha da população vazia. Com `security_invoker = true` ela passa pela RLS
--   de `candidaturas`/`vagas`/`analise_candidato_vaga` de quem consulta: o RH a lê pelas policies
--   alargadas, o candidato não ganha nada. O GRANT SELECT a authenticated FICA (não copiar o
--   REVOKE de 20260921000017 — esta view tem leitor legítimo).
--
-- LOCK. Cada `ALTER POLICY` toma `AccessExclusiveLock` na sua tabela até o fim da transação: 12
--   tabelas (agendamentos_entrevista, analise_candidato_vaga, candidaturas — quente —,
--   comparativo_solicitado, decisao_final, decisao_final_historico, entrevista_analises,
--   entrevista_guias, historico_candidatura, notificacoes_enviadas, redacoes_candidato,
--   scores_candidato) e mais a view. Uma leitura que espere mais de ~8 s atrás do lock FALHA
--   (`statement_timeout` de `authenticated`/`authenticator`). `lock_timeout = 3s` limita quanto
--   tempo CADA pedido de lock fica na fila; `statement_timeout = 5s` limita cada instrução com os
--   locks seguros. Os limites estão NO ARQUIVO porque o `p46apply.cjs migrate` manda o arquivo
--   byte a byte e o md5 do ledger é o dele. Timeout = a requisição inteira aborta; repetir numa
--   janela calma. Subir o teto é decisão do operador.
--
-- IDEMPOTÊNCIA: o pré-portão exige as 13 policies com o md5, o cmd e os papéis medidos acima e a
--   view SEM security_invoker; reaplicar por cima de si mesma aborta (md5 novo ≠ medido) em vez
--   de sobrescrever em silêncio. Nenhum DML de dado.
--
-- EVIDÊNCIA: a Management API não devolve NOTICE; o pós-portão ANEXA à GUC de sessão
--   `p50.evidencia` `03:<policy>=<md5 novo>,…` (13) e `03:view_invoker=true`, que o
--   `scripts/p50_ensaio.cjs` copia na linha de veredito.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com COMMENT
-- adjacente é a forma exata do 42601, e o endpoint já roda a requisição inteira numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261005000002_p50_policies_rh_ativo.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação). NÃO aplicar
-- antes da review bloqueante do 50-10 (D-12). Pré-requisito: 20261005000001 aplicada (helper).
-- =============================================================================

-- Limites de espera e de posse do lock (ver «LOCK»).
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- PRÉ-PORTÃO — helper vivo; as 13 policies com o md5/cmd/papéis medidos; view sem invoker.
-- Guarda, por policy, o disjunto do administrador (texto desparseado antes do primeiro ` OR `
-- de nível superior) do USING e do WITH CHECK, em GUCs locais `p50.admin.<policy>.q` / `.c`,
-- e o escopo (`p50.p03.escopo`) para o pós-portão percorrer a MESMA lista.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre_portao$
DECLARE
  r       record;
  v_qual  text;
  v_wc    text;
  v_roles text;
  v_cmd   text;
  v_md5   text;
  v_lado  text;
  v_txt   text;
  v_depth int;
  v_inq   boolean;
  v_cut   int;
  v_ch    text;
  v_esc   text[] := '{}';
  v_n     int := 0;
  i       int;
BEGIN
  IF to_regprocedure('public.is_active_rh_user()') IS NULL THEN
    RAISE EXCEPTION 'P50-03 PRE-PORTAO: public.is_active_rh_user() nao existe — aplicar 20261005000001 primeiro (as 13 policies chamam o helper).';
  END IF;

  IF to_regclass('public.v_analises_presas') IS NULL THEN
    RAISE EXCEPTION 'P50-03 PRE-PORTAO: a view public.v_analises_presas nao existe — medir de novo e decidir A MAO.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c, pg_catalog.pg_options_to_table(c.reloptions) o
              WHERE c.oid = 'public.v_analises_presas'::regclass AND o.option_name = 'security_invoker') THEN
    RAISE EXCEPTION 'P50-03 PRE-PORTAO: public.v_analises_presas ja tem security_invoker definido — medido sem; medir de novo e decidir A MAO.';
  END IF;

  -- ESCOPO DELIBERADO deste arquivo, não fotografia (CLAUDE.md §Portões): as 13 policies que ele
  -- reescreve, cada uma com o md5/cmd/papéis medidos em 2026-10-05. Uma 14ª policy com posse que
  -- nascesse depois não entra aqui — quem a pega é a varredura POR FORMA do pós-portão.
  FOR r IN
    SELECT * FROM (VALUES
      ('agendamentos_entrevista', 'rh_gerencia_agendamento',       'ALL',    '{authenticated}', 'c754871ab4282a43970ac4ff7adcc2a3'),
      ('analise_candidato_vaga',  'rh_le_analise',                 'SELECT', '{public}',        'd4e7e94c496cb493efc9c31e923f6cbd'),
      ('candidaturas',            'rh_avanca_etapa',               'UPDATE', '{public}',        '7cbcf97ad0b1da27c508eaacba5ab0aa'),
      ('comparativo_solicitado',  'rh_le_comparativo',             'SELECT', '{public}',        'd4e7e94c496cb493efc9c31e923f6cbd'),
      ('decisao_final',           'rh_le_decisao_final',           'SELECT', '{public}',        'b6abcc34e20e42c3d08fbe81251d381c'),
      ('decisao_final_historico', 'rh_le_decisao_final_historico', 'SELECT', '{public}',        'b6abcc34e20e42c3d08fbe81251d381c'),
      ('entrevista_analises',     'rh_le_entrevista_analises',     'SELECT', '{public}',        'b6abcc34e20e42c3d08fbe81251d381c'),
      ('entrevista_guias',        'rh_le_entrevista_guias',        'SELECT', '{public}',        'b6abcc34e20e42c3d08fbe81251d381c'),
      ('historico_candidatura',   'rh_le_historico',               'SELECT', '{authenticated}', 'b6abcc34e20e42c3d08fbe81251d381c'),
      ('notificacoes_enviadas',   'rh_le_notificacoes',            'SELECT', '{authenticated}', 'b6abcc34e20e42c3d08fbe81251d381c'),
      ('redacoes_candidato',      'redacao_rh_select',             'SELECT', '{authenticated}', 'b6abcc34e20e42c3d08fbe81251d381c'),
      ('redacoes_candidato',      'redacao_rh_update',             'UPDATE', '{authenticated}', 'c754871ab4282a43970ac4ff7adcc2a3'),
      ('scores_candidato',        'rh_le_scores',                  'SELECT', '{public}',        'b6abcc34e20e42c3d08fbe81251d381c')
    ) AS e(tab, pol, cmd, roles, md5)
  LOOP
    SELECT p.qual, p.with_check, p.roles::text, p.cmd,
           md5(coalesce(p.qual, '') || '|' || coalesce(p.with_check, ''))
      INTO v_qual, v_wc, v_roles, v_cmd, v_md5
      FROM pg_catalog.pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = r.tab AND p.policyname = r.pol;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'P50-03 PRE-PORTAO: a policy %.% nao existe — medir de novo e decidir A MAO.', r.tab, r.pol;
    END IF;
    IF v_md5 IS DISTINCT FROM r.md5 THEN
      RAISE EXCEPTION 'P50-03 PRE-PORTAO: md5(qual|with_check) de %.% = % (medido em 2026-10-05: %) — alguem mudou a policy depois da medicao (ou esta migration ja rodou); medir de novo e decidir A MAO.', r.tab, r.pol, v_md5, r.md5;
    END IF;
    IF v_roles IS DISTINCT FROM r.roles THEN
      RAISE EXCEPTION 'P50-03 PRE-PORTAO: roles de %.% = % (medido: %) — medir de novo e decidir A MAO.', r.tab, r.pol, v_roles, r.roles;
    END IF;
    IF v_cmd IS DISTINCT FROM r.cmd THEN
      RAISE EXCEPTION 'P50-03 PRE-PORTAO: cmd de %.% = % (medido: %) — medir de novo e decidir A MAO.', r.tab, r.pol, v_cmd, r.cmd;
    END IF;

    -- Disjunto do administrador, no USING (q) e no WITH CHECK (c): o texto desparseado é
    -- `((A) OR (B))`; corta no primeiro ` OR ` de profundidade 1, fora de literal.
    FOREACH v_lado IN ARRAY ARRAY['q', 'c'] LOOP
      v_txt := CASE v_lado WHEN 'q' THEN v_qual ELSE v_wc END;
      IF v_txt IS NULL THEN
        IF v_lado = 'q' THEN
          RAISE EXCEPTION 'P50-03 PRE-PORTAO: %.% sem USING — forma inesperada; medir de novo e decidir A MAO.', r.tab, r.pol;
        END IF;
        PERFORM set_config(format('p50.admin.%s.%s', r.pol, v_lado), '', true);
        CONTINUE;
      END IF;
      IF left(v_txt, 1) IS DISTINCT FROM '(' THEN
        RAISE EXCEPTION 'P50-03 PRE-PORTAO: %.% (%) nao comeca com parentese («%») — forma inesperada; medir de novo e decidir A MAO.', r.tab, r.pol, v_lado, left(v_txt, 80);
      END IF;
      v_depth := 0;
      v_inq := false;
      v_cut := NULL;
      FOR i IN 1 .. length(v_txt) LOOP
        v_ch := substr(v_txt, i, 1);
        IF v_ch = '''' THEN
          v_inq := NOT v_inq;
        ELSIF NOT v_inq AND v_ch = '(' THEN
          v_depth := v_depth + 1;
        ELSIF NOT v_inq AND v_ch = ')' THEN
          v_depth := v_depth - 1;
        ELSIF NOT v_inq AND v_depth = 1 AND substr(v_txt, i, 4) = ' OR ' THEN
          v_cut := i;
          EXIT;
        END IF;
      END LOOP;
      IF v_cut IS NULL THEN
        RAISE EXCEPTION 'P50-03 PRE-PORTAO: %.% (%) sem OR de nivel superior — forma inesperada; medir de novo e decidir A MAO.', r.tab, r.pol, v_lado;
      END IF;
      v_txt := substr(v_txt, 2, v_cut - 2);
      IF strpos(v_txt, '''administrador''') = 0 THEN
        RAISE EXCEPTION 'P50-03 PRE-PORTAO: %.% (%) — o primeiro disjunto nao e o do administrador («%»); medir de novo e decidir A MAO.', r.tab, r.pol, v_lado, v_txt;
      END IF;
      PERFORM set_config(format('p50.admin.%s.%s', r.pol, v_lado), v_txt, true);
    END LOOP;

    v_esc := v_esc || format('%s.%s', r.tab, r.pol);
    v_n := v_n + 1;
  END LOOP;

  PERFORM set_config('p50.p03.escopo', array_to_string(v_esc, ','), true);
  RAISE NOTICE 'P50-03 PRE-PORTAO OK — helper presente ; % policies com md5/cmd/roles medidos ; v_analises_presas sem security_invoker', v_n;
END
$pre_portao$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Forma A (chave vaga_id) — rh ativo, sem posse; administrador com o texto de hoje.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER POLICY rh_le_analise ON public.analise_candidato_vaga
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()))
  );

ALTER POLICY rh_le_comparativo ON public.comparativo_solicitado
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()))
  );

ALTER POLICY rh_avanca_etapa ON public.candidaturas
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()))
  )
  WITH CHECK (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()))
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- Forma B (chave candidatura_id) — rh ativo, filhas de candidaturas VIVAS; administrador com o
-- texto de hoje. A linha do ramo rh é a MESMA em todas (p37_fidelidade (e): notificações =
-- agendamento, byte a byte).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER POLICY rh_gerencia_agendamento ON public.agendamentos_entrevista
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)))
  )
  WITH CHECK (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)))
  );

ALTER POLICY rh_le_notificacoes ON public.notificacoes_enviadas
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)))
  );

ALTER POLICY rh_le_decisao_final ON public.decisao_final
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)))
  );

ALTER POLICY rh_le_decisao_final_historico ON public.decisao_final_historico
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)))
  );

ALTER POLICY rh_le_entrevista_analises ON public.entrevista_analises
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)))
  );

ALTER POLICY rh_le_entrevista_guias ON public.entrevista_guias
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)))
  );

ALTER POLICY rh_le_historico ON public.historico_candidatura
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)))
  );

ALTER POLICY redacao_rh_select ON public.redacoes_candidato
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)))
  );

ALTER POLICY redacao_rh_update ON public.redacoes_candidato
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)))
  )
  WITH CHECK (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)))
  );

ALTER POLICY rh_le_scores ON public.scores_candidato
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND (SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)))
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- Comentários — substituem os que descreviam o escopo por posse (Phase 14/15/25/33/37).
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON POLICY rh_le_analise ON public.analise_candidato_vaga IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) ve todas as analises, de todas as vagas — sem posse da vaga; administrador inalterado. TO authenticated: anon nao avalia esta policy.';
COMMENT ON POLICY rh_le_comparativo ON public.comparativo_solicitado IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) ve todos os comparativos, de todas as vagas — sem posse da vaga; administrador inalterado. TO authenticated: anon nao avalia esta policy.';
COMMENT ON POLICY rh_avanca_etapa ON public.candidaturas IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) atualiza candidaturas de todas as vagas (USING e WITH CHECK) — sem posse da vaga; administrador inalterado. A leitura do rh segue limitada a candidaturas vivas por rh_le_candidaturas. TO authenticated.';
COMMENT ON POLICY rh_gerencia_agendamento ON public.agendamentos_entrevista IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) gerencia agendamentos de todas as candidaturas vivas (deleted_at IS NULL, is_rascunho = false) — sem posse da vaga; administrador inalterado. Escopo pela candidatura_id (o vaga_id denormalizado segue normalizado por trg_agendamento_normaliza_vaga, D-09). qual byte-identico a rh_le_notificacoes (p37_fidelidade (e)).';
COMMENT ON POLICY rh_le_notificacoes ON public.notificacoes_enviadas IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) ve as notificacoes de todas as candidaturas vivas — sem posse da vaga; administrador inalterado. Policy UNICA da tabela (sem policy de candidato: candidato-DENY). qual byte-identico a rh_gerencia_agendamento (p37_fidelidade (e)).';
COMMENT ON POLICY rh_le_decisao_final ON public.decisao_final IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) ve a decisao final de todas as candidaturas vivas — sem posse da vaga; administrador inalterado. candidato_le_propria_decisao e decisao_final_no_client_insert intactas.';
COMMENT ON POLICY rh_le_decisao_final_historico ON public.decisao_final_historico IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) ve o historico de decisao de todas as candidaturas vivas — sem posse da vaga; administrador inalterado. Sem policy candidato-facing (historico interno nunca visivel ao candidato).';
COMMENT ON POLICY rh_le_entrevista_analises ON public.entrevista_analises IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) ve as analises de entrevista de todas as candidaturas vivas — sem posse da vaga; administrador inalterado.';
COMMENT ON POLICY rh_le_entrevista_guias ON public.entrevista_guias IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) ve os guias de entrevista de todas as candidaturas vivas — sem posse da vaga; administrador inalterado.';
COMMENT ON POLICY rh_le_historico ON public.historico_candidatura IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) ve o historico de todas as candidaturas vivas — sem posse da vaga; administrador inalterado.';
COMMENT ON POLICY redacao_rh_select ON public.redacoes_candidato IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) le as redacoes de todas as candidaturas vivas — sem posse da vaga; administrador inalterado.';
COMMENT ON POLICY redacao_rh_update ON public.redacoes_candidato IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) atualiza redacoes de todas as candidaturas vivas (USING e WITH CHECK) — sem posse da vaga; administrador inalterado.';
COMMENT ON POLICY rh_le_scores ON public.scores_candidato IS
  'P50 / D-01, D-02: rh ativo (helper vivo is_active_rh_user) ve os scores de todas as candidaturas vivas — sem posse da vaga; administrador inalterado.';


-- ─────────────────────────────────────────────────────────────────────────────
-- v_analises_presas — passa pela RLS de quem consulta (D-05). Grants intocados.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER VIEW public.v_analises_presas SET (security_invoker = true);

COMMENT ON VIEW public.v_analises_presas IS
  'Candidaturas ACIONAVEIS cuja analise de IA comecou e nao terminou (pendente ha >10 min) ou nunca comecou (sem linha). Restrita a vaga ativa/rascunho e candidatura ainda no funil — em estado saudavel fica VAZIA, e e isso que a faz servir de sinal. Existe porque o dispatch nao serve: net.http_post registrava timeout em toda execucao, inclusive nas bem-sucedidas. Ver 20260826000002. P50 / D-05: security_invoker = true — le candidaturas/vagas/analise_candidato_vaga pela RLS de quem consulta (antes lia como dono e ignorava a RLS: qualquer autenticado, candidato inclusive, veria as linhas). GRANT SELECT a authenticated mantido.';


-- ─────────────────────────────────────────────────────────────────────────────
-- PÓS-PORTÃO — o que ficou no catálogo é o que este arquivo diz.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos_portao$
DECLARE
  v_esc   text[] := string_to_array(nullif(current_setting('p50.p03.escopo', true), ''), ',');
  v_item  text;
  v_tab   text;
  v_pol   text;
  v_qual  text;
  v_wc    text;
  v_roles text;
  v_md5   text;
  v_lado  text;
  v_txt   text;
  v_adm   text;
  v_depth int;
  v_inq   boolean;
  v_cut   int;
  v_ch    text;
  v_ev    text[] := '{}';
  v_q1    text;
  v_q2    text;
  v_n     int;
  v_lst   text;
  i       int;
BEGIN
  IF v_esc IS NULL OR cardinality(v_esc) <> 13 THEN
    RAISE EXCEPTION 'P50-03 POS-PORTAO: escopo do pre-portao ausente ou incompleto (%) — o pre-portao nao rodou nesta transacao', v_esc;
  END IF;

  FOREACH v_item IN ARRAY v_esc LOOP
    v_tab := split_part(v_item, '.', 1);
    v_pol := split_part(v_item, '.', 2);
    SELECT p.qual, p.with_check, p.roles::text,
           md5(coalesce(p.qual, '') || '|' || coalesce(p.with_check, ''))
      INTO v_qual, v_wc, v_roles, v_md5
      FROM pg_catalog.pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = v_tab AND p.policyname = v_pol;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'P50-03 POS-PORTAO: a policy % sumiu', v_item;
    END IF;
    IF v_roles IS DISTINCT FROM '{authenticated}' THEN
      RAISE EXCEPTION 'P50-03 POS-PORTAO: roles de % = % (esperado {authenticated})', v_item, v_roles;
    END IF;
    IF coalesce(v_qual, '') || coalesce(v_wc, '') ~* 'created_by' THEN
      RAISE EXCEPTION 'P50-03 POS-PORTAO: % ainda casa created_by: % | %', v_item, v_qual, v_wc;
    END IF;
    -- WITH CHECK existe hoje exatamente onde existia antes (guardado no pré-portão como '' quando nulo).
    IF (v_wc IS NULL) IS DISTINCT FROM (current_setting(format('p50.admin.%s.c', v_pol), true) = '') THEN
      RAISE EXCEPTION 'P50-03 POS-PORTAO: WITH CHECK de % mudou de presenca (antes %, depois %)', v_item,
        CASE WHEN current_setting(format('p50.admin.%s.c', v_pol), true) = '' THEN 'ausente' ELSE 'presente' END,
        CASE WHEN v_wc IS NULL THEN 'ausente' ELSE 'presente' END;
    END IF;

    FOREACH v_lado IN ARRAY ARRAY['q', 'c'] LOOP
      v_txt := CASE v_lado WHEN 'q' THEN v_qual ELSE v_wc END;
      IF v_txt IS NULL THEN
        CONTINUE;
      END IF;
      -- Desparse mostra o helper SEM o schema quando `public` está no search_path: casar o nome solto.
      IF position('is_active_rh_user' IN v_txt) = 0 THEN
        RAISE EXCEPTION 'P50-03 POS-PORTAO: % (%) nao chama is_active_rh_user: %', v_item, v_lado, v_txt;
      END IF;
      v_depth := 0;
      v_inq := false;
      v_cut := NULL;
      FOR i IN 1 .. length(v_txt) LOOP
        v_ch := substr(v_txt, i, 1);
        IF v_ch = '''' THEN
          v_inq := NOT v_inq;
        ELSIF NOT v_inq AND v_ch = '(' THEN
          v_depth := v_depth + 1;
        ELSIF NOT v_inq AND v_ch = ')' THEN
          v_depth := v_depth - 1;
        ELSIF NOT v_inq AND v_depth = 1 AND substr(v_txt, i, 4) = ' OR ' THEN
          v_cut := i;
          EXIT;
        END IF;
      END LOOP;
      v_adm := CASE WHEN v_cut IS NULL OR left(v_txt, 1) <> '(' THEN NULL ELSE substr(v_txt, 2, v_cut - 2) END;
      IF v_adm IS DISTINCT FROM current_setting(format('p50.admin.%s.%s', v_pol, v_lado), true) THEN
        RAISE EXCEPTION 'P50-03 POS-PORTAO: o disjunto do administrador de % (%) mudou — antes «%», depois «%» (D-02: byte-identico)',
          v_item, v_lado, current_setting(format('p50.admin.%s.%s', v_pol, v_lado), true), v_adm;
      END IF;
    END LOOP;

    v_ev := v_ev || format('%s=%s', v_pol, v_md5);
  END LOOP;

  -- p37_fidelidade (e): os dois quals byte-idênticos.
  SELECT p.qual INTO v_q1 FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'notificacoes_enviadas' AND p.policyname = 'rh_le_notificacoes';
  SELECT p.qual INTO v_q2 FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'agendamentos_entrevista' AND p.policyname = 'rh_gerencia_agendamento';
  IF v_q1 IS NULL OR v_q1 IS DISTINCT FROM v_q2 THEN
    RAISE EXCEPTION 'P50-03 POS-PORTAO: rh_le_notificacoes.qual difere de rh_gerencia_agendamento.qual (p37_fidelidade (e)) — notificacoes «%» · agendamento «%»', v_q1, v_q2;
  END IF;

  -- POR FORMA, sobre o catálogo inteiro (todos os schemas): nenhuma policy com posse sobrou
  -- (somando a do 0001), e todo ramo `= 'rh'::text` chama o helper.
  SELECT count(*), string_agg(p.schemaname || '.' || p.tablename || '.' || p.policyname, ', ')
    INTO v_n, v_lst
    FROM pg_catalog.pg_policies p
   WHERE coalesce(p.qual, '') || coalesce(p.with_check, '') ~* 'created_by';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'P50-03 POS-PORTAO: % policy(ies) ainda casam created_by: %', v_n, v_lst;
  END IF;
  SELECT count(*), string_agg(p.schemaname || '.' || p.tablename || '.' || p.policyname, ', ')
    INTO v_n, v_lst
    FROM pg_catalog.pg_policies p
   WHERE strpos(coalesce(p.qual, '') || coalesce(p.with_check, ''), '= ''rh''::text') > 0
     AND strpos(coalesce(p.qual, '') || coalesce(p.with_check, ''), 'is_active_rh_user') = 0;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'P50-03 POS-PORTAO: % policy(ies) com ramo = ''rh'' sem o helper vivo (token antigo de desativado passaria): %', v_n, v_lst;
  END IF;

  -- v_analises_presas: invoker, anon sem leitura, authenticated mantém a leitura.
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c, pg_catalog.pg_options_to_table(c.reloptions) o
                  WHERE c.oid = 'public.v_analises_presas'::regclass AND o.option_name = 'security_invoker'
                    AND o.option_value IN ('true', 'on')) THEN
    RAISE EXCEPTION 'P50-03 POS-PORTAO: public.v_analises_presas sem security_invoker = true';
  END IF;
  IF has_table_privilege('anon', 'public.v_analises_presas', 'SELECT') THEN
    RAISE EXCEPTION 'P50-03 POS-PORTAO: anon tem SELECT em public.v_analises_presas';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.v_analises_presas', 'SELECT') THEN
    RAISE EXCEPTION 'P50-03 POS-PORTAO: authenticated perdeu SELECT em public.v_analises_presas (o GRANT deveria ficar)';
  END IF;

  PERFORM set_config('p50.evidencia',
    concat_ws(';', nullif(current_setting('p50.evidencia', true), ''),
              '03:' || array_to_string(v_ev, ','),
              '03:view_invoker=true'),
    false);

  RAISE NOTICE 'P50-03 POS-PORTAO OK — 13 policies {authenticated} com o helper, admin inalterado, notificacoes = agendamento ; 0 policy com created_by ; todo ramo rh chama o helper ; v_analises_presas invoker, anon sem SELECT';
END
$pos_portao$;
