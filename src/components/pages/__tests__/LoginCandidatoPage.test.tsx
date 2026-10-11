/**
 * Phase 4 / Plan 04-07 — VAGA-03 redirect routing tests.
 *
 * Covers the `resolveRedirect` helper exported from LoginCandidatoPage. The
 * helper guards the post-login navigation against open-redirect attacks: the
 * caller (the page) blindly hands the `?redirect=` query value here, and the
 * helper decides whether to navigate to it or fall back to the default
 * `/candidato/dashboard` landing (Phase 17 / D-09 — repointed from
 * `/candidato/perfil` so the funnel hub is the candidate landing).
 *
 * Why test the helper directly (not the rendered page):
 *   The page consumes `signIn` (calls Supabase Auth), `useRateLimitCooldown`,
 *   plus several glass-UI primitives. Rendering the full tree just to assert
 *   navigation requires mocking all of those, which is far out of scope for
 *   this routing fix. The helper is the load-bearing decision point and is
 *   testable in isolation. Future E2E (Plan 04-08) will exercise the full
 *   roundtrip in Playwright.
 *
 * Mock note: importing LoginCandidatoPage transitively pulls in the supabase
 * client (which throws on missing env vars). We stub the client + the auth
 * service barrel BEFORE the import so the test file loads cleanly without
 * needing real Supabase env wired up at test time.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Capture the router navigation target for the UX-05 redirect-propagation tests.
const routerMocks = vi.hoisted(() => ({ navigateMock: vi.fn() }))

// Stub supabase client before importing the page under test.
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resend: vi.fn(),
      getUser: vi.fn(),
    },
  },
}))

// Stub the auth services barrel so we don't transitively load the real
// authService (which itself constructs supabase calls during module init).
vi.mock('@/features/auth/services', () => ({
  signIn: vi.fn(),
  resendConfirmation: vi.fn(),
}))

// Resolve the post-login hydration wait instantly (real impl polls up to 3s on
// an unpopulated candidato). NOTE: this mocks the barrel ONLY — the direct
// `@/features/auth/utils/resolveRedirect` import used by the page stays REAL,
// so the anti-open-redirect guard is exercised for real in these tests.
vi.mock('@/features/auth/utils', () => ({
  waitForCandidatoHydrated: vi.fn().mockResolvedValue(undefined),
}))

// Spy on useNavigate while keeping MemoryRouter + useSearchParams real.
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => routerMocks.navigateMock }
})

import { resolveRedirect, LoginCandidatoPage, COPY_LOGIN_SESSAO } from '../LoginCandidatoPage'
import { LoginRHPage } from '../LoginRHPage'
import { signIn } from '@/features/auth/services'
import { useAuthStore } from '@/store/authStore'

// 52-06 (51-17): a página agora LÊ o `authStore` — enquanto `isLoading` é `true` (o estado
// inicial real do store) ela mostra «Verificando sua sessão…» no lugar do formulário. Os
// testes de formulário abaixo descrevem o visitante SEM sessão e com o store já hidratado,
// então cada teste começa nesse estado; os casos de sessão aberta sobrescrevem.
beforeEach(() => {
  useAuthStore.setState({ isLoading: false, isAuthenticated: false, role: null })
})

describe('LoginCandidatoPage › resolveRedirect (VAGA-03)', () => {
  // ============================================================
  // Happy path — relative path passes through
  // ============================================================
  it('returns the redirect target when it is a same-origin absolute path', () => {
    expect(
      resolveRedirect('/candidato/candidatura/formulario/atendimento-ao-paciente')
    ).toBe('/candidato/candidatura/formulario/atendimento-ao-paciente')
  })

  it('returns a simple relative path unchanged', () => {
    expect(resolveRedirect('/foo/bar')).toBe('/foo/bar')
  })

  it('returns the path with query string preserved', () => {
    expect(resolveRedirect('/vagas?departamento=clinico')).toBe(
      '/vagas?departamento=clinico'
    )
  })

  // ============================================================
  // Anti-open-redirect — must reject and use default
  // ============================================================
  it('rejects absolute http(s) URLs (open-redirect attempt)', () => {
    expect(resolveRedirect('https://evil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect('http://evil.com/phish')).toBe('/candidato/dashboard')
  })

  it('rejects protocol-relative URLs (//evil.com inherits scheme)', () => {
    expect(resolveRedirect('//evil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect('//evil.com/path')).toBe('/candidato/dashboard')
  })

  it('rejects javascript: pseudo-protocol', () => {
    expect(resolveRedirect('javascript:alert(1)')).toBe('/candidato/dashboard')
  })

  it('rejects relative paths without a leading slash', () => {
    expect(resolveRedirect('candidato/perfil')).toBe('/candidato/dashboard')
    expect(resolveRedirect('foo')).toBe('/candidato/dashboard')
  })

  // ============================================================
  // Empty / missing input
  // ============================================================
  it('returns default when redirect is null', () => {
    expect(resolveRedirect(null)).toBe('/candidato/dashboard')
  })

  it('returns default when redirect is undefined', () => {
    expect(resolveRedirect(undefined)).toBe('/candidato/dashboard')
  })

  it('returns default when redirect is an empty string', () => {
    expect(resolveRedirect('')).toBe('/candidato/dashboard')
  })

  // ============================================================
  // Custom fallback
  // ============================================================
  it('honors an explicit fallback when provided', () => {
    expect(resolveRedirect(null, '/inicio')).toBe('/inicio')
    expect(resolveRedirect('https://evil.com', '/inicio')).toBe('/inicio')
  })
})

/**
 * UX-04 — Login submit buttons enabled by default (Phase 22 / Plan 22-03).
 *
 * The `disabled={!isValid}` gate was the origin of the E2E `blur()` hack: with
 * an empty form RHF's `isValid` is false, so the button was disabled on mount
 * and the E2E helper had to blur a field to enable it. `handleSubmit(onSubmit)`
 * already blocks invalid submits AND renders `role="alert"` errors, so the gate
 * was pure friction. These tests render the real pages (supabase + auth-service
 * barrels are mocked above) and assert the button is enabled from the first paint.
 */
