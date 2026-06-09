/**
 * Phase 7 / VAGACFG-01 — `vaga.testes_aplicaveis` Zod schema (RF-11).
 *
 * A list of `{ teste, obrigatorio, customizado, perguntas? }`. Phase 11 (AVAL-01 /
 * RF-11) extends each entry ADDITIVELY with the optional SJT-battery keys the
 * avaliação container consumes:
 *   - `tipo: 'sjt'`            — discriminator for SJT batteries
 *   - `cargo`                  — cargo whose SJT bank to draw from
 *   - `itens_ids[]`            — stable SJT item ids selected for this vaga
 *   - `bateria_size`           — how many items the candidate answers
 *   - `threshold`              — per-vaga pass gate; `mc_min_pct` defaults to 60
 *                                (CONTEXT post-research), `case_min` to 13 (BARS
 *                                composite 0-25), `flag_on_atencao` to true.
 *
 * The 4 original Phase-7 keys stay intact (no regression). The new keys are all
 * optional so existing Phase-7 callers that emit only the 4-key shape keep
 * parsing. Threshold internal fields carry Zod `.default(...)`, so a partial
 * `threshold` object hydrates the missing gates.
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-RESEARCH.md §Code Examples
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-RESEARCH.md (extension shape, lines 557-572)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-CONTEXT.md (post-research threshold: mc_min_pct default 60)
 * @module features/config-vaga/schemas/testesAplicaveisSchema
 */
import { z } from 'zod'

/**
 * Per-vaga SJT pass gate (AVAL-02). Scoring is server-side; these thresholds tell
 * the RPC/EF when to flag `pendente_humano` — they NEVER auto-reject (RNF-07a).
 *  - `mc_min_pct`      — minimum % of the SJT-MC max score (default 60).
 *  - `case_min`        — minimum BARS composite (0-25) for the open case (default 13).
 *  - `flag_on_atencao` — any `atencao`-tagged option marked → flag (default true).
 */
export const sjtThresholdSchema = z.object({
  mc_min_pct: z.number().default(60),
  case_min: z.number().default(13),
  flag_on_atencao: z.boolean().default(true),
})

export type SjtThreshold = z.infer<typeof sjtThresholdSchema>

export const testeAplicavelSchema = z.object({
  teste: z.string().min(1, 'Identificador do teste obrigatório'),
  obrigatorio: z.boolean(),
  customizado: z.boolean(),
  // Pointer populated by the F11 SJT bank (D-05).
  perguntas: z.array(z.string()).optional(),
  // ── F11 SJT battery extension (AVAL-01 / RF-11) — all optional, additive ──
  tipo: z.literal('sjt').optional(),
  cargo: z.string().optional(),
  itens_ids: z.array(z.string()).optional(),
  bateria_size: z.number().int().positive().optional(),
  threshold: sjtThresholdSchema.optional(),
})

export type TesteAplicavel = z.infer<typeof testeAplicavelSchema>

export const testesAplicaveisSchema = z.array(testeAplicavelSchema)

export type TestesAplicaveis = z.infer<typeof testesAplicaveisSchema>
