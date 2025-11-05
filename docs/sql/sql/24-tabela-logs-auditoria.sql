-- =====================================================
-- PRD-DB-005: Configurações e Sistema
-- Migration: 24-tabela-logs-auditoria
-- Description: Tabela IMUTÁVEL de logs de auditoria (compliance LGPD)
-- Tasks: 6.1 - 6.11
-- =====================================================

-- =====================================================
-- TABLE: logs_auditoria
-- Description: Logs detalhados de auditoria (IMUTÁVEL - apenas INSERT)
-- Compliance: LGPD - retenção de 2 anos (info/aviso), indefinido (erro/crítico)
-- =====================================================

CREATE TABLE IF NOT EXISTS logs_auditoria (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificação do Usuário
  usuario_id UUID NULL,  -- Pode ser NULL para ações do sistema
  usuario_tipo TEXT NULL CHECK (usuario_tipo IN ('candidato', 'rh', 'admin', 'sistema')),

  -- Ação Realizada
  acao TEXT NOT NULL,
  categoria categoria_log_auditoria NOT NULL,
  descricao TEXT NOT NULL,
  severidade severidade_log NOT NULL DEFAULT 'info',

  -- Contexto da Ação
  recurso_tipo TEXT NULL,  -- Tipo de recurso afetado (ex: 'candidatura', 'vaga', 'usuario')
  recurso_id UUID NULL,     -- ID do recurso afetado
  dados_antes JSONB NULL,   -- Estado antes da ação (para UPDATEs)
  dados_depois JSONB NULL,  -- Estado depois da ação (para INSERTs/UPDATEs)

  -- Metadata Técnica
  ip_address INET NULL,
  user_agent TEXT NULL,
  sessao_id UUID NULL,
  duracao_ms INTEGER NULL,  -- Duração da operação em milissegundos

  -- Status da Operação
  sucesso BOOLEAN DEFAULT TRUE,
  erro_mensagem TEXT NULL,

  -- Timestamp (IMUTÁVEL - apenas created_at)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_usuario_id
  ON logs_auditoria(usuario_id);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_acao
  ON logs_auditoria(acao);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_categoria
  ON logs_auditoria(categoria);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_created_at
  ON logs_auditoria(created_at);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_ip_address
  ON logs_auditoria(ip_address);

-- Índice composto para queries por recurso
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_recurso
  ON logs_auditoria(recurso_tipo, recurso_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE logs_auditoria IS
  '⚠️ IMUTÁVEL - Apenas INSERT permitido (sem UPDATE ou DELETE).
   Logs de auditoria para compliance LGPD.
   Retenção: 2 anos para info/aviso, indefinido para erro/crítico.
   Logs críticos NUNCA são deletados.';

COMMENT ON COLUMN logs_auditoria.usuario_id IS
  'ID do usuário que realizou a ação (NULL para ações do sistema)';

COMMENT ON COLUMN logs_auditoria.usuario_tipo IS
  'Tipo de usuário: candidato, rh, admin, sistema';

COMMENT ON COLUMN logs_auditoria.acao IS
  'Ação realizada (ex: "login", "criar_candidatura", "atualizar_vaga")';

COMMENT ON COLUMN logs_auditoria.categoria IS
  'Categoria do log (10 categorias disponíveis via enum categoria_log_auditoria)';

COMMENT ON COLUMN logs_auditoria.severidade IS
  'Severidade: info, aviso, erro, critico';

COMMENT ON COLUMN logs_auditoria.recurso_tipo IS
  'Tipo de recurso afetado (ex: "candidatura", "vaga", "usuario", "teste")';

COMMENT ON COLUMN logs_auditoria.recurso_id IS
  'ID do recurso afetado (UUID)';

COMMENT ON COLUMN logs_auditoria.dados_antes IS
  'Estado do recurso antes da ação (JSON) - usado em UPDATEs';

COMMENT ON COLUMN logs_auditoria.dados_depois IS
  'Estado do recurso depois da ação (JSON) - usado em INSERTs/UPDATEs';

COMMENT ON COLUMN logs_auditoria.ip_address IS
  'Endereço IP de origem da requisição';

COMMENT ON COLUMN logs_auditoria.duracao_ms IS
  'Duração da operação em milissegundos';

COMMENT ON COLUMN logs_auditoria.sucesso IS
  'Se TRUE, operação bem-sucedida. Se FALSE, operação falhou.';

-- =====================================================
-- SEED DATA: Log Inicial
-- =====================================================

INSERT INTO logs_auditoria (
  usuario_tipo,
  acao,
  categoria,
  descricao,
  severidade,
  sucesso
)
VALUES (
  'sistema',
  'migration_logs_auditoria',
  'sistema',
  'Tabela logs_auditoria criada e inicializada',
  'info',
  TRUE
);

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  logs_count INTEGER;
  indices_count INTEGER;
BEGIN
  -- Verificar que a tabela foi criada
  SELECT COUNT(*) INTO logs_count
  FROM logs_auditoria;

  IF logs_count < 1 THEN
    RAISE EXCEPTION '❌ Migration 24: Nenhum log inicial criado';
  END IF;

  -- Verificar índices
  SELECT COUNT(*) INTO indices_count
  FROM pg_indexes
  WHERE tablename = 'logs_auditoria';

  IF indices_count < 6 THEN
    RAISE WARNING '⚠️ Migration 24: Esperado 6 índices, encontrado %', indices_count;
  END IF;

  RAISE NOTICE '✅ Migration 24: Tabela logs_auditoria criada (IMUTÁVEL) com % índices', indices_count;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ Tabela logs_auditoria criada (IMUTÁVEL - apenas INSERT)
-- ✅ 6 índices (usuario_id, acao, categoria, created_at, ip_address, composto recurso)
-- ✅ Compliance LGPD: retenção 2 anos (info/aviso), indefinido (erro/crítico)
-- ✅ 1 log inicial inserido
-- ⚠️ SEM triggers de updated_at (tabela imutável)
-- ⚠️ RLS policies serão criadas em Task 9.0
-- =====================================================
