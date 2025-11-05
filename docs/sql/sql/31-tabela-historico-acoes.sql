-- ============================================================================
-- Migration: 31-tabela-historico-acoes.sql
-- Description: Criação da tabela historico_acoes (imutável) para auditoria completa
-- Dependencies:
--   - 27-enums-entrevistas-avaliacoes.sql (tipo_acao_historico enum)
--   - PRD-DB-001 (usuarios_rh)
--   - PRD-DB-002 (candidaturas)
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- 1. TABELA: historico_acoes
-- Description: Tabela IMUTÁVEL para registro de auditoria completa de todas as ações
-- ============================================================================

CREATE TABLE IF NOT EXISTS historico_acoes (
    -- Campos de identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidatura_id UUID NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,

    -- Campos da ação
    tipo_acao tipo_acao_historico NOT NULL,
    descricao TEXT NOT NULL,
    metadata JSONB,

    -- Campos de auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_id UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_historico_acoes_candidatura_id ON historico_acoes(candidatura_id);
CREATE INDEX IF NOT EXISTS idx_historico_acoes_tipo_acao ON historico_acoes(tipo_acao);
CREATE INDEX IF NOT EXISTS idx_historico_acoes_created_at ON historico_acoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_historico_acoes_usuario_id ON historico_acoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historico_acoes_metadata_gin ON historico_acoes USING GIN (metadata);

-- Comentários descritivos
COMMENT ON TABLE historico_acoes IS 'Tabela IMUTÁVEL para registro de auditoria completa de todas as ações em candidaturas. INSERT only, NO UPDATE/DELETE. Garante compliance e rastreabilidade total.';
COMMENT ON COLUMN historico_acoes.id IS 'Identificador único da ação histórica (UUID)';
COMMENT ON COLUMN historico_acoes.candidatura_id IS 'Referência à candidatura onde a ação ocorreu';
COMMENT ON COLUMN historico_acoes.tipo_acao IS 'Tipo da ação realizada (22 valores: candidatura, testes, entrevistas, avaliações, decisão)';
COMMENT ON COLUMN historico_acoes.descricao IS 'Descrição textual da ação em linguagem natural. Ex: "Entrevista online agendada para 2025-11-05 às 14:00"';
COMMENT ON COLUMN historico_acoes.metadata IS 'Metadados adicionais em formato JSONB. Ex: {"entrevista_id": "uuid", "plataforma": "google_meet", "link": "https://meet.google.com/xyz"}';
COMMENT ON COLUMN historico_acoes.created_at IS 'Data/hora exata em que a ação ocorreu (IMUTÁVEL)';
COMMENT ON COLUMN historico_acoes.usuario_id IS 'Usuário RH que executou a ação (NULL para ações automáticas do sistema)';


-- ============================================================================
-- 2. FUNCTION: Prevenir UPDATE e DELETE em historico_acoes
-- Description: Garante imutabilidade da tabela de auditoria
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_historico_acoes_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'Operação não permitida: historico_acoes é uma tabela IMUTÁVEL (INSERT only). Não é possível UPDATE ou DELETE.'
        USING HINT = 'Esta tabela é de auditoria e deve manter registro completo e inalterável de todas as ações.';
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION prevent_historico_acoes_modification IS 'Trigger function que previne UPDATE e DELETE em historico_acoes, garantindo imutabilidade para compliance.';

-- Triggers para prevenir modificações
DROP TRIGGER IF EXISTS prevent_update_historico_acoes ON historico_acoes;
DROP TRIGGER IF EXISTS prevent_delete_historico_acoes ON historico_acoes;

CREATE TRIGGER prevent_update_historico_acoes
    BEFORE UPDATE ON historico_acoes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_historico_acoes_modification();

CREATE TRIGGER prevent_delete_historico_acoes
    BEFORE DELETE ON historico_acoes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_historico_acoes_modification();

COMMENT ON TRIGGER prevent_update_historico_acoes ON historico_acoes IS 'Trigger que bloqueia UPDATE na tabela imutável de histórico';
COMMENT ON TRIGGER prevent_delete_historico_acoes ON historico_acoes IS 'Trigger que bloqueia DELETE na tabela imutável de histórico';


-- ============================================================================
-- 3. FUNCTION: Helper para registrar ação no histórico
-- Description: Facilita inserção de ações no histórico com validação
-- ============================================================================

CREATE OR REPLACE FUNCTION registrar_acao_historico(
    p_candidatura_id UUID,
    p_tipo_acao tipo_acao_historico,
    p_descricao TEXT,
    p_metadata JSONB DEFAULT NULL,
    p_usuario_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_historico_id UUID;
BEGIN
    -- Valida se candidatura existe
    IF NOT EXISTS (SELECT 1 FROM candidaturas WHERE id = p_candidatura_id) THEN
        RAISE EXCEPTION 'Candidatura % não encontrada', p_candidatura_id;
    END IF;

    -- Insere registro no histórico
    INSERT INTO historico_acoes (
        candidatura_id,
        tipo_acao,
        descricao,
        metadata,
        usuario_id
    ) VALUES (
        p_candidatura_id,
        p_tipo_acao,
        p_descricao,
        p_metadata,
        p_usuario_id
    )
    RETURNING id INTO v_historico_id;

    RETURN v_historico_id;
END;
$$;

COMMENT ON FUNCTION registrar_acao_historico IS 'Helper function para facilitar inserção de ações no histórico com validação de candidatura. Retorna UUID do registro criado.';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 31-tabela-historico-acoes.sql executada com sucesso';
    RAISE NOTICE 'Tabela criada:';
    RAISE NOTICE '  - historico_acoes (6 campos: tipo_acao, descricao, metadata JSONB, auditoria)';
    RAISE NOTICE '  - IMUTÁVEL: INSERT only, UPDATE/DELETE bloqueados via triggers';
    RAISE NOTICE '  - 5 índices: candidatura_id, tipo_acao, created_at DESC, usuario_id, metadata (GIN)';
    RAISE NOTICE '  - 2 triggers: prevent_update, prevent_delete';
    RAISE NOTICE '  - 1 helper function: registrar_acao_historico()';
    RAISE NOTICE 'Compliance: Auditoria completa garantida para todas as ações em candidaturas';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
