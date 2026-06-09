/**
 * `_shared/avaliacao-schemas.ts` — Zod schemas em escopo de import da Edge Function
 * `avaliar-redacao` (Phase 11 — SJT open-case scoring, AVAL-03 / RF-14).
 *
 * `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts` é a fonte canônica
 * dos schemas, MAS `docs/` NÃO é deployado no runtime do Edge Function — alcançá-lo
 * via import relativo em produção é anti-pattern (o bundle do EF só inclui
 * `supabase/functions/`). Por isso `WorkSampleScoringSchema` + suas primitivas
 * dependentes (Citation/Score1to5/BarsLevel/RecommendationEnum/ConfidenceEnum) são
 * COPIADAS VERBATIM para cá, ao lado de analise-schemas.ts (mesma regra, Phase 10).
 *
 * O `overall_score` do schema é 0-100; a EF deriva o composto 0-25 a partir dos
 * scores 1-5 por dimensão (ponderados pela rubric da pergunta) — ver index.ts
 * (Pitfall 2). O body schema da EF NÃO tem campo de score (Pitfall 5: o cliente
 * posta só o texto da resposta; o score é sempre derivado server-side).
 *
 * Pin Zod 3.25.76 (mesmo do ai-client; peer-dep dos helpers structured-output).
 *
 * @see docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts:284-316 (fonte canônica)
 * @see supabase/functions/_shared/analise-schemas.ts (regra de cópia verbatim, Phase 10)
 */

import { z } from "npm:zod@3.25.76";

// ============================================================================
// PRIMITIVES (copiadas verbatim de 00-shared-zod-schemas.ts)
// ============================================================================

export const RecommendationEnum = z.enum([
  "advance", // avançar para próxima etapa
  "hold",    // manter, decidir depois
  "reject",  // rejeitar
]);

export const BarsLevel = z.enum([
  "exemplary",   // 5
  "proficient",  // 4
  "developing",  // 3
  "basic",       // 2
  "inadequate",  // 1
]);

export const ConfidenceEnum = z.enum(["high", "medium", "low", "insufficient_evidence"]);

// Score 1-5 com Insufficient Evidence (Anthropic best practice)
export const Score1to5 = z.union([
  z.number().int().min(1).max(5),
  z.literal("insufficient_evidence"),
]);

// Citação (evidência textual extraída — "Cite Before You Speak")
export const Citation = z.object({
  text: z.string().describe("Trecho LITERAL extraído do input — máximo 200 caracteres"),
  location: z
    .string()
    .optional()
    .describe("Onde foi encontrado (ex: 'Resposta - parágrafo 2')"),
});

// ============================================================================
// USE CASE 7 — WORK SAMPLE / SJT (Open Response) — copiado verbatim
// ============================================================================

export const WorkSampleScoringSchema = z.object({
  scenario_understanding: z.object({
    candidate_understood_scenario: z.boolean(),
    scenario_id: z.string(),
    notes: z.string().optional(),
  }),

  dimension_scores: z.array(z.object({
    dimension: z.string().describe("Dimensão BARS específica do cenário"),

    inclusion_criteria_met: z.array(z.string()).describe("Critérios atendidos"),
    exclusion_criteria_violated: z.array(z.string()).describe("Critérios violados"),

    cited_evidence: z.array(Citation).min(0).max(3),
    reasoning: z.string().min(50).max(800),

    score: Score1to5,
    level: z.union([BarsLevel, z.literal("insufficient_evidence")]),
  })).min(1).max(8),

  overall_score: z.number().int().min(0).max(100),
  recommendation: RecommendationEnum,
  confidence: ConfidenceEnum,

  red_flags: z.array(z.string()).max(5).describe("Sinais críticos negativos (ex: violação ética em case clínico)"),

  bias_audit: z.object({
    used_inclusion_exclusion_criteria: z.boolean(),
    no_demographic_proxies_used: z.boolean(),
  }),
});

export type WorkSampleScoring = z.infer<typeof WorkSampleScoringSchema>;

// ============================================================================
// EDGE FUNCTION BODY SCHEMA
// ============================================================================

/**
 * Body do `avaliar-redacao` (invocado pelo candidato). Aceita SÓ identificadores +
 * o texto da resposta — NUNCA um score (Pitfall 5: o score é derivado server-side).
 * `teste` é o id do teste em `testes_aplicaveis` (ex: 'sjt_caso_aberto'); `resposta`
 * é o texto livre da resposta de caso aberto.
 */
export const AvaliarRedacaoBodySchema = z.object({
  candidatura_id: z.string().min(1),
  teste: z.string().min(1),
  resposta: z.string().min(1),
});

export type AvaliarRedacaoBody = z.infer<typeof AvaliarRedacaoBodySchema>;
