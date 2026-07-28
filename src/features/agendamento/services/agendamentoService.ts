/**
 * agendamentoService — the RH interview-scheduling data layer (AGEND-02/03).
 *
 * Writes go DIRECT to `public.agendamentos_entrevista` via `.insert`/`.update` — the
 * P33 `rh_gerencia_agendamento` WR-04 join-through RLS gates every row, so no
 * client-side scope is needed. The genuinely load-bearing invariants:
 *  - Every write payload is built LITERALLY with ONLY the client-writable columns
 *    (candidatura_id, tipo, data_hora, local_ou_link, status, observacoes_rh,
 *    entrevistador, compareceu). The four trigger-stamped scope/audit columns are
 *    NEVER placed on a body — the P33 BEFORE trigger stamps them, and a spoofed
 *    scope column would be a tampering vector (T-34-03-01, Pitfall 4). We never
 *    spread a form object that could smuggle one of those keys.
 *  - Cancel is an UPDATE to status='cancelada' — NEVER a delete — so the row is
 *    kept and the candidate still sees the cancellation via get_meu_agendamento
 *    (P35, T-34-03-03). Reschedule is an UPDATE in place to status='reagendada'.
 *  - The read names its columns via AGENDAMENTO_ALLOWLIST — never a star projection
 *    (RLS is row-level only; over-projecting would leak more than the surface needs).
 *
 * @module features/agendamento/services/agendamentoService
 * @see supabase/migrations/20260716000001_agendamentos_entrevista.sql (table + trigger + RLS)
 * @see src/features/entrevista/services/entrevistaService.ts (XServiceError + allowlist + mapRpcError analog)
 */
import { supabase } from '@/lib/supabase/client'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class AgendamentoServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'FORBIDDEN'
      | 'NOT_FOUND',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'AgendamentoServiceError'
  }
}

/** The two interview modalidades (the table `tipo` enum, public.tipo_entrevista_avaliacao). */
export type TipoAgendamento = 'online' | 'presencial'

/** The interview status enum values (public.status_entrevista). */
export type StatusAgendamento =
  | 'agendada'
  | 'em_andamento'
  | 'concluida'
  | 'cancelada'
  | 'reagendada'
  | 'nao_compareceu'

/**
 * The EXPLICIT RH-facing column allowlist for the agendamento read. NEVER `'*'`
 * ([[reference_select_star_leaks_pii]]). RH sees observacoes_rh here (RH surface);
 * the candidate path is the separate P35 get_meu_agendamento RPC (which excludes it).
 */
export const AGENDAMENTO_ALLOWLIST =
  'id, candidatura_id, tipo, data_hora, local_ou_link, status, observacoes_rh, entrevistador, compareceu'

/** One agendamento row, allowlist-projected. */
export interface AgendamentoRow {
  id: string
  candidatura_id: string
  tipo: TipoAgendamento
  data_hora: string
  local_ou_link: string | null
  status: StatusAgendamento
  observacoes_rh: string | null
  entrevistador: string | null
  compareceu: boolean | null
}

/** The RH-supplied fields for a NEW agendamento (never a trigger-stamped column). */
export interface AgendarInput {
  tipo: TipoAgendamento
  data_hora: string
  local_ou_link?: string | null
  observacoes_rh?: string | null
  entrevistador?: string | null
}

/** The RH-editable fields on a RESCHEDULE (status is forced to 'reagendada'). */
export interface ReagendarInput {
  tipo?: TipoAgendamento
  data_hora?: string
  local_ou_link?: string | null
  observacoes_rh?: string | null
  entrevistador?: string | null
}

/** Typed shape of the reschedule patch — only the RH-editable columns + forced status. */
interface ReagendarPatch {
  status: StatusAgendamento
  tipo?: TipoAgendamento
  data_hora?: string
  local_ou_link?: string | null
  observacoes_rh?: string | null
  entrevistador?: string | null
}

const TABLE = 'agendamentos_entrevista' as const

/** Maps a Postgres/PostgREST error code to the service error union. */
function mapWriteError(error: unknown, fallbackMsg: string): AgendamentoServiceError {
  const code = (error as { code?: string }).code ?? ''
  if (code === '42501') {
    return new AgendamentoServiceError(
      'Você não tem permissão para gerenciar este agendamento.',
      'FORBIDDEN',
      error,
    )
  }
  if (code === '23514' || code === '23502') {
    return new AgendamentoServiceError('Dados inválidos. Verifique os campos.', 'INVALID_INPUT', error)
  }
  return new AgendamentoServiceError(fallbackMsg, 'NETWORK_ERROR', error)
}

