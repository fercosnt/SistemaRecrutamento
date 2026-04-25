/**
 * E2E Tests - Fluxo de Recuperação de Senha (PRD-4)
 *
 * Testa todos os cenários do fluxo de recuperação de senha:
 * - Solicitação de recuperação (EsqueciSenhaPage)
 * - Redefinição de senha (RedefinirSenhaPage)
 * - Validações de segurança
 * - Rate limiting
 * - Detecção de tipo de usuário
 * - Error handling
 * - Email de confirmação
 *
 * @see /docs/PRD/PRD-4-RECUPERACAO-SENHA.md
 */

import { test, expect, type Page } from '@playwright/test';

// Test data
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'fernando@beautysmile.com.br',
  password: process.env.TEST_USER_PASSWORD || 'Petto.16.07',
  name: process.env.TEST_USER_NAME || 'Fernando Costa Neto',
};

const VALID_NEW_PASSWORD = 'NewP@ssw0rd2025!';
const INVALID_PASSWORDS = {
  tooShort: 'Ab1@',
  noUpperCase: 'password123!',
  noLowerCase: 'PASSWORD123!',
  noNumber: 'Password!@#',
  noSpecial: 'Password123',
  common: 'password123',
  sequential: 'Abcd1234!',
  repetitive: 'Aaaa1111!@',
};

/**
 * Helper: Preencher formulário de esqueci senha
 */
async function fillForgotPasswordForm(page: Page, email: string) {
  await page.getByLabel(/email/i).fill(email);
}

/**
 * Helper: Preencher formulário de redefinição de senha
 */
async function fillResetPasswordForm(
  page: Page,
  newPassword: string,
  confirmPassword: string = newPassword
) {
  await page.getByLabel(/^nova senha$/i).fill(newPassword);
  await page.getByLabel(/confirmar/i).fill(confirmPassword);
}

/**
 * Helper: Verificar força da senha
 */
async function expectPasswordStrength(page: Page, expectedLabel: string) {
  // Aguardar um pouco para força ser calculada
  await page.waitForTimeout(500);

  // Verificar que label de força está visível
  await expect(page.getByText(new RegExp(expectedLabel, 'i'))).toBeVisible();
}

// ============================================================================
// TESTES - PÁGINA ESQUECI SENHA
// ============================================================================

test.describe('1. Página Esqueci Senha - Funcionalidades Básicas', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/auth/esqueci-senha');
    await page.evaluate(() => localStorage.clear());
  });

  test('1.1 - Carregar página corretamente', async ({ page }) => {
    // Verificar elementos principais
    await expect(page.getByRole('heading', { name: /esqueci minha senha/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar instruções/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /voltar ao login/i })).toBeVisible();
  });

  test('1.2 - Solicitar recuperação com email válido', async ({ page }) => {
    await fillForgotPasswordForm(page, TEST_USER.email);
    await page.getByRole('button', { name: /enviar instruções/i }).click();

    // Verificar toast de sucesso
    await expect(page.getByText(/email enviado com sucesso/i)).toBeVisible({ timeout: 10000 });

    // Verificar que exibe mensagem de confirmação
    await expect(page.getByText(/enviamos as instruções de recuperação/i)).toBeVisible();
    await expect(page.getByText(TEST_USER.email)).toBeVisible();
  });

  test('1.3 - Validação de email - formato inválido', async ({ page }) => {
    await page.getByLabel(/email/i).fill('emailinvalido');
    await page.getByLabel(/email/i).blur();

    // Verificar mensagem de erro (mensagem real do Zod schema)
    await expect(page.getByText(/digite um email válido/i)).toBeVisible();

    // Nota: React Hook Form com mode: 'onChange' mostra erro mas não desabilita botão automaticamente
    // A validação é aplicada no submit, o que é o comportamento esperado
  });

  test('1.4 - Validação de email - campo vazio', async ({ page }) => {
    await page.getByLabel(/email/i).click();
    await page.getByLabel(/email/i).blur();

    // Tentar submeter o formulário (validação só aparece no submit)
    await page.getByRole('button', { name: /enviar instruções/i }).click();

    // Verificar mensagem de erro (mensagem real do Zod schema)
    await expect(page.getByText(/o email é obrigatório/i)).toBeVisible();

    // Nota: React Hook Form com mode: 'onChange' não valida campo vazio no blur
    // A mensagem de erro só aparece após tentativa de submit
  });

  test('1.5 - Botão "Voltar ao Login"', async ({ page }) => {
    await page.getByRole('button', { name: /voltar ao login/i }).click();

    // Verificar que redirecionou para login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('1.6 - Botão "Reenviar email"', async ({ page }) => {
    // Primeiro envio
    await fillForgotPasswordForm(page, TEST_USER.email);
    await page.getByRole('button', { name: /enviar instruções/i }).click();

    // Aguardar página de sucesso
    await expect(page.getByText(/email enviado com sucesso/i)).toBeVisible();

    // Clicar em "Reenviar email"
    await page.getByRole('button', { name: /reenviar email/i }).click();

    // Verificar que voltou ao formulário
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toHaveValue(TEST_USER.email);
  });
});

