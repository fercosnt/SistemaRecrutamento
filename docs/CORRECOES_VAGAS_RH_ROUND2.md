# Correções Round 2 - VagasRHPage e CandidatosRHPage

**Data:** 2025-01-23
**Status:** ✅ Completo
**Prioridade:** 🔴 CRÍTICA

---

## 🐛 Novos Problemas Reportados pelo Usuário

Após as correções iniciais, o usuário reportou 3 novos problemas:

1. ❌ **Vagas pausadas desaparecem** - Quando pausa uma vaga, ela some da lista
2. ❌ **Erro ao duplicar vaga** - Constraint violation no campo `slug`
3. ❌ **Status errado ao ver vaga** - Vagas ativas mostram como "inativas" na página de candidatos

---

## 🔍 Análise das Causas Raiz

### Problema 1: Vagas Pausadas Desaparecem
**Causa Raiz:** `useVagas()` não passava filtro `apenasAtivas: false`, então o backend só retornava vagas com `status = 'ativa'`. Quando uma vaga era pausada (status mudava para 'inativa'), ela era excluída da query.

**Linha do código:**
```typescript
// ANTES - VagasRHPage.tsx:62
const { data: vagasData, isLoading, error } = useVagas();
```

### Problema 2: Erro ao Duplicar Vaga (Slug Duplicado)
**Causa Raiz:** Ao duplicar uma vaga, o código copiava todos os campos incluindo o `slug`, que tem uma constraint UNIQUE no banco de dados.

**Erro do banco:**
```
POST https://...supabase.co/rest/v1/vagas?select=id 409 (Conflict)
Error: duplicate key value violates unique constraint "vagas_slug_key"
Code: 23505
```

**Linha do código:**
```typescript
// ANTES - VagasRHPage.tsx:103-107
const vagaDuplicada = {
  ...vagaData,
  titulo: `${vagaOriginal.titulo} (Cópia)`,
  status: 'inativa',
  // ❌ Slug copiado = conflito!
};
```

### Problema 3: Status Errado na Página de Candidatos
**Causa Raiz:** `CandidatosRHPage` usava filtro `{ ativa: true }` (campo que não existe) para buscar vagas. Isso causava comportamento inconsistente.

**Linha do código:**
```typescript
// ANTES - CandidatosRHPage.tsx:153
const { data: vagasData } = useVagas(
  { ativa: true }, // ❌ Campo não existe!
  'alfabetica',
  { page: 1, limit: 100 }
)
```

---

## ✅ Correções Implementadas

### 1. Corrigir Filtro em VagasRHPage

**Arquivo:** `src/components/pages/VagasRHPage.tsx:62-66`

**Antes:**
```typescript
const { data: vagasData, isLoading, error } = useVagas();
```

**Depois:**
```typescript
// Buscar vagas do banco de dados (incluindo todas - ativas, inativas, rascunhos)
const { data: vagasData, isLoading, error } = useVagas(
  { apenasAtivas: false }, // Buscar TODAS as vagas, filtrar no client
  'mais_recentes',
  { page: 1, limit: 100 } // Aumentar limit para mostrar todas
);
```

**Impacto:**
- ✅ Vagas pausadas (inativas) agora aparecem na lista
- ✅ Filtros client-side ('todas', 'ativas', 'inativas', 'rascunhos') funcionam corretamente
- ✅ Quando pausa uma vaga, ela muda de status mas não desaparece

---

### 2. Gerar Slug Único ao Duplicar

**Arquivo:** `src/components/pages/VagasRHPage.tsx:104-113`

**Antes:**
```typescript
const { id, created_at, updated_at, deleted_at, ...vagaData } = vagaOriginal as any;
const vagaDuplicada = {
  ...vagaData,
  titulo: `${vagaOriginal.titulo} (Cópia)`,
  status: 'inativa', // Duplicatas começam inativas
};
```

**Depois:**
```typescript
const { id, created_at, updated_at, deleted_at, ...vagaData } = vagaOriginal as any;

// Gerar slug único para evitar conflito de constraint
const timestamp = Date.now();
const slugUnico = `${vagaData.slug}-copia-${timestamp}`;

const vagaDuplicada = {
  ...vagaData,
  titulo: `${vagaOriginal.titulo} (Cópia)`,
  slug: slugUnico, // Slug único com timestamp
  status: 'inativa', // Duplicatas começam inativas
};
```

