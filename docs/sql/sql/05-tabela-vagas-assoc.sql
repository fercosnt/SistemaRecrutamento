-- ==============================================
-- 05 - Tabela vagas_associadas_recrutadores
-- PRD-DB-001 & PRD-DB-002: Controle de Acesso a Vagas
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- TABELA: vagas_associadas_recrutadores
-- ==============================================
-- Associa recrutadores específicos a vagas
-- Permite controle granular de acesso: recrutadores só veem candidatos das vagas associadas
-- Admin/Gerente podem gerenciar associações

CREATE TABLE vagas_associadas_recrutadores (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_rh_id UUID NOT NULL REFERENCES usuarios_rh(id) ON DELETE CASCADE,
    vaga_id UUID NOT NULL REFERENCES vagas(id) ON DELETE CASCADE,

    -- Campos de Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- ==============================================
    -- CONSTRAINTS
    -- ==============================================

    -- Evitar duplicatas: mesmo recrutador não pode ser associado 2x à mesma vaga
    CONSTRAINT unique_usuario_vaga UNIQUE (usuario_rh_id, vaga_id)
);

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON TABLE vagas_associadas_recrutadores IS
'Associa recrutadores (usuarios_rh) a vagas específicas. Controla acesso granular: recrutadores só veem candidatos das vagas às quais estão associados. Admin e Gerente sempre têm acesso total.';

COMMENT ON COLUMN vagas_associadas_recrutadores.id IS 'Identificador único da associação (UUID v4)';
COMMENT ON COLUMN vagas_associadas_recrutadores.usuario_rh_id IS 'FK para usuarios_rh.id. Qual recrutador está sendo associado à vaga.';
COMMENT ON COLUMN vagas_associadas_recrutadores.vaga_id IS 'FK para vagas.id. Qual vaga o recrutador terá acesso.';
COMMENT ON COLUMN vagas_associadas_recrutadores.deleted_at IS 'Soft delete: se preenchido, associação foi removida logicamente.';

-- ==============================================
-- ÍNDICES
-- ==============================================

-- Index para buscar vagas de um recrutador
CREATE INDEX idx_vagas_assoc_usuario_rh_id ON vagas_associadas_recrutadores(usuario_rh_id)
WHERE deleted_at IS NULL;

-- Index para buscar recrutadores de uma vaga
CREATE INDEX idx_vagas_assoc_vaga_id ON vagas_associadas_recrutadores(vaga_id)
WHERE deleted_at IS NULL;

-- Index composto para queries de validação de acesso
CREATE INDEX idx_vagas_assoc_usuario_vaga ON vagas_associadas_recrutadores(usuario_rh_id, vaga_id)
WHERE deleted_at IS NULL;

-- Index para soft delete
CREATE INDEX idx_vagas_assoc_deleted_at ON vagas_associadas_recrutadores(deleted_at);

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger para atualizar automaticamente updated_at
-- Usa função update_updated_at_column() criada no PRD-DB-001
CREATE TRIGGER update_vagas_associadas_recrutadores_updated_at
    BEFORE UPDATE ON vagas_associadas_recrutadores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_vagas_associadas_recrutadores_updated_at ON vagas_associadas_recrutadores IS
'Atualiza automaticamente o campo updated_at sempre que a associação é modificada. Usa função do PRD-DB-001.';

-- ==============================================
-- RLS POLICIES
-- ==============================================

-- Habilitar RLS na tabela
ALTER TABLE vagas_associadas_recrutadores ENABLE ROW LEVEL SECURITY;

-- Policy 1: Recrutadores podem ver suas próprias associações
CREATE POLICY "Recrutadores veem suas associações"
    ON vagas_associadas_recrutadores FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE id = vagas_associadas_recrutadores.usuario_rh_id
            AND user_id = (SELECT auth.uid())
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

-- Policy 2: Admin/Gerente podem ver todas as associações
CREATE POLICY "Admin e Gerente veem todas associações"
    ON vagas_associadas_recrutadores FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND role IN ('administrador', 'gerente')
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- Policy 3: Admin/Gerente podem criar associações
CREATE POLICY "Admin e Gerente criam associações"
    ON vagas_associadas_recrutadores FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND role IN ('administrador', 'gerente')
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- Policy 4: Admin/Gerente podem editar associações
CREATE POLICY "Admin e Gerente editam associações"
    ON vagas_associadas_recrutadores FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND role IN ('administrador', 'gerente')
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- Policy 5: Admin/Gerente podem deletar associações (soft delete)
CREATE POLICY "Admin e Gerente deletam associações"
    ON vagas_associadas_recrutadores FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND role IN ('administrador', 'gerente')
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- ==============================================
-- VALIDAÇÃO
-- ==============================================

-- Verificar se tabela foi criada corretamente
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vagas_associadas_recrutadores' AND table_schema = 'public') AS total_columns,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = 'vagas_associadas_recrutadores' AND table_schema = 'public') AS total_constraints
FROM information_schema.tables
WHERE table_name = 'vagas_associadas_recrutadores' AND table_schema = 'public';

-- Verificar foreign keys
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'vagas_associadas_recrutadores'
ORDER BY tc.constraint_name;

-- Verificar RLS
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'vagas_associadas_recrutadores'
AND schemaname = 'public';

-- Contar policies
SELECT COUNT(*) AS total_policies
FROM pg_policies
WHERE tablename = 'vagas_associadas_recrutadores'
AND schemaname = 'public';

-- Listar policies
SELECT
    policyname,
    cmd AS command,
    roles
FROM pg_policies
WHERE tablename = 'vagas_associadas_recrutadores'
AND schemaname = 'public'
ORDER BY policyname;

-- ==============================================
-- FIM DO SCRIPT 05-tabela-vagas-assoc.sql
-- ==============================================
