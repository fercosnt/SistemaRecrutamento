-- ==============================================
-- 16 - Functions Auxiliares para Vagas e Candidaturas
-- PRD-DB-002: Estrutura de Vagas e Candidaturas
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- FUNCTION 1: calcular_score_geral
-- ==============================================
-- Calcula score consolidado de uma candidatura baseado em análises IA
-- Média ponderada: Formulário 15%, BigFive 15%, DISC 10%, Raven 20%, Cultura 30%, Entrevistas 10%
-- Atualiza campo score_geral na tabela candidaturas

CREATE OR REPLACE FUNCTION calcular_score_geral(candidatura_uuid UUID)
RETURNS DECIMAL(5,2)
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    score_formulario DECIMAL(5,2);
    score_bigfive DECIMAL(5,2);
    score_disc DECIMAL(5,2);
    score_raven DECIMAL(5,2);
    score_cultura DECIMAL(5,2);
    score_entrevista_online DECIMAL(5,2);
    score_entrevista_presencial DECIMAL(5,2);
    score_final DECIMAL(5,2);
BEGIN
    -- Buscar scores das análises IA armazenadas em JSONB
    -- Cada análise deve ter um campo 'score' no JSON
    SELECT
        (analise_ia_formulario->>'score')::DECIMAL,
        (analise_ia_bigfive->>'score')::DECIMAL,
        (analise_ia_disc->>'score')::DECIMAL,
        (analise_ia_raven->>'score')::DECIMAL,
        (analise_ia_cultura->>'score')::DECIMAL,
        (analise_ia_entrevista_online->>'score')::DECIMAL,
        (analise_ia_entrevista_presencial->>'score')::DECIMAL
    INTO
        score_formulario,
        score_bigfive,
        score_disc,
        score_raven,
        score_cultura,
        score_entrevista_online,
        score_entrevista_presencial
    FROM candidaturas
    WHERE id = candidatura_uuid;

    -- Verificar se a candidatura existe
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidatura com ID % não encontrada', candidatura_uuid;
    END IF;

    -- Calcular média ponderada
    -- Pesos: Formulário 15%, BigFive 15%, DISC 10%, Raven 20%, Cultura 30%, Entrevistas Online 5%, Presencial 5%
    score_final := COALESCE(
        (COALESCE(score_formulario, 0) * 0.15) +
        (COALESCE(score_bigfive, 0) * 0.15) +
        (COALESCE(score_disc, 0) * 0.10) +
        (COALESCE(score_raven, 0) * 0.20) +
        (COALESCE(score_cultura, 0) * 0.30) +
        (COALESCE(score_entrevista_online, 0) * 0.05) +
        (COALESCE(score_entrevista_presencial, 0) * 0.05),
        0
    );

    -- Atualizar candidatura com score calculado
    UPDATE candidaturas
    SET score_geral = score_final,
        updated_at = NOW()
    WHERE id = candidatura_uuid;

    RETURN score_final;
END;
$$;

COMMENT ON FUNCTION calcular_score_geral(UUID) IS
'Calcula score consolidado (0-100) de uma candidatura baseado em média ponderada das análises IA. PESOS: Formulário 15%, BigFive 15%, DISC 10%, Raven 20%, Cultura 30%, Entrevistas 10%. Atualiza automaticamente o campo score_geral. SEGURO: search_path fixo.';

-- ==============================================
-- FUNCTION 2: avancar_etapa
-- ==============================================
-- Move candidato para próxima etapa do processo seletivo
-- Atualiza etapa_atual, status, timestamps e auditoria

CREATE OR REPLACE FUNCTION avancar_etapa(
    candidatura_uuid UUID,
    usuario_rh_uuid UUID
)
RETURNS VOID
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    etapa_atual_valor etapa_processo;
    proxima_etapa etapa_processo;
