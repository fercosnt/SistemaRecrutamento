-- ============================================================================
-- Raven: o tempo total da prova era SEMPRE zero neste sistema
-- ============================================================================
--
-- MEDIDO EM PROD, 2026-08-26. Primeira execução completa da avaliação de raciocínio
-- dentro do ATS: 60 respostas gravadas, score correto (8 acertos, percentil 5), e
-- `scores_raven.tempo_total_segundos = 0` — com o cronômetro marcando 00:02:53 na tela.
--
-- CAUSA. `calcular_scores_raven` derivava a duração do intervalo entre as linhas:
--
--     SELECT COALESCE(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))::INTEGER, 0)
--
-- No app de origem (Teste_Inteligencia) cada resposta era inserida no instante em que
-- o candidato a dava, e esse intervalo ERA a duração. O port grava as 60 numa única
-- transação — por desenho, para que nunca exista prova pela metade — e aí todas as
-- linhas nascem com o mesmo `created_at`. O intervalo é estruturalmente zero.
--
-- ⚠ O QUE ISSO ILUSTRA. A expressão não estava errada: estava CASADA com um modo de
-- escrita que deixou de valer. Ela não falhou, não deu erro, e devolveu um número
-- plausível. Só a leitura de volta contra o cronômetro da tela mostrou o problema.
--
-- CONSERTO, dos dois lados:
--   • `ravenService.submeterRaven` passou a gravar o tempo de CADA item (antes mandava
--     o total pendurado na primeira linha, na crença — falsa — de que a função o lia);
--   • aqui, o total passa a ser a SOMA da coluna quando ela vem preenchida, caindo no
--     intervalo antigo quando vem toda nula. Linhas gravadas antes desta migration
--     continuam sendo calculadas como sempre foram.
--
-- Nada mais do corpo muda: acertos, percentual, série, percentil e classificação estão
-- idênticos ao original.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calcular_scores_raven(candidatura_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_total_acertos INTEGER;
    v_percentual_acerto DECIMAL(5,2);
    v_percentil INTEGER;
    v_classificacao TEXT;
    v_acertos_por_serie JSONB;
    v_tempo_total INTEGER;
    v_tempo_somado INTEGER;
BEGIN
    -- Conta total de acertos
    SELECT COUNT(*)
    INTO v_total_acertos
    FROM respostas_raven r
    JOIN questoes_raven q ON r.questao_id = q.id
    WHERE r.candidatura_id = candidatura_uuid AND r.resposta = q.resposta_correta AND q.deleted_at IS NULL;

    -- Calcula percentual de acerto
    v_percentual_acerto := (v_total_acertos::DECIMAL / 60) * 100;

    -- Calcula acertos por série
    SELECT jsonb_build_object(
        'A', (SELECT COUNT(*) FROM respostas_raven r JOIN questoes_raven q ON r.questao_id = q.id WHERE r.candidatura_id = candidatura_uuid AND q.serie = 'A' AND r.resposta = q.resposta_correta AND q.deleted_at IS NULL),
        'B', (SELECT COUNT(*) FROM respostas_raven r JOIN questoes_raven q ON r.questao_id = q.id WHERE r.candidatura_id = candidatura_uuid AND q.serie = 'B' AND r.resposta = q.resposta_correta AND q.deleted_at IS NULL),
        'C', (SELECT COUNT(*) FROM respostas_raven r JOIN questoes_raven q ON r.questao_id = q.id WHERE r.candidatura_id = candidatura_uuid AND q.serie = 'C' AND r.resposta = q.resposta_correta AND q.deleted_at IS NULL),
        'D', (SELECT COUNT(*) FROM respostas_raven r JOIN questoes_raven q ON r.questao_id = q.id WHERE r.candidatura_id = candidatura_uuid AND q.serie = 'D' AND r.resposta = q.resposta_correta AND q.deleted_at IS NULL),
        'E', (SELECT COUNT(*) FROM respostas_raven r JOIN questoes_raven q ON r.questao_id = q.id WHERE r.candidatura_id = candidatura_uuid AND q.serie = 'E' AND r.resposta = q.resposta_correta AND q.deleted_at IS NULL)
    ) INTO v_acertos_por_serie;

    -- Calcula percentil baseado em tabela normativa
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

    -- Determina classificação
    v_classificacao := CASE
        WHEN v_percentil >= 90 THEN 'Superior'
        WHEN v_percentil >= 75 THEN 'Médio Superior'
        WHEN v_percentil >= 50 THEN 'Médio'
        WHEN v_percentil >= 25 THEN 'Médio Inferior'
        ELSE 'Inferior'
    END;

    -- Tempo total: a SOMA dos tempos por item quando a coluna foi preenchida; o
    -- intervalo entre created_at só como resgate para linhas antigas, onde ela é nula.
    -- SUM de uma coluna toda nula devolve NULL — é isso que distingue os dois casos.
    SELECT SUM(tempo_resposta_segundos)::INTEGER
    INTO v_tempo_somado FROM respostas_raven WHERE candidatura_id = candidatura_uuid;

    IF v_tempo_somado IS NOT NULL THEN
        v_tempo_total := v_tempo_somado;
    ELSE
        SELECT COALESCE(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))::INTEGER, 0)
        INTO v_tempo_total FROM respostas_raven WHERE candidatura_id = candidatura_uuid;
    END IF;

    -- Insere ou atualiza os scores
    INSERT INTO scores_raven (candidatura_id, total_acertos, percentual_acerto, percentil, classificacao, acertos_por_serie, tempo_total_segundos)
    VALUES (candidatura_uuid, v_total_acertos, v_percentual_acerto, v_percentil, v_classificacao, v_acertos_por_serie, v_tempo_total)
    ON CONFLICT (candidatura_id) DO UPDATE SET
        total_acertos = EXCLUDED.total_acertos, percentual_acerto = EXCLUDED.percentual_acerto,
        percentil = EXCLUDED.percentil, classificacao = EXCLUDED.classificacao,
        acertos_por_serie = EXCLUDED.acertos_por_serie, tempo_total_segundos = EXCLUDED.tempo_total_segundos, updated_at = NOW();
