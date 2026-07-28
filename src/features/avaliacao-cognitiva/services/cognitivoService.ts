/**
 * cognitivoService — the candidate cognitive-reasoning prova data layer
 * (Phase 14 / ENTREV-05 — the candidate side of the cognitive prova).
 *
 * Clones the Phase-13 `revisaoRedacaoService` / Phase-11 `avaliacaoService`
 * posture verbatim. The genuinely load-bearing invariants (RNF-07a + anti-tamper):
 *
 *  - `listItens` reads `cognitivo_itens` via an EXPLICIT allowlist that EXCLUDES
 *    the answer-key column ([[reference_select_star_leaks_pii]]). RLS is row-level
 *    only and does NOT hide columns; the answer key is SERVER-ONLY
 *    and NEVER crosses to a candidate surface (T-14-06-01). NEVER a star projection.
 *
 *  - `submitProva` calls the LIVE `pontuar_cognitivo` SECURITY DEFINER RPC posting
 *    ONLY raw picks (`{ itemId -> optionIndex }`) — never a score/band/threshold
 *    (anti-tamper; the body matches `SubmitCognitivoBodySchema` from 14-01). The
 *    server re-scores deterministically from the server-only answer key; the
 *    return is NEUTRAL (`{ ok, registrado }`) — the candidate never sees a score
 *    (T-14-06-02 / T-14-06-03 / RNF-07a). A 42501 back-lock (etapa advanced
 *    mid-session) surfaces as the neutral `LOCKED` outcome, NOT an error.
 *
 *  - `getContexto` resolves the opt-in gate (`vaga.aplica_cognitivo`, default
 *    false) + the candidatura etapa via an allowlist projection. The prova only
 *    mounts when `aplica_cognitivo` is true (T-14-06-05).
 *
 * @module features/avaliacao-cognitiva/services/cognitivoService
 * @see src/features/triagem/services/revisaoRedacaoService.ts (the allowlist + RPC idiom)
 * @see supabase/migrations/20260624000003_pontuar_cognitivo_rpc.sql (the LIVE RPC, 14-03/14-04)
 * @see supabase/functions/_shared/cognitivo-schemas.ts (SubmitCognitivoBodySchema — the body contract)
 */
import { supabase } from '@/lib/supabase/client'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class CognitivoServiceError extends Error {
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
    this.name = 'CognitivoServiceError'
  }
}

/** The 2 CC0 item sections — matches the scorer + the DB CHECK. */
export type SecaoCognitiva = 'matriz' | 'letra_numero'

/**
 * The EXPLICIT candidate-facing column allowlist for `cognitivo_itens` — RETAINED as
 * the documented, auditable list of the ONLY columns the candidate may ever see
 * (`id, secao, enunciado, alternativas, ordem`), and asserted by the
 * `prova-cognitiva.test.tsx` regression as a second guard. It DELIBERATELY EXCLUDES
 * the answer-key index (server-only, T-14-06-01). NEVER `'*'`
 * ([[reference_select_star_leaks_pii]]).
 *
 * SEC-01 (Phase 24): `listItens` no longer reads the base table with this allowlist —
 * it now goes through the `get_cognitivo_itens` SECURITY DEFINER RPC (the base-table
 * candidate row policy `auth_le_cognitivo_itens` was DROPPED and `gabarito_idx`
 * column-REVOKE'd), so a direct `?select=gabarito_idx` returns 0 rows. The RPC
 * projects exactly these same columns server-side.
 */
export const COGNITIVO_ITENS_ALLOWLIST = 'id, secao, enunciado, alternativas, ordem'

/**
 * One CC0 reasoning item as the CANDIDATE sees it — enunciado + alternativas ONLY.
 * The answer-key index is NOT part of this shape (it never leaves the server).
 */
export interface ItemCognitivoCandidato {
  id: string
  secao: SecaoCognitiva
  enunciado: string
  /** Discrete option texts; the candidate picks a 0-based index. */
  alternativas: string[]
  ordem: number
}

/** The candidate-context row (opt-in gate + etapa), allowlist-projected. */
export interface ProvaCognitivaContexto {
  candidatura_id: string
  vaga_id: string
  etapa_atual: string
  /** Opt-in gate — the prova only mounts when this is true (default false). */
  aplica_cognitivo: boolean
}

/** The neutral outcome of a submit — NEVER a score/band (RNF-07a). */
export type SubmitProvaOutcome = 'registrado' | 'locked'

/** The raw picks the candidate posts: { itemId -> 0-based optionIndex }. */
export type RawResponses = Record<string, number>

/**
 * The advisory proctoring context the candidate's session collected (CR-02). NEVER a
 * score/band — it is tab-blur/paste context that NEVER auto-rejects (the server
 * persists it as the `proctoring` jsonb on cognitivo_respostas). All fields optional.
 */
export interface ProctoringContext {
  /** Total tab-blur / visibility-hidden events observed (context). */
  blurCount?: number
  /** The accumulated, timestamped proctoring events. */
  events?: Array<{ type: string; at: number }>
  /** The soft-timer elapsed seconds (advisory, no hard cutoff). */
  completionTimeSeconds?: number
}

/**
 * Resolves the candidate context for the prova: the candidatura's vaga, current
 * etapa, and the cognitive opt-in gate. Allowlist projection — never a star
 * projection. The `:candidaturaId` route param is a candidatura id. Returns null
 * when the candidatura is missing.
 */
