# Estratégia e Estado dos Testes

**Data da Análise:** 2026-04-19
**Estado geral:** Infraestrutura completa (Playwright + Vitest), cobertura E2E ampla mas **flaky** — último log mostra ~40% de falhas em `login-flow`.

---

## 1. Stack de Testes

### 1.1 Runners instalados

| Ferramenta | Versão | Uso | Config |
|------------|--------|-----|--------|
| **Playwright** | `^1.56.1` | Testes E2E (fluxo completo no browser) | `playwright.config.ts` |
| **Vitest** | `^4.0.7` | Testes unitários (services, utils, componentes) | `vite.config.ts` (bloco `test:`) |
| **@vitest/ui** | `^4.0.7` | Interface visual Vitest | `npm run test:ui` |
| **happy-dom** | `^20.0.10` | DOM ambiente para Vitest | `environment: 'happy-dom'` |
| **@playwright/experimental-ct-react** | `^1.56.1` | Component testing Playwright (instalado mas **não usado**) | — |

**Não usados / não instalados:**
- Jest — ausente.
- `@testing-library/react` / `@testing-library/jest-dom` — **são importados em `LoadingProgress.test.tsx` mas não constam em `package.json`** (o próprio arquivo traz instrução para instalar). Ver seção 5.3.

### 1.2 Scripts disponíveis (`package.json`)

```bash
npm run lint              # tsc --noEmit (type-check apenas; não há ESLint)
npm test                  # vitest (modo watch)
npm run test:ui           # vitest --ui
npm run test:run          # vitest run (single pass)
npm run test:coverage     # vitest run --coverage
npm run test:e2e          # playwright test
npm run test:e2e:ui       # playwright test --ui
npm run test:e2e:headed   # playwright test --headed
npm run test:e2e:debug    # playwright test --debug
npm run test:e2e:report   # playwright show-report
```

---

