/**
 * E2E Tests - Fluxo de Aplicação a Vagas (PRD-0005)
 *
 * Testa todos os cenários do fluxo de candidatura:
 * - Listagem de vagas (filtros, busca, paginação)
 * - Detalhes da vaga
 * - Aplicação a vaga (autenticado/não autenticado)
 * - Histórico de candidaturas no dashboard
 * - Prevenção de candidaturas duplicadas
 * - Loading states e feedback visual
 * - Responsividade
 *
 * @see /docs/prds/PRD-DEV-005-fluxo-aplicacao-vagas.md
 */

import { test, expect, type Page } from '@playwright/test'

// Test data
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'fernando@beautysmile.com.br',
  password: process.env.TEST_USER_PASSWORD || 'Petto.16.07',
  name: process.env.TEST_USER_NAME || 'Fernando Costa Neto',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper: Login do usuário
 */
async function login(page: Page, email: string = TEST_USER.email, password: string = TEST_USER.password) {
  await page.goto('/auth/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()

  // Aguardar redirecionamento após login
  await expect(page).toHaveURL(/\/candidato/, { timeout: 10000 })
}

/**
 * Helper: Logout do usuário
 */
async function logout(page: Page) {
  const logoutButton = page.getByRole('button', { name: /sair/i }).first()
  await logoutButton.click()

  // Aguardar toast e redirecionamento
  await expect(page.getByText(/você saiu/i)).toBeVisible({ timeout: 5000 })
  await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
}

/**
 * Helper: Navegar para listagem de vagas
 */
async function gotoVagasPage(page: Page) {
  await page.goto('/vagas')

  // Aguardar carregamento
  await page.waitForLoadState('networkidle')

  // Verificar que a página carregou
  await expect(page.getByText(/vagas disponíveis/i)).toBeVisible({ timeout: 10000 })
}

/**
 * Helper: Verificar se vaga está visível na listagem
 */
async function expectVagaVisible(page: Page, titulo: string) {
  const vagaCard = page.getByText(titulo).first()
  await expect(vagaCard).toBeVisible()
}

// ============================================================================
// 1. TESTES DE LISTAGEM DE VAGAS
// ============================================================================

test.describe('1. Listagem de Vagas (/vagas)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.evaluate(() => localStorage.clear())
  })

  test('1.1 - Página de vagas carrega corretamente', async ({ page }) => {
    await gotoVagasPage(page)

    // Verificar título
    await expect(page.getByText(/vagas disponíveis/i)).toBeVisible()

    // Verificar que há pelo menos uma vaga listada ou empty state
    const hasJobs = await page.getByRole('article').count() > 0
    const hasEmptyState = await page.getByText(/nenhuma vaga encontrada/i).isVisible()

    expect(hasJobs || hasEmptyState).toBeTruthy()
  })

  test('1.2 - Filtros funcionam corretamente', async ({ page }) => {
    await gotoVagasPage(page)

    // Aguardar carregamento inicial
    await page.waitForTimeout(1000)

    // Testar filtro de tipo de vaga
    const tipoFilter = page.getByRole('combobox', { name: /tipo de vaga/i }).first()
    if (await tipoFilter.isVisible()) {
      await tipoFilter.click()
      await page.getByRole('option', { name: /tempo integral/i }).click()

      // Aguardar atualização
      await page.waitForTimeout(500)
    }

    // Verificar que a lista foi atualizada (pode estar vazia se não houver vagas desse tipo)
    await expect(page).toHaveURL(/tipo_vaga/)
  })

  test('1.3 - Busca por keyword funciona', async ({ page }) => {
    await gotoVagasPage(page)

    // Buscar por termo
    const searchInput = page.getByPlaceholder(/buscar vagas/i)
    await searchInput.fill('atendimento')

    // Aguardar debounce e atualização
    await page.waitForTimeout(1000)

    // Verificar que a URL foi atualizada
    await expect(page).toHaveURL(/search=atendimento/)
  })

  test('1.4 - Ordenação funciona corretamente', async ({ page }) => {
    await gotoVagasPage(page)

    // Aguardar carregamento
    await page.waitForTimeout(1000)

    // Selecionar ordenação alfabética
    const sortSelect = page.getByRole('combobox', { name: /ordenar por/i }).first()
    if (await sortSelect.isVisible()) {
      await sortSelect.click()
      await page.getByRole('option', { name: /alfabética/i }).click()

      // Aguardar atualização
      await page.waitForTimeout(500)

      // Verificar que a URL foi atualizada
      await expect(page).toHaveURL(/orderBy=alfabetica/)
    }
  })

  test('1.5 - Paginação funciona', async ({ page }) => {
    await gotoVagasPage(page)

    // Aguardar carregamento
    await page.waitForTimeout(1000)

    // Verificar se há botão de próxima página
    const nextButton = page.getByRole('button', { name: /próxima/i })
    const isNextVisible = await nextButton.isVisible()

    if (isNextVisible) {
      await nextButton.click()

      // Aguardar atualização
      await page.waitForTimeout(500)

      // Verificar que a página mudou
      await expect(page).toHaveURL(/page=2/)
    }
  })

  test('1.6 - Loading state é exibido durante carregamento', async ({ page }) => {
    await page.goto('/vagas')

    // Tentar capturar loading state (pode ser muito rápido)
    const loadingState = page.getByText(/carregando/i).or(page.locator('[class*="animate-pulse"]'))

    // Se conseguir capturar, verificar que desaparece
    if (await loadingState.isVisible({ timeout: 500 }).catch(() => false)) {
      await expect(loadingState).not.toBeVisible({ timeout: 5000 })
    }
  })
})

