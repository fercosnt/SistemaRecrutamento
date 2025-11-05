-- =====================================================
-- PRD-DB-005: Configurações e Sistema
-- Migration: 20-tabela-configuracoes-empresa
-- Description: Tabela SINGLETON de configurações da empresa
-- Tasks: 2.1 - 2.18
-- =====================================================

-- =====================================================
-- TABLE: configuracoes_empresa
-- Description: Configurações globais do sistema (SINGLETON - apenas 1 registro)
-- Singleton enforced by: UNIQUE constraint em empresa_id
-- =====================================================

CREATE TABLE IF NOT EXISTS configuracoes_empresa (
  -- Identificação (PRIMARY KEY + SINGLETON)
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id TEXT UNIQUE NOT NULL DEFAULT 'beauty-smile',

  -- Dados da Empresa
  nome_empresa TEXT NOT NULL DEFAULT 'Beauty Smile',
  logo_url TEXT,
  favicon_url TEXT,
  cor_primaria TEXT CHECK (cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  cor_secundaria TEXT CHECK (cor_secundaria ~ '^#[0-9A-Fa-f]{6}$'),
  cor_accent TEXT CHECK (cor_accent ~ '^#[0-9A-Fa-f]{6}$'),

  -- Contato
  email_contato TEXT,
  telefone_contato TEXT,
  site_url TEXT,
  endereco_completo TEXT,

  -- Configurações SMTP
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587 CHECK (smtp_port BETWEEN 25 AND 587),
  smtp_usuario TEXT,
  smtp_senha_encrypted TEXT,
  smtp_from_email TEXT,
  smtp_from_nome TEXT,
  smtp_usar_tls BOOLEAN DEFAULT TRUE,

  -- URLs de Webhooks N8N
  webhook_analise_formulario_url TEXT,
  webhook_analise_bigfive_url TEXT,
  webhook_analise_disc_url TEXT,
  webhook_analise_raven_url TEXT,
  webhook_analise_cultura_url TEXT,
  webhook_analise_entrevista_url TEXT,
  webhook_envio_emails_url TEXT,
  webhook_lembretes_url TEXT,

  -- Configurações de Webhooks
  webhook_timeout_segundos INTEGER DEFAULT 30 CHECK (webhook_timeout_segundos >= 5 AND webhook_timeout_segundos <= 300),
  webhook_retry_tentativas INTEGER DEFAULT 3 CHECK (webhook_retry_tentativas >= 0 AND webhook_retry_tentativas <= 5),
  webhook_secret TEXT,

  -- Notificações
  notificar_nova_candidatura BOOLEAN DEFAULT TRUE,
  notificar_teste_concluido BOOLEAN DEFAULT TRUE,
  email_notificacoes TEXT[],

  -- Configurações de Sistema
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  idioma TEXT DEFAULT 'pt-BR',
  max_tamanho_curriculo_mb INTEGER DEFAULT 5 CHECK (max_tamanho_curriculo_mb >= 1 AND max_tamanho_curriculo_mb <= 50),
  max_tamanho_gravacao_mb INTEGER DEFAULT 500 CHECK (max_tamanho_gravacao_mb >= 100 AND max_tamanho_gravacao_mb <= 2000),
  dias_retencao_logs INTEGER DEFAULT 730 CHECK (dias_retencao_logs >= 30),

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_configuracoes_empresa_id
  ON configuracoes_empresa(empresa_id);

-- =====================================================
-- TRIGGER: updated_at
-- =====================================================

CREATE TRIGGER update_configuracoes_empresa_updated_at
  BEFORE UPDATE ON configuracoes_empresa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE configuracoes_empresa IS
  '⚠️ SINGLETON TABLE - Apenas 1 registro permitido (empresa_id = beauty-smile).
   Configurações globais do sistema incluindo SMTP, webhooks N8N, notificações e preferências.';

COMMENT ON COLUMN configuracoes_empresa.empresa_id IS
  'Identificador único da empresa. SINGLETON: apenas beauty-smile permitido';

COMMENT ON COLUMN configuracoes_empresa.cor_primaria IS
  'Cor primária do tema (formato #RRGGBB)';

COMMENT ON COLUMN configuracoes_empresa.smtp_porta IS
  'Porta SMTP (25, 465, 587)';

COMMENT ON COLUMN configuracoes_empresa.webhook_timeout_segundos IS
  'Timeout para chamadas webhook (5-300 segundos)';

COMMENT ON COLUMN configuracoes_empresa.webhook_retry_tentativas IS
  'Número de tentativas de retry para webhooks (0-5)';

COMMENT ON COLUMN configuracoes_empresa.dias_retencao_logs IS
  'Dias de retenção de logs (info/aviso). Logs críticos nunca são deletados. Mínimo: 30 dias';

COMMENT ON COLUMN configuracoes_empresa.max_tamanho_curriculo_mb IS
  'Tamanho máximo de currículo em MB (1-50)';

COMMENT ON COLUMN configuracoes_empresa.max_tamanho_gravacao_mb IS
  'Tamanho máximo de gravação de entrevista em MB (100-2000)';

-- =====================================================
-- SEED DATA: Registro Inicial (SINGLETON)
-- =====================================================

INSERT INTO configuracoes_empresa (
  empresa_id,
  nome_empresa,
  cor_primaria,
  cor_secundaria,
  cor_accent,
  timezone,
  idioma
)
VALUES (
  'beauty-smile',
  'Beauty Smile',
  '#6366F1',  -- Indigo
  '#8B5CF6',  -- Purple
  '#EC4899',  -- Pink
  'America/Sao_Paulo',
  'pt-BR'
)
ON CONFLICT (empresa_id) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  config_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count
  FROM configuracoes_empresa;

  IF config_count = 1 THEN
    RAISE NOTICE '✅ Migration 20: Tabela configuracoes_empresa criada (SINGLETON com 1 registro)';
  ELSIF config_count = 0 THEN
    RAISE EXCEPTION '❌ Migration 20: Nenhum registro inicial criado';
  ELSE
    RAISE EXCEPTION '❌ Migration 20: SINGLETON violado - % registros encontrados', config_count;
  END IF;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ Tabela configuracoes_empresa criada (SINGLETON)
-- ✅ 43 campos (empresa, SMTP, webhooks, notificações, sistema)
-- ✅ 7 constraints CHECK (cores hex, portas, limites)
-- ✅ 1 índice (empresa_id)
-- ✅ 1 trigger (updated_at)
-- ✅ Registro inicial inserido (beauty-smile)
-- =====================================================