## 2. Configuração Playwright (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,               // 60s por teste
  expect: { timeout: 5000 },        // 5s por assertion
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,  // retry só em CI
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium',       use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome',  use: { ...devices['Pixel 5'] } },
    { name: 'tablet',         use: { ...devices['iPad Pro'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

**Pontos de atenção:**
- `baseURL: 'http://localhost:3000'` **conflita com** `vite.config.ts` (`server.port: 3003`). Se o dev server iniciar na porta 3003, o Playwright não encontra e sobe outro na 3000 via `npm run dev`. Isso é fonte potencial de falhas intermitentes.
- Variáveis de teste carregadas de `.env.test` via `dotenv.config()` no topo do config.
- Três projetos (desktop/mobile/tablet) — testes rodam nos três por padrão.

---

## 3. Configuração Vitest (`vite.config.ts`)

```typescript
test: {
  globals: true,
  environment: 'happy-dom',
  setupFiles: [],
  include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
  },
}
```

- **Descoberta**: apenas arquivos em `**/__tests__/**` com sufixo `.test.ts(x)` ou `.spec.ts(x)` são executados.
- **`setupFiles: []`** — não há bootstrap global (sem `jest-dom` matchers carregados globalmente).
- **Coverage** com V8 provider.
- **Globals ativo** — `describe`, `it`, `expect` disponíveis sem import (mas os arquivos do projeto importam explicitamente, por segurança).

---

## 4. Inventário de Testes E2E (`e2e/`)

Quatro specs, **2.302 linhas** no total:

| Arquivo | Linhas | PRD | Cobre |
|---------|--------|-----|-------|
| `e2e/login-flow.spec.ts` | 618 | PRD-DEV-002 | 20+ cenários: login válido/inválido, remember-me, protected routes, logout, loading, errors, segurança, UX/responsive |
| `e2e/cadastro-flow.spec.ts` | 342 | PRD-DB-001 | Fluxo completo 5 steps, validação CPF, ViaCEP, duplicate check, navegação entre steps, responsividade mobile/tablet |
| `e2e/password-recovery-flow.spec.ts` | 675 | PRD-4 | Esqueci senha, redefinir senha, 9 cenários de validação de senha (curta, sem maiúscula, comum, sequencial, etc.), rate limiting, anti-enumeração |
| `e2e/job-application-flow.spec.ts` | 667 | PRD-DEV-005 | Listagem de vagas (filtros, busca, paginação), detalhes, aplicação autenticada/não-autenticada, histórico dashboard, prevenção de duplicatas |
| `e2e/README.md` | 301 | — | Documentação + checklist + troubleshooting |

### 4.1 O que está coberto

- Fluxos de autenticação (login, logout, remember-me, recuperação de senha, proteção de rotas).
- Fluxo de cadastro completo em 5 steps.
- Listagem e aplicação a vagas (CRUD completo do lado candidato).
- Validações de formulário (Zod messages).
- Integração ViaCEP.
- Duplicate check (CPF/email).
- Responsividade (mobile Pixel 5, tablet iPad Pro).
- Segurança (senhas não logadas, session storage).
- Acessibilidade básica (navegação Tab).

### 4.2 O que NÃO está coberto por E2E

- **Área RH completa:** nenhum spec para login RH, dashboard RH, CRUD de vagas, kanban de candidatos, entrevistas, avaliações. `src/components/pages/VagasRHPage.tsx`, `CandidatosRHPage.tsx`, `DashboardRHPage.tsx`, `CriarEditarVagaPage.tsx`, `ConfiguracoesPage.tsx` — sem E2E.
- **Integração n8n** (`n8nService.ts`) — não testada e2e.
- **Rate limiting real** do Supabase (descrito como "manual" no README).
- **RLS habilitado em produção** (checklist diz "aguardando correção das políticas").
- **Multi-tab sync** em tempo real.
- **HTTPS/headers de segurança.**

---

## 5. Testes Unitários (Vitest)

### 5.1 Inventário

Seis arquivos em `src/features/cadastro/**/__tests__/`:

| Arquivo | Cobertura |
|---------|-----------|
| `src/features/cadastro/utils/__tests__/cpfValidator.test.ts` | Algoritmo CPF: válidos conhecidos, formatação, dígitos verificadores, rejeitar repetidos, vazio, alfanuméricos |
| `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` | CPF/Email duplicate detection (com mock Supabase), `cleanCPF`, `cleanEmail`, `isValidCPFFormat`, `isValidEmailFormat`, `checkBothDuplicates` |
| `src/features/cadastro/services/__tests__/authService.test.ts` | signUp/signIn/signOut |
| `src/features/cadastro/services/__tests__/cadastroService.test.ts` | Transação completa + rollback |
| `src/features/cadastro/services/__tests__/n8nService.test.ts` | Integração webhook n8n |
| `src/features/cadastro/components/__tests__/LoadingProgress.test.tsx` | Render de estágios, progresso, ícones |

**Nada fora de `src/features/cadastro/`** tem testes unitários — a área `src/features/vagas/`, `src/features/auth/`, `src/components/pages/`, `src/services/*`, `src/store/*` estão sem cobertura.

### 5.2 Padrão de teste unitário

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase/client'
import { checkCPFDuplicate } from '../duplicateCheckService'

describe('duplicateCheckService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('cleanCPF', () => {
    it('deve remover pontos e traços do CPF', () => {
      expect(cleanCPF('123.456.789-00')).toBe('12345678900')
    })
  })
})
```

**Convenções:**
- Imports explícitos de `vitest` (não confia só no `globals: true`).
- Mocks de módulo via `vi.mock('@/lib/...')`.
- `describe` aninhado por função/categoria.
- Nomes de teste em **pt-BR** (`it('deve ...')`).
- Uma única asserção por teste (na maioria dos casos).

### 5.3 Dependência de teste faltando

`LoadingProgress.test.tsx` importa `@testing-library/react`:

```typescript
import { render, screen } from '@testing-library/react'
```

Mas **`@testing-library/react` e `@testing-library/jest-dom` não estão em `package.json`**. O próprio arquivo começa com:

```
NOTA: Este teste requer @testing-library/react para executar.
Para instalar:
  npm install -D @testing-library/react @testing-library/jest-dom
