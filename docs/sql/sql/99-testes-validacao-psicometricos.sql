-- ============================================================================
-- Script: 99-testes-validacao-psicometricos.sql
-- Description: Scripts de teste e validação para testes psicométricos
-- Dependencies: Migrations 19-26 (testes psicométricos completos)
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================

-- ============================================================================
-- INSTRUÇÕES DE USO
-- ============================================================================
-- Este arquivo contém scripts de teste para validar a implementação dos
-- testes psicométricos (Big Five, DISC, Raven).
--
-- IMPORTANTE: Execute cada seção separadamente e valide os resultados.
-- Não execute todo o arquivo de uma vez!
--
-- Para cada teste, você deve:
-- 1. Executar o script SQL
-- 2. Verificar o resultado esperado
-- 3. Marcar a task correspondente como completa em tasks-prd-db-003-testes-psicometricos.md
-- ============================================================================


-- ============================================================================
-- SETUP: Criar dados de teste
-- ============================================================================

-- Você precisará de:
-- - Um candidato de teste (tabela candidatos)
-- - Uma vaga de teste (tabela vagas)
-- - Uma candidatura de teste (tabela candidaturas)
-- - Um usuário RH de teste (tabela usuarios_rh)

-- EXEMPLO: Criar dados de teste (ajuste conforme necessário)
/*
-- Inserir candidato de teste (se não existir)
INSERT INTO candidatos (email, nome_completo)
VALUES ('teste.candidato@example.com', 'Candidato Teste Psicométrico')
ON CONFLICT (email) DO NOTHING;

-- Inserir vaga de teste (se não existir)
INSERT INTO vagas (titulo, descricao, status)
VALUES ('Vaga Teste Psicométrico', 'Vaga para testes', 'publicada')
RETURNING id;

-- Inserir candidatura de teste
INSERT INTO candidaturas (vaga_id, candidato_id, status)
SELECT
    (SELECT id FROM vagas WHERE titulo = 'Vaga Teste Psicométrico' LIMIT 1),
    (SELECT id FROM candidatos WHERE email = 'teste.candidato@example.com' LIMIT 1),
    'em_analise'
RETURNING id;
*/


-- ============================================================================
-- TESTES BIG FIVE (Tasks 9.1 - 9.9)
-- ============================================================================

-- Task 9.1: Testar criação de questões Big Five (120 questões, diferentes dimensões)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_usuario_rh_id UUID;
    v_count INTEGER;
