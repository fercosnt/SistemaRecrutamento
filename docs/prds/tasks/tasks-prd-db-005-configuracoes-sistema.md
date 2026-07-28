# Tasks: PRD-DB-005 - Configurações e Sistema

**PRD Reference:** [prd-db-005-configuracoes-sistema.md](../prd/prd-db-005-configuracoes-sistema.md)
**Status:** 📋 Aguardando Implementação
**Prioridade:** 🔴 P0 - Crítica (MVP)
**Dependências:** PRD-DB-001 ✅, PRD-DB-002 ✅

---

## Relevant Files

### SQL Migration Files
- `tasks/sql/19-enums-configuracoes.sql` - Criação dos enums necessários (tipo_template_email, tipo_webhook, categoria_log_auditoria, severidade_log)
- `tasks/sql/20-tabela-configuracoes-empresa.sql` - Tabela singleton de configurações da empresa
- `tasks/sql/21-tabela-templates-email.sql` - Tabela de templates de email customizáveis
- `tasks/sql/22-tabelas-webhooks.sql` - Tabelas webhooks_config e webhooks_logs
- `tasks/sql/23-tabelas-biblioteca-perguntas.sql` - Tabelas biblioteca_perguntas e perguntas_vaga_origem
- `tasks/sql/24-tabela-logs-auditoria.sql` - Tabela de logs de auditoria detalhados (imutável)
- `tasks/sql/25-functions-configuracoes.sql` - Functions: get_configuracoes, log_auditoria, limpar_logs_antigos, testar_webhook
- `tasks/sql/26-triggers-configuracoes.sql` - Triggers: updated_at, incrementar_uso_biblioteca
- `tasks/sql/27-views-configuracoes.sql` - Views: v_estatisticas_webhooks, v_biblioteca_mais_usadas
- `tasks/sql/28-rls-configuracoes.sql` - Todas as RLS policies para as tabelas de configurações

### Documentation
- `tasks/IMPLEMENTATION_NOTES.md` - Atualizar com informações sobre configurações e sistema
- `tasks/TESTING_CHECKLIST.md` - Atualizar com testes específicos deste PRD

### Notes

- Este é o ÚLTIMO PRD de banco de dados - completa a fundação de dados do sistema
- A tabela `configuracoes_empresa` é um SINGLETON (apenas 1 registro)
- Logs de auditoria são IMUTÁVEIS (sem updated_at ou deleted_at)
- Templates de email usam variáveis dinâmicas ({{nome_candidato}}, etc.)
- Biblioteca de perguntas se integra com perguntas_formulario do PRD-DB-002
- Webhooks são gerenciados para integração com N8N

---

## Tasks

- [ ] 1.0 Criar Enums e Estrutura Base
  - [ ] 1.1 Criar enum `tipo_template_email` com todos os 15 valores do PRD (boas_vindas_candidato, confirmacao_candidatura, convite_bigfive, convite_disc, convite_raven, convite_cultura, convite_entrevista_online, convite_entrevista_presencial, lembrete_teste, lembrete_entrevista, aprovado_proxima_etapa, aprovado_final, rejeitado, feedback_positivo, recuperacao_senha)
  - [ ] 1.2 Adicionar comentários descritivos para cada valor do enum tipo_template_email
  - [ ] 1.3 Criar enum `tipo_webhook` com todos os 12 valores do PRD (analise_formulario, analise_bigfive, analise_disc, analise_raven, analise_cultura, analise_entrevista, envio_email, lembretes, notificacao_nova_candidatura, notificacao_teste_concluido, backup, outro)
  - [ ] 1.4 Adicionar comentários descritivos para cada valor do enum tipo_webhook
  - [ ] 1.5 Criar enum `categoria_log_auditoria` com todos os 10 valores do PRD (autenticacao, candidatura, vaga, usuario, configuracao, teste, entrevista, avaliacao, sistema, seguranca)
  - [ ] 1.6 Adicionar comentários descritivos para cada valor do enum categoria_log_auditoria
  - [ ] 1.7 Criar enum `severidade_log` com valores: 'info', 'aviso', 'erro', 'critico'
  - [ ] 1.8 Adicionar comentários descritivos para cada valor do enum severidade_log
  - [ ] 1.9 Salvar script de criação de enums em `tasks/sql/19-enums-configuracoes.sql`
  - [ ] 1.10 Aplicar migration usando `mcp_supabase_apply_migration`

