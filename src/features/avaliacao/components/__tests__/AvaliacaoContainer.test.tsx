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
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

// ── Phase 26 (26-06) connected-mode mocks (FUNIL-08 + FUNIL-12) ──
// The presentational tests below (`<AvaliacaoContainer testes={…} />`) never touch
// the router/query/service/authStore layers, so these module mocks are inert for
// them; they only steer the connected-mode tests further down.
const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  getAvaliacaoContext: vi.fn(),
  getAvaliacaoStatus: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigateMock }
})

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ logout: vi.fn(() => Promise.resolve()) }),
  useCandidato: () => ({ nome_completo: 'Maria Teste', email: 'maria@teste.com' }),
}))

vi.mock('@/features/avaliacao/services/avaliacaoService', () => ({
  getAvaliacaoContext: mocks.getAvaliacaoContext,
  getAvaliacaoStatus: mocks.getAvaliacaoStatus,
}))

// RED: this module does not exist yet — import throws "Cannot find module".
import {
  AvaliacaoContainer,
  COPY_NAVEGACAO,
  CONTAINER_TESTE_CONFIG,
} from '@/features/avaliacao/components/AvaliacaoContainer'

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

// ─────────────────────────────────────────────────────────────────────────────
// Phase 26 / Plan 26-06 — connected-mode: cognitivo card gate + real route (FUNIL-08)
// and card-state-from-status-RPC (FUNIL-12). The service layer is mocked so these
// assertions are deterministic (no network).
// ─────────────────────────────────────────────────────────────────────────────

// Phase 51 / D-15: the textual instrument is «Prova cognitiva» (the Raven is
// «Raciocínio lógico (Matrizes)» and never appears in this container).
const COGNITIVO_LABEL = 'Prova cognitiva'
const BIG_FIVE_LABEL = 'Avaliação comportamental'

// Mirrors `cargoTemplates.baseTestes`: `testes_aplicaveis` ALWAYS includes a
// `cognitivo` template entry — so a test that renders ZERO cognitivo cards proves the
// template-driven card is suppressed (BLOCKER 1) and only the gated append can render one.
const CONTEXT_BASE = {
  candidatura: {
    id: 'CAND123',
    status: 'em_andamento',
    etapa_atual: 'avaliacao_assincrona',
    vaga_id: 'V1',
  },
  testes_aplicaveis: [
    { teste: 'work_sample_sjt' },
    { teste: 'big_five' },
    { teste: 'redacao_cultural' },
    { teste: 'cognitivo' },
  ],
  perguntas: [],
}

const ALL_PENDING = {
  sjt_mc: { registrado: false, iniciado: false },
  sjt_caso_aberto: { registrado: false, iniciado: false },
  big_five: { registrado: false, iniciado: false },
  redacao: { registrado: false, iniciado: false },
  cognitivo: { registrado: false, iniciado: false },
}

