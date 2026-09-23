/**
 * Phase 13 / Plan 13-01 Task 3 — Wave 0 RED scaffold for `RedacaoOverrideForm`
 * (AVAL-07 / RF-R-23/24 — the RH human-review override form).
 *
 * The RH reviewer overrides via 4 BARS sliders (D1-D4, 1-5), which recompute the
 * composite (= mean × 20) + color live on change; `notas_revisor` is mandatory
 * (≥50 chars on EVERY decision, not only override); `decisao_revisor` is a radio
 * ∈ {aprovado, reprovado, duvida}. "Salvar revisão" is disabled until notes ≥50
 * AND a decision is chosen. (UI-SPEC §RH human-review queue.)
 *
 * ── Phase 49 / plano 49-15 — o primeiro teste MUDOU DE PROPÓSITO (D-25 / D-56) ──
 *
 * Até 2026-09-23 este arquivo travava quatro rótulos LITERAIS — os 4 valores Beauty Smile —
 * como se fossem os nomes das 4 dimensões da rubrica. Eles não são: a rubrica BARS do PRD é
 * «Especificidade da situação · Ação demonstrada · Aprendizado/Reflexão · Alinhamento com os
 * valores Beauty Smile», e os 4 valores são o OBJETO da D4. O teste antigo, portanto,
 * PROTEGIA o defeito: qualquer conserto do rótulo o faria reprovar.
 *
 * A troca não é «de uma lista literal para outra». Agora o teste **itera sobre
 * `DIMENSOES_REDACAO`**, a mesma constante que a Edge Function envia ao modelo
 * (`_shared/bars-redacao.ts`, plano 49-09). Essa é a forma que não envelhece: mudar a
 * rubrica muda o teste por construção, e uma tela que voltasse a rotular por conta própria
 * reprovaria — que é exatamente a divergência de hoje, registrada em WINDOWS 52.
 *
 * All copy strings are the EXACT pt-BR from 13-UI-SPEC.md §Copywriting Contract.
 *
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-UI-SPEC.md (RH review copy)
 * @see .planning/phases/49-consertos-da-jornada-bloco-2/49-15-PLAN.md (D-25 / D-56)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
// GREEN as of Plan 13-05 — the component now exists (the Wave-0 @ts-expect-error
// self-resolved on authoring, per the scaffold note). The import resolves cleanly.
import { RedacaoOverrideForm } from '@/features/triagem/components/RedacaoOverrideForm'
// A fonte ÚNICA dos rótulos — a mesma que o modelo recebe. Importada (não transcrita) de
// propósito: uma cópia aqui seria uma terceira tabela de rubrica no repositório.
import {
  DIMENSOES_REDACAO,
  VALORES_BEAUTY_SMILE,
} from '../../../../../supabase/functions/_shared/bars-redacao'

// IA-suggested baseline scores the sliders default to (the override starts from these).
const IA_SCORES = { D1: 4, D2: 4, D3: 4, D4: 4 } as const

describe('RedacaoOverrideForm (Plan 13-01 — AVAL-07, Wave 0 RED)', () => {
  it.each(DIMENSOES_REDACAO.map((d) => [d.chave, d.rotulo]))(
    'rotula a dimensão %s com o rótulo da constante que o modelo recebeu: "%s"',
    (_chave, rotulo) => {
      render(<RedacaoOverrideForm iaScores={IA_SCORES} />)
      expect(screen.getByText(rotulo as string)).toBeInTheDocument()
    },
  )

  it('renderiza um slider por dimensão da rubrica, e nenhum a mais', () => {
    render(<RedacaoOverrideForm iaScores={IA_SCORES} />)
    expect(screen.getAllByRole('slider')).toHaveLength(DIMENSOES_REDACAO.length)
  })

  it.each(VALORES_BEAUTY_SMILE.map((v) => [v]))(
    'NÃO usa o valor Beauty Smile "%s" como rótulo de dimensão (D-25)',
    (valor) => {
      render(<RedacaoOverrideForm iaScores={IA_SCORES} />)
      expect(screen.queryByText(valor as string)).toBeNull()
    },
  )

  it('renders the decisão radio (aprovado/reprovado/duvida)', () => {
    render(<RedacaoOverrideForm iaScores={IA_SCORES} />)
    expect(screen.getByText(/Aprovado/)).toBeInTheDocument()
    expect(screen.getByText(/Reprovado/)).toBeInTheDocument()
    expect(screen.getByText(/Dúvida/)).toBeInTheDocument()
  })

  it('shows the live composite recompute note (mean ×20 on slider change)', () => {
    render(<RedacaoOverrideForm iaScores={IA_SCORES} />)
    expect(screen.getByText(/Composto e cor recalculados ao ajustar/)).toBeInTheDocument()
  })

  it('Salvar revisão is DISABLED until notas_revisor ≥ 50 chars + a decisão chosen', () => {
    render(<RedacaoOverrideForm iaScores={IA_SCORES} />)
    // initial render: no notes, no decision → Salvar disabled
    const salvar = screen.getByRole('button', { name: /Salvar revisão/ })
    expect(salvar).toBeDisabled()
    // the ≥50 char counter affordance is present
    expect(screen.getByText(/mínimo 50 caracteres/)).toBeInTheDocument()
  })
})