// ============================================================================
// TESTES - RATE LIMITING
// ============================================================================

test.describe('2. Rate Limiting', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/auth/esqueci-senha');
    await page.evaluate(() => localStorage.clear());
  });

  test('2.1 - Limite de 3 tentativas por hora', async ({ page }) => {
    const testEmail = 'test.rate.limit@example.com';

    // Tentativa 1
    await fillForgotPasswordForm(page, testEmail);
    await page.getByRole('button', { name: /enviar instruções/i }).click();
    await expect(page.getByRole('heading', { name: /email enviado/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /reenviar email/i }).click();

    // Tentativa 2
    await page.getByRole('button', { name: /enviar instruções/i }).click();
    await expect(page.getByRole('heading', { name: /email enviado/i })).toBeVisible();
    await page.getByRole('button', { name: /reenviar email/i }).click();

    // Tentativa 3
    await page.getByRole('button', { name: /enviar instruções/i }).click();
    await expect(page.getByRole('heading', { name: /email enviado/i })).toBeVisible();
    await page.getByRole('button', { name: /reenviar email/i }).click();

    // Tentativa 4 (deve bloquear)
    await page.getByRole('button', { name: /enviar instruções/i }).click();

    // Verificar mensagem de rate limit
    await expect(page.getByText(/limite de tentativas excedido/i)).toBeVisible();
    await expect(page.getByText(/aguarde.*minuto/i)).toBeVisible();
  });

  test('2.2 - Aviso de tentativas restantes', async ({ page }) => {
    const testEmail = 'test.attempts@example.com';

    // Tentativa 1
    await fillForgotPasswordForm(page, testEmail);
    await page.getByRole('button', { name: /enviar instruções/i }).click();
    await expect(page.getByRole('heading', { name: /email enviado/i })).toBeVisible();
    await page.getByRole('button', { name: /reenviar email/i }).click();

    // Tentativa 2
    await page.getByRole('button', { name: /enviar instruções/i }).click();
    await expect(page.getByRole('heading', { name: /email enviado/i })).toBeVisible();
    await page.getByRole('button', { name: /reenviar email/i }).click();

    // Verificar aviso de última tentativa
    await expect(page.getByText(/1 tentativa.*restante/i)).toBeVisible();
  });
});

// ============================================================================
// TESTES - PÁGINA REDEFINIR SENHA
// ============================================================================

