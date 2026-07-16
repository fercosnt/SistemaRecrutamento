/**
 * historicoCandidaturaService — the RH read-only history feed (VISRH-03).
 *
 * Reads `public.historico_candidatura` (RLS `rh_le_historico`, WR-04, P32) for ONE
 * candidatura, newest-first. The load-bearing invariant is the PII-leak guard
 * ([[reference_select_star_leaks_pii]]): the read names its columns explicitly via
 * `HISTORICO_ALLOWLIST` and NEVER uses a star projection — RLS is row-level only and
 * does NOT hide columns, so a star select would over-project (e.g. `auto_rejeitado`,
 * `id`) beyond what the read-only feed renders. `criterio_texto` is the justificativa;
 * `ator` is nullable (NULL = a system/service transition, rendered "Sistema").
 *
 * @module features/hub-candidato/services/historicoCandidaturaService
 * @see src/features/entrevista/services/entrevistaService.ts (allowlist + service-error idiom cloned)
 */
import { supabase } from '@/lib/supabase/client'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class HistoricoCandidaturaServiceError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'FORBIDDEN' | 'NOT_FOUND',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'HistoricoCandidaturaServiceError'
  }
}

/**
 * The EXPLICIT column allowlist for the history feed. NEVER `'*'`. Names ONLY the
 * transition fields the read-only feed renders: `etapa_de` (nullable origin),
 * `etapa_para` (destination), `ator` (nullable author), `criterio_texto` (the
 * justificativa), `criado_em` (timestamp).
 */
export const HISTORICO_ALLOWLIST = 'etapa_de, etapa_para, ator, criterio_texto, criado_em'

/** Defensive bound on the feed read (no unbounded queries — WR-05 precedent). */
const READ_LIMIT = 100

/** One allowlist-projected history transition row (newest-first in the returned array). */
export interface HistoricoRow {
  etapa_de: string | null
  etapa_para: string
  /** NULL = a system/service transition (rendered "Sistema"). */
  ator: string | null
  /** The justificativa attached to the transition. */
  criterio_texto: string | null
  criado_em: string
}

/**
 * Lists the etapa transitions for ONE candidatura, newest-first (criado_em DESC).
 * Allowlist projection of `historico_candidatura` — never a star projection. RH/admin
 * only (candidate DB-denied via `rh_le_historico`). `candidaturaId` is the `:id` route
 * param (Pitfall 8).
 */
export async function listHistorico(candidaturaId: string): Promise<HistoricoRow[]> {
  if (!candidaturaId) {
    throw new HistoricoCandidaturaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await supabase
    .from('historico_candidatura')
    .select(HISTORICO_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .order('criado_em', { ascending: false })
    .limit(READ_LIMIT)

  if (error) {
    throw new HistoricoCandidaturaServiceError(
      `Não foi possível carregar o histórico: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  return (data as unknown as HistoricoRow[] | null) ?? []
}
