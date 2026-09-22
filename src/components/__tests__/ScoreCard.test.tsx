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

/**
 * Phase 23 mantida em INTENÇÃO, trocada em FORMA (49-04 Task 2): a célula Inteligência
 * deixou de receber o percentil cru e passou a receber a FAIXA já resolvida por
 * `cognitivoBanda`. O que Phase 23 provava — «o dígito nunca chega à tela» — continua
 * provado, e agora por construção: o número não entra mais no componente.
 */
describe('ScoreCard — UX-07 cognitivo job-fit banda avaliativa (sem P{n} cru)', () => {
  it('faixa de percentil ≥70 → "Acima do esperado", e nenhum dígito na célula', () => {
    render(
      <ScoreCard inteligencia={{ estado: 'faixa', faixa: 'Acima do esperado' }} />
    )
    const celula = screen.getByTestId('scorecard-inteligencia-estado')
    expect(celula).toHaveTextContent('Acima do esperado')
    expect(celula.textContent ?? '').not.toMatch(/\d/)
    expect(screen.queryByText(/^P\d/)).toBeNull()
  })

  it('faixa de percentil 40-69 → "Dentro do esperado"', () => {
    render(
      <ScoreCard inteligencia={{ estado: 'faixa', faixa: 'Dentro do esperado' }} />
    )
    expect(
      screen.getByTestId('scorecard-inteligencia-estado')
    ).toHaveTextContent('Dentro do esperado')
  })

  it('faixa de percentil <40 → "Abaixo do esperado"', () => {
    render(
      <ScoreCard inteligencia={{ estado: 'faixa', faixa: 'Abaixo do esperado' }} />
    )
    expect(
      screen.getByTestId('scorecard-inteligencia-estado')
    ).toHaveTextContent('Abaixo do esperado')
  })

  it('cognitivo ausente → «não fez» (nunca um dígito, nunca cor de nota)', () => {
    render(<ScoreCard inteligencia={{ estado: 'nao_fez' }} />)
    const celula = screen.getByTestId('scorecard-inteligencia-estado')
    expect(celula).toHaveTextContent('não fez')
    expect(celula.textContent ?? '').not.toMatch(/\d/)
    expect(celula.className).not.toMatch(/text-(green|blue|yellow|red)-400/)
  })
})

/**
 * 49-04 Task 2 — Big Five é NÃO AVALIATIVO (UX-07/RNF-07a, D-31). A célula diz se a pessoa
 * fez, e nada mais: o `score` da linha `tipo='big_five'` é NULL por desenho (as dimensões
 * moram em `metadata`), então qualquer número nessa célula seria inventado. O card também
 * perdeu a célula DISC — o instrumento não existe no produto e a tabela tem 0 linhas.
 */
describe('ScoreCard — Big Five sem número, e DISC fora do card (49-04 / D-31)', () => {
  it('Big Five concluído → «concluído», sem número e sem cor de nota', () => {
    render(<ScoreCard bigFive="concluido" />)
    const celula = screen.getByTestId('scorecard-bigfive-estado')
    expect(celula).toHaveTextContent('concluído')
    expect(celula.textContent ?? '').not.toMatch(/\d/)
    expect(celula.className).not.toMatch(/text-(green|blue|yellow|red)-400/)
  })

  it('sem linha big_five → «não fez»', () => {
    render(<ScoreCard bigFive="nao_fez" />)
    expect(screen.getByTestId('scorecard-bigfive-estado')).toHaveTextContent(
      'não fez'
    )
  })

  it('o card NÃO tem mais célula DISC', () => {
    render(<ScoreCard bigFive="concluido" cultura={{ estado: 'nao_fez' }} />)
    expect(screen.queryByText('DISC')).toBeNull()
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
