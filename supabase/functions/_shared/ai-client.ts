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
import { AI_ERROR_CODE, ehFallback, PREFIXO_FALLBACK } from "./ai-error-codes.ts";
import { detectPromptInjection } from "./injection-detector.ts";
import { CircuitBreaker, sharedBreaker } from "./circuit-breaker.ts";
import { calculateCost } from "./ai-cost.ts";
import { computeInputHash, logAiCall } from "./audit-logger.ts";
import { loadPrompt } from "./prompt-loader.ts";
import type { LoadedPrompt } from "./prompt-loader.ts";

// Re-exporta os composables para os consumidores (Fase 10+) que so importam ai-client.
export { CircuitBreaker, calculateCost, detectPromptInjection, loadPrompt, logAiCall, maskPII, sharedBreaker };

/** Modelo OpenAI usado no fallback quando o disjuntor Anthropic esta OPEN. */
const OPENAI_FALLBACK_MODEL = "gpt-4o-mini";
/** Status HTTP retentaveis na Anthropic (rate-limit / overloaded / unavailable). */
const RETRYABLE_STATUS = new Set([429, 503, 529]);

/**
 * Lê um env numérico com guarda de NaN/≤0 (AI-07). Um env malformado
 * (`MAX_ATTEMPTS="abc"` → NaN, ou `"25s"` → NaN, ou `"0"`/negativo) cai no
 * `fallback` em vez de envenenar o loop de retry (`while (attempt < NaN)` nunca
 * roda → nenhuma chamada de API). Exportado para reuso (circuit-breaker replica
 * a mesma guarda localmente p/ evitar ciclo; as EFs de Phase 23-02 importam este).
 */
export function parseIntEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const n = raw == null ? NaN : Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  if (raw != null) console.warn(`[ai-client] env ${name}="${raw}" inválido → default ${fallback}`);
  return fallback;
}

/**
 * Numero maximo de tentativas REAIS por chamada (RESIL-01). Env-configuravel com
 * default-guard (AI-07): ausencia OU valor malformado em PROD cai em 3. Este loop
 * hand-rolled e o UNICO dono do retry — o SDK roda com `maxRetries: 0` (vide call
 * sites) para nao multiplicar tentativas (Pitfall 1: 3x3=9 chamadas + bypass do breaker).
 */
const MAX_ATTEMPTS = parseIntEnv("MAX_ATTEMPTS", 3);
/**
 * Teto de wall-clock POR chamada ao provedor, em ms (RESIL-01). Passado como
 * `{ timeout }` no 2o arg de `parse()`. Sem isto, o timeout default do SDK (10min,
 * escalado ate 60min p/ max_tokens grandes) estoura o teto de 150s idle do EF
 * antes do loop de retry rodar (achado live #1: hang de 38-102s). Env-configuravel
 * com default-guard (AI-07, 25s). 25s x 3 tentativas + backoff (~6s) ~= 81s < 150s.
 */
const AI_CALL_TIMEOUT_MS = parseIntEnv("AI_CALL_TIMEOUT_MS", 25000);

/**
 * Orçamento TOTAL de uma chamada `callAi`, do primeiro byte à resposta — tentativas
 * Anthropic, backoff entre elas E a chamada de fallback OpenAI, tudo somado.
 *
 * ⚠ MEDIDO EM 2026-09-06: gerar o guia presencial registrou `provider=openai`,
 *   **121 546 ms** e `error_message: "Request timed out."` (o erro da Anthropic). O teto
 *   por-chamada era 110 s para o primário E para o fallback: 110 + 110 = 220 s, contra os
 *   ~150 s que o Edge Function tem para responder. A EF só não morreu porque o fallback
 *   respondeu em ~11 s; com um fallback lento, o gateway cortaria e NADA seria gravado —
 *   o modo de falha mais caro, porque some sem deixar log.
 *
 *   `effectiveMaxAttempts` já limitava as tentativas do primário por um orçamento de
 *   140 s, mas o cálculo IGNORAVA o fallback, que é sempre uma chamada a mais. Agora o
 *   fallback recebe o tempo que SOBROU do orçamento, nunca o teto cheio de novo.
 */
const AI_TOTAL_BUDGET_MS = parseIntEnv("AI_TOTAL_BUDGET_MS", 140000);

/** Tempo restante do orçamento total, com piso de 5 s (uma chamada de 0 s não é útil). */
function orcamentoRestanteMs(start: number, budgetMs: number): number {
  return Math.max(5000, budgetMs - (Date.now() - start));
}

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
      /**
       * Phase 49 / JORN-28: `StopReason = 'end_turn' | 'max_tokens' | 'stop_sequence' |
       * 'tool_use' | 'pause_turn' | 'refusal'` (`messages.d.ts:1004` do SDK 0.102.0).
       * É o ÚNICO sinal que distingue «não coube» de «fora do schema»: o SDK não
       * checa `stop_reason` em lugar nenhum — ele só lança na falha de parse.
       */
      stop_reason?: string | null;
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
    // CR-01: logAiCall faz UPSERT `onConflict: idempotency_key` (um retry AI-05 reusa
    // a mesma key -> sobrescreve a linha stale em vez de colidir 23505). O client
    // injetado em `deps.supabase` precisa expor `upsert` p/ o `logAiCall(supabase, ...)`
    // type-checar — em PROD o SupabaseClient real ja o provê; nos testes o mock é `unknown`.
    upsert(
      row: Record<string, unknown>,
      opts?: { onConflict?: string },
    ): Promise<{ data: unknown; error: unknown }>;
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
  /** null para chamadas sem titular único (comparativo) — a coluna de ai_call_logs é nullable; um literal como "comparativo" quebrava o INSERT com 22P02 (uuid). */
  candidato_id: string | null;
  vaga_id: string;
  /** Zod schema para structured output; opcional nos testes mockados. */
  schema?: unknown;
  idempotency_key?: string;
  /**
   * Teto por-chamada (ms) que SOBRESCREVE AI_CALL_TIMEOUT_MS só para esta chamada.
   * Default global = 25s (RESIL-01). EFs cuja geração de structured-output excede
   * legitimamente 25s (ex.: gerar-guia-entrevista — roteiro STAR + âncoras BARS, Sonnet
   * 4000 tokens) passam um teto maior para não falhar por timeout, SEM afrouxar o
   * fast-fail das demais EFs. Backward-compatible: ausente → default RESIL-01.
   */
  timeoutMs?: number;
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
  /**
   * Orçamento TOTAL da chamada em ms (default `AI_TOTAL_BUDGET_MS`). INJETÁVEL para os
   * testes poderem exercitar o corte do fallback em segundos — a env é lida uma única
   * vez, na avaliação do módulo, e mexer nela num arquivo de teste vazaria para todos os
   * outros do mesmo processo (aconteceu: quebrou o AI-04 ao mudar o teto de tentativas).
   */
  totalBudgetMs?: number;
}

