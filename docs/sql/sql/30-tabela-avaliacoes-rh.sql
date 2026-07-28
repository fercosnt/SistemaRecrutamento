-- ============================================================================
-- Migration: 30-tabela-avaliacoes-rh.sql
-- Description: Criação da tabela avaliacoes_rh com competências JSONB e recomendações
-- Dependencies:
--   - 27-enums-entrevistas-avaliacoes.sql (tipo_entrevista_avaliacao, recomendacao_avaliacao enum)
--   - 28-tabela-entrevistas-online.sql
--   - 29-tabela-entrevistas-presenciais.sql
--   - PRD-DB-001 (usuarios_rh, função update_updated_at_column)
--   - PRD-DB-002 (candidaturas)
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- 1. TABELA: avaliacoes_rh
-- Description: Armazena avaliações estruturadas de RH após entrevistas (online ou presenciais)
-- ============================================================================

CREATE TABLE IF NOT EXISTS avaliacoes_rh (
    -- Campos de identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidatura_id UUID NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,

    -- Referência à entrevista (polimórfica: online ou presencial)
    tipo_entrevista tipo_entrevista_avaliacao NOT NULL,
    entrevista_id UUID NOT NULL,

    -- Campos de avaliação estruturada
    competencias JSONB NOT NULL,
    score_geral DECIMAL(3,1) NOT NULL,
    recomendacao recomendacao_avaliacao NOT NULL,

    -- Campos de texto livre
    pontos_fortes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    pontos_fracos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    observacoes TEXT,
    justificativa_recomendacao TEXT NOT NULL,

    -- Campos técnicos específicos (opcional)
    adequacao_tecnica DECIMAL(3,1),
    adequacao_cultural DECIMAL(3,1),
    potencial_crescimento DECIMAL(3,1),

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    avaliador_id UUID NOT NULL REFERENCES usuarios_rh(id) ON DELETE RESTRICT,

    -- Constraints
    CONSTRAINT avaliacoes_rh_unique_avaliacao UNIQUE (candidatura_id, tipo_entrevista, entrevista_id, avaliador_id),
    CONSTRAINT avaliacoes_rh_score_geral_check CHECK (score_geral >= 1.0 AND score_geral <= 5.0),
    CONSTRAINT avaliacoes_rh_adequacao_tecnica_check CHECK (adequacao_tecnica IS NULL OR (adequacao_tecnica >= 1.0 AND adequacao_tecnica <= 5.0)),
    CONSTRAINT avaliacoes_rh_adequacao_cultural_check CHECK (adequacao_cultural IS NULL OR (adequacao_cultural >= 1.0 AND adequacao_cultural <= 5.0)),
    CONSTRAINT avaliacoes_rh_potencial_crescimento_check CHECK (potencial_crescimento IS NULL OR (potencial_crescimento >= 1.0 AND potencial_crescimento <= 5.0))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rh_candidatura_id ON avaliacoes_rh(candidatura_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rh_tipo_entrevista ON avaliacoes_rh(tipo_entrevista);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rh_entrevista_id ON avaliacoes_rh(entrevista_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rh_avaliador_id ON avaliacoes_rh(avaliador_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rh_recomendacao ON avaliacoes_rh(recomendacao);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rh_score_geral ON avaliacoes_rh(score_geral);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rh_deleted_at ON avaliacoes_rh(deleted_at);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rh_competencias_gin ON avaliacoes_rh USING GIN (competencias);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_avaliacoes_rh_updated_at
    BEFORE UPDATE ON avaliacoes_rh
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários descritivos
COMMENT ON TABLE avaliacoes_rh IS 'Armazena avaliações estruturadas de RH após entrevistas (online ou presenciais). Inclui competências avaliadas (JSONB), score geral, recomendação e adequação técnica/cultural.';
COMMENT ON COLUMN avaliacoes_rh.id IS 'Identificador único da avaliação (UUID)';
COMMENT ON COLUMN avaliacoes_rh.candidatura_id IS 'Referência à candidatura do candidato';
COMMENT ON COLUMN avaliacoes_rh.tipo_entrevista IS 'Tipo de entrevista avaliada (online ou presencial)';
COMMENT ON COLUMN avaliacoes_rh.entrevista_id IS 'ID da entrevista específica (referência polimórfica para entrevistas_online.id ou entrevistas_presenciais.id)';
COMMENT ON COLUMN avaliacoes_rh.competencias IS 'Competências avaliadas em formato JSONB. Formato: {"comunicacao": {"score": 4.5, "observacao": "Excelente clareza"}, "lideranca": {"score": 3.0, "observacao": "Precisa desenvolver"}}';
COMMENT ON COLUMN avaliacoes_rh.score_geral IS 'Score geral da avaliação (escala 1.0-5.0). Média ponderada das competências ou score holístico do avaliador.';
COMMENT ON COLUMN avaliacoes_rh.recomendacao IS 'Recomendação do avaliador (aprovar, rejeitar, indeciso)';
COMMENT ON COLUMN avaliacoes_rh.pontos_fortes IS 'Array de pontos fortes identificados pelo avaliador. Ex: ARRAY["Excelente comunicação", "Proativo", "Experiência relevante"]';
COMMENT ON COLUMN avaliacoes_rh.pontos_fracos IS 'Array de pontos fracos ou áreas de melhoria. Ex: ARRAY["Pouca experiência com liderança", "Nervosismo inicial"]';
COMMENT ON COLUMN avaliacoes_rh.observacoes IS 'Observações gerais adicionais do avaliador sobre o candidato';
COMMENT ON COLUMN avaliacoes_rh.justificativa_recomendacao IS 'Justificativa obrigatória para a recomendação (aprovar/rejeitar/indeciso). Explicação do raciocínio do avaliador.';
COMMENT ON COLUMN avaliacoes_rh.adequacao_tecnica IS 'Score de adequação técnica às competências da vaga (1.0-5.0). NULL se não aplicável.';
COMMENT ON COLUMN avaliacoes_rh.adequacao_cultural IS 'Score de adequação cultural (fit cultural) à empresa (1.0-5.0). NULL se não aplicável.';
COMMENT ON COLUMN avaliacoes_rh.potencial_crescimento IS 'Score de potencial de crescimento do candidato (1.0-5.0). NULL se não aplicável.';
COMMENT ON COLUMN avaliacoes_rh.created_at IS 'Data/hora de criação da avaliação';
COMMENT ON COLUMN avaliacoes_rh.updated_at IS 'Data/hora da última atualização';
COMMENT ON COLUMN avaliacoes_rh.deleted_at IS 'Data/hora de soft delete (NULL = ativa)';
COMMENT ON COLUMN avaliacoes_rh.avaliador_id IS 'Usuário RH que realizou a avaliação (obrigatório)';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 30-tabela-avaliacoes-rh.sql executada com sucesso';
    RAISE NOTICE 'Tabela criada:';
    RAISE NOTICE '  - avaliacoes_rh (17 campos: competências JSONB, scores, recomendação, pontos fortes/fracos)';
    RAISE NOTICE '  - 4 constraints: score_geral (1.0-5.0), adequacao_tecnica, adequacao_cultural, potencial_crescimento';
    RAISE NOTICE '  - 1 constraint UNIQUE: (candidatura_id, tipo_entrevista, entrevista_id, avaliador_id)';
    RAISE NOTICE '  - 8 índices: candidatura_id, tipo_entrevista, entrevista_id, avaliador_id, recomendacao, score_geral, deleted_at, competencias (GIN)';
    RAISE NOTICE '  - 1 trigger: update_updated_at';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
