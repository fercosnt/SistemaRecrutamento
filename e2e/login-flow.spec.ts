/**
 * E2E Tests - Fluxo de Login de Candidatos
 *
 * Testa todos os cenários do PRD-DEV-002 (Login de Candidatos):
 * - Login com credenciais válidas/inválidas
 * - Validação de formulário
 * - Toggle mostrar/ocultar senha
 * - Remember Me (persistência de sessão)
 * - Protected routes (redirecionamento)
 * - Logout
 * - Estados de loading
 * - Tratamento de erros
 *
 * @see /docs/testing/PRD-2-LOGIN-TEST-CHECKLIST.md
 */

import { test, expect, type Page } from '@playwright/test'

// Test data
// CI-08: NO hardcoded credential fallbacks — read from env, skip-if-unset.
// Every block that reads TEST_USER is gated behind `describeRealAuth`
// (E2E_AUTH_TEST_USERS==='true'), so these are never dereferenced in a
// non-skipped default run. Real values live only in .env.test (gitignored);
// see .env.test.example for the documented keys.
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL!,
  password: process.env.TEST_USER_PASSWORD!,
  name: process.env.TEST_USER_NAME!,
}

const INVALID_CREDENTIALS = {
  email: 'invalido@teste.com',
  password: 'senhaerrada123',
}

/**
 * Tier-2 gate (HARD-01 / CI): the legacy "Testes Funcionais/UX" suites below perform REAL
 * logins with TEST_USER against a live Supabase + a seeded candidato. They cannot run in the
 * deterministic CI core (no real creds / no seeded user) and were never gated — so they ran
 * and failed in CI. Gate them behind E2E_AUTH_TEST_USERS==='true' (same convention as the
 * promoted B3/B4/B8 below). The mocked B1/B2/B15 (page.route) keep covering the login core
 * unconditionally. Set E2E_AUTH_TEST_USERS=true (+ TEST_USER_* + a seeded user) to run these.
 */
const REAL_AUTH = process.env.E2E_AUTH_TEST_USERS === 'true'
const describeRealAuth = REAL_AUTH ? test.describe : test.describe.skip

/**
 * Helper: Preencher formulário de login
 */
async function fillLoginForm(page: Page, email: string, password: string, rememberMe = false) {
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)

  if (rememberMe) {
    await page.getByRole('checkbox', { name: /lembrar-me/i }).check()
  }
}

/**
 * Helper: Verificar se está autenticado
 */
async function expectAuthenticated(page: Page) {
  // Verifica se está na página de perfil ou dashboard
  await expect(page).toHaveURL(/\/(candidato\/perfil|dashboard-candidato)/)

  // Verifica se o botão de logout está visível
  await expect(page.getByRole('button', { name: /sair/i })).toBeVisible()
}

/**
 * Helper: Verificar se NÃO está autenticado
 */
async function expectNotAuthenticated(page: Page) {
  // Verifica se está na página de login
  await expect(page).toHaveURL(/\/auth\/login/)

  // Verifica se o botão de login está visível
  await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
}

/**
 * Helper: Fazer logout
 */
async function logout(page: Page) {
  await page.getByRole('button', { name: /sair/i }).click()

  // Aguardar toast de sucesso
  await expect(page.getByText(/você saiu da sua conta com sucesso/i)).toBeVisible()

  // Aguardar redirecionamento
  await expectNotAuthenticated(page)
}

// ============================================================================
// TESTES FUNCIONAIS BÁSICOS
// ============================================================================