BEGIN
    -- Buscar etapa atual da candidatura
    SELECT etapa_atual INTO etapa_atual_valor
    FROM candidaturas
    WHERE id = candidatura_uuid;

    -- Verificar se a candidatura existe
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidatura com ID % não encontrada', candidatura_uuid;
    END IF;

    -- Determinar próxima etapa baseada na etapa atual
    CASE etapa_atual_valor
        WHEN 'triagem' THEN proxima_etapa := 'bigfive';
        WHEN 'bigfive' THEN proxima_etapa := 'disc';
        WHEN 'disc' THEN proxima_etapa := 'entrevista_online';
        WHEN 'entrevista_online' THEN proxima_etapa := 'raven';
        WHEN 'raven' THEN proxima_etapa := 'cultura';
        WHEN 'cultura' THEN proxima_etapa := 'entrevista_presencial';
        WHEN 'entrevista_presencial' THEN proxima_etapa := 'aprovado';
        WHEN 'aprovado' THEN
            RAISE EXCEPTION 'Candidatura já está aprovada. Não é possível avançar mais etapas.';
        WHEN 'rejeitado' THEN
            RAISE EXCEPTION 'Candidatura foi rejeitada. Não é possível avançar etapas.';
        ELSE
            RAISE EXCEPTION 'Etapa atual inválida: %', etapa_atual_valor;
    END CASE;

    -- Atualizar candidatura com nova etapa
    UPDATE candidaturas
    SET
        etapa_atual = proxima_etapa,
        status = CASE
            WHEN proxima_etapa = 'aprovado' THEN 'finalizado'::status_candidatura
            ELSE 'aguardando_resposta'::status_candidatura
        END,
        updated_at = NOW(),
        updated_by = usuario_rh_uuid
    WHERE id = candidatura_uuid;

END;
$$;

COMMENT ON FUNCTION avancar_etapa(UUID, UUID) IS
'Move candidato para próxima etapa do processo seletivo. ORDEM: triagem → bigfive → disc → entrevista_online → raven → cultura → entrevista_presencial → aprovado. Atualiza etapa_atual, status e auditoria. SEGURO: search_path fixo.';

-- ==============================================
-- FUNCTION 3: rejeitar_candidato
-- ==============================================
-- Rejeita candidato em qualquer etapa do processo
-- Marca como rejeitado e registra motivo

CREATE OR REPLACE FUNCTION rejeitar_candidato(
    candidatura_uuid UUID,
    usuario_rh_uuid UUID,
    motivo TEXT
)
RETURNS VOID
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    etapa_atual_valor etapa_processo;
BEGIN
    -- Buscar etapa atual da candidatura
    SELECT etapa_atual INTO etapa_atual_valor
    FROM candidaturas
    WHERE id = candidatura_uuid;

    -- Verificar se a candidatura existe
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidatura com ID % não encontrada', candidatura_uuid;
    END IF;

    -- Verificar se já está rejeitado
    IF etapa_atual_valor = 'rejeitado' THEN
        RAISE EXCEPTION 'Candidatura já foi rejeitada anteriormente.';
    END IF;

    -- Verificar se já está aprovado (não pode rejeitar aprovado)
    IF etapa_atual_valor = 'aprovado' THEN
        RAISE EXCEPTION 'Não é possível rejeitar candidatura já aprovada.';
    END IF;

    -- Atualizar candidatura para rejeitado
    UPDATE candidaturas
    SET
        etapa_atual = 'rejeitado'::etapa_processo,
        status = 'finalizado'::status_candidatura,
        feedback_rejeicao = motivo,
        data_decisao_final = NOW(),
        updated_at = NOW(),
        updated_by = usuario_rh_uuid
    WHERE id = candidatura_uuid;

END;
$$;

COMMENT ON FUNCTION rejeitar_candidato(UUID, UUID, TEXT) IS
'Rejeita candidato em qualquer etapa do processo. Marca etapa_atual como "rejeitado", status como "finalizado", registra motivo no feedback_rejeicao e atualiza data_decisao_final. Não permite rejeitar candidatos já aprovados ou já rejeitados. SEGURO: search_path fixo.';

-- ==============================================
-- VALIDAÇÃO
-- ==============================================

-- Verificar se functions foram criadas corretamente
SELECT
    routine_name,
    routine_type,
    data_type,
    type_udt_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'calcular_score_geral',
    'avancar_etapa',
    'rejeitar_candidato'
)
ORDER BY routine_name;

-- Verificar parâmetros das functions
SELECT
    routine_name,
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
AND routine_name IN (
    'calcular_score_geral',
    'avancar_etapa',
    'rejeitar_candidato'
)
ORDER BY routine_name, ordinal_position;

-- ==============================================
-- FIM DO SCRIPT 16-functions-vagas-candidaturas.sql
-- ==============================================
