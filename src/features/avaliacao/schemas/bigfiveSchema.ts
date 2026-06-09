/**
 * Phase 12 / Plan 12-05 (AVAL-04 / RF-15) — the CLIENT Big Five Likert form schema.
 *
 * The candidate answers exactly 120 IPIP-NEO-120 PT-BR items on a 5-point Likert
 * scale (1..5). The schema mirrors the EF's `SubmitBigfiveFinalBodySchema`
 * (supabase/functions/_shared/avaliacao-schemas.ts) so the body the client builds
 * parses there byte-for-byte (the 12-01 contract test pins this). It is the
 * anti-tamper boundary (RESEARCH Pitfall 3): the client posts ONLY
 * `{ candidatura_id, respostas: { "1".."120" → 1..5 } }` — NEVER a score, never a
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

/** Exactly the number of items in the IPIP-NEO-120 instrument. */
export const BIGFIVE_TOTAL_ITENS = 120

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
 * score (the EF derives it). The caller asserts completeness (all 120) before
 * enabling submit; the EF re-validates via `.strict` + a 1..120 coverage check.
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

/** True once all 120 items carry a 1..5 answer (the Concluir gate). */
export function isAllAnswered(respostas: Record<string, number | undefined>): boolean {
  let count = 0
  for (let id = 1; id <= BIGFIVE_TOTAL_ITENS; id++) {
    const v = respostas[String(id)]
    if (typeof v === 'number' && v >= 1 && v <= 5) count++
  }
  return count === BIGFIVE_TOTAL_ITENS
}

/** How many of the 120 items currently carry a valid answer (progress count). */
export function countAnswered(respostas: Record<string, number | undefined>): number {
  let count = 0
  for (let id = 1; id <= BIGFIVE_TOTAL_ITENS; id++) {
    const v = respostas[String(id)]
    if (typeof v === 'number' && v >= 1 && v <= 5) count++
  }
  return count
}
