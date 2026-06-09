/**
 * scoresRhService — the RH-facing read of `scores_candidato` (AVAL-02/03).
 *
 * Load-bearing invariant (T-11-06-01, [[reference_select_star_leaks_pii]]): the
 * read names its columns explicitly — NEVER a star projection. RLS is row-level
 * only and does not hide columns; over-projecting here would leak more than the
 * scorecard needs. The candidate never reads `scores_candidato` (no RLS policy →
 * denied at the DB); RH/admin are allowed (Plan 11-02). This service just must
 * not over-project — the Wave-0 test asserts the select string excludes `'*'`.
 *
 * @module features/avaliacao/services/scoresRhService
 * @see src/features/triagem/services/triagemService.ts:128-138 (allowlist idiom + error class)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-06-PLAN.md (Task 1)
 */
import { supabase } from '@/lib/supabase/client'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class ScoresRhServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ScoresRhServiceError'
  }
}

/** The subtype discriminator for an SJT score row. */
export type ScoreSubtipo = 'mc' | 'caso_aberto'

/** A `pendente_humano` row needs human review; `falhou` has no score. */
export type ScoreStatus = 'sucesso' | 'pendente_humano' | 'falhou'

/** One MC answer item from `metadata.respostas` (server-derived, neutral). */
export interface McRespostaItem {
  pergunta_id: string
  opcao_id: string
  tag: string
  peso: number
}

/** MC metadata shape (subtipo='mc'). */
export interface McMetadata {
  respostas?: McRespostaItem[]
  has_atencao?: boolean
}

/** One BARS dimension from `metadata.dimension_scores` (open case). */
export interface DimensionScore {
  dimension: string
  score_1_5: number
  level?: string
  reasoning?: string
}

/** Open-case metadata shape (subtipo='caso_aberto'). */
export interface CasoAbertoMetadata {
  dimension_scores?: DimensionScore[]
  composite_0_25?: number
}

/**
 * One `scores_candidato` row, projected via the explicit allowlist. Never carries
 * PII identity columns — only the score surface the RH scorecard renders.
 */
export interface ScoreRow {
  id: string
  tipo: string
  subtipo: ScoreSubtipo
  pergunta_id: string | null
  score: number | null
  score_max: number | null
  status: ScoreStatus
  metadata: McMetadata | CasoAbertoMetadata | Record<string, unknown> | null
  citacoes: unknown
  red_flags: unknown
}

/**
 * The EXPLICIT column allowlist for the RH scorecard read. NEVER `'*'`
 * ([[reference_select_star_leaks_pii]]). Listed as a constant so the projection
 * is auditable in one place.
 */
const SCORES_ALLOWLIST =
  'id, tipo, subtipo, pergunta_id, score, score_max, status, metadata, citacoes, red_flags'

/**
 * Reads the SJT scores for a candidatura (RH/admin only — candidate denied by
 * RLS). Allowlist projection of `scores_candidato`; never a star projection.
 */
export async function getScores(candidaturaId: string): Promise<ScoreRow[]> {
  if (!candidaturaId) {
    throw new ScoresRhServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // `scores_candidato` is live in PROD but `database.types.ts` may not yet carry
  // it (Phase-11 apply wave) — the table name is reached via a narrow cast that
  // is confined to the generated-types gap; the column allowlist + return shape
  // stay typed locally.
  const { data, error } = await (
    supabase.from('scores_candidato' as never) as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => Promise<{ data: unknown; error: { message: string } | null }>
      }
    }
  )
    .select(SCORES_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)

  if (error) {
    throw new ScoresRhServiceError(
      `Erro ao carregar avaliações: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return (data as unknown as ScoreRow[] | null) ?? []
}
