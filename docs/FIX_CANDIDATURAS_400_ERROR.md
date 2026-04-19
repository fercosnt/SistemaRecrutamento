# Fix: Erro 400 ao Buscar Candidaturas

**Data:** 2025-01-23
**Status:** ✅ CORRIGIDO
**Prioridade:** 🔴 CRÍTICO

---

## 🐛 Problema

### Erro no Console

```
GET https://isljnozzlvckrgjjbjwp.supabase.co/rest/v1/candidaturas?...&order=data_candidatura.desc
400 (Bad Request)
```

### Sintomas

- ❌ Página `/candidato/perfil` não mostra candidaturas
- ❌ Hook `useCandidaturas()` retorna `candidaturasData: undefined`
- ❌ Query do Supabase retorna erro 400
- ❌ Console mostra: `{isLoading: false, candidaturasData: undefined, candidaturas: [], count: 0}`

---

## 🔍 Causa Raiz

O serviço `candidaturasService.ts` estava usando a coluna **`data_candidatura`** que **NÃO EXISTE** na tabela `candidaturas`.

**Coluna correta:** `created_at`

### Locais Afetados

Todas as funções em `candidaturasService.ts` que fazem query/ordenação:

1. `checkDuplicateApplication()` - linha 165
2. `createCandidatura()` - linha 526, 595
3. `listCandidaturas()` - linhas 697, 701, 707, 714
4. `listAllCandidaturas()` - linhas 1011, 1015, 1021, 1028
5. `listCandidaturasByVaga()` - linhas 1136, 1140, 1146, 1153

---

## 🔧 Correção Aplicada

### Replace Global

```bash
# Substituiu TODAS as 15 ocorrências de data_candidatura por created_at
sed 's/data_candidatura/created_at/g' src/features/vagas/services/candidaturasService.ts
```

### Exemplos de Mudanças

**ANTES:**
```typescript
// Ordenação
query = query.order('data_candidatura', { ascending: false })

// Filtros
query = query.gte('data_candidatura', filters.dataInicio)
query = query.lte('data_candidatura', filters.dataFim)

// Select
.select('id, data_candidatura, deleted_at')

// Insert
data_candidatura: new Date().toISOString()

// Webhook payload
data_aplicacao: candidatura.data_candidatura
```

**DEPOIS:**
```typescript
// Ordenação
query = query.order('created_at', { ascending: false })

// Filtros
query = query.gte('created_at', filters.dataInicio)
query = query.lte('created_at', filters.dataFim)

// Select
.select('id, created_at, deleted_at')

// Insert
created_at: new Date().toISOString()  // ✅ Mas Supabase já faz isso automaticamente

// Webhook payload
data_aplicacao: candidatura.created_at
```

---

## ✅ Resultado

### Query Corrigida

```
GET https://isljnozzlvckrgjjbjwp.supabase.co/rest/v1/candidaturas?
  select=*,vaga:vagas(...)
  &candidato_id=eq.XXX
  &deleted_at=is.null
  &order=created_at.desc  ✅ CORRIGIDO
  &offset=0
  &limit=20
```

### Dados Retornados

```typescript
{
  isLoading: false,
  candidaturasData: {
    success: true,
    data: [
      {
        id: 'uuid-123',
        candidato_id: 'uuid-candidato',
        vaga_id: 'uuid-vaga',
        status: 'em_analise',
        etapa_atual: 'disc',
        created_at: '2025-01-23T10:00:00Z', // ✅
        updated_at: '2025-01-23T15:30:00Z',
        vaga: {
          id: 'uuid-vaga',
          titulo: 'Assistente Odontológico',
          // ...
        }
      }
    ],
    pagination: {...}
  },
  candidaturas: [...], // Array com candidaturas
  count: 1
}
```

---

## 🧪 Como Testar

1. **Login como candidato** que tem candidatura (ex: Fernando Costa Neto)
2. **Navegar para** `/candidato/perfil`
3. **Verificar:**
   - ✅ Seção "Vagas Participando" mostra candidaturas reais
   - ✅ Seção "Progresso no Processo Seletivo" aparece
   - ✅ Dados estão corretos (vaga, status, etapa, datas)
   - ✅ Console NÃO mostra erro 400

4. **Abrir Console do navegador:**
   - ✅ Query retorna 200 OK
   - ✅ Dados de candidaturas aparecem no Network tab

---

## 📊 Schema Correto da Tabela

### Tabela: `candidaturas`

```sql
CREATE TABLE candidaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES candidatos(id),
  vaga_id UUID NOT NULL REFERENCES vagas(id),
  status status_candidatura NOT NULL DEFAULT 'aguardando_resposta',
  etapa_atual etapa_processo NOT NULL DEFAULT 'triagem',
  feedback_rejeicao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- ✅ Coluna correta
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**Nota:** A coluna `data_candidatura` **NUNCA EXISTIU** nesta tabela.

---

## 🚨 Impactos da Correção

### Positivos

✅ Candidatos conseguem ver suas candidaturas
✅ Página `/candidato/perfil` funciona corretamente
✅ Ordenação de candidaturas funciona (mais recentes primeiro)
✅ Filtros por data funcionam (dataInicio, dataFim)
✅ Verificação de duplicatas funciona
✅ Webhook N8N recebe `data_aplicacao` correto

### Possíveis Problemas (Nenhum Detectado)

- ❌ Nenhum código no frontend referencia `data_candidatura`
- ❌ Nenhum componente depende dessa coluna
- ❌ Webhooks N8N usam `data_aplicacao` (que é mapeado de `created_at`)

---

## 📝 Lições Aprendidas

1. **Sempre validar schema do banco** antes de fazer queries
2. **Usar tipagens do database.types.ts** para evitar erros de nome de coluna
3. **Adicionar debug logs temporários** quando dados não aparecem
4. **Verificar Network tab** para ver exatamente qual query está falhando

---

## 🔗 Arquivos Afetados

| Arquivo | Mudanças | Linhas |
|---------|----------|--------|
| `src/features/vagas/services/candidaturasService.ts` | 15 ocorrências de `data_candidatura` → `created_at` | 165, 183, 526, 595, 697, 701, 707, 714, 1011, 1015, 1021, 1028, 1136, 1140, 1146, 1153 |
| `src/components/pages/MeuPerfilCandidatoPage.tsx` | Debug logs removidos após fix | 29-36 |

---

## ✅ Checklist de Verificação

- [x] Todas as referências a `data_candidatura` substituídas por `created_at`
- [x] Query retorna 200 OK
- [x] Candidaturas aparecem na página de perfil
- [x] Ordenação funciona (mais recentes primeiro)
- [x] Filtros por data funcionam
- [x] Verificação de duplicatas funciona
- [x] Webhook N8N recebe dados corretos
- [x] Debug logs removidos
- [x] Documentação criada

---

**Corrigido por:** Claude Code
**Tempo estimado:** 10min
**Prioridade:** Crítico (bloqueava visualização de candidaturas pelo candidato)
**Status:** ✅ Pronto para produção
