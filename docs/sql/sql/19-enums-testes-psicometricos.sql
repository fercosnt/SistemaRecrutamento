-- ============================================================================
-- Migration: 19-enums-testes-psicometricos.sql
-- Description: Criação dos enums para testes psicométricos (Big Five, DISC, Raven)
-- Dependencies: Nenhuma
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================

-- ============================================================================
-- 1. ENUM: dimensao_bigfive
-- Description: Dimensões do modelo Big Five (OCEAN) de personalidade
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE dimensao_bigfive AS ENUM (
        'openness',           -- Abertura à experiência
        'conscientiousness',  -- Conscienciosidade
        'extraversion',       -- Extroversão
        'agreeableness',      -- Amabilidade
        'neuroticism'         -- Neuroticismo
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Comentários descritivos para dimensao_bigfive
COMMENT ON TYPE dimensao_bigfive IS 'Dimensões do modelo Big Five (OCEAN) de personalidade';

-- Documentação detalhada de cada valor do enum
-- 'openness': Abertura à experiência - Mede curiosidade intelectual, criatividade,
--             preferência por novidade e variedade. Pessoas com alto score são
--             imaginativas, curiosas e abertas a novas ideias.
--
-- 'conscientiousness': Conscienciosidade - Mede organização, responsabilidade,
--                      autodisciplina e orientação para objetivos. Pessoas com
--                      alto score são organizadas, confiáveis e disciplinadas.
--
-- 'extraversion': Extroversão - Mede sociabilidade, assertividade, energia e
--                 entusiasmo em contextos sociais. Pessoas com alto score são
--                 sociáveis, assertivas e energéticas.
--
-- 'agreeableness': Amabilidade - Mede cooperação, empatia, confiança e
--                  consideração pelos outros. Pessoas com alto score são
--                  compassivas, cooperativas e confiáveis.
--
-- 'neuroticism': Neuroticismo - Mede instabilidade emocional, ansiedade e
--                tendência a experienciar emoções negativas. Pessoas com alto
--                score tendem a ser mais ansiosas e emocionalmente reativas.


-- ============================================================================
-- 2. ENUM: dimensao_disc
-- Description: Dimensões do modelo DISC de comportamento
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE dimensao_disc AS ENUM (
        'D',  -- Dominância
        'I',  -- Influência
        'S',  -- Estabilidade
        'C'   -- Conformidade
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Comentários descritivos para dimensao_disc
COMMENT ON TYPE dimensao_disc IS 'Dimensões do modelo DISC de comportamento';

-- Documentação detalhada de cada valor do enum
-- 'D' (Dominância): Pessoas orientadas para resultados, diretas, assertivas,
--                   competitivas e focadas em desafios. Tomam decisões rápidas
--                   e gostam de controle e autonomia.
--
-- 'I' (Influência): Pessoas sociáveis, entusiastas, otimistas e persuasivas.
--                   Focam em relacionamentos, colaboração e influenciar outros
--                   positivamente. Energéticas e expressivas.
--
-- 'S' (Estabilidade): Pessoas calmas, pacientes, leais e consistentes. Valorizam
--                     estabilidade, harmonia e ambiente previsível. Boas ouvintes
--                     e apoiadoras da equipe.
--
-- 'C' (Conformidade): Pessoas analíticas, precisas, sistemáticas e orientadas
--                     para qualidade. Focam em exatidão, padrões e procedimentos.
--                     Pensam cuidadosamente antes de agir.


-- ============================================================================
-- 3. ENUM: serie_raven
-- Description: Séries do teste de Matrizes Progressivas de Raven
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE serie_raven AS ENUM (
        'A',  -- Série A (mais fácil)
        'B',  -- Série B
        'C',  -- Série C
        'D',  -- Série D
        'E'   -- Série E (mais difícil)
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Comentários descritivos para serie_raven
COMMENT ON TYPE serie_raven IS 'Séries do teste de Matrizes Progressivas de Raven (A a E)';

-- Documentação detalhada de cada valor do enum
-- 'A': Série A - Questões 1-12. Nível mais básico, avalia percepção de padrões
--      simples e completamento de figuras. Progressão horizontal e vertical
--      contínua de um padrão.
--
-- 'B': Série B - Questões 13-24. Avalia analogias de figuras com maior
--      complexidade. Requer percepção de relacionamentos espaciais e
--      progressões mais elaboradas.
--
-- 'C': Série C - Questões 25-36. Avalia progressão de mudanças em figuras.
--      Requer raciocínio sobre mudanças quantitativas e qualitativas
--      progressivas nos padrões.
--
-- 'D': Série D - Questões 37-48. Avalia reorganização de figuras. Requer
--      compreensão de permutações e combinações de elementos visuais
--      em diferentes arranjos.
--
-- 'E': Série E - Questões 49-60. Nível mais complexo. Avalia decomposição
--      analítica de figuras em componentes. Requer raciocínio sobre
--      relações abstratas entre múltiplos elementos.


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 19-enums-testes-psicometricos.sql executada com sucesso';
    RAISE NOTICE 'Enums criados:';
    RAISE NOTICE '  - dimensao_bigfive (5 valores: openness, conscientiousness, extraversion, agreeableness, neuroticism)';
    RAISE NOTICE '  - dimensao_disc (4 valores: D, I, S, C)';
    RAISE NOTICE '  - serie_raven (5 valores: A, B, C, D, E)';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
