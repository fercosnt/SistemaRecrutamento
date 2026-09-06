/**
 * `_shared/analise-schemas.ts` — Zod schemas em escopo de import das Edge Functions
 * de triagem (Phase 10).
 *
 * Phase 10 / Plan 10-03 — TRIAGEM-01 / TRIAGEM-03.
 *
 * `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts` é a fonte canônica
 * dos schemas, MAS `docs/` NÃO é deployado no runtime do Edge Function — alcançá-lo
 * via import relativo em produção é anti-pattern (o bundle do EF só inclui
 * `supabase/functions/`). Por isso `CvJobMatchSchema` + `ComparativeRankingSchema`
 * (e suas primitivas dependentes) são COPIADOS verbatim para cá, ao lado dos demais
 * `_shared/` que as EFs já importam (ai-client/prompt-loader/audit-logger).
 *
 * As chaves dos schemas são em INGLÊS (`match_score`/`strengths`/`gaps`/
 * `ranked_candidates`); as Edge Functions mapeiam para as colunas pt-BR de
 * `analise_candidato_vaga` / `comparativo_solicitado` na hora de persistir.
 *
 * Pin Zod 3.25.76 (mesmo do ai-client; peer-dep dos helpers structured-output).
 *
 * @see docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts (fonte canônica)
 * @see supabase/functions/_shared/ai-client.ts (consome via callAi schema arg)
 */

// zod/v4 namespace — os helpers das SDKs (@anthropic-ai/sdk + openai) fazem `require("zod/v4")`
// e leem `.def`; um schema do namespace v3 clássico (`._def`) faz o zodOutputFormat do Anthropic
// estourar "Cannot read properties of undefined (reading 'def')". zod@3.25.76 traz ambos.
import { z } from "npm:zod@3.25.76/v4";

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
    .nullable()
    .optional()
    .describe("Onde foi encontrado (ex: 'CV - Experiência 2'; 'Transcrição - 03:45')"),
});

// ============================================================================
// BARS DIMENSION (dependência de CvJobMatch.competency_scores)
// ============================================================================

export const BarsDimension = z.object({
  name: z.string().describe("Nome da competência/dimensão"),
  score: Score1to5,
  level: z.union([BarsLevel, z.literal("insufficient_evidence")]),
  // 2026-09-05: 500 → 1200. Ver o comentário em CvJobMatchSchema.reasoning.
  reasoning: z.string().min(20).max(1200).describe("Análise ANTES do score (CoT)"),
  citations: z.array(Citation).max(3).describe("Evidências literais extraídas do input"),
});

// ============================================================================
// USE CASE 2 — CV × JOB MATCH (TRIAGEM-01)
// Chaves INGLESAS — mapeadas para colunas pt-BR pela analise-candidato-individual.
// ============================================================================

export const CvJobMatchSchema = z.object({
  // ⚠ 2026-09-05: 1500 → 4000. Com max_tokens=4096 e teto de 90 s, o Sonnet finalmente
  //   devolveu o JSON INTEIRO — e o Zod recusou: `too_big, maximum: 1500` neste campo.
  //   A rubrica manda raciocinar competência a competência ANTES de pontuar; 1500
  //   caracteres não cabem cinco competências. A recusa virava
  //   `anthropic_retries_exhausted` e caía no gpt-4o-mini, que passa porque escreve
  //   pouco. O teto existe contra saída degenerada, não contra saída completa.
  reasoning: z.string().min(50).max(4000).describe("Análise step-by-step ANTES do score (CoT)"),

  strengths: z
    .array(
      z.object({
        competency: z.string(),
        evidence: Citation,
        impact: z.enum(["high", "medium", "low"]),
      }),
    )
    .min(0)
    .max(5),

  gaps: z
    .array(
      z.object({
        requirement: z.string(),
        severity: z.enum(["critical", "important", "nice_to_have"]),
        note: z.string().describe("Por que é gap — pode ser ausência total ou parcial"),
      }),
    )
    .min(0)
    .max(5),

  competency_scores: z.array(BarsDimension).describe("Score por competência crítica da vaga"),

  match_score: z.number().int().min(0).max(100).describe("Score composto 0-100"),
  recommendation: RecommendationEnum,
  confidence: ConfidenceEnum,

  bias_check: z.object({
    used_only_merit_evidence: z.boolean(),
    notes: z.string().nullable().optional(),
  }),
});

export type CvJobMatch = z.infer<typeof CvJobMatchSchema>;

// ============================================================================
// USE CASE 3 — COMPARATIVE RANKING (TRIAGEM-03)
// ============================================================================

export const ComparativeRankingSchema = z.object({
  reasoning: z.string().min(100).max(2000).describe("Análise comparativa ANTES do ranking"),

  ranked_candidates: z
    .array(
      z.object({
        candidate_id: z.string().describe("ID anonimizado do candidato (ex: 'C1', 'C2')"),
        rank: z.number().int().min(1),
        composite_score: z.number().int().min(0).max(100),
        relative_strengths: z.array(z.string()).max(3).describe("Pontos fortes vs OUTROS candidatos"),
        relative_weaknesses: z.array(z.string()).max(3),
        rationale: z.string().min(30).max(500).describe("Por que está nesta posição vs vizinhos"),
      }),
    )
    .min(2)
    .max(10),

  recommendation: z.object({
    top_choice: z.string().describe("ID do candidato recomendado"),
    backup_choice: z.string().nullable(),
    note: z.string().describe("Justificativa da recomendação geral"),
  }),

  ties_or_concerns: z.array(z.string()).max(5).describe("Empates significativos ou red flags"),

  bias_audit: z.object({
    counterfactual_check_run: z.boolean(),
    score_variance_within_threshold: z.boolean(),
    notes: z.string().nullable().optional(),
  }),
});

export type ComparativeRanking = z.infer<typeof ComparativeRankingSchema>;

// ============================================================================
// EDGE FUNCTION BODY SCHEMAS
// ============================================================================

/**
 * Body do `analise-candidato-individual` (disparado pelo trigger pg_net).
 * `min(1)` em vez de `.uuid()` — em produção o trigger sempre envia UUIDs reais,
 * mas validamos só a presença de strings não-vazias para não acoplar a EF ao
 * formato exato do id (e manter as fixtures de teste como `c1`/`v1`).
 */
export const AnaliseBodySchema = z.object({
  candidatura_id: z.string().min(1),
  vaga_id: z.string().min(1),
});

export type AnaliseBody = z.infer<typeof AnaliseBodySchema>;

/** Body do `comparativo-candidatos` (invocado pelo RH). */
export const ComparativoBodySchema = z.object({
  vaga_id: z.string().min(1),
  candidatura_ids: z.array(z.string().min(1)),
});

export type ComparativoBody = z.infer<typeof ComparativoBodySchema>;
