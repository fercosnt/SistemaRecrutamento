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
  N8NWebhookResponse,
  StatusCandidatura,
} from '../types/vagasTypes'

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
 * URL do webhook N8N para nova candidatura
 */
const N8N_WEBHOOK_URL = 'https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura'

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

    // Buscar candidatura existente
    const { data, error } = await supabase
      .from('candidaturas')
      .select('id, data_aplicacao')
      .eq('candidato_id', candidatoId)
      .eq('vaga_id', vagaId)
      .eq('deleted_at', null)
      .maybeSingle()

    if (error) {
      throw new CandidaturasServiceError(
        `Erro ao verificar duplicata: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }

    if (data) {
      return {
        isDuplicate: true,
        candidaturaId: data.id,
        dataAplicacao: data.data_aplicacao,
      }
    }

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
 * Envia payload para webhook N8N
 *
 * @param payload - Dados da candidatura
 * @returns Response do webhook
 *
 * @throws {CandidaturasServiceError} Se webhook falhar
 */
async function triggerN8NWebhook(
  payload: N8NNovaCandidaturaPayload
): Promise<N8NWebhookResponse> {
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new CandidaturasServiceError(
        `Webhook retornou status ${response.status}`,
        'WEBHOOK_ERROR'
      )
    }

    const data: N8NWebhookResponse = await response.json()
    return data
  } catch (error) {
    // Log erro mas não falha a candidatura
    console.error('Erro ao chamar webhook N8N:', error)

    // Re-throw apenas se for nosso erro customizado
    if (error instanceof CandidaturasServiceError) {
      throw error
    }

    throw new CandidaturasServiceError(
      'Erro ao enviar webhook N8N',
      'WEBHOOK_ERROR',
      error
    )
  }
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
      status_candidatura: (status_candidatura ?? 'aplicado') as StatusCandidatura,
      etapa_atual: etapa_atual ?? 'triagem',
      data_aplicacao: new Date().toISOString(),
      progresso_processo: 14, // 14% (primeira etapa: triagem)
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
        .select('id, nome_completo, email, telefone')
        .eq('id', candidato_id)
        .single(),
      supabase
        .from('vagas')
        .select('id, titulo, localizacao, departamento')
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
              status_candidatura: candidatura.status_candidatura as StatusCandidatura,
              etapa_atual: candidatura.etapa_atual,
              data_aplicacao: candidatura.data_aplicacao,
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

    // Construir query base com join de vagas
    let query = supabase
      .from('candidaturas')
      .select(
        `
        *,
        vaga:vagas (
          id,
          titulo,
          localizacao,
          departamento,
          ativa
        )
      `,
        { count: 'exact' }
      )
      .eq('candidato_id', candidatoId)
      .eq('deleted_at', null)

    // Aplicar filtros
    if (filters?.status) {
      query = query.eq('status_candidatura', filters.status)
    }

    if (filters?.etapa) {
      query = query.eq('etapa_atual', filters.etapa)
    }

    if (filters?.vagaId) {
      query = query.eq('vaga_id', filters.vagaId)
    }

    if (filters?.dataInicio) {
      query = query.gte('data_aplicacao', filters.dataInicio)
    }

    if (filters?.dataFim) {
      query = query.lte('data_aplicacao', filters.dataFim)
    }

    // Aplicar ordenação
    switch (orderBy) {
      case 'mais_recentes':
        query = query.order('data_aplicacao', { ascending: false })
        break
      case 'status':
        query = query.order('status_candidatura', { ascending: true })
        break
      case 'vaga':
        // Ordena pelo título da vaga (via join)
        query = query.order('vaga.titulo', { ascending: true })
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

    // Preparar dados para update
    const updateData: Partial<CandidaturaRow> = {
      status_candidatura,
      ...(etapa_atual && { etapa_atual }),
      ...(motivo_rejeicao && { motivo_rejeicao }),
      updated_at: new Date().toISOString(),
    }

    // Executar update
    const { data, error } = await supabase
      .from('candidaturas')
      .update(updateData)
      .eq('id', candidaturaId)
      .select()
      .single()

    if (error) {
      throw new CandidaturasServiceError(
        `Erro ao atualizar candidatura: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      throw new CandidaturasServiceError(
        'Candidatura não encontrada',
        'NOT_FOUND'
      )
    }

    // TODO: Implementar notificação por email se notificar_candidato === true
    // Isso pode ser feito via N8N webhook ou Supabase trigger

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