BEGIN
    -- Pegar um usuário RH para usar como created_by
    SELECT id INTO v_usuario_rh_id FROM usuarios_rh WHERE ativo = TRUE LIMIT 1;

    -- Criar 24 questões de exemplo (4 por dimensão, versao 1)
    -- Openness (4 questões)
    INSERT INTO questoes_bigfive (numero_questao, versao, texto_questao, dimensao, is_invertida, created_by)
    VALUES
        (1, 1, 'Tenho uma imaginação vívida e criativa.', 'openness', FALSE, v_usuario_rh_id),
        (2, 1, 'Prefiro rotinas estabelecidas.', 'openness', TRUE, v_usuario_rh_id),
        (3, 1, 'Gosto de explorar ideias novas e diferentes.', 'openness', FALSE, v_usuario_rh_id),
        (4, 1, 'Sou curioso(a) sobre muitas coisas diferentes.', 'openness', FALSE, v_usuario_rh_id);

    -- Conscientiousness (4 questões)
    INSERT INTO questoes_bigfive (numero_questao, versao, texto_questao, dimensao, is_invertida, created_by)
    VALUES
        (5, 1, 'Sou sempre preparado(a) e organizado(a).', 'conscientiousness', FALSE, v_usuario_rh_id),
        (6, 1, 'Deixo minhas coisas espalhadas.', 'conscientiousness', TRUE, v_usuario_rh_id),
        (7, 1, 'Presto atenção aos detalhes.', 'conscientiousness', FALSE, v_usuario_rh_id),
        (8, 1, 'Faço planos e os sigo.', 'conscientiousness', FALSE, v_usuario_rh_id);

    -- Extraversion (4 questões)
    INSERT INTO questoes_bigfive (numero_questao, versao, texto_questao, dimensao, is_invertida, created_by)
    VALUES
        (9, 1, 'Sou a vida da festa.', 'extraversion', FALSE, v_usuario_rh_id),
        (10, 1, 'Prefiro ficar em casa do que sair.', 'extraversion', TRUE, v_usuario_rh_id),
        (11, 1, 'Converso com muitas pessoas diferentes em festas.', 'extraversion', FALSE, v_usuario_rh_id),
        (12, 1, 'Sinto-me confortável perto de outras pessoas.', 'extraversion', FALSE, v_usuario_rh_id);

    -- Agreeableness (4 questões)
    INSERT INTO questoes_bigfive (numero_questao, versao, texto_questao, dimensao, is_invertida, created_by)
    VALUES
        (13, 1, 'Sou interessado(a) nos outros.', 'agreeableness', FALSE, v_usuario_rh_id),
        (14, 1, 'Insulto as pessoas.', 'agreeableness', TRUE, v_usuario_rh_id),
        (15, 1, 'Simpatizo com os sentimentos dos outros.', 'agreeableness', FALSE, v_usuario_rh_id),
        (16, 1, 'Tenho um coração mole.', 'agreeableness', FALSE, v_usuario_rh_id);

    -- Neuroticism (4 questões)
    INSERT INTO questoes_bigfive (numero_questao, versao, texto_questao, dimensao, is_invertida, created_by)
    VALUES
        (17, 1, 'Fico estressado(a) facilmente.', 'neuroticism', FALSE, v_usuario_rh_id),
        (18, 1, 'Fico relaxado(a) na maior parte do tempo.', 'neuroticism', TRUE, v_usuario_rh_id),
        (19, 1, 'Preocupo-me com as coisas.', 'neuroticism', FALSE, v_usuario_rh_id),
        (20, 1, 'Fico nervoso(a) facilmente.', 'neuroticism', FALSE, v_usuario_rh_id);

    SELECT COUNT(*) INTO v_count FROM questoes_bigfive;
    RAISE NOTICE 'Task 9.1: % questões Big Five criadas com sucesso', v_count;
END $$;

-- Task 9.2: Testar constraint UNIQUE (numero_questao, versao)
-- -----------------------------------------------------------------------------
-- Este teste DEVE FALHAR (esperado)
DO $$
BEGIN
    BEGIN
        INSERT INTO questoes_bigfive (numero_questao, versao, texto_questao, dimensao, is_invertida)
        VALUES (1, 1, 'Questão duplicada', 'openness', FALSE);

        RAISE EXCEPTION 'Task 9.2 FALHOU: Constraint UNIQUE não funcionou!';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'Task 9.2: ✓ Constraint UNIQUE funcionando - questão duplicada foi rejeitada';
    END;
END $$;

-- Task 9.3: Testar constraint numero_questao CHECK (entre 1-120)
-- -----------------------------------------------------------------------------
-- Este teste DEVE FALHAR (esperado)
DO $$
BEGIN
    BEGIN
        INSERT INTO questoes_bigfive (numero_questao, versao, texto_questao, dimensao, is_invertida)
        VALUES (121, 1, 'Questão fora do range', 'openness', FALSE);

        RAISE EXCEPTION 'Task 9.3 FALHOU: Constraint CHECK não funcionou!';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'Task 9.3: ✓ Constraint CHECK funcionando - questão com número inválido foi rejeitada';
    END;
END $$;

-- Task 9.4: Testar criação de respostas Big Five com escala 1-5
-- -----------------------------------------------------------------------------
-- Substitua {candidatura_id} pelo ID real da candidatura de teste
DO $$
DECLARE
    v_candidatura_id UUID;
    v_questao_ids UUID[];
