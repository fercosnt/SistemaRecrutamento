/**
 * MatrizRetencaoPublica — o bloco de prazos de `/privacidade`: uma ficha por estado da
 * candidatura, alimentada SÓ pelo artefato gerado (TRANSP-02).
 *
 * ── AS SEIS REGRAS QUE NÃO PODEM SER RELAXADAS ──────────────────────────────
 *
 * 1. **DERIVADA, NUNCA DIGITADA.** A fonte é `matrizRetencao.generated.ts`, e o portão
 *    `check:matriz-retencao` (plano 47-01) é o que a mantém honesta: ele reprova nas duas
 *    direções quando a fonte declarada e o artefato divergem. Uma janela digitada dentro
 *    deste componente seria uma política pública que ninguém consegue conferir.
 *
 * 2. **PROJEÇÃO MÍNIMA.** Apenas estado, prazo e motivo. Quem alterou a janela, quando
 *    alterou e por qual caminho a alteração entrou NÃO vão para a página: um desses campos
 *    é nome de administrador, e publicá-lo trocaria transparência sobre o candidato por
 *    exposição de um funcionário. O artefato de 47-01 já não os carrega; este componente
 *    não os reintroduz.
 *
 * 3. **AGRUPAMENTO PROIBIDO.** Hoje as janelas são quase todas iguais e a tentação de
 *    renderizar uma linha só ("todos os estados: 24 meses") é forte. No dia em que um
 *    administrador encurtar UMA janela, a forma agrupada esconderia a divergência
 *    exatamente onde ela importa — e é para esse dia que este bloco existe.
 *
 * 4. **MOTIVO OBRIGATÓRIO, COM A BASE LEGAL AO LADO.** A finalidade e a base legal vêm do
 *    artefato, e o gerador já reprova o estado sem elas. Aqui basta renderizá-las junto do
 *    item — nunca em nota de rodapé, nunca em dica flutuante: a justificativa que torna o
 *    prazo legítimo tem de ser lida junto com o prazo.
 *
 * 5. **ORDEM DE FUNIL.** A do artefato, que já vem ordenado pela ordem em que a pessoa vive
 *    o processo. Este componente não reordena.
 *
 * 6. **SEM ELEMENTO DE TABELA.** Ficha por estado, duas colunas acima do ponto de quebra,
 *    empilhadas abaixo, cada uma com os próprios rótulos nos dois casos — é isso que
 *    preserva o pareamento entre campo e valor em coluna única. Uma tabela de três colunas
 *    a 320px ou rola horizontalmente ou corta texto, e as duas coisas estão proibidas.
 *
 * ── AS DUAS FALHAS ALTAS ────────────────────────────────────────────────────
 * Lista vazia LANÇA: uma página de retenção vazia seria a declaração pública de que a
 * empresa não guarda nada. Janela sem número inteiro positivo também LANÇA: a janela é
 * obrigatória e limitada por restrição de banco, então um prazo sem fim aqui é impossível
 * por construção — se o artefato emitir um, isso é falha de geração, e falha de geração não
 * é um estado de tela. O prazo sem fim vive no bloco do que fica, e só lá, porque lá ele é
 * um fato jurídico e não um buraco no dado.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§Bloco 1)
 * @module features/transparencia/components/MatrizRetencaoPublica
 */
import type { ReactNode } from 'react'

import { COPY_TRANSPARENCIA } from '../constants/copyTransparencia'
import { MATRIZ_RETENCAO } from '../constants/matrizRetencao.generated'
import type { FichaRetencao } from './PrivacidadePublicaPage'

export interface MatrizRetencaoPublicaProps {
  /**
   * Tem valor padrão e o padrão É o artefato gerado. A propriedade não é um caminho para
   * injetar outra fonte em produção: ela existe para as fixtures que provam o
   * não-agrupamento e as duas falhas altas.
   */
  readonly etapas?: readonly FichaRetencao[]
}

/** Um par rótulo↔valor. O rótulo é visível nos DOIS pontos de quebra, nunca só no maior. */
function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm font-semibold text-white/70">{rotulo}</dt>
      <dd className="space-y-1">{children}</dd>
    </div>
  )
}

export function MatrizRetencaoPublica({
  etapas = MATRIZ_RETENCAO.etapas,
}: MatrizRetencaoPublicaProps = {}) {
  const copy = COPY_TRANSPARENCIA.privacidade.matriz

  if (etapas.length === 0) {
    throw new Error(
      'A matriz de retenção chegou vazia ao bloco público de prazos. Isso é falha de ' +
        'geração, não estado de tela: uma página de retenção vazia seria a declaração ' +
        'pública de que a Beauty Smile não guarda nada.',
    )
  }

  for (const ficha of etapas) {
    if (!Number.isInteger(ficha.janela_meses) || ficha.janela_meses <= 0) {
      throw new Error(
        `O estado «${ficha.etapa}» chegou ao bloco público sem janela em meses. A janela é ` +
          'obrigatória e limitada por restrição de banco, então um prazo sem fim aqui é ' +
          'impossível por construção — se o artefato emitiu um, a geração falhou.',
      )
    }
  }

  return (
    <ul className="grid list-none gap-4 sm:grid-cols-2">
      {etapas.map((ficha) => (
        <li
          key={ficha.etapa}
          data-ficha="retencao"
          className="rounded-lg border border-white/15 bg-white/5 p-4"
        >
          <h3 className="text-sm font-semibold text-white">{ficha.rotulo}</h3>
          <dl className="mt-2 space-y-2">
            <Campo rotulo={copy.rotulos.prazo}>
              <span className="block text-base leading-relaxed text-white/90">
                {copy.prazo(ficha.janela_meses)}
              </span>
            </Campo>
            <Campo rotulo={copy.rotulos.motivo}>
              <span className="block text-base leading-relaxed text-white/90">
                {ficha.finalidade}
              </span>
              {/* A base legal fica AO LADO do item, no tamanho de rótulo. Empurrá-la para
                  uma nota de rodapé separaria o prazo da razão que o legitima. */}
              <span className="block text-sm font-semibold text-white/70">
                {ficha.base_legal}
              </span>
            </Campo>
          </dl>
        </li>
      ))}
    </ul>
  )
}
