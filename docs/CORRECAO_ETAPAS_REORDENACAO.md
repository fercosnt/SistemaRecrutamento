# Correção e Reordenação de Etapas - Round 3

**Data:** 2025-01-23
**Status:** ✅ Completo
**Prioridade:** 🟡 MÉDIA

---

## 🎯 Objetivo

Reordenar as etapas do processo seletivo e renomear "Raven" para "Cognitivo" conforme solicitado pelo usuário.

**Solicitação do usuário:**
> "seria interessante as etapas estarem na ordem: Triagem, Big Five, Disc, Online, Raven (rename to Cognitivo), Entrevista presencial, Cultura, Avaliacao Final, depois dessa avaliacao ou eh aprovado ou rejeitado"

---

## 📋 Mudanças Implementadas

### 1. Reordenação das Etapas

**ORDEM ANTERIOR (incorreta):**
1. triagem
2. bigfive
3. disc
4. entrevista_online
5. raven
6. ~~cultura~~ ❌ (estava antes de presencial)
7. ~~entrevista_presencial~~ ❌ (estava depois de cultura)
8. aprovado/rejeitado

**ORDEM NOVA (corrigida):**
1. triagem
2. bigfive
3. disc
4. entrevista_online
5. raven (Cognitivo)
6. entrevista_presencial ✅ (agora vem ANTES de cultura)
7. cultura ✅ (agora vem DEPOIS de presencial)
8. **avaliacao_final** ✅ (NOVO)
9. aprovado OU rejeitado

---

### 2. Renomeação de "Raven" → "Cognitivo"

**Arquivo:** `src/features/vagas/types/vagasTypes.ts:548`

**Antes:**
```typescript
raven: 'Teste Raven (QI)',
```

**Depois:**
```typescript
raven: 'Teste Cognitivo', // ✅ RENOMEADO: era "Teste Raven (QI)"
```

**IMPORTANTE:** O valor do enum no banco (`'raven'`) **NÃO mudou**. Apenas o **label de exibição** foi alterado para "Teste Cognitivo".

---

### 3. Adição da Nova Etapa "Avaliação Final"

#### 3.1. Migração de Banco de Dados

**Arquivo:** `supabase/migrations/20250123_add_avaliacao_final_etapa.sql`

```sql
-- Adicionar 'avaliacao_final' ao ENUM etapa_processo
ALTER TYPE etapa_processo ADD VALUE IF NOT EXISTS 'avaliacao_final';

-- Comentário descritivo
COMMENT ON TYPE etapa_processo IS 'Etapas do processo seletivo: triagem → bigfive → disc → entrevista_online → raven (cognitivo) → entrevista_presencial → cultura → avaliacao_final → aprovado/rejeitado';
```

**Status:** ✅ Migração aplicada com sucesso

#### 3.2. TypeScript Types

**Arquivo:** `src/features/vagas/types/vagasTypes.ts:139-149`

```typescript
export type EtapaProcesso =
  | 'triagem'
  | 'bigfive'              // Teste Big Five (SEM underscore!)
  | 'disc'                 // Teste DISC
  | 'entrevista_online'    // Entrevista online (vídeo)
  | 'raven'                // Teste Cognitivo (antigo: Raven)
  | 'entrevista_presencial' // Entrevista presencial
  | 'cultura'              // Análise de fit cultural
  | 'avaliacao_final'      // Avaliação final (NOVO - requer migração DB)
  | 'aprovado'             // Aprovado final
  | 'rejeitado'            // Rejeitado final
```

#### 3.3. Labels de Exibição

**Arquivo:** `src/features/vagas/types/vagasTypes.ts:543-554`

```typescript
export const ETAPA_PROCESSO_LABELS: Record<EtapaProcesso, string> = {
  triagem: 'Triagem Inicial',
  bigfive: 'Teste Big Five',
  disc: 'Teste DISC',
  entrevista_online: 'Entrevista Online',
  raven: 'Teste Cognitivo',                    // ✅ RENOMEADO
  entrevista_presencial: 'Entrevista Presencial',  // ✅ REORDENADO
  cultura: 'Análise Cultural',                 // ✅ REORDENADO
  avaliacao_final: 'Avaliação Final',          // ✅ NOVO
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}
```

