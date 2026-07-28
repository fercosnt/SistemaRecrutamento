-- ==============================================
-- 06 - Tabela: sessoes_ativas
-- PRD-DB-001: Estrutura de Autenticação e Usuários
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- CRIAR TABELA SESSOES_ATIVAS
-- ==============================================

CREATE TABLE IF NOT EXISTS sessoes_ativas (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE,

    -- Informações do Dispositivo
    device_info TEXT,
    device_type VARCHAR(20),  -- desktop, mobile, tablet, unknown
    browser VARCHAR(100),
    operating_system VARCHAR(100),

    -- Localização
    ip_address INET NOT NULL,
    country VARCHAR(100),
    city VARCHAR(100),

    -- Controle de Sessão
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    -- Revogação
    revogado BOOLEAN NOT NULL DEFAULT FALSE,
    revogado_em TIMESTAMPTZ,
    revogado_por UUID REFERENCES auth.users(id),

    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================
-- CONSTRAINTS DE VALIDAÇÃO
-- ==============================================

-- Validar device_type
ALTER TABLE sessoes_ativas
ADD CONSTRAINT sessoes_device_type_check
CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown'));

-- Validar que expires_at seja no futuro ao criar
ALTER TABLE sessoes_ativas
ADD CONSTRAINT sessoes_expires_at_check
CHECK (expires_at > created_at);

-- ==============================================
-- ÍNDICES
-- ==============================================

-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_sessoes_user_id ON sessoes_ativas(user_id);

-- Índice para busca por sessões ativas
CREATE INDEX IF NOT EXISTS idx_sessoes_ativo ON sessoes_ativas(ativo) WHERE ativo = TRUE;

-- Índice para busca por última atividade (ordenação)
CREATE INDEX IF NOT EXISTS idx_sessoes_last_activity ON sessoes_ativas(last_activity DESC);

-- Índice para análise de segurança (IPs suspeitos)
CREATE INDEX IF NOT EXISTS idx_sessoes_ip_address ON sessoes_ativas(ip_address);

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger para estender expires_at quando last_activity é atualizado
CREATE TRIGGER update_sessoes_expires_at
    BEFORE UPDATE ON sessoes_ativas
    FOR EACH ROW
    EXECUTE FUNCTION update_expires_at();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Habilitar RLS
ALTER TABLE sessoes_ativas ENABLE ROW LEVEL SECURITY;

-- Policy 1: Usuários podem ver suas próprias sessões
CREATE POLICY sessoes_read_own
    ON sessoes_ativas FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Usuários podem revogar suas próprias sessões
CREATE POLICY sessoes_revoke_own
    ON sessoes_ativas FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: Sistema pode criar novas sessões
CREATE POLICY sessoes_system_insert
    ON sessoes_ativas FOR INSERT
    WITH CHECK (TRUE);

-- Policy 4: Administradores podem ver todas as sessões (auditoria)
CREATE POLICY sessoes_admin_read_all
    ON sessoes_ativas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE usuarios_rh.user_id = auth.uid()
            AND usuarios_rh.role = 'administrador'
            AND usuarios_rh.ativo = TRUE
            AND usuarios_rh.deleted_at IS NULL
        )
    );

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON TABLE sessoes_ativas IS 'Tabela de controle de sessões ativas dos usuários';
COMMENT ON COLUMN sessoes_ativas.id IS 'Identificador único da sessão';
COMMENT ON COLUMN sessoes_ativas.user_id IS 'Referência ao usuário no Supabase Auth';
COMMENT ON COLUMN sessoes_ativas.session_token IS 'Token único da sessão';
COMMENT ON COLUMN sessoes_ativas.ip_address IS 'Endereço IP da sessão';
COMMENT ON COLUMN sessoes_ativas.last_activity IS 'Timestamp da última atividade na sessão';
COMMENT ON COLUMN sessoes_ativas.expires_at IS 'Data de expiração da sessão (automaticamente estendida)';
COMMENT ON COLUMN sessoes_ativas.ativo IS 'Indica se a sessão está ativa';
COMMENT ON COLUMN sessoes_ativas.revogado IS 'Indica se a sessão foi revogada manualmente';

-- ==============================================
-- NOTAS DE IMPLEMENTAÇÃO
-- ==============================================

-- FUNCIONAMENTO DA SESSÃO:
-- 1. Quando um usuário faz login, uma nova sessão é criada
-- 2. A cada atividade, o campo last_activity é atualizado
-- 3. O trigger update_expires_at estende automaticamente expires_at para +7 dias
-- 4. Sessões expiradas são marcadas como inativas pela função limpar_sessoes_expiradas()
-- 5. Usuários podem revogar suas próprias sessões manualmente

-- LIMPEZA AUTOMÁTICA:
-- Execute diariamente via cron job:
-- SELECT limpar_sessoes_expiradas();

-- EXEMPLO DE AGENDAMENTO (requer pg_cron extension):
-- SELECT cron.schedule('limpar-sessoes', '0 3 * * *', 'SELECT limpar_sessoes_expiradas();');

-- ==============================================
-- FIM DO SCRIPT 06-tabela-sessoes.sql
-- ==============================================
