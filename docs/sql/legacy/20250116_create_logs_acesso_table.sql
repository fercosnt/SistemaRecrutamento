-- Migration: Criar tabela logs_acesso para auditoria de segurança
-- Descrição: Tabela para registrar eventos de acesso (login, logout, password reset)
-- Data: 2025-01-16
-- PRD: PRD-4 Sistema de Recuperação de Senha (Task 5)

-- Criar tabela logs_acesso
CREATE TABLE IF NOT EXISTS public.logs_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo de evento
  evento VARCHAR(50) NOT NULL,

  -- Identificação do usuário
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email_tentativa VARCHAR(255),

  -- Informações de rede
  ip_address VARCHAR(45),
  country VARCHAR(100),
  city VARCHAR(100),

  -- Informações do dispositivo
  device_info TEXT,
  device_type VARCHAR(20),
  browser VARCHAR(100),
  operating_system VARCHAR(100),

  -- Informações adicionais
  erro_mensagem TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários na tabela
COMMENT ON TABLE public.logs_acesso IS 'Registro de eventos de acesso e segurança do sistema';
COMMENT ON COLUMN public.logs_acesso.evento IS 'Tipo de evento: login_sucesso, login_falha, logout, password_reset_request, etc';
COMMENT ON COLUMN public.logs_acesso.user_id IS 'ID do usuário autenticado (quando disponível)';
COMMENT ON COLUMN public.logs_acesso.email_tentativa IS 'Email usado na tentativa de acesso';
COMMENT ON COLUMN public.logs_acesso.ip_address IS 'Endereço IP do cliente (IPv4 ou IPv6)';
COMMENT ON COLUMN public.logs_acesso.device_info IS 'User agent completo do navegador';
COMMENT ON COLUMN public.logs_acesso.device_type IS 'Tipo de dispositivo: desktop, mobile, tablet';
COMMENT ON COLUMN public.logs_acesso.browser IS 'Nome e versão do navegador';
COMMENT ON COLUMN public.logs_acesso.operating_system IS 'Sistema operacional e versão';
COMMENT ON COLUMN public.logs_acesso.erro_mensagem IS 'Mensagem de erro (para eventos de falha)';

-- Índices para performance (DROP IF EXISTS para ser idempotente)
DROP INDEX IF EXISTS public.idx_logs_acesso_evento;
DROP INDEX IF EXISTS public.idx_logs_acesso_user_id;
DROP INDEX IF EXISTS public.idx_logs_acesso_created_at;
DROP INDEX IF EXISTS public.idx_logs_acesso_ip_address;
DROP INDEX IF EXISTS public.idx_logs_acesso_email_tentativa;
DROP INDEX IF EXISTS public.idx_logs_acesso_security_analysis;

CREATE INDEX idx_logs_acesso_evento ON public.logs_acesso(evento);
CREATE INDEX idx_logs_acesso_user_id ON public.logs_acesso(user_id);
CREATE INDEX idx_logs_acesso_created_at ON public.logs_acesso(created_at DESC);
CREATE INDEX idx_logs_acesso_ip_address ON public.logs_acesso(ip_address);
CREATE INDEX idx_logs_acesso_email_tentativa ON public.logs_acesso(email_tentativa);

-- Índice composto para análise de segurança (detectar padrões suspeitos)
CREATE INDEX idx_logs_acesso_security_analysis
ON public.logs_acesso(evento, ip_address, created_at DESC);

-- RLS (Row Level Security)
-- Logs são sensíveis - apenas serviço e admins devem acessar
ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;

-- Drop policies existentes (para ser idempotente)
DROP POLICY IF EXISTS "Serviço pode inserir logs" ON public.logs_acesso;
DROP POLICY IF EXISTS "Service role pode ler todos os logs" ON public.logs_acesso;
DROP POLICY IF EXISTS "Service role pode deletar logs" ON public.logs_acesso;

-- Policy: Serviço pode inserir logs (autenticado ou não)
CREATE POLICY "Serviço pode inserir logs"
ON public.logs_acesso
FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Apenas service_role pode ler logs (via backend/admin)
-- Nenhum usuário final deve ler logs diretamente
CREATE POLICY "Service role pode ler todos os logs"
ON public.logs_acesso
FOR SELECT
TO service_role
USING (true);

-- Policy: Apenas service_role pode deletar logs antigos (limpeza)
CREATE POLICY "Service role pode deletar logs"
ON public.logs_acesso
FOR DELETE
TO service_role
USING (true);

-- Trigger para auto-limpeza de logs antigos (opcional, comentado por padrão)
-- Descomente se quiser limpar logs com mais de 90 dias automaticamente
/*
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.logs_acesso
  WHERE created_at < NOW() - INTERVAL '90 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_old_logs
AFTER INSERT ON public.logs_acesso
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_old_logs();
*/

-- Grant de permissões
GRANT INSERT ON public.logs_acesso TO anon;
GRANT INSERT ON public.logs_acesso TO authenticated;
GRANT ALL ON public.logs_acesso TO service_role;

-- Criar view para análise de segurança (opcional)
DROP VIEW IF EXISTS public.security_analysis_view;
CREATE VIEW public.security_analysis_view AS
SELECT
  evento,
  COUNT(*) as total_eventos,
  COUNT(DISTINCT ip_address) as ips_unicos,
  COUNT(DISTINCT email_tentativa) as emails_unicos,
  COUNT(DISTINCT user_id) as usuarios_unicos,
  DATE_TRUNC('hour', created_at) as hora
FROM public.logs_acesso
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY evento, DATE_TRUNC('hour', created_at)
ORDER BY hora DESC;

COMMENT ON VIEW public.security_analysis_view IS 'Análise agregada de eventos de segurança (últimos 7 dias)';

-- Grant na view apenas para service_role
GRANT SELECT ON public.security_analysis_view TO service_role;
