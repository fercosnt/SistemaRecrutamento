/**
 * filaTrabalhoService — the cross-vaga work-queue read (KPI-01).
 *
 * Reads `public.v_fila_trabalho` (created in 34-01, `security_invoker=true` → inherits
 * the vaga-scoped `rh_le_candidaturas` RLS; the terminals aprovado/rejeitado are excluded
 * by the view). The RH sees only their own vagas' rows — this client adds NO re-scope and
 * NO bypass. The load-bearing invariant is the PII-leak guard
 * ([[reference_select_star_leaks_pii]]): the read names its columns explicitly via
 * `FILA_ALLOWLIST` and NEVER uses a star projection (RLS is row-level only, not column-level).
 *
 * Sort is `entrou_etapa_em ASC` — oldest-waiting first ("o que precisa da minha ação agora").
 *
 * @module features/funil/services/filaTrabalhoService
 * @see src/features/triagem/services/triagemService.ts (allowlist read + `.from(view).select().order()` idiom)
 * @see src/features/hub-candidato/services/historicoCandidaturaService.ts (allowlist + service-error idiom cloned)
 */
import { supabase } from '@/lib/supabase/client'
import type { EtapaFunilM2 } from '@/features/triagem/services/triagemService'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class FilaTrabalhoServiceError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'FORBIDDEN' | 'NOT_FOUND',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'FilaTrabalhoServiceError'
  }
}

/**
 * The EXPLICIT column allowlist for the queue read. NEVER `'*'`
 * ([[reference_select_star_leaks_pii]]). Names ONLY the 8 columns the Fila table renders:
 * candidatura_id (the row link + :id route param), vaga_id, vaga_titulo, candidato_id,
 * candidato_nome, etapa_atual, status, entrou_etapa_em (the time-in-stage anchor).
 */
export const FILA_ALLOWLIST =
  'candidatura_id, vaga_id, vaga_titulo, candidato_id, candidato_nome, etapa_atual, status, entrou_etapa_em'

/**
 * Defensive bound on the cross-vaga queue read (no unbounded queries — WR-05 precedent,
 * mirroring `historicoCandidaturaService.READ_LIMIT`). The fila grows with every waiting
 * candidatura across all owned vagas; cap the read so a large backlog can never issue an
 * unbounded query. 200 covers the oldest-waiting-first head of the queue that RH acts on.
 */
const FILA_READ_LIMIT = 200

/** One allowlist-projected work-queue row (oldest-waiting first in the returned array). */
export interface FilaRow {
  /** The candidatura id — the `/rh/candidatos/:id` route param (Pitfall 1). */
  candidatura_id: string
  vaga_id: string | null
  vaga_titulo: string | null
  candidato_id: string | null
  candidato_nome: string | null
  etapa_atual: EtapaFunilM2
  status: string | null
  /** ISO timestamp of the latest transition INTO the current stage (time-in-stage anchor). */
  entrou_etapa_em: string
}

/**
 * Lists the cross-vaga work queue, oldest-waiting first (entrou_etapa_em ASC).
 * Allowlist projection of `v_fila_trabalho` — never a star projection. Vaga-scope is
 * inherited from the security_invoker view (no re-scope here). Returns [] when empty.
 */
export async function listFila(): Promise<FilaRow[]> {
  const { data, error } = await supabase
    .from('v_fila_trabalho')
    .select(FILA_ALLOWLIST)
    .order('entrou_etapa_em', { ascending: true })
    .limit(FILA_READ_LIMIT)

  if (error) {
    throw new FilaTrabalhoServiceError(
      `Não foi possível carregar a fila de trabalho: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  return (data as unknown as FilaRow[] | null) ?? []
}
