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
// Caminho RELATIVO para `_shared` (contrato de ZERO IMPORTS do módulo): o código do evento do
// sinal é o MESMO literal que a Edge Function grava — nunca uma string repetida aqui (49-42).
import { AI_ERROR_CODE } from '../../../../../supabase/functions/_shared/ai-error-codes'

type LlmCallType = Database['public']['Enums']['llm_call_type']
type LlmProvider = Database['public']['Enums']['llm_provider']

/**
 * ALLOWLIST EXPLÍCITO da listagem (UI-SPEC §/admin/ai-logs).
 * NUNCA inclui PII (system_prompt / user_prompt_template / raw_response).
 *
 * Phase 49 / 49-15 (D-27c): `error_code` e `model_snapshot` entram — e SÓ elas.
 *  - `error_code` é o que separa um resultado de FALLBACK de um sucesso. Sem ele a tela
 *    pinta de verde «Sucesso» uma chamada em que o modelo configurado não respondeu
 *    (medido em PROD: 17 de 55 linhas estão nesse estado).
 *  - `model_snapshot` é o modelo que DE FATO respondeu; `model_id` é o CONFIGURADO. Num
 *    fallback os dois divergem, e mostrar o configurado é uma afirmação falsa.
 * Nenhuma das duas carrega conteúdo de prompt ou de resposta: o conteúdo segue exclusivo
 * do modal de detalhe.
 */
const AI_LOGS_LIST_COLUMNS =
  'id, created_at, candidato_id, vaga_id, call_type, provider, model_id, model_snapshot, prompt_hash, prompt_version_id, success, error_code, parsed_score, cost_usd, latency_ms'

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
  /** O modelo CONFIGURADO. Num fallback, NÃO é o que respondeu — ver `model_snapshot`. */
  model_id: string
  /** O modelo que DE FATO respondeu, quando registrado. NULL nas linhas mais antigas. */
  model_snapshot: string | null
  prompt_hash: string
  prompt_version_id: string
  success: boolean
  /**
   * Código de erro da chamada. Três leituras, e a terceira é o motivo desta coluna estar
   * na listagem (D-27c): NULL numa chamada `success` = sucesso limpo; preenchido com
   * `success=false` = falha; preenchido com `success=true` = resultado de FALLBACK —
   * utilizável, mas não vindo do modelo que se pediu.
   */
  error_code: string | null
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
  /**
   * O ESTADO da chamada, no MESMO vocabulário da célula (`estadoDaChamada`). Até o 49-42 era
   * `'sucesso' | 'falha'` traduzido para `success = …`, e o filtro discordava da célula em duas
   * formas: «Sucesso» listava os fallbacks, e «Falha» listava a linha-evento do sinal.
   */
  status?: EstadoChamada
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

/** Os quatro estados de uma chamada de IA — os três honestos do 49-15 (D-27c) e o do sinal (49-42). */
export type EstadoChamada = 'sucesso' | 'falha' | 'fallback' | 'sinal'

/** O código da linha-evento do sinal (49-38) — o literal da fonte única, não uma cópia. */
const CODIGO_SINAL = AI_ERROR_CODE.prompt_injection_flagged

/**
 * Qual dos quatro estados esta linha é — o predicado ÚNICO da célula E do filtro de Status.
 *
 * Mora no serviço (49-42) para que o filtro de `listAiLogs`, logo abaixo, seja a tradução DESTA
 * função para a consulta, estado por estado, e não uma segunda regra que envelhece sozinha. A
 * `AiLogsPage` importa daqui (e reexporta, para os testes que a importam da página).
 *
 * ⚠ **`success = true` COM `error_code` é um FALLBACK**, e o predicado é esse — não o prefixo
 * `fallback_`. O prefixo é a codificação que o plano 49-02 instalou; as 17 linhas vivas de
 * `ai_call_logs` que estão nesse estado são ANTERIORES a ele e carregam o código CRU
 * (`anthropic_retries_exhausted`). Um discriminante escrito só sobre `ehFallback()` deixaria
 * exatamente essas 17 linhas verdes — as MESMAS que motivaram o conserto do 49-15. É a lição do
 * CLAUDE.md §«Portões: varra pela FORMA, não pelo sintoma» aplicada ao discriminante: a forma
 * («há código de erro numa chamada que deu certo») vigia a linha nova e a antiga; a lista de
 * prefixos conhecidos vigiaria só metade.
 *
 * ⚠ **O código do SINAL é testado ANTES de `success` (49-42 / JORN-41).** A linha-evento do
 * sinal (49-38) é `provider='none'`, `success=false`, `error_code='prompt_injection_flagged'`:
 * `success=false` porque ela NÃO é chamada de modelo — é o registro de que o texto tinha uma
 * possível instrução à IA, e a análise SEGUIU numa linha própria. Pela regra de `success`, ela
 * seria «Falha», e isso é diagnóstico falso ao admin. Comparar com UM código específico aqui é
 * ESCOPO deliberado (o estado existe para esse evento), não fotografia: um código novo cai nos
 * estados de sempre, pela forma.
 */
export function estadoDaChamada(row: {
  success: boolean
  error_code: string | null
}): EstadoChamada {
  if (row.error_code === CODIGO_SINAL) return 'sinal'
  if (!row.success) return 'falha'
  return row.error_code ? 'fallback' : 'sucesso'
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
    // O filtro de Status é `estadoDaChamada` traduzida para a consulta, estado por estado (49-42).
    // O teste de concordância (`aiLogsService.test.ts`) prova filtro ≡ célula em todas as formas.
    //
    // ⚠ «código diferente do sinal» NÃO é só `neq`: numa comparação de desigualdade o NULO some
    // (NULL <> x é NULL), e a falha sem código deixaria de aparecer em «Falha». Daí a disjunção
    // «é nulo OU diferente» na falha. No fallback o código já é não nulo, e o `neq` basta.
    switch (filters?.status) {
      case 'sinal':
        query = query.eq('error_code', CODIGO_SINAL)
        break
      case 'falha':
        query = query
          .eq('success', false)
          .or(`error_code.is.null,error_code.neq.${CODIGO_SINAL}`)
        break
      case 'fallback':
        query = query
          .eq('success', true)
          .not('error_code', 'is', null)
          .neq('error_code', CODIGO_SINAL)
        break
      case 'sucesso':
        query = query.eq('success', true).is('error_code', null)
        break
    }

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
