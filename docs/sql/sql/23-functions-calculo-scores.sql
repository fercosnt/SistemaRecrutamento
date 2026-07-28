-- ============================================================================
-- Migration: 23-functions-calculo-scores.sql
-- Description: Functions para cálculo automático de scores dos testes psicométricos
-- Dependencies:
--   - 20-tabelas-bigfive.sql
--   - 21-tabelas-disc.sql
--   - 22-tabelas-raven.sql
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- 1. FUNCTION: calcular_scores_bigfive
-- Description: Calcula os scores normalizados (0-100) do teste Big Five
-- ============================================================================

CREATE OR REPLACE FUNCTION calcular_scores_bigfive(candidatura_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_score_openness DECIMAL(5,2);
    v_score_conscientiousness DECIMAL(5,2);
    v_score_extraversion DECIMAL(5,2);
    v_score_agreeableness DECIMAL(5,2);
    v_score_neuroticism DECIMAL(5,2);
    v_tempo_total INTEGER;
    v_count_questoes INTEGER;
    v_soma_pontos DECIMAL;
    v_min_possivel DECIMAL;
    v_max_possivel DECIMAL;
BEGIN
    -- Calcula score para Openness (Abertura à Experiência)
    SELECT
        COUNT(*),
        SUM(CASE
            WHEN q.is_invertida THEN (6 - r.resposta)
            ELSE r.resposta
        END)
    INTO v_count_questoes, v_soma_pontos
    FROM respostas_bigfive r
    JOIN questoes_bigfive q ON r.questao_id = q.id
    WHERE r.candidatura_id = candidatura_uuid
      AND q.dimensao = 'openness'
      AND q.deleted_at IS NULL;

    v_min_possivel := v_count_questoes * 1;
    v_max_possivel := v_count_questoes * 5;
    v_score_openness := CASE
        WHEN v_count_questoes > 0 THEN ((v_soma_pontos - v_min_possivel) / (v_max_possivel - v_min_possivel)) * 100
        ELSE 0
    END;

    -- Calcula score para Conscientiousness (Conscienciosidade)
    SELECT
        COUNT(*),
        SUM(CASE
            WHEN q.is_invertida THEN (6 - r.resposta)
            ELSE r.resposta
        END)
    INTO v_count_questoes, v_soma_pontos
    FROM respostas_bigfive r
    JOIN questoes_bigfive q ON r.questao_id = q.id
    WHERE r.candidatura_id = candidatura_uuid
      AND q.dimensao = 'conscientiousness'
      AND q.deleted_at IS NULL;

    v_min_possivel := v_count_questoes * 1;
    v_max_possivel := v_count_questoes * 5;
    v_score_conscientiousness := CASE
        WHEN v_count_questoes > 0 THEN ((v_soma_pontos - v_min_possivel) / (v_max_possivel - v_min_possivel)) * 100
        ELSE 0
    END;

    -- Calcula score para Extraversion (Extroversão)
    SELECT
        COUNT(*),
        SUM(CASE
            WHEN q.is_invertida THEN (6 - r.resposta)
            ELSE r.resposta
        END)
    INTO v_count_questoes, v_soma_pontos
    FROM respostas_bigfive r
    JOIN questoes_bigfive q ON r.questao_id = q.id
    WHERE r.candidatura_id = candidatura_uuid
      AND q.dimensao = 'extraversion'
      AND q.deleted_at IS NULL;

    v_min_possivel := v_count_questoes * 1;
    v_max_possivel := v_count_questoes * 5;
    v_score_extraversion := CASE
        WHEN v_count_questoes > 0 THEN ((v_soma_pontos - v_min_possivel) / (v_max_possivel - v_min_possivel)) * 100
        ELSE 0
    END;

    -- Calcula score para Agreeableness (Amabilidade)
    SELECT
        COUNT(*),
        SUM(CASE
            WHEN q.is_invertida THEN (6 - r.resposta)
            ELSE r.resposta
        END)
    INTO v_count_questoes, v_soma_pontos
    FROM respostas_bigfive r
    JOIN questoes_bigfive q ON r.questao_id = q.id
    WHERE r.candidatura_id = candidatura_uuid
      AND q.dimensao = 'agreeableness'
      AND q.deleted_at IS NULL;

    v_min_possivel := v_count_questoes * 1;
    v_max_possivel := v_count_questoes * 5;
    v_score_agreeableness := CASE
        WHEN v_count_questoes > 0 THEN ((v_soma_pontos - v_min_possivel) / (v_max_possivel - v_min_possivel)) * 100
        ELSE 0
    END;

    -- Calcula score para Neuroticism (Neuroticismo)
    SELECT
        COUNT(*),
        SUM(CASE
            WHEN q.is_invertida THEN (6 - r.resposta)
            ELSE r.resposta
        END)
    INTO v_count_questoes, v_soma_pontos
    FROM respostas_bigfive r
    JOIN questoes_bigfive q ON r.questao_id = q.id
    WHERE r.candidatura_id = candidatura_uuid
      AND q.dimensao = 'neuroticism'
      AND q.deleted_at IS NULL;

    v_min_possivel := v_count_questoes * 1;
    v_max_possivel := v_count_questoes * 5;
    v_score_neuroticism := CASE
        WHEN v_count_questoes > 0 THEN ((v_soma_pontos - v_min_possivel) / (v_max_possivel - v_min_possivel)) * 100
        ELSE 0
    END;

    -- Calcula tempo total em segundos (diferença entre última e primeira resposta)
    SELECT COALESCE(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))::INTEGER, 0)
    INTO v_tempo_total
    FROM respostas_bigfive
    WHERE candidatura_id = candidatura_uuid;

    -- Insere ou atualiza os scores
    INSERT INTO scores_bigfive (
        candidatura_id,
        score_openness,
        score_conscientiousness,
        score_extraversion,
        score_agreeableness,
        score_neuroticism,
        tempo_total_segundos
    ) VALUES (
        candidatura_uuid,
        v_score_openness,
        v_score_conscientiousness,
        v_score_extraversion,
        v_score_agreeableness,
        v_score_neuroticism,
        v_tempo_total
    )
    ON CONFLICT (candidatura_id) DO UPDATE SET
        score_openness = EXCLUDED.score_openness,
        score_conscientiousness = EXCLUDED.score_conscientiousness,
        score_extraversion = EXCLUDED.score_extraversion,
        score_agreeableness = EXCLUDED.score_agreeableness,
        score_neuroticism = EXCLUDED.score_neuroticism,
        tempo_total_segundos = EXCLUDED.tempo_total_segundos,
        updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION calcular_scores_bigfive IS 'Calcula os scores normalizados (0-100) do teste Big Five para um candidato. Considera questões invertidas e normaliza para escala 0-100.';