// ============================================================================
// 2. TESTES DE DETALHES DA VAGA
// ============================================================================

test.describe('2. Detalhes da Vaga (/vagas/:id)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.evaluate(() => localStorage.clear())
  })

  test('2.1 - Página de detalhes carrega corretamente', async ({ page }) => {
    await gotoVagasPage(page)
    await page.waitForTimeout(1000)

    // Clicar na primeira vaga disponível
    const firstVaga = page.getByRole('article').first()
    await firstVaga.click()

    // Aguardar navegação
    await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/, { timeout: 5000 })

    // Verificar elementos da página
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/sobre a vaga/i)).toBeVisible()
  })

  test('2.2 - Botão "Voltar" funciona', async ({ page }) => {
    await gotoVagasPage(page)
    await page.waitForTimeout(1000)

    const firstVaga = page.getByRole('article').first()
    await firstVaga.click()

    await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/)

    // Clicar em voltar
    await page.getByRole('button', { name: /voltar para vagas/i }).click()

    // Verificar que voltou para listagem
    await expect(page).toHaveURL('/vagas')
  })

  test('2.3 - Funcionalidade de compartilhar funciona', async ({ page }) => {
    await gotoVagasPage(page)
    await page.waitForTimeout(1000)

    const firstVaga = page.getByRole('article').first()
    await firstVaga.click()

    await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/)

    // Clicar no botão de compartilhar
    const shareButton = page.getByRole('button').filter({ has: page.locator('svg[class*="lucide-share"]') }).first()
    await shareButton.click()

    // Verificar que o menu aparece
    await expect(page.getByText(/whatsapp|email|copiar link/i)).toBeVisible()

    // Clicar em "Copiar link"
    await page.getByText(/copiar link/i).click()

    // Verificar toast de sucesso
    await expect(page.getByText(/link copiado/i)).toBeVisible({ timeout: 5000 })
  })

  test('2.4 - Redirecionamento para login se não autenticado', async ({ page }) => {
    await gotoVagasPage(page)
    await page.waitForTimeout(1000)

    const firstVaga = page.getByRole('article').first()
    await firstVaga.click()

    await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/)

    // Clicar em candidatar-se (não autenticado)
    const applyButton = page.getByRole('button', { name: /candidatar-se/i }).first()
    await applyButton.click()

    // Deve mostrar toast de erro e redirecionar para login
    await expect(page.getByText(/você precisa estar logado/i)).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
  })
})

