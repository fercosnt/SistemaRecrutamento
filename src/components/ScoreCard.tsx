/**
 * ScoreCard Component
 *
 * ## Phase 49 / Plan 49-04 (JORN-13): 4 células → 3, e cada uma mostra o que EXISTE
 *
 * Eram quatro, e três delas liam fontes mortas. Medido em PROD em 2026-09-22:
 * `scores_bigfive` **0 linhas**, `scores_disc` **0 linhas** (o DISC não existe no produto),
 * `analise_ia_cultura` **0 de 39**. Os helpers convertiam o vazio em `0`, o `?? 'N/A'`
 * nunca disparava (porque `0` não é nullish), e o RH lia um zero vermelho — indistinguível
 * de uma nota real de zero — em 38 cards.
 *
 * As três células de hoje, e a regra de cada uma:
 *
 * - **Big Five** — `EstadoBigFive`: «concluído» ou «não fez», SEM número e SEM cor de nota.
 *   É avaliação comportamental não avaliativa (UX-07/RNF-07a, D-31); o `score` da linha
 *   `tipo='big_five'` é NULL por desenho.
 * - **Intel** — `EstadoInteligencia`: a FAIXA de `cognitivoBanda`, nunca o percentil
 *   (D-33/D-64). O número não entra no componente, então não há como exibi-lo por descuido.
 * - **Cultura** — `EstadoCultura`: SÓ a nota revisada por humano (`scores_candidato`
 *   `tipo='redacao'` / `status='sucesso'`) mostra número e cor. Nunca a sugestão da IA
 *   (D-32), nunca `0` por ausência.
 *
 * A célula **DISC** foi removida: instrumento inexistente, tabela vazia, e a antiga pintava
 * `text-green-400` fixo — verde, sempre, para um dado que nunca chegou.
 *
 * `scoreGeral` continua escondido quando nulo (0 de 39 em PROD) — comportamento pré-existente.
 *
 * Used in CandidatosRHPage cards (abas «Todos» e «Por Vaga»)
 */

import React from 'react'
import { Brain, TrendingUp, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  EstadoBigFive,
  EstadoCultura,
  EstadoInteligencia,
} from '@/features/vagas/types/vagasTypes'

/**
 * Cor NEUTRA das células sem nota. A cor é significado neste card: pintar «não fez» com
 * uma cor da escala de nota reintroduziria, por outro caminho, o defeito que o plano
 * desfez. Idioma herdado de `ScorecardAvaliacao.tsx:246-275` (faixa neutra do Big Five).
 */
const COR_NEUTRA = 'text-white/70'

interface ScoreCardProps {
  /** 49-04 (D-31): estado, nunca média. Ausente ⇒ `nao_fez`. */
  bigFive?: EstadoBigFive | null
  /** 49-04 (D-33/D-64): a faixa já resolvida; o percentil não entra aqui. */
  inteligencia?: EstadoInteligencia | null
  /**
   * 49-04 / JORN-13 (D-32): a célula Cultura recebe ESTADO, não número. `undefined` é
   * tratado como `nao_fez` — o que a tela NÃO pode fazer é transformar ausência em `0`.
   */
  cultura?: EstadoCultura | null
  scoreGeral?: number | null // PRIMARY SCORE (0-100) - MOST IMPORTANT
  className?: string
}

export function ScoreCard({
  bigFive,
  inteligencia,
  cultura,
  scoreGeral,
  className,
}: ScoreCardProps) {
  // Helper to get color for numeric scores
  const getScoreColor = (score: number | null | undefined): string => {
    if (!score) return 'text-white/50'
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  // Big Five: sem número, sem cor de nota. `undefined` ⇒ «não fez» (default seguro).
  const bigFiveTexto = bigFive === 'concluido' ? 'concluído' : 'não fez'

  // Inteligência: a faixa que veio pronta, ou «não fez». Nenhum ramo produz dígito.
  const inteligenciaEstado: EstadoInteligencia = inteligencia ?? {
    estado: 'nao_fez',
  }
  const inteligenciaTexto =
    inteligenciaEstado.estado === 'faixa' ? inteligenciaEstado.faixa : 'não fez'

  // Cultura (49-04 / JORN-13): SÓ o estado `nota` mostra número e usa cor de nota. Os
  // outros dois estados dizem por que não há número, em cor NEUTRA.
  const culturaEstado: EstadoCultura = cultura ?? { estado: 'nao_fez' }
  const culturaTexto =
    culturaEstado.estado === 'nota'
      ? String(culturaEstado.valor)
      : culturaEstado.estado === 'aguardando_revisao'
        ? 'aguardando revisão'
        : 'não fez'
  const culturaCor =
    culturaEstado.estado === 'nota'
      ? getScoreColor(culturaEstado.valor)
      : 'text-white/50'

  return (
    <div className={cn('space-y-3', className)}>
      {/* Score Geral - Destaque Principal */}
      {scoreGeral !== null && scoreGeral !== undefined && (
        <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
            <span className="text-sm font-medium text-white/90">
              Score Geral
            </span>
          </div>
          <div
            className={cn(
              'text-2xl font-bold',
              getScoreColor(scoreGeral)
            )}
          >
            {scoreGeral}
          </div>
        </div>
      )}

      {/* Grid das 3 células verdadeiras (era 2x2 com uma célula inventada) */}
      <div className="grid grid-cols-2 gap-2 text-white/90 text-sm">
        {/* Big Five — não avaliativo: estado, sem número e sem cor de nota */}
        <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
          <Brain className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs opacity-70 mb-0.5">Big Five</div>
            <div
              data-testid="scorecard-bigfive-estado"
              className={cn('font-semibold truncate', COR_NEUTRA)}
            >
              {bigFiveTexto}
            </div>
          </div>
        </div>

        {/* Intelligence (Raven) — faixa, nunca percentil */}
        <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
          <TrendingUp className="w-4 h-4 text-purple-300 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs opacity-70 mb-0.5">Intel</div>
            <div
              data-testid="scorecard-inteligencia-estado"
              className={cn('font-semibold truncate', COR_NEUTRA)}
            >
              {inteligenciaTexto}
            </div>
          </div>
        </div>

        {/* Culture — só a nota revisada por humano carrega número e cor */}
        <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
          <Heart className="w-4 h-4 text-pink-300 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs opacity-70 mb-0.5">Cultura</div>
            <div
              data-testid="scorecard-cultura-estado"
              className={cn('font-semibold truncate', culturaCor)}
            >
              {culturaTexto}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
