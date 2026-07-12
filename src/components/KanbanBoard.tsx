/**
 * KanbanBoard Component
 *
 * Kanban board with drag-and-drop for managing candidaturas.
 *
 * Phase 25 / FUNIL-03/06 (A12/A16): rewired onto the REAL M2 funnel.
 * - 6 working drop columns (inscricao, triagem, avaliacao_assincrona,
 *   entrevista_online, entrevista_presencial, decisao_final) — labels sourced from
 *   the single source `triagemService.ETAPA_M2_LABELS` (no hardcoded 2nd copy).
 * - Terminals (aprovado/rejeitado) are NOT drop columns — a terminal-state
 *   candidatura renders a terminal pill on its card (UI-SPEC §1).
 * - Drag→drop moves etapa_atual through the server-authoritative M2 write-path
 *   (`updateCandidaturaEtapa` → trigger `avancar_etapa`, which validates + audits),
 *   never the raw auto-advance status write.
 * - "Ver Perfil" forwards candidatura.id (the candidaturaId the hub route resolves).
 *
 * @module components/KanbanBoard
 */

import { useMemo } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Glass, GlassButton } from './ui/glass'
import { Mail, Phone, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type CandidaturaComScores } from '@/features/vagas/types/vagasTypes'
import {
  ETAPA_M2_LABELS,
  type EtapaFunilM2,
} from '@/features/triagem/services/triagemService'
import { useUpdateCandidaturaEtapa } from '@/features/vagas/hooks/useCandidaturas'

const DRAG_TYPE = 'CANDIDATO_CARD'

interface KanbanBoardProps {
  candidaturas: CandidaturaComScores[]
  /** UX-03: recebe a candidatura.id (o :id que o Hub RH resolve como candidaturaId). */
  onViewPerfil: (candidaturaId: string) => void
}

interface DragItem {
  candidaturaId: string
  currentEtapa: EtapaFunilM2
}

/**
 * As 6 etapas de trabalho do funil M2, na ordem (UI-SPEC §1). Terminais
 * (aprovado/rejeitado) NÃO são colunas — viram pill no card.
 */
const WORKING_STAGES: EtapaFunilM2[] = [
  'inscricao',
  'triagem',
  'avaliacao_assincrona',
  'entrevista_online',
  'entrevista_presencial',
  'decisao_final',
]

type WorkingStage = (typeof WORKING_STAGES)[number]

/** Glyph + gradient hue por coluna (UI-SPEC §1 — Claude's discretion; glyph aria-hidden). */
const STAGE_STYLE: Record<WorkingStage, { emoji: string; color: string }> = {
  inscricao: { emoji: '📥', color: 'from-blue-500 to-blue-600' },
  triagem: { emoji: '🔍', color: 'from-cyan-500 to-cyan-600' },
  avaliacao_assincrona: { emoji: '📝', color: 'from-purple-500 to-purple-600' },
  entrevista_online: { emoji: '🎥', color: 'from-teal-500 to-teal-600' },
  entrevista_presencial: { emoji: '🤝', color: 'from-orange-500 to-orange-600' },
  decisao_final: { emoji: '⚖️', color: 'from-indigo-500 to-indigo-600' },
}

/** Colunas derivadas dos rótulos M2 (fonte única) — sem 2ª cópia hardcoded. */
const KANBAN_COLUMNS: Array<{
  etapa: WorkingStage
  label: string
  emoji: string
  color: string
}> = WORKING_STAGES.map((etapa) => ({
  etapa,
  label: ETAPA_M2_LABELS[etapa],
  emoji: STAGE_STYLE[etapa].emoji,
  color: STAGE_STYLE[etapa].color,
}))

/**
 * Pill terminal (UI-SPEC §1): candidatura em estado terminal ganha um selo no card.
 * Chave em etapa_atual terminal (aprovado/rejeitado) OU status === 'rejeitado' (o
 * caminho A9 em que o status vira rejeitado com a etapa ainda numa etapa de trabalho).
 */
function getTerminalBadge(
  candidatura: CandidaturaComScores
): { key: 'aprovado' | 'rejeitado'; label: string; className: string } | null {
  const etapa = candidatura.etapa_atual as EtapaFunilM2 | undefined
  if (etapa === 'aprovado') {
    return {
      key: 'aprovado',
      label: 'Aprovado',
      className: 'bg-green-500/20 text-green-300 border border-green-400/30',
    }
  }
  if (etapa === 'rejeitado' || candidatura.status === 'rejeitado') {
    return {
      key: 'rejeitado',
      label: 'Rejeitado',
      className: 'bg-red-500/20 text-red-300 border border-red-400/30',
    }
  }
  return null
}