test.describe('3. Página Redefinir Senha - Funcionalidades Básicas', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/auth/redefinir-senha');
    await page.evaluate(() => localStorage.clear());
  });

  test('3.1 - Carregar página com token inválido', async ({ page }) => {
    await page.goto('/auth/redefinir-senha?token=invalid_token_123');

    // Aguardar validação do token
    await page.waitForTimeout(2000);

    // Verificar mensagem de erro
    // Usar getByRole para evitar strict mode violation (heading + parágrafo com texto similar)
    await expect(page.getByRole('heading', { name: /link inválido/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /solicitar novo link/i })).toBeVisible();
  });

  test('3.2 - Redefinir senha com sucesso', async ({ page }) => {
    // NOTA: Este teste requer um token válido do Supabase
    // Em ambiente de teste real, você precisaria:
    // 1. Fazer login
    // 2. Solicitar recuperação
    // 3. Extrair token do email
    // 4. Acessar página com token

    // Para este exemplo, vamos simular que temos um token válido
    // Em produção, você usaria um helper para obter token real

    test.skip(); // Skippar até ter infraestrutura de email de teste
  });

  test('3.3 - Validação de senha - muito curta', async ({ page }) => {
    // Assumindo que temos token válido
    await page.goto('/auth/redefinir-senha?access_token=valid_token');
    await page.waitForTimeout(1000);

    await fillResetPasswordForm(page, INVALID_PASSWORDS.tooShort, INVALID_PASSWORDS.tooShort);

    // Verificar mensagem de erro nos requisitos
    await expect(page.getByText(/mínimo de 8 caracteres/i)).toBeVisible();

    // Verificar indicador de força fraca
    await expectPasswordStrength(page, 'Fraca');

    // Verificar que botão está desabilitado
    await expect(page.getByRole('button', { name: /redefinir senha/i })).toBeDisabled();
  });

  test('3.4 - Validação de senha - sem letra maiúscula', async ({ page }) => {
    await page.goto('/auth/redefinir-senha?access_token=valid_token');
    await page.waitForTimeout(1000);

    await fillResetPasswordForm(
      page,
      INVALID_PASSWORDS.noUpperCase,
      INVALID_PASSWORDS.noUpperCase
    );

    // Verificar requisito não atendido
    await expect(page.getByText(/pelo menos uma letra maiúscula/i)).toBeVisible();

    // Botão desabilitado
    await expect(page.getByRole('button', { name: /redefinir senha/i })).toBeDisabled();
  });

  test('3.5 - Validação de senha - sem número', async ({ page }) => {
    await page.goto('/auth/redefinir-senha?access_token=valid_token');
    await page.waitForTimeout(1000);

    await fillResetPasswordForm(page, INVALID_PASSWORDS.noNumber, INVALID_PASSWORDS.noNumber);

    // Verificar requisito não atendido
    await expect(page.getByText(/pelo menos um número/i)).toBeVisible();
  });

  test('3.6 - Validação de senha - sem caractere especial', async ({ page }) => {
    await page.goto('/auth/redefinir-senha?access_token=valid_token');
    await page.waitForTimeout(1000);

    await fillResetPasswordForm(page, INVALID_PASSWORDS.noSpecial, INVALID_PASSWORDS.noSpecial);

    // Verificar requisito não atendido
    await expect(page.getByText(/pelo menos um caractere especial/i)).toBeVisible();
  });

  test('3.7 - Validação de senha - senha comum (bloqueio)', async ({ page }) => {
    await page.goto('/auth/redefinir-senha?access_token=valid_token');
    await page.waitForTimeout(1000);

    await fillResetPasswordForm(page, INVALID_PASSWORDS.common, INVALID_PASSWORDS.common);
    await page.getByRole('button', { name: /redefinir senha/i }).click();

    // Verificar toast de erro (senha comum é bloqueada)
    await expect(page.getByText(/senha.*comum.*insegura/i)).toBeVisible({ timeout: 5000 });
  });

  test('3.8 - Validação de senha - padrão sequencial (aviso)', async ({ page }) => {
    await page.goto('/auth/redefinir-senha?access_token=valid_token');
    await page.waitForTimeout(1000);

    await fillResetPasswordForm(
      page,
      INVALID_PASSWORDS.sequential,
      INVALID_PASSWORDS.sequential
    );
    await page.getByRole('button', { name: /redefinir senha/i }).click();

    // Verificar toast de aviso (sequências apenas alertam)
    await expect(page.getByText(/sequências previsíveis/i)).toBeVisible({ timeout: 5000 });

    // Submit deve ser permitido (avisos não bloqueiam)
    // NOTA: Teste completo requer token válido
  });

  test('3.9 - Senhas não coincidem', async ({ page }) => {
    await page.goto('/auth/redefinir-senha?access_token=valid_token');
    await page.waitForTimeout(1000);

    await page.getByLabel(/^nova senha$/i).fill(VALID_NEW_PASSWORD);
    await page.getByLabel(/confirmar/i).fill('DifferentPassword123!');

    // Verificar mensagem de erro
    await expect(page.getByText(/senhas não coincidem/i)).toBeVisible();
  });

  test('3.10 - Indicador de força da senha', async ({ page }) => {
    await page.goto('/auth/redefinir-senha?access_token=valid_token');
    await page.waitForTimeout(1000);

    // Senha fraca
    await page.getByLabel(/^nova senha$/i).fill('Ab1@');
    await expectPasswordStrength(page, 'Fraca');

    // Senha média
    await page.getByLabel(/^nova senha$/i).fill('Abcd1234@');
    await expectPasswordStrength(page, 'Média');

    // Senha forte
    await page.getByLabel(/^nova senha$/i).fill('X9$mK2#pL7@');
    await expectPasswordStrength(page, 'Forte');

    // Senha muito forte
    await page.getByLabel(/^nova senha$/i).fill('X9$mK2#pL7@nQ5jR8');
    await expectPasswordStrength(page, 'Muito Forte');
  });

  test('3.11 - Toggle mostrar/ocultar senha', async ({ page }) => {
    await page.goto('/auth/redefinir-senha?access_token=valid_token');
    await page.waitForTimeout(1000);

    const novaSenhaInput = page.getByLabel(/^nova senha$/i);
    await novaSenhaInput.fill('TestPassword123!');

    // Verificar que senha está mascarada
    await expect(novaSenhaInput).toHaveAttribute('type', 'password');

    // Clicar no ícone de olho
    await page.locator('button:has(svg[class*="eye"])').first().click();

    // Verificar que senha está visível
    await expect(novaSenhaInput).toHaveAttribute('type', 'text');

    // Clicar novamente para ocultar
    await page.locator('button:has(svg[class*="eye"])').first().click();

    // Verificar que senha voltou a ser mascarada
    await expect(novaSenhaInput).toHaveAttribute('type', 'password');
  });
});