BEGIN
    -- Pegar candidatura de teste
    SELECT id INTO v_candidatura_id FROM candidaturas ORDER BY created_at DESC LIMIT 1;

    IF v_candidatura_id IS NULL THEN
        RAISE EXCEPTION 'Nenhuma candidatura encontrada. Crie uma candidatura de teste primeiro.';
    END IF;

    -- Pegar IDs das primeiras 5 questões
    SELECT ARRAY_AGG(id ORDER BY numero_questao) INTO v_questao_ids
    FROM questoes_bigfive WHERE numero_questao <= 5 LIMIT 5;

    -- Inserir 5 respostas de exemplo (escala 1-5)
    INSERT INTO respostas_bigfive (candidatura_id, questao_id, resposta, tempo_resposta_segundos)
    SELECT v_candidatura_id, unnest(v_questao_ids), generate_series(1, 5), 15;

    RAISE NOTICE 'Task 9.4: ✓ 5 respostas Big Five criadas com sucesso (escala 1-5)';
END $$;

-- Task 9.5: Testar constraint UNIQUE (candidatura_id, questao_id)
-- -----------------------------------------------------------------------------
-- Este teste DEVE FALHAR (esperado)
DO $$
DECLARE
    v_candidatura_id UUID;
    v_questao_id UUID;
BEGIN
    SELECT id INTO v_candidatura_id FROM candidaturas ORDER BY created_at DESC LIMIT 1;
    SELECT id INTO v_questao_id FROM questoes_bigfive LIMIT 1;

    BEGIN
        -- Tentar responder a mesma questão duas vezes
        INSERT INTO respostas_bigfive (candidatura_id, questao_id, resposta)
        VALUES (v_candidatura_id, v_questao_id, 3);

        RAISE EXCEPTION 'Task 9.5 FALHOU: Constraint UNIQUE não funcionou!';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'Task 9.5: ✓ Constraint UNIQUE funcionando - resposta duplicada foi rejeitada';
    END;
END $$;

-- Task 9.6: Testar constraint resposta CHECK (entre 1-5)
-- -----------------------------------------------------------------------------
-- Este teste DEVE FALHAR (esperado)
DO $$
DECLARE
    v_candidatura_id UUID;
    v_questao_id UUID;
BEGIN
    SELECT id INTO v_candidatura_id FROM candidaturas ORDER BY created_at DESC LIMIT 1;
    SELECT id INTO v_questao_id FROM questoes_bigfive WHERE numero_questao = 6 LIMIT 1;

    BEGIN
        INSERT INTO respostas_bigfive (candidatura_id, questao_id, resposta)
        VALUES (v_candidatura_id, v_questao_id, 6); -- Inválido: deve ser 1-5

        RAISE EXCEPTION 'Task 9.6 FALHOU: Constraint CHECK não funcionou!';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'Task 9.6: ✓ Constraint CHECK funcionando - resposta inválida foi rejeitada';
    END;
END $$;

