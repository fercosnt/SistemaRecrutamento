/**
 * SituacaoPedidoBadge — o que aconteceu com um pedido de cópia de dados (EXPORT-05).
 *
 * Vocabulário fechado de dois valores, no molde do `VereditoBadge` (Phase 42), com **duas
 * divergências deliberadas** em relação a ele. As duas estão escritas aqui de propósito:
 * sem elas, a próxima leitura "uniformiza" o componente com o análogo e desfaz as duas
 * decisões — cada uma com um modo de falha próprio.
 *
 * ── DIVERGÊNCIA 1: valor fora do vocabulário renderiza o TOKEN CRU ────────────────
 * O `VereditoBadge` devolve nulo fora do vocabulário e nada renderiza. Aqui não: um valor
 * desconhecido cai no tratamento neutro **exibindo o token**. É a normalização defensiva
 * do precedente 42-11 — o CHECK do banco já fecha o vocabulário, mas um invariante
 * **remoto** é a coisa errada para uma decisão de **renderização** se apoiar. Um valor
 * novo tem de APARECER; sumir fecharia a superfície em silêncio, e ninguém descobre uma
 * célula que nunca é desenhada.
 *
 * ── DIVERGÊNCIA 2: os dois valores NÃO têm o mesmo tratamento ─────────────────────
 * No análogo os dois vereditos são igualmente neutros, e a igualdade é o ponto. Aqui,
 * neutro para `atendido` e **âmbar** para `pendente`, porque o não atendido é o que pede
 * alguém. É a regra de eixos da 44-UI-SPEC §Color, e ela não tem exceção: **Situação**
 * codifica *o que aconteceu* (âmbar), **Acompanhamento** codifica *quanto do prazo passou*
 * (vermelho, no `RevisaoSlaBadge`). Se os dois usassem vermelho, uma linha carregaria dois
 * alarmes que dizem coisas diferentes, e o operador perderia a distinção que o SC#4 existe
 * para dar.
 *
 * ── O QUE ESTE COMPONENTE NÃO TEM, E A AUSÊNCIA É A DECISÃO ───────────────────────
 * **Zero ícone** (um ícone por linha, no máximo, e ele pertence à faixa vermelha do
 * `RevisaoSlaBadge`), **zero accent** e **zero quinto tamanho**: `TIPOGRAFIA_BADGE`
 * sobrescreve o tamanho de 12px que o primitivo `Badge` traz por padrão, exatamente como
 * `VereditoBadge` e `RevisaoSlaBadge` já fazem. A constante é **redeclarada** aqui porque
 * a do `RevisaoSlaBadge` é privada ao módulo, e exportá-la seria mudança de código num
 * arquivo que a UI-SPEC trava em "zero mudança de código".
 *
 * A cor nunca é o único canal: o rótulo textual é o que satisfaz a Invariante 6
 * (colorblind-safe, regra `ScoreCell` / T-34-04-03).
 *
 * @module features/pedidos-dados/components/SituacaoPedidoBadge
 * @see src/features/revisao/components/VereditoBadge.tsx (o molde, e as duas divergências)
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§Badge de Situação)
 */
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/utils'

export interface SituacaoPedidoBadgeProps {
  /** `'atendido'` | `'pendente'`; qualquer outro valor renderiza cru, neutro. */
  situacao: string | null | undefined
}

/** Glass neutro — o caminho feliz e todo valor que não é alarme. */
const NEUTRO_CLASSES = 'border-white/20 bg-white/5 text-white/80'

/** Cautela: o eixo Situação usa ÂMBAR, nunca vermelho (§Color, regra de eixos). */
const NAO_ATENDIDO_CLASSES = 'border-amber-400/30 bg-amber-500/15 text-amber-300'

/** Papel tipográfico de label da fase (14px/600), sobrescrevendo o do primitivo. */
const TIPOGRAFIA_BADGE = 'text-sm font-semibold'

/** O vocabulário fechado, verbatim da 44-UI-SPEC §Badge de Situação. */
const ROTULOS_SITUACAO: Record<string, string> = {
  atendido: 'Atendido',
  pendente: 'Não atendido',
}

/**
 * `null`/`undefined` não são "valor desconhecido" — são ausência de valor, e o idioma
 * vivo do projeto para isso é o travessão (`FilaRevisoesTable.semValor`). O badge ainda
 * assim renderiza: célula vazia é o único desfecho proibido.
 */
const SEM_VALOR = '—'

export function SituacaoPedidoBadge({ situacao }: SituacaoPedidoBadgeProps) {
  const token = situacao ?? ''
  const rotulo = ROTULOS_SITUACAO[token] ?? (token || SEM_VALOR)
  const naoAtendido = token === 'pendente'

  return (
    <Badge
      variant="outline"
      className={cn(TIPOGRAFIA_BADGE, naoAtendido ? NAO_ATENDIDO_CLASSES : NEUTRO_CLASSES)}
    >
      {rotulo}
    </Badge>
  )
}
