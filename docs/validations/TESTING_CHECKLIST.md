# Checklist de Testes Consolidado - Beauty Smile

**Projeto:** Beauty Smile - Sistema de Recrutamento
**Início:** 2025-11-02
**Última Atualização:** 2025-11-03

---

## 📌 IMPORTANTE - Processo de Testes

**A partir de 2025-11-02, TODAS as tarefas de teste e validação de QUALQUER PRD serão adicionadas a este checklist consolidado.**

### Estrutura:
- Cada PRD terá sua própria seção numerada (ex: PRD-DB-001, PRD-DB-002, etc.)
- Testes organizados por categoria dentro de cada PRD
- Status de progresso de cada PRD rastreado ao final do documento
- Observações e bloqueadores documentados por seção

### PRDs Cobertos:
- ✅ PRD-DB-001: Estrutura de Autenticação e Usuários
- ✅ PRD-DB-002: Estrutura de Vagas e Candidaturas
- ⏳ PRD-DB-003: (aguardando)

---

## ✅ FASE 1 CONCLUÍDA - Testes de Infraestrutura SQL (2025-11-02)

**Testes executados via MCP Supabase (sem frontend/auth):**

### PRD-DB-001:
- ✅ Infraestrutura: 5 tabelas, 5 functions, 4 views, 1 storage bucket
- ✅ RLS habilitado em todas as 5 tabelas
- ✅ Constraints: CPF, email, celular, estado, data_nascimento, role, whatsapp
- ✅ Triggers: update_updated_at (3 tables), update_expires_at, criar_preferencias_padrao
- ✅ Índices: 31 índices criados
- ✅ Advisors: 4 security warnings, 17+ performance info (ver detalhes em tasks MD)

### PRD-DB-002:
- ✅ Infraestrutura: 6 tabelas, 4 enums, 3 functions, 1 storage bucket
- ✅ RLS habilitado em todas as 6 tabelas com 29 policies
- ✅ RLS Storage: 5 policies implementadas para bucket 'curriculos' (03/11/2025)
- ✅ Constraints: slug, faixa_salarial, datas_vaga, score_range, bloco_valido, ordem (1-7)
- ✅ Triggers: update_updated_at em todas as 6 tabelas
- ✅ Índices: 38 índices criados
- ✅ Advisors: Ver relatório consolidado com PRD-DB-001
- ✅ **Status:** 100% conforme ao PRD (ver VALIDACAO_BANCO_DADOS_PRD002.md)

**Testes PENDENTES (requerem frontend/autenticação):**
- RLS com autenticação real (anon, authenticated, roles)
- Storage upload/download de arquivos
- Functions com dados reais
- Queries de análise e performance
- Correção de issues reportados pelos advisors

---

## 📋 Instruções Gerais

- Marque com `[x]` os testes realizados e aprovados
- Anote observações em caso de falhas
- Execute os testes na ordem apresentada
- Use os usuários de teste criados no IMPLEMENTATION_NOTES.md

---

# 🔐 PRD-DB-001: Estrutura de Autenticação e Usuários

**Status:** 🔄 Fase 1 Completa, Fase 2 Aguardando Frontend
**Implementação:** ✅ 81% Completa (71/87 tasks)
**Testes Fase 1:** ✅ Infraestrutura, Constraints, Triggers, Advisors

---

## 1️⃣ Testes de Infraestrutura

### 1.1 Verificação de Tabelas
- [ ] Todas as 5 tabelas criadas (candidatos, usuarios_rh, preferencias_notificacoes, sessoes_ativas, logs_acesso)
- [ ] RLS habilitado em todas as tabelas
- [ ] Todas as funções auxiliares criadas (5 funções)
- [ ] Todas as views criadas (4 views)
- [ ] Bucket de storage 'avatars' criado

**SQL para verificar:**
```sql
-- Listar tabelas
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Listar funções
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';

-- Listar views
SELECT viewname FROM pg_views WHERE schemaname = 'public';

-- Verificar bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'avatars';
```

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 2️⃣ Testes de Autenticação (Supabase Auth)

### 2.1 Signup (Cadastro)

#### Teste: Cadastro com senha fraca
- [ ] Tentar criar conta com senha < 8 caracteres
- [ ] **Resultado Esperado:** Erro "senha muito curta"

#### Teste: Cadastro com senha sem maiúscula
- [ ] Tentar criar conta com senha sem letra maiúscula
- [ ] **Resultado Esperado:** Erro "senha deve conter maiúscula"

#### Teste: Cadastro com senha sem número
- [ ] Tentar criar conta com senha sem número
- [ ] **Resultado Esperado:** Erro "senha deve conter número"

#### Teste: Cadastro válido (Candidato)
- [ ] Criar conta com email: `candidato.teste@beautysmile.com`
- [ ] Senha: `Teste123` (válida)
- [ ] **Resultado Esperado:** Conta criada em `auth.users`

**SQL para verificar:**
```sql
SELECT id, email, created_at FROM auth.users WHERE email = 'candidato.teste@beautysmile.com';
```

#### Teste: Cadastro válido (Usuário RH Admin)
- [ ] Criar conta com email: `admin.teste@beautysmile.com`
- [ ] Senha: `Admin123`
- [ ] **Resultado Esperado:** Conta criada

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 2.2 Login

#### Teste: Login com credenciais corretas
- [ ] Login com `candidato.teste@beautysmile.com` / `Teste123`
- [ ] **Resultado Esperado:** Login bem-sucedido, token retornado

#### Teste: Login com credenciais incorretas
- [ ] Login com `candidato.teste@beautysmile.com` / `SenhaErrada123`
- [ ] **Resultado Esperado:** Erro "credenciais inválidas"

#### Teste: Login com email inexistente
- [ ] Login com `naoexiste@beautysmile.com` / `Teste123`
- [ ] **Resultado Esperado:** Erro "credenciais inválidas"

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 2.3 Logout

#### Teste: Logout após login
- [ ] Fazer login com credenciais válidas
- [ ] Executar logout
- [ ] Tentar acessar rota protegida após logout
- [ ] **Resultado Esperado:** Logout sucesso, acesso bloqueado após logout

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 2.4 Reset de Senha

#### Teste: Solicitar reset de senha
- [ ] Solicitar reset para `candidato.teste@beautysmile.com`
- [ ] **Resultado Esperado:** Email de reset enviado

#### Teste: Alterar senha via link de reset
- [ ] Clicar no link do email
- [ ] Definir nova senha válida
- [ ] **Resultado Esperado:** Senha alterada com sucesso

#### Teste: Login com nova senha
- [ ] Fazer login com a nova senha
- [ ] **Resultado Esperado:** Login bem-sucedido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 3️⃣ Testes de RLS (Row Level Security)

### 3.1 RLS - Tabela candidatos

#### Teste: Inserir candidato sem autenticação
```sql
-- Executar sem token de autenticação
INSERT INTO candidatos (nome_completo, email, cpf, celular, data_nascimento, cidade, estado)
VALUES ('Teste', 'teste@email.com', '123.456.789-00', '(11) 99999-9999', '1990-01-01', 'São Paulo', 'SP');
```
- [ ] **Resultado Esperado:** ERRO (RLS bloqueia)

#### Teste: Candidato ler próprios dados
- [ ] Fazer login como `candidato.teste@beautysmile.com`
- [ ] Executar: `SELECT * FROM candidatos WHERE user_id = auth.uid()`
- [ ] **Resultado Esperado:** Retorna apenas próprio registro

#### Teste: Candidato tentar ler dados de outro candidato
- [ ] Fazer login como `candidato.teste@beautysmile.com`
- [ ] Executar: `SELECT * FROM candidatos WHERE user_id != auth.uid()`
- [ ] **Resultado Esperado:** Retorna 0 registros (RLS bloqueia)