export async function getContexto(
  candidaturaId: string,
): Promise<ProvaCognitivaContexto | null> {
  if (!candidaturaId) {
    throw new CognitivoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from('candidaturas')
    .select('id, vaga_id, etapa_atual, vagas ( aplica_cognitivo )')
    .eq('id', candidaturaId)
    .maybeSingle()

  if (error) {
    throw new CognitivoServiceError(
      `Não foi possível carregar a prova: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  if (!data) return null

  const raw = data as unknown as {
    id: string
    vaga_id: string
    etapa_atual: string
    vagas?: { aplica_cognitivo?: boolean } | null
  }
  return {
    candidatura_id: raw.id,
    vaga_id: raw.vaga_id,
    etapa_atual: raw.etapa_atual,
    aplica_cognitivo: raw.vagas?.aplica_cognitivo ?? false,
  }
}

/**
 * Lists the CC0 reasoning items the candidate must answer. SEC-01 (Phase 24): reads
 * via the `get_cognitivo_itens` SECURITY DEFINER RPC — which projects ONLY
 * `id, secao, enunciado, alternativas, ordem` server-side and NEVER `gabarito_idx`
 * (the answer key, T-14-06-01) — instead of the base table. The base-table candidate
 * row policy was dropped and `gabarito_idx` column-REVOKE'd, so the candidate can no
 * longer reach the answer key even with a direct `?select=gabarito_idx`. Mirrors the
 * `pontuar_cognitivo` rpc idiom below. Ordered by `ordem` for a stable presentation
 * (the RPC returns them ordered); `alternativas` is normalized to a `string[]`.
 */
export async function listItens(): Promise<ItemCognitivoCandidato[]> {
  // NARROW confined cast (mirrors bigfiveService.getBigfiveItens): `get_cognitivo_itens`
  // is not yet in the generated `database.types.ts` (regen is the 24-08 wave). Only the
  // RPC name is widened — NOT a blanket UntypedClient. Drop the cast after the regen.
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(
    'get_cognitivo_itens',
  )

  if (error) {
    throw new CognitivoServiceError(
      `Não foi possível carregar os itens da prova: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  const rows = (data as unknown as Record<string, unknown>[] | null) ?? []
  return rows.map((r) => ({
    id: String(r.id),
    secao: r.secao as SecaoCognitiva,
    enunciado: String(r.enunciado ?? ''),
    alternativas: Array.isArray(r.alternativas)
      ? (r.alternativas as unknown[]).map((a) => String(a))
      : [],
    ordem: Number(r.ordem ?? 0),
  }))
}

/**
 * Submits the candidate's prova via the LIVE `pontuar_cognitivo` SECURITY DEFINER
 * RPC, posting the raw picks (`{ itemId -> optionIndex }`) + advisory shuffle seed +
 * proctoring context — NEVER a score/band/threshold (anti-tamper, T-14-06-02; the
 * server is the sole scorer). The server re-scores from the server-only answer key,
 * persists the raw picks + proctoring to `cognitivo_respostas` (CR-02), and returns a
 * NEUTRAL payload — the candidate never receives a score (RNF-07a).
 *
 * CR-02: `shuffleSeed` + `proctoring` (tab-blur/paste context + soft-timer seconds)
 * are NO LONGER dead — they are passed to the RPC so the "registramos quando a aba
 * perde o foco" disclosure is truthful. They are advisory context; the score is still
 * derived purely from `rawResponses` server-side (a forged score field is ignored).
 *
 * Outcome:
 *  - `'registrado'` — the prova was recorded (neutral acknowledgment).
 *  - `'locked'` — a 42501 back-lock (the etapa advanced mid-session); the UI shows
 *    "Sua etapa avançou." and the prova is closed. NOT surfaced as an error.
 *
 * Other failures throw `CognitivoServiceError('NETWORK_ERROR')`.
 */
export async function submitProva(
  candidaturaId: string,
  rawResponses: RawResponses,
  shuffleSeed?: string,
  proctoring?: ProctoringContext,
): Promise<SubmitProvaOutcome> {
  if (!candidaturaId) {
    throw new CognitivoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // The RPC re-scores purely from raw picks (no score/band reaches the server — it is
  // the sole scorer). CR-02: it ALSO persists the raw picks + the advisory shuffle seed
  // + proctoring context to cognitivo_respostas. `p_proctoring` carries the tab-blur/
  // paste events + the blur count (context only — NEVER auto-rejects).
  const { error } = await supabase.rpc('pontuar_cognitivo', {
    p_candidatura_id: candidaturaId,
    p_respostas: rawResponses,
    p_shuffle_seed: shuffleSeed ?? undefined,
    p_completion_time_seconds: proctoring?.completionTimeSeconds ?? undefined,
    p_proctoring: {
      blur_count: proctoring?.blurCount ?? 0,
      events: proctoring?.events ?? [],
    },
  })

  if (error) {
    const code = (error as { code?: string; status?: number }).code ?? ''
    const status = (error as { status?: number }).status
    // Back-lock: the etapa advanced mid-session → neutral terminal state. IN-01:
    // `status` is a numeric HTTP status (403), never the string '42501', so the
    // impossible `String(status) === '42501'` disjunct was removed.
    if (code === '42501' || status === 403) {
      return 'locked'
    }
    throw new CognitivoServiceError(
      'Não foi possível enviar a prova agora. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }

  return 'registrado'
}