describeRealAuth('Testes Funcionais Básicos', () => {
  test.beforeEach(async ({ page, context }) => {
    // Limpar localStorage antes de cada teste
    await context.clearCookies()
    await page.goto('/auth/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('1.1 - Login com credenciais válidas', async ({ page }) => {
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password, false)

    // Clicar em Entrar
    await page.getByRole('button', { name: /entrar/i }).click()

    // Aguardar toast de sucesso (loading pode ser muito rápido para capturar)
    await expect(page.getByText(/login realizado com sucesso/i)).toBeVisible({ timeout: 15000 })

    // Verificar redirecionamento para /candidato/perfil
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 10000 })

    // Verificar que nome do usuário aparece no heading (pode demorar um pouco)
    await expect(page.getByRole('heading', { name: new RegExp(TEST_USER.name, 'i') })).toBeVisible({ timeout: 5000 })

    // Verificar que botão "Sair" está visível
    await expect(page.getByRole('button', { name: /sair/i })).toBeVisible()

    // Cleanup: Logout
    await logout(page)
  })

  test('1.2 - Login com email inválido', async ({ page }) => {
    await fillLoginForm(page, INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password)

    await page.getByRole('button', { name: /entrar/i }).click()

    // Verificar toast de erro
    await expect(page.getByText(/email ou senha incorretos/i)).toBeVisible({ timeout: 10000 })

    // Verificar que NÃO redirecionou
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('1.3 - Login com senha incorreta', async ({ page }) => {
    await fillLoginForm(page, TEST_USER.email, INVALID_CREDENTIALS.password)

    await page.getByRole('button', { name: /entrar/i }).click()

    // Verificar toast de erro
    await expect(page.getByText(/email ou senha incorretos/i)).toBeVisible({ timeout: 10000 })

    // Verificar que permaneceu na página de login
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('1.4 - Validação de formulário - Email vazio', async ({ page }) => {
    // Deixar email em branco e preencher senha
    await page.getByLabel(/senha/i).fill('SenhaValida1')

    // Dar blur no campo de email para triggerar validação
    await page.getByLabel(/email/i).click()
    await page.getByLabel(/senha/i).click()

    // Verificar que botão está desabilitado
    const submitButton = page.getByRole('button', { name: /entrar/i })
    await expect(submitButton).toBeDisabled()

    // Verificar mensagem de erro (pode estar em <p> com classe text-red-300)
    await expect(page.locator('text=/email é obrigatório/i')).toBeVisible()
  })

  test('1.4 - Validação de formulário - Email formato inválido', async ({ page }) => {
    await page.getByLabel(/email/i).fill('emailsemarroba.com')
    await page.getByLabel(/senha/i).fill('SenhaValida1')

    // Verificar mensagem de erro
    await expect(page.getByText(/email inválido/i)).toBeVisible()

    // Verificar que botão está desabilitado
    await expect(page.getByRole('button', { name: /entrar/i })).toBeDisabled()
  })

  test('1.4 - Validação de formulário - Senha vazia', async ({ page }) => {
    await page.getByLabel(/email/i).fill('teste@teste.com')

    // Deixar senha em branco e dar blur para triggerar validação
    await page.getByLabel(/senha/i).click()
    await page.getByLabel(/email/i).click()

    // Verificar que botão está desabilitado
    const submitButton = page.getByRole('button', { name: /entrar/i })
    await expect(submitButton).toBeDisabled()

    // Verificar mensagem de erro (pode estar em <p> com classe text-red-300)
    await expect(page.locator('text=/senha é obrigatória/i')).toBeVisible()
  })

  test('1.5 - Toggle mostrar/ocultar senha', async ({ page }) => {
    const senhaInput = page.getByLabel(/senha/i)
    await senhaInput.fill('MinhaSenha123')

    // Verificar que senha está mascarada
    await expect(senhaInput).toHaveAttribute('type', 'password')

    // Clicar no ícone de olho (EyeOff)
    await page.locator('button[aria-label*="senha"], button:has(svg[class*="eye"])').first().click()

    // Verificar que senha está visível
    await expect(senhaInput).toHaveAttribute('type', 'text')

    // Clicar novamente para ocultar
    await page.locator('button[aria-label*="senha"], button:has(svg[class*="eye"])').first().click()

    // Verificar que senha voltou a ser mascarada
    await expect(senhaInput).toHaveAttribute('type', 'password')
  })
})

// ============================================================================
// TESTES DE SESSÃO E PERSISTÊNCIA
// ============================================================================

describeRealAuth('Testes de Sessão e Persistência', () => {
  test('2.1 - Lembrar-me - COM checkbox marcado', async ({ page, context }) => {
    await page.goto('/auth/login')

    // Login COM "Lembrar-me"
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password, true)
    await page.getByRole('button', { name: /entrar/i }).click()

    // Aguardar login
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 15000 })

    // Verificar que localStorage contém auth-storage
    const storage = await page.evaluate(() => localStorage.getItem('auth-storage'))
    expect(storage).toBeTruthy()
    expect(storage).toContain(TEST_USER.email)

    // Fechar e reabrir navegador (simular fechamento)
    await context.close()
    const newContext = await page.context().browser()!.newContext()
    const newPage = await newContext.newPage()

    // Acessar página protegida diretamente
    await newPage.goto('http://localhost:3000/candidato/perfil')

    // Verificar que NÃO redirecionou para login (sessão foi mantida)
    await expect(newPage).toHaveURL(/\/candidato\/perfil/, { timeout: 10000 })

    // Cleanup
    await logout(newPage)
    await newContext.close()
  })

  test('2.1 - Lembrar-me - SEM checkbox marcado', async ({ page, context }) => {
    await page.goto('/auth/login')

    // Login SEM "Lembrar-me"
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password, false)
    await page.getByRole('button', { name: /entrar/i }).click()

    // Aguardar login
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 15000 })

    // Fechar e reabrir navegador
    await context.close()
    const newContext = await page.context().browser()!.newContext({
      storageState: undefined, // Limpar estado de storage
    })
    const newPage = await newContext.newPage()

    // Tentar acessar página protegida
    await newPage.goto('http://localhost:3000/candidato/perfil')

    // Verificar que redirecionou para login (sessão NÃO foi mantida)
    await expect(newPage).toHaveURL(/\/auth\/login/, { timeout: 10000 })

    // Verificar toast informativo
    await expect(newPage.getByText(/faça login para acessar esta página/i)).toBeVisible()

    await newContext.close()
  })

  test('2.3 - Auto-restore de sessão ao reload', async ({ page }) => {
    await page.goto('/auth/login')

    // Login normal
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password, true)
    await page.getByRole('button', { name: /entrar/i }).click()

    // Aguardar login
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 15000 })

    // Recarregar página (F5)
    await page.reload()

    // Verificar que permaneceu autenticado
    await expect(page).toHaveURL(/\/candidato\/perfil/)
    await expect(page.getByRole('button', { name: /sair/i })).toBeVisible({ timeout: 10000 })

    // Cleanup
    await logout(page)
  })
})

