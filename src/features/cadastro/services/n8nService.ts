/**
 * Serviço de integração com N8N Webhooks
 *
 * Features:
 * - 9 workflows configurados (teste + produção)
 * - Retry logic (3 tentativas automáticas)
 * - Timeout de 10 segundos
 * - Error handling robusto
 * - TypeScript strict mode
 *
 * @module n8nService
 */

// ============================================
// TYPES E INTERFACES
// ============================================

/**
 * Workflows disponíveis no N8N
 */
export type N8NWorkflow =
  | 'analise-formulario'
  | 'analise-bigfive'
  | 'analise-disc'
  | 'analise-raven'
  | 'analise-fit-cultural'
  | 'analise-entrevistas'
  | 'emails-automaticos'
  | 'lembretes-cron'
  | 'integracao-notion'

/**
 * Modo de execução (teste ou produção)
 */
export type N8NMode = 'test' | 'production'

/**
 * Configuração de um workflow
 */
export interface N8NWorkflowConfig {
  test: string
  production: string
}

/**
 * Payload enviado para webhooks N8N
 */
export interface N8NWebhookPayload {
  /**
   * Tipo do evento
   */
  event: 'candidato.created' | 'candidato.updated' | 'candidato.deleted'

  /**
   * Timestamp do evento (ISO 8601)
   */
  timestamp: string

  /**
   * Dados do evento
   */
  data: {
    candidato: {
      id: string
      nome_completo: string
      email: string
      telefone: string
      cpf: string
    }
    metadata: {
      created_at: string
      has_all_data: boolean
    }
  }
}

/**
 * Response esperado do webhook N8N
 */
export interface N8NWebhookResponse {
  success: boolean
  workflow_execution_id?: string
  error?: string
  data?: any
}

/**
 * Custom Error para operações N8N
 */
export class N8NError extends Error {
  /**
   * Número de tentativas realizadas
   */
  public attempts?: number

  constructor(
    message: string,
    public code:
      | 'NETWORK_ERROR'
      | 'TIMEOUT_ERROR'
      | 'HTTP_ERROR'
      | 'VALIDATION_ERROR'
      | 'WORKFLOW_NOT_FOUND'
      | 'UNKNOWN_ERROR',
    public workflow: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'N8NError'
  }
}

// ============================================
// CONFIGURAÇÃO DOS WORKFLOWS
// ============================================

/**
 * Configuração de todos os workflows N8N
 * Cada workflow tem URL de teste e produção
 */
