/**
 * explicacaoService — the candidate LGPD Art. 20 explanation data layer (DECISAO-04).
 *
 * Clones the Phase-14 `cognitivoService` posture verbatim — the closest candidate
 * data-layer analog (own-row allowlist read + SECURITY DEFINER RPC invoke + custom
 * error class). The genuinely load-bearing invariants (RNF-07a + LGPD-04):
 *
 *  - `getExplicacao` reads `decisao_final` via an EXPLICIT own-row allowlist
 *    (`DECISAO_EXPLICACAO_ALLOWLIST` — 5 named columns) that EXCLUDES every score /
 *    band / percentile column and NEVER joins the psychometric scores table. RLS is
 *    row-level only and does NOT hide columns ([[reference_select_star_leaks_pii]] — the
 *    Phase-8 LGPD leak lesson, T-15-12). NEVER a star projection. The own-row scope
 *    is enforced by the LIVE `candidato_le_propria_decisao` RLS policy
 *    (`candidatos.user_id = auth.uid()`).
 *
 *  - REACHABILITY GATE (Pitfall 6 / T-15-14): the read returns the decision only
 *    when `decisao = 'rejeitado'`. Any other state (no row / aprovado / em_espera)
 *    resolves to `null` → the page renders the "Esta página não está disponível"
 *    state. The page is a transparency surface, not a status board.
 *
 *  - NON-CLINICAL REASON (Open Q5): the candidate sees a respectful, deterministic
 *    TEMPLATED reason keyed on `decisao` — NOT the raw internal RH justificativa
 *    tone, and NEVER a score/band/percentile. The internal justificativa never
 *    crosses to the candidate surface verbatim.
 *
 *  - `solicitarRevisao` invokes the LIVE `solicitar_revisao_decisao` SECURITY
 *    DEFINER RPC (own-row guarded, idempotent — DECISAO-04 / LGPD Art. 20). On RPC
 *    success it fires a fire-and-forget N8N webhook (the established thin-client
 *    idiom — copies submit-candidatura's redacted post-commit fetch) to notify the
 *    responsible RH; the webhook is NON-BLOCKING and NEVER throws into the mutation
 *    (the request is already registered server-side once the RPC resolves OK). The
 *    body carries NO PII beyond ids.
 *
 *  - `stampExplicacao` invokes `stamp_explicacao_acessada` (own-row, first-access
 *    stamp — transparency evidence, T-15-15). A 42501 / 403 from either RPC (own-row
 *    denial) surfaces as a neutral no-op outcome, NOT an error.
 *
 * AUTHORED-NOT-APPLIED: the two candidate RPCs live in the migration
 * `20260625100001_decisao_final_phase15.sql`, applied in PROD by Plan 15-06 (which
 * also regenerates `database.types.ts`). Until then the RPC names are absent from the
 * `Functions` type → minimal `as never` casts (precedent: 15-03 `registrarDecisao`
 * `decisaoService.ts:144`). 15-06 cleans the casts after the regen.
 *
 * @module features/explicacao/services/explicacaoService
 * @see src/features/avaliacao-cognitiva/services/cognitivoService.ts (allowlist read + RPC + error class analog)
 * @see src/features/decisao/services/decisaoService.ts (the AUTHORED-NOT-APPLIED `as never` RPC cast precedent)
 * @see supabase/functions/submit-candidatura/index.ts (the redacted fire-and-forget N8N webhook idiom)
 * @see supabase/migrations/20260625100001_decisao_final_phase15.sql (solicitar_revisao_decisao / stamp_explicacao_acessada — AUTHORED-NOT-APPLIED)
 */
import { supabase } from '@/lib/supabase/client'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class ExplicacaoServiceError extends Error {
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
    this.name = 'ExplicacaoServiceError'
  }
}

/**
 * The EXPLICIT own-row column allowlist for the candidate read of `decisao_final`. It
 * names ONLY the 5 columns the candidate may see — the high-level `decisao`, the
 * internal `justificativa` (consumed SERVER-of-record-side to derive a non-clinical
 * reason — never surfaced verbatim), and the LGPD Art. 20 lifecycle stamps
 * (`revisao_solicitada_em`, `revisao_resultado`, `explicacao_solicitada_em`).
 *
 * It DELIBERATELY EXCLUDES every score/band/percentile column and NEVER joins the
 * psychometric scores table (RNF-07a / LGPD-04, T-15-12). NEVER the wildcard
 * ([[reference_select_star_leaks_pii]]) — a star projection would leak PII the RLS
 * row-scope cannot hide. Listed as one auditable constant.
 */
export const DECISAO_EXPLICACAO_ALLOWLIST =
  'decisao, justificativa, revisao_solicitada_em, revisao_resultado, explicacao_solicitada_em'