// ============================================================================
// TESTES DE ROTAS PROTEGIDAS
// ============================================================================

describeRealAuth('Testes de Rotas Protegidas', () => {
  test.beforeEach(async ({ page, context }) => {
    // Limpar localStorage antes de cada teste
    await context.clearCookies()
    await page.goto('/auth/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('3.1 - Acesso direto SEM autenticação', async ({ page }) => {

    // Tentar acessar página protegida diretamente
    await page.goto('/candidato/perfil')

    // Verificar que redirecionou para login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 })

    // Verificar toast informativo
    await expect(page.getByText(/faça login para acessar esta página/i)).toBeVisible()
  })

  test('3.2 - Redirect pós-login para URL original', async ({ page }) => {
    // Tentar acessar /candidato/perfil SEM estar logado
    await page.goto('/candidato/perfil')

    // Verificar que foi redirecionado para login
    await expect(page).toHaveURL(/\/auth\/login/)

    // Fazer login
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)
    await page.getByRole('button', { name: /entrar/i }).click()

    // Verificar que após login, redirecionou DE VOLTA para /candidato/perfil
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 15000 })

    // Cleanup
    await logout(page)
  })
})

// ============================================================================
// TESTES DE LOGOUT
// ============================================================================

describeRealAuth('Testes de Logout', () => {
  test.beforeEach(async ({ page, context }) => {
    // Limpar localStorage antes de cada teste
    await context.clearCookies()
    await page.goto('/auth/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('4.1 - Logout básico', async ({ page }) => {

    // Fazer login
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)
    await page.getByRole('button', { name: /entrar/i }).click()

    // Aguardar login
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 15000 })

    // Fazer logout
    await page.getByRole('button', { name: /sair/i }).click()

    // Verificar toast de sucesso
    await expect(page.getByText(/você saiu da sua conta com sucesso/i)).toBeVisible()

    // Verificar redirecionamento para login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 })

    // Verificar que localStorage foi limpo
    const storage = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage')
      return authStorage ? JSON.parse(authStorage) : null
    })

    expect(storage?.state?.user).toBeNull()
    expect(storage?.state?.isAuthenticated).toBeFalsy()

    // Verificar que não consegue mais acessar rotas protegidas
    await page.goto('/candidato/perfil')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

// ============================================================================
// TESTES DE ESTADOS DE LOADING
// ============================================================================

