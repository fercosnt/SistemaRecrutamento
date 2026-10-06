-- =============================================================================
-- p44_export_drift_smoke.sql — o drift do export como PORTÃO que falha alto
-- =============================================================================
--
-- Identidade      : Phase 44 / Plano 44-10 · gap G5 · decisão do operador BD-14
--                   («Universo do banco + smoke», 2026-10-06)
-- Requirement     : EXPORT-04 · SC#3 da Phase 44 («nenhuma coluna entra no export por
--                   acidente e nenhuma sai dele em silêncio»)
-- Natureza        : **READ-ONLY.** Só `set_config`, um bloco `DO … RAISE EXCEPTION` e
--                   `SELECT`. Nenhuma escrita em tabela — invariante asserido pela (k)
--                   de `docs/compliance/__tests__/exportAllowlist.test.ts`.
--
-- O QUE VIGIA
-- -----------
-- O MESMO predicado de `docs/compliance/sql/05-export-allowlist-drift.sql` (o
-- relatório, que lista), com os MESMOS três blocos `VALUES` e os MESMOS cinco textos de
-- veredito — a (k2) prende que os dois arquivos não divergem:
--   · COLUNA nas duas direções, nas tabelas EM ESCOPO do titular: coluna viva sem
--     veredito (o vazamento em potencial) e veredito sem coluna viva (export que entrega
--     menos do que declara / veredito órfão);
--   · TABELA, com o universo = o BANCO: toda tabela base de `public` medida NA EXECUÇÃO
--     tem de ter disposição (em escopo, ou excluída com razão nomeada), e toda
--     disposição tem de apontar para tabela viva.
-- O G5 (2026-10-06) foi exatamente a falta deste último: seis tabelas novas das Phases
-- 45-48 ficaram invisíveis a todo portão automático porque o universo de tabelas vinha
-- do próprio artefato e de um snapshot de 2026-08-04.
--
-- COMO RODAR
-- ----------
--     node p46apply.cjs run supabase/tests/p44_export_drift_smoke.sql
--
-- O arquivo inteiro vai numa requisição à Management API = uma transação (CLAUDE.md,
-- «Via de apply ATUAL», propriedade 1). NOTICEs não voltam por esse canal — por isso
-- este smoke não diz nada por NOTICE: ou aprova com resultado, ou reprova com erro.
--
-- CONTRATO
-- --------
--   APROVADO  = exit 0 e um `resultado` com `smoke = 'p44_export_drift'`, `pass` true e as
--               POPULAÇÕES medidas na execução (tabelas vivas, tabelas com disposição,
--               tabelas em escopo, colunas vivas em escopo, pares com veredito). Leia as
--               populações ANTES do booleano.
--   REPROVADO = erro (exit 1 do `p46apply`), mensagem começando com `P44-DRIFT FAIL`:
--               · `P44-DRIFT FAIL (população vazia)` — alguma população medida é zero; um
--                 banco que não foi lido não pode aprovar nada;
--               · `P44-DRIFT FAIL:` — há drift; a mensagem traz `n_drift`, as populações
--                 e cada linha como `tabela.coluna — veredito` (ou `tabela — veredito`
--                 para drift de tabela).
-- Não há constante numérica de contagem neste arquivo: o que se compara é catálogo vivo
-- × artefato, os dois medidos na execução.
--
-- CADÊNCIA — MANUAL, ACEITA PELO OPERADOR (BD-14, override escrito no 44-CONTEXT.md)
-- ---------------------------------------------------------------------------------
-- Rodar este smoke:
--   · depois de TODO apply que crie, renomeie ou remova tabela ou coluna em `public`
--     (o `p46apply.cjs migrate` imprime um lembrete quando a migration mexe em tabela);
--   · antes de QUALQUER regeração da allowlist.
-- Uma linha de drift se resolve com veredito/disposição em
-- `docs/compliance/export-scope-rules.yaml`, regerando a allowlist e regerando os TRÊS
-- `VALUES` deste arquivo e do relatório — NUNCA afrouxando o predicado:
--     node docs/compliance/sql/gen-export-allowlist.cjs --sql-values
--     node docs/compliance/sql/gen-export-allowlist.cjs --sql-values-excluidas
--     node docs/compliance/sql/gen-export-allowlist.cjs --sql-values-tabelas
-- (saída colada como está — a indentação de 4 espaços é contrato do extrator da (k)).
--
-- AS TRÊS FORMAS DE PROVAR QUE ESTE PORTÃO MORDE
-- ----------------------------------------------
-- Um portão que nunca foi visto falhando não é portão.
--   1. DRIFT REAL. Em 2026-10-06, antes dos vereditos do 44-11, este smoke reprovou contra
--      PROD nomeando as 15 linhas do G5 (6 tabelas novas + 9 colunas novas) — ver
--      `44-10-SUMMARY.md`.
--   2. TABELA-SONDA numa requisição que reverte. Num scratch FORA do repositório, monte
--      um arquivo que anteponha a este UMA única instrução de DDL — p.ex.
--          CREATE TABLE public.p44_sonda_drift (id int);
--      — e rode-o com `p46apply.cjs run`. Esperado: `P44-DRIFT FAIL` nomeando
--      `p44_sonda_drift — TABELA NOVA…`. O `RAISE` aborta a transação inteira, então a
--      sonda nunca chega a existir. (Só é prova com a baseline em zero drift.)
--   3. REMOÇÃO DE UM PAR num scratch: tire uma linha de um dos três `VALUES` de uma cópia
--      e rode a cópia; esperado `n_drift` = 1 nomeando o par removido (para
--      `disposicao_tabelas`, use uma tabela EXCLUÍDA — removendo uma em escopo, as colunas
--      dela também aparecem). Só é prova com a baseline em zero drift.
-- ⚠ Cópia mutada NUNCA é commitada; o versionado volta byte a byte (md5 conferido).
-- =============================================================================

