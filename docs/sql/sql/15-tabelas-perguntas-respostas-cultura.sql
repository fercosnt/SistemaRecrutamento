-- ==============================================
-- 15 - Tabelas Perguntas e Respostas de Cultura
-- PRD-DB-002: Estrutura de Vagas e Candidaturas
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- TABELA: perguntas_cultura
-- ==============================================
-- Armazena perguntas de fit cultural específicas por vaga
-- Máximo 7 perguntas por vaga
-- Respostas abertas para análise IA

CREATE TABLE perguntas_cultura (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vaga_id UUID NOT NULL REFERENCES vagas(id) ON DELETE CASCADE,

    -- Organização
    ordem INTEGER NOT NULL,

    -- Conteúdo
    texto_pergunta TEXT NOT NULL,
    texto_ajuda TEXT,

    -- Validações
    obrigatoria BOOLEAN NOT NULL DEFAULT TRUE,
    limite_caracteres INTEGER DEFAULT 1000,

    -- Campos de Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- ==============================================
    -- CONSTRAINTS
    -- ==============================================

    -- Ordem deve estar entre 1 e 7 (máximo 7 perguntas de cultura)
    CONSTRAINT ordem_cultura_check CHECK (ordem >= 1 AND ordem <= 7)
);

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON TABLE perguntas_cultura IS
'Perguntas de fit cultural específicas por vaga. Máximo 7 perguntas por vaga. Respostas são textos longos (até 1000 caracteres) analisados por IA para avaliar alinhamento cultural.';

COMMENT ON COLUMN perguntas_cultura.id IS 'Identificador único da pergunta de cultura (UUID v4)';
COMMENT ON COLUMN perguntas_cultura.vaga_id IS 'FK para vagas.id. Define a qual vaga esta pergunta pertence.';
COMMENT ON COLUMN perguntas_cultura.ordem IS 'Ordem de exibição (1 a 7). Máximo 7 perguntas de cultura por vaga.';
COMMENT ON COLUMN perguntas_cultura.texto_pergunta IS 'Pergunta sobre fit cultural. Ex: "Como você lida com feedback negativo?"';
COMMENT ON COLUMN perguntas_cultura.texto_ajuda IS 'Instrução adicional ou exemplo de resposta esperada (opcional)';
COMMENT ON COLUMN perguntas_cultura.limite_caracteres IS 'Limite de caracteres para a resposta. Default: 1000 caracteres.';

-- ==============================================
-- ÍNDICES
-- ==============================================

-- Index para buscar perguntas de cultura de uma vaga
CREATE INDEX idx_perguntas_cultura_vaga_id ON perguntas_cultura(vaga_id)
WHERE deleted_at IS NULL;

-- Index composto para listar perguntas ordenadas
CREATE INDEX idx_perguntas_cultura_vaga_ordem ON perguntas_cultura(vaga_id, ordem)
WHERE deleted_at IS NULL;

-- Index para soft delete
CREATE INDEX idx_perguntas_cultura_deleted_at ON perguntas_cultura(deleted_at);

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger para atualizar automaticamente updated_at
CREATE TRIGGER update_perguntas_cultura_updated_at
    BEFORE UPDATE ON perguntas_cultura
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_perguntas_cultura_updated_at ON perguntas_cultura IS
'Atualiza automaticamente o campo updated_at sempre que a pergunta é modificada.';

-- ==============================================
-- TABELA: respostas_cultura
-- ==============================================
-- Armazena respostas dos candidatos às perguntas de cultura
-- Registra tempo de resposta para analytics

CREATE TABLE respostas_cultura (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidatura_id UUID NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
    pergunta_id UUID NOT NULL REFERENCES perguntas_cultura(id) ON DELETE CASCADE,

    -- Resposta
    resposta_texto TEXT NOT NULL,

    -- Analytics
    tempo_resposta_segundos INTEGER,

    -- Campos de Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ==============================================
    -- CONSTRAINTS
    -- ==============================================

    -- Candidato não pode responder 2x a mesma pergunta
    CONSTRAINT unique_candidatura_pergunta_cultura UNIQUE (candidatura_id, pergunta_id)
);

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON TABLE respostas_cultura IS
'Respostas dos candidatos às perguntas de fit cultural. Todas as respostas são textos longos (até 1000 caracteres) que serão analisados por IA para avaliar alinhamento com valores da empresa.';

COMMENT ON COLUMN respostas_cultura.id IS 'Identificador único da resposta (UUID v4)';
COMMENT ON COLUMN respostas_cultura.candidatura_id IS 'FK para candidaturas.id. Define a qual candidatura esta resposta pertence.';
COMMENT ON COLUMN respostas_cultura.pergunta_id IS 'FK para perguntas_cultura.id. Define qual pergunta está sendo respondida.';
COMMENT ON COLUMN respostas_cultura.resposta_texto IS 'Resposta em texto longo (até 1000 caracteres). Será analisada por IA.';
COMMENT ON COLUMN respostas_cultura.tempo_resposta_segundos IS 'Tempo que o candidato levou para responder (analytics). Capturado pelo frontend.';

-- ==============================================
-- ÍNDICES
-- ==============================================

-- Index para buscar respostas de uma candidatura
CREATE INDEX idx_respostas_cultura_candidatura_id ON respostas_cultura(candidatura_id);

-- Index para análise de respostas por pergunta
CREATE INDEX idx_respostas_cultura_pergunta_id ON respostas_cultura(pergunta_id);

-- Index composto para queries complexas
CREATE INDEX idx_respostas_cultura_candidatura_pergunta ON respostas_cultura(candidatura_id, pergunta_id);

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger para atualizar automaticamente updated_at
CREATE TRIGGER update_respostas_cultura_updated_at
    BEFORE UPDATE ON respostas_cultura
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_respostas_cultura_updated_at ON respostas_cultura IS
'Atualiza automaticamente o campo updated_at sempre que a resposta é modificada.';

-- ==============================================
-- VALIDAÇÃO
-- ==============================================

-- Verificar se tabelas foram criadas corretamente
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name IN ('perguntas_cultura', 'respostas_cultura')
     AND table_schema = 'public') AS total_columns
FROM information_schema.tables
WHERE table_name IN ('perguntas_cultura', 'respostas_cultura')
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
AND tc.table_name IN ('perguntas_cultura', 'respostas_cultura')
ORDER BY tc.table_name, tc.constraint_name;

-- Verificar constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc
WHERE tc.table_name IN ('perguntas_cultura', 'respostas_cultura')
AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- Verificar índices
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('perguntas_cultura', 'respostas_cultura')
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Verificar triggers
SELECT
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table IN ('perguntas_cultura', 'respostas_cultura')
ORDER BY event_object_table, trigger_name;

-- ==============================================
-- FIM DO SCRIPT 15-tabelas-perguntas-respostas-cultura.sql
-- ==============================================