```

Portanto este teste **não executa** no CI ou local sem instalação manual.

---

## 6. Padrões nos Testes E2E

### 6.1 Sem Page Objects formais — helpers funcionais por arquivo

Cada spec define funções helper no topo:

```typescript
// e2e/login-flow.spec.ts
async function fillLoginForm(page: Page, email: string, password: string, rememberMe = false) {
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  if (rememberMe) {
    await page.getByRole('checkbox', { name: /lembrar-me/i }).check()
  }
}

async function expectAuthenticated(page: Page) {
  await expect(page).toHaveURL(/\/(candidato\/perfil|dashboard-candidato)/)
  await expect(page.getByRole('button', { name: /sair/i })).toBeVisible()
}

async function logout(page: Page) { /* ... */ }
```

**Helpers são duplicados entre specs** (`login`, `logout`, `fillLoginForm` reaparecem em `job-application-flow.spec.ts` e `password-recovery-flow.spec.ts`). Não existe `e2e/fixtures/` ou `e2e/helpers/` compartilhados — a pasta `fixtures/` é mencionada no README como "futuro".

### 6.2 Cleanup pré-teste (padrão correto)

Após 3 rounds de refinamento (ver `docs/E2E_TEST_REFINEMENT_ROUND{1,2,3}.md`), o padrão consolidado é:

```typescript
test.beforeEach(async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/auth/login')                  // ← NAVEGA PRIMEIRO
  await page.evaluate(() => localStorage.clear()) // ← DEPOIS LIMPA
})
```

**Crucial:** Playwright não permite acessar `localStorage` sem um document ativo. Specs que tentavam limpar antes de navegar falhavam com `SecurityError: Access is denied for this document` (documentado em `docs/E2E_TEST_REFINEMENT_ROUND2.md` e `ROUND3.md`).

### 6.3 Seletores priorizados

| Preferência | Padrão | Exemplo |
|-------------|--------|---------|
| 1º | `getByRole` + nome | `page.getByRole('button', { name: /entrar/i })` |
| 2º | `getByLabel` | `page.getByLabel(/email/i)` |
| 3º | `getByText` (regex case-insensitive) | `page.getByText(/login realizado com sucesso/i)` |
| 4º | `input[name="..."]` | `page.fill('input[name="dadosPessoais.cpf"]', ...)` |
| Último recurso | `locator('text=...')` ou classes | `page.locator('.animate-pulse').first()` |

### 6.4 Dados de teste

Variáveis hard-coded + override por env:

```typescript
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'fernando@beautysmile.com.br',
  password: process.env.TEST_USER_PASSWORD || 'teste123',
  name: process.env.TEST_USER_NAME || 'Fernando',
}
```

**Não há factory de dados nem seeds automatizadas** — o usuário de teste precisa existir no Supabase manualmente. Pré-requisitos em `e2e/README.md`:
1. Usuário em `auth.users`.
2. Registro correspondente em `public.candidatos` com `user_id` correto.
3. RLS desabilitado em dev (ou políticas corretas).
4. Email confirmado ou confirmação desabilitada no Supabase.

Emails únicos para cadastro: `test+${Date.now()}@beautysmile.com.br` (timestamp para evitar duplicatas entre runs).

### 6.5 Timeouts explícitos por contexto

```typescript
// UI rápida
await expect(button).toBeVisible({ timeout: 5000 })

// Operações com rede (Supabase/API)
await expect(page).toHaveURL(/\/perfil/, { timeout: 10000 })
await expect(page.getByText(/cadastro realizado/i)).toBeVisible({ timeout: 15000 })

