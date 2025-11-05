-- =====================================================
-- PRD-DB-005: Configurações e Sistema
-- Migration: 27-views-configuracoes
-- Description: Views analíticas para webhooks e biblioteca
-- Tasks: 8.8 - 8.13
-- =====================================================

-- =====================================================
-- VIEW: v_estatisticas_webhooks
-- Description: Estatísticas agregadas de webhooks
-- Usage: SELECT * FROM v_estatisticas_webhooks;
-- =====================================================

CREATE OR REPLACE VIEW v_estatisticas_webhooks AS
SELECT
  wc.id AS webhook_id,
  wc.nome,
  wc.tipo,
  wc.url,
  wc.ativo,

  -- Estatísticas gerais
  wc.total_chamadas,
  wc.total_sucessos,
  wc.total_erros,

  -- Taxa de sucesso (percentual)
  CASE
    WHEN wc.total_chamadas > 0 THEN
      ROUND((wc.total_sucessos::NUMERIC / wc.total_chamadas::NUMERIC) * 100, 2)
    ELSE 0
  END AS taxa_sucesso_percentual,

  -- Datas de última chamada
  wc.ultima_chamada_sucesso,
  wc.ultima_chamada_erro,

  -- Estatísticas das últimas 24h
  COUNT(CASE WHEN wl.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS chamadas_ultimas_24h,
  COUNT(CASE WHEN wl.created_at >= NOW() - INTERVAL '24 hours' AND wl.sucesso = TRUE THEN 1 END) AS sucessos_ultimas_24h,
  COUNT(CASE WHEN wl.created_at >= NOW() - INTERVAL '24 hours' AND wl.sucesso = FALSE THEN 1 END) AS erros_ultimas_24h,

  -- Tempo médio de resposta (últimas 24h)
  AVG(CASE WHEN wl.created_at >= NOW() - INTERVAL '24 hours' THEN wl.tempo_resposta_ms END) AS tempo_medio_resposta_ms_24h,

  -- Metadata
  wc.created_at AS criado_em,
  wc.updated_at AS atualizado_em
FROM webhooks_config wc
LEFT JOIN webhooks_logs wl ON wl.webhook_id = wc.id
WHERE wc.deleted_at IS NULL
GROUP BY
  wc.id,
  wc.nome,
  wc.tipo,
  wc.url,
  wc.ativo,
  wc.total_chamadas,
  wc.total_sucessos,
  wc.total_erros,
  wc.ultima_chamada_sucesso,
  wc.ultima_chamada_erro,
  wc.created_at,
  wc.updated_at;

COMMENT ON VIEW v_estatisticas_webhooks IS
  'View analítica de webhooks com métricas agregadas.
   Inclui taxa de sucesso, estatísticas das últimas 24h e tempo médio de resposta.
   Use para dashboards e monitoramento de integrações N8N.';

-- =====================================================
-- VIEW: v_biblioteca_mais_usadas
-- Description: TOP 50 perguntas mais usadas da biblioteca
-- Usage: SELECT * FROM v_biblioteca_mais_usadas;
-- =====================================================

CREATE OR REPLACE VIEW v_biblioteca_mais_usadas AS
SELECT
  bp.id,
  bp.titulo,
  bp.texto_pergunta,
  bp.tipo_resposta,
  bp.categoria,
  bp.tags,
  bp.total_usos,
  bp.ultima_utilizacao,
  bp.is_publica,

  -- Informações do criador
  rh.nome_completo AS criado_por_nome,
  rh.cargo AS criado_por_cargo,

  -- Metadata
  bp.created_at AS criada_em
FROM biblioteca_perguntas bp
LEFT JOIN usuarios_rh rh ON rh.id = bp.criado_por_usuario
WHERE bp.deleted_at IS NULL
ORDER BY bp.total_usos DESC, bp.ultima_utilizacao DESC
LIMIT 50;

COMMENT ON VIEW v_biblioteca_mais_usadas IS
  'TOP 50 perguntas mais usadas da biblioteca.
   Ordenadas por total_usos DESC e ultima_utilizacao DESC.
   Inclui informações do criador (nome e cargo do RH).
   Use para dashboards e recomendações de perguntas.';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  views_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO views_count
  FROM pg_views
  WHERE schemaname = 'public'
    AND viewname IN ('v_estatisticas_webhooks', 'v_biblioteca_mais_usadas');

  IF views_count = 2 THEN
    RAISE NOTICE '✅ Migration 27: 2 views criadas com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Migration 27: Esperado 2 views, encontrado %', views_count;
  END IF;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ View v_estatisticas_webhooks criada (métricas de webhooks)
-- ✅ View v_biblioteca_mais_usadas criada (TOP 50 perguntas)
-- ✅ Ambas views filtram deleted_at IS NULL
-- ✅ Views prontas para dashboards e relatórios
-- =====================================================
