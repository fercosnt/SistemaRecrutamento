/**
 * cognitivoBanda — o vocabulário ÚNICO da faixa cognitiva nas telas do RH.
 *
 * ## A regra (UX-07 / D-33 / D-64)
 *
 * As telas do RH **nunca** mostram o percentil numérico da avaliação cognitiva, nem a
 * contagem bruta de acertos. Um número nessa posição é lido como nota — e o sistema não
 * rejeita ninguém por score (RNF-07a). O que o RH lê é uma FAIXA de três valores.
 *
 * Diferente do Big Five, que é **não avaliativo** e por isso não ganha nem faixa de
 * mérito, o cognitivo É um score de aderência à vaga: um enquadramento avaliativo de três
 * bandas cabe aqui. O que não cabe é o dígito.
 *
 * ## ⚠ Os limites são PROVISÓRIOS
 *
 * `70` e `40` vieram, sem alteração, da função privada que morava em `ScoreCard.tsx:23-27`
 * desde a Phase 23. Eles **não** são uma norma local do instrumento — a norma real ficou
 * diferida para o M5. Mantidos idênticos de propósito: esta extração é um MOVE, e mudar
 * limite no mesmo passo em que se muda o lugar torna impossível dizer qual das duas coisas
 * explicou uma diferença na tela.
 *
 * ## Quem usa (D-64: a MESMA função nos dois lugares)
 *
 * - `src/components/ScoreCard.tsx` — a célula Inteligência do card da lista do RH.
 * - `src/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock.tsx` — o bloco
 *   cognitivo do hub do candidato visto pelo RH.
 *
 * Antes deste plano a função era privada do `ScoreCard` e o hub mostrava percentil cru:
 * duas telas, dois vocabulários, e o do hub contradizia a regra. Uma fonte só resolve as
 * duas coisas — e uma cópia teria divergido em silêncio, que é o defeito que o 49-03
 * removeu do predicado de candidatura encerrada pela mesma razão.
 *
 * ⚠ A `classificacao` por extenso que o instrumento grava em `scores_raven.classificacao`
 * («Superior», «Médio Inferior», …) **NÃO** é este vocabulário e não deve ser exibida ao
 * RH no lugar da faixa: ela é a escala do teste, não a leitura de aderência à vaga.
 *
 * @module lib/cognitivo/cognitivoBanda
 */

/** Os três valores que a faixa pode assumir — o vocabulário inteiro, em um lugar. */
export type CognitivoBanda =
  | 'Acima do esperado'
  | 'Dentro do esperado'
  | 'Abaixo do esperado'

/**
 * Traduz um percentil (0–100) na faixa que as telas do RH exibem.
 *
 * @param percentil - percentil bruto da avaliação cognitiva (`scores_raven.percentil`)
 * @returns a faixa por extenso — nunca o número
 */
export function cognitivoBanda(percentil: number): CognitivoBanda {
  if (percentil >= 70) return 'Acima do esperado'
  if (percentil >= 40) return 'Dentro do esperado'
  return 'Abaixo do esperado'
}