/**
 * Resultado de `callAi`.
 *
 * ⚠ Phase 49 / JORN-28 (D-27c/D-28/D-38): os quatro campos do fim são NOVOS e existem
 *   porque o retorno antigo não permitia à EF gravar a verdade. Medido em PROD: 17
 *   fallbacks, todos com `error_code='anthropic_retries_exhausted'` (timeout ×8,
 *   truncamento ×4, Zod `too_big` ×5) — o log não distinguia as causas, e a tabela de
 *   RESULTADO não registrava que quem respondeu foi o `gpt-4o-mini`, não o Sonnet
 *   configurado. `model` é a proveniência real (D-28) e `log_id` a referência de
 *   auditoria (D-38) que as EFs de 49-08..49-11 gravam.
 */
interface CallAiResult {
  provider: string;
  parsed: unknown;
  cost_usd: number;
  latency_ms: number;
  /**
   * Leitura de PROMPT-CACHE efêmero (`usage.cache_read_input_tokens > 0`).
   * ⚠ NÃO é sinal de replay de idempotência — use `replayed` para isso (C6 item 8:
   *   a sobrecarga desta flag era um defeito de contrato, e o D-40 não podia usá-la).
   */
  cache_hit: boolean;
  prompt_version: string;
  error_code?: string;
  flagged_for_human_review?: boolean;
  /**
   * Modelo que DE FATO respondeu: `response.model` no caminho Anthropic e no fallback
   * OpenAI, `model_snapshot` no replay. `null` quando nenhum modelo respondeu (teto de
   * custo, injeção). É daqui que as EFs gravam `modelo_ia` (D-28).
   */
  model: string | null;
  /** `id` da linha de RESULTADO em `ai_call_logs` — `ai_call_log_id` do D-38. */
  log_id: string | null;
  /** `true` = devolvido do log por idempotência, sem tocar provedor nenhum. */
  replayed: boolean;
  /**
   * Causa do fallback, sem o prefixo `fallback_` (ex.: `anthropic_max_tokens`).
   * `null` quando não houve fallback. O `error_code` do retorno carrega o prefixo.
   */
  fallback_cause: string | null;
}

/**
 * Marcador de falha de parse do structured output (JORN-28).
 *
 * O SDK 0.102.0 [VERIFICADO no fonte: `lib/parser.js:51-64` + `resources/messages/
 * messages.js:61-62`] faz `parse(params, options) = create(...).then(parseMessage)`, e
 * `parseMessage` chama `outputFormat.parse(content)` dentro de um `try` que RELANÇA como
 * `AnthropicError("Failed to parse structured output: …")`. Resultado: a exceção sobe
 * ANTES de o chamador ver `stop_reason` e `usage` — e «não coube» (JSON cortado no teto)
 * ficava indistinguível de «fora do schema» (Zod `too_big`) e de «demorou» (timeout).
 *
 * O conserto NÃO troca `parse` por `create` (isso quebraria os 7 arquivos de teste que
 * mockam `messages.parse`): embrulha o `parse` do FORMATO para que ele nunca lance e
 * devolva `{ [FALHA_PARSE]: erro }`. O SDK então resolve com a mensagem inteira e a
 * classificação passa a ser sobre a resposta completa.
 *
 * `Symbol.for` (registro global) e não `Symbol()`: os testes precisam construir o MESMO
 * símbolo sem importá-lo, e uma chave de símbolo é invisível ao `JSON.stringify` — então
 * ela nunca vaza para `raw_response` nem para a impressão digital da chave.
 */
const FALHA_PARSE = Symbol.for("callAi.falhaParse");

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
  // AI-03: casa o timeout do SDK por TIPO. `APIConnectionTimeoutError` (Anthropic E
  // OpenAI, mesma classe/mensagem) NÃO tem `status` e a msg default é "Request timed
  // out." — sem espaço "timed out" a regex antiga `/timeout/i` falhava e o timeout
  // virava fatal na 1ª tentativa. Checar name/constructor.name cobre ambos os SDKs
  // sem importar o SDK aqui (que hoje só é injetado via deps).
  const name = (err as { name?: string })?.name ??
    (err as { constructor?: { name?: string } })?.constructor?.name;
  if (name === "APIConnectionTimeoutError") return true;
  const msg = err instanceof Error ? err.message : String(err);
  // Regex ampliada: `tim(e|ed)\s*out` casa "timeout" E "timed out" (com espaço).
  return /529|overloaded|503|429|tim(e|ed)\s*out/i.test(msg);
}

