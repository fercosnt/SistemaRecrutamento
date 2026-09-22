/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 25 / Plan 25-02 Task 3 — UpdateStatusModal reject-reroute regression net (FUNIL-02).
 *
 * The modal's reject transition used to write a raw status-only update
 * (useUpdateCandidaturaStatus) with a non-empty (but unbounded) motivo — a path that
 * bypassed the audit trail (A9). This suite pins the corrected contract:
 *  - a reject requires a ≥50-char justificativa; the confirm button stays disabled
 *    until the justificativa is valid (mirrors the DB CHECK / registrar_decisao floor);
 *  - confirming a reject routes through registrar_decisao (useRegistrarDecisao) with
 *    { candidaturaId, decisao:'rejeitado', justificativa } — NOT the raw status hook;
 *  - a NON-reject transition keeps the existing useUpdateCandidaturaStatus path.
 *
 * The Radix Select/Dialog primitives are mocked to native equivalents — this suite
 * installs no pointer/scrollIntoView polyfills, and the behavior under test is the
 * modal's routing/gating logic, not the third-party widgets.
 *
 * @see src/features/decisao/hooks/useRegistrarDecisao.ts (the audited write path)
 * @see .planning/phases/25-corre-o-do-funil-lado-rh-enums-colunas-contratos/25-02-PLAN.md (Task 3)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Radix Select → native <select> (driveable with fireEvent.change in happy-dom).
vi.mock('@/components/ui/select', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    Select: ({ value, onValueChange, disabled, children }: any) =>
      React.createElement(
        'select',
        {
          'data-testid': 'status-select',
          value: value ?? '',
          disabled,
          onChange: (e: any) => onValueChange(e.target.value),
        },
        children,
      ),
    SelectTrigger: ({ children }: any) => React.createElement(React.Fragment, null, children),
    SelectValue: ({ placeholder }: any) =>
      React.createElement('option', { value: '' }, placeholder ?? ''),
    SelectContent: ({ children }: any) => React.createElement(React.Fragment, null, children),
    SelectItem: ({ value, children }: any) =>
      React.createElement('option', { value }, children),
  }
})

// Radix Dialog → plain container gated on `open` (avoids portal/focus-scope flakiness).
vi.mock('@/components/ui/dialog', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Passthrough = ({ children }: any) => React.createElement(React.Fragment, null, children)
  return {
    Dialog: ({ open, children }: any) => (open ? React.createElement('div', null, children) : null),
    DialogContent: ({ children }: any) => React.createElement('div', null, children),
    DialogDescription: Passthrough,
    DialogFooter: Passthrough,
    DialogHeader: Passthrough,
    DialogTitle: Passthrough,
  }
})

const mutateStatus = vi.fn()
const mutateReject = vi.fn()
vi.mock('@/features/vagas/hooks/useCandidaturas', () => ({
  useUpdateCandidaturaStatus: () => ({ mutate: mutateStatus, isPending: false }),
}))
vi.mock('@/features/decisao/hooks/useRegistrarDecisao', () => ({
  useRegistrarDecisao: () => ({ mutate: mutateReject, isPending: false }),
}))

import { UpdateStatusModal } from '../UpdateStatusModal'

const LONG_JUSTIFICATIVA =
  'Após a entrevista técnica o perfil não atende aos requisitos essenciais da vaga neste momento.'

function renderModal(props?: Partial<React.ComponentProps<typeof UpdateStatusModal>>) {
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  render(
    <UpdateStatusModal
      open
      onOpenChange={onOpenChange}
      candidaturaId="cand-1"
      candidatoNome="Ana"
      statusAtual="em_analise"
      onSuccess={onSuccess}
      {...props}
    />,
  )
  return { onOpenChange, onSuccess }
}

function selectStatus(value: string) {
  fireEvent.change(screen.getByTestId('status-select'), { target: { value } })
}

function salvarButton() {
  return screen.getByRole('button', { name: /salvar/i })
}

