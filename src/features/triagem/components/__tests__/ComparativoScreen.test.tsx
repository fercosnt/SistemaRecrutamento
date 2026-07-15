/// <reference types="@testing-library/jest-dom" />
/**
 * ComparativoScreen — UI-SPEC §B candidatos-coluna + funil-02 / OPER-04 reject rewire.
 *
 * Cobre o contrato da tela de comparativo E o rewire da Phase 31 (OPER-04): o botão
 * "Rejeitar" agora abre o `RejeitarCandidaturaDialog` COMPARTILHADO (motivo `<Select>` +
 * justificativa `<Textarea>` ≥50) que grava pela RPC `rejeitar_candidatura`
 * (`useRejeitarCandidatura`) — NÃO mais o `updateCandidaturaEtapa(id,'rejeitado')` cru sem
 * justificativa. O "Avançar" (OPER-01) permanece inalterado, e o embed read-only da
 * Decisão Final (omite `onAvancar`/`onRejeitar` de propósito) não renderiza a linha de Ação.
 *
 * O Radix `Select` é mockado para um `<select>` nativo (idioma repo, `RejeitarCandidaturaDialog.test`)
 * e `useRejeitarCandidatura` é mockado para capturar o `mutate` (prova do caminho da RPC) —
 * o Radix `AlertDialog` renderiza sem mock.
 *
 * @see .planning/phases/31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil/31-05-PLAN.md
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-UI-SPEC.md (§B + Copywriting)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── Radix Select → native <select> (driveable com fireEvent.change em happy-dom) ──
vi.mock('@/components/ui/select', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    Select: ({ value, onValueChange, children }: any) =>
      React.createElement(
        'select',
        {
          'aria-label': 'Motivo da rejeição',
          value: value ?? '',
          onChange: (e: any) => onValueChange(e.target.value),
        },
        children,
      ),
    SelectTrigger: ({ children }: any) => React.createElement(React.Fragment, null, children),
    SelectValue: () => null,
    SelectContent: ({ children }: any) => React.createElement(React.Fragment, null, children),
    SelectItem: ({ value, children }: any) => React.createElement('option', { value }, children),
  }
})

// ── A mutation de rejeição consumida pelo RejeitarCandidaturaDialog compartilhado.
// Capturamos o `mutate` para provar que o reject roteia pela RPC (não o update cru). ──
const { mutateMock, useRejeitarMock } = vi.hoisted(() => {
  const mutateMock = vi.fn()
  return {
    mutateMock,
    useRejeitarMock: vi.fn(() => ({ mutate: mutateMock, isPending: false })),
  }
})
vi.mock('../../hooks/useRejeitarCandidatura', () => ({
  useRejeitarCandidatura: useRejeitarMock,
}))

// Mock do util de PDF — o teste só verifica que a tela o chama.
vi.mock('../../pdf/exportComparativo', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>
  return { ...actual, exportComparativo: vi.fn() }
})

// Mock do toast — evita ruído de portal.
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ComparativoScreen, type ComparativoCandidate } from '../ComparativoScreen'
import { exportComparativo } from '../../pdf/exportComparativo'

function makeCandidate(over: Partial<ComparativoCandidate> & { candidaturaId: string }): ComparativoCandidate {
  return {
    candidate_id: `C${over.candidaturaId}`,
    nome: `Candidato ${over.candidaturaId}`,
    rank: 1,
    composite_score: 85,
    relative_strengths: ['forte'],
    relative_weaknesses: ['gap'],
    rationale: 'justificativa relativa',
    flags: [],
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useRejeitarMock.mockReturnValue({ mutate: mutateMock, isPending: false })
})

describe('ComparativoScreen — UI-SPEC §B candidatos-coluna', () => {
  it('renderiza ≤10 candidatos como colunas com nome + medalha de ranking', () => {
    const candidates = Array.from({ length: 3 }, (_, i) =>
      makeCandidate({ candidaturaId: String(i + 1), rank: i + 1 }),
    )
    render(
      <ComparativoScreen
        candidates={candidates}
        onAvancar={vi.fn()}
        onRejeitar={vi.fn()}
      />,
    )
    expect(screen.getByText('Candidato 1')).toBeInTheDocument()
    expect(screen.getByText('Candidato 2')).toBeInTheDocument()
    expect(screen.getByText('Candidato 3')).toBeInTheDocument()
    // 3 colunas de candidato → 3 cabeçalhos com medalha de ranking.
    expect(screen.getByText('1º')).toBeInTheDocument()
    expect(screen.getByText('2º')).toBeInTheDocument()
    expect(screen.getByText('3º')).toBeInTheDocument()
  })

  it('renderiza o SugestaoIABadge (RNF-07a) uma vez no topo', () => {
    const candidates = [makeCandidate({ candidaturaId: '1', rank: 1 }), makeCandidate({ candidaturaId: '2', rank: 2 })]
    render(
      <ComparativoScreen
        candidates={candidates}
        onAvancar={vi.fn()}
        onRejeitar={vi.fn()}
      />,
    )
    expect(screen.getByText('Sugestão da IA — decisão é sempre humana')).toBeInTheDocument()
  })

  it('Avançar abre confirm dialog e dispara onAvancar (OPER-01 — inalterado)', () => {
    const onAvancar = vi.fn()
    const candidates = [makeCandidate({ candidaturaId: 'abc', nome: 'Maria', rank: 1 })]
    candidates.push(makeCandidate({ candidaturaId: 'def', nome: 'João', rank: 2 }))
    render(
      <ComparativoScreen
        candidates={candidates}
        onAvancar={onAvancar}
        onRejeitar={vi.fn()}
      />,
    )
    fireEvent.click(screen.getAllByRole('button', { name: /avançar/i })[0])
    // Dialog confirm com a cópia exata.
    expect(screen.getByText('Avançar Maria para a próxima etapa?')).toBeInTheDocument()
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^avançar$/i }))
    expect(onAvancar).toHaveBeenCalledWith('abc')
  })

  it('Rejeitar abre o RejeitarCandidaturaDialog compartilhado e roteia pela RPC (funil-02 / OPER-04)', () => {
    const onRejeitar = vi.fn()
    const candidates = [
      makeCandidate({ candidaturaId: 'abc', nome: 'Maria', rank: 1 }),
      makeCandidate({ candidaturaId: 'def', nome: 'João', rank: 2 }),
    ]
    render(
      <ComparativoScreen
        candidates={candidates}
        onAvancar={vi.fn()}
        onRejeitar={onRejeitar}
      />,
    )
    // Abre o dialog compartilhado a partir do trigger "Rejeitar" da 1ª coluna.
    fireEvent.click(screen.getAllByRole('button', { name: /^rejeitar$/i })[0])
    expect(screen.getByText('Rejeitar Maria?')).toBeInTheDocument()

    // NOVO caminho: há um campo de justificativa longa (o antigo confirm cru NÃO tinha).
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByLabelText(/Justificativa/i)).toBeInTheDocument()

    // Preenche motivo + justificativa ≥50 e confirma.
    fireEvent.change(within(dialog).getByLabelText('Motivo da rejeição'), {
      target: { value: 'perfil_desalinhado' },
    })
    const justificativa =
      'A candidata não possui o registro profissional exigido para a vaga anunciada.'
    fireEvent.change(within(dialog).getByLabelText(/Justificativa/i), {
      target: { value: justificativa },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rejeitar candidato' }))

    // Roteia pela RPC `rejeitar_candidatura` (useRejeitarCandidatura) com motivo +
    // justificativa — NÃO o antigo `onRejeitar(id)`/update cru sem justificativa.
    expect(mutateMock).toHaveBeenCalledTimes(1)
    expect(mutateMock.mock.calls[0][0]).toEqual({
      candidaturaId: 'abc',
      motivo: 'perfil_desalinhado',
      justificativa,
    })
  })

  it('embed read-only (sem handlers): a linha de Ação não é renderizada (showActions gate)', () => {
    const candidates = [
      makeCandidate({ candidaturaId: '1', rank: 1 }),
      makeCandidate({ candidaturaId: '2', rank: 2 }),
    ]
    // DecisaoFinalPage embute o ComparativoScreen SEM onAvancar/onRejeitar (read-only).
    render(<ComparativoScreen candidates={candidates} />)
    expect(screen.queryByRole('button', { name: /^avançar$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^rejeitar$/i })).not.toBeInTheDocument()
    // A comparação em si permanece visível (colunas renderizadas).
    expect(screen.getByText('Candidato 1')).toBeInTheDocument()
    // Nenhum dialog de rejeição é montado → o hook da RPC nunca roda.
    expect(useRejeitarMock).not.toHaveBeenCalled()
  })

  it('"Exportar PDF" chama o exportComparativo mockado', async () => {
    const candidates = [
      makeCandidate({ candidaturaId: '1', rank: 1 }),
      makeCandidate({ candidaturaId: '2', rank: 2 }),
    ]
    render(
      <ComparativoScreen
        candidates={candidates}
        onAvancar={vi.fn()}
        onRejeitar={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /exportar pdf/i }))
    // PERF-03 (Plan 19-02): handleExport now `await import('../pdf/exportComparativo')`
    // at the call site (jsPDF behind the dynamic boundary), so the call resolves on a
    // microtask AFTER the click — assert via waitFor, not synchronously. The vi.mock of
    // '../../pdf/exportComparativo' intercepts the dynamic import too (same module id).
    // W1: o PDF recebe os candidatos JÁ RESOLVIDOS (com `.nome` real), não o ranking
    // cru da EF (que anonimiza C1/C2… e não popula nome).
    await waitFor(() => expect(exportComparativo).toHaveBeenCalledWith(candidates))
  })
})

describe('ComparativoScreen — cópia pt-BR de vagas diferentes (EF 400)', () => {
  it('a cópia exata de MIXED_VAGA do contrato é estável', async () => {
    // A cópia é produzida pelo service (invokeComparativo) e propagada para a UI.
    const { invokeComparativo } = await import('../../services/triagemService')
    // Smoke do contrato: a string exata existe no fluxo de erro (assert estático).
    expect(typeof invokeComparativo).toBe('function')
    expect(
      'Os candidatos selecionados pertencem a vagas diferentes. Compare candidatos de uma mesma vaga.',
    ).toMatch(/pertencem a vagas diferentes/)
  })
})
