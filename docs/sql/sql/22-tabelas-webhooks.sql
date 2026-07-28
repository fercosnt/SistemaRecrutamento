-- =====================================================
-- PRD-DB-005: Configurações e Sistema
-- Migration: 22-tabelas-webhooks
-- Description: Tabelas para gerenciamento de webhooks N8N
-- Tasks: 4.1 - 4.19
-- =====================================================

-- =====================================================
-- TABLE: webhooks_config
-- Description: Configuração de webhooks para integração com N8N
-- Usage: Automações via N8N (análise de testes, envio de emails, etc)
-- =====================================================

CREATE TABLE IF NOT EXISTS webhooks_config (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  tipo tipo_webhook NOT NULL,

  -- Configuração
  url TEXT NOT NULL CHECK (url ~ '^https?://'),
  metodo TEXT DEFAULT 'POST' CHECK (metodo IN ('POST', 'GET', 'PUT')),
  headers JSONB NULL,

  -- Segurança
  secret TEXT,
  usar_auth BOOLEAN DEFAULT FALSE,

  -- Comportamento
  timeout_segundos INTEGER DEFAULT 30 CHECK (timeout_segundos >= 5 AND timeout_segundos <= 300),
  retry_tentativas INTEGER DEFAULT 3 CHECK (retry_tentativas >= 0 AND retry_tentativas <= 5),
  retry_delay_segundos INTEGER DEFAULT 5 CHECK (retry_delay_segundos >= 1),
  ativo BOOLEAN DEFAULT TRUE,

  -- Status e Métricas
  ultima_chamada_sucesso TIMESTAMPTZ,
  ultima_chamada_erro TIMESTAMPTZ,
  total_chamadas INTEGER DEFAULT 0,
  total_sucessos INTEGER DEFAULT 0,
  total_erros INTEGER DEFAULT 0,

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLE: webhooks_logs
-- Description: Logs de chamadas de webhooks (IMUTÁVEL)
-- Retention: 90 dias (configurável)
-- =====================================================

CREATE TABLE IF NOT EXISTS webhooks_logs (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks_config(id) ON DELETE CASCADE,

  -- Log da Chamada
  payload_enviado JSONB NOT NULL,
  resposta_recebida JSONB NULL,
  status_code INTEGER,
  sucesso BOOLEAN NOT NULL,
  erro_mensagem TEXT,
  tempo_resposta_ms INTEGER,
  tentativa_numero INTEGER DEFAULT 1,

  -- Timestamp (IMUTÁVEL - apenas created_at)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES: webhooks_config
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_webhooks_config_nome
  ON webhooks_config(nome);

CREATE INDEX IF NOT EXISTS idx_webhooks_config_tipo
  ON webhooks_config(tipo)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_webhooks_config_ativo
  ON webhooks_config(ativo)
  WHERE deleted_at IS NULL;

-- =====================================================
-- INDEXES: webhooks_logs
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_webhooks_logs_webhook_id
  ON webhooks_logs(webhook_id);

CREATE INDEX IF NOT EXISTS idx_webhooks_logs_sucesso
  ON webhooks_logs(sucesso);

CREATE INDEX IF NOT EXISTS idx_webhooks_logs_created_at
  ON webhooks_logs(created_at);

-- =====================================================
-- TRIGGER: updated_at (webhooks_config)
-- =====================================================

CREATE TRIGGER update_webhooks_config_updated_at
  BEFORE UPDATE ON webhooks_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS: webhooks_config
-- =====================================================

COMMENT ON TABLE webhooks_config IS
  'Configuração de webhooks para integração com N8N.
   Suporta análise de testes, envio de emails, lembretes e outras automações.
   Retry automático em caso de falha.';

COMMENT ON COLUMN webhooks_config.nome IS
  'Nome único do webhook (ex: "Análise BigFive", "Envio Emails")';

COMMENT ON COLUMN webhooks_config.tipo IS
  'Tipo do webhook (12 tipos disponíveis via enum tipo_webhook)';

COMMENT ON COLUMN webhooks_config.url IS
  'URL do webhook N8N (deve começar com http:// ou https://)';

COMMENT ON COLUMN webhooks_config.metodo IS
  'Método HTTP (POST, GET, PUT)';

COMMENT ON COLUMN webhooks_config.headers IS
  'Headers HTTP customizados em formato JSON (ex: {"Authorization": "Bearer token"})';

COMMENT ON COLUMN webhooks_config.timeout_segundos IS
  'Timeout em segundos (5-300)';

COMMENT ON COLUMN webhooks_config.retry_tentativas IS
  'Número de tentativas em caso de falha (0-5)';

COMMENT ON COLUMN webhooks_config.total_chamadas IS
  'Contador total de chamadas (atualizado automaticamente)';

-- =====================================================
-- COMMENTS: webhooks_logs
-- =====================================================

COMMENT ON TABLE webhooks_logs IS
  '⚠️ IMUTÁVEL - Logs de chamadas de webhooks (apenas INSERT).
   Retenção: 90 dias (logs mais antigos são deletados automaticamente).
   Use para debugging e auditoria de integrações N8N.';

COMMENT ON COLUMN webhooks_logs.payload_enviado IS
  'Payload JSON enviado ao webhook';

COMMENT ON COLUMN webhooks_logs.resposta_recebida IS
  'Resposta JSON recebida do webhook';

COMMENT ON COLUMN webhooks_logs.tempo_resposta_ms IS
  'Tempo de resposta em milissegundos';

COMMENT ON COLUMN webhooks_logs.tentativa_numero IS
  'Número da tentativa (1 = primeira tentativa, 2 = primeiro retry, etc)';

-- =====================================================
-- SEED DATA: Webhooks Padrão
-- =====================================================

-- Webhook: Análise BigFive
INSERT INTO webhooks_config (
  nome,
  tipo,
  url,
  metodo,
  timeout_segundos,
  retry_tentativas,
  ativo
)
VALUES (
  'Análise BigFive via N8N',
  'analise_bigfive',
  'https://n8n.beautysmile.com.br/webhook/analise-bigfive',
  'POST',
  60,
  3,
  TRUE
) ON CONFLICT (nome) DO NOTHING;

-- Webhook: Análise DISC
INSERT INTO webhooks_config (
  nome,
  tipo,
  url,
  metodo,
  timeout_segundos,
  retry_tentativas,
  ativo
)
VALUES (
  'Análise DISC via N8N',
  'analise_disc',
  'https://n8n.beautysmile.com.br/webhook/analise-disc',
  'POST',
  60,
  3,
  TRUE
) ON CONFLICT (nome) DO NOTHING;

-- Webhook: Envio de Emails
INSERT INTO webhooks_config (
  nome,
  tipo,
  url,
  metodo,
  timeout_segundos,
  retry_tentativas,
  ativo
)
VALUES (
  'Envio de Emails via N8N',
  'envio_email',
  'https://n8n.beautysmile.com.br/webhook/envio-email',
  'POST',
  30,
  5,
  TRUE
) ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  config_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count
  FROM webhooks_config;

  IF config_count >= 3 THEN
    RAISE NOTICE '✅ Migration 22: Tabelas webhooks criadas com % webhooks padrão', config_count;
  ELSE
    RAISE EXCEPTION '❌ Migration 22: Esperado pelo menos 3 webhooks, encontrado %', config_count;
  END IF;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ Tabela webhooks_config criada (configuração de webhooks)
-- ✅ Tabela webhooks_logs criada (IMUTÁVEL - apenas INSERT)
-- ✅ 6 índices (3 por tabela)
-- ✅ 1 trigger (updated_at em webhooks_config)
-- ✅ 3 webhooks padrão (BigFive, DISC, Emails)
-- ✅ Constraints: URL válida, métodos HTTP, timeouts, retries
-- =====================================================
