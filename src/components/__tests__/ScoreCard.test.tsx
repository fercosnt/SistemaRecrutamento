/**
 * Phase 23 / Plan 23-04 Task 2 — psychometric honesty (UX-07) for the RH ScoreCard.
 *
 * The cognitivo (Raven) cell is a job-fit score → an evaluative 3-band frame fits
 * (unlike the non-evaluative Big Five). The raw percentil digit `P{n}` must NEVER
 * reach the RH screen — it is replaced by a PROVISIONAL band (real norm deferred M5).
 *
 * Phase 49 / Plan 49-04 Task 1 (JORN-13, D-32) — a célula **Cultura** deixou de receber
 * número e passou a receber ESTADO. A intenção nova que os testes fixam: **ausência nunca
 * vira 0**. O defeito medido no kickoff era exatamente esse — `getCultureScore` devolvia
 * `0` para os 39 candidatos sem `analise_ia_cultura`, e o `?? 'N/A'` do card nunca
 * disparava porque `0` não é nullish. O RH lia um zero vermelho onde não havia avaliação.
 *
 * @see src/components/ScoreCard.tsx
 * @see src/features/vagas/types/vagasTypes.ts (`EstadoCultura`, `estadoCultura`)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScoreCard } from '../ScoreCard'
import '@testing-library/jest-dom'

describe('ScoreCard — UX-07 cognitivo job-fit banda avaliativa (sem P{n} cru)', () => {
  it('não renderiza o percentil cru "P{n}" do cognitivo', () => {
    render(<ScoreCard inteligencia={85} />)
    expect(screen.queryByText(/^P\d/)).toBeNull()
  })

  it('percentil ≥70 → "Acima do esperado"', () => {
    render(<ScoreCard inteligencia={85} />)
    expect(screen.getByText('Acima do esperado')).toBeInTheDocument()
  })

  it('percentil 40-69 → "Dentro do esperado"', () => {
    render(<ScoreCard inteligencia={55} />)
    expect(screen.getByText('Dentro do esperado')).toBeInTheDocument()
  })

  it('percentil <40 → "Abaixo do esperado"', () => {
    render(<ScoreCard inteligencia={20} />)
    expect(screen.getByText('Abaixo do esperado')).toBeInTheDocument()
  })

  it('cognitivo ausente → "N/A" (nunca um dígito)', () => {
    render(<ScoreCard inteligencia={null} />)
    expect(screen.queryByText(/^P\d/)).toBeNull()
    // a célula Intel mostra N/A quando não há score
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0)
  })
})

/**
 * Classes de cor de NOTA do card. Usadas na asserção negativa: a célula Cultura só pode
 * carregar uma destas quando o estado é `nota`.
 */
const CORES_DE_NOTA = /text-(green|blue|yellow|red)-400/

describe('ScoreCard — célula Cultura: ausência NUNCA vira 0 (49-04 / JORN-13 / D-32)', () => {
  it('estado `nao_fez` → mostra «não fez», sem nenhum dígito e sem cor de nota', () => {
    render(<ScoreCard cultura={{ estado: 'nao_fez' }} />)
    const celula = screen.getByTestId('scorecard-cultura-estado')
    expect(celula).toHaveTextContent('não fez')
    // O defeito original em forma de asserção: nenhum dígito na célula.
    expect(celula.textContent ?? '').not.toMatch(/\d/)
    expect(celula.className).not.toMatch(CORES_DE_NOTA)
  })

  it('estado `aguardando_revisao` → mostra «aguardando revisão», sem dígito e sem cor de nota', () => {
    render(<ScoreCard cultura={{ estado: 'aguardando_revisao' }} />)
    const celula = screen.getByTestId('scorecard-cultura-estado')
    expect(celula).toHaveTextContent('aguardando revisão')
    expect(celula.textContent ?? '').not.toMatch(/\d/)
    expect(celula.className).not.toMatch(CORES_DE_NOTA)
  })

  it('estado `nota` com 72 → mostra 72 COM cor de nota', () => {
    render(<ScoreCard cultura={{ estado: 'nota', valor: 72 }} />)
    const celula = screen.getByTestId('scorecard-cultura-estado')
    expect(celula).toHaveTextContent('72')
    expect(celula.className).toMatch(CORES_DE_NOTA)
  })

  it('prop `cultura` ausente → «não fez» (default seguro, nunca 0)', () => {
    render(<ScoreCard />)
    const celula = screen.getByTestId('scorecard-cultura-estado')
    expect(celula).toHaveTextContent('não fez')
    expect(celula.textContent ?? '').not.toMatch(/\d/)
  })
})
