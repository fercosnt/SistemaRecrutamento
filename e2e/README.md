# E2E Tests - Sistema de Recrutamento Beauty Smile

Testes End-to-End (E2E) usando **Playwright** para validar os fluxos críticos do sistema.

## 📋 Testes Implementados

### ✅ Login Flow (`login-flow.spec.ts`)
**PRD:** PRD-DEV-002 - Sistema de Login de Candidatos
**Status:** Completo (Task 13)

Categorias de testes:
1. **Funcionais Básicos** (6 testes)
   - Login com credenciais válidas
   - Login com email inválido
   - Login com senha incorreta
   - Validação de formulário (email vazio, formato inválido, senha vazia)
   - Toggle mostrar/ocultar senha

2. **Sessão e Persistência** (3 testes)
   - Remember Me - COM checkbox marcado
   - Remember Me - SEM checkbox marcado
   - Auto-restore de sessão ao reload

3. **Rotas Protegidas** (2 testes)
   - Acesso direto sem autenticação
   - Redirect pós-login para URL original

4. **Logout** (1 teste)
   - Logout básico com limpeza de sessão

5. **Estados de Loading** (2 testes)
   - Loading ao submeter login
   - Loading ao verificar sessão

6. **Tratamento de Erros** (1 teste)
   - Erro de conexão de rede (offline)

7. **Segurança** (2 testes)
   - Senhas nunca são logadas no console
   - Session storage seguro

8. **UX/UI** (3 testes)
   - Responsividade Mobile
   - Acessibilidade - Navegação por Tab
   - Toasts informativos

**Total:** 20 testes automatizados

### ✅ Cadastro Flow (`cadastro-flow.spec.ts`)
**PRD:** PRD-DB-001 - Sistema de Cadastro de Candidatos
**Status:** Completo (Task 9)

## 🚀 Como Rodar os Testes

### Pré-requisitos

1. **Node.js** 18+ instalado
2. **Dependências** instaladas: `npm install`
3. **Playwright** instalado: `npx playwright install chromium`
4. **Servidor dev** rodando: `npm run dev` (ou será iniciado automaticamente)

### Configurar Credenciais de Teste

> **CI-08 — credenciais fora do repositório.** Nenhum email/senha de conta de teste
> é commitado. Os valores reais vivem apenas em `.env.test` (gitignored); o arquivo
> versionado `.env.test.example` documenta as CHAVES necessárias, sem valores reais.

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.test.example .env.test
   ```

2. Edite `.env.test` preenchendo os valores das chaves documentadas em
   `.env.test.example` (candidato de teste, admin/RH, gating e Supabase):
   ```env
   TEST_USER_EMAIL=<email-do-candidato-de-teste>
   TEST_USER_PASSWORD=<senha-do-candidato-de-teste>
   TEST_USER_NAME=<nome-do-candidato-de-teste>
   ```
   > Consulte `.env.test.example` para a lista completa de chaves — incluindo
   > `TEST_ADMIN_EMAIL`/`TEST_ADMIN_PASSWORD`, os flags de gating
   > (`E2E_AUTH_TEST_USERS`, `E2E_CANDIDATURA_ID`, `E2E_VAGA_ID`) e as chaves do
   > Supabase. NUNCA escreva valores reais em `.env.test.example`.

3. **IMPORTANTE:** Certifique-se de que:
   - O usuário existe em `auth.users` no Supabase
   - Há um registro correspondente em `public.candidatos` com `user_id` correto
   - RLS está desabilitado EM DESENVOLVIMENTO (ou políticas corretas aplicadas)
   - Email NÃO precisa estar confirmado (se confirmação estiver desabilitada no Supabase)

### Rodar Todos os Testes

```bash
# Rodar todos os testes (headless)
npm run test:e2e

# Rodar com interface visual (debug mode)
npm run test:e2e:ui

# Rodar apenas testes de login
npx playwright test login-flow

# Rodar apenas testes de cadastro
npx playwright test cadastro-flow
```

### Rodar Testes em Modo Debug

```bash
# Debug mode com Playwright Inspector
npx playwright test --debug

# Debug apenas login flow
npx playwright test login-flow --debug
```

### Rodar em Diferentes Browsers/Viewports

```bash
# Apenas desktop (Chromium)
npx playwright test --project=chromium

# Apenas mobile
npx playwright test --project=mobile-chrome

