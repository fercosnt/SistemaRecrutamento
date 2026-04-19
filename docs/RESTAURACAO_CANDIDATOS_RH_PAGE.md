# Restauração CandidatosRHPage - Task List Completa

**Data**: 2025-11-22
**Status**: ⏳ PENDENTE APROVAÇÃO
**Objetivo**: Restaurar funcionalidades removidas (3 abas, Kanban, scores) e conectar aos dados reais do banco

---

## 📊 CONTEXTO

### O que foi removido:
- ✅ 3 Abas: "Todos", "Por Vaga", "Kanban"
- ✅ Visualização Kanban com drag-and-drop
- ✅ Dados de testes nos cards (Big Five, DISC, Intel, Cultura)
- ✅ Score visual com barra de progresso
- ✅ Funil na aba "Por Vaga"

### O que existe no banco:
- ✅ `candidaturas.score_geral` (0-100) - **SCORE PRINCIPAL**
- ✅ `scores_bigfive` - 5 dimensões OCEAN (0-100 cada)
- ✅ `scores_disc` - perfil D/I/S/C (primário + secundário)
- ✅ `scores_raven` - percentil inteligência (0-100)
- ✅ `candidaturas.analise_ia_cultura` - JSONB com score cultura

### Bibliotecas disponíveis:
- ✅ `react-dnd` + `react-dnd-html5-backend` (JÁ INSTALADAS)
- ✅ `@radix-ui/react-tabs` (JÁ DISPONÍVEL)
- ✅ `lucide-react` (ícones)

---

## 🎯 FASE 1: MODIFICAR QUERY PARA INCLUIR SCORES

### Arquivo: `src/features/vagas/services/candidaturasService.ts`

**Linha 920-923**: Modificar query `listAllCandidaturas()`

#### ANTES:
```typescript
let query = supabase
  .from('candidaturas')
  .select('*, candidato:candidatos(*), vaga:vagas(*)', { count: 'exact' })
  .is('deleted_at', null)
```

#### DEPOIS:
```typescript
let query = supabase
  .from('candidaturas')
  .select(`
    *,
    candidato:candidatos(*),
    vaga:vagas(*),
    scores_bigfive!left(
      score_openness,
      score_conscientiousness,
      score_extraversion,
      score_agreeableness,
      score_neuroticism
    ),
    scores_disc!left(
      perfil_primario,
      perfil_secundario
    ),
    scores_raven!left(
      percentil,
      classificacao
    )
  `, { count: 'exact' })
  .is('deleted_at', null)
```

**IMPORTANTE**: O `score_geral` JÁ VEM no `candidaturas.*` - não precisa join adicional!

**Checklist**:
- [ ] Modificar query select para incluir joins LEFT
- [ ] Testar query no Supabase para garantir sintaxe correta
- [ ] Verificar se retorna dados sem erros

---

## 🎯 FASE 2: CRIAR TYPES PARA SCORES

### Arquivo: `src/features/vagas/types/vagasTypes.ts`

#### 2.1. Type para Scores

**Adicionar no final do arquivo**:

```typescript
/**
 * Scores dos testes psicométricos
 */
export interface CandidaturaScores {
  bigfive?: {
    score_openness: number
    score_conscientiousness: number
    score_extraversion: number
    score_agreeableness: number
    score_neuroticism: number
  } | null
  disc?: {
    perfil_primario: string // D, I, S, C
    perfil_secundario: string // D, I, S, C
  } | null
  raven?: {
    percentil: number // 0-100
    classificacao: string // Inferior, Médio, Superior
  } | null
}

/**
 * Candidatura com scores dos testes
 */
export interface CandidaturaComScores extends Candidatura {
  scores_bigfive?: CandidaturaScores['bigfive']
  scores_disc?: CandidaturaScores['disc']
  scores_raven?: CandidaturaScores['raven']
}

/**
 * Etapas do Kanban (agrupamento de etapas do processo)
 */
export type KanbanStage = 'triagem' | 'testes' | 'cultura' | 'entrevista'
```