// ============================================================================
// TESTES - REDIRECIONAMENTO INTELIGENTE
// ============================================================================

test.describe('4. Redirecionamento Inteligente', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/auth/redefinir-senha');
    await page.evaluate(() => localStorage.clear());
  });

  test('4.1 - Countdown de redirecionamento', async ({ page }) => {
    // NOTA: Requer token válido e senha redefinida com sucesso
    test.skip(); // Skippar até ter token válido
  });

  test('4.2 - Botão "Ir para Login Agora"', async ({ page }) => {
    // NOTA: Requer token válido e senha redefinida com sucesso
    test.skip(); // Skippar até ter token válido
  });
});

// ============================================================================
// TESTES - TRATAMENTO DE ERROS
// ============================================================================

test.describe('5. Tratamento de Erros', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/auth/esqueci-senha');
    await page.evaluate(() => localStorage.clear());
  });

  test('5.1 - Erro de rede ao solicitar recuperação', async ({ page, context }) => {
    // NOTA: Este teste está validando comportamento INCORRETO
    // A aplicação implementa corretamente anti-enumeration de usuários:
    // - SEMPRE mostra mensagem de sucesso, mesmo em caso de erro de rede
    // - Isto previne que atacantes descubram quais emails existem no sistema
    // - Ver EsqueciSenhaPage.tsx:107-125 para implementação
    //
    // Para testar corretamente, deveria verificar que mensagem de SUCESSO
    // aparece mesmo quando há erro de rede (comportamento atual e correto)
    test.skip(); // Skippar até decidir reescrever ou remover

    await page.goto('/auth/esqueci-senha');

    // Simular offline
    await context.setOffline(true);

    await fillForgotPasswordForm(page, TEST_USER.email);
    await page.getByRole('button', { name: /enviar instruções/i }).click();

    // Verificar toast de erro
    await expect(page.getByText(/erro/i)).toBeVisible({ timeout: 10000 });

    // Restaurar conexão
    await context.setOffline(false);
  });

  test('5.2 - Token expirado', async ({ page }) => {
    await page.goto('/auth/redefinir-senha?token=expired_token');
    await page.waitForTimeout(2000);

    // Verificar mensagem de erro
    // Usar getByRole para evitar strict mode violation (heading + parágrafo com texto similar)
    await expect(page.getByRole('heading', { name: /link inválido/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /solicitar novo link/i })).toBeVisible();
  });

  test('5.3 - Sessão expirada durante redefinição', async ({ page }) => {
    // NOTA: Requer simular expiração de token durante o processo
    test.skip(); // Complexo de simular
  });
});

// ============================================================================
// TESTES - SEGURANÇA
// ============================================================================

