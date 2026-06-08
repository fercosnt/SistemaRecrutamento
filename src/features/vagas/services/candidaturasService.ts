/**
 * Serviço de Candidaturas (Job Applications)
 *
 * Features:
 * - Criar nova candidatura
 * - Listar candidaturas do candidato
 * - Verificar duplicatas
 * - Trigger N8N webhook
 * - Update de status (HR)
 *
 * @module features/vagas/services/candidaturasService
 */

import { supabase } from '@/lib/supabase/client'
import type {
  Candidatura,
  CandidaturaInsert,
  CandidaturaRow,
  CreateCandidaturaRequest,
  CreateCandidaturaResponse,
  ListCandidaturasResponse,
  CandidaturasFilters,
  CandidaturasOrderBy,
  PaginationParams,
  CheckDuplicateApplicationResponse,
  UpdateCandidaturaStatusRequest,
  UpdateCandidaturaStatusResponse,
  N8NNovaCandidaturaPayload,
  N8NStatusUpdatePayload,
  N8NWebhookResponse,
  StatusCandidatura,
  EtapaProcesso,
} from '../types/vagasTypes'
import { getProximaEtapa } from '../types/vagasTypes'

/**
 * Custom Error para operações de candidaturas
 */
export class CandidaturasServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'DUPLICATE_APPLICATION'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'WEBHOOK_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED',
    public details?: unknown
  ) {
    super(message)
    this.name = 'CandidaturasServiceError'
  }
}

/**
 * URL do webhook N8N para nova candidatura.
 *
 * WR-04 (Phase 4 review fix): URL is read from VITE_N8N_NOVA_CANDIDATURA_URL
 * env var with a hardcoded fallback so existing deploys keep working until
 * the env var is set. The Edge Function `submit-candidatura` ALSO fires this
 * webhook post-commit using its own N8N_NOVA_CANDIDATURA_URL env var; the
 * legacy `createCandidatura` path below is preserved per Plan 04-05 / 04-RESEARCH
 * §1926 (Phase 6 RH-side may need a direct DB-only path). Any future caller
 * of `createCandidatura` should expect a duplicate-fire-by-design webhook
 * relative to the EF path; coordinate via env to avoid drift between paths.
 */
const N8N_WEBHOOK_URL =
  (import.meta.env?.VITE_N8N_NOVA_CANDIDATURA_URL as string | undefined) ??
  'https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura'

/**
 * URL do webhook N8N para mudança de status (RH-side status updates).
 *
 * WR-04: same env-var pattern as N8N_WEBHOOK_URL above, behind
 * VITE_N8N_STATUS_UPDATE_URL. Phase 4 candidate flow does NOT touch this
 * webhook; it is consumed by RH/Admin status-transition flows that arrive
 * in Phase 6.
 */
const N8N_STATUS_UPDATE_WEBHOOK_URL =
  (import.meta.env?.VITE_N8N_STATUS_UPDATE_URL as string | undefined) ??
  'https://fernandocosta.app.n8n.cloud/webhook/status-candidatura'

/**
 * Configurações do webhook
 */
const WEBHOOK_CONFIG = {
  timeout: 10000, // 10 segundos
  maxRetries: 3,
  retryDelayBase: 1000, // 1 segundo (será exponencial: 1s, 2s, 4s)
} as const

/**
 * Logger estruturado para webhook
 */
const webhookLogger = {
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        service: 'n8n-webhook',
        message,
        ...context,
      })
    )
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(
      JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        service: 'n8n-webhook',
        message,
        ...context,
      })
    )
  },
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        service: 'n8n-webhook',
        message,
        error: error instanceof Error ? { name: error.name, message: error.message } : error,
        ...context,
      })
    )
  },
}

/**
 * Sleep helper para retry delays
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Verifica se erro é retryable (network errors, 5xx)
 */
function isRetryableError(error: unknown, statusCode?: number): boolean {
  // Retry em erros de rede (sem status code)
  if (!statusCode && error instanceof Error) {
    return true
  }

  // Retry apenas em 5xx (server errors)
  if (statusCode && statusCode >= 500 && statusCode < 600) {
    return true
  }

  // Não retry em 4xx (client errors - bad request, not found, etc)
  return false
}

/**
 * Verifica se candidatura é duplicada
 *
 * @param candidatoId - UUID do candidato
 * @param vagaId - UUID da vaga
 * @returns Resultado da verificação
 *
 * @throws {CandidaturasServiceError} Se houver erro na verificação
 */
