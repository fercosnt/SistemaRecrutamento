/**
 * Shared Zod schemas for ATS Prompt Library
 *
 * Compartilhado entre os 7 usos. Importar nos arquivos de cada Edge Function.
 *
 * Padrão: Zod 3.22+ | Anthropic SDK 0.52+ | OpenAI SDK 4.104+
 * Ambiente: Supabase Edge Functions (Deno)
 */

import { z } from "npm:zod@3.22.0";

// ============================================================================
// PRIMITIVES
// ============================================================================

export const RecommendationEnum = z.enum([
  "advance",      // avançar para próxima etapa
  "hold",         // manter, decidir depois
  "reject",       // rejeitar
]);

export const BarsLevel = z.enum([
  "exemplary",    // 5
  "proficient",   // 4
  "developing",   // 3
  "basic",        // 2
  "inadequate",   // 1
]);

export const ConfidenceEnum = z.enum(["high", "medium", "low", "insufficient_evidence"]);

// Score 1-5 com Insufficient Evidence (Anthropic best practice)
export const Score1to5 = z.union([
  z.number().int().min(1).max(5),
  z.literal("insufficient_evidence"),
]);

// Score 0-100 com Insufficient Evidence
export const Score0to100 = z.union([
  z.number().int().min(0).max(100),
  z.literal("insufficient_evidence"),
]);

// Citação (evidência textual extraída — "Cite Before You Speak")
export const Citation = z.object({
  text: z.string().describe("Trecho LITERAL extraído do input — máximo 200 caracteres"),
  location: z.string().optional().describe("Onde foi encontrado (ex: 'CV - Experiência 2'; 'Transcrição - 03:45')"),
});

// Bias flags — proxy demográficos detectados
export const BiasFlags = z.object({
  has_demographic_proxy: z.boolean().describe("Detectou nome, gênero, idade, raça que poderia influenciar"),
  has_regional_marker: z.boolean().describe("Detectou regionalismo/sotaque (NE, SP, RS) no input"),
  has_disfluency_only: z.boolean().describe("Hesitações/gagueira são únicos sinais negativos (artefato)"),
  notes: z.string().optional().describe("Notas adicionais sobre bias detectado"),
});

// ============================================================================
// COMMON DIMENSIONS (BARS)
// ============================================================================

export const BarsDimension = z.object({
  name: z.string().describe("Nome da competência/dimensão"),
  score: Score1to5,
  level: z.union([BarsLevel, z.literal("insufficient_evidence")]),
  reasoning: z.string().min(20).max(500).describe("Análise ANTES do score (CoT)"),
  citations: z.array(Citation).max(3).describe("Evidências literais extraídas do input"),
});

// ============================================================================
// USE CASE 1 — CV SUMMARY
// ============================================================================

export const CvSummarySchema = z.object({
  professional_overview: z.string().min(100).max(800).describe("1° parágrafo: senioridade, área, tempo total"),
  experience_summary: z.string().min(100).max(800).describe("2° parágrafo: experiências relevantes para a vaga"),
  education_and_skills: z.string().min(100).max(800).describe("3° parágrafo: formação + skills core relevantes"),
  alignment_with_role: z.string().min(50).max(500).describe("4° parágrafo: alinhamento com a vaga (se vaga foi fornecida)"),

  extracted_data: z.object({
    years_of_experience: z.number().int().min(0).max(60),
    seniority_level: z.enum(["junior", "pleno", "senior", "specialist", "lead", "manager", "director", "c_level", "unknown"]),
    education_level: z.enum(["fundamental", "medio", "tecnico", "superior_incompleto", "superior_completo", "pos_lato", "mestrado", "doutorado", "unknown"]),
    languages: z.array(z.object({
      language: z.string(),
      level: z.enum(["basic", "intermediate", "advanced", "fluent", "native"]),
    })).max(10),
    core_skills: z.array(z.string()).max(20).describe("Skills técnicos mais relevantes — máximo 20"),
  }),

  bias_flags: BiasFlags,
});

export type CvSummary = z.infer<typeof CvSummarySchema>;

// ============================================================================
// USE CASE 2 — CV × JOB MATCH
// ============================================================================

export const CvJobMatchSchema = z.object({
  reasoning: z.string().min(50).max(1500).describe("Análise step-by-step ANTES do score (CoT)"),

  strengths: z.array(z.object({
    competency: z.string(),
    evidence: Citation,
    impact: z.enum(["high", "medium", "low"]),
  })).min(0).max(5),

  gaps: z.array(z.object({
    requirement: z.string(),
    severity: z.enum(["critical", "important", "nice_to_have"]),
    note: z.string().describe("Por que é gap — pode ser ausência total ou parcial"),
  })).min(0).max(5),

  competency_scores: z.array(BarsDimension).describe("Score por competência crítica da vaga"),

  match_score: z.number().int().min(0).max(100).describe("Score composto 0-100"),
  recommendation: RecommendationEnum,
  confidence: ConfidenceEnum,

  bias_check: z.object({
    used_only_merit_evidence: z.boolean(),
    notes: z.string().optional(),
  }),
});