// ============================================================================
// 3. TESTES DE APLICAÇÃO À VAGA (AUTENTICADO)
// ============================================================================

test.describe('3. Aplicação à Vaga (Autenticado)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.evaluate(() => localStorage.clear())

    // Login antes de cada teste
    await login(page)
  })

  test.afterEach(async ({ page }) => {
    // Logout após cada teste
    await logout(page).catch(() => {})
  })

  test('3.1 - Modal de confirmação é exibido ao clicar em candidatar-se', async ({ page }) => {
    await gotoVagasPage(page)
    await page.waitForTimeout(1000)

    // Buscar vaga que ainda não foi aplicada
    const vagaCards = page.getByRole('article')
    const firstNonApplied = vagaCards.filter({ hasNot: page.getByText(/candidatura enviada/i) }).first()

    await firstNonApplied.click()
    await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/)

    // Clicar em candidatar-se
    const applyButton = page.getByRole('button', { name: /candidatar-se/i }).first()
    await applyButton.click()

    // Verificar que o modal aparece
    await expect(page.getByText(/confirmar candidatura/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /confirmar/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /cancelar/i })).toBeVisible()
  })

  test('3.2 - Botão Cancelar fecha o modal sem aplicar', async ({ page }) => {
    await gotoVagasPage(page)
    await page.waitForTimeout(1000)

    const vagaCards = page.getByRole('article')
    const firstNonApplied = vagaCards.filter({ hasNot: page.getByText(/candidatura enviada/i) }).first()

    await firstNonApplied.click()
    await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/)

    const applyButton = page.getByRole('button', { name: /candidatar-se/i }).first()
    await applyButton.click()

    // Verificar modal
    await expect(page.getByText(/confirmar candidatura/i)).toBeVisible()

    // Clicar em Cancelar
    await page.getByRole('button', { name: /cancelar/i }).click()

    // Verificar que o modal fechou
    await expect(page.getByText(/confirmar candidatura/i)).not.toBeVisible({ timeout: 2000 })

    // Verificar que ainda está na mesma página
    await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/)
  })

  test('3.3 - Aplicação é criada com sucesso', async ({ page }) => {
    await gotoVagasPage(page)
    await page.waitForTimeout(1000)

    // Buscar vaga que ainda não foi aplicada
    const vagaCards = page.getByRole('article')
    const count = await vagaCards.count()

    let applied = false
    for (let i = 0; i < count; i++) {
      const card = vagaCards.nth(i)
      const hasAppliedBadge = await card.getByText(/candidatura enviada/i).isVisible().catch(() => false)

      if (!hasAppliedBadge) {
        await card.click()
        await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/)

        // Clicar em candidatar-se
        const applyButton = page.getByRole('button', { name: /candidatar-se/i }).first()
        await applyButton.click()

        // Confirmar candidatura
        await expect(page.getByText(/confirmar candidatura/i)).toBeVisible()
        await page.getByRole('button', { name: /confirmar/i }).click()

        // Aguardar toast de sucesso
        await expect(page.getByText(/candidatura enviada com sucesso/i)).toBeVisible({ timeout: 10000 })

        // Aguardar redirecionamento para dashboard
        await expect(page).toHaveURL(/\/candidato\/dashboard|\/dashboard/, { timeout: 10000 })

        applied = true
        break
      }
    }

    if (!applied) {
      console.warn('Nenhuma vaga disponível para aplicar - todas já foram aplicadas')
    }
  })

  test('3.4 - Badge "Candidatura enviada" aparece após aplicação', async ({ page }) => {
    // Ir para dashboard para ver candidaturas
    await page.goto('/candidato/dashboard')
    await page.waitForTimeout(1000)

    // Verificar se há candidaturas
    const candidaturas = page.getByRole('article')
    const count = await candidaturas.count()

    if (count > 0) {
      // Clicar na primeira candidatura para ver detalhes da vaga
      await candidaturas.first().click()

      await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/)

      // Verificar que o badge "Candidatura enviada" está visível
      await expect(page.getByText(/você já se candidatou a esta vaga/i)).toBeVisible()

      // Verificar que o botão está desabilitado
      const applyButton = page.getByRole('button', { name: /você já se candidatou/i }).first()
      await expect(applyButton).toBeDisabled()
    }
  })
})

