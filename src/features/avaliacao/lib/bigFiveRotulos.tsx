/**
 * Phase 52 / Plan 52-11 (JORN-56 — D-04, UI-SPEC §Component Inventory): os rótulos e as faixas
 * do Big Five, UMA cópia só.
 *
 * Até o 52-11 estas peças moravam dentro de `DevolutivaBigFiveView.tsx` (a devolutiva do
 * candidato). O hub do RH passa a mostrar as mesmas faixas (`BigFiveResultadoHub`), e a promessa
 * da D-04 é «o mesmo desenho» — duas cópias divergiriam na primeira edição. Por isso as duas telas
 * importam daqui.
 *
 * Os tipos são estreitos e próprios (`DimBigFive`, `BandaBigFive`): este módulo NÃO depende do
 * tipo de linha da devolutiva do candidato, que carrega o número cru da escala. O hub nunca recebe
 * esse número (UI-SPEC, Invariante 1).
 *
 * «N» é «Sensibilidade Emocional» — nunca o termo clínico (LGPD-04). Ordem de exibição: O C E A N.
 *
 * @module features/avaliacao/lib/bigFiveRotulos
 * @see src/features/avaliacao/components/DevolutivaBigFiveView.tsx (devolutiva do candidato)
 * @see src/features/avaliacao/components/BigFiveResultadoHub.tsx (hub do RH)
 */

/** As cinco dimensões do Big Five. */
export type DimBigFive = 'O' | 'C' | 'E' | 'A' | 'N'

/** As cinco faixas neutras — nunca enquadramento de aprovação/reprovação. */
export type BandaBigFive = 'muito_baixo' | 'mod_baixo' | 'medio' | 'mod_alto' | 'muito_alto'

/** Rótulo de cada dimensão. «N» → «Sensibilidade Emocional» (LGPD-04). */
export const DIM_LABEL: Record<DimBigFive, string> = {
  O: 'Abertura à Experiência',
  C: 'Conscienciosidade',
  E: 'Extroversão',
  A: 'Amabilidade',
  N: 'Sensibilidade Emocional',
}

/** Ordem de exibição das dimensões. */
export const DIM_ORDER: DimBigFive[] = ['O', 'C', 'E', 'A', 'N']

/** Rótulos neutros das faixas — nunca «abaixo/dentro/acima do esperado». */
export const BANDA_LABEL: Record<BandaBigFive, string> = {
  muito_baixo: 'Muito baixo',
  mod_baixo: 'Moderadamente baixo',
  medio: 'Médio',
  mod_alto: 'Moderadamente alto',
  muito_alto: 'Muito alto',
}

/** As cinco faixas em ordem crescente — alimenta o indicador de posição não quantitativo. */
export const BANDA_ORDER: BandaBigFive[] = [
  'muito_baixo',
  'mod_baixo',
  'medio',
  'mod_alto',
  'muito_alto',
]

/**
 * Indicador de cinco segmentos que destaca a POSIÇÃO da faixa na escala neutra — nunca uma barra
 * proporcional a um número (UX-07). Diz «onde, de muito baixo a muito alto», sem expor dígito.
 */
export function BandaSegments({ banda }: { banda: BandaBigFive }) {
  const activeIndex = BANDA_ORDER.indexOf(banda)
  return (
    <div className="flex gap-1" aria-hidden="true">
      {BANDA_ORDER.map((b, i) => (
        <div
          key={b}
          className={`h-2 flex-1 rounded-full ${
            i === activeIndex ? 'bg-white/80' : 'bg-white/15'
          }`}
        />
      ))}
    </div>
  )
}

/**
 * Frase neutra e autodescritiva por FAIXA (nunca dígito, nunca «grupo de 100»/ranking — UX-07).
 * O Big Five não avalia: a frase descreve o nível autodeclarado, nunca «acima/abaixo do esperado».
 * É a frase que o candidato leu na devolutiva — o hub a mostra dentro do texto que ele recebeu.
 */
export function analogia(dim: DimBigFive, banda: BandaBigFive): string {
  const label = DIM_LABEL[dim].toLowerCase()
  return `Você se descreveu com um nível ${BANDA_LABEL[banda].toLowerCase()} de ${label}.`
}
