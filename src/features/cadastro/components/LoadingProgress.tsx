/**
 * Componente de progresso multi-etapas
 *
 * Mostra visualmente o progresso de operações que envolvem múltiplas etapas,
 * como o cadastro completo (Auth → DB → N8N).
 *
 * Features:
 * - Status visual para cada etapa (pending/loading/success/error)
 * - Barra de progresso calculada automaticamente
 * - Animações suaves entre transições
 * - Ícones contextuais (spinner/check/X)
 * - Mensagens de erro detalhadas
 *
 * @example
 * ```tsx
 * <LoadingProgress
 *   stages={[
 *     { id: 'auth', label: 'Creating account...', status: 'success' },
 *     { id: 'db', label: 'Saving data...', status: 'loading' },
 *     { id: 'n8n', label: 'Notifying system...', status: 'pending' },
 *   ]}
 * />
 * ```
 */

import React from 'react'
import { CheckCircle2, Loader2, XCircle, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

export type StageStatus = 'pending' | 'loading' | 'success' | 'error'

export interface LoadingStage {
  /**
   * ID único da etapa
   */
  id: string

  /**
   * Rótulo amigável da etapa (ex: "Creating account...")
   */
  label: string

  /**
   * Status atual da etapa
   */
  status: StageStatus

  /**
   * Mensagem de erro (apenas se status = 'error')
   */
  errorMessage?: string

  /**
   * Tempo de duração em ms (opcional, para mostrar tempo decorrido)
   */
  duration?: number
}

export interface LoadingProgressProps {
  /**
   * Lista de etapas do processo
   */
  stages: LoadingStage[]

  /**
   * Título do progresso (opcional)
   * @default "Processando..."
   */
  title?: string

  /**
   * Mostrar barra de progresso percentual
   * @default true
   */
  showProgressBar?: boolean

  /**
   * Classe CSS adicional
   */
  className?: string
}

// ============================================
// COMPONENT
// ============================================

export function LoadingProgress({
  stages,
  title = 'Processando...',
  showProgressBar = true,
  className,
}: LoadingProgressProps) {
  // Calcular progresso
  const completedStages = stages.filter((s) => s.status === 'success').length
  const totalStages = stages.length
  const progressPercent = totalStages > 0 ? (completedStages / totalStages) * 100 : 0

  return (
    <div className={cn('w-full max-w-md space-y-6', className)}>
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>

        {/* Progress Bar */}
        {showProgressBar && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {completedStages} de {totalStages} concluídas
              </span>
              <span>{Math.round(progressPercent)}%</span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stages List */}
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <StageItem
            key={stage.id}
            stage={stage}
            isFirst={index === 0}
            isLast={index === stages.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================
// STAGE ITEM COMPONENT
// ============================================

interface StageItemProps {
  stage: LoadingStage
  isFirst: boolean
  isLast: boolean
}

function StageItem({ stage, isFirst, isLast }: StageItemProps) {
  const Icon = getStageIcon(stage.status)
  const iconColor = getStageIconColor(stage.status)
  const textColor = getStageTextColor(stage.status)

  return (
    <div className="flex gap-3 animate-in fade-in-0 slide-in-from-left-2 duration-300">
      {/* Icon */}
      <div className={cn('flex size-6 shrink-0 items-center justify-center', iconColor)}>
        <Icon
          className={cn('size-5', {
            'animate-spin': stage.status === 'loading',
          })}
        />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <p className={cn('text-sm font-semibold', textColor)}>{stage.label}</p>

        {/* Error Message */}
        {stage.status === 'error' && stage.errorMessage && (
          <p className="text-xs text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-200">
            {stage.errorMessage}
          </p>
        )}

        {/* Duration (optional) */}
        {stage.duration && stage.status === 'success' && (
          <p className="text-xs text-muted-foreground">
            Concluído em {formatDuration(stage.duration)}
          </p>
        )}
      </div>

      {/* Connector Line (exceto último) */}
      {!isLast && (
        <div className="absolute left-3 top-8 h-8 w-0.5 bg-border" aria-hidden="true" />
      )}
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

function getStageIcon(status: StageStatus) {
  switch (status) {
    case 'pending':
      return Circle
    case 'loading':
      return Loader2
    case 'success':
      return CheckCircle2
    case 'error':
      return XCircle
    default:
      return Circle
  }
}

function getStageIconColor(status: StageStatus): string {
  switch (status) {
    case 'pending':
      return 'text-muted-foreground'
    case 'loading':
      return 'text-primary'
    case 'success':
      return 'text-green-600 dark:text-green-500'
    case 'error':
      return 'text-destructive'
    default:
      return 'text-muted-foreground'
  }
}

function getStageTextColor(status: StageStatus): string {
  switch (status) {
    case 'pending':
      return 'text-muted-foreground'
    case 'loading':
      return 'text-foreground font-semibold'
    case 'success':
      return 'text-foreground'
    case 'error':
      return 'text-destructive'
    default:
      return 'text-foreground'
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }

  const seconds = Math.floor(ms / 1000)
  const decimal = Math.floor((ms % 1000) / 100)

  return `${seconds}.${decimal}s`
}
