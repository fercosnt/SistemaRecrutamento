-- ==============================================
-- 04 - Tabela: preferencias_notificacoes
-- PRD-DB-001: Estrutura de Autenticação e Usuários
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- CRIAR TABELA PREFERENCIAS_NOTIFICACOES
-- ==============================================

CREATE TABLE IF NOT EXISTS preferencias_notificacoes (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_rh_id UUID NOT NULL UNIQUE REFERENCES usuarios_rh(id) ON DELETE CASCADE,

    -- Preferências de Email
    email_novos_candidatos BOOLEAN NOT NULL DEFAULT TRUE,
    email_testes_completos BOOLEAN NOT NULL DEFAULT TRUE,
    email_entrevistas_agendadas BOOLEAN NOT NULL DEFAULT TRUE,
    email_resumo_diario BOOLEAN NOT NULL DEFAULT FALSE,
    email_resumo_semanal BOOLEAN NOT NULL DEFAULT TRUE,

    -- Preferências de WhatsApp
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_numero VARCHAR(25),  -- +55 (XX) XXXXX-XXXX
    whatsapp_entrevistas BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_urgentes BOOLEAN NOT NULL DEFAULT FALSE,

    -- Notificações In-App
    notificacoes_app BOOLEAN NOT NULL DEFAULT TRUE,

    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- ==============================================
-- CONSTRAINTS DE VALIDAÇÃO
-- ==============================================

-- Validar formato de WhatsApp (+55 (XX) XXXXX-XXXX)
ALTER TABLE preferencias_notificacoes
ADD CONSTRAINT preferencias_whatsapp_formato_check
CHECK (
    whatsapp_numero IS NULL OR
    whatsapp_numero ~* '^\+55 \(\d{2}\) \d{5}-\d{4}$'
);

-- WhatsApp número é obrigatório se WhatsApp estiver habilitado
ALTER TABLE preferencias_notificacoes
ADD CONSTRAINT preferencias_whatsapp_numero_required_check
CHECK (
    (whatsapp_enabled = FALSE) OR
    (whatsapp_enabled = TRUE AND whatsapp_numero IS NOT NULL)
);

-- ==============================================
-- ÍNDICES
-- ==============================================

-- Índice para relacionamento com usuarios_rh (único)
CREATE UNIQUE INDEX IF NOT EXISTS idx_preferencias_usuario_rh_id
    ON preferencias_notificacoes(usuario_rh_id);

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger para atualizar automaticamente updated_at
CREATE TRIGGER update_preferencias_notificacoes_updated_at
    BEFORE UPDATE ON preferencias_notificacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Habilitar RLS
ALTER TABLE preferencias_notificacoes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Usuários RH podem gerenciar suas próprias preferências
CREATE POLICY preferencias_rh_manage_own
    ON preferencias_notificacoes
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE usuarios_rh.id = preferencias_notificacoes.usuario_rh_id
            AND usuarios_rh.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE usuarios_rh.id = preferencias_notificacoes.usuario_rh_id
            AND usuarios_rh.user_id = auth.uid()
        )
    );

-- Policy 2: Sistema pode criar preferências automaticamente
CREATE POLICY preferencias_system_insert
    ON preferencias_notificacoes FOR INSERT
    WITH CHECK (TRUE);

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON TABLE preferencias_notificacoes IS 'Preferências de notificações dos usuários RH';
COMMENT ON COLUMN preferencias_notificacoes.id IS 'Identificador único das preferências';
COMMENT ON COLUMN preferencias_notificacoes.usuario_rh_id IS 'Referência ao usuário RH (relacionamento 1:1)';
COMMENT ON COLUMN preferencias_notificacoes.whatsapp_enabled IS 'Indica se notificações via WhatsApp estão habilitadas';
COMMENT ON COLUMN preferencias_notificacoes.whatsapp_numero IS 'Número de WhatsApp no formato +55 (XX) XXXXX-XXXX';
COMMENT ON COLUMN preferencias_notificacoes.notificacoes_app IS 'Indica se notificações in-app estão habilitadas';

-- ==============================================
-- NOTAS DE IMPLEMENTAÇÃO
-- ==============================================

-- As preferências são criadas automaticamente quando um usuário RH é criado
-- através do trigger "trigger_criar_preferencias_padrao" na tabela usuarios_rh.
-- Os valores padrão são:
--   - Email: novos candidatos, testes completos, entrevistas (ON), resumo semanal (ON)
--   - WhatsApp: desabilitado por padrão
--   - Notificações in-app: habilitadas por padrão

-- ==============================================
-- FIM DO SCRIPT 04-tabela-preferencias.sql
-- ==============================================