export type CvJobMatch = z.infer<typeof CvJobMatchSchema>;

// ============================================================================
// USE CASE 3 — COMPARATIVE RANKING
// ============================================================================

export const ComparativeRankingSchema = z.object({
  reasoning: z.string().min(100).max(2000).describe("Análise comparativa ANTES do ranking"),

  ranked_candidates: z.array(z.object({
    candidate_id: z.string().describe("ID anonimizado do candidato (ex: 'C1', 'C2')"),
    rank: z.number().int().min(1),
    composite_score: z.number().int().min(0).max(100),
    relative_strengths: z.array(z.string()).max(3).describe("Pontos fortes vs OUTROS candidatos"),
    relative_weaknesses: z.array(z.string()).max(3),
    rationale: z.string().min(30).max(500).describe("Por que está nesta posição vs vizinhos"),
  })).min(2).max(10),

  recommendation: z.object({
    top_choice: z.string().describe("ID do candidato recomendado"),
    backup_choice: z.string().nullable(),
    note: z.string().describe("Justificativa da recomendação geral"),
  }),

  ties_or_concerns: z.array(z.string()).max(5).describe("Empates significativos ou red flags"),

  bias_audit: z.object({
    counterfactual_check_run: z.boolean(),
    score_variance_within_threshold: z.boolean(),
    notes: z.string().optional(),
  }),
});

export type ComparativeRanking = z.infer<typeof ComparativeRankingSchema>;

// ============================================================================
// USE CASE 4 — INTERVIEW GUIDE GENERATION
// ============================================================================

export const InterviewQuestionSchema = z.object({
  type: z.enum(["star", "pei", "situational", "technical_probe", "follow_up"]),
  competency: z.string().describe("Competência crítica que esta pergunta avalia"),
  question: z.string().min(20).max(400).describe("Pergunta principal"),
  rationale: z.string().min(20).max(300).describe("Por que esta pergunta para este candidato"),

  bars_anchors: z.array(z.object({
    level: BarsLevel,
    score: z.number().int().min(1).max(5),
    description: z.string().min(40).max(400).describe("Comportamento observável neste nível"),
  })).length(5).describe("5 âncoras BARS — uma por nível"),

  follow_up_probes: z.array(z.string()).min(2).max(5).describe("Perguntas de aprofundamento (probing)"),

  red_flags: z.array(z.string()).min(0).max(3).describe("Sinais de alerta nas respostas"),
  green_flags: z.array(z.string()).min(0).max(3).describe("Sinais positivos esperados"),
});

export const InterviewGuideSchema = z.object({
  candidate_id: z.string(),
  job_title: z.string(),
  duration_minutes: z.number().int().min(15).max(90),
  format: z.enum(["online", "presencial", "hibrido"]),

  introduction: z.string().min(50).max(500).describe("Script de abertura"),

  questions: z.array(InterviewQuestionSchema).min(5).max(7),

  closing: z.string().min(50).max(500).describe("Script de encerramento + espaço para perguntas do candidato"),

  scoring_instructions: z.string().describe("Como o entrevistador deve registrar scores BARS após a entrevista"),
});

export type InterviewGuide = z.infer<typeof InterviewGuideSchema>;

// ============================================================================
// USE CASE 5 — INTERVIEW TRANSCRIPT ANALYSIS
// ============================================================================

export const TranscriptAnalysisSchema = z.object({
  preprocessing: z.object({
    disfluencies_normalized: z.boolean(),
    accent_corrections_applied: z.boolean(),
    correction_count: z.number().int().min(0),
    notes: z.string().optional(),
  }),

  competency_evaluations: z.array(z.object({
    competency: z.string(),

    // "Cite Before You Speak" — extrai trecho ANTES de julgar
    cited_evidence: z.array(Citation).min(0).max(3).describe("Trechos LITERAIS que suportam a avaliação"),

    reasoning: z.string().min(50).max(800).describe("Análise step-by-step DEPOIS de extrair evidência"),

    score: Score1to5,
    level: z.union([BarsLevel, z.literal("insufficient_evidence")]),

    bias_flags: z.object({
      content_dependent_only: z.boolean().describe("Score baseado APENAS no conteúdo, não na forma oral"),
      regional_markers_ignored: z.boolean().describe("Ignorou regionalismos como neutros"),
      disfluencies_ignored: z.boolean().describe("Ignorou hesitações/gagueira"),
    }),
  })).min(1).max(8),

  overall_summary: z.string().min(50).max(800),
  recommendation: RecommendationEnum,
  confidence: ConfidenceEnum,

  insufficient_evidence_dimensions: z.array(z.string()).describe("Competências sem evidência suficiente — pedir nova entrevista"),
});