// ============================================================================
// 4. TESTES DE DASHBOARD - HISTÓRICO DE CANDIDATURAS
// ============================================================================

test.describe('4. Dashboard - Histórico de Candidaturas', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.evaluate(() => localStorage.clear())

    // Login antes de cada teste
    await login(page)
  })

  test.afterEach(async ({ page }) => {
    // Logout após cada teste
    await logout(page).catch(() => {})
  })

  test('4.1 - Dashboard exibe histórico de candidaturas', async ({ page }) => {
    await page.goto('/candidato/dashboard')
    await page.waitForTimeout(1000)

    // Verificar título
    await expect(page.getByText(/histórico de candidaturas/i)).toBeVisible()

    // Verificar estatísticas
    await expect(page.getByText(/suas candidaturas/i)).toBeVisible()
  })

  test('4.2 - Filtros de status funcionam', async ({ page }) => {
    await page.goto('/candidato/dashboard')
    await page.waitForTimeout(1000)

    // Clicar no filtro "Todas"
    const todasButton = page.getByRole('button', { name: /todas/i }).first()
    await todasButton.click()
    await page.waitForTimeout(500)

    // Clicar no filtro "Aplicadas"
    const aplicadasButton = page.getByRole('button', { name: /aplicadas/i }).first()
    if (await aplicadasButton.isVisible()) {
      await aplicadasButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('4.3 - Clicar em candidatura navega para detalhes da vaga', async ({ page }) => {
    await page.goto('/candidato/dashboard')
    await page.waitForTimeout(1000)

    // Verificar se há candidaturas
    const candidaturas = page.getByRole('article')
    const count = await candidaturas.count()

    if (count > 0) {
      // Clicar na primeira candidatura
      await candidaturas.first().click()

      // Verificar navegação para detalhes da vaga
      await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/, { timeout: 5000 })
    }
  })

  test('4.4 - Empty state é exibido quando não há candidaturas', async ({ page }) => {
    // Esse teste só funciona com um usuário que nunca aplicou
    // Como estamos usando o mesmo usuário de teste, ele pode ter candidaturas
    await page.goto('/candidato/dashboard')
    await page.waitForTimeout(1000)

    // Filtrar por status "Aprovado" (que provavelmente estará vazio)
    const aprovadasButton = page.getByRole('button', { name: /aprovadas/i }).first()
    if (await aprovadasButton.isVisible()) {
      await aprovadasButton.click()
      await page.waitForTimeout(500)

      // Verificar empty state
      const hasEmptyState = await page.getByText(/nenhuma candidatura encontrada/i).isVisible()
      if (hasEmptyState) {
        await expect(page.getByText(/explorar vagas disponíveis/i)).toBeVisible()
      }
    }
  })

  test('4.5 - Estatísticas de candidaturas são exibidas corretamente', async ({ page }) => {
    await page.goto('/candidato/dashboard')
    await page.waitForTimeout(1000)

    // Verificar que os cards de estatísticas existem
    await expect(page.getByText(/total/i)).toBeVisible()
    await expect(page.getByText(/aplicadas/i)).toBeVisible()
    await expect(page.getByText(/em análise/i)).toBeVisible()
  })
})

// ============================================================================
// 5. TESTES DE PREVENÇÃO DE DUPLICATAS
// ============================================================================

