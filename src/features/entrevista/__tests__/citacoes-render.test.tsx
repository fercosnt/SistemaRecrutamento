/**
 * ENTREV-CITACOES-01 — transcript-analysis citations must render as legible text,
 * never the raw JSON object.
 *
 * Pego no UAT-14 live 2026-06-26: a seção CITAÇÕES exibia o objeto JSON literal
 * `{"competency":"...","cited_evidence":[{"text":"...","location":"..."}]}` porque o
 * render fazia `JSON.stringify(c)` para qualquer citação não-string. A shape real
 * (observada em PROD p/ a1dd4c42) é um array de grupos por competência:
 * `{ competency, cited_evidence: [{ text, location }] }`.
 *
 * @see src/features/entrevista/components/TranscricaoReviewPanel.tsx (the render under test)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TranscricaoReviewPanel } from '../components/TranscricaoReviewPanel'
import type {
  AnalisesPorVigencia,
  EntrevistaAnaliseRow,
} from '../services/entrevistaService'

/**
 * ⚠ MUDOU DE PROPÓSITO no plano 49-16 (D-39/D-56), com proveniência: o painel deixou de
 * receber UMA análise (`analise`) e passa a receber o agrupamento por VIGÊNCIA
 * (`analises`), porque mostrar a linha mais nova de qualquer estado como se fosse a que
 * vale era o defeito. As asserções de citação abaixo NÃO mudaram — o que mudou foi por
 * onde a análise entra no componente. Este helper embala a mesma fixture como a vigente.
 */
function comoVigente(analise: EntrevistaAnaliseRow): AnalisesPorVigencia {
  return {
    vigentes: [analise],
    superadas: [],
    falhas: [],
    vigenteMaisRecente: analise,
  }
}

/** An analise with citações in the EXACT EF/PROD shape (per-competency groups). */
function analiseWithCitacoes(): EntrevistaAnaliseRow {
  return {
    id: 'a-1',
    candidatura_id: 'c-1',
    tipo: 'online',
    status_analise: 'concluida',
    superada_em: null,
    texto_hash: null,
    provedor_ia: 'anthropic',
    modelo_ia: 'claude-sonnet-4-6-20260215',
    competencias: [{ competencia: 'Comunicação', score: 4 }],
    citacoes: [
      {
        competency: 'Manejo de Paciente Ansioso / Inteligência Emocional',
        cited_evidence: [
          { text: 'Expliquei cada passo com calma e combinei um sinal de pausa.', location: 'Transcrição - Pergunta 1' },
          { text: 'Ela conseguiu concluir o procedimento.', location: 'Transcrição - Pergunta 1' },
        ],
      },
    ],
    bias_flags: null,
    bloqueio_avanco: false,
    scores_humanos: null,
    notas_humanas: null,
    revisada_por: null,
    revisao_confirmada_em: null,
    prompt_version: 'v1',
    created_at: '2026-06-27T00:00:00Z',
  } as EntrevistaAnaliseRow
}

describe('ENTREV-CITACOES-01 — citações render legibly (not raw JSON)', () => {
  it('renders the evidence text, its location, and the competency label', () => {
    render(<TranscricaoReviewPanel analises={comoVigente(analiseWithCitacoes())} />)
    expect(screen.getByText(/Expliquei cada passo com calma/)).toBeTruthy()
    expect(screen.getByText(/Ela conseguiu concluir o procedimento/)).toBeTruthy()
    // location appears (may be split across nodes — match by substring on any node)
    expect(screen.getAllByText(/Transcrição - Pergunta 1/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Manejo de Paciente Ansioso/)).toBeTruthy()
  })

  it('does NOT leak raw JSON keys into the DOM', () => {
    const { container } = render(<TranscricaoReviewPanel analises={comoVigente(analiseWithCitacoes())} />)
    expect(container.textContent).not.toContain('cited_evidence')
    expect(container.textContent).not.toContain('"text"')
    expect(container.textContent).not.toContain('"competency"')
  })

  it('still renders a plain-string citação (defensive/legacy shape)', () => {
    const a = analiseWithCitacoes()
    a.citacoes = ['Uma citação simples em texto puro.']
    render(<TranscricaoReviewPanel analises={comoVigente(a)} />)
    expect(screen.getByText(/Uma citação simples em texto puro/)).toBeTruthy()
  })

  // ── ENTREV-CITACOES-02 — hierarquia visual ──────────────────────────────────
  it('"Citações" é um título de seção (heading), não um rótulo apagado', () => {
    render(<TranscricaoReviewPanel analises={comoVigente(analiseWithCitacoes())} />)
    expect(screen.getByRole('heading', { name: 'Citações' })).toBeTruthy()
  })

  it('a competência e a localização aparecem agrupadas e visíveis (tag + área)', () => {
    render(<TranscricaoReviewPanel analises={comoVigente(analiseWithCitacoes())} />)
    expect(screen.getByText('Manejo de Paciente Ansioso / Inteligência Emocional')).toBeTruthy()
    // a localização aparece como rótulo próprio (não some no meio do texto)
    expect(screen.getAllByText('Transcrição - Pergunta 1').length).toBeGreaterThan(0)
  })
})
