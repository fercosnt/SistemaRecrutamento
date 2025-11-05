-- ==============================================
-- 09 - Views Auxiliares
-- PRD-DB-001: Estrutura de Autenticação e Usuários
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- VIEW: v_candidatos_ativos
-- Retorna apenas candidatos não deletados (soft delete)
-- ==============================================

CREATE OR REPLACE VIEW v_candidatos_ativos AS
SELECT *
FROM candidatos
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

COMMENT ON VIEW v_candidatos_ativos IS 'Candidatos ativos (não deletados)';

-- ==============================================
-- VIEW: v_usuarios_rh_ativos
-- Retorna apenas usuários RH não deletados (soft delete)
-- ==============================================

CREATE OR REPLACE VIEW v_usuarios_rh_ativos AS
SELECT *
FROM usuarios_rh
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

COMMENT ON VIEW v_usuarios_rh_ativos IS 'Usuários RH ativos (não deletados)';

-- ==============================================
-- VIEW: v_sessoes_ativas_validas
-- Retorna apenas sessões ativas, não revogadas e não expiradas
-- ==============================================

CREATE OR REPLACE VIEW v_sessoes_ativas_validas AS
SELECT *
FROM sessoes_ativas
WHERE ativo = TRUE
  AND revogado = FALSE
  AND expires_at > NOW()
ORDER BY last_activity DESC;

COMMENT ON VIEW v_sessoes_ativas_validas IS 'Sessões válidas (ativas, não revogadas, não expiradas)';

-- ==============================================
-- VIEW: v_ultimos_acessos
-- Retorna logs de acesso dos últimos 30 dias
-- ==============================================

CREATE OR REPLACE VIEW v_ultimos_acessos AS
SELECT *
FROM logs_acesso
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

COMMENT ON VIEW v_ultimos_acessos IS 'Logs de acesso dos últimos 30 dias';

-- ==============================================
-- VIEW: v_candidatos_resumo
-- Resumo estatístico de candidatos por estado
-- ==============================================

CREATE OR REPLACE VIEW v_candidatos_resumo AS
SELECT
    estado,
    COUNT(*) as total_candidatos,
    COUNT(*) FILTER (WHERE ativo = TRUE) as ativos,
    COUNT(*) FILTER (WHERE bloqueado = TRUE) as bloqueados,
    COUNT(*) FILTER (WHERE email_verificado = TRUE) as emails_verificados,
    COUNT(*) FILTER (WHERE data_ultimo_acesso > NOW() - INTERVAL '7 days') as acessos_recentes
FROM candidatos
WHERE deleted_at IS NULL
GROUP BY estado
ORDER BY total_candidatos DESC;

COMMENT ON VIEW v_candidatos_resumo IS 'Estatísticas de candidatos agrupadas por estado';

-- ==============================================
-- VIEW: v_sessoes_por_usuario
-- Resumo de sessões ativas por usuário
-- ==============================================

CREATE OR REPLACE VIEW v_sessoes_por_usuario AS
SELECT
    u.id as user_id,
    u.email,
    COUNT(*) as total_sessoes,
    COUNT(*) FILTER (WHERE s.ativo = TRUE AND s.revogado = FALSE) as sessoes_ativas,
    MAX(s.last_activity) as ultima_atividade,
    ARRAY_AGG(DISTINCT s.device_type) FILTER (WHERE s.ativo = TRUE) as dispositivos
FROM auth.users u
LEFT JOIN sessoes_ativas s ON s.user_id = u.id
GROUP BY u.id, u.email
ORDER BY ultima_atividade DESC NULLS LAST;

COMMENT ON VIEW v_sessoes_por_usuario IS 'Resumo de sessões ativas por usuário';

-- ==============================================
-- VIEW: v_tentativas_login_falhas
-- Rastreamento de tentativas de login falhadas
-- ==============================================

CREATE OR REPLACE VIEW v_tentativas_login_falhas AS
SELECT
    email_tentativa,
    COUNT(*) as total_tentativas,
    MAX(created_at) as ultima_tentativa,
    ARRAY_AGG(DISTINCT ip_address::TEXT ORDER BY ip_address::TEXT) as ips_utilizados,
    COUNT(DISTINCT ip_address) as total_ips_diferentes
FROM logs_acesso
WHERE evento = 'login_falha'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY email_tentativa
HAVING COUNT(*) > 3
ORDER BY total_tentativas DESC;

COMMENT ON VIEW v_tentativas_login_falhas IS 'Tentativas de login falhadas nas últimas 24 horas (>3 tentativas)';

-- ==============================================
-- NOTAS DE USO
-- ==============================================

-- USO DAS VIEWS:

-- 1. Listar candidatos ativos:
-- SELECT * FROM v_candidatos_ativos LIMIT 10;

-- 2. Verificar sessões válidas de um usuário:
-- SELECT * FROM v_sessoes_ativas_validas WHERE user_id = '[uuid]';

-- 3. Análise de tentativas de login suspeitas:
-- SELECT * FROM v_tentativas_login_falhas;

-- 4. Estatísticas de candidatos por estado:
-- SELECT * FROM v_candidatos_resumo WHERE estado = 'SP';

-- 5. Verificar atividade recente de usuários:
-- SELECT * FROM v_sessoes_por_usuario WHERE ultima_atividade > NOW() - INTERVAL '1 day';

-- ==============================================
-- FIM DO SCRIPT 09-views.sql
-- ==============================================
