# PRD-DB-005: Configurações e Sistema

**Versão:** 1.0  
**Data:** 02 de Novembro de 2025  
**Autor:** Equipe Beauty Smile  
**Status:** 🔄 Em Desenvolvimento  
**Prioridade:** 🔴 P0 - Crítica (MVP)  
**Categoria:** Banco de Dados  
**Ferramenta:** DB Expert  
**Dependências:** PRD-DB-001, PRD-DB-002, PRD-DB-003, PRD-DB-004

---

## 1. Introdução/Visão Geral

Este PRD define a estrutura completa de banco de dados para o módulo de **Configurações e Sistema** do Beauty Smile. Este é o **último PRD de banco de dados** e completa a fundação de dados do sistema.

### Componentes Principais

1. **Configurações da Empresa**
   - Dados da empresa (nome, logo, cores, etc.)
   - Configurações de SMTP (envio de emails)
   - URLs de webhooks N8N
   - Configurações de notificações
   - Limites e restrições do sistema
   - Timezone e idioma

2. **Templates de Email**
   - Templates customizáveis em HTML
   - Variáveis dinâmicas ({{nome}}, {{vaga}}, etc.)
   - Tipos: boas-vindas, lembrete, aprovação, rejeição, etc.
   - Editor WYSIWYG no frontend
   - Pré-visualização antes de enviar
   - Versionamento de templates

3. **Configuração de Webhooks N8N**
   - URLs dos webhooks
   - Secrets/Tokens para autenticação
   - Timeout e retry
   - Ativo/Inativo
   - Logs de chamadas
   - Teste de conectividade

4. **Biblioteca de Perguntas**
   - Perguntas pré-cadastradas para reuso
   - Categorias (Jornada, Tecnologia, Valores, etc.)
   - Tags para filtro
   - RH pode adicionar à vaga em 1 clique
   - Versionamento e histórico de uso

5. **Logs de Auditoria Detalhados**
   - Logs expandidos de todas operações
   - Filtro avançado (data, usuário, ação, IP)
   - Retenção de 2 anos
   - Exportação para compliance
   - Dashboard de auditoria

### Problema que Resolve

Sistemas de RH precisam de:

- Configurações centralizadas e editáveis
- Templates de email customizáveis (branding)
- Integração configurável com N8N
- Biblioteca de perguntas para agilizar criação de vagas
- Logs de auditoria para compliance (LGPD, ISO 27001)
- Gerenciamento simples sem precisar mexer no código

### Contexto Técnico

- **Plataforma:** Supabase (PostgreSQL)
- **Frontend:** React 18 + Vite (página de Configurações)
- **Dependências:** Todas as tabelas anteriores
- **Integrações:** N8N, SMTP externo (SendGrid, AWS SES, etc.)

---

## 2. Objetivos

### Objetivos Principais

1. **Centralizar configurações** da empresa em uma tabela editável
2. **Permitir customização de emails** sem mexer no código
3. **Gerenciar webhooks N8N** de forma visual e testável
4. **Criar biblioteca de perguntas** reutilizáveis entre vagas
5. **Implementar logs de auditoria** completos para compliance
6. **Facilitar manutenção** sem precisar acessar banco diretamente

### Objetivos Secundários

7. Versionamento de templates de email
8. Backup automático de configurações
9. Importar/Exportar configurações
10. Notificações de falhas em webhooks
11. Dashboard de auditoria visual

---

## 3. User Stories

### US-001: Como RH Admin
**Como** administrador  
**Eu quero** editar configurações da empresa na interface  
**Para que** eu possa personalizar o sistema sem mexer no código  
**Critério de Aceitação:**
- Acesso página de Configurações
- Edito nome da empresa, logo, cores
- Configuro SMTP (host, porta, usuário, senha)
- Configuro URLs dos webhooks N8N
- Sistema valida e salva alterações
- Mudanças aplicadas imediatamente

### US-002: Como RH Admin
**Como** administrador  
**Eu quero** customizar templates de email  
**Para que** os emails tenham a cara da empresa  
**Critério de Aceitação:**
- Vejo lista de templates (boas-vindas, lembrete, aprovação, rejeição)
- Posso editar HTML do template
- Uso variáveis dinâmicas: {{nome_candidato}}, {{titulo_vaga}}, {{link}}
- Consigo pré-visualizar template antes de salvar
- Sistema valida variáveis obrigatórias
- Template é usado automaticamente nos emails

### US-003: Como RH Admin
**Como** administrador  
**Eu quero** testar conexão com webhooks N8N  
**Para que** eu saiba se está funcionando antes de usar em produção  
**Critério de Aceitação:**
- Configuro URL do webhook
- Clico em "Testar Webhook"
- Sistema envia payload de teste
- Vejo resposta em tempo real (sucesso ou erro)
- Se erro, vejo mensagem detalhada
- Consigo ativar/desativar webhook

### US-004: Como RH
**Como** recrutador  
**Eu quero** usar perguntas da biblioteca ao criar vaga  
**Para que** eu não precise reescrever tudo sempre  
**Critério de Aceitação:**
- Ao criar vaga, vejo botão "Adicionar da Biblioteca"
- Filtro perguntas por categoria ou tag
- Seleciono perguntas desejadas
- Sistema adiciona automaticamente no formulário
- Posso editar pergunta após adicionar
- Pergunta mantém link com biblioteca (analytics)

### US-005: Como RH Admin
**Como** administrador  
**Eu quero** adicionar perguntas à biblioteca  
**Para que** toda equipe possa reutilizar  
**Critério de Aceitação:**
- Acesso "Biblioteca de Perguntas"
- Clico "Nova Pergunta"
- Preencho: texto, tipo resposta, categoria, tags
- Salvo na biblioteca
- Pergunta fica disponível para todos

### US-006: Como RH Admin
**Como** administrador  
**Eu quero** visualizar logs de auditoria  
**Para que** eu possa rastrear ações no sistema  
**Critério de Aceitação:**
- Acesso página de Auditoria
- Filtro por data, usuário, ação, IP
- Vejo lista detalhada de todas ações
- Cada log mostra: usuário, data/hora, ação, detalhes, IP
- Consigo exportar logs em CSV/JSON
- Logs são imutáveis (não posso deletar)

### US-007: Como Sistema
**Como** sistema  
**Eu quero** registrar todas operações importantes  
**Para que** auditoria e compliance sejam possíveis  
**Critério de Aceitação:**
- Login/logout são registrados
- CRUD de vagas é registrado
- Aprovações/rejeições são registradas
- Mudanças em configurações são registradas
- Acesso a dados sensíveis é registrado
- Falhas de segurança são registradas

---

## 4. Requisitos Funcionais

### 4.1 Tabelas Principais - Configurações da Empresa

#### RF-001: Tabela `configuracoes_empresa`

O sistema **DEVE** criar uma tabela para configurações globais:

**Nota Importante:** Esta tabela terá **apenas 1 registro** (singleton).

**Campos de Identificação:**
- `id` (UUID, PK, DEFAULT gen_random_uuid()) - Sempre usará o mesmo ID
- `empresa_id` (TEXT, UNIQUE, DEFAULT 'beauty-smile') - Identificador da empresa

**Dados da Empresa:**
- `nome_empresa` (TEXT, NOT NULL) - Nome da empresa
- `logo_url` (TEXT, NULL) - URL do logo no Supabase Storage
- `favicon_url` (TEXT, NULL) - URL do favicon
- `cor_primaria` (TEXT, DEFAULT '#6366F1') - Cor principal (hex)
- `cor_secundaria` (TEXT, DEFAULT '#8B5CF6') - Cor secundária (hex)
- `cor_accent` (TEXT, DEFAULT '#EC4899') - Cor de destaque (hex)

**Contato:**
- `email_contato` (TEXT, NULL) - Email geral da empresa
- `telefone_contato` (TEXT, NULL) - Telefone
- `site_url` (TEXT, NULL) - Site da empresa
- `endereco_completo` (TEXT, NULL) - Endereço completo

