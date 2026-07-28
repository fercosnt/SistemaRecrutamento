-- ==============================================
-- 17 - Row Level Security (RLS) - Vagas e Candidaturas
-- PRD-DB-002: Estrutura de Vagas e Candidaturas
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- RLS: vagas
-- ==============================================

-- Habilitar RLS na tabela
ALTER TABLE vagas ENABLE ROW LEVEL SECURITY;

-- Policy 1: Público (anônimo e autenticado) vê vagas ativas
CREATE POLICY "Público vê vagas ativas"
    ON vagas FOR SELECT
    TO anon, authenticated
    USING (
        status = 'ativa' AND
        deleted_at IS NULL
    );

-- Policy 2: RH vê todas as vagas (incluindo rascunhos, inativas, arquivadas)
CREATE POLICY "RH vê todas vagas"
    ON vagas FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- Policy 3: Admin/Gerente podem criar vagas
CREATE POLICY "Admin e Gerente criam vagas"
    ON vagas FOR INSERT
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

-- Policy 4: Admin/Gerente podem editar vagas
CREATE POLICY "Admin e Gerente editam vagas"
    ON vagas FOR UPDATE
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

-- Policy 5: Apenas Admin pode deletar vagas (soft delete)
CREATE POLICY "Admin deleta vagas"
    ON vagas FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND role = 'administrador'
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    )
    WITH CHECK (deleted_at IS NOT NULL);

-- ==============================================
-- RLS: candidaturas
-- ==============================================

-- Habilitar RLS na tabela
ALTER TABLE candidaturas ENABLE ROW LEVEL SECURITY;

-- Policy 1: Candidato vê suas próprias candidaturas
CREATE POLICY "Candidato vê próprias candidaturas"
    ON candidaturas FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM candidatos
            WHERE id = candidaturas.candidato_id
            AND user_id = (SELECT auth.uid())
            AND deleted_at IS NULL
        )
    );

-- Policy 2: RH vê candidaturas de vagas que tem acesso
CREATE POLICY "RH vê candidaturas de suas vagas"
    ON candidaturas FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
        AND is_rascunho = FALSE
    );

-- Policy 3: Candidato pode criar candidatura para si mesmo
CREATE POLICY "Candidato cria candidatura"
    ON candidaturas FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM candidatos
            WHERE id = candidato_id
            AND user_id = (SELECT auth.uid())
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- Policy 4: Candidato pode atualizar apenas rascunhos próprios
CREATE POLICY "Candidato atualiza rascunhos"
    ON candidaturas FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM candidatos
            WHERE id = candidaturas.candidato_id
            AND user_id = (SELECT auth.uid())
            AND deleted_at IS NULL
        )
        AND is_rascunho = TRUE
    );

-- Policy 5: RH pode atualizar candidaturas
CREATE POLICY "RH atualiza candidaturas"
    ON candidaturas FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- ==============================================
-- RLS: perguntas_formulario
-- ==============================================

-- Habilitar RLS na tabela
ALTER TABLE perguntas_formulario ENABLE ROW LEVEL SECURITY;

-- Policy 1: Público vê perguntas de vagas ativas
CREATE POLICY "Público vê perguntas de vagas ativas"
    ON perguntas_formulario FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vagas
            WHERE id = perguntas_formulario.vaga_id
            AND status = 'ativa'
            AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

-- Policy 2: RH vê todas perguntas
CREATE POLICY "RH vê todas perguntas"
    ON perguntas_formulario FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- Policy 3: Admin/Gerente podem criar perguntas
CREATE POLICY "Admin e Gerente criam perguntas"
    ON perguntas_formulario FOR INSERT
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

-- Policy 4: Admin/Gerente podem editar perguntas
CREATE POLICY "Admin e Gerente editam perguntas"
    ON perguntas_formulario FOR UPDATE
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
-- RLS: respostas_formulario
-- ==============================================

-- Habilitar RLS na tabela
ALTER TABLE respostas_formulario ENABLE ROW LEVEL SECURITY;

-- Policy 1: Candidato vê apenas suas próprias respostas
CREATE POLICY "Candidato vê próprias respostas"
    ON respostas_formulario FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM candidaturas c
            JOIN candidatos ca ON ca.id = c.candidato_id
            WHERE c.id = respostas_formulario.candidatura_id
            AND ca.user_id = (SELECT auth.uid())
            AND ca.deleted_at IS NULL
        )
    );

-- Policy 2: RH vê respostas de candidaturas que tem acesso
CREATE POLICY "RH vê respostas"
    ON respostas_formulario FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- Policy 3: Candidato pode criar respostas para suas candidaturas
