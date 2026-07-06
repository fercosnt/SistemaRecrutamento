/**
 * Phase 23 / Plan 23-02 Task 1 — AI-01 regression guard for `SCHEMA_VERSIONS`.
 *
 * O bug central da Phase 23 (AI-01): `SCHEMA_VERSIONS` conhecia 5 chaves
 * FICTÍCIAS de Fase 9 (sjt_evaluation, interview_questions, interview_summary,
 * reference_check, final_recommendation) que NUNCA existiram no enum
 * `public.llm_call_type`, nem em template, nem em EF. Consequência: 5 dos 7
 * call_types que as EFs de IA passam a `loadPrompt` caíam num `SchemaVersionMismatchError`
 * que o `catch {}` mudo degradava para um prompt-stub de 1 linha persistido como
 * avaliação oficial (`prompt_version: "0.0.0"`).
 *
 * Este sweep-test trava a regressão pelos DOIS lados:
 *   (a) todo call_type que uma EF passa a `loadPrompt` DEVE estar em SCHEMA_VERSIONS;
 *   (b) nenhuma das 5 chaves órfãs pode reaparecer.
 *
 * `bigfive_devolutiva` é a exceção profunda — a chave já vive aqui (Plan 23-02),
 * mas o enum só ganha o valor no Plan 23-05 (ALTER TYPE ADD VALUE). Até lá a EF
 * 500a por design (alarme honesto). O sweep guarda a CHAVE, não o estado do enum.
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *      supabase/functions/_shared/__tests__/prompt-loader.test.ts
 *
 * @see supabase/functions/_shared/prompt-loader.ts (SCHEMA_VERSIONS)
 * @see .planning/phases/23-ressurrei-o-da-stack-de-ia/23-RESEARCH.md §AI-01 (call_type map)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { SCHEMA_VERSIONS } from "../prompt-loader.ts";

// ── call_types que as 7 EFs de IA passam a loadPrompt (fonte: 23-RESEARCH tabela) ──
// analise-candidato-individual=cv_job_match · comparativo-candidatos=comparative_ranking
// avaliar-redacao=work_sample_sjt · avaliar-redacao-cultural=culture_fit_essay
// avaliar-transcricao-entrevista=transcript_analysis · gerar-guia-entrevista=interview_guide
// gerar-devolutiva-bigfive=bigfive_devolutiva
const EF_CALL_TYPES = [
  "cv_job_match",
  "comparative_ranking",
  "work_sample_sjt",
  "culture_fit_essay",
  "transcript_analysis",
  "interview_guide",
  "bigfive_devolutiva",
] as const;

// ── As 5 chaves ÓRFÃS de Fase 9 que NUNCA podem reaparecer (não existem no enum) ──
const ORPHAN_KEYS = [
  "sjt_evaluation",
  "interview_questions",
  "interview_summary",
  "reference_check",
  "final_recommendation",
] as const;

Deno.test("AI-01 sweep — todo call_type que uma EF passa está em SCHEMA_VERSIONS", () => {
  for (const ct of EF_CALL_TYPES) {
    assert(
      Object.prototype.hasOwnProperty.call(SCHEMA_VERSIONS, ct),
      `call_type '${ct}' passado por uma EF NÃO está em SCHEMA_VERSIONS — ` +
        `loadPrompt cairia em SchemaVersionMismatch → stub 0.0.0 (bug AI-01)`,
    );
    // toda versão conhecida é "1.0.0" (espelha o template seedado)
    assertEquals(SCHEMA_VERSIONS[ct], "1.0.0", `SCHEMA_VERSIONS['${ct}'] deveria ser '1.0.0'`);
  }
});

Deno.test("AI-01 sweep — nenhuma das 5 chaves órfãs de Fase 9 sobrevive", () => {
  for (const orphan of ORPHAN_KEYS) {
    assert(
      !Object.prototype.hasOwnProperty.call(SCHEMA_VERSIONS, orphan),
      `chave órfã '${orphan}' NÃO deveria existir em SCHEMA_VERSIONS ` +
        `(não está no enum llm_call_type — regressão do bug AI-01)`,
    );
  }
});

Deno.test("AI-01 sweep — SCHEMA_VERSIONS espelha exatamente o enum (8 chaves, sem extras)", () => {
  // O enum llm_call_type tem 7 valores; + bigfive_devolutiva (Plan 23-05) = 8 chaves.
  const expected = new Set<string>([
    "cv_summary", // real/seedado, sem EF consumidora (espelha o enum)
    "cv_job_match",
    "comparative_ranking",
    "interview_guide",
    "transcript_analysis",
    "culture_fit_essay",
    "work_sample_sjt",
    "bigfive_devolutiva",
  ]);
  const actual = new Set(Object.keys(SCHEMA_VERSIONS));
  assertEquals(actual, expected, "SCHEMA_VERSIONS deve espelhar o enum + bigfive_devolutiva");
});
