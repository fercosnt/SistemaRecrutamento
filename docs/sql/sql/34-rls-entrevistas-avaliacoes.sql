-- ============================================================================
-- Migration: 34-rls-entrevistas-avaliacoes.sql
-- Description: Row Level Security policies para entrevistas e avaliações
-- Dependencies:
--   - 28-tabela-entrevistas-online.sql
--   - 29-tabela-entrevistas-presenciais.sql
--   - 30-tabela-avaliacoes-rh.sql
--   - 31-tabela-historico-acoes.sql
--   - PRD-DB-001 (usuarios_rh)
--   - PRD-DB-002 (candidaturas, candidatos)
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- 1. RLS: entrevistas_online
-- Description: RH vê/gerencia tudo, candidato vê apenas suas entrevistas (sem dados sensíveis)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE entrevistas_online ENABLE ROW LEVEL SECURITY;

-- Policy: RH pode ver todas as entrevistas online
CREATE POLICY "RH vê todas entrevistas online"
ON entrevistas_online
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = auth.uid()
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- Policy: RH pode criar entrevistas online
CREATE POLICY "RH cria entrevistas online"
ON entrevistas_online
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = auth.uid()
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- Policy: RH pode atualizar entrevistas online
CREATE POLICY "RH atualiza entrevistas online"
ON entrevistas_online
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = auth.uid()
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- IMPORTANTE: Candidato NÃO pode ver entrevistas online (dados sensíveis protegidos)
-- Removido em correção: 34-rls-entrevistas-avaliacoes-correcao.sql
-- Se necessário no futuro, criar VIEW separada com campos limitados

COMMENT ON POLICY "RH vê todas entrevistas online" ON entrevistas_online IS 'RH ativo pode visualizar todas as entrevistas online';
COMMENT ON POLICY "RH cria entrevistas online" ON entrevistas_online IS 'RH ativo pode agendar novas entrevistas online';
COMMENT ON POLICY "RH atualiza entrevistas online" ON entrevistas_online IS 'RH ativo pode atualizar dados de entrevistas online';


-- ============================================================================
-- 2. RLS: entrevistas_presenciais
-- Description: RH vê/gerencia tudo, candidato vê apenas suas entrevistas
-- ============================================================================

-- Habilitar RLS
ALTER TABLE entrevistas_presenciais ENABLE ROW LEVEL SECURITY;

-- Policy: RH pode ver todas as entrevistas presenciais
CREATE POLICY "RH vê todas entrevistas presenciais"
ON entrevistas_presenciais
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = auth.uid()
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- Policy: RH pode criar entrevistas presenciais
CREATE POLICY "RH cria entrevistas presenciais"
ON entrevistas_presenciais
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = auth.uid()
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- Policy: RH pode atualizar entrevistas presenciais
CREATE POLICY "RH atualiza entrevistas presenciais"
ON entrevistas_presenciais
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = auth.uid()
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- Policy: Candidato vê próprias entrevistas presenciais
CREATE POLICY "Candidato vê próprias entrevistas presenciais"
ON entrevistas_presenciais
FOR SELECT
TO authenticated
USING (
    candidatura_id IN (
        SELECT c.id FROM candidaturas c
        JOIN candidatos cand ON cand.id = c.candidato_id
        WHERE cand.user_id = auth.uid()
        AND c.deleted_at IS NULL
    )
);

COMMENT ON POLICY "RH vê todas entrevistas presenciais" ON entrevistas_presenciais IS 'RH ativo pode visualizar todas as entrevistas presenciais';
COMMENT ON POLICY "RH cria entrevistas presenciais" ON entrevistas_presenciais IS 'RH ativo pode agendar novas entrevistas presenciais';
COMMENT ON POLICY "RH atualiza entrevistas presenciais" ON entrevistas_presenciais IS 'RH ativo pode atualizar dados de entrevistas presenciais';
COMMENT ON POLICY "Candidato vê próprias entrevistas presenciais" ON entrevistas_presenciais IS 'Candidato pode visualizar suas próprias entrevistas presenciais';


-- ============================================================================
-- 3. RLS: avaliacoes_rh
-- Description: Apenas RH pode ver/gerenciar avaliações (CONFIDENCIAL - candidato não vê)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE avaliacoes_rh ENABLE ROW LEVEL SECURITY;

-- Policy: RH pode ver todas as avaliações
CREATE POLICY "RH vê todas avaliações"
ON avaliacoes_rh
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = auth.uid()
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- Policy: RH pode criar avaliações
CREATE POLICY "RH cria avaliações"
ON avaliacoes_rh
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = auth.uid()
        AND usuarios_rh.deleted_at IS NULL
        AND usuarios_rh.id = avaliador_id  -- Apenas pode criar avaliação em seu próprio nome
    )
);