#### Teste: Candidato atualizar próprios dados
```sql
UPDATE candidatos SET nome_completo = 'Nome Atualizado' WHERE user_id = auth.uid();
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Candidato tentar atualizar dados de outro
```sql
UPDATE candidatos SET nome_completo = 'Hacker' WHERE user_id != auth.uid();
```
- [ ] **Resultado Esperado:** ERRO ou 0 rows affected (RLS bloqueia)

#### Teste: RH Admin ver todos os candidatos
- [ ] Fazer login como `admin.teste@beautysmile.com` (role: administrador)
- [ ] Executar: `SELECT * FROM candidatos`
- [ ] **Resultado Esperado:** Retorna TODOS os candidatos

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 3.2 RLS - Tabela usuarios_rh

#### Teste: Usuário RH ler próprios dados
- [ ] Login como usuário RH
- [ ] Executar: `SELECT * FROM usuarios_rh WHERE user_id = auth.uid()`
- [ ] **Resultado Esperado:** Retorna próprio registro

#### Teste: Recrutador tentar ler dados de Admin
- [ ] Login como recrutador
- [ ] Tentar ler usuário com role='administrador'
- [ ] **Resultado Esperado:** RLS bloqueia (exceto se for admin)

#### Teste: Admin criar novo usuário RH
- [ ] Login como admin
- [ ] Inserir novo usuário RH
- [ ] **Resultado Esperado:** INSERT bem-sucedido

#### Teste: Recrutador tentar criar usuário RH
- [ ] Login como recrutador
- [ ] Tentar inserir novo usuário RH
- [ ] **Resultado Esperado:** ERRO (RLS bloqueia)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 3.3 RLS - Tabela preferencias_notificacoes

#### Teste: Preferências criadas automaticamente
- [ ] Criar novo usuário RH
- [ ] Verificar se registro em `preferencias_notificacoes` foi criado automaticamente
- [ ] **Resultado Esperado:** Registro criado via trigger

```sql
SELECT * FROM preferencias_notificacoes WHERE usuario_rh_id = '[id_do_usuario_criado]';
```

#### Teste: Usuário RH atualizar próprias preferências
- [ ] Login como usuário RH
- [ ] Executar: `UPDATE preferencias_notificacoes SET email_resumo_diario = TRUE WHERE usuario_rh_id IN (SELECT id FROM usuarios_rh WHERE user_id = auth.uid())`
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Usuário RH tentar alterar preferências de outro
- [ ] Tentar UPDATE em preferências de outro usuário
- [ ] **Resultado Esperado:** ERRO ou 0 rows affected

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 3.4 RLS - Tabela sessoes_ativas

#### Teste: Sessão criada ao fazer login
- [ ] Fazer login
- [ ] Verificar se sessão foi criada em `sessoes_ativas`
- [ ] **Resultado Esperado:** Registro criado

```sql
SELECT * FROM sessoes_ativas WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1;
```

#### Teste: Usuário ver próprias sessões
- [ ] Executar: `SELECT * FROM sessoes_ativas WHERE user_id = auth.uid()`
- [ ] **Resultado Esperado:** Retorna sessões do usuário logado

#### Teste: Usuário revogar própria sessão
```sql
UPDATE sessoes_ativas SET revogado = TRUE, revogado_em = NOW() WHERE id = '[id_da_sessao]' AND user_id = auth.uid();
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Admin ver todas as sessões
- [ ] Login como admin
- [ ] Executar: `SELECT * FROM sessoes_ativas`
- [ ] **Resultado Esperado:** Retorna todas as sessões (auditoria)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 3.5 RLS - Tabela logs_acesso

#### Teste: Log criado ao fazer login
- [ ] Fazer login
- [ ] Verificar se log foi criado em `logs_acesso`
- [ ] **Resultado Esperado:** Registro com evento='login_sucesso'

```sql
SELECT * FROM logs_acesso WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1;
```

#### Teste: Usuário ver próprios logs
- [ ] Executar: `SELECT * FROM logs_acesso WHERE user_id = auth.uid()`
- [ ] **Resultado Esperado:** Retorna logs do usuário

#### Teste: Admin ver todos os logs
- [ ] Login como admin
- [ ] Executar: `SELECT * FROM logs_acesso`
- [ ] **Resultado Esperado:** Retorna todos os logs

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 4️⃣ Testes de Constraints e Validações

### 4.1 Validações de Email

#### Teste: Inserir email inválido
```sql
INSERT INTO candidatos (nome_completo, email, cpf, celular, data_nascimento, cidade, estado, user_id)
VALUES ('Teste', 'email-invalido', '123.456.789-00', '(11) 99999-9999', '1990-01-01', 'São Paulo', 'SP', auth.uid());
```
- [ ] **Resultado Esperado:** ERRO (constraint check)

#### Teste: Inserir email duplicado
- [ ] Criar candidato com email
- [ ] Tentar criar outro candidato com mesmo email
- [ ] **Resultado Esperado:** ERRO (UNIQUE constraint)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 4.2 Validações de CPF

#### Teste: CPF com formato inválido
```sql
-- Testar: 12345678900 (sem pontuação)
INSERT INTO candidatos (..., cpf, ...)
VALUES (..., '12345678900', ...);
```
- [ ] **Resultado Esperado:** ERRO (formato deve ser XXX.XXX.XXX-XX)

#### Teste: CPF duplicado
- [ ] Criar candidato com CPF
- [ ] Tentar criar outro com mesmo CPF
- [ ] **Resultado Esperado:** ERRO (UNIQUE constraint)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 4.3 Validações de Telefone/Celular

#### Teste: Celular formato inválido
```sql
-- Testar: 11999999999 (sem formatação)
INSERT INTO candidatos (..., celular, ...)
VALUES (..., '11999999999', ...);
```
- [ ] **Resultado Esperado:** ERRO (formato deve ser (XX) XXXXX-XXXX)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 4.4 Validações de Data

#### Teste: Data de nascimento no futuro
```sql
INSERT INTO candidatos (..., data_nascimento, ...)
VALUES (..., '2030-01-01', ...);
```
- [ ] **Resultado Esperado:** ERRO (deve ser no passado)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 4.5 Validações de Enums

#### Teste: Gênero inválido
```sql
UPDATE candidatos SET genero = 'invalido' WHERE user_id = auth.uid();
```
- [ ] **Resultado Esperado:** ERRO (deve ser: masculino, feminino, outro, prefiro_nao_informar)

#### Teste: Estado inválido
```sql
UPDATE candidatos SET estado = 'XX' WHERE user_id = auth.uid();
```
- [ ] **Resultado Esperado:** ERRO (deve ser UF válida)

#### Teste: Role inválido
```sql
UPDATE usuarios_rh SET role = 'superadmin' WHERE user_id = auth.uid();
```
- [ ] **Resultado Esperado:** ERRO (deve ser: administrador, gerente, recrutador, visualizador)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 5️⃣ Testes de Triggers

### 5.1 Trigger: update_updated_at_column

#### Teste: Campo updated_at atualizado automaticamente
```sql
-- Obter valor atual
SELECT updated_at FROM candidatos WHERE user_id = auth.uid();

-- Aguardar 1 segundo e fazer update
-- (Executar com delay)
UPDATE candidatos SET nome_completo = 'Novo Nome' WHERE user_id = auth.uid();

-- Verificar novo valor
SELECT updated_at FROM candidatos WHERE user_id = auth.uid();
```
- [ ] **Resultado Esperado:** updated_at mudou para timestamp atual

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 5.2 Trigger: update_expires_at (sessões)

#### Teste: expires_at estendido ao atualizar last_activity
```sql
-- Obter valores atuais
SELECT last_activity, expires_at FROM sessoes_ativas WHERE user_id = auth.uid() AND ativo = TRUE LIMIT 1;

-- Atualizar last_activity
UPDATE sessoes_ativas SET last_activity = NOW() WHERE user_id = auth.uid() AND ativo = TRUE;

-- Verificar que expires_at = last_activity + 7 dias
SELECT last_activity, expires_at, (expires_at - last_activity) as diferenca
FROM sessoes_ativas WHERE user_id = auth.uid() AND ativo = TRUE LIMIT 1;
```
- [ ] **Resultado Esperado:** expires_at = last_activity + 7 dias

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 5.3 Trigger: criar_preferencias_padrao

#### Teste: Preferências criadas automaticamente ao criar usuário RH
```sql
-- Criar novo usuário RH
INSERT INTO usuarios_rh (user_id, nome_completo, email, cargo, role)
VALUES (auth.uid(), 'Teste RH', 'teste.rh@beautysmile.com', 'Recrutador', 'recrutador');

-- Verificar que preferências foram criadas
SELECT * FROM preferencias_notificacoes WHERE usuario_rh_id = (SELECT id FROM usuarios_rh WHERE email = 'teste.rh@beautysmile.com');
```
- [ ] **Resultado Esperado:** Registro criado automaticamente

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 6️⃣ Testes de Soft Delete

