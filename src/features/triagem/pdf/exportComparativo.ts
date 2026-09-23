/**
 * exportComparativo — exportação client-side do comparativo de candidatos (TRIAGEM-04).
 *
 * Gera um PDF landscape com **atributos nas linhas** e **candidatos nas colunas**
 * (espelha a tela UI-SPEC §B), usando `jspdf` + `jspdf-autotable`. Texto selecionável
 * (autoTable renderiza texto real, não imagem). Dispara o download via `doc.save`.
 *
 * Não existe analog de PDF no repo — segue o RESEARCH §Code Examples
 * ("PDF export — candidates as columns"). Puramente client-side: nenhum dado deixa
 * a sessão RH autenticada além do que já está na tela (T-10-21 accept).
 *
 * @module features/triagem/pdf/exportComparativo
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-UI-SPEC.md (§B export)
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
// ⚠ A MESMA cópia da tela, importada — não uma segunda redação (D-27b).
//
// Duas redações do mesmo aviso divergem, e a que ninguém revisaria seria justamente a do
// arquivo que SAI da empresa. `textoProveniencia` e `PROVENIENCIA_IA_COPY` vivem no módulo
// do selo porque é lá que mora a regra «é fallback ⇔ provedor_ia = 'openai'»; mantê-las
// num lugar só é o que garante que a tela e o PDF não possam discordar.
//
// ⚠ Importa-se `textoProveniencia`, e NÃO `PROVENIENCIA_IA_COPY`: a função é construída a
// partir da constante, então a cópia é a mesma por CONSTRUÇÃO. Trazer a constante para cá
// para não usá-la seria código morto que um leitor tomaria por uma segunda fonte — e o
// `noUnusedLocals` do projeto o reprovaria com razão.
//
// Sobre o corte de bundle (PERF-03): este módulo é carregado por `await import()` no clique
// de «Exportar PDF» para manter o jsPDF fora do chunk eager. Importar o módulo do selo NÃO
// desfaz isso — o `ComparativoScreen` já o importa, então ele está no chunk da rota `/rh/*`,
// que por construção já foi carregado antes de existir um botão para clicar. O portão
// `scripts/assert-chunks.mjs` vigia a direção que importa (jsPDF FORA do índice eager).
import { textoProveniencia } from '../components/ProvenienciaIABadge'

/**
 * Candidato ranqueado pela IA (shape do retorno da EF comparativo-candidatos,
 * `ComparativeRanking.ranked_candidates[]`). `nome` é resolvido no client a partir
 * das linhas do painel (a EF anonimiza os ids).
 */
export interface RankedCandidate {
  candidate_id: string
  /** Nome resolvido no client (a EF anonimiza; o painel sabe o nome). */
  nome: string
  rank: number
  composite_score: number
  relative_strengths: string[]
  relative_weaknesses: string[]
  rationale: string
}

/**
 * Ranking comparativo retornado pela EF (subset consumido pela tela + PDF).
 */
export interface ComparativeRankingView {
  ranked_candidates: RankedCandidate[]
  recommendation?: { top_choice: string; backup_choice: string | null; note: string }
  ties_or_concerns?: string[]
}

/** Junta um array de strings em uma célula multilinha legível. */
function joinCell(items: string[]): string {
  return items.length ? items.join('; ') : '—'
}

/**
 * Proveniência do ranking, para a linha abaixo do título (D-27b / JORN-28).
 *
 * Os mesmos três campos que a EF devolve e que o `ProvenienciaIABadge` recebe.
 */
export interface ProvenienciaPdf {
  /** `'anthropic'` | `'openai'` | `null`. `'openai'` = resultado de contingência. */
  provedorIa: string | null | undefined
  /** O modelo que DE FATO respondeu. `null` ⇒ «modelo não registrado» (D-30). */
  modeloIa: string | null | undefined
  /** Causa crua do fallback (`anthropic_max_tokens`, …) ou `null`. */
  fallbackCause?: string | null
}

/** Y do título. */
const Y_TITULO = 14
/** Y da linha de proveniência — logo ABAIXO do título. */
const Y_PROVENIENCIA = 20
/** Onde a tabela começa: sem proveniência, o valor histórico; com ela, abaixo da linha. */
const START_Y_SEM_PROVENIENCIA = 22
const START_Y_COM_PROVENIENCIA = 26