describe('Login submit buttons enabled by default (UX-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enables the CANDIDATE submit button on mount with an empty form', () => {
    render(
      <MemoryRouter>
        <LoginCandidatoPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /entrar/i })).not.toBeDisabled()
  })

  it('enables the RH submit button on mount with an empty form', () => {
    render(
      <MemoryRouter>
        <LoginRHPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /entrar/i })).not.toBeDisabled()
  })

  it('blocks an invalid submit without calling signIn and surfaces a validation error (no prior blur needed)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginCandidatoPage />
      </MemoryRouter>
    )
    const submit = screen.getByRole('button', { name: /entrar/i })
    expect(submit).not.toBeDisabled()
    await user.click(submit)
    // handleSubmit blocks the callback for an empty (invalid) form...
    expect(signIn).not.toHaveBeenCalled()
    // ...and populates role="alert" validation errors.
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
  })
})

/**
 * UX-05 — `?redirect` propagation + orphan localStorage cleanup on login success
 * (Phase 22 / Plan 22-03).
 *
 * Drives a full successful login (signIn + hydration mocked) and asserts:
 *   - a valid `?redirect` is honored (routed through the REAL resolveRedirect),
 *   - a `//evil` open-redirect attempt falls back to /candidato/dashboard,
 *   - the orphan `candidatura_vaga_id` localStorage key is removed on success.
 */