function renderConnected() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/candidato/avaliacao/CAND123']}>
        <Routes>
          <Route
            path="/candidato/avaliacao/:candidaturaId"
            element={<AvaliacaoContainer />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AvaliacaoContainer — cognitivo gate + real route (26-06 / FUNIL-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAvaliacaoStatus.mockResolvedValue(ALL_PENDING)
  })

  it('renders ZERO cognitivo cards when aplica_cognitivo=false — even though testes_aplicaveis includes a cognitivo entry (BLOCKER 1)', async () => {
    mocks.getAvaliacaoContext.mockResolvedValue({
      ...CONTEXT_BASE,
      aplica_cognitivo: false,
    })
    renderConnected()
    // Wait for the connected render to settle on a non-cognitivo card.
    await screen.findByText(BIG_FIVE_LABEL)
    expect(screen.queryAllByText(COGNITIVO_LABEL)).toHaveLength(0)
  })

  it('renders EXACTLY ONE cognitivo card when aplica_cognitivo=true, routing to the real prova-cognitiva screen', async () => {
    mocks.getAvaliacaoContext.mockResolvedValue({
      ...CONTEXT_BASE,
      aplica_cognitivo: true,
    })
    // Every OTHER card Concluído (no CTA) so the only "Começar avaliação" is cognitivo's.
    mocks.getAvaliacaoStatus.mockResolvedValue({
      sjt_mc: { registrado: true },
      sjt_caso_aberto: { registrado: true },
      big_five: { registrado: true },
      redacao: { registrado: true },
      cognitivo: { registrado: false, iniciado: false },
    })
    renderConnected()
    await screen.findByText(COGNITIVO_LABEL)
    // The template-driven entry is suppressed → exactly ONE cognitivo card (the gated append).
    expect(screen.queryAllByText(COGNITIVO_LABEL)).toHaveLength(1)

    // Once the status query settles, cognitivo is the sole pending card → sole CTA.
    await waitFor(() =>
      expect(screen.getAllByText('Começar avaliação')).toHaveLength(1),
    )
    fireEvent.click(screen.getByText('Começar avaliação'))
    expect(mocks.navigateMock).toHaveBeenCalledWith('/candidato/prova-cognitiva/CAND123')
  })
})

