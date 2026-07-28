-- ============================================================================
-- Migration: 33-triggers-entrevistas-avaliacoes.sql
-- Description: Criação de triggers para automação de entrevistas e avaliações
-- Dependencies:
--   - 28-tabela-entrevistas-online.sql
--   - 29-tabela-entrevistas-presenciais.sql
--   - 30-tabela-avaliacoes-rh.sql
--   - 32-functions-entrevistas-avaliacoes.sql
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================


-- ============================================================================
-- 1. TRIGGERS: entrevistas_online
-- Description: Triggers para calcular duração e registrar ações no histórico
-- ============================================================================

-- 1.1 Trigger para calcular duração real (BEFORE INSERT/UPDATE)
DROP TRIGGER IF EXISTS before_save_entrevista_online_duracao ON entrevistas_online;

CREATE TRIGGER before_save_entrevista_online_duracao
    BEFORE INSERT OR UPDATE ON entrevistas_online
    FOR EACH ROW
    EXECUTE FUNCTION calcular_duracao_real_entrevista();

COMMENT ON TRIGGER before_save_entrevista_online_duracao ON entrevistas_online IS 'Trigger que calcula automaticamente duracao_real_minutos baseado em data_inicio_real e data_fim_real';


-- 1.2 Trigger para registrar agendamento no histórico (AFTER INSERT)
DROP TRIGGER IF EXISTS after_insert_entrevista_online_log ON entrevistas_online;

CREATE TRIGGER after_insert_entrevista_online_log
    AFTER INSERT ON entrevistas_online
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_entrevista_online_agendada();

COMMENT ON TRIGGER after_insert_entrevista_online_log ON entrevistas_online IS 'Trigger que registra automaticamente no histórico quando entrevista online é agendada';


-- 1.3 Trigger para registrar mudança de status no histórico (AFTER UPDATE)
DROP TRIGGER IF EXISTS after_update_entrevista_online_status ON entrevistas_online;

CREATE TRIGGER after_update_entrevista_online_status
    AFTER UPDATE ON entrevistas_online
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_status_entrevista_online();

COMMENT ON TRIGGER after_update_entrevista_online_status ON entrevistas_online IS 'Trigger que registra no histórico quando status de entrevista online muda para concluida ou cancelada';


-- ============================================================================
-- 2. TRIGGERS: entrevistas_presenciais
-- Description: Triggers para calcular duração e registrar ações no histórico
-- ============================================================================

-- 2.1 Trigger para calcular duração real (BEFORE INSERT/UPDATE)
DROP TRIGGER IF EXISTS before_save_entrevista_presencial_duracao ON entrevistas_presenciais;

CREATE TRIGGER before_save_entrevista_presencial_duracao
    BEFORE INSERT OR UPDATE ON entrevistas_presenciais
    FOR EACH ROW
    EXECUTE FUNCTION calcular_duracao_real_entrevista();

COMMENT ON TRIGGER before_save_entrevista_presencial_duracao ON entrevistas_presenciais IS 'Trigger que calcula automaticamente duracao_real_minutos baseado em data_inicio_real e data_fim_real';


-- 2.2 Trigger para registrar agendamento no histórico (AFTER INSERT)
DROP TRIGGER IF EXISTS after_insert_entrevista_presencial_log ON entrevistas_presenciais;

CREATE TRIGGER after_insert_entrevista_presencial_log
    AFTER INSERT ON entrevistas_presenciais
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_entrevista_presencial_agendada();

COMMENT ON TRIGGER after_insert_entrevista_presencial_log ON entrevistas_presenciais IS 'Trigger que registra automaticamente no histórico quando entrevista presencial é agendada';


-- 2.3 Trigger para registrar mudança de status no histórico (AFTER UPDATE)
DROP TRIGGER IF EXISTS after_update_entrevista_presencial_status ON entrevistas_presenciais;

CREATE TRIGGER after_update_entrevista_presencial_status
    AFTER UPDATE ON entrevistas_presenciais
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_status_entrevista_presencial();

COMMENT ON TRIGGER after_update_entrevista_presencial_status ON entrevistas_presenciais IS 'Trigger que registra no histórico quando status de entrevista presencial muda para concluida ou cancelada';


-- ============================================================================
-- 3. TRIGGERS: avaliacoes_rh
-- Description: Triggers para validar referência e registrar no histórico
-- ============================================================================

-- 3.1 Trigger para validar referência de entrevista (BEFORE INSERT/UPDATE)
DROP TRIGGER IF EXISTS before_save_avaliacao_validar_entrevista ON avaliacoes_rh;

CREATE TRIGGER before_save_avaliacao_validar_entrevista
    BEFORE INSERT OR UPDATE ON avaliacoes_rh
    FOR EACH ROW
    EXECUTE FUNCTION trigger_validar_entrevista_avaliacao();

COMMENT ON TRIGGER before_save_avaliacao_validar_entrevista ON avaliacoes_rh IS 'Trigger que valida se entrevista_id existe na tabela correta (online ou presencial) antes de salvar avaliação';


-- 3.2 Trigger para registrar avaliação no histórico (AFTER INSERT)
DROP TRIGGER IF EXISTS after_insert_avaliacao_log ON avaliacoes_rh;

CREATE TRIGGER after_insert_avaliacao_log
    AFTER INSERT ON avaliacoes_rh
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_avaliacao_adicionada();

COMMENT ON TRIGGER after_insert_avaliacao_log ON avaliacoes_rh IS 'Trigger que registra automaticamente no histórico quando avaliação RH é adicionada';


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 33-triggers-entrevistas-avaliacoes.sql executada com sucesso';
    RAISE NOTICE 'Triggers criados:';
    RAISE NOTICE '';
    RAISE NOTICE 'ENTREVISTAS_ONLINE (3 triggers):';
    RAISE NOTICE '  - before_save_entrevista_online_duracao → BEFORE INSERT/UPDATE (calcula duração)';
    RAISE NOTICE '  - after_insert_entrevista_online_log → AFTER INSERT (log histórico)';
    RAISE NOTICE '  - after_update_entrevista_online_status → AFTER UPDATE (log mudança status)';
    RAISE NOTICE '';
    RAISE NOTICE 'ENTREVISTAS_PRESENCIAIS (3 triggers):';
    RAISE NOTICE '  - before_save_entrevista_presencial_duracao → BEFORE INSERT/UPDATE (calcula duração)';
    RAISE NOTICE '  - after_insert_entrevista_presencial_log → AFTER INSERT (log histórico)';
    RAISE NOTICE '  - after_update_entrevista_presencial_status → AFTER UPDATE (log mudança status)';
    RAISE NOTICE '';
    RAISE NOTICE 'AVALIACOES_RH (2 triggers):';
    RAISE NOTICE '  - before_save_avaliacao_validar_entrevista → BEFORE INSERT/UPDATE (valida referência)';
    RAISE NOTICE '  - after_insert_avaliacao_log → AFTER INSERT (log histórico)';
    RAISE NOTICE '';
    RAISE NOTICE 'Total: 8 triggers para automação completa';
    RAISE NOTICE 'Integração com historico_acoes: Auditoria automática de todas as ações';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
