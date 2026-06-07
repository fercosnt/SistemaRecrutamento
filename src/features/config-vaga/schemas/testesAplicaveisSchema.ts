/**
 * Phase 7 / VAGACFG-01 — `vaga.testes_aplicaveis` Zod schema (RF-11).
 *
 * A list of `{ teste, obrigatorio, customizado, perguntas? }`. The optional
 * `perguntas` pointer is left empty here; the SJT question bank + sync pipeline
 * that populates it is deferred to Phase 11 (D-05).
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-RESEARCH.md §Code Examples
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-05, D-06)
 * @module features/config-vaga/schemas/testesAplicaveisSchema
 */
import { z } from 'zod'

export const testeAplicavelSchema = z.object({
  teste: z.string().min(1, 'Identificador do teste obrigatório'),
  obrigatorio: z.boolean(),
  customizado: z.boolean(),
  // Pointer populated by the F11 SJT bank — left empty in F7 (D-05).
  perguntas: z.array(z.string()).optional(),
})

export type TesteAplicavel = z.infer<typeof testeAplicavelSchema>

export const testesAplicaveisSchema = z.array(testeAplicavelSchema)

export type TestesAplicaveis = z.infer<typeof testesAplicaveisSchema>