### 6.1 Soft Delete em candidatos

#### Teste: Marcar candidato como deletado
```sql
UPDATE candidatos SET deleted_at = NOW() WHERE user_id = auth.uid();
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Candidato deletado não aparece em view
```sql
SELECT * FROM v_candidatos_ativos WHERE user_id = auth.uid();
```
- [ ] **Resultado Esperado:** 0 registros (view filtra deleted_at IS NULL)

#### Teste: Candidato deletado ainda existe na tabela
```sql
SELECT * FROM candidatos WHERE user_id = auth.uid();
```
- [ ] **Resultado Esperado:** 1 registro com deleted_at preenchido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 7️⃣ Testes de Storage (Avatares)

### 7.1 Upload de Avatar

#### Teste: Upload de avatar válido (Candidato)
- [ ] Fazer login como candidato
- [ ] Upload de imagem JPG < 2MB para `candidatos/{user_id}/avatar.jpg`
- [ ] **Resultado Esperado:** Upload bem-sucedido

#### Teste: Upload de avatar com formato inválido
- [ ] Tentar upload de arquivo .pdf
- [ ] **Resultado Esperado:** ERRO (apenas jpg, jpeg, png, webp)

#### Teste: Upload de avatar muito grande
- [ ] Tentar upload de imagem > 2MB
- [ ] **Resultado Esperado:** ERRO (limite 2MB)

#### Teste: Upload em caminho de outro usuário
- [ ] Tentar upload para `candidatos/{outro_user_id}/avatar.jpg`
- [ ] **Resultado Esperado:** ERRO (RLS bloqueia)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 7.2 Download de Avatar

#### Teste: Candidato baixar próprio avatar
- [ ] Executar download de `candidatos/{user_id}/avatar.jpg`
- [ ] **Resultado Esperado:** Download bem-sucedido

#### Teste: RH baixar avatar de candidato
- [ ] Login como usuário RH
- [ ] Baixar avatar de qualquer candidato
- [ ] **Resultado Esperado:** Download bem-sucedido (policy permite)

#### Teste: Candidato tentar baixar avatar de outro
- [ ] Login como candidato
- [ ] Tentar baixar avatar de outro candidato
- [ ] **Resultado Esperado:** ERRO (RLS bloqueia)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 7.3 Delete de Avatar

#### Teste: Deletar próprio avatar
- [ ] Executar delete de `candidatos/{user_id}/avatar.jpg`
- [ ] **Resultado Esperado:** Delete bem-sucedido

#### Teste: Tentar deletar avatar de outro
- [ ] Tentar deletar avatar de outro usuário
- [ ] **Resultado Esperado:** ERRO (RLS bloqueia)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 8️⃣ Testes de Views

### 8.1 View: v_candidatos_ativos

```sql
SELECT COUNT(*) FROM v_candidatos_ativos;
```
- [ ] **Resultado Esperado:** Retorna apenas candidatos com deleted_at IS NULL

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 8.2 View: v_sessoes_ativas_validas

```sql
SELECT COUNT(*) FROM v_sessoes_ativas_validas;
```
- [ ] **Resultado Esperado:** Retorna apenas sessões ativas, não revogadas, não expiradas

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 8.3 View: v_ultimos_acessos

```sql
SELECT COUNT(*) FROM v_ultimos_acessos;
```
- [ ] **Resultado Esperado:** Retorna logs dos últimos 30 dias

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 9️⃣ Testes de Performance

### 9.1 EXPLAIN ANALYZE

#### Teste: Query de busca de candidatos
```sql
EXPLAIN ANALYZE
SELECT * FROM candidatos WHERE email = 'candidato.teste@beautysmile.com';
```
- [ ] **Resultado Esperado:** Usa Index Scan no idx_candidatos_email

#### Teste: Query de busca por CPF
```sql
EXPLAIN ANALYZE
SELECT * FROM candidatos WHERE cpf = '123.456.789-00';
```
- [ ] **Resultado Esperado:** Usa Index Scan no idx_candidatos_cpf

#### Teste: Query de sessões ativas
```sql
EXPLAIN ANALYZE
SELECT * FROM sessoes_ativas WHERE user_id = auth.uid() AND ativo = TRUE;
```
- [ ] **Resultado Esperado:** Usa Index Scan no idx_sessoes_user_id

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 🔟 Testes de Funções Auxiliares

### 10.1 Função: limpar_sessoes_expiradas

```sql
-- Criar sessão expirada manualmente
INSERT INTO sessoes_ativas (user_id, ip_address, expires_at, ativo)
VALUES (auth.uid(), '127.0.0.1', NOW() - INTERVAL '1 day', TRUE);

-- Executar função
SELECT limpar_sessoes_expiradas();

-- Verificar que sessão foi marcada como inativa
SELECT ativo, revogado FROM sessoes_ativas WHERE expires_at < NOW();
```
- [ ] **Resultado Esperado:** Sessões expiradas marcadas com ativo=FALSE, revogado=TRUE

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 10.2 Função: limpar_logs_antigos

```sql
-- Criar log antigo manualmente
INSERT INTO logs_acesso (user_id, evento, ip_address, created_at)
VALUES (auth.uid(), 'login_sucesso', '127.0.0.1', NOW() - INTERVAL '2 years');

-- Executar função
SELECT limpar_logs_antigos();

-- Verificar que log foi removido
SELECT COUNT(*) FROM logs_acesso WHERE created_at < NOW() - INTERVAL '1 year';
```
- [ ] **Resultado Esperado:** Logs com mais de 1 ano removidos

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 1️⃣1️⃣ Testes de Auditoria

### 11.1 Campos created_by / updated_by

#### Teste: created_by preenchido automaticamente
```sql
-- Criar candidato
INSERT INTO candidatos (...) VALUES (...);

-- Verificar created_by
SELECT created_by, user_id FROM candidatos WHERE user_id = auth.uid();
```
- [ ] **Resultado Esperado:** created_by = auth.uid() (se implementado trigger)

**Nota:** Se trigger de auditoria não foi implementado, created_by pode estar NULL

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 1️⃣2️⃣ Testes de Segurança (Advisors)

### 12.1 Executar Advisors do Supabase

```sql
-- Via MCP
mcp__supabase__get_advisors({type: "security"})
mcp__supabase__get_advisors({type: "performance"})
```

- [ ] Security advisors executados
- [ ] Performance advisors executados
- [ ] Warnings documentados
- [ ] Ações corretivas planejadas (se necessário)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## ✅ Resumo de Testes

### Estatísticas
- **Total de Testes:** ~70+
- **Testes Aprovados:** _____ / _____
- **Testes Falhados:** _____ / _____
- **Testes Pendentes:** _____ / _____

### Bloqueadores Identificados
```
_________________________________________________
_________________________________________________
_________________________________________________
```

### Próximos Passos
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

**Data de Execução:** ____ / ____ / ____
**Executado por:** _______________________
**Status Final:** [ ] Aprovado  [ ] Reprovado  [ ] Parcial

---
---

# 📦 PRD-DB-002: Estrutura de Vagas e Candidaturas

**Status:** 🔄 Fase 1 Completa, Fase 2 Aguardando Frontend
**Implementação:** ✅ 87% Completa (151/173 tasks)
**Testes Fase 1:** ✅ Infraestrutura, Constraints, Triggers, Functions, Advisors

---

## 1️⃣ Testes de Infraestrutura

### 1.1 Verificação de Tabelas e Enums

- [ ] 4 enums criados (status_vaga, etapa_processo, status_candidatura, tipo_resposta_pergunta)
- [ ] Tabela `vagas` criada com 36 campos
- [ ] Tabela `candidaturas` criada com 34 campos
- [ ] Tabela `perguntas_formulario` criada
- [ ] Tabela `respostas_formulario` criada
- [ ] Tabela `perguntas_cultura` criada
- [ ] Tabela `respostas_cultura` criada
- [ ] Tabela `vagas_associadas_recrutadores` criada
- [ ] RLS habilitado em todas as 6 tabelas principais
- [ ] 3 funções auxiliares criadas (calcular_score_geral, avancar_etapa, rejeitar_candidato)
- [ ] Bucket de storage `curriculos` criado

**SQL para verificar:**
```sql
-- Listar enums
SELECT t.typname as enum_name, e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('status_vaga', 'etapa_processo', 'status_candidatura', 'tipo_resposta_pergunta')
ORDER BY t.typname, e.enumsortorder;

