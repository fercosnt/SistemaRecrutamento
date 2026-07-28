-- ============================================================================
-- Migration: 34-rls-entrevistas-avaliacoes-correcao.sql
-- Description: Correção RLS - Remove acesso do candidato a dados sensíveis de entrevistas
-- Dependencies:
--   - 34-rls-entrevistas-avaliacoes.sql
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- CORREÇÃO: Remover policy que permite candidato ver entrevistas online
-- Description: Candidato NÃO deve ver: gravação, transcrição, análise IA
-- ============================================================================

-- Remove a policy que permite candidato ver entrevistas online
DROP POLICY IF EXISTS "Candidato vê próprias entrevistas online" ON entrevistas_online;

-- IMPORTANTE: Candidato agora NÃO pode acessar entrevistas_online diretamente
-- Se necessário no futuro, criar VIEW separada com campos limitados


-- ============================================================================
-- Verificação Final
-- ============================================================================

-- Lista todas as policies de entrevistas_online (deve ter apenas 3 para RH)
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM pg_policies
    WHERE tablename = 'entrevistas_online';

    RAISE NOTICE '';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Correção de RLS aplicada com sucesso!';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'ENTREVISTAS_ONLINE:';
    RAISE NOTICE '  ✅ RH vê todas (SELECT)';
    RAISE NOTICE '  ✅ RH cria (INSERT)';
    RAISE NOTICE '  ✅ RH atualiza (UPDATE)';
    RAISE NOTICE '  🔒 Candidato NÃO VÊ entrevistas online (dados sensíveis protegidos)';
    RAISE NOTICE '';
    RAISE NOTICE 'Total de policies em entrevistas_online: %', v_count;
    RAISE NOTICE '';
    RAISE NOTICE 'SEGURANÇA:';
    RAISE NOTICE '  🔒 gravacao_url → Apenas RH';
    RAISE NOTICE '  🔒 gravacao_tamanho_mb → Apenas RH';
    RAISE NOTICE '  🔒 transcricao → Apenas RH';
    RAISE NOTICE '  🔒 resumo_ia → Apenas RH';
    RAISE NOTICE '  🔒 analise_ia → Apenas RH';
    RAISE NOTICE '  🔒 notas_preparacao → Apenas RH';
    RAISE NOTICE '  🔒 notas_durante → Apenas RH';
    RAISE NOTICE '  🔒 observacoes_gerais → Apenas RH';
    RAISE NOTICE '';
    RAISE NOTICE 'Se no futuro for necessário candidato ver informações básicas da entrevista,';
    RAISE NOTICE 'criar VIEW separada "entrevistas_online_candidato_view" com campos limitados:';
    RAISE NOTICE '  - data_agendada, duracao_estimada_minutos, link_videochamada, plataforma, status';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
