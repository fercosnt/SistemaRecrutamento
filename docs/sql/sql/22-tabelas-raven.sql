-- ============================================================================
-- Migration: 22-tabelas-raven.sql
-- Description: Criação das tabelas do teste Raven (questões, respostas, scores)
-- Dependencies:
--   - 19-enums-testes-psicometricos.sql (serie_raven enum)
--   - PRD-DB-001 (usuarios_rh, função update_updated_at_column)
--   - PRD-DB-002 (candidaturas)
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- 1. TABELA: questoes_raven
-- Description: Armazena as 60 questões do teste de Matrizes Progressivas de Raven
-- ============================================================================

CREATE TABLE IF NOT EXISTS questoes_raven (
    -- Campos de identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_questao INTEGER NOT NULL,
    versao INTEGER NOT NULL DEFAULT 1,
    serie serie_raven NOT NULL,

    -- Campos de conteúdo
    imagem_matriz_url TEXT NOT NULL,
    opcoes_imagens JSONB NOT NULL,
    resposta_correta INTEGER NOT NULL,

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT questoes_raven_numero_questao_versao_key UNIQUE (numero_questao, versao),
    CONSTRAINT questoes_raven_numero_questao_check CHECK (numero_questao >= 1 AND numero_questao <= 60),
    CONSTRAINT questoes_raven_resposta_correta_check CHECK (resposta_correta >= 1 AND resposta_correta <= 8)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_questoes_raven_versao ON questoes_raven(versao);
CREATE INDEX IF NOT EXISTS idx_questoes_raven_serie ON questoes_raven(serie);
CREATE INDEX IF NOT EXISTS idx_questoes_raven_deleted_at ON questoes_raven(deleted_at);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_questoes_raven_updated_at
    BEFORE UPDATE ON questoes_raven
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários descritivos
COMMENT ON TABLE questoes_raven IS 'Armazena as 60 questões do teste de Matrizes Progressivas de Raven com suporte a versionamento. Distribuídas em 5 séries (A-E) de complexidade crescente.';
COMMENT ON COLUMN questoes_raven.id IS 'Identificador único da questão (UUID)';
COMMENT ON COLUMN questoes_raven.numero_questao IS 'Número sequencial da questão (1-60)';
COMMENT ON COLUMN questoes_raven.versao IS 'Versão da questão para permitir atualizações sem perder histórico';
COMMENT ON COLUMN questoes_raven.serie IS 'Série da questão (A, B, C, D, E) - indica o nível de complexidade';
COMMENT ON COLUMN questoes_raven.imagem_matriz_url IS 'URL da imagem da matriz (padrão com peça faltando) no Storage';
COMMENT ON COLUMN questoes_raven.opcoes_imagens IS 'Array de 8 URLs das imagens das opções em formato JSONB. Formato: ["url1", "url2", ..., "url8"]';
COMMENT ON COLUMN questoes_raven.resposta_correta IS 'Número da opção correta (1-8)';
COMMENT ON COLUMN questoes_raven.created_at IS 'Data/hora de criação da questão';
COMMENT ON COLUMN questoes_raven.updated_at IS 'Data/hora da última atualização';
COMMENT ON COLUMN questoes_raven.deleted_at IS 'Data/hora de soft delete (NULL = ativa)';
COMMENT ON COLUMN questoes_raven.created_by IS 'Usuário RH que criou/importou a questão';


-- ============================================================================
-- 2. TABELA: respostas_raven
-- Description: Armazena as respostas dos candidatos ao teste Raven
-- ============================================================================

CREATE TABLE IF NOT EXISTS respostas_raven (
    -- Campos de identificação e relacionamento
    candidatura_id UUID NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
    questao_id UUID NOT NULL REFERENCES questoes_raven(id) ON DELETE CASCADE,

    -- Campos de conteúdo
    resposta INTEGER NOT NULL,
    tempo_resposta_segundos INTEGER,

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Primary Key composta
    PRIMARY KEY (candidatura_id, questao_id),

    -- Constraints
    CONSTRAINT respostas_raven_resposta_check CHECK (resposta >= 1 AND resposta <= 8)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_respostas_raven_candidatura_id ON respostas_raven(candidatura_id);
CREATE INDEX IF NOT EXISTS idx_respostas_raven_questao_id ON respostas_raven(questao_id);

-- Comentários descritivos
COMMENT ON TABLE respostas_raven IS 'Armazena as respostas dos candidatos ao teste de Matrizes Progressivas de Raven. O candidato escolhe 1 das 8 opções para completar a matriz.';
COMMENT ON COLUMN respostas_raven.candidatura_id IS 'Referência à candidatura do candidato';
COMMENT ON COLUMN respostas_raven.questao_id IS 'Referência à questão respondida';
COMMENT ON COLUMN respostas_raven.resposta IS 'Número da opção escolhida pelo candidato (1-8)';
COMMENT ON COLUMN respostas_raven.tempo_resposta_segundos IS 'Tempo que o candidato levou para responder esta questão (em segundos)';
COMMENT ON COLUMN respostas_raven.created_at IS 'Data/hora em que a resposta foi registrada';


-- ============================================================================
-- 3. TABELA: scores_raven
-- Description: Armazena os scores calculados do teste Raven para cada candidato
-- ============================================================================

CREATE TABLE IF NOT EXISTS scores_raven (
    -- Relacionamento (um score por candidatura)
    candidatura_id UUID NOT NULL UNIQUE REFERENCES candidaturas(id) ON DELETE CASCADE,

    -- Scores e métricas
    total_acertos INTEGER NOT NULL,
    percentual_acerto DECIMAL(5,2) NOT NULL,
    percentil INTEGER NOT NULL,
    classificacao TEXT NOT NULL,
    acertos_por_serie JSONB NOT NULL,

    -- Metadados
    tempo_total_segundos INTEGER NOT NULL,

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Primary Key
    PRIMARY KEY (candidatura_id),

    -- Constraints
    CONSTRAINT scores_raven_total_acertos_check CHECK (total_acertos >= 0 AND total_acertos <= 60),
    CONSTRAINT scores_raven_percentual_acerto_check CHECK (percentual_acerto >= 0 AND percentual_acerto <= 100),
    CONSTRAINT scores_raven_percentil_check CHECK (percentil >= 0 AND percentil <= 100),
    CONSTRAINT scores_raven_classificacao_check CHECK (classificacao IN ('Inferior', 'Médio Inferior', 'Médio', 'Médio Superior', 'Superior')),
    CONSTRAINT scores_raven_tempo_total_check CHECK (tempo_total_segundos >= 0)
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_scores_raven_candidatura_id ON scores_raven(candidatura_id);

-- Comentários descritivos
COMMENT ON TABLE scores_raven IS 'Armazena os scores calculados do teste de Matrizes Progressivas de Raven para cada candidato. Inclui acertos, percentual, percentil baseado em normas e classificação.';
COMMENT ON COLUMN scores_raven.candidatura_id IS 'Referência à candidatura do candidato (relação 1:1)';
COMMENT ON COLUMN scores_raven.total_acertos IS 'Total de questões respondidas corretamente (0-60)';
COMMENT ON COLUMN scores_raven.percentual_acerto IS 'Percentual de acerto calculado: (total_acertos / 60) * 100';
COMMENT ON COLUMN scores_raven.percentil IS 'Percentil do candidato baseado em tabela normativa (0-100). Ex: percentil 75 = melhor que 75% da população';
COMMENT ON COLUMN scores_raven.classificacao IS 'Classificação baseada no percentil: Inferior (<25), Médio Inferior (25-49), Médio (50-74), Médio Superior (75-89), Superior (>=90)';
COMMENT ON COLUMN scores_raven.acertos_por_serie IS 'Detalhamento de acertos por série em formato JSONB. Formato: {"A": 10, "B": 9, "C": 8, "D": 7, "E": 6}';
COMMENT ON COLUMN scores_raven.tempo_total_segundos IS 'Tempo total que o candidato levou para completar o teste (em segundos)';
COMMENT ON COLUMN scores_raven.created_at IS 'Data/hora em que os scores foram calculados pela primeira vez';
COMMENT ON COLUMN scores_raven.updated_at IS 'Data/hora da última atualização dos scores';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 22-tabelas-raven.sql executada com sucesso';
    RAISE NOTICE 'Tabelas criadas:';
    RAISE NOTICE '  - questoes_raven (60 questões em 5 séries A-E)';
    RAISE NOTICE '  - respostas_raven (escolha 1 de 8 opções)';
    RAISE NOTICE '  - scores_raven (acertos, percentil e classificação)';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