describe('UpdateStatusModal — reject routes through registrar_decisao with ≥50-char justificativa (FUNIL-02)', () => {
  beforeEach(() => {
    mutateStatus.mockReset()
    mutateReject.mockReset()
  })

  it('keeps the confirm button disabled until the reject justificativa reaches 50 chars', () => {
    renderModal()
    selectStatus('rejeitado')
    // No justificativa yet → disabled.
    expect(salvarButton()).toBeDisabled()

    // Too short (<50) → still disabled.
    fireEvent.change(screen.getByLabelText(/motivo da rejeição/i), {
      target: { value: 'curto demais' },
    })
    expect(salvarButton()).toBeDisabled()

    // ≥50 chars → enabled.
    fireEvent.change(screen.getByLabelText(/motivo da rejeição/i), {
      target: { value: LONG_JUSTIFICATIVA },
    })
    expect(salvarButton()).toBeEnabled()
  })

  it('confirming a reject calls registrar_decisao (not the raw status hook)', () => {
    renderModal()
    selectStatus('rejeitado')
    fireEvent.change(screen.getByLabelText(/motivo da rejeição/i), {
      target: { value: LONG_JUSTIFICATIVA },
    })
    fireEvent.click(salvarButton())

    expect(mutateReject).toHaveBeenCalledTimes(1)
    expect(mutateReject).toHaveBeenCalledWith(
      expect.objectContaining({
        candidaturaId: 'cand-1',
        decisao: 'rejeitado',
        justificativa: LONG_JUSTIFICATIVA,
      }),
      expect.anything(),
    )
    expect(mutateStatus).not.toHaveBeenCalled()
  })

  it('a non-reject transition keeps the existing useUpdateCandidaturaStatus path', () => {
    renderModal()
    selectStatus('aprovado_proxima')
    fireEvent.click(salvarButton())

    expect(mutateStatus).toHaveBeenCalledTimes(1)
    expect(mutateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        candidaturaId: 'cand-1',
        status_candidatura: 'aprovado_proxima',
      }),
    )
    expect(mutateReject).not.toHaveBeenCalled()
  })
})

