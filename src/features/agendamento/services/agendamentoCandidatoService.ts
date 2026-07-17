/**
 * agendamentoCandidatoService — the CANDIDATE own-row read of the scheduled interview
 * (AGEND-04 / SEG-03). This is the security-critical consumer half of Phase 33.
 *
 * The candidate reads the interview ONLY through the `get_meu_agendamento` SECURITY
 * DEFINER RPC. That RPC:
 *  - enforces posse INSIDE the function (JOIN candidaturas→candidatos WHERE
 *    ca.user_id = auth.uid()) — the client only passes `candidatura_id`;
 *  - projects EXACTLY the 7-col allowlist (id, candidatura_id, tipo, data_hora,
 *    local_ou_link, status, compareceu) — physically EXCLUDING every RH-internal /
 *    audit column (the private notes, the interviewer, the scheduler, the audit
 *    stamps, and the vaga reference) — see the RPC allowlist in the migration below;
 *  - ORDERs BY data_hora DESC (we take the newest row).
 *
 * ANTI-PATTERN (never): `supabase.from('agendamentos_entrevista')` or a `select('*')`
 * on this path. No candidate base-table SELECT policy exists (the read would return 0
 * rows) AND a star projection would re-leak the columns the RPC excludes
 * ([[reference_select_star_leaks_pii]], T-35-01).
 *
 * @module features/agendamento/services/agendamentoCandidatoService
 * @see supabase/migrations/20260716000001_agendamentos_entrevista.sql:133-168 (the RPC)
 * @see src/features/agendamento/services/agendamentoService.ts (the RH-side write/read layer)
 */
import { supabase } from '@/lib/supabase/client'
import type { TipoAgendamento, StatusAgendamento } from './agendamentoService'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class MeuAgendamentoServiceError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'DATABASE_ERROR' | 'NOT_FOUND',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'MeuAgendamentoServiceError'
  }
}

/**
 * The candidate-facing agendamento row — the 7-col allowlist ONLY (never an
 * RH-internal column). `local_ou_link` and `compareceu` are widened to `| null`: the
 * Supabase types generator marks the RETURNS TABLE columns NON-NULL, but the
 * underlying columns are nullable (Pitfall 1 — the one place the generated types lie).
 */
export interface MeuAgendamentoRow {
  id: string
  candidatura_id: string
  tipo: TipoAgendamento
  data_hora: string // ISO timestamptz
  local_ou_link: string | null // ⚠ generated says `string`; column is nullable
  status: StatusAgendamento
  compareceu: boolean | null // not rendered here, but nullable
}

/**
 * Loads the candidate's OWN latest agendamento via the `get_meu_agendamento` DEFINER
 * RPC. Posse is enforced INSIDE the RPC; the projection is the 7-col allowlist. Returns
 * the newest row (rows[0] — the RPC already ORDER BY data_hora DESC) or null when the
 * candidate has no agendamento. The RPC is present in `database.types.ts`, so the call
 * is fully typed — NO confined cast (unlike get_minha_redacao, which is absent there).
 */
export async function getMeuAgendamento(
  candidaturaId: string,
): Promise<MeuAgendamentoRow | null> {
  if (!candidaturaId) {
    throw new MeuAgendamentoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await supabase.rpc('get_meu_agendamento', {
    p_candidatura_id: candidaturaId,
  })

  if (error) {
    throw new MeuAgendamentoServiceError(
      `Não foi possível carregar sua entrevista: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  // The RPC returns an array ordered by data_hora DESC — take the newest or null. The
  // generator widens `local_ou_link`/`compareceu` to non-null; MeuAgendamentoRow is the
  // boundary that corrects that to `| null`.
  const rows = (data ?? []) as MeuAgendamentoRow[]
  return rows[0] ?? null
}