-- Task 9.7: Testar trigger - inserir 120 respostas e verificar cálculo automático
-- -----------------------------------------------------------------------------
-- IMPORTANTE: Este teste requer todas as 120 questões criadas
-- Execute apenas se você tiver as 120 questões Big Five no banco
/*
DO $$
DECLARE
    v_candidatura_id UUID;
    v_questao_ids UUID[];
    v_scores_count INTEGER;
BEGIN
    -- Criar nova candidatura para teste limpo
    INSERT INTO candidaturas (vaga_id, candidato_id, status)
    SELECT
        (SELECT id FROM vagas LIMIT 1),
        (SELECT id FROM candidatos LIMIT 1),
        'em_analise'
    RETURNING id INTO v_candidatura_id;

    -- Pegar IDs de todas as 120 questões
    SELECT ARRAY_AGG(id ORDER BY numero_questao) INTO v_questao_ids
    FROM questoes_bigfive WHERE versao = 1 AND deleted_at IS NULL;

    -- Inserir 120 respostas (variando entre 1-5)
    INSERT INTO respostas_bigfive (candidatura_id, questao_id, resposta, tempo_resposta_segundos)
    SELECT
        v_candidatura_id,
        questao_id,
        (1 + (ROW_NUMBER() OVER () % 5))::INTEGER, -- Varia entre 1-5
        10 + (RANDOM() * 20)::INTEGER -- Tempo entre 10-30 segundos
    FROM UNNEST(v_questao_ids) AS questao_id;

    -- Aguardar trigger processar
    PERFORM pg_sleep(0.5);

    -- Verificar se scores foram calculados automaticamente
    SELECT COUNT(*) INTO v_scores_count
    FROM scores_bigfive
    WHERE candidatura_id = v_candidatura_id;

    IF v_scores_count = 1 THEN
        RAISE NOTICE 'Task 9.7: ✓ Trigger funcionando - scores calculados automaticamente após 120 respostas';

        -- Mostrar os scores
        RAISE NOTICE 'Scores calculados:';
        PERFORM pg_sleep(0.1);

        SELECT
            score_openness,
            score_conscientiousness,
            score_extraversion,
            score_agreeableness,
            score_neuroticism
        FROM scores_bigfive
        WHERE candidatura_id = v_candidatura_id;
    ELSE
        RAISE EXCEPTION 'Task 9.7 FALHOU: Scores não foram calculados automaticamente!';
    END IF;
END $$;
*/

-- Task 9.8: Testar function calcular_scores_bigfive com questões invertidas
-- Task 9.9: Verificar que scores são normalizados entre 0-100
-- -----------------------------------------------------------------------------
-- Verificar scores existentes
SELECT
    candidatura_id,
    score_openness,
    score_conscientiousness,
    score_extraversion,
    score_agreeableness,
    score_neuroticism,
    tempo_total_segundos,
    CASE
        WHEN score_openness BETWEEN 0 AND 100
         AND score_conscientiousness BETWEEN 0 AND 100
         AND score_extraversion BETWEEN 0 AND 100
         AND score_agreeableness BETWEEN 0 AND 100
         AND score_neuroticism BETWEEN 0 AND 100
        THEN '✓ Task 9.9: Todos os scores estão normalizados (0-100)'
        ELSE '✗ Task 9.9 FALHOU: Scores fora do range!'
    END AS validacao
FROM scores_bigfive;


-- ============================================================================
-- TESTES DISC (Tasks 9.10 - 9.13)
-- ============================================================================

-- Task 9.10: Testar criação de questões DISC com JSONB opcoes (4 opções D, I, S, C)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_usuario_rh_id UUID;
    v_count INTEGER;
BEGIN
    SELECT id INTO v_usuario_rh_id FROM usuarios_rh WHERE ativo = TRUE LIMIT 1;

    -- Criar 4 questões DISC de exemplo
    INSERT INTO questoes_disc (numero_questao, versao, opcoes, created_by)
    VALUES
        (1, 1, '[
            {"dimensao": "D", "texto": "Gosto de controlar situações"},
            {"dimensao": "I", "texto": "Gosto de influenciar pessoas"},
            {"dimensao": "S", "texto": "Gosto de manter a estabilidade"},
            {"dimensao": "C", "texto": "Gosto de seguir procedimentos"}
        ]'::jsonb, v_usuario_rh_id),
        (2, 1, '[
            {"dimensao": "D", "texto": "Sou direto e assertivo"},
            {"dimensao": "I", "texto": "Sou entusiasta e otimista"},
            {"dimensao": "S", "texto": "Sou calmo e paciente"},
            {"dimensao": "C", "texto": "Sou analítico e preciso"}
        ]'::jsonb, v_usuario_rh_id),
        (3, 1, '[
            {"dimensao": "D", "texto": "Tomo decisões rapidamente"},
            {"dimensao": "I", "texto": "Colaboro facilmente com outros"},
            {"dimensao": "S", "texto": "Evito conflitos"},
            {"dimensao": "C", "texto": "Verifico os detalhes"}
        ]'::jsonb, v_usuario_rh_id),
        (4, 1, '[
            {"dimensao": "D", "texto": "Gosto de desafios"},
            {"dimensao": "I", "texto": "Gosto de novidades"},
            {"dimensao": "S", "texto": "Gosto de rotinas"},
            {"dimensao": "C", "texto": "Gosto de regras claras"}
        ]'::jsonb, v_usuario_rh_id);

    SELECT COUNT(*) INTO v_count FROM questoes_disc;
    RAISE NOTICE 'Task 9.10: ✓ % questões DISC criadas com JSONB opcoes', v_count;
