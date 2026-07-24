/**
 * `PrazoEstimadoLinha` — a linha de estimativa de prazo exibida em cada card de espera do
 * painel do candidato (TIMELINE-02).
 *
 * Componente **puro**: recebe o `rotulo` já resolvido (o texto candidate-facing de
 * `config_sla_etapa.rotulo_candidato`) e renderiza uma linha discreta com ícone + o texto
 * + um chip "Estimativa". Quando `rotulo` é null (etapa terminal/stale, ou config ainda
 * carregando/falhou), renderiza `null` — a estimativa é enhancement, nunca bloqueia o card.
 *
 * NUNCA countdown: não há relógio, temporizador nem cálculo de tempo aqui — só texto
 * estático. O texto do config já enquadra o prazo como "em até X"; o chip reforça que é uma
 * estimativa, não uma promessa rígida (RNF).
 */
import { Clock } from 'lucide-react'

export interface PrazoEstimadoLinhaProps {
  /** Texto candidate-facing da estimativa, ou null quando não aplicável. */
  rotulo: string | null
}

export function PrazoEstimadoLinha({ rotulo }: PrazoEstimadoLinhaProps) {
  if (!rotulo) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-white/70 text-sm">
      <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{rotulo}</span>
      <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-white/60">
        Estimativa
      </span>
    </div>
  )
}
