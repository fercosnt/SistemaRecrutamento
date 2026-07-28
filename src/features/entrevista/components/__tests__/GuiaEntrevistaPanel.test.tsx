/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 20 / Plan 20-05 — GuiaEntrevistaPanel edit-mode RTL suite (ENTREV-06/07/08).
 *
 * Drives the RH-facing edit surface: the view-mode origem badge, enter-edit, inline
 * pergunta edit, add-manual (origem:'manual' in the onSaveEdits payload), delete-confirm
 * (AlertDialog), up/down reorder (boundary buttons disabled), batch "Salvar edições"
 * (calls onSaveEdits with the edited perguntas), the "Salvando…" in-flight label, and
 * the FORBIDDEN save-error → permission copy (NEVER the raw RPC error — T-20-16).
 *
 * RTL idiom cloned from src/features/entrevista/__tests__/citacoes-render.test.tsx
 * (fireEvent, not user-event — the repo convention). Radix Select dropdown opening is
 * flaky under happy-dom, so dimensão editing is exercised via the deterministic
 * add-manual Input rather than driving the Select popper.
 *
 * @see src/features/entrevista/components/GuiaEntrevistaPanel.tsx (component under test)
 * @see .planning/phases/20-refino-rh-editar-guia-de-entrevista-seed-001/20-UI-SPEC.md
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { GuiaEntrevistaPanel } from '../GuiaEntrevistaPanel'
import type { EntrevistaGuiaRow, GuiaPergunta } from '../../services/entrevistaService'

/** A guide row with the given perguntas (online tipo by default). */
function makeGuia(perguntas: GuiaPergunta[], tipo = 'online'): EntrevistaGuiaRow {
  return {
    id: 'g-1',
    candidatura_id: 'c-1',
    tipo,
    guia: { perguntas },
    created_at: '2026-06-29T00:00:00Z',
  } as EntrevistaGuiaRow
}

/** Two AI questions + one explicit manual question. */
function sampleGuia(): EntrevistaGuiaRow {
  return makeGuia([
    { pergunta: 'Conte sobre um conflito que você resolveu.', dimensao: 'Comunicação', origem: 'ia' },
    { pergunta: 'Descreva uma decisão difícil.', dimensao: 'Liderança' }, // missing origem → IA
    { pergunta: 'Pergunta manual existente?', dimensao: 'Cultura', origem: 'manual' },
  ])
}

