/**
 * Phase 11 / AVAL-02·AVAL-03 — client-side SJT answer shape (Zod).
 *
 * The candidate's submission carries ONLY answer identifiers / text — never a
 * score. Scoring is server-derived (the `pontuar_sjt` RPC for MC, the
 * `avaliar-redacao` EF for the open case). To enforce that anti-tamper invariant
 * (Pitfall 5), both member schemas use `.strict()`: an injected `score` /
 * `pontuacao` field makes `.parse` throw instead of silently passing it through.
 *
 *  - MC          → `{ tipo: 'mc', respostas: { pergunta_id, opcao_id }[] }`
 *  - open case   → `{ tipo: 'caso_aberto', pergunta_id, texto }`
 *
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-PATTERNS.md §respostaAvaliacaoSchema
 * @see supabase/functions/_shared/avaliacao-schemas.ts (server-side scoring schema — the score lives there, never client)
 * @module features/avaliacao/schemas/respostaAvaliacaoSchema
 */
import { z } from 'zod'

/** A single MC pick: which option was marked for which question. No weight/score. */
export const respostaMcItemSchema = z
  .object({
    pergunta_id: z.string().uuid(),
    opcao_id: z.string().uuid(),
  })
  .strict()

export type RespostaMcItem = z.infer<typeof respostaMcItemSchema>

/** SJT multiple-choice submission — a list of option picks. */
export const respostaMcSchema = z
  .object({
    tipo: z.literal('mc'),
    respostas: z.array(respostaMcItemSchema),
  })
  .strict()

export type RespostaMc = z.infer<typeof respostaMcSchema>

/** SJT open-case submission — free text for one scenario question. */
export const respostaCasoAbertoSchema = z
  .object({
    tipo: z.literal('caso_aberto'),
    pergunta_id: z.string().uuid(),
    texto: z.string().min(1, 'Resposta obrigatória'),
  })
  .strict()

export type RespostaCasoAberto = z.infer<typeof respostaCasoAbertoSchema>

/**
 * Discriminated union of the two SJT answer shapes. The client never submits a
 * score — `.strict()` on both members rejects any `score`/`pontuacao` field.
 */
export const respostaAvaliacaoSchema = z.discriminatedUnion('tipo', [
  respostaMcSchema,
  respostaCasoAbertoSchema,
])

export type RespostaAvaliacao = z.infer<typeof respostaAvaliacaoSchema>