export const N8N_WORKFLOWS: Record<N8NWorkflow, N8NWorkflowConfig> = {
  'analise-formulario': {
    test: 'https://n8n.srv881294.hstgr.cloud/webhook-test/54ea9375-aa0d-4f36-9988-213ed4ebd842',
    production:
      'https://n8n.srv881294.hstgr.cloud/webhook/54ea9375-aa0d-4f36-9988-213ed4ebd842',
  },
  'analise-bigfive': {
    test: 'https://n8n.srv881294.hstgr.cloud/webhook-test/f06cd652-c3a0-4321-91e0-20328b6a7a7e',
    production:
      'https://n8n.srv881294.hstgr.cloud/webhook/f06cd652-c3a0-4321-91e0-20328b6a7a7e',
  },
  'analise-disc': {
    test: 'https://n8n.srv881294.hstgr.cloud/webhook-test/cb94ab77-fcd5-4332-b5a6-aa2ce6ec7061',
    production:
      'https://n8n.srv881294.hstgr.cloud/webhook/cb94ab77-fcd5-4332-b5a6-aa2ce6ec7061',
  },
  'analise-raven': {
    test: 'https://n8n.srv881294.hstgr.cloud/webhook-test/c82466ce-8596-480d-ba43-3407f32d7502',
    production:
      'https://n8n.srv881294.hstgr.cloud/webhook/c82466ce-8596-480d-ba43-3407f32d7502',
  },
  'analise-fit-cultural': {
    test: 'https://n8n.srv881294.hstgr.cloud/webhook-test/03438617-e926-4be8-b0c0-900c6437d3f3',
    production:
      'https://n8n.srv881294.hstgr.cloud/webhook/03438617-e926-4be8-b0c0-900c6437d3f3',
  },
  'analise-entrevistas': {
    test: 'https://n8n.srv881294.hstgr.cloud/webhook-test/8eb085fb-6429-42ad-9170-4ffc2eb61229',
    production:
      'https://n8n.srv881294.hstgr.cloud/webhook/8eb085fb-6429-42ad-9170-4ffc2eb61229',
  },
  'emails-automaticos': {
    test: 'https://n8n.srv881294.hstgr.cloud/webhook-test/cca72655-74a8-4540-b21f-3dfc646389b3',
    production:
      'https://n8n.srv881294.hstgr.cloud/webhook/cca72655-74a8-4540-b21f-3dfc646389b3',
  },
  'lembretes-cron': {
    test: 'https://n8n.srv881294.hstgr.cloud/webhook-test/0ec6a910-96b2-4329-a2a2-f3e258150ea9',
    production:
      'https://n8n.srv881294.hstgr.cloud/webhook/0ec6a910-96b2-4329-a2a2-f3e258150ea9',
  },
  'integracao-notion': {
    test: 'https://n8n.srv881294.hstgr.cloud/webhook-test/a8008b0b-6187-4bd9-8aea-e719b586bc44',
    production:
      'https://n8n.srv881294.hstgr.cloud/webhook/a8008b0b-6187-4bd9-8aea-e719b586bc44',
  },
}

// ============================================
// CONSTANTES
// ============================================

/**
 * Timeout para requisições (10 segundos)
 */
const REQUEST_TIMEOUT_MS = 10000

/**
 * Número máximo de tentativas
 */
const MAX_RETRIES = 3

/**
 * Delay entre tentativas (em ms)
 */
const RETRY_DELAY_MS = 1000

/**
 * HTTP status codes que devem fazer retry
 */
const RETRYABLE_STATUS_CODES = [500, 502, 503, 504]

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Verifica se um status code HTTP deve fazer retry
 */
function isRetryableStatusCode(statusCode: number): boolean {
  return RETRYABLE_STATUS_CODES.includes(statusCode)
}

/**
 * Delay assíncrono
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mapeia status code HTTP para código de erro N8NError
 */