# Apenas tablet
npx playwright test --project=tablet
```

## 📊 Visualizar Relatórios

Após rodar os testes, um relatório HTML é gerado automaticamente:

```bash
npx playwright show-report
```

Isso abrirá o relatório interativo no navegador com:
- ✅ Testes que passaram
- ❌ Testes que falharam
- 📸 Screenshots dos erros
- 🎥 Vídeos das falhas
- 📝 Traces detalhados

## 🛠️ Estrutura dos Testes

```
e2e/
├── README.md                  # Este arquivo
├── login-flow.spec.ts         # Testes de login
├── cadastro-flow.spec.ts      # Testes de cadastro
└── fixtures/                  # (futuro) Test fixtures compartilhados
```

## 📝 Boas Práticas

### 1. Sempre usar helpers reutilizáveis
```typescript
// ✅ BOM
async function fillLoginForm(page, email, password) { ... }
await fillLoginForm(page, TEST_USER.email, TEST_USER.password)

// ❌ RUIM
await page.getByLabel(/email/).fill(TEST_USER.email)
await page.getByLabel(/senha/).fill(TEST_USER.password)
```

### 2. Usar expect específicos
```typescript
// ✅ BOM
await expect(page).toHaveURL(/\/candidato\/perfil/)
await expect(button).toBeDisabled()

// ❌ RUIM
const url = await page.url()
expect(url.includes('/candidato/perfil')).toBe(true)
```

### 3. Sempre fazer cleanup (logout) após testes de autenticação
```typescript
test('Login test', async ({ page }) => {
  // ... teste de login ...

  // Cleanup
  await logout(page)
})
```

### 4. Usar timeouts apropriados
```typescript
// Operações rápidas (UI)
await expect(button).toBeVisible({ timeout: 5000 })

// Operações de rede (API)
await expect(page).toHaveURL(/\/perfil/, { timeout: 15000 })
```

### 5. Capturar e verificar toasts
```typescript
await expect(page.getByText(/login realizado com sucesso/i)).toBeVisible()
```

## 🐛 Troubleshooting

### Teste falhando: "Login não funciona"
**Causas comuns:**
- ✅ Credenciais em `.env.test` estão corretas?
- ✅ Usuário existe no banco?
- ✅ RLS está desabilitado em dev?
- ✅ Email do usuário está confirmado (ou confirmação desabilitada)?

### Teste falhando: "Timeout esperando por elemento"
**Causas comuns:**
- ✅ Servidor dev está rodando?
- ✅ Rede está lenta? (aumentar timeout)
- ✅ Elemento mudou de nome/classe?

### Teste falhando: "Remember Me não funciona"
**Causas comuns:**
- ✅ localStorage está sendo limpo entre contextos?
- ✅ Supabase `persistSession: true` configurado?

### Screenshots/Vídeos não aparecendo
```bash
# Forçar geração de screenshots
npx playwright test --screenshot=on

# Forçar geração de vídeos
npx playwright test --video=on
```

## 🔍 Debugging

### Ver trace detalhado de um teste que falhou
```bash
npx playwright show-trace trace.zip
```

### Rodar um único teste
```bash
npx playwright test -g "Login com credenciais válidas"
```

### Pausar execução em um ponto específico
```typescript
test('My test', async ({ page }) => {
  await page.goto('/login')
  await page.pause() // Pausa aqui
  // ...
})
```

## 📚 Documentação Relacionada

- [Playwright Documentation](https://playwright.dev)
- [Test Checklist - PRD-2](/docs/testing/PRD-2-LOGIN-TEST-CHECKLIST.md)
- [Playwright Config](../playwright.config.ts)

## 🎯 Coverage

### Login Flow (PRD-2)
- ✅ **20/25** casos de teste do checklist automatizados (80%)
- ⏭️ **5/25** casos manuais restantes:
  - Perfil não encontrado (requer setup no banco)
  - Rate limiting (difícil de reproduzir)
  - HTTPS only (verificação manual de config)
  - Multi-tab sync em tempo real (complexo)
  - RLS habilitado (aguardando correção das políticas)

### Cadastro Flow (PRD-1)
- ✅ Fluxo completo de 5 steps
- ✅ Validações de formulário
- ✅ Integração ViaCEP
- ✅ Duplicate check

## 🔄 Continuous Integration (CI)

Os testes E2E rodam automaticamente em CI quando configurado:

```yaml
# .github/workflows/e2e.yml (exemplo)
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## ✅ Checklist Antes de Commit

Antes de fazer commit de novos testes E2E:

- [ ] Todos os testes passam localmente?
- [ ] Adicionei helpers para código repetitivo?
- [ ] Usei timeouts apropriados?
- [ ] Fiz cleanup (logout) em testes de auth?
- [ ] Documentei casos edge encontrados?
- [ ] Testei em pelo menos 2 viewports (desktop + mobile)?

---

**Última atualização:** 2025-01-14
**Responsável:** Claude Code (Task 13 - PRD-DEV-002)
