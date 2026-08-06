/**
 * Phase 10 / Plan 10-01 Task 3 — Wave 0 RED scaffold for `TriagemTable.tsx`
 * (TRIAGEM-02 dense panel) + the shared `SugestaoIABadge` (RNF-07a).
 *
 * RED against the not-yet-existing `../TriagemTable`. The static import below
 * makes Vitest fail with "Cannot find module '../TriagemTable'" — the calibrated
 * Wave-0 RED signal. The component lands in a later Phase-10 wave and flips this
 * GREEN.
 *
 * Assertions encode the UI-SPEC §A/§C contract exactly:
 *  - Score band thresholds: 70-100 verde, 40-69 amarelo, 0-39 vermelho,
 *    null → "—" sem-análise. The band shows the NUMBER plus the color.
 *  - "Comparar" disabled below 2 selected, enabled at 2-10, checkboxes disabled
 *    past 10.
 *  - SugestaoIABadge text "Sugestão da IA — decisão é sempre humana" rendered.
 *  - A falhou row shows a visible "Reprocessar análise" text label (not tooltip-only).
 *
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-UI-SPEC.md (§A bands 70/40, compare-bar gating, §C badge)
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-01-PLAN.md (Task 3 — TRIAGEM-02 / RNF-07a)
 */
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

// RED: '../TriagemTable' does not exist yet → "Cannot find module".
import { TriagemTable, SugestaoIABadge } from '../TriagemTable'

/**
 * Phase 17 (D-04): the "Ver Perfil" link is now an SPA <Link> (was a raw <a href>), so the
 * table must render inside a Router context. Wrap in MemoryRouter (mirrors the RHSidebar.admin
 * / RoleGuard render-test analog) — keeps every existing assertion intact.
 */
function renderTable(ui: ReactElement) {
  return render(<MemoryRouter initialEntries={['/rh/candidatos']}>{ui}</MemoryRouter>)
}

type Row = {
  id: string
  candidato: { id: string; nome_completo: string }
  etapa_atual: string
  status: string
  created_at: string
  analise: {
    score_match: number | null
    pontos_fortes: string[]
    gaps: string[]
    flags: string[]
    status: 'sucesso' | 'falhou' | null
  } | null
}

function makeRow(over: Partial<Row> & { id: string }): Row {
  return {
    candidato: { id: `cand-${over.id}`, nome_completo: `Candidato ${over.id}` },
    etapa_atual: 'triagem',
    status: 'aguardando_resposta',
    created_at: '2026-06-01T00:00:00Z',
    analise: { score_match: 85, pontos_fortes: ['a'], gaps: ['b'], flags: [], status: 'sucesso' },
    ...over,
  } as Row
}

const noop = () => {}

