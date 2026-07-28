/**
 * Phase 7 / VAGACFG-02 — `vaga.pesos_avaliacao` Zod schema.
 *
 * The 4 weighted decision keys (D-07): triagem, work_sample_sjt,
 * redacao_cultural, entrevista. They MUST sum to exactly 100 (publish gate
 * condition 1, D-12). `big_five` and `cognitivo` are context-only (no peso,
 * excluded from the sum).
 *
 * Integer-only guard (Pitfall 4): sliders store integers so the sum is an exact
 * `=== 100` comparison, never an IEEE-754 float that "looks" like 100.
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-RESEARCH.md §Code Examples
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-07, D-08, D-12)
 * @module features/config-vaga/schemas/pesosAvaliacaoSchema
 */
import { z } from 'zod'

const peso = z.number().int().min(0).max(100)

export const pesosAvaliacaoSchema = z
  .object({
    triagem: peso,
    work_sample_sjt: peso,
    redacao_cultural: peso,
    entrevista: peso,
  })
  .refine(
    (p) =>
      p.triagem + p.work_sample_sjt + p.redacao_cultural + p.entrevista === 100,
    { message: 'Os pesos precisam somar 100%.' }
  )

export type PesosAvaliacao = z.infer<typeof pesosAvaliacaoSchema>

/**
 * Live running sum for the "Soma: X%" indicator (non-blocking hint).
 * Computed outside `.refine` so a partial form can render the current total.
 * Missing keys count as 0.
 */
export const somaPesos = (p: Partial<PesosAvaliacao>): number =>
  (p.triagem ?? 0) +
  (p.work_sample_sjt ?? 0) +
  (p.redacao_cultural ?? 0) +
  (p.entrevista ?? 0)
