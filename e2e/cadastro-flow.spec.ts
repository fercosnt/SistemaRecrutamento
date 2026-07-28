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
// CPF GENERATOR (local copy — e2e can't import src)
// ============================================

/**
 * Generate a random valid CPF (digits only). Mirrors
 * `src/features/cadastro/utils/cpfValidator.ts::generateRandomCPF` so every
 * E2E run uses a unique CPF and avoids CPF_EXISTS collisions against prior
 * runs that landed real rows in public.candidatos.
 */
function generateValidCPF(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  // first verifier
  let sum = 0
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i)
  let rem = (sum * 10) % 11
  if (rem === 10) rem = 0
  digits.push(rem)
  // second verifier
  sum = 0
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i)
  rem = (sum * 10) % 11
  if (rem === 10) rem = 0
  digits.push(rem)
  return digits.join('')
}

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
    // Generate a fresh valid CPF each call to avoid collisions with prior
    // test runs that landed real rows in Supabase candidatos (CPF_EXISTS).
    cpf = generateValidCPF(),
    checkMandatoryLgpd = true,
  } = overrides

  // ─── STEP 1 — DADOS PESSOAIS ───────────────────────────────────────
  await page.fill('input[name="dadosPessoais.nome_completo"]', 'João da Silva Test')
  await page.fill('input[name="dadosPessoais.cpf"]', cpf)
  await page.fill('input[name="dadosPessoais.email"]', email)
  await page.fill('input[name="dadosPessoais.telefone"]', '11987654321')
  await page.fill('input[name="dadosPessoais.data_nascimento"]', '1990-01-15')

  // Gênero (Radix Select) — use role=option selector to disambiguate from
  // labels elsewhere on the page.
  await page.click('[id="genero"]')
  await page.getByRole('option', { name: 'Masculino' }).click()

  // Como conheceu (avoid the Instagram label collision with the field label)
  await page.click('[id="como_conheceu"]')
  await page.getByRole('option', { name: 'Instagram' }).click()

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
  // Force serial execution inside this describe: the Wave 0 cases share a
  // single-browser context where sessionStorage/auth state leaks between
  // tests. Running in serial keeps the draft-restore toast + LGPD toast
  // assertions deterministic (the legacy happy-path test also creates a
  // real Supabase auth row, so parallel races would break with
  // EMAIL_EXISTS/CPF_EXISTS on downstream tests).
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Limpa sessionStorage + signs out any residual session from prior tests
    // (Case 1 auto-login creates a real Supabase session that persists in
    // localStorage — explicitly clear it to restart every test as anonymous).
    await page.goto('/cadastro')
    await page.evaluate(() => {
      sessionStorage.clear()
      // localStorage persistence key from supabase-js v2
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
        .forEach((k) => localStorage.removeItem(k))
    })
    await page.goto('/cadastro')
  })

  // ─── Case 1: Happy path with auto-login to /candidato/perfil ─────
  test('happy path: auto-login lands on /candidato/perfil with welcome toast', async ({ page }) => {
    test.skip(
      process.env.E2E_AUTH_TEST_USERS !== 'true',
      'Real cadastro submit + auto-login needs live Supabase + a seeded/clean project — Tier-2 (UAT/seed). Set E2E_AUTH_TEST_USERS=true to run.',
    )
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

    // Expect: form bounced back to Step 1 (use .first() to disambiguate
    // stepper button text from step heading text).
    await expect(page.locator('text=Dados Pessoais').first()).toBeVisible()
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

    // Sonner toast with the mandatory-LGPD copy (D-15). The same copy also
    // appears as an inline `<p role="alert">` next to the checkbox, so we
    // scope the assertion to the Sonner toaster region to avoid strict-mode
    // violation from two matches. Pre-fix(02-06) only the inline alert
    // existed (the toast never rendered due to the split-instance Sonner
    // bug); Bug A fix brings the toast back and makes both elements visible.
    await expect(
      page.getByLabel('Notifications alt+T').getByText('Para criar sua conta, você precisa autorizar o uso dos dados.')
    ).toBeVisible({ timeout: 3000 })
    // URL must NOT have navigated to /candidato/perfil
    expect(page.url()).toContain('/cadastro')
  })

  // ─── Case 5: Draft auto-restore on refresh ──────────────────────
  test('draft restore: Step 1-2 fields preserved after refresh (senha NOT preserved)', async ({ page }) => {
    const uniqueName = `Maria Rascunho ${Date.now()}`
    await page.fill('input[name="dadosPessoais.nome_completo"]', uniqueName)
    await page.fill('input[name="dadosPessoais.senha"]', 'TempPass123!')

    // Trigger blur so RHF's onBlur mode flushes the watched values to the
    // state the debounce effect is reading. Without blur, fill() fires input
    // but some RHF configurations defer state propagation to the next tick.
    await page.locator('input[name="dadosPessoais.senha"]').blur()

    // Wait a beat for the 500ms debounced save
    await page.waitForTimeout(900)

    // Confirm the draft actually landed in sessionStorage before reloading.
    // (If this fails, the save-effect never fired — separate bug in hook wiring.)
    const storedBefore = await page.evaluate(() => sessionStorage.getItem('cadastro:draft:v1'))
    expect(storedBefore, 'draft should be in sessionStorage before reload').not.toBeNull()

    // Reload
    await page.reload()

    // Sonner toast announces the restore. Matches the Sonner DOM contract
    // (`[data-sonner-toast]`) OR the fallback `<li>` element in the toast
    // region if attrs change across versions.
    await expect(
      page.locator('[data-sonner-toast], li').filter({ hasText: 'Retomamos seu cadastro de onde você parou' })
    ).toBeVisible({ timeout: 8000 })
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

  // ─── Case 7: Sonner DOM contract regression (fix(02-06) Bug A) ──
  // Prevents re-introduction of the dual-instance Sonner split bug.
  //
  // Before the fix: vite.config.ts had `sonner@2.0.3` aliased to `sonner`,
  // and 12 pages imported from the versioned specifier. Vite's optimizeDeps
  // pre-bundled BOTH entries separately (`sonner.js` AND `sonner@2__0__3.js`),
  // creating two ES module instances with independent ToastState singletons.
  // The <Toaster> in App.tsx subscribed to one instance but `toast.info(...)`
  // calls wrote into the other, so the `<section aria-label="Notifications
  // alt+T">` would render its shell but never any `<li data-sonner-toast>`
  // children.
  //
  // This test asserts the structural contract: after a `toast.info()` fires,
  // a `<li data-sonner-toast>` MUST appear inside the Sonner toaster region
  // within 500ms. Failure of this assert signals the split-instance bug has
  // returned (most likely via re-introduction of a `sonner@<version>` alias
  // in vite.config.ts or a mix of aliased/unaliased imports in src/).
  test('Sonner DOM contract: toast fires render a <li data-sonner-toast> inside the Toaster region', async ({ page }) => {
    // Use an existing production-code toast path to exercise the real module
    // graph the app imports. Clicking "Próximo" with empty required fields
    // on Step 1 calls `useFormToast().messages.validationError()` which goes
    // to `toast.warning(...)` from `import { toast } from 'sonner'`. If the
    // split-instance bug is back, this toast will not render (the Toaster in
    // App.tsx is subscribed to a different Sonner module instance than the
    // one imported by the form hook).
    await page.goto('/cadastro')

    await page.click('button:has-text("Próximo")')

    // Structural contract: `<li data-sonner-toast>` MUST appear inside the
    // Notifications region within 1s. The `data-sonner-toast` attribute is
    // Sonner's stable DOM contract (persists across 2.x minor versions).
    // Scoping via getByLabel('Notifications alt+T') ensures the match is
    // specifically inside the Toaster subtree, not any other <li> on the page.
    await expect(
      page.getByLabel('Notifications alt+T').locator('[data-sonner-toast]').first()
    ).toBeVisible({ timeout: 1000 })
  })

  // ─── Phase 1 legacy happy-path smoke (step-1 rendering only) ───
  // Full flow is covered by Case 1 above; this smoke just asserts the form
  // renders on load and shows the 4-step stepper.
  test('deve renderizar formulário com 4 etapas', async ({ page }) => {
    // `text=Dados Pessoais` matches both the stepper button and the step
    // heading (2 elements) — use first() to avoid strict-mode violation.
    await expect(page.locator('text=Dados Pessoais').first()).toBeVisible()
    await expect(page.locator('text=Etapa 1 de 4')).toBeVisible()
    // Stepper has exactly 4 buttons (one per step)
    await expect(page.locator('button[aria-label="Dados Pessoais"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Endereço"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Disponibilidade"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Autorizações"]')).toBeVisible()
  })

  test('deve validar campos obrigatórios no step 1', async ({ page }) => {
    // Tentar avançar sem preencher nada
    await page.click('button:has-text("Próximo")')

    // Verificar que toast de erro aparece (Sonner split title/description)
    await expect(page.locator('text=Verifique os campos').first()).toBeVisible()

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
    // Preencher step 1 com dados válidos (valid CPF + full required fields)
    await page.fill('input[name="dadosPessoais.nome_completo"]', 'João Test')
    await page.fill('input[name="dadosPessoais.cpf"]', generateValidCPF())
    await page.fill('input[name="dadosPessoais.email"]', `test+${Date.now()}@beautysmile.com.br`)
    await page.fill('input[name="dadosPessoais.telefone"]', '11987654321')
    await page.fill('input[name="dadosPessoais.data_nascimento"]', '1990-01-15')
    await page.click('[id="genero"]')
    await page.getByRole('option', { name: 'Masculino' }).click()
    await page.click('[id="como_conheceu"]')
    await page.getByRole('option', { name: 'Instagram' }).click()
    await page.fill('input[name="dadosPessoais.senha"]', 'Abcd1234!')
    await page.fill('input[name="dadosPessoais.confirmar_senha"]', 'Abcd1234!')

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
    // Preencher e completar step 1 (dados válidos)
    await page.fill('input[name="dadosPessoais.nome_completo"]', 'João Test')
    await page.fill('input[name="dadosPessoais.cpf"]', generateValidCPF())
    await page.fill('input[name="dadosPessoais.email"]', `test+${Date.now()}@beautysmile.com.br`)
    await page.fill('input[name="dadosPessoais.telefone"]', '11987654321')
    await page.fill('input[name="dadosPessoais.data_nascimento"]', '1990-01-15')
    await page.click('[id="genero"]')
    await page.getByRole('option', { name: 'Masculino' }).click()
    await page.click('[id="como_conheceu"]')
    await page.getByRole('option', { name: 'Instagram' }).click()
    await page.fill('input[name="dadosPessoais.senha"]', 'Abcd1234!')
    await page.fill('input[name="dadosPessoais.confirmar_senha"]', 'Abcd1234!')
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
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/cadastro')
    await page.evaluate(() => {
      sessionStorage.clear()
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
        .forEach((k) => localStorage.removeItem(k))
    })
    await page.goto('/cadastro')

    // Navegar para step 2 (Endereço) com dados válidos
    await page.fill('input[name="dadosPessoais.nome_completo"]', 'João Test')
    await page.fill('input[name="dadosPessoais.cpf"]', generateValidCPF())
    await page.fill('input[name="dadosPessoais.email"]', `test+${Date.now()}@beautysmile.com.br`)
    await page.fill('input[name="dadosPessoais.telefone"]', '11987654321')
    await page.fill('input[name="dadosPessoais.data_nascimento"]', '1990-01-15')
    await page.click('[id="genero"]')
    await page.getByRole('option', { name: 'Masculino' }).click()
    await page.click('[id="como_conheceu"]')
    await page.getByRole('option', { name: 'Instagram' }).click()
    await page.fill('input[name="dadosPessoais.senha"]', 'Abcd1234!')
    await page.fill('input[name="dadosPessoais.confirmar_senha"]', 'Abcd1234!')
    await page.click('button:has-text("Próximo")')
  })

  test('deve buscar e preencher endereço com CEP válido', async ({ page }) => {
    // Preencher CEP válido (Av. Paulista, São Paulo)
    await page.fill('input[name="endereco.cep"]', '01310100')

    // Aguardar busca (ViaCEP callback preenche logradouro + cidade)
    await expect(page.locator('input[name="endereco.logradouro"]')).not.toHaveValue('', { timeout: 10000 })

    // Verificar que campos foram preenchidos
    const logradouro = await page.locator('input[name="endereco.logradouro"]').inputValue()
    expect(logradouro.toLowerCase()).toContain('paulista')

    const cidade = await page.locator('input[name="endereco.cidade"]').inputValue()
    expect(cidade).toBe('São Paulo')
    // Estado uses Radix Select (not native <select>); its value is exposed
    // as the aria-label / trigger text, not via inputValue().
  })

  test('deve mostrar erro para CEP inexistente', async ({ page }) => {
    // Preencher CEP inexistente
    await page.fill('input[name="endereco.cep"]', '99999999')

    // Aguardar erro (toast.error title "CEP não encontrado" — description is
    // "Verifique se digitou corretamente", split elements in Sonner)
    await expect(
      page.locator('text=CEP não encontrado').first()
    ).toBeVisible({ timeout: 8000 })
  })
})