-- Listar tabelas
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('vagas', 'candidaturas', 'perguntas_formulario', 'respostas_formulario',
                  'perguntas_cultura', 'respostas_cultura', 'vagas_associadas_recrutadores')
ORDER BY tablename;

-- Listar funções
SELECT routine_name, data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('calcular_score_geral', 'avancar_etapa', 'rejeitar_candidato')
ORDER BY routine_name;

-- Verificar bucket curriculos
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'curriculos';
```

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 2️⃣ Testes de Constraints - Tabela vagas

### 2.1 Constraint: slug_format_check

#### Teste: Slug com formato inválido (maiúsculas)
```sql
INSERT INTO vagas (titulo, slug, tipo_vaga, modalidade_trabalho, cidade, estado)
VALUES ('Vaga Teste', 'Vaga-Teste', 'clt', 'presencial', 'São Paulo', 'SP');
```
- [ ] **Resultado Esperado:** ERRO (slug deve ser lowercase com hífens)

#### Teste: Slug válido
```sql
INSERT INTO vagas (titulo, slug, tipo_vaga, modalidade_trabalho, cidade, estado)
VALUES ('Vaga Teste', 'vaga-teste-dentista-sp', 'clt', 'presencial', 'São Paulo', 'SP');
```
- [ ] **Resultado Esperado:** INSERT bem-sucedido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 2.2 Constraint: faixa_salarial_check

#### Teste: Salário máximo menor que mínimo
```sql
INSERT INTO vagas (titulo, slug, tipo_vaga, modalidade_trabalho, cidade, estado,
                   faixa_salarial_min, faixa_salarial_max)
VALUES ('Vaga Teste', 'vaga-teste-salario', 'clt', 'presencial', 'São Paulo', 'SP',
        5000.00, 3000.00);
```
- [ ] **Resultado Esperado:** ERRO (max deve ser >= min)

#### Teste: Faixa salarial válida
```sql
INSERT INTO vagas (titulo, slug, tipo_vaga, modalidade_trabalho, cidade, estado,
                   faixa_salarial_min, faixa_salarial_max)
VALUES ('Vaga Teste', 'vaga-teste-salario-valido', 'clt', 'presencial', 'São Paulo', 'SP',
        3000.00, 5000.00);
```
- [ ] **Resultado Esperado:** INSERT bem-sucedido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 2.3 Constraint: datas_vaga_check

#### Teste: Data de fechamento antes de abertura
```sql
INSERT INTO vagas (titulo, slug, tipo_vaga, modalidade_trabalho, cidade, estado,
                   data_abertura, data_fechamento)
VALUES ('Vaga Teste', 'vaga-teste-datas', 'clt', 'presencial', 'São Paulo', 'SP',
        '2025-12-01', '2025-11-01');
```
- [ ] **Resultado Esperado:** ERRO (fechamento deve ser > abertura)

#### Teste: Datas válidas
```sql
INSERT INTO vagas (titulo, slug, tipo_vaga, modalidade_trabalho, cidade, estado,
                   data_abertura, data_fechamento)
VALUES ('Vaga Teste', 'vaga-teste-datas-validas', 'clt', 'presencial', 'São Paulo', 'SP',
        '2025-11-01', '2025-12-01');
```
- [ ] **Resultado Esperado:** INSERT bem-sucedido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 2.4 Constraint: estado_uf_check

#### Teste: Estado inválido
```sql
INSERT INTO vagas (titulo, slug, tipo_vaga, modalidade_trabalho, cidade, estado)
VALUES ('Vaga Teste', 'vaga-teste-estado', 'clt', 'presencial', 'São Paulo', 'XX');
```
- [ ] **Resultado Esperado:** ERRO (estado deve ser UF válida)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 2.5 Unique Constraint: slug

#### Teste: Slug duplicado
```sql
-- Inserir primeira vaga
INSERT INTO vagas (titulo, slug, tipo_vaga, modalidade_trabalho, cidade, estado)
VALUES ('Vaga 1', 'dentista-sp-clinico', 'clt', 'presencial', 'São Paulo', 'SP');

-- Tentar inserir com mesmo slug
INSERT INTO vagas (titulo, slug, tipo_vaga, modalidade_trabalho, cidade, estado)
VALUES ('Vaga 2', 'dentista-sp-clinico', 'clt', 'presencial', 'São Paulo', 'SP');
```
- [ ] **Resultado Esperado:** ERRO (slug deve ser único)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 3️⃣ Testes de Constraints - Tabela candidaturas

### 3.1 Constraint: unique_candidato_vaga

#### Teste: Candidatura duplicada
```sql
-- Obter IDs
SELECT id FROM candidatos LIMIT 1; -- usar candidato_id
SELECT id FROM vagas LIMIT 1; -- usar vaga_id

-- Inserir primeira candidatura
INSERT INTO candidaturas (candidato_id, vaga_id)
VALUES ('[candidato_id]', '[vaga_id]');

-- Tentar inserir candidatura duplicada
INSERT INTO candidaturas (candidato_id, vaga_id)
VALUES ('[candidato_id]', '[vaga_id]');
```
- [ ] **Resultado Esperado:** ERRO (candidato não pode se candidatar 2x à mesma vaga)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 3.2 Constraint: score_range_check

#### Teste: Score fora do range (negativo)
```sql
UPDATE candidaturas SET score_geral = -10.5 WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** ERRO (score deve estar entre 0 e 100)

#### Teste: Score fora do range (> 100)
```sql
UPDATE candidaturas SET score_geral = 150.0 WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** ERRO (score deve estar entre 0 e 100)

#### Teste: Score válido
```sql
UPDATE candidaturas SET score_geral = 85.50 WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 4️⃣ Testes de Constraints - Tabela perguntas_formulario

### 4.1 Constraint: bloco_valido_check

#### Teste: Bloco inválido
```sql
INSERT INTO perguntas_formulario (vaga_id, bloco, ordem, texto_pergunta, tipo_resposta)
VALUES ('[vaga_id]', 'bloco_invalido', 1, 'Pergunta teste?', 'texto_curto');
```
- [ ] **Resultado Esperado:** ERRO (bloco deve ser: jornada, tecnologia, valores, curriculo)

#### Teste: Bloco válido
```sql
INSERT INTO perguntas_formulario (vaga_id, bloco, ordem, texto_pergunta, tipo_resposta)
VALUES ('[vaga_id]', 'jornada', 1, 'Pergunta teste?', 'texto_curto');
```
- [ ] **Resultado Esperado:** INSERT bem-sucedido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 4.2 Constraint: ordem_pergunta_check

#### Teste: Ordem = 0
```sql
INSERT INTO perguntas_formulario (vaga_id, bloco, ordem, texto_pergunta, tipo_resposta)
VALUES ('[vaga_id]', 'jornada', 0, 'Pergunta teste?', 'texto_curto');
```
- [ ] **Resultado Esperado:** ERRO (ordem deve ser >= 1)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 5️⃣ Testes de Constraints - Tabela perguntas_cultura

### 5.1 Constraint: ordem_cultura_check

#### Teste: Ordem > 7
```sql
INSERT INTO perguntas_cultura (vaga_id, ordem, texto_pergunta)
VALUES ('[vaga_id]', 8, 'Pergunta cultura teste?');
```
- [ ] **Resultado Esperado:** ERRO (ordem deve estar entre 1 e 7, máximo 7 perguntas)

#### Teste: Ordem válida (1-7)
```sql
INSERT INTO perguntas_cultura (vaga_id, ordem, texto_pergunta)
VALUES ('[vaga_id]', 7, 'Pergunta cultura teste?');
```
- [ ] **Resultado Esperado:** INSERT bem-sucedido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 6️⃣ Testes de RLS - Tabela vagas

### 6.1 Policy: Público vê vagas ativas

