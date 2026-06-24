/**
 * Phase 13 / Plan 13-03 (AVAL-06) — client-side culture-fit essay answer shape (Zod).
 *
 * The candidate's submission carries ONLY identifiers + essay text — NEVER a
 * score. Scoring is server-derived (the `avaliar-redacao-cultural` EF computes the
 * 4-dimension BARS composite + the 3-color triage server-side; the client never
 * sees a verdict — RNF-07a). To enforce that anti-tamper invariant (Pitfall 5,
 * [[feedback_integration_contract_gap]]), the schema uses `.strict()`: an injected
 * `score` / `pontuacao` field makes `.parse` throw instead of silently passing it
 * through.
 *
 * The 200-500-word HARD min/max gate is a UI affordance (`RedacaoCounter` drives
 * submit-disabled); the client never posts a word count or a score. The EF
 * re-validates word_count server-side anyway (defense in depth).
 *
 * This is the EXACT body shape the Plan-02 `avaliar-redacao-cultural` EF body
 * schema (`AvaliarRedacaoCulturalBodySchema`) parses — the client↔EF shared
 * contract pinned by `src/features/avaliacao/__tests__/redacao-contract.test.ts`.
 *
 * @see supabase/functions/_shared/redacao-schemas.ts (the EF-side body schema — the score lives elsewhere, never client)
 * @see src/features/avaliacao/schemas/respostaAvaliacaoSchema.ts (the `.strict()` no-score convention this mirrors)
 * @module features/avaliacao/schemas/redacaoSchema
 */
import { z } from 'zod'

/**
 * Culture-fit essay submission — identifiers + free text for one prompt.
 * `.strict()` rejects any injected `score`/`pontuacao` field (anti-tamper, RNF-07a).
 */
export const respostaRedacaoSchema = z
  .object({
    candidatura_id: z.string().uuid(),
    pergunta_id: z.string().uuid(),
    texto: z.string().min(1, 'Redação obrigatória'),
    // WR-03 — segundos decorridos no editor (RedacaoCronometro). Sinal anti-cheat
    // de tempo (`tempo_anormalmente_curto`, <90s) — NÃO uma nota, então não viola
    // o anti-tamper de `.strict()`. Opcional: a EF cai em 0 se ausente.
    tempo_gasto_segundos: z.number().int().nonnegative().optional(),
  })
  .strict()

export type RespostaRedacao = z.infer<typeof respostaRedacaoSchema>
