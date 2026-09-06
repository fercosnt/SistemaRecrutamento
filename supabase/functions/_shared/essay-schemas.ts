/**
 * `_shared/essay-schemas.ts` — Zod schema em escopo de import da Edge Function
 * de redação cultural (Phase 13).
 *
 * Phase 13 / Plan 13-01 — AVAL-06.
 *
 * `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts` é a fonte canônica
 * dos prompts, MAS:
 *   1. `docs/` NÃO é deployado no runtime do Edge Function — alcançá-lo via import
 *      relativo em produção é anti-pattern (o bundle do EF só inclui
 *      `supabase/functions/`). Por isso `EssayScoringV1Schema` é COPIADO verbatim
 *      para cá, ao lado dos demais `_shared/` que as EFs já importam.
 *   2. O `CultureFitEssaySchema` canônico DERIVOU da PRD (Pitfall 7): ele tem
 *      `dimension: z.string()` (não enum), `1..6` dimensões (não `.length(4)`),
 *      `style_neutralized_in_scoring: z.boolean()` (não `z.literal(true)`) e
 *      NÃO TEM `red_flag_etico`. A PRD `docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md`
 *      §8.4 é a fonte BINDING — este arquivo a transcreve verbatim.
 *
 * As 4 dimensões D1-D4 mapeiam os 4 valores Beauty Smile (Experiência UAU,
 * Inovação, Atitude de Dono, Sede de Crescimento); `red_flag_etico` é o princípio
 * fundante (Ética) acima das 4 — explícito no output, load-bearing para o cap.
 *
 * Pin Zod 3.25.76 na entrada **`/v4`** (igual ao ai-client / analise-schemas): os
 * helpers das SDKs (@anthropic-ai/sdk + openai) fazem `require("zod/v4")` e leem
 * `.def`; um schema do namespace v3 clássico (`._def`) faz o `zodOutputFormat` do
 * Anthropic estourar "Cannot read properties of undefined (reading 'def')" no
 * call real. NÃO copiar a linha v3 plana do `avaliacao-schemas.ts` (SJT, Phase 11).
 *
 * @see docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md §8.4 (fonte BINDING — verbatim)
 * @see supabase/functions/_shared/analise-schemas.ts (precedente do import `/v4`)
 * @see supabase/functions/_shared/ai-client.ts (consome via callAi schema arg)
 */

// zod/v4 namespace — load-bearing (ver header). NÃO trocar por `npm:zod@3.25.76` plano.
import { z } from "npm:zod@3.25.76/v4";

// ============================================================================
// DIMENSION SCORE (PRD §8.4 — verbatim)
// ============================================================================

export const DimensionScoreSchema = z.object({
  dimension: z.enum(["D1", "D2", "D3", "D4"]),
  dimension_name: z.string(), // 'especificidade', 'acao', 'aprendizado', 'alinhamento_valores'
  cited_evidence: z.array(z.object({
    text: z.string().min(1),
    location: z.string(), // 'Parágrafo 2', 'Frase final', etc
  })).max(2),
  reasoning: z.string().min(20),
  score: z.union([z.number().int().min(1).max(5), z.literal("insufficient_evidence")]),
  level: z.enum([
    "exemplary",
    "proficient",
    "developing",
    "basic",
    "inadequate",
    "insufficient_evidence",
  ]),
});

// ============================================================================
// ESSAY SCORING V1 (PRD §8.4 — verbatim)
// ============================================================================

export const EssayScoringV1Schema = z.object({
  preprocessing_check: z.object({
    word_count: z.number().int(),
    detected_writing_style: z.enum(["formal", "informal", "mixed", "outro"]),
    style_neutralized_in_scoring: z.literal(true),
  }),
  dimension_scores: z.array(DimensionScoreSchema).length(4),
  overall_score: z.number().min(0).max(100), // calculado pela IA, server recalcula
  qualitative_summary: z.string().min(50).max(2000).describe("Resumo qualitativo. Seja objetivo: até ~400 caracteres."), // 2026-09-06: 500 → 2000 (o max do Zod só recusa depois; o Sonnet estourava)
  recommendation: z.enum(["strong_fit", "good_fit", "neutral", "weak_fit", "misfit"]),
  red_flag_etico: z.boolean(), // explícito no output, não derivado — load-bearing para o cap
  bias_audit: z.object({
    formality_did_not_affect_score: z.boolean(),
    regional_markers_treated_as_neutral: z.boolean(),
    grammar_errors_did_not_affect_content_score: z.boolean(),
  }),
});

export type EssayScoringV1 = z.infer<typeof EssayScoringV1Schema>;