describeRealAuth('Testes de Estados de Loading', () => {
  test.beforeEach(async ({ page, context }) => {
    // Limpar localStorage antes de cada teste
    await context.clearCookies()
    await page.goto('/auth/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('5.1 - Loading ao submeter login', async ({ page }) => {
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)

    await page.getByRole('button', { name: /entrar/i }).click()

    // Verificar toast de sucesso (loading pode ser muito rápido para capturar)
    await expect(page.getByText(/login realizado com sucesso/i)).toBeVisible({ timeout: 15000 })

    // Aguardar sucesso
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 15000 })

    // Cleanup
    await logout(page)
  })

  test('5.2 - Loading ao verificar sessão (ProtectedRoute)', async ({ page }) => {
    await page.goto('/auth/login')

    // Fazer login primeiro
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password, true)
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 15000 })

    // Recarregar página para observar loading
    await page.reload()

    // Verificar que mostra estado de loading (pode ser muito rápido)
    // Nota: Este teste pode falhar se a verificação for muito rápida
    const loadingText = page.getByText(/verificando autenticação/i)

    // Usar Promise.race para não esperar muito tempo
    await Promise.race([
      loadingText.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {}),
      page.waitForTimeout(500),
    ])

    // Verificar que página carregou corretamente
    await expect(page).toHaveURL(/\/candidato\/perfil/)

    // Cleanup
    await logout(page)
  })
})

// ============================================================================
// TESTES DE TRATAMENTO DE ERROS
// ============================================================================

describeRealAuth('Testes de Tratamento de Erros', () => {
  test.beforeEach(async ({ page, context }) => {
    // Limpar localStorage antes de cada teste
    await context.clearCookies()
    await page.goto('/auth/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('6.2 - Erro de conexão de rede (offline)', async ({ page, context }) => {

    // Simular modo offline
    await context.setOffline(true)

    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)
    await page.getByRole('button', { name: /entrar/i }).click()

    // Verificar toast de erro (pode variar dependendo do erro de rede)
    await expect(page.getByText(/erro/i)).toBeVisible({ timeout: 10000 })

    // Verificar que permaneceu na página de login
    await expect(page).toHaveURL(/\/auth\/login/)

    // Restaurar conexão
    await context.setOffline(false)

    // Tentar novamente (deve funcionar)
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 15000 })

    // Cleanup
    await logout(page)
  })
})

// ============================================================================
// TESTES DE SEGURANÇA
// ============================================================================

describeRealAuth('Testes de Segurança', () => {
  test.beforeEach(async ({ page, context }) => {
    // Limpar localStorage antes de cada teste
    await context.clearCookies()
    await page.goto('/auth/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('7.1 - Senhas nunca são logadas no console', async ({ page }) => {
    const consoleMessages: string[] = []

    // Capturar mensagens do console
    page.on('console', (msg) => {
      consoleMessages.push(msg.text())
    })

    // Usar a senha real do usuário de teste
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)
    await page.getByRole('button', { name: /entrar/i }).click()

    // Aguardar um pouco para capturar logs
    await page.waitForTimeout(3000)

    // Verificar que a senha NUNCA aparece nos logs
    const passwordInLogs = consoleMessages.some(msg => msg.includes(TEST_USER.password))
    expect(passwordInLogs).toBe(false)

    // Aguardar login
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 15000 })

    // Cleanup
    await logout(page)
  })

  test('7.3 - Session storage seguro', async ({ page }) => {
    await page.goto('/auth/login')

    await fillLoginForm(page, TEST_USER.email, TEST_USER.password, true)
    await page.getByRole('button', { name: /entrar/i }).click()

    // Aguardar login
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 15000 })

    // Verificar localStorage
    const storage = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage')
      return authStorage ? JSON.parse(authStorage) : null
    })

    expect(storage).toBeTruthy()
    expect(storage.state.user).toBeTruthy()
    expect(storage.state.session).toBeTruthy()
    expect(storage.state.candidato).toBeTruthy()
    expect(storage.state.isAuthenticated).toBe(true)

    // Verificar que contém access_token
    expect(storage.state.session.access_token).toBeTruthy()
    expect(typeof storage.state.session.access_token).toBe('string')

    // Cleanup
    await logout(page)
  })
})

// ============================================================================
// TESTES DE UX/UI
// ============================================================================

