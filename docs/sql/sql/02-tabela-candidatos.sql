-- ==============================================
-- 02 - Tabela: candidatos
-- PRD-DB-001: Estrutura de Autenticação e Usuários
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- CRIAR TABELA CANDIDATOS
-- ==============================================

CREATE TABLE IF NOT EXISTS candidatos (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Dados Pessoais
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    celular VARCHAR(15) NOT NULL,
    data_nascimento DATE NOT NULL,
    genero VARCHAR(50),

    -- Endereço
    cep VARCHAR(9),
    logradouro VARCHAR(255),
    numero VARCHAR(10),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,

    -- Redes Sociais
    linkedin_url VARCHAR(255),
    instagram_url VARCHAR(255),

    -- Marketing/Origem
    como_conheceu VARCHAR(50),
    como_conheceu_detalhes TEXT,

    -- Avatar
    avatar_url VARCHAR(500),

    -- Controle de Status
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
    bloqueado_motivo TEXT,
    data_ultimo_acesso TIMESTAMPTZ,

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
ALTER TABLE candidatos
ADD CONSTRAINT candidatos_email_check
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Validar formato de CPF (XXX.XXX.XXX-XX)
ALTER TABLE candidatos
ADD CONSTRAINT candidatos_cpf_check
CHECK (cpf ~* '^\d{3}\.\d{3}\.\d{3}-\d{2}$');

-- Validar formato de celular ((XX) XXXXX-XXXX)
ALTER TABLE candidatos
ADD CONSTRAINT candidatos_celular_check
CHECK (celular ~* '^\(\d{2}\) \d{5}-\d{4}$');

-- Validar data de nascimento (deve ser no passado)
ALTER TABLE candidatos
ADD CONSTRAINT candidatos_data_nascimento_check
CHECK (data_nascimento < CURRENT_DATE);

-- Validar gênero
ALTER TABLE candidatos
ADD CONSTRAINT candidatos_genero_check
CHECK (genero IN ('masculino', 'feminino', 'outro', 'prefiro_nao_informar'));

-- Validar estado (UF brasileiras)
ALTER TABLE candidatos
ADD CONSTRAINT candidatos_estado_check
CHECK (estado IN (
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
));

-- Validar como_conheceu
ALTER TABLE candidatos
ADD CONSTRAINT candidatos_como_conheceu_check
CHECK (como_conheceu IN (
    'linkedin', 'instagram', 'indicacao', 'site',
    'google', 'facebook', 'outro'
));

-- ==============================================
-- ÍNDICES
-- ==============================================

-- Índice para busca por email (único)
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidatos_email ON candidatos(email);

-- Índice para busca por CPF (único)
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidatos_cpf ON candidatos(cpf);

-- Índice para relacionamento com auth.users
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidatos_user_id ON candidatos(user_id);

-- Índice para filtro de candidatos ativos
CREATE INDEX IF NOT EXISTS idx_candidatos_ativo ON candidatos(ativo) WHERE ativo = TRUE;

-- Índice composto para busca por localização
CREATE INDEX IF NOT EXISTS idx_candidatos_cidade_estado ON candidatos(cidade, estado);

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger para atualizar automaticamente updated_at
CREATE TRIGGER update_candidatos_updated_at
    BEFORE UPDATE ON candidatos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Habilitar RLS
ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;

-- Policy 1: Candidatos podem ler seus próprios dados
CREATE POLICY candidatos_read_own
    ON candidatos FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Candidatos podem atualizar seus próprios dados
CREATE POLICY candidatos_update_own
    ON candidatos FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: RH pode ler todos os candidatos
CREATE POLICY candidatos_rh_read_all
    ON candidatos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE usuarios_rh.user_id = auth.uid()
            AND usuarios_rh.ativo = TRUE
            AND usuarios_rh.deleted_at IS NULL
        )
    );

-- Policy 4: Sistema pode criar novos candidatos (via signup)
CREATE POLICY candidatos_system_insert
    ON candidatos FOR INSERT
    WITH CHECK (TRUE);

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON TABLE candidatos IS 'Tabela de candidatos do sistema de recrutamento';
COMMENT ON COLUMN candidatos.id IS 'Identificador único do candidato';
COMMENT ON COLUMN candidatos.user_id IS 'Referência ao usuário no Supabase Auth';
COMMENT ON COLUMN candidatos.cpf IS 'CPF no formato XXX.XXX.XXX-XX';
COMMENT ON COLUMN candidatos.celular IS 'Celular no formato (XX) XXXXX-XXXX';
COMMENT ON COLUMN candidatos.ativo IS 'Indica se o candidato está ativo no sistema';
COMMENT ON COLUMN candidatos.bloqueado IS 'Indica se o candidato foi bloqueado';
COMMENT ON COLUMN candidatos.deleted_at IS 'Soft delete - data de exclusão lógica';

-- ==============================================
-- FIM DO SCRIPT 02-tabela-candidatos.sql
-- ==============================================
