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
import {
  TriagemTable,
  SugestaoIABadge,
  COPY_TETO_COMPARATIVO,
  COPY_PISO_COMPARATIVO,
} from '../TriagemTable'
// Phase 49 / plano 49-22 — D-59: o teto vem da constante da EF, e o TESTE também a lê.
// Um literal aqui voltaria a ser a segunda verdade que o D-59 removeu: o teste passaria
// a afirmar um número que o servidor não usa mais.
import {
  COMPARATIVO_MAX_CANDIDATOS,
  COMPARATIVO_MIN_CANDIDATOS,
} from '../../../../../supabase/functions/_shared/comparativo-config'

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

/*
 * ⚠ Phase 49 / plano 49-22 — D-59: o título deste `describe` dizia «(2-10)» e a asserção
 * de teto selecionava DEZ. O teto real passou a ser `COMPARATIVO_MAX_CANDIDATOS` (4, medido
 * em 49-08 contra o `max_tokens` do modelo). As asserções foram reescritas DE PROPÓSITO para
 * ler a constante — não para acomodar o código novo, mas porque um literal aqui reintroduz
 * exatamente a segunda verdade que o D-59 removeu: o teste afirmaria um teto que a Edge
 * Function não usa, e continuaria verde depois da próxima mudança do número.
 */
describe('TriagemTable — TRIAGEM-02 compare-bar gating (pela constante do D-59)', () => {
  const rows = Array.from({ length: COMPARATIVO_MAX_CANDIDATOS + 2 }, (_, i) =>
    makeRow({ id: String(i) }),
  )

  it('"Comparar" is disabled with fewer than the mínimo selected', () => {
    renderTable(
      <TriagemTable rows={rows} selectedIds={['0']} onToggleSelect={noop} onCompare={noop} onReprocess={noop} />,
    )
    expect(screen.getByRole('button', { name: /comparar/i })).toBeDisabled()
  })

  it('"Comparar" is enabled between o mínimo e o teto', () => {
    const noMinimo = Array.from({ length: COMPARATIVO_MIN_CANDIDATOS }, (_, i) => String(i))
    renderTable(
      <TriagemTable rows={rows} selectedIds={noMinimo} onToggleSelect={noop} onCompare={noop} onReprocess={noop} />,
    )
    expect(screen.getByRole('button', { name: /comparar/i })).toBeEnabled()
  })

  it('checkboxes ficam desabilitados ao alcançar o teto da constante', () => {
    const noTeto = Array.from({ length: COMPARATIVO_MAX_CANDIDATOS }, (_, i) => String(i))
    renderTable(
      <TriagemTable rows={rows} selectedIds={noTeto} onToggleSelect={noop} onCompare={noop} onReprocess={noop} />,
    )
    // As duas linhas além do teto (não selecionadas) ficam desabilitadas.
    const checkboxes = screen.getAllByRole('checkbox')
    const desabilitados = checkboxes.filter((c) => (c as HTMLInputElement).disabled)
    expect(desabilitados).toHaveLength(rows.length - COMPARATIVO_MAX_CANDIDATOS)
  })

  it('o contador da barra mostra o teto da constante, nunca o antigo 10', () => {
    renderTable(
      <TriagemTable rows={rows} selectedIds={['0']} onToggleSelect={noop} onCompare={noop} onReprocess={noop} />,
    )
    const texto = document.body.textContent ?? ''
    expect(texto).toContain(`1 de ${COMPARATIVO_MAX_CANDIDATOS} selecionados`)
    expect(texto).not.toMatch(/de 10 selecionados/)
  })

  /*
   * ⚠ As duas frases de gating vivem em `TooltipContent`, que o Radix NÃO monta enquanto o
   * tooltip está fechado — uma asserção sobre `document.body.textContent` passaria com a
   * frase ERRADA no código, porque ela simplesmente não está no DOM. Por isso a asserção é
   * sobre a CONSTANTE de cópia exportada: é o que prova que o número é montado, e não
   * escrito à mão. (O contador da barra, acima, é a prova de RENDER do mesmo número.)
   */
  it('as frases de teto e de piso são MONTADAS das constantes — nenhum número à mão', () => {
    expect(COPY_TETO_COMPARATIVO).toContain(String(COMPARATIVO_MAX_CANDIDATOS))
    expect(COPY_TETO_COMPARATIVO).not.toMatch(/\b10\b/)
    expect(COPY_PISO_COMPARATIVO).toContain(String(COMPARATIVO_MIN_CANDIDATOS))
  })
})

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * Phase 49 / plano 49-22 — D-34: candidatura ENCERRADA não entra no comparativo.
 *
 * O predicado é o canônico (`candidaturaEncerrada(etapa, status)`, espelho TS da função
 * SQL do 48-01) — nunca uma allowlist local. E a distinção que importa:
 *
 *   · knockout (`inscricao`/`rejeitado`) ⇒ ENCERRADA: selo + checkbox travado;
 *   · retirada a pedido (`encerrada_a_pedido_em` com status em andamento) ⇒ NÃO encerrada,
 *     continua selecionável (invariante da Phase 45 / D-56). Colapsar as duas faria a tela
 *     tratar um direito do titular como um desfecho do funil.
 * ═══════════════════════════════════════════════════════════════════════════
 */
