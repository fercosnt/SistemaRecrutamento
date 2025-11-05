-- ==============================================
-- 11 - Enums para Vagas e Candidaturas
-- PRD-DB-002: Estrutura de Vagas e Candidaturas
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- ENUM 1: status_vaga
-- ==============================================
-- Define os status possíveis de uma vaga no sistema
-- Usado na tabela vagas.status

CREATE TYPE status_vaga AS ENUM (
  'rascunho',    -- Vaga sendo criada, não visível publicamente
  'ativa',       -- Vaga aberta para candidaturas
  'inativa',     -- Vaga fechada, não aceita mais candidaturas
  'arquivada'    -- Vaga arquivada para histórico
);

COMMENT ON TYPE status_vaga IS
'Define os status do ciclo de vida de uma vaga. VALORES: rascunho (draft), ativa (aceita candidaturas), inativa (fechada), arquivada (histórico)';

-- ==============================================
-- ENUM 2: etapa_processo
-- ==============================================
-- Define as etapas do processo seletivo
-- Usado na tabela candidaturas.etapa_atual

CREATE TYPE etapa_processo AS ENUM (
  'triagem',                  -- Formulário inicial de triagem
  'bigfive',                  -- Teste de personalidade Big Five
  'disc',                     -- Teste DISC (comportamental)
  'entrevista_online',        -- Entrevista online (vídeo)
  'raven',                    -- Teste de QI Raven (raciocínio lógico)
  'cultura',                  -- Questionário de fit cultural
  'entrevista_presencial',    -- Entrevista presencial final
  'aprovado',                 -- Aprovado final
  'rejeitado'                 -- Rejeitado em qualquer etapa
);

COMMENT ON TYPE etapa_processo IS
'Define as etapas sequenciais do processo seletivo. ORDEM: triagem → bigfive → disc → entrevista_online → raven → cultura → entrevista_presencial → aprovado/rejeitado';

-- ==============================================
-- ENUM 3: status_candidatura
-- ==============================================
-- Define o status atual de uma candidatura
-- Usado na tabela candidaturas.status

CREATE TYPE status_candidatura AS ENUM (
  'aguardando_resposta',  -- Candidato precisa responder teste/formulário
  'em_analise',           -- RH está analisando a candidatura
  'aprovado_proxima',     -- Aprovado na etapa atual, aguardando próxima
  'rejeitado',            -- Rejeitado em alguma etapa
  'finalizado'            -- Processo concluído (aprovado ou rejeitado final)
);

COMMENT ON TYPE status_candidatura IS
'Define o status de uma candidatura em relação à ação necessária. Complementa etapa_processo indicando o estado da etapa atual.';

-- ==============================================
-- ENUM 4: tipo_resposta_pergunta
-- ==============================================
-- Define os tipos de resposta permitidos nas perguntas do formulário
-- Usado na tabela perguntas_formulario.tipo_resposta

CREATE TYPE tipo_resposta_pergunta AS ENUM (
  'texto_curto',      -- Input de texto (até ~200 caracteres)
  'texto_longo',      -- Textarea (até ~1000 caracteres)
  'single_choice',    -- Radio buttons (escolha única)
  'multiple_choice',  -- Checkboxes (múltiplas escolhas)
  'numerico'          -- Input numérico (integer ou decimal)
);

COMMENT ON TYPE tipo_resposta_pergunta IS
'Define o tipo de campo de entrada para resposta de perguntas. Determina validação e renderização no frontend.';

-- ==============================================
-- VALIDAÇÃO
-- ==============================================

-- Verificar se todos os enums foram criados corretamente
SELECT
    typname AS enum_name,
    COUNT(enumlabel) AS total_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('status_vaga', 'etapa_processo', 'status_candidatura', 'tipo_resposta_pergunta')
GROUP BY typname
ORDER BY typname;

-- Listar todos os valores de cada enum
SELECT
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('status_vaga', 'etapa_processo', 'status_candidatura', 'tipo_resposta_pergunta')
ORDER BY t.typname, e.enumsortorder;

-- ==============================================
-- FIM DO SCRIPT 11-enums-vagas-candidaturas.sql
-- ==============================================
