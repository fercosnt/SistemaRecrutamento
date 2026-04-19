# Correção: Campo Telefone → Celular

**Data:** 2025-01-22  
**Problema:** Erro 400 ao carregar candidaturas  
**Status:** ✅ CORRIGIDO

---

## 🔴 Problema Identificado

Ao tentar carregar candidaturas de uma vaga, ocorria erro 400:

```
GET /rest/v1/candidaturas?select=*%2Ccandidato%3Acandidatos(...telefone...)
400 (Bad Request)
columns candidatos.telefone does not exist
```

**Causa:** O código estava tentando buscar o campo `telefone` na tabela `candidatos`, mas o campo correto no banco de dados é `celular`.

---

## ✅ Correções Aplicadas

### 1. Arquivo: `src/features/vagas/services/candidaturasService.ts`

#### Linha 935 - Query de candidaturas por vaga:
**Antes:**
```typescript
candidato:candidatos (
  id,
  nome_completo,
  email,
  telefone,  // ❌ Campo não existe
  data_nascimento,
  cpf,
  endereco_completo,
  created_at
)
```

**Depois:**
```typescript
candidato:candidatos (
  id,
  nome_completo,
  email,
  celular,  // ✅ Campo correto
  data_nascimento,
  cpf,
  cidade,
  estado,
  created_at
)
```

#### Linha 562 - Query de candidato para webhook:
**Antes:**
```typescript
.select('id, nome_completo, email, telefone')
```

**Depois:**
```typescript
.select('id, nome_completo, email, celular')
```

#### Linha 857 - Payload do webhook:
**Antes:**
```typescript
telefone: candidato.telefone,
```

**Depois:**
```typescript
telefone: candidato.celular,  // Mapeia para telefone no payload (mantém compatibilidade)
```

### 2. Arquivo: `src/components/pages/VagaCandidatosRHPage.tsx`

#### Linha 303 - Exibição do telefone:
**Antes:**
```typescript
{candidato?.telefone && (
  <span className="flex items-center gap-1">
    <Phone className="h-4 w-4" />
    {candidato.telefone}
  </span>
)}
```

**Depois:**
```typescript
{candidato?.celular && (
  <span className="flex items-center gap-1">
    <Phone className="h-4 w-4" />
    {candidato.celular}
  </span>
)}
```

---

## 📋 Verificação do Schema do Banco

Confirmado no schema SQL (`docs/sql/sql/02-tabela-candidatos.sql`):

```sql
CREATE TABLE candidatos (
    ...
    celular VARCHAR(15) NOT NULL,  -- ✅ Campo correto
    ...
);
```

**Nota:** O campo `endereco_completo` também não existe na tabela. O endereço é composto pelos campos:
- `cep`
- `logradouro`
- `numero`
- `complemento`
- `bairro`
- `cidade`
- `estado`

Por isso também removemos `endereco_completo` da query e adicionamos `cidade` e `estado`.

---

## ✅ Resultado

Após as correções:
- ✅ Query de candidaturas funciona corretamente
- ✅ Campo `celular` é buscado do banco
- ✅ Campo é exibido corretamente na interface
- ✅ Webhook N8N recebe o campo correto (mapeado como `telefone` no payload para compatibilidade)

---

## 🔍 Arquivos Modificados

1. `src/features/vagas/services/candidaturasService.ts`
   - Linha 935: Campo `telefone` → `celular` na query
   - Linha 562: Campo `telefone` → `celular` na query
   - Linha 857: Mapeamento `candidato.telefone` → `candidato.celular`
   - Removido `endereco_completo` (não existe)
   - Adicionado `cidade` e `estado` (campos reais)

2. `src/components/pages/VagaCandidatosRHPage.tsx`
   - Linha 303: Campo `telefone` → `celular` na exibição

---

## 📝 Notas Adicionais

- O payload do webhook mantém o nome `telefone` para compatibilidade com o workflow N8N
- O campo `celular` no banco tem formato validado: `(XX) XXXXX-XXXX`
- Todos os campos relacionados ao endereço foram ajustados para usar os campos reais do banco