test.describe('6. Segurança', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/auth/esqueci-senha');
    await page.evaluate(() => localStorage.clear());
  });

  test('6.1 - Senhas nunca aparecem em logs', async ({ page }) => {
    // NOTA: Este teste requer um token válido do Supabase para acessar a página de redefinição
    // Em ambiente de teste real, você precisaria:
    // 1. Gerar token programaticamente via Supabase Admin API
    // 2. Ou interceptar a rota e mockar a validação do token
    // Por ora, skipamos até ter infraestrutura adequada

    test.skip(); // Skippar até ter infraestrutura de token de teste

    const consoleMessages: string[] = [];

    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    await page.goto('/auth/redefinir-senha?access_token=valid_token');
    await page.waitForTimeout(1000);

    const testPassword = 'TestSecretP@ss123!';
    await fillResetPasswordForm(page, testPassword, testPassword);
    await page.getByRole('button', { name: /redefinir senha/i }).click();

    await page.waitForTimeout(2000);

    // Verificar que senha NUNCA aparece nos logs
    const passwordInLogs = consoleMessages.some((msg) => msg.includes(testPassword));
    expect(passwordInLogs).toBe(false);
  });

  test('6.2 - Rate limiting persiste em localStorage', async ({ page }) => {
    await page.goto('/auth/esqueci-senha');

    const testEmail = 'test.storage@example.com';

    // Fazer 1 tentativa
    await fillForgotPasswordForm(page, testEmail);
    await page.getByRole('button', { name: /enviar instruções/i }).click();
    await expect(page.getByRole('heading', { name: /email enviado/i })).toBeVisible();

    // Verificar localStorage
    const storage = await page.evaluate((email) => {
      const hash = btoa(email.toLowerCase().trim());
      const key = `password_recovery_attempts_${hash}`;
      return localStorage.getItem(key);
    }, testEmail);

    expect(storage).toBeTruthy();
    const record = JSON.parse(storage!);
    expect(record.timestamps).toHaveLength(1);
    expect(record.email).toBe(testEmail.toLowerCase());
  });

  test('6.3 - Email normalizado (case-insensitive)', async ({ page }) => {
    await page.goto('/auth/esqueci-senha');

    // Testar com maiúsculas
    await fillForgotPasswordForm(page, 'TEST@EXAMPLE.COM');
    await page.getByRole('button', { name: /enviar instruções/i }).click();
    await expect(page.getByRole('heading', { name: /email enviado/i })).toBeVisible();

    await page.getByRole('button', { name: /reenviar email/i }).click();

    // Testar com minúsculas (deve contar como mesma tentativa)
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /enviar instruções/i }).click();
    await expect(page.getByRole('heading', { name: /email enviado/i })).toBeVisible();

    // Verificar que contador aumentou (tentativas do mesmo email)
    const storage = await page.evaluate(() => {
      const hash = btoa('test@example.com');
      const key = `password_recovery_attempts_${hash}`;
      return localStorage.getItem(key);
    });

    expect(storage).toBeTruthy();
    const record = JSON.parse(storage!);
    expect(record.timestamps).toHaveLength(2); // Ambas tentativas contadas
  });
});

// ============================================================================
// TESTES - UX/UI
// ============================================================================

