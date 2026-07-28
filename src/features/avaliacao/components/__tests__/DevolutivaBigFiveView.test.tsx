/**
 * Phase 23 / Plan 23-04 Task 1 — psychometric honesty (UX-07) for the candidate
 * devolutiva. Big Five is NON-evaluative: the raw percentil digit must NEVER reach
 * the rendered screen — only the 5 NEUTRAL bands (muito baixo…muito alto), never
 * "abaixo/dentro/acima do esperado". The proportional `Progress value={percentil}`
 * bar and the "grupo de 100"/ranking analogy are gone; a non-quantitative
 * band-position indicator + a band-keyed self-descriptive phrase replace them.
 *
 * @see src/features/avaliacao/components/DevolutivaBigFiveView.tsx
 * @see .planning/phases/23-ressurrei-o-da-stack-de-ia/23-RESEARCH.md §UX-07 + Pitfall 5
 */
import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

// Keep bigfiveKeys/types real; override only the network read.
vi.mock('@/features/avaliacao/services/bigfiveService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/avaliacao/services/bigfiveService')>()
  return { ...actual, loadDevolutiva: vi.fn() }
})

import { DevolutivaBigFiveView } from '../DevolutivaBigFiveView'
import { loadDevolutiva, type DevolutivaRow } from '@/features/avaliacao/services/bigfiveService'

const DEVOLUTIVA: DevolutivaRow = {
  id: 'dev-1',
  candidatura_id: 'cand-1',
  candidato_id: 'user-1',
  conteudo_jsonb: {
    cabecalho: {
      nome: 'Maria',
      dashboard: [
        { dim: 'O', percentil: 88, banda: 'muito_alto' },
        { dim: 'C', percentil: 50, banda: 'medio' },
        { dim: 'E', percentil: 12, banda: 'muito_baixo' },
        { dim: 'A', percentil: 70, banda: 'mod_alto' },
        { dim: 'N', percentil: 30, banda: 'mod_baixo' },
      ],
    },
    paginas: [
      { dim: 'O', banda: 'muito_alto', percentil: 88, texto_interpretativo: 'Texto O.', palavras: 2 },
      { dim: 'C', banda: 'medio', percentil: 50, texto_interpretativo: 'Texto C.', palavras: 2 },
      { dim: 'E', banda: 'muito_baixo', percentil: 12, texto_interpretativo: 'Texto E.', palavras: 2 },
      { dim: 'A', banda: 'mod_alto', percentil: 70, texto_interpretativo: 'Texto A.', palavras: 2 },
      { dim: 'N', banda: 'mod_baixo', percentil: 30, texto_interpretativo: 'Texto N.', palavras: 2 },
    ],
    disclaimer_emocional: 'Este é um retrato de como você se descreveu hoje.',
    disclaimer_lgpd_crp: 'Disclaimer LGPD/CRP fixo — revisão humana a qualquer momento.',
  },
  created_at: '2026-01-01T00:00:00Z',
}

function renderView(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/candidato/devolutiva/cand-1']}>
        <Routes>
          <Route path="/candidato/devolutiva/:candidaturaId" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DevolutivaBigFiveView — UX-07 honestidade psicométrica (bandas neutras, zero percentil)', () => {
  beforeEach(() => {
    vi.mocked(loadDevolutiva).mockReset()
  })

  it('não renderiza NENHUM percentil cru (nem "Percentil {n}" nem o dígito da barra)', async () => {
    vi.mocked(loadDevolutiva).mockResolvedValue(DEVOLUTIVA)
    renderView(<DevolutivaBigFiveView />)

    // aguarda o load (header com o nome do candidato)
    await screen.findByText(/Seu perfil comportamental/)

    // NENHUMA string de percentil cru chega à tela.
    expect(screen.queryByText(/Percentil\s*\d/)).toBeNull()
    expect(screen.queryByText(/Percentil/i)).toBeNull()
  })

  it('mostra as bandas NEUTRAS (nunca "abaixo/dentro/acima do esperado")', async () => {
    vi.mocked(loadDevolutiva).mockResolvedValue(DEVOLUTIVA)
    renderView(<DevolutivaBigFiveView />)
    await screen.findByText(/Seu perfil comportamental/)

    // labels de banda neutra presentes
    expect(screen.getAllByText(/Muito alto/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Muito baixo/i).length).toBeGreaterThan(0)

    // Big Five é não-avaliativo → moldura avaliativa NÃO aparece aqui (Pitfall 5)
    expect(screen.queryByText(/esperado/i)).toBeNull()
  })

  it('preserva o disclaimer LGPD/CRP', async () => {
    vi.mocked(loadDevolutiva).mockResolvedValue(DEVOLUTIVA)
    renderView(<DevolutivaBigFiveView />)
    await screen.findByText(/Seu perfil comportamental/)
    expect(screen.getByText(/Disclaimer LGPD\/CRP fixo/)).toBeInTheDocument()
  })
})