-- ============================================================================
-- 2. FUNCTION: calcular_scores_disc
-- Description: Calcula os scores do teste DISC (+2/-1) e determina perfis
-- ============================================================================

CREATE OR REPLACE FUNCTION calcular_scores_disc(candidatura_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_score_d INTEGER := 0;
    v_score_i INTEGER := 0;
    v_score_s INTEGER := 0;
    v_score_c INTEGER := 0;
    v_perfil_primario TEXT;
    v_perfil_secundario TEXT;
    v_tempo_total INTEGER;
    v_max_score INTEGER;
BEGIN
    -- Calcula scores: +2 para mais_caracteristico, -1 para menos_caracteristico
    SELECT
        SUM(CASE WHEN mais_caracteristico = 'D' THEN 2 ELSE 0 END) +
        SUM(CASE WHEN menos_caracteristico = 'D' THEN -1 ELSE 0 END),

        SUM(CASE WHEN mais_caracteristico = 'I' THEN 2 ELSE 0 END) +
        SUM(CASE WHEN menos_caracteristico = 'I' THEN -1 ELSE 0 END),

        SUM(CASE WHEN mais_caracteristico = 'S' THEN 2 ELSE 0 END) +
        SUM(CASE WHEN menos_caracteristico = 'S' THEN -1 ELSE 0 END),

        SUM(CASE WHEN mais_caracteristico = 'C' THEN 2 ELSE 0 END) +
        SUM(CASE WHEN menos_caracteristico = 'C' THEN -1 ELSE 0 END)
    INTO v_score_d, v_score_i, v_score_s, v_score_c
    FROM respostas_disc
    WHERE candidatura_id = candidatura_uuid;

    -- Determina perfil primário (maior score)
    v_max_score := GREATEST(v_score_d, v_score_i, v_score_s, v_score_c);

    v_perfil_primario := CASE v_max_score
        WHEN v_score_d THEN 'D'
        WHEN v_score_i THEN 'I'
        WHEN v_score_s THEN 'S'
        WHEN v_score_c THEN 'C'
    END;

    -- Determina perfil secundário (segundo maior score)
    IF v_perfil_primario = 'D' THEN
        v_max_score := GREATEST(v_score_i, v_score_s, v_score_c);
        v_perfil_secundario := CASE v_max_score
            WHEN v_score_i THEN 'I'
            WHEN v_score_s THEN 'S'
            WHEN v_score_c THEN 'C'
        END;
    ELSIF v_perfil_primario = 'I' THEN
        v_max_score := GREATEST(v_score_d, v_score_s, v_score_c);
        v_perfil_secundario := CASE v_max_score
            WHEN v_score_d THEN 'D'
            WHEN v_score_s THEN 'S'
            WHEN v_score_c THEN 'C'
        END;
    ELSIF v_perfil_primario = 'S' THEN
        v_max_score := GREATEST(v_score_d, v_score_i, v_score_c);
        v_perfil_secundario := CASE v_max_score
            WHEN v_score_d THEN 'D'
            WHEN v_score_i THEN 'I'
            WHEN v_score_c THEN 'C'
        END;
    ELSE -- 'C'
        v_max_score := GREATEST(v_score_d, v_score_i, v_score_s);
        v_perfil_secundario := CASE v_max_score
            WHEN v_score_d THEN 'D'
            WHEN v_score_i THEN 'I'
            WHEN v_score_s THEN 'S'
        END;
    END IF;

    -- Calcula tempo total em segundos
    SELECT COALESCE(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))::INTEGER, 0)
    INTO v_tempo_total
    FROM respostas_disc
    WHERE candidatura_id = candidatura_uuid;

    -- Insere ou atualiza os scores
    INSERT INTO scores_disc (
        candidatura_id,
        score_d,
        score_i,
        score_s,
        score_c,
        perfil_primario,
        perfil_secundario,
        tempo_total_segundos
    ) VALUES (
        candidatura_uuid,
        v_score_d,
        v_score_i,
        v_score_s,
        v_score_c,
        v_perfil_primario,
        v_perfil_secundario,
        v_tempo_total
    )
    ON CONFLICT (candidatura_id) DO UPDATE SET
        score_d = EXCLUDED.score_d,
        score_i = EXCLUDED.score_i,
        score_s = EXCLUDED.score_s,
        score_c = EXCLUDED.score_c,
        perfil_primario = EXCLUDED.perfil_primario,
        perfil_secundario = EXCLUDED.perfil_secundario,
        tempo_total_segundos = EXCLUDED.tempo_total_segundos,
        updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION calcular_scores_disc IS 'Calcula os scores do teste DISC usando sistema +2 (mais característico) e -1 (menos característico). Determina perfis primário e secundário.';


