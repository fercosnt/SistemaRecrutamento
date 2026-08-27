/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 25 / Plan 25-05 Task 2 — RH hub not-found state (UX-03).
 *
 * The hub mounts at `/rh/candidatos/:id` where `:id` IS a candidaturaId. When that id
 * does not resolve to a row, the hub used to degrade SILENTLY to a generic
 * `"Candidato" / "—"` header (indistinguishable from a still-loading real candidate).
 * This suite pins the corrected contract (UI-SPEC §3):
 *  - after the contexto query settles with no row (!loading && (isError || !contexto)),
 *    the hub renders an explicit in-shell not-found state: heading
 *    "Candidatura não encontrada", the verbatim body copy, and a single accent
 *    back-link "Voltar aos candidatos" → /rh/candidatos;
 *  - it does NOT render the generic "Candidato" header nor the normal hub timeline
 *    ("Linha do funil") for an unresolved id;
 *  - a resolving id still renders the normal hub (name header), no regression.
 *
 * @see .planning/phases/25-corre-o-do-funil-lado-rh-enums-colunas-contratos/25-UI-SPEC.md (§3)
 * @see src/components/pages/NotFoundPage.tsx (glass composition + accent back-link idiom)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// The single dominant contexto read — configurable per test (null = unresolved id).
const useEntrevistaContextoMock = vi.fn()
const navigateSpy = vi.fn()

// Passthrough RH shell — the not-found lives inside RHLayout, but the shell itself
// (RHSidebar/RHTopBar → authStore + router chrome) is out of scope for this contract.
vi.mock('@/components/RHLayout', () => ({
  RHLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="rh-shell">{children}</div>,
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useParams: () => ({ id: 'unresolvable-candidaturaId' }),
    useNavigate: () => navigateSpy,
  }
})

vi.mock('@/features/entrevista/hooks/useEntrevistaScorecard', () => ({
  useEntrevistaContexto: (...args: unknown[]) => useEntrevistaContextoMock(...args),
  useEntrevistaScorecard: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/avaliacao/hooks/useScorecardCandidato', () => ({
  useScorecardCandidato: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/triagem/hooks/useRedacaoRevisao', () => ({
  useRedacaoRevisao: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/decisao/hooks/useConsolidacao', () => ({
  useConsolidacao: () => ({ data: null, isLoading: false, isError: false }),
}))
// Phase 31 (31-04): the hub now mounts the avançar/retroceder/rejeitar action row, which
// consumes useUpdateCandidaturaEtapa (advance + Retroceder dialog) and useRejeitarCandidatura
// (Rejeitar dialog). Stub both so these hooks don't need a QueryClientProvider in this suite.
vi.mock('@/features/vagas/hooks/useCandidaturas', () => ({
  useUpdateCandidaturaEtapa: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/triagem/hooks/useRejeitarCandidatura', () => ({
  useRejeitarCandidatura: () => ({ mutate: vi.fn(), isPending: false }),
}))
// Phase 34 (34-02): the hub now reads the RH-only IA analysis (VISRH-02) + the read-only
// history feed (VISRH-03). Stub both so these useQuery hooks don't need a QueryClientProvider.
vi.mock('@/features/hub-candidato/hooks/useAnaliseCandidato', () => ({
  useAnaliseCandidato: () => ({ data: null, isLoading: false, isError: false }),
}))
vi.mock('@/features/hub-candidato/hooks/useHistoricoCandidatura', () => ({
  useHistoricoCandidatura: () => ({ data: [], isLoading: false, isError: false }),
}))
// 2026-08-26: o hub passou a montar o bloco de liberacao da avaliacao de raciocinio,
// que consulta `cognitivo_liberacao`/`scores_raven` por useQuery. Stub para esta
// suite nao precisar de QueryClientProvider nem de rede.
vi.mock('@/features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo', () => ({
  useLiberacaoCognitivo: () => ({
    data: { liberado: false, liberado_em: null, revogado_em: null, concluido: false },
    isLoading: false,
  }),
  useLiberarCognitivo: () => ({ mutate: vi.fn(), isPending: false }),
  useRevogarCognitivo: () => ({ mutate: vi.fn(), isPending: false }),
}))

import { HubCandidatoRH } from '../HubCandidatoRH'

const NOT_FOUND_BODY =
  'Não encontramos essa candidatura. Ela pode ter sido removida ou o link está incorreto.'

describe('HubCandidatoRH — estado não-encontrado (UX-03)', () => {
  beforeEach(() => {
    useEntrevistaContextoMock.mockReset()
    navigateSpy.mockReset()
  })

  it('id que não resolve (contexto null, já carregado) → mostra "Candidatura não encontrada" + corpo verbatim', () => {
    useEntrevistaContextoMock.mockReturnValue({ data: null, isLoading: false, isError: false })
    render(<HubCandidatoRH />)
    expect(screen.getByText('Candidatura não encontrada')).toBeInTheDocument()
    expect(screen.getByText(NOT_FOUND_BODY)).toBeInTheDocument()
  })

  it('estado não-encontrado NÃO degrada para o header genérico "Candidato" nem para a "Linha do funil"', () => {
    useEntrevistaContextoMock.mockReturnValue({ data: null, isLoading: false, isError: false })
    render(<HubCandidatoRH />)
    // Generic silent-degrade header must NOT render for an unresolved id.
    expect(screen.queryByRole('heading', { name: 'Candidato' })).toBeNull()
    // Nor the normal hub content (the funnel timeline).
    expect(screen.queryByText('Linha do funil')).toBeNull()
  })

  it('back-link "Voltar aos candidatos" navega para /rh/candidatos', () => {
    useEntrevistaContextoMock.mockReturnValue({ data: null, isLoading: false, isError: false })
    render(<HubCandidatoRH />)
    fireEvent.click(screen.getByText('Voltar aos candidatos'))
    expect(navigateSpy).toHaveBeenCalledWith('/rh/candidatos')
  })

  it('isError (query falhou) também renderiza o estado não-encontrado', () => {
    useEntrevistaContextoMock.mockReturnValue({ data: null, isLoading: false, isError: true })
    render(<HubCandidatoRH />)
    expect(screen.getByText('Candidatura não encontrada')).toBeInTheDocument()
  })

  it('ainda carregando (isLoading) NÃO mostra o não-encontrado (evita flash prematuro)', () => {
    useEntrevistaContextoMock.mockReturnValue({ data: null, isLoading: true, isError: false })
    render(<HubCandidatoRH />)
    expect(screen.queryByText('Candidatura não encontrada')).toBeNull()
  })

  it('id que resolve → renderiza o hub normal (header com nome), sem o estado não-encontrado', () => {
    useEntrevistaContextoMock.mockReturnValue({
      data: { id: 'c1', vaga_id: 'v1', etapa_atual: 'triagem', candidato_nome: 'Ana Silva' },
      isLoading: false,
      isError: false,
    })
    render(<HubCandidatoRH />)
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    expect(screen.queryByText('Candidatura não encontrada')).toBeNull()
    // The normal hub renders its funnel timeline.
    expect(screen.getByText('Linha do funil')).toBeInTheDocument()
  })
})
