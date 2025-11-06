/**
 * E2E Test: Fluxo Completo de Cadastro
 *
 * Testa o fluxo completo de cadastro de candidato através de 5 etapas:
 * 1. Dados Pessoais (com validação de CPF e Email)
 * 2. Endereço (com integração ViaCEP)
 * 3. Dados Profissionais
 * 4. Disponibilidade
 * 5. Autorizações LGPD
 *
 * Verifica:
 * - Navegação entre steps
 * - Validações de campos obrigatórios
 * - Formatação de CPF/Telefone/CEP
 * - Integração com ViaCEP
 * - Duplicate check (CPF/Email)
 * - Submit final do formulário
 */

import { test, expect } from '@playwright/test'

test.describe('Cadastro de Candidato - Fluxo Completo', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para página de cadastro
    await page.goto('/cadastro')
  })

  test('deve completar o cadastro com sucesso', async ({ page }) => {
    // ============================================
    // STEP 1: DADOS PESSOAIS
    // ============================================

    // Verificar que estamos no step 1
    await expect(page.locator('text=Dados Pessoais')).toBeVisible()
    await expect(page.locator('text=Etapa 1 de 5')).toBeVisible()

    // Preencher nome completo
    await page.fill('input[name="dadosPessoais.nome_completo"]', 'João da Silva Test')

    // Preencher CPF (será formatado automaticamente)
    await page.fill('input[name="dadosPessoais.cpf"]', '12345678901')
    await expect(page.locator('input[name="dadosPessoais.cpf"]')).toHaveValue('123.456.789-01')

    // Aguardar verificação de duplicata do CPF
    await expect(page.locator('text=CPF válido e disponível!')).toBeVisible({ timeout: 3000 })

    // Preencher email
    const testEmail = `test+${Date.now()}@beautysmile.com.br`
    await page.fill('input[name="dadosPessoais.email"]', testEmail)

    // Aguardar verificação de duplicata do email
    await expect(page.locator('text=Email válido e disponível!')).toBeVisible({ timeout: 3000 })

    // Preencher telefone
    await page.fill('input[name="dadosPessoais.telefone"]', '11987654321')
    await expect(page.locator('input[name="dadosPessoais.telefone"]')).toHaveValue('(11) 98765-4321')

    // Preencher data de nascimento
    await page.fill('input[name="dadosPessoais.data_nascimento"]', '1990-01-15')

    // Selecionar gênero
    await page.click('[id="genero"]')
    await page.click('text=Masculino')

    // Clicar em Próximo
    await page.click('button:has-text("Próximo")')

    // ============================================
    // STEP 2: ENDEREÇO
    // ============================================

    // Verificar que avançou para step 2
    await expect(page.locator('text=Endereço')).toBeVisible()
    await expect(page.locator('text=Etapa 2 de 5')).toBeVisible()

    // Preencher CEP (ViaCEP integration)
    await page.fill('input[name="endereco.cep"]', '01310100')
    await expect(page.locator('input[name="endereco.cep"]')).toHaveValue('01310-100')

    // Aguardar busca do CEP
    await expect(page.locator('text=CEP encontrado!')).toBeVisible({ timeout: 5000 })

    // Verificar que logradouro foi preenchido automaticamente
    await expect(page.locator('input[name="endereco.logradouro"]')).not.toBeEmpty()

    // Preencher número
    await page.fill('input[name="endereco.numero"]', '123')

    // Preencher complemento (opcional)
    await page.fill('input[name="endereco.complemento"]', 'Apto 45')

    // Verificar que bairro, cidade e estado foram preenchidos
    await expect(page.locator('input[name="endereco.bairro"]')).not.toBeEmpty()
    await expect(page.locator('input[name="endereco.cidade"]')).not.toBeEmpty()

    // Clicar em Próximo
    await page.click('button:has-text("Próximo")')

    // ============================================
    // STEP 3: DADOS PROFISSIONAIS
    // ============================================

    // Verificar que avançou para step 3
    await expect(page.locator('text=Dados Profissionais')).toBeVisible()
    await expect(page.locator('text=Etapa 3 de 5')).toBeVisible()

    // Selecionar experiência
    await page.click('[id="experiencia_area"]')
    await page.click('text=1 a 3 anos')

    // Selecionar escolaridade
    await page.click('[id="nivel_escolaridade"]')
    await page.click('text=Superior Completo')

    // Preencher instituição (opcional)
    await page.fill('input[name="dadosProfissionais.instituicao_ensino"]', 'USP')

    // Preencher curso (opcional)
    await page.fill('input[name="dadosProfissionais.curso"]', 'Administração')

    // Preencher ano de conclusão (opcional)
    await page.fill('input[name="dadosProfissionais.ano_conclusao"]', '2020')

    // Marcar que possui CNH
    await page.click('[id="possui_cnh"]')

    // Selecionar categoria B
    await page.click('[id="categoria_B"]')

    // Clicar em Próximo
    await page.click('button:has-text("Próximo")')

    // ============================================
    // STEP 4: DISPONIBILIDADE
    // ============================================

    // Verificar que avançou para step 4
    await expect(page.locator('text=Disponibilidade')).toBeVisible()
    await expect(page.locator('text=Etapa 4 de 5')).toBeVisible()

    // Selecionar turno integral
    await page.click('[id="turno_integral"]')

    // Selecionar modelo híbrido
    await page.click('[id="modelo_hibrido"]')

    // Marcar disponibilidade imediata
    await page.click('[id="disponibilidade_imediata"]')

    // Marcar aceita viajar
    await page.click('[id="aceita_viajar"]')

    // Clicar em Próximo
    await page.click('button:has-text("Próximo")')

    // ============================================
    // STEP 5: AUTORIZAÇÕES
    // ============================================

    // Verificar que avançou para step 5
    await expect(page.locator('text=Autorizações')).toBeVisible()
    await expect(page.locator('text=Etapa 5 de 5')).toBeVisible()

    // Verificar que autorização obrigatória já está marcada (default)
    await expect(page.locator('[id="autorizacao_uso_dados"]')).toBeChecked()

    // Marcar outras autorizações opcionais
    await page.click('[id="autorizacao_comunicacao"]')
    await page.click('[id="autorizacao_retencao_curriculo"]')

    // Clicar em Finalizar Cadastro
    await page.click('button:has-text("Finalizar Cadastro")')

    // ============================================
    // VERIFICAR SUCESSO
    // ============================================

    // Verificar que dialog de loading aparece
    await expect(page.locator('text=Processando cadastro')).toBeVisible({ timeout: 2000 })

    // Verificar progresso das 7 etapas
    await expect(page.locator('text=Criando conta de acesso...')).toBeVisible()
    await expect(page.locator('text=Salvando dados do candidato...')).toBeVisible()
    await expect(page.locator('text=Salvando endereço...')).toBeVisible()

    // Aguardar conclusão (timeout maior para processamento completo)
    await expect(page.locator('text=Cadastro realizado com sucesso!')).toBeVisible({
      timeout: 15000,
    })
  })

  test('deve validar campos obrigatórios no step 1', async ({ page }) => {
    // Tentar avançar sem preencher nada
    await page.click('button:has-text("Próximo")')

    // Verificar que toast de erro aparece
    await expect(
      page.locator('text=Verifique os campos. Alguns campos contêm erros ou estão vazios')
    ).toBeVisible()

    // Verificar que continua no step 1
    await expect(page.locator('text=Etapa 1 de 5')).toBeVisible()
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
    await expect(page.locator('text=Etapa 2 de 5')).toBeVisible()

    // Voltar para step 1
    await page.click('button:has-text("Voltar")')
    await expect(page.locator('text=Etapa 1 de 5')).toBeVisible()

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
    await expect(page.locator('text=Etapa 1 de 5')).toBeVisible()
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