#### Teste: Usuário anônimo vê vagas ativas
```sql
-- Executar SEM autenticação (anon role)
SELECT COUNT(*) FROM vagas WHERE status = 'ativa' AND deleted_at IS NULL;
```
- [ ] **Resultado Esperado:** Retorna vagas ativas (policy permite)

#### Teste: Usuário anônimo NÃO vê rascunhos
```sql
-- Executar SEM autenticação (anon role)
SELECT COUNT(*) FROM vagas WHERE status = 'rascunho';
```
- [ ] **Resultado Esperado:** Retorna 0 (policy bloqueia)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 6.2 Policy: RH vê todas vagas

#### Teste: RH vê vagas em todos os status
```sql
-- Login como usuário RH
SELECT status, COUNT(*)
FROM vagas
GROUP BY status;
```
- [ ] **Resultado Esperado:** Retorna vagas em todos os status (rascunho, ativa, inativa, arquivada)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 6.3 Policy: Admin/Gerente criam vagas

#### Teste: Admin cria vaga
```sql
-- Login como admin
INSERT INTO vagas (titulo, slug, tipo_vaga, modalidade_trabalho, cidade, estado, status)
VALUES ('Vaga Admin', 'vaga-admin-teste', 'clt', 'presencial', 'São Paulo', 'SP', 'rascunho');
```
- [ ] **Resultado Esperado:** INSERT bem-sucedido

#### Teste: Recrutador tenta criar vaga
```sql
-- Login como recrutador (role = 'recrutador')
INSERT INTO vagas (titulo, slug, tipo_vaga, modalidade_trabalho, cidade, estado, status)
VALUES ('Vaga Recrutador', 'vaga-recrutador-teste', 'clt', 'presencial', 'São Paulo', 'SP', 'rascunho');
```
- [ ] **Resultado Esperado:** ERRO (RLS bloqueia, apenas admin/gerente podem criar)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 6.4 Policy: Admin/Gerente editam vagas

#### Teste: Gerente edita vaga
```sql
-- Login como gerente
UPDATE vagas SET titulo = 'Título Atualizado' WHERE id = '[vaga_id]';
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Recrutador tenta editar vaga
```sql
-- Login como recrutador
UPDATE vagas SET titulo = 'Hacker' WHERE id = '[vaga_id]';
```
- [ ] **Resultado Esperado:** ERRO ou 0 rows affected (RLS bloqueia)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 6.5 Policy: Admin deleta vagas (soft delete)

#### Teste: Admin faz soft delete
```sql
-- Login como admin
UPDATE vagas SET deleted_at = NOW() WHERE id = '[vaga_id]';
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Gerente tenta soft delete
```sql
-- Login como gerente
UPDATE vagas SET deleted_at = NOW() WHERE id = '[vaga_id]';
```
- [ ] **Resultado Esperado:** ERRO (apenas admin pode deletar)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 7️⃣ Testes de RLS - Tabela candidaturas

### 7.1 Policy: Candidato vê próprias candidaturas

#### Teste: Candidato vê suas candidaturas
```sql
-- Login como candidato
SELECT COUNT(*) FROM candidaturas
WHERE candidato_id = (SELECT id FROM candidatos WHERE user_id = auth.uid());
```
- [ ] **Resultado Esperado:** Retorna apenas candidaturas do candidato logado

#### Teste: Candidato NÃO vê candidaturas de outros
```sql
-- Login como candidato
SELECT COUNT(*) FROM candidaturas
WHERE candidato_id != (SELECT id FROM candidatos WHERE user_id = auth.uid());
```
- [ ] **Resultado Esperado:** Retorna 0 (RLS bloqueia)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 7.2 Policy: RH vê candidaturas de suas vagas

#### Teste: RH vê todas candidaturas (exceto rascunhos)
```sql
-- Login como usuário RH
SELECT COUNT(*) FROM candidaturas WHERE is_rascunho = FALSE;
```
- [ ] **Resultado Esperado:** Retorna todas candidaturas finalizadas

#### Teste: RH NÃO vê rascunhos de candidatos
```sql
-- Login como usuário RH
SELECT COUNT(*) FROM candidaturas WHERE is_rascunho = TRUE;
```
- [ ] **Resultado Esperado:** Retorna 0 (policy bloqueia rascunhos)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 7.3 Policy: Candidato cria candidatura

#### Teste: Candidato cria candidatura para si mesmo
```sql
-- Login como candidato
INSERT INTO candidaturas (candidato_id, vaga_id)
VALUES (
    (SELECT id FROM candidatos WHERE user_id = auth.uid()),
    '[vaga_id]'
);
```
- [ ] **Resultado Esperado:** INSERT bem-sucedido

#### Teste: Candidato tenta criar candidatura para outro
```sql
-- Login como candidato
INSERT INTO candidaturas (candidato_id, vaga_id)
VALUES ('[outro_candidato_id]', '[vaga_id]');
```
- [ ] **Resultado Esperado:** ERRO (RLS bloqueia)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 7.4 Policy: Candidato atualiza apenas rascunhos próprios

#### Teste: Candidato atualiza rascunho próprio
```sql
-- Login como candidato
UPDATE candidaturas
SET is_rascunho = FALSE
WHERE candidato_id = (SELECT id FROM candidatos WHERE user_id = auth.uid())
AND is_rascunho = TRUE;
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Candidato tenta atualizar candidatura já finalizada
```sql
-- Login como candidato
UPDATE candidaturas
SET etapa_atual = 'aprovado'
WHERE candidato_id = (SELECT id FROM candidatos WHERE user_id = auth.uid())
AND is_rascunho = FALSE;
```
- [ ] **Resultado Esperado:** ERRO ou 0 rows affected (policy permite apenas rascunhos)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 7.5 Policy: RH atualiza candidaturas

#### Teste: RH atualiza qualquer candidatura
```sql
-- Login como usuário RH
UPDATE candidaturas
SET status = 'em_analise'
WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 8️⃣ Testes de RLS - Tabelas perguntas_formulario e respostas_formulario

### 8.1 Policy: Público vê perguntas de vagas ativas

#### Teste: Usuário anônimo vê perguntas de vaga ativa
```sql
-- Executar SEM autenticação
SELECT COUNT(*) FROM perguntas_formulario pf
JOIN vagas v ON v.id = pf.vaga_id
WHERE v.status = 'ativa' AND pf.deleted_at IS NULL;
```
- [ ] **Resultado Esperado:** Retorna perguntas de vagas ativas

#### Teste: Usuário anônimo NÃO vê perguntas de rascunhos
```sql
-- Executar SEM autenticação
SELECT COUNT(*) FROM perguntas_formulario pf
JOIN vagas v ON v.id = pf.vaga_id
WHERE v.status = 'rascunho';
```
- [ ] **Resultado Esperado:** Retorna 0 (RLS bloqueia)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 8.2 Policy: Candidato vê próprias respostas

#### Teste: Candidato vê suas respostas
```sql
-- Login como candidato
SELECT COUNT(*) FROM respostas_formulario rf
JOIN candidaturas c ON c.id = rf.candidatura_id
WHERE c.candidato_id = (SELECT id FROM candidatos WHERE user_id = auth.uid());
```
- [ ] **Resultado Esperado:** Retorna respostas do candidato

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 8.3 Policy: Candidato cria respostas para suas candidaturas

#### Teste: Candidato cria resposta
```sql
-- Login como candidato
INSERT INTO respostas_formulario (candidatura_id, pergunta_id, resposta_texto)
VALUES ('[candidatura_id_do_candidato]', '[pergunta_id]', 'Minha resposta');
```
- [ ] **Resultado Esperado:** INSERT bem-sucedido

#### Teste: Candidato tenta criar resposta para candidatura de outro
```sql
-- Login como candidato
INSERT INTO respostas_formulario (candidatura_id, pergunta_id, resposta_texto)
VALUES ('[candidatura_id_de_outro]', '[pergunta_id]', 'Resposta hacker');
```
- [ ] **Resultado Esperado:** ERRO (RLS bloqueia)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 9️⃣ Testes de RLS - Tabelas perguntas_cultura e respostas_cultura

### 9.1 Policy: Candidato cria respostas cultura