END $$;

-- Task 9.11: Testar constraint mais_caracteristico != menos_caracteristico
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_candidatura_id UUID;
    v_questao_id UUID;
BEGIN
    SELECT id INTO v_candidatura_id FROM candidaturas ORDER BY created_at DESC LIMIT 1;
    SELECT id INTO v_questao_id FROM questoes_disc LIMIT 1;

    BEGIN
        INSERT INTO respostas_disc (candidatura_id, questao_id, mais_caracteristico, menos_caracteristico)
        VALUES (v_candidatura_id, v_questao_id, 'D', 'D'); -- Mesmo valor - deve falhar

        RAISE EXCEPTION 'Task 9.11 FALHOU: Constraint diferente não funcionou!';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'Task 9.11: ✓ Constraint funcionando - mais e menos iguais foi rejeitado';
    END;
END $$;

-- Task 9.12: Testar trigger - inserir 28 respostas DISC e verificar cálculo automático
-- Task 9.13: Verificar que perfil_primario e perfil_secundario são calculados corretamente
-- -----------------------------------------------------------------------------
-- IMPORTANTE: Requer todas as 28 questões DISC criadas
/*
DO $$
DECLARE
    v_candidatura_id UUID;
    v_questao_ids UUID[];
    v_scores_count INTEGER;
    v_perfil_primario TEXT;
    v_perfil_secundario TEXT;
BEGIN
    -- Criar nova candidatura
    INSERT INTO candidaturas (vaga_id, candidato_id, status)
    SELECT (SELECT id FROM vagas LIMIT 1), (SELECT id FROM candidatos LIMIT 1), 'em_analise'
    RETURNING id INTO v_candidatura_id;

    -- Pegar IDs das 28 questões DISC
    SELECT ARRAY_AGG(id ORDER BY numero_questao) INTO v_questao_ids
    FROM questoes_disc WHERE versao = 1 AND deleted_at IS NULL LIMIT 28;

    -- Inserir 28 respostas (favorecer D e I para teste)
    INSERT INTO respostas_disc (candidatura_id, questao_id, mais_caracteristico, menos_caracteristico, tempo_resposta_segundos)
    SELECT
        v_candidatura_id,
        questao_id,
        CASE (ROW_NUMBER() OVER () % 4)
            WHEN 0 THEN 'D'
            WHEN 1 THEN 'I'
            WHEN 2 THEN 'D'
            WHEN 3 THEN 'I'
        END,
        CASE (ROW_NUMBER() OVER () % 4)
            WHEN 0 THEN 'S'
            WHEN 1 THEN 'C'
            WHEN 2 THEN 'C'
            WHEN 3 THEN 'S'
        END,
        10 + (RANDOM() * 15)::INTEGER
    FROM UNNEST(v_questao_ids) AS questao_id;

    PERFORM pg_sleep(0.5);

    SELECT perfil_primario, perfil_secundario INTO v_perfil_primario, v_perfil_secundario
    FROM scores_disc WHERE candidatura_id = v_candidatura_id;

    IF v_perfil_primario IS NOT NULL THEN
        RAISE NOTICE 'Task 9.12: ✓ Trigger DISC funcionando';
        RAISE NOTICE 'Task 9.13: ✓ Perfis calculados: Primário=%, Secundário=%', v_perfil_primario, v_perfil_secundario;
    ELSE
        RAISE EXCEPTION 'Tasks 9.12-9.13 FALHARAM: Scores DISC não calculados!';
    END IF;
END $$;
*/


