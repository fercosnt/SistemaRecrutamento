# Correção Auto-Refresh Status - Round 3

**Data:** 2025-01-23
**Status:** ✅ Completo
**Prioridade:** 🔴 CRÍTICA

---

## 🐛 Problema Reportado

Após atualizar o status de uma candidatura no modal, a UI não atualiza automaticamente. O usuário precisa **recarregar a página manualmente** para ver as mudanças.

**Sintomas:**
- ✅ Status atualiza corretamente no banco de dados
- ✅ Toast de sucesso aparece
- ❌ Lista de candidatos não atualiza
- ❌ Badge de status não muda
- ❌ Precisa dar F5 para ver mudanças

**Relato do usuário:**
> "precisei atualizar a pagina para atualizar o status"

---

## 🔍 Análise da Causa Raiz

### Problema: `invalidateQueries` não força refetch imediato

**Arquivo afetado:** `src/features/vagas/hooks/useCandidaturas.ts:341-343`

**Código problemático:**
```typescript
// ANTES (linha 341-343)
queryClient.invalidateQueries({
  queryKey: candidaturasKeys.lists(),
})
```

### Por que não funcionava?

A função `invalidateQueries` do React Query apenas **marca queries como stale** (desatualizadas), mas **NÃO força um refetch imediato**. As queries só são recarregadas quando:

1. São acessadas novamente (usuário navega)
2. O `staleTime` expira (30 segundos neste caso)
3. A janela/aba volta ao foco

Então, após atualizar o status:
1. ✅ Mutation executa e salva no banco
2. ✅ `invalidateQueries` marca query como stale
3. ❌ Mas a query **não recarrega** porque ainda está dentro do `staleTime`
4. ❌ UI continua mostrando dados antigos

---

## ✅ Correção Implementada

### Usar `refetchQueries` em vez de `invalidateQueries`

**Arquivo:** `src/features/vagas/hooks/useCandidaturas.ts:340-344`

**Antes:**
```typescript
onSuccess: (data) => {
  if (data.success) {
    // Invalidar todas as listas de candidaturas
    queryClient.invalidateQueries({
      queryKey: candidaturasKeys.lists(),
    })

    toast.success('Status atualizado com sucesso!')
  }
}
```

**Depois:**
```typescript
onSuccess: (data) => {
  if (data.success) {
    // Refetch todas as listas de candidaturas (força reload imediato)
    queryClient.refetchQueries({
      queryKey: candidaturasKeys.lists(),
      type: 'active', // Apenas queries ativas (sendo observadas)
    })

    toast.success('Status atualizado com sucesso!')
  }
}
```

### O que mudou?

**`invalidateQueries`** (antigo):
- ❌ Apenas marca query como stale
- ❌ Não força refetch imediato
- ❌ Respeita `staleTime` (30s)
- ❌ UI só atualiza ao navegar ou expirar tempo

**`refetchQueries`** (novo):
- ✅ Força refetch imediato
- ✅ Ignora `staleTime`
- ✅ `type: 'active'` = apenas queries sendo observadas (otimização)
- ✅ UI atualiza instantaneamente

---

## 📊 Impacto da Correção

### Queries afetadas (todas serão refetched):

1. **`useVagaCandidaturas`** (VagaCandidatosRHPage.tsx:89-96)
   - Lista de candidatos da vaga específica
   - Query key: `['candidaturas', 'list', 'by-vaga', vagaId, {...}]`

2. **`useAllCandidaturas`** (CandidatosRHPage.tsx)
   - Lista de todos os candidatos (todas as vagas)
   - Query key: `['candidaturas', 'list', 'all-candidaturas', {...}]`

3. **`useCandidaturas`** (DashboardCandidatoPage.tsx)
   - Lista de candidaturas do candidato
   - Query key: `['candidaturas', 'list', candidatoId, {...}]`

Todas começam com `['candidaturas', 'list']`, então `candidaturasKeys.lists()` as captura.

---

## 🧪 Como Testar

### Teste 1: Atualizar Status Individual

1. Acessar `/rh/vagas/{id}/candidatos`
2. Clicar em **"Aprovar"** ou **"Rejeitar"** num candidato
3. Preencher modal e confirmar
4. ✅ Verificar que toast aparece
5. ✅ **Verificar que badge de status atualiza IMEDIATAMENTE** (sem F5)
6. ✅ Verificar que contador de status atualiza (Ex: "Em Análise (3)" → "(2)")
7. ✅ Se tiver filtro de status ativo, verificar que candidato some/aparece na lista

### Teste 2: Múltiplas Atualizações Rápidas

1. Atualizar status de 3 candidatos diferentes (um após o outro)
2. ✅ Verificar que cada atualização reflete imediatamente
3. ✅ Verificar que não há "lag" ou atraso nas atualizações
4. ✅ Verificar que contadores estão sempre corretos

### Teste 3: Com Filtros Ativos

1. Filtrar lista por "Em Análise"
2. Aprovar um candidato (status muda para "aprovado_proxima")
3. ✅ Candidato deve **sumir da lista imediatamente** (sem F5)
4. Mudar filtro para "Aprovados"
5. ✅ Candidato deve aparecer na lista imediatamente

### Teste 4: Rejeitar → Reconsiderar

