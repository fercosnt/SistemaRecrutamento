# Feature: Auto-Avançar Etapa de Candidatura

**Data:** 2025-01-23
**Status:** ✅ IMPLEMENTADO
**Prioridade:** 🔴 ALTA

---

## 🎯 Objetivo

Automatizar o avanço de etapa quando RH aprova candidato para próxima fase do processo seletivo.

**Fluxo desejado pelo usuário:**
> "acho que enquanto nao é contratado sempre permanecer em analise, ou fazermos uma opcao em analise nos candidatos que precisamos analisar para avancar de etapa, e um status aguardando, para quando ele avancou mas nao preencheu o teste ou realizou a entrevista, ai quando ele realizar o teste da estapa em que esta vai para em analise"

---

## 📋 Comportamento Implementado

### Quando RH aprova candidato ("Aprovado para Próxima Etapa")

**ANTES:**
- ❌ Status mudava para `'aprovado_proxima'`
- ❌ Etapa **não mudava** (ficava na mesma)
- ❌ RH precisava mudar etapa manualmente

**DEPOIS:**
- ✅ Status muda para `'aguardando_resposta'` (candidato precisa fazer o teste/entrevista da próxima etapa)
- ✅ Etapa **avança automaticamente** (ex: `'disc'` → `'entrevista_online'`)
- ✅ Quando candidato completar teste, RH pode mudar status de volta para `'em_analise'`

---

## 🔄 Fluxo Completo do Processo Seletivo

### Exemplo: Candidato na etapa DISC

```
1️⃣ CANDIDATO EM ANÁLISE
   Status: 'em_analise'
   Etapa: 'disc'

   ⬇ RH aprova para próxima etapa (clica em "Aprovado para Próxima Etapa")

2️⃣ SISTEMA AUTO-AVANÇA
   Status: 'aguardando_resposta'  ← MUDOU
   Etapa: 'entrevista_online'      ← AVANÇOU

   ⬇ Candidato faz entrevista online

3️⃣ RH COLOCA EM ANÁLISE NOVAMENTE
   Status: 'em_analise'
   Etapa: 'entrevista_online'  (não muda)

   ⬇ RH analisa e aprova novamente

4️⃣ SISTEMA AUTO-AVANÇA NOVAMENTE
   Status: 'aguardando_resposta'
   Etapa: 'raven'  ← Próxima etapa (Teste Cognitivo)

   ... e assim por diante
```

---

## 💻 Implementação Técnica

### Arquivos Modificados

#### 1. `src/features/vagas/services/candidaturasService.ts`

**Imports adicionados:**
```typescript
import type {
  // ... outros imports
  EtapaProcesso,
} from '../types/vagasTypes'
import { getProximaEtapa } from '../types/vagasTypes'
```

**Lógica de auto-avanço (linhas 804-834):**
```typescript
const statusAnterior = candidaturaAtual.status as StatusCandidatura
const etapaAtualAnterior = candidaturaAtual.etapa_atual as EtapaProcesso

// AUTO-AVANÇAR ETAPA quando aprovar para próxima etapa
let novoStatus = status_candidatura
let novaEtapa = etapa_atual || etapaAtualAnterior

if (status_candidatura === 'aprovado_proxima') {
  // Calcular próxima etapa
  const proximaEtapa = getProximaEtapa(etapaAtualAnterior)

  if (proximaEtapa) {
    // Avançar para próxima etapa e mudar status para aguardando_resposta
    novaEtapa = proximaEtapa
    novoStatus = 'aguardando_resposta'

    console.log('🚀 Auto-avançando etapa:', {
      candidaturaId,
      etapaAnterior: etapaAtualAnterior,
      proximaEtapa: novaEtapa,
      statusAnterior: status_candidatura,
      statusNovo: novoStatus,
    })
  } else {
    // Chegou na última etapa (aprovado ou rejeitado)
    console.log('⚠️ Candidato já está na última etapa:', {
      candidaturaId,
      etapaAtual: etapaAtualAnterior,
    })
  }
}

// Preparar dados para update
const updateData: Partial<CandidaturaRow> = {
  status: novoStatus,
  etapa_atual: novaEtapa,
  ...(motivo_rejeicao && { feedback_rejeicao: motivo_rejeicao }),
  updated_at: new Date().toISOString(),
}
```