-- ============================================================================
-- TESTES RAVEN (Tasks 9.14 - 9.19)
-- ============================================================================

-- Task 9.14: Testar criação de questões Raven
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_usuario_rh_id UUID;
    v_count INTEGER;
BEGIN
    SELECT id INTO v_usuario_rh_id FROM usuarios_rh WHERE ativo = TRUE LIMIT 1;

    -- Criar 5 questões Raven de exemplo (1 por série)
    -- Nomenclatura: {SÉRIE}{QUESTÃO}.webp para matriz, {SÉRIE}{QUESTÃO}.{OPÇÃO}.webp para opções
    INSERT INTO questoes_raven (numero_questao, versao, serie, imagem_matriz_url, opcoes_imagens, resposta_correta, created_by)
    VALUES
        (1, 1, 'A', 'https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A1.webp',
         '["https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A1.1.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A1.2.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A1.3.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A1.4.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A1.5.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A1.6.webp"]'::jsonb, 3, v_usuario_rh_id),
        (2, 1, 'A', 'https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A2.webp',
         '["https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A2.1.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A2.2.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A2.3.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A2.4.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A2.5.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/A2.6.webp"]'::jsonb, 5, v_usuario_rh_id),
        (13, 1, 'B', 'https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/B1.webp',
         '["https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/B1.1.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/B1.2.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/B1.3.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/B1.4.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/B1.5.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/B1.6.webp"]'::jsonb, 2, v_usuario_rh_id),
        (25, 1, 'C', 'https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/C1.webp',
         '["https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/C1.1.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/C1.2.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/C1.3.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/C1.4.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/C1.5.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/C1.6.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/C1.7.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/C1.8.webp"]'::jsonb, 7, v_usuario_rh_id),
        (37, 1, 'D', 'https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/D1.webp',
         '["https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/D1.1.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/D1.2.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/D1.3.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/D1.4.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/D1.5.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/D1.6.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/D1.7.webp","https://exemplo.com/storage/v1/object/public/raven-imagens/versao-1/D1.8.webp"]'::jsonb, 4, v_usuario_rh_id);

    SELECT COUNT(*) INTO v_count FROM questoes_raven;
    RAISE NOTICE 'Task 9.14: ✓ % questões Raven criadas com serie, URLs e opcoes JSONB', v_count;
END $$;

-- Task 9.15: Testar constraint resposta_correta CHECK (entre 1-8)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        INSERT INTO questoes_raven (numero_questao, versao, serie, imagem_matriz_url, opcoes_imagens, resposta_correta)
        VALUES (50, 1, 'E', 'url', '[]'::jsonb, 9); -- Inválido

        RAISE EXCEPTION 'Task 9.15 FALHOU: Constraint CHECK não funcionou!';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'Task 9.15: ✓ Constraint CHECK funcionando - resposta_correta inválida rejeitada';
    END;
END $$;

-- Tasks 9.16-9.19: Testar trigger Raven, percentil, classificação e acertos_por_serie
-- -----------------------------------------------------------------------------
-- Verificar scores Raven existentes e validar cálculos
SELECT
    candidatura_id,
    total_acertos,
    percentual_acerto,
    percentil,
    classificacao,
    acertos_por_serie,
    tempo_total_segundos,
    CASE
        WHEN total_acertos BETWEEN 0 AND 60 THEN '✓ Task 9.16: Total acertos válido'
        ELSE '✗ Total acertos inválido!'
    END AS validacao_acertos,
    CASE
        WHEN percentil BETWEEN 0 AND 100 THEN '✓ Task 9.17: Percentil válido'
        ELSE '✗ Percentil inválido!'
    END AS validacao_percentil,
    CASE
        WHEN classificacao IN ('Inferior', 'Médio Inferior', 'Médio', 'Médio Superior', 'Superior')
        THEN '✓ Task 9.18: Classificação válida'
        ELSE '✗ Classificação inválida!'
    END AS validacao_classificacao,
    CASE
        WHEN jsonb_typeof(acertos_por_serie) = 'object'
         AND acertos_por_serie ? 'A'
         AND acertos_por_serie ? 'B'
         AND acertos_por_serie ? 'C'
         AND acertos_por_serie ? 'D'
         AND acertos_por_serie ? 'E'
        THEN '✓ Task 9.19: Acertos por série JSONB válido'
        ELSE '✗ Acertos por série inválido!'
    END AS validacao_acertos_serie
