-- ==============================================
-- 03 - Tabela: usuarios_rh
-- PRD-DB-001: Estrutura de Autenticação e Usuários
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- CRIAR TABELA USUARIOS_RH
-- ==============================================

CREATE TABLE IF NOT EXISTS usuarios_rh (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Dados Pessoais
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cargo VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),

    -- Controle de Acesso
    role VARCHAR(50) NOT NULL,  -- administrador, gerente, recrutador, visualizador

    -- Avatar
    avatar_url VARCHAR(500),

    -- Controle de Status
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    primeiro_acesso BOOLEAN NOT NULL DEFAULT TRUE,
    data_ultimo_login TIMESTAMPTZ,

    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- ==============================================
-- CONSTRAINTS DE VALIDAÇÃO
-- ==============================================

-- Validar formato de email
ALTER TABLE usuarios_rh
ADD CONSTRAINT usuarios_rh_email_check
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Validar role
ALTER TABLE usuarios_rh
ADD CONSTRAINT usuarios_rh_role_check
CHECK (role IN ('administrador', 'gerente', 'recrutador', 'visualizador'));

-- Validar formato de telefone (opcional - (XX) XXXX-XXXX ou (XX) XXXXX-XXXX)
ALTER TABLE usuarios_rh
ADD CONSTRAINT usuarios_rh_telefone_check
CHECK (
    telefone IS NULL OR
    telefone ~* '^\(\d{2}\) \d{4,5}-\d{4}$'
);

-- ==============================================
-- ÍNDICES
-- ==============================================

-- Índice para busca por email (único)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_rh_email ON usuarios_rh(email);

-- Índice para relacionamento com auth.users
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_rh_user_id ON usuarios_rh(user_id);

-- Índice para busca por role
CREATE INDEX IF NOT EXISTS idx_usuarios_rh_role ON usuarios_rh(role);

-- Índice para filtro de usuários ativos
CREATE INDEX IF NOT EXISTS idx_usuarios_rh_ativo ON usuarios_rh(ativo) WHERE ativo = TRUE;

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger para atualizar automaticamente updated_at
CREATE TRIGGER update_usuarios_rh_updated_at
    BEFORE UPDATE ON usuarios_rh
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para criar preferências padrão ao criar usuário RH
CREATE TRIGGER trigger_criar_preferencias_padrao
    AFTER INSERT ON usuarios_rh
    FOR EACH ROW
    EXECUTE FUNCTION criar_preferencias_padrao();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Habilitar RLS
ALTER TABLE usuarios_rh ENABLE ROW LEVEL SECURITY;

-- Policy 1: Usuários RH podem ler seus próprios dados
CREATE POLICY usuarios_rh_read_own
    ON usuarios_rh FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Usuários RH podem atualizar seus próprios dados
CREATE POLICY usuarios_rh_update_own
    ON usuarios_rh FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: Administradores podem ler todos os usuários RH
CREATE POLICY usuarios_rh_admin_read_all
    ON usuarios_rh FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE usuarios_rh.user_id = auth.uid()
            AND usuarios_rh.role = 'administrador'
            AND usuarios_rh.ativo = TRUE
            AND usuarios_rh.deleted_at IS NULL
        )
    );

-- Policy 4: Administradores podem criar novos usuários RH
CREATE POLICY usuarios_rh_admin_insert
    ON usuarios_rh FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE usuarios_rh.user_id = auth.uid()
            AND usuarios_rh.role = 'administrador'
            AND usuarios_rh.ativo = TRUE
            AND usuarios_rh.deleted_at IS NULL
        )
    );

-- Policy 5: Administradores podem atualizar outros usuários RH
CREATE POLICY usuarios_rh_admin_update_all
    ON usuarios_rh FOR UPDATE
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

COMMENT ON TABLE usuarios_rh IS 'Tabela de usuários do time de RH';
COMMENT ON COLUMN usuarios_rh.id IS 'Identificador único do usuário RH';
COMMENT ON COLUMN usuarios_rh.user_id IS 'Referência ao usuário no Supabase Auth';
COMMENT ON COLUMN usuarios_rh.role IS 'Papel do usuário: administrador, gerente, recrutador, visualizador';
COMMENT ON COLUMN usuarios_rh.ativo IS 'Indica se o usuário está ativo no sistema';
COMMENT ON COLUMN usuarios_rh.primeiro_acesso IS 'Indica se é o primeiro acesso (para forçar mudança de senha)';
COMMENT ON COLUMN usuarios_rh.deleted_at IS 'Soft delete - data de exclusão lógica';

-- ==============================================
-- FIM DO SCRIPT 03-tabela-usuarios-rh.sql
-- ==============================================