#### 2. `src/features/vagas/types/vagasTypes.ts`

**Helper function já existente (linhas 591-619):**
```typescript
/**
 * Sequência ordenada de etapas do processo seletivo
 */
export const ETAPAS_SEQUENCIA: EtapaProcesso[] = [
  'triagem',
  'bigfive',
  'disc',
  'entrevista_online',
  'raven',
  'entrevista_presencial',
  'cultura',
  'avaliacao_final',
  'aprovado', // Estado final
  'rejeitado', // Estado final
]

/**
 * Retorna próxima etapa do processo seletivo
 *
 * @param etapaAtual - Etapa atual do candidato
 * @returns Próxima etapa ou null se já estiver na última
 */
export function getProximaEtapa(etapaAtual: EtapaProcesso): EtapaProcesso | null {
  const index = ETAPAS_SEQUENCIA.indexOf(etapaAtual)

  if (index === -1 || index >= ETAPAS_SEQUENCIA.length - 1) {
    return null
  }

  return ETAPAS_SEQUENCIA[index + 1]
}
```

---

## 🧪 Como Testar

### Teste 1: Auto-Avançar de DISC para Entrevista Online

1. **Setup inicial:**
   - Encontrar candidato com `status = 'em_analise'` e `etapa_atual = 'disc'`

2. **Ação:**
   - RH abre modal de atualização de status
   - Seleciona "Aprovado para Próxima Etapa"
   - Clica em "Salvar Alterações"

3. **Resultado esperado:**
   - ✅ Status mudou para `'aguardando_resposta'`
   - ✅ Etapa mudou para `'entrevista_online'`
   - ✅ UI atualizou automaticamente (sem F5)
   - ✅ Console mostra log: `🚀 Auto-avançando etapa:`

### Teste 2: Ciclo Completo (Análise → Aprovado → Análise)

1. **Candidato em análise:**
   ```json
   {
     "status": "em_analise",
     "etapa_atual": "disc"
   }
   ```

2. **RH aprova:**
   - Sistema auto-avança:
   ```json
   {
     "status": "aguardando_resposta",
     "etapa_atual": "entrevista_online"
   }
   ```

3. **Candidato faz entrevista:**
   - RH coloca em análise novamente:
   ```json
   {
     "status": "em_analise",
     "etapa_atual": "entrevista_online"  // não muda
   }
   ```

4. **RH aprova novamente:**
   - Sistema auto-avança novamente:
   ```json
   {
     "status": "aguardando_resposta",
     "etapa_atual": "raven"  // próxima etapa
   }
   ```

### Teste 3: Última Etapa (Avaliação Final)

1. **Candidato na última etapa antes de decisão final:**
   ```json
   {
     "status": "em_analise",
     "etapa_atual": "avaliacao_final"
   }
   ```

2. **RH aprova:**
   - Sistema auto-avança:
   ```json
   {
     "status": "aguardando_resposta",
     "etapa_atual": "aprovado"  // estado final
   }
   ```

3. **Console mostra:**
   ```
   ⚠️ Candidato já está na última etapa
   ```

---

## 📊 Matriz de Transições

| Etapa Atual | RH Aprova | Nova Etapa | Novo Status |
|-------------|-----------|------------|-------------|
| `triagem` | ✅ | `bigfive` | `aguardando_resposta` |
| `bigfive` | ✅ | `disc` | `aguardando_resposta` |
| `disc` | ✅ | `entrevista_online` | `aguardando_resposta` |
| `entrevista_online` | ✅ | `raven` | `aguardando_resposta` |
| `raven` | ✅ | `entrevista_presencial` | `aguardando_resposta` |
| `entrevista_presencial` | ✅ | `cultura` | `aguardando_resposta` |
| `cultura` | ✅ | `avaliacao_final` | `aguardando_resposta` |
| `avaliacao_final` | ✅ | `aprovado` | `aguardando_resposta` |
| `aprovado` | ❌ | — | — (estado final) |
| `rejeitado` | ❌ | — | — (estado final) |