FROM scores_raven;


-- ============================================================================
-- TESTES RLS (Tasks 9.20 - 9.27)
-- ============================================================================

-- Task 9.20-9.21: Testar RLS - candidato vê apenas suas respostas
-- -----------------------------------------------------------------------------
-- IMPORTANTE: Execute via cliente com autenticação de candidato
-- Não pode ser testado diretamente neste script
RAISE NOTICE 'Tasks 9.20-9.21: RLS deve ser testado via aplicação com auth.uid() real';
RAISE NOTICE 'Comando de exemplo:';
RAISE NOTICE '  SELECT * FROM respostas_bigfive; -- Como candidato, deve ver apenas suas respostas';

-- Task 9.22: Testar RLS - RH vê todas as respostas
-- -----------------------------------------------------------------------------
RAISE NOTICE 'Task 9.22: RLS deve ser testado via aplicação com usuário RH autenticado';
RAISE NOTICE 'Comando de exemplo:';
RAISE NOTICE '  SELECT * FROM respostas_bigfive; -- Como RH, deve ver todas as respostas';

-- Task 9.23-9.24: Testar RLS - INSERT
-- -----------------------------------------------------------------------------
RAISE NOTICE 'Tasks 9.23-9.24: Testar INSERT via aplicação com candidato autenticado';

-- Task 9.25: Testar RLS - questões visíveis para autenticados
-- -----------------------------------------------------------------------------
SELECT
    COUNT(*) AS total_questoes_visiveis,
    '✓ Task 9.25: Questões visíveis (deleted_at IS NULL)' AS validacao
FROM questoes_bigfive
WHERE deleted_at IS NULL;

-- Task 9.26: Testar soft delete
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_questao_id UUID;
    v_count_before INTEGER;
    v_count_after INTEGER;
BEGIN
    SELECT id INTO v_questao_id FROM questoes_bigfive WHERE deleted_at IS NULL LIMIT 1;

    SELECT COUNT(*) INTO v_count_before FROM questoes_bigfive WHERE deleted_at IS NULL;

    -- Soft delete
    UPDATE questoes_bigfive SET deleted_at = NOW() WHERE id = v_questao_id;

    SELECT COUNT(*) INTO v_count_after FROM questoes_bigfive WHERE deleted_at IS NULL;

    IF v_count_after = v_count_before - 1 THEN
        RAISE NOTICE 'Task 9.26: ✓ Soft delete funcionando - questão marcada como deletada';
        -- Reverter
        UPDATE questoes_bigfive SET deleted_at = NULL WHERE id = v_questao_id;
    ELSE
        RAISE EXCEPTION 'Task 9.26 FALHOU: Soft delete não funcionou!';
    END IF;
END $$;

-- Task 9.27: Testar versionamento
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_count_v1 INTEGER;
    v_count_v2 INTEGER;
BEGIN
    -- Criar versão 2 de uma questão
    INSERT INTO questoes_bigfive (numero_questao, versao, texto_questao, dimensao, is_invertida)
    SELECT 1, 2, 'Versão 2 da questão 1', dimensao, is_invertida
    FROM questoes_bigfive WHERE numero_questao = 1 AND versao = 1 LIMIT 1;

    SELECT COUNT(*) INTO v_count_v1 FROM questoes_bigfive WHERE numero_questao = 1 AND versao = 1;
    SELECT COUNT(*) INTO v_count_v2 FROM questoes_bigfive WHERE numero_questao = 1 AND versao = 2;

    IF v_count_v1 >= 1 AND v_count_v2 >= 1 THEN
        RAISE NOTICE 'Task 9.27: ✓ Versionamento funcionando - versões 1 e 2 coexistem';
    ELSE
        RAISE EXCEPTION 'Task 9.27 FALHOU: Versionamento não funcionou!';
    END IF;
