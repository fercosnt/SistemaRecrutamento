/**
 * Serviço de AI Call Logs (admin, read-only)
 *
 * Lê `ai_call_logs` com um ALLOWLIST EXPLÍCITO de colunas — NUNCA `select('*')`.
 * Precedente do security-gate da Phase 8 (reference_select_star_leaks_pii):
 * RLS é row-level e NÃO esconde colunas; os campos sensíveis (`system_prompt`,
 * `user_prompt_template`, `raw_response`, `parsed_reasoning`) só entram na
 * projeção do modal de detalhe (getAiLogDetail), nunca na listagem.
 *
 * @module features/admin/ai-logs/services/aiLogsService
 */

import { supabase } from '@/lib/supabase/client'
import type { Database } from '../../../../../database.types'

type LlmCallType = Database['public']['Enums']['llm_call_type']
type LlmProvider = Database['public']['Enums']['llm_provider']

/**
 * ALLOWLIST EXPLÍCITO da listagem (UI-SPEC §/admin/ai-logs).
 * NUNCA inclui PII (system_prompt / user_prompt_template / raw_response).
 */
const AI_LOGS_LIST_COLUMNS =
  'id, created_at, candidato_id, vaga_id, call_type, provider, model_id, prompt_hash, prompt_version_id, success, parsed_score, cost_usd, latency_ms'

/** ALLOWLIST do modal de detalhe (campos completos para uma única linha). */
const AI_LOG_DETAIL_COLUMNS =
  'id, created_at, candidato_id, vaga_id, call_type, provider, model_id, prompt_hash, success, parsed_score, parsed_reasoning, raw_response, cost_usd, latency_ms, input_token_count, output_token_count, error_code, error_message'

export interface AiLogListRow {
  id: string
  created_at: string
  candidato_id: string | null
  vaga_id: string | null
  call_type: LlmCallType
  provider: LlmProvider
  model_id: string
  prompt_hash: string
  prompt_version_id: string
  success: boolean
  parsed_score: number | null
  cost_usd: number | null
  latency_ms: number
}

export interface AiLogDetailRow {
  id: string
  created_at: string
  candidato_id: string | null
  vaga_id: string | null
  call_type: LlmCallType
  provider: LlmProvider
  model_id: string
  prompt_hash: string
  success: boolean
  parsed_score: number | null
  parsed_reasoning: string | null
  raw_response: unknown
  cost_usd: number | null
  latency_ms: number
  input_token_count: number
  output_token_count: number
  error_code: string | null
  error_message: string | null
}

export interface AiLogsFilters {
  candidato_id?: string
  vaga_id?: string
  call_type?: LlmCallType
  /** 'sucesso' | 'falha' */
  status?: 'sucesso' | 'falha'
}

export interface AiLogsPagination {
  page: number
  limit: number
}

export interface ListAiLogsResponse {
  data: AiLogListRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/** Custom Error para operações de ai-logs (analog vagasService). */
export class AiLogsServiceError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED',
    public details?: unknown
  ) {
    super(message)
    this.name = 'AiLogsServiceError'
  }
}

/**
 * Lista chamadas de IA registradas, paginação server-side (50/página default).
 * Usa o allowlist explícito — sem `select('*')`.
 */
export async function listAiLogs(
  filters?: AiLogsFilters,
  pagination: AiLogsPagination = { page: 1, limit: 50 }
): Promise<ListAiLogsResponse> {
  try {
    let query = supabase
      .from('ai_call_logs')
      .select(AI_LOGS_LIST_COLUMNS, { count: 'exact' })

    if (filters?.candidato_id) query = query.eq('candidato_id', filters.candidato_id)
    if (filters?.vaga_id) query = query.eq('vaga_id', filters.vaga_id)
    if (filters?.call_type) query = query.eq('call_type', filters.call_type)
    if (filters?.status) query = query.eq('success', filters.status === 'sucesso')

    query = query.order('created_at', { ascending: false })

    const from = (pagination.page - 1) * pagination.limit
    const to = from + pagination.limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw new AiLogsServiceError(
        `Erro ao buscar logs de IA: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }

    const total = count ?? 0
    return {
      data: (data ?? []) as unknown as AiLogListRow[],
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
    }
  } catch (error) {
    if (error instanceof AiLogsServiceError) throw error
    throw new AiLogsServiceError('Erro inesperado ao listar logs de IA', 'NETWORK_ERROR', error)
  }
}

/**
 * Busca o detalhe completo de uma única chamada (modal).
 * Só aqui projetamos parsed_reasoning + raw_response.
 */
export async function getAiLogDetail(id: string): Promise<AiLogDetailRow> {
  try {
    const { data, error } = await supabase
      .from('ai_call_logs')
      .select(AI_LOG_DETAIL_COLUMNS)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AiLogsServiceError('Log não encontrado', 'NOT_FOUND', error)
      }
      throw new AiLogsServiceError(
        `Erro ao buscar detalhe do log: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }

    return data as unknown as AiLogDetailRow
  } catch (error) {
    if (error instanceof AiLogsServiceError) throw error
    throw new AiLogsServiceError('Erro inesperado ao buscar detalhe do log', 'NETWORK_ERROR', error)
  }
}
