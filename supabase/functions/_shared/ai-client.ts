/**
 * `_shared/ai-client.ts` — Runtime central de IA (Anthropic-first / OpenAI-fallback).
 *
 * Fase 9 / Plano 09-05 — IA-02 / IA-03 / IA-04 / RF-PL-15/18.
 *
 * Este e o coracao da infra compartilhada que TODO Edge Function consumidor de
 * Fase 10+ importa. Compoe os utilitarios do Plano 09-04 + os modulos
 * prompt-loader + audit-logger deste plano:
 *
 *   - prompt-loader.loadPrompt     -> resolucao DB-only active/canary (IA-01)
 *   - injection-detector           -> curto-circuito pre-API (RF-PL-18)
 *   - pii-masker.maskPII           -> mascara input antes do provedor + log
 *   - circuit-breaker.CircuitBreaker -> porta o fallback OpenAI (IA-04)
 *   - ai-cost.calculateCost        -> custo por chamada (IA-03)
 *   - audit-logger.logAiCall       -> escrita auditavel mascarada (IA-02)
 *
 * Fluxo (RESEARCH Patterns 1+2):
 *   1. idempotency replay (se idempotency_key ja registrado)
 *   2. detectPromptInjection -> se detectado, NENHUMA chamada de API; score baixo
 *      + flagged_for_human_review + error_code='prompt_injection_detected'
 *   3. maskPII(dynamicInput)
 *   4. breaker.canRequest()
 *   5. CLOSED -> anthropic.messages.parse com system=[{system_template,ephemeral},
 *      {vagaRubricBlock,ephemeral}], output_config.format=zodOutputFormat(schema);
 *      retry exp-backoff 3x em 429/529/503/timeout; breaker.recordFailure() ao falhar
 *   6. OPEN -> openai.chat.completions.parse({model:'gpt-4o-mini', response_format:
 *      zodResponseFormat(schema)}); provider='openai' + error_code='anthropic_circuit_open'
 *   7. calculateCost(model, input, cached, output)
 *   8. logAiCall(...) (mask aplicado ao template armazenado)
 *
 * ── SDK pins (orchestrator-decision #6 / Pitfall 1; re-verificados via `npm view`
 * em execute time: 0.102.0 / 6.42.0 / 3.25.76 existem) ──
 * Os imports `npm:` abaixo so sao resolvidos no runtime Deno do Edge Function;
 * os testes (orchestrator-decision #2) injetam Anthropic/OpenAI/supabase via
 * `deps`, entao NENHUMA chamada real ocorre nos testes.
 *
 * @see docs/conhecimento/prompts/templates/08-edge-function-reference.ts (logica de referencia)
 * @see supabase/functions/_shared/__tests__/ai-client.test.ts (contrato RED -> GREEN)
 */
// SDK pins — NAO usar 0.52.0 do template de referencia (Pitfall 1). Comentados
// como referencia de versionamento; os consumidores reais constroem os clientes
// com estes pins e injetam em `callAi` via `deps`.
//   import Anthropic from "npm:@anthropic-ai/sdk@0.102.0";
//   import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod";
//   import OpenAI from "npm:openai@6.42.0";
//   import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod";
//   import { z } from "npm:zod@3.25.76";

import { maskPII } from "./pii-masker.ts";
import { detectPromptInjection } from "./injection-detector.ts";
import { CircuitBreaker } from "./circuit-breaker.ts";
import { calculateCost } from "./ai-cost.ts";
import { logAiCall } from "./audit-logger.ts";
import { loadPrompt } from "./prompt-loader.ts";
import type { LoadedPrompt } from "./prompt-loader.ts";

// Re-exporta os composables para os consumidores (Fase 10+) que so importam ai-client.
export { CircuitBreaker, calculateCost, detectPromptInjection, loadPrompt, logAiCall, maskPII };

/** Modelo OpenAI usado no fallback quando o disjuntor Anthropic esta OPEN. */
const OPENAI_FALLBACK_MODEL = "gpt-4o-mini";
/** Status HTTP retentaveis na Anthropic (rate-limit / overloaded / unavailable). */
const RETRYABLE_STATUS = new Set([429, 503, 529]);
const MAX_ATTEMPTS = 3;

