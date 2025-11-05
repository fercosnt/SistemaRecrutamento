-- ==============================================
-- 12 - Criar Tabela Vagas
-- PRD-DB-002: Estrutura de Vagas e Candidaturas
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- TABELA: vagas
-- ==============================================
-- Armazena todas as vagas de emprego da empresa
-- Inclui informações completas para landing page pública
-- Suporta múltiplas vagas abertas simultaneamente

CREATE TABLE vagas (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,

    -- Informações Básicas
    titulo TEXT NOT NULL,
    subtitulo TEXT,
    descricao_curta TEXT,
    departamento TEXT,
    tipo_contrato TEXT,
    modelo_trabalho TEXT,
    nivel_senioridade TEXT,

    -- Localização
    cidade TEXT,
    estado CHAR(2),
    endereco_completo TEXT,

    -- Remuneração
    faixa_salarial_min DECIMAL(10,2),
    faixa_salarial_max DECIMAL(10,2),
    exibir_salario BOOLEAN DEFAULT FALSE,

    -- Status e Controle
    status status_vaga NOT NULL DEFAULT 'rascunho',
    data_abertura DATE,
    data_fechamento DATE,
    total_vagas INTEGER DEFAULT 1,

    -- Landing Page Pública (Editável pelo RH)
    sobre_empresa TEXT,
    sobre_cargo TEXT,
    responsabilidades TEXT,
    requisitos_formacao TEXT,
    requisitos_experiencia TEXT,
    requisitos_tecnicos TEXT,
    requisitos_habilidades TEXT,
    perfil_ideal TEXT,
    diferenciais TEXT,
    beneficios TEXT,
    jornada_trabalho TEXT,

    -- Prompt para Análise IA (N8N)
    prompt_ia_descricao TEXT,

    -- Campos de Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- ==============================================
    -- CONSTRAINTS
    -- ==============================================

    -- Slug deve conter apenas letras minúsculas, números e hífens
    CONSTRAINT slug_format_check CHECK (
        slug ~ '^[a-z0-9-]+$'
    ),

    -- Faixa salarial: máximo deve ser >= mínimo
    CONSTRAINT faixa_salarial_check CHECK (
        (faixa_salarial_min IS NULL AND faixa_salarial_max IS NULL) OR
        (faixa_salarial_max >= faixa_salarial_min)
    ),

    -- Data de fechamento deve ser posterior à abertura
    CONSTRAINT datas_vaga_check CHECK (
        (data_abertura IS NULL OR data_fechamento IS NULL) OR
        (data_fechamento > data_abertura)
    ),

    -- Se exibir_salario = TRUE, faixa salarial deve estar preenchida
    CONSTRAINT salario_exibicao_check CHECK (
        (exibir_salario = FALSE) OR
        (exibir_salario = TRUE AND faixa_salarial_min IS NOT NULL AND faixa_salarial_max IS NOT NULL)
    ),

    -- Estado deve ser UF válida brasileira (se preenchido)
    CONSTRAINT estado_brasil_check CHECK (
        estado IS NULL OR
        estado IN (
            'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
            'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
            'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
        )
    )
);

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON TABLE vagas IS
'Armazena vagas de emprego da empresa. Cada vaga possui slug único para landing page pública, campos editáveis para apresentação e controle de status (rascunho, ativa, inativa, arquivada).';

COMMENT ON COLUMN vagas.id IS 'Identificador único da vaga (UUID v4)';
COMMENT ON COLUMN vagas.slug IS 'URL amigável para landing page (ex: "assistente-odontologico"). Deve ser único e conter apenas letras minúsculas, números e hífens.';
COMMENT ON COLUMN vagas.titulo IS 'Título da vaga exibido na landing page e listagens';
COMMENT ON COLUMN vagas.subtitulo IS 'Subtítulo opcional para complementar o título';
COMMENT ON COLUMN vagas.descricao_curta IS 'Descrição resumida exibida em cards de listagem (até ~200 caracteres)';
COMMENT ON COLUMN vagas.status IS 'Status da vaga: rascunho (não visível), ativa (aceita candidaturas), inativa (fechada), arquivada (histórico)';
COMMENT ON COLUMN vagas.exibir_salario IS 'Se TRUE, exibe faixa salarial na landing page pública. Requer faixa_salarial_min e max preenchidos.';
COMMENT ON COLUMN vagas.prompt_ia_descricao IS 'Descrição da vaga formatada para análise IA via N8N. Usado como contexto nas análises de candidaturas.';
COMMENT ON COLUMN vagas.deleted_at IS 'Soft delete: se preenchido, vaga foi deletada logicamente. Filtrar com WHERE deleted_at IS NULL.';

-- ==============================================
-- ÍNDICES
-- ==============================================

-- Index para busca por slug (landing pages públicas)
CREATE INDEX idx_vagas_slug ON vagas(slug) WHERE deleted_at IS NULL;

-- Index para filtrar vagas ativas
CREATE INDEX idx_vagas_status ON vagas(status) WHERE deleted_at IS NULL;

-- Index para soft delete
CREATE INDEX idx_vagas_deleted_at ON vagas(deleted_at);

-- Index para filtrar por departamento
CREATE INDEX idx_vagas_departamento ON vagas(departamento) WHERE deleted_at IS NULL;

-- Index para filtrar por localização
CREATE INDEX idx_vagas_estado_cidade ON vagas(estado, cidade) WHERE deleted_at IS NULL;

-- Full-text search em português (busca por texto)
CREATE INDEX idx_vagas_titulo_fts ON vagas USING GIN (
    to_tsvector('portuguese', titulo)
);

CREATE INDEX idx_vagas_descricao_fts ON vagas USING GIN (
    to_tsvector('portuguese', COALESCE(descricao_curta, ''))
);

-- Index composto para filtros combinados (status + departamento)
CREATE INDEX idx_vagas_status_departamento ON vagas(status, departamento)
WHERE deleted_at IS NULL;

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger para atualizar automaticamente updated_at
-- Usa função update_updated_at_column() criada no PRD-DB-001
CREATE TRIGGER update_vagas_updated_at
    BEFORE UPDATE ON vagas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_vagas_updated_at ON vagas IS
'Atualiza automaticamente o campo updated_at sempre que a vaga é modificada. Usa função do PRD-DB-001.';

-- ==============================================
-- VALIDAÇÃO
-- ==============================================

-- Verificar se tabela foi criada corretamente
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vagas' AND table_schema = 'public') AS total_columns,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = 'vagas' AND table_schema = 'public') AS total_constraints
FROM information_schema.tables
WHERE table_name = 'vagas' AND table_schema = 'public';

-- Verificar constraints
SELECT
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'vagas' AND table_schema = 'public'
ORDER BY constraint_type, constraint_name;

-- Verificar índices
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'vagas' AND schemaname = 'public'
ORDER BY indexname;

-- Verificar trigger
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'vagas'
ORDER BY trigger_name;

-- ==============================================
-- FIM DO SCRIPT 12-criar-tabela-vagas.sql
-- ==============================================