/** The candidate-facing decision result — the live `decisao_final_resultado` enum. */
export type DecisaoResultado = 'aprovado' | 'rejeitado' | 'em_espera'

/**
 * The own-row explanation the candidate sees. It carries the HIGH-LEVEL result + the
 * derived NON-CLINICAL `reason` + the LGPD Art. 20 revision lifecycle — NEVER a
 * score/band/percentile (RNF-07a / LGPD-04). The internal `justificativa` is NOT part
 * of this shape: only the templated `reason` derived from it crosses to the candidate.
 */
export interface ExplicacaoCandidato {
  /** Always `'rejeitado'` here — the reachability gate returns null otherwise. */
  decisao: DecisaoResultado
  /** A respectful, deterministic templated reason (Open Q5) — non-clinical, high-level. */
  reason: string
  /** Set once the candidate requests a human review (idempotent). Drives the CTA state. */
  revisao_solicitada_em: string | null
  /** The RH-provided result of a requested review, if any (plain text). */
  revisao_resultado: string | null
  /** Stamped on the first visit — transparency evidence (T-15-15). */
  explicacao_solicitada_em: string | null
}

/** The neutral outcome of an own-row RPC write — NEVER an error on an own-row denial. */
export type ExplicacaoWriteOutcome = 'ok' | 'denied'

/**
 * URL do webhook N8N para a solicitação de revisão de decisão (LGPD Art. 20).
 *
 * DISTINCT from the nova-candidatura webhook (`VITE_N8N_NOVA_CANDIDATURA_URL`) — this
 * is its own path so an RH automation can route a "revisão solicitada" event
 * separately. Read from `VITE_N8N_REVISAO_DECISAO_URL` with a hardcoded fallback so a
 * deploy without the env var still posts (same WR-04 env-with-fallback idiom as
 * `candidaturasService.N8N_WEBHOOK_URL`). The own-row RPC is the source of record; the
 * webhook is a fire-and-forget NOTIFICATION only.
 */
const N8N_REVISAO_DECISAO_URL =
  (import.meta.env?.VITE_N8N_REVISAO_DECISAO_URL as string | undefined) ??
  'https://fernandocosta.app.n8n.cloud/webhook/revisao-decisao'

/**
 * Derives a respectful, NON-CLINICAL templated reason keyed on the decision (Open Q5).
 *
 * The candidate NEVER receives the raw internal RH justificativa tone, a score, a band,
 * or a percentile — only this deterministic, high-level, respectful phrasing. The
 * internal `justificativa` is read by the allowlist (it is the RH audit record) but is
 * intentionally NOT surfaced verbatim; this template is the candidate-facing substitute
 * (RNF-07a / LGPD-04). Kept here (not the component) so the no-leak invariant is
 * enforced at the data layer and asserted by the service test.
 */
function reasonForDecisao(decisao: DecisaoResultado): string {
  // Only `rejeitado` reaches the candidate page (reachability gate). The template is a
  // fixed, respectful, non-clinical statement — no score/band, no internal phrasing.
  return (
    'Avaliamos seu processo de forma global, considerando o conjunto das etapas e o ' +
    'alinhamento com o perfil buscado para esta vaga nesta seleção. Com base nessa ' +
    'análise, decidimos não seguir adiante neste momento. Esta decisão se refere a esta ' +
    'vaga específica e não representa um julgamento sobre o seu valor profissional.'
  )
}

/**
 * Reads the candidate's OWN decision (DECISAO-04) via the own-row allowlist, scoped to
 * `candidaturaId`. The LIVE `candidato_le_propria_decisao` RLS policy enforces own-row
 * (`candidatos.user_id = auth.uid()`); the allowlist enforces own-COLUMN (no score
 * leak). NEVER a star projection, NEVER a psychometric-scores join.
 *
 * REACHABILITY GATE (Pitfall 6 / T-15-14): returns `null` unless `decisao = 'rejeitado'`
 * — the page renders the "Esta página não está disponível" state for every other case
 * (no row / aprovado / em_espera / wrong candidatura the RLS hides). The candidate
 * receives a derived non-clinical `reason`, never the raw justificativa or any score.
 */
