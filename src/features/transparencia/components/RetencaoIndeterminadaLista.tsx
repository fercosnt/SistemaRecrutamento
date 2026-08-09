/**
 * RetencaoIndeterminadaLista — o bloco "o que fica mesmo depois de você pedir a exclusão",
 * em `/privacidade` (TRANSP-02).
 *
 * ── DERIVADO DO RECIBO JÁ GERADO, JAMAIS REDIGIDO DE NOVO ───────────────────
 * A fonte é a coluna do que é mantido do recibo de exclusão da Phase 45 — gerado e sob
 * `check:recibo-exclusao` desde o plano 45-02. Redigir esta lista à mão criaria DUAS
 * declarações públicas sobre o mesmo fato, e elas divergiriam na primeira edição: a página
 * prometeria uma coisa e o recibo entregaria outra, para a mesma pessoa, no mesmo pedido.
 * Por isso o rótulo e a base legal de cada item vêm do artefato, e nenhum deles é digitado
 * aqui.
 *
 * ── A EXPRESSÃO CONTRATADA É SEMPRE A FRASE INTEIRA ─────────────────────────
 * "Por tempo indeterminado — sem ligação com você." A segunda metade é o que transforma um
 * fato assustador num fato protetivo: o vínculo é cortado, e o que sobrevive é a prova de
 * não-discriminação exigida pelo Art. 7º, VI. Um prazo sem fim escrito pela metade é a
 * leitura mais assustadora possível de algo que existe para proteger quem se candidatou.
 * As quatro palavras que a especificação proíbe para esse prazo descrevem um dado que
 * continuaria sendo SOBRE a pessoa — que é precisamente o que não acontece aqui.
 *
 * ── E ELE NÃO APARECE NO BLOCO DE PRAZOS ────────────────────────────────────
 * Lá a janela é obrigatória e limitada por restrição de banco: um prazo sem fim é
 * impossível por construção, e se o artefato emitir um, isso é falha de geração. Aqui ele é
 * um fato jurídico, e é por isso que ele vive neste bloco e só neste.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§Bloco 2)
 * @module features/transparencia/components/RetencaoIndeterminadaLista
 */
import { RECIBO_EXCLUSAO } from '@/features/privacidade/constants/reciboExclusao.generated'

import { COPY_TRANSPARENCIA } from '../constants/copyTransparencia'

/** Um item do que fica, na forma que este bloco consome do recibo gerado. */
export interface ItemQueFica {
  readonly item_id: string
  readonly rotulo: string
  readonly base_legal: string
}

export interface RetencaoIndeterminadaListaProps {
  /** Tem valor padrão e o padrão É o recibo gerado. A propriedade existe para fixture. */
  readonly itens?: readonly ItemQueFica[]
}

export function RetencaoIndeterminadaLista({
  itens = RECIBO_EXCLUSAO.colunas_mantem,
}: RetencaoIndeterminadaListaProps = {}) {
  const copy = COPY_TRANSPARENCIA.privacidade.fica

  if (itens.length === 0) {
    throw new Error(
      'O recibo chegou vazio ao bloco público do que fica. Isso é falha de geração, não ' +
        'estado de tela: publicar uma lista vazia afirmaria que nada é mantido, quando o ' +
        'que é mantido é justamente a prova de que a decisão não foi discriminatória.',
    )
  }

  return (
    <ul className="list-none space-y-4">
      {itens.map((item) => (
        <li
          key={item.item_id}
          data-item="fica"
          className="rounded-lg border border-white/15 bg-white/5 p-4"
        >
          <h3 className="text-sm font-semibold text-white">{item.rotulo}</h3>
          <dl className="mt-2 space-y-2">
            <div className="space-y-1">
              <dt className="text-sm font-semibold text-white/70">{copy.rotulos.prazo}</dt>
              {/* A frase INTEIRA, sempre. Nunca só a primeira metade. */}
              <dd className="text-base leading-relaxed text-white/90">
                {copy.prazoIndeterminado}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-semibold text-white/70">{copy.rotulos.baseLegal}</dt>
              {/* A base legal DAQUELE item, ao lado dele — vinda do recibo, não redigida. */}
              <dd className="text-sm font-semibold text-white/70">{item.base_legal}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  )
}
