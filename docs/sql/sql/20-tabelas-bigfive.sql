-- ============================================================================
-- Migration: 20-tabelas-bigfive.sql
-- Description: Criação das tabelas do teste Big Five (questões, respostas, scores)
-- Dependencies:
--   - 19-enums-testes-psicometricos.sql (dimensao_bigfive enum)
--   - PRD-DB-001 (usuarios_rh, função update_updated_at_column)
--   - PRD-DB-002 (candidaturas)
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- 1. TABELA: questoes_bigfive
-- Description: Armazena as 100 questões do teste Big Five com versionamento
-- ============================================================================

CREATE TABLE IF NOT EXISTS questoes_bigfive (
    -- Campos de identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_questao INTEGER NOT NULL,
    versao INTEGER NOT NULL DEFAULT 1,

    -- Campos de conteúdo
    texto_questao TEXT NOT NULL,
    dimensao dimensao_bigfive NOT NULL,
    is_invertida BOOLEAN NOT NULL DEFAULT FALSE,

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT questoes_bigfive_numero_questao_versao_key UNIQUE (numero_questao, versao),
    CONSTRAINT questoes_bigfive_numero_questao_check CHECK (numero_questao >= 1 AND numero_questao <= 100)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_questoes_bigfive_versao ON questoes_bigfive(versao);
CREATE INDEX IF NOT EXISTS idx_questoes_bigfive_dimensao ON questoes_bigfive(dimensao);
CREATE INDEX IF NOT EXISTS idx_questoes_bigfive_deleted_at ON questoes_bigfive(deleted_at);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_questoes_bigfive_updated_at
    BEFORE UPDATE ON questoes_bigfive
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários descritivos
COMMENT ON TABLE questoes_bigfive IS 'Armazena as 100 questões do teste Big Five com suporte a versionamento. Cada questão mede uma das cinco dimensões OCEAN (5 dimensões × 2 aspectos × 10 questões = 100 total).';
COMMENT ON COLUMN questoes_bigfive.id IS 'Identificador único da questão (UUID)';
COMMENT ON COLUMN questoes_bigfive.numero_questao IS 'Número sequencial da questão (1-100)';
COMMENT ON COLUMN questoes_bigfive.versao IS 'Versão da questão para permitir atualizações sem perder histórico';
COMMENT ON COLUMN questoes_bigfive.texto_questao IS 'Texto completo da questão apresentada ao candidato';
COMMENT ON COLUMN questoes_bigfive.dimensao IS 'Dimensão OCEAN que a questão avalia (openness, conscientiousness, extraversion, agreeableness, neuroticism)';
COMMENT ON COLUMN questoes_bigfive.is_invertida IS 'Indica se a pontuação deve ser invertida no cálculo (5→1, 4→2, 3→3, 2→4, 1→5)';
COMMENT ON COLUMN questoes_bigfive.created_at IS 'Data/hora de criação da questão';
COMMENT ON COLUMN questoes_bigfive.updated_at IS 'Data/hora da última atualização';
COMMENT ON COLUMN questoes_bigfive.deleted_at IS 'Data/hora de soft delete (NULL = ativa)';
COMMENT ON COLUMN questoes_bigfive.created_by IS 'Usuário RH que criou/importou a questão';


-- ============================================================================
-- 2. TABELA: respostas_bigfive
-- Description: Armazena as respostas dos candidatos ao teste Big Five
-- ============================================================================

CREATE TABLE IF NOT EXISTS respostas_bigfive (
    -- Campos de identificação e relacionamento
    candidatura_id UUID NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
    questao_id UUID NOT NULL REFERENCES questoes_bigfive(id) ON DELETE CASCADE,

    -- Campos de conteúdo
    resposta INTEGER NOT NULL,
    tempo_resposta_segundos INTEGER,

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Primary Key composta
    PRIMARY KEY (candidatura_id, questao_id),

    -- Constraints
    CONSTRAINT respostas_bigfive_resposta_check CHECK (resposta >= 1 AND resposta <= 5)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_respostas_bigfive_candidatura_id ON respostas_bigfive(candidatura_id);
CREATE INDEX IF NOT EXISTS idx_respostas_bigfive_questao_id ON respostas_bigfive(questao_id);

-- Comentários descritivos
COMMENT ON TABLE respostas_bigfive IS 'Armazena as respostas dos candidatos ao teste Big Five. Escala Likert de 1 a 5 (1=Discordo Totalmente, 5=Concordo Totalmente).';
COMMENT ON COLUMN respostas_bigfive.candidatura_id IS 'Referência à candidatura do candidato';
COMMENT ON COLUMN respostas_bigfive.questao_id IS 'Referência à questão respondida';
COMMENT ON COLUMN respostas_bigfive.resposta IS 'Resposta na escala Likert (1-5): 1=Discordo Totalmente, 2=Discordo, 3=Neutro, 4=Concordo, 5=Concordo Totalmente';
COMMENT ON COLUMN respostas_bigfive.tempo_resposta_segundos IS 'Tempo que o candidato levou para responder esta questão (em segundos)';
COMMENT ON COLUMN respostas_bigfive.created_at IS 'Data/hora em que a resposta foi registrada';


-- ============================================================================
-- 3. TABELA: scores_bigfive
-- Description: Armazena os scores calculados do teste Big Five para cada candidato
-- ============================================================================

CREATE TABLE IF NOT EXISTS scores_bigfive (
    -- Relacionamento (um score por candidatura)
    candidatura_id UUID NOT NULL UNIQUE REFERENCES candidaturas(id) ON DELETE CASCADE,

    -- Scores por dimensão (escala 0-100)
    score_openness DECIMAL(5,2) NOT NULL,
    score_conscientiousness DECIMAL(5,2) NOT NULL,
    score_extraversion DECIMAL(5,2) NOT NULL,
    score_agreeableness DECIMAL(5,2) NOT NULL,
    score_neuroticism DECIMAL(5,2) NOT NULL,

    -- Metadados
    tempo_total_segundos INTEGER NOT NULL,

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Primary Key
    PRIMARY KEY (candidatura_id),

    -- Constraints
    CONSTRAINT scores_bigfive_openness_check CHECK (score_openness >= 0 AND score_openness <= 100),
    CONSTRAINT scores_bigfive_conscientiousness_check CHECK (score_conscientiousness >= 0 AND score_conscientiousness <= 100),
    CONSTRAINT scores_bigfive_extraversion_check CHECK (score_extraversion >= 0 AND score_extraversion <= 100),
    CONSTRAINT scores_bigfive_agreeableness_check CHECK (score_agreeableness >= 0 AND score_agreeableness <= 100),
    CONSTRAINT scores_bigfive_neuroticism_check CHECK (score_neuroticism >= 0 AND score_neuroticism <= 100),
    CONSTRAINT scores_bigfive_tempo_total_check CHECK (tempo_total_segundos >= 0)
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_scores_bigfive_candidatura_id ON scores_bigfive(candidatura_id);

-- Comentários descritivos
COMMENT ON TABLE scores_bigfive IS 'Armazena os scores calculados do teste Big Five para cada candidato. Scores normalizados em escala 0-100 para cada dimensão OCEAN.';
COMMENT ON COLUMN scores_bigfive.candidatura_id IS 'Referência à candidatura do candidato (relação 1:1)';
COMMENT ON COLUMN scores_bigfive.score_openness IS 'Score normalizado (0-100) para Abertura à Experiência. Quanto maior, mais aberto a novas experiências, criativo e curioso.';
COMMENT ON COLUMN scores_bigfive.score_conscientiousness IS 'Score normalizado (0-100) para Conscienciosidade. Quanto maior, mais organizado, responsável e disciplinado.';
COMMENT ON COLUMN scores_bigfive.score_extraversion IS 'Score normalizado (0-100) para Extroversão. Quanto maior, mais sociável, assertivo e energético.';
COMMENT ON COLUMN scores_bigfive.score_agreeableness IS 'Score normalizado (0-100) para Amabilidade. Quanto maior, mais cooperativo, empático e confiável.';
COMMENT ON COLUMN scores_bigfive.score_neuroticism IS 'Score normalizado (0-100) para Neuroticismo. Quanto maior, mais propenso a ansiedade e instabilidade emocional.';
COMMENT ON COLUMN scores_bigfive.tempo_total_segundos IS 'Tempo total que o candidato levou para completar o teste (em segundos)';
COMMENT ON COLUMN scores_bigfive.created_at IS 'Data/hora em que os scores foram calculados pela primeira vez';
COMMENT ON COLUMN scores_bigfive.updated_at IS 'Data/hora da última atualização dos scores';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 20-tabelas-bigfive.sql executada com sucesso';
    RAISE NOTICE 'Tabelas criadas:';
    RAISE NOTICE '  - questoes_bigfive (100 questões com versionamento: 5 dimensões × 2 aspectos × 10 questões)';
    RAISE NOTICE '  - respostas_bigfive (respostas escala 1-5)';
    RAISE NOTICE '  - scores_bigfive (scores normalizados 0-100)';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