export async function getExplicacao(
  candidaturaId: string,
): Promise<ExplicacaoCandidato | null> {
  if (!candidaturaId) {
    throw new ExplicacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await supabase
    .from('decisao_final')
    .select(DECISAO_EXPLICACAO_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .maybeSingle()

  if (error) {
    throw new ExplicacaoServiceError(
      `Não foi possível carregar esta página: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  // No row (RLS hid it / no decision yet) → not-available.
  if (!data) return null

  const raw = data as unknown as {
    decisao: DecisaoResultado
    justificativa: string
    revisao_solicitada_em: string | null
    revisao_resultado: string | null
    explicacao_solicitada_em: string | null
  }

  // Reachability gate: the page exists ONLY after a rejection. aprovado / em_espera →
  // not-available (the candidate is still in-process or approved — no explanation page).
  if (raw.decisao !== 'rejeitado') return null

  return {
    decisao: raw.decisao,
    // Derived templated non-clinical reason — the internal justificativa is NEVER
    // surfaced verbatim; no score/band/percentile ever crosses (Open Q5 / RNF-07a).
    reason: reasonForDecisao(raw.decisao),
    revisao_solicitada_em: raw.revisao_solicitada_em ?? null,
    revisao_resultado: raw.revisao_resultado ?? null,
    explicacao_solicitada_em: raw.explicacao_solicitada_em ?? null,
  }
}

/**
 * Stamps `explicacao_solicitada_em` on the first visit via the own-row
 * `stamp_explicacao_acessada` SECURITY DEFINER RPC (transparency evidence, T-15-15).
 * Idempotent server-side (first-access-only `COALESCE`). A 42501 / 403 own-row denial
 * resolves to the neutral `'denied'` outcome, NOT an error (the stamp is best-effort —
 * a denied stamp must never break the page render).
 *
 * AUTHORED-NOT-APPLIED: `as never` cast until the 15-06 regen (precedent 15-03).
 */
export async function stampExplicacao(
  candidaturaId: string,
): Promise<ExplicacaoWriteOutcome> {
  if (!candidaturaId) {
    throw new ExplicacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // `stamp_explicacao_acessada` is not yet in the Functions type (AUTHORED-NOT-APPLIED)
  // → minimal `as never` cast until the 15-06 regen.
  const { error } = await supabase.rpc('stamp_explicacao_acessada' as never, {
    p_candidatura_id: candidaturaId,
  } as never)

  if (error) {
    const code = (error as { code?: string }).code ?? ''
    const status = (error as { status?: number }).status
    if (code === '42501' || status === 403) return 'denied'
    throw new ExplicacaoServiceError(
      'Não foi possível registrar o acesso a esta página.',
      'NETWORK_ERROR',
      error,
    )
  }

  return 'ok'
}

/**
 * Requests a human review of the decision (LGPD Art. 20 / DECISAO-04) via the own-row
 * `solicitar_revisao_decisao` SECURITY DEFINER RPC, which sets
 * `decisao_final.revisao_solicitada_em` idempotently. On RPC success it ALSO fires a
 * fire-and-forget N8N webhook (the redacted thin-client idiom) to notify the
 * responsible RH (`vaga.created_by`) — the webhook is NON-BLOCKING and NEVER throws
 * into the mutation (the request is already registered server-side once the RPC
 * resolves OK; a failed notification must not fail the request). The body carries NO
 * PII beyond ids.
 *
 * A 42501 / 403 own-row denial resolves to `'denied'` (a neutral outcome — the
 * candidate is acting on someone else's decision the RLS/RPC blocks), NOT an error.
 *
 * AUTHORED-NOT-APPLIED: `as never` cast until the 15-06 regen (precedent 15-03).
 */
export async function solicitarRevisao(
  candidaturaId: string,
): Promise<ExplicacaoWriteOutcome> {
  if (!candidaturaId) {
    throw new ExplicacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // `solicitar_revisao_decisao` is not yet in the Functions type (AUTHORED-NOT-APPLIED)
  // → minimal `as never` cast until the 15-06 regen.
  const { error } = await supabase.rpc('solicitar_revisao_decisao' as never, {
    p_candidatura_id: candidaturaId,
  } as never)

  if (error) {
    const code = (error as { code?: string }).code ?? ''
    const status = (error as { status?: number }).status
    if (code === '42501' || status === 403) return 'denied'
    throw new ExplicacaoServiceError(
      'Não foi possível enviar a solicitação. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }

  // Fire-and-forget RH notification AFTER the RPC committed — non-blocking. A webhook
  // failure MUST NOT fail the request (already registered server-side). NO PII beyond
  // the candidatura id (redacted body — copies submit-candidatura/index.ts:303-323).
  fetch(N8N_REVISAO_DECISAO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'decisao.revisao_solicitada',
      timestamp: new Date().toISOString(),
      data: { candidatura_id: candidaturaId },
    }),
  }).catch((e) =>
    console.warn(
      '[explicacaoService] N8N revisão webhook failed (non-blocking):',
      (e as { message?: string })?.message ?? String(e),
    ),
  )

  return 'ok'
}

/** Namespaced object export (camelCaseService convention). */
export const explicacaoService = {
  getExplicacao,
  stampExplicacao,
  solicitarRevisao,
}