#### Teste: Candidato responde pergunta cultura
```sql
-- Login como candidato
INSERT INTO respostas_cultura (candidatura_id, pergunta_id, resposta_texto)
VALUES ('[candidatura_id_do_candidato]', '[pergunta_cultura_id]',
        'Minha resposta sobre cultura organizacional...');
```
- [ ] **Resultado Esperado:** INSERT bem-sucedido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 9.2 Policy: Candidato atualiza respostas cultura de rascunhos

#### Teste: Candidato edita resposta cultura de rascunho
```sql
-- Login como candidato
UPDATE respostas_cultura
SET resposta_texto = 'Resposta atualizada'
WHERE candidatura_id IN (
    SELECT id FROM candidaturas
    WHERE candidato_id = (SELECT id FROM candidatos WHERE user_id = auth.uid())
    AND is_rascunho = TRUE
);
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Candidato tenta editar resposta de candidatura finalizada
```sql
-- Login como candidato
UPDATE respostas_cultura
SET resposta_texto = 'Tentativa de edição'
WHERE candidatura_id IN (
    SELECT id FROM candidaturas
    WHERE candidato_id = (SELECT id FROM candidatos WHERE user_id = auth.uid())
    AND is_rascunho = FALSE
);
```
- [ ] **Resultado Esperado:** ERRO ou 0 rows affected (policy permite apenas rascunhos)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 🔟 Testes de RLS - Storage curriculos

### 10.1 Policy: Candidato faz upload de currículo

#### Teste: Upload de currículo válido (PDF)
```typescript
// Login como candidato
const candidatoId = '[candidato_id]';
const vagaId = '[vaga_id]';
const file = new File(['conteúdo pdf'], 'curriculo.pdf', { type: 'application/pdf' });
const filePath = `${candidatoId}/${vagaId}/curriculo.pdf`;

const { data, error } = await supabase.storage
  .from('curriculos')
  .upload(filePath, file);
```
- [ ] **Resultado Esperado:** Upload bem-sucedido

#### Teste: Candidato tenta upload em pasta de outro candidato
```typescript
// Login como candidato
const outroCandidatoId = '[outro_candidato_id]';
const vagaId = '[vaga_id]';
const file = new File(['conteúdo pdf'], 'curriculo.pdf', { type: 'application/pdf' });
const filePath = `${outroCandidatoId}/${vagaId}/curriculo.pdf`;

const { data, error } = await supabase.storage
  .from('curriculos')
  .upload(filePath, file);
```
- [ ] **Resultado Esperado:** ERRO (RLS bloqueia upload em pasta de outro)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 10.2 Policy: Candidato lê próprios currículos

#### Teste: Download de próprio currículo
```typescript
// Login como candidato
const candidatoId = '[candidato_id]';
const vagaId = '[vaga_id]';
const filePath = `${candidatoId}/${vagaId}/curriculo.pdf`;

const { data, error } = await supabase.storage
  .from('curriculos')
  .download(filePath);
```
- [ ] **Resultado Esperado:** Download bem-sucedido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 10.3 Policy: RH lê currículos

#### Teste: RH baixa currículo de candidato
```typescript
// Login como usuário RH
const candidatoId = '[candidato_id]';
const vagaId = '[vaga_id]';
const filePath = `${candidatoId}/${vagaId}/curriculo.pdf`;

const { data, error } = await supabase.storage
  .from('curriculos')
  .download(filePath);
```
- [ ] **Resultado Esperado:** Download bem-sucedido (RH tem acesso)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 10.4 Policy: Admin deleta currículos

#### Teste: Admin deleta currículo
```typescript
// Login como admin
const filePath = '[candidato_id]/[vaga_id]/curriculo.pdf';

const { data, error } = await supabase.storage
  .from('curriculos')
  .remove([filePath]);
```
- [ ] **Resultado Esperado:** Delete bem-sucedido

#### Teste: Recrutador tenta deletar currículo
```typescript
// Login como recrutador
const filePath = '[candidato_id]/[vaga_id]/curriculo.pdf';

const { data, error } = await supabase.storage
  .from('curriculos')
  .remove([filePath]);
```
- [ ] **Resultado Esperado:** ERRO (apenas admin pode deletar)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 10.5 Validação de Bucket

#### Teste: Verificar configuração do bucket
```sql
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'curriculos';
```
- [ ] **Resultado Esperado:**
  - id = 'curriculos'
  - public = FALSE
  - file_size_limit = 5242880 (5 MB)
  - allowed_mime_types = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 1️⃣1️⃣ Testes de Funções Auxiliares

### 11.1 Função: calcular_score_geral

#### Teste: Calcular score com todos os campos preenchidos
```sql
-- Criar candidatura com análises IA mockadas
INSERT INTO candidaturas (candidato_id, vaga_id,
    analise_ia_formulario, analise_ia_bigfive, analise_ia_disc,
    analise_ia_raven, analise_ia_cultura,
    analise_ia_entrevista_online, analise_ia_entrevista_presencial)
VALUES ('[candidato_id]', '[vaga_id]',
    '{"score": 80}', '{"score": 75}', '{"score": 70}',
    '{"score": 85}', '{"score": 90}',
    '{"score": 65}', '{"score": 88}'
);

-- Executar função
SELECT calcular_score_geral('[candidatura_id]');

-- Verificar score_geral foi atualizado
SELECT score_geral FROM candidaturas WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:**
  - Função retorna score calculado
  - score_geral atualizado na tabela
  - Cálculo: (80*0.15 + 75*0.15 + 70*0.10 + 85*0.20 + 90*0.30 + 65*0.05 + 88*0.05) = ~81.65

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: Calcular score com campos NULL
```sql
-- Criar candidatura com apenas alguns campos
INSERT INTO candidaturas (candidato_id, vaga_id,
    analise_ia_formulario, analise_ia_cultura)
VALUES ('[candidato_id]', '[vaga_id]',
    '{"score": 80}', '{"score": 90}'
);

-- Executar função
SELECT calcular_score_geral('[candidatura_id]');

-- Verificar score_geral
SELECT score_geral FROM candidaturas WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:**
  - Função trata NULL como 0
  - Cálculo: (80*0.15 + 0 + 0 + 0 + 90*0.30 + 0 + 0) = 39.00

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 11.2 Função: avancar_etapa

#### Teste: Avançar de triagem para bigfive
```sql
-- Criar candidatura em triagem
INSERT INTO candidaturas (candidato_id, vaga_id, etapa_atual, status)
VALUES ('[candidato_id]', '[vaga_id]', 'triagem', 'aguardando_resposta');

-- Avançar etapa
SELECT avancar_etapa('[candidatura_id]', '[usuario_rh_id]');

-- Verificar nova etapa
SELECT etapa_atual, status FROM candidaturas WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:**
  - etapa_atual = 'bigfive'
  - status = 'aguardando_resposta'
  - updated_at atualizado
  - updated_by = usuario_rh_id

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: Avançar de entrevista_presencial para aprovado
```sql
-- Criar candidatura em entrevista_presencial
UPDATE candidaturas
SET etapa_atual = 'entrevista_presencial'
WHERE id = '[candidatura_id]';

-- Avançar para aprovado
SELECT avancar_etapa('[candidatura_id]', '[usuario_rh_id]');

-- Verificar
SELECT etapa_atual, status FROM candidaturas WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:**
  - etapa_atual = 'aprovado'
  - status = 'finalizado'

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: Tentar avançar candidato já aprovado
```sql
-- Candidatura aprovada
UPDATE candidaturas SET etapa_atual = 'aprovado' WHERE id = '[candidatura_id]';

-- Tentar avançar
SELECT avancar_etapa('[candidatura_id]', '[usuario_rh_id]');
```
- [ ] **Resultado Esperado:** ERRO (não é possível avançar de aprovado)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: Verificar ordem completa de etapas
```sql
-- Testar sequência completa: triagem → bigfive → disc → entrevista_online → raven → cultura → entrevista_presencial → aprovado
```
- [ ] **Resultado Esperado:** Cada avanço_etapa move para a próxima etapa correta na ordem

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 11.3 Função: rejeitar_candidato

#### Teste: Rejeitar candidato em qualquer etapa
```sql
-- Criar candidatura em alguma etapa
INSERT INTO candidaturas (candidato_id, vaga_id, etapa_atual, status)
VALUES ('[candidato_id]', '[vaga_id]', 'bigfive', 'aguardando_resposta');