export type TranscriptAnalysis = z.infer<typeof TranscriptAnalysisSchema>;

// ============================================================================
// USE CASE 6 — CULTURE FIT ESSAY EVALUATION
// ============================================================================

export const CultureFitEssaySchema = z.object({
  preprocessing_check: z.object({
    word_count: z.number().int().min(0),
    detected_writing_style: z.enum(["formal", "informal", "mixed", "regional"]),
    style_neutralized_in_scoring: z.boolean().describe("Estilo NÃO afetou score — apenas conteúdo"),
  }),

  dimension_scores: z.array(z.object({
    dimension: z.string().describe("Dimensão cultural avaliada (ex: ownership, autonomia)"),

    cited_evidence: z.array(Citation).min(0).max(2),
    reasoning: z.string().min(40).max(500).describe("Análise antes do score"),

    score: Score1to5,
    level: z.union([BarsLevel, z.literal("insufficient_evidence")]),
  })).min(1).max(6),

  overall_score: z.number().int().min(0).max(100),
  qualitative_summary: z.string().min(100).max(800),
  recommendation: z.enum(["strong_fit", "good_fit", "neutral", "weak_fit", "misfit"]),

  bias_audit: z.object({
    formality_did_not_affect_score: z.boolean(),
    regional_markers_treated_as_neutral: z.boolean(),
    grammar_errors_did_not_affect_content_score: z.boolean(),
  }),
});

export type CultureFitEssay = z.infer<typeof CultureFitEssaySchema>;

// ============================================================================
// USE CASE 7 — WORK SAMPLE / SJT (Open Response)
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
// SHARED HELPERS
// ============================================================================

/**
 * Versão atual de cada prompt — usado para logging e versioning.
 * Bump SemVer ao mudar prompts:
 * - MAJOR: muda critério avaliativo OU schema Zod (incompatível)
 * - MINOR: novos exemplos few-shot OU expansão de contexto
 * - PATCH: typo, reformulação sem mudança semântica
 *
 * NOTA: este const é fallback / referência apenas. Em runtime, Edge Functions
 * consultam a tabela `prompt_versions` no Postgres (Híbrido git→DB) — ver
 * PRD-ai-prompt-library-m2.md.
 */
export const PROMPT_VERSIONS = {
  cv_summary: "1.0.0",
  cv_job_match: "1.0.0",
  comparative_ranking: "1.0.0",
  interview_guide: "1.0.0",
  transcript_analysis: "1.0.0",
  culture_fit_essay: "1.0.0",
  work_sample_sjt: "1.0.0",
} as const;

/**
 * Versão de cada Zod schema — independente do SemVer do prompt.
 * Permite deploy assíncrono de prompt vs Edge Function (compat matrix).
 *
 * Bump regras:
 * - MAJOR: campo removido/renomeado, tipo de campo muda (incompatível)
 * - MINOR: campo opcional adicionado (compatível com consumers antigos)
 * - PATCH: refinamento de constraints (min/max, regex) sem mudar formato
 *
 * Edge Function valida na startup que prompt.schema_version_required
 * matches este const; mismatch = fail-fast (ver RF-PL-13 do mini-PRD).
 */
export const CV_SUMMARY_SCHEMA_VERSION         = "1.0.0";
export const CV_JOB_MATCH_SCHEMA_VERSION       = "1.0.0";
export const COMPARATIVE_RANKING_SCHEMA_VERSION = "1.0.0";
export const INTERVIEW_GUIDE_SCHEMA_VERSION    = "1.0.0";
export const TRANSCRIPT_ANALYSIS_SCHEMA_VERSION = "1.0.0";
export const CULTURE_FIT_ESSAY_SCHEMA_VERSION  = "1.0.0";
export const WORK_SAMPLE_SJT_SCHEMA_VERSION    = "1.0.0";

export const SCHEMA_VERSIONS = {
  cv_summary: CV_SUMMARY_SCHEMA_VERSION,
  cv_job_match: CV_JOB_MATCH_SCHEMA_VERSION,
  comparative_ranking: COMPARATIVE_RANKING_SCHEMA_VERSION,
  interview_guide: INTERVIEW_GUIDE_SCHEMA_VERSION,
  transcript_analysis: TRANSCRIPT_ANALYSIS_SCHEMA_VERSION,
  culture_fit_essay: CULTURE_FIT_ESSAY_SCHEMA_VERSION,
  work_sample_sjt: WORK_SAMPLE_SJT_SCHEMA_VERSION,
} as const;
