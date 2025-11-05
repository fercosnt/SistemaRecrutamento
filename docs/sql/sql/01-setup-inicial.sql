-- ==============================================
-- 01 - Setup Inicial: Configurações e Funções Auxiliares
-- PRD-DB-001: Estrutura de Autenticação e Usuários
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- CONFIGURAÇÃO DE TIMEZONE
-- ==============================================
-- Nota: O comando ALTER DATABASE requer privilégios de superuser
-- Para Supabase, o timezone é gerenciado pelo sistema
-- As timestamps usarão TIMESTAMPTZ que armazena com timezone UTC
-- e converte automaticamente baseado no client timezone

-- Verificar timezone atual
SHOW timezone;

-- ==============================================
-- FUNÇÕES AUXILIARES
-- ==============================================

-- Função 1: Atualizar automaticamente o campo updated_at
-- Uso: Criar trigger BEFORE UPDATE em cada tabela
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_updated_at_column() IS
'Atualiza automaticamente o campo updated_at com timestamp atual quando um registro é modificado. SEGURO: search_path fixo para prevenir SQL injection.';

-- ==============================================

-- Função 2: Atualizar expires_at quando last_activity muda (para sessões)
-- Uso: Trigger BEFORE UPDATE na tabela sessoes_ativas
CREATE OR REPLACE FUNCTION update_expires_at()
RETURNS TRIGGER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Sempre que last_activity é atualizado, extends expires_at para +7 dias
    IF NEW.last_activity IS DISTINCT FROM OLD.last_activity THEN
        NEW.expires_at = NEW.last_activity + INTERVAL '7 days';
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_expires_at() IS
'Estende expires_at para +7 dias sempre que last_activity é atualizado. SEGURO: search_path fixo.';

-- ==============================================

-- Função 3: Limpar sessões expiradas automaticamente
-- Uso: Executar via cron job diário (Supabase Cron Extension)
CREATE OR REPLACE FUNCTION limpar_sessoes_expiradas()
RETURNS void
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE sessoes_ativas
    SET ativo = FALSE,
        revogado = TRUE,
        revogado_em = NOW()
    WHERE expires_at < NOW()
    AND ativo = TRUE;
END;
$$;

COMMENT ON FUNCTION limpar_sessoes_expiradas() IS
'Marca sessões expiradas como inativas e revogadas. SEGURO: search_path fixo. Executar diariamente via cron.';

-- Exemplo de agendamento (requer pg_cron extension):
-- SELECT cron.schedule('limpar-sessoes', '0 3 * * *', 'SELECT limpar_sessoes_expiradas();');

-- ==============================================

-- Função 4: Limpar logs antigos (mais de 1 ano)
-- Uso: Executar via cron job mensal para compliance LGPD
CREATE OR REPLACE FUNCTION limpar_logs_antigos()
RETURNS void
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM logs_acesso
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;

COMMENT ON FUNCTION limpar_logs_antigos() IS
'Remove logs de acesso com mais de 1 ano para conformidade LGPD. SEGURO: search_path fixo. Executar mensalmente via cron.';

-- Exemplo de agendamento (requer pg_cron extension):
-- SELECT cron.schedule('limpar-logs', '0 2 1 * *', 'SELECT limpar_logs_antigos();');

-- ==============================================

-- Função 5: Criar preferências padrão ao criar usuário RH
-- Uso: Trigger AFTER INSERT na tabela usuarios_rh
CREATE OR REPLACE FUNCTION criar_preferencias_padrao()
RETURNS TRIGGER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO preferencias_notificacoes (usuario_rh_id, created_by)
    VALUES (NEW.id, NEW.user_id);
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION criar_preferencias_padrao() IS
'Cria automaticamente registro de preferências com valores padrão quando usuário RH é criado. SEGURO: search_path fixo.';

-- ==============================================
-- VALIDAÇÃO
-- ==============================================

-- Verificar se funções foram criadas corretamente
SELECT
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'update_updated_at_column',
    'update_expires_at',
    'limpar_sessoes_expiradas',
    'limpar_logs_antigos',
    'criar_preferencias_padrao'
)
ORDER BY routine_name;

-- ==============================================
-- FIM DO SCRIPT 01-setup-inicial.sql
-- ==============================================