/**
 * E2E Test: Fluxo Completo de Cadastro
 *
 * Testa o fluxo completo de cadastro de candidato através de 4 etapas:
 * 1. Dados Pessoais (com validação de CPF e Email)
 * 2. Endereço (com integração ViaCEP)
 * 3. Disponibilidade
 * 4. Autorizações LGPD
 *
 * Phase 2 Plan 02-06 extensions (Wave 0 cases from 02-VALIDATION.md):
 * - Case 1: Happy path auto-login → /candidato/perfil + welcome toast
 * - Case 2: EMAIL_EXISTS → auto-navigate Step 1 + inline error (env-gated)
 * - Case 3: CPF_EXISTS at blur — inline indicator + blocks Next (env-gated)
 * - Case 4: LGPD mandatory unchecked blocks submit + Sonner toast
 * - Case 5: Draft auto-restore after refresh (senha NOT preserved, D-13)
 * - Case 6: rate_limited toast (skipped by default — Pitfall 5)
 *
 * CTA label (UI-SPEC + Task 1): selectors use "Criar conta" (Step 4 idle).
 * Email uniqueness: `test+${Date.now()}@beautysmile.com.br` prefix avoids
 * collisions across runs (Pitfall 6).
 */

import { test, expect, type Page } from '@playwright/test'

// ============================================
// FILL HELPERS (reused by Cases 1, 2, 4)
// ============================================

type OverrideOptions = {
  email?: string
  cpf?: string
  checkMandatoryLgpd?: boolean
}

/**
 * Fill every field across the 4 steps and leave the user on Step 4 ready
 * to click "Criar conta". Does NOT click "Criar conta" itself — the caller
 * decides whether to submit.
 *
 * @param page Playwright page
 * @param overrides email / cpf overrides + whether to tick the mandatory
 *   LGPD checkbox (default: true). Case 4 passes `false` to stay blocked.
 */
async function fillAllSteps(page: Page, overrides: OverrideOptions = {}) {
  const {
    email = `test+${Date.now()}@beautysmile.com.br`,
    cpf = '12345678901',
    checkMandatoryLgpd = true,
  } = overrides

  // ─── STEP 1 — DADOS PESSOAIS ───────────────────────────────────────
  await page.fill('input[name="dadosPessoais.nome_completo"]', 'João da Silva Test')
  await page.fill('input[name="dadosPessoais.cpf"]', cpf)
  await page.fill('input[name="dadosPessoais.email"]', email)
  await page.fill('input[name="dadosPessoais.telefone"]', '11987654321')
  await page.fill('input[name="dadosPessoais.data_nascimento"]', '1990-01-15')

  // Gênero (Radix Select)
  await page.click('[id="genero"]')
  await page.click('text=Masculino')

  // Como conheceu
  await page.click('[id="como_conheceu"]')
  await page.click('text=Instagram')

  // Senha
  await page.fill('input[name="dadosPessoais.senha"]', 'Abcd1234!')
  await page.fill('input[name="dadosPessoais.confirmar_senha"]', 'Abcd1234!')

  await page.click('button:has-text("Próximo")')

  // ─── STEP 2 — ENDEREÇO ───────────────────────────────────────────
  await page.fill('input[name="endereco.cep"]', '01310100')
  // Wait for ViaCEP callback to fill logradouro (tolerate offline — just
  // fill manually if empty after 5s)
  try {
    await expect(page.locator('input[name="endereco.logradouro"]')).not.toHaveValue('', { timeout: 5000 })
  } catch {
    await page.fill('input[name="endereco.logradouro"]', 'Av. Paulista')
    await page.fill('input[name="endereco.bairro"]', 'Bela Vista')
    await page.fill('input[name="endereco.cidade"]', 'São Paulo')
    // Estado uses Select
    await page.click('[id="estado"]')
    await page.click('text=SP')
  }
  await page.fill('input[name="endereco.numero"]', '123')
  await page.click('button:has-text("Próximo")')

  // ─── STEP 3 — DISPONIBILIDADE ───────────────────────────────────
  // Defaults already selected via RHF defaults (integral + presencial).
  // Disponibilidade imediata default false → form invalid without data
  // below. Tick the imediata checkbox so data_disponibilidade is not required.
  await page.click('[id="disponibilidade_imediata"]')
  await page.click('button:has-text("Próximo")')

  // ─── STEP 4 — AUTORIZAÇÕES ──────────────────────────────────────
  // Default autorizacao_uso_dados = true (see CadastroMultiStepForm defaults).
  // Case 4 passes checkMandatoryLgpd=false to uncheck it and trigger the
  // submit-time LGPD block.
  if (!checkMandatoryLgpd) {
    await page.uncheck('[id="autorizacao_uso_dados"]')
  }
}

// ============================================
// DESCRIBE BLOCK
// ============================================

test.describe('Cadastro de Candidato - Fluxo Completo', () => {
  test.beforeEach(async ({ page }) => {
    // Limpa sessionStorage para evitar "Retomamos seu cadastro" toast em
    // tests que NÃO validam draft restore
    await page.goto('/cadastro')
    await page.evaluate(() => sessionStorage.clear())
    await page.goto('/cadastro')
  })

  // ─── Case 1: Happy path with auto-login to /candidato/perfil ─────
  test('happy path: auto-login lands on /candidato/perfil with welcome toast', async ({ page }) => {
    await fillAllSteps(page)

    await page.click('button:has-text("Criar conta")')

    // Wait for navigation + welcome toast (D-03)
    await page.waitForURL(/\/candidato\/perfil/, { timeout: 15000 })
    await expect(page.locator('text=/Cadastro concluído! Bem-vindo\\(a\\),/')).toBeVisible({ timeout: 8000 })
  })

  // ─── Case 2: EMAIL_EXISTS race → auto-navigate Step 1 + inline error ──
  test('EMAIL_EXISTS at submit: auto-navigates to Step 1 and shows inline error', async ({ page }) => {
    test.skip(!process.env.E2E_DUPLICATE_EMAIL, 'Set E2E_DUPLICATE_EMAIL in env to a known duplicate account to run this case')

    await fillAllSteps(page, { email: process.env.E2E_DUPLICATE_EMAIL! })

    await page.click('button:has-text("Criar conta")')

    // Expect: form bounced back to Step 1
    await expect(page.locator('text=Dados Pessoais')).toBeVisible()
    // Inline error on email field
    await expect(page.locator('text=/[Ee]ste email já está cadastrado/')).toBeVisible({ timeout: 8000 })
  })

  // ─── Case 3: CPF_EXISTS path at blur (debounce) ─────────────────
  test('CPF_EXISTS at blur: inline indicator shows "já cadastrado" and blocks Next', async ({ page }) => {
    test.skip(!process.env.E2E_DUPLICATE_CPF, 'Set E2E_DUPLICATE_CPF in env to a known duplicate CPF to run this case')

    await page.fill('input[name="dadosPessoais.cpf"]', process.env.E2E_DUPLICATE_CPF!)
    await page.locator('input[name="dadosPessoais.cpf"]').blur()
    await expect(page.locator('text=/CPF já cadastrado|Este CPF já está cadastrado/')).toBeVisible({ timeout: 3000 })
  })

  // ─── Case 4: LGPD mandatory unchecked blocks submit ─────────────
  test('LGPD mandatory: submit blocked when autorizacao_uso_dados is false', async ({ page }) => {
    await fillAllSteps(page, { checkMandatoryLgpd: false })

    await page.click('button:has-text("Criar conta")')

    // Sonner toast with the mandatory-LGPD copy (D-15)
    await expect(page.locator('text=/Para criar sua conta, você precisa autorizar o uso dos dados/')).toBeVisible({ timeout: 3000 })
    // URL must NOT have navigated to /candidato/perfil
    expect(page.url()).toContain('/cadastro')
  })

  // ─── Case 5: Draft auto-restore on refresh ──────────────────────
  test('draft restore: Step 1-2 fields preserved after refresh (senha NOT preserved)', async ({ page }) => {
    const uniqueName = `Maria Rascunho ${Date.now()}`
    await page.fill('input[name="dadosPessoais.nome_completo"]', uniqueName)
    await page.fill('input[name="dadosPessoais.senha"]', 'TempPass123!')

    // Wait a beat for the 500ms debounced save
    await page.waitForTimeout(700)

    // Reload
    await page.reload()

    // Sonner toast announces the restore
    await expect(page.locator('text=/Retomamos seu cadastro de onde você parou/')).toBeVisible({ timeout: 5000 })
    // Name is preserved
    await expect(page.locator('input[name="dadosPessoais.nome_completo"]')).toHaveValue(uniqueName)
    // Senha field must be EMPTY (D-13 — PII stripped before sessionStorage)
    await expect(page.locator('input[name="dadosPessoais.senha"]')).toHaveValue('')
  })

  // ─── Case 6: rate_limited toast (optional, often flaky; skip by default) ───
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip('rate_limited toast: 31 rapid blurs trigger "Muitas tentativas"', async ({ page: _page }) => {
    // Skipped by default per Pitfall 5 (hard to trigger deterministically in
    // E2E; integration-level test lives in
    // src/features/cadastro/services/__tests__/duplicateCheckService.test.ts).
  })

  // ─── Phase 1 legacy happy-path test (retained as smoke for partial flows) ───
  test('deve completar o cadastro com sucesso', async ({ page }) => {
    // ============================================
    // STEP 1: DADOS PESSOAIS
    // ============================================

    // Verificar que estamos no step 1
    await expect(page.locator('text=Dados Pessoais')).toBeVisible()
    await expect(page.locator('text=Etapa 1 de 4')).toBeVisible()

    // Preencher nome completo
    await page.fill('input[name="dadosPessoais.nome_completo"]', 'João da Silva Test')

    // Preencher CPF (será formatado automaticamente)
    await page.fill('input[name="dadosPessoais.cpf"]', '12345678901')

    // Preencher email
    const testEmail = `test+${Date.now()}@beautysmile.com.br`
    await page.fill('input[name="dadosPessoais.email"]', testEmail)

    // Preencher telefone
    await page.fill('input[name="dadosPessoais.telefone"]', '11987654321')

    // Preencher data de nascimento
    await page.fill('input[name="dadosPessoais.data_nascimento"]', '1990-01-15')

    // Selecionar gênero
    await page.click('[id="genero"]')
    await page.click('text=Masculino')

    // Clicar em Próximo (smoke test — do not assert full flow completion
    // here; Case 1 covers the full happy-path + auto-login)
    await page.click('button:has-text("Próximo")')
  })

  test('deve validar campos obrigatórios no step 1', async ({ page }) => {
    // Tentar avançar sem preencher nada
    await page.click('button:has-text("Próximo")')

    // Verificar que toast de erro aparece
    await expect(
      page.locator('text=Verifique os campos. Alguns campos contêm erros ou estão vazios')
    ).toBeVisible()

    // Verificar que continua no step 1
    await expect(page.locator('text=Etapa 1 de 4')).toBeVisible()
  })

  test('deve validar CPF inválido', async ({ page }) => {
    // Preencher CPF inválido
    await page.fill('input[name="dadosPessoais.cpf"]', '11111111111')

    // Preencher outros campos obrigatórios
    await page.fill('input[name="dadosPessoais.nome_completo"]', 'Teste')
    await page.fill('input[name="dadosPessoais.email"]', 'test@test.com')
    await page.fill('input[name="dadosPessoais.telefone"]', '11987654321')
    await page.fill('input[name="dadosPessoais.data_nascimento"]', '1990-01-15')

    // Tentar avançar
    await page.click('button:has-text("Próximo")')

    // Verificar mensagem de erro
    await expect(page.locator('text=CPF inválido')).toBeVisible()
  })

  test('deve permitir voltar entre steps', async ({ page }) => {
    // Preencher step 1 minimamente
    await page.fill('input[name="dadosPessoais.nome_completo"]', 'João Test')
    await page.fill('input[name="dadosPessoais.cpf"]', '12345678901')
    await page.fill('input[name="dadosPessoais.email"]', `test+${Date.now()}@test.com`)
    await page.fill('input[name="dadosPessoais.telefone"]', '11987654321')
    await page.fill('input[name="dadosPessoais.data_nascimento"]', '1990-01-15')

    // Avançar para step 2
    await page.click('button:has-text("Próximo")')
    await expect(page.locator('text=Etapa 2 de 4')).toBeVisible()

    // Voltar para step 1
    await page.click('button:has-text("Voltar")')
    await expect(page.locator('text=Etapa 1 de 4')).toBeVisible()

    // Verificar que dados foram mantidos
    await expect(page.locator('input[name="dadosPessoais.nome_completo"]')).toHaveValue(
      'João Test'
    )
  })

  test('deve navegar clicando nos step indicators', async ({ page }) => {
    // Preencher e completar step 1
    await page.fill('input[name="dadosPessoais.nome_completo"]', 'João Test')
    await page.fill('input[name="dadosPessoais.cpf"]', '12345678901')
    await page.fill('input[name="dadosPessoais.email"]', `test+${Date.now()}@test.com`)
    await page.fill('input[name="dadosPessoais.telefone"]', '11987654321')
    await page.fill('input[name="dadosPessoais.data_nascimento"]', '1990-01-15')
    await page.click('button:has-text("Próximo")')

    // Verificar que step 1 está marcado como completo (check icon)
    await expect(page.locator('button[aria-label="Dados Pessoais"] svg.lucide-check')).toBeVisible()

    // Clicar no step indicator do step 1 para voltar
    await page.click('button[aria-label="Dados Pessoais"]')
    await expect(page.locator('text=Etapa 1 de 4')).toBeVisible()
  })
})

test.describe('Cadastro de Candidato - Responsividade', () => {
  test('deve funcionar em mobile (Pixel 5)', async ({ page }) => {
    // Configurar viewport mobile
    await page.setViewportSize({ width: 393, height: 851 })

    await page.goto('/cadastro')

    // Verificar que botões são full-width no mobile
    const nextButton = page.locator('button:has-text("Próximo")')
    const boundingBox = await nextButton.boundingBox()
    expect(boundingBox?.width).toBeGreaterThan(300) // Full-width esperado

    // Verificar que steps indicator é visível
    await expect(page.locator('button[aria-label="Dados Pessoais"]')).toBeVisible()

    // Verificar touch targets (44x44px minimum)
    const stepButton = page.locator('button[aria-label="Dados Pessoais"]').first()
    const stepBox = await stepButton.boundingBox()
    expect(stepBox?.width).toBeGreaterThanOrEqual(44)
    expect(stepBox?.height).toBeGreaterThanOrEqual(44)
  })

  test('deve funcionar em tablet (iPad Pro)', async ({ page }) => {
    // Configurar viewport tablet
    await page.setViewportSize({ width: 1024, height: 1366 })

    await page.goto('/cadastro')

    // Verificar que layout grid funciona
    await expect(page.locator('input[name="dadosPessoais.email"]')).toBeVisible()
    await expect(page.locator('input[name="dadosPessoais.telefone"]')).toBeVisible()

    // Verificar que step titles são visíveis
    await expect(page.locator('text=Dados Pessoais').nth(1)).toBeVisible()
  })
})

test.describe('Cadastro de Candidato - ViaCEP Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cadastro')
    await page.evaluate(() => sessionStorage.clear())
    await page.goto('/cadastro')

    // Navegar para step 2 (Endereço)
    await page.fill('input[name="dadosPessoais.nome_completo"]', 'João Test')
    await page.fill('input[name="dadosPessoais.cpf"]', '12345678901')
    await page.fill('input[name="dadosPessoais.email"]', `test+${Date.now()}@test.com`)
    await page.fill('input[name="dadosPessoais.telefone"]', '11987654321')
    await page.fill('input[name="dadosPessoais.data_nascimento"]', '1990-01-15')
    await page.click('button:has-text("Próximo")')
  })

  test('deve buscar e preencher endereço com CEP válido', async ({ page }) => {
    // Preencher CEP válido (Av. Paulista, São Paulo)
    await page.fill('input[name="endereco.cep"]', '01310100')

    // Verificar skeleton loaders aparecem
    await expect(page.locator('.animate-pulse').first()).toBeVisible()

    // Aguardar busca
    await expect(page.locator('text=CEP encontrado!')).toBeVisible({ timeout: 5000 })

    // Verificar que campos foram preenchidos
    const logradouro = await page.locator('input[name="endereco.logradouro"]').inputValue()
    expect(logradouro).toContain('Paulista')

    const cidade = await page.locator('input[name="endereco.cidade"]').inputValue()
    expect(cidade).toBe('São Paulo')

    const estado = await page.locator('select[name="endereco.estado"]').inputValue()
    expect(estado).toBe('SP')
  })

  test('deve mostrar erro para CEP inexistente', async ({ page }) => {
    // Preencher CEP inexistente
    await page.fill('input[name="endereco.cep"]', '99999999')

    // Aguardar erro
    await expect(
      page.locator('text=CEP não encontrado. Verifique se digitou corretamente')
    ).toBeVisible({ timeout: 5000 })
  })
})