export async function checkDuplicateApplication(
  candidatoId: string,
  vagaId: string
): Promise<CheckDuplicateApplicationResponse> {
  try {
    // Validar inputs
    if (!candidatoId || !vagaId) {
      throw new CandidaturasServiceError(
        'candidatoId e vagaId são obrigatórios',
        'INVALID_INPUT'
      )
    }

    // Buscar candidatura existente (ativa ou deletada)
    // Nota: Unique constraint garante apenas 1 candidatura por (candidato, vaga)
    const { data, error } = await supabase
      .from('candidaturas')
      .select('id, created_at, deleted_at')
      .eq('candidato_id', candidatoId)
      .eq('vaga_id', vagaId)
      .maybeSingle()

    if (error) {
      throw new CandidaturasServiceError(
        `Erro ao verificar duplicata: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }

    // Verificar se encontrou candidatura E se ela não foi deletada
    if (data && !data.deleted_at) {
      return {
        isDuplicate: true,
        candidaturaId: data.id,
        dataAplicacao: data.created_at,
      }
    }

    // Não encontrou ou está deletada (pode aplicar novamente)
    return {
      isDuplicate: false,
    }
  } catch (error) {
    if (error instanceof CandidaturasServiceError) {
      throw error
    }

    throw new CandidaturasServiceError(
      'Erro inesperado ao verificar duplicata',
      'NETWORK_ERROR',
      error
    )
  }
}

/**
 * Envia payload para webhook N8N com retry logic e timeout
 *
 * Features:
 * - Timeout de 10 segundos por tentativa
 * - 3 tentativas com exponential backoff (1s, 2s, 4s)
 * - Retry apenas em erros de rede e 5xx
 * - Logging estruturado com contexto rico
 *
 * @param payload - Dados da candidatura
 * @returns Response do webhook
 *
 * @throws {CandidaturasServiceError} Se webhook falhar após todas as tentativas
 */
async function triggerN8NWebhook(
  payload: N8NNovaCandidaturaPayload
): Promise<N8NWebhookResponse> {
  const startTime = Date.now()
  let lastError: unknown

  // Retry loop com exponential backoff
  for (let attempt = 1; attempt <= WEBHOOK_CONFIG.maxRetries; attempt++) {
    try {
      webhookLogger.info('Tentando enviar webhook', {
        attempt,
        maxRetries: WEBHOOK_CONFIG.maxRetries,
        candidaturaId: payload.data.candidatura.id,
      })

      // Configurar AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_CONFIG.timeout)

      try {
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Verificar status code
        if (!response.ok) {
          const errorMessage = `Webhook retornou status ${response.status}`

          // Se não é retryable (4xx), falha imediatamente
          if (!isRetryableError(null, response.status)) {
            webhookLogger.error(errorMessage, null, {
              statusCode: response.status,
              attempt,
              candidaturaId: payload.data.candidatura.id,
            })

            throw new CandidaturasServiceError(errorMessage, 'WEBHOOK_ERROR')
          }

          // É retryable (5xx), continua para próxima tentativa
          throw new Error(errorMessage)
        }

        // Sucesso!
        const data: N8NWebhookResponse = await response.json()
        const duration = Date.now() - startTime

        webhookLogger.info('Webhook enviado com sucesso', {
          attempt,
          duration,
          candidaturaId: payload.data.candidatura.id,
        })

        return data
      } catch (fetchError) {
        clearTimeout(timeoutId)

        // Verificar se foi timeout (AbortError)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          webhookLogger.warn('Webhook timeout', {
            attempt,
            timeout: WEBHOOK_CONFIG.timeout,
            candidaturaId: payload.data.candidatura.id,
          })
          throw new Error(`Webhook timeout após ${WEBHOOK_CONFIG.timeout}ms`)
        }

        throw fetchError
      }
    } catch (error) {
      lastError = error

      // Verificar se deve fazer retry
      const shouldRetry =
        attempt < WEBHOOK_CONFIG.maxRetries &&
        isRetryableError(error, error instanceof CandidaturasServiceError ? undefined : 500)

      if (shouldRetry) {
        // Calcular delay exponencial: 1s, 2s, 4s
        const delay = WEBHOOK_CONFIG.retryDelayBase * Math.pow(2, attempt - 1)

        webhookLogger.warn('Webhook falhou, tentando novamente', {
          attempt,
          nextAttempt: attempt + 1,
          delayMs: delay,
          error: error instanceof Error ? error.message : String(error),
          candidaturaId: payload.data.candidatura.id,
        })

        await sleep(delay)
        continue // Próxima tentativa
      }

      // Não retry ou última tentativa - propagar erro
      break
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  const duration = Date.now() - startTime

  webhookLogger.error('Webhook falhou após todas as tentativas', lastError, {
    attempts: WEBHOOK_CONFIG.maxRetries,
    duration,
    candidaturaId: payload.data.candidatura.id,
  })

  // Re-throw se for erro customizado
  if (lastError instanceof CandidaturasServiceError) {
    throw lastError
  }

  throw new CandidaturasServiceError(
    `Erro ao enviar webhook N8N após ${WEBHOOK_CONFIG.maxRetries} tentativas`,
    'WEBHOOK_ERROR',
    lastError
  )
}

/**
 * Trigger webhook N8N para mudança de status
 * Usa mesmo retry logic e timeout do webhook de nova candidatura
 *
 * @param payload - Dados da mudança de status
 * @returns Response do webhook N8N
 *
 * @throws {CandidaturasServiceError} Se webhook falhar após todas tentativas
 */
async function triggerStatusUpdateWebhook(
  payload: N8NStatusUpdatePayload
): Promise<N8NWebhookResponse> {
  const startTime = Date.now()
  let lastError: unknown

  // Retry loop com exponential backoff
  for (let attempt = 1; attempt <= WEBHOOK_CONFIG.maxRetries; attempt++) {
    try {
      webhookLogger.info('Tentando enviar webhook de status update', {
        attempt,
        maxRetries: WEBHOOK_CONFIG.maxRetries,
        candidaturaId: payload.data.candidatura.id,
        statusAnterior: payload.data.candidatura.status_anterior,
        statusNovo: payload.data.candidatura.status_novo,
      })

      // Configurar AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_CONFIG.timeout)

      try {
        const response = await fetch(N8N_STATUS_UPDATE_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Verificar status code
        if (!response.ok) {
          const errorMessage = `Webhook status update retornou status ${response.status}`

          // Se não é retryable (4xx), falha imediatamente
          if (!isRetryableError(null, response.status)) {
            webhookLogger.error(errorMessage, null, {
              statusCode: response.status,
              attempt,
              candidaturaId: payload.data.candidatura.id,
            })

            throw new CandidaturasServiceError(errorMessage, 'WEBHOOK_ERROR')
          }

          // É retryable (5xx), continua para próxima tentativa
          throw new Error(errorMessage)
        }

        // Sucesso!
        const data: N8NWebhookResponse = await response.json()
        const duration = Date.now() - startTime

        webhookLogger.info('Webhook status update enviado com sucesso', {
          attempt,
          duration,
          candidaturaId: payload.data.candidatura.id,
          emailSent: data.email_sent,
        })

        return data
      } catch (fetchError) {
        clearTimeout(timeoutId)

        // Verificar se foi timeout (AbortError)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          webhookLogger.warn('Webhook status update timeout', {
            attempt,
            timeout: WEBHOOK_CONFIG.timeout,
            candidaturaId: payload.data.candidatura.id,
          })
          throw new Error(`Webhook timeout após ${WEBHOOK_CONFIG.timeout}ms`)
        }

        throw fetchError
      }
    } catch (error) {
      lastError = error

      // Verificar se deve fazer retry
      const shouldRetry =
        attempt < WEBHOOK_CONFIG.maxRetries &&
        isRetryableError(error, error instanceof CandidaturasServiceError ? undefined : 500)

      if (shouldRetry) {
        // Calcular delay exponencial: 1s, 2s, 4s
        const delay = WEBHOOK_CONFIG.retryDelayBase * Math.pow(2, attempt - 1)

        webhookLogger.warn('Webhook status update falhou, tentando novamente', {
          attempt,
          nextAttempt: attempt + 1,
          delayMs: delay,
          error: error instanceof Error ? error.message : String(error),
          candidaturaId: payload.data.candidatura.id,
        })

        await sleep(delay)
        continue // Próxima tentativa
      }

      // Não retry ou última tentativa - propagar erro
      break
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  const duration = Date.now() - startTime

  webhookLogger.error('Webhook status update falhou após todas as tentativas', lastError, {
    attempts: WEBHOOK_CONFIG.maxRetries,
    duration,
    candidaturaId: payload.data.candidatura.id,
  })

  // Re-throw se for erro customizado
  if (lastError instanceof CandidaturasServiceError) {
    throw lastError
  }

  throw new CandidaturasServiceError(
    `Erro ao enviar webhook N8N status update após ${WEBHOOK_CONFIG.maxRetries} tentativas`,
    'WEBHOOK_ERROR',
    lastError
  )
}

/**
 * Cria nova candidatura
 *
 * @param request - Dados da candidatura
 * @returns Candidatura criada
 *
 * @throws {CandidaturasServiceError} Se houver erro na criação
 *
 * @example
 * const response = await createCandidatura({
 *   candidato_id: 'abc-123',
 *   vaga_id: 'def-456'
 * })
 */
export async function createCandidatura(
  request: CreateCandidaturaRequest
): Promise<CreateCandidaturaResponse> {
  try {
    const { candidato_id, vaga_id, status_candidatura, etapa_atual } = request

    // Validar inputs
    if (!candidato_id || !vaga_id) {
      throw new CandidaturasServiceError(
        'candidato_id e vaga_id são obrigatórios',
        'INVALID_INPUT'
      )
    }

    // 1. Verificar duplicata
    const duplicateCheck = await checkDuplicateApplication(candidato_id, vaga_id)
    if (duplicateCheck.isDuplicate) {
      throw new CandidaturasServiceError(
        'Você já se candidatou a esta vaga',
        'DUPLICATE_APPLICATION',
        { candidaturaId: duplicateCheck.candidaturaId }
      )
    }

    // 2. Preparar dados para inserção
    const candidaturaData: CandidaturaInsert = {
      candidato_id,
      vaga_id,
      status: (status_candidatura ?? 'aguardando_resposta') as StatusCandidatura,
      etapa_atual: etapa_atual ?? 'triagem',
      created_at: new Date().toISOString(),
    }

    // 3. Criar candidatura
    const { data: candidatura, error: insertError } = await supabase
      .from('candidaturas')
      .insert([candidaturaData])
      .select()
      .single()

    if (insertError) {
      // Verificar se é erro de unique constraint (proteção backend)
      if (insertError.code === '23505') {
        throw new CandidaturasServiceError(
          'Você já se candidatou a esta vaga',
          'DUPLICATE_APPLICATION',
          insertError
        )
      }

      throw new CandidaturasServiceError(
        `Erro ao criar candidatura: ${insertError.message}`,
        'DATABASE_ERROR',
        insertError
      )
    }

    if (!candidatura) {
      throw new CandidaturasServiceError(
        'Candidatura não foi criada',
        'DATABASE_ERROR'
      )
    }

    // 4. Buscar dados do candidato e vaga para webhook
    const [candidatoResult, vagaResult] = await Promise.all([
      supabase
        .from('candidatos')
        .select('id, nome_completo, email, celular')
        .eq('id', candidato_id)
        .single(),
      supabase
        .from('vagas')
        .select('id, titulo, cidade, estado, departamento')
        .eq('id', vaga_id)
        .single(),
    ])

    if (candidatoResult.error || vagaResult.error) {
      // Log erro mas não falha a candidatura (já foi criada)
      console.error('Erro ao buscar dados para webhook:', {
        candidatoError: candidatoResult.error,
        vagaError: vagaResult.error,
      })
    }

    // 5. Trigger webhook N8N (não bloqueia se falhar)
    if (candidatoResult.data && vagaResult.data) {
      try {
        const webhookPayload: N8NNovaCandidaturaPayload = {
          event: 'candidatura.created',
          timestamp: new Date().toISOString(),
          data: {
            candidatura: {
              id: candidatura.id,
              candidato_id: candidatura.candidato_id,
              vaga_id: candidatura.vaga_id,
              status_candidatura: candidatura.status as StatusCandidatura,
              etapa_atual: candidatura.etapa_atual,
              data_aplicacao: candidatura.created_at,
            },
            candidato: candidatoResult.data,
            vaga: vagaResult.data,
          },
        }

        await triggerN8NWebhook(webhookPayload)
      } catch (webhookError) {
        // Log erro mas não falha a candidatura
        console.error('Webhook N8N falhou (não bloqueante):', webhookError)
      }
    }

    // 6. Retornar candidatura criada
    return {
      success: true,
      data: candidatura as Candidatura,
    }
  } catch (error) {
    if (error instanceof CandidaturasServiceError) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      }
    }

    // Erro inesperado
    return {
      success: false,
      error: {
        message: 'Erro inesperado ao criar candidatura',
        code: 'NETWORK_ERROR',
        details: error,
      },
    }
  }
}

/**
 * Lista candidaturas do candidato
 *
 * @param candidatoId - UUID do candidato
 * @param filters - Filtros opcionais
 * @param orderBy - Ordenação
 * @param pagination - Paginação
 * @returns Lista paginada de candidaturas
 *
 * @throws {CandidaturasServiceError} Se houver erro na listagem
 */
export async function listCandidaturas(
  candidatoId: string,
  filters?: CandidaturasFilters,
  orderBy: CandidaturasOrderBy = 'mais_recentes',
  pagination: PaginationParams = { page: 1, limit: 20 }
): Promise<ListCandidaturasResponse> {
  try {
    // Validar inputs
    if (!candidatoId) {
      throw new CandidaturasServiceError(
        'candidatoId é obrigatório',
        'INVALID_INPUT'
      )
    }

    // Construir query base com join de vagas.
    //
    // SECURITY (T-08-09 / T-08-13, LGPD): this is the candidate's OWN-ROW read
    // (RH uses listAllCandidaturas / listCandidaturasByVaga). RLS is row-level
    // only — it does NOT hide columns — so `select('*')` would transmit
    // RH/AI-internal columns to the candidate's browser (network payload + React
    // Query cache) even when never rendered. We therefore project an EXPLICIT
    // candidate-facing allowlist (fail-closed: new columns are excluded by
    // default). Deliberately EXCLUDED: opcao_knockout_id + motivo_rejeicao (the
    // knockout criterion — only the neutral `feedback_rejeicao` is candidate-
    // facing), observacoes_rh, score_geral, analise_ia_* (RH/AI internals),
    // etapa_justificativa, created_by/updated_by.
    let query = supabase
      .from('candidaturas')
      .select(
        `
        id,
        candidato_id,
        vaga_id,
        status,
        etapa_atual,
        feedback_rejeicao,
        is_favorito,
        is_rascunho,
        origem_candidatura,
        curriculo_url,
        curriculo_nome_original,
        curriculo_tamanho_bytes,
        data_candidatura,
        tempo_preenchimento_segundos,
        data_formulario_enviado,
        data_disc_enviado,
        data_bigfive_enviado,
        data_raven_enviado,
        data_cultura_enviado,
        data_entrevista_online,
        data_entrevista_presencial,
        data_decisao_final,
        created_at,
        updated_at,
        deleted_at,
        vaga:vagas (
          id,
          titulo,
          cidade,
          estado,
          departamento,
          status
        )
      `,
        { count: 'exact' }
      )
      .eq('candidato_id', candidatoId)
      .is('deleted_at', null)

    // Aplicar filtros
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.etapa) {
      query = query.eq('etapa_atual', filters.etapa)
    }

    if (filters?.vagaId) {
      query = query.eq('vaga_id', filters.vagaId)
    }

    if (filters?.dataInicio) {
      query = query.gte('created_at', filters.dataInicio)
    }

    if (filters?.dataFim) {
      query = query.lte('created_at', filters.dataFim)
    }

    // Aplicar ordenação
    switch (orderBy) {
      case 'mais_recentes':
        query = query.order('created_at', { ascending: false })
        break
      case 'status':
        query = query.order('status', { ascending: true })
        break
      case 'vaga':
        // Ordena por data de candidatura (não podemos ordenar por campo relacionado no Supabase)
        query = query.order('created_at', { ascending: false })
        break
    }

    // Aplicar paginação
    const from = (pagination.page - 1) * pagination.limit
    const to = from + pagination.limit - 1
    query = query.range(from, to)

    // Executar query
    const { data, error, count } = await query

    if (error) {
      throw new CandidaturasServiceError(
        `Erro ao listar candidaturas: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }

    const total = count ?? 0
    const totalPages = Math.ceil(total / pagination.limit)

    return {
      success: true,
      data: (data ?? []) as Candidatura[],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasMore: pagination.page < totalPages,
      },
    }
  } catch (error) {
    if (error instanceof CandidaturasServiceError) {
      throw error
    }

    throw new CandidaturasServiceError(
      'Erro inesperado ao listar candidaturas',
      'NETWORK_ERROR',
      error
    )
  }
}