/**
 * Constrói e baixa o PDF comparativo (atributos-linha / candidatos-coluna).
 *
 * Ordena os candidatos por `rank` (1 → N) para que as colunas sigam a sugestão da IA.
 * Cada linha é um atributo; o cabeçalho carrega o nome de cada candidato.
 *
 * W1: recebe os candidatos JÁ RESOLVIDOS no client (que carregam `.nome` real). A EF
 * anonimiza para C1/C2… e NUNCA popula `nome` em `ranking.ranked_candidates`, então
 * ler dali produzia cabeçalhos em branco. O chamador passa os candidatos resolvidos.
 *
 * ─── D-27b: A PROVENIÊNCIA VAI NO PDF, E É AQUI QUE ELA MAIS IMPORTA ────────────────
 *
 * Este arquivo circula FORA do sistema — e-mail, pasta compartilhada, anexo de ata. Um
 * ranking que saiu do modelo de contingência, exportado sem aviso, viaja sem contexto como
 * se fosse a saída do modelo configurado, e quem o recebe não tem nenhuma tela onde
 * conferir. O selo da tela pode ser relido; o PDF, não.
 *
 * ⚠ `proveniencia` é OPCIONAL, e a ausência NÃO imprime «modelo não registrado»: um
 * chamador que nunca passou o dado não fez medição nenhuma, e afirmar «não registrado» por
 * ele inventaria uma medição. `modeloIa: null` PASSADO é o caso que imprime (D-30).
 *
 * @param candidates candidatos resolvidos (nome + campos do ranking), em qualquer ordem.
 * @param proveniencia quem gerou o ranking; omitido ⇒ nenhuma linha de proveniência.
 * @throws repassa qualquer erro do jspdf para o chamador (a tela mostra o toast de erro).
 */
export function exportComparativo(
  candidates: RankedCandidate[],
  proveniencia?: ProvenienciaPdf,
): void {
  const ordered = [...(candidates ?? [])].sort((a, b) => a.rank - b.rank)

  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(14)
  doc.text(
    'Comparativo de candidatos — Sugestão da IA (decisão é sempre humana)',
    14,
    Y_TITULO,
  )

  if (proveniencia) {
    // Menor que o título e logo abaixo dele: é a posição que faz o aviso ser lido junto
    // com o cabeçalho, e não depois da tabela inteira (quando a leitura já terminou).
    doc.setFontSize(9)
    doc.text(
      textoProveniencia({
        provedorIa: proveniencia.provedorIa,
        modeloIa: proveniencia.modeloIa,
        fallbackCause: proveniencia.fallbackCause,
      }),
      14,
      Y_PROVENIENCIA,
    )
  }

  const head = [['Atributo', ...ordered.map((c) => c.nome)]]

  const body: string[][] = [
    ['Ranking IA', ...ordered.map((c) => `${c.rank}º`)],
    ['Score IA', ...ordered.map((c) => String(c.composite_score))],
    ['Pontos fortes', ...ordered.map((c) => joinCell(c.relative_strengths))],
    ['Gaps', ...ordered.map((c) => joinCell(c.relative_weaknesses))],
    ['Justificativa IA', ...ordered.map((c) => c.rationale || '—')],
  ]

  // Larguras de coluna COMPUTADAS para caber na largura da página landscape. Antes,
  // `cellWidth: 'wrap'` deixava a coluna do 1º candidato esticar com o texto longo e
  // empurrava as demais p/ fora da folha → o 2º+ candidato sumia e o texto era clipado
  // (TRIAGEM-04 UAT). Agora: coluna Atributo fixa (32) + N colunas de candidato dividindo
  // o restante, com overflow 'linebreak' (autotable quebra o texto dentro da coluna).
  const marginX = 14
  const attrColWidth = 32
  const nCand = ordered.length
  const pageWidth = doc.internal.pageSize.getWidth()
  const candColWidth =
    nCand > 0 ? (pageWidth - marginX * 2 - attrColWidth) / nCand : pageWidth - marginX * 2 - attrColWidth

  const columnStyles: Record<number, { cellWidth: number; fontStyle?: 'bold' }> = {
    0: { fontStyle: 'bold', cellWidth: attrColWidth },
  }
  for (let i = 1; i <= nCand; i++) {
    columnStyles[i] = { cellWidth: candColWidth }
  }

  autoTable(doc, {
    head,
    body,
    // A tabela desce quando há linha de proveniência — senão o aviso fica por baixo dela.
    startY: proveniencia ? START_Y_COM_PROVENIENCIA : START_Y_SEM_PROVENIENCIA,
    margin: { left: marginX, right: marginX },
    tableWidth: 'auto',
    // Fonte menor quando há muitos candidatos (colunas estreitas) — até 10 cabem legíveis.
    styles: { fontSize: nCand > 6 ? 7 : 8, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [0, 16, 158] }, // #00109E darkBlue
    columnStyles,
  })

  doc.save('comparativo-candidatos.pdf')
}