1. Rejeitar um candidato (preencher motivo)
2. ✅ Badge muda para "Rejeitado" imediatamente
3. Clicar novamente e voltar para "Em Análise"
4. ✅ Badge muda para "Em Análise" imediatamente
5. ✅ Sem necessidade de F5 em nenhum momento

---

## 🎯 Status das Funcionalidades

| Funcionalidade | Antes (Round 2) | Depois (Round 3) |
|----------------|-----------------|------------------|
| Status atualiza no banco | ✅ Funcional | ✅ Funcional |
| Toast de sucesso | ✅ Funcional | ✅ Funcional |
| UI auto-refresh | ❌ Precisa F5 | ✅ Imediato |
| Badge atualiza | ❌ Precisa F5 | ✅ Imediato |
| Contador atualiza | ❌ Precisa F5 | ✅ Imediato |
| Filtros funcionam | ❌ Precisa F5 | ✅ Imediato |

---

## 📝 Detalhes Técnicos

### Por que `type: 'active'`?

A opção `type: 'active'` garante que apenas queries **atualmente sendo observadas** (com listeners ativos) sejam refetched. Isso é uma **otimização importante**:

- ✅ Não refetch queries de páginas que o usuário não está vendo
- ✅ Economiza requests desnecessários ao backend
- ✅ Melhora performance

**Exemplo:**
- Usuário está em `/rh/vagas/123/candidatos`
- Atualiza status de um candidato
- Refetch **apenas** `useVagaCandidaturas('123')` (query ativa)
- **NÃO** refetch `useAllCandidaturas()` (usuário não está em `/rh/candidatos`)

### Alternativas Consideradas

#### Alternativa 1: Reduzir `staleTime`
```typescript
// ❌ Não ideal
staleTime: 0 // Sempre refetch ao montar
```
**Problema:** Causa refetches excessivos e desnecessários, prejudica performance.

#### Alternativa 2: `invalidateQueries` com `refetchType: 'active'`
```typescript
// ⚠️ Funcional mas menos explícito
queryClient.invalidateQueries({
  queryKey: candidaturasKeys.lists(),
  refetchType: 'active',
})
```
**Problema:** Menos claro que estamos forçando refetch imediato.

#### Alternativa 3: Optimistic Updates
```typescript
// 🚀 Ideal para UX mas complexo
queryClient.setQueryData(queryKey, (old) => {
  // Atualizar cache manualmente antes do refetch
})
```
**Problema:** Muito mais código, difícil de manter, pode ficar desincronizado.

**Decisão:** `refetchQueries` com `type: 'active'` é o **melhor equilíbrio** entre simplicidade, performance e UX.

---

## 🔄 Fluxo de Atualização (Antes vs Depois)

### ANTES (Quebrado):
```
1. Usuário clica "Aprovar"
2. Modal abre e usuário confirma
3. Mutation executa → POST /rest/v1/rpc/update_candidatura_status
4. ✅ Banco atualiza
5. onSuccess: invalidateQueries(['candidaturas', 'list'])
6. ❌ Query marcada como stale, mas NÃO refetch (staleTime = 30s)
7. ❌ UI continua com dados antigos
8. ❌ Usuário precisa dar F5
```

### DEPOIS (Funcional):
```
1. Usuário clica "Aprovar"
2. Modal abre e usuário confirma
3. Mutation executa → POST /rest/v1/rpc/update_candidatura_status
4. ✅ Banco atualiza
5. onSuccess: refetchQueries(['candidaturas', 'list'], type: 'active')
6. ✅ Query refetch IMEDIATO (ignora staleTime)
7. ✅ UI atualiza automaticamente
8. ✅ Badge, contadores, filtros atualizados
```

---

## 🚀 Próximas Tarefas (Pendentes)

### 1. Reordenar Etapas do Processo Seletivo

**Ordem atual:** (incorreta)
- Confusa e não reflete processo real

**Ordem desejada:** (do usuário)
1. Triagem
2. Big Five
3. Disc
4. Online
5. **Raven** (renomear para **"Cognitivo"**)
6. Entrevista presencial
7. Cultura
8. **Avaliacao Final** (novo - criar)
9. Aprovado OU Rejeitado

**Arquivos a modificar:**
- `src/features/vagas/types/vagasTypes.ts` - Enum `EtapaProcesso`
- `src/components/pages/VagaCandidatosRHPage.tsx` - Labels de etapas
- `src/components/pages/CandidatosRHPage.tsx` - Kanban board (se tiver)

### 2. Renomear "Raven" → "Cognitivo"

- Buscar todas as referências a "raven" no código
- Atualizar labels, enums, e base de dados (se necessário)

### 3. Adicionar "Avaliacao Final" como Etapa

- Adicionar ao enum `EtapaProcesso`
- Incluir nos fluxos de transição
- Atualizar modals e componentes

---

**Implementado por:** Claude Code
**Data:** 2025-01-23
**Build:** ✅ Sem erros TypeScript
**Status:** ✅ Pronto para teste

---

## 📸 Evidências de Teste (A serem adicionadas pelo usuário)

- [ ] Screenshot: Status atualiza sem F5
- [ ] Screenshot: Badge muda imediatamente
- [ ] Screenshot: Contador atualiza em tempo real
- [ ] GIF: Múltiplas atualizações rápidas sem lag
