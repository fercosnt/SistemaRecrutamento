/**
 * OrigemRevisaoBadge — de onde vem um pedido de revisão na fila do RH (51-14 · JORN-42 ·
 * D-10 · D-12 · D-33).
 *
 * Desde a Phase 51 a fila `/rh/revisoes` junta TRÊS origens de rejeição, e o RH precisa saber
 * de qual se trata antes de abrir: a decisão final, a rejeição pelo RH em qualquer outra etapa
 * e o knockout do formulário. Os rótulos são os da D-33 — e **nenhum diz «triagem»**: a
 * rejeição pelo RH vale para qualquer etapa fora da decisão final, e chamá-la de «triagem»
 * descreveria errado metade dos casos.
 *
 * Vocabulário FECHADO, no molde do `VereditoBadge`: um valor que o servidor passe a devolver
 * sem revisão **não é ecoado** — renderiza nada em vez de mostrar um identificador interno.
 * Glass neutro para os três: a origem é informação, não alarme.
 *
 * @module features/revisao/components/OrigemRevisaoBadge
 * @see src/features/revisao/components/VereditoBadge.tsx (o molde)
 */
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/utils'

export interface OrigemRevisaoBadgeProps {
  /** `'humana'` | `'humana_triagem'` | `'automatica'`; qualquer outra coisa (inclusive `null`) → nada. */
  origem: string | null | undefined
}

/** Glass neutro idêntico para as três — a igualdade é o ponto. */
const ORIGEM_CLASSES = 'border-white/20 bg-white/5 text-white/80'

/** Papel tipográfico de label da fase (14px/600), sobrescrevendo o do primitivo. */
const TIPOGRAFIA_BADGE = 'text-sm font-semibold'

/** O vocabulário fechado (D-33). Fora dele não há rótulo, e sem rótulo não há selo. */
export const ROTULOS_ORIGEM_REVISAO: Readonly<Record<string, string>> = {
  humana: 'Decisão final',
  humana_triagem: 'Rejeição pelo RH',
  automatica: 'Knockout',
}

export function OrigemRevisaoBadge({ origem }: OrigemRevisaoBadgeProps) {
  const rotulo =
    origem && Object.prototype.hasOwnProperty.call(ROTULOS_ORIGEM_REVISAO, origem)
      ? ROTULOS_ORIGEM_REVISAO[origem]
      : undefined
  if (!rotulo) return null

  return (
    <Badge
      variant="outline"
      data-testid="fila-origem-badge"
      className={cn(TIPOGRAFIA_BADGE, ORIGEM_CLASSES)}
    >
      {rotulo}
    </Badge>
  )
}