/** `true` quando o erro é o timeout por chamada (mesma detecção que `isRetryable` usa). */
function ehTimeout(err: unknown): boolean {
  const name = (err as { name?: string })?.name ??
    (err as { constructor?: { name?: string } })?.constructor?.name;
  if (name === "APIConnectionTimeoutError") return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /tim(e|ed)\s*out/i.test(msg);
}

/**
 * Classifica uma EXCEÇÃO do primário Anthropic em uma das três causas de SAÚDE do
 * provedor (JORN-28 / D-27c).
 *
 * As três são falhas de saúde, e só elas alimentam o disjuntor: repetir a chamada pode
 * dar outro resultado. As causas DETERMINÍSTICAS (truncamento, schema, recusa) não vêm de
 * exceção nenhuma — vêm da resposta, que o SDK entrega normalmente (ver `FALHA_PARSE`), e
 * por isso são classificadas no caminho de sucesso e NÃO passam por aqui.
 */
function causaDaExcecao(err: unknown): string {
  if (ehTimeout(err)) return AI_ERROR_CODE.anthropic_timeout;
  const status = statusOf(err);
  if (status !== undefined && RETRYABLE_STATUS.has(status)) {
    return AI_ERROR_CODE.anthropic_overloaded;
  }
  // A regex de `isRetryable` também casa 429/503/529 vindos só na MENSAGEM (erro sem
  // `status`, como os mocks e alguns wrappers levantam) — isso é sobrecarga, não erro
  // genérico da API. Sem este ramo, um "529 overloaded" sem `status` viraria api_error.
  const msg = err instanceof Error ? err.message : String(err);
  if (/529|overloaded|503|429/i.test(msg)) return AI_ERROR_CODE.anthropic_overloaded;
  return AI_ERROR_CODE.anthropic_api_error;
}

