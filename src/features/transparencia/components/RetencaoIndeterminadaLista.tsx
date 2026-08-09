/**
 * RetencaoIndeterminadaLista — o bloco do que fica depois da exclusão, em `/privacidade`
 * (TRANSP-02).
 *
 * ⚠ ESQUELETO DECLARATIVO (commit RED do plano 47-06 / Task 2). As assinaturas existem
 * para o tipo fechar; nada aqui faz o que promete. O commit GREEN substitui o arquivo.
 *
 * @module features/transparencia/components/RetencaoIndeterminadaLista
 */
import { RECIBO_EXCLUSAO } from '@/features/privacidade/constants/reciboExclusao.generated'

/** Um item do que fica, na forma que este bloco consome do recibo gerado. */
export interface ItemQueFica {
  readonly item_id: string
  readonly rotulo: string
  readonly base_legal: string
}

export interface RetencaoIndeterminadaListaProps {
  readonly itens?: readonly ItemQueFica[]
}

export function RetencaoIndeterminadaLista(_props: RetencaoIndeterminadaListaProps = {}) {
  void RECIBO_EXCLUSAO
  return null
}
