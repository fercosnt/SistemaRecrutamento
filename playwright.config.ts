import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load test environment variables from .env.test
dotenv.config({ path: path.resolve(__dirname, '.env.test') })

/**
 * Playwright Configuration
 *
 * E2E tests para o Sistema de Cadastro de Candidatos
 *
 * Testa:
 * - Fluxo completo de cadastro (5 steps)
 * - Validações de formulário
 * - Integração ViaCEP
 * - Duplicate check (CPF/Email)
 * - Multi-step navigation
 * - Responsividade (mobile/tablet/desktop)
 */

export default defineConfig({
  testDir: './e2e',

  // Timeout por teste (60 segundos para fluxo completo)
  timeout: 60 * 1000,

  // Expect timeout (5 segundos para assertions)
  expect: {
    timeout: 5000,
  },

  // Modo de execução
  fullyParallel: true,

  // Retry em caso de falha (apenas em CI)
  retries: process.env.CI ? 2 : 0,

  // Workers (quantos testes rodam em paralelo)
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Configurações globais
  use: {
    // Base URL da aplicação
    baseURL: 'http://localhost:3000',

    // Trace em caso de falha
    trace: 'on-first-retry',

    // Screenshot em caso de falha
    screenshot: 'only-on-failure',

    // Video em caso de falha
    video: 'retain-on-failure',
  },

  // Projetos (browsers e viewports)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
    },
  ],

  // Servidor de desenvolvimento
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