/** Classifica uma exceção do FALLBACK OpenAI (não há terceiro provedor: a chamada morre). */
function causaDoErroOpenai(err: unknown): string {
  const name = (err as { name?: string })?.name ??
    (err as { constructor?: { name?: string } })?.constructor?.name;
  // openai 6.42.0 `lib/parser.js:96-97`: `finish_reason === 'length'` lança esta classe.
  if (name === "LengthFinishReasonError") return AI_ERROR_CODE.openai_max_tokens;
  if (name === "ZodError") return AI_ERROR_CODE.openai_schema_invalid;
  const msg = err instanceof Error ? err.message : String(err);
  if (/failed to parse|invalid_type|unrecognized_keys/i.test(msg)) {
    return AI_ERROR_CODE.openai_schema_invalid;
  }
  return AI_ERROR_CODE.openai_error;
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
/**
 * Impressao digital da REQUISICAO — tudo que determina a saida do modelo.
 *
 * ⚠ MEDIDO EM 2026-09-06 (E4 do guia de validacao): o RH clicou «Gerar guia
 *   (entrevista presencial)» depois de o guia anterior ter caido no fallback ruim.
 *   A tela mostrou um guia, `entrevista_guias.updated_at` avancou — e `ai_call_logs`
 *   NAO registrou chamada nenhuma. O replay devolveu o guia VELHO, porque a chave era
 *   `{candidatura_id}:{tipo}`: estavel, independente do input.
 *
 *   Isso e pior do que "regerar nao regenera". Em `avaliar-transcricao-entrevista` a
 *   chave e `{candidatura_id}:transcript` — colar uma transcricao DIFERENTE (corrigida,
 *   de uma segunda entrevista) devolveria a analise da PRIMEIRA, com as citacoes da
 *   outra conversa, sem nenhum sinal de que nada foi reprocessado. `avaliar-redacao-cultural`
 *   ja fazia certo (o inputHash entra na chave dela); as demais nao.
 *
 *   O defeito so ficou observavel em 05/09: ate entao o replay NUNCA funcionava (pedia
 *   uma coluna `output` inexistente → 400 → null), entao toda chamada era nova.
 *   Consertar o replay ligou o cache — e a chave errada virou dado errado na tela.
 *
 * Cobre: versao/modelo/tetos do prompt, o system template, o bloco de rubrica, o input
 * mascarado E O SCHEMA DE SAIDA. Mudar o max_tokens (migration 20260906000003) ou o
 * schema invalida os replays anteriores — que e o correto: uma saida truncada, ou escrita
 * sob outro contrato, nao deve ser reservida.
 *
 * ⚠ O SCHEMA entrou depois, e por medicao: em 2026-09-06 apertei os `describe` do
 *   InterviewGuideSchema para o modelo escrever ancoras BARS curtas, redeployei, cliquei
 *   em «Gerar guia» — e a tela devolveu, em menos de um segundo e SEM linha em
 *   ai_call_logs, a saida do gpt-4o-mini de 40 minutos antes. A chave efetiva era
 *   identica (`…:presencial:0a4b1756ab6d210a`) porque nada do que estava na impressao
 *   digital havia mudado. O schema e o que mais determina o formato da resposta;
 *   deixa-lo de fora e cachear sob um contrato que nao existe mais.
 */
async function requestFingerprint(
  prompt: ResolvedPrompt,
  vagaRubricBlock: string,
  maskedInput: string,
  schema: unknown,
  zodOutputFormat: (schema: unknown, name: string) => unknown,
): Promise<string> {
  // O JSON Schema gerado e a forma canonica do contrato (inclui os `describe`, que sao
  // parte do pedido). Se a serializacao falhar (mock de teste, ciclo), degrada para
  // string vazia — nunca derruba a chamada por causa da chave.
  let schemaCanonico = "";
  try {
    schemaCanonico = JSON.stringify(zodOutputFormat(schema, prompt.call_type)) ?? "";
  } catch {
    schemaCanonico = "";
  }
  const canonico = [
    prompt.prompt_version,
    prompt.model_id,
    String(prompt.max_tokens),
    String(prompt.temperature),
    prompt.system_template,
    vagaRubricBlock,
    maskedInput,
    schemaCanonico,
  ].join("\u0000");
  return (await computeInputHash(canonico)).slice(0, 16);
}

async function tryIdempotencyReplay(
  supabase: SupabaseLike,
  idempotency_key: string | undefined,
): Promise<CallAiResult | null> {
  if (!idempotency_key) return null;
  const table = supabase.from("ai_call_logs");
  if (typeof table.select !== "function") return null;
  try {
    // 2026-09-05: pedia `output`, coluna que NUNCA existiu em ai_call_logs → PostgREST
    // 400 → `error` → return null. O replay por idempotency_key NUNCA funcionou; toda
    // chamada "cacheada" era uma chamada nova (custo dobrado no reprocesso do RH). O
    // resultado bruto vive em `raw_response`.
    // Phase 49 / JORN-28: `id` e `model_snapshot` entraram no SELECT. Sem eles o replay
    // devolvia um resultado sem proveniência — a EF gravava `modelo_ia` NULL (ou, pior, o
    // modelo configurado) e `ai_call_log_id` NULL (D-28/D-38).
    const { data: existing, error } = await table
      .select("id, provider, cost_usd, latency_ms, success, raw_response, error_code, model_snapshot")
      .eq("idempotency_key", idempotency_key)
      .maybeSingle();
    if (error || !existing) return null;
    // AI-05: só faz replay de linhas de SUCESSO. Uma falha cacheada (success=false,
    // ex.: timeout transiente ou injection-detected) NÃO deve ser devolvida como
    // resultado terminal — cair p/ null aqui faz o callAi fazer uma chamada NOVA,
    // destravando o reprocessamento do RH (guia/transcrição/devolutiva reusam a
    // mesma idempotency_key estável; sem isto a falha se replayaria p/ sempre).
    // (T-23-01-03: impede que uma falha envenenada seja replayada como sucesso.)
    if (existing.success !== true) return null;
    // ⚠ Phase 49 / JORN-28: um SUCESSO DE FALLBACK também NÃO é replayado.
    //   Medido em PROD: 17 linhas `provider='openai'` com `success=true`. Antes desta
    //   guarda, o RH que clicasse de novo em «Gerar guia» recebia — em menos de um
    //   segundo, sem nenhuma linha nova em `ai_call_logs` — a mesma saída do `gpt-4o-mini`
    //   que o fez clicar de novo. O clique é justamente o pedido de tentar o Sonnet:
    //   devolver `null` aqui derruba para uma chamada nova.
    if (ehFallback(existing.error_code as string | null | undefined)) return null;
    const modelSnapshot = existing.model_snapshot;
    const logId = existing.id;
    return {
      provider: String(existing.provider ?? "unknown"),
      parsed: existing.raw_response ?? null,
      cost_usd: 0,
      latency_ms: 0,
      // Um replay não tocou o provedor, logo não houve leitura de prompt-cache efêmero.
      // `cache_hit` volta a significar SÓ isso (C6 item 8); `replayed` é o sinal de replay.
      cache_hit: false,
      // Placeholder: `callAi` sobrescreve com `prompt.prompt_version` no retorno. A linha
      // replayada e necessariamente do MESMO prompt — a versao entra na impressao digital
      // da chave efetiva (ver requestFingerprint), entao nao ha divergencia possivel.
      prompt_version: "",
      error_code: existing.error_code != null ? String(existing.error_code) : undefined,
      // D-28/D-38: a proveniência do resultado replayado é a da linha ORIGINAL.
      model: typeof modelSnapshot === "string" ? modelSnapshot : null,
      log_id: typeof logId === "string" ? logId : null,
      replayed: true,
      // Uma linha de fallback nunca chega aqui (guarda acima), logo nunca há causa.
      fallback_cause: null,
    };
  } catch {
    return null;
  }
}

/**
 * AI-06 — teto HARD de custo diário por vaga, avaliado ANTES da chamada (corte de
 * gasto em RUNTIME). Soma o `cost_usd` das chamadas de SUCESSO do dia UTC corrente
 * para a vaga; se a soma >= `AI_DAILY_COST_CAP_USD` (default 50) devolve `true` e o
 * `callAi` recusa a chamada. É o teto operacional de SEGURANÇA — o ÚNICO fix que
 * corta gasto na hora, distinto do threshold de NEGÓCIO (R$200/mês por vaga) que o
 * trigger `notify_cost_anomaly` + `cost-alerter` cobrem (com ~1 dia de atraso, pois
 * agregam o dia ANTERIOR às 01:30).
 *
 * O env `AI_DAILY_COST_CAP_USD` é lido POR CHAMADA (não módulo-level) para que o
 * operador possa ajustar o teto sem redeploy e para que os testes o exercitem.
 *
 * FAIL-OPEN por design (T-23-03-02): feature-detecta o `select` (como
 * `tryIdempotencyReplay`) e envolve TUDO em try/catch — ausência do select, erro
 * do lookup ou payload malformado → devolve `false` (NÃO bloqueia). Um lookup de
 * custo que falha JAMAIS pode matar o funil; o trigger DB é o backstop. A tradeoff
 * é deliberada: disponibilidade acima do teto de custo. Preserva RNF-07a — quem
 * chama devolve 'hold' + flagged_for_human_review, NUNCA rejeita candidato.
 *
 * Usa o índice parcial `idx_ai_logs_vaga_cost (vaga_id, cost_usd) WHERE success=true`
 * → a soma per-vaga do dia é barata (23-RESEARCH:316).
 */
async function isDailyCostCapExceeded(
  supabase: SupabaseLike,
  vaga_id: string,
): Promise<boolean> {
  try {
    const dailyCap = parseIntEnv("AI_DAILY_COST_CAP_USD", 50);
    const table = supabase.from("ai_call_logs") as {
      select?: (columns: string) => unknown;
    };
    // Feature-detect (mocks de teste que só espionam INSERT não têm select) → fail-open.
    if (typeof table.select !== "function") return false;
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    // PostgREST filter builder: chainable + thenable → { data, error }. Cast defensivo;
    // qualquer método ausente/erro cai no catch abaixo → fail-open.
    // ⚠ Phase 49 / JORN-28: o filtro `.eq("success", true)` SAIU da soma.
    //   Razão medida: a tentativa Anthropic truncada de 2026-09-20 consumiu 4 445 tokens
    //   de entrada e 3 000 de saída — **US$ 0,058 debitados** — e agora é gravada com
    //   `success=false` (ela é honestamente uma falha: o resultado não era utilizável).
    //   Com o filtro, esse dinheiro ficava FORA justamente do teto que existe para contê-lo,
    //   e o teto passava a medir «gasto que deu certo» em vez de «gasto». Reversível: basta
    //   recolocar o `.eq`. O índice parcial `idx_ai_logs_vaga_cost … WHERE success=true`
    //   deixa de cobrir a consulta inteira; o volume por vaga/dia é de dezenas de linhas.
    const builder = (table.select("cost_usd") as {
      eq: (c: string, v: unknown) => { gte: (c: string, v: unknown) => unknown };
    })
      .eq("vaga_id", vaga_id)
      .gte("created_at", dayStart.toISOString());
    const { data, error } = await (builder as unknown as Promise<{
      data: Array<{ cost_usd: number | null }> | null;
      error: unknown;
    }>);
    if (error || !Array.isArray(data)) return false; // fail-open
    const total = data.reduce((sum, r) => sum + (Number(r?.cost_usd) || 0), 0);
    return total >= dailyCap;
  } catch {
    // fail-open — o lookup nunca bloqueia o funil (o trigger DB é o backstop).
    return false;
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
  const { prompt, rawInput, vagaRubricBlock, candidato_id, vaga_id, schema, idempotency_key, timeoutMs } =
    args;
  const { anthropic, openai, supabase } = deps;
  // RESIL-01 + P21: teto por-chamada. Override só vale se for um número finito > 0;
  // senão cai no default global AI_CALL_TIMEOUT_MS (25s). Aplica ao primário Anthropic
  // E ao fallback OpenAI para o teto efetivo ser coerente em todo o caminho da chamada.
  const effectiveTimeoutMs = typeof timeoutMs === "number" && timeoutMs > 0
    ? timeoutMs
    : AI_CALL_TIMEOUT_MS;
  // AI-04 — cap de retry-budget: quando o teto por-chamada é longo (>25s, ex.: o
  // override de 60s do avaliar-transcricao/gerar-guia), 3 tentativas × 60s + backoff
  // exp (2^n s) estouram o teto ~150s idle do EF (23-RESEARCH Open Q2). Limita o nº de
  // tentativas a floor(140000 / teto) para o total caber sob ~150s. Chamadas curtas
  // (≤25s) mantêm MAX_ATTEMPTS integral. Nunca abaixo de 1 (sempre ao menos 1 tentativa).
  const totalBudgetMs = deps.totalBudgetMs && deps.totalBudgetMs > 0
    ? deps.totalBudgetMs
    : AI_TOTAL_BUDGET_MS;
  const effectiveMaxAttempts = effectiveTimeoutMs > 25000
    ? Math.max(1, Math.min(MAX_ATTEMPTS, Math.floor(totalBudgetMs / effectiveTimeoutMs)))
    : MAX_ATTEMPTS;
  // AI-02: default = sharedBreaker (singleton por-isolate) para as falhas ACUMULAREM
  // entre chamadas e o disjuntor realmente abrir. Antes `new CircuitBreaker()` por
  // chamada zerava o contador toda vez → THRESHOLD inalcançável.
  const breaker: BreakerLike = deps.breaker ?? sharedBreaker;
  const zodOutputFormat = deps.zodOutputFormat ?? ((s: unknown, _n: string) => s);
  const zodResponseFormat = deps.zodResponseFormat ?? ((s: unknown, _n: string) => s);

  // ── 0. Replay de idempotencia ANTES de qualquer chamada de API (CR-03) ────
  // Se a mesma requisicao ja foi registrada, devolve o resultado anterior sem chamar o
  // provedor nem gravar nova linha (evita custo duplicado + inflacao de ai_cost_daily
  // em retries pg_net).
  //
  // ⚠ A chave EFETIVA = chave do chamador + impressao digital da requisicao. Ver
  //   `requestFingerprint`: sem ela, `{candidatura_id}:transcript` devolvia a analise da
  //   transcricao ANTERIOR para uma transcricao nova. maskPII roda aqui em cima (nunca
  //   depois) porque o hash e sobre o texto MASCARADO — o mesmo que vai ao provedor e a
  //   `ai_call_logs.input_hash` (Pitfall 6 / IA-02).
  const { masked: maskedInput } = maskPII(rawInput);
  const idempotencyKeyEfetiva = idempotency_key
    ? `${idempotency_key}:${
      await requestFingerprint(prompt, vagaRubricBlock, maskedInput, schema, zodOutputFormat)
    }`
    : undefined;
  const replay = await tryIdempotencyReplay(supabase, idempotencyKeyEfetiva);
  if (replay) return { ...replay, prompt_version: prompt.prompt_version };

  // ── 0.5. Kill-switch de custo PRÉ-chamada (AI-06) — corte de gasto em RUNTIME
  // Soma o custo do dia por vaga e RECUSA a chamada acima do teto HARD, ANTES de
  // tocar qualquer provedor. É o único ponto que corta gasto na hora (o alerta do
  // cron só detecta o dia seguinte). FAIL-OPEN em erro de lookup. RNF-07a: devolve
  // 'hold' + flagged_for_human_review — NUNCA rejeita candidato por custo.
  if (await isDailyCostCapExceeded(supabase, vaga_id)) {
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
      raw_response: { error: AI_ERROR_CODE.cost_cap_exceeded },
      output_token_count: 0,
      latency_ms,
      attempt_number: 1,
      cost_usd: 0,
      success: false,
      error_code: AI_ERROR_CODE.cost_cap_exceeded,
      idempotency_key: idempotencyKeyEfetiva,
      recommendation: "hold",
    });
    return {
      provider: "none",
      parsed: { recommendation: "hold", flagged_for_human_review: true },
      cost_usd: 0,
      latency_ms,
      cache_hit: false,
      prompt_version: prompt.prompt_version,
      error_code: AI_ERROR_CODE.cost_cap_exceeded,
      flagged_for_human_review: true,
      // Nenhum modelo respondeu — `model` NULL é a verdade, não um placeholder.
      model: null,
      log_id: null,
      replayed: false,
      fallback_cause: null,
    };
  }

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
      raw_response: { error: AI_ERROR_CODE.prompt_injection_detected, pattern: injection.pattern },
      output_token_count: 0,
      latency_ms,
      attempt_number: 1,
      cost_usd: 0,
      success: false,
      error_code: AI_ERROR_CODE.prompt_injection_detected,
      idempotency_key: idempotencyKeyEfetiva,
      recommendation: "hold",
    });
    return {
      provider: "none",
      parsed: { match_score: 10, recommendation: "hold", flagged_for_human_review: true },
      cost_usd: 0,
      latency_ms,
      cache_hit: false,
      prompt_version: prompt.prompt_version,
      error_code: AI_ERROR_CODE.prompt_injection_detected,
      flagged_for_human_review: true,
      model: null,
      log_id: null,
      replayed: false,
      fallback_cause: null,
    };
  }

  // (o mascaramento do input — Pitfall 6 — subiu para o passo 0, junto da impressao
  //  digital da chave de idempotencia; `maskedInput` ja esta pronto aqui.)

  // ── 3. Disjuntor: OPEN -> fallback OpenAI gpt-4o-mini ─────────────────────
  if (!breaker.canRequest()) {
    // Disjuntor aberto = NENHUMA tentativa foi feita, logo NÃO há linha de tentativa a
    // gravar (só a linha do resultado, com `fallback_anthropic_circuit_open`).
    return await runOpenAIFallback({
      prompt, maskedInput, vagaRubricBlock, candidato_id, vaga_id, schema,
      idempotency_key: idempotencyKeyEfetiva, timeoutMs, totalBudgetMs,
      openai, supabase, zodResponseFormat, start,
      causa: AI_ERROR_CODE.anthropic_circuit_open,
    });
  }

  // ── 4. Caminho Anthropic com cache efemero + retry exp-backoff ────────────
  // JORN-28: o FORMATO vai embrulhado para que a falha de parse não lance dentro do SDK
  // (ver `FALHA_PARSE`). A guarda `typeof fmt.parse === "function"` é obrigatória: nos
  // testes e nas EFs sem schema o `zodOutputFormat` é o no-op `(s) => s`, que não tem
  // `.parse` — esse passa intacto.
  const fmtBruto = zodOutputFormat(schema, prompt.call_type) as {
    parse?: (content: string) => unknown;
  };
  const fmtSeguro = fmtBruto && typeof fmtBruto.parse === "function"
    ? {
      ...fmtBruto,
      parse: (content: string) => {
        try {
          return fmtBruto.parse!(content);
        } catch (e) {
          return { [FALHA_PARSE]: e };
        }
      },
    }
    : fmtBruto;

  let attempt = 0;
  let lastErr: unknown = null;
  /** Causa determinística detectada na RESPOSTA (truncamento/schema/recusa). */
  let causaDeterministica: string | null = null;
  /** Causa de SAÚDE detectada na EXCEÇÃO (timeout/sobrecarga/erro da API). */
  let causaExcecao: string | null = null;
  while (attempt < effectiveMaxAttempts) {
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
        output_config: { format: fmtSeguro },
      }, {
        // RESIL-01: teto por-chamada + DESLIGA o retry do SDK. `maxRetries: 0` e
        // OBRIGATORIO — o loop `while (attempt < effectiveMaxAttempts)` acima e o unico
        // dono do retry; sem isto o SDK retentaria 2x dentro de cada attempt (3x3=9
        // chamadas) e bypassaria `breaker.recordFailure()`/`attempt_number` (Pitfall 1).
        // AI-03: o timeout lanca `APIConnectionTimeoutError` (name) com msg "Request timed
        // out." — isRetryable casa por name E pela regex `tim(e|ed)\s*out` (NAO `/timeout/i`,
        // que falhava no espaco de "timed out"), entao o loop retenta antes do fallback.
        timeout: effectiveTimeoutMs,
        maxRetries: 0,
      });

      const inputTokens = response.usage?.input_tokens ?? 0;
      const cachedTokens = response.usage?.cache_read_input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;
      const cost_usd = calculateCost(prompt.model_id, inputTokens, cachedTokens, outputTokens);
      const latency_ms = Date.now() - start;

      // ── JORN-28: classificar a RESPOSTA INTEIRA, não a exceção ───────────
      // O provedor respondeu e cobrou. O que distingue as três falhas determinísticas
      // é `stop_reason` + o marcador do formato embrulhado:
      //   `max_tokens` ⇒ não coube  ·  `refusal` ⇒ recusa  ·  marcador com qualquer
      //   outro stop_reason (tipicamente `end_turn`) ⇒ fora do schema.
      const falhaParse = (response.parsed_output as Record<symbol, unknown> | null | undefined)
        ?.[FALHA_PARSE];
      const causa = response.stop_reason === "max_tokens"
        ? AI_ERROR_CODE.anthropic_max_tokens
        : response.stop_reason === "refusal"
        ? AI_ERROR_CODE.anthropic_refusal
        : falhaParse
        ? AI_ERROR_CODE.anthropic_schema_invalid
        : null;

      if (causa) {
        // ⚠ NÃO chamar `breaker.recordFailure()`: truncamento, schema e recusa são
        //   determinísticos PELO INPUT — repetir a chamada dá o mesmo resultado. Abrir o
        //   disjuntor com eles derrubaria o Sonnet para TODAS as vagas por causa de um
        //   único prompt grande (T-49-02-04). Também não chamamos `recordSuccess()`: a
        //   chamada não é evidência de saúde nem motivo para zerar falhas acumuladas.
        //
        // Linha da TENTATIVA (i de duas). `idempotency_key: null` é obrigatório —
        // Pitfall 1: com a chave efetiva, o upsert de `audit-logger.ts` a sobrescreveria
        // pela linha do fallback e a tentativa cobrada desapareceria do log.
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
          // NUNCA o texto truncado (T-49-02-03) — só o que explica a causa e o custo.
          raw_response: { stop_reason: response.stop_reason ?? null, usage: response.usage ?? null },
          output_token_count: outputTokens,
          latency_ms,
          attempt_number: attempt,
          // A tentativa FOI cobrada (≈ US$ 0,058 no truncamento de 20/09). É gasto real.
          cost_usd,
          success: false,
          error_code: causa,
          idempotency_key: null,
        });
        causaDeterministica = causa;
        break;
      }

      breaker.recordSuccess();

      const { id: logId } = await logAiCall(supabase, {
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
        idempotency_key: idempotencyKeyEfetiva,
      });

      return {
        provider: "anthropic",
        parsed: response.parsed_output ?? null,
        cost_usd,
        latency_ms,
        cache_hit: cachedTokens > 0,
        prompt_version: prompt.prompt_version,
        // D-28: o modelo REAL que respondeu, não o configurado. `response.model` pode
        // divergir de `prompt.model_id` (alias → versão datada).
        model: response.model ?? prompt.model_id,
        log_id: logId,
        replayed: false,
        fallback_cause: null,
      };
    } catch (err) {
      lastErr = err;
      // JORN-28: as três causas de EXCEÇÃO são falhas de SAÚDE do provedor (timeout,
      // sobrecarga, erro da API) — e por isso, e só por isso, alimentam o disjuntor.
      // Repetir a chamada pode dar outro resultado; é o que o disjuntor mede.
      causaExcecao = causaDaExcecao(err);
      breaker.recordFailure();
      if (attempt < effectiveMaxAttempts && isRetryable(err)) {
        await sleep(Math.pow(2, attempt) * 1000 + Math.random() * 500);
        continue;
      }
      break;
    }
  }

  // ── 5. Anthropic falhou (exceção esgotada OU causa determinística) -> fallback ──
  // A causa determinística (truncamento/schema/recusa) já gravou a linha da tentativa
  // dentro do loop, onde `response.usage` estava disponível para custeá-la. O caminho de
  // EXCEÇÃO não tem `usage` (não houve resposta), então a tentativa dele é gravada aqui.
  const causaFinal = causaDeterministica ?? causaExcecao ?? AI_ERROR_CODE.anthropic_api_error;
  if (!causaDeterministica) {
    // Linha da TENTATIVA do caminho de exceção. `cost_usd: 0` é a verdade: sem resposta
    // não há `usage`, e um custo inventado corromperia o teto AI-06 que agora soma
    // também as falhas. `idempotency_key: null` pelo Pitfall 1 (o upsert por chave
    // sobrescreveria esta linha com a do fallback).
    await logAiCall(supabase, {
      candidato_id,
      vaga_id,
      call_type: prompt.call_type,
      prompt_version_id: prompt.prompt_version_id ?? prompt.prompt_version,
      prompt_version: prompt.prompt_version,
      prompt_hash: prompt.prompt_hash ?? "",
      provider: "anthropic",
      model_id: prompt.model_id,
      model_snapshot: prompt.model_id, // não houve resposta: o único modelo conhecido é o pedido
      system_prompt: prompt.system_template,
      user_prompt_template: maskedInput,
      input_token_count: 0,
      raw_response: { causa: causaFinal, tentativas: attempt },
      output_token_count: 0,
      latency_ms: Date.now() - start,
      attempt_number: attempt,
      cost_usd: 0,
      success: false,
      error_code: causaFinal,
      // A mensagem do provedor pertence à linha da TENTATIVA — é ela que falhou. Até a
      // Phase 49 ela ia na linha do RESULTADO (`provider='openai'`), onde descrevia um
      // erro que aquela chamada não teve: foi assim que o guia de 06/09 ficou registrado
      // como `provider=openai` com `error_message: "Request timed out."`.
      error_message: lastErr instanceof Error ? lastErr.message : undefined,
      idempotency_key: null,
    });
  }

  return await runOpenAIFallback({
    prompt, maskedInput, vagaRubricBlock, candidato_id, vaga_id, schema,
    idempotency_key: idempotencyKeyEfetiva,
    timeoutMs, totalBudgetMs, openai, supabase, zodResponseFormat, start,
    triggerError: lastErr,
    causa: causaFinal,
  });
}