/**
 * Atualiza status de candidatura (HR apenas)
 *
 * @param request - Dados do update
 * @returns Candidatura atualizada
 *
 * @throws {CandidaturasServiceError} Se houver erro no update
 */
export async function updateCandidaturaStatus(
  request: UpdateCandidaturaStatusRequest
): Promise<UpdateCandidaturaStatusResponse> {
  try {
    const {
      candidaturaId,
      status_candidatura,
      etapa_atual,
      motivo_rejeicao,
      notificar_candidato = true,
    } = request

    // Validar inputs
    if (!candidaturaId || !status_candidatura) {
      throw new CandidaturasServiceError(
        'candidaturaId e status_candidatura são obrigatórios',
        'INVALID_INPUT'
      )
    }

    // Buscar candidatura atual para pegar status anterior
    const { data: candidaturaAtual, error: fetchError } = await supabase
      .from('candidaturas')
      .select('*, candidato:candidatos(*), vaga:vagas(*)')
      .eq('id', candidaturaId)
      .single()

    if (fetchError || !candidaturaAtual) {
      throw new CandidaturasServiceError(
        'Candidatura não encontrada',
        'NOT_FOUND',
        fetchError
      )
    }

    const statusAnterior = candidaturaAtual.status as StatusCandidatura
    const etapaAtualAnterior = candidaturaAtual.etapa_atual as EtapaProcesso

    // AUTO-AVANÇAR ETAPA quando aprovar para próxima etapa
    let novoStatus = status_candidatura
    let novaEtapa = etapa_atual || etapaAtualAnterior

    if (status_candidatura === 'aprovado_proxima') {
      // Calcular próxima etapa
      const proximaEtapa = getProximaEtapa(etapaAtualAnterior)

      if (proximaEtapa) {
        // Avançar para próxima etapa e mudar status para aguardando_resposta
        novaEtapa = proximaEtapa
        novoStatus = 'aguardando_resposta'

        console.log('🚀 Auto-avançando etapa:', {
          candidaturaId,
          etapaAnterior: etapaAtualAnterior,
          proximaEtapa: novaEtapa,
          statusAnterior: status_candidatura,
          statusNovo: novoStatus,
        })
      } else {
        // Chegou na última etapa (aprovado ou rejeitado)
        console.log('⚠️ Candidato já está na última etapa:', {
          candidaturaId,
          etapaAtual: etapaAtualAnterior,
        })
      }
    }

    // Preparar dados para update
    const updateData: Partial<CandidaturaRow> = {
      status: novoStatus,
      etapa_atual: novaEtapa,
      ...(motivo_rejeicao && { feedback_rejeicao: motivo_rejeicao }),
      updated_at: new Date().toISOString(),
    }

    // Executar update SEM select (para evitar erro 400)
    const { error: updateError } = await supabase
      .from('candidaturas')
      .update(updateData)
      .eq('id', candidaturaId)

    if (updateError) {
      console.error('❌ Erro no update da candidatura:', {
        candidaturaId,
        updateData,
        error: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
      })
      throw new CandidaturasServiceError(
        `Erro ao atualizar candidatura: ${updateError.message}`,
        'DATABASE_ERROR',
        updateError
      )
    }

    // Buscar candidatura atualizada em uma query separada
    const { data, error: fetchErrorAfterUpdate } = await supabase
      .from('candidaturas')
      .select('*')
      .eq('id', candidaturaId)
      .single()

    if (fetchErrorAfterUpdate || !data) {
      console.error('❌ Erro ao buscar candidatura após update:', fetchErrorAfterUpdate)
      throw new CandidaturasServiceError(
        'Candidatura não encontrada após update',
        'NOT_FOUND',
        fetchErrorAfterUpdate
      )
    }

    console.log('✅ Candidatura atualizada com sucesso:', {
      id: data.id,
      status: data.status,
      etapa_atual: data.etapa_atual,
    })

    // Trigger webhook N8N para notificação de status (async, não bloqueia)
    if (notificar_candidato && candidaturaAtual.candidato && candidaturaAtual.vaga) {
      const candidato = candidaturaAtual.candidato as any
      const vaga = candidaturaAtual.vaga as any

      const webhookPayload: N8NStatusUpdatePayload = {
        event: 'candidatura.status_updated',
        timestamp: new Date().toISOString(),
        data: {
          candidatura: {
            id: data.id,
            candidato_id: data.candidato_id,
            vaga_id: data.vaga_id,
            status_anterior: statusAnterior,
            status_novo: novoStatus, // ✅ Usar novoStatus (pode ter sido alterado para aguardando_resposta)
            etapa_atual: data.etapa_atual,
            ...(motivo_rejeicao && { motivo_rejeicao }),
          },
          candidato: {
            id: candidato.id,
            nome_completo: candidato.nome_completo,
            email: candidato.email,
            telefone: candidato.celular,
          },
          vaga: {
            id: vaga.id,
            titulo: vaga.titulo,
            localizacao: [vaga.cidade, vaga.estado].filter(Boolean).join(', ') || null,
            departamento: vaga.departamento,
          },
        },
      }

      // Fire and forget (não bloqueia resposta)
      triggerStatusUpdateWebhook(webhookPayload).catch((error) => {
        webhookLogger.error('Erro ao enviar webhook de status update (não bloqueante)', error, {
          candidaturaId: data.id,
          statusAnterior,
          statusNovo: novoStatus, // ✅ Usar novoStatus
        })
      })
    }

    return {
      success: true,
      data: data as Candidatura,
    }
  } catch (error) {
    if (error instanceof CandidaturasServiceError) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: 'Erro inesperado ao atualizar candidatura',
    }
  }
}