describe('login-success ?redirect propagation + orphan cleanup (UX-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  async function submitLoginFrom(initialUrl: string) {
    vi.mocked(signIn).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[initialUrl]}>
        <LoginCandidatoPage />
      </MemoryRouter>
    )
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'ana@teste.com')
    await user.type(screen.getByPlaceholderText('Digite sua senha'), 'Senha@123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
  }

  it('honors a valid ?redirect and clears the orphan candidatura_vaga_id on success', async () => {
    localStorage.setItem('candidatura_vaga_id', 'vaga-xyz')
    await submitLoginFrom('/auth/login?redirect=%2Fvagas%2F123')

    await waitFor(() =>
      expect(routerMocks.navigateMock).toHaveBeenCalledWith('/vagas/123', {
        replace: true,
      })
    )
    expect(localStorage.getItem('candidatura_vaga_id')).toBeNull()
  })

  it('falls back to /candidato/dashboard for a //evil open-redirect ?redirect', async () => {
    await submitLoginFrom('/auth/login?redirect=%2F%2Fevil.com')

    await waitFor(() =>
      expect(routerMocks.navigateMock).toHaveBeenCalledWith(
        '/candidato/dashboard',
        { replace: true }
      )
    )
  })

  // ============================================================
  // WR-01 — vaga context must survive the cadastro auto-login-failure bounce
  //
  // When post-signup auto-login fails, CadastroMultiStepForm bounces the user to
  // `/auth/login?email=...`. The candidatura is still in flight, so a manual
  // login on THAT path must NOT wipe `candidatura_vaga_id` — otherwise the
  // candidate lands on the hardcoded `vagaId='1'` fallback. It is cleared at
  // consumption (InstrucoesFormularioPage) instead. A plain login still cleans up.
  // ============================================================
  it('PRESERVES candidatura_vaga_id on the cadastro bounce (?email) so it survives the manual login', async () => {
    localStorage.setItem('candidatura_vaga_id', 'vaga-xyz')
    await submitLoginFrom('/auth/login?email=ana%40teste.com')

    await waitFor(() =>
      expect(routerMocks.navigateMock).toHaveBeenCalledWith(
        '/candidato/dashboard',
        { replace: true }
      )
    )
    expect(localStorage.getItem('candidatura_vaga_id')).toBe('vaga-xyz')
  })

  it('still clears the orphan candidatura_vaga_id on a plain login with no pending candidatura (no ?email)', async () => {
    localStorage.setItem('candidatura_vaga_id', 'vaga-abc')
    await submitLoginFrom('/auth/login')

    await waitFor(() =>
      expect(routerMocks.navigateMock).toHaveBeenCalledWith(
        '/candidato/dashboard',
        { replace: true }
      )
    )
    expect(localStorage.getItem('candidatura_vaga_id')).toBeNull()
  })
})

/**
 * 52-06 (JORN-62 · achado do aceite 51-17) — o login respeita a sessão ABERTA do candidato.
 *
 * O defeito: o candidato já logado clicava no link do e-mail (`/auth/login?redirect=/candidato/…`)
 * e caía no formulário de login, como se não tivesse sessão. Agora, com o store hidratado e
 * `role='candidato'`, a página vai direto ao destino — validado pelo MESMO `resolveRedirect`
 * (anti-open-redirect) e restrito a `/candidato/`, senão o painel.
 */
