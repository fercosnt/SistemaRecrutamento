/**
 * Serviço de AI Costs (admin, read-only).
 *
 * Lê `ai_cost_daily` com allowlist explícito (sem select('*')) filtrando por mês.
 * Agregação preenchida via pg_cron (01:30 UTC) — tabela vazia é o estado default
 * no ship.
 *
 * @module features/admin/ai-costs/services/aiCostsService
 */

import { supabase } from '@/lib/supabase/client'
import type { Database } from '../../../../../database.types'

type LlmCallType = Database['public']['Enums']['llm_call_type']
type LlmProvider = Database['public']['Enums']['llm_provider']

const AI_COST_DAILY_COLUMNS =
  'id, date, vaga_id, call_type, provider, call_count, total_input_tokens, total_output_tokens, total_cost_usd, error_count'

export interface AiCostDailyRow {
  id: string
  date: string
  vaga_id: string | null
  call_type: LlmCallType
  provider: LlmProvider
  call_count: number
  total_input_tokens: number
  total_output_tokens: number
  total_cost_usd: number
  error_count: number
}

export class AiCostsServiceError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'INVALID_INPUT',
    public details?: unknown
  ) {
    super(message)
    this.name = 'AiCostsServiceError'
  }
}

/** Retorna o YYYY-MM do mês atual (UTC). */
export function currentMonth(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Lista as linhas de custo diário de um mês (YYYY-MM), ordenadas por data asc.
 * month inclusivo do dia 01 ao último dia do mês.
 */
export async function listAiCostDaily(month: string): Promise<AiCostDailyRow[]> {
  try {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new AiCostsServiceError('Mês inválido (esperado YYYY-MM)', 'INVALID_INPUT')
    }
    const [yStr, mStr] = month.split('-')
    const y = Number(yStr)
    const m = Number(mStr)
    const start = `${month}-01`
    // Primeiro dia do mês seguinte (limite exclusivo).
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('ai_cost_daily')
      .select(AI_COST_DAILY_COLUMNS)
      .gte('date', start)
      .lt('date', nextMonth)
      .order('date', { ascending: true })

    if (error) {
      throw new AiCostsServiceError(
        `Erro ao buscar custos de IA: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }
    return (data ?? []) as unknown as AiCostDailyRow[]
  } catch (error) {
    if (error instanceof AiCostsServiceError) throw error
    throw new AiCostsServiceError('Erro inesperado ao listar custos de IA', 'NETWORK_ERROR', error)
  }
}
