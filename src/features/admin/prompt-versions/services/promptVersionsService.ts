/**
 * Serviço de Prompt Versions (admin, read + promote/rollback RPCs).
 *
 * Lê `prompt_versions` com allowlist explícito (sem select('*')) e invoca as 3
 * RPCs SECURITY DEFINER (promote_to_canary / promote_canary_to_active /
 * rollback_to_version). As RPCs re-validam o role no corpo; a UI surfaceia a
 * mensagem RAISE do servidor verbatim (map PG 42501 -> "Acesso restrito a
 * administradores", domínio P0001 -> mensagem como veio).
 *
 * @module features/admin/prompt-versions/services/promptVersionsService
 */

import { supabase } from '@/lib/supabase/client'
import type { Database } from '../../../../../database.types'

type LlmCallType = Database['public']['Enums']['llm_call_type']

const PROMPT_VERSIONS_COLUMNS =
  'id, call_type, semver, content_hash, is_active, is_canary, canary_pct, deployed_at, deprecated_at, schema_version_required, system_template, user_template'

export interface PromptVersionRow {
  id: string
  call_type: LlmCallType
  semver: string
  content_hash: string
  is_active: boolean
  is_canary: boolean
  canary_pct: number | null
  deployed_at: string | null
  deprecated_at: string | null
  schema_version_required: string
  system_template: string
  user_template: string
}

export class PromptVersionsServiceError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'RPC_ERROR',
    public details?: unknown
  ) {
    super(message)
    this.name = 'PromptVersionsServiceError'
  }
}

/** Lista todas as versões (allowlist explícito), ordenadas por call_type + created_at. */
export async function listPromptVersions(): Promise<PromptVersionRow[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_versions')
      .select(PROMPT_VERSIONS_COLUMNS)
      .order('call_type', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      throw new PromptVersionsServiceError(
        `Erro ao buscar versões de prompt: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }
    return (data ?? []) as unknown as PromptVersionRow[]
  } catch (error) {
    if (error instanceof PromptVersionsServiceError) throw error
    throw new PromptVersionsServiceError(
      'Erro inesperado ao listar versões de prompt',
      'NETWORK_ERROR',
      error
    )
  }
}

/**
 * Mapeia o erro de uma RPC para uma PromptVersionsServiceError preservando a
 * mensagem RAISE do servidor verbatim. PG 42501 (forbidden) recebe a mensagem
 * de acesso restrito; domínio P0001 e demais preservam a mensagem do servidor.
 */
function mapRpcError(error: { code?: string; message?: string } | null): PromptVersionsServiceError {
  const code = error?.code
  const serverMessage = error?.message ?? 'Erro desconhecido no servidor'
  if (code === '42501') {
    return new PromptVersionsServiceError('Acesso restrito a administradores', 'UNAUTHORIZED', error)
  }
  // P0001 (domain RAISE) and anything else: surface server message verbatim.
  return new PromptVersionsServiceError(serverMessage, 'RPC_ERROR', error)
}

export async function promoteToCanary(
  callType: LlmCallType,
  semver: string,
  canaryPct?: number
): Promise<void> {
  const { error } = await supabase.rpc('promote_to_canary', {
    p_call_type: callType,
    p_semver: semver,
    ...(canaryPct != null ? { p_canary_pct: canaryPct } : {}),
  })
  if (error) throw mapRpcError(error)
}

export async function promoteCanaryToActive(
  callType: LlmCallType,
  semver: string
): Promise<void> {
  const { error } = await supabase.rpc('promote_canary_to_active', {
    p_call_type: callType,
    p_semver: semver,
  })
  if (error) throw mapRpcError(error)
}

export async function rollbackToVersion(
  callType: LlmCallType,
  semver: string
): Promise<void> {
  const { error } = await supabase.rpc('rollback_to_version', {
    p_call_type: callType,
    p_semver: semver,
  })
  if (error) throw mapRpcError(error)
}