SELECT set_config('smoke44.r', (
WITH allowlist(tabela, coluna) AS (
  VALUES
    ('agendamentos_entrevista','candidatura_id'),
    ('agendamentos_entrevista','compareceu'),
    ('agendamentos_entrevista','created_at'),
    ('agendamentos_entrevista','data_hora'),
    ('agendamentos_entrevista','deleted_at'),
    ('agendamentos_entrevista','id'),
    ('agendamentos_entrevista','local_ou_link'),
    ('agendamentos_entrevista','observacoes_rh'),
    ('agendamentos_entrevista','status'),
    ('agendamentos_entrevista','tipo'),
    ('agendamentos_entrevista','updated_at'),
    ('agendamentos_entrevista','vaga_id'),
    ('analise_candidato_vaga','candidatura_id'),
    ('analise_candidato_vaga','created_at'),
    ('analise_candidato_vaga','descartada_em'),
    ('analise_candidato_vaga','descartada_motivo'),
    ('analise_candidato_vaga','flags'),
    ('analise_candidato_vaga','gaps'),
    ('analise_candidato_vaga','id'),
    ('analise_candidato_vaga','pontos_fortes'),
    ('analise_candidato_vaga','resumo_cv'),
    ('analise_candidato_vaga','resumo_respostas'),
    ('analise_candidato_vaga','score_match'),
    ('analise_candidato_vaga','status'),
    ('analise_candidato_vaga','updated_at'),
    ('analise_candidato_vaga','vaga_id'),
    ('autorizacoes','autorizacao_analise_video'),
    ('autorizacoes','autorizacao_comunicacao'),
    ('autorizacoes','autorizacao_marketing_vagas'),
    ('autorizacoes','autorizacao_retencao_curriculo'),
    ('autorizacoes','autorizacao_uso_dados'),
    ('autorizacoes','candidato_id'),
    ('autorizacoes','consent_registrado_em'),
    ('autorizacoes','consent_text_hash'),
    ('autorizacoes','consent_text_version'),
    ('autorizacoes','created_at'),
    ('autorizacoes','id'),
    ('autorizacoes','ip_aceite'),
    ('autorizacoes','policy_version'),
    ('autorizacoes','updated_at'),
    ('autorizacoes','user_agent_aceite'),
    ('autorizacoes','user_id'),
    ('avaliacoes_rh','adequacao_cultural'),
    ('avaliacoes_rh','adequacao_tecnica'),
    ('avaliacoes_rh','candidatura_id'),
    ('avaliacoes_rh','competencias'),
    ('avaliacoes_rh','created_at'),
    ('avaliacoes_rh','deleted_at'),
    ('avaliacoes_rh','entrevista_id'),
    ('avaliacoes_rh','id'),
    ('avaliacoes_rh','justificativa_recomendacao'),
    ('avaliacoes_rh','observacoes'),
    ('avaliacoes_rh','pontos_fortes'),
    ('avaliacoes_rh','pontos_fracos'),
    ('avaliacoes_rh','potencial_crescimento'),
    ('avaliacoes_rh','recomendacao'),
    ('avaliacoes_rh','score_geral'),
    ('avaliacoes_rh','tipo_entrevista'),
    ('avaliacoes_rh','updated_at'),
    ('candidate_ai_decisions','ai_composite_score'),
    ('candidate_ai_decisions','ai_reasoning_summary'),
    ('candidate_ai_decisions','ai_recommendation'),
    ('candidate_ai_decisions','candidato_id'),
    ('candidate_ai_decisions','created_at'),
    ('candidate_ai_decisions','explanation_channel'),
    ('candidate_ai_decisions','explanation_delivered_at'),
    ('candidate_ai_decisions','human_decision'),
    ('candidate_ai_decisions','human_notes'),
    ('candidate_ai_decisions','human_overrode_ai'),
    ('candidate_ai_decisions','id'),
    ('candidate_ai_decisions','review_requested_at'),
    ('candidate_ai_decisions','reviewed_at'),
    ('candidate_ai_decisions','status'),
    ('candidate_ai_decisions','updated_at'),
    ('candidate_ai_decisions','vaga_id'),
    ('candidatos','ativo'),
    ('candidatos','avatar_url'),
    ('candidatos','bairro'),
    ('candidatos','bloqueado'),
    ('candidatos','bloqueado_motivo'),
    ('candidatos','celular'),
    ('candidatos','cep'),
    ('candidatos','cidade'),
    ('candidatos','como_conheceu'),
    ('candidatos','como_conheceu_detalhes'),
    ('candidatos','complemento'),
    ('candidatos','cpf'),
    ('candidatos','created_at'),
    ('candidatos','data_nascimento'),
    ('candidatos','data_ultimo_acesso'),
    ('candidatos','deleted_at'),
    ('candidatos','email'),
    ('candidatos','email_verificado'),
    ('candidatos','estado'),
    ('candidatos','genero'),
    ('candidatos','id'),
    ('candidatos','instagram'),
    ('candidatos','instagram_url'),
    ('candidatos','linkedin'),
    ('candidatos','linkedin_url'),
    ('candidatos','logradouro'),
    ('candidatos','nome_completo'),
    ('candidatos','numero'),
    ('candidatos','updated_at'),
    ('candidatos','user_id'),
    ('candidaturas','analise_ia_bigfive'),
    ('candidaturas','analise_ia_cultura'),
    ('candidaturas','analise_ia_disc'),
    ('candidaturas','analise_ia_entrevista_online'),
    ('candidaturas','analise_ia_entrevista_presencial'),
    ('candidaturas','analise_ia_formulario'),
    ('candidaturas','analise_ia_raven'),
    ('candidaturas','candidato_id'),
    ('candidaturas','created_at'),
    ('candidaturas','curriculo_nome_original'),
    ('candidaturas','curriculo_tamanho_bytes'),
    ('candidaturas','curriculo_url'),
    ('candidaturas','data_bigfive_enviado'),
    ('candidaturas','data_candidatura'),
    ('candidaturas','data_cultura_enviado'),
    ('candidaturas','data_decisao_final'),
    ('candidaturas','data_disc_enviado'),
    ('candidaturas','data_entrevista_online'),
    ('candidaturas','data_entrevista_presencial'),
    ('candidaturas','data_formulario_enviado'),
    ('candidaturas','data_raven_enviado'),
    ('candidaturas','deleted_at'),
    ('candidaturas','etapa_atual'),
    ('candidaturas','etapa_justificativa'),
    ('candidaturas','feedback_rejeicao'),
    ('candidaturas','id'),
    ('candidaturas','is_favorito'),
    ('candidaturas','is_rascunho'),
    ('candidaturas','motivo_rejeicao'),
    ('candidaturas','observacoes_rh'),
    ('candidaturas','opcao_knockout_id'),
    ('candidaturas','origem_candidatura'),
    ('candidaturas','score_geral'),
    ('candidaturas','status'),
    ('candidaturas','tempo_preenchimento_segundos'),
    ('candidaturas','updated_at'),
    ('candidaturas','vaga_id'),
    ('cognitivo_respostas','candidatura_id'),
    ('cognitivo_respostas','completion_time_seconds'),
    ('cognitivo_respostas','created_at'),
    ('cognitivo_respostas','id'),
    ('cognitivo_respostas','proctoring'),
    ('cognitivo_respostas','raw_responses'),
    ('cognitivo_respostas','shuffle_seed'),
    ('decisao_final','candidatura_id'),
    ('decisao_final','decisao'),
    ('decisao_final','em'),
    ('decisao_final','explicacao_solicitada_em'),
    ('decisao_final','id'),
    ('decisao_final','prazo_nova_decisao_em'),
    ('decisao_final','reaberta_em'),
    ('decisao_final','revisao_respondida_em'),
    ('decisao_final','revisao_resultado'),
    ('decisao_final','revisao_solicitada_em'),
    ('decisao_final','revisao_veredito'),
    ('decisao_final_historico','arquivado_em'),
    ('decisao_final_historico','candidatura_id'),
    ('decisao_final_historico','decidido_em'),
    ('decisao_final_historico','decisao'),
    ('decisao_final_historico','explicacao_solicitada_em'),
    ('decisao_final_historico','id'),
    ('decisao_final_historico','prazo_nova_decisao_em'),
    ('decisao_final_historico','reaberta_em'),
    ('decisao_final_historico','revisao_respondida_em'),
    ('decisao_final_historico','revisao_resultado'),
    ('decisao_final_historico','revisao_solicitada_em'),
    ('decisao_final_historico','revisao_veredito'),
    ('devolutivas_candidato','candidato_id'),
    ('devolutivas_candidato','candidatura_id'),
    ('devolutivas_candidato','conteudo_jsonb'),
    ('devolutivas_candidato','created_at'),
    ('devolutivas_candidato','id'),
    ('disponibilidade','candidato_id'),
    ('disponibilidade','created_at'),
    ('disponibilidade','data_disponibilidade'),
    ('disponibilidade','disponibilidade_imediata'),
    ('disponibilidade','id'),
    ('disponibilidade','periodo_disponivel'),
    ('disponibilidade','regime_trabalho'),
    ('disponibilidade','updated_at'),
    ('entrevista_analises','bias_flags'),
    ('entrevista_analises','bloqueio_avanco'),
    ('entrevista_analises','candidatura_id'),
    ('entrevista_analises','citacoes'),
    ('entrevista_analises','competencias'),
    ('entrevista_analises','created_at'),
    ('entrevista_analises','id'),
    ('entrevista_analises','notas_humanas'),
    ('entrevista_analises','revisao_confirmada_em'),
    ('entrevista_analises','scores_humanos'),
    ('entrevista_analises','status_analise'),
    ('entrevista_analises','superada_em'),
    ('entrevista_analises','tipo'),
    ('entrevistas_online','analise_ia'),
    ('entrevistas_online','avaliacao_candidato_score'),
    ('entrevistas_online','candidatura_id'),
    ('entrevistas_online','created_at'),
    ('entrevistas_online','data_agendada'),
    ('entrevistas_online','data_fim_real'),
    ('entrevistas_online','data_inicio_real'),
    ('entrevistas_online','deleted_at'),
    ('entrevistas_online','duracao_estimada_minutos'),
    ('entrevistas_online','duracao_real_minutos'),
    ('entrevistas_online','feedback_candidato'),
    ('entrevistas_online','gravacao_tamanho_mb'),
    ('entrevistas_online','gravacao_url'),
    ('entrevistas_online','id'),
    ('entrevistas_online','link_videochamada'),
    ('entrevistas_online','notas_durante'),
    ('entrevistas_online','notas_preparacao'),
    ('entrevistas_online','observacoes_gerais'),
    ('entrevistas_online','plataforma'),
    ('entrevistas_online','resumo_ia'),
    ('entrevistas_online','status'),
    ('entrevistas_online','transcricao'),
    ('entrevistas_online','updated_at'),
    ('entrevistas_presenciais','candidatura_id'),
    ('entrevistas_presenciais','created_at'),
    ('entrevistas_presenciais','data_agendada'),
    ('entrevistas_presenciais','data_fim_real'),
    ('entrevistas_presenciais','data_inicio_real'),
    ('entrevistas_presenciais','deleted_at'),
    ('entrevistas_presenciais','documentos_apresentados'),
    ('entrevistas_presenciais','documentos_necessarios'),
    ('entrevistas_presenciais','duracao_estimada_minutos'),
    ('entrevistas_presenciais','duracao_real_minutos'),
    ('entrevistas_presenciais','id'),
    ('entrevistas_presenciais','instrucoes_acesso'),
    ('entrevistas_presenciais','local_entrevista'),
    ('entrevistas_presenciais','notas_durante'),
    ('entrevistas_presenciais','notas_preparacao'),
    ('entrevistas_presenciais','observacoes_gerais'),
    ('entrevistas_presenciais','primeira_impressao'),
    ('entrevistas_presenciais','sala_numero'),
    ('entrevistas_presenciais','status'),
    ('entrevistas_presenciais','updated_at'),
    ('historico_candidatura','auto_rejeitado'),
    ('historico_candidatura','candidatura_id'),
    ('historico_candidatura','criado_em'),
    ('historico_candidatura','criterio_texto'),
    ('historico_candidatura','etapa_de'),
    ('historico_candidatura','etapa_para'),
    ('historico_candidatura','id'),
    ('recruiter_alerts','call_type'),
    ('recruiter_alerts','candidato_id'),
    ('recruiter_alerts','created_at'),
    ('recruiter_alerts','id'),
    ('recruiter_alerts','is_read'),
    ('recruiter_alerts','message'),
    ('recruiter_alerts','resolved_at'),
    ('recruiter_alerts','threshold'),
    ('recruiter_alerts','threshold_violated'),
    ('recruiter_alerts','vaga_id'),
    ('recruiter_alerts','value'),
    ('redacoes_candidato','analise_ia'),
    ('redacoes_candidato','bloqueio_avanco'),
    ('redacoes_candidato','candidatura_id'),
    ('redacoes_candidato','classificacao_cor'),
    ('redacoes_candidato','decisao_revisor'),
    ('redacoes_candidato','eh_pergunta_padrao'),
    ('redacoes_candidato','flags'),
    ('redacoes_candidato','ia_processada_em'),
    ('redacoes_candidato','id'),
    ('redacoes_candidato','notas_revisor'),
    ('redacoes_candidato','ordem'),
    ('redacoes_candidato','pergunta_id'),
    ('redacoes_candidato','red_flag_etico'),
    ('redacoes_candidato','revisada_em'),
    ('redacoes_candidato','score_ponderado_0_100'),
    ('redacoes_candidato','scores_dimensao'),
    ('redacoes_candidato','scores_humanos'),
    ('redacoes_candidato','status_analise'),
    ('redacoes_candidato','submetida_em'),
    ('redacoes_candidato','tempo_gasto_segundos'),
    ('redacoes_candidato','texto'),
    ('redacoes_candidato','texto_hash'),
    ('redacoes_candidato','word_count'),
    ('redacoes_candidato_em_progresso','candidatura_id'),
    ('redacoes_candidato_em_progresso','completou_em'),
    ('redacoes_candidato_em_progresso','id'),
    ('redacoes_candidato_em_progresso','iniciado_em'),
    ('redacoes_candidato_em_progresso','pergunta_id'),
    ('redacoes_candidato_em_progresso','texto_em_progresso'),
    ('redacoes_candidato_em_progresso','ultima_atividade_em'),
    ('redacoes_candidato_em_progresso','user_agent'),
    ('redacoes_candidato_em_progresso','word_count'),
    ('respostas_avaliacao','candidatura_id'),
    ('respostas_avaliacao','id'),
    ('respostas_avaliacao','respostas'),
    ('respostas_avaliacao','teste'),
    ('respostas_avaliacao','updated_at'),
    ('respostas_bigfive','candidatura_id'),
    ('respostas_bigfive','created_at'),
    ('respostas_bigfive','questao_id'),
    ('respostas_bigfive','resposta'),
    ('respostas_bigfive','tempo_resposta_segundos'),
    ('respostas_cultura','candidatura_id'),
    ('respostas_cultura','created_at'),
    ('respostas_cultura','id'),
    ('respostas_cultura','pergunta_id'),
    ('respostas_cultura','resposta_texto'),
    ('respostas_cultura','tempo_resposta_segundos'),
    ('respostas_cultura','updated_at'),
    ('respostas_disc','candidatura_id'),
    ('respostas_disc','created_at'),
    ('respostas_disc','mais_caracteristico'),
    ('respostas_disc','menos_caracteristico'),
    ('respostas_disc','questao_id'),
    ('respostas_disc','tempo_resposta_segundos'),
    ('respostas_formulario','candidatura_id'),
    ('respostas_formulario','created_at'),
    ('respostas_formulario','id'),
    ('respostas_formulario','pergunta_id'),
    ('respostas_formulario','resposta_numerica'),
    ('respostas_formulario','resposta_opcoes'),
    ('respostas_formulario','resposta_texto'),
    ('respostas_formulario','updated_at'),
    ('respostas_raven','candidatura_id'),
    ('respostas_raven','created_at'),
    ('respostas_raven','questao_id'),
    ('respostas_raven','resposta'),
    ('respostas_raven','tempo_resposta_segundos'),
    ('scores_bigfive','analise_ia'),
    ('scores_bigfive','candidatura_id'),
    ('scores_bigfive','created_at'),
    ('scores_bigfive','score_agreeableness'),
    ('scores_bigfive','score_conscientiousness'),
    ('scores_bigfive','score_extraversion'),
    ('scores_bigfive','score_neuroticism'),
    ('scores_bigfive','score_openness'),
    ('scores_bigfive','tempo_total_segundos'),
    ('scores_bigfive','updated_at'),
    ('scores_candidato','candidatura_id'),
    ('scores_candidato','citacoes'),
    ('scores_candidato','created_at'),
    ('scores_candidato','id'),
    ('scores_candidato','metadata'),
    ('scores_candidato','pergunta_id'),
    ('scores_candidato','red_flags'),
    ('scores_candidato','score'),
    ('scores_candidato','score_max'),
    ('scores_candidato','status'),
    ('scores_candidato','subtipo'),
    ('scores_candidato','tipo'),
    ('scores_candidato','updated_at'),
    ('scores_disc','analise_ia'),
    ('scores_disc','candidatura_id'),
    ('scores_disc','created_at'),
    ('scores_disc','perfil_primario'),
    ('scores_disc','perfil_secundario'),
    ('scores_disc','score_c'),
    ('scores_disc','score_d'),
    ('scores_disc','score_i'),
    ('scores_disc','score_s'),
    ('scores_disc','tempo_total_segundos'),
    ('scores_disc','updated_at'),
    ('scores_raven','acertos_por_serie'),
    ('scores_raven','analise_ia'),
    ('scores_raven','candidatura_id'),
    ('scores_raven','classificacao'),
    ('scores_raven','created_at'),
    ('scores_raven','percentil'),
    ('scores_raven','percentual_acerto'),
    ('scores_raven','tempo_total_segundos'),
    ('scores_raven','total_acertos'),
    ('scores_raven','updated_at'),
    ('solicitacoes_dados','atendido_em'),
    ('solicitacoes_dados','candidato_id'),
    ('solicitacoes_dados','causa'),
    ('solicitacoes_dados','id'),
    ('solicitacoes_dados','situacao'),
    ('solicitacoes_dados','solicitado_em'),
    ('solicitacoes_dados','tipo')
),
excluidas(tabela, coluna) AS (
  VALUES
    ('agendamentos_entrevista','agendado_por'),
    ('agendamentos_entrevista','entrevistador'),
    ('agendamentos_entrevista','updated_by'),
    ('analise_candidato_vaga','erro'),
    ('analise_candidato_vaga','modelo_ia'),
    ('analise_candidato_vaga','provedor_ia'),
    ('avaliacoes_rh','avaliador_id'),
    ('candidate_ai_decisions','ai_call_log_ids'),
    ('candidate_ai_decisions','review_requested_by'),
    ('candidate_ai_decisions','reviewer_id'),
    ('candidatos','created_by'),
    ('candidatos','updated_by'),
    ('candidaturas','created_by'),
    ('candidaturas','updated_by'),
    ('decisao_final','alerta_prazo_enviado_em'),
    ('decisao_final','justificativa'),
    ('decisao_final','por_usuario'),
    ('decisao_final','revisao_por_usuario'),
    ('decisao_final_historico','alerta_prazo_enviado_em'),
    ('decisao_final_historico','justificativa'),
    ('decisao_final_historico','por_usuario'),
    ('decisao_final_historico','revisao_por_usuario'),
    ('devolutivas_candidato','modelo_ia'),
    ('devolutivas_candidato','prompt_version'),
    ('entrevista_analises','ai_call_log_id'),
    ('entrevista_analises','modelo_ia'),
    ('entrevista_analises','prompt_version'),
    ('entrevista_analises','provedor_ia'),
    ('entrevista_analises','revisada_por'),
    ('entrevista_analises','solicitado_por'),
    ('entrevista_analises','texto_hash'),
    ('entrevistas_online','agendado_por'),
    ('entrevistas_online','realizado_por'),
    ('entrevistas_presenciais','agendado_por'),
    ('entrevistas_presenciais','realizado_por'),
    ('historico_candidatura','ator'),
    ('recruiter_alerts','channel'),
    ('redacoes_candidato','cost_tokens_input'),
    ('redacoes_candidato','cost_tokens_output'),
    ('redacoes_candidato','input_hash'),
    ('redacoes_candidato','model_version'),
    ('redacoes_candidato','modelo_ia'),
    ('redacoes_candidato','prompt_version'),
    ('redacoes_candidato','provedor_ia'),
    ('redacoes_candidato','referencia_match'),
    ('redacoes_candidato','revisada_por'),
    ('redacoes_candidato','rubrica_versao'),
    ('solicitacoes_dados','aviso_cancelamento_enviado_em'),
    ('solicitacoes_dados','aviso_pedido_enviado_em')
),
disposicao_tabelas(tabela, destino) AS (
  VALUES
    ('agendamentos_entrevista','escopo_titular'),
    ('ai_call_logs','telemetria_interna'),
    ('ai_cost_daily','telemetria_interna'),
    ('analise_candidato_vaga','escopo_titular'),
    ('autorizacoes','escopo_titular'),
    ('avaliacoes_rh','escopo_titular'),
    ('bias_audit_log','telemetria_interna'),
    ('biblioteca_perguntas','configuracao_do_produto'),
    ('bigfive_itens','configuracao_do_produto'),
    ('candidate_ai_decisions','escopo_titular'),
    ('candidatos','escopo_titular'),
    ('candidaturas','escopo_titular'),
    ('classe_evento_notificacao','vocabulario_do_sistema'),
    ('cognitivo_itens','configuracao_do_produto'),
    ('cognitivo_respostas','escopo_titular'),
    ('comparativo_solicitado','pii_de_terceiro'),
    ('config_retencao_etapa','configuracao_do_produto'),
    ('config_sla_dados','configuracao_do_produto'),
    ('config_sla_etapa','configuracao_do_produto'),
    ('config_sla_revisao','configuracao_do_produto'),
    ('configuracoes_empresa','segredo'),
    ('data_deletion_log','telemetria_interna'),
    ('decisao_final','escopo_titular'),
    ('decisao_final_historico','escopo_titular'),
    ('devolutivas_candidato','escopo_titular'),
    ('disponibilidade','escopo_titular'),
    ('entrevista_analises','escopo_titular'),
    ('entrevista_guias','configuracao_do_produto'),
    ('entrevistas_online','escopo_titular'),
    ('entrevistas_presenciais','escopo_titular'),
    ('historico_acoes','telemetria_interna'),
    ('historico_candidatura','escopo_titular'),
    ('logs_acesso','telemetria_interna'),
    ('logs_auditoria','telemetria_interna'),
    ('notificacoes_enviadas','telemetria_interna'),
    ('pergunta_opcao_metadata','configuracao_do_produto'),
    ('perguntas','configuracao_do_produto'),
    ('perguntas_cultura','configuracao_do_produto'),
    ('perguntas_formulario','configuracao_do_produto'),
    ('perguntas_opcao_sjt','configuracao_do_produto'),
    ('perguntas_redacao','configuracao_do_produto'),
    ('perguntas_vaga_origem','configuracao_do_produto'),
    ('preferencias_notificacoes','pii_de_terceiro'),
    ('prompt_versions','configuracao_do_produto'),
    ('questoes_bigfive','configuracao_do_produto'),
    ('questoes_disc','configuracao_do_produto'),
    ('questoes_raven','configuracao_do_produto'),
    ('rate_limit_check_duplicate','telemetria_interna'),
    ('recruiter_alerts','escopo_titular'),
    ('redacoes_candidato','escopo_titular'),
    ('redacoes_candidato_em_progresso','escopo_titular'),
    ('respostas_avaliacao','escopo_titular'),
    ('respostas_bigfive','escopo_titular'),
    ('respostas_cultura','escopo_titular'),
    ('respostas_disc','escopo_titular'),
    ('respostas_formulario','escopo_titular'),
    ('respostas_raven','escopo_titular'),
    ('scores_bigfive','escopo_titular'),
    ('scores_candidato','escopo_titular'),
    ('scores_disc','escopo_titular'),
    ('scores_raven','escopo_titular'),
    ('sessoes_ativas','telemetria_interna'),
    ('solicitacoes_dados','escopo_titular'),
    ('templates_email','configuracao_do_produto'),
    ('usuarios_rh','pii_de_terceiro'),
    ('vagas','configuracao_do_produto'),
    ('vagas_associadas_recrutadores','pii_de_terceiro'),
    ('webhooks_config','segredo'),
    ('webhooks_logs','telemetria_interna')
),
com_veredito(tabela, coluna, destino) AS (
  SELECT a.tabela, a.coluna, 'allowlist'::text FROM allowlist a
  UNION ALL
  SELECT e.tabela, e.coluna, 'excluida'::text  FROM excluidas e
),
tabelas_vivas AS (
  SELECT t.table_name::text AS tabela
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type   = 'BASE TABLE'
),
vivo AS (
  SELECT c.table_name::text  AS tabela,
         c.column_name::text AS coluna
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema
   AND t.table_name   = c.table_name
  WHERE c.table_schema = 'public'
    AND t.table_type   = 'BASE TABLE'
    AND c.table_name::text IN (
      SELECT d.tabela FROM disposicao_tabelas d WHERE d.destino = 'escopo_titular'
    )
),
drift AS (
  SELECT
    COALESCE(v.tabela, d.tabela) AS tabela,
    COALESCE(v.coluna, d.coluna) AS coluna,
    CASE
      WHEN d.coluna IS NULL              THEN 'COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml'
      WHEN d.destino = 'allowlist'       THEN 'COLUNA DA ALLOWLIST SUMIU DO BANCO — o export entrega menos do que declara'
      ELSE                                    'COLUNA EXCLUÍDA SUMIU DO BANCO — veredito órfão no YAML'
    END AS veredito
  FROM vivo v
  FULL OUTER JOIN com_veredito d
    ON d.tabela = v.tabela
   AND d.coluna = v.coluna
  WHERE v.coluna IS NULL
     OR d.coluna IS NULL
  UNION ALL
  SELECT
    COALESCE(tv.tabela, dt.tabela) AS tabela,
    NULL::text                     AS coluna,
    CASE
      WHEN dt.tabela IS NULL THEN 'TABELA NOVA NO BANCO — sem disposição em export-scope-rules.yaml'
      ELSE                        'TABELA COM DISPOSIÇÃO SUMIU DO BANCO — disposição órfã no YAML'
    END AS veredito
  FROM tabelas_vivas tv
  FULL OUTER JOIN disposicao_tabelas dt
    ON dt.tabela = tv.tabela
  WHERE tv.tabela IS NULL
     OR dt.tabela IS NULL
)
SELECT json_build_object(
  'n_tabelas_vivas',           (SELECT count(*) FROM tabelas_vivas),
  'n_tabelas_com_disposicao',  (SELECT count(*) FROM disposicao_tabelas),
  'n_tabelas_em_escopo',       (SELECT count(*) FROM disposicao_tabelas WHERE destino = 'escopo_titular'),
  'n_colunas_vivas_em_escopo', (SELECT count(*) FROM vivo),
  'n_pares_com_veredito',      (SELECT count(*) FROM com_veredito),
  'n_drift',                   (SELECT count(*) FROM drift),
  'linhas',                    (SELECT string_agg(
                                         tabela || COALESCE('.' || coluna, '') || ' — ' || veredito,
                                         ' | ' ORDER BY veredito, tabela, coluna NULLS FIRST)
                                  FROM drift)
)
)::text, false);

