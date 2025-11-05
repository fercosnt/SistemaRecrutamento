-- ============================================================================
-- Migration: 28-tabela-entrevistas-online.sql
-- Description: Criação da tabela entrevistas_online com índices, constraints e RLS
-- Dependencies:
--   - 27-enums-entrevistas-avaliacoes.sql (status_entrevista enum)
--   - PRD-DB-001 (usuarios_rh, função update_updated_at_column)
--   - PRD-DB-002 (candidaturas)
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- 1. TABELA: entrevistas_online
-- Description: Armazena entrevistas online (videochamadas) com todos os detalhes
-- ============================================================================

CREATE TABLE IF NOT EXISTS entrevistas_online (
    -- Campos de identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidatura_id UUID NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,

    -- Campos de agendamento
    data_agendada TIMESTAMPTZ NOT NULL,
    duracao_estimada_minutos INTEGER DEFAULT 60,
    link_videochamada TEXT NOT NULL,
    plataforma TEXT,

    -- Campos de status
    status status_entrevista NOT NULL DEFAULT 'agendada',
    data_inicio_real TIMESTAMPTZ,
    data_fim_real TIMESTAMPTZ,
    duracao_real_minutos INTEGER,

    -- Campos de gravação e análise IA
    gravacao_url TEXT,
    gravacao_tamanho_mb DECIMAL(10,2),
    transcricao TEXT,
    resumo_ia TEXT,
    analise_ia JSONB,

    -- Campos de notas
    notas_preparacao TEXT,
    notas_durante TEXT,
    observacoes_gerais TEXT,

    -- Campos de feedback do candidato
    feedback_candidato TEXT,
    avaliacao_candidato_score INTEGER,

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    agendado_por UUID NOT NULL REFERENCES usuarios_rh(id) ON DELETE RESTRICT,
    realizado_por UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT entrevistas_online_duracao_estimada_check CHECK (duracao_estimada_minutos >= 15 AND duracao_estimada_minutos <= 180),
    CONSTRAINT entrevistas_online_plataforma_check CHECK (plataforma IN ('google_meet', 'zoom', 'teams', 'outro')),
    CONSTRAINT entrevistas_online_avaliacao_score_check CHECK (avaliacao_candidato_score IS NULL OR (avaliacao_candidato_score >= 1 AND avaliacao_candidato_score <= 5)),
    CONSTRAINT entrevistas_online_data_futura_check CHECK (data_agendada > created_at)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_entrevistas_online_candidatura_id ON entrevistas_online(candidatura_id);
CREATE INDEX IF NOT EXISTS idx_entrevistas_online_status ON entrevistas_online(status);
CREATE INDEX IF NOT EXISTS idx_entrevistas_online_data_agendada ON entrevistas_online(data_agendada);
CREATE INDEX IF NOT EXISTS idx_entrevistas_online_agendado_por ON entrevistas_online(agendado_por);
CREATE INDEX IF NOT EXISTS idx_entrevistas_online_deleted_at ON entrevistas_online(deleted_at);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_entrevistas_online_updated_at
    BEFORE UPDATE ON entrevistas_online
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários descritivos
COMMENT ON TABLE entrevistas_online IS 'Armazena entrevistas online (videochamadas) realizadas remotamente com candidatos. Inclui agendamento, gravação, transcrição e análise IA.';
COMMENT ON COLUMN entrevistas_online.id IS 'Identificador único da entrevista online (UUID)';
COMMENT ON COLUMN entrevistas_online.candidatura_id IS 'Referência à candidatura do candidato';
COMMENT ON COLUMN entrevistas_online.data_agendada IS 'Data e hora agendadas para a entrevista (TIMESTAMPTZ)';
COMMENT ON COLUMN entrevistas_online.duracao_estimada_minutos IS 'Duração estimada da entrevista em minutos (15-180)';
COMMENT ON COLUMN entrevistas_online.link_videochamada IS 'URL do link da videochamada (Google Meet, Zoom, Teams, etc.)';
COMMENT ON COLUMN entrevistas_online.plataforma IS 'Plataforma de videochamada utilizada: google_meet, zoom, teams ou outro';
COMMENT ON COLUMN entrevistas_online.status IS 'Status atual da entrevista (agendada, em_andamento, concluida, cancelada, reagendada, nao_compareceu)';
COMMENT ON COLUMN entrevistas_online.data_inicio_real IS 'Data/hora em que a entrevista realmente começou';
COMMENT ON COLUMN entrevistas_online.data_fim_real IS 'Data/hora em que a entrevista foi finalizada';
COMMENT ON COLUMN entrevistas_online.duracao_real_minutos IS 'Duração real da entrevista em minutos (calculado automaticamente)';
COMMENT ON COLUMN entrevistas_online.gravacao_url IS 'URL da gravação da entrevista no Storage (bucket gravacoes-entrevistas)';
COMMENT ON COLUMN entrevistas_online.gravacao_tamanho_mb IS 'Tamanho do arquivo de gravação em megabytes';
COMMENT ON COLUMN entrevistas_online.transcricao IS 'Transcrição completa da entrevista (gerada via IA - integração futura com N8N)';
COMMENT ON COLUMN entrevistas_online.resumo_ia IS 'Resumo da entrevista gerado por IA (principais pontos discutidos)';
COMMENT ON COLUMN entrevistas_online.analise_ia IS 'Análise estruturada da entrevista em formato JSONB (sentimentos, competências, red flags, etc.)';
COMMENT ON COLUMN entrevistas_online.notas_preparacao IS 'Notas do RH antes da entrevista (pontos a explorar, perguntas planejadas)';
COMMENT ON COLUMN entrevistas_online.notas_durante IS 'Notas tomadas pelo RH durante a entrevista';
COMMENT ON COLUMN entrevistas_online.observacoes_gerais IS 'Observações gerais do RH após a entrevista';
COMMENT ON COLUMN entrevistas_online.feedback_candidato IS 'Feedback do candidato sobre a experiência da entrevista';
COMMENT ON COLUMN entrevistas_online.avaliacao_candidato_score IS 'Nota de 1 a 5 dada pelo candidato sobre a experiência da entrevista';
COMMENT ON COLUMN entrevistas_online.created_at IS 'Data/hora de criação do registro (quando a entrevista foi agendada)';
COMMENT ON COLUMN entrevistas_online.updated_at IS 'Data/hora da última atualização';
COMMENT ON COLUMN entrevistas_online.deleted_at IS 'Data/hora de soft delete (NULL = ativo)';
COMMENT ON COLUMN entrevistas_online.agendado_por IS 'Usuário RH que agendou a entrevista (obrigatório)';
COMMENT ON COLUMN entrevistas_online.realizado_por IS 'Usuário RH que realizou a entrevista (preenchido ao finalizar)';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 28-tabela-entrevistas-online.sql executada com sucesso';
    RAISE NOTICE 'Tabela criada:';
    RAISE NOTICE '  - entrevistas_online (29 campos: agendamento, status, gravação, IA, notas, feedback)';
    RAISE NOTICE '  - 4 constraints: duracao (15-180min), plataforma, avaliacao_score (1-5), data futura';
    RAISE NOTICE '  - 5 índices: candidatura_id, status, data_agendada, agendado_por, deleted_at';
    RAISE NOTICE '  - 1 trigger: update_updated_at';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