-- ============================================================================
-- 3. FUNCTION: calcular_scores_raven
-- Description: Calcula scores, percentil e classificação do teste Raven
-- ============================================================================

CREATE OR REPLACE FUNCTION calcular_scores_raven(candidatura_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_acertos INTEGER;
    v_percentual_acerto DECIMAL(5,2);
    v_percentil INTEGER;
    v_classificacao TEXT;
    v_acertos_por_serie JSONB;
    v_tempo_total INTEGER;
BEGIN
    -- Conta total de acertos
    SELECT COUNT(*)
    INTO v_total_acertos
    FROM respostas_raven r
    JOIN questoes_raven q ON r.questao_id = q.id
    WHERE r.candidatura_id = candidatura_uuid
      AND r.resposta = q.resposta_correta
      AND q.deleted_at IS NULL;

    -- Calcula percentual de acerto
    v_percentual_acerto := (v_total_acertos::DECIMAL / 60) * 100;

    -- Calcula acertos por série
    SELECT jsonb_build_object(
        'A', (SELECT COUNT(*) FROM respostas_raven r JOIN questoes_raven q ON r.questao_id = q.id
              WHERE r.candidatura_id = candidatura_uuid AND q.serie = 'A' AND r.resposta = q.resposta_correta AND q.deleted_at IS NULL),
        'B', (SELECT COUNT(*) FROM respostas_raven r JOIN questoes_raven q ON r.questao_id = q.id
              WHERE r.candidatura_id = candidatura_uuid AND q.serie = 'B' AND r.resposta = q.resposta_correta AND q.deleted_at IS NULL),
        'C', (SELECT COUNT(*) FROM respostas_raven r JOIN questoes_raven q ON r.questao_id = q.id
              WHERE r.candidatura_id = candidatura_uuid AND q.serie = 'C' AND r.resposta = q.resposta_correta AND q.deleted_at IS NULL),
        'D', (SELECT COUNT(*) FROM respostas_raven r JOIN questoes_raven q ON r.questao_id = q.id
              WHERE r.candidatura_id = candidatura_uuid AND q.serie = 'D' AND r.resposta = q.resposta_correta AND q.deleted_at IS NULL),
        'E', (SELECT COUNT(*) FROM respostas_raven r JOIN questoes_raven q ON r.questao_id = q.id
              WHERE r.candidatura_id = candidatura_uuid AND q.serie = 'E' AND r.resposta = q.resposta_correta AND q.deleted_at IS NULL)
    ) INTO v_acertos_por_serie;

    -- Calcula percentil baseado em tabela normativa
    -- Tabela normativa aproximada para adultos (pode ser ajustada conforme normas locais)
    v_percentil := CASE
        WHEN v_total_acertos >= 55 THEN 95
        WHEN v_total_acertos >= 50 THEN 90
        WHEN v_total_acertos >= 45 THEN 85
        WHEN v_total_acertos >= 42 THEN 75
        WHEN v_total_acertos >= 38 THEN 65
        WHEN v_total_acertos >= 35 THEN 50
        WHEN v_total_acertos >= 30 THEN 35
        WHEN v_total_acertos >= 25 THEN 25
        WHEN v_total_acertos >= 20 THEN 15
        WHEN v_total_acertos >= 15 THEN 10
        ELSE 5
    END;

    -- Determina classificação baseado em percentil
    v_classificacao := CASE
        WHEN v_percentil >= 90 THEN 'Superior'
        WHEN v_percentil >= 75 THEN 'Médio Superior'
        WHEN v_percentil >= 50 THEN 'Médio'
        WHEN v_percentil >= 25 THEN 'Médio Inferior'
        ELSE 'Inferior'
    END;

    -- Calcula tempo total em segundos
    SELECT COALESCE(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))::INTEGER, 0)
    INTO v_tempo_total
    FROM respostas_raven
    WHERE candidatura_id = candidatura_uuid;

    -- Insere ou atualiza os scores
    INSERT INTO scores_raven (
        candidatura_id,
        total_acertos,
        percentual_acerto,
        percentil,
        classificacao,
        acertos_por_serie,
        tempo_total_segundos
    ) VALUES (
        candidatura_uuid,
        v_total_acertos,
        v_percentual_acerto,
        v_percentil,
        v_classificacao,
        v_acertos_por_serie,
        v_tempo_total
    )
    ON CONFLICT (candidatura_id) DO UPDATE SET
        total_acertos = EXCLUDED.total_acertos,
        percentual_acerto = EXCLUDED.percentual_acerto,
        percentil = EXCLUDED.percentil,
        classificacao = EXCLUDED.classificacao,
        acertos_por_serie = EXCLUDED.acertos_por_serie,
        tempo_total_segundos = EXCLUDED.tempo_total_segundos,
        updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION calcular_scores_raven IS 'Calcula total de acertos, percentual, percentil baseado em normas e classificação do teste de Matrizes Progressivas de Raven. Também calcula acertos por série (A-E).';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 23-functions-calculo-scores.sql executada com sucesso';
    RAISE NOTICE 'Functions criadas:';
    RAISE NOTICE '  - calcular_scores_bigfive() - Scores normalizados 0-100 com questões invertidas';
    RAISE NOTICE '  - calcular_scores_disc() - Scores com sistema +2/-1 e perfis';
    RAISE NOTICE '  - calcular_scores_raven() - Acertos, percentil e classificação';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