describe('sessão aberta do candidato (52-06 · 51-17)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderLogin(url: string) {
    return render(
      <MemoryRouter initialEntries={[url]}>
        <LoginCandidatoPage />
      </MemoryRouter>,
    )
  }

  it('(a) candidato hidratado + ?redirect=/candidato/avaliacao/x → vai direto ao destino, sem formulário', async () => {
    useAuthStore.setState({ isLoading: false, isAuthenticated: true, role: 'candidato' })
    renderLogin('/auth/login?redirect=%2Fcandidato%2Favaliacao%2Fx')

    await waitFor(() =>
      expect(routerMocks.navigateMock).toHaveBeenCalledWith('/candidato/avaliacao/x', {
        replace: true,
      }),
    )
    expect(screen.queryByRole('form', { name: /Formulário de login/i })).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('seu@email.com')).not.toBeInTheDocument()
  })

  it('(b) ⊖ open redirect: ?redirect=//evil.com → /candidato/dashboard', async () => {
    useAuthStore.setState({ isLoading: false, isAuthenticated: true, role: 'candidato' })
    renderLogin('/auth/login?redirect=%2F%2Fevil.com')

    await waitFor(() =>
      expect(routerMocks.navigateMock).toHaveBeenCalledWith('/candidato/dashboard', {
        replace: true,
      }),
    )
    expect(routerMocks.navigateMock).toHaveBeenCalledTimes(1)
  })

  it('(c) ⊖ fora da área do candidato: ?redirect=/rh/dashboard → /candidato/dashboard', async () => {
    useAuthStore.setState({ isLoading: false, isAuthenticated: true, role: 'candidato' })
    renderLogin('/auth/login?redirect=%2Frh%2Fdashboard')

    await waitFor(() =>
      expect(routerMocks.navigateMock).toHaveBeenCalledWith('/candidato/dashboard', {
        replace: true,
      }),
    )
    expect(routerMocks.navigateMock).not.toHaveBeenCalledWith('/rh/dashboard', expect.anything())
  })

  it('(c2) ?redirect vazio → o painel (fallback do resolveRedirect)', async () => {
    useAuthStore.setState({ isLoading: false, isAuthenticated: true, role: 'candidato' })
    renderLogin('/auth/login?redirect=')

    await waitFor(() =>
      expect(routerMocks.navigateMock).toHaveBeenCalledWith('/candidato/dashboard', {
        replace: true,
      }),
    )
  })

  it('(d) enquanto o store hidrata → «Verificando sua sessão…» e nenhum campo do formulário', () => {
    useAuthStore.setState({ isLoading: true, isAuthenticated: false, role: null })
    renderLogin('/auth/login')

    expect(screen.getByText('Verificando sua sessão…')).toBeInTheDocument()
    expect(COPY_LOGIN_SESSAO?.verificando).toBe('Verificando sua sessão…')
    expect(screen.queryByPlaceholderText('seu@email.com')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Digite sua senha')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /entrar/i })).not.toBeInTheDocument()
    expect(routerMocks.navigateMock).not.toHaveBeenCalled()
  })

  it('(d2) a sessão que hidrata DEPOIS do primeiro render dispara a ida ao destino', async () => {
    useAuthStore.setState({ isLoading: true, isAuthenticated: false, role: null })
    renderLogin('/auth/login?redirect=%2Fcandidato%2Fperfil')
    expect(routerMocks.navigateMock).not.toHaveBeenCalled()

    act(() => {
      useAuthStore.setState({ isLoading: false, isAuthenticated: true, role: 'candidato' })
    })

    await waitFor(() =>
      expect(routerMocks.navigateMock).toHaveBeenCalledWith('/candidato/perfil', {
        replace: true,
      }),
    )
  })

  it('(e) ⊖ sessão de RH hidratada → o formulário de hoje, sem navegação', () => {
    useAuthStore.setState({ isLoading: false, isAuthenticated: true, role: 'rh' })
    renderLogin('/auth/login?redirect=%2Fcandidato%2Fperfil')

    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
    expect(routerMocks.navigateMock).not.toHaveBeenCalled()
  })

  it('(f) ⊖ sem sessão → o formulário de hoje, sem navegação', () => {
    useAuthStore.setState({ isLoading: false, isAuthenticated: false, role: null })
    renderLogin('/auth/login?redirect=%2Fcandidato%2Fperfil')

    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument()
    expect(screen.queryByText('Verificando sua sessão…')).not.toBeInTheDocument()
    expect(routerMocks.navigateMock).not.toHaveBeenCalled()
  })

  it('(g) ⊖ a sessão que nasce DO PRÓPRIO envio não sequestra o destino do login (?redirect=/vagas/123)', async () => {
    // Em PROD o listener do App hidrata o store durante o `signIn`. O efeito de sessão aberta
    // não pode correr na frente do `onSubmit` e mandar ao painel quem pediu `/vagas/123`.
    vi.mocked(signIn).mockImplementation(async () => {
      useAuthStore.setState({ isLoading: false, isAuthenticated: true, role: 'candidato' })
    })
    const user = userEvent.setup()
    renderLogin('/auth/login?redirect=%2Fvagas%2F123')
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'ana@teste.com')
    await user.type(screen.getByPlaceholderText('Digite sua senha'), 'Senha@123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() =>
      expect(routerMocks.navigateMock).toHaveBeenCalledWith('/vagas/123', { replace: true }),
    )
    expect(routerMocks.navigateMock).not.toHaveBeenCalledWith(
      '/candidato/dashboard',
      expect.anything(),
    )
  })
})
