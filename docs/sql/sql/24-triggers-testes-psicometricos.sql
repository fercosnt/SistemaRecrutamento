-- ============================================================================
-- Migration: 24-triggers-testes-psicometricos.sql
-- Description: Triggers para cálculo automático de scores quando testes são completados
-- Dependencies:
--   - 20-tabelas-bigfive.sql
--   - 21-tabelas-disc.sql
--   - 22-tabelas-raven.sql
--   - 23-functions-calculo-scores.sql
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- 1. TRIGGER: Big Five - Calcula scores quando candidato completa 100 questões
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_calcular_bigfive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_respostas INTEGER;
BEGIN
    -- Conta quantas respostas o candidato já deu
    SELECT COUNT(*)
    INTO v_total_respostas
    FROM respostas_bigfive
    WHERE candidatura_id = NEW.candidatura_id;

    -- Se completou as 100 questões, calcula os scores
    IF v_total_respostas = 100 THEN
        PERFORM calcular_scores_bigfive(NEW.candidatura_id);
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_calcular_bigfive IS 'Trigger function que verifica se candidato completou 100 questões Big Five e calcula scores automaticamente.';

-- Cria o trigger
DROP TRIGGER IF EXISTS after_insert_resposta_bigfive ON respostas_bigfive;

CREATE TRIGGER after_insert_resposta_bigfive
    AFTER INSERT ON respostas_bigfive
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calcular_bigfive();

COMMENT ON TRIGGER after_insert_resposta_bigfive ON respostas_bigfive IS 'Trigger que dispara cálculo automático de scores Big Five quando candidato completa as 100 questões.';


-- ============================================================================
-- 2. TRIGGER: DISC - Calcula scores quando candidato completa 28 questões
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_calcular_disc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_respostas INTEGER;
BEGIN
    -- Conta quantas respostas o candidato já deu
    SELECT COUNT(*)
    INTO v_total_respostas
    FROM respostas_disc
    WHERE candidatura_id = NEW.candidatura_id;

    -- Se completou as 28 questões, calcula os scores
    IF v_total_respostas = 28 THEN
        PERFORM calcular_scores_disc(NEW.candidatura_id);
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_calcular_disc IS 'Trigger function que verifica se candidato completou 28 questões DISC e calcula scores automaticamente.';

-- Cria o trigger
DROP TRIGGER IF EXISTS after_insert_resposta_disc ON respostas_disc;

CREATE TRIGGER after_insert_resposta_disc
    AFTER INSERT ON respostas_disc
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calcular_disc();

COMMENT ON TRIGGER after_insert_resposta_disc ON respostas_disc IS 'Trigger que dispara cálculo automático de scores DISC quando candidato completa as 28 questões.';


-- ============================================================================
-- 3. TRIGGER: Raven - Calcula scores quando candidato completa 60 questões
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_calcular_raven()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_respostas INTEGER;
BEGIN
    -- Conta quantas respostas o candidato já deu
    SELECT COUNT(*)
    INTO v_total_respostas
    FROM respostas_raven
    WHERE candidatura_id = NEW.candidatura_id;

    -- Se completou as 60 questões, calcula os scores
    IF v_total_respostas = 60 THEN
        PERFORM calcular_scores_raven(NEW.candidatura_id);
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_calcular_raven IS 'Trigger function que verifica se candidato completou 60 questões Raven e calcula scores automaticamente.';

-- Cria o trigger
DROP TRIGGER IF EXISTS after_insert_resposta_raven ON respostas_raven;

CREATE TRIGGER after_insert_resposta_raven
    AFTER INSERT ON respostas_raven
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calcular_raven();

COMMENT ON TRIGGER after_insert_resposta_raven ON respostas_raven IS 'Trigger que dispara cálculo automático de scores Raven quando candidato completa as 60 questões.';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 24-triggers-testes-psicometricos.sql executada com sucesso';
    RAISE NOTICE 'Triggers criados:';
    RAISE NOTICE '  - after_insert_resposta_bigfive → Calcula scores após 100 respostas';
    RAISE NOTICE '  - after_insert_resposta_disc → Calcula scores após 28 respostas';
    RAISE NOTICE '  - after_insert_resposta_raven → Calcula scores após 60 respostas';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