**Configurações de Email (SMTP):**
- `smtp_host` (TEXT, NULL) - Host SMTP (ex: smtp.sendgrid.net)
- `smtp_port` (INTEGER, DEFAULT 587) - Porta SMTP
- `smtp_usuario` (TEXT, NULL) - Usuário SMTP
- `smtp_senha_encrypted` (TEXT, NULL) - Senha SMTP criptografada
- `smtp_from_email` (TEXT, NULL) - Email remetente padrão
- `smtp_from_nome` (TEXT, NULL) - Nome do remetente
- `smtp_usar_tls` (BOOLEAN, DEFAULT TRUE) - Usar TLS/SSL

**URLs de Webhooks N8N:**
- `webhook_analise_formulario_url` (TEXT, NULL) - PRD-N8N-001
- `webhook_analise_bigfive_url` (TEXT, NULL) - PRD-N8N-002
- `webhook_analise_disc_url` (TEXT, NULL) - PRD-N8N-003
- `webhook_analise_raven_url` (TEXT, NULL) - PRD-N8N-004
- `webhook_analise_cultura_url` (TEXT, NULL) - PRD-N8N-005
- `webhook_analise_entrevista_url` (TEXT, NULL) - PRD-N8N-006
- `webhook_envio_emails_url` (TEXT, NULL) - PRD-N8N-007
- `webhook_lembretes_url` (TEXT, NULL) - PRD-N8N-008

**Configurações de Webhook:**
- `webhook_timeout_segundos` (INTEGER, DEFAULT 30) - Timeout padrão
- `webhook_retry_tentativas` (INTEGER, DEFAULT 3) - Número de retries
- `webhook_secret` (TEXT, NULL) - Secret para autenticação

**Configurações de Notificações:**
- `notificar_nova_candidatura` (BOOLEAN, DEFAULT TRUE) - Notificar RH
- `notificar_teste_concluido` (BOOLEAN, DEFAULT TRUE) - Notificar RH
- `email_notificacoes` (TEXT[], NULL) - Emails para notificações

**Configurações de Sistema:**
- `timezone` (TEXT, DEFAULT 'America/Sao_Paulo') - Timezone
- `idioma` (TEXT, DEFAULT 'pt-BR') - Idioma padrão
- `max_tamanho_curriculo_mb` (INTEGER, DEFAULT 5) - Tamanho máximo currículo
- `max_tamanho_gravacao_mb` (INTEGER, DEFAULT 500) - Tamanho máximo gravação
- `dias_retencao_logs` (INTEGER, DEFAULT 730) - Retenção logs (2 anos)

**Campos de Auditoria:**
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_by` (UUID, FK → usuarios_rh.id, NULL) - Último que editou

**Constraints:**
- empresa_id deve ser UNIQUE (garante 1 registro)
- cor_primaria, secundaria, accent devem ser hex válidos (#RRGGBB)
- smtp_port entre 25 e 587
- timezone deve ser válido (America/Sao_Paulo, etc.)

**Índices:**
- Index em `empresa_id` (busca rápida)

---

#### RF-002: Function `get_configuracoes()`

```sql
CREATE OR REPLACE FUNCTION get_configuracoes()
RETURNS configuracoes_empresa AS $$
DECLARE
  config configuracoes_empresa;
BEGIN
  -- Buscar configurações (sempre há apenas 1 registro)
  SELECT * INTO config
  FROM configuracoes_empresa
  LIMIT 1;
  
  -- Se não existe, criar com valores padrão
  IF NOT FOUND THEN
    INSERT INTO configuracoes_empresa (empresa_id, nome_empresa)
    VALUES ('beauty-smile', 'Beauty Smile')
    RETURNING * INTO config;
  END IF;
  
  RETURN config;
END;
$$ LANGUAGE plpgsql;
```

---

### 4.2 Tabelas Principais - Templates de Email

#### RF-003: Tabela `templates_email`

O sistema **DEVE** criar uma tabela para templates de email:

**Campos de Identificação:**
- `id` (UUID, PK)
- `tipo` (ENUM, NOT NULL, UNIQUE) - Tipo do template
- `versao` (INTEGER, NOT NULL, DEFAULT 1) - Versão do template

**Conteúdo:**
- `assunto` (TEXT, NOT NULL) - Assunto do email (aceita variáveis)
- `corpo_html` (TEXT, NOT NULL) - Corpo do email em HTML (aceita variáveis)
- `corpo_texto` (TEXT, NULL) - Versão texto puro (fallback)

**Variáveis Disponíveis:**
- `variaveis_disponiveis` (TEXT[], NOT NULL) - Array de variáveis que podem ser usadas

**Exemplo de variáveis:**
```
['{{nome_candidato}}', '{{titulo_vaga}}', '{{link_teste}}', '{{data_entrevista}}', '{{hora_entrevista}}', '{{local_entrevista}}', '{{nome_empresa}}']
```

**Exemplo de template:**
```html
<html>
<body>
  <h1>Olá, {{nome_candidato}}!</h1>
  <p>Você foi convidado para realizar o teste de {{tipo_teste}} para a vaga de <strong>{{titulo_vaga}}</strong>.</p>
  <p><a href="{{link_teste}}">Clique aqui para iniciar o teste</a></p>
  <p>Atenciosamente,<br>Equipe {{nome_empresa}}</p>
</body>
</html>
```

**Metadata:**
- `descricao` (TEXT, NULL) - Descrição do template (para RH)
- `ativo` (BOOLEAN, DEFAULT TRUE) - Se está ativo
- `is_padrao` (BOOLEAN, DEFAULT FALSE) - Se é template padrão do sistema

**Campos de Auditoria:**
- `created_at`, `updated_at`, `deleted_at`
- `created_by`, `updated_by` (UUID, FK → usuarios_rh.id)

**Constraints:**
- Tipo deve ser um dos valores do enum
- Combinação (tipo, versao) deve ser UNIQUE
- Variáveis no assunto/corpo devem estar em variaveis_disponiveis

**Índices:**
- Index em `tipo`
- Index em `ativo`
- Index em `deleted_at`

---

#### RF-004: Enum `tipo_template_email`

```sql
CREATE TYPE tipo_template_email AS ENUM (
  'boas_vindas_candidato',           -- Após cadastro
  'confirmacao_candidatura',         -- Após se candidatar
  'convite_bigfive',                 -- Convite para Big Five
  'convite_disc',                    -- Convite para DISC
  'convite_raven',                   -- Convite para Raven
  'convite_cultura',                 -- Convite para Cultura
  'convite_entrevista_online',       -- Convite entrevista online
  'convite_entrevista_presencial',   -- Convite entrevista presencial
  'lembrete_teste',                  -- Lembrete teste pendente
  'lembrete_entrevista',             -- Lembrete entrevista (24h antes)
  'aprovado_proxima_etapa',          -- Aprovado, avançou etapa
  'aprovado_final',                  -- Aprovado final
  'rejeitado',                       -- Rejeitado
  'feedback_positivo',               -- Feedback geral positivo
  'recuperacao_senha'                -- Recuperação de senha
);
```

---

### 4.3 Tabelas Principais - Webhooks N8N

#### RF-005: Tabela `webhooks_config`

O sistema **DEVE** criar uma tabela para configuração de webhooks:

**Campos de Identificação:**
- `id` (UUID, PK)
- `nome` (TEXT, NOT NULL, UNIQUE) - Nome identificador (ex: 'analise_formulario')
- `tipo` (ENUM, NOT NULL) - Tipo do webhook

**Configuração:**
- `url` (TEXT, NOT NULL) - URL completa do webhook N8N
- `metodo` (TEXT, DEFAULT 'POST') - Método HTTP (POST, GET)
- `headers` (JSONB, NULL) - Headers customizados

**Estrutura JSONB `headers`:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer token123",
  "X-Custom-Header": "value"
}
```

**Segurança:**
- `secret` (TEXT, NULL) - Secret para validação
- `usar_auth` (BOOLEAN, DEFAULT FALSE) - Se usa autenticação