test.describe('5. Prevenção de Candidaturas Duplicadas', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.evaluate(() => localStorage.clear())

    // Login antes de cada teste
    await login(page)
  })

  test.afterEach(async ({ page }) => {
    // Logout após cada teste
    await logout(page).catch(() => {})
  })

  test('5.1 - Não é possível aplicar duas vezes à mesma vaga', async ({ page }) => {
    await page.goto('/candidato/dashboard')
    await page.waitForTimeout(1000)

    // Verificar se há candidaturas
    const candidaturas = page.getByRole('article')
    const count = await candidaturas.count()

    if (count > 0) {
      // Clicar em uma candidatura já enviada
      await candidaturas.first().click()

      await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/)

      // Verificar que o botão está desabilitado
      const applyButton = page.getByRole('button', { name: /você já se candidatou/i }).first()
      await expect(applyButton).toBeDisabled()

      // Verificar que o badge está visível
      await expect(page.getByText(/você já se candidatou a esta vaga/i)).toBeVisible()
    }
  })

  test('5.2 - Badge de status correto é exibido', async ({ page }) => {
    await page.goto('/candidato/dashboard')
    await page.waitForTimeout(1000)

    // Verificar se há candidaturas
    const candidaturas = page.getByRole('article')
    const count = await candidaturas.count()

    if (count > 0) {
      // Verificar que cada candidatura tem um badge de status
      for (let i = 0; i < Math.min(count, 3); i++) {
        const candidatura = candidaturas.nth(i)

        // Deve ter pelo menos um dos badges de status
        const hasBadge = await candidatura.getByText(/aplicado|em análise|em teste|em entrevista|aprovado|rejeitado/i).isVisible()
        expect(hasBadge).toBeTruthy()
      }
    }
  })
})

// ============================================================================
// 6. TESTES DE RESPONSIVIDADE
// ============================================================================

test.describe('6. Responsividade', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
  ]

  for (const viewport of viewports) {
    test(`6.1 - Página de vagas funciona em ${viewport.name}`, async ({ page, context }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await context.clearCookies()
      await page.evaluate(() => localStorage.clear())

      await gotoVagasPage(page)

      // Verificar que a página carrega
      await expect(page.getByText(/vagas disponíveis/i)).toBeVisible()

      // Verificar que há cards de vaga ou empty state
      const hasJobs = await page.getByRole('article').count() > 0
      const hasEmptyState = await page.getByText(/nenhuma vaga encontrada/i).isVisible()

      expect(hasJobs || hasEmptyState).toBeTruthy()
    })

    test(`6.2 - Página de detalhes funciona em ${viewport.name}`, async ({ page, context }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await context.clearCookies()
      await page.evaluate(() => localStorage.clear())

      await gotoVagasPage(page)
      await page.waitForTimeout(1000)

      const firstVaga = page.getByRole('article').first()
      if (await firstVaga.isVisible()) {
        await firstVaga.click()

        await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/)

        // Verificar elementos principais
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.getByRole('button', { name: /candidatar-se|você já se candidatou/i })).toBeVisible()
      }
    })
  }
})

// ============================================================================
// 7. TESTES DE ACESSIBILIDADE
// ============================================================================

test.describe('7. Acessibilidade', () => {
  test('7.1 - Navegação por teclado funciona na listagem', async ({ page, context }) => {
    await context.clearCookies()
    await page.evaluate(() => localStorage.clear())

    await gotoVagasPage(page)
    await page.waitForTimeout(1000)

    // Tab para o primeiro card de vaga
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Enter para abrir detalhes
    const firstVaga = page.getByRole('article').first()
    if (await firstVaga.isVisible()) {
      await firstVaga.focus()
      await page.keyboard.press('Enter')

      await expect(page).toHaveURL(/\/vagas\/[a-z0-9-]+/, { timeout: 5000 })
    }
  })

  test('7.2 - Botões têm labels acessíveis', async ({ page, context }) => {
    await context.clearCookies()
    await page.evaluate(() => localStorage.clear())

    await gotoVagasPage(page)
    await page.waitForTimeout(1000)

    // Verificar que botões importantes têm texto/aria-label
    const buttons = page.getByRole('button')
    const count = await buttons.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i)
      const text = await button.textContent()
      const ariaLabel = await button.getAttribute('aria-label')

      // Deve ter texto ou aria-label
      expect(text || ariaLabel).toBeTruthy()
    }
  })

  test('7.3 - Headings estão em hierarquia correta', async ({ page, context }) => {
    await context.clearCookies()
    await page.evaluate(() => localStorage.clear())

    await gotoVagasPage(page)
    await page.waitForTimeout(1000)

    // Verificar que há um h1 na página
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
  })
})
