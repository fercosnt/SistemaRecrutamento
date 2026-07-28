-- =====================================================
-- PRD-DB-005: Configurações e Sistema
-- Migration: 21-tabela-templates-email
-- Description: Tabela de templates de email customizáveis com versionamento
-- Tasks: 3.1 - 3.12
-- =====================================================

-- =====================================================
-- TABLE: templates_email
-- Description: Templates de email personalizáveis com variáveis dinâmicas
-- Versioning: Permite múltiplas versões do mesmo template
-- Variables: {{nome_candidato}}, {{vaga}}, {{data}}, {{link}}, etc.
-- =====================================================

CREATE TABLE IF NOT EXISTS templates_email (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo tipo_template_email NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,

  -- Conteúdo
  assunto TEXT NOT NULL,
  corpo_html TEXT NOT NULL,
  corpo_texto TEXT NULL,

  -- Variáveis disponíveis para este template
  variaveis_disponiveis TEXT[] NOT NULL,

  -- Metadata
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  is_padrao BOOLEAN DEFAULT FALSE,

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL,

  -- Constraint: Apenas 1 combinação de tipo+versao
  CONSTRAINT uq_templates_email_tipo_versao UNIQUE (tipo, versao)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_templates_email_tipo
  ON templates_email(tipo)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_templates_email_ativo
  ON templates_email(ativo)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_templates_email_deleted_at
  ON templates_email(deleted_at);

-- =====================================================
-- TRIGGER: updated_at
-- =====================================================

CREATE TRIGGER update_templates_email_updated_at
  BEFORE UPDATE ON templates_email
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE templates_email IS
  'Templates de email customizáveis com suporte a versionamento.
   Variáveis dinâmicas: {{nome_candidato}}, {{nome_vaga}}, {{link_acao}}, {{data}}, {{hora}}, etc.
   Cada tipo pode ter múltiplas versões (versao 1, 2, 3...).';

COMMENT ON COLUMN templates_email.tipo IS
  'Tipo de template (15 tipos disponíveis via enum tipo_template_email)';

COMMENT ON COLUMN templates_email.versao IS
  'Versão do template (1, 2, 3...). Permite A/B testing e rollback';

COMMENT ON COLUMN templates_email.variaveis_disponiveis IS
  'Array de variáveis que podem ser usadas neste template (ex: ["nome_candidato", "nome_vaga", "link_acao"])';

COMMENT ON COLUMN templates_email.is_padrao IS
  'Se TRUE, este é o template padrão usado ao enviar email deste tipo';

COMMENT ON COLUMN templates_email.corpo_html IS
  'Corpo do email em HTML (suporta variáveis {{variavel}})';

COMMENT ON COLUMN templates_email.corpo_texto IS
  'Versão texto plano do email (fallback para clientes sem HTML)';

-- =====================================================
-- SEED DATA: Templates Padrão
-- =====================================================

-- Template: Boas Vindas
INSERT INTO templates_email (
  tipo,
  versao,
  assunto,
  corpo_html,
  corpo_texto,
  variaveis_disponiveis,
  descricao,
  ativo,
  is_padrao
)
VALUES (
  'boas_vindas_candidato',
  1,
  'Bem-vindo(a) à {{nome_empresa}}! 🎉',
  '<h1>Olá, {{nome_candidato}}!</h1>
   <p>Seja muito bem-vindo(a) à plataforma de recrutamento da <strong>{{nome_empresa}}</strong>!</p>
   <p>Estamos felizes em tê-lo(a) conosco. Seu cadastro foi realizado com sucesso.</p>
   <p>Acesse sua conta: <a href="{{link_dashboard}}">Meu Dashboard</a></p>
   <p>Atenciosamente,<br>Equipe {{nome_empresa}}</p>',
  'Olá, {{nome_candidato}}! Seja bem-vindo(a) à {{nome_empresa}}. Seu cadastro foi realizado com sucesso. Acesse: {{link_dashboard}}',
  ARRAY['nome_candidato', 'nome_empresa', 'link_dashboard', 'email_candidato'],
  'Template de boas-vindas enviado após cadastro do candidato',
  TRUE,
  TRUE
) ON CONFLICT (tipo, versao) DO NOTHING;

-- Template: Confirmação de Candidatura
INSERT INTO templates_email (
  tipo,
  versao,
  assunto,
  corpo_html,
  corpo_texto,
  variaveis_disponiveis,
  descricao,
  ativo,
  is_padrao
)
VALUES (
  'confirmacao_candidatura',
  1,
  'Candidatura confirmada: {{nome_vaga}}',
  '<h1>Candidatura Confirmada!</h1>
   <p>Olá, {{nome_candidato}}!</p>
   <p>Recebemos sua candidatura para a vaga de <strong>{{nome_vaga}}</strong>.</p>
   <p><strong>Detalhes da vaga:</strong></p>
   <ul>
     <li>Vaga: {{nome_vaga}}</li>
     <li>Departamento: {{departamento}}</li>
     <li>Data de candidatura: {{data_candidatura}}</li>
   </ul>
   <p>Acompanhe o status da sua candidatura no <a href="{{link_dashboard}}">seu dashboard</a>.</p>
   <p>Boa sorte!<br>Equipe {{nome_empresa}}</p>',
  'Candidatura confirmada para {{nome_vaga}}! Acompanhe em {{link_dashboard}}',
  ARRAY['nome_candidato', 'nome_vaga', 'departamento', 'data_candidatura', 'link_dashboard', 'nome_empresa'],
  'Confirmação de candidatura enviada após aplicação a uma vaga',
  TRUE,
  TRUE
) ON CONFLICT (tipo, versao) DO NOTHING;

-- Template: Convite Entrevista Online
INSERT INTO templates_email (
  tipo,
  versao,
  assunto,
  corpo_html,
  corpo_texto,
  variaveis_disponiveis,
  descricao,
  ativo,
  is_padrao
)
VALUES (
  'convite_entrevista_online',
  1,
  'Convite: Entrevista Online - {{nome_vaga}}',
  '<h1>Você foi selecionado(a) para entrevista! 🎉</h1>
   <p>Olá, {{nome_candidato}}!</p>
   <p>Parabéns! Você foi selecionado(a) para a próxima etapa do processo seletivo da vaga <strong>{{nome_vaga}}</strong>.</p>
   <p><strong>Detalhes da Entrevista Online:</strong></p>
   <ul>
     <li>Data: {{data_entrevista}}</li>
     <li>Horário: {{hora_entrevista}}</li>
     <li>Duração estimada: {{duracao_minutos}} minutos</li>
     <li>Plataforma: {{plataforma}}</li>
   </ul>
   <p><a href="{{link_entrevista}}" style="background:#6366F1;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Acessar Entrevista</a></p>
   <p><em>Link também será enviado por WhatsApp próximo ao horário.</em></p>
   <p>Boa sorte!<br>Equipe {{nome_empresa}}</p>',
  'Você foi selecionado! Entrevista online em {{data_entrevista}} às {{hora_entrevista}}. Link: {{link_entrevista}}',
  ARRAY['nome_candidato', 'nome_vaga', 'data_entrevista', 'hora_entrevista', 'duracao_minutos', 'plataforma', 'link_entrevista', 'nome_empresa'],
  'Convite para entrevista online com data, hora e link',
  TRUE,
  TRUE
) ON CONFLICT (tipo, versao) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM templates_email;

  IF template_count >= 3 THEN
    RAISE NOTICE '✅ Migration 21: Tabela templates_email criada com % templates padrão', template_count;
  ELSE
    RAISE EXCEPTION '❌ Migration 21: Esperado pelo menos 3 templates, encontrado %', template_count;
  END IF;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ Tabela templates_email criada
-- ✅ Versionamento (UNIQUE constraint em tipo + versao)
-- ✅ Variáveis dinâmicas (array de variáveis disponíveis)
-- ✅ 3 índices (tipo, ativo, deleted_at)
-- ✅ 1 trigger (updated_at)
-- ✅ 3 templates padrão inseridos (boas-vindas, confirmação, entrevista)
-- =====================================================