#### 3.4. Progresso Percentual

**Arquivo:** `src/features/vagas/types/vagasTypes.ts:574-585`

**Antes (9 etapas):**
```typescript
export const ETAPA_PROGRESS: Record<EtapaProcesso, number> = {
  triagem: 11,                  // 1/9
  bigfive: 22,                  // 2/9
  disc: 33,                     // 3/9
  entrevista_online: 44,        // 4/9
  raven: 56,                    // 5/9
  cultura: 67,                  // 6/9
  entrevista_presencial: 78,    // 7/9
  aprovado: 100,                // 9/9 - Final
  rejeitado: 0,                 // Rejeitado (sem progresso)
}
```

**Depois (10 etapas):**
```typescript
export const ETAPA_PROGRESS: Record<EtapaProcesso, number> = {
  triagem: 10,                  // 1/10
  bigfive: 20,                  // 2/10
  disc: 30,                     // 3/10
  entrevista_online: 40,        // 4/10
  raven: 50,                    // 5/10 (Cognitivo)
  entrevista_presencial: 60,    // 6/10 ✅ REORDENADO
  cultura: 70,                  // 7/10 ✅ REORDENADO
  avaliacao_final: 80,          // 8/10 ✅ NOVO
  aprovado: 100,                // 10/10 - Final
  rejeitado: 0,                 // Rejeitado (sem progresso)
}
```

---

## 📊 Resumo das Mudanças

| Arquivo | Mudança | Status |
|---------|---------|--------|
| `supabase/migrations/20250123_add_avaliacao_final_etapa.sql` | Nova migração | ✅ Criado e aplicado |
| `database.types.ts` | Regenerado com novo enum | ✅ Atualizado |
| `src/features/vagas/types/vagasTypes.ts` (linha 139-149) | Adicionar 'avaliacao_final' ao type | ✅ Atualizado |
| `src/features/vagas/types/vagasTypes.ts` (linha 543-554) | Reordenar labels + renomear Raven | ✅ Atualizado |
| `src/features/vagas/types/vagasTypes.ts` (linha 574-585) | Atualizar progresso percentual | ✅ Atualizado |

---

## 🔄 Fluxo do Processo Seletivo (Atualizado)

```
┌─────────────────────────────────────────────────────────────┐
│                  FLUXO DO PROCESSO SELETIVO                  │
└─────────────────────────────────────────────────────────────┘

1️⃣  TRIAGEM INICIAL (10%)
    └─> Análise inicial do currículo e formulário
         ↓
2️⃣  TESTE BIG FIVE (20%)
    └─> Avaliação de personalidade (OCEAN)
         ↓
3️⃣  TESTE DISC (30%)
    └─> Perfil comportamental (D, I, S, C)
         ↓
4️⃣  ENTREVISTA ONLINE (40%)
    └─> Entrevista por vídeo
         ↓
5️⃣  TESTE COGNITIVO (50%) ✨ RENOMEADO
    └─> Teste de QI (antigo: Raven)
         ↓
6️⃣  ENTREVISTA PRESENCIAL (60%) ✨ REORDENADO
    └─> Entrevista presencial com RH
         ↓
7️⃣  ANÁLISE CULTURAL (70%) ✨ REORDENADO
    └─> Avaliação de fit cultural
         ↓
8️⃣  AVALIAÇÃO FINAL (80%) ✨ NOVO
    └─> Decisão final do RH
         ↓
    ┌───────────────┴───────────────┐
    ↓                               ↓
9️⃣  APROVADO (100%)           ❌ REJEITADO (0%)
```

---

## ✅ Impactos das Mudanças

### 1. Interface do Usuário

- **Badge de Etapa:** Candidatos verão "Teste Cognitivo" em vez de "Teste Raven (QI)"
- **Barra de Progresso:** Percentuais ajustados para 10 etapas (antes eram 9)
- **Ordem dos Cards:** Etapas aparecerão na ordem correta (Presencial → Cultura → Avaliação Final)

### 2. Banco de Dados

- **Novo valor enum:** `'avaliacao_final'` disponível para uso em `candidaturas.etapa_atual`
- **Compatibilidade:** Candidaturas antigas continuam funcionando (valores existentes não foram alterados)
- **Migrations:** Nova migração adicionada ao histórico