#### 2.2. Helpers para cálculos

**Adicionar no final do arquivo**:

```typescript
/**
 * Mapeia etapa_atual do banco → coluna do Kanban
 */
export function getKanbanStage(etapa: string): KanbanStage {
  if (etapa === 'triagem') return 'triagem'
  if (['bigfive', 'disc', 'raven'].includes(etapa)) return 'testes'
  if (etapa === 'cultura') return 'cultura'
  if (['entrevista_online', 'entrevista_presencial'].includes(etapa)) return 'entrevista'
  return 'triagem' // fallback
}

/**
 * Calcula média do Big Five (5 dimensões)
 */
export function calculateBigFiveAverage(scores?: CandidaturaScores['bigfive']): number {
  if (!scores) return 0
  const sum =
    scores.score_openness +
    scores.score_conscientiousness +
    scores.score_extraversion +
    scores.score_agreeableness +
    scores.score_neuroticism
  return Math.round(sum / 5)
}

/**
 * Formata perfil DISC (ex: "DI", "SC")
 */
export function formatDiscProfile(scores?: CandidaturaScores['disc']): string {
  if (!scores) return 'N/A'
  return `${scores.perfil_primario}${scores.perfil_secundario}`
}

/**
 * Extrai score de cultura do JSONB
 */
export function getCulturaScore(analise_ia_cultura?: any): number {
  if (!analise_ia_cultura?.score) return 0
  return Number(analise_ia_cultura.score) || 0
}
```

**Checklist**:
- [ ] Adicionar interface `CandidaturaScores`
- [ ] Adicionar interface `CandidaturaComScores`
- [ ] Adicionar type `KanbanStage`
- [ ] Adicionar helper `getKanbanStage()`
- [ ] Adicionar helper `calculateBigFiveAverage()`
- [ ] Adicionar helper `formatDiscProfile()`
- [ ] Adicionar helper `getCulturaScore()`

---

## 🎯 FASE 3: CRIAR COMPONENTES DE SCORE

### 3.1. ScoreCard Component

**Arquivo**: `src/components/ScoreCard.tsx` (NOVO)

```typescript
import React from 'react'
import { Brain, Users, TrendingUp, Heart } from 'lucide-react'

interface ScoreCardProps {
  bigFive: number      // 0-100
  disc: string         // "DI", "SC"
  inteligencia: number // 0-100 (percentil Raven)
  cultura: number      // 0-100
}

export function ScoreCard({ bigFive, disc, inteligencia, cultura }: ScoreCardProps) {
  return (
    <div className="grid grid-cols-2 gap-2 text-white/90 text-sm">
      {/* Big Five */}
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-blue-300" />
        <div>
          <div className="text-xs opacity-70">Big Five</div>
          <div className="font-semibold">{bigFive || 'N/A'}</div>
        </div>
      </div>

      {/* DISC */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-green-300" />
        <div>
          <div className="text-xs opacity-70">DISC</div>
          <div className="font-semibold">{disc || 'N/A'}</div>
        </div>
      </div>

      {/* Inteligência (Raven) */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-purple-300" />
        <div>
          <div className="text-xs opacity-70">Intel</div>
          <div className="font-semibold">P{inteligencia || 'N/A'}</div>
        </div>
      </div>

      {/* Cultura */}
      <div className="flex items-center gap-2">
        <Heart className="w-4 h-4 text-pink-300" />
        <div>
          <div className="text-xs opacity-70">Cultura</div>
          <div className="font-semibold">{cultura || 'N/A'}</div>
        </div>
      </div>
    </div>
  )
}
```

### 3.2. ScoreProgressBar Component

**Arquivo**: `src/components/ScoreProgressBar.tsx` (NOVO)