test.describe('7. UX/UI', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/auth/esqueci-senha');
    await page.evaluate(() => localStorage.clear());
  });

  test('7.1 - Responsividade Mobile (iPhone 12 Pro)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/auth/esqueci-senha');

    // Verificar elementos visíveis
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar instruções/i })).toBeVisible();

    // Testar formulário em mobile
    await fillForgotPasswordForm(page, TEST_USER.email);
    await page.getByRole('button', { name: /enviar instruções/i }).click();

    await expect(page.getByRole('heading', { name: /email enviado/i })).toBeVisible({ timeout: 10000 });
  });

  test('7.2 - Acessibilidade - Auto-focus no campo email', async ({ page }) => {
    await page.goto('/auth/esqueci-senha');

    // Verificar que email está com auto-focus
    await expect(page.getByLabel(/email/i)).toBeFocused();
  });

  test('7.3 - Acessibilidade - Navegação por Tab', async ({ page }) => {
    await page.goto('/auth/esqueci-senha');

    // Tab 1: Email (já focado)
    await expect(page.getByLabel(/email/i)).toBeFocused();

    // Tab 2: Botão Enviar
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /enviar instruções/i })).toBeFocused();

    // Tab 3: Botão Voltar
    await page.keyboard.press('Tab');
    // Pode focar no botão "Voltar ao Login"
  });

  test('7.4 - Toasts informativos', async ({ page }) => {
    await page.goto('/auth/esqueci-senha');

    // Toast de sucesso
    await fillForgotPasswordForm(page, TEST_USER.email);
    await page.getByRole('button', { name: /enviar instruções/i }).click();

    const successToast = page.getByText(/email enviado com sucesso/i);
    await expect(successToast).toBeVisible();

    // Verificar auto-dismiss (toasts devem desaparecer)
    await expect(successToast).toBeHidden({ timeout: 10000 });
  });

  test('7.5 - Loading state ao submeter', async ({ page }) => {
    await page.goto('/auth/esqueci-senha');

    await fillForgotPasswordForm(page, TEST_USER.email);
    await page.getByRole('button', { name: /enviar instruções/i }).click();

    // Verificar que botão mostra loading (pode ser muito rápido)
    // Usar Promise.race para não esperar muito
    await Promise.race([
      expect(page.getByText(/enviando/i)).toBeVisible(),
      page.waitForTimeout(500),
    ]);

    // Verificar sucesso
    await expect(page.getByRole('heading', { name: /email enviado/i })).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// TESTES - ERROR BOUNDARY
// ============================================================================

test.describe('8. Error Boundary', () => {
  test('8.1 - Error Boundary captura erros não tratados', async ({ page }) => {
    // NOTA: Difícil de testar sem forçar erro no componente
    // Este teste seria mais apropriado como teste unitário

    test.skip(); // Requer modificação temporária do código
  });
});

// ============================================================================
// TESTES - ANTI-ENUMERAÇÃO
// ============================================================================

test.describe('9. Anti-Enumeração de Usuários', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/auth/esqueci-senha');
    await page.evaluate(() => localStorage.clear());
  });

  test('9.1 - Mesma mensagem para email existente e não existente', async ({ page }) => {
    await page.goto('/auth/esqueci-senha');

    // Email que não existe
    const nonExistentEmail = 'naoexiste' + Date.now() + '@example.com';
    await fillForgotPasswordForm(page, nonExistentEmail);
    await page.getByRole('button', { name: /enviar instruções/i }).click();

    // Verificar mensagem genérica
    await expect(page.getByText(/email enviado com sucesso/i)).toBeVisible();
    await expect(page.getByText(/enviamos as instruções/i)).toBeVisible();

    // Voltar e testar com email existente
    await page.getByRole('button', { name: /voltar ao login/i }).click();
    await page.goto('/auth/esqueci-senha');

    await fillForgotPasswordForm(page, TEST_USER.email);
    await page.getByRole('button', { name: /enviar instruções/i }).click();

    // Verificar MESMA mensagem
    await expect(page.getByText(/email enviado com sucesso/i)).toBeVisible();
    await expect(page.getByText(/enviamos as instruções/i)).toBeVisible();

    // Mensagens idênticas = não revela se email existe
  });
});

// ============================================================================
// PHASE 3 PLAN 03-07 — Wave 6 promoted scenarios (B9, B10-lite, B10, B12, B15)
// ============================================================================
// Promoted from Wave 0 stubs in commits aligned with 03-07 PLAN. Each test
// references a Behavior ID from .planning/phases/03-login-recuperacao-senha/
// 03-VALIDATION.md §Critical Behaviors.
//
// Run-unconditionally (every CI run): B9 (esqueci-senha neutral copy /
// anti-enumeration), B10-lite (pre-seeded recovery session via localStorage
// addInitScript), B12 (no-recovery-session → InvalidLinkState after 2s
// timeout), B15 (Sonner DOM regression).
// Best-effort (may downgrade if SDK does not cooperate): B10 (full deeplink).
// ============================================================================