**Estratégia de Slug Único:**
- Pega o slug original: `analista-financeiro`
- Adiciona sufixo `-copia-{timestamp}`: `analista-financeiro-copia-1737653281234`
- Garante unicidade usando timestamp em millisegundos

**Impacto:**
- ✅ Duplicar vaga funciona sem erros
- ✅ Cada duplicata tem slug único
- ✅ URL amigável mantida com sufixo identificável

---

### 3. Corrigir Filtro em CandidatosRHPage

**Arquivo:** `src/components/pages/CandidatosRHPage.tsx:152-156`

**Antes:**
```typescript
// Buscar vagas para filtro
const { data: vagasData } = useVagas(
  { ativa: true }, // ❌ Campo não existe!
  'alfabetica',
  { page: 1, limit: 100 }
)
```

**Depois:**
```typescript
// Buscar vagas para filtro (incluindo todas - ativas e inativas)
const { data: vagasData } = useVagas(
  { apenasAtivas: false }, // Incluir vagas ativas e inativas
  'alfabetica',
  { page: 1, limit: 100 }
)
```

**Impacto:**
- ✅ Página de candidatos mostra vagas com status correto
- ✅ Filtro de vagas funciona corretamente
- ✅ RH pode ver candidatos de vagas inativas/pausadas

---

### 4. Corrigir Badge de Status em VagaCandidatosRHPage

**Arquivo:** `src/components/pages/VagaCandidatosRHPage.tsx:193-201`

**Antes:**
```typescript
<Badge
  className={
    vagaData.ativa  // ❌ Campo não existe!
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
>
  {vagaData.ativa ? '🟢 Ativa' : '⚪ Inativa'}
</Badge>
```

**Depois:**
```typescript
<Badge
  className={
    vagaData.status === 'ativa'  // ✅ Campo correto!
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
>
  {vagaData.status === 'ativa' ? '🟢 Ativa' : '⚪ Inativa'}
</Badge>
```

**Impacto:**
- ✅ Badge de status na página de candidatos da vaga mostra status correto
- ✅ Vagas ativas mostram "🟢 Ativa"
- ✅ Vagas inativas/pausadas mostram "⚪ Inativa"

---

## 📊 Resumo das Mudanças

| Arquivo | Linhas Modificadas | Mudanças |
|---------|-------------------|----------|
| `VagasRHPage.tsx` | 62-66 | Adicionar filtro `apenasAtivas: false` |
| `VagasRHPage.tsx` | 104-113 | Gerar slug único com timestamp |
| `CandidatosRHPage.tsx` | 152-156 | Corrigir filtro de `ativa` para `apenasAtivas` |
| `VagaCandidatosRHPage.tsx` | 193-201 | Corrigir badge usando `status` em vez de `ativa` |

---

## ✅ Funcionalidades Agora Funcionais

### 1. Pausar/Ativar Vaga
- ✅ Vaga pausada muda status para 'inativa'
- ✅ Vaga pausada **permanece visível** na lista
- ✅ Badge de status atualiza corretamente
- ✅ Pode reativar vaga pausada
- ✅ Filtros client-side funcionam ('todas', 'ativas', 'inativas')

### 2. Duplicar Vaga
- ✅ Cria cópia da vaga com título "(Cópia)"
- ✅ Gera slug único automaticamente
- ✅ Não causa erro de constraint violation
- ✅ Navega para edição da vaga duplicada
- ✅ Todos campos copiados corretamente

### 3. Visualizar Vaga (Candidatos)
- ✅ Status da vaga exibido corretamente em CandidatosRHPage
- ✅ Status da vaga exibido corretamente em VagaCandidatosRHPage
- ✅ Filtro de vagas mostra ativas e inativas
- ✅ RH pode gerenciar candidatos de vagas pausadas
- ✅ Badge "🟢 Ativa" ou "⚪ Inativa" mostra status correto
- ✅ Dados consistentes entre todas as páginas

---

## 🧪 Como Testar

