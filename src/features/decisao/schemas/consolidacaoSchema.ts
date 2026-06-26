/**
 * Shared consolidation request schema (DECISAO-01).
 *
 * THE single source of truth for the `consolidar-decisao-final` EF request body,
 * imported by BOTH the EF (Wave 1) and the RH client `decisaoService` (Wave 2) so
 * the client↔EF contract CANNOT drift — the integration-contract lesson that broke
 * Phase 11 SJT (client sent a body the EF Zod schema rejected, both mocked sides
 * green while the real contract was broken). [[feedback_integration_contract_gap]]
 *
 * The body carries ONLY the two identifiers — NEVER a peso / threshold / numeric
 * input (anti-tamper, RNF-07a): the EF reads already-recorded results server-side
 * and the consolidated number is derived, never client-supplied. `.strict()`
 * REJECTS any extra/unknown key.
 *
 * The EF (Deno runtime) re-declares this same shape via a static `npm:zod` import;
 * this module is the Node/Vite-side source the contract test (15-01 Task 3a) probes.
 *
 * @see supabase/functions/consolidar-decisao-final/index.ts (Wave 1 — imports the shape)
 * @see src/features/decisao/schemas/__tests__/consolidacaoContract.test.ts (the contract probe)
 */
import { z } from 'zod'

/**
 * The consolidation EF request body: exactly two identifiers. `.strict()` so an
 * unknown key (or any injected numeric input) is rejected at the boundary.
 */
export const ConsolidacaoRequestSchema = z
  .object({
    candidatura_id: z.string().uuid(),
    vaga_id: z.string().uuid(),
  })
  .strict()

export type ConsolidacaoRequest = z.infer<typeof ConsolidacaoRequestSchema>

/**
 * The `consolidar-decisao-final` EF response shape (Wave-1 authored, Wave-2
 * rendered). A pure presentation type — the EF derives every value server-side
 * (it NEVER re-scores, only aggregates already-recorded results), so this is the
 * exact contract `ConsolidacaoDashboard` reads.
 *
 * @see supabase/functions/consolidar-decisao-final/index.ts (the source emitting it)
 */

/** A single etapa row in the consolidation breakdown. */
export interface ConsolidacaoBreakdownRow {
  /** Weight-key / context-key: triagem | work_sample_sjt | redacao_cultural | entrevista | big_five | cognitivo. */
  etapa: string
  /** 0..100 when present; null when N/A or context-only. */
  normalized: number | null
  /** `present` (weighted), `na` (missing/unapplied — neutral N/A pill), `context` (big_five/cognitivo — never weighted). */
  status: 'present' | 'na' | 'context'
  /** Raw vaga peso (weighted keys); null for context rows. */
  weight: number | null
  /** Peso renormalized over the PRESENT etapas; null otherwise. */
  effective_weight: number | null
}

/**
 * The full EF payload: the consolidated weighted aggregate (null when no etapa is
 * avaliable), the per-etapa breakdown, and a DETERMINISTIC templated advisory
 * recommendation (NEVER an LLM call — the human always decides, RNF-07a).
 */
export interface ConsolidacaoResponse {
  /** Weighted aggregate 0..100, or null when no PRESENT etapa exists. NOT a verdict — an aggregate. */
  consolidated: number | null
  breakdown: ConsolidacaoBreakdownRow[]
  /** Advisory templated recommendation derived from the breakdown (advisory only). */
  recommendation: string
}
