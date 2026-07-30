/**
 * VereditoBadge — o resultado registrado de uma revisão já respondida (REVISAO-02).
 *
 * Vocabulário FECHADO de dois valores, ambos com o MESMO tratamento glass neutro
 * (42-UI-SPEC §Badge de veredito). Neutro por desenho, e a escolha é substantiva: um
 * veredito registrado não é alarme. Colorir "Revertida" de vermelho a leria como falha do
 * sistema, quando ela é o Art. 20 funcionando exatamente como deve — o pedido do titular
 * foi reexaminado e prevaleceu. Faixa colorida em item já fechado também é ruído: a
 * linha não pede mais ação.
 *
 * Fechar o vocabulário é o que dá largura previsível ao badge (42-UI-SPEC §UI
 * Considerations E8, overflow/long-text): não há texto livre a transbordar, e um valor
 * novo vindo do servidor **não é ecoado** — renderiza nada em vez de vazar um
 * identificador interno na tela.
 *
 * @module features/revisao/components/VereditoBadge
 * @see src/features/revisao/components/RevisaoSlaBadge.tsx (mesmo esqueleto)
 */
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/utils'

export interface VereditoBadgeProps {
  /** `'mantida'` | `'revertida'`; qualquer outra coisa (inclusive `null`) → nada. */
  veredito: string | null | undefined
}

/** Glass neutro idêntico para os dois — a igualdade é o ponto. */
const VEREDITO_CLASSES = 'border-white/20 bg-white/5 text-white/80'

/** Papel tipográfico de label da fase (14px/600), sobrescrevendo o do primitivo. */
const TIPOGRAFIA_BADGE = 'text-sm font-semibold'

/** O vocabulário fechado. Fora dele não há rótulo, e sem rótulo não há badge. */
const ROTULOS_VEREDITO: Record<string, string> = {
  mantida: 'Mantida',
  revertida: 'Revertida',
}

export function VereditoBadge({ veredito }: VereditoBadgeProps) {
  const rotulo = veredito ? ROTULOS_VEREDITO[veredito] : undefined
  if (!rotulo) return null

  return (
    <Badge variant="outline" className={cn(TIPOGRAFIA_BADGE, VEREDITO_CLASSES)}>
      {rotulo}
    </Badge>
  )
}