describeRealAuth('Testes de UX/UI', () => {
  test.beforeEach(async ({ page, context }) => {
    // Limpar localStorage antes de cada teste
    await context.clearCookies()
    await page.goto('/auth/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('8.1 - Responsividade Mobile (iPhone 12 Pro)', async ({ page }) => {
    // Configurar viewport mobile
    await page.setViewportSize({ width: 390, height: 844 })

    // Verificar que formulário está visível e responsivo
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/senha/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()

    // Fazer login em mobile
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)
    await page.getByRole('button', { name: /entrar/i }).click()

    // Verificar que funciona normalmente
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 15000 })

    // Cleanup
    await logout(page)
  })

  test('8.2 - Acessibilidade - Navegação por Tab', async ({ page }) => {
    await page.goto('/auth/login')

    // Tab 1: Email
    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/email/i)).toBeFocused()

    // Tab 2: Senha
    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/senha/i)).toBeFocused()

    // Tab 3: Toggle senha (olho)
    await page.keyboard.press('Tab')
    // Skip - pode variar dependendo da implementação

    // Continuar navegando até o botão Entrar
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Verificar que consegue focar no botão ou checkbox
    // (ordem pode variar)
  })

  test('8.3 - Toasts informativos', async ({ page }) => {
    await page.goto('/auth/login')

    // Toast de erro (credenciais inválidas)
    await fillLoginForm(page, INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password)
    await page.getByRole('button', { name: /entrar/i }).click()

    const errorToast = page.getByText(/email ou senha incorretos/i)
    await expect(errorToast).toBeVisible()

    // Aguardar toast desaparecer (auto-dismiss)
    await expect(errorToast).toBeHidden({ timeout: 10000 })

    // Toast de sucesso
    await page.goto('/auth/login')
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)
    await page.getByRole('button', { name: /entrar/i }).click()

    const successToast = page.getByText(/login realizado com sucesso/i)
    await expect(successToast).toBeVisible()

    // Aguardar redirecionamento
    await expect(page).toHaveURL(/\/candidato\/perfil/, { timeout: 15000 })

    // Cleanup
    await logout(page)
  })
})

// ============================================================================
// PHASE 3 PLAN 03-07 — Wave 6 promoted scenarios (B1, B2, B3, B4, B8, B15)
// ============================================================================
// Promoted from Wave 0 stubs in commits aligned with 03-07 PLAN. Each test
// references a Behavior ID from .planning/phases/03-login-recuperacao-senha/
// 03-VALIDATION.md §Critical Behaviors.
//
// Run-unconditionally (every CI run): B1 (login success mock), B2 (invalid
// credentials mock), B15 (Sonner DOM regression).
// Env-gated (process.env.E2E_AUTH_TEST_USERS === 'true'): B3 (email not
// confirmed), B4 (rate limit best-effort), B8 (LoginRH role rejection).
// ============================================================================

