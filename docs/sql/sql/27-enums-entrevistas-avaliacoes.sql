-- ============================================================================
-- Migration: 27-enums-entrevistas-avaliacoes.sql
-- Description: Criação dos enums para entrevistas e avaliações
-- Dependencies: Nenhuma
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================

-- ============================================================================
-- 1. ENUM: status_entrevista
-- Description: Status das entrevistas (online e presenciais)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE status_entrevista AS ENUM (
        'agendada',       -- Entrevista agendada, aguardando realização
        'em_andamento',   -- Entrevista em andamento no momento
        'concluida',      -- Entrevista realizada e finalizada
        'cancelada',      -- Entrevista cancelada (por RH ou candidato)
        'reagendada',     -- Entrevista foi reagendada para outra data
        'nao_compareceu'  -- Candidato não compareceu na data agendada
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Comentários descritivos para status_entrevista
COMMENT ON TYPE status_entrevista IS 'Status possíveis para entrevistas online e presenciais';

-- Documentação detalhada de cada valor do enum
-- 'agendada': Entrevista foi agendada e está aguardando realização. É o status
--             inicial quando uma entrevista é criada. Candidato e RH já foram
--             notificados sobre data, hora e local/link.
--
-- 'em_andamento': Entrevista está sendo realizada no momento. Este status é
--                 definido quando a entrevista começa (data_inicio_real é registrada).
--
-- 'concluida': Entrevista foi realizada e finalizada com sucesso. Todas as
--              observações e feedback foram registrados. Este é um status final.
--
-- 'cancelada': Entrevista foi cancelada por algum motivo (por RH ou candidato).
--              Deve incluir justificativa no histórico. Este é um status final.
--
-- 'reagendada': Entrevista original foi reagendada para outra data/hora. Uma nova
--               entrevista é criada com status 'agendada'. Este é um status final.
--
-- 'nao_compareceu': Candidato não compareceu na entrevista agendada. RH registra
--                   a ausência. Este é um status final e pode impactar a candidatura.


-- ============================================================================
-- 2. ENUM: tipo_entrevista_avaliacao
-- Description: Tipo de entrevista para referência em avaliações
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE tipo_entrevista_avaliacao AS ENUM (
        'online',      -- Entrevista realizada remotamente (videochamada)
        'presencial'   -- Entrevista realizada presencialmente
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Comentários descritivos para tipo_entrevista_avaliacao
COMMENT ON TYPE tipo_entrevista_avaliacao IS 'Tipo de entrevista para referência em avaliações RH';

-- Documentação detalhada de cada valor do enum
-- 'online': Entrevista realizada remotamente via plataforma de videochamada
--           (Google Meet, Zoom, Teams, etc.). Pode incluir gravação e transcrição.
--
-- 'presencial': Entrevista realizada presencialmente nas instalações da empresa.
--               Inclui informações sobre local, sala e documentos apresentados.


-- ============================================================================
-- 3. ENUM: recomendacao_avaliacao
-- Description: Recomendação do avaliador após a entrevista
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE recomendacao_avaliacao AS ENUM (
        'aprovar',    -- Avaliador recomenda aprovação do candidato
        'rejeitar',   -- Avaliador recomenda rejeição do candidato
        'indeciso'    -- Avaliador está indeciso, precisa de mais informações
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Comentários descritivos para recomendacao_avaliacao
COMMENT ON TYPE recomendacao_avaliacao IS 'Recomendação do avaliador RH após entrevista';

-- Documentação detalhada de cada valor do enum
-- 'aprovar': Avaliador recomenda que o candidato avance para a próxima etapa
--            ou seja aprovado para a vaga. Indica avaliação positiva.
--
-- 'rejeitar': Avaliador recomenda que o candidato não avance no processo.
--             Indica que o candidato não atende aos requisitos ou critérios.
--
-- 'indeciso': Avaliador não tem certeza sobre a recomendação. Pode indicar
--             necessidade de entrevista adicional, consenso com outros avaliadores,
--             ou falta de informações para decisão definitiva.


-- ============================================================================
-- 4. ENUM: tipo_acao_historico
-- Description: Tipos de ações registradas no histórico de candidaturas
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE tipo_acao_historico AS ENUM (
        -- Ações de candidatura
        'candidatura_criada',
        'formulario_enviado',
        'formulario_aprovado',
        'formulario_reprovado',

        -- Ações de testes psicométricos
        'teste_bigfive_iniciado',
        'teste_bigfive_concluido',
        'teste_disc_iniciado',
        'teste_disc_concluido',
        'teste_raven_iniciado',
        'teste_raven_concluido',

        -- Ações de entrevistas
        'entrevista_online_agendada',
        'entrevista_online_realizada',
        'entrevista_online_cancelada',
        'entrevista_presencial_agendada',
        'entrevista_presencial_realizada',
        'entrevista_presencial_cancelada',

        -- Ações de avaliações
        'avaliacao_adicionada',
        'avaliacao_atualizada',

        -- Ações de decisão final
        'candidato_aprovado',
        'candidato_rejeitado',
        'etapa_avancada',
        'processo_finalizado'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Comentários descritivos para tipo_acao_historico
COMMENT ON TYPE tipo_acao_historico IS 'Tipos de ações registradas no histórico imutável de candidaturas para compliance e auditoria';

-- Documentação detalhada de valores principais do enum
-- CANDIDATURA:
-- 'candidatura_criada': Registro inicial quando candidato se candidata à vaga
-- 'formulario_enviado': Candidato completou e enviou o formulário de candidatura
-- 'formulario_aprovado': RH aprovou o formulário, candidato avança para testes
-- 'formulario_reprovado': RH reprovou o formulário, candidatura finalizada
--
-- TESTES PSICOMÉTRICOS:
-- 'teste_bigfive_iniciado/concluido': Candidato iniciou/completou teste Big Five (personalidade)
-- 'teste_disc_iniciado/concluido': Candidato iniciou/completou teste DISC (comportamento)
-- 'teste_raven_iniciado/concluido': Candidato iniciou/completou teste Raven (raciocínio)
--
-- ENTREVISTAS:
-- 'entrevista_online_agendada': RH agendou entrevista online com candidato
-- 'entrevista_online_realizada': Entrevista online foi realizada e concluída
-- 'entrevista_online_cancelada': Entrevista online foi cancelada
-- 'entrevista_presencial_agendada': RH agendou entrevista presencial
-- 'entrevista_presencial_realizada': Entrevista presencial foi realizada
-- 'entrevista_presencial_cancelada': Entrevista presencial foi cancelada
--
-- AVALIAÇÕES:
-- 'avaliacao_adicionada': Avaliador RH adicionou avaliação após entrevista
-- 'avaliacao_atualizada': Avaliador RH atualizou sua avaliação
--
-- DECISÃO FINAL:
-- 'candidato_aprovado': Candidato foi aprovado para a vaga
-- 'candidato_rejeitado': Candidato foi rejeitado (com justificativa)
-- 'etapa_avancada': Candidato avançou para próxima etapa do processo
-- 'processo_finalizado': Processo seletivo foi finalizado


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 27-enums-entrevistas-avaliacoes.sql executada com sucesso';
    RAISE NOTICE 'Enums criados:';
    RAISE NOTICE '  - status_entrevista (6 valores: agendada, em_andamento, concluida, cancelada, reagendada, nao_compareceu)';
    RAISE NOTICE '  - tipo_entrevista_avaliacao (2 valores: online, presencial)';
    RAISE NOTICE '  - recomendacao_avaliacao (3 valores: aprovar, rejeitar, indeciso)';
    RAISE NOTICE '  - tipo_acao_historico (22 valores: candidatura, testes, entrevistas, avaliações, decisão)';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
