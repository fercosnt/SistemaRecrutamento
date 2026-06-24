/**
 * revisaoRedacaoService — the RH human-review queue read + the review-write RPC
 * (AVAL-07 / RF-R-17/21/23/24/25/27/28). The one genuinely-new RH surface of Phase 13.
 *
 * Load-bearing invariants (D-13):
 *  - The read names its columns explicitly via `REDACAO_ALLOWLIST` — NEVER a star
 *    projection ([[reference_select_star_leaks_pii]]). RLS is row-level only and does
 *    NOT hide columns; over-projecting here would leak more than the scorecard needs.
 *    The candidate has NO read policy on these verdict columns (denied at the DB).
 *  - The review WRITE goes through the LIVE `salvar_revisao_redacao` SECURITY DEFINER
 *    RPC (role + own-vaga guarded, notas≥50, decisao enum, duvida-does-not-finalize).
 *    There is NO direct UPDATE path in this service — the RPC is the only authorized
 *    write, and the `trg_redacao_rh_only_review_fields` trigger backstops it.
 *
 * @module features/triagem/services/revisaoRedacaoService
 * @see src/features/avaliacao/services/scoresRhService.ts (allowlist read idiom)
 * @see src/features/triagem/services/triagemService.ts (RPC write + error map idiom)
 * @see supabase/migrations/20260623100004_salvar_revisao_redacao_rpc.sql (live RPC, Plan 13-04)
 */
import { supabase } from '@/lib/supabase/client'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class RevisaoRedacaoServiceError extends Error {
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
    this.name = 'RevisaoRedacaoServiceError'
  }
}

/** The 3-color RH triage signal (RH-facing only — never a candidate verdict). */
export type RedacaoCor = 'verde' | 'amarelo' | 'vermelho'

/** The reviewer decision ∈ {aprovado, reprovado, duvida} (duvida escalates to gestor). */
export type DecisaoRevisor = 'aprovado' | 'reprovado' | 'duvida'

/** The 4 Beauty Smile BARS dimension scores (1-5; the IA suggestion the slider defaults to). */
export interface ScoresDimensao {
  D1?: number | string | null
  D2?: number | string | null
  D3?: number | string | null
  D4?: number | string | null
  [k: string]: unknown
}

/**
 * One `redacoes_candidato` review row, projected via the explicit allowlist. Carries
 * the IA verdict (scores/color/red_flag/flags + reasoning) + the reviewer fields.
 */
export interface RedacaoReviewRow {
  id: string
  candidatura_id: string
  pergunta_id: string
  texto: string
  scores_dimensao: ScoresDimensao | null
  score_ponderado_0_100: number | null
  classificacao_cor: RedacaoCor | null
  red_flag_etico: boolean
  flags: string[]
  analise_ia: Record<string, unknown> | null
  scores_humanos: ScoresDimensao | null
  notas_revisor: string | null
  decisao_revisor: DecisaoRevisor | null
  revisada_por: string | null
  revisada_em: string | null
  status_analise: string
  bloqueio_avanco: boolean
  /** Candidate display name, flattened from the joined `candidaturas → candidatos`. */
  candidato_nome: string | null
}

/**
 * The EXPLICIT column allowlist for the RH review read. NEVER `'*'`
 * ([[reference_select_star_leaks_pii]]). Listed as a single constant so the
 * projection is auditable in one place. The joined `candidaturas`/`candidatos`
 * columns are appended at the call site (PostgREST embed) — the bare-column part
 * is what the no-star contract guards.
 */
export const REDACAO_ALLOWLIST =
  'id, candidatura_id, pergunta_id, texto, scores_dimensao, score_ponderado_0_100, classificacao_cor, red_flag_etico, flags, analise_ia, scores_humanos, notas_revisor, decisao_revisor, revisada_por, revisada_em, status_analise, bloqueio_avanco'

/** The PostgREST embed that joins the vaga (for the filter) + the candidate name. */
const REDACAO_EMBED = `${REDACAO_ALLOWLIST}, candidaturas!inner ( vaga_id, candidatos ( nome_completo ) )`

/** WR-05 — defensive bound on the RH review/escalation queues (no unbounded reads). */
const REVIEW_QUEUE_LIMIT = 500

/** Severity rank for the sidebar sort (vermelho first → verde last). */
const COR_SEVERITY: Record<RedacaoCor, number> = {
  vermelho: 3,
  amarelo: 2,
  verde: 1,
}

/** Sort a queue by severity DESC (vermelho → amarelo → verde). Stable, pure. */
export function sortBySeverity(rows: RedacaoReviewRow[]): RedacaoReviewRow[] {
  return [...rows].sort(
    (a, b) =>
      (COR_SEVERITY[(b.classificacao_cor ?? 'verde') as RedacaoCor] ?? 0) -
      (COR_SEVERITY[(a.classificacao_cor ?? 'verde') as RedacaoCor] ?? 0),
  )
}

/** Flatten the PostgREST embed into the flat `candidato_nome` field. */
function flattenRow(raw: Record<string, unknown>): RedacaoReviewRow {
  const cand = raw.candidaturas as { candidatos?: { nome_completo?: string } } | null
  const { candidaturas: _drop, ...rest } = raw
  return {
    ...(rest as unknown as RedacaoReviewRow),
    candidato_nome: cand?.candidatos?.nome_completo ?? null,
  }
}

/**
 * Lists the redação review queue for a vaga (RH/admin only — candidate denied by
 * RLS). Allowlist projection of `redacoes_candidato`, joined to `candidaturas` for
 * the `vaga_id` filter + the candidate name. Returned sorted by severity DESC so the
 * sidebar shows vermelho first; the caller filters by cor as needed.
 */