DO $gate$
DECLARE
  r jsonb := current_setting('smoke44.r')::jsonb;
BEGIN
  -- População zero reprova: um catálogo que não foi lido (ou um VALUES que não foi
  -- colado) não pode aprovar nada. Sem `EXCEPTION WHEN OTHERS` em lugar nenhum deste
  -- arquivo: engolir a falha vira SKIP verde (achado do 48-01).
  IF (r->>'n_tabelas_vivas')::int = 0
     OR (r->>'n_tabelas_com_disposicao')::int = 0
     OR (r->>'n_colunas_vivas_em_escopo')::int = 0
     OR (r->>'n_pares_com_veredito')::int = 0 THEN
    RAISE EXCEPTION 'P44-DRIFT FAIL (população vazia): n_tabelas_vivas=% n_tabelas_com_disposicao=% n_colunas_vivas_em_escopo=% n_pares_com_veredito=% — um banco que não foi lido não aprova nada',
      r->>'n_tabelas_vivas', r->>'n_tabelas_com_disposicao',
      r->>'n_colunas_vivas_em_escopo', r->>'n_pares_com_veredito';
  END IF;

  IF (r->>'n_drift')::int > 0 THEN
    RAISE EXCEPTION 'P44-DRIFT FAIL: n_drift=% · populações: n_tabelas_vivas=% n_tabelas_com_disposicao=% n_tabelas_em_escopo=% n_colunas_vivas_em_escopo=% n_pares_com_veredito=% · linhas: %',
      r->>'n_drift',
      r->>'n_tabelas_vivas', r->>'n_tabelas_com_disposicao', r->>'n_tabelas_em_escopo',
      r->>'n_colunas_vivas_em_escopo', r->>'n_pares_com_veredito',
      r->>'linhas';
  END IF;
END
$gate$;

SELECT json_build_object(
  'smoke',                     'p44_export_drift',
  'pass',                      true,
  'n_tabelas_vivas',           (current_setting('smoke44.r')::jsonb->>'n_tabelas_vivas')::int,
  'n_tabelas_com_disposicao',  (current_setting('smoke44.r')::jsonb->>'n_tabelas_com_disposicao')::int,
  'n_tabelas_em_escopo',       (current_setting('smoke44.r')::jsonb->>'n_tabelas_em_escopo')::int,
  'n_colunas_vivas_em_escopo', (current_setting('smoke44.r')::jsonb->>'n_colunas_vivas_em_escopo')::int,
  'n_pares_com_veredito',      (current_setting('smoke44.r')::jsonb->>'n_pares_com_veredito')::int,
  'n_drift',                   (current_setting('smoke44.r')::jsonb->>'n_drift')::int
) AS resultado;
