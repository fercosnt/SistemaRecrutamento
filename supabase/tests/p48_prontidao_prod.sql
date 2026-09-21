SET TRANSACTION READ ONLY;
-- =============================================================================
-- p48_prontidao_prod.sql — sonda de prontidão da Phase 48 em PROD (plano 48-18, Task 1)
-- =============================================================================
-- SÓ LEITURA, por construção: a primeira instrução trava a transação em READ ONLY,
-- e o resto é um único SELECT sobre o catálogo. Nada aqui escreve, e nada vai para o
-- ledger de migrations. Rodar com:
--
--   node p46apply.cjs sql "$(cat supabase/tests/p48_prontidao_prod.sql)"
--
-- Devolve UMA linha de booleanos. Cada coluna afirma a PRESENÇA de um objeto que um
-- plano da fase (48-01..48-17) pôs no ar. Todas têm de sair `true` antes de chamar o
-- operador para as sessões humanas — senão a sessão prova um deploy que faltou.
--
-- Forma dos portões (CLAUDE.md, «varra pela FORMA»):
--   · nenhuma contagem contra constante: listas nomeadas são checadas por CONTENÇÃO
--     («todos estes estão lá»), então objeto a mais não reprova e objeto a menos reprova;
--   · objeto ausente sai `false`, nunca NULL: `coalesce(bool_and(...), false)` e EXISTS;
--   · as listas literais abaixo são ESCOPO DELIBERADO — são os objetos desta fase,
--     nomeados pelos SUMMARYs 48-01..48-17 — e não fotografia do banco.
--
-- O CHECK de evento: aqui só se exige que os 10 valores nomeados estejam contidos. A
-- lista viva completa é impressa à parte, no 48-PROVA-PROD.md, para uma pessoa ver se
-- há valor a mais.
-- =============================================================================
WITH
fn AS (
  SELECT p.proname, p.oid, p.prosrc
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
),
chk AS (
  SELECT pg_catalog.pg_get_constraintdef(c.oid) AS def
    FROM pg_catalog.pg_constraint c
   WHERE c.conname = 'notificacoes_enviadas_evento_check'
     AND c.conrelid = to_regclass('public.notificacoes_enviadas')
),
cols AS (
  SELECT table_name || '.' || column_name AS tc
    FROM information_schema.columns
   WHERE table_schema = 'public'
),
trg AS (
  SELECT t.tgname, t.tgrelid, t.tgfoid, t.tgenabled
    FROM pg_catalog.pg_trigger t
   WHERE NOT t.tgisinternal
)
SELECT
  -- 48-01 · o predicado canônico
  to_regprocedure('public.candidatura_encerrada(public.etapa_processo, public.status_candidatura)') IS NOT NULL
    AS b01_candidatura_encerrada_existe,

  -- 48-01 · D1..D6 decidem pelo predicado, não por etapa_atual
  coalesce((SELECT bool_and(position('candidatura_encerrada(' IN prosrc) > 0) FROM fn WHERE proname = 'registrar_pedido_exclusao'), false)
    AS b02_pedido_exclusao_usa_predicado,
  coalesce((SELECT bool_and(position('candidatura_encerrada(' IN prosrc) > 0) FROM fn WHERE proname = 'retirar_candidatura'), false)
    AS b03_retirar_usa_predicado,
  coalesce((SELECT bool_and(position('candidatura_encerrada(' IN prosrc) > 0) FROM fn WHERE proname = 'rejeitar_candidatura'), false)
    AS b04_rejeitar_usa_predicado,
  coalesce((SELECT bool_and(position('candidatura_encerrada(' IN prosrc) > 0) FROM fn WHERE proname = 'funil_kpis'), false)
    AS b05_funil_kpis_usa_predicado,
  coalesce(position('candidatura_encerrada(' IN pg_catalog.pg_get_viewdef(to_regclass('public.v_fila_trabalho'))) > 0, false)
    AS b06_fila_usa_predicado,

  -- 48-09 · rejeição humana grava o feedback neutro (texto exato, lido do corpo vivo)
  coalesce((SELECT bool_and(position('Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.' IN prosrc) > 0)
              FROM fn WHERE proname = 'rejeitar_candidatura'), false)
    AS b07_rejeitar_grava_feedback_neutro,
  to_regprocedure('public.explicacao_rejeicao_origem(uuid)') IS NOT NULL
    AS b08_explicacao_rejeicao_origem_existe,

  -- 48-08 · chave de dedupe por transição e por ciclo
  coalesce((SELECT bool_and(position('''historico_id''' IN prosrc) > 0) FROM fn WHERE proname = 'trg_notif_transicao'), false)
    AS b09_transicao_passa_historico_id,
  coalesce((SELECT bool_and(position('''ciclo''' IN prosrc) > 0) FROM fn WHERE proname = 'trg_notif_revisao_solicitada'), false)
    AS b10_revisao_solicitada_passa_ciclo,
  coalesce((SELECT bool_and(position('''ciclo''' IN prosrc) > 0) FROM fn WHERE proname = 'trg_notif_revisao_respondida'), false)
    AS b11_revisao_respondida_passa_ciclo,

  -- 48-10 · liberar o cognitivo avisa o candidato
  EXISTS (SELECT 1 FROM trg
           WHERE tgname = 'trg_notif_cognitivo_liberado'
             AND tgrelid = to_regclass('public.cognitivo_liberacao')
             AND tgfoid = to_regprocedure('public.trg_notif_cognitivo_liberado()')
             AND tgenabled <> 'D')
    AS b12_trigger_cognitivo_liberado,

  -- 48-10 / 48-13 · CHECK de evento CONTÉM os 10 valores (contenção, não igualdade)
  coalesce((SELECT bool_and(position(quote_literal(v) IN chk.def) > 0)
              FROM chk, unnest(ARRAY[
                'confirmacao', 'avanco', 'convite', 'decisao',
                'revisao_solicitada', 'revisao_respondida', 'divulgacao_vagas',
                'candidatura_encerrada_a_pedido', 'cognitivo_liberado', 'prazo_reabertura_vencido'
              ]) AS v), false)
    AS b13_check_evento_contem_os_10,

  -- 48-10 / 48-13 · classes dos eventos novos (o guard de marketing é fail-closed)
  EXISTS (SELECT 1 FROM public.classe_evento_notificacao WHERE evento = 'cognitivo_liberado' AND classe = 'transacional')
    AS b14_classe_cognitivo_transacional,
  EXISTS (SELECT 1 FROM public.classe_evento_notificacao WHERE evento = 'prazo_reabertura_vencido' AND classe = 'interno')
    AS b15_classe_prazo_interno,

  -- 48-13 · o retry não re-tenta o alerta de prazo; a varredura existe e é fechada
  coalesce((SELECT bool_and(position('prazo_reabertura_vencido' IN prosrc) > 0) FROM fn WHERE proname = 'varrer_retry_notificacoes'), false)
    AS b16_retry_exclui_prazo,
  CASE WHEN to_regprocedure('public.varrer_prazos_reabertura()') IS NULL THEN false
       ELSE NOT has_function_privilege('authenticated', 'public.varrer_prazos_reabertura()', 'EXECUTE')
        AND NOT has_function_privilege('anon', 'public.varrer_prazos_reabertura()', 'EXECUTE')
  END
    AS b17_varrer_prazos_existe_sem_execute_authenticated,
  EXISTS (SELECT 1 FROM cron.job
           WHERE jobname = 'prazo-reabertura-sweep'
             AND active
             AND position('varrer_prazos_reabertura' IN command) > 0)
    AS b18_cron_prazo_reabertura_sweep,

  -- 48-03 · local_ou_link validado na escrita
  EXISTS (SELECT 1 FROM trg
           WHERE tgname = 'trg_agendamento_valida_local_ins'
             AND tgrelid = to_regclass('public.agendamentos_entrevista') AND tgenabled <> 'D')
  AND EXISTS (SELECT 1 FROM trg
           WHERE tgname = 'trg_agendamento_valida_local_upd'
             AND tgrelid = to_regclass('public.agendamentos_entrevista') AND tgenabled <> 'D')
    AS b19_triggers_local_ou_link,

  -- colunas novas da fase (contenção por nome)
  NOT EXISTS (SELECT 1 FROM unnest(ARRAY[
      'decisao_final.reaberta_em', 'decisao_final.prazo_nova_decisao_em', 'decisao_final.alerta_prazo_enviado_em'
    ]) AS x WHERE x NOT IN (SELECT tc FROM cols))
    AS b20_colunas_decisao_final,
  NOT EXISTS (SELECT 1 FROM unnest(ARRAY[
      'decisao_final_historico.explicacao_solicitada_em', 'decisao_final_historico.revisao_solicitada_em',
      'decisao_final_historico.revisao_veredito', 'decisao_final_historico.revisao_respondida_em',
      'decisao_final_historico.revisao_resultado', 'decisao_final_historico.revisao_por_usuario',
      'decisao_final_historico.reaberta_em', 'decisao_final_historico.prazo_nova_decisao_em',
      'decisao_final_historico.alerta_prazo_enviado_em'
    ]) AS x WHERE x NOT IN (SELECT tc FROM cols))
    AS b21_colunas_decisao_final_historico,
  NOT EXISTS (SELECT 1 FROM unnest(ARRAY[
      'solicitacoes_dados.aviso_pedido_enviado_em', 'solicitacoes_dados.aviso_cancelamento_enviado_em'
    ]) AS x WHERE x NOT IN (SELECT tc FROM cols))
    AS b22_colunas_solicitacoes_dados,
  NOT EXISTS (SELECT 1 FROM unnest(ARRAY[
      'analise_candidato_vaga.descartada_em', 'analise_candidato_vaga.descartada_motivo'
    ]) AS x WHERE x NOT IN (SELECT tc FROM cols))
    AS b23_colunas_analise_candidato_vaga,

  -- 48-11 · registrar_decisao fail-closed e com D-23
  coalesce((SELECT bool_and(position('coalesce(v_role' IN prosrc) > 0 AND position('D-23' IN prosrc) > 0)
              FROM fn WHERE proname = 'registrar_decisao'), false)
    AS b24_registrar_decisao_fail_closed_e_d23,

  -- as migrations desta fase estão todas no ledger (contenção; versão a mais não reprova)
  NOT EXISTS (SELECT 1 FROM unnest(ARRAY[
      '20260921000001', '20260921000002', '20260921000003', '20260921000004', '20260921000005',
      '20260921000006', '20260921000007', '20260921000008', '20260921000009', '20260921000010',
      '20260921000011', '20260921000012', '20260921000013', '20260921000014', '20260921000015',
      '20260921000016', '20260921000017'
    ]) AS v WHERE v NOT IN (SELECT version FROM supabase_migrations.schema_migrations))
    AS b25_migrations_da_fase_no_ledger;
