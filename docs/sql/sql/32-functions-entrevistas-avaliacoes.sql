-- ============================================================================
-- Migration: 32-functions-entrevistas-avaliacoes.sql
-- Description: Functions SQL para entrevistas e avaliações (validação, cálculo, logs)
-- Dependencies:
--   - 28-tabela-entrevistas-online.sql
--   - 29-tabela-entrevistas-presenciais.sql
--   - 30-tabela-avaliacoes-rh.sql
--   - 31-tabela-historico-acoes.sql
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- 1. FUNCTION: Calcular duração real da entrevista
-- Description: Calcula duracao_real_minutos baseado em data_inicio_real e data_fim_real
-- ============================================================================

CREATE OR REPLACE FUNCTION calcular_duracao_real_entrevista()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se ambas as datas estão preenchidas, calcula a duração em minutos
    IF NEW.data_inicio_real IS NOT NULL AND NEW.data_fim_real IS NOT NULL THEN
        NEW.duracao_real_minutos := EXTRACT(EPOCH FROM (NEW.data_fim_real - NEW.data_inicio_real)) / 60;

        -- Valida que data_fim_real > data_inicio_real
        IF NEW.duracao_real_minutos <= 0 THEN
            RAISE EXCEPTION 'data_fim_real deve ser posterior a data_inicio_real';
        END IF;
    ELSE
        -- Se uma das datas não está preenchida, limpa a duração
        NEW.duracao_real_minutos := NULL;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION calcular_duracao_real_entrevista IS 'Trigger function que calcula automaticamente duracao_real_minutos baseado em data_inicio_real e data_fim_real. Valida que data_fim > data_inicio.';


-- ============================================================================
-- 2. FUNCTION: Validar referência polimórfica de entrevista
-- Description: Valida que entrevista_id existe na tabela correta (online ou presencial)
-- ============================================================================

