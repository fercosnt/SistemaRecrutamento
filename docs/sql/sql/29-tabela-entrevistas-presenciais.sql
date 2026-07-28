-- ============================================================================
-- Migration: 29-tabela-entrevistas-presenciais.sql
-- Description: Criação da tabela entrevistas_presenciais com índices, constraints e RLS
-- Dependencies:
--   - 27-enums-entrevistas-avaliacoes.sql (status_entrevista enum)
--   - PRD-DB-001 (usuarios_rh, função update_updated_at_column)
--   - PRD-DB-002 (candidaturas)
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- 1. TABELA: entrevistas_presenciais
-- Description: Armazena entrevistas presenciais realizadas nas instalações da empresa
-- ============================================================================

CREATE TABLE IF NOT EXISTS entrevistas_presenciais (
    -- Campos de identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidatura_id UUID NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,

    -- Campos de agendamento
    data_agendada TIMESTAMPTZ NOT NULL,
    duracao_estimada_minutos INTEGER DEFAULT 60,
    local_entrevista TEXT NOT NULL,
    sala_numero TEXT,
    instrucoes_acesso TEXT,

    -- Campos de status
    status status_entrevista NOT NULL DEFAULT 'agendada',
    data_inicio_real TIMESTAMPTZ,
    data_fim_real TIMESTAMPTZ,
    duracao_real_minutos INTEGER,

    -- Campos JSONB para documentos
    documentos_necessarios JSONB,
    documentos_apresentados JSONB,

    -- Campos de notas
    notas_preparacao TEXT,
    notas_durante TEXT,
    observacoes_gerais TEXT,
    primeira_impressao TEXT,

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    agendado_por UUID NOT NULL REFERENCES usuarios_rh(id) ON DELETE RESTRICT,
    realizado_por UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT entrevistas_presenciais_duracao_estimada_check CHECK (duracao_estimada_minutos >= 15 AND duracao_estimada_minutos <= 180),
    CONSTRAINT entrevistas_presenciais_data_futura_check CHECK (data_agendada > created_at)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_entrevistas_presenciais_candidatura_id ON entrevistas_presenciais(candidatura_id);
CREATE INDEX IF NOT EXISTS idx_entrevistas_presenciais_status ON entrevistas_presenciais(status);
CREATE INDEX IF NOT EXISTS idx_entrevistas_presenciais_data_agendada ON entrevistas_presenciais(data_agendada);
CREATE INDEX IF NOT EXISTS idx_entrevistas_presenciais_deleted_at ON entrevistas_presenciais(deleted_at);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_entrevistas_presenciais_updated_at
    BEFORE UPDATE ON entrevistas_presenciais
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários descritivos
COMMENT ON TABLE entrevistas_presenciais IS 'Armazena entrevistas presenciais realizadas nas instalações da empresa. Inclui informações sobre local, sala, documentos e primeira impressão.';
COMMENT ON COLUMN entrevistas_presenciais.id IS 'Identificador único da entrevista presencial (UUID)';
COMMENT ON COLUMN entrevistas_presenciais.candidatura_id IS 'Referência à candidatura do candidato';
COMMENT ON COLUMN entrevistas_presenciais.data_agendada IS 'Data e hora agendadas para a entrevista (TIMESTAMPTZ)';
COMMENT ON COLUMN entrevistas_presenciais.duracao_estimada_minutos IS 'Duração estimada da entrevista em minutos (15-180)';
COMMENT ON COLUMN entrevistas_presenciais.local_entrevista IS 'Endereço ou nome do local onde a entrevista será realizada';
COMMENT ON COLUMN entrevistas_presenciais.sala_numero IS 'Número ou nome da sala onde a entrevista será realizada';
COMMENT ON COLUMN entrevistas_presenciais.instrucoes_acesso IS 'Instruções de como chegar ao local e acessar o prédio/sala';
COMMENT ON COLUMN entrevistas_presenciais.status IS 'Status atual da entrevista (agendada, em_andamento, concluida, cancelada, reagendada, nao_compareceu)';
COMMENT ON COLUMN entrevistas_presenciais.data_inicio_real IS 'Data/hora em que a entrevista realmente começou';
COMMENT ON COLUMN entrevistas_presenciais.data_fim_real IS 'Data/hora em que a entrevista foi finalizada';
COMMENT ON COLUMN entrevistas_presenciais.duracao_real_minutos IS 'Duração real da entrevista em minutos (calculado automaticamente)';
COMMENT ON COLUMN entrevistas_presenciais.documentos_necessarios IS 'Lista de documentos que o candidato deve trazer em formato JSONB. Ex: [{"tipo": "RG", "obrigatorio": true}, {"tipo": "CPF", "obrigatorio": true}]';
COMMENT ON COLUMN entrevistas_presenciais.documentos_apresentados IS 'Lista de documentos que o candidato efetivamente apresentou em formato JSONB. Ex: [{"tipo": "RG", "numero": "123456789", "apresentado": true}]';
COMMENT ON COLUMN entrevistas_presenciais.notas_preparacao IS 'Notas do RH antes da entrevista (pontos a explorar, perguntas planejadas)';
COMMENT ON COLUMN entrevistas_presenciais.notas_durante IS 'Notas tomadas pelo RH durante a entrevista';
COMMENT ON COLUMN entrevistas_presenciais.observacoes_gerais IS 'Observações gerais do RH após a entrevista';
COMMENT ON COLUMN entrevistas_presenciais.primeira_impressao IS 'Primeira impressão do RH ao receber o candidato (apresentação, pontualidade, postura)';
COMMENT ON COLUMN entrevistas_presenciais.created_at IS 'Data/hora de criação do registro (quando a entrevista foi agendada)';
COMMENT ON COLUMN entrevistas_presenciais.updated_at IS 'Data/hora da última atualização';
COMMENT ON COLUMN entrevistas_presenciais.deleted_at IS 'Data/hora de soft delete (NULL = ativo)';
COMMENT ON COLUMN entrevistas_presenciais.agendado_por IS 'Usuário RH que agendou a entrevista (obrigatório)';
COMMENT ON COLUMN entrevistas_presenciais.realizado_por IS 'Usuário RH que realizou a entrevista (preenchido ao finalizar)';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 29-tabela-entrevistas-presenciais.sql executada com sucesso';
    RAISE NOTICE 'Tabela criada:';
    RAISE NOTICE '  - entrevistas_presenciais (23 campos: agendamento, status, local, documentos JSONB, notas, primeira impressão)';
    RAISE NOTICE '  - 2 constraints: duracao (15-180min), data futura';
    RAISE NOTICE '  - 4 índices: candidatura_id, status, data_agendada, deleted_at';
    RAISE NOTICE '  - 1 trigger: update_updated_at';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
