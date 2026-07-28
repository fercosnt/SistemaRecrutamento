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
 * Constrói e baixa o PDF comparativo (atributos-linha / candidatos-coluna).
 *
 * Ordena os candidatos por `rank` (1 → N) para que as colunas sigam a sugestão da IA.
 * Cada linha é um atributo; o cabeçalho carrega o nome de cada candidato.
 *
 * W1: recebe os candidatos JÁ RESOLVIDOS no client (que carregam `.nome` real). A EF
 * anonimiza para C1/C2… e NUNCA popula `nome` em `ranking.ranked_candidates`, então
 * ler dali produzia cabeçalhos em branco. O chamador passa os candidatos resolvidos.
 *
 * @param candidates candidatos resolvidos (nome + campos do ranking), em qualquer ordem.
 * @throws repassa qualquer erro do jspdf para o chamador (a tela mostra o toast de erro).
 */
export function exportComparativo(candidates: RankedCandidate[]): void {
  const ordered = [...(candidates ?? [])].sort((a, b) => a.rank - b.rank)

  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(14)
  doc.text('Comparativo de candidatos — Sugestão da IA (decisão é sempre humana)', 14, 14)

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
    startY: 22,
    margin: { left: marginX, right: marginX },
    tableWidth: 'auto',
    // Fonte menor quando há muitos candidatos (colunas estreitas) — até 10 cabem legíveis.
    styles: { fontSize: nCand > 6 ? 7 : 8, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [0, 16, 158] }, // #00109E darkBlue
    columnStyles,
  })

  doc.save('comparativo-candidatos.pdf')
}