describe('Phase 49 — a seleção do comparativo não oferece candidatura encerrada (D-34)', () => {
  it('knockout (inscricao/rejeitado) ganha o selo «Encerrada» e o checkbox travado', () => {
    renderTable(
      <TriagemTable
        rows={[makeRow({ id: 'ko', etapa_atual: 'inscricao', status: 'rejeitado' })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    const selo = screen.getByTestId('triagem-selo-encerrada')
    expect(selo).toBeInTheDocument()
    expect(selo.textContent).toBe('Encerrada')
    // Neutro: «Encerrada» não afirma se acabou bem ou mal (a mesma decisão do 49-05).
    expect(selo.className).not.toMatch(/red|green|amber|yellow|destructive/)
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true)
  })

  it('status `finalizado` em etapa de trabalho também é encerrada (o 3º estado terminal)', () => {
    renderTable(
      <TriagemTable
        rows={[makeRow({ id: 'fin', etapa_atual: 'triagem', status: 'finalizado' })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    expect(screen.getByTestId('triagem-selo-encerrada')).toBeInTheDocument()
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true)
  })

  it('clicar no checkbox de uma encerrada NÃO chama onToggleSelect', () => {
    const onToggle = vi.fn()
    renderTable(
      <TriagemTable
        rows={[makeRow({ id: 'ko2', etapa_atual: 'rejeitado', status: 'rejeitado' })]}
        selectedIds={[]}
        onToggleSelect={onToggle}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    screen.getByRole('checkbox').click()
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('retirada a pedido CONTINUA selecionável e SEM selo de encerrada (D-34 / Phase 45)', () => {
    const onToggle = vi.fn()
    renderTable(
      <TriagemTable
        rows={[
          {
            ...makeRow({ id: 'ret', etapa_atual: 'triagem', status: 'em_analise' }),
            encerrada_a_pedido_em: '2026-08-06T12:00:00Z',
          } as never,
        ]}
        selectedIds={[]}
        onToggleSelect={onToggle}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    expect(screen.queryByTestId('triagem-selo-encerrada')).not.toBeInTheDocument()
    const cb = screen.getByRole('checkbox') as HTMLInputElement
    expect(cb.disabled).toBe(false)
    cb.click()
    expect(onToggle).toHaveBeenCalledWith('ret')
  })

  it('candidatura em andamento não ganha selo nem trava', () => {
    renderTable(
      <TriagemTable
        rows={[makeRow({ id: 'ok', etapa_atual: 'triagem', status: 'em_analise' })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    expect(screen.queryByTestId('triagem-selo-encerrada')).not.toBeInTheDocument()
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(false)
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