/**
 * A coluna de trabalho onde o card aparece. Terminais (aprovado/rejeitado) são
 * ancorados em `decisao_final` (a etapa em que a decisão terminal ocorre) com o pill
 * — não criam uma 7ª coluna. Etapa desconhecida/legada → null (não renderiza; sem
 * log ruidoso — a candidatura permanece alcançável pelo filtro de etapa do painel).
 */
function columnForEtapa(etapa: EtapaFunilM2 | undefined): WorkingStage | null {
  if (etapa && (WORKING_STAGES as string[]).includes(etapa)) {
    return etapa as WorkingStage
  }
  if (etapa === 'aprovado' || etapa === 'rejeitado') {
    return 'decisao_final'
  }
  return null
}

/**
 * Helper para obter cor do Score Geral
 */
function getScoreColor(score: number | null | undefined): string {
  if (!score) return 'text-white/50'
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-blue-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

/**
 * Candidato Card dentro do Kanban (draggable)
 */
function CandidatoKanbanCard({
  candidatura,
  onViewPerfil,
}: {
  candidatura: CandidaturaComScores
  onViewPerfil: (candidaturaId: string) => void
}) {
  const candidato = candidatura.candidato as any
  const vaga = candidatura.vaga as any

  const currentEtapa = candidatura.etapa_atual as EtapaFunilM2

  const initials =
    candidato?.nome_completo
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || '??'

  const scoreGeral = candidatura.score_geral
  const terminalBadge = getTerminalBadge(candidatura)

  // Drag setup. LOW-01: cards terminais (aprovado/rejeitado) NÃO são arrastáveis —
  // ancorados em `decisao_final`, qualquer drop dispararia um "avanço" para trás que
  // o trigger `avancar_etapa` rejeita (regressão sem `etapa_justificativa`) → toast de
  // erro garantido. `canDrag: false` remove o affordance "Solte aqui" que sempre falha.
  const [{ isDragging }, dragRef] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: DRAG_TYPE,
    item: {
      candidaturaId: candidatura.id,
      currentEtapa,
    },
    canDrag: () => !terminalBadge,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div
      ref={dragRef}
      data-testid={`kanban-card-${candidatura.id}`}
      className={cn(
        'transition-all duration-200',
        isDragging && 'opacity-50 scale-95'
      )}
    >
      <Glass
        variant="white"
        blur="lg"
        hover
        className={cn(
          'p-3 rounded-xl transition-all duration-300',
          // LOW-01: só sinaliza "arrastável" quando o card não é terminal.
          terminalBadge ? 'cursor-default' : 'cursor-move'
        )}
      >
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start gap-2">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#35BFAD] flex items-center justify-center flex-shrink-0 text-white drop-shadow-md text-xs font-semibold">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white drop-shadow-sm truncate text-sm font-semibold">
                {candidato?.nome_completo || 'N/A'}
              </h3>
              <p className="text-xs text-white/70 drop-shadow-sm truncate">
                {vaga?.titulo || 'N/A'}
              </p>
            </div>

            {/* Terminal pill (UI-SPEC §1) — só quando a candidatura está finalizada. */}
            {terminalBadge && (
              <span
                data-testid={`terminal-pill-${candidatura.id}`}
                className={cn(
                  'flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold drop-shadow-sm',
                  terminalBadge.className
                )}
              >
                {terminalBadge.label}
              </span>
            )}
          </div>

          {/* Contatos (compacto e truncado) */}
          <div className="flex flex-col gap-0.5 text-xs text-white/70 drop-shadow-sm">
            {candidato?.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{candidato.email}</span>
              </span>
            )}
            {candidato?.celular && (
              <span className="flex items-center gap-1 truncate">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{candidato.celular}</span>
              </span>
            )}
          </div>

          {/* Score Geral APENAS */}
          {scoreGeral !== null && scoreGeral !== undefined && (
            <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
                <span className="text-xs font-medium text-white/90">
                  Score Geral
                </span>
              </div>
              <div className={cn('text-xl font-bold', getScoreColor(scoreGeral))}>
                {scoreGeral}
              </div>
            </div>
          )}

          {/* Botão Ver Perfil — UX-03: encaminha candidatura.id */}
          <GlassButton
            variant="white"
            onClick={(e) => {
              e.stopPropagation()
              onViewPerfil(candidatura.id)
            }}
            className="w-full text-white text-xs drop-shadow-sm flex items-center justify-center gap-1.5 font-medium min-h-[32px]"
          >
            <Eye className="w-3 h-3 flex-shrink-0" />
            <span>Ver Perfil</span>
          </GlassButton>
        </div>
      </Glass>
    </div>
  )
}

/**
 * Coluna do Kanban (droppable)
 */
