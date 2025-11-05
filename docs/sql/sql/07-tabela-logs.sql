-- ==============================================
-- 07 - Tabela: logs_acesso
-- PRD-DB-001: Estrutura de Autenticação e Usuários
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- CRIAR TABELA LOGS_ACESSO
-- ==============================================

CREATE TABLE IF NOT EXISTS logs_acesso (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Tipo de Evento
    evento VARCHAR(50) NOT NULL,  -- login_sucesso, login_falha, logout, etc.
    email_tentativa VARCHAR(255),  -- Para casos de login_falha

    -- Informações do Dispositivo
    ip_address INET NOT NULL,
    device_info TEXT,
    device_type VARCHAR(20),  -- desktop, mobile, tablet, unknown
    browser VARCHAR(100),
    operating_system VARCHAR(100),

    -- Localização
    country VARCHAR(100),
    city VARCHAR(100),

    -- Detalhes do Erro (se aplicável)
    erro_mensagem TEXT,

    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================
-- CONSTRAINTS DE VALIDAÇÃO
-- ==============================================

-- Validar tipo de evento
ALTER TABLE logs_acesso
ADD CONSTRAINT logs_evento_check
CHECK (evento IN (
    'login_sucesso',
    'login_falha',
    'logout',
    'senha_alterada',
    'senha_resetada',
    'email_alterado',
    'conta_bloqueada',
    'conta_desbloqueada'
));

-- Validar device_type (NULL permitido)
ALTER TABLE logs_acesso
ADD CONSTRAINT logs_device_type_check
CHECK (
    device_type IS NULL OR
    device_type IN ('desktop', 'mobile', 'tablet', 'unknown')
);

-- ==============================================
-- ÍNDICES
-- ==============================================

-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs_acesso(user_id);

-- Índice para busca por tipo de evento
CREATE INDEX IF NOT EXISTS idx_logs_evento ON logs_acesso(evento);

-- Índice para busca temporal (mais recentes primeiro)
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs_acesso(created_at DESC);

-- Índice para análise de segurança (IPs suspeitos)
CREATE INDEX IF NOT EXISTS idx_logs_ip_address ON logs_acesso(ip_address);

-- Índice para rastreamento de tentativas de login por email
CREATE INDEX IF NOT EXISTS idx_logs_email_tentativa ON logs_acesso(email_tentativa)
    WHERE evento = 'login_falha';

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Habilitar RLS
ALTER TABLE logs_acesso ENABLE ROW LEVEL SECURITY;

-- Policy 1: Usuários podem ver seus próprios logs
CREATE POLICY logs_read_own
    ON logs_acesso FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Sistema pode criar novos logs
CREATE POLICY logs_system_insert
    ON logs_acesso FOR INSERT
    WITH CHECK (TRUE);

-- Policy 3: Administradores podem ver todos os logs (auditoria)
CREATE POLICY logs_admin_read_all
    ON logs_acesso FOR SELECT
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

COMMENT ON TABLE logs_acesso IS 'Tabela de auditoria de eventos de acesso e segurança';
COMMENT ON COLUMN logs_acesso.id IS 'Identificador único do log';
COMMENT ON COLUMN logs_acesso.user_id IS 'Referência ao usuário (NULL para tentativas falhadas)';
COMMENT ON COLUMN logs_acesso.evento IS 'Tipo de evento registrado';
COMMENT ON COLUMN logs_acesso.email_tentativa IS 'Email usado na tentativa de login (útil para login_falha)';
COMMENT ON COLUMN logs_acesso.ip_address IS 'Endereço IP da requisição';
COMMENT ON COLUMN logs_acesso.erro_mensagem IS 'Mensagem de erro (se aplicável)';

-- ==============================================
-- NOTAS DE IMPLEMENTAÇÃO
-- ==============================================

-- TIPOS DE EVENTOS:
-- - login_sucesso: Login realizado com sucesso
-- - login_falha: Tentativa de login fracassada
-- - logout: Usuário fez logout
-- - senha_alterada: Usuário alterou sua senha
-- - senha_resetada: Usuário solicitou reset de senha
-- - email_alterado: Usuário alterou seu email
-- - conta_bloqueada: Conta foi bloqueada
-- - conta_desbloqueada: Conta foi desbloqueada

-- RETENÇÃO DE DADOS:
-- Por padrão, logs com mais de 1 ano são removidos automaticamente
-- pela função limpar_logs_antigos() (conformidade LGPD)

-- LIMPEZA AUTOMÁTICA:
-- Execute mensalmente via cron job:
-- SELECT limpar_logs_antigos();

-- EXEMPLO DE AGENDAMENTO (requer pg_cron extension):
-- SELECT cron.schedule('limpar-logs', '0 2 1 * *', 'SELECT limpar_logs_antigos();');

-- ANÁLISE DE SEGURANÇA:
-- Para detectar tentativas de ataque (força bruta):
-- SELECT email_tentativa, COUNT(*) as tentativas,
--        MAX(created_at) as ultima_tentativa
-- FROM logs_acesso
-- WHERE evento = 'login_falha'
-- AND created_at > NOW() - INTERVAL '1 hour'
-- GROUP BY email_tentativa
-- HAVING COUNT(*) > 5
-- ORDER BY tentativas DESC;

-- ==============================================
-- FIM DO SCRIPT 07-tabela-logs.sql
-- ==============================================
