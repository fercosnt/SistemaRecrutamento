-- ==============================================
-- 14 - Tabelas Perguntas e Respostas do Formulário
-- PRD-DB-002: Estrutura de Vagas e Candidaturas
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- TABELA: perguntas_formulario
-- ==============================================
-- Armazena perguntas customizadas do formulário de triagem
-- Cada vaga pode ter perguntas específicas
-- Organizado em 4 blocos: jornada, tecnologia, valores, curriculo

CREATE TABLE perguntas_formulario (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vaga_id UUID NOT NULL REFERENCES vagas(id) ON DELETE CASCADE,

    -- Organização
    bloco TEXT NOT NULL,
    ordem INTEGER NOT NULL,

    -- Conteúdo
    texto_pergunta TEXT NOT NULL,
    texto_ajuda TEXT,
    tipo_resposta tipo_resposta_pergunta NOT NULL,

    -- Opções para Múltipla Escolha
    opcoes_resposta JSONB,
    permite_outros BOOLEAN NOT NULL DEFAULT FALSE,

    -- Validações
    obrigatoria BOOLEAN NOT NULL DEFAULT TRUE,
    limite_caracteres INTEGER,
    valor_minimo DECIMAL,
    valor_maximo DECIMAL,

    -- Campos de Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- ==============================================
    -- CONSTRAINTS
    -- ==============================================

    -- Bloco deve ser um dos 4 valores permitidos
    CONSTRAINT bloco_valido_check CHECK (
        bloco IN ('jornada', 'tecnologia', 'valores', 'curriculo')
    ),

    -- Ordem deve ser >= 1
    CONSTRAINT ordem_positiva_check CHECK (ordem >= 1),

    -- Se tipo_resposta é choice, opcoes_resposta deve estar preenchido
    CONSTRAINT opcoes_obrigatorias_check CHECK (
        (tipo_resposta NOT IN ('single_choice', 'multiple_choice')) OR
        (opcoes_resposta IS NOT NULL AND jsonb_array_length(opcoes_resposta) > 0)
    )
);

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON TABLE perguntas_formulario IS
'Perguntas customizadas do formulário de triagem. Cada vaga pode ter perguntas específicas organizadas em 4 blocos: jornada (trajetória profissional), tecnologia (skills técnicas), valores (fit cultural básico), curriculo (informações complementares).';

COMMENT ON COLUMN perguntas_formulario.id IS 'Identificador único da pergunta (UUID v4)';
COMMENT ON COLUMN perguntas_formulario.vaga_id IS 'FK para vagas.id. Define a qual vaga esta pergunta pertence.';
COMMENT ON COLUMN perguntas_formulario.bloco IS 'Bloco/seção da pergunta: jornada, tecnologia, valores, curriculo';
COMMENT ON COLUMN perguntas_formulario.ordem IS 'Ordem de exibição da pergunta dentro do bloco (1, 2, 3...)';
COMMENT ON COLUMN perguntas_formulario.tipo_resposta IS 'Tipo de campo de entrada: texto_curto, texto_longo, single_choice, multiple_choice, numerico';
COMMENT ON COLUMN perguntas_formulario.opcoes_resposta IS 'Array JSON com opções de resposta. Ex: ["Opção 1", "Opção 2", "Outros"]. Obrigatório para single/multiple_choice.';
COMMENT ON COLUMN perguntas_formulario.permite_outros IS 'Se TRUE, adiciona campo "Outros: ___" além das opções pré-definidas';
COMMENT ON COLUMN perguntas_formulario.obrigatoria IS 'Se TRUE, candidato não pode enviar formulário sem responder';
COMMENT ON COLUMN perguntas_formulario.limite_caracteres IS 'Limite de caracteres para respostas de texto';

-- ==============================================
-- ÍNDICES
-- ==============================================

-- Index para buscar perguntas de uma vaga
CREATE INDEX idx_perguntas_formulario_vaga_id ON perguntas_formulario(vaga_id)
WHERE deleted_at IS NULL;

-- Index composto para listar perguntas ordenadas por bloco e ordem
CREATE INDEX idx_perguntas_formulario_vaga_bloco_ordem ON perguntas_formulario(vaga_id, bloco, ordem)
WHERE deleted_at IS NULL;