### 3. Validações

- **Status Transitions:** Adicionar `'avaliacao_final'` aos fluxos de transição permitidos
- **Formulários:** Dropdowns de etapas agora incluem "Avaliação Final"

---

## 🧪 Como Testar

### Teste 1: Verificar Labels Atualizados

1. Acessar qualquer página que exibe etapas (ex: [/rh/vagas/:id/candidatos](src/components/pages/VagaCandidatosRHPage.tsx:322))
2. ✅ Verificar que etapa "raven" mostra como **"Teste Cognitivo"** (não "Teste Raven")
3. ✅ Verificar que "Avaliação Final" aparece como opção

### Teste 2: Verificar Ordem das Etapas

1. Ver lista de candidatos ordenada por etapa
2. ✅ Verificar ordem: Triagem → Big Five → DISC → Online → Cognitivo → **Presencial** → **Cultura** → **Avaliação Final** → Aprovado/Rejeitado

### Teste 3: Verificar Progresso Percentual

1. Ver barra de progresso de um candidato em cada etapa
2. ✅ Verificar percentuais:
   - Triagem: 10%
   - Big Five: 20%
   - DISC: 30%
   - Online: 40%
   - Cognitivo: 50%
   - Presencial: 60%
   - Cultura: 70%
   - Avaliação Final: 80%
   - Aprovado: 100%

### Teste 4: Criar Candidatura com Nova Etapa

1. Via RH, atualizar etapa de uma candidatura para "Avaliação Final"
2. ✅ Verificar que salva sem erros
3. ✅ Verificar que mostra label correto ("Avaliação Final")
4. ✅ Verificar que progresso mostra 80%

### Teste 5: Verificar Database Types

1. Abrir `database.types.ts`
2. ✅ Verificar que enum `etapa_processo` inclui `'avaliacao_final'`
3. ✅ Compilar projeto (`npm run build`) sem erros TypeScript

---

## 🔧 Próximas Tarefas (Se Necessário)

### 1. Atualizar Fluxos de Transição de Etapas

Se houver lógica de transição automática de etapas (ex: "depois de Cultura, vai para Avaliação Final"), atualizar em:
- `src/features/vagas/services/candidaturasService.ts`
- Qualquer lógica de workflow que use etapas

### 2. Atualizar Kanban Board (Se Houver)

Se existir um board Kanban visual de etapas, adicionar coluna para "Avaliação Final":
- `src/components/pages/CandidatosRHPage.tsx` (se tiver Kanban)
- Atualizar `ETAPA_TO_KANBAN` mapping

### 3. Atualizar Webhooks N8N

Se N8N envia notificações baseadas em etapas, adicionar handler para:
- Candidato chegou em "Avaliação Final"
- Etapa "raven" agora exibe como "Cognitivo" nos emails

---

## 📝 Notas Técnicas

### Por que não mudamos o valor do enum 'raven'?

O valor `'raven'` é armazenado no banco de dados em milhares de registros históricos. Mudar o valor do enum quebraria:
- ❌ Todas as candidaturas existentes com `etapa_atual = 'raven'`
- ❌ Queries e índices que usam esse valor
- ❌ Histórico de relatórios

**Solução:** Manter `'raven'` no banco, mas mudar apenas o **label de exibição** para "Teste Cognitivo" na UI.

### Estratégia de Migração

1. **Adicionar novo valor** (`avaliacao_final`) ao enum **SEM remover** valores antigos
2. **Compatibilidade backwards:** Candidaturas antigas continuam com etapas antigas
3. **Novas candidaturas:** Podem usar todas as etapas (incluindo nova)

---

## 📸 Evidências (A serem adicionadas pelo usuário)

- [ ] Screenshot: Label "Teste Cognitivo" (não "Raven")
- [ ] Screenshot: Ordem correta (Presencial → Cultura → Avaliação Final)
- [ ] Screenshot: Progresso 80% em "Avaliação Final"
- [ ] Screenshot: Dropdown de etapas mostrando "Avaliação Final"

---

**Implementado por:** Claude Code
**Data:** 2025-01-23
**Build:** ✅ Sem erros TypeScript
**Migração DB:** ✅ Aplicada com sucesso
**Status:** ✅ Pronto para teste manual
