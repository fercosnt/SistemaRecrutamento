/**
 * MatrizRetencaoPublica — o bloco de prazos de `/privacidade` (TRANSP-02).
 *
 * ⚠ ESQUELETO DECLARATIVO (commit RED do plano 47-06 / Task 2). As assinaturas existem
 * para o tipo fechar; nada aqui faz o que promete. O commit GREEN substitui o arquivo.
 *
 * @module features/transparencia/components/MatrizRetencaoPublica
 */
import { MATRIZ_RETENCAO } from '../constants/matrizRetencao.generated'
import type { FichaRetencao } from './PrivacidadePublicaPage'

export interface MatrizRetencaoPublicaProps {
  readonly etapas?: readonly FichaRetencao[]
}

export function MatrizRetencaoPublica(_props: MatrizRetencaoPublicaProps = {}) {
  void MATRIZ_RETENCAO
  return null
}
