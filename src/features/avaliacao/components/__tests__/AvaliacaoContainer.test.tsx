/**
 * Phase 11 / Plan 11-01 Task 1 — Wave 0 RED scaffold for `AvaliacaoContainer`
 * (AVAL-01 / RF-11/12 — the candidate avaliação container).
 *
 * The container renders one glass card per pending teste from
 * `vaga.testes_aplicaveis`, each card showing a NEUTRAL status label
 * ("Pendente"/"Concluído") and an estimated-time line — and NEVER any
 * score/threshold/percent text (RNF-07a: the candidate never sees scoring).
 * The empty state shows "Nenhuma avaliação pendente".
 *
 * ── Why this is RED now ──
 * `@/features/avaliacao/components/AvaliacaoContainer` does NOT exist yet → the
 * import throws "Cannot find module" at runtime. THAT is the calibrated Wave-0
 * failure (smoke-runtime gate). The component lands in the Phase-11 UI wave.
 * Do NOT stub the module to make this green.
 *
 * All copy strings are the EXACT pt-BR from 11-UI-SPEC.md §Copywriting Contract.
 *
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-UI-SPEC.md (Copywriting Contract)
 * @see src/components/pages/DashboardCandidatoPage.tsx (canonical glass shell, D-27)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-01-PLAN.md (Task 1)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
// RED: this module does not exist yet — import throws "Cannot find module".
import { AvaliacaoContainer } from '@/features/avaliacao/components/AvaliacaoContainer'

// Neutral, RNF-07a-safe copy strings (verbatim from 11-UI-SPEC.md).
const COPY = {
  pendente: 'Pendente',
  concluido: 'Concluído',
  empty: 'Nenhuma avaliação pendente',
  tempoPrefix: 'Tempo estimado:',
} as const

// Any score/threshold/percent token that MUST NEVER appear on the candidate side.
const FORBIDDEN_SCORE = /\bscore\b|\d+\s*\/\s*25|\d+%|aprovad|reprovad|threshold|pontua/i

const TWO_TESTES = [
  { teste: 'sjt_mc', obrigatorio: true, customizado: false, status: 'pendente', tempoEstimadoMin: 10 },
  { teste: 'sjt_caso_aberto', obrigatorio: true, customizado: false, status: 'feito', tempoEstimadoMin: 15 },
]

describe('AvaliacaoContainer (Plan 11-01 — AVAL-01, Wave 0 RED)', () => {
  it('T1: renders one card per teste from vaga.testes_aplicaveis', () => {
    render(<AvaliacaoContainer testes={TWO_TESTES} />)
    // Each card carries the neutral "Tempo estimado:" meta line.
    const tempoNodes = screen.getAllByText(new RegExp(COPY.tempoPrefix))
    expect(tempoNodes.length).toBe(TWO_TESTES.length)
  })

  it('T2: cards show neutral status labels — "Pendente"/"Concluído", never a score', () => {
    render(<AvaliacaoContainer testes={TWO_TESTES} />)
    expect(screen.getByText(COPY.pendente)).toBeInTheDocument()
    expect(screen.getByText(COPY.concluido)).toBeInTheDocument()
    // RNF-07a: zero score/threshold/percent text anywhere in the rendered tree.
    expect(document.body.textContent ?? '').not.toMatch(FORBIDDEN_SCORE)
  })

  it('T3: empty state shows "Nenhuma avaliação pendente"', () => {
    render(<AvaliacaoContainer testes={[]} />)
    expect(screen.getByText(COPY.empty)).toBeInTheDocument()
  })
})