// ViaCEP
await expect(page.locator('text=CEP encontrado!')).toBeVisible({ timeout: 5000 })
```

---

## 7. Histórico de Refinamento E2E

Três documentos consolidam o trabalho de estabilização (todos em `docs/`):

### 7.1 `docs/E2E_TEST_REFINEMENT_ROUND1.md` (2025-11-22)

- Taxa antes: **11% (11/102)**.
- Focou em **ajustar mensagens de validação** para casar com os strings reais dos schemas Zod (ex.: "O email é obrigatório" em vez de "email é obrigatório").
- Adicionou **`data-testid`** em `EsqueciSenhaPage`.
- Resolveu **strict mode violation** (múltiplos elementos com mesmo texto).
- Taxa depois (Suites 1-2): **75%**.

### 7.2 `docs/E2E_TEST_REFINEMENT_ROUND2.md` (2025-11-22)

- Suites 6-9 estavam 0% → corrigiu ordem `goto` antes de `localStorage.clear()`.
- Taxa depois: **100% dos executáveis** (8/8 passing, 2 skipped em 14.6s).

### 7.3 `docs/E2E_TEST_REFINEMENT_ROUND3.md` (2025-11-22)

- Aplicou mesmo fix em Suites 3-5.
- `SecurityError` resolvido.
- **Novo bloqueador identificado:** testes de redefinir senha precisam de tokens válidos do Supabase (não mocáveis facilmente).

### 7.4 `docs/TASK_9_COMPLETED.md`

Documenta a entrega do sistema de validação de segurança que os testes E2E cobrem:
- Força de senha (`validatePassword()` em `src/services/securityValidationService.ts`).
- Detecção de senhas comuns (25+ entradas).
- Detecção de padrões sequenciais/repetitivos.

---

## 8. Estado Atual dos Testes (evidência em disco)

### 8.1 `test-results.log` (última execução de `login-flow --project=chromium`)

```
Running 21 tests using 4 workers
  ✓   1 ... 1.3 - Login com senha incorreta                              (3.9s)
  ✓   4 ... 1.2 - Login com email inválido                               (3.9s)
  ✓   5 ... 1.4 - Validação de formulário - Email formato inválido       (879ms)
  ✓   7 ... 1.5 - Toggle mostrar/ocultar senha                           (748ms)
  ✓   2 ... 1.1 - Login com credenciais válidas                          (6.1s)
  ✘   3 ... 1.4 - Validação de formulário - Email vazio                  (8.0s)
  ✓   8 ... 2.1 - Lembrar-me - COM checkbox marcado                      (3.9s)
  ✘   6 ... 1.4 - Validação de formulário - Senha vazia                  (6.1s)
  ✓  10 ... 2.3 - Auto-restore de sessão ao reload                       (3.8s)
  ✘  12 ... 3.2 - Redirect pós-login para URL original                   (5.8s)
  ✘   9 ... 2.1 - Lembrar-me - SEM checkbox marcado                      (13.9s)
  ✓  14 ... 5.1 - Loading ao submeter login                              (2.8s)
  ✘  13 ... 4.1 - Logout básico                                          (7.9s)
  ✘  11 ... 3.1 - Acesso direto SEM autenticação                         (11.3s)
  ✓  15 ... 6.2 - Erro de conexão de rede (offline)                      (3.3s)
  ✓  16 ... 5.2 - Loading ao verificar sessão (ProtectedRoute)           (4.2s)
  ✓  18 ... 7.3 - Session storage seguro                                 (3.6s)
  ✘  20 ... 8.2 - Acessibilidade - Navegação por Tab                     (5.7s)
  ✓  21 ... 8.3 - Toasts informativos                                    (8.3s)
  ✘  17 ... 7.1 - Senhas nunca são logadas no console                    (19.4s)
  ✘  19 ... 8.1 - Responsividade Mobile (iPhone 12 Pro)                  (1.0m)