-- Index para soft delete
CREATE INDEX idx_perguntas_formulario_deleted_at ON perguntas_formulario(deleted_at);

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger para atualizar automaticamente updated_at
CREATE TRIGGER update_perguntas_formulario_updated_at
    BEFORE UPDATE ON perguntas_formulario
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_perguntas_formulario_updated_at ON perguntas_formulario IS
'Atualiza automaticamente o campo updated_at sempre que a pergunta é modificada.';

-- ==============================================
-- TABELA: respostas_formulario
-- ==============================================
-- Armazena respostas dos candidatos às perguntas do formulário
-- Suporta diferentes tipos de resposta (texto, escolha, numérico)

CREATE TABLE respostas_formulario (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidatura_id UUID NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
    pergunta_id UUID NOT NULL REFERENCES perguntas_formulario(id) ON DELETE CASCADE,

    -- Resposta (apenas um campo será preenchido conforme tipo_resposta)
    resposta_texto TEXT,
    resposta_opcoes JSONB,
    resposta_numerica DECIMAL,

    -- Campos de Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ==============================================
    -- CONSTRAINTS
    -- ==============================================

    -- Candidato não pode responder 2x a mesma pergunta
    CONSTRAINT unique_candidatura_pergunta UNIQUE (candidatura_id, pergunta_id),

    -- Pelo menos um campo de resposta deve estar preenchido
    CONSTRAINT resposta_preenchida_check CHECK (
        resposta_texto IS NOT NULL OR
        resposta_opcoes IS NOT NULL OR
        resposta_numerica IS NOT NULL
    )
);

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON TABLE respostas_formulario IS
'Respostas dos candidatos às perguntas do formulário de triagem. Suporta diferentes tipos de resposta: texto (curto/longo), opções (single/multiple choice), numérico. Apenas um dos campos resposta_* é preenchido conforme o tipo_resposta da pergunta.';

COMMENT ON COLUMN respostas_formulario.id IS 'Identificador único da resposta (UUID v4)';
COMMENT ON COLUMN respostas_formulario.candidatura_id IS 'FK para candidaturas.id. Define a qual candidatura esta resposta pertence.';
COMMENT ON COLUMN respostas_formulario.pergunta_id IS 'FK para perguntas_formulario.id. Define qual pergunta está sendo respondida.';
COMMENT ON COLUMN respostas_formulario.resposta_texto IS 'Resposta em texto. Usado para tipo_resposta: texto_curto, texto_longo, ou campo "Outros".';
COMMENT ON COLUMN respostas_formulario.resposta_opcoes IS 'Array JSON com opções selecionadas. Ex: ["Opção 1", "Opção 3"]. Usado para tipo_resposta: single_choice, multiple_choice.';
COMMENT ON COLUMN respostas_formulario.resposta_numerica IS 'Valor numérico. Usado para tipo_resposta: numerico.';

-- ==============================================
-- ÍNDICES
-- ==============================================

-- Index para buscar respostas de uma candidatura
CREATE INDEX idx_respostas_formulario_candidatura_id ON respostas_formulario(candidatura_id);

-- Index para análise de respostas por pergunta
CREATE INDEX idx_respostas_formulario_pergunta_id ON respostas_formulario(pergunta_id);

-- Index composto para queries complexas
CREATE INDEX idx_respostas_formulario_candidatura_pergunta ON respostas_formulario(candidatura_id, pergunta_id);

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger para atualizar automaticamente updated_at
CREATE TRIGGER update_respostas_formulario_updated_at
    BEFORE UPDATE ON respostas_formulario
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_respostas_formulario_updated_at ON respostas_formulario IS
'Atualiza automaticamente o campo updated_at sempre que a resposta é modificada.';

-- ==============================================
-- VALIDAÇÃO
-- ==============================================

-- Verificar se tabelas foram criadas corretamente
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name IN ('perguntas_formulario', 'respostas_formulario') AND table_schema = 'public') AS total_columns
FROM information_schema.tables
WHERE table_name IN ('perguntas_formulario', 'respostas_formulario')
AND table_schema = 'public'
ORDER BY table_name;

-- Verificar foreign keys
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('perguntas_formulario', 'respostas_formulario')
ORDER BY tc.table_name, tc.constraint_name;

-- Verificar índices
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('perguntas_formulario', 'respostas_formulario')
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- ==============================================
-- FIM DO SCRIPT 14-tabelas-perguntas-respostas-formulario.sql
-- ==============================================