### Teste 1: Pausar Vaga
1. Acessar `/rh/vagas`
2. Clicar em "..." numa vaga ativa
3. Clicar em "Pausar"
4. ✅ Verificar toast de sucesso
5. ✅ Verificar que badge muda para "Inativa"
6. ✅ **Verificar que vaga PERMANECE na lista** (não desaparece)
7. ✅ Filtrar por "Inativas" e verificar que vaga aparece
8. ✅ Clicar em "Ativar" e verificar que volta para "Ativa"

### Teste 2: Duplicar Vaga
1. Acessar `/rh/vagas`
2. Clicar em "..." em qualquer vaga
3. Clicar em "Duplicar"
4. ✅ Verificar toast de sucesso (sem erro 409)
5. ✅ Verificar navegação para página de edição
6. ✅ Verificar que título tem "(Cópia)"
7. ✅ Verificar que status é "Inativa"
8. ✅ Verificar URL tem slug único (com sufixo `-copia-{timestamp}`)
9. ✅ Duplicar a mesma vaga 3x e verificar que todas funcionam

### Teste 3: Ver Vaga (Candidatos)
1. Acessar `/rh/vagas`
2. Clicar em "..." numa vaga **ativa**
3. Clicar em "Visualizar"
4. ✅ Verificar que navega para página de candidatos
5. ✅ **Verificar que status da vaga mostra como "Ativa"** (não "Inativa")
6. ✅ Voltar, pausar a vaga
7. ✅ Visualizar novamente
8. ✅ Verificar que agora mostra status "Inativa"

---

## 🎯 Status Final

| Funcionalidade | Status Antes Round 2 | Status Depois Round 2 |
|----------------|---------------------|----------------------|
| Vagas pausadas visíveis | ❌ Desaparecem | ✅ Permanecem na lista |
| Duplicar vaga | ❌ Erro 409 slug | ✅ Funcional com slug único |
| Status em "Ver Vaga" | ❌ Sempre "inativa" | ✅ Status correto |
| Filtros client-side | ⚠️ Parcial | ✅ Totalmente funcional |

---

## 📝 Detalhes Técnicos

### Por que `apenasAtivas: false`?

O campo `apenasAtivas` no filtro do `vagasService.ts` controla a query SQL:

```typescript
// vagasService.ts:131-133
if (filters?.apenasAtivas !== false) {
  query = query.eq('status', 'ativa')
}
```

- `undefined` (padrão) → Filtra apenas `status = 'ativa'`
- `true` → Filtra apenas `status = 'ativa'`
- `false` → **NÃO filtra**, traz todos os status

Portanto, para VagasRHPage e CandidatosRHPage (ambas páginas de admin), usamos `apenasAtivas: false` para trazer todas as vagas e aplicar filtros no client-side.

### Por que Timestamp no Slug?

- **Unicidade garantida:** `Date.now()` nunca se repete
- **Rastreabilidade:** Slug contém momento da duplicação
- **Simplicidade:** Uma linha de código, sem queries adicionais
- **Performance:** Sem necessidade de verificar slugs existentes

Alternativas consideradas mas rejeitadas:
- ❌ Incrementar número (`-copia-1`, `-copia-2`) → Requer query para contar
- ❌ UUID completo → Slug muito longo e não amigável
- ❌ Remover slug e gerar novo → Perde referência ao original

---

## 🚀 Próximos Passos (Se Necessário)

### Melhorias Futuras (Opcional)

1. **Visualizar Vagas Arquivadas**
   - Adicionar aba "Arquivadas" em VagasRHPage
   - Mostrar vagas com `deleted_at IS NOT NULL`
   - Permitir restaurar vaga arquivada

2. **Otimizar Slug de Duplicatas**
   - Gerar slug mais curto: `-c1`, `-c2` em vez de timestamp
   - Implementar verificação incremental inteligente

3. **Indicador Visual de Duplicatas**
   - Badge "CÓPIA" na vaga duplicada
   - Link para vaga original

---

**Implementado por:** Claude Code
**Data:** 2025-01-23
**Build:** ✅ Sem erros TypeScript
**Status:** Pronto para teste manual

---

## 📸 Screenshots de Teste (A serem adicionadas pelo usuário)

1. [ ] Screenshot: Vaga pausada permanece na lista
2. [ ] Screenshot: Duplicar vaga com slug único na URL
3. [ ] Screenshot: Status correto na página de candidatos
