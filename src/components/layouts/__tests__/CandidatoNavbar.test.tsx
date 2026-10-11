/// <reference types="@testing-library/jest-dom" />
/**
 * CandidatoNavbar — «Meu painel» (52-06 · JORN-62 · achado do aceite 51-17).
 *
 * O defeito: fora do painel, a área do candidato não tinha volta ao painel — a navbar oferecia
 * só «Área do candidato» e «Sair». «Meu painel» leva a `/candidato/dashboard` de qualquer tela
 * do candidato e NÃO aparece no próprio painel (um botão que leva aonde já se está é ruído).
 *
 * ⚠ O mock de `useAuthStore` respeita SELETOR, como o de `DashboardCandidatoPage.navbar.test.tsx`:
 * um mock que ignore o seletor faz a navbar se auto-guardar e renderizar `null`, e o teste passaria
 * por vacuidade.
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

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector?: (s: typeof mocks.authState) => unknown) =>
    typeof selector === 'function' ? selector(mocks.authState) : mocks.authState,
}))

import { CandidatoNavbar } from '../CandidatoNavbar'

function renderEm(pathname: string, props: { showAreaLink?: boolean } = {}) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <CandidatoNavbar {...props} />
    </MemoryRouter>,
  )
}

describe('CandidatoNavbar — «Meu painel» (52-06)', () => {
  beforeEach(() => {
    mocks.navigateMock.mockClear()
    mocks.authState.isAuthenticated = true
    mocks.authState.role = 'candidato'
  })

  it('(a) em /candidato/perfil: «Meu painel» presente e leva a /candidato/dashboard', () => {
    renderEm('/candidato/perfil', { showAreaLink: false })

    const botao = screen.getByTestId('navbar-meu-painel')
    expect(botao).toHaveAccessibleName('Meu painel')
    expect(botao.className).toContain('min-h-[44px]')

    fireEvent.click(botao)
    expect(mocks.navigateMock).toHaveBeenCalledWith('/candidato/dashboard')
  })

  it('(b) ⊖ em /candidato/dashboard: «Meu painel» NÃO renderiza (já se está no painel)', () => {
    renderEm('/candidato/dashboard')

    expect(screen.queryByTestId('navbar-meu-painel')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Meu painel' })).not.toBeInTheDocument()
    // o resto da barra continua lá — a ausência é do botão, não da navbar
    expect(screen.getByRole('button', { name: /Área do candidato/i })).toBeInTheDocument()
  })

  it('(c) fica à ESQUERDA de «Área do candidato»', () => {
    renderEm('/vagas')

    const painel = screen.getByTestId('navbar-meu-painel')
    const area = screen.getByRole('button', { name: /Área do candidato/i })
    // DOCUMENT_POSITION_FOLLOWING: `area` vem depois de `painel` na ordem do documento
    expect(painel.compareDocumentPosition(area) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('(d) o rótulo visível é «Meu painel» a partir de sm (ícone só no celular, com aria-label)', () => {
    renderEm('/candidato/avaliacao/x')

    const botao = screen.getByTestId('navbar-meu-painel')
    const rotulo = Array.from(botao.querySelectorAll('span')).find(
      (s) => s.textContent === 'Meu painel',
    )
    expect(rotulo).toBeDefined()
    expect(rotulo?.className).toContain('hidden sm:inline')
  })

  it('(e) ⊖ quem não é candidato autenticado não vê a barra, nem «Meu painel»', () => {
    mocks.authState.isAuthenticated = false
    renderEm('/vagas')

    expect(screen.queryByTestId('navbar-meu-painel')).not.toBeInTheDocument()
  })
})