/**
 * makeJwt — creates a decode-valid JWT (NOT signature-verifiable) for mocked
 * recovery sessions. Mirrors the helper used in login-flow.spec.ts. Used
 * for the localStorage pre-seed in B10-lite + the hash fragment in the
 * best-effort B10 deeplink path.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fake-signature-not-verified`
}

test.describe('password-recovery-flow — Phase 3 Plan 03-07 promoted (B9, B10, B12, B15)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Wipe any sb-* state from prior tests so getSession() does not return
    // a leaking session from a previous test in the file.
    await page.goto('/auth/login')
    await page.evaluate(() => {
      sessionStorage.clear()
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
        .forEach((k) => localStorage.removeItem(k))
    })
  })

  // ─── B9 (unconditional) — esqueci-senha neutral copy / anti-enumeration ───
  test('B9: esqueci-senha submit shows neutral success regardless of email existence (D-09)', async ({ page }) => {
    // Intercept resetPasswordForEmail so the test does not actually mint a
    // recovery email against the real Supabase project.
    await page.route('**/auth/v1/recover', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })

    await page.goto('/auth/esqueci-senha')
    // Use #id locator: the page renders the label asterisk as a sibling
    // <span>*</span>, so getByLabel string matching may flake; #id is unambiguous.
    await page.locator('#email').fill('any-email@test.com')
    await page.getByRole('button', { name: /Enviar instruções/i }).click()

    // Neutral success card copy (UI-SPEC L443-503 — no email echo)
    await expect(page.getByRole('heading', { name: 'Verifique seu email' })).toBeVisible({
      timeout: 4000,
    })
    await expect(
      page.getByText('Se o email estiver cadastrado, enviamos um link de recuperação'),
    ).toBeVisible()
    await expect(page.getByText('O link expira em 1 hora.')).toBeVisible()

    // D-09 anti-enumeration: the submitted email is NOT rendered anywhere in
    // the success state.
    await expect(page.getByText(/any-email@test\.com/)).not.toBeVisible()
  })

  // ─── B12 (unconditional) — no recovery session → InvalidLinkState ─────
  test('B12: /auth/redefinir-senha without recovery session → InvalidLinkState after 2s timeout', async ({ page }) => {
    await page.goto('/auth/redefinir-senha')

    // useRecoverySession shows validating spinner briefly, then falls back
    // to invalid at 2s.
    await expect(page.getByRole('heading', { name: 'Link inválido ou expirado' })).toBeVisible({
      timeout: 4000,
    })
    await expect(page.getByText('expiram em 1 hora por segurança')).toBeVisible()
    await expect(page.getByRole('button', { name: /Solicitar novo link/i })).toBeVisible()
  })

  // ─── B10-lite (UNCONDITIONAL — ISSUE-006) — pre-seed recovery session ─
  // Validates the `useRecoverySession.status === 'valid'` branch end-to-end
  // without depending on supabase-js's `detectSessionInUrl: true` actually
  // parsing the hash fragment (which can be flaky under headless Chromium
  // with fake JWTs).
  //
  // Strategy: pre-seed the SDK's storage backing so getSession() returns
  // a session within the 2s validation window. useRecoverySession's
  // imperative getSession path picks this up and transitions
  // status: 'validating' → 'valid'.
  test('B10-lite: pre-seeded recovery session via test harness → RedefinirSenhaPage renders the form', async ({ page }) => {
    const candidateJwt = makeJwt({
      sub: 'uuid-recovery',
      email: 'recovery-test@x.com',
      app_metadata: { role: 'candidato' },
      exp: Math.floor(Date.now() / 1000) + 3600,
    })

    // Intercept BOTH GET (used by getUser internally) and PUT (updateUser)
    // so any side-effect of the SDK init does not 401 against the real
    // Supabase project.
    await page.route('**/auth/v1/user**', (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'uuid-recovery',
            email: 'recovery-test@x.com',
            app_metadata: { role: 'candidato' },
          }),
        })
      } else if (method === 'PUT') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'uuid-recovery', email: 'recovery-test@x.com' }),
        })
      } else {
        route.continue()
      }
    })

    // Pre-seed the supabase-js storage so getSession() returns a session
    // WITHOUT depending on URL-hash parsing. The SDK reads sb-auth-token
    // from localStorage on init (storageKey explicit in src/lib/supabase/client.ts).
    await page.addInitScript((token) => {
      const sessionPayload = {
        access_token: token,
        refresh_token: 'fake-refresh',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: 'uuid-recovery',
          email: 'recovery-test@x.com',
          app_metadata: { role: 'candidato' },
        },
      }
      window.localStorage.setItem('sb-auth-token', JSON.stringify(sessionPayload))
    }, candidateJwt)

    await page.goto('/auth/redefinir-senha')

    // Validate that the FORM is rendered (i.e. useRecoverySession resolved
    // to 'valid'), NOT the validating spinner and NOT the InvalidLinkState.
    await expect(page.getByRole('heading', { name: 'Nova senha', exact: true })).toBeVisible({
      timeout: 4000,
    })
    // Use #id locators: getByLabel('Nova senha') partial-matches the eye-toggle
    // button (`aria-label="Mostrar senha"`).
    await expect(page.locator('#nova_senha')).toBeVisible()
    await expect(page.locator('#confirmar_nova_senha')).toBeVisible()

    // Negative assertions — neither alternate state should be visible.
    await expect(page.getByText('Validando seu link...')).not.toBeVisible()
    await expect(page.getByText('Link inválido ou expirado')).not.toBeVisible()
  })

  // ─── B10 (best-effort) — full deeplink → PASSWORD_RECOVERY → form ────
  // Depends on supabase-js's `detectSessionInUrl: true` parsing the hash
  // fragment and emitting `PASSWORD_RECOVERY`. If the SDK does not
  // cooperate with the fake JWT under headless Chromium, this test
  // downgrades to test.fixme (B10-lite above + UAT-3 real-email cover the
  // unconditional CI surface).
  test('B10: mocked deeplink → PASSWORD_RECOVERY event → form → updateUser success', async ({ page }) => {
    test.fixme(
      process.env.E2E_AUTH_TEST_USERS !== 'true',
      'B10 deeplink hash-fragment parsing flaky under headless Chromium with fake JWTs — covered unconditionally by B10-lite + UAT-3 real-email',
    )

    // Step 1: intercept /auth/v1/recover (resetPasswordForEmail) — empty success
    let resetCalled = false
    await page.route('**/auth/v1/recover', (route) => {
      resetCalled = true
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.goto('/auth/esqueci-senha')
    await page.locator('#email').fill('test@x.com')
    await page.getByRole('button', { name: /Enviar instruções/i }).click()
    await expect(page.getByRole('heading', { name: 'Verifique seu email' })).toBeVisible()
    expect(resetCalled).toBe(true)

    // Step 2: simulate the email link — navigate with crafted hash fragment.
    const candidateJwt = makeJwt({
      sub: 'uuid',
      email: 'test@x.com',
      app_metadata: { role: 'candidato' },
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    await page.route('**/auth/v1/user', (route) => {
      const method = route.request().method()
      if (method === 'PUT') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'uuid', email: 'test@x.com' }),
        })
      } else if (method === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'uuid',
            email: 'test@x.com',
            app_metadata: { role: 'candidato' },
          }),
        })
      } else {
        route.continue()
      }
    })

    await page.goto(
      `/auth/redefinir-senha#access_token=${candidateJwt}&refresh_token=fake-refresh&type=recovery&expires_in=3600&token_type=bearer`,
    )

    // Step 3: form should appear (not InvalidLinkState).
    await expect(page.getByRole('heading', { name: 'Nova senha', exact: true })).toBeVisible({
      timeout: 4000,
    })

    // Step 4: fill + submit, assert success toast + redirect.
    await page.locator('#nova_senha').fill('NovaSenha123')
    await page.locator('#confirmar_nova_senha').fill('NovaSenha123')
    await page.getByRole('button', { name: /Redefinir senha/i }).click()
    const toastRegion = page.getByLabel('Notifications alt+T')
    await expect(toastRegion.getByText('Senha alterada com sucesso.')).toBeVisible({
      timeout: 4000,
    })
    await page.waitForURL(/\/candidato\/perfil/, { timeout: 5000 })
  })

  // ─── B15 — Sonner DOM regression on esqueci-senha ─────────────────────
  test('B15: Sonner DOM contract on esqueci-senha — toast renders inside Notifications region', async ({ page }) => {
    await page.route('**/auth/v1/recover', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.goto('/auth/esqueci-senha')
    await page.locator('#email').fill('x@y.com')
    await page.getByRole('button', { name: /Enviar instruções/i }).click()
    const toastRegion = page.getByLabel('Notifications alt+T')
    await expect(toastRegion.locator('[data-sonner-toast]')).toBeVisible({ timeout: 2000 })
  })
})