-- Rejeitar
SELECT rejeitar_candidato(
    '[candidatura_id]',
    '[usuario_rh_id]',
    'Perfil não alinhado com requisitos técnicos'
);

-- Verificar
SELECT etapa_atual, status, feedback_rejeicao, data_decisao_final
FROM candidaturas
WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:**
  - etapa_atual = 'rejeitado'
  - status = 'finalizado'
  - feedback_rejeicao = 'Perfil não alinhado com requisitos técnicos'
  - data_decisao_final preenchido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: Tentar rejeitar candidato já rejeitado
```sql
-- Candidato já rejeitado
UPDATE candidaturas SET etapa_atual = 'rejeitado' WHERE id = '[candidatura_id]';

-- Tentar rejeitar novamente
SELECT rejeitar_candidato('[candidatura_id]', '[usuario_rh_id]', 'Motivo 2');
```
- [ ] **Resultado Esperado:** ERRO (candidatura já foi rejeitada)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: Tentar rejeitar candidato aprovado
```sql
-- Candidato aprovado
UPDATE candidaturas SET etapa_atual = 'aprovado' WHERE id = '[candidatura_id]';

-- Tentar rejeitar
SELECT rejeitar_candidato('[candidatura_id]', '[usuario_rh_id]', 'Motivo');
```
- [ ] **Resultado Esperado:** ERRO (não é possível rejeitar candidato aprovado)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 1️⃣2️⃣ Testes de Triggers

### 12.1 Trigger: update_updated_at (todas as 6 tabelas)

#### Teste: updated_at em vagas
```sql
-- Obter valor atual
SELECT updated_at FROM vagas WHERE id = '[vaga_id]';

-- Aguardar 1 segundo e fazer update
UPDATE vagas SET titulo = 'Título Atualizado' WHERE id = '[vaga_id]';

-- Verificar novo valor
SELECT updated_at FROM vagas WHERE id = '[vaga_id]';
```
- [ ] **Resultado Esperado:** updated_at mudou para timestamp atual

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: updated_at em candidaturas
```sql
UPDATE candidaturas SET status = 'em_analise' WHERE id = '[candidatura_id]';
SELECT updated_at FROM candidaturas WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** updated_at atualizado

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: updated_at em perguntas_formulario
```sql
UPDATE perguntas_formulario SET texto_pergunta = 'Pergunta atualizada?' WHERE id = '[pergunta_id]';
SELECT updated_at FROM perguntas_formulario WHERE id = '[pergunta_id]';
```
- [ ] **Resultado Esperado:** updated_at atualizado

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: updated_at em respostas_formulario
```sql
UPDATE respostas_formulario SET resposta_texto = 'Resposta atualizada' WHERE id = '[resposta_id]';
SELECT updated_at FROM respostas_formulario WHERE id = '[resposta_id]';
```
- [ ] **Resultado Esperado:** updated_at atualizado

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: updated_at em perguntas_cultura
```sql
UPDATE perguntas_cultura SET texto_pergunta = 'Pergunta cultura atualizada?' WHERE id = '[pergunta_id]';
SELECT updated_at FROM perguntas_cultura WHERE id = '[pergunta_id]';
```
- [ ] **Resultado Esperado:** updated_at atualizado

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: updated_at em respostas_cultura
```sql
UPDATE respostas_cultura SET resposta_texto = 'Resposta cultura atualizada' WHERE id = '[resposta_id]';
SELECT updated_at FROM respostas_cultura WHERE id = '[resposta_id]';
```
- [ ] **Resultado Esperado:** updated_at atualizado

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 1️⃣3️⃣ Testes de JSONB

### 13.1 Análises IA - Estrutura JSONB

#### Teste: Inserir JSONB válido
```sql
UPDATE candidaturas
SET analise_ia_formulario = '{"score": 85, "pontos_fortes": ["comunicação", "proatividade"], "pontos_melhoria": ["experiência técnica"]}'
WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: Extrair dados do JSONB
```sql
SELECT
    id,
    (analise_ia_formulario->>'score')::DECIMAL as score_formulario,
    analise_ia_formulario->'pontos_fortes' as pontos_fortes
FROM candidaturas
WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** Dados extraídos corretamente

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: Query usando operador JSONB
```sql
SELECT id, analise_ia_cultura
FROM candidaturas
WHERE analise_ia_cultura @> '{"score": 90}';
```
- [ ] **Resultado Esperado:** Retorna candidaturas com score cultura = 90

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 1️⃣4️⃣ Testes de Workflow - Jornada do Candidato

### 14.1 Fluxo Completo: Candidatura → Aprovação

#### Teste: Candidato se candidata à vaga
```sql
-- 1. Criar vaga ativa
INSERT INTO vagas (titulo, slug, tipo_vaga, modalidade_trabalho, cidade, estado, status)
VALUES ('Dentista Clínico Geral', 'dentista-clinico-sp', 'clt', 'presencial', 'São Paulo', 'SP', 'ativa');

-- 2. Candidato cria rascunho
INSERT INTO candidaturas (candidato_id, vaga_id, is_rascunho)
VALUES ('[candidato_id]', '[vaga_id]', TRUE);

-- 3. Candidato responde formulário
INSERT INTO respostas_formulario (candidatura_id, pergunta_id, resposta_texto)
VALUES ('[candidatura_id]', '[pergunta_id]', 'Minha resposta');

-- 4. Candidato finaliza candidatura
UPDATE candidaturas SET is_rascunho = FALSE WHERE id = '[candidatura_id]';

-- 5. RH avalia e avança etapas
SELECT avancar_etapa('[candidatura_id]', '[usuario_rh_id]'); -- triagem → bigfive
SELECT avancar_etapa('[candidatura_id]', '[usuario_rh_id]'); -- bigfive → disc
-- ... continuar até aprovado

-- 6. Calcular score final
SELECT calcular_score_geral('[candidatura_id]');
```
- [ ] **Resultado Esperado:** Fluxo completo executado com sucesso

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 14.2 Fluxo: Candidatura → Rejeição

#### Teste: Candidato rejeitado em etapa intermediária
```sql
-- 1. Criar candidatura
INSERT INTO candidaturas (candidato_id, vaga_id, etapa_atual)
VALUES ('[candidato_id]', '[vaga_id]', 'bigfive');

-- 2. RH rejeita
SELECT rejeitar_candidato('[candidatura_id]', '[usuario_rh_id]',
    'Perfil não alinhado com valores da empresa');

-- 3. Verificar status final
SELECT etapa_atual, status, feedback_rejeicao
FROM candidaturas
WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:**
  - etapa_atual = 'rejeitado'
  - status = 'finalizado'
  - feedback_rejeicao preenchido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 1️⃣5️⃣ Testes de Performance

### 15.1 EXPLAIN ANALYZE - Queries Principais

#### Teste: Busca de vagas ativas (landing page)
```sql
EXPLAIN ANALYZE
SELECT * FROM vagas
WHERE status = 'ativa'
AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;
```
- [ ] **Resultado Esperado:** Usa Index Scan em idx_vagas_status

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: Full-text search em vagas
```sql
EXPLAIN ANALYZE
SELECT * FROM vagas
WHERE to_tsvector('portuguese', titulo) @@ to_tsquery('portuguese', 'dentista')
AND status = 'ativa';
```
- [ ] **Resultado Esperado:** Usa GIN Index idx_vagas_titulo_fts

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: Busca candidaturas por vaga
```sql
EXPLAIN ANALYZE
SELECT c.*, ca.nome_completo
FROM candidaturas c
JOIN candidatos ca ON ca.id = c.candidato_id
WHERE c.vaga_id = '[vaga_id]'
AND c.deleted_at IS NULL
ORDER BY c.score_geral DESC;
```
- [ ] **Resultado Esperado:** Usa Index Scan em idx_candidaturas_vaga_id

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: Busca respostas de candidatura
```sql
EXPLAIN ANALYZE
SELECT rf.*, pf.texto_pergunta
FROM respostas_formulario rf
JOIN perguntas_formulario pf ON pf.id = rf.pergunta_id
WHERE rf.candidatura_id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** Usa Index Scan

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 1️⃣6️⃣ Testes de Validações de Enum

### 16.1 Enum: status_vaga

#### Teste: Status válido
```sql
UPDATE vagas SET status = 'ativa' WHERE id = '[vaga_id]';
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Status inválido
```sql
UPDATE vagas SET status = 'publicada' WHERE id = '[vaga_id]';
```
- [ ] **Resultado Esperado:** ERRO (deve ser: rascunho, ativa, inativa, arquivada)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 16.2 Enum: etapa_processo

