/**
 * SugestaoIABadge — guardrail RNF-07a compartilhado (reusado nos Plans 11-15).
 *
 * Badge informativo com ícone Sparkles e tint accent (#35BFAD). Cópia EXATA:
 * "Sugestão da IA — decisão é sempre humana". Puramente informativo — nunca
 * envolve uma ação, nunca carrega cor de score. A variante `compact` mostra só
 * "Sugestão da IA" para uso inline em cabeçalho de coluna; `full` (default) para
 * cabeçalhos de painel/tela.
 *
 * @module features/triagem/components/SugestaoIABadge
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-UI-SPEC.md (§C badge contract)
 */

import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/utils'

/** Cópia canônica do guardrail (RNF-07a) — não alterar. */
export const SUGESTAO_IA_COPY = 'Sugestão da IA — decisão é sempre humana'

export interface SugestaoIABadgeProps {
  /** `full` (default) = texto completo; `compact` = só "Sugestão da IA". */
  variant?: 'full' | 'compact'
  className?: string
}

/**
 * Badge "Sugestão da IA" — guardrail informativo RNF-07a.
 */
export function SugestaoIABadge({ variant = 'full', className }: SugestaoIABadgeProps) {
  return (
    <Badge
      className={cn(
        'border-[#35BFAD]/40 bg-[#35BFAD]/10 text-white text-xs font-semibold leading-[1.4] gap-1',
        className,
      )}
    >
      <Sparkles className="h-3 w-3 text-[#35BFAD]" aria-hidden="true" />
      {variant === 'compact' ? 'Sugestão da IA' : SUGESTAO_IA_COPY}
    </Badge>
  )
}
