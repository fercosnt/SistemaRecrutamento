-- =============================================================================
-- 05-export-allowlist-drift.sql — a allowlist do export contra o catálogo VIVO
-- =============================================================================
--
-- Requirement coberto : EXPORT-02 · EXPORT-04 · EXPORT-06
-- Decisão de origem   : 44-CONTEXT §Área 3 (SC#3, asserção 2) · BD-6
-- Milestone           : M8 / v8.0 — Phase 44 / Plano 44-03 (Task 3)
-- Autoria             : 2026-08-03
-- Natureza            : **READ-ONLY — seguro em PROD.** Zero statement de escrita.
--
-- COMO EXECUTAR
-- -------------
-- Pelo orquestrador / main thread, via `execute_sql` do MCP do Supabase contra o
-- projeto `isljnozzlvckrgjjbjwp`. Subagentes GSD não recebem esses tools
-- (anthropics/claude-code#13898) — esta consulta nunca roda dentro do agente que
-- a escreveu, e isso é premissa de planejamento, não descoberta de meio de fase.
--
-- POR QUE ESTE ARQUIVO EXISTE, E POR QUE O TESTE VITEST **NÃO** O SUBSTITUI
-- ------------------------------------------------------------------------
-- `docs/compliance/__tests__/exportAllowlist.test.ts` congela as chaves do
-- `export-allowlist.json` num snapshot inline. Ele pega alteração silenciosa DO
-- ARTEFATO. Ele é ESTRUTURALMENTE CEGO para uma coluna nova no BANCO: uma migration
-- que adicione `candidatos.numero_documento` amanhã não move um byte do JSON
-- commitado, e o snapshot continua verde para sempre.
--
-- E é exatamente essa a falha que o SC#3 nomeia. Os dois guardas leem universos
-- DISJUNTOS: o Vitest lê o ARTEFATO, este lê o CATÁLOGO. Nenhum dos dois é
-- redundante com o outro; cada um enxerga o que o outro não pode ver.
--
-- Este projeto já embarcou uma vez a classe "guarda que era dead code" (P39/CR-02).
-- Uma asserção que não pode falhar pelo motivo declarado é a mesma classe de defeito,
-- e é por isso que o rodapé deste arquivo carrega a PROVA DE MORDIDA.
--
-- AS DUAS DIREÇÕES IMPORTAM — E POR RAZÕES DIFERENTES
-- ---------------------------------------------------
--   COLUNA NOVA NO BANCO — fora da allowlist
--       É o VAZAMENTO EM POTENCIAL. Alguém precisa decidir se ela é dado do titular
--       sob o Art. 18, II, e essa decisão vai para `export-scope-rules.yaml`, nunca
--       para o gerador. Enquanto ninguém decide, a coluna fica fora da cópia — o que
--       é seguro, mas silencioso. Esta linha quebra o silêncio.
--
--   COLUNA DA ALLOWLIST SUMIU DO BANCO
--       É o export ENTREGANDO MENOS DO QUE DECLARA. A projeção da Edge Function
--       referencia uma coluna que não existe: ou a chamada quebra, ou (pior) ela é
--       silenciosamente omitida e o titular recebe uma cópia incompleta que se
--       apresenta como completa. É a mentira por omissão que o EXPORT-06 combate.
--
-- REGRA DE HONESTIDADE DE NÚMERO (herdada de 04-invent05-blast-radius.sql:30-40)
-- ------------------------------------------------------------------------------
-- O `VALUES` abaixo tem 363 pares, sobre 29 tabelas, e foi **GERADO, NUNCA
-- DIGITADO**:
--
--     node docs/compliance/sql/gen-export-allowlist.cjs --sql-values
--
-- Ele espelha o `export-allowlist.json` derivado do catálogo medido em
-- **2026-08-03T19:38:03Z** (67 tabelas base / 1013 colunas / 104 FKs em `public`).
-- ⚠ **Toda regeração da allowlist obriga a regerar este bloco.** Um `VALUES` colado
-- à mão, ou envelhecido em relação ao artefato, transforma o guarda em gerador de
-- falso positivo — e um guarda que grita sem motivo é um guarda que se aprende a
-- ignorar.
--
-- ESCOPO DELIBERADO: COLUNA, NÃO TABELA
-- --------------------------------------
-- O predicado restringe `information_schema` às tabelas que a PRÓPRIA allowlist
-- declara. Portanto esta consulta NÃO enxerga uma tabela nova inteira aparecendo em
-- `public`. Isso não é lacuna: é divisão de trabalho, e os três mecanismos são
-- nomeados aqui para que ninguém os presuma.
--
--   · tabela NOVA sem disposição   ⇒ `gen-export-allowlist.cjs` FALHA a geração
--                                    (fecho de tabela sobre `catalogo-vivo-44.json`.tabelas)
--   · tabela DECLARADA e não viva  ⇒ `meta.escopo_declarado_nao_vivo` no artefato,
--                                    mais a asserção (i) do teste Vitest
--                                    (é o caso de `solicitacoes_dados`, que nasce no 44-04)
--   · coluna nova ou sumida        ⇒ ESTA CONSULTA
--
-- =============================================================================

WITH allowlist(tabela, coluna) AS (
  VALUES
    ('agendamentos_entrevista','candidatura_id'),
    ('agendamentos_entrevista','compareceu'),
    ('agendamentos_entrevista','created_at'),
    ('agendamentos_entrevista','data_hora'),
    ('agendamentos_entrevista','deleted_at'),
    ('agendamentos_entrevista','entrevistador'),
    ('agendamentos_entrevista','id'),
    ('agendamentos_entrevista','local_ou_link'),
    ('agendamentos_entrevista','observacoes_rh'),
    ('agendamentos_entrevista','status'),
    ('agendamentos_entrevista','tipo'),
    ('agendamentos_entrevista','updated_at'),
    ('agendamentos_entrevista','vaga_id'),
    ('analise_candidato_vaga','candidatura_id'),
    ('analise_candidato_vaga','created_at'),
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
    ('decisao_final','justificativa'),
    ('decisao_final','revisao_respondida_em'),
    ('decisao_final','revisao_resultado'),
    ('decisao_final','revisao_solicitada_em'),
    ('decisao_final','revisao_veredito'),
    ('decisao_final_historico','arquivado_em'),
    ('decisao_final_historico','candidatura_id'),
    ('decisao_final_historico','decidido_em'),
    ('decisao_final_historico','decisao'),
    ('decisao_final_historico','id'),
    ('decisao_final_historico','justificativa'),
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
    ('redacoes_candidato','cost_tokens_input'),
    ('redacoes_candidato','cost_tokens_output'),
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
    ('scores_raven','updated_at')
),
vivo AS (
  -- Só tabelas BASE de `public` — view e foreign table não são o que a EF projeta.
  SELECT c.table_name::text AS tabela,
         c.column_name::text AS coluna
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema
   AND t.table_name   = c.table_name
  WHERE c.table_schema = 'public'
    AND t.table_type   = 'BASE TABLE'
    -- `::text` explícito: `information_schema.columns.table_name` é do domínio
    -- `sql_identifier` (sobre `name`), e o `VALUES` acima produz `text`. A comparação
    -- funciona por coerção implícita, mas depender de coerção implícita numa consulta
    -- de compliance é depender de um detalhe que uma versão futura do Postgres pode
    -- apertar. O cast custa nada e remove a dúvida.
    AND c.table_name::text IN (SELECT DISTINCT a.tabela FROM allowlist a)
)
SELECT
  COALESCE(v.tabela, a.tabela) AS tabela,
  COALESCE(v.coluna, a.coluna) AS coluna,
  CASE
    WHEN a.coluna IS NULL THEN 'COLUNA NOVA NO BANCO — fora da allowlist'
    ELSE                       'COLUNA DA ALLOWLIST SUMIU DO BANCO'
  END AS veredito
FROM vivo v
FULL OUTER JOIN allowlist a
  ON a.tabela = v.tabela
 AND a.coluna = v.coluna
-- O `FULL OUTER JOIN` é o que torna as DUAS direções visíveis numa consulta só.
-- Um `LEFT JOIN` veria apenas metade do drift, e a metade invisível seria escolhida
-- por acidente de escrita em vez de por decisão.
WHERE v.coluna IS NULL
   OR a.coluna IS NULL
ORDER BY 3, 1, 2;

-- =============================================================================
-- LEITURA DO RESULTADO
-- =============================================================================
--
--   APROVADO  = 0 linhas
--   REPROVADO = QUALQUER linha
--
-- Uma linha NUNCA se resolve afrouxando esta consulta. Ela se resolve dando um
-- veredito nomeado em `docs/compliance/export-scope-rules.yaml` e regerando os
-- artefatos — e depois regerando o `VALUES` acima.
--
-- =============================================================================
-- META-TEST — prova que este gate é real e não um no-op
-- =============================================================================
-- Idioma de `scripts/assert-no-secrets.mjs:33-45`. Um gate que nunca foi visto
-- falhando não é um gate: ele é verde no mundo em que funciona E no mundo em que
-- está quebrado, e os dois mundos são indistinguíveis de fora.
--
-- Reprodução canônica (READ-ONLY do início ao fim — o experimento inteiro é uma
-- consulta; `information_schema` NUNCA é escrito):
--
--   1. Copie este arquivo para um scratch FORA do repositório.
--   2. Remova do `VALUES` a linha:
--
--          ('autorizacoes','consent_text_hash'),
--
--      A escolha não é arbitrária: é uma das quatro colunas do BD-6, a dependência
--      declarada da Phase 44 sobre a Phase 43. Se o guarda não morde nela, ele não
--      protege o que esta fase mais precisa proteger.
--   3. Execute o arquivo do scratch contra PROD.
--   4. ESPERADO: **exatamente 1 linha** —
--
--          tabela        | coluna            | veredito
--          autorizacoes  | consent_text_hash | COLUNA NOVA NO BANCO — fora da allowlist
--
--      "Nova" do ponto de vista do smoke: uma coluna VIVA que a allowlist não declara.
--      É a mesma forma que uma migration futura produziria, e é por isso que remover
--      uma linha simula fielmente adicionar uma coluna.
--   5. Descarte o arquivo do scratch. O versionado permanece intacto, e o par
--      antes/depois (0 linhas × 1 linha, com timestamp de cada execução) vai colado
--      no `44-VERIFICATION.md`.
--
-- ⚠ O arquivo alterado NUNCA é commitado.
-- =============================================================================