/** Versao de prompt ja resolvida (formato que prompt-loader retornaria). */
export interface ResolvedPrompt {
  call_type: string;
  model_id: string;
  fallback_model_id?: string;
  prompt_version: string;
  prompt_version_id?: string;
  prompt_hash?: string;
  system_template: string;
  max_tokens: number;
  temperature: number;
}

/**
 * Constroi um `ResolvedPrompt` a partir do `LoadedPrompt` que `loadPrompt`
 * devolve, mapeando `content_hash` -> `prompt_hash` (CR-01). Os consumidores
 * de Fase 10+ usam este helper para que `ai_call_logs.prompt_hash` seja sempre
 * preenchido (integridade de auditoria IA-02) em vez do `""` antigo.
 */
export function resolvedPromptFromLoaded(
  loaded: LoadedPrompt,
  call_type: string,
  fallback_model_id?: string,
): ResolvedPrompt {
  return {
    call_type,
    model_id: loaded.model_id,
    fallback_model_id,
    prompt_version: loaded.semver,
    prompt_version_id: loaded.id,
    prompt_hash: loaded.content_hash,
    system_template: loaded.system_template,
    max_tokens: loaded.max_tokens,
    temperature: loaded.temperature,
  };
}

/**
 * Opcoes por-chamada que o SDK aceita como SEGUNDO argumento posicional de
 * `parse()` (RESIL-01). Verificado nos `.d.ts` cacheados em Wave 0:
 *   - @anthropic-ai/sdk@0.102.0 resources/messages/messages.d.ts:52
 *       parse<Params>(params: Params, options?: RequestOptions): APIPromise<...>
 *   - openai@6.42.0 resources/chat/completions/completions.d.ts:107
 *       parse<Params>(body: Params, options?: RequestOptions): APIPromise<...>
 *   - RequestOptions (internal/request-options.d.ts) expoe `maxRetries`,
 *     `timeout` e `signal` — exatamente os campos que precisamos.
 * Logo a rota escolhida e a de opcoes por-chamada (NAO o fallback de
 * constructor da RESEARCH A2).
 */
interface AiCallOptions {
  timeout?: number;
  maxRetries?: number;
  signal?: AbortSignal;
}

/** Cliente Anthropic minimo (estrutural — real ou mock). */
interface AnthropicLike {
  messages: {
    parse(req: unknown, opts?: AiCallOptions): Promise<{
      parsed_output?: unknown;
      usage?: { input_tokens?: number; cache_read_input_tokens?: number; output_tokens?: number };
      model?: string;
    }>;
  };
}