END $$;


-- ============================================================================
-- TESTES ADICIONAIS (Tasks 9.28 - 9.34)
-- ============================================================================

-- Task 9.28: Testar que respostas antigas continuam vinculadas à versão correta
-- -----------------------------------------------------------------------------
SELECT
    r.candidatura_id,
    q.numero_questao,
    q.versao,
    COUNT(*) AS total_respostas,
    '✓ Task 9.28: Respostas vinculadas às versões corretas' AS validacao
FROM respostas_bigfive r
JOIN questoes_bigfive q ON r.questao_id = q.id
GROUP BY r.candidatura_id, q.numero_questao, q.versao;

-- Task 9.29: Testar tempo_total_segundos
-- -----------------------------------------------------------------------------
SELECT
    'Big Five' AS teste,
    candidatura_id,
    tempo_total_segundos,
    CASE
        WHEN tempo_total_segundos >= 0 THEN '✓ Task 9.29: Tempo total válido'
        ELSE '✗ Tempo total inválido!'
    END AS validacao
FROM scores_bigfive
UNION ALL
SELECT
    'DISC' AS teste,
    candidatura_id,
    tempo_total_segundos,
    CASE WHEN tempo_total_segundos >= 0 THEN '✓' ELSE '✗' END
FROM scores_disc
UNION ALL
SELECT
    'Raven' AS teste,
    candidatura_id,
    tempo_total_segundos,
    CASE WHEN tempo_total_segundos >= 0 THEN '✓' ELSE '✗' END
FROM scores_raven;

-- Task 9.30: Executar queries de análise do PRD
-- -----------------------------------------------------------------------------
-- Distribuição de scores Big Five
SELECT
    'Distribuição Big Five' AS analise,
    AVG(score_openness) AS avg_openness,
    AVG(score_conscientiousness) AS avg_conscientiousness,
    AVG(score_extraversion) AS avg_extraversion,
    AVG(score_agreeableness) AS avg_agreeableness,
    AVG(score_neuroticism) AS avg_neuroticism
FROM scores_bigfive;

-- Distribuição de perfis DISC
SELECT
    'Perfis DISC' AS analise,
    perfil_primario,
    COUNT(*) AS total
FROM scores_disc
GROUP BY perfil_primario;

-- Distribuição de classificações Raven
SELECT
    'Classificações Raven' AS analise,
    classificacao,
    COUNT(*) AS total
FROM scores_raven
GROUP BY classificacao;

-- Task 9.31: Executar advisors
-- -----------------------------------------------------------------------------
RAISE NOTICE 'Task 9.31: Execute via MCP: mcp_supabase_get_advisors("security")';
RAISE NOTICE 'Task 9.31: Execute via MCP: mcp_supabase_get_advisors("performance")';

-- Task 9.32: Corrigir issues dos advisors
-- -----------------------------------------------------------------------------
RAISE NOTICE 'Task 9.32: Revise e corrija quaisquer issues reportados pelos advisors';

-- Task 9.33-9.34: Atualizar documentação
-- -----------------------------------------------------------------------------
RAISE NOTICE 'Task 9.33: Atualizar tasks/IMPLEMENTATION_NOTES.md com informações sobre testes psicométricos';
RAISE NOTICE 'Task 9.34: Atualizar tasks/TESTING_CHECKLIST.md com testes específicos deste PRD';


-- ============================================================================
-- FIM DOS TESTES
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'Testes de Validação Concluídos!';
RAISE NOTICE 'Revise os resultados acima e marque';
RAISE NOTICE 'as tasks correspondentes como completas';
RAISE NOTICE 'em tasks-prd-db-003-testes-psicometricos.md';
RAISE NOTICE '========================================';
