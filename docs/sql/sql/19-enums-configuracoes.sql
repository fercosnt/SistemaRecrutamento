-- =====================================================
-- PRD-DB-005: Configurações e Sistema
-- Migration: 19-enums-configuracoes
-- Description: Criação dos 4 enums necessários para configurações
-- Tasks: 1.1 - 1.9
-- =====================================================

-- =====================================================
-- ENUM: tipo_template_email
-- Description: Tipos de templates de email disponíveis no sistema
-- Values: 15 tipos cobrindo toda jornada do candidato
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_template_email') THEN
    CREATE TYPE tipo_template_email AS ENUM (
      'boas_vindas_candidato',          -- Email inicial de boas-vindas após cadastro
      'confirmacao_candidatura',        -- Confirmação de candidatura a uma vaga
      'convite_bigfive',                -- Convite para fazer teste Big Five
      'convite_disc',                   -- Convite para fazer teste DISC
      'convite_raven',                  -- Convite para fazer teste Raven
      'convite_cultura',                -- Convite para fazer teste de Cultura Organizacional
      'convite_entrevista_online',      -- Convite para entrevista online
      'convite_entrevista_presencial',  -- Convite para entrevista presencial
      'lembrete_teste',                 -- Lembrete de teste pendente
      'lembrete_entrevista',            -- Lembrete de entrevista agendada
      'aprovado_proxima_etapa',         -- Aprovado para próxima etapa
      'aprovado_final',                 -- Aprovado final - oferta de emprego
      'rejeitado',                      -- Candidatura não aprovada
      'feedback_positivo',              -- Feedback positivo geral
      'recuperacao_senha'               -- Email de recuperação de senha
    );

    COMMENT ON TYPE tipo_template_email IS
      'Tipos de templates de email disponíveis. Total: 15 tipos cobrindo toda jornada do candidato';
  END IF;
END $$;

-- =====================================================
-- ENUM: tipo_webhook
-- Description: Tipos de webhooks para integração N8N
-- Values: 12 tipos de eventos/automações
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_webhook') THEN
    CREATE TYPE tipo_webhook AS ENUM (
      'analise_formulario',             -- Webhook para análise de formulário de candidatura
      'analise_bigfive',                -- Webhook para análise de teste Big Five
      'analise_disc',                   -- Webhook para análise de teste DISC
      'analise_raven',                  -- Webhook para análise de teste Raven
      'analise_cultura',                -- Webhook para análise de teste de Cultura
      'analise_entrevista',             -- Webhook para análise de entrevista (transcrição)
      'envio_email',                    -- Webhook para disparo de emails
      'lembretes',                      -- Webhook para envio de lembretes automáticos
      'notificacao_nova_candidatura',   -- Webhook notificando nova candidatura
      'notificacao_teste_concluido',    -- Webhook notificando teste concluído
      'backup',                         -- Webhook para rotinas de backup
      'outro'                           -- Outros tipos de webhooks customizados
    );

    COMMENT ON TYPE tipo_webhook IS
      'Tipos de webhooks N8N disponíveis. Total: 12 tipos para integrações e automações';
  END IF;
END $$;

-- =====================================================
-- ENUM: categoria_log_auditoria
-- Description: Categorias de logs para auditoria LGPD
-- Values: 10 categorias principais
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_log_auditoria') THEN
    CREATE TYPE categoria_log_auditoria AS ENUM (
      'autenticacao',                   -- Logs de login, logout, recuperação de senha
      'candidatura',                    -- Logs de candidaturas (criação, atualização, remoção)
      'vaga',                           -- Logs de vagas (CRUD)
      'usuario',                        -- Logs de usuários RH (CRUD, permissões)
      'configuracao',                   -- Logs de alterações em configurações do sistema
      'teste',                          -- Logs de testes psicométricos (criação, conclusão)
      'entrevista',                     -- Logs de entrevistas (agendamento, conclusão)
      'avaliacao',                      -- Logs de avaliações RH
      'sistema',                        -- Logs de eventos do sistema (cron jobs, backups)
      'seguranca'                       -- Logs de eventos de segurança (tentativas de acesso negadas)
    );

    COMMENT ON TYPE categoria_log_auditoria IS
      'Categorias de logs de auditoria para compliance LGPD. Total: 10 categorias';
  END IF;
END $$;

-- =====================================================
-- ENUM: severidade_log
-- Description: Níveis de severidade de logs
-- Values: 4 níveis (info, aviso, erro, critico)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severidade_log') THEN
    CREATE TYPE severidade_log AS ENUM (
      'info',                           -- Informativo - operação normal
      'aviso',                          -- Aviso - atenção necessária mas não crítico
      'erro',                           -- Erro - operação falhou mas sistema continua
      'critico'                         -- Crítico - requer ação imediata, pode afetar sistema
    );

    COMMENT ON TYPE severidade_log IS
      'Níveis de severidade de logs. Info/Aviso: retidos 2 anos. Erro/Crítico: retidos indefinidamente';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verificar que todos os enums foram criados
DO $$
DECLARE
  enum_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO enum_count
  FROM pg_type
  WHERE typname IN ('tipo_template_email', 'tipo_webhook', 'categoria_log_auditoria', 'severidade_log');

  IF enum_count = 4 THEN
    RAISE NOTICE '✅ Migration 19: Todos os 4 enums criados com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Migration 19: Esperado 4 enums, encontrado %', enum_count;
  END IF;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ tipo_template_email: 15 valores
-- ✅ tipo_webhook: 12 valores
-- ✅ categoria_log_auditoria: 10 valores
-- ✅ severidade_log: 4 valores
-- TOTAL: 4 enums, 41 valores
-- =====================================================
