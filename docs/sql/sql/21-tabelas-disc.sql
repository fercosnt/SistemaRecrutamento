-- ============================================================================
-- Migration: 21-tabelas-disc.sql
-- Description: Criação das tabelas do teste DISC (questões, respostas, scores)
-- Dependencies:
--   - 19-enums-testes-psicometricos.sql (dimensao_disc enum)
--   - PRD-DB-001 (usuarios_rh, função update_updated_at_column)
--   - PRD-DB-002 (candidaturas)
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- 1. TABELA: questoes_disc
-- Description: Armazena as 28 questões do teste DISC com versionamento
-- ============================================================================

CREATE TABLE IF NOT EXISTS questoes_disc (
    -- Campos de identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_questao INTEGER NOT NULL,
    versao INTEGER NOT NULL DEFAULT 1,

    -- Campos de conteúdo
    opcoes JSONB NOT NULL,

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT questoes_disc_numero_questao_versao_key UNIQUE (numero_questao, versao),
    CONSTRAINT questoes_disc_numero_questao_check CHECK (numero_questao >= 1 AND numero_questao <= 28)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_questoes_disc_versao ON questoes_disc(versao);
CREATE INDEX IF NOT EXISTS idx_questoes_disc_deleted_at ON questoes_disc(deleted_at);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_questoes_disc_updated_at
    BEFORE UPDATE ON questoes_disc
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários descritivos
COMMENT ON TABLE questoes_disc IS 'Armazena as 28 questões do teste DISC com suporte a versionamento. Cada questão contém 4 opções (D, I, S, C).';
COMMENT ON COLUMN questoes_disc.id IS 'Identificador único da questão (UUID)';
COMMENT ON COLUMN questoes_disc.numero_questao IS 'Número sequencial da questão (1-28)';
COMMENT ON COLUMN questoes_disc.versao IS 'Versão da questão para permitir atualizações sem perder histórico';
COMMENT ON COLUMN questoes_disc.opcoes IS 'Array de 4 opções em formato JSONB. Formato: [{"dimensao": "D", "texto": "..."}, {"dimensao": "I", "texto": "..."}, {"dimensao": "S", "texto": "..."}, {"dimensao": "C", "texto": "..."}]';
COMMENT ON COLUMN questoes_disc.created_at IS 'Data/hora de criação da questão';
COMMENT ON COLUMN questoes_disc.updated_at IS 'Data/hora da última atualização';
COMMENT ON COLUMN questoes_disc.deleted_at IS 'Data/hora de soft delete (NULL = ativa)';
COMMENT ON COLUMN questoes_disc.created_by IS 'Usuário RH que criou/importou a questão';


-- ============================================================================
-- 2. TABELA: respostas_disc
-- Description: Armazena as respostas dos candidatos ao teste DISC
-- ============================================================================

CREATE TABLE IF NOT EXISTS respostas_disc (
    -- Campos de identificação e relacionamento
    candidatura_id UUID NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
    questao_id UUID NOT NULL REFERENCES questoes_disc(id) ON DELETE CASCADE,

    -- Campos de conteúdo
    mais_caracteristico TEXT NOT NULL,
    menos_caracteristico TEXT NOT NULL,
    tempo_resposta_segundos INTEGER,

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Primary Key composta
    PRIMARY KEY (candidatura_id, questao_id),

    -- Constraints
    CONSTRAINT respostas_disc_mais_caracteristico_check CHECK (mais_caracteristico IN ('D', 'I', 'S', 'C')),
    CONSTRAINT respostas_disc_menos_caracteristico_check CHECK (menos_caracteristico IN ('D', 'I', 'S', 'C')),
    CONSTRAINT respostas_disc_diferente_check CHECK (mais_caracteristico != menos_caracteristico)
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_respostas_disc_candidatura_id ON respostas_disc(candidatura_id);

-- Comentários descritivos
COMMENT ON TABLE respostas_disc IS 'Armazena as respostas dos candidatos ao teste DISC. Para cada questão, o candidato escolhe a característica mais e menos representativa.';
COMMENT ON COLUMN respostas_disc.candidatura_id IS 'Referência à candidatura do candidato';
COMMENT ON COLUMN respostas_disc.questao_id IS 'Referência à questão respondida';
COMMENT ON COLUMN respostas_disc.mais_caracteristico IS 'Dimensão escolhida como MAIS característica do candidato (D, I, S ou C)';
COMMENT ON COLUMN respostas_disc.menos_caracteristico IS 'Dimensão escolhida como MENOS característica do candidato (D, I, S ou C)';
COMMENT ON COLUMN respostas_disc.tempo_resposta_segundos IS 'Tempo que o candidato levou para responder esta questão (em segundos)';
COMMENT ON COLUMN respostas_disc.created_at IS 'Data/hora em que a resposta foi registrada';


-- ============================================================================
-- 3. TABELA: scores_disc
-- Description: Armazena os scores calculados do teste DISC para cada candidato
-- ============================================================================

CREATE TABLE IF NOT EXISTS scores_disc (
    -- Relacionamento (um score por candidatura)
    candidatura_id UUID NOT NULL UNIQUE REFERENCES candidaturas(id) ON DELETE CASCADE,

    -- Scores por dimensão
    score_d INTEGER NOT NULL,
    score_i INTEGER NOT NULL,
    score_s INTEGER NOT NULL,
    score_c INTEGER NOT NULL,

    -- Perfis resultantes
    perfil_primario TEXT NOT NULL,
    perfil_secundario TEXT NOT NULL,

    -- Metadados
    tempo_total_segundos INTEGER NOT NULL,

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Primary Key
    PRIMARY KEY (candidatura_id),

    -- Constraints
    CONSTRAINT scores_disc_score_d_check CHECK (score_d >= -28 AND score_d <= 56),
    CONSTRAINT scores_disc_score_i_check CHECK (score_i >= -28 AND score_i <= 56),
    CONSTRAINT scores_disc_score_s_check CHECK (score_s >= -28 AND score_s <= 56),
    CONSTRAINT scores_disc_score_c_check CHECK (score_c >= -28 AND score_c <= 56),
    CONSTRAINT scores_disc_perfil_primario_check CHECK (perfil_primario IN ('D', 'I', 'S', 'C')),
    CONSTRAINT scores_disc_perfil_secundario_check CHECK (perfil_secundario IN ('D', 'I', 'S', 'C')),
    CONSTRAINT scores_disc_tempo_total_check CHECK (tempo_total_segundos >= 0)
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_scores_disc_candidatura_id ON scores_disc(candidatura_id);

-- Comentários descritivos
COMMENT ON TABLE scores_disc IS 'Armazena os scores calculados do teste DISC para cada candidato. Sistema de pontuação: +2 pontos para "mais característico", -1 ponto para "menos característico".';
COMMENT ON COLUMN scores_disc.candidatura_id IS 'Referência à candidatura do candidato (relação 1:1)';
COMMENT ON COLUMN scores_disc.score_d IS 'Score para Dominância (-28 a 56). Quanto maior, mais orientado para resultados, direto e assertivo.';
COMMENT ON COLUMN scores_disc.score_i IS 'Score para Influência (-28 a 56). Quanto maior, mais sociável, entusiasta e persuasivo.';
COMMENT ON COLUMN scores_disc.score_s IS 'Score para Estabilidade (-28 a 56). Quanto maior, mais calmo, paciente e leal.';
COMMENT ON COLUMN scores_disc.score_c IS 'Score para Conformidade (-28 a 56). Quanto maior, mais analítico, preciso e sistemático.';
COMMENT ON COLUMN scores_disc.perfil_primario IS 'Dimensão com maior score (D, I, S ou C) - traço dominante da personalidade';
COMMENT ON COLUMN scores_disc.perfil_secundario IS 'Dimensão com segundo maior score (D, I, S ou C) - traço secundário da personalidade';
COMMENT ON COLUMN scores_disc.tempo_total_segundos IS 'Tempo total que o candidato levou para completar o teste (em segundos)';
COMMENT ON COLUMN scores_disc.created_at IS 'Data/hora em que os scores foram calculados pela primeira vez';
COMMENT ON COLUMN scores_disc.updated_at IS 'Data/hora da última atualização dos scores';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 21-tabelas-disc.sql executada com sucesso';
    RAISE NOTICE 'Tabelas criadas:';
    RAISE NOTICE '  - questoes_disc (28 questões com 4 opções JSONB)';
    RAISE NOTICE '  - respostas_disc (mais/menos característico)';
    RAISE NOTICE '  - scores_disc (scores -28 a 56, perfis primário/secundário)';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
