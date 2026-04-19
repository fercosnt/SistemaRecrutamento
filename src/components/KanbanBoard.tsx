/**
 * KanbanBoard Component
 *
 * Kanban board with drag-and-drop for managing candidaturas.
 *
 * Features:
 * - 7 columns (one per stage): Triagem, Big Five, DISC, Tel., Presencial, Análise, Contratação
 * - Drag-and-drop to move candidates between stages
 * - Updates etapa_atual on drop
 * - Shows candidate cards with Score Geral only
 *
 * @module components/KanbanBoard
 */

import { useMemo } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Glass, GlassButton } from './ui/glass'
import { Mail, Phone, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type CandidaturaComScores,
  type EtapaProcesso,
  type StatusCandidatura,
} from '@/features/vagas/types/vagasTypes'
import { useUpdateCandidaturaStatus } from '@/features/vagas/hooks/useCandidaturas'

const DRAG_TYPE = 'CANDIDATO_CARD'

interface KanbanBoardProps {
  candidaturas: CandidaturaComScores[]
  onViewPerfil: (candidatoId: string) => void
}

interface DragItem {
  candidaturaId: string
  currentEtapa: EtapaProcesso
}

/**
 * Configuração das 7 colunas do Kanban (excluindo aprovado/rejeitado que são finais)
 * IMPORTANTE: Etapas correspondem aos valores do ENUM PostgreSQL
 */
const KANBAN_COLUMNS: Array<{
  etapa: EtapaProcesso
  label: string
  emoji: string
  color: string
}> = [
  { etapa: 'triagem', label: 'Triagem', emoji: '🔍', color: 'from-blue-500 to-blue-600' },
  { etapa: 'bigfive', label: 'Big Five', emoji: '🧠', color: 'from-purple-500 to-purple-600' },
  { etapa: 'disc', label: 'DISC', emoji: '👥', color: 'from-green-500 to-green-600' },
  { etapa: 'entrevista_online', label: 'Online', emoji: '🎥', color: 'from-cyan-500 to-cyan-600' },
  { etapa: 'raven', label: 'Raven (QI)', emoji: '🧩', color: 'from-indigo-500 to-indigo-600' },
  { etapa: 'cultura', label: 'Cultura', emoji: '❤️', color: 'from-pink-500 to-pink-600' },
  { etapa: 'entrevista_presencial', label: 'Presencial', emoji: '🤝', color: 'from-orange-500 to-orange-600' },
]

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
  onViewPerfil: (candidatoId: string) => void
}) {
  const candidato = candidatura.candidato as any
  const vaga = candidatura.vaga as any

  const currentEtapa = candidatura.etapa_atual as EtapaProcesso

  const initials =
    candidato?.nome_completo
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || '??'

  const scoreGeral = candidatura.score_geral

  // Drag setup
  const [{ isDragging }, dragRef] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: DRAG_TYPE,
    item: {
      candidaturaId: candidatura.id,
      currentEtapa,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div
      ref={dragRef}
      className={cn(
        'transition-all duration-200',
        isDragging && 'opacity-50 scale-95'
      )}
    >
      <Glass
        variant="white"
        blur="lg"
        hover
        className="p-3 rounded-xl transition-all duration-300 cursor-move"
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

          {/* Botão Ver Perfil */}
          <GlassButton
            variant="white"
            onClick={(e) => {
              e.stopPropagation()
              onViewPerfil(candidato?.id)
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
  etapa: EtapaProcesso
  label: string
  emoji: string
  color: string
  candidaturas: CandidaturaComScores[]
  onViewPerfil: (candidatoId: string) => void
  onDrop: (candidaturaId: string, newEtapa: EtapaProcesso) => void
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
    <div ref={dropRef} className={cn('flex flex-col h-full w-full min-w-[200px] relative isolate', bgColorClass)}>
      <Glass variant="white" blur="lg" className="p-3 rounded-xl h-full flex flex-col relative z-0 w-full">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-3 pb-2 border-b border-white/20 flex-shrink-0">
          <div className={`w-full h-1.5 rounded-full bg-gradient-to-r ${color}`} />
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-white drop-shadow-lg font-semibold text-sm flex items-center gap-1.5 min-w-0">
              <span className="text-base flex-shrink-0">{emoji}</span>
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
  const { mutate: updateStatus } = useUpdateCandidaturaStatus()

  // Agrupar candidaturas por etapa
  const groupedCandidaturas = useMemo(() => {
    const grouped: Record<EtapaProcesso, CandidaturaComScores[]> = {
      triagem: [],
      bigfive: [],
      disc: [],
      entrevista_online: [],
      raven: [],
      cultura: [],
      entrevista_presencial: [],
      aprovado: [],
      rejeitado: [],
    }

    candidaturas.forEach((candidatura) => {
      const etapa = candidatura.etapa_atual as EtapaProcesso
      if (etapa && grouped[etapa]) {
        grouped[etapa].push(candidatura)
      } else {
        // Default para triagem se etapa inválida ou não mapeada
        console.warn('⚠️ Etapa não reconhecida:', etapa, 'para candidatura:', candidatura.id)
        grouped.triagem.push(candidatura)
      }
    })

    return grouped
  }, [candidaturas])

  // Handler para drop
  const handleDrop = (candidaturaId: string, newEtapa: EtapaProcesso) => {
    // Encontrar a candidatura para pegar o status atual
    const candidatura = candidaturas.find((c) => c.id === candidaturaId)
    if (!candidatura) {
      console.error('❌ Candidatura não encontrada:', candidaturaId)
      return
    }

    // Validar que o status é válido
    const currentStatus = candidatura.status as string
    const validStatuses: StatusCandidatura[] = [
      'aguardando_resposta',
      'em_analise',
      'aprovado_proxima',
      'rejeitado',
      'finalizado',
    ]

    if (!validStatuses.includes(currentStatus as StatusCandidatura)) {
      console.error('❌ Status inválido:', currentStatus, 'ID:', candidaturaId)
      return
    }

    console.log('📦 Movendo candidato:', {
      id: candidaturaId,
      de: candidatura.etapa_atual,
      para: newEtapa,
      status: currentStatus,
    })

    // Atualizar apenas a etapa, mantendo o status atual
    updateStatus(
      {
        candidaturaId,
        status_candidatura: currentStatus as StatusCandidatura,
        etapa_atual: newEtapa,
        notificar_candidato: false, // Não notificar ao mudar apenas a etapa
      },
      {
        onSuccess: (data) => {
          console.log('✅ Candidato movido com sucesso!', data)
        },
        onError: (error) => {
          console.error('❌ Erro ao mover candidato:', error)
        },
      }
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full h-[calc(100vh-280px)] min-h-[600px] max-h-[800px] overflow-hidden">
        {/* Container com scroll horizontal */}
        <div className="h-full w-full overflow-x-auto overflow-y-hidden pb-2">
          {/* Grid responsivo: 2 cols em mobile, 4 em tablet, 7 em desktop */}
          <div className="grid grid-cols-[repeat(2,minmax(200px,280px))] md:grid-cols-[repeat(4,minmax(200px,280px))] lg:grid-cols-[repeat(7,minmax(200px,280px))] gap-3 h-full w-max">
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