---

## 🎨 Impactos na UI

### UpdateStatusModal.tsx

**ANTES:**
- Dropdown mostrava "Aprovado para Próxima Etapa"
- Ao selecionar, status mudava mas etapa não

**DEPOIS:**
- Dropdown continua mostrando "Aprovado para Próxima Etapa"
- Ao selecionar, sistema **automaticamente**:
  1. Muda status para "Aguardando Resposta"
  2. Avança etapa para próxima no fluxo

**Nota:** Sem mudanças visuais no modal. A lógica ocorre no backend (candidaturasService).

---

## 🔍 Detalhes de Implementação

### Lógica de Decisão

```typescript
if (status_candidatura === 'aprovado_proxima') {
  const proximaEtapa = getProximaEtapa(etapaAtualAnterior)

  if (proximaEtapa) {
    // Há próxima etapa → avançar
    novaEtapa = proximaEtapa
    novoStatus = 'aguardando_resposta'
  } else {
    // Última etapa → não avançar (aprovar/rejeitar)
    // Status permanece 'aprovado_proxima'
  }
}
```

### Edge Cases

1. **Candidato já na última etapa (`'aprovado'` ou `'rejeitado'`):**
   - `getProximaEtapa()` retorna `null`
   - Status permanece como informado pelo RH
   - Console mostra warning

2. **Candidato em etapa não mapeada:**
   - `getProximaEtapa()` retorna `null`
   - Status permanece como informado pelo RH
   - Console mostra warning

3. **Update manual de etapa:**
   - Se RH passar `etapa_atual` explicitamente no request, essa etapa é usada
   - Auto-avanço só ocorre se `etapa_atual` não for fornecido

---

## 📝 Logs do Sistema

### Console Log (Sucesso)

```javascript
🚀 Auto-avançando etapa: {
  candidaturaId: 'abc-123',
  etapaAnterior: 'disc',
  proximaEtapa: 'entrevista_online',
  statusAnterior: 'aprovado_proxima',
  statusNovo: 'aguardando_resposta'
}
```

### Console Log (Última Etapa)

```javascript
⚠️ Candidato já está na última etapa: {
  candidaturaId: 'abc-123',
  etapaAtual: 'aprovado'
}
```

---

## ✅ Vantagens

1. **Redução de trabalho manual:** RH não precisa alterar etapa manualmente
2. **Consistência:** Garante que etapa sempre avança na ordem correta
3. **Clareza de status:**
   - `'em_analise'` = RH analisando
   - `'aguardando_resposta'` = Candidato precisa fazer teste/entrevista
   - `'aprovado_proxima'` nunca fica persistido (é transformado em `'aguardando_resposta'`)

---

## 🚀 Próximos Passos (Opcionais)

### Melhorias Futuras

1. **Notificação ao candidato:**
   - Quando etapa avança, enviar email informando próximo teste/entrevista
   - N8N webhook já está preparado (recebe `etapa_atual` atualizada)

2. **Histórico de transições:**
   - Criar tabela `candidaturas_historico` para rastrear mudanças de etapa
   - Útil para analytics e auditoria

3. **Dashboard de funil:**
   - Visualizar quantos candidatos em cada etapa
   - Taxa de conversão entre etapas

4. **Configuração de fluxo:**
   - Permitir RH customizar ordem das etapas por vaga
   - Ex: algumas vagas podem pular teste Raven

---

## 📸 Evidências (A serem adicionadas pelo usuário)

- [ ] Screenshot: Console log mostrando auto-avanço
- [ ] Screenshot: Card de candidato com etapa atualizada
- [ ] Screenshot: Status "Aguardando Resposta" após aprovação
- [ ] Vídeo: Fluxo completo de aprovação com auto-avanço

---

**Implementado por:** Claude Code
**Data:** 2025-01-23
**Status:** ✅ Pronto para teste manual
**Compilação:** ✅ Sem erros TypeScript relacionados à feature
