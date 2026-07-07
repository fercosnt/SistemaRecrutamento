/**
 * Phase 12 / Plan 12-05 (AVAL-04 / RF-15) — the CLIENT Big Five Likert form schema.
 *
 * The candidate answers the active IPIP-NEO-120 PT-BR items on a 5-point Likert scale
 * (1..5). UX-08 (Phase 24) deactivated the 4 political O6 items {28,58,88,118} (LGPD
 * special-category), so the administered set is 116 items with non-contiguous ids. The
 * schema mirrors the EF's `SubmitBigfiveFinalBodySchema`
 * (supabase/functions/_shared/avaliacao-schemas.ts) so the body the client builds
 * parses there byte-for-byte (the 12-01 contract test pins this). It is the
 * anti-tamper boundary (RESEARCH Pitfall 3): the client posts ONLY
 * `{ candidatura_id, respostas: { "<active item_id>" → 1..5 } }` — NEVER a score, never a
 * dimension/facet/reverse key. `.strict()` rejects any extra field rather than
 * silently stripping it.
 *
 * @see supabase/functions/_shared/avaliacao-schemas.ts (SubmitBigfiveFinalBodySchema — the EF twin)
 * @see src/features/avaliacao/__tests__/bigfive-contract.test.ts (the client↔EF contract test)
 * @see .planning/phases/12-big-five-devolutiva/12-RESEARCH.md §Code Examples (submit body)
 * @module features/avaliacao/schemas/bigfiveSchema
 */
import { z } from 'zod'

/** The 5-point Likert PT-BR labels (ordem 1..5), from the IPIP-NEO-120 JSON. */
export const LIKERT_LABELS: readonly string[] = [
  'Muito inadequado',
  'Relativamente inadequado',
  'Nem adequado, nem inadequado',
  'Relativamente adequado',
  'Muito adequado',
]

/**
 * The number of ACTIVE items administered by the IPIP-NEO-120 instrument. UX-08
 * (Phase 24) deactivated the 4 political O6 items {28,58,88,118} (LGPD special-category),
 * so the candidate answers 116 items. This is the presentation/copy default; the true
 * completion gate is driven off the loaded item ids (get_bigfive_itens = the active set,
 * non-contiguous) — see isAllAnswered.
 */
export const BIGFIVE_TOTAL_ITENS = 116

/**
 * The client submit body — EXACT twin of the EF `SubmitBigfiveFinalBodySchema`:
 * `candidatura_id` (uuid) + `respostas` (a record of item_id → Likert 1..5).
 * `.strict()` (anti-tamper): a stray `score` field is rejected, not stripped.
 */
export const SubmitBigfiveBodySchema = z
  .object({
    candidatura_id: z.string().uuid(),
    // exactly the Likert answers, each int 1..5; NO score field anywhere
    respostas: z.record(z.string(), z.number().int().min(1).max(5)),
  })
  .strict()

export type SubmitBigfiveBody = z.infer<typeof SubmitBigfiveBodySchema>

/**
 * Builds the submit body from the answer map keyed by item_id. Does NOT inject a
 * score (the EF derives it). The caller asserts completeness (all loaded/active items)
 * before enabling submit; the EF re-validates via `.strict` + an active-set coverage check.
 */
export function buildSubmitBigfiveBody(
  candidaturaId: string,
  respostas: Record<string, number>,
): SubmitBigfiveBody {
  return SubmitBigfiveBodySchema.parse({
    candidatura_id: candidaturaId,
    respostas,
  })
}

/**
 * True once EVERY loaded item carries a 1..5 answer (the Concluir gate). Driven off the
 * loaded item ids — the active set from `get_bigfive_itens` (116 non-contiguous ids
 * after UX-08 deactivated {28,58,88,118}). The caller passes those ids so a gap never
 * blocks completion; iterating a literal `1..N` range would count the deactivated ids
 * as forever-unanswered and the gate would never satisfy.
 */
export function isAllAnswered(
  respostas: Record<string, number | undefined>,
  itemIds: readonly number[],
): boolean {
  if (itemIds.length === 0) return false
  return itemIds.every((id) => {
    const v = respostas[String(id)]
    return typeof v === 'number' && v >= 1 && v <= 5
  })
}

/**
 * How many loaded items currently carry a valid 1..5 answer (progress count). Counts the
 * answered entries directly — the map is only ever keyed by loaded item ids (which are
 * non-contiguous after UX-08), never a literal `1..N` loop.
 */
export function countAnswered(respostas: Record<string, number | undefined>): number {
  let count = 0
  for (const v of Object.values(respostas)) {
    if (typeof v === 'number' && v >= 1 && v <= 5) count++
  }
  return count
}