END;
$fn$;

-- ── Portão: prova POR EXECUÇÃO, não por leitura do texto da função ──────────────
--
-- Recalcula a candidatura que expôs o defeito e exige que o tempo deixe de ser zero e
-- passe a bater com a soma da coluna. Um portão que só conferisse se o SQL contém a
-- palavra "SUM" ficaria verde com a função quebrada.
DO $gate$
DECLARE
    v_cand UUID;
    v_esperado INTEGER;
    v_gravado INTEGER;
BEGIN
    -- 60 linhas E pelo menos uma com tempo medido. Filtrar as nulas ANTES do HAVING
    -- (que foi como escrevi na primeira versão) faria COUNT(*) contar só as linhas com
    -- tempo — nunca 60 — e o portão sairia verde sem exercitar nada. COUNT(coluna)
    -- ignora nulos; COUNT(*) não.
    SELECT candidatura_id INTO v_cand
    FROM respostas_raven
    GROUP BY candidatura_id
    HAVING COUNT(*) = 60 AND COUNT(tempo_resposta_segundos) > 0
    LIMIT 1;

    IF v_cand IS NULL THEN
        RAISE NOTICE 'nenhuma prova completa com tempo por item — portao nao exercitado';
        RETURN;
    END IF;

    SELECT SUM(tempo_resposta_segundos)::INTEGER INTO v_esperado
    FROM respostas_raven WHERE candidatura_id = v_cand;

    PERFORM calcular_scores_raven(v_cand);

    SELECT tempo_total_segundos INTO v_gravado
    FROM scores_raven WHERE candidatura_id = v_cand;

    IF v_gravado IS DISTINCT FROM v_esperado THEN
        RAISE EXCEPTION 'tempo_total_segundos = % para a candidatura %, esperado % (a soma da coluna)',
            v_gravado, v_cand, v_esperado;
    END IF;

    IF v_gravado = 0 THEN
        RAISE EXCEPTION 'tempo_total_segundos continua zero para % — o defeito nao foi corrigido', v_cand;
    END IF;

    RAISE NOTICE 'portao ok: candidatura % agora com tempo_total_segundos = %', v_cand, v_gravado;
END;
$gate$;