- [ ] 2.0 Criar Tabela de Configurações da Empresa (Singleton)
  - [ ] 2.1 Criar migration para tabela `configuracoes_empresa` com campo id (UUID, PK) e empresa_id (TEXT, UNIQUE, DEFAULT 'beauty-smile')
  - [ ] 2.2 Adicionar campos de dados da empresa (nome_empresa TEXT NOT NULL DEFAULT 'Beauty Smile', logo_url, favicon_url, cor_primaria, cor_secundaria, cor_accent)
  - [ ] 2.3 Adicionar constraint CHECK para cores hex válidas (formato #RRGGBB) em cor_primaria, cor_secundaria, cor_accent
  - [ ] 2.4 Adicionar campos de contato (email_contato, telefone_contato, site_url, endereco_completo)
  - [ ] 2.5 Adicionar campos de SMTP (smtp_host, smtp_port DEFAULT 587, smtp_usuario, smtp_senha_encrypted, smtp_from_email, smtp_from_nome, smtp_usar_tls DEFAULT TRUE)
  - [ ] 2.6 Adicionar constraint CHECK para smtp_port (BETWEEN 25 AND 587)
  - [ ] 2.7 Adicionar campos de URLs de webhooks N8N (webhook_analise_formulario_url, webhook_analise_bigfive_url, webhook_analise_disc_url, webhook_analise_raven_url, webhook_analise_cultura_url, webhook_analise_entrevista_url, webhook_envio_emails_url, webhook_lembretes_url)
  - [ ] 2.8 Adicionar campos de configurações webhook (webhook_timeout_segundos DEFAULT 30, webhook_retry_tentativas DEFAULT 3, webhook_secret)
  - [ ] 2.9 Adicionar constraints CHECK para webhook_timeout_segundos (>= 5 AND <= 300) e webhook_retry_tentativas (>= 0 AND <= 5)
  - [ ] 2.10 Adicionar campos de notificações (notificar_nova_candidatura DEFAULT TRUE, notificar_teste_concluido DEFAULT TRUE, email_notificacoes TEXT[])
  - [ ] 2.11 Adicionar campos de sistema (timezone DEFAULT 'America/Sao_Paulo', idioma DEFAULT 'pt-BR', max_tamanho_curriculo_mb DEFAULT 5, max_tamanho_gravacao_mb DEFAULT 500, dias_retencao_logs DEFAULT 730)
  - [ ] 2.12 Adicionar constraints CHECK para max_tamanho_curriculo_mb (>= 1 AND <= 50), max_tamanho_gravacao_mb (>= 100 AND <= 2000), dias_retencao_logs (>= 30)
  - [ ] 2.13 Adicionar campos de auditoria (created_at, updated_at, updated_by UUID → usuarios_rh.id)
  - [ ] 2.14 Criar índice em empresa_id para busca rápida
  - [ ] 2.15 Adicionar comentário na tabela explicando que é SINGLETON (apenas 1 registro)
  - [ ] 2.16 Inserir registro inicial com empresa_id='beauty-smile' e nome_empresa='Beauty Smile' usando ON CONFLICT DO NOTHING
  - [ ] 2.17 Salvar script em `tasks/sql/20-tabela-configuracoes-empresa.sql`
  - [ ] 2.18 Aplicar migration usando `mcp_supabase_apply_migration`

- [ ] 3.0 Criar Tabelas de Templates de Email
  - [ ] 3.1 Criar migration para tabela `templates_email` com campo id (UUID, PK) e tipo (tipo_template_email NOT NULL UNIQUE)
  - [ ] 3.2 Adicionar campo versao (INTEGER NOT NULL DEFAULT 1)
  - [ ] 3.3 Adicionar campos de conteúdo (assunto TEXT NOT NULL, corpo_html TEXT NOT NULL, corpo_texto TEXT NULL)
  - [ ] 3.4 Adicionar campo variaveis_disponiveis (TEXT[] NOT NULL) para armazenar variáveis que podem ser usadas
  - [ ] 3.5 Adicionar campos de metadata (descricao TEXT, ativo BOOLEAN DEFAULT TRUE, is_padrao BOOLEAN DEFAULT FALSE)
  - [ ] 3.6 Adicionar campos de auditoria (created_at, updated_at, deleted_at, created_by UUID → usuarios_rh.id, updated_by UUID → usuarios_rh.id)
  - [ ] 3.7 Criar constraint UNIQUE (tipo, versao) para permitir versionamento
  - [ ] 3.8 Criar índices: tipo, ativo, deleted_at
  - [ ] 3.9 Criar trigger `update_templates_email_updated_at` usando função do PRD-DB-001
  - [ ] 3.10 Adicionar comentários descritivos na tabela e colunas principais
  - [ ] 3.11 Salvar script em `tasks/sql/21-tabela-templates-email.sql`
  - [ ] 3.12 Aplicar migration usando `mcp_supabase_apply_migration`

- [ ] 4.0 Criar Tabelas de Webhooks N8N
  - [ ] 4.1 Criar migration para tabela `webhooks_config` com campo id (UUID, PK), nome (TEXT NOT NULL UNIQUE), tipo (tipo_webhook NOT NULL)
  - [ ] 4.2 Adicionar campos de configuração (url TEXT NOT NULL, metodo TEXT DEFAULT 'POST', headers JSONB NULL)
  - [ ] 4.3 Adicionar constraint CHECK para url (começar com http:// ou https://) usando regex
  - [ ] 4.4 Adicionar constraint CHECK para metodo (IN 'POST', 'GET', 'PUT')
  - [ ] 4.5 Adicionar campos de segurança (secret TEXT, usar_auth BOOLEAN DEFAULT FALSE)
  - [ ] 4.6 Adicionar campos de comportamento (timeout_segundos INTEGER DEFAULT 30, retry_tentativas INTEGER DEFAULT 3, retry_delay_segundos INTEGER DEFAULT 5, ativo BOOLEAN DEFAULT TRUE)
  - [ ] 4.7 Adicionar constraints CHECK para timeout_segundos (>= 5 AND <= 300), retry_tentativas (>= 0 AND <= 5), retry_delay_segundos (>= 1)
  - [ ] 4.8 Adicionar campos de status (ultima_chamada_sucesso TIMESTAMPTZ, ultima_chamada_erro TIMESTAMPTZ, total_chamadas INTEGER DEFAULT 0, total_sucessos INTEGER DEFAULT 0, total_erros INTEGER DEFAULT 0)
  - [ ] 4.9 Adicionar campos de auditoria (created_at, updated_at, deleted_at, created_by UUID → usuarios_rh.id, updated_by UUID → usuarios_rh.id)
  - [ ] 4.10 Criar índices: nome, tipo, ativo
  - [ ] 4.11 Criar trigger `update_webhooks_config_updated_at` usando função do PRD-DB-001
  - [ ] 4.12 Criar migration para tabela `webhooks_logs` com campo id (UUID, PK), webhook_id (UUID FK → webhooks_config.id NOT NULL)
  - [ ] 4.13 Adicionar campos de log (payload_enviado JSONB NOT NULL, resposta_recebida JSONB NULL, status_code INTEGER, sucesso BOOLEAN NOT NULL, erro_mensagem TEXT, tempo_resposta_ms INTEGER, tentativa_numero INTEGER DEFAULT 1)
  - [ ] 4.14 Adicionar campo created_at TIMESTAMPTZ DEFAULT NOW() (tabela IMUTÁVEL - sem updated_at ou deleted_at)
  - [ ] 4.15 Criar índices: webhook_id, sucesso, created_at (para limpeza de logs antigos)
  - [ ] 4.16 Adicionar comentário na tabela webhooks_logs explicando retenção de 90 dias
  - [ ] 4.17 Adicionar comentários descritivos nas tabelas e colunas principais
  - [ ] 4.18 Salvar script em `tasks/sql/22-tabelas-webhooks.sql`
  - [ ] 4.19 Aplicar migration usando `mcp_supabase_apply_migration`

- [ ] 5.0 Criar Tabelas de Biblioteca de Perguntas
  - [ ] 5.1 Criar migration para tabela `biblioteca_perguntas` com campo id (UUID, PK), titulo (TEXT NOT NULL)
  - [ ] 5.2 Adicionar campos de conteúdo (texto_pergunta TEXT NOT NULL, texto_ajuda TEXT NULL, tipo_resposta tipo_resposta_pergunta NOT NULL) - reusar enum do PRD-DB-002
  - [ ] 5.3 Adicionar campos de categorização (categoria TEXT NOT NULL, tags TEXT[] NULL)
  - [ ] 5.4 Adicionar constraint CHECK para categoria (IN 'jornada', 'tecnologia', 'valores', 'cultura', 'outro')
  - [ ] 5.5 Adicionar campos de configuração de resposta (opcoes_resposta JSONB NULL, permite_outros BOOLEAN DEFAULT FALSE, obrigatoria BOOLEAN DEFAULT TRUE, limite_caracteres INTEGER NULL)
  - [ ] 5.6 Adicionar campos de analytics (total_usos INTEGER DEFAULT 0, ultima_utilizacao TIMESTAMPTZ NULL)
  - [ ] 5.7 Adicionar campos de metadata (is_publica BOOLEAN DEFAULT TRUE, criado_por_usuario UUID → usuarios_rh.id NOT NULL)
  - [ ] 5.8 Adicionar campos de auditoria (created_at, updated_at, deleted_at, created_by UUID → usuarios_rh.id, updated_by UUID → usuarios_rh.id)
  - [ ] 5.9 Criar índices: categoria, tags (GIN index para arrays), is_publica, deleted_at
  - [ ] 5.10 Criar índice full-text search em texto_pergunta usando to_tsvector('portuguese', texto_pergunta)
  - [ ] 5.11 Criar trigger `update_biblioteca_perguntas_updated_at` usando função do PRD-DB-001
  - [ ] 5.12 Criar migration para tabela `perguntas_vaga_origem` com campos: id (UUID, PK), pergunta_formulario_id (UUID FK → perguntas_formulario.id NOT NULL), biblioteca_pergunta_id (UUID FK → biblioteca_perguntas.id NOT NULL)
  - [ ] 5.13 Adicionar campo created_at TIMESTAMPTZ DEFAULT NOW()
  - [ ] 5.14 Criar constraint UNIQUE (pergunta_formulario_id, biblioteca_pergunta_id) para evitar duplicatas
  - [ ] 5.15 Criar índice em biblioteca_pergunta_id para analytics
  - [ ] 5.16 Adicionar comentários descritivos nas tabelas e colunas principais
  - [ ] 5.17 Salvar script em `tasks/sql/23-tabelas-biblioteca-perguntas.sql`
  - [ ] 5.18 Aplicar migration usando `mcp_supabase_apply_migration`

- [ ] 6.0 Criar Tabela de Logs de Auditoria
  - [ ] 6.1 Criar migration para tabela `logs_auditoria` com campo id (UUID, PK)
  - [ ] 6.2 Adicionar campos de identificação (usuario_id UUID NULL, usuario_tipo TEXT NULL) com constraint CHECK para usuario_tipo (IN 'candidato', 'rh', 'admin', 'sistema')
  - [ ] 6.3 Adicionar campos de ação (acao TEXT NOT NULL, categoria categoria_log_auditoria NOT NULL, descricao TEXT NOT NULL, severidade severidade_log NOT NULL DEFAULT 'info')
  - [ ] 6.4 Adicionar campos de contexto (recurso_tipo TEXT NULL, recurso_id UUID NULL, dados_antes JSONB NULL, dados_depois JSONB NULL)
  - [ ] 6.5 Adicionar campos de metadata (ip_address INET NULL, user_agent TEXT NULL, sessao_id UUID NULL, duracao_ms INTEGER NULL, sucesso BOOLEAN DEFAULT TRUE, erro_mensagem TEXT NULL)
  - [ ] 6.6 Adicionar campo created_at TIMESTAMPTZ DEFAULT NOW() (tabela IMUTÁVEL - sem updated_at ou deleted_at)
  - [ ] 6.7 Criar índices: usuario_id, acao, categoria, created_at (para filtro e limpeza), ip_address (segurança), composto (recurso_tipo, recurso_id)
  - [ ] 6.8 Adicionar comentário na tabela explicando que é IMUTÁVEL e retenção de 2 anos (info/aviso), logs críticos nunca deletados
  - [ ] 6.9 Adicionar comentários descritivos na tabela e colunas principais
  - [ ] 6.10 Salvar script em `tasks/sql/24-tabela-logs-auditoria.sql`
  - [ ] 6.11 Aplicar migration usando `mcp_supabase_apply_migration`

- [ ] 7.0 Criar Functions Auxiliares
  - [ ] 7.1 Criar function `get_configuracoes()` que retorna configuracoes_empresa (singleton)
  - [ ] 7.2 Implementar lógica: buscar configurações, se não existir, criar registro padrão com empresa_id='beauty-smile'
  - [ ] 7.3 Adicionar `SET search_path = public` na function para segurança
  - [ ] 7.4 Adicionar comentários descritivos na function
  - [ ] 7.5 Criar function `log_auditoria()` com todos os parâmetros do PRD (p_usuario_id, p_usuario_tipo, p_acao, p_categoria, p_descricao, p_severidade, p_recurso_tipo, p_recurso_id, p_dados_antes, p_dados_depois, p_ip_address, p_sucesso, p_erro_mensagem)
  - [ ] 7.6 Implementar lógica para inserir registro em logs_auditoria com todos os campos
  - [ ] 7.7 Garantir que a function retorna UUID do log criado
  - [ ] 7.8 Adicionar `SET search_path = public` na function
  - [ ] 7.9 Adicionar comentários descritivos na function com exemplo de uso
  - [ ] 7.10 Criar function `limpar_logs_antigos()` que retorna INTEGER (número de logs deletados)
  - [ ] 7.11 Implementar lógica: buscar dias_retencao_logs das configurações, deletar logs antigos (apenas info e aviso), manter logs de erro e crítico
  - [ ] 7.12 Usar valor padrão 730 dias se dias_retencao_logs não estiver configurado
  - [ ] 7.13 Adicionar `SET search_path = public` na function
  - [ ] 7.14 Adicionar comentários descritivos explicando que logs críticos nunca são deletados
  - [ ] 7.15 Criar function `testar_webhook(webhook_config_id UUID)` que retorna JSONB
  - [ ] 7.16 Implementar lógica: buscar configuração do webhook, construir payload de teste, retornar resultado simulado (nota: chamada HTTP real será implementada no backend/N8N)
  - [ ] 7.17 Adicionar `SET search_path = public` na function
  - [ ] 7.18 Adicionar comentários descritivos explicando que é simulação (HTTP real será no backend)
  - [ ] 7.19 Salvar script em `tasks/sql/25-functions-configuracoes.sql`
  - [ ] 7.20 Testar cada function com dados de exemplo
  - [ ] 7.21 Aplicar migration usando `mcp_supabase_apply_migration`

- [ ] 8.0 Criar Triggers e Views
  - [ ] 8.1 Criar trigger `after_insert_pergunta_origem` AFTER INSERT em perguntas_vaga_origem
  - [ ] 8.2 Criar function `trigger_incrementar_uso_biblioteca()` que incrementa total_usos e atualiza ultima_utilizacao na biblioteca_perguntas
  - [ ] 8.3 Garantir que o trigger usa a function corretamente
  - [ ] 8.4 Verificar se trigger updated_at já existe para configuracoes_empresa (criar se não existir)
  - [ ] 8.5 Verificar se trigger updated_at já existe para templates_email (criar se não existir)
  - [ ] 8.6 Verificar se trigger updated_at já existe para webhooks_config (criar se não existir)
  - [ ] 8.7 Verificar se trigger updated_at já existe para biblioteca_perguntas (criar se não existir)
  - [ ] 8.8 Criar view `v_estatisticas_webhooks` que retorna estatísticas agregadas de webhooks (total_chamadas, total_sucessos, total_erros, taxa_sucesso_percentual, ultima_chamada_sucesso, ultima_chamada_erro, chamadas_ultimas_24h, sucessos_ultimas_24h)
  - [ ] 8.9 Implementar JOIN entre webhooks_config e webhooks_logs com agregações
  - [ ] 8.10 Criar view `v_biblioteca_mais_usadas` que retorna perguntas da biblioteca ordenadas por total_usos DESC com nome do criador
  - [ ] 8.11 Implementar JOIN entre biblioteca_perguntas e usuarios_rh para obter nome do criador
  - [ ] 8.12 Adicionar filtro WHERE deleted_at IS NULL e LIMIT 50
  - [ ] 8.13 Adicionar comentários descritivos nas views
  - [ ] 8.14 Salvar triggers em `tasks/sql/26-triggers-configuracoes.sql`
  - [ ] 8.15 Salvar views em `tasks/sql/27-views-configuracoes.sql`
  - [ ] 8.16 Aplicar migrations usando `mcp_supabase_apply_migration`

- [ ] 9.0 Configurar Row Level Security (RLS)
  - [ ] 9.1 Habilitar RLS na tabela configuracoes_empresa
  - [ ] 9.2 Criar policy "Admin lê configurações" (SELECT, apenas administrador ativo)
  - [ ] 9.3 Criar policy "Admin edita configurações" (UPDATE, apenas administrador ativo)
  - [ ] 9.4 Habilitar RLS na tabela templates_email
  - [ ] 9.5 Criar policy "Admin/Gerente veem templates" (SELECT, admin ou gerente ativo)
  - [ ] 9.6 Criar policy "Admin edita templates" (UPDATE, apenas administrador ativo)
  - [ ] 9.7 Habilitar RLS na tabela webhooks_config
  - [ ] 9.8 Criar policy "Admin/Gerente veem webhooks" (SELECT, admin ou gerente ativo)
  - [ ] 9.9 Criar policy "Admin edita webhooks" (UPDATE, apenas administrador ativo)
  - [ ] 9.10 Habilitar RLS na tabela webhooks_logs
  - [ ] 9.11 Criar policy "Admin vê logs de webhooks" (SELECT, apenas administrador ativo)
  - [ ] 9.12 Habilitar RLS na tabela biblioteca_perguntas
  - [ ] 9.13 Criar policy "RH vê biblioteca" (SELECT, RH ativo, filtrando is_publica=TRUE ou criado_por_usuario=usuário atual)
  - [ ] 9.14 Criar policy "RH cria perguntas" (INSERT, RH ativo)
  - [ ] 9.15 Criar policy "RH edita próprias perguntas" (UPDATE, apenas perguntas criadas pelo usuário atual)
  - [ ] 9.16 Habilitar RLS na tabela logs_auditoria
  - [ ] 9.17 Criar policy "Admin vê logs" (SELECT, apenas administrador ativo)
  - [ ] 9.18 Criar policy "Sistema insere logs" (INSERT, permitir para authenticated - função log_auditoria() será executada com privilégios adequados)
  - [ ] 9.19 Otimizar todas as policies usando `(SELECT auth.uid())` ao invés de `auth.uid()` para performance
  - [ ] 9.20 Verificar que não há policies de DELETE ou UPDATE em logs_auditoria (tabela imutável)
  - [ ] 9.21 Salvar script em `tasks/sql/28-rls-configuracoes.sql`
  - [ ] 9.22 Aplicar migration usando `mcp_supabase_apply_migration`

- [ ] 10.0 Testes e Validação Final
  - [ ] 10.1 Testar que configuracoes_empresa é singleton: tentar inserir segundo registro (deve falhar por constraint UNIQUE em empresa_id)
  - [ ] 10.2 Testar function get_configuracoes(): deve retornar registro existente ou criar novo
  - [ ] 10.3 Testar constraints de cores hex: tentar inserir cor inválida (deve falhar)
  - [ ] 10.4 Testar constraints de SMTP: tentar inserir porta inválida (deve falhar)
  - [ ] 10.5 Testar constraints de webhooks: tentar inserir URL inválida (deve falhar)
  - [ ] 10.6 Testar criação de template de email com variáveis válidas
  - [ ] 10.7 Testar constraint UNIQUE em tipo_template_email (tentar criar segundo template do mesmo tipo)
  - [ ] 10.8 Testar criação de webhook_config com todos os campos
  - [ ] 10.9 Testar inserção de log em webhooks_logs (tabela imutável)
  - [ ] 10.10 Testar criação de pergunta na biblioteca
  - [ ] 10.11 Testar constraint CHECK de categoria (tentar inserir categoria inválida)
  - [ ] 10.12 Testar trigger incrementar_uso_biblioteca: inserir em perguntas_vaga_origem e verificar que total_usos incrementou
  - [ ] 10.13 Testar criação de log_auditoria usando function log_auditoria()
  - [ ] 10.14 Testar function limpar_logs_antigos() com dados de teste
  - [ ] 10.15 Testar RLS: tentar ler configuracoes_empresa como candidato (deve falhar)
  - [ ] 10.16 Testar RLS: tentar ler configuracoes_empresa como admin (deve funcionar)
  - [ ] 10.17 Testar RLS: tentar editar template como gerente (deve falhar - apenas admin)
  - [ ] 10.18 Testar RLS: tentar ver biblioteca como RH (deve funcionar)
  - [ ] 10.19 Testar RLS: tentar editar pergunta de outro RH (deve falhar)
  - [ ] 10.20 Testar RLS: tentar ler logs_auditoria como gerente (deve falhar - apenas admin)
  - [ ] 10.21 Testar view v_estatisticas_webhooks: executar SELECT e verificar estrutura
  - [ ] 10.22 Testar view v_biblioteca_mais_usadas: executar SELECT e verificar ordenação
  - [ ] 10.23 Testar full-text search em biblioteca_perguntas: buscar perguntas por texto
  - [ ] 10.24 Testar trigger updated_at em todas as tabelas (UPDATE e verificar que updated_at muda)
  - [ ] 10.25 Executar queries de análise do PRD (estatísticas de webhooks, perguntas mais usadas, logs por categoria)
  - [ ] 10.26 Executar `mcp_supabase_get_advisors` para verificar security e performance
  - [ ] 10.27 Corrigir quaisquer issues reportados pelos advisors
  - [ ] 10.28 Verificar que todas as tabelas têm RLS habilitado
  - [ ] 10.29 Verificar que todas as foreign keys têm ON DELETE CASCADE ou RESTRICT conforme apropriado
  - [ ] 10.30 Atualizar `tasks/IMPLEMENTATION_NOTES.md` com informações sobre configurações e sistema
  - [ ] 10.31 Atualizar `tasks/TESTING_CHECKLIST.md` com testes específicos deste PRD
  - [ ] 10.32 Documentar seed data necessário (templates padrão, perguntas de exemplo)

---

## 📊 Resumo de Progresso

**Status Geral:** ⏳ 0% Completo (0/152 sub-tarefas, 0/10 tarefas de alto nível)
**Última Atualização:** 2025-11-03

### Por Grupo de Tarefas:
- ⏳ **1.0 Enums e Estrutura Base:** 0/10 (0%)
- ⏳ **2.0 Configurações da Empresa:** 0/18 (0%)
- ⏳ **3.0 Templates de Email:** 0/12 (0%)
- ⏳ **4.0 Webhooks N8N:** 0/19 (0%)
- ⏳ **5.0 Biblioteca de Perguntas:** 0/18 (0%)
- ⏳ **6.0 Logs de Auditoria:** 0/11 (0%)
- ⏳ **7.0 Functions Auxiliares:** 0/21 (0%)
- ⏳ **8.0 Triggers e Views:** 0/16 (0%)
- ⏳ **9.0 Row Level Security:** 0/22 (0%)
- ⏳ **10.0 Testes e Validação:** 0/32 (0%)

**Próximo Passo:** Começar implementação pela tarefa 1.0 (Criar Enums e Estrutura Base)

---

**🎉 ESTE É O ÚLTIMO PRD DE BANCO DE DADOS! 🎉**  
**100% DA FUNDAÇÃO DE DADOS ESTARÁ COMPLETA APÓS ESTA IMPLEMENTAÇÃO!**