function KanbanColumn({
  etapa,
  label,
  emoji,
  color,
  candidaturas,
  onViewPerfil,
  onDrop,
}: {
  etapa: WorkingStage
  label: string
  emoji: string
  color: string
  candidaturas: CandidaturaComScores[]
  onViewPerfil: (candidaturaId: string) => void
  onDrop: (candidaturaId: string, newEtapa: WorkingStage) => void
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop<
    DragItem,
    unknown,
    { isOver: boolean; canDrop: boolean }
  >({
    accept: DRAG_TYPE,
    canDrop: (item) => item.currentEtapa !== etapa, // Não pode dropar na mesma coluna
    drop: (item) => {
      onDrop(item.candidaturaId, etapa)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  const bgColorClass = cn(
    'transition-all duration-300',
    isOver && canDrop && 'bg-white/20',
    canDrop && !isOver && 'bg-white/5'
  )

  return (
    <div
      ref={dropRef}
      data-testid={`kanban-column-${etapa}`}
      className={cn('flex flex-col h-full w-full min-w-[200px] relative isolate', bgColorClass)}
    >
      <Glass variant="white" blur="lg" className="p-3 rounded-xl h-full flex flex-col relative z-0 w-full">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-3 pb-2 border-b border-white/20 flex-shrink-0">
          <div className={`w-full h-1.5 rounded-full bg-gradient-to-r ${color}`} />
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-white drop-shadow-lg font-semibold text-sm flex items-center gap-1.5 min-w-0">
              <span className="text-base flex-shrink-0" aria-hidden="true">{emoji}</span>
              <span className="truncate">{label}</span>
            </h3>
            <div className="text-white/80 font-semibold drop-shadow-md bg-white/20 rounded-full px-2 py-0.5 text-xs flex-shrink-0">
              {candidaturas.length}
            </div>
          </div>
        </div>

        {/* Cards (scrollable) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 pr-1 min-h-0">
          {candidaturas.length === 0 ? (
            <div className="text-center text-white/50 text-xs py-6">
              Arraste aqui
            </div>
          ) : (
            candidaturas.map((candidatura) => (
              <CandidatoKanbanCard
                key={candidatura.id}
                candidatura={candidatura}
                onViewPerfil={onViewPerfil}
              />
            ))
          )}
        </div>

        {/* Drop indicator */}
        {isOver && canDrop && (
          <div className="mt-2 p-1.5 bg-green-500/20 border-2 border-green-400 border-dashed rounded-lg text-center text-green-300 text-xs font-medium flex-shrink-0">
            Solte aqui
          </div>
        )}
      </Glass>
    </div>
  )
}

/**
 * KanbanBoard principal
 */
export function KanbanBoard({ candidaturas, onViewPerfil }: KanbanBoardProps) {
  const { mutate: moveEtapa } = useUpdateCandidaturaEtapa()

  // Agrupar candidaturas pelas 8 etapas reais; terminais ancorados em decisao_final.
  const groupedCandidaturas = useMemo(() => {
    const grouped: Record<EtapaFunilM2, CandidaturaComScores[]> = {
      inscricao: [],
      triagem: [],
      avaliacao_assincrona: [],
      entrevista_online: [],
      entrevista_presencial: [],
      decisao_final: [],
      aprovado: [],
      rejeitado: [],
    }

    candidaturas.forEach((candidatura) => {
      const etapa = candidatura.etapa_atual as EtapaFunilM2 | undefined
      const col = columnForEtapa(etapa)
      if (col) {
        grouped[col].push(candidatura)
      }
      // else: etapa desconhecida/legada → não renderiza no board (alcançável pelo
      // filtro de etapa do painel). Sem console.warn: todo valor vivo agora mapeia.
    })

    return grouped
  }, [candidaturas])

  // Handler para drop — caminho M2 server-authoritative (avancar_etapa valida + audita).
  const handleDrop = (candidaturaId: string, novaEtapa: WorkingStage) => {
    const candidatura = candidaturas.find((c) => c.id === candidaturaId)
    if (!candidatura) return
    moveEtapa({ candidaturaId, novaEtapa })
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full h-[calc(100vh-280px)] min-h-[600px] max-h-[800px] overflow-hidden">
        {/* Container com scroll horizontal */}
        <div className="h-full w-full overflow-x-auto overflow-y-hidden pb-2">
          {/* Grid responsivo: 2 cols em mobile, 4 em tablet, 6 em desktop */}
          <div className="grid grid-cols-[repeat(2,minmax(200px,280px))] md:grid-cols-[repeat(4,minmax(200px,280px))] lg:grid-cols-[repeat(6,minmax(200px,280px))] gap-3 h-full w-max">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.etapa}
                etapa={col.etapa}
                label={col.label}
                emoji={col.emoji}
                color={col.color}
                candidaturas={groupedCandidaturas[col.etapa]}
                onViewPerfil={onViewPerfil}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      </div>
    </DndProvider>
  )
}
