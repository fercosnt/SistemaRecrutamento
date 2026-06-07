/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 7 / Plan 07-01 Task 2 — Wave 0 RED scaffold for PerguntaWithTagsForm (VAGACFG-03).
 *
 * Renders the PLANNED (not-yet-existing) component
 * `@/features/config-vaga/components/PerguntaWithTagsForm`. Compiles under TS
 * strict but is EXPECTED to FAIL at runtime (module-not-found) until Plan 04
 * lands the component. Do NOT stub the module to make this green.
 *
 * Coverage (UI-SPEC §Copywriting + D-11 — tag wizard renders only for choice):
 *   - renders option rows for single_choice / multiple_choice
 *   - renders the empty-state copy for texto / numerico questions
 *     ("Nenhuma pergunta de escolha nesta vaga")
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-UI-SPEC.md §Copywriting
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-11)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PerguntaWithTagsForm } from '@/features/config-vaga/components/PerguntaWithTagsForm'

describe('PerguntaWithTagsForm (Plan 07-01 — VAGACFG-03, Wave 0 RED)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('T1: renders option rows for a single_choice pergunta (D-11)', () => {
    render(
      <PerguntaWithTagsForm
        pergunta={{
          id: 'p1',
          texto_pergunta: 'Disponibilidade?',
          tipo_resposta: 'single_choice',
          opcoes: [
            { opcao_id: 'o1', texto: 'Imediata' },
            { opcao_id: 'o2', texto: 'Em até 15 dias' },
          ],
        }}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Imediata')).toBeInTheDocument()
    expect(screen.getByText('Em até 15 dias')).toBeInTheDocument()
  })

  it('T2: renders option rows for a multiple_choice pergunta (D-11)', () => {
    render(
      <PerguntaWithTagsForm
        pergunta={{
          id: 'p2',
          texto_pergunta: 'Quais turnos?',
          tipo_resposta: 'multiple_choice',
          opcoes: [
            { opcao_id: 'o1', texto: 'Manhã' },
            { opcao_id: 'o2', texto: 'Tarde' },
          ],
        }}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Manhã')).toBeInTheDocument()
    expect(screen.getByText('Tarde')).toBeInTheDocument()
  })

  it('T3: renders the empty-state copy for a texto pergunta (D-11)', () => {
    render(
      <PerguntaWithTagsForm
        pergunta={{
          id: 'p3',
          texto_pergunta: 'Fale sobre você',
          tipo_resposta: 'texto_longo',
          opcoes: [],
        }}
        onChange={vi.fn()}
      />
    )
    expect(
      screen.getByText(/Nenhuma pergunta de escolha nesta vaga/i)
    ).toBeInTheDocument()
  })

  it('T4: renders the empty-state copy for a numerico pergunta (D-11)', () => {
    render(
      <PerguntaWithTagsForm
        pergunta={{
          id: 'p4',
          texto_pergunta: 'Quantos anos de experiência?',
          tipo_resposta: 'numerico',
          opcoes: [],
        }}
        onChange={vi.fn()}
      />
    )
    expect(
      screen.getByText(/Nenhuma pergunta de escolha nesta vaga/i)
    ).toBeInTheDocument()
  })
})