/**
 * Lista TODAS as candidaturas (HR apenas) - sem filtro de vaga
 * Usado na página CandidatosRHPage para ver todos os candidatos
 *
 * @param filters - Filtros opcionais
 * @param orderBy - Ordenação
 * @param pagination - Paginação
 * @returns Lista paginada de candidaturas com dados do candidato E vaga
 *
 * @throws {CandidaturasServiceError} Se houver erro na listagem
 *
 * @example
 * const response = await listAllCandidaturas({
 *   status: 'em_analise'
 * })
 */
export async function listAllCandidaturas(
  filters?: CandidaturasFilters,
  orderBy: CandidaturasOrderBy = 'mais_recentes',
  pagination: PaginationParams = { page: 1, limit: 50 }
): Promise<ListCandidaturasResponse> {
  try {
    // Construir query base com join de candidatos, vagas E scores
    let query = supabase
      .from('candidaturas')
      .select(`
        *,
        candidato:candidatos(*),
        vaga:vagas(*),
        scores_bigfive!left(
          score_openness,
          score_conscientiousness,
          score_extraversion,
          score_agreeableness,
          score_neuroticism
        ),
        scores_disc!left(
          perfil_primario,
          perfil_secundario
        ),
        scores_raven!left(
          percentil,
          classificacao
        )
      `, { count: 'exact' })
      .is('deleted_at', null)

    // Aplicar filtros
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.etapa) {
      query = query.eq('etapa_atual', filters.etapa)
    }

    if (filters?.vagaId) {
      query = query.eq('vaga_id', filters.vagaId)
    }

    if (filters?.dataInicio) {
      query = query.gte('created_at', filters.dataInicio)
    }

    if (filters?.dataFim) {
      query = query.lte('created_at', filters.dataFim)
    }

    // Aplicar ordenação
    switch (orderBy) {
      case 'mais_recentes':
        query = query.order('created_at', { ascending: false })
        break
      case 'status':
        query = query.order('status', { ascending: true })
        break
      case 'vaga':
        // Ordena por data de candidatura
        query = query.order('created_at', { ascending: false })
        break
    }

    // Aplicar paginação
    const from = (pagination.page - 1) * pagination.limit
    const to = from + pagination.limit - 1
    query = query.range(from, to)

    // Executar query
    const { data, error, count } = await query

    if (error) {
      throw new CandidaturasServiceError(
        `Erro ao listar candidaturas: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }

    const total = count ?? 0
    const totalPages = Math.ceil(total / pagination.limit)

    return {
      success: true,
      data: (data ?? []) as Candidatura[],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasMore: pagination.page < totalPages,
      },
    }
  } catch (error) {
    if (error instanceof CandidaturasServiceError) {
      throw error
    }

    throw new CandidaturasServiceError(
      'Erro inesperado ao listar candidaturas',
      'NETWORK_ERROR',
      error
    )
  }
}

/**
 * Lista candidaturas de uma vaga específica (HR apenas)
 *
 * @param vagaId - UUID da vaga
 * @param filters - Filtros opcionais
 * @param orderBy - Ordenação
 * @param pagination - Paginação
 * @returns Lista paginada de candidaturas com dados do candidato
 *
 * @throws {CandidaturasServiceError} Se houver erro na listagem
 *
 * @example
 * const response = await listCandidaturasByVaga('vaga-uuid', {
 *   status: 'em_analise'
 * })
 */
export async function listCandidaturasByVaga(
  vagaId: string,
  filters?: CandidaturasFilters,
  orderBy: CandidaturasOrderBy = 'mais_recentes',
  pagination: PaginationParams = { page: 1, limit: 50 }
): Promise<ListCandidaturasResponse> {
  try {
    // Validar inputs
    if (!vagaId) {
      throw new CandidaturasServiceError('vagaId é obrigatório', 'INVALID_INPUT')
    }

    // Construir query base com join de candidatos
    let query = supabase
      .from('candidaturas')
      .select(
        `
        *,
        candidato:candidatos (
          id,
          nome_completo,
          email,
          celular,
          data_nascimento,
          cpf,
          cidade,
          estado,
          created_at
        )
      `,
        { count: 'exact' }
      )
      .eq('vaga_id', vagaId)
      .is('deleted_at', null)

    // Aplicar filtros
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.etapa) {
      query = query.eq('etapa_atual', filters.etapa)
    }

    if (filters?.dataInicio) {
      query = query.gte('created_at', filters.dataInicio)
    }

    if (filters?.dataFim) {
      query = query.lte('created_at', filters.dataFim)
    }

    // Aplicar ordenação
    switch (orderBy) {
      case 'mais_recentes':
        query = query.order('created_at', { ascending: false })
        break
      case 'status':
        query = query.order('status', { ascending: true })
        break
      case 'vaga':
        // Para listagem por vaga, ordena por data de candidatura (não podemos ordenar por campo relacionado)
        query = query.order('created_at', { ascending: false })
        break
    }

    // Aplicar paginação
    const from = (pagination.page - 1) * pagination.limit
    const to = from + pagination.limit - 1
    query = query.range(from, to)

    // Executar query
    const { data, error, count } = await query

    if (error) {
      throw new CandidaturasServiceError(
        `Erro ao listar candidaturas: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }

    const total = count ?? 0
    const totalPages = Math.ceil(total / pagination.limit)

    return {
      success: true,
      data: (data ?? []) as Candidatura[],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasMore: pagination.page < totalPages,
      },
    }
  } catch (error) {
    if (error instanceof CandidaturasServiceError) {
      throw error
    }

    throw new CandidaturasServiceError(
      'Erro inesperado ao listar candidaturas',
      'NETWORK_ERROR',
      error
    )
  }
}