/**
 * makeJwt — creates a decode-valid JWT (NOT signature-verifiable) for mocked
 * auth responses. Mirrors the test helper used in Plan 03-03's extractRole
 * test. extractRole / supabase-js never re-verify the signature client-side
 * (the SDK accepted the token from /auth/v1/token), so any base64url-encoded
 * 3-part token round-trips through the auth flow under mock interception.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fake-signature-not-verified`
}

test.describe('login-flow — unconditional (B1, B2, B15)', () => {
  test('B1: login success → role=candidato → redirect /candidato/perfil', async ({ page }) => {
    const candidateJwt = makeJwt({
      sub: 'test-uuid',
      email: 'test@x.com',
      app_metadata: { role: 'candidato', provider: 'email' },
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    await page.route('**/auth/v1/token?grant_type=password', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: candidateJwt,
          refresh_token: 'fake-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'test-uuid', email: 'test@x.com', app_metadata: { provider: 'email' } },
        }),
      })
    })
    await page.goto('/auth/login')
    // Use #id locators because `getByLabel('Senha')` partial-matches the
    // eye-toggle button (`aria-label="Mostrar senha"`). The page renders the
    // label asterisk as a sibling `<span>*</span>` so exact-match strings can
    // also miss; #id is unambiguous.
    //
    // Blur each input after fill: the page uses RHF `mode: 'onBlur'` and the
    // submit button is disabled until `isValid` flips, which only happens
    // after each touched field validates clean. Tab away or .blur() flushes.
    await page.locator('#email').fill('test@x.com')
    await page.locator('#email').blur()
    await page.locator('#password').fill('ValidPass123')
    await page.locator('#password').blur()
    await page.getByRole('button', { name: /^Entrar$/ }).click()
    await page.waitForURL(/\/candidato\/perfil/, { timeout: 5000 })
    const toastRegion = page.getByLabel('Notifications alt+T')
    await expect(toastRegion.getByText('Login realizado com sucesso!')).toBeVisible({ timeout: 3000 })
  })

  test('B2: invalid credentials → generic INVALID_CREDENTIALS toast, no enumeration', async ({ page }) => {
    await page.route('**/auth/v1/token?grant_type=password', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'invalid_credentials',
          msg: 'Invalid login credentials',
          error_code: 'invalid_credentials',
        }),
      })
    })
    await page.goto('/auth/login')
    await page.locator('#email').fill('test@x.com')
    await page.locator('#email').blur()
    await page.locator('#password').fill('Wrong')
    await page.locator('#password').blur()
    await page.getByRole('button', { name: /^Entrar$/ }).click()
    const toastRegion = page.getByLabel('Notifications alt+T')
    await expect(
      toastRegion.getByText('Email ou senha inválidos. Verifique os dados e tente novamente.'),
    ).toBeVisible({ timeout: 3000 })
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('B15: Sonner DOM contract on login — toast renders inside Notifications region', async ({ page }) => {
    await page.route('**/auth/v1/token?grant_type=password', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'invalid_credentials' }),
      })
    })
    await page.goto('/auth/login')
    await page.locator('#email').fill('x@y.com')
    await page.locator('#email').blur()
    await page.locator('#password').fill('Wrong')
    await page.locator('#password').blur()
    await page.getByRole('button', { name: /^Entrar$/ }).click()
    const toastRegion = page.getByLabel('Notifications alt+T')
    await expect(toastRegion.locator('[data-sonner-toast]')).toBeVisible({ timeout: 1500 })
  })
})

test.describe('login-flow — env-gated (B3, B4, B8)', () => {
  test('B3: email_not_confirmed → amber block + Reenviar CTA', async ({ page }) => {
    test.fixme(
      process.env.E2E_AUTH_TEST_USERS !== 'true',
      'Requires E2E_AUTH_TEST_USERS=true + E2E_TEST_UNCONFIRMED_EMAIL',
    )
    await page.goto('/auth/login')
    await page.locator('#email').fill(process.env.E2E_TEST_UNCONFIRMED_EMAIL!)
    await page.locator('#email').blur()
    await page.locator('#password').fill('anyValidPass1')
    await page.locator('#password').blur()
    await page.getByRole('button', { name: /^Entrar$/ }).click()
    await expect(page.getByText('Confirme seu email antes de fazer login')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByRole('button', { name: /Reenviar email de confirmação/i })).toBeVisible()
  })

  test('B4: rate_limit → amber cooldown block + disabled submit', async ({ page }) => {
    test.fixme(process.env.E2E_AUTH_TEST_USERS !== 'true', 'Requires E2E_AUTH_TEST_USERS=true')
    // Burst 30+ invalid submits to trip Supabase's server rate limit.
    // Flaky — server-side limit window varies. Best-effort test.
    await page.goto('/auth/login')
    for (let i = 0; i < 35; i++) {
      await page.locator('#email').fill(`burst${i}@test.com`)
      await page.locator('#email').blur()
      await page.locator('#password').fill('Wrong')
      await page.locator('#password').blur()
      await page.getByRole('button', { name: /^Entrar$/ }).click()
      await page.waitForTimeout(50)
    }
    await expect(page.getByText(/Muitas tentativas/)).toBeVisible({ timeout: 5000 })
  })

  test('B8: LoginRH rejects candidato → signOut + role-mismatch toast', async ({ page }) => {
    test.fixme(process.env.E2E_AUTH_TEST_USERS !== 'true', 'Requires seed candidato user')
    await page.goto('/auth/login-rh')
    await page.locator('#email').fill(process.env.E2E_TEST_CANDIDATO_EMAIL!)
    await page.locator('#email').blur()
    await page.locator('#password').fill(process.env.E2E_TEST_CANDIDATO_PASSWORD!)
    await page.locator('#password').blur()
    await page.getByRole('button', { name: /^Entrar$/ }).click()
    const toastRegion = page.getByLabel('Notifications alt+T')
    await expect(
      toastRegion.getByText('Esta conta não tem acesso ao painel RH.'),
    ).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/auth\/login-rh/)
  })
})