```typescript
import React from 'react'
import { cn } from '@/lib/utils'

interface ScoreProgressBarProps {
  score: number // 0-100
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreProgressBar({
  score,
  showLabel = true,
  size = 'md'
}: ScoreProgressBarProps) {
  const height = size === 'sm' ? 'h-2' : size === 'lg' ? 'h-4' : 'h-3'

  const getColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-white/70">Score Geral</span>
          <span className="text-sm font-bold text-white">{score || 0}/100</span>
        </div>
      )}
      <div className={cn('w-full bg-white/20 rounded-full overflow-hidden', height)}>
        <div
          className={cn('h-full transition-all duration-300', getColor(score))}
          style={{ width: `${score || 0}%` }}
        />
      </div>
    </div>
  )
}
```

**Checklist**:
- [ ] Criar `ScoreCard.tsx` com grid 2x2
- [ ] Criar `ScoreProgressBar.tsx` com barra colorida
- [ ] Testar componentes isoladamente
- [ ] Adicionar ícones do lucide-react

---

## 🎯 FASE 4: RESTAURAR SISTEMA DE ABAS

### Arquivo: `src/components/pages/CandidatosRHPage.tsx`

#### 4.1. Adicionar imports necessários

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ScoreCard } from '@/components/ScoreCard'
import { ScoreProgressBar } from '@/components/ScoreProgressBar'
import {
  calculateBigFiveAverage,
  formatDiscProfile,
  getCulturaScore,
  type CandidaturaComScores
} from '@/features/vagas/types/vagasTypes'
```

#### 4.2. Adicionar state para aba ativa

**Após linha 43** (junto com outros useState):

```typescript
const [activeTab, setActiveTab] = useState<'todos' | 'por-vaga' | 'kanban'>('todos')
```

#### 4.3. Envolver conteúdo em Tabs

**Substituir todo o conteúdo após o header** (linha 145+):

```tsx
<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
  <TabsList className="bg-white/10 backdrop-blur-sm">
    <TabsTrigger value="todos" className="data-[state=active]:bg-white/20">
      📋 Todos ({candidaturas.length})
    </TabsTrigger>
    <TabsTrigger value="por-vaga" className="data-[state=active]:bg-white/20">
      📊 Por Vaga
    </TabsTrigger>
    <TabsTrigger value="kanban" className="data-[state=active]:bg-white/20">
      🎯 Kanban
    </TabsTrigger>
  </TabsList>

  {/* Aba TODOS */}
  <TabsContent value="todos">
    {/* Mover código atual dos cards/tabela para cá */}
  </TabsContent>

  {/* Aba POR VAGA */}
  <TabsContent value="por-vaga">
    {/* TODO: Implementar na FASE 6 */}
  </TabsContent>

  {/* Aba KANBAN */}
  <TabsContent value="kanban">
    {/* TODO: Implementar na FASE 7 */}
  </TabsContent>
</Tabs>
```

**Checklist**:
- [ ] Adicionar imports de Tabs
- [ ] Adicionar state `activeTab`
- [ ] Envolver conteúdo em `<Tabs>`
- [ ] Criar 3 `<TabsTrigger>` com contadores
- [ ] Mover código atual para `<TabsContent value="todos">`

---

## 🎯 FASE 5: ADICIONAR SCORES NA ABA "TODOS"

### Modificar cards para exibir scores

**Dentro da função que renderiza os cards** (procurar onde está o map de candidaturas):

#### 5.1. Calcular scores

**Antes do return do card**:

```typescript
const candidaturaComScores = candidatura as CandidaturaComScores

// Calcular scores
const bigFiveAvg = calculateBigFiveAverage(candidaturaComScores.scores_bigfive)
const discProfile = formatDiscProfile(candidaturaComScores.scores_disc)
const ravenPercentil = candidaturaComScores.scores_raven?.percentil || 0
const culturaScore = getCulturaScore(candidatura.analise_ia_cultura)
const scoreGeral = candidatura.score_geral || 0
```

#### 5.2. Adicionar componentes no card

**Adicionar após o nome do candidato**:

```tsx
{/* Score Geral - DESTAQUE */}
<ScoreProgressBar score={scoreGeral} size="md" />

{/* Scores Detalhados */}
<ScoreCard
  bigFive={bigFiveAvg}
  disc={discProfile}
  inteligencia={ravenPercentil}
  cultura={culturaScore}
