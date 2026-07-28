/**
 * analiseCandidatoService — the RH-only hub read of the IA analysis (VISRH-02).
 *
 * Reads ONE row of `public.analise_candidato_vaga` (RLS `rh_le_analise`: RH/admin
 * SELECT vaga-scoped; the candidate has NO policy → DB-denied). The genuinely
 * load-bearing invariant is the PII-leak guard ([[reference_select_star_leaks_pii]]):
 * the read names its columns explicitly via `ANALISE_HUB_ALLOWLIST` and NEVER uses a
 * star projection — RLS is row-level only and does NOT hide columns, so a star select
 * here would leak `resumo_cv` / `resumo_respostas` / `erro` (the raw AI internals) that
 * the hub surface never needs. The candidate NEVER sees this analysis; the block that
 * renders it lives only under `HubCandidatoRH` (RH surface).
 *
 * The DB column is `status`; the return shape exposes it as `analise_status` (the name
 * the UI-SPEC states contract + the AnaliseIABlock read), mirroring the flattened
 * `v_triagem_panel.analise_status`. One row per candidatura (unique candidatura_id) →
 * `maybeSingle()`; returns null when no analysis has been generated yet.
 *
 * @module features/hub-candidato/services/analiseCandidatoService
 * @see src/features/entrevista/services/entrevistaService.ts (allowlist + service-error idiom cloned)
 * @see src/features/avaliacao/services/scoresRhService.ts (the exact PII-safe read analog)
 */
import { supabase } from '@/lib/supabase/client'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class AnaliseCandidatoServiceError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'FORBIDDEN' | 'NOT_FOUND',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'AnaliseCandidatoServiceError'
  }
}

/**
 * The EXPLICIT column allowlist for the hub IA-analysis read. NEVER `'*'`
 * ([[reference_select_star_leaks_pii]]). Names ONLY what the hub renders:
 * `score_match` (0-100 nullable), `pontos_fortes[]`, `gaps[]`, `flags[]`, `status`
 * (mapped to `analise_status` on the row). Deliberately EXCLUDES `resumo_cv`,
 * `resumo_respostas`, and `erro` — the raw AI internals the surface does not need.
 */
export const ANALISE_HUB_ALLOWLIST = 'score_match, pontos_fortes, gaps, flags, status'

/** The allowlist-projected IA-analysis row the hub consumes. */
export interface AnaliseHubRow {
  /** 0-100 aderência à vaga; null when the AI produced no score. */
  score_match: number | null
  pontos_fortes: string[]
  gaps: string[]
  flags: string[]
  /** Mapped from the DB `status` column ('pendente' | 'sucesso' | 'falhou'). */
  analise_status: string | null
}

/**
 * Reads the IA analysis for ONE candidatura (RH/admin only — candidate DB-denied).
 * Allowlist projection of `analise_candidato_vaga` — never a star projection.
 * Returns null when no analysis row exists. The `candidaturaId` is the `:id` route
 * param (Pitfall 8 — it IS a candidatura id, not a candidato id).
 */
export async function getAnalise(candidaturaId: string): Promise<AnaliseHubRow | null> {
  if (!candidaturaId) {
    throw new AnaliseCandidatoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await supabase
    .from('analise_candidato_vaga')
    .select(ANALISE_HUB_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .maybeSingle()

  if (error) {
    throw new AnaliseCandidatoServiceError(
      `Não foi possível carregar a análise da IA: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  if (!data) return null

  const raw = data as unknown as {
    score_match: number | null
    pontos_fortes: string[] | null
    gaps: string[] | null
    flags: string[] | null
    status: string | null
  }
  return {
    score_match: raw.score_match ?? null,
    pontos_fortes: raw.pontos_fortes ?? [],
    gaps: raw.gaps ?? [],
    flags: raw.flags ?? [],
    analise_status: raw.status ?? null,
  }
}
