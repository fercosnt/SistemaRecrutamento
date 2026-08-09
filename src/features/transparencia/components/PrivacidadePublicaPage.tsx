/**
 * PrivacidadePublicaPage — `/privacidade` (TRANSP-02).
 *
 * ⚠ ESQUELETO DECLARATIVO (commit RED do plano 47-06 / Task 1).
 *
 * As assinaturas existem para o tipo fechar — o `.husky/pre-commit` deste repositório é um
 * portão de CONTAGEM de erros de `tsc --noEmit`, então um RED clássico ("o módulo não
 * existe") só seria commitável com o bypass que o portão do milestone proíbe. Nada aqui faz
 * o que promete; o commit GREEN substitui o arquivo inteiro.
 *
 * @module features/transparencia/components/PrivacidadePublicaPage
 */

/** Uma ficha da matriz de retenção, na forma que a página consome do artefato gerado. */
export interface FichaRetencao {
  readonly etapa: string
  readonly rotulo: string
  readonly janela_meses: number
  readonly finalidade: string
  readonly base_legal: string
}

/**
 * A forma ESTRUTURAL do artefato gerado da matriz.
 *
 * O artefato real é literal (`as const`); esta forma é a estrutural, e é ela que torna
 * possível provar por fixture que a página LANÇA quando a data de medição falta.
 */
export interface MatrizPublicada {
  readonly etapas: readonly FichaRetencao[]
  readonly meta: { readonly medido_em: string }
}

export interface PrivacidadePublicaPageProps {
  readonly matriz?: MatrizPublicada
}

export function PrivacidadePublicaPage(_props: PrivacidadePublicaPageProps = {}) {
  return null
}
