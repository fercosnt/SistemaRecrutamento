-- ============================================================================
-- Migration: 25-rls-testes-psicometricos.sql
-- Description: Row Level Security (RLS) policies para tabelas de testes psicométricos
-- Dependencies:
--   - 20-tabelas-bigfive.sql
--   - 21-tabelas-disc.sql
--   - 22-tabelas-raven.sql
--   - PRD-DB-001 (auth schema, candidatos, usuarios_rh)
--   - PRD-DB-002 (candidaturas)
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- IMPORTANTE: Performance Optimization
-- ============================================================================
-- Todas as policies usam (SELECT auth.uid()) ao invés de auth.uid() diretamente
-- para garantir que a função seja avaliada apenas uma vez por query, melhorando
-- significativamente a performance.
-- ============================================================================


-- ============================================================================
-- 1. RLS para questoes_bigfive
-- ============================================================================

ALTER TABLE questoes_bigfive ENABLE ROW LEVEL SECURITY;

-- Policy: Autenticados veem questões Big Five ativas
CREATE POLICY "Autenticados veem questões BigFive"
    ON questoes_bigfive
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

COMMENT ON POLICY "Autenticados veem questões BigFive" ON questoes_bigfive IS 'Permite que qualquer usuário autenticado visualize questões ativas do Big Five.';


-- ============================================================================
-- 2. RLS para questoes_disc
-- ============================================================================

ALTER TABLE questoes_disc ENABLE ROW LEVEL SECURITY;

-- Policy: Autenticados veem questões DISC ativas
CREATE POLICY "Autenticados veem questões DISC"
    ON questoes_disc
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

COMMENT ON POLICY "Autenticados veem questões DISC" ON questoes_disc IS 'Permite que qualquer usuário autenticado visualize questões ativas do DISC.';


-- ============================================================================
-- 3. RLS para questoes_raven
-- ============================================================================

ALTER TABLE questoes_raven ENABLE ROW LEVEL SECURITY;

-- Policy: Autenticados veem questões Raven ativas
CREATE POLICY "Autenticados veem questões Raven"
    ON questoes_raven
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

COMMENT ON POLICY "Autenticados veem questões Raven" ON questoes_raven IS 'Permite que qualquer usuário autenticado visualize questões ativas do Raven.';


-- ============================================================================
-- 4. RLS para respostas_bigfive
-- ============================================================================

ALTER TABLE respostas_bigfive ENABLE ROW LEVEL SECURITY;

-- Policy: Candidato vê próprias respostas Big Five
CREATE POLICY "Candidato vê próprias respostas BigFive"
    ON respostas_bigfive
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM candidaturas c
            WHERE c.id = respostas_bigfive.candidatura_id
              AND c.candidato_id = (SELECT auth.uid())
        )
    );

COMMENT ON POLICY "Candidato vê próprias respostas BigFive" ON respostas_bigfive IS 'Permite que candidato visualize suas próprias respostas do Big Five via candidatura.';

-- Policy: RH vê respostas Big Five
CREATE POLICY "RH vê respostas BigFive"
    ON respostas_bigfive
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM usuarios_rh u
            WHERE u.id = (SELECT auth.uid())
              AND u.ativo = TRUE
        )
    );

COMMENT ON POLICY "RH vê respostas BigFive" ON respostas_bigfive IS 'Permite que usuários RH ativos visualizem todas as respostas do Big Five.';

-- Policy: Candidato insere respostas Big Five
CREATE POLICY "Candidato insere respostas BigFive"
    ON respostas_bigfive
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM candidaturas c
            WHERE c.id = respostas_bigfive.candidatura_id
              AND c.candidato_id = (SELECT auth.uid())
        )
    );

COMMENT ON POLICY "Candidato insere respostas BigFive" ON respostas_bigfive IS 'Permite que candidato insira respostas apenas em suas próprias candidaturas.';


-- ============================================================================
-- 5. RLS para respostas_disc
-- ============================================================================

ALTER TABLE respostas_disc ENABLE ROW LEVEL SECURITY;

-- Policy: Candidato vê próprias respostas DISC
CREATE POLICY "Candidato vê próprias respostas DISC"
    ON respostas_disc
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM candidaturas c
            WHERE c.id = respostas_disc.candidatura_id
              AND c.candidato_id = (SELECT auth.uid())
        )
    );

COMMENT ON POLICY "Candidato vê próprias respostas DISC" ON respostas_disc IS 'Permite que candidato visualize suas próprias respostas do DISC via candidatura.';

-- Policy: RH vê respostas DISC
CREATE POLICY "RH vê respostas DISC"
    ON respostas_disc
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM usuarios_rh u
            WHERE u.id = (SELECT auth.uid())
              AND u.ativo = TRUE
        )
    );

COMMENT ON POLICY "RH vê respostas DISC" ON respostas_disc IS 'Permite que usuários RH ativos visualizem todas as respostas do DISC.';

-- Policy: Candidato insere respostas DISC
CREATE POLICY "Candidato insere respostas DISC"
    ON respostas_disc
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM candidaturas c
            WHERE c.id = respostas_disc.candidatura_id
              AND c.candidato_id = (SELECT auth.uid())
        )
    );