CREATE POLICY "Candidato cria respostas"
    ON respostas_formulario FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM candidaturas c
            JOIN candidatos ca ON ca.id = c.candidato_id
            WHERE c.id = candidatura_id
            AND ca.user_id = (SELECT auth.uid())
            AND ca.ativo = TRUE
            AND ca.deleted_at IS NULL
        )
    );

-- Policy 4: Candidato pode atualizar respostas de rascunhos
CREATE POLICY "Candidato atualiza respostas de rascunhos"
    ON respostas_formulario FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM candidaturas c
            JOIN candidatos ca ON ca.id = c.candidato_id
            WHERE c.id = respostas_formulario.candidatura_id
            AND ca.user_id = (SELECT auth.uid())
            AND c.is_rascunho = TRUE
            AND ca.deleted_at IS NULL
        )
    );

-- ==============================================
-- RLS: perguntas_cultura
-- ==============================================

-- Habilitar RLS na tabela
ALTER TABLE perguntas_cultura ENABLE ROW LEVEL SECURITY;

-- Policy 1: Público vê perguntas cultura de vagas ativas
CREATE POLICY "Público vê perguntas cultura"
    ON perguntas_cultura FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vagas
            WHERE id = perguntas_cultura.vaga_id
            AND status = 'ativa'
            AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

-- Policy 2: RH vê todas perguntas cultura
CREATE POLICY "RH vê todas perguntas cultura"
    ON perguntas_cultura FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- Policy 3: Admin/Gerente podem criar perguntas cultura
CREATE POLICY "Admin e Gerente criam perguntas cultura"
    ON perguntas_cultura FOR INSERT
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

-- Policy 4: Admin/Gerente podem editar perguntas cultura
CREATE POLICY "Admin e Gerente editam perguntas cultura"
    ON perguntas_cultura FOR UPDATE
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
-- RLS: respostas_cultura
-- ==============================================

-- Habilitar RLS na tabela
ALTER TABLE respostas_cultura ENABLE ROW LEVEL SECURITY;

-- Policy 1: Candidato vê apenas suas próprias respostas cultura
CREATE POLICY "Candidato vê próprias respostas cultura"
    ON respostas_cultura FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM candidaturas c
            JOIN candidatos ca ON ca.id = c.candidato_id
            WHERE c.id = respostas_cultura.candidatura_id
            AND ca.user_id = (SELECT auth.uid())
            AND ca.deleted_at IS NULL
        )
    );

-- Policy 2: RH vê respostas cultura
CREATE POLICY "RH vê respostas cultura"
    ON respostas_cultura FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- Policy 3: Candidato pode criar respostas cultura para suas candidaturas
CREATE POLICY "Candidato cria respostas cultura"
    ON respostas_cultura FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM candidaturas c
            JOIN candidatos ca ON ca.id = c.candidato_id
            WHERE c.id = candidatura_id
            AND ca.user_id = (SELECT auth.uid())
            AND ca.ativo = TRUE
            AND ca.deleted_at IS NULL
        )
    );

-- Policy 4: Candidato pode atualizar respostas cultura de rascunhos
CREATE POLICY "Candidato atualiza respostas cultura de rascunhos"
    ON respostas_cultura FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM candidaturas c
            JOIN candidatos ca ON ca.id = c.candidato_id
            WHERE c.id = respostas_cultura.candidatura_id
            AND ca.user_id = (SELECT auth.uid())
            AND c.is_rascunho = TRUE
            AND ca.deleted_at IS NULL
        )
    );

-- ==============================================
-- VALIDAÇÃO
-- ==============================================

-- Verificar se RLS está habilitado em todas as tabelas
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('vagas', 'candidaturas', 'perguntas_formulario', 'respostas_formulario', 'perguntas_cultura', 'respostas_cultura')
ORDER BY tablename;

-- Contar policies por tabela
SELECT
    tablename,
    COUNT(*) AS total_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('vagas', 'candidaturas', 'perguntas_formulario', 'respostas_formulario', 'perguntas_cultura', 'respostas_cultura')
GROUP BY tablename
ORDER BY tablename;

-- Listar todas as policies criadas
SELECT
    tablename,
    policyname,
    cmd AS command,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('vagas', 'candidaturas', 'perguntas_formulario', 'respostas_formulario', 'perguntas_cultura', 'respostas_cultura')
ORDER BY tablename, policyname;

-- ==============================================
-- FIM DO SCRIPT 17-rls-vagas-candidaturas.sql
-- ==============================================