/** Cliente OpenAI minimo (estrutural — real ou mock). */
interface OpenAILike {
  chat: {
    completions: {
      parse(req: unknown, opts?: AiCallOptions): Promise<{
        choices?: Array<{ message?: { parsed?: unknown } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        model?: string;
      }>;
    };
  };
}

/**
 * Supabase minimo que o logger usa (from().insert()) + o lookup de idempotencia
 * (from().select().eq().maybeSingle()). O `select` e OPCIONAL no tipo: os mocks
 * de teste que so espionam INSERTs nao precisam implementa-lo, e o replay de
 * idempotencia faz feature-detection antes de chamar (CR-03).
 */
interface SupabaseLike {
  from(table: string): {
    insert(row: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
    select?(columns: string): {
      eq(column: string, value: unknown): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
  };
}

interface CallAiArgs {
  prompt: ResolvedPrompt;
  rawInput: string;
  vagaRubricBlock: string;
  candidato_id: string;
  vaga_id: string;
  /** Zod schema para structured output; opcional nos testes mockados. */
  schema?: unknown;
  idempotency_key?: string;
}

interface BreakerLike {
  canRequest(): boolean;
  recordSuccess(): void;
  recordFailure(): void;
}

interface CallAiDeps {
  anthropic: AnthropicLike;
  openai: OpenAILike;
  supabase: SupabaseLike;
  breaker?: BreakerLike;
  /** Builder do output_config.format da Anthropic (injetado nos testes; default no-op). */
  zodOutputFormat?: (schema: unknown, name: string) => unknown;
  /** Builder do response_format da OpenAI (injetado nos testes; default no-op). */
  zodResponseFormat?: (schema: unknown, name: string) => unknown;
}

interface CallAiResult {
  provider: string;
  parsed: unknown;
  cost_usd: number;
  latency_ms: number;
  cache_hit: boolean;
  prompt_version: string;
  error_code?: string;
  flagged_for_human_review?: boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Status HTTP de um erro do SDK, se presente. */
function statusOf(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === "number") return s;
  }
  return undefined;
}

function isRetryable(err: unknown): boolean {
  const s = statusOf(err);
  if (s !== undefined && RETRYABLE_STATUS.has(s)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /529|overloaded|timeout|503|429/i.test(msg);
}

/**
 * Procura uma chamada anterior com a mesma `idempotency_key` em `ai_call_logs`
 * (CR-03). Se encontrar, devolve um `CallAiResult` de replay — `cost_usd=0` e
 * `latency_ms=0` porque o custo/latencia ja foram contabilizados na chamada
 * original; `cache_hit=true` sinaliza ao chamador que nenhuma API foi tocada.
 *
 * Defensivo: sem `idempotency_key`, sem `select` no client (mocks de teste que
 * so espionam INSERT), ou em erro/ausencia de linha -> retorna null (segue o
 * fluxo normal). Nunca lanca: uma falha no lookup degrada para uma chamada
 * normal, nao quebra a feature.
 */
async function tryIdempotencyReplay(
  supabase: SupabaseLike,
  idempotency_key: string | undefined,
  prompt_version: string,
): Promise<CallAiResult | null> {
  if (!idempotency_key) return null;
  const table = supabase.from("ai_call_logs");
  if (typeof table.select !== "function") return null;
  try {
    const { data: existing, error } = await table
      .select("provider, cost_usd, latency_ms, success, output, error_code")
      .eq("idempotency_key", idempotency_key)
      .maybeSingle();
    if (error || !existing) return null;
    return {
      provider: String(existing.provider ?? "unknown"),
      parsed: existing.output ?? null,
      cost_usd: 0,
      latency_ms: 0,
      cache_hit: true,
      prompt_version,
      error_code: existing.error_code != null ? String(existing.error_code) : undefined,
      flagged_for_human_review: existing.success === false ? true : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Executa uma chamada de IA ponta-a-ponta: idempotencia -> injecao -> mascara ->
 * disjuntor -> Anthropic (cache + retry) ou fallback OpenAI -> custo -> log.
 *
 * Os clientes (Anthropic/OpenAI/supabase) sao INJETADOS via `deps`
 * (orchestrator-decision #2) — nos testes sao mocks, em producao sao os SDKs
 * pinados (0.102.0 / 6.42.0 / 3.25.76).
 */
export async function callAi(args: CallAiArgs, deps: CallAiDeps): Promise<CallAiResult> {
  const start = Date.now();
  const { prompt, rawInput, vagaRubricBlock, candidato_id, vaga_id, schema, idempotency_key } = args;
  const { anthropic, openai, supabase } = deps;
  const breaker: BreakerLike = deps.breaker ?? new CircuitBreaker();
  const zodOutputFormat = deps.zodOutputFormat ?? ((s: unknown, _n: string) => s);
  const zodResponseFormat = deps.zodResponseFormat ?? ((s: unknown, _n: string) => s);

  // ── 0. Replay de idempotencia ANTES de qualquer chamada de API (CR-03) ────
  // Se a mesma idempotency_key ja foi registrada, devolve o resultado anterior
  // sem fazer nova chamada ao provedor nem gravar nova linha em ai_call_logs
  // (evita custo duplicado + inflacao de ai_cost_daily em retries pg_net).
  const replay = await tryIdempotencyReplay(supabase, idempotency_key, prompt.prompt_version);
  if (replay) return replay;

  // ── 1. Deteccao de prompt injection — curto-circuito ANTES de qualquer API ─
  const injection = detectPromptInjection(rawInput);
  if (injection.detected) {
    const latency_ms = Date.now() - start;
    await logAiCall(supabase, {
      candidato_id,
      vaga_id,
      call_type: prompt.call_type,
      prompt_version_id: prompt.prompt_version_id ?? prompt.prompt_version,
      prompt_version: prompt.prompt_version,
      prompt_hash: prompt.prompt_hash ?? "",
      provider: "none",
      model_id: prompt.model_id,
      system_prompt: prompt.system_template,
      user_prompt_template: rawInput, // logAiCall mascara antes de escrever
      input_token_count: 0,
      raw_response: { error: "prompt_injection_detected", pattern: injection.pattern },
      output_token_count: 0,
      latency_ms,
      attempt_number: 1,
      cost_usd: 0,
      success: false,
      error_code: "prompt_injection_detected",
      idempotency_key,
      recommendation: "hold",
    });
    return {
      provider: "none",
      parsed: { match_score: 10, recommendation: "hold", flagged_for_human_review: true },
      cost_usd: 0,
      latency_ms,
      cache_hit: false,
      prompt_version: prompt.prompt_version,
      error_code: "prompt_injection_detected",
      flagged_for_human_review: true,
    };
  }

  // ── 2. Mascara o input dinamico ANTES de mandar ao provedor (Pitfall 6) ───
  const { masked: maskedInput } = maskPII(rawInput);

  // ── 3. Disjuntor: OPEN -> fallback OpenAI gpt-4o-mini ─────────────────────
  if (!breaker.canRequest()) {
    return await runOpenAIFallback({
      prompt, maskedInput, vagaRubricBlock, candidato_id, vaga_id, schema,
      idempotency_key, openai, supabase, zodResponseFormat, start,
      circuitWasOpen: true,
    });
  }

  // ── 4. Caminho Anthropic com cache efemero + retry exp-backoff ────────────
  let attempt = 0;
  let lastErr: unknown = null;
  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    try {
      const response = await anthropic.messages.parse({
        model: prompt.model_id,
        max_tokens: prompt.max_tokens,
        temperature: prompt.temperature,
        system: [
          { type: "text", text: prompt.system_template, cache_control: { type: "ephemeral" } },
          { type: "text", text: vagaRubricBlock, cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: maskedInput }],
        output_config: { format: zodOutputFormat(schema, prompt.call_type) },
      });

      const inputTokens = response.usage?.input_tokens ?? 0;
      const cachedTokens = response.usage?.cache_read_input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;
      const cost_usd = calculateCost(prompt.model_id, inputTokens, cachedTokens, outputTokens);
      const latency_ms = Date.now() - start;
      breaker.recordSuccess();

      await logAiCall(supabase, {
        candidato_id,
        vaga_id,
        call_type: prompt.call_type,
        prompt_version_id: prompt.prompt_version_id ?? prompt.prompt_version,
        prompt_version: prompt.prompt_version,
        prompt_hash: prompt.prompt_hash ?? "",
        provider: "anthropic",
        model_id: prompt.model_id,
        model_snapshot: response.model ?? prompt.model_id,
        system_prompt: prompt.system_template,
        user_prompt_template: maskedInput,
        input_token_count: inputTokens,
        raw_response: response.parsed_output ?? { usage: response.usage },
        output_token_count: outputTokens,
        latency_ms,
        attempt_number: attempt,
        cost_usd,
        success: true,
        idempotency_key,
      });

      return {
        provider: "anthropic",
        parsed: response.parsed_output ?? null,
        cost_usd,
        latency_ms,
        cache_hit: cachedTokens > 0,
        prompt_version: prompt.prompt_version,
      };
    } catch (err) {
      lastErr = err;
      breaker.recordFailure();
      if (attempt < MAX_ATTEMPTS && isRetryable(err)) {
        await sleep(Math.pow(2, attempt) * 1000 + Math.random() * 500);
        continue;
      }
      break;
    }
  }

  // ── 5. Anthropic esgotou os retries -> fallback OpenAI ────────────────────
  return await runOpenAIFallback({
    prompt, maskedInput, vagaRubricBlock, candidato_id, vaga_id, schema,
    idempotency_key, openai, supabase, zodResponseFormat, start,
    triggerError: lastErr,
    circuitWasOpen: false,
  });
}

interface FallbackArgs {
  prompt: ResolvedPrompt;
  maskedInput: string;
  vagaRubricBlock: string;
  candidato_id: string;
  vaga_id: string;
  schema?: unknown;
  idempotency_key?: string;
  openai: OpenAILike;
  supabase: SupabaseLike;
  zodResponseFormat: (schema: unknown, name: string) => unknown;
  start: number;
  triggerError?: unknown;
  /** true = disjuntor estava OPEN (nenhuma tentativa); false = retries esgotados. */
  circuitWasOpen?: boolean;
}

/** Caminho de fallback OpenAI gpt-4o-mini (disjuntor OPEN ou Anthropic esgotada). */
async function runOpenAIFallback(a: FallbackArgs): Promise<CallAiResult> {
  // WR-02: rotula o error_code pela causa REAL do fallback — disjuntor aberto
  // (nenhuma tentativa) vs retries esgotados (disjuntor fechado, todas falharam).
  const fallbackErrorCode = a.circuitWasOpen
    ? "anthropic_circuit_open"
    : "anthropic_retries_exhausted";
  // Observability: se a OpenAI também falhar, NÃO engolir o erro PRIMÁRIO (Anthropic).
  // Antes, a exceção da OpenAI propagava direto e o triggerError do Anthropic se perdia
  // (logAiCall abaixo nunca rodava) — o painel só via o erro do fallback.
  let response;
  try {
    response = await a.openai.chat.completions.parse({
      model: OPENAI_FALLBACK_MODEL,
      messages: [
        { role: "system", content: `${a.prompt.system_template}\n\n${a.vagaRubricBlock}` },
        { role: "user", content: a.maskedInput },
      ],
      response_format: a.zodResponseFormat(a.schema, a.prompt.call_type),
    });
  } catch (openaiErr) {
    const anthMsg = a.triggerError instanceof Error
      ? a.triggerError.message
      : String(a.triggerError ?? "n/a");
    const oaMsg = openaiErr instanceof Error ? openaiErr.message : String(openaiErr);
    throw new Error(`[fallback] anthropic(${fallbackErrorCode}): ${anthMsg} || openai: ${oaMsg}`);
  }

  const parsed = response.choices?.[0]?.message?.parsed ?? null;
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const cost_usd = calculateCost(OPENAI_FALLBACK_MODEL, inputTokens, 0, outputTokens);
  const latency_ms = Date.now() - a.start;

  await logAiCall(a.supabase, {
    candidato_id: a.candidato_id,
    vaga_id: a.vaga_id,
    call_type: a.prompt.call_type,
    prompt_version_id: a.prompt.prompt_version_id ?? a.prompt.prompt_version,
    prompt_version: a.prompt.prompt_version,
    prompt_hash: a.prompt.prompt_hash ?? "",
    provider: "openai",
    model_id: OPENAI_FALLBACK_MODEL,
    model_snapshot: response.model ?? OPENAI_FALLBACK_MODEL,
    system_prompt: a.prompt.system_template,
    user_prompt_template: a.maskedInput,
    input_token_count: inputTokens,
    raw_response: parsed ?? { usage: response.usage },
    output_token_count: outputTokens,
    latency_ms,
    attempt_number: 1,
    cost_usd,
    success: parsed !== null,
    error_code: fallbackErrorCode,
    error_message: a.triggerError instanceof Error ? a.triggerError.message : undefined,
    idempotency_key: a.idempotency_key,
  });

  return {
    provider: "openai",
    parsed,
    cost_usd,
    latency_ms,
    cache_hit: false,
    prompt_version: a.prompt.prompt_version,
    error_code: fallbackErrorCode,
  };
}