COMMENT ON POLICY "Candidato insere respostas DISC" ON respostas_disc IS 'Permite que candidato insira respostas apenas em suas próprias candidaturas.';


-- ============================================================================
-- 6. RLS para respostas_raven
-- ============================================================================

ALTER TABLE respostas_raven ENABLE ROW LEVEL SECURITY;

-- Policy: Candidato vê próprias respostas Raven
CREATE POLICY "Candidato vê próprias respostas Raven"
    ON respostas_raven
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM candidaturas c
            WHERE c.id = respostas_raven.candidatura_id
              AND c.candidato_id = (SELECT auth.uid())
        )
    );

COMMENT ON POLICY "Candidato vê próprias respostas Raven" ON respostas_raven IS 'Permite que candidato visualize suas próprias respostas do Raven via candidatura.';

-- Policy: RH vê respostas Raven
CREATE POLICY "RH vê respostas Raven"
    ON respostas_raven
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM usuarios_rh u
            WHERE u.id = (SELECT auth.uid())
              AND u.ativo = TRUE
        )
    );

COMMENT ON POLICY "RH vê respostas Raven" ON respostas_raven IS 'Permite que usuários RH ativos visualizem todas as respostas do Raven.';

-- Policy: Candidato insere respostas Raven
CREATE POLICY "Candidato insere respostas Raven"
    ON respostas_raven
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM candidaturas c
            WHERE c.id = respostas_raven.candidatura_id
              AND c.candidato_id = (SELECT auth.uid())
        )
    );

COMMENT ON POLICY "Candidato insere respostas Raven" ON respostas_raven IS 'Permite que candidato insira respostas apenas em suas próprias candidaturas.';


-- ============================================================================
-- 7. RLS para scores_bigfive
-- ============================================================================

ALTER TABLE scores_bigfive ENABLE ROW LEVEL SECURITY;

-- Policy: Candidato vê próprios scores Big Five
CREATE POLICY "Candidato vê próprios scores BigFive"
    ON scores_bigfive
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM candidaturas c
            WHERE c.id = scores_bigfive.candidatura_id
              AND c.candidato_id = (SELECT auth.uid())
        )
    );

COMMENT ON POLICY "Candidato vê próprios scores BigFive" ON scores_bigfive IS 'Permite que candidato visualize seus próprios scores do Big Five via candidatura.';

-- Policy: RH vê scores Big Five
CREATE POLICY "RH vê scores BigFive"
    ON scores_bigfive
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM usuarios_rh u
            WHERE u.id = (SELECT auth.uid())
              AND u.ativo = TRUE
        )
    );

COMMENT ON POLICY "RH vê scores BigFive" ON scores_bigfive IS 'Permite que usuários RH ativos visualizem todos os scores do Big Five.';


-- ============================================================================
-- 8. RLS para scores_disc
-- ============================================================================

ALTER TABLE scores_disc ENABLE ROW LEVEL SECURITY;

-- Policy: Candidato vê próprios scores DISC
CREATE POLICY "Candidato vê próprios scores DISC"
    ON scores_disc
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM candidaturas c
            WHERE c.id = scores_disc.candidatura_id
              AND c.candidato_id = (SELECT auth.uid())
        )
    );

COMMENT ON POLICY "Candidato vê próprios scores DISC" ON scores_disc IS 'Permite que candidato visualize seus próprios scores do DISC via candidatura.';

-- Policy: RH vê scores DISC
CREATE POLICY "RH vê scores DISC"
    ON scores_disc
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM usuarios_rh u
            WHERE u.id = (SELECT auth.uid())
              AND u.ativo = TRUE
        )
    );

COMMENT ON POLICY "RH vê scores DISC" ON scores_disc IS 'Permite que usuários RH ativos visualizem todos os scores do DISC.';


-- ============================================================================
-- 9. RLS para scores_raven
-- ============================================================================

ALTER TABLE scores_raven ENABLE ROW LEVEL SECURITY;

-- Policy: Candidato vê próprios scores Raven
CREATE POLICY "Candidato vê próprios scores Raven"
    ON scores_raven
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM candidaturas c
            WHERE c.id = scores_raven.candidatura_id
              AND c.candidato_id = (SELECT auth.uid())
        )
    );

COMMENT ON POLICY "Candidato vê próprios scores Raven" ON scores_raven IS 'Permite que candidato visualize seus próprios scores do Raven via candidatura.';

-- Policy: RH vê scores Raven
CREATE POLICY "RH vê scores Raven"
    ON scores_raven
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM usuarios_rh u
            WHERE u.id = (SELECT auth.uid())
              AND u.ativo = TRUE
        )
    );

COMMENT ON POLICY "RH vê scores Raven" ON scores_raven IS 'Permite que usuários RH ativos visualizem todos os scores do Raven.';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 25-rls-testes-psicometricos.sql executada com sucesso';
    RAISE NOTICE 'RLS configurado para:';
    RAISE NOTICE '  - questoes_bigfive, questoes_disc, questoes_raven (SELECT para authenticated)';
    RAISE NOTICE '  - respostas_* (SELECT candidato/RH, INSERT apenas candidato)';
    RAISE NOTICE '  - scores_* (SELECT candidato/RH)';
    RAISE NOTICE 'Total de 21 policies criadas';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
