# Guia: Criar Tabela logs_acesso no Supabase

## 📋 Objetivo

Criar a tabela `logs_acesso` no banco de dados Supabase para habilitar o sistema de logging de segurança implementado na Task 5.

## 🚀 Método 1: Executar via Supabase Dashboard (Recomendado)

### Passo 1: Acessar SQL Editor

1. Acesse: https://app.supabase.com/project/isljnozzlvckrgjjbjwp/sql
2. Clique em **"New query"**

### Passo 2: Executar a Migration

1. Abra o arquivo: `/supabase/migrations/20250116_create_logs_acesso_table.sql`
2. Copie **TODO** o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **"RUN"** (ou Ctrl/Cmd + Enter)

### Passo 3: Verificar Criação

Execute no SQL Editor:
```sql
-- Verificar se tabela foi criada
SELECT * FROM public.logs_acesso LIMIT 1;

-- Verificar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'logs_acesso';

-- Verificar policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'logs_acesso';
```

**Resultado Esperado:**
- ✅ Tabela criada com sucesso
- ✅ 6 índices criados
- ✅ 3 policies RLS configuradas

---

## 🔧 Método 2: Executar via CLI (Alternativo)

### Pré-requisitos

- Docker Desktop instalado
- Supabase CLI configurado

### Comandos

```bash
cd "/Users/fernando/Cursor Repo/DB Sistema de recrutamento"

# Aplicar migration
npx supabase db push

# Ou, se estiver usando local development:
npx supabase db reset
```

---

## 📝 Atualizar Tipos TypeScript

Após criar a tabela, você precisa atualizar os tipos TypeScript:

### Opção A: Gerar tipos automaticamente (CLI)

```bash
cd "/Users/fernando/Cursor Repo/DB Sistema de recrutamento"

# Gerar tipos do Supabase
npx supabase gen types typescript --project-id isljnozzlvckrgjjbjwp > database.types.ts
```

### Opção B: Adicionar manualmente (se CLI não funcionar)

Abra `database.types.ts` e adicione dentro de `Tables`:

```typescript
export interface Database {
  public: {
    Tables: {
      // ... outras tabelas

      logs_acesso: {
        Row: {
          id: string
          evento: string
          user_id: string | null
          email_tentativa: string | null
          ip_address: string | null
          country: string | null
          city: string | null
          device_info: string | null
          device_type: string | null
          browser: string | null
          operating_system: string | null
          erro_mensagem: string | null
          created_at: string
        }
        Insert: {
          id?: string
          evento: string
          user_id?: string | null
          email_tentativa?: string | null
          ip_address?: string | null
          country?: string | null
          city?: string | null
          device_info?: string | null
          device_type?: string | null
          browser?: string | null
          operating_system?: string | null
          erro_mensagem?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          evento?: string
          user_id?: string | null
          email_tentativa?: string | null
          ip_address?: string | null
          country?: string | null
          city?: string | null
          device_info?: string | null
          device_type?: string | null
          browser?: string | null
          operating_system?: string | null
          erro_mensagem?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_acesso_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    // ... resto do schema
  }
}
```

---

## 🧹 Remover @ts-ignore

Após atualizar os tipos, remova o comentário do código:

**Arquivo**: `/src/services/logAccessService.ts`

**Antes:**
```typescript
// @ts-ignore - Tabela logs_acesso precisa ser criada no banco e tipos atualizados
const { error } = await supabase.from('logs_acesso').insert(logData)
```

**Depois:**
```typescript
const { error } = await supabase.from('logs_acesso').insert(logData)
```

---

## ✅ Verificar que Tudo Funciona

### Teste 1: Build do Projeto

```bash
npm run build
```

**Esperado:** ✅ Build sem erros de tipo

### Teste 2: Inserir Log Manualmente

Execute no SQL Editor:

```sql
INSERT INTO public.logs_acesso (
  evento,
  email_tentativa,
  ip_address,
  device_type,
  browser,
  operating_system
) VALUES (
  'login_sucesso',
  'teste@example.com',
  '192.168.1.100',
  'desktop',
  'Chrome 120.0',
  'macOS 14.0'
);

-- Verificar
SELECT * FROM public.logs_acesso ORDER BY created_at DESC LIMIT 5;
```

**Esperado:** ✅ Log inserido com sucesso

### Teste 3: Testar via Aplicação

```bash
# Iniciar aplicação
npm run dev

# Acessar
http://localhost:5173/auth/esqueci-senha

# Preencher email e enviar
# Verificar no SQL Editor:
```

```sql
SELECT evento, email_tentativa, created_at
FROM public.logs_acesso
WHERE evento = 'password_reset_request'
ORDER BY created_at DESC
LIMIT 10;
```