CREATE OR REPLACE FUNCTION validar_referencia_entrevista(
    p_tipo_entrevista tipo_entrevista_avaliacao,
    p_entrevista_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existe BOOLEAN;
BEGIN
    IF p_tipo_entrevista = 'online' THEN
        SELECT EXISTS (
            SELECT 1 FROM entrevistas_online
            WHERE id = p_entrevista_id
            AND deleted_at IS NULL
        ) INTO v_existe;
    ELSIF p_tipo_entrevista = 'presencial' THEN
        SELECT EXISTS (
            SELECT 1 FROM entrevistas_presenciais
            WHERE id = p_entrevista_id
            AND deleted_at IS NULL
        ) INTO v_existe;
    ELSE
        RETURN FALSE;
    END IF;

    RETURN v_existe;
END;
$$;

COMMENT ON FUNCTION validar_referencia_entrevista IS 'Valida que entrevista_id existe na tabela correta (entrevistas_online ou entrevistas_presenciais) baseado no tipo_entrevista. Retorna TRUE se válido.';


-- ============================================================================
-- 3. FUNCTION: Obter detalhes da entrevista (polimórfica)
-- Description: Retorna dados básicos da entrevista baseado no tipo e ID
-- ============================================================================

CREATE OR REPLACE FUNCTION obter_detalhes_entrevista(
    p_tipo_entrevista tipo_entrevista_avaliacao,
    p_entrevista_id UUID
)
RETURNS TABLE (
    entrevista_id UUID,
    candidatura_id UUID,
    data_agendada TIMESTAMPTZ,
    status status_entrevista,
    agendado_por UUID,
    realizado_por UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_tipo_entrevista = 'online' THEN
        RETURN QUERY
        SELECT
            eo.id,
            eo.candidatura_id,
            eo.data_agendada,
            eo.status,
            eo.agendado_por,
            eo.realizado_por
        FROM entrevistas_online eo
        WHERE eo.id = p_entrevista_id
        AND eo.deleted_at IS NULL;

    ELSIF p_tipo_entrevista = 'presencial' THEN
        RETURN QUERY
        SELECT
            ep.id,
            ep.candidatura_id,
            ep.data_agendada,
            ep.status,
            ep.agendado_por,
            ep.realizado_por
        FROM entrevistas_presenciais ep
        WHERE ep.id = p_entrevista_id
        AND ep.deleted_at IS NULL;
    END IF;
END;
$$;

COMMENT ON FUNCTION obter_detalhes_entrevista IS 'Retorna detalhes básicos de uma entrevista (online ou presencial) baseado no tipo_entrevista e entrevista_id. Abstrai a query polimórfica.';


-- ============================================================================
-- 4. TRIGGER FUNCTION: Registrar entrevista online agendada no histórico
-- Description: Registra automaticamente no histórico quando entrevista online é criada
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_log_entrevista_online_agendada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Registra ação no histórico apenas no INSERT
    PERFORM registrar_acao_historico(
        NEW.candidatura_id,
        'entrevista_online_agendada',
        format('Entrevista online agendada para %s às %s via %s',
            TO_CHAR(NEW.data_agendada, 'DD/MM/YYYY'),
            TO_CHAR(NEW.data_agendada, 'HH24:MI'),
            COALESCE(NEW.plataforma, 'plataforma não especificada')
        ),
        jsonb_build_object(
            'entrevista_id', NEW.id,
            'data_agendada', NEW.data_agendada,
            'plataforma', NEW.plataforma,
            'link_videochamada', NEW.link_videochamada,
            'duracao_estimada_minutos', NEW.duracao_estimada_minutos
        ),
        NEW.agendado_por
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_log_entrevista_online_agendada IS 'Trigger function que registra automaticamente no histórico quando entrevista online é agendada (INSERT).';


-- ============================================================================
-- 5. TRIGGER FUNCTION: Registrar entrevista presencial agendada no histórico
-- Description: Registra automaticamente no histórico quando entrevista presencial é criada
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_log_entrevista_presencial_agendada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Registra ação no histórico apenas no INSERT
    PERFORM registrar_acao_historico(
        NEW.candidatura_id,
        'entrevista_presencial_agendada',
        format('Entrevista presencial agendada para %s às %s em %s',
            TO_CHAR(NEW.data_agendada, 'DD/MM/YYYY'),
            TO_CHAR(NEW.data_agendada, 'HH24:MI'),
            NEW.local_entrevista
        ),
        jsonb_build_object(
            'entrevista_id', NEW.id,
            'data_agendada', NEW.data_agendada,
            'local_entrevista', NEW.local_entrevista,
            'sala_numero', NEW.sala_numero,
            'duracao_estimada_minutos', NEW.duracao_estimada_minutos
        ),
        NEW.agendado_por
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_log_entrevista_presencial_agendada IS 'Trigger function que registra automaticamente no histórico quando entrevista presencial é agendada (INSERT).';


-- ============================================================================
-- 6. TRIGGER FUNCTION: Registrar mudança de status de entrevista online
-- Description: Registra no histórico quando status da entrevista online muda
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_log_status_entrevista_online()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tipo_acao tipo_acao_historico;
    v_descricao TEXT;
BEGIN
    -- Apenas processa se o status mudou
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Define tipo de ação e descrição baseado no novo status
    CASE NEW.status
        WHEN 'concluida' THEN
            v_tipo_acao := 'entrevista_online_realizada';
            v_descricao := format('Entrevista online realizada. Duração: %s minutos',
                COALESCE(NEW.duracao_real_minutos::TEXT, 'não registrada'));
        WHEN 'cancelada' THEN
            v_tipo_acao := 'entrevista_online_cancelada';
            v_descricao := 'Entrevista online cancelada';
        ELSE
            -- Para outros status, não registra no histórico
            RETURN NEW;
    END CASE;

    -- Registra no histórico
    PERFORM registrar_acao_historico(
        NEW.candidatura_id,
        v_tipo_acao,
        v_descricao,
        jsonb_build_object(
            'entrevista_id', NEW.id,
            'status_anterior', OLD.status,
            'status_novo', NEW.status,
            'data_inicio_real', NEW.data_inicio_real,
            'data_fim_real', NEW.data_fim_real,
            'duracao_real_minutos', NEW.duracao_real_minutos
        ),
        NEW.realizado_por
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_log_status_entrevista_online IS 'Trigger function que registra no histórico quando status de entrevista online muda para concluida ou cancelada.';


-- ============================================================================
-- 7. TRIGGER FUNCTION: Registrar mudança de status de entrevista presencial
-- Description: Registra no histórico quando status da entrevista presencial muda
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_log_status_entrevista_presencial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tipo_acao tipo_acao_historico;
    v_descricao TEXT;
BEGIN
    -- Apenas processa se o status mudou
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Define tipo de ação e descrição baseado no novo status
    CASE NEW.status
        WHEN 'concluida' THEN
            v_tipo_acao := 'entrevista_presencial_realizada';
            v_descricao := format('Entrevista presencial realizada em %s. Duração: %s minutos',
                NEW.local_entrevista,
                COALESCE(NEW.duracao_real_minutos::TEXT, 'não registrada'));
        WHEN 'cancelada' THEN
            v_tipo_acao := 'entrevista_presencial_cancelada';
            v_descricao := 'Entrevista presencial cancelada';
        ELSE
            -- Para outros status, não registra no histórico
            RETURN NEW;
    END CASE;

    -- Registra no histórico
    PERFORM registrar_acao_historico(
        NEW.candidatura_id,
        v_tipo_acao,
        v_descricao,
        jsonb_build_object(
            'entrevista_id', NEW.id,
            'status_anterior', OLD.status,
            'status_novo', NEW.status,
            'data_inicio_real', NEW.data_inicio_real,
            'data_fim_real', NEW.data_fim_real,
            'duracao_real_minutos', NEW.duracao_real_minutos
        ),
        NEW.realizado_por
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_log_status_entrevista_presencial IS 'Trigger function que registra no histórico quando status de entrevista presencial muda para concluida ou cancelada.';


-- ============================================================================
-- 8. TRIGGER FUNCTION: Registrar avaliação adicionada no histórico
-- Description: Registra automaticamente no histórico quando avaliação RH é criada
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_log_avaliacao_adicionada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Registra ação no histórico apenas no INSERT
    PERFORM registrar_acao_historico(
        NEW.candidatura_id,
        'avaliacao_adicionada',
        format('Avaliação RH adicionada após entrevista %s. Score: %.1f | Recomendação: %s',
            NEW.tipo_entrevista,
            NEW.score_geral,
            NEW.recomendacao
        ),
        jsonb_build_object(
            'avaliacao_id', NEW.id,
            'tipo_entrevista', NEW.tipo_entrevista,
            'entrevista_id', NEW.entrevista_id,
            'score_geral', NEW.score_geral,
            'recomendacao', NEW.recomendacao,
            'adequacao_tecnica', NEW.adequacao_tecnica,
            'adequacao_cultural', NEW.adequacao_cultural
        ),
        NEW.avaliador_id
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_log_avaliacao_adicionada IS 'Trigger function que registra automaticamente no histórico quando avaliação RH é adicionada (INSERT).';


-- ============================================================================
-- 9. TRIGGER FUNCTION: Validar referência de entrevista em avaliação
-- Description: Valida que entrevista_id existe antes de inserir/atualizar avaliação
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_validar_entrevista_avaliacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Valida se a entrevista existe
    IF NOT validar_referencia_entrevista(NEW.tipo_entrevista, NEW.entrevista_id) THEN
        RAISE EXCEPTION 'Entrevista % do tipo % não encontrada ou foi deletada',
            NEW.entrevista_id, NEW.tipo_entrevista
            USING HINT = 'Verifique se o entrevista_id existe na tabela entrevistas_online ou entrevistas_presenciais conforme o tipo_entrevista.';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_validar_entrevista_avaliacao IS 'Trigger function que valida referência polimórfica de entrevista antes de inserir/atualizar avaliação RH.';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 32-functions-entrevistas-avaliacoes.sql executada com sucesso';
    RAISE NOTICE 'Functions criadas:';
    RAISE NOTICE '  - calcular_duracao_real_entrevista() → Calcula duracao_real_minutos automaticamente';
    RAISE NOTICE '  - validar_referencia_entrevista() → Valida entrevista_id polimórfica';
    RAISE NOTICE '  - obter_detalhes_entrevista() → Retorna dados da entrevista (abstração polimórfica)';
    RAISE NOTICE '  - trigger_log_entrevista_online_agendada() → Log histórico INSERT entrevista online';
    RAISE NOTICE '  - trigger_log_entrevista_presencial_agendada() → Log histórico INSERT entrevista presencial';
    RAISE NOTICE '  - trigger_log_status_entrevista_online() → Log histórico UPDATE status online';
    RAISE NOTICE '  - trigger_log_status_entrevista_presencial() → Log histórico UPDATE status presencial';
    RAISE NOTICE '  - trigger_log_avaliacao_adicionada() → Log histórico INSERT avaliação';
    RAISE NOTICE '  - trigger_validar_entrevista_avaliacao() → Valida referência antes INSERT/UPDATE avaliação';
    RAISE NOTICE 'Total: 9 functions para automação e integridade';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