interface FallbackArgs {
  prompt: ResolvedPrompt;
  maskedInput: string;
  vagaRubricBlock: string;
  candidato_id: string | null;
  vaga_id: string;
  schema?: unknown;
  idempotency_key?: string;
  /** Teto por-chamada herdado do callAi (override de AI_CALL_TIMEOUT_MS). */
  timeoutMs?: number;
  /** Orçamento total herdado do callAi — limita o teto DESTE fallback ao que sobrou. */
  totalBudgetMs?: number;
  openai: OpenAILike;
  supabase: SupabaseLike;
  zodResponseFormat: (schema: unknown, name: string) => unknown;
  start: number;
  triggerError?: unknown;
  /**
   * Causa do fallback, SEM o prefixo (`anthropic_max_tokens`, `anthropic_timeout`,
   * `anthropic_circuit_open`, …). Phase 49 / JORN-28: substituiu o par
   * `circuitWasOpen`/`triggerError`, que só sabia dizer «aberto» ou «esgotado» — e por
   * isso 17 fallbacks de PROD, com três causas diferentes, ficaram com o mesmo código.
   */
  causa: string;
}

/** Caminho de fallback OpenAI gpt-4o-mini (disjuntor OPEN ou Anthropic falhou). */
async function runOpenAIFallback(a: FallbackArgs): Promise<CallAiResult> {
  // O código do RESULTADO carrega o prefixo: a linha é um SUCESSO do fallback, não um
  // sucesso do modelo configurado. `error_code LIKE 'fallback_%'` é o que permite à tela
  // do admin mostrar «Fallback» (âmbar) em vez de «Sucesso» (verde) — JORN-28.
  const fallbackErrorCode = `${PREFIXO_FALLBACK}${a.causa}`;
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
      // JORN-28 (Discretion obrigatória): o fallback passa a RESPEITAR o prompt. Até a
      // Phase 49 estes dois não eram enviados — a OpenAI aplicava os defaults dela
      // (`temperature = 1` [ASSUMIDO: premissa A1 do RESEARCH]) numa avaliação de
      // candidato cujo prompt pede `temperature: 0`, e sem teto de saída. O nome do
      // campo é `max_completion_tokens` (o `max_tokens` está deprecado na API atual).
      max_completion_tokens: a.prompt.max_tokens,
      temperature: a.prompt.temperature,
    }, {
      // RESIL-01 + orçamento total (2026-09-06): o fallback recebe o que SOBROU de
      // AI_TOTAL_BUDGET_MS, nunca o teto cheio de novo. Com 110s no primário e 110s aqui
      // o total batia 220s contra os ~150s do EF — ver AI_TOTAL_BUDGET_MS.
      timeout: Math.min(
        a.timeoutMs && a.timeoutMs > 0 ? a.timeoutMs : AI_CALL_TIMEOUT_MS,
        orcamentoRestanteMs(a.start, a.totalBudgetMs ?? AI_TOTAL_BUDGET_MS),
      ),
      maxRetries: 0,
    });
  } catch (openaiErr) {
    const anthMsg = a.triggerError instanceof Error
      ? a.triggerError.message
      : String(a.triggerError ?? "n/a");
    const oaMsg = openaiErr instanceof Error ? openaiErr.message : String(openaiErr);
    // JORN-28 (Discretion obrigatória): a falha do FALLBACK também deixa linha, ANTES do
    // throw. Sem ela, a chamada mais caras de todas — a que pagou a tentativa Anthropic E
    // a chamada da OpenAI, e não entregou nada — era a única que não deixava rastro algum
    // do lado do fallback. `success=false`, causa nominal (`openai_max_tokens` quando é
    // `LengthFinishReasonError`, `openai_schema_invalid`, senão `openai_error`).
    const causaOpenai = causaDoErroOpenai(openaiErr);
    await logAiCall(a.supabase, {
      candidato_id: a.candidato_id,
      vaga_id: a.vaga_id,
      call_type: a.prompt.call_type,
      prompt_version_id: a.prompt.prompt_version_id ?? a.prompt.prompt_version,
      prompt_version: a.prompt.prompt_version,
      prompt_hash: a.prompt.prompt_hash ?? "",
      provider: "openai",
      model_id: OPENAI_FALLBACK_MODEL,
      model_snapshot: OPENAI_FALLBACK_MODEL,
      system_prompt: a.prompt.system_template,
      user_prompt_template: a.maskedInput,
      input_token_count: 0,
      raw_response: { causa: causaOpenai },
      output_token_count: 0,
      latency_ms: Date.now() - a.start,
      attempt_number: 1,
      cost_usd: 0,
      success: false,
      error_code: causaOpenai,
      error_message: oaMsg,
      // Chave nula: a linha da tentativa Anthropic também é nula, e um upsert por chave
      // aqui apagaria a evidência de que as DUAS pontas falharam (Pitfall 1).
      idempotency_key: null,
    });
    throw new Error(`[fallback] anthropic(${fallbackErrorCode}): ${anthMsg} || openai: ${oaMsg}`);
  }

  const parsed = response.choices?.[0]?.message?.parsed ?? null;
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const cost_usd = calculateCost(OPENAI_FALLBACK_MODEL, inputTokens, 0, outputTokens);
  const latency_ms = Date.now() - a.start;

  const { id: logId } = await logAiCall(a.supabase, {
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
    // ⚠ A `error_message` da Anthropic SAIU daqui (Phase 49). Esta linha é o RESULTADO da
    //   chamada OpenAI, que não teve erro nenhum — carregar a mensagem da Anthropic fazia
    //   com que `provider=openai` aparecesse com `error_message: "Request timed out."`,
    //   exatamente o registro enganoso do guia de 06/09. A mensagem agora mora na linha da
    //   tentativa Anthropic, ao lado da causa que ela explica.
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
    // D-28: o modelo real do fallback. Quem grava `modelo_ia` NÃO pode gravar o Sonnet
    // configurado — foi exatamente isso que aconteceu nos 17 fallbacks de PROD.
    model: response.model ?? OPENAI_FALLBACK_MODEL,
    log_id: logId,
    replayed: false,
    fallback_cause: a.causa,
  };
}