**Esperado:** ✅ Novo log de `password_reset_request` aparece

---

## 🔒 Segurança Implementada

A tabela foi criada com as seguintes proteções:

### 1. Row Level Security (RLS)

- ✅ **RLS ativado** - Nenhum usuário pode acessar diretamente
- ✅ **Policy INSERT** - Qualquer um pode inserir (necessário para logging)
- ✅ **Policy SELECT** - Apenas service_role pode ler
- ✅ **Policy DELETE** - Apenas service_role pode deletar

### 2. Índices de Performance

- ✅ `idx_logs_acesso_evento` - Busca por tipo de evento
- ✅ `idx_logs_acesso_user_id` - Busca por usuário
- ✅ `idx_logs_acesso_created_at` - Busca por data (DESC para últimos logs)
- ✅ `idx_logs_acesso_ip_address` - Busca por IP (detectar abuse)
- ✅ `idx_logs_acesso_email_tentativa` - Busca por email
- ✅ `idx_logs_acesso_security_analysis` - Análise de segurança combinada

### 3. View de Análise

- ✅ `security_analysis_view` - Agregação de eventos por hora
- ✅ Apenas service_role pode acessar
- ✅ Útil para dashboards e alertas

---

## 📊 Queries Úteis para Análise

### Eventos de Password Reset (últimas 24h)

```sql
SELECT
  evento,
  COUNT(*) as total,
  COUNT(DISTINCT email_tentativa) as emails_unicos,
  COUNT(DISTINCT ip_address) as ips_unicos
FROM public.logs_acesso
WHERE evento LIKE 'password_reset%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY evento
ORDER BY total DESC;
```

### IPs com Múltiplas Tentativas (possível abuse)

```sql
SELECT
  ip_address,
  COUNT(*) as tentativas,
  COUNT(DISTINCT email_tentativa) as emails_diferentes,
  MIN(created_at) as primeira_tentativa,
  MAX(created_at) as ultima_tentativa
FROM public.logs_acesso
WHERE evento = 'password_reset_request'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) >= 5
ORDER BY tentativas DESC;
```

### Usuários com Falhas Recentes

```sql
SELECT
  email_tentativa,
  COUNT(*) as falhas,
  MAX(created_at) as ultima_falha,
  ARRAY_AGG(DISTINCT erro_mensagem) as erros
FROM public.logs_acesso
WHERE evento IN ('password_reset_failed', 'login_falha')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY email_tentativa
HAVING COUNT(*) >= 3
ORDER BY falhas DESC;
```

### Taxa de Sucesso de Password Reset

```sql
WITH requests AS (
  SELECT COUNT(*) as total_requests
  FROM public.logs_acesso
  WHERE evento = 'password_reset_request'
    AND created_at > NOW() - INTERVAL '7 days'
),
completions AS (
  SELECT COUNT(*) as total_completions
  FROM public.logs_acesso
  WHERE evento = 'password_reset_completed'
    AND created_at > NOW() - INTERVAL '7 days'
)
SELECT
  r.total_requests,
  c.total_completions,
  ROUND((c.total_completions::DECIMAL / NULLIF(r.total_requests, 0)) * 100, 2) as taxa_sucesso_pct
FROM requests r, completions c;
```

---

## 🧹 Limpeza de Logs Antigos (Opcional)

Se quiser implementar limpeza automática, descomente o trigger no SQL:

```sql
-- No arquivo 20250116_create_logs_acesso_table.sql
-- Remova os /* */ ao redor do código do trigger
-- Isso vai deletar logs com mais de 90 dias automaticamente
```

Ou crie um cron job manual:

```sql
-- Deletar logs com mais de 90 dias
DELETE FROM public.logs_acesso
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## 📚 Referências

- [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase TypeScript Types](https://supabase.com/docs/reference/javascript/typescript-support)

---

## ✅ Checklist Final

Antes de marcar Task 5 como 100% completa:

- [ ] Executar migration SQL no Supabase
- [ ] Verificar tabela criada com `SELECT * FROM logs_acesso`
- [ ] Atualizar tipos TypeScript (`database.types.ts`)
- [ ] Remover `@ts-ignore` do `logAccessService.ts`
- [ ] Build sem erros (`npm run build`)
- [ ] Testar inserção manual de log
- [ ] Testar via aplicação (esqueci senha)
- [ ] Verificar logs no banco após teste

---

**Status**: ⏳ Aguardando execução da migration
**Tempo Estimado**: 5-10 minutos
**Arquivo SQL**: `/supabase/migrations/20250116_create_logs_acesso_table.sql`