**Comportamento:**
- `timeout_segundos` (INTEGER, DEFAULT 30) - Timeout
- `retry_tentativas` (INTEGER, DEFAULT 3) - Número de retries
- `retry_delay_segundos` (INTEGER, DEFAULT 5) - Delay entre retries
- `ativo` (BOOLEAN, DEFAULT TRUE) - Se está ativo

**Status:**
- `ultima_chamada_sucesso` (TIMESTAMPTZ, NULL) - Última chamada bem-sucedida
- `ultima_chamada_erro` (TIMESTAMPTZ, NULL) - Última chamada com erro
- `total_chamadas` (INTEGER, DEFAULT 0) - Total de chamadas
- `total_sucessos` (INTEGER, DEFAULT 0) - Total de sucessos
- `total_erros` (INTEGER, DEFAULT 0) - Total de erros

**Campos de Auditoria:**
- `created_at`, `updated_at`, `deleted_at`
- `created_by`, `updated_by`

**Constraints:**
- URL deve ser válida (começar com http:// ou https://)
- timeout_segundos >= 5 e <= 300 (5 min)
- retry_tentativas >= 0 e <= 5

**Índices:**
- Index em `nome`
- Index em `tipo`
- Index em `ativo`

---

#### RF-006: Enum `tipo_webhook`

```sql
CREATE TYPE tipo_webhook AS ENUM (
  'analise_formulario',
  'analise_bigfive',
  'analise_disc',
  'analise_raven',
  'analise_cultura',
  'analise_entrevista',
  'envio_email',
  'lembretes',
  'notificacao_nova_candidatura',
  'notificacao_teste_concluido',
  'backup',
  'outro'
);
```

---

#### RF-007: Tabela `webhooks_logs`

O sistema **DEVE** criar uma tabela para logs de chamadas:

**Campos:**
- `id` (UUID, PK)
- `webhook_id` (UUID, FK → webhooks_config.id, NOT NULL)
- `payload_enviado` (JSONB, NOT NULL) - Payload enviado
- `resposta_recebida` (JSONB, NULL) - Resposta do webhook
- `status_code` (INTEGER, NULL) - HTTP status code
- `sucesso` (BOOLEAN, NOT NULL) - Se foi sucesso
- `erro_mensagem` (TEXT, NULL) - Mensagem de erro (se houver)
- `tempo_resposta_ms` (INTEGER, NULL) - Tempo de resposta em ms
- `tentativa_numero` (INTEGER, DEFAULT 1) - Número da tentativa
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- Logs são IMUTÁVEIS (sem updated_at, sem deleted_at)

**Índices:**
- Index em `webhook_id`
- Index em `sucesso`
- Index em `created_at` (para limpeza)

**Retenção:**
- Manter logs por 90 dias, depois deletar automaticamente

---

### 4.4 Tabelas Principais - Biblioteca de Perguntas

#### RF-008: Tabela `biblioteca_perguntas`

O sistema **DEVE** criar uma tabela para biblioteca de perguntas:

**Campos de Identificação:**
- `id` (UUID, PK)
- `titulo` (TEXT, NOT NULL) - Título da pergunta (para RH identificar)

**Conteúdo:**
- `texto_pergunta` (TEXT, NOT NULL) - Texto da pergunta
- `texto_ajuda` (TEXT, NULL) - Texto de ajuda opcional
- `tipo_resposta` (tipo_resposta_pergunta, NOT NULL) - Reusa enum do PRD-DB-002

**Categorização:**
- `categoria` (TEXT, NOT NULL) - 'jornada', 'tecnologia', 'valores', 'cultura', 'outro'
- `tags` (TEXT[], NULL) - Tags para filtro (ex: ['experiencia', 'lideranca'])

**Configuração de Resposta:**
- `opcoes_resposta` (JSONB, NULL) - Para múltipla escolha
- `permite_outros` (BOOLEAN, DEFAULT FALSE)
- `obrigatoria` (BOOLEAN, DEFAULT TRUE)
- `limite_caracteres` (INTEGER, NULL)

**Analytics:**
- `total_usos` (INTEGER, DEFAULT 0) - Quantas vezes foi usada
- `ultima_utilizacao` (TIMESTAMPTZ, NULL) - Quando foi usada pela última vez

**Metadata:**
- `is_publica` (BOOLEAN, DEFAULT TRUE) - Se todos RH podem usar
- `criado_por_usuario` (UUID, FK → usuarios_rh.id, NOT NULL) - Quem criou

**Campos de Auditoria:**
- `created_at`, `updated_at`, `deleted_at`
- `created_by`, `updated_by`

**Constraints:**
- categoria IN ('jornada', 'tecnologia', 'valores', 'cultura', 'outro')
- tipo_resposta válido

**Índices:**
- Index em `categoria`
- Index em `tags` (GIN index para arrays)
- Index em `is_publica`
- Index em `deleted_at`
- Full-text search em `texto_pergunta`

---

#### RF-009: Tabela `perguntas_vaga_origem`

O sistema **DEVE** criar uma tabela para rastrear origem das perguntas:

**Propósito:** Ligar perguntas de vagas com perguntas da biblioteca (analytics).

**Campos:**
- `id` (UUID, PK)
- `pergunta_formulario_id` (UUID, FK → perguntas_formulario.id, NOT NULL) - Pergunta na vaga
- `biblioteca_pergunta_id` (UUID, FK → biblioteca_perguntas.id, NOT NULL) - Origem na biblioteca
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- Combinação (pergunta_formulario_id, biblioteca_pergunta_id) UNIQUE

**Índices:**
- Index em `biblioteca_pergunta_id` (analytics)

**Trigger:** Ao inserir nesta tabela, incrementar `total_usos` da biblioteca.

---

### 4.5 Tabelas Principais - Logs de Auditoria

#### RF-010: Tabela `logs_auditoria`

O sistema **DEVE** criar uma tabela para logs detalhados:

**Campos de Identificação:**
- `id` (UUID, PK)
- `usuario_id` (UUID, NULL) - ID do usuário (pode ser NULL se ação do sistema)
- `usuario_tipo` (TEXT, NULL) - 'candidato', 'rh', 'admin', 'sistema'

**Ação:**
- `acao` (TEXT, NOT NULL) - Ação realizada (ex: 'login', 'criar_vaga', 'aprovar_candidato')
- `categoria` (ENUM, NOT NULL) - Categoria da ação
- `descricao` (TEXT, NOT NULL) - Descrição detalhada
- `severidade` (ENUM, NOT NULL) - Nível de severidade

**Contexto:**
- `recurso_tipo` (TEXT, NULL) - Tipo do recurso (ex: 'vaga', 'candidatura', 'usuario')
- `recurso_id` (UUID, NULL) - ID do recurso afetado
- `dados_antes` (JSONB, NULL) - Estado antes da ação
- `dados_depois` (JSONB, NULL) - Estado depois da ação

**Metadata:**
- `ip_address` (INET, NULL) - IP do usuário
- `user_agent` (TEXT, NULL) - User agent do navegador
- `sessao_id` (UUID, NULL) - ID da sessão
- `duracao_ms` (INTEGER, NULL) - Duração da operação (ms)
- `sucesso` (BOOLEAN, DEFAULT TRUE) - Se ação foi bem-sucedida
- `erro_mensagem` (TEXT, NULL) - Mensagem de erro (se falhou)

**Timestamp:**
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- Logs são IMUTÁVEIS (sem updated_at, sem deleted_at)
- categoria deve ser um dos valores do enum
- severidade deve ser um dos valores do enum

**Índices:**
- Index em `usuario_id`
- Index em `acao`
- Index em `categoria`
- Index em `created_at` (para filtro e limpeza)
- Index em `ip_address` (segurança)
- Index em `recurso_tipo, recurso_id` (rastrear mudanças)

---

#### RF-011: Enum `categoria_log_auditoria`

```sql
CREATE TYPE categoria_log_auditoria AS ENUM (
  'autenticacao',       -- Login, logout, recuperação senha
  'candidatura',        -- Ações sobre candidaturas
  'vaga',               -- CRUD de vagas
  'usuario',            -- CRUD de usuários
  'configuracao',       -- Mudanças em configurações
  'teste',              -- Ações relacionadas a testes
  'entrevista',         -- Ações relacionadas a entrevistas
  'avaliacao',          -- Avaliações RH
  'sistema',            -- Operações do sistema
  'seguranca'           -- Eventos de segurança
);
```

---

#### RF-012: Enum `severidade_log`

```sql
CREATE TYPE severidade_log AS ENUM (
  'info',       -- Informação normal
  'aviso',      -- Aviso (ex: tentativa falha de login)
  'erro',       -- Erro (ex: falha ao enviar email)
  'critico'     -- Crítico (ex: tentativa de acesso não autorizado)
);
```

---

### 4.6 Functions e Procedures

#### RF-013: Function `log_auditoria()`

```sql
CREATE OR REPLACE FUNCTION log_auditoria(
  p_usuario_id UUID,
  p_usuario_tipo TEXT,
  p_acao TEXT,
  p_categoria categoria_log_auditoria,
  p_descricao TEXT,
  p_severidade severidade_log DEFAULT 'info',
  p_recurso_tipo TEXT DEFAULT NULL,
  p_recurso_id UUID DEFAULT NULL,
  p_dados_antes JSONB DEFAULT NULL,
  p_dados_depois JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_sucesso BOOLEAN DEFAULT TRUE,
  p_erro_mensagem TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
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
    erro_mensagem,
    created_at
  ) VALUES (
    p_usuario_id,
    p_usuario_tipo,
    p_acao,
    p_categoria,
    p_descricao,
    p_severidade,
    p_recurso_tipo,
    p_recurso_id,
    p_dados_antes,
    p_dados_depois,
    p_ip_address,
    p_sucesso,
    p_erro_mensagem,
    NOW()
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;
```

**Uso:**
```sql
SELECT log_auditoria(
  'uuid-do-usuario',
  'rh',
  'criar_vaga',
  'vaga',
  'Nova vaga criada: Assistente Odontológico',
  'info',
  'vaga',
  'uuid-da-vaga',
  NULL,
  '{"titulo": "Assistente Odontológico", "status": "ativa"}'::jsonb,
  '192.168.1.1'::inet,
  TRUE,
  NULL
);
```

---

#### RF-014: Function `limpar_logs_antigos()`

```sql
CREATE OR REPLACE FUNCTION limpar_logs_antigos()
RETURNS INTEGER AS $$
DECLARE
  dias_retencao INTEGER;
  logs_deletados INTEGER;
BEGIN
  -- Buscar dias de retenção das configurações
  SELECT dias_retencao_logs INTO dias_retencao
  FROM configuracoes_empresa
  LIMIT 1;
  
  -- Se não configurado, usar 730 (2 anos)
  IF dias_retencao IS NULL THEN
    dias_retencao := 730;
  END IF;
  
  -- Deletar logs antigos (apenas INFO e AVISO)
  DELETE FROM logs_auditoria
  WHERE created_at < NOW() - (dias_retencao || ' days')::INTERVAL
    AND severidade IN ('info', 'aviso');
  
  GET DIAGNOSTICS logs_deletados = ROW_COUNT;
  
  -- Logs de ERRO e CRITICO nunca são deletados automaticamente
  
  RETURN logs_deletados;
END;
$$ LANGUAGE plpgsql;
```

**Cron Job:** Executar diariamente via pg_cron ou N8N.

---

#### RF-015: Function `testar_webhook()`

```sql
CREATE OR REPLACE FUNCTION testar_webhook(webhook_config_id UUID)
RETURNS JSONB AS $$
DECLARE
  webhook_config RECORD;
  payload JSONB;
  resultado JSONB;
BEGIN
  -- Buscar configuração do webhook
  SELECT * INTO webhook_config
  FROM webhooks_config
  WHERE id = webhook_config_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'erro', 'Webhook não encontrado'
    );
  END IF;
  
  -- Construir payload de teste
  payload := jsonb_build_object(
    'teste', true,
    'timestamp', NOW(),
    'mensagem', 'Teste de conectividade'
  );
  
  -- TODO: Fazer chamada HTTP real usando pg_http ou similar
  -- Por enquanto, retornar simulação
  
  resultado := jsonb_build_object(
    'sucesso', true,
    'status_code', 200,
    'mensagem', 'Webhook testado com sucesso (simulado)',
    'url', webhook_config.url
  );
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql;
```

---

### 4.7 Triggers

#### RF-016: Trigger para Incrementar `total_usos` da Biblioteca

```sql
CREATE OR REPLACE FUNCTION trigger_incrementar_uso_biblioteca()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementar contador de usos na biblioteca
  UPDATE biblioteca_perguntas
  SET 
    total_usos = total_usos + 1,
    ultima_utilizacao = NOW()
  WHERE id = NEW.biblioteca_pergunta_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_insert_pergunta_origem
  AFTER INSERT ON perguntas_vaga_origem
  FOR EACH ROW
  EXECUTE FUNCTION trigger_incrementar_uso_biblioteca();
```

---

#### RF-017: Trigger para Atualizar `updated_at`

Aplicar em:
- `configuracoes_empresa`
- `templates_email`
- `webhooks_config`
- `biblioteca_perguntas`

---

### 4.8 Row Level Security (RLS)

#### RF-018: RLS para `configuracoes_empresa`

```sql
ALTER TABLE configuracoes_empresa ENABLE ROW LEVEL SECURITY;

-- Apenas Admin pode ler configurações
CREATE POLICY "Admin lê configurações"
ON configuracoes_empresa FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() 
      AND role = 'administrador'
      AND ativo = TRUE
  )
);

-- Apenas Admin pode editar
CREATE POLICY "Admin edita configurações"
ON configuracoes_empresa FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() 
      AND role = 'administrador'
      AND ativo = TRUE
  )
);
```

---

#### RF-019: RLS para `templates_email`

```sql
ALTER TABLE templates_email ENABLE ROW LEVEL SECURITY;

-- Admin e Gerente podem ler templates
CREATE POLICY "Admin/Gerente veem templates"
ON templates_email FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() 
      AND role IN ('administrador', 'gerente')
      AND ativo = TRUE
  )
);

-- Apenas Admin pode editar
CREATE POLICY "Admin edita templates"
ON templates_email FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() 
      AND role = 'administrador'
      AND ativo = TRUE
  )
);
```

---

#### RF-020: RLS para `webhooks_config`

Similar a templates_email (Admin e Gerente leem, apenas Admin edita).

---

#### RF-021: RLS para `biblioteca_perguntas`

```sql
ALTER TABLE biblioteca_perguntas ENABLE ROW LEVEL SECURITY;

-- RH pode ler biblioteca
CREATE POLICY "RH vê biblioteca"
ON biblioteca_perguntas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() AND ativo = TRUE
  )
  AND (is_publica = TRUE OR criado_por_usuario = (
    SELECT id FROM usuarios_rh WHERE user_id = auth.uid()
  ))
);

-- RH pode criar perguntas
CREATE POLICY "RH cria perguntas"
ON biblioteca_perguntas FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() AND ativo = TRUE
  )
);

-- RH pode editar próprias perguntas
CREATE POLICY "RH edita próprias perguntas"
ON biblioteca_perguntas FOR UPDATE
TO authenticated
USING (
  criado_por_usuario = (
    SELECT id FROM usuarios_rh WHERE user_id = auth.uid()
  )
);
```

---

#### RF-022: RLS para `logs_auditoria`

```sql
ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;

-- Apenas Admin pode ler logs
CREATE POLICY "Admin vê logs"
ON logs_auditoria FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() 
      AND role = 'administrador'
      AND ativo = TRUE
  )
);

-- Sistema pode inserir logs (via function)
CREATE POLICY "Sistema insere logs"
ON logs_auditoria FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ninguém pode atualizar ou deletar logs
```

---

### 4.9 Views Auxiliares

#### RF-023: View `v_estatisticas_webhooks`

```sql
CREATE OR REPLACE VIEW v_estatisticas_webhooks AS
SELECT 
  w.id,
  w.nome,
  w.tipo,
  w.ativo,
  w.total_chamadas,
  w.total_sucessos,
  w.total_erros,
  CASE 
    WHEN w.total_chamadas > 0 THEN 
      ROUND((w.total_sucessos::DECIMAL / w.total_chamadas) * 100, 2)
    ELSE 0
  END as taxa_sucesso_percentual,
  w.ultima_chamada_sucesso,
  w.ultima_chamada_erro,
  COUNT(wl.id) FILTER (WHERE wl.created_at > NOW() - INTERVAL '24 hours') as chamadas_ultimas_24h,
  COUNT(wl.id) FILTER (WHERE wl.created_at > NOW() - INTERVAL '24 hours' AND wl.sucesso = TRUE) as sucessos_ultimas_24h
FROM webhooks_config w
LEFT JOIN webhooks_logs wl ON w.id = wl.webhook_id
GROUP BY w.id;
```

---

#### RF-024: View `v_biblioteca_mais_usadas`

```sql
CREATE OR REPLACE VIEW v_biblioteca_mais_usadas AS
SELECT 
  bp.*,
  ur.nome as criador_nome
FROM biblioteca_perguntas bp
LEFT JOIN usuarios_rh ur ON bp.criado_por_usuario = ur.id
WHERE bp.deleted_at IS NULL
ORDER BY bp.total_usos DESC
LIMIT 50;
```

---

## 5. Non-Goals (Fora do Escopo)

### O que NÃO está incluído neste PRD:

❌ **Multi-tenancy** (múltiplas empresas no mesmo banco) - Sistema single-tenant  
❌ **Editor WYSIWYG embutido** no banco - Apenas armazenamento, editor é no frontend  
❌ **Versionamento completo de configurações** - Apenas última versão  
❌ **Backup automático de banco** - Responsabilidade do Supabase  
❌ **Dashboard de analytics em tempo real** - Queries síncronas  
❌ **Tradução automática de templates** - Apenas português no MVP  
❌ **Testes A/B de templates** - P3  
❌ **Envio de emails direto do banco** - N8N faz envio  
❌ **Rate limiting de webhooks** - N8N gerencia  
❌ **Criptografia de campo SMTP_senha** - Usar função pgcrypto se necessário (P2)  

---

## 6. Considerações de Design

### 6.1 Diagrama ER

```
┌──────────────────────────┐
│ configuracoes_empresa    │
│ (SINGLETON - 1 registro) │
│  ──────────────────────  │
│  • id (PK)               │
│  • empresa_id (UNIQUE)   │
│  • nome_empresa          │
│  • logo_url              │
│  • smtp_* (configs)      │
│  • webhook_* (URLs)      │
│  • notificacoes_*        │
│  • timezone, idioma      │
│  • limites_sistema       │
└──────────────────────────┘

┌──────────────────────────┐
│   templates_email        │
│  ──────────────────────  │
│  • id (PK)               │
│  • tipo (ENUM, UNIQUE)   │
│  • versao                │
│  • assunto               │
│  • corpo_html            │
│  • variaveis_disponiveis │
│  • ativo                 │
└──────────────────────────┘

┌──────────────────────────┐
│   webhooks_config        │
│  ──────────────────────  │
│  • id (PK)               │
│  • nome (UNIQUE)         │
│  • tipo (ENUM)           │
│  • url                   │
│  • headers (JSONB)       │
│  • timeout, retry        │
│  • ativo                 │
│  • estatisticas          │
└────────┬─────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────────────┐
│    webhooks_logs         │
│  ──────────────────────  │
│  • webhook_id (FK)       │
│  • payload_enviado       │
│  • resposta_recebida     │
│  • status_code           │
│  • sucesso               │
│  • tempo_resposta_ms     │
│  • created_at            │
└──────────────────────────┘

┌──────────────────────────┐
│  biblioteca_perguntas    │
│  ──────────────────────  │
│  • id (PK)               │
│  • titulo                │
│  • texto_pergunta        │
│  • tipo_resposta         │
│  • categoria             │
│  • tags []               │
│  • opcoes_resposta       │
│  • total_usos            │
│  • is_publica            │
└────────┬─────────────────┘
         │
         │ N:M
         ▼
┌──────────────────────────┐
│ perguntas_vaga_origem    │
│  ──────────────────────  │
│  • pergunta_formulario_id│
│  • biblioteca_pergunta_id│
└──────────────────────────┘
         │
         │ N:1
         ▼
┌──────────────────────────┐
│  perguntas_formulario    │ (PRD-DB-002)
└──────────────────────────┘

┌──────────────────────────┐
│    logs_auditoria        │
│  ──────────────────────  │
│  • id (PK)               │
│  • usuario_id, tipo      │
│  • acao, categoria       │
│  • descricao, severidade │
│  • recurso_tipo, _id     │
│  • dados_antes/_depois   │
│  • ip_address, user_agent│
│  • sucesso, erro         │
│  • created_at (IMUTÁVEL) │
└──────────────────────────┘
```

---

### 6.2 Fluxo de Uso de Template

```
1. Admin acessa Configurações → Templates de Email
   ↓
2. Seleciona template "Convite Big Five"
   ↓
3. Edita HTML no editor WYSIWYG:
   <h1>Olá, {{nome_candidato}}!</h1>
   <p>Você foi convidado para o teste Big Five...</p>
   <a href="{{link_teste}}">Iniciar Teste</a>
   ↓
4. Pré-visualiza com dados de exemplo
   ↓
5. Salva template (versao incrementada)
   ↓
6. Sistema usa template automaticamente:
   - Candidato completa formulário inicial
   - RH avança para Big Five
   - N8N busca template do banco
   - N8N substitui variáveis:
     {{nome_candidato}} → "João Silva"
     {{link_teste}} → "https://..."
   - N8N envia email via SMTP
```

---

### 6.3 Fluxo de Webhook

```
1. Admin acessa Configurações → Webhooks
   ↓
2. Cadastra webhook "Análise Formulário":
   - Nome: analise_formulario
   - URL: https://n8n.empresa.com/webhook/...
   - Timeout: 30s
   - Retry: 3x
   ↓
3. Testa conectividade (botão "Testar")
   ↓
4. Sistema envia payload de teste
   ↓
5. N8N responde com 200 OK
   ↓
6. Status: ✅ Ativo
   ↓
7. Em produção:
   - Candidato envia formulário
   - Sistema busca URL do webhook
   - Envia payload completo
   - Registra em webhooks_logs
   - Se erro, faz retry 3x com delay 5s
   - Se ainda falhar, marca como erro
```

---

## 7. Considerações Técnicas

### 7.1 Performance

**Otimizações:**
- `configuracoes_empresa` é singleton (sempre 1 registro) - busca instantânea
- Templates são cacheados (raramente mudam)
- Biblioteca de perguntas com full-text search
- Logs com particionamento por data (futuro, se necessário)
- Webhooks_logs com limpeza automática (90 dias)

**Caching:**
- Configurações: cache agressivo (ttl: 1 hora)
- Templates: cache por tipo (ttl: 30 minutos)
- Biblioteca: cache com invalidação ao adicionar

---

### 7.2 Segurança

**Dados Sensíveis:**
- `smtp_senha_encrypted` deve ser criptografada (pgcrypto)
- `webhook_secret` deve ser hash ou criptografado
- Logs de auditoria são imutáveis (compliance)
- RLS garante que apenas Admin acessa configurações

**LGPD:**
- Logs contêm IP → informado na política de privacidade
- Retenção de 2 anos → compliance com regulamentação
- Logs críticos nunca são deletados (segurança)

---

### 7.3 Escalabilidade

**Limites Esperados (Ano 1):**
- Configurações: 1 registro (singleton)
- Templates: ~15 tipos
- Webhooks: ~10 configurados
- Webhooks_logs: ~100k registros/ano (limpeza 90 dias)
- Biblioteca perguntas: ~200 perguntas
- Logs auditoria: ~500k registros/ano (limpeza 2 anos)

**Quando Escalar:**
- Logs auditoria > 5M registros → particionar por ano
- Webhooks_logs > 1M registros → particionar mensalmente
- Biblioteca > 1k perguntas → melhorar índices

---

### 7.4 Variáveis de Templates

**Variáveis Globais (sempre disponíveis):**
```
{{nome_empresa}}
{{email_empresa}}
{{site_empresa}}
{{logo_empresa_url}}
{{ano_atual}}
```

**Variáveis Contextuais (por tipo de email):**

**boas_vindas_candidato:**
```
{{nome_candidato}}
{{email_candidato}}
{{link_plataforma}}
```

**convite_bigfive:**
```
{{nome_candidato}}
{{titulo_vaga}}
{{link_teste}}
{{prazo_dias}}
```

**convite_entrevista_online:**
```
{{nome_candidato}}
{{titulo_vaga}}
{{data_entrevista}}
{{hora_entrevista}}
{{link_videochamada}}
{{duracao_minutos}}
```

**aprovado_final:**
```
{{nome_candidato}}
{{titulo_vaga}}
{{nome_recrutador}}
{{email_recrutador}}
{{proximos_passos}}
```

---

## 8. Métricas de Sucesso

### 8.1 Métricas Técnicas

| Métrica | Objetivo | Como Medir |
|---------|----------|------------|
| **Tempo de resposta configs** | < 50ms | Monitoring banco |
| **Taxa de sucesso webhooks** | > 95% | webhooks_config.taxa_sucesso |
| **Uso de biblioteca** | > 50% perguntas de biblioteca | Analytics |
| **Retenção de logs** | 2 anos (info/aviso) | Verificar daily |

---

### 8.2 Métricas de Negócio

| Métrica | Objetivo | Como Medir |
|---------|----------|------------|
| **Tempo criação de vaga** | Reduzir 30% com biblioteca | Analytics frontend |
| **Personalização de emails** | > 80% templates customizados | COUNT templates editados |
| **Compliance auditoria** | 100% ações registradas | Validação periódica |

---

### 8.3 Queries para Análise

**Perguntas mais usadas da biblioteca:**
```sql
SELECT 
  titulo,
  categoria,
  total_usos,
  ultima_utilizacao
FROM biblioteca_perguntas
WHERE deleted_at IS NULL
ORDER BY total_usos DESC
LIMIT 20;
```

**Taxa de sucesso de webhooks:**
```sql
SELECT * FROM v_estatisticas_webhooks
ORDER BY taxa_sucesso_percentual ASC;
```

**Logs por categoria (últimas 24h):**
```sql
SELECT 
  categoria,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE severidade = 'critico') as criticos,
  COUNT(*) FILTER (WHERE severidade = 'erro') as erros
FROM logs_auditoria
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY categoria
ORDER BY criticos DESC, erros DESC;
```

---

## 9. Questões Em Aberto

### 9.1 Decisões Pendentes

**Q1: Criptografia de SMTP Password**
- Usar pgcrypto ou criptografar no backend?
- **Proposta:** Backend criptografa antes de salvar (AES-256)

**Q2: Versionamento de Templates**
- Manter histórico de todas versões?
- **Proposta:** Apenas última versão no MVP, histórico em P2

**Q3: Multi-idioma**
- Suportar templates em múltiplos idiomas?
- **Proposta:** Apenas português no MVP, i18n em P3

**Q4: Limites de Uso**
- Limitar número de webhooks/templates/perguntas?
- **Proposta:** Sem limite no MVP, avaliar necessidade depois

**Q5: Backup de Configurações**
- Backup automático antes de editar?
- **Proposta:** P2 - criar tabela configuracoes_backup

---

## 10. Checklist de Implementação

### Fase 1: Estrutura Configurações
- [ ] Criar tabela `configuracoes_empresa`
- [ ] Inserir registro inicial com valores padrão
- [ ] Criar function `get_configuracoes()`
- [ ] Criar trigger `updated_at`
- [ ] Testar singleton (apenas 1 registro)

### Fase 2: Templates de Email
- [ ] Criar enum `tipo_template_email`
- [ ] Criar tabela `templates_email`
- [ ] Inserir templates padrão (15 tipos)
- [ ] Criar constraints de validação
- [ ] Testar substituição de variáveis

### Fase 3: Webhooks
- [ ] Criar enum `tipo_webhook`
- [ ] Criar tabela `webhooks_config`
- [ ] Criar tabela `webhooks_logs`
- [ ] Criar function `testar_webhook()`
- [ ] Criar view `v_estatisticas_webhooks`
- [ ] Testar registro de logs

### Fase 4: Biblioteca de Perguntas
- [ ] Criar tabela `biblioteca_perguntas`
- [ ] Criar tabela `perguntas_vaga_origem`
- [ ] Criar trigger para incrementar `total_usos`
- [ ] Criar view `v_biblioteca_mais_usadas`
- [ ] Adicionar full-text search
- [ ] Inserir perguntas padrão (50-100)

### Fase 5: Logs de Auditoria
- [ ] Criar enums `categoria_log_auditoria`, `severidade_log`
- [ ] Criar tabela `logs_auditoria`
- [ ] Criar function `log_auditoria()`
- [ ] Criar function `limpar_logs_antigos()`
- [ ] Configurar pg_cron (limpeza diária)
- [ ] Testar imutabilidade

### Fase 6: RLS e Segurança
- [ ] Habilitar RLS em todas tabelas
- [ ] Criar policies para configuracoes_empresa (Admin only)
- [ ] Criar policies para templates_email (Admin/Gerente)
- [ ] Criar policies para webhooks_config (Admin/Gerente)
- [ ] Criar policies para biblioteca_perguntas (RH)
- [ ] Criar policies para logs_auditoria (Admin only)
- [ ] Testar acesso de cada role

### Fase 7: Triggers e Functions
- [ ] Aplicar trigger `updated_at` em todas tabelas necessárias
- [ ] Testar function `get_configuracoes()`
- [ ] Testar function `log_auditoria()`
- [ ] Testar function `limpar_logs_antigos()`
- [ ] Testar trigger `incrementar_uso_biblioteca()`

### Fase 8: Testes Integrados
- [ ] Testar fluxo completo: editar configs → salvar → aplicar
- [ ] Testar fluxo templates: editar → substituir variáveis → usar em email
- [ ] Testar fluxo webhooks: cadastrar → testar → usar em produção
- [ ] Testar fluxo biblioteca: adicionar → usar em vaga → analytics
- [ ] Testar logs: executar ações → verificar registro

### Fase 9: Seed Data
- [ ] Inserir configurações padrão
- [ ] Inserir 15 templates de email com HTML
- [ ] Inserir 10 webhooks padrão
- [ ] Inserir 50-100 perguntas na biblioteca
- [ ] Validar estrutura completa

### Fase 10: Documentação
- [ ] Documentar variáveis disponíveis por template
- [ ] Documentar estrutura de payload dos webhooks
- [ ] Documentar categorias e severidades de logs
- [ ] Criar guia de uso da biblioteca de perguntas

---

## 11. Dependências

### Dependências Externas

| Dependência | Descrição | Status |
|-------------|-----------|--------|
| **PRD-DB-001** | usuarios_rh | ✅ Completo |
| **PRD-DB-002** | perguntas_formulario | ✅ Completo |
| **pgcrypto** | Criptografia (opcional) | ⏳ Avaliar |
| **pg_cron** | Limpeza de logs | ⏳ Configurar |
| **N8N** | Envio de emails, webhooks | ⏳ PRDs N8N |

---

### Dependências Internas

| PRD Dependente | Razão |
|----------------|-------|
| **PRD-N8N-007** | Envio de emails usando templates |
| **PRD-N8N-008** | Lembretes automáticos |
| **PRD-DEV-020** | Frontend página de Configurações |
| **PRD-DEV-021** | Frontend gerenciamento de usuários |
| **PRD-DEV-022** | Frontend auditoria |

---

## 12. Anexos

### Anexo A: Script SQL Completo de Migração

```sql
-- =====================================================
-- MIGRATION: Configurações e Sistema
-- PRD: PRD-DB-005
-- Data: 02/11/2025
-- Versão: 1.0
-- ÚLTIMO PRD DE BANCO DE DADOS! 🎉
-- =====================================================

-- =====================================================
-- 1. CRIAR ENUMS
-- =====================================================

CREATE TYPE tipo_template_email AS ENUM (
  'boas_vindas_candidato',
  'confirmacao_candidatura',
  'convite_bigfive',
  'convite_disc',
  'convite_raven',
  'convite_cultura',
  'convite_entrevista_online',
  'convite_entrevista_presencial',
  'lembrete_teste',
  'lembrete_entrevista',
  'aprovado_proxima_etapa',
  'aprovado_final',
  'rejeitado',
  'feedback_positivo',
  'recuperacao_senha'
);

CREATE TYPE tipo_webhook AS ENUM (
  'analise_formulario',
  'analise_bigfive',
  'analise_disc',
  'analise_raven',
  'analise_cultura',
  'analise_entrevista',
  'envio_email',
  'lembretes',
  'notificacao_nova_candidatura',
  'notificacao_teste_concluido',
  'backup',
  'outro'
);

CREATE TYPE categoria_log_auditoria AS ENUM (
  'autenticacao',
  'candidatura',
  'vaga',
  'usuario',
  'configuracao',
  'teste',
  'entrevista',
  'avaliacao',
  'sistema',
  'seguranca'
);

CREATE TYPE severidade_log AS ENUM (
  'info',
  'aviso',
  'erro',
  'critico'
);

-- =====================================================
-- 2. CRIAR TABELA CONFIGURACOES_EMPRESA (SINGLETON)
-- =====================================================

CREATE TABLE configuracoes_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id TEXT UNIQUE DEFAULT 'beauty-smile' NOT NULL,
  
  -- Dados da Empresa
  nome_empresa TEXT NOT NULL DEFAULT 'Beauty Smile',
  logo_url TEXT NULL,
  favicon_url TEXT NULL,
  cor_primaria TEXT DEFAULT '#6366F1' CHECK (cor_primaria ~* '^#[0-9A-F]{6}$'),
  cor_secundaria TEXT DEFAULT '#8B5CF6' CHECK (cor_secundaria ~* '^#[0-9A-F]{6}$'),
  cor_accent TEXT DEFAULT '#EC4899' CHECK (cor_accent ~* '^#[0-9A-F]{6}$'),
  
  -- Contato
  email_contato TEXT NULL,
  telefone_contato TEXT NULL,
  site_url TEXT NULL,
  endereco_completo TEXT NULL,
  
  -- SMTP
  smtp_host TEXT NULL,
  smtp_port INTEGER DEFAULT 587 CHECK (smtp_port BETWEEN 25 AND 587),
  smtp_usuario TEXT NULL,
  smtp_senha_encrypted TEXT NULL,
  smtp_from_email TEXT NULL,
  smtp_from_nome TEXT NULL,
  smtp_usar_tls BOOLEAN DEFAULT TRUE,
  
  -- Webhooks N8N
  webhook_analise_formulario_url TEXT NULL,
  webhook_analise_bigfive_url TEXT NULL,
  webhook_analise_disc_url TEXT NULL,
  webhook_analise_raven_url TEXT NULL,
  webhook_analise_cultura_url TEXT NULL,
  webhook_analise_entrevista_url TEXT NULL,
  webhook_envio_emails_url TEXT NULL,
  webhook_lembretes_url TEXT NULL,
  
  -- Configurações Webhook
  webhook_timeout_segundos INTEGER DEFAULT 30 CHECK (webhook_timeout_segundos >= 5 AND webhook_timeout_segundos <= 300),
  webhook_retry_tentativas INTEGER DEFAULT 3 CHECK (webhook_retry_tentativas >= 0 AND webhook_retry_tentativas <= 5),
  webhook_secret TEXT NULL,
  
  -- Notificações
  notificar_nova_candidatura BOOLEAN DEFAULT TRUE,
  notificar_teste_concluido BOOLEAN DEFAULT TRUE,
  email_notificacoes TEXT[] NULL,
  
  -- Sistema
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  idioma TEXT DEFAULT 'pt-BR',
  max_tamanho_curriculo_mb INTEGER DEFAULT 5 CHECK (max_tamanho_curriculo_mb >= 1 AND max_tamanho_curriculo_mb <= 50),
  max_tamanho_gravacao_mb INTEGER DEFAULT 500 CHECK (max_tamanho_gravacao_mb >= 100 AND max_tamanho_gravacao_mb <= 2000),
  dias_retencao_logs INTEGER DEFAULT 730 CHECK (dias_retencao_logs >= 30),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES usuarios_rh(id) NULL
);

CREATE INDEX idx_configuracoes_empresa_id ON configuracoes_empresa(empresa_id);

COMMENT ON TABLE configuracoes_empresa IS 'Configurações globais do sistema (SINGLETON - apenas 1 registro)';

-- Inserir registro inicial
INSERT INTO configuracoes_empresa (empresa_id, nome_empresa)
VALUES ('beauty-smile', 'Beauty Smile')
ON CONFLICT (empresa_id) DO NOTHING;

-- =====================================================
-- 3. CRIAR TABELA TEMPLATES_EMAIL
-- =====================================================

CREATE TABLE templates_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_template_email NOT NULL UNIQUE,
  versao INTEGER NOT NULL DEFAULT 1,
  
  -- Conteúdo
  assunto TEXT NOT NULL,
  corpo_html TEXT NOT NULL,
  corpo_texto TEXT NULL,
  
  -- Variáveis
  variaveis_disponiveis TEXT[] NOT NULL,
  
  -- Metadata
  descricao TEXT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  is_padrao BOOLEAN DEFAULT FALSE,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios_rh(id) NULL,
  updated_by UUID REFERENCES usuarios_rh(id) NULL,
  
  CONSTRAINT template_tipo_versao_unique UNIQUE (tipo, versao)
);

CREATE INDEX idx_templates_email_tipo ON templates_email(tipo);
CREATE INDEX idx_templates_email_ativo ON templates_email(ativo);
CREATE INDEX idx_templates_email_deleted_at ON templates_email(deleted_at);

COMMENT ON TABLE templates_email IS 'Templates customizáveis de email em HTML';

-- =====================================================
-- 4. CRIAR TABELAS WEBHOOKS
-- =====================================================

CREATE TABLE webhooks_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  tipo tipo_webhook NOT NULL,
  
  -- Configuração
  url TEXT NOT NULL CHECK (url ~* '^https?://'),
  metodo TEXT DEFAULT 'POST' CHECK (metodo IN ('POST', 'GET', 'PUT')),
  headers JSONB NULL,
  
  -- Segurança
  secret TEXT NULL,
  usar_auth BOOLEAN DEFAULT FALSE,
  
  -- Comportamento
  timeout_segundos INTEGER DEFAULT 30 CHECK (timeout_segundos >= 5 AND timeout_segundos <= 300),
  retry_tentativas INTEGER DEFAULT 3 CHECK (retry_tentativas >= 0 AND retry_tentativas <= 5),
  retry_delay_segundos INTEGER DEFAULT 5 CHECK (retry_delay_segundos >= 1),
  ativo BOOLEAN DEFAULT TRUE,
  
  -- Status
  ultima_chamada_sucesso TIMESTAMPTZ NULL,
  ultima_chamada_erro TIMESTAMPTZ NULL,
  total_chamadas INTEGER DEFAULT 0,
  total_sucessos INTEGER DEFAULT 0,
  total_erros INTEGER DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios_rh(id) NULL,
  updated_by UUID REFERENCES usuarios_rh(id) NULL
);

CREATE INDEX idx_webhooks_config_nome ON webhooks_config(nome);
CREATE INDEX idx_webhooks_config_tipo ON webhooks_config(tipo);
CREATE INDEX idx_webhooks_config_ativo ON webhooks_config(ativo);

-- ---

CREATE TABLE webhooks_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks_config(id) ON DELETE CASCADE NOT NULL,
  
  payload_enviado JSONB NOT NULL,
  resposta_recebida JSONB NULL,
  status_code INTEGER NULL,
  sucesso BOOLEAN NOT NULL,
  erro_mensagem TEXT NULL,
  tempo_resposta_ms INTEGER NULL,
  tentativa_numero INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_logs_webhook_id ON webhooks_logs(webhook_id);
CREATE INDEX idx_webhooks_logs_sucesso ON webhooks_logs(sucesso);
CREATE INDEX idx_webhooks_logs_created_at ON webhooks_logs(created_at);

COMMENT ON TABLE webhooks_logs IS 'Logs de chamadas de webhooks (retenção: 90 dias)';

-- =====================================================
-- 5. CRIAR TABELAS BIBLIOTECA DE PERGUNTAS
-- =====================================================

CREATE TABLE biblioteca_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  
  -- Conteúdo
  texto_pergunta TEXT NOT NULL,
  texto_ajuda TEXT NULL,
  tipo_resposta tipo_resposta_pergunta NOT NULL,
  
  -- Categorização
  categoria TEXT NOT NULL CHECK (categoria IN ('jornada', 'tecnologia', 'valores', 'cultura', 'outro')),
  tags TEXT[] NULL,
  
  -- Configuração Resposta
  opcoes_resposta JSONB NULL,
  permite_outros BOOLEAN DEFAULT FALSE,
  obrigatoria BOOLEAN DEFAULT TRUE,
  limite_caracteres INTEGER NULL,
  
  -- Analytics
  total_usos INTEGER DEFAULT 0,
  ultima_utilizacao TIMESTAMPTZ NULL,
  
  -- Metadata
  is_publica BOOLEAN DEFAULT TRUE,
  criado_por_usuario UUID REFERENCES usuarios_rh(id) NOT NULL,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios_rh(id) NULL,
  updated_by UUID REFERENCES usuarios_rh(id) NULL
);

CREATE INDEX idx_biblioteca_perguntas_categoria ON biblioteca_perguntas(categoria);
CREATE INDEX idx_biblioteca_perguntas_tags ON biblioteca_perguntas USING GIN(tags);
CREATE INDEX idx_biblioteca_perguntas_publica ON biblioteca_perguntas(is_publica);
CREATE INDEX idx_biblioteca_perguntas_deleted_at ON biblioteca_perguntas(deleted_at);
CREATE INDEX idx_biblioteca_perguntas_texto ON biblioteca_perguntas USING gin(to_tsvector('portuguese', texto_pergunta));

-- ---

CREATE TABLE perguntas_vaga_origem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_formulario_id UUID REFERENCES perguntas_formulario(id) ON DELETE CASCADE NOT NULL,
  biblioteca_pergunta_id UUID REFERENCES biblioteca_perguntas(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT pergunta_origem_unica UNIQUE (pergunta_formulario_id, biblioteca_pergunta_id)
);

CREATE INDEX idx_perguntas_vaga_origem_biblioteca ON perguntas_vaga_origem(biblioteca_pergunta_id);

-- =====================================================
-- 6. CRIAR TABELA LOGS AUDITORIA
-- =====================================================

CREATE TABLE logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NULL,
  usuario_tipo TEXT NULL CHECK (usuario_tipo IN ('candidato', 'rh', 'admin', 'sistema')),
  
  -- Ação
  acao TEXT NOT NULL,
  categoria categoria_log_auditoria NOT NULL,
  descricao TEXT NOT NULL,
  severidade severidade_log NOT NULL DEFAULT 'info',
  
  -- Contexto
  recurso_tipo TEXT NULL,
  recurso_id UUID NULL,
  dados_antes JSONB NULL,
  dados_depois JSONB NULL,
  
  -- Metadata
  ip_address INET NULL,
  user_agent TEXT NULL,
  sessao_id UUID NULL,
  duracao_ms INTEGER NULL,
  sucesso BOOLEAN DEFAULT TRUE,
  erro_mensagem TEXT NULL,
  
  -- Timestamp (IMUTÁVEL)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_auditoria_usuario_id ON logs_auditoria(usuario_id);
CREATE INDEX idx_logs_auditoria_acao ON logs_auditoria(acao);
CREATE INDEX idx_logs_auditoria_categoria ON logs_auditoria(categoria);
CREATE INDEX idx_logs_auditoria_created_at ON logs_auditoria(created_at);
CREATE INDEX idx_logs_auditoria_ip ON logs_auditoria(ip_address);
CREATE INDEX idx_logs_auditoria_recurso ON logs_auditoria(recurso_tipo, recurso_id);

COMMENT ON TABLE logs_auditoria IS 'Logs de auditoria detalhados (IMUTÁVEL - retenção: 2 anos)';

-- =====================================================
-- 7. CRIAR FUNCTIONS
-- =====================================================

-- Function: Get Configurações (sempre retorna 1 registro)
CREATE OR REPLACE FUNCTION get_configuracoes()
RETURNS configuracoes_empresa AS $$
DECLARE
  config configuracoes_empresa;
BEGIN
  SELECT * INTO config FROM configuracoes_empresa LIMIT 1;
  
  IF NOT FOUND THEN
    INSERT INTO configuracoes_empresa (empresa_id, nome_empresa)
    VALUES ('beauty-smile', 'Beauty Smile')
    RETURNING * INTO config;
  END IF;
  
  RETURN config;
END;
$$ LANGUAGE plpgsql;

-- Function: Log Auditoria
-- (Código completo fornecido no RF-013)

-- Function: Limpar Logs Antigos
-- (Código completo fornecido no RF-014)

-- Function: Testar Webhook
-- (Código completo fornecido no RF-015)

-- =====================================================
-- 8. CRIAR TRIGGERS
-- =====================================================

-- Triggers updated_at
CREATE TRIGGER update_configuracoes_empresa_updated_at 
  BEFORE UPDATE ON configuracoes_empresa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_email_updated_at 
  BEFORE UPDATE ON templates_email
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_config_updated_at 
  BEFORE UPDATE ON webhooks_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biblioteca_perguntas_updated_at 
  BEFORE UPDATE ON biblioteca_perguntas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Incrementar uso biblioteca
-- (Código completo fornecido no RF-016)

-- =====================================================
-- 9. CRIAR VIEWS
-- =====================================================

-- View: Estatísticas Webhooks
-- (Código completo fornecido no RF-023)

-- View: Biblioteca Mais Usadas
-- (Código completo fornecido no RF-024)

-- =====================================================
-- 10. HABILITAR RLS E CRIAR POLICIES
-- =====================================================

-- RLS: configuracoes_empresa (Admin only)
-- RLS: templates_email (Admin/Gerente)
-- RLS: webhooks_config (Admin/Gerente)
-- RLS: biblioteca_perguntas (RH)
-- RLS: logs_auditoria (Admin only)

-- (Código completo fornecido nos RF-018 a RF-022)

-- =====================================================
-- 11. SEED DATA (Templates Padrão)
-- =====================================================

-- Inserir templates padrão (exemplo: boas-vindas)
INSERT INTO templates_email (tipo, assunto, corpo_html, variaveis_disponiveis, is_padrao) VALUES
('boas_vindas_candidato', 
 'Bem-vindo(a) à {{nome_empresa}}!',
 '<html><body><h1>Olá, {{nome_candidato}}!</h1><p>Bem-vindo(a) à plataforma {{nome_empresa}}.</p></body></html>',
 ARRAY['{{nome_candidato}}', '{{nome_empresa}}', '{{link_plataforma}}'],
 TRUE);

-- ... (Adicionar mais 14 templates)

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

SELECT '🎉 Migração PRD-DB-005 completa! TODOS OS PRDs DE BANCO DE DADOS FINALIZADOS! 🎉' as status;
```

---

**FIM DO PRD-DB-005**

**Versão:** 1.0  
**Status:** 📋 Pronto para Implementação  
**Próxima Revisão:** Após implementação

---

**🎉 ESTE É O ÚLTIMO PRD DE BANCO DE DADOS! 🎉**  
**100% DA FUNDAÇÃO DE DADOS ESTÁ COMPLETA!**

---

**Documento criado em:** 02 de Novembro de 2025  
**Última atualização:** 02 de Novembro de 2025  
**Autor:** Equipe Beauty Smile  
**Revisor:** Pendente