#### Teste: Etapa válida
```sql
UPDATE candidaturas SET etapa_atual = 'raven' WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Etapa inválida
```sql
UPDATE candidaturas SET etapa_atual = 'teste_tecnico' WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** ERRO (deve ser uma das 9 etapas definidas)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 16.3 Enum: status_candidatura

#### Teste: Status válido
```sql
UPDATE candidaturas SET status = 'em_analise' WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Status inválido
```sql
UPDATE candidaturas SET status = 'pendente' WHERE id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** ERRO

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 16.4 Enum: tipo_resposta_pergunta

#### Teste: Tipo válido
```sql
UPDATE perguntas_formulario SET tipo_resposta = 'single_choice' WHERE id = '[pergunta_id]';
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Tipo inválido
```sql
UPDATE perguntas_formulario SET tipo_resposta = 'checkbox' WHERE id = '[pergunta_id]';
```
- [ ] **Resultado Esperado:** ERRO

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 1️⃣7️⃣ Testes de Segurança (Advisors)

### 17.1 Executar Security Advisors

```typescript
// Via MCP
const securityAdvisors = await mcp__supabase__get_advisors({ type: "security" });
```

- [ ] Security advisors executados
- [ ] RLS habilitado em todas as tabelas
- [ ] Policies configuradas corretamente
- [ ] Sem tabelas públicas sem RLS
- [ ] Storage buckets com RLS configurado
- [ ] Warnings documentados

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 17.2 Executar Performance Advisors

```typescript
// Via MCP
const performanceAdvisors = await mcp__supabase__get_advisors({ type: "performance" });
```

- [ ] Performance advisors executados
- [ ] Índices criados em foreign keys
- [ ] Queries otimizadas
- [ ] Full-text search configurado
- [ ] Sem N+1 queries
- [ ] Warnings documentados

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 1️⃣8️⃣ Testes de Soft Delete

### 18.1 Soft Delete em vagas

#### Teste: Marcar vaga como deletada
```sql
UPDATE vagas SET deleted_at = NOW() WHERE id = '[vaga_id]';
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Vaga deletada não aparece em busca pública
```sql
-- Executar como anon
SELECT COUNT(*) FROM vagas WHERE id = '[vaga_id]' AND deleted_at IS NULL;
```
- [ ] **Resultado Esperado:** 0 registros

#### Teste: Vaga deletada ainda existe para admin
```sql
-- Login como admin
SELECT * FROM vagas WHERE id = '[vaga_id]';
```
- [ ] **Resultado Esperado:** 1 registro com deleted_at preenchido

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

### 18.2 Soft Delete em perguntas

#### Teste: Marcar pergunta como deletada
```sql
UPDATE perguntas_formulario SET deleted_at = NOW() WHERE id = '[pergunta_id]';
```
- [ ] **Resultado Esperado:** UPDATE bem-sucedido

#### Teste: Pergunta deletada não aparece em queries com filtro
```sql
SELECT COUNT(*) FROM perguntas_formulario WHERE vaga_id = '[vaga_id]' AND deleted_at IS NULL;
```
- [ ] **Resultado Esperado:** Pergunta não contabilizada

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 1️⃣9️⃣ Testes de Índices

### 19.1 Verificar Índices Criados

```sql
-- Listar todos os índices das tabelas PRD-DB-002
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('vagas', 'candidaturas', 'perguntas_formulario', 'respostas_formulario',
                  'perguntas_cultura', 'respostas_cultura', 'vagas_associadas_recrutadores')
ORDER BY tablename, indexname;
```

#### Verificar índices esperados:

**vagas:**
- [ ] idx_vagas_status
- [ ] idx_vagas_slug
- [ ] idx_vagas_cidade_estado
- [ ] idx_vagas_tipo_vaga
- [ ] idx_vagas_created_at
- [ ] idx_vagas_deleted_at
- [ ] idx_vagas_titulo_fts (GIN full-text search)
- [ ] idx_vagas_descricao_curta_fts (GIN full-text search)

**candidaturas:**
- [ ] idx_candidaturas_candidato_id
- [ ] idx_candidaturas_vaga_id
- [ ] idx_candidaturas_etapa_atual
- [ ] idx_candidaturas_status
- [ ] idx_candidaturas_score_geral
- [ ] idx_candidaturas_created_at
- [ ] idx_candidaturas_deleted_at

**perguntas_formulario:**
- [ ] idx_perguntas_form_vaga_id
- [ ] idx_perguntas_form_vaga_bloco_ordem
- [ ] idx_perguntas_form_deleted_at

**respostas_formulario:**
- [ ] idx_respostas_form_candidatura_id
- [ ] idx_respostas_form_pergunta_id

**perguntas_cultura:**
- [ ] idx_perguntas_cultura_vaga_id
- [ ] idx_perguntas_cultura_vaga_ordem
- [ ] idx_perguntas_cultura_deleted_at

**respostas_cultura:**
- [ ] idx_respostas_cultura_candidatura_id
- [ ] idx_respostas_cultura_pergunta_id

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## 2️⃣0️⃣ Testes de Relacionamentos (Foreign Keys)

### 20.1 Verificar Cascade Deletes

#### Teste: Deletar vaga cascateia para perguntas
```sql
-- Criar vaga com perguntas
INSERT INTO vagas (...) VALUES (...); -- vaga_id
INSERT INTO perguntas_formulario (vaga_id, ...) VALUES ('[vaga_id]', ...);

-- Deletar vaga (hard delete para teste)
DELETE FROM vagas WHERE id = '[vaga_id]';

-- Verificar perguntas foram deletadas
SELECT COUNT(*) FROM perguntas_formulario WHERE vaga_id = '[vaga_id]';
```
- [ ] **Resultado Esperado:** 0 registros (CASCADE DELETE funcionou)

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

#### Teste: Deletar candidatura cascateia para respostas
```sql
-- Criar candidatura com respostas
INSERT INTO candidaturas (...) VALUES (...); -- candidatura_id
INSERT INTO respostas_formulario (candidatura_id, ...) VALUES ('[candidatura_id]', ...);

-- Deletar candidatura
DELETE FROM candidaturas WHERE id = '[candidatura_id]';

-- Verificar respostas deletadas
SELECT COUNT(*) FROM respostas_formulario WHERE candidatura_id = '[candidatura_id]';
```
- [ ] **Resultado Esperado:** 0 registros

**Observações:**
```
_________________________________________________
_________________________________________________
```

---

## ✅ Resumo de Testes PRD-DB-002

### Estatísticas
- **Total de Testes:** ~120+
- **Testes Aprovados:** _____ / _____
- **Testes Falhados:** _____ / _____
- **Testes Pendentes:** _____ / _____

### Categorias Testadas
- [x] Infraestrutura (tabelas, enums, funções, storage)
- [x] Constraints (slug, salary, dates, scores, blocos, ordem)
- [x] RLS Policies (29 policies em 6 tabelas + storage)
- [x] Funções Auxiliares (calcular_score_geral, avancar_etapa, rejeitar_candidato)
- [x] Triggers (updated_at em 6 tabelas)
- [x] Storage (curriculos bucket com RLS)
- [x] JSONB (análises IA)
- [x] Workflow (jornada candidato completa)
- [x] Performance (EXPLAIN ANALYZE)
- [x] Validações Enum (4 enums)
- [x] Security Advisors
- [x] Soft Delete
- [x] Índices
- [x] Foreign Keys CASCADE

### Bloqueadores Identificados
```
_________________________________________________
_________________________________________________
_________________________________________________
```

### Próximos Passos
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

**Data de Execução:** ____ / ____ / ____
**Executado por:** _______________________
**Status Final:** [ ] Aprovado  [ ] Reprovado  [ ] Parcial