describe('AvaliacaoContainer — card state from get_avaliacao_status (26-06 / FUNIL-12)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAvaliacaoContext.mockResolvedValue({
      ...CONTEXT_BASE,
      aplica_cognitivo: true,
    })
  })

  it('derives the three neutral card states from the status booleans (Concluído / Em andamento / Pendente)', async () => {
    mocks.getAvaliacaoStatus.mockResolvedValue({
      sjt_mc: { registrado: true }, //                    → Concluído
      sjt_caso_aberto: { registrado: false, iniciado: true }, // → Em andamento
      big_five: { registrado: false, iniciado: false }, //  → Pendente
      redacao: { registrado: false, iniciado: false }, //   → Pendente
      cognitivo: { registrado: false, iniciado: false }, // → Pendente
    })
    renderConnected()
    // Wait for the status query to settle (Concluído appears only once status resolves).
    await screen.findByText('Concluído')
    expect(screen.getByText('Concluído')).toBeInTheDocument()
    expect(screen.getByText('Em andamento')).toBeInTheDocument()
    expect(screen.getAllByText('Pendente').length).toBeGreaterThanOrEqual(1)
    // RNF-07a — no score/threshold/percent anywhere in the rendered tree.
    expect(document.body.textContent ?? '').not.toMatch(FORBIDDEN_SCORE)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Phase 51 / Plan 51-01 — JORN-44 (D-26, D-37, D-15): the assessment LIST offers a
// way back to the candidate panel. «Ir ao painel» sits beside «Sair» in the header in
// EVERY list state, and the «tudo concluído» state keeps the canonical wait-state
// sentence (wait-state-copy.grep.test.ts) AND gains a prominent «Ir ao painel». Both
// call an injected `onBackToPanel` (the shell stays pure — no router in this mode);
// the connected container injects `navigate('/candidato/dashboard')`.
// Without `onBackToPanel` the buttons are NOT rendered (no inert button).
// ─────────────────────────────────────────────────────────────────────────────

const IR_AO_PAINEL = 'Ir ao painel'
const CANONICAL_WAIT = 'Acompanhe o andamento pelo seu painel'

const ALL_DONE_TESTES = [
  { teste: 'sjt_mc', status: 'feito', tempoEstimadoMin: 10 },
  { teste: 'sjt_caso_aberto', status: 'concluido', tempoEstimadoMin: 15 },
]

describe('AvaliacaoContainer — «Ir ao painel» na lista (51-01 / JORN-44)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exporta COPY_NAVEGACAO com o rótulo «Ir ao painel» (constante única do rótulo)', () => {
    expect(COPY_NAVEGACAO).toEqual(expect.objectContaining({ irAoPainel: IR_AO_PAINEL }))
  })

  it('o card do instrumento textual se chama «Prova cognitiva» (D-15)', () => {
    expect(CONTAINER_TESTE_CONFIG.cognitivo.label).toBe(COGNITIVO_LABEL)
  })

  it('cabeçalho: «Ir ao painel» ao lado de «Sair»; o clique chama onBackToPanel uma vez', () => {
    const onBackToPanel = vi.fn()
    render(<AvaliacaoContainer testes={TWO_TESTES} onBackToPanel={onBackToPanel} />)
    const btn = screen.getByTestId('avaliacao-ir-ao-painel')
    expect(btn).toHaveTextContent(IR_AO_PAINEL)
    // Same header row as «Sair».
    expect(btn.parentElement).toHaveTextContent('Sair')
    fireEvent.click(btn)
    expect(onBackToPanel).toHaveBeenCalledTimes(1)
  })

  it('cabeçalho: «Ir ao painel» também no estado vazio', () => {
    const onBackToPanel = vi.fn()
    render(<AvaliacaoContainer testes={[]} onBackToPanel={onBackToPanel} />)
    expect(screen.getByTestId('avaliacao-ir-ao-painel')).toHaveTextContent(IR_AO_PAINEL)
  })

  it('tudo concluído: mantém a frase canônica E ganha o botão «Ir ao painel»', () => {
    const onBackToPanel = vi.fn()
    render(<AvaliacaoContainer testes={ALL_DONE_TESTES} onBackToPanel={onBackToPanel} />)
    expect(document.body.textContent ?? '').toContain(CANONICAL_WAIT)
    const btn = screen.getByTestId('avaliacao-concluida-ir-ao-painel')
    expect(btn).toHaveTextContent(IR_AO_PAINEL)
    fireEvent.click(btn)
    expect(onBackToPanel).toHaveBeenCalledTimes(1)
    // The header button is still there too (every list state).
    expect(screen.getByTestId('avaliacao-ir-ao-painel')).toBeInTheDocument()
  })

  it('sem onBackToPanel: renderiza sem quebrar e NÃO mostra botão inerte', () => {
    render(<AvaliacaoContainer testes={ALL_DONE_TESTES} />)
    expect(screen.getByText('Tudo concluído!')).toBeInTheDocument()
    expect(screen.queryByTestId('avaliacao-ir-ao-painel')).toBeNull()
    expect(screen.queryByTestId('avaliacao-concluida-ir-ao-painel')).toBeNull()
  })

  it('modo conectado: o «Ir ao painel» do cabeçalho navega para /candidato/dashboard', async () => {
    mocks.getAvaliacaoContext.mockResolvedValue({ ...CONTEXT_BASE, aplica_cognitivo: false })
    mocks.getAvaliacaoStatus.mockResolvedValue(ALL_PENDING)
    renderConnected()
    const btn = await screen.findByTestId('avaliacao-ir-ao-painel')
    fireEvent.click(btn)
    expect(mocks.navigateMock).toHaveBeenCalledWith('/candidato/dashboard')
  })

  it('WrongEtapaState (etapa já mudou): o botão diz «Ir ao painel» e leva ao dashboard (D-37)', async () => {
    mocks.getAvaliacaoContext.mockResolvedValue({
      ...CONTEXT_BASE,
      candidatura: { ...CONTEXT_BASE.candidatura, etapa_atual: 'entrevista' },
      aplica_cognitivo: false,
    })
    mocks.getAvaliacaoStatus.mockResolvedValue(ALL_PENDING)
    renderConnected()
    await screen.findByText('Esta avaliação não está disponível.')
    expect(screen.queryByText('Voltar ao painel')).toBeNull()
    fireEvent.click(screen.getByText(IR_AO_PAINEL))
    expect(mocks.navigateMock).toHaveBeenCalledWith('/candidato/dashboard')
  })
})