describe('TriagemTable — TRIAGEM-02 score bands (UI-SPEC §A thresholds 70/40)', () => {
  it('score 85 renders the verde (forte) band', () => {
    renderTable(
      <TriagemTable
        rows={[makeRow({ id: '1', analise: { score_match: 85, pontos_fortes: [], gaps: [], flags: [], status: 'sucesso' } })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    const chip = screen.getByText('85')
    expect(chip.className).toMatch(/green/)
  })

  it('score 55 renders the amarelo (médio) band', () => {
    renderTable(
      <TriagemTable
        rows={[makeRow({ id: '2', analise: { score_match: 55, pontos_fortes: [], gaps: [], flags: [], status: 'sucesso' } })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    const chip = screen.getByText('55')
    expect(chip.className).toMatch(/yellow/)
  })

  it('score 20 renders the vermelho (fraco) band', () => {
    renderTable(
      <TriagemTable
        rows={[makeRow({ id: '3', analise: { score_match: 20, pontos_fortes: [], gaps: [], flags: [], status: 'sucesso' } })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    const chip = screen.getByText('20')
    expect(chip.className).toMatch(/red/)
  })

  it('null score renders the "—" sem-análise band', () => {
    renderTable(
      <TriagemTable
        rows={[makeRow({ id: '4', analise: null })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('TriagemTable — TRIAGEM-02 compare-bar gating (2-10)', () => {
  const rows = Array.from({ length: 12 }, (_, i) => makeRow({ id: String(i) }))

  it('"Comparar" is disabled with fewer than 2 selected', () => {
    renderTable(
      <TriagemTable rows={rows} selectedIds={['0']} onToggleSelect={noop} onCompare={noop} onReprocess={noop} />,
    )
    expect(screen.getByRole('button', { name: /comparar/i })).toBeDisabled()
  })

  it('"Comparar" is enabled with 2-10 selected', () => {
    renderTable(
      <TriagemTable rows={rows} selectedIds={['0', '1']} onToggleSelect={noop} onCompare={noop} onReprocess={noop} />,
    )
    expect(screen.getByRole('button', { name: /comparar/i })).toBeEnabled()
  })

  it('checkboxes are disabled once 10 are selected', () => {
    const ten = Array.from({ length: 10 }, (_, i) => String(i))
    renderTable(
      <TriagemTable rows={rows} selectedIds={ten} onToggleSelect={noop} onCompare={noop} onReprocess={noop} />,
    )
    // Row 11 (not selected) must be disabled because the cap is reached.
    const checkboxes = screen.getAllByRole('checkbox')
    const unselectedDisabled = checkboxes.some((c) => (c as HTMLInputElement).disabled)
    expect(unselectedDisabled).toBe(true)
  })
})

describe('TriagemTable — RNF-07a guardrails + reprocess affordance', () => {
  it('renders the SugestaoIABadge copy "Sugestão da IA — decisão é sempre humana"', () => {
    render(<SugestaoIABadge />)
    expect(screen.getByText('Sugestão da IA — decisão é sempre humana')).toBeInTheDocument()
  })

  it('a falhou row shows a visible "Reprocessar análise" text label (not tooltip-only)', () => {
    renderTable(
      <TriagemTable
        rows={[makeRow({ id: '9', analise: { score_match: null, pontos_fortes: [], gaps: [], flags: [], status: 'falhou' } })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={vi.fn()}
      />,
    )
    expect(screen.getByText('Reprocessar análise')).toBeInTheDocument()
  })
})

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * Phase 45 / Plano 45-09 — Invariante 9: o silêncio também é proibido.
 *
 * Uma candidatura que hoje soma na etapa e amanhã não está lá é um recrutador
 * agendando entrevista com quem saiu. Por isso o encerramento a pedido é coluna
 * ADITIVA (`encerrada_a_pedido_em`) e NUNCA `deleted_at` — as cinco leituras de RH
 * filtram `.is('deleted_at', null)`, e um soft delete apagaria a linha de todas as
 * telas sem uma palavra.
 *
 * ⚠ BACKSTOP E10·long-text — o risco é o DESAPARECIMENTO SILENCIOSO, e por isso a
 * asserção exige a PALAVRA no render. Uma asserção de contagem de linhas passaria
 * com a linha sumida; uma asserção de "a tabela não quebrou" também.
 * ═══════════════════════════════════════════════════════════════════════════
 */
describe('Phase 45 — a candidatura encerrada a pedido é LEGÍVEL no RH', () => {
  const noopFn = () => {}

  function renderComEncerramento(encerrada: string | null) {
    return renderTable(
      <TriagemTable
        rows={[{ ...makeRow({ id: 'enc-1' }), encerrada_a_pedido_em: encerrada } as never]}
        selectedIds={[]}
        onToggleSelect={noopFn}
        onCompare={noopFn}
        onReprocess={noopFn}
      />,
    )
  }

  it('exige a PALAVRA «Encerrada a pedido do candidato» quando a coluna é não-nula', () => {
    renderComEncerramento('2026-08-06T12:00:00Z')
    expect(screen.getByText('Encerrada a pedido do candidato')).toBeInTheDocument()
  })

  it('a linha CONTINUA na tabela — o candidato não some do funil', () => {
    renderComEncerramento('2026-08-06T12:00:00Z')
    expect(screen.getByText('Candidato enc-1')).toBeInTheDocument()
  })

  it('candidatura em andamento NÃO exibe o estado', () => {
    renderComEncerramento(null)
    expect(screen.queryByText('Encerrada a pedido do candidato')).not.toBeInTheDocument()
  })

  it('tratamento NEUTRO — não é alarme: ninguém errou', () => {
    renderComEncerramento('2026-08-06T12:00:00Z')
    const estado = screen.getByText('Encerrada a pedido do candidato')
    // Âmbar/vermelho aqui competiriam com os eixos de SLA das Phases 42 e 44.
    expect(estado.className).not.toMatch(/red|amber|yellow|destructive/)
    expect(estado.className).toMatch(/text-white\/80/)
  })

  it('NENHUMA ação é oferecida — nem reabrir, nem contatar, nem reverter', () => {
    renderComEncerramento('2026-08-06T12:00:00Z')
    for (const btn of screen.queryAllByRole('button')) {
      expect(btn.textContent ?? '').not.toMatch(/reabrir|reverter|contatar|desfazer/i)
    }
  })

  it('a política de dados do titular NÃO é informação de funil', () => {
    renderComEncerramento('2026-08-06T12:00:00Z')
    const texto = document.body.textContent ?? ''
    // Nem data de exclusão, nem contagem regressiva, nem a existência do pedido.
    expect(texto).not.toMatch(/exclusão|exclusao|será apagad|serão apagad/i)
    expect(texto).not.toMatch(/\bem \d+ dias?\b/i)
    expect(texto).not.toMatch(/pedido de exclus/i)
  })
})
