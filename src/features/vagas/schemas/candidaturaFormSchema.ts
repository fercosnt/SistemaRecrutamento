/**
 * Phase 4 / CAND-02 — Dynamic Zod schema factory for the candidatura form.
 *
 * Builds a Zod object schema based on the perguntas list fetched from DB.
 * Each pergunta becomes a key in the schema; the value's validator depends
 * on `tipo_resposta` + `obrigatoria` + `limite_caracteres` + `valor_minimo` +
 * `valor_maximo` + `permite_outros`.
 *
 * Source: RESEARCH.md §Dynamic Zod Factory (L1256-1407)
 * Decisions honored: D-14 (vaga sem perguntas valida currículo apenas),
 *                    D-15 (factory dinâmico + permite_outros condicional).
 *
 * Pitfall watch:
 * - D-19 ORDER-LOCK / `optional().default()` produces input/output type
 *   mismatch under @hookform/resolvers v5; consumer (Plan 04-07) MUST cast
 *   `zodResolver(schema) as Resolver<CandidaturaFormData>` (PATTERNS L196-198).
 * - `useMemo` rebuild of schema fires when perguntas reference changes
 *   (RESEARCH L1407) — Plan 04-07 must mount the form ONLY when
 *   `perguntas !== undefined`.
 * - This module does NOT log; pure schema (Pitfall 7 clean by construction).
 *
 * @module features/vagas/schemas/candidaturaFormSchema
 */
import { z, type ZodType } from 'zod'
import type { PerguntaFormulario, TipoResposta } from '../types/vagasTypes'

export type { PerguntaFormulario, TipoResposta }

/**
 * Build a Zod validator for a single pergunta.
 *
 * Returns the appropriate ZodType. If pergunta is not obrigatoria,
 * the validator is wrapped to permit empty/undefined inputs where applicable.
 *
 * Switch on `tipo_resposta` enum (5 branches — exhaustiveness guarded by
 * default branch returning `z.unknown()` per T-04-14).
 */
export function zodForType(p: PerguntaFormulario): ZodType<unknown> {
  let base: ZodType<unknown>

  switch (p.tipo_resposta) {
    case 'texto_curto': {
      let s = z.string().trim()
      if (p.obrigatoria) s = s.min(1, 'Resposta obrigatória')
      if (p.limite_caracteres)
        s = s.max(p.limite_caracteres, `Máximo ${p.limite_caracteres} caracteres`)
      base = s
      break
    }
    case 'texto_longo': {
      let s = z.string().trim()
      if (p.obrigatoria) s = s.min(1, 'Resposta obrigatória')
      if (p.limite_caracteres)
        s = s.max(p.limite_caracteres, `Máximo ${p.limite_caracteres} caracteres`)
      base = s
      break
    }
    case 'numerico': {
      let n = z.coerce.number()
      if (p.valor_minimo != null) n = n.min(p.valor_minimo, `Mínimo ${p.valor_minimo}`)
      if (p.valor_maximo != null) n = n.max(p.valor_maximo, `Máximo ${p.valor_maximo}`)
      base = p.obrigatoria ? n : n.optional().nullable()
      break
    }
    case 'single_choice': {
      const opts = (p.opcoes_resposta as string[] | null) ?? []
      const choiceSchema =
        opts.length > 0
          ? (z.enum(opts as [string, ...string[]]) as ZodType<unknown>)
          : (z.string() as ZodType<unknown>)
      const finalChoice: ZodType<unknown> = p.permite_outros
        ? (z.string().min(1) as ZodType<unknown>)
        : choiceSchema
      base = p.obrigatoria
        ? finalChoice
        : (finalChoice.optional().or(z.literal('')) as ZodType<unknown>)
      break
    }
    case 'multiple_choice': {
      const opts = (p.opcoes_resposta as string[] | null) ?? []
      const itemSchema = p.permite_outros
        ? z.string().min(1)
        : opts.length > 0
          ? z.enum(opts as [string, ...string[]])
          : z.string()
      let arr = z.array(itemSchema)
      if (p.obrigatoria) arr = arr.min(1, 'Selecione pelo menos uma opção')
      base = arr
      break
    }
    default:
      // Exhaustiveness guard — TS will warn if new tipo_resposta added
      base = z.unknown()
  }

  return base
}

/**
 * Build the full candidatura form schema from a list of perguntas.
 *
 * Schema shape:
 *   {
 *     curriculo: { path, name, size },                     // always required
 *     respostas: { [perguntaId]: <type-specific> },
 *     respostas_outros: { [perguntaId]: string },          // only for permite_outros
 *   }
 *
 * D-14: When `perguntas` is empty, `respostas` becomes `z.object({})` —
 * still valid; only `curriculo` is enforced. Plan 04-07 renders sections
 * (1) Resumo + (2) Currículo + (4) Submit only when this happens.
 *
 * 5 MB literal cap (5_242_880 bytes) matches `curriculos` bucket cap from
 * Plan 04-01. Schema-layer enforcement is UX defense; server-side bucket
 * also rejects > 5 MB at upload time.
 */
export function buildCandidaturaSchema(perguntas: PerguntaFormulario[]) {
  const respostasShape: Record<string, ZodType<unknown>> = {}
  const respostasOutrosShape: Record<string, ZodType<unknown>> = {}

  for (const p of perguntas) {
    respostasShape[p.id] = zodForType(p)
    if (p.permite_outros) {
      respostasOutrosShape[p.id] = z
        .string()
        .trim()
        .min(1, 'Especifique')
        .optional()
    }
  }

  return z.object({
    curriculo: z.object(
      {
        path: z.string().min(1, 'Currículo obrigatório'),
        name: z.string().min(1),
        size: z
          .number()
          .int()
          .positive()
          .max(5_242_880, 'Currículo deve ter no máximo 5 MB'),
      },
      {
        required_error: 'Faça o upload do currículo (PDF, máx. 5 MB)',
      }
    ),
    respostas: z.object(respostasShape),
    respostas_outros: z.object(respostasOutrosShape).optional(),
  })
}

export type CandidaturaFormData = z.infer<ReturnType<typeof buildCandidaturaSchema>>