/>
```

**Checklist**:
- [ ] Importar helpers de cálculo
- [ ] Calcular scores antes de renderizar card
- [ ] Adicionar `<ScoreProgressBar>` no card
- [ ] Adicionar `<ScoreCard>` no card
- [ ] Testar visualmente no navegador

---

## 🎯 FASE 6: IMPLEMENTAR ABA "POR VAGA"

### 6.1. Criar componente FunilVaga

**Arquivo**: `src/components/FunilVaga.tsx` (NOVO)

```typescript
import React from 'react'
import { Progress } from '@/components/ui/progress'

interface FunilVagaProps {
  triagem: number
  testes: number
  cultura: number
  entrevista: number
  total: number
}

export function FunilVaga({ triagem, testes, cultura, entrevista, total }: FunilVagaProps) {
  const calcPercent = (count: number) => total > 0 ? (count / total) * 100 : 0

  return (
    <div className="space-y-3">
      {/* Triagem */}
      <div>
        <div className="flex justify-between text-sm text-white mb-1">
          <span>Triagem</span>
          <span className="font-semibold">{triagem}</span>
        </div>
        <Progress value={calcPercent(triagem)} className="h-2" />
      </div>

      {/* Testes */}
      <div>
        <div className="flex justify-between text-sm text-white mb-1">
          <span>Testes</span>
          <span className="font-semibold">{testes}</span>
        </div>
        <Progress value={calcPercent(testes)} className="h-2" />
      </div>

      {/* Cultura */}
      <div>
        <div className="flex justify-between text-sm text-white mb-1">
          <span>Cultura</span>
          <span className="font-semibold">{cultura}</span>
        </div>
        <Progress value={calcPercent(cultura)} className="h-2" />
      </div>

      {/* Entrevista */}
      <div>
        <div className="flex justify-between text-sm text-white mb-1">
          <span>Entrevista</span>
          <span className="font-semibold">{entrevista}</span>
        </div>
        <Progress value={calcPercent(entrevista)} className="h-2" />
      </div>
    </div>
  )
}
```

### 6.2. Implementar aba "Por Vaga" em CandidatosRHPage

```tsx
<TabsContent value="por-vaga" className="space-y-6">
  {/* Seletor de Vaga */}
  <Glass variant="white" blur="lg" className="p-6 rounded-xl">
    <Select value={selectedVaga} onValueChange={setSelectedVaga}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione uma vaga" />
      </SelectTrigger>
      <SelectContent>
        {/* Buscar vagas únicas das candidaturas */}
        {Array.from(new Set(candidaturas.map(c => c.vaga_id))).map(vagaId => {
          const vaga = candidaturas.find(c => c.vaga_id === vagaId)?.vaga
          const count = candidaturas.filter(c => c.vaga_id === vagaId).length
          return (
            <SelectItem key={vagaId} value={vagaId}>
              {vaga?.titulo} ({count})
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  </Glass>

  {/* Funil */}
  {selectedVaga && (
    <Glass variant="white" blur="lg" className="p-6 rounded-xl">
      <h3 className="text-lg font-semibold text-white mb-4">Funil da Vaga</h3>
      <FunilVaga {...calcularFunil(candidaturas.filter(c => c.vaga_id === selectedVaga))} />
    </Glass>
  )}

  {/* Lista de candidatos da vaga */}
  {/* Reusar componente de cards/tabela filtrando por selectedVaga */}
</TabsContent>
```

### 6.3. Helper para calcular funil

```typescript
function calcularFunil(candidaturas: Candidatura[]) {
  return {
    triagem: candidaturas.filter(c => c.etapa_atual === 'triagem').length,
    testes: candidaturas.filter(c => ['bigfive', 'disc', 'raven'].includes(c.etapa_atual)).length,
    cultura: candidaturas.filter(c => c.etapa_atual === 'cultura').length,
    entrevista: candidaturas.filter(c => ['entrevista_online', 'entrevista_presencial'].includes(c.etapa_atual)).length,
    total: candidaturas.length
  }
}
```

**Checklist**:
- [ ] Criar componente `FunilVaga.tsx`
- [ ] Adicionar state `selectedVaga`
- [ ] Criar Select com lista de vagas
- [ ] Implementar helper `calcularFunil()`
- [ ] Renderizar funil + lista filtrada

---

## 🎯 FASE 7: IMPLEMENTAR ABA KANBAN

### 7.1. Criar KanbanCard

**Arquivo**: `src/components/KanbanCard.tsx` (NOVO)

```typescript
import React from 'react'
import { useDrag } from 'react-dnd'
import { Badge } from '@/components/ui/badge'
import type { StatusCandidatura } from '@/features/vagas/types/vagasTypes'

interface KanbanCardProps {
  candidaturaId: string
  candidatoNome: string
  candidatoAvatar: string // iniciais
  vagaTitulo: string
  scoreGeral: number
  status: StatusCandidatura
}

export function KanbanCard({
  candidaturaId,
  candidatoNome,
  candidatoAvatar,
  vagaTitulo,
  scoreGeral,
  status
}: KanbanCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'CANDIDATO',
    item: { candidaturaId },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  const getStatusColor = (status: StatusCandidatura) => {
    switch (status) {
      case 'aguardando_resposta': return 'bg-yellow-500'
      case 'em_analise': return 'bg-blue-500'
      case 'aprovado_proxima': return 'bg-green-500'
      case 'rejeitado': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div
      ref={drag}
      className={`
        bg-white/10 backdrop-blur-sm p-4 rounded-lg cursor-move
        hover:bg-white/20 transition-all
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
    >
      {/* Avatar + Nome */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
          {candidatoAvatar}
        </div>
        <div className="flex-1">
          <div className="text-white font-medium text-sm">{candidatoNome}</div>
          <div className="text-white/60 text-xs">{vagaTitulo}</div>
        </div>
      </div>

      {/* Score Geral - DESTAQUE */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/70">Score</span>
        <span className="text-2xl font-bold text-white">{scoreGeral || 0}</span>
      </div>

      {/* Status */}
      <Badge className={getStatusColor(status)}>
        {status}
      </Badge>
    </div>
  )
}
```

### 7.2. Criar KanbanColumn

**Arquivo**: `src/components/KanbanColumn.tsx` (NOVO)

```typescript
import React from 'react'
import { useDrop } from 'react-dnd'
import type { KanbanStage } from '@/features/vagas/types/vagasTypes'

interface KanbanColumnProps {
  stage: KanbanStage
  title: string
  count: number
  children: React.ReactNode
  onDrop: (candidaturaId: string, newStage: KanbanStage) => void
}

export function KanbanColumn({ stage, title, count, children, onDrop }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'CANDIDATO',
    drop: (item: { candidaturaId: string }) => {
      onDrop(item.candidaturaId, stage)
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }))

  return (
    <div
      ref={drop}
      className={`
        flex-1 min-w-[280px] bg-white/5 backdrop-blur-sm rounded-xl p-4
        ${isOver ? 'ring-2 ring-white/50' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{title}</h3>
        <span className="bg-white/20 text-white px-2 py-1 rounded-full text-xs">
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}
```

### 7.3. Implementar aba Kanban

```tsx
<TabsContent value="kanban">
  <DndProvider backend={HTML5Backend}>
    <div className="flex gap-4 overflow-x-auto pb-4">
      {/* Coluna TRIAGEM */}
      <KanbanColumn
        stage="triagem"
        title="Triagem"
        count={candidaturasPorEtapa.triagem.length}
        onDrop={handleMoveCandidato}
      >
        {candidaturasPorEtapa.triagem.map(c => (
          <KanbanCard
            key={c.id}
            candidaturaId={c.id}
            candidatoNome={c.candidato?.nome_completo}
            candidatoAvatar={getInitials(c.candidato?.nome_completo)}
            vagaTitulo={c.vaga?.titulo}
            scoreGeral={c.score_geral}
            status={c.status}
          />
        ))}
      </KanbanColumn>

      {/* Repetir para: TESTES, CULTURA, ENTREVISTA */}
    </div>
  </DndProvider>
</TabsContent>
```

### 7.4. Handler para mover candidato

```typescript
const handleMoveCandidato = async (candidaturaId: string, newStage: KanbanStage) => {
  // Mapear stage → etapa do banco
  const etapaMap: Record<KanbanStage, string> = {
    triagem: 'triagem',
    testes: 'bigfive', // primeira etapa de testes
    cultura: 'cultura',
    entrevista: 'entrevista_online' // primeira etapa de entrevista
  }

  const novaEtapa = etapaMap[newStage]

  // Chamar mutation
  updateStatus.mutate({
    candidaturaId,
    status_candidatura: 'em_analise', // manter em análise
    etapa_atual: novaEtapa
  })
}
```

**Checklist**:
- [ ] Criar `KanbanCard.tsx` com drag
- [ ] Criar `KanbanColumn.tsx` com drop
- [ ] Agrupar candidaturas por etapa Kanban
- [ ] Implementar `handleMoveCandidato()`
- [ ] Envolver em `<DndProvider>`
- [ ] Renderizar 4 colunas
- [ ] Testar drag-and-drop atualiza banco

---

## 🎯 FASE 8: LIMPEZA E CORREÇÕES

### 8.1. Remover botão engrenagem

**Procurar e DELETAR** (provavelmente próximo ao botão de busca):

```tsx
// DELETAR ESTE BOTÃO:
<button className="...">
  <Settings className="..." />
</button>
```

### 8.2. Verificar navegação "Ver Perfil"

✅ **JÁ CORRIGIDO** na linha 680:
```tsx
onClick={() => handleVerPerfil(candidato?.id)}
```

### 8.3. Verificar status enum

✅ **JÁ CORRETO** - usa enum do banco:
- aguardando_resposta
- em_analise
- aprovado_proxima
- rejeitado
- finalizado

**Checklist**:
- [ ] Remover botão Settings/engrenagem
- [ ] Confirmar navegação Ver Perfil funciona
- [ ] Confirmar status badges corretos

---

## 📋 CHECKLIST GERAL DE VALIDAÇÃO

### Antes de marcar como concluído:

- [ ] Query retorna scores sem erros 400
- [ ] Types compilam sem erros TypeScript
- [ ] Componentes de score renderizam corretamente
- [ ] 3 abas aparecem e trocam de conteúdo
- [ ] Aba "Todos" mostra scores nos cards
- [ ] Aba "Por Vaga" mostra funil + filtro
- [ ] Aba "Kanban" permite drag-and-drop
- [ ] Drag-and-drop atualiza etapa no banco
- [ ] Score geral aparece em DESTAQUE
- [ ] Navegação "Ver Perfil" funciona
- [ ] Sem botão engrenagem
- [ ] Sem erros no console
- [ ] Mobile responsive (testar)

---

## 🚀 ORDEM DE EXECUÇÃO

1. ✅ FASE 1: Query + JOIN scores
2. ✅ FASE 2: Types + Helpers
3. ✅ FASE 3: Componentes ScoreCard/ProgressBar
4. ✅ FASE 4: Sistema de Abas
5. ✅ FASE 5: Scores na aba "Todos"
6. ✅ FASE 6: Aba "Por Vaga" + Funil
7. ✅ FASE 7: Aba "Kanban" + Drag-drop
8. ✅ FASE 8: Limpeza final

---

## 📝 NOTAS IMPORTANTES

1. **Score Geral é PRINCIPAL**: Sempre em destaque, tamanho grande
2. **Left Join**: Usar `!left` nos joins para não quebrar se não tiver scores
3. **Fallback para N/A**: Se score não existir, mostrar "N/A"
4. **Etapa vs Stage**: Etapa é do banco (triagem, bigfive, disc...), Stage é do Kanban (4 colunas)
5. **Drag só muda etapa**: Não muda status, apenas etapa_atual
6. **React-dnd**: Já instalado, não precisa npm install

---

**FIM DO DOCUMENTO**
