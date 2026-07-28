/**
 * funilKpisService — the operational-KPI dashboard read (KPI-02/04).
 *
 * Reads the `public.funil_kpis(p_vaga_id)` SECURITY DEFINER RPC (extended to 7 keys in
 * 34-01, `20260716000003_funil_kpis_v2_and_v_fila_trabalho.sql`). The RPC is the SOLE
 * source of truth: it re-imposes owner-scope + returns PII-free aggregates only (SEG-02,
 * 34-01 smoke a–h). This service performs NO client-side aggregation — it never reads the
 * candidaturas / historico tables directly and reduces (that is the exact dead M1 pattern
 * this dashboard replaces, and a PII/scope leak). The single data path is
 * `supabase.rpc('funil_kpis', { p_vaga_id })`; a NULL/omitted `p_vaga_id` = all owned vagas.
 *
 * @module features/funil/services/funilKpisService
 * @see supabase/migrations/20260716000003_funil_kpis_v2_and_v_fila_trabalho.sql (the 7-key RPC)
 * @see src/features/entrevista/services/entrevistaService.ts (XServiceError idiom cloned)
 */
import { supabase } from '@/lib/supabase/client'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class FunilKpisServiceError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'FORBIDDEN' | 'NOT_FOUND',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'FunilKpisServiceError'
  }
}

/** One raw stage→stage transition count (the preserved `conversion_stage_to_stage` key). */
export interface ConversionEdge {
  de: string
  para: string
  n: number
}

/** {knockouts, total, taxa} — `taxa` is null when `total=0` (renders "—", never 0%). */
export interface KnockoutRate {
  knockouts: number
  total: number
  taxa: number | null
}

/** {no_shows, total, taxa} — `taxa` null when there are no decided interviews. */
export interface NoShowRate {
  no_shows: number
  total: number
  taxa: number | null
}

/** Per-stage closed-cohort drop — `taxa` null when the stage has no exits. */
export interface DropStage {
  dropped: number
  saidas: number
  taxa: number | null
}

/**
 * The 7-key `funil_kpis` payload (34-01). `taxa`/`time` fields are `number | null` —
 * a null value means "no data yet" and MUST render "—", never a fabricated 0 (T-34-05-03).
 * `median_time_per_stage`/`time_to_hire` are bigint SECONDS (the client converts to days).
 */
export interface FunilKpis {
  /** seconds of median dwell per etapa. */
  median_time_per_stage: Record<string, number>
  /** raw stage→stage counts. */
  conversion_stage_to_stage: ConversionEdge[]
  /** current volume by `etapa_atual`. */
  volume_by_stage: Record<string, number>
  /** median inscrição→aprovado SECONDS, or null when there are no hires yet. */
  time_to_hire: number | null
  knockout_rate: KnockoutRate
  drop_per_stage: Record<string, DropStage>
  no_show_rate: NoShowRate
}

/**
 * Reads the vaga-scoped operational KPIs via the `funil_kpis` DEFINER RPC — the SOLE
 * data path. `vagaId=null` → all owned vagas (RPC default). NO client-side aggregation
 * (T-34-05-01): the aggregates + owner-scope + PII-safety are enforced inside the RPC.
 */
export async function getFunilKpis(vagaId: string | null): Promise<FunilKpis> {
  const { data, error } = await supabase.rpc('funil_kpis', {
    p_vaga_id: vagaId ?? undefined,
  })
  if (error) {
    throw new FunilKpisServiceError(
      `Não foi possível carregar os KPIs: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  // Transient cast: the RPC declares `Returns: Json` in database.types.ts; the 7-key
  // shape is enforced by the RPC contract (34-01 smoke a–h). Drop once the return type
  // narrows. A null/empty payload = no data — the dashboard renders the empty state.
  return (data ?? {}) as unknown as FunilKpis
}