function mapStatusCodeToErrorCode(
  statusCode: number
): N8NError['code'] {
  if (statusCode === 400) {
    return 'VALIDATION_ERROR'
  }
  if (statusCode === 404) {
    return 'WORKFLOW_NOT_FOUND'
  }
  if (statusCode >= 500) {
    return 'HTTP_ERROR'
  }
  return 'UNKNOWN_ERROR'
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Envia dados para webhook N8N com retry automático
 *
 * Features:
 * - Retry automático (3 tentativas)
 * - Timeout de 10 segundos
 * - Suporte para modo teste/produção
 * - Error handling robusto
 *
 * @param workflow - Nome do workflow N8N
 * @param payload - Dados a serem enviados
 * @param mode - Modo de execução (test ou production), padrão: production
 * @returns Response do webhook N8N
 * @throws {N8NError} Se falhar após 3 tentativas ou erro não recuperável
 *
 * @example
 * const result = await sendToN8N('analise-formulario', {
 *   event: 'candidato.created',
 *   timestamp: new Date().toISOString(),
 *   data: { candidato: {...}, metadata: {...} }
 * }, 'test')
 * console.log(result.workflow_execution_id)
 */
export async function sendToN8N(
  workflow: N8NWorkflow,
  payload: N8NWebhookPayload,
  mode: N8NMode = 'production'
): Promise<N8NWebhookResponse> {
  // Validar workflow
  const workflowConfig = N8N_WORKFLOWS[workflow]
  if (!workflowConfig) {
    throw new N8NError(
      `Workflow não encontrado: ${workflow}`,
      'WORKFLOW_NOT_FOUND',
      workflow
    )
  }

  // Selecionar URL baseado no modo
  const url = mode === 'test' ? workflowConfig.test : workflowConfig.production

  console.log(`[N8N] Enviando para ${workflow} (${mode}): ${url}`)

  let lastError: Error | null = null
  let attempts = 0

  // Retry loop
  while (attempts < MAX_RETRIES) {
    attempts++
    console.log(`[N8N] Tentativa ${attempts}/${MAX_RETRIES}`)

    try {
      // Criar AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        // Fazer requisição
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Se sucesso, retornar response
        if (response.ok) {
          console.log(`[N8N] ✓ Sucesso: ${workflow} (tentativa ${attempts})`)
          const data = await response.json()
          return data
        }

        // Se erro HTTP
        console.error(`[N8N] HTTP Error ${response.status}: ${response.statusText}`)

        // Não fazer retry para erros de cliente (4xx)
        if (!isRetryableStatusCode(response.status)) {
          const errorCode = mapStatusCodeToErrorCode(response.status)
          const error = new N8NError(
            `Erro HTTP ${response.status}: ${response.statusText}`,
            errorCode,
            workflow,
            response.status
          )
          error.attempts = attempts
          throw error
        }

        // Armazenar erro para retry
        lastError = new Error(
          `HTTP ${response.status}: ${response.statusText}`
        )
      } catch (err: any) {
        clearTimeout(timeoutId)

        // Se erro de timeout
        if (err.name === 'AbortError') {
          console.error('[N8N] Timeout excedido')
          const error = new N8NError(
            `Timeout ao enviar para ${workflow} após ${REQUEST_TIMEOUT_MS}ms`,
            'TIMEOUT_ERROR',
            workflow
          )
          error.attempts = attempts
          throw error
        }

        // Outro erro
        throw err
      }
    } catch (err: any) {
      // Se erro não é recuperável, lançar imediatamente
      if (err instanceof N8NError) {
        throw err
      }

      // Erro de rede - pode fazer retry
      console.error(`[N8N] Erro de rede: ${err.message}`)
      lastError = err
    }

    // Se não é a última tentativa, aguardar antes de retry
    if (attempts < MAX_RETRIES) {
      console.log(`[N8N] Aguardando ${RETRY_DELAY_MS}ms antes de retry...`)
      await delay(RETRY_DELAY_MS)
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  console.error(`[N8N] ✗ Falhou após ${MAX_RETRIES} tentativas: ${workflow}`)

  const error = new N8NError(
    `Falha ao enviar para ${workflow} após ${MAX_RETRIES} tentativas: ${lastError?.message || 'Erro desconhecido'}`,
    'NETWORK_ERROR',
    workflow
  )
  error.attempts = attempts
  throw error
}

/**
 * Envia evento de cadastro completo para N8N
 * Wrapper conveniente para sendToN8N
 *
 * @param candidatoId - ID do candidato
 * @param candidatoData - Dados do candidato
 * @param mode - Modo de execução (test ou production)
 * @returns Response do webhook
 */
export async function notifyCandidatoCriado(
  candidatoId: string,
  candidatoData: {
    nome_completo: string
    email: string
    telefone: string
    cpf: string
  },
  mode: N8NMode = 'production'
): Promise<N8NWebhookResponse> {
  const payload: N8NWebhookPayload = {
    event: 'candidato.created',
    timestamp: new Date().toISOString(),
    data: {
      candidato: {
        id: candidatoId,
        ...candidatoData,
      },
      metadata: {
        created_at: new Date().toISOString(),
        has_all_data: true,
      },
    },
  }

  // Enviar para workflow principal de análise de formulário
  return await sendToN8N('analise-formulario', payload, mode)
}