// ── 48-16 (JORN-15 · D-09) — o modal não promete e-mail que nenhum código envia ─────────
//
// A opção «Notificar candidato por email» não tinha efeito: nenhum código a honra desde a
// aposentadoria do n8n (P39). O modal passa a dizer a verdade — mudar o status ali não envia
// e-mail; o candidato é avisado quando uma decisão é registrada ou quando há algo para ele
// fazer — e o payload deixa de carregar `notificar_candidato`.
describe('UpdateStatusModal — sem promessa de e-mail sem código (48-16 / JORN-15)', () => {
  beforeEach(() => {
    mutateStatus.mockReset()
    mutateReject.mockReset()
  })

  it('não oferece a opção de notificar nem promete e-mail pela mudança de status', () => {
    renderModal()
    expect(screen.queryByText(/notificar candidato por email/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/receberá um email informando sobre a mudança de status/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('diz a verdade: mudar o status não envia e-mail; decisão e ação pedida avisam', () => {
    renderModal()
    expect(
      screen.getByText(
        'Mudar o status aqui não envia e-mail ao candidato. Ele é avisado por e-mail quando uma decisão é registrada ou quando há algo para ele fazer, e acompanha o resto pelo painel.',
      ),
    ).toBeInTheDocument()
  })

  it('o payload de status não carrega mais notificar_candidato', () => {
    renderModal()
    selectStatus('aprovado_proxima')
    fireEvent.click(salvarButton())
    expect(mutateStatus).toHaveBeenCalledTimes(1)
    expect(mutateStatus.mock.calls[0][0]).not.toHaveProperty('notificar_candidato')
  })

  it('a ajuda da rejeição não diz que o motivo vai ao candidato (a cópia enviada é neutra)', () => {
    renderModal()
    selectStatus('rejeitado')
    expect(screen.queryByText(/será enviado ao candidato/i)).not.toBeInTheDocument()
    expect(screen.getByText(/não é enviado ao candidato/i)).toBeInTheDocument()
  })
})

// ── 49-05 (JORN-34 · D-67) — o modal não reabre nem encerra candidatura só por status ───────
//
// Duas transições da `VALID_TRANSITIONS` escreviam SÓ o status e por isso gravavam ZERO
// histórico: `avancar_etapa` sai no early-return quando a etapa não muda (varredura C1 #10/#11
// do `49-VARREDURA-KICKOFF.md`).
//
//   - `rejeitado → em_analise` REABRIA uma candidatura encerrada, sem justificativa e sem
//     trilha. Reabrir tem caminho próprio e auditado desde a Phase 48: o pedido de revisão da
//     decisão (`responder_revisao_decisao`, D-01), que é transição SANCIONADA.
//   - `aprovado_proxima → finalizado` ENCERRAVA pelo mesmo atalho — e é a origem plausível das
//     3 linhas `status='finalizado'` em etapa de trabalho medidas em PROD, as mesmas que o
//     Kanban passou a selar como «Encerrada» na Task 1 deste plano.
//
// ⚠ A tela deixa de OFERECER; a defesa no banco (a trava do `avancar_etapa`) é o plano 49-06.
describe('UpdateStatusModal — sem reabrir nem encerrar por atalho de status (JORN-34 · D-67)', () => {
  beforeEach(() => {
    mutateStatus.mockReset()
    mutateReject.mockReset()
  })

  it('status atual `rejeitado`: nenhuma opção de novo status é oferecida', () => {
    renderModal({ statusAtual: 'rejeitado' })
    // Lista vazia → o select não é renderizado. Um select presente e vazio convida ao clique
    // e não responde; a frase neutra abaixo é o que substitui o convite.
    expect(screen.queryByTestId('status-select')).toBeNull()
    // E em particular: `em_analise` não é oferecido em lugar nenhum da tela — era a
    // reabertura sem trilha.
    expect(screen.queryByText('Em Análise')).toBeNull()
    // Nem o botão de salvar fica acionável.
    expect(salvarButton()).toBeDisabled()
  })

  it('status atual `rejeitado`: a tela diz por quê, e aponta o caminho auditado', () => {
    renderModal({ statusAtual: 'rejeitado' })
    // Frase neutra em vez de um select vazio + «Este status é final», que era falso para
    // `rejeitado` (há caminho — só não é este).
    expect(screen.getByText(/não pode ser alterado por aqui/i)).toBeInTheDocument()
    expect(screen.getByText(/pedido de revisão da decisão/i)).toBeInTheDocument()
    // Sem promessa de reabertura ao candidato, sem «teste psicológico», sem endereço de canal.
    expect(screen.queryByText(/psicológic/i)).toBeNull()
    expect(screen.queryByText(/privacidade@/i)).toBeNull()
  })

  it('status atual `aprovado_proxima`: oferece `em_analise` e `rejeitado`, NÃO `finalizado`', () => {
    renderModal({ statusAtual: 'aprovado_proxima' })
    const destinos = Array.from(
      screen.getByTestId('status-select').querySelectorAll('option'),
    )
      .map((o) => (o as HTMLOptionElement).value)
      .filter((v) => v !== '')
    expect(destinos).toContain('em_analise')
    expect(destinos).toContain('rejeitado')
    expect(destinos).not.toContain('finalizado')
  })

  it('`aguardando_resposta` e `em_analise` continuam oferecendo o que oferecem hoje', () => {
    for (const [atual, esperado] of [
      ['aguardando_resposta', ['em_analise', 'rejeitado']],
      ['em_analise', ['aprovado_proxima', 'rejeitado']],
    ] as const) {
      const { unmount } = render(
        <UpdateStatusModal
          open
          onOpenChange={vi.fn()}
          candidaturaId="cand-1"
          candidatoNome="Ana"
          statusAtual={atual}
        />,
      )
      const destinos = Array.from(
        screen.getByTestId('status-select').querySelectorAll('option'),
      )
        .map((o) => (o as HTMLOptionElement).value)
        .filter((v) => v !== '')
      expect(destinos).toEqual([...esperado])
      unmount()
    }
  })

  it('`finalizado` continua sem destino, e mostra a mesma frase neutra', () => {
    renderModal({ statusAtual: 'finalizado' })
    expect(screen.queryByTestId('status-select')).toBeNull()
    expect(screen.getByText(/não pode ser alterado por aqui/i)).toBeInTheDocument()
  })
})