export async function listRedacoesRevisao(vagaId: string): Promise<RedacaoReviewRow[]> {
  if (!vagaId) {
    throw new RevisaoRedacaoServiceError('vagaId é obrigatório', 'INVALID_INPUT')
  }

  // WR-05 — NO server `.order('classificacao_cor')`: that sorts by the raw enum
  // TEXT ('verde' > 'vermelho' > 'amarelo' alphabetically), which does NOT match
  // severity and is overridden by `sortBySeverity` below anyway. `sortBySeverity`
  // owns the ordering; `.limit` bounds the per-vaga queue defensively.
  const { data, error } = await supabase
    .from('redacoes_candidato')
    .select(REDACAO_EMBED)
    .eq('candidaturas.vaga_id', vagaId)
    .limit(REVIEW_QUEUE_LIMIT)

  if (error) {
    throw new RevisaoRedacaoServiceError(
      `Não foi possível carregar a fila de revisão: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  const rows = ((data as unknown as Record<string, unknown>[] | null) ?? []).map(flattenRow)
  return sortBySeverity(rows)
}

/**
 * Lists the gestor escalation queue — review rows where the reviewer chose `duvida`
 * (RF-R-27). In-app only; notification plumbing is OUT OF SCOPE (Open Question 4).
 * Optionally scoped to one vaga.
 */
export async function getDuvidasGestor(vagaId?: string): Promise<RedacaoReviewRow[]> {
  // WR-05 — bound the escalation queue with `.limit`. Without a vagaId this reads
  // every `duvida` row the RLS exposes (own-vaga scoping is a milestone-wide LGPD
  // decision deferred to Phase 15/16); the cap stops an unbounded full-queue read.
  let query = supabase
    .from('redacoes_candidato')
    .select(REDACAO_EMBED)
    .eq('decisao_revisor', 'duvida')

  if (vagaId) {
    query = query.eq('candidaturas.vaga_id', vagaId)
  }

  const { data, error } = await query.limit(REVIEW_QUEUE_LIMIT)

  if (error) {
    throw new RevisaoRedacaoServiceError(
      `Não foi possível carregar as dúvidas do gestor: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return ((data as unknown as Record<string, unknown>[] | null) ?? []).map(flattenRow)
}

/**
 * Resolves the vaga id for a candidatura (the `:id` route param of the RH review
 * panel is a candidatura id; the queue is per-vaga). Allowlist projection — never
 * `select('*')`. Returns null when the candidatura is missing / has no vaga.
 */
export async function getVagaIdForCandidatura(candidaturaId: string): Promise<string | null> {
  if (!candidaturaId) {
    throw new RevisaoRedacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from('candidaturas')
    .select('vaga_id')
    .eq('id', candidaturaId)
    .maybeSingle()

  if (error) {
    throw new RevisaoRedacaoServiceError(
      `Não foi possível resolver a vaga: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  return (data as { vaga_id: string | null } | null)?.vaga_id ?? null
}

/** Payload for a single review decision. */
export interface SalvarRevisaoPayload {
  decisao: DecisaoRevisor
  notas: string
  scores_humanos: ScoresDimensao | Record<string, unknown>
}

/** The minimum reviewer-justification length (mirrors the DB CHECK + the RPC). */
export const NOTAS_MIN_CHARS = 50

/**
 * Records the reviewer decision on one redação via the LIVE `salvar_revisao_redacao`
 * SECURITY DEFINER RPC — NEVER a direct UPDATE. The RPC enforces role + own-vaga,
 * notas≥50, and the duvida-does-not-finalize invariant (RNF-07a — never advances the
 * funil, never auto-rejects). The client gate below short-circuits the obvious
 * notas<50 case so the form can surface it without a round-trip.
 *
 * Error map: insufficient_privilege (42501) → FORBIDDEN; check_violation (23514) /
 * notas<50 → INVALID_INPUT; no_data_found → NOT_FOUND; anything else → NETWORK_ERROR.
 */
export async function salvarRevisao(
  redacaoId: string,
  payload: SalvarRevisaoPayload,
): Promise<void> {
  if (!redacaoId) {
    throw new RevisaoRedacaoServiceError('redacaoId é obrigatório', 'INVALID_INPUT')
  }
  if (!payload.notas || payload.notas.trim().length < NOTAS_MIN_CHARS) {
    throw new RevisaoRedacaoServiceError(
      `A justificativa precisa ter no mínimo ${NOTAS_MIN_CHARS} caracteres.`,
      'INVALID_INPUT',
    )
  }
  if (!['aprovado', 'reprovado', 'duvida'].includes(payload.decisao)) {
    throw new RevisaoRedacaoServiceError('Decisão inválida.', 'INVALID_INPUT')
  }

  const { error } = await supabase.rpc('salvar_revisao_redacao', {
    p_redacao_id: redacaoId,
    p_decisao: payload.decisao,
    p_notas: payload.notas,
    p_scores_humanos: payload.scores_humanos as never,
  })

  if (error) {
    const code = (error as { code?: string }).code ?? ''
    if (code === '42501') {
      throw new RevisaoRedacaoServiceError(
        'Você não tem permissão para revisar esta redação.',
        'FORBIDDEN',
        error,
      )
    }
    if (code === '23514') {
      throw new RevisaoRedacaoServiceError(
        'Justificativa ou decisão inválida. Verifique os campos.',
        'INVALID_INPUT',
        error,
      )
    }
    if (code === 'P0002' || code === 'no_data_found') {
      throw new RevisaoRedacaoServiceError('Redação não encontrada.', 'NOT_FOUND', error)
    }
    throw new RevisaoRedacaoServiceError(
      'Não foi possível salvar a revisão. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }
}