/**
 * Reads the latest agendamento for a candidatura (RH/admin only — the candidate reads
 * via the P35 RPC). Allowlist projection, newest data_hora first; returns the newest
 * non-removed row or null. Never a star projection.
 */
export async function getAgendamento(candidaturaId: string): Promise<AgendamentoRow | null> {
  if (!candidaturaId) {
    throw new AgendamentoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select(AGENDAMENTO_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .is('deleted_at', null)
    .order('data_hora', { ascending: false })
    .limit(1)

  if (error) {
    throw new AgendamentoServiceError(
      `Não foi possível carregar o agendamento: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  const rows = (data as unknown as AgendamentoRow[] | null) ?? []
  return rows[0] ?? null
}

/**
 * Creates a NEW agendamento. The insert body is built LITERALLY with ONLY the
 * client-writable columns — the four trigger-stamped scope/audit columns are never
 * placed on it (T-34-03-01). status defaults to 'agendada'; compareceu starts null
 * (pendente — the KPI-04 no-show source of truth).
 */
export async function agendar(candidaturaId: string, input: AgendarInput): Promise<void> {
  if (!candidaturaId) {
    throw new AgendamentoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const body = {
    candidatura_id: candidaturaId,
    tipo: input.tipo,
    data_hora: input.data_hora,
    local_ou_link: input.local_ou_link ?? null,
    status: 'agendada' as StatusAgendamento,
    observacoes_rh: input.observacoes_rh ?? null,
    entrevistador: input.entrevistador ?? null,
    compareceu: null as boolean | null,
  }
  // The generated Insert type still lists the trigger-stamped scope/audit columns as
  // required (the table declares them NOT NULL with no default), but the P33 BEFORE
  // trigger stamps them — sending them from the client would be a tampering vector
  // (T-34-03-01). We deliberately OMIT them and cast at the boundary (the established
  // insert/RPC-boundary cast idiom) rather than smuggle a scope column onto the body.
  const { error } = await supabase.from(TABLE).insert(body as never)
  if (error) {
    throw mapWriteError(error, 'Não foi possível agendar a entrevista. Tente novamente.')
  }
}

/**
 * Reschedules an agendamento IN PLACE (status forced to 'reagendada'). The patch is
 * built literally from the RH-editable fields only — never a trigger-stamped column.
 */
export async function reagendar(id: string, input: ReagendarInput): Promise<void> {
  if (!id) {
    throw new AgendamentoServiceError('id é obrigatório', 'INVALID_INPUT')
  }
  const patch: ReagendarPatch = { status: 'reagendada' }
  if (input.tipo !== undefined) patch.tipo = input.tipo
  if (input.data_hora !== undefined) patch.data_hora = input.data_hora
  if (input.local_ou_link !== undefined) patch.local_ou_link = input.local_ou_link
  if (input.observacoes_rh !== undefined) patch.observacoes_rh = input.observacoes_rh
  if (input.entrevistador !== undefined) patch.entrevistador = input.entrevistador

  const { error } = await supabase.from(TABLE).update(patch).eq('id', id)
  if (error) {
    throw mapWriteError(error, 'Não foi possível reagendar a entrevista. Tente novamente.')
  }
}

/**
 * Cancels an agendamento — an UPDATE to status='cancelada'. The row is KEPT (never a
 * delete) so the candidate still sees the cancellation via the P35 RPC (T-34-03-03).
 */
export async function cancelar(id: string): Promise<void> {
  if (!id) {
    throw new AgendamentoServiceError('id é obrigatório', 'INVALID_INPUT')
  }
  const { error } = await supabase
    .from(TABLE)
    .update({ status: 'cancelada' as StatusAgendamento })
    .eq('id', id)
  if (error) {
    throw mapWriteError(error, 'Não foi possível cancelar a entrevista. Tente novamente.')
  }
}

/**
 * Records the comparecimento outcome (true = compareceu, false = no-show, null =
 * pendente — the KPI-04 no-show source of truth). A single-column UPDATE.
 */
export async function setCompareceu(id: string, value: boolean | null): Promise<void> {
  if (!id) {
    throw new AgendamentoServiceError('id é obrigatório', 'INVALID_INPUT')
  }
  const { error } = await supabase.from(TABLE).update({ compareceu: value }).eq('id', id)
  if (error) {
    throw mapWriteError(error, 'Não foi possível registrar o comparecimento. Tente novamente.')
  }
}
