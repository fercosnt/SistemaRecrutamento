/**
 * WR-03 — a first manual save must NOT destroy the EF-only per-question fields.
 *
 * The panel doc-comment claims "IA-only fields (BARS/probes/flags) stay read-only
 * display in BOTH modes" — and the panel header statically prints "Âncoras BARS 1–5".
 * But the save round-trip is what matters: when the RH enters edit mode, tweaks a
 * pergunta and clicks "Salvar edições", the `onSaveEdits` payload must still carry the
 * IA-only per-question fields (`bars_anchors`, `follow_up_probes`, `red_flags`,
 * `green_flags`, `rationale`) on every existing question — otherwise the first save
 * permanently destroys them and the static BARS label becomes a lie.
 *
 * The panel seeds its draft from `perguntas` (normalizeGuia output, which spreads `...q`
 * so the IA-only fields ARE present on each row) and the edit handlers spread `...p`, so
 * the fields ride through edit mode. This test PINS that contract: it drives the real
 * edit→edit-text→save flow and asserts the captured payload preserves them.
 *
 * @see src/features/entrevista/components/GuiaEntrevistaPanel.tsx (the panel under test)
 * @see src/features/entrevista/__tests__/citacoes-render.test.tsx (render-test setup idiom)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GuiaEntrevistaPanel } from '../components/GuiaEntrevistaPanel'
import type { EntrevistaGuiaRow, GuiaPergunta } from '../services/entrevistaService'

/** A guia row whose questions carry the EF-only per-question fields (post-normalizeGuia
 * shape: pt-BR pergunta/dimensao PLUS the spread English IA-only fields). */
function guiaWithIaFields(): EntrevistaGuiaRow {
  const perguntas: GuiaPergunta[] = [
    {
      pergunta: 'Descreva uma situação de triagem clínica sob pressão.',
      dimensao: 'Triagem clínica',
      origem: 'ia',
      // EF-only fields the panel renders read-only but must carry through a save.
      bars_anchors: [{ level: 'proficient', score: 4, description: 'Prioriza com critério.' }],
      follow_up_probes: ['Como priorizou?', 'O que mudaria hoje?'],
      red_flags: ['Não prioriza'],
      green_flags: ['Critério estruturado'],
      rationale: 'Investiga a capacidade de triagem.',
    } as GuiaPergunta,
  ]
  return {
    id: 'g-1',
    candidatura_id: 'c-1',
    tipo: 'online',
    guia: { perguntas },
    prompt_version: '1.0.0',
    created_at: '2026-06-30T00:00:00Z',
  }
}

describe('WR-03 — saving an edit preserves the IA-only per-question fields', () => {
  it('carries bars_anchors/follow_up_probes/red_flags/green_flags through edit+save', async () => {
    const user = userEvent.setup()
    const onSaveEdits = vi.fn()
    render(<GuiaEntrevistaPanel guia={guiaWithIaFields()} onSaveEdits={onSaveEdits} />)

    // Enter edit mode.
    await user.click(screen.getByRole('button', { name: 'Editar guia' }))

    // Tweak the pergunta text (makes the draft dirty so Save enables).
    const input = screen.getByLabelText('Pergunta 1')
    await user.type(input, ' (revisada)')

    // Save.
    await user.click(screen.getByRole('button', { name: 'Salvar edições' }))

    expect(onSaveEdits).toHaveBeenCalledTimes(1)
    const payload = onSaveEdits.mock.calls[0][0] as { perguntas: GuiaPergunta[] }
    const q0 = payload.perguntas[0]

    // The edited text landed…
    expect(q0.pergunta).toContain('(revisada)')
    // …and the IA-only fields SURVIVED the save (WR-03 — not silently dropped).
    expect(q0.bars_anchors).toEqual([
      { level: 'proficient', score: 4, description: 'Prioriza com critério.' },
    ])
    expect(q0.follow_up_probes).toEqual(['Como priorizou?', 'O que mudaria hoje?'])
    expect(q0.red_flags).toEqual(['Não prioriza'])
    expect(q0.green_flags).toEqual(['Critério estruturado'])
    expect(q0.rationale).toBe('Investiga a capacidade de triagem.')
  })
})