// =============================================================================
// Phase 4 / Plan 04-05 — submitCandidaturaWithRespostas (Edge Function wrapper)
// =============================================================================

/**
 * Input shape expected by the submit-candidatura Edge Function.
 *
 * Mirrors `SubmitCandidaturaInput` from `supabase/functions/_shared/schemas.ts`.
 * Edge Function code is in the Deno runtime and cannot be imported from `src/`,
 * so the type is duplicated here. Keep both in sync if either side changes.
 */
export interface SubmitCandidaturaWithRespostasInput {
  candidato_id: string
  vaga_id: string
  curriculo_url: string
  curriculo_nome: string
  curriculo_size: number
  respostas: Array<{
    pergunta_id: string
    resposta_texto?: string | null
    resposta_numerica?: number | null
    resposta_opcoes?: unknown
  }>
}

interface SubmitCandidaturaResponse {
  ok: boolean
  // Phase 8 / D-16: the EF now passes `status` + `etapa_atual` through from the
  // submit_candidatura_atomic RPC so the client can branch on a server-side
  // knockout (status='rejeitado') vs. a survivor (status='aguardando_resposta',
  // etapa_atual='triagem'). The criterion is NEVER included — audit-only.
  data?: {
    candidaturaId: string
    candidaturaUrl?: string
    status?: string
    etapa_atual?: string
  }
  error_code?: string
  message?: string
  field?: string
}