-- Policy: RH pode atualizar apenas suas próprias avaliações
CREATE POLICY "RH atualiza próprias avaliações"
ON avaliacoes_rh
FOR UPDATE
TO authenticated
USING (
    avaliador_id IN (
        SELECT usuarios_rh.id FROM usuarios_rh
        WHERE usuarios_rh.user_id = auth.uid()
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- IMPORTANTE: Candidato NÃO tem nenhuma policy aqui
-- Avaliações são CONFIDENCIAIS e não devem ser visíveis para candidatos

COMMENT ON POLICY "RH vê todas avaliações" ON avaliacoes_rh IS 'RH ativo pode visualizar todas as avaliações de candidatos';
COMMENT ON POLICY "RH cria avaliações" ON avaliacoes_rh IS 'RH ativo pode criar avaliações em seu próprio nome';
COMMENT ON POLICY "RH atualiza próprias avaliações" ON avaliacoes_rh IS 'RH ativo pode atualizar apenas suas próprias avaliações';


-- ============================================================================
-- 4. RLS: historico_acoes
-- Description: Apenas RH pode ver histórico. Sistema/Functions podem inserir.
--              NINGUÉM pode UPDATE ou DELETE (garantido por triggers)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE historico_acoes ENABLE ROW LEVEL SECURITY;

-- Policy: RH pode ver todo o histórico
CREATE POLICY "RH vê histórico de ações"
ON historico_acoes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = auth.uid()
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- Policy: Sistema/Functions podem inserir no histórico
-- NOTA: Usado por triggers e functions para logging automático
CREATE POLICY "Sistema insere em histórico"
ON historico_acoes
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Qualquer authenticated pode inserir (usado por functions/triggers)

-- IMPORTANTE: Não há policies para UPDATE ou DELETE
-- Triggers já bloqueiam essas operações (tabela IMUTÁVEL)

COMMENT ON POLICY "RH vê histórico de ações" ON historico_acoes IS 'RH ativo pode visualizar todo o histórico de ações em candidaturas';
COMMENT ON POLICY "Sistema insere em histórico" ON historico_acoes IS 'Sistema e functions podem inserir registros no histórico (usado para auditoria automática)';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 34-rls-entrevistas-avaliacoes.sql executada com sucesso';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS habilitado em 4 tabelas:';
    RAISE NOTICE '';
    RAISE NOTICE 'ENTREVISTAS_ONLINE (3 policies):';
    RAISE NOTICE '  ✅ RH vê todas entrevistas online (SELECT)';
    RAISE NOTICE '  ✅ RH cria entrevistas online (INSERT)';
    RAISE NOTICE '  ✅ RH atualiza entrevistas online (UPDATE)';
    RAISE NOTICE '  🔒 Candidato NÃO VÊ entrevistas online (dados sensíveis protegidos)';
    RAISE NOTICE '';
    RAISE NOTICE 'ENTREVISTAS_PRESENCIAIS (4 policies):';
    RAISE NOTICE '  ✅ RH vê todas entrevistas presenciais (SELECT)';
    RAISE NOTICE '  ✅ RH cria entrevistas presenciais (INSERT)';
    RAISE NOTICE '  ✅ RH atualiza entrevistas presenciais (UPDATE)';
    RAISE NOTICE '  ✅ Candidato vê próprias entrevistas presenciais (SELECT)';
    RAISE NOTICE '';
    RAISE NOTICE 'AVALIACOES_RH (3 policies):';
    RAISE NOTICE '  ✅ RH vê todas avaliações (SELECT)';
    RAISE NOTICE '  ✅ RH cria avaliações (INSERT) - apenas em seu próprio nome';
    RAISE NOTICE '  ✅ RH atualiza próprias avaliações (UPDATE)';
    RAISE NOTICE '  🔒 Candidato NÃO pode ver avaliações (CONFIDENCIAL)';
    RAISE NOTICE '';
    RAISE NOTICE 'HISTORICO_ACOES (2 policies):';
    RAISE NOTICE '  ✅ RH vê histórico (SELECT)';
    RAISE NOTICE '  ✅ Sistema insere histórico (INSERT) - usado por functions/triggers';
    RAISE NOTICE '  🔒 NINGUÉM pode UPDATE ou DELETE (IMUTÁVEL via triggers)';
    RAISE NOTICE '';
    RAISE NOTICE 'Total: 12 policies criadas para segurança e compliance';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANTE - Segurança de Dados Sensíveis:';
    RAISE NOTICE '  🔒 Candidato NÃO pode acessar entrevistas_online (protege: gravação, transcrição, notas, análise IA)';
    RAISE NOTICE '  ✅ Se necessário no futuro, criar VIEW separada "entrevistas_online_candidato_view" com campos limitados';
    RAISE NOTICE '  ✅ Correção aplicada em: 34-rls-entrevistas-avaliacoes-correcao.sql';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
