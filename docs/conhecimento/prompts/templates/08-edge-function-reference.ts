/**
 * Edge Function de Referência para Supabase + Anthropic Claude
 *
 * Este é o pattern PRODUCTION-READY para qualquer um dos 7 usos do ATS.
 * Inclui: structured output (Zod), prompt caching, retry, circuit breaker,
 * idempotency, logging LGPD-compliant, prompt injection detection.
 *
 * Para usar: copie este arquivo, ajuste imports do schema específico,
 * e o template de prompt do uso desejado.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.52.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.52.0/helpers/zod";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.0";

// Schemas compartilhados
import {
  CvJobMatchSchema,
  type CvJobMatch,
  PROMPT_VERSIONS,
} from "./00-shared-zod-schemas.ts";

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
  maxRetries: 3,        // SDK retry automático em 429/529
  timeout: 30_000,
});

const CALL_TYPE = "cv_job_match";  // Ajustar para o uso específico
const MODEL_ID = "claude-sonnet-4-6";

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  private readonly THRESHOLD = 5;
  private readonly RESET_MS = 60_000;

  canRequest(): boolean {
    if (this.openedAt !== null) {
      if (Date.now() - this.openedAt > this.RESET_MS) {
        this.failures = 0;
        this.openedAt = null;
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess() { this.failures = 0; }

  recordFailure() {
    this.failures++;
    if (this.failures >= this.THRESHOLD) {
      this.openedAt = Date.now();
      console.error(`[CircuitBreaker] OPEN após ${this.failures} falhas`);
    }
  }
}

const anthropicBreaker = new CircuitBreaker();

// ============================================================================
// PROMPT INJECTION DETECTION
// ============================================================================

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(all\s+)?instructions?/i,
  /you\s+are\s+now\s+(a\s+)?different/i,
  /act\s+as\s+(if\s+you\s+are\s+)?a\s+different/i,
  /\[SYSTEM\]|\[INST\]|\[\/INST\]/i,
  /jailbreak|DAN\s+mode/i,
  /<\|system\|>|<\|assistant\|>/i,
  /forget\s+(what|everything)\s+you\s+know/i,
];

function detectPromptInjection(text: string): { detected: boolean; pattern?: string } {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { detected: true, pattern: pattern.source };
    }
  }
  return { detected: false };
}

// ============================================================================
// PII MASKING (Logs)
// ============================================================================

const PII_RULES = [
  { regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, placeholder: "[CPF]" },
  { regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, placeholder: "[CNPJ]" },
  { regex: /\b[\w._%+-]+@[\w.-]+\.[a-z]{2,}\b/gi, placeholder: "[EMAIL]" },
  { regex: /\b\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, placeholder: "[TELEFONE]" },
  { regex: /\b\d{2}\/\d{2}\/(19|20)\d{2}\b/g, placeholder: "[DATA_NASC]" },
  { regex: /\b(Rua|Av\.?|Avenida|Alameda|Travessa)\s+[\w\s]+,\s*\d+/gi, placeholder: "[ENDERECO]" },
];

function maskPII(text: string): string {
  let masked = text;
  for (const rule of PII_RULES) {
    masked = masked.replace(rule.regex, rule.placeholder);
  }
  return masked;
}

// ============================================================================
// TRUNCAMENTO DEFENSIVO
// ============================================================================

function truncateSafe(text: string, maxChars: number): { content: string; truncated: boolean } {
  if (text.length <= maxChars) return { content: text, truncated: false };
  const truncated = text.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf(".");
  const content = lastPeriod > maxChars * 0.8
    ? truncated.substring(0, lastPeriod + 1) + "\n[CONTEÚDO TRUNCADO]"
    : truncated + "\n[CONTEÚDO TRUNCADO]";
  return { content, truncated: true };
}

// ============================================================================
// CUSTO POR MODELO
// ============================================================================

const COST_PER_TOKEN: Record<string, { input: number; cached_read: number; output: number }> = {
  "claude-sonnet-4-6":  { input: 0.000003, cached_read: 0.0000003, output: 0.000015 },
  "claude-haiku-4-5":   { input: 0.000001, cached_read: 0.0000001, output: 0.000005 },
  "gpt-4o":             { input: 0.0000025, cached_read: 0.00000125, output: 0.00001 },
  "gpt-4o-mini":        { input: 0.00000015, cached_read: 0.000000075, output: 0.0000006 },
};

function calculateCost(model: string, inputTokens: number, cachedTokens: number, outputTokens: number): number {
  const p = COST_PER_TOKEN[model] ?? { input: 0, cached_read: 0, output: 0 };
  const freshInput = inputTokens - cachedTokens;
  return (freshInput * p.input) + (cachedTokens * p.cached_read) + (outputTokens * p.output);
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

serve(async (req: Request) => {
  const startTime = Date.now();

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: {
    candidato_id: string;
    vaga_id: string;
    cv_text: string;
    job_description: string;
    critical_competencies: string[];
    bars_rubric: string;
    idempotency_key?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { candidato_id, vaga_id, cv_text, job_description, critical_competencies, bars_rubric, idempotency_key } = body;

  // ── 1. Validações de input ─────────────────────────────────────────────
  if (!candidato_id || !vaga_id || !cv_text || !job_description) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  if (cv_text.trim().length < 50) {
    await logFailedCall({
      candidato_id, vaga_id, error_code: "empty_cv",
      error_message: `CV muito curto (${cv_text.length} chars)`,
      idempotency_key,
    });
    return new Response(JSON.stringify({ error: "cv_parsing_failed" }), { status: 422 });
  }

  // ── 2. Idempotência ────────────────────────────────────────────────────
  if (idempotency_key) {
    const { data: existing } = await supabase
      .from("ai_call_logs")
      .select("id, raw_response, parsed_score, parsed_reasoning")
      .eq("idempotency_key", idempotency_key)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ cached: true, result: existing }), {
        status: 200,
        headers: { "X-Idempotent-Replay": "true" },
      });
    }
  }

  // ── 3. Detecção de prompt injection ────────────────────────────────────
  const injectionCheck = detectPromptInjection(cv_text);
  if (injectionCheck.detected) {
    console.warn(`[Security] Prompt injection detectada — candidato ${candidato_id}`);
    await logFailedCall({
      candidato_id, vaga_id, error_code: "prompt_injection_detected",
      error_message: `Padrão: ${injectionCheck.pattern}`,
      idempotency_key,
    });
    // Retorna score baixo + flag, NÃO revela detecção
    return new Response(JSON.stringify({
      match_score: 10,
      reasoning: "CV encaminhado para revisão manual",
      recommendation: "hold",
      flagged_for_human_review: true,
    }), { status: 200 });
  }

  // ── 4. Buscar versão ativa do prompt ───────────────────────────────────
  const { data: promptVersion, error: promptError } = await supabase
    .from("prompt_versions")
    .select("*")
    .eq("call_type", CALL_TYPE)
    .eq("is_active", true)
    .single();

  if (promptError || !promptVersion) {
    console.error("[Prompt] Versão ativa não encontrada para", CALL_TYPE);
    return new Response(JSON.stringify({ error: "prompt_not_configured" }), { status: 500 });
  }

  // ── 5. Truncamento defensivo ───────────────────────────────────────────
  const { content: cvTruncated, truncated: cvWasTruncated } = truncateSafe(cv_text, 12_000);
  const { content: jobTruncated } = truncateSafe(job_description, 3_000);

  if (cvWasTruncated) {
    console.warn(`[Context] CV truncado para 12000 chars — candidato ${candidato_id}`);
  }

  // ── 6. Circuit breaker ─────────────────────────────────────────────────
  if (!anthropicBreaker.canRequest()) {
    await enqueueForRetry({ candidato_id, vaga_id, idempotency_key });
    return new Response(JSON.stringify({
      status: "queued",
      message: "Provider indisponível — reprocessamento agendado",
    }), { status: 202 });
  }

  // ── 7. Chamada Anthropic com structured output + caching ───────────────
  let parsed: CvJobMatch | null = null;
  let rawResponse: any = null;
  let errorCode: string | null = null;
  let errorMessage: string | null = null;
  let attemptNumber = 1;
  let cachedTokens = 0;

  for (let attempt = 1; attempt <= 3; attempt++) {
    attemptNumber = attempt;
    try {
      const response = await anthropic.messages.parse({
        model: MODEL_ID,
        max_tokens: promptVersion.max_tokens,
        temperature: Number(promptVersion.temperature),
        system: [
          {
            type: "text",
            text: promptVersion.system_template,
            cache_control: { type: "ephemeral" },  // ← System prompt cacheado
          },
          {
            type: "text",
            text: `## VAGA\n\n${jobTruncated}\n\n## COMPETÊNCIAS CRÍTICAS\n${critical_competencies.join("\n- ")}\n\n## RUBRIC BARS\n${bars_rubric}`,
            cache_control: { type: "ephemeral" },  // ← Vaga + rubric cacheados
          },
        ],
        messages: [
          {
            role: "user",
            content: `<CV>\n${cvTruncated}\n</CV>\n\nAvalie o candidato conforme schema.`,
          },
        ],
        output_config: {
          format: zodOutputFormat(CvJobMatchSchema, "cv_job_match"),
        },
      });

      rawResponse = response;
      cachedTokens = response.usage.cache_read_input_tokens ?? 0;

      // Refusal detection
      if (!response.parsed_output) {
        const textContent = response.content?.[0]?.type === "text" ? response.content[0].text : "";
        if (/i (cannot|can't) (help|evaluate)/i.test(textContent)) {
          errorCode = "llm_refusal";
          errorMessage = textContent.substring(0, 200);
          break;
        }
        if (attempt < 3) continue;
        errorCode = "json_parse_error";
        errorMessage = "Output não pôde ser parseado mesmo após retries";
        break;
      }

      parsed = response.parsed_output;
      anthropicBreaker.recordSuccess();
      break;

    } catch (err: any) {
      const status = err?.status;

      if (status === 429) {
        errorCode = "rate_limit";
        errorMessage = "Rate limit (SDK fez retries)";
        anthropicBreaker.recordFailure();
      } else if (status === 529 || status === 503) {
        errorCode = "provider_overloaded";
        errorMessage = `Sobrecarregado HTTP ${status}`;
        anthropicBreaker.recordFailure();
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000 + Math.random() * 500));
          continue;
        }
      } else if (err?.message?.includes("timeout")) {
        errorCode = "timeout";
        errorMessage = `Timeout em ${Date.now() - startTime}ms`;
        anthropicBreaker.recordFailure();
      } else {
        errorCode = "unknown_error";
        errorMessage = err?.message ?? "Erro desconhecido";
      }

      if (attempt === 3) break;
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  // ── 8. Cálculo de custo ────────────────────────────────────────────────
  const inputTokens = rawResponse?.usage?.input_tokens ?? 0;
  const outputTokens = rawResponse?.usage?.output_tokens ?? 0;
  const costUsd = calculateCost(MODEL_ID, inputTokens, cachedTokens, outputTokens);

  // ── 9. Retenção LGPD ───────────────────────────────────────────────────
  const retentionDays = parsed?.recommendation === "advance" ? 365 * 5 : 180;
  const retainUntil = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

  // ── 10. Persistir log (PSEUDONIMIZADO) ─────────────────────────────────
  await supabase.from("ai_call_logs").insert({
    candidato_id, vaga_id, call_type: CALL_TYPE,
    prompt_version_id: promptVersion.id,
    prompt_hash: promptVersion.content_hash,
    provider: "anthropic",
    model_id: MODEL_ID,
    model_snapshot: rawResponse?.model ?? MODEL_ID,
    system_prompt: promptVersion.system_template,  // template, não dados reais
    user_prompt_template: maskPII(promptVersion.user_template),  // pseudonimizado
    input_token_count: inputTokens,
    raw_response: rawResponse
      ? { content: rawResponse.content, usage: rawResponse.usage }
      : { error: errorMessage },
    parsed_score: parsed?.match_score ?? null,
    parsed_reasoning: parsed?.reasoning ?? null,
    output_token_count: outputTokens,
    latency_ms: Date.now() - startTime,
    attempt_number: attemptNumber,
    cost_usd: costUsd,
    success: parsed !== null,
    error_code: errorCode,
    error_message: errorMessage,
    idempotency_key: idempotency_key ?? null,
    retain_until: retainUntil.toISOString(),
    triggered_by: "system",
  });

  // ── 11. Resposta ───────────────────────────────────────────────────────
  if (!parsed) {
    if (errorCode !== "llm_refusal" && errorCode !== "prompt_injection_detected") {
      await enqueueForRetry({ candidato_id, vaga_id, idempotency_key });
    }
    return new Response(JSON.stringify({
      error: errorCode,
      message: "Avaliação falhou — encaminhada para revisão",
      queued: true,
    }), { status: 200 });
  }

  return new Response(
    JSON.stringify({
      ...parsed,
      metadata: {
        model: MODEL_ID,
        prompt_version: promptVersion.semver,
        latency_ms: Date.now() - startTime,
        cost_usd: costUsd,
        cache_hit: cachedTokens > 0,
        cached_tokens: cachedTokens,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});

// ============================================================================
// HELPERS
// ============================================================================

async function logFailedCall(params: {
  candidato_id: string;
  vaga_id: string;
  error_code: string;
  error_message: string;
  idempotency_key?: string;
}) {
  await supabase.from("ai_call_logs").insert({
    ...params,
    call_type: CALL_TYPE,
    prompt_version_id: "00000000-0000-0000-0000-000000000000",
    prompt_hash: "N/A",
    provider: "anthropic",
    model_id: "N/A",
    system_prompt: "",
    user_prompt_template: "",
    input_token_count: 0,
    raw_response: { error: params.error_message },
    output_token_count: 0,
    latency_ms: 0,
    attempt_number: 1,
    cost_usd: 0,
    success: false,
    retain_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    triggered_by: "system",
  });
}

async function enqueueForRetry(params: {
  candidato_id: string;
  vaga_id: string;
  idempotency_key?: string;
}) {
  await supabase.rpc("pgmq_send_delay", {
    queue_name: "ai_evaluation_retry",
    message: params,
    delay_seconds: 60,
  });
}
