/// <reference types="@testing-library/jest-dom" />
/**
 * DashboardCandidatoPage — a barra persona COMPARTILHADA e o caminho até o perfil.
 *
 * POR QUE ESTE TESTE EXISTE (Phase 43, achado pós-verificação):
 * o dashboard era a ÚNICA tela sob `RoleGuard role="candidato"` que renderizava uma
 * cópia LOCAL da barra — avatar, nome, e-mail e "Sair" feitos à mão — e que, por isso,
 * **não tinha o link "Área do candidato"**.
 *
 * A consequência não era estética. `/candidato/privacidade` (CONSENT-04 — a superfície
 * onde a pessoa revoga o próprio consentimento) tem, por decisão explícita da 43-UI-SPEC
 * (§"Entrada do candidato"), **um único** ponto de entrada: um card em
 * `/candidato/perfil`. E o perfil só é alcançável pelo link da navbar. Um candidato que
 * caísse no dashboard — que é o destino de `ROLE_HOME.candidato` — ficava SEM CAMINHO
 * até a revogação. Uma página que ninguém alcança é promessa sem caminho, que é
 * exatamente o defeito que este milestone existe para eliminar.
 *
 * A asserção é sobre o CAMINHO, não sobre pixels: o que precisa continuar verdadeiro é
 * que existe, no dashboard, um controle que leva a `/candidato/perfil`.
 *
 * ⚠ O mock de `useAuthStore` aqui respeita SELETOR (`useAuthStore(s => s.isAuthenticated)`),
 * diferente do mock de `DashboardCandidatoPage.funnel.test.tsx`, que devolve um objeto
 * fixo e ignora o seletor. Com aquele mock a `CandidatoNavbar` se auto-guarda e renderiza
 * `null` — o teste passaria por vacuidade e não provaria nada.
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  authState: {
    isAuthenticated: true,
    role: 'candidato' as string,
    candidato: {
      nome_completo: 'Maria Teste',
      email: 'maria@teste.com',
      avatar_url: null as string | null,
    },
    logout: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigateMock }
})

vi.mock('@/features/vagas/hooks', () => ({
  useCandidaturas: () => ({ data: { data: [] }, isLoading: false, error: null }),
  useCandidaturasCount: () => ({
    total: 0,
    aguardando: 0,
    em_analise: 0,
    aprovadas: 0,
    rejeitadas: 0,
    finalizadas: 0,
  }),
}))

vi.mock('@/features/timeline/hooks', () => ({
  useSlaEtapas: () => ({ isLoading: false, error: null, lookup: new Map() }),
  rotuloDeEspera: () => null,
}))

// Seletor-aware: a CandidatoNavbar lê `useAuthStore(s => s.isAuthenticated)` e
// `useAuthStore(s => s.role)`. Um mock que ignore o seletor a faz retornar null.
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector?: (s: typeof mocks.authState) => unknown) =>
    typeof selector === 'function' ? selector(mocks.authState) : mocks.authState,
  useCandidato: () => mocks.authState.candidato,
}))

import { DashboardCandidatoPage } from '../DashboardCandidatoPage'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardCandidatoPage />
    </MemoryRouter>,
  )
}

describe('DashboardCandidatoPage — barra persona compartilhada', () => {
  beforeEach(() => {
    mocks.navigateMock.mockClear()
    mocks.authState.role = 'candidato'
    mocks.authState.isAuthenticated = true
  })

  it('(a) oferece o caminho até /candidato/perfil — o único acesso à revogação de consentimento', () => {
    renderDashboard()

    const areaLink = screen.getByRole('button', { name: /Área do candidato/i })
    expect(areaLink).toBeInTheDocument()

    fireEvent.click(areaLink)
    expect(mocks.navigateMock).toHaveBeenCalledWith('/candidato/perfil')
  })

  it('(b) mostra a identidade do candidato — nome e e-mail, como as demais telas', () => {
    renderDashboard()

    expect(screen.getByText('Maria Teste')).toBeInTheDocument()
    expect(screen.getByText('maria@teste.com')).toBeInTheDocument()
  })

  it('(c) mantém o "Sair" — a troca não pode ter custado o logout', () => {
    renderDashboard()

    expect(screen.getByRole('button', { name: /Sair/i })).toBeInTheDocument()
  })

  it('(d) ⊖ NEGATIVA — a barra some para quem não é candidato autenticado', () => {
    // A navbar se auto-guarda. Sem esta metade, um mock permissivo faria (a) passar
    // mesmo que o guard tivesse sido removido — e a barra vazaria em rota anônima.
    mocks.authState.isAuthenticated = false
    renderDashboard()

    expect(screen.queryByRole('button', { name: /Área do candidato/i })).not.toBeInTheDocument()
  })

  it('(e) ⊖ NEGATIVA — a cópia LOCAL da barra não voltou', () => {
    // O defeito original era uma segunda barra, feita à mão, sem o link do perfil.
    // Se alguém reintroduzir uma, o nome do candidato aparece DUAS vezes — uma na
    // compartilhada e outra na cópia. Esta contagem é o que detecta a duplicata.
    renderDashboard()

    expect(screen.getAllByText('Maria Teste')).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /Sair/i })).toHaveLength(1)
  })
})
