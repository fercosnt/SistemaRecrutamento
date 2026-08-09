/**
 * SubprocessadorFicha — a ficha de uma empresa contratada, com os cinco campos
 * rotulados (TRANSP-01).
 *
 * ── UM COMPONENTE PARA AS SEIS ──────────────────────────────────────────────
 * Dois componentes divergiriam na primeira edição, e a divergência apareceria entre duas
 * declarações públicas sobre tratamento de dados pessoais. O tratamento visual é
 * IDÊNTICO entre as seis: pintar um provedor diferente dos outros transformaria um relato
 * factual num julgamento, e faria a página sugerir que a Beauty Smile desconfia de um
 * fornecedor que ela mesma escolheu. A distinção entre entradas é feita por CONTEÚDO —
 * canal que sobrevive ao daltonismo, ao leitor de tela e à impressão em preto e branco.
 *
 * ── A FALHA ALTA MORA AQUI, NO PONTO DE RENDERIZAÇÃO ────────────────────────
 * A ficha valida a entrada e **lança** quando ela está incompleta. Não é rigor
 * decorativo: sem isso, uma entrada com país por medir renderizaria um campo em branco
 * numa declaração de transferência internacional — e um campo em branco ali não é um
 * espaço reservado, é uma omissão publicada.
 *
 * Estrutura: item de lista + cabeçalho real + lista de definição. Nenhuma tabela — uma
 * tabela de cinco campos a 320px ou rola horizontalmente ou corta texto, e as duas coisas
 * estão proibidas.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§Os campos de cada ficha)
 * @module features/transparencia/components/SubprocessadorFicha
 */
import { COPY_TRANSPARENCIA } from '../constants/copyTransparencia'
import { validarEntradaSubprocessador, type Subprocessador } from '../constants/subprocessadores'

export interface SubprocessadorFichaProps {
  readonly entrada: Subprocessador
}

/** Um par rótulo↔valor. O rótulo é visível nos DOIS pontos de quebra, nunca só no maior. */
function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm font-semibold text-white/70">{rotulo}</dt>
      <dd className="text-base leading-relaxed text-white/90">{valor}</dd>
    </div>
  )
}

export function SubprocessadorFicha({ entrada }: SubprocessadorFichaProps) {
  const ficha = validarEntradaSubprocessador(entrada)
  const { rotulos } = COPY_TRANSPARENCIA.subprocessadores

  return (
    <li
      data-ficha="subprocessador"
      className="rounded-lg border border-white/15 bg-white/5 p-4"
    >
      <h3 className="text-sm font-semibold text-white">{ficha.nome}</h3>
      <dl className="mt-2 space-y-2">
        <Campo rotulo={rotulos.recebe} valor={ficha.recebe} />
        <Campo rotulo={rotulos.finalidade} valor={ficha.finalidade} />
        <Campo rotulo={rotulos.pais} valor={ficha.pais} />
        <Campo rotulo={rotulos.baseLegal} valor={ficha.baseLegal} />
      </dl>
    </li>
  )
}
