-- =====================================================
-- PRD-DB-005: Configurações e Sistema
-- Migration: 25-functions-configuracoes
-- Description: Functions auxiliares para configurações e auditoria
-- Tasks: 7.1 - 7.21
-- =====================================================

-- =====================================================
-- FUNCTION: get_configuracoes()
-- Description: Retorna configurações da empresa (SINGLETON)
-- Returns: Record de configuracoes_empresa
-- Usage: SELECT * FROM get_configuracoes();
-- =====================================================

CREATE OR REPLACE FUNCTION get_configuracoes()
RETURNS SETOF configuracoes_empresa
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config configuracoes_empresa;
BEGIN
  -- Buscar configuração existente
  SELECT * INTO v_config
  FROM configuracoes_empresa
  WHERE empresa_id = 'beauty-smile'
  LIMIT 1;

  -- Se não existir, criar registro padrão
  IF NOT FOUND THEN
    INSERT INTO configuracoes_empresa (
      empresa_id,
      nome_empresa,
      timezone,
      idioma
    )
    VALUES (
      'beauty-smile',
      'Beauty Smile',
      'America/Sao_Paulo',
      'pt-BR'
    )
    RETURNING * INTO v_config;
  END IF;

  RETURN NEXT v_config;
END;
$$;

COMMENT ON FUNCTION get_configuracoes() IS
  'Retorna configurações da empresa (SINGLETON).
   Se não existir, cria registro padrão automaticamente.
   Uso: SELECT * FROM get_configuracoes();';

-- =====================================================
-- FUNCTION: log_auditoria()
-- Description: Cria log de auditoria
-- Returns: UUID do log criado
-- Usage: SELECT log_auditoria(...)
-- =====================================================