```

**Resultado: 12 ✓ / 9 ✘ (~57% passing).** Falhas típicas:
- Mensagens de erro esperadas não visíveis (seletor `text=/email é obrigatório/i` não encontrado).
- Timeouts em redirects/logout.
- `Internal error: step id not found: fixture@40` (bug interno ou race condition).

### 8.2 `test-results/` (9 diretórios)

Apenas falhas de `password-recovery-flow` foram preservadas (testes de força de senha: "sem número", "sem letra maiúscula", "muito curta", "senhas não coincidem", "padrão sequencial", etc.).

### 8.3 `playwright-report/`

- `index.html` — relatório HTML renderizado.
- `data/` — artefatos (vídeos `.webm`, screenshots `.png`, traces `.md`) das falhas.

### 8.4 Diagnóstico geral

- **Infra está OK**: Playwright + Vitest instalados, config válida, webServer auto-start funciona.
- **Testes são flaky**: depende de usuário real no Supabase, rede lenta (ViaCEP), tempo de redirect do RHF + zodResolver.
- **Sem CI configurado**: não existe `.github/workflows/` (confirmado). Os testes nunca rodaram em pipeline automatizado.
- **Nenhum teste unitário vem sendo verificado** — não há log de execução do Vitest no repositório.

---

## 9. Integração Contínua (CI)

**Inexistente.** Não há diretório `.github/workflows/` no projeto.

O `e2e/README.md` menciona um exemplo de workflow:

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

...mas é apenas ilustrativo. Todos os runs até agora foram locais.

---

## 10. Como Rodar Localmente

### 10.1 Setup inicial

```bash
npm install
npx playwright install chromium   # (ou --with-deps)
cp .env.test.example .env.test    # se existir; senão criar manualmente
```

`.env.test` mínimo:
```env
TEST_USER_EMAIL=fernando@beautysmile.com.br
TEST_USER_PASSWORD=teste123
TEST_USER_NAME=Fernando
```

### 10.2 Comandos frequentes

```bash
# E2E
npm run test:e2e                               # todos, headless
npm run test:e2e:ui                            # UI mode (debug visual)
npx playwright test login-flow                 # um arquivo
npx playwright test login-flow --project=chromium   # uma spec, um browser
npx playwright test -g "Login com credenciais válidas"  # um caso por nome
npm run test:e2e:report                        # abrir relatório HTML

# Unitário
npm run test                                   # watch mode
npm run test:run                               # single pass
npm run test:coverage                          # com cobertura V8
```

### 10.3 Debug

```bash
npx playwright test --debug                    # Playwright Inspector
npx playwright show-trace trace.zip            # explorar trace de falha
# dentro do teste:
await page.pause()                             # breakpoint inline
```

---

## 11. Pendências / Riscos

1. **Flakiness real (~40% de falhas)** na última execução de `login-flow`. Principais causas: seletor de mensagem de erro, timing de redirect, dependência de estado do Supabase.
2. **Porta desalinhada:** `playwright.config.ts` usa `baseURL: 3000`, `vite.config.ts` força `server.port: 3003`. Fonte potencial de falhas.
3. **`@testing-library/react` faltando** — `LoadingProgress.test.tsx` não executa.
4. **Helpers E2E duplicados** — cada spec redefine `login()`/`logout()`/`fillLoginForm()`. Oportunidade para extrair `e2e/helpers/` ou fixtures Playwright.
5. **Área RH sem cobertura E2E** — grande parte do produto (`src/components/pages/*RH*`) não tem testes.
6. **Sem CI** — nenhuma garantia de que PRs não quebrem testes.
7. **Sem seeds/factories** — testes dependem de usuário pré-existente no Supabase, o que acopla execução ao estado real do banco.
8. **Feature `auth/`, `vagas/` e services em `src/services/*` sem testes unitários** — apenas `cadastro/` tem cobertura.

---

*Análise de testes concluída em 2026-04-19.*
