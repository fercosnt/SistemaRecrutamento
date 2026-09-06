// 2026-09-06: tetos de texto x3 — o max do Zod nao e honrado pela geracao estruturada, so recusa
// depois (medido em cv_job_match e comparative_ranking); passam a guarda contra saida degenerada.
/**
 * `_shared/interview-output-schemas.ts` — Zod OUTPUT schemas das duas Edge Functions
 * de entrevista (`gerar-guia-entrevista` → InterviewGuideSchema · `avaliar-transcricao-
 * entrevista` → TranscriptAnalysisSchema), em escopo de import do EF (Phase 14).
 *
 * Phase 14 / Plan 14-03 — ENTREV-01/03/04.
 *
 * `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts` é a fonte canônica
 * dos prompts, MAS:
 *   1. `docs/` NÃO é deployado no runtime do Edge Function — alcançá-lo via import
 *      relativo em produção é anti-pattern (o bundle do EF só inclui
 *      `supabase/functions/`). Por isso `InterviewGuideSchema` + `TranscriptAnalysisSchema`
 *      (e seus primitivos) são COPIADOS verbatim para cá, ao lado dos demais
 *      `_shared/` que as EFs já importam (mesmo padrão de `essay-schemas.ts`, Phase 13).
 *   2. Estes são os schemas de OUTPUT (estruturado da IA) — carregam scores BARS,
 *      bias_flags. São DISTINTOS dos body schemas anti-tamper (`entrevista-schemas.ts`):
 *      o body do cliente nunca carrega score/banda; o OUTPUT da IA carrega.
 *
 * Pin Zod 3.25.76 na entrada **`/v4`** (igual ao essay-schemas / analise-schemas): os
 * helpers das SDKs (@anthropic-ai/sdk + openai) fazem `require("zod/v4")` e leem
 * `.def`; um schema do namespace v3 clássico (`._def`) faz o `zodOutputFormat` do
 * Anthropic estourar "Cannot read properties of undefined (reading 'def')" no call
 * real (Pitfall 3). NÃO trocar por `npm:zod@3.25.76` plano.
 *
 * @see docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts L168-244 (fonte canônica — verbatim)
 * @see supabase/functions/_shared/essay-schemas.ts (precedente do import `/v4` + copy verbatim de docs/)
 * @see supabase/functions/_shared/ai-client.ts (consome via callAi schema arg)
 */

// zod/v4 namespace — load-bearing (ver header). NÃO trocar por `npm:zod@3.25.76` plano.
import { z } from "npm:zod@3.25.76/v4";

// ============================================================================
// PRIMITIVES (verbatim de 00-shared-zod-schemas.ts)
// ============================================================================

export const BarsLevel = z.enum([
  "exemplary", // 5
  "proficient", // 4
  "developing", // 3
  "basic", // 2
  "inadequate", // 1
]);

export const ConfidenceEnum = z.enum(["high", "medium", "low", "insufficient_evidence"]);

export const RecommendationEnum = z.enum(["advance", "hold", "reject"]);

// Score 1-5 com Insufficient Evidence (Anthropic best practice).
export const Score1to5 = z.union([
  z.number().int().min(1).max(5),
  z.literal("insufficient_evidence"),
]);

// Citação (evidência textual extraída — "Cite Before You Speak").
export const Citation = z.object({
  text: z.string().describe("Trecho LITERAL extraído do input — máximo 200 caracteres"),
  location: z.string().optional().describe(
    "Onde foi encontrado (ex: 'CV - Experiência 2'; 'Transcrição - 03:45')",
  ),
});

// ============================================================================
// USE CASE 4 — INTERVIEW GUIDE GENERATION (ENTREV-01/04 — verbatim)
// ============================================================================

export const InterviewQuestionSchema = z.object({
  type: z.enum(["star", "pei", "situational", "technical_probe", "follow_up"]),
  competency: z.string().describe("Competência crítica que esta pergunta avalia"),
  question: z.string().min(20).max(1200).describe("Pergunta principal"),
  rationale: z.string().min(20).max(900).describe("Por que esta pergunta para este candidato"),

  bars_anchors: z
    .array(
      z.object({
        level: BarsLevel,
        score: z.number().int().min(1).max(5),
        description: z.string().min(40).max(1200).describe("Comportamento observável neste nível"),
      }),
    )
    .length(5)
    .describe("5 âncoras BARS — uma por nível"),

  follow_up_probes: z.array(z.string()).min(2).max(5).describe("Perguntas de aprofundamento (probing)"),

  red_flags: z.array(z.string()).min(0).max(3).describe("Sinais de alerta nas respostas"),
  green_flags: z.array(z.string()).min(0).max(3).describe("Sinais positivos esperados"),
});

export const InterviewGuideSchema = z.object({
  candidate_id: z.string(),
  job_title: z.string(),
  duration_minutes: z.number().int().min(15).max(90),
  format: z.enum(["online", "presencial", "hibrido"]),

  introduction: z.string().min(50).max(1500).describe("Script de abertura"),

  questions: z.array(InterviewQuestionSchema).min(5).max(7),

  closing: z
    .string()
    .min(50)
    .max(1500)
    .describe("Script de encerramento + espaço para perguntas do candidato"),

  scoring_instructions: z
    .string()
    .describe("Como o entrevistador deve registrar scores BARS após a entrevista"),
});

export type InterviewGuide = z.infer<typeof InterviewGuideSchema>;

// ============================================================================
// USE CASE 5 — INTERVIEW TRANSCRIPT ANALYSIS (ENTREV-03 — verbatim)
// ============================================================================

export const TranscriptAnalysisSchema = z.object({
  preprocessing: z.object({
    disfluencies_normalized: z.boolean(),
    accent_corrections_applied: z.boolean(),
    correction_count: z.number().int().min(0),
    notes: z.string().optional(),
  }),

  competency_evaluations: z
    .array(
      z.object({
        competency: z.string(),

        // "Cite Before You Speak" — extrai trecho ANTES de julgar.
        cited_evidence: z
          .array(Citation)
          .min(0)
          .max(3)
          .describe("Trechos LITERAIS que suportam a avaliação"),

        reasoning: z
          .string()
          .min(50)
          .max(2400)
          .describe("Análise step-by-step DEPOIS de extrair evidência"),

        score: Score1to5,
        level: z.union([BarsLevel, z.literal("insufficient_evidence")]),

        bias_flags: z.object({
          content_dependent_only: z.boolean().describe("Score baseado APENAS no conteúdo, não na forma oral"),
          regional_markers_ignored: z.boolean().describe("Ignorou regionalismos como neutros"),
          disfluencies_ignored: z.boolean().describe("Ignorou hesitações/gagueira"),
        }),
      }),
    )
    .min(1)
    .max(8),

  overall_summary: z.string().min(50).max(2400),
  recommendation: RecommendationEnum,
  confidence: ConfidenceEnum,

  insufficient_evidence_dimensions: z
    .array(z.string())
    .describe("Competências sem evidência suficiente — pedir nova entrevista"),
});

export type TranscriptAnalysis = z.infer<typeof TranscriptAnalysisSchema>;