CREATE OR REPLACE FUNCTION log_auditoria(
  p_usuario_id UUID DEFAULT NULL,
  p_usuario_tipo TEXT DEFAULT NULL,
  p_acao TEXT DEFAULT NULL,
  p_categoria categoria_log_auditoria DEFAULT 'sistema',
  p_descricao TEXT DEFAULT '',
  p_severidade severidade_log DEFAULT 'info',
  p_recurso_tipo TEXT DEFAULT NULL,
  p_recurso_id UUID DEFAULT NULL,
  p_dados_antes JSONB DEFAULT NULL,
  p_dados_depois JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_sucesso BOOLEAN DEFAULT TRUE,
  p_erro_mensagem TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO logs_auditoria (
    usuario_id,
    usuario_tipo,
    acao,
    categoria,
    descricao,
    severidade,
    recurso_tipo,
    recurso_id,
    dados_antes,
    dados_depois,
    ip_address,
    sucesso,
    erro_mensagem
  )
  VALUES (
    p_usuario_id,
    p_usuario_tipo,
    COALESCE(p_acao, 'unknown'),
    p_categoria,
    p_descricao,
    p_severidade,
    p_recurso_tipo,
    p_recurso_id,
    p_dados_antes,
    p_dados_depois,
    p_ip_address,
    p_sucesso,
    p_erro_mensagem
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_auditoria IS
  'Cria log de auditoria para compliance LGPD.
   Exemplo: SELECT log_auditoria(
     p_usuario_id := (SELECT auth.uid()),
     p_usuario_tipo := ''rh'',
     p_acao := ''criar_vaga'',
     p_categoria := ''vaga'',
     p_descricao := ''Criou vaga de Desenvolvedor Frontend'',
     p_recurso_tipo := ''vaga'',
     p_recurso_id := <vaga_id>
   );';

-- =====================================================
-- FUNCTION: limpar_logs_antigos()
-- Description: Deleta logs antigos (info/aviso apenas)
-- Returns: Número de logs deletados
-- Usage: SELECT limpar_logs_antigos(); (executar via cron job)
-- =====================================================

CREATE OR REPLACE FUNCTION limpar_logs_antigos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias_retencao INTEGER;
  v_data_limite TIMESTAMPTZ;
  v_logs_deletados INTEGER;
BEGIN
  -- Buscar dias de retenção das configurações (padrão: 730 dias = 2 anos)
  SELECT COALESCE(dias_retencao_logs, 730) INTO v_dias_retencao
  FROM configuracoes_empresa
  WHERE empresa_id = 'beauty-smile'
  LIMIT 1;

  -- Calcular data limite
  v_data_limite := NOW() - (v_dias_retencao || ' days')::INTERVAL;

  -- Deletar apenas logs de severidade 'info' e 'aviso' mais antigos que a data limite
  -- Logs de 'erro' e 'critico' NUNCA são deletados
  DELETE FROM logs_auditoria
  WHERE created_at < v_data_limite
    AND severidade IN ('info', 'aviso');

  GET DIAGNOSTICS v_logs_deletados = ROW_COUNT;

  -- Registrar limpeza
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
    'limpeza_logs',
    'sistema',
    format('Limpeza automática de logs: %s logs deletados (> %s dias)', v_logs_deletados, v_dias_retencao),
    'info',
    TRUE
  );

  RETURN v_logs_deletados;
END;
$$;

COMMENT ON FUNCTION limpar_logs_antigos() IS
  'Deleta logs de auditoria antigos (apenas info/aviso).
   Logs de erro e crítico NUNCA são deletados.
   Usa dias_retencao_logs das configurações (padrão: 730 dias = 2 anos).
   Executar via cron job diário.
   Retorna número de logs deletados.';

-- =====================================================
-- FUNCTION: testar_webhook()
-- Description: Simula teste de webhook (chamada HTTP real no backend/N8N)
-- Returns: JSONB com resultado da simulação
-- Usage: SELECT testar_webhook(<webhook_id>);
-- =====================================================

CREATE OR REPLACE FUNCTION testar_webhook(webhook_config_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook webhooks_config;
  v_resultado JSONB;
BEGIN
  -- Buscar configuração do webhook
  SELECT * INTO v_webhook
  FROM webhooks_config
  WHERE id = webhook_config_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'sucesso', FALSE,
      'erro', 'Webhook não encontrado ou foi deletado',
      'webhook_id', webhook_config_id
    );
  END IF;

  -- Se webhook está inativo
  IF v_webhook.ativo = FALSE THEN
    RETURN jsonb_build_object(
      'sucesso', FALSE,
      'erro', 'Webhook está inativo',
      'webhook_id', webhook_config_id,
      'nome', v_webhook.nome
    );
  END IF;

  -- Construir payload de teste
  v_resultado := jsonb_build_object(
    'sucesso', TRUE,
    'mensagem', 'Simulação de teste - chamada HTTP real deve ser implementada no backend/N8N',
    'webhook_id', v_webhook.id,
    'nome', v_webhook.nome,
    'tipo', v_webhook.tipo,
    'url', v_webhook.url,
    'metodo', v_webhook.metodo,
    'timeout_segundos', v_webhook.timeout_segundos,
    'retry_tentativas', v_webhook.retry_tentativas,
    'payload_teste', jsonb_build_object(
      'test', TRUE,
      'timestamp', NOW(),
      'message', 'Este é um payload de teste'
    )
  );

  -- Registrar teste no log de auditoria
  PERFORM log_auditoria(
    p_usuario_tipo := 'sistema',
    p_acao := 'teste_webhook',
    p_categoria := 'sistema',
    p_descricao := format('Teste de webhook: %s (%s)', v_webhook.nome, v_webhook.tipo),
    p_recurso_tipo := 'webhook',
    p_recurso_id := v_webhook.id,
    p_sucesso := TRUE
  );

  RETURN v_resultado;
END;
$$;

COMMENT ON FUNCTION testar_webhook IS
  'Simula teste de webhook (retorna configuração).
   ⚠️ Chamada HTTP real deve ser implementada no backend/N8N.
   Esta function apenas valida configuração e retorna payload de teste.
   Uso: SELECT testar_webhook(<webhook_uuid>);';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  functions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO functions_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('get_configuracoes', 'log_auditoria', 'limpar_logs_antigos', 'testar_webhook');

  IF functions_count = 4 THEN
    RAISE NOTICE '✅ Migration 25: 4 functions criadas com sucesso';
  ELSE
    RAISE WARNING '⚠️ Migration 25: Esperado 4 functions, encontrado %', functions_count;
  END IF;
END $$;

-- =====================================================
-- MANUAL TESTS (comentados - executar manualmente se necessário)
-- =====================================================

-- Test 1: get_configuracoes()
-- SELECT * FROM get_configuracoes();

-- Test 2: log_auditoria()
-- SELECT log_auditoria(
--   p_usuario_tipo := 'sistema',
--   p_acao := 'teste_log',
--   p_categoria := 'sistema',
--   p_descricao := 'Teste da function log_auditoria',
--   p_severidade := 'info'
-- );

-- Test 3: limpar_logs_antigos()
-- SELECT limpar_logs_antigos();

-- Test 4: testar_webhook()
-- SELECT testar_webhook(<webhook_uuid>);

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ get_configuracoes() - Retorna singleton, cria se não existe
-- ✅ log_auditoria() - Cria log de auditoria
-- ✅ limpar_logs_antigos() - Deleta logs antigos (info/aviso)
-- ✅ testar_webhook() - Simula teste de webhook
-- ✅ Todas functions com SECURITY DEFINER e search_path
-- ✅ Comentários descritivos em todas functions
-- =====================================================
