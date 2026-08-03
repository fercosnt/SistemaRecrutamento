/**
 * RevisaoSlaBadge — o badge de ACOMPANHAMENTO INTERNO de uma revisão pendente (REVISAO-02).
 *
 * Recebe a contagem de dias em espera e os limiares já resolvidos (`useConfigSlaRevisao`),
 * classifica com o `classifyRevisaoSla` puro e renderiza uma de quatro apresentações
 * (42-UI-SPEC §Faixas do badge de SLA):
 *
 *   em_dia     → verde    "Em dia · {n}d"
 *   atencao    → âmbar    "Atenção · {n}d"
 *   atrasado   → vermelho "Atrasado · {n}d"  + ícone de alerta (2º canal)
 *   degenerado → sem badge, só a contagem neutra "{n}d"
 *
 * ── POR QUE ESTE COMPONENTE EXISTE em vez de reusar o `SlaBadge` da Phase 34 ──────
 * O `SlaBadge` lê um mapa de limiares COMPILADO e é chaveado por etapa do funil.
 * Aqui os limiares vêm de uma tabela de configuração do servidor, alterável sem deploy
 * (D-P42-02), e o vocabulário é de TRÊS faixas explícitas mais a degenerada. As paletas
 * âmbar e vermelha são reusadas byte a byte de lá (mesma linguagem visual); a verde é
 * nova porque naquele componente a faixa "dentro do prazo" não tinha badge.
 *
 * ── INVARIANTE COLORBLIND-SAFE (regra `ScoreCell` / T-34-04-03) ───────────────────
 * Todo ramo carrega rótulo textual E a contagem de dias no MESMO elemento; a faixa
 * vermelha carrega `AlertTriangle aria-hidden` como 2º canal redundante. Cor nunca é o
 * único canal, e nenhum ramo renderiza célula vazia.
 *
 * ── ESTE VALOR É INTERNO (invariante 1 da 42-UI-SPEC) ─────────────────────────────
 * Faixa, cor de faixa, contagem de dias e rótulo de atraso NUNCA aparecem em superfície
 * de candidato — nem em `title`, nem em `aria-label`. Este componente é importado
 * exclusivamente pela fila do RH.
 *
 * @module features/revisao/components/RevisaoSlaBadge
 * @see src/features/funil/components/SlaBadge.tsx (o molde de comportamento; paletas âmbar/vermelha)
 * @see src/features/revisao/constants/slaRevisao.ts (classifyRevisaoSla — puro e total)
 */
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/utils'
import {
  classifyRevisaoSla,
  ROTULOS_FAIXA_SLA_REVISAO,
  type LimiaresSlaRevisao,
} from '../constants/slaRevisao'

export interface RevisaoSlaBadgeProps {
  /** Dias corridos em espera (de `diasEmEspera`, nunca aritmética de data à mão). */
  diasEspera: number
  /** Limiares vindos da config; `null` = configuração ausente/ilegível → degenerada. */
  limiares: LimiaresSlaRevisao | null
}

/** Paletas glass (42-UI-SPEC §Color — data-encoding, fora do orçamento de accent). */
const EM_DIA_CLASSES = 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
const ATENCAO_CLASSES = 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30'
const ATRASADO_CLASSES = 'bg-red-500/20 text-red-300 border-red-500/30'

/**
 * O papel tipográfico de label da fase: 14px/600. Sobrescreve o tamanho menor que o
 * primitivo `badge` traz por padrão — o conjunto tipográfico declarado desta feature tem
 * 4 tamanhos, e o do primitivo seria um quinto.
 */
const TIPOGRAFIA_BADGE = 'text-sm font-semibold'

export function RevisaoSlaBadge({ diasEspera, limiares }: RevisaoSlaBadgeProps) {
  const faixa = classifyRevisaoSla(diasEspera, limiares)
  const rotulo = ROTULOS_FAIXA_SLA_REVISAO[faixa]

  if (faixa === 'atrasado') {
    return (
      <Badge variant="outline" className={cn(TIPOGRAFIA_BADGE, ATRASADO_CLASSES)}>
        <AlertTriangle aria-hidden="true" />
        {rotulo} · {diasEspera}d
      </Badge>
    )
  }

  if (faixa === 'atencao') {
    return (
      <Badge variant="outline" className={cn(TIPOGRAFIA_BADGE, ATENCAO_CLASSES)}>
        {rotulo} · {diasEspera}d
      </Badge>
    )
  }

  if (faixa === 'em_dia') {
    return (
      <Badge variant="outline" className={cn(TIPOGRAFIA_BADGE, EM_DIA_CLASSES)}>
        {rotulo} · {diasEspera}d
      </Badge>
    )
  }

  // Degenerada — sem configuração legível não há afirmação honesta a fazer sobre o
  // acompanhamento, então a célula mostra apenas a contagem. Nunca vazia, nunca erro.
  return <span className="text-sm text-white/50">{diasEspera}d</span>
}