/**
 * Phase 8 / D-16 — result shape returned to the candidatura submit handler.
 * `status` drives the inline post-submit branch: 'rejeitado' → D-15 neutral
 * result; anything else (survivor) → success confirmation.
 */
export interface SubmitCandidaturaResult {
  candidaturaId: string
  status?: string
  etapa_atual?: string
}

/**
 * Phase 4 / CAND-02..04 — Atomic candidatura + respostas submission via Edge Function.
 *
 * Wraps `supabase.functions.invoke('submit-candidatura')`. The EF runs the
 * `submit_candidatura_atomic` RPC inside a Postgres transaction, then fires the
 * N8N webhook AFTER commit (fire-and-forget).
 *
 * Pitfall 7 / B2: log only the redacted shape — never the storage path
 * (PII because it embeds auth.uid()), never the original filename (PII),
 * never the respostas content.
 *
 * Error code mapping (Edge Function -> CandidaturasServiceError):
 *   - VALIDATION              -> INVALID_INPUT
 *   - DUPLICATE_CANDIDATURA   -> DUPLICATE_APPLICATION (CAND-04 server-side)
 *   - UNAUTHORIZED            -> UNAUTHORIZED
 *   - STORAGE_ERROR           -> DATABASE_ERROR
 *   - SERVER_ERROR (default)  -> DATABASE_ERROR
 *   - invokeError (transport) -> NETWORK_ERROR
 *
 * @throws {CandidaturasServiceError}
 */