describe('GuiaEntrevistaPanel — edit mode (ENTREV-06/07/08)', () => {
  it("view mode: shows an IA badge for AI/legacy rows and a Manual badge for origem:'manual'", () => {
    render(<GuiaEntrevistaPanel guia={sampleGuia()} />)
    // 2 IA badges (one explicit, one missing→IA) + 1 Manual badge.
    expect(screen.getAllByText('IA').length).toBe(2)
    expect(screen.getAllByText('Manual').length).toBe(1)
  })

  it("'Editar guia' is disabled when there is no guide", () => {
    render(<GuiaEntrevistaPanel guia={null} />)
    expect(screen.getByRole('button', { name: 'Editar guia' })).toBeDisabled()
  })

  it("'Editar guia' enters edit mode and renders editable rows", () => {
    render(<GuiaEntrevistaPanel guia={sampleGuia()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar guia' }))
    // Each row now exposes a pergunta Input + a dimensão Select trigger.
    expect(screen.getByRole('textbox', { name: 'Pergunta 1' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Dimensão 1' })).toBeInTheDocument()
    // Footer batch controls present.
    expect(screen.getByRole('button', { name: 'Salvar edições' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('inline-editing a pergunta and saving sends the edited guide to onSaveEdits', () => {
    const onSaveEdits = vi.fn()
    render(<GuiaEntrevistaPanel guia={sampleGuia()} onSaveEdits={onSaveEdits} />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar guia' }))

    const input = screen.getByRole('textbox', { name: 'Pergunta 1' })
    fireEvent.change(input, { target: { value: 'Pergunta editada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar edições' }))

    expect(onSaveEdits).toHaveBeenCalledTimes(1)
    const vars = onSaveEdits.mock.calls[0][0]
    expect(vars.tipo).toBe('online')
    expect(vars.perguntas[0].pergunta).toBe('Pergunta editada')
  })

  it("add-manual appends a row stamped origem:'manual' in the onSaveEdits payload", () => {
    const onSaveEdits = vi.fn()
    render(<GuiaEntrevistaPanel guia={sampleGuia()} onSaveEdits={onSaveEdits} />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar guia' }))

    // Open the inline add form.
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar pergunta' }))
    fireEvent.change(screen.getByLabelText('Pergunta'), {
      target: { value: 'Nova pergunta manual' },
    })
    fireEvent.change(screen.getByLabelText('Dimensão'), {
      target: { value: 'Resiliência' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar edições' }))

    const vars = onSaveEdits.mock.calls[0][0]
    const added = vars.perguntas[vars.perguntas.length - 1]
    expect(added.pergunta).toBe('Nova pergunta manual')
    expect(added.dimensao).toBe('Resiliência')
    expect(added.origem).toBe('manual')
  })

  it('delete opens the AlertDialog and confirming stages the removal (persisted on save)', () => {
    const onSaveEdits = vi.fn()
    render(<GuiaEntrevistaPanel guia={sampleGuia()} onSaveEdits={onSaveEdits} />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar guia' }))

    // Open the first row's delete dialog.
    fireEvent.click(screen.getAllByRole('button', { name: 'Remover pergunta' })[0])
    expect(screen.getByText('Remover esta pergunta?')).toBeInTheDocument()
    // Confirm (the destructive AlertDialogAction — labelled 'Remover pergunta').
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByText('Remover pergunta'))

    fireEvent.click(screen.getByRole('button', { name: 'Salvar edições' }))
    const vars = onSaveEdits.mock.calls[0][0]
    expect(vars.perguntas).toHaveLength(2)
    expect(vars.perguntas.map((p: GuiaPergunta) => p.pergunta)).not.toContain(
      'Conte sobre um conflito que você resolveu.',
    )
  })

  it('up/down reorder swaps positions; boundary buttons are disabled (not hidden)', () => {
    const onSaveEdits = vi.fn()
    render(<GuiaEntrevistaPanel guia={sampleGuia()} onSaveEdits={onSaveEdits} />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar guia' }))

    const ups = screen.getAllByRole('button', { name: 'Mover para cima' })
    const downs = screen.getAllByRole('button', { name: 'Mover para baixo' })
    // First row's up + last row's down disabled.
    expect(ups[0]).toBeDisabled()
    expect(downs[downs.length - 1]).toBeDisabled()

    // Move row 2 up → it becomes row 1.
    fireEvent.click(ups[1])
    fireEvent.click(screen.getByRole('button', { name: 'Salvar edições' }))
    const vars = onSaveEdits.mock.calls[0][0]
    expect(vars.perguntas[0].pergunta).toBe('Descreva uma decisão difícil.')
    expect(vars.perguntas[1].pergunta).toBe('Conte sobre um conflito que você resolveu.')
  })

  it("'Salvar edições' is disabled until dirty", () => {
    render(<GuiaEntrevistaPanel guia={sampleGuia()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar guia' }))
    // Not dirty yet → save disabled.
    expect(screen.getByRole('button', { name: 'Salvar edições' })).toBeDisabled()

    // Make it dirty.
    fireEvent.change(screen.getByRole('textbox', { name: 'Pergunta 1' }), {
      target: { value: 'x' },
    })
    expect(screen.getByRole('button', { name: 'Salvar edições' })).not.toBeDisabled()
  })

  it("saving prop shows 'Salvando…' and disables the save button (no double-submit)", () => {
    const guia = sampleGuia()
    render(<GuiaEntrevistaPanel guia={guia} saving />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar guia' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Pergunta 1' }), {
      target: { value: 'editada' },
    })
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
  })

  it('saveError FORBIDDEN renders the permission copy, never the raw RPC error', () => {
    const guia = sampleGuia()
    const { container } = render(
      <GuiaEntrevistaPanel guia={guia} saveError saveErrorCode="FORBIDDEN" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Editar guia' }))
    expect(
      screen.getByText('Você não tem permissão para editar este guia.'),
    ).toBeInTheDocument()
    // Never leak a raw error string / SQLSTATE / table name.
    expect(container.textContent).not.toContain('42501')
    expect(container.textContent).not.toContain('insufficient_privilege')
    expect(container.textContent).not.toContain('entrevista_guias')
  })

  it('saveError without a permission code renders the generic copy', () => {
    render(<GuiaEntrevistaPanel guia={sampleGuia()} saveError saveErrorCode="NETWORK_ERROR" />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar guia' }))
    expect(screen.getByText('Verifique a conexão e tente novamente.')).toBeInTheDocument()
  })

  it('Cancelar reverts to the last-saved guide and exits edit mode (no dialog)', () => {
    render(<GuiaEntrevistaPanel guia={sampleGuia()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar guia' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Pergunta 1' }), {
      target: { value: 'descartado' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    // Back in view mode with the original text.
    expect(screen.getByText(/Conte sobre um conflito/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Pergunta 1' })).not.toBeInTheDocument()
  })

  it('IA-only fields (Âncoras BARS) stay read-only display in both modes', () => {
    render(<GuiaEntrevistaPanel guia={sampleGuia()} />)
    expect(screen.getAllByText('Âncoras BARS 1–5').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Editar guia' }))
    // Still rendered, never an editable control.
    expect(screen.getAllByText('Âncoras BARS 1–5').length).toBeGreaterThan(0)
  })
})