export async function submitCandidaturaWithRespostas(
  input: SubmitCandidaturaWithRespostasInput
): Promise<SubmitCandidaturaResult> {
  // Pitfall 7 redacted log — never log the storage path, the filename, or
  // the respostas content. Only counts and identifiers leave the boundary.
  console.log('[CANDIDATURA] submit invoked', {
    vaga_id: input.vaga_id,
    candidato_id: input.candidato_id,
    respostas_count: input.respostas.length,
  })

  try {
    const { data: responseData, error: invokeError } =
      await supabase.functions.invoke<SubmitCandidaturaResponse>(
        'submit-candidatura',
        { body: input }
      )

    if (invokeError) {
      // Pitfall 7: extract only `.message`; some SDK versions transport the
      // request body inside the error object. Stringify defensively.
      console.error(
        '[CANDIDATURA] EF invoke error:',
        invokeError.message || String(invokeError)
      )
      throw new CandidaturasServiceError(
        invokeError.message || 'Falha ao enviar candidatura',
        'NETWORK_ERROR',
        invokeError
      )
    }

    if (!responseData?.ok) {
      const code = responseData?.error_code ?? 'SERVER_ERROR'
      const message =
        responseData?.message ?? 'Erro desconhecido ao registrar candidatura'
      console.error('[CANDIDATURA] EF returned error:', { code, message })

      // Map EF error_code -> CandidaturasServiceError code
      let mappedCode: CandidaturasServiceError['code']
      switch (code) {
        case 'DUPLICATE_CANDIDATURA':
          mappedCode = 'DUPLICATE_APPLICATION'
          break
        case 'VALIDATION':
          mappedCode = 'INVALID_INPUT'
          break
        case 'UNAUTHORIZED':
          mappedCode = 'UNAUTHORIZED'
          break
        case 'STORAGE_ERROR':
        case 'SERVER_ERROR':
        default:
          mappedCode = 'DATABASE_ERROR'
      }
      throw new CandidaturasServiceError(message, mappedCode, {
        code,
        field: responseData?.field,
      })
    }

    if (!responseData.data?.candidaturaId) {
      throw new CandidaturasServiceError(
        'Resposta da função de candidatura está incompleta',
        'DATABASE_ERROR'
      )
    }

    return {
      candidaturaId: responseData.data.candidaturaId,
      status: responseData.data.status,
      etapa_atual: responseData.data.etapa_atual,
    }
  } catch (err) {
    if (err instanceof CandidaturasServiceError) throw err
    throw new CandidaturasServiceError(
      err instanceof Error ? err.message : 'Erro inesperado ao enviar candidatura',
      'NETWORK_ERROR',
      err
    )
  }
}
