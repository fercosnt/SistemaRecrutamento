/**
 * Phase 9 / Plan 09-01 Task 2 — Wave 0 RED scaffold for `_shared/ai-client.ts`.
 *
 * Gates IA-02 / IA-03 / IA-04 — the core orchestration helper. Flips GREEN in
 * Plan 09-05 when `ai-client.ts` lands `callAi()` (Anthropic-first, OpenAI
 * fallback, PII masking, cost calc, ai_call_logs INSERT).
 *
 * ── NO real API call happens (orchestrator-decision #2) ──
 * Both the Anthropic SDK and the OpenAI SDK are MOCKED via dependency injection
 * (the `deps` argument), and the Supabase client is a hand-rolled spy. There is
 * NO `npm:@anthropic-ai/sdk` / `npm:openai` import in this file and NO network
 * import — so the test never touches the real APIs. The real client lands in
 * Plan 05 wired to `npm:@anthropic-ai/sdk@0.102.0` / `npm:openai@6.42.0` /
 * `npm:zod@3.25.76` (re-verified with `npm view` at execute time — RESEARCH A1).
 *
 * ── Why this is RED now ──
 * `../ai-client.ts` does not exist yet → the dynamic import throws
 * module-not-found at run time. That is the RED assertion. The behavioral
 * fixtures below document the EXACT contract Plan 05 must satisfy.
 *
 * Run: deno test --allow-read supabase/functions/_shared/__tests__/ai-client.test.ts
 *
 * @see docs/conhecimento/prompts/templates/08-edge-function-reference.ts (reference body)
 * @see .planning/phases/09-ai-prompt-library-cost-infra/09-RESEARCH.md (Patterns 1-3, IA-02/03/04)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
// CR-01 (Phase 23): logAiCall is exercised directly against a schema-faithful mock
// (idempotency_key UNIQUE) to prove the retry-after-failure now UPSERTs instead of
// colliding. Imported from the source module (audit-logger) it lives in.
import { type AiCallLogRow, logAiCall } from "../audit-logger.ts";

// ── Mock Anthropic SDK ──────────────────────────────────────────────────────
// A fake `messages.parse()` that records BOTH the request shape AND the per-call
// options arg (RESIL-01 — Pitfall 2: a missing timeout/maxRetries:0 must be caught
// by asserting on the recorded options). Returns a fixture carrying
// usage.cache_read_input_tokens (so cost calc can prove cache billing).
function makeMockAnthropic(opts: { failTimes?: number; error?: Error } = {}) {
  // Each entry is a [req, opts] tuple — opts is the 2nd positional RequestOptions
  // arg callAi now passes ({ timeout, maxRetries: 0 }).
  const calls: [unknown, unknown][] = [];
  let remainingFailures = opts.failTimes ?? 0;
  // Default failure = the REAL SDK timeout shape (AI-03): `APIConnectionTimeoutError`
  // with message "Request timed out." (verified against the official Anthropic/OpenAI
  // SDK source). The old default "529 overloaded" MASKED the bug — it matched
  // /overloaded/i so the retry test passed even though the literal timeout message
  // never matched the old /timeout/i regex. This shape exercises the widened matcher
  // (err.name === "APIConnectionTimeoutError" OR /tim(e|ed)\s*out/i).
  // Tests that want a NON-retryable failure inject `error` explicitly.
  const failureError = opts.error ??
    Object.assign(new Error("Request timed out."), { name: "APIConnectionTimeoutError" });
  return {
    calls,
    messages: {
      parse: (req: unknown, callOpts?: unknown) => {
        calls.push([req, callOpts]);
        if (remainingFailures > 0) {
          remainingFailures--;
          return Promise.reject(failureError);
        }
        return Promise.resolve({
          parsed_output: { resumo: "ok", bias_flags: { has_demographic_proxy: false } },
          usage: { input_tokens: 1000, cache_read_input_tokens: 300, output_tokens: 200 },
        });
      },
    },
  };
}

// ── Mock OpenAI SDK ─────────────────────────────────────────────────────────
// Phase 49 / JORN-28: a resposta passou a carregar `model`. A API real devolve a versão
// DATADA (`gpt-4o-mini-2024-07-18`), distinta do alias pedido (`gpt-4o-mini`) — e é
// justamente essa distinção que prova que `CallAiResult.model` é o modelo REAL e não um
// eco do que foi pedido. Sem o campo, os dois valores coincidiriam e o teste seria vácuo.
const MODELO_OPENAI_REAL = "gpt-4o-mini-2024-07-18";

function makeMockOpenAI() {
  const calls: unknown[] = [];
  return {
    calls,
    chat: {
      completions: {
        parse: (req: unknown) => {
          calls.push(req);
          return Promise.resolve({
            choices: [{ message: { parsed: { resumo: "fallback", bias_flags: { has_demographic_proxy: false } } } }],
            usage: { prompt_tokens: 800, completion_tokens: 150 },
            model: MODELO_OPENAI_REAL,
          });
        },
      },
    },
  };
}

// ── Mock Supabase client (records ai_call_logs INSERTs) ─────────────────────
function makeMockSupabase() {
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  return {
    inserts,
    from(table: string) {
      return {
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row });
          return Promise.resolve({ data: null, error: null });
        },
        // CR-01: logAiCall UPSERTs when a call carries an idempotency_key. The real
        // SupabaseClient exposes `.upsert`; the mock must model it (mock-vs-real gap).
        upsert: (row: Record<string, unknown>, _opts?: { onConflict?: string }) => {
          inserts.push({ table, row });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
}

// ── Mock Supabase with an idempotency-replay row (AI-05) ─────────────────────
// Implements the `from("ai_call_logs").select(...).eq(...).maybeSingle()` chain
// that tryIdempotencyReplay probes, returning `row` (or null). Also spies inserts
// so a fresh call (when replay is skipped) still writes an ai_call_logs row.
function makeMockSupabaseWithReplay(row: Record<string, unknown> | null) {
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  return {
    inserts,
    from(table: string) {
      return {
        insert: (r: Record<string, unknown>) => {
          inserts.push({ table, row: r });
          return Promise.resolve({ data: null, error: null });
        },
        // CR-01: the fresh keyed retry (after a cached failure) reaches logAiCall,
        // which now UPSERTs on idempotency_key instead of a colliding plain insert.
        upsert: (r: Record<string, unknown>, _opts?: { onConflict?: string }) => {
          inserts.push({ table, row: r });
          return Promise.resolve({ data: null, error: null });
        },
        select: (_columns: string) => ({
          eq: (_column: string, _value: unknown) => ({
            maybeSingle: () => Promise.resolve({ data: row, error: null }),
          }),
        }),
      };
    },
  };
}

// ── Mock Supabase for the AI-06 cost kill-switch (Phase 23) ──────────────────
// The pre-call kill-switch probes
//   from("ai_call_logs").select("cost_usd").eq("vaga_id",…).eq("success",true).gte("created_at",…)
// and AWAITS the builder for `{ data: rows[], error }` (the real PostgREST filter
// builder is chainable AND thenable). This mock returns a chainable/thenable
// builder resolving to `rows`, and still spies inserts so the `cost_cap_exceeded`
// audit row is recorded. `throwOnSelect` exercises the FAIL-OPEN path (a lookup
// that throws must NOT block the call — the DB trigger is the backstop).
function makeMockSupabaseWithCostLogs(
  rows: Array<{ cost_usd: number }>,
  opts: { throwOnSelect?: boolean } = {},
) {
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  const builder = {
    eq: (_c: string, _v: unknown) => builder,
    gte: (_c: string, _v: unknown) => builder,
    then: (resolve: (r: { data: typeof rows; error: null }) => unknown) =>
      resolve({ data: rows, error: null }),
  };
  return {
    inserts,
    from(table: string) {
      return {
        insert: (r: Record<string, unknown>) => {
          inserts.push({ table, row: r });
          return Promise.resolve({ data: null, error: null });
        },
        // CR-01: model the real client's upsert surface (logAiCall may UPSERT).
        upsert: (r: Record<string, unknown>, _opts?: { onConflict?: string }) => {
          inserts.push({ table, row: r });
          return Promise.resolve({ data: null, error: null });
        },
        select: (_columns: string) => {
          if (opts.throwOnSelect) throw new Error("cost lookup boom");
          return builder;
        },
      };
    },
  };
}

// ── Phase 49 / JORN-28 — mocks da taxonomia de causa ────────────────────────
/**
 * Símbolo do marcador de falha de parse. `Symbol.for` é registro GLOBAL: o teste
 * constrói o MESMO símbolo que `ai-client.ts` usa sem precisar exportá-lo.
 * O papel deste mock é simular o que o SDK 0.102.0 devolve DEPOIS do embrulho do
 * formato: em vez de lançar `AnthropicError`, ele resolve com a mensagem inteira e
 * `parsed_output` carregando o marcador — junto de `stop_reason` e `usage`.
 */
const FALHA_PARSE = Symbol.for("callAi.falhaParse");
/** Modelo datado devolvido pelo mock Anthropic — distinto do alias configurado. */
const MODELO_SONNET_REAL = "claude-sonnet-4-6-20260514";

/**
 * Anthropic que RESPONDE (não lança) com um `stop_reason` escolhido e, opcionalmente, o
 * marcador de falha de parse. É a forma das três falhas determinísticas: truncamento
 * (`max_tokens`), fora do schema (`end_turn` + marcador) e recusa (`refusal`).
 */
function makeMockAnthropicComStopReason(
  stop_reason: string,
  opts: { comFalhaParse?: boolean } = {},
) {
  const calls: [unknown, unknown][] = [];
  return {
    calls,
    messages: {
      parse: (req: unknown, callOpts?: unknown) => {
        calls.push([req, callOpts]);
        return Promise.resolve({
          // O truncamento devolve JSON cortado → o `parse` do formato lança → o embrulho
          // devolve o marcador. O `refusal` vem sem marcador (não houve texto a parsear).
          parsed_output: opts.comFalhaParse
            ? { [FALHA_PARSE]: new Error("Failed to parse structured output as JSON") }
            : { resumo: "ok" },
          usage: { input_tokens: 4445, cache_read_input_tokens: 0, output_tokens: 3000 },
          model: MODELO_SONNET_REAL,
          stop_reason,
        });
      },
    },
  };
}

/**
 * Supabase cujo insert/upsert devolve um BUILDER com `.select("id").single()`, como o
 * PostgREST real — é a única forma de `logAiCall` conseguir o `id` da linha (D-38).
 * Guarda as linhas na ordem de escrita para que as DUAS linhas de um fallback possam ser
 * conferidas uma a uma.
 */
function makeMockSupabaseComId(prefixoId = "log") {
  const inserts: { table: string; row: Record<string, unknown>; id: string; via: string }[] = [];
  let n = 0;
  const gravar = (table: string, row: Record<string, unknown>, via: string) => {
    const id = `${prefixoId}-${++n}`;
    inserts.push({ table, row, id, via });
    // Builder: thenable (para quem só faz `await`) E com `.select` (para quem quer o id).
    return {
      then: (resolve: (r: { data: null; error: null }) => unknown) =>
        resolve({ data: null, error: null }),
      select: (_cols: string) => ({
        single: () => Promise.resolve({ data: { id }, error: null }),
      }),
    };
  };
  return {
    inserts,
    /** Só as linhas de `ai_call_logs`, na ordem de escrita. */
    get logs() {
      return inserts.filter((i) => i.table === "ai_call_logs");
    },
    from(table: string) {
      return {
        insert: (row: Record<string, unknown>) => gravar(table, row, "insert"),
        upsert: (row: Record<string, unknown>, _o?: { onConflict?: string }) =>
          gravar(table, row, "upsert"),
      };
    },
  };
}

// Prompt-version fixture as `prompt-loader` would return it.
const SONNET_PROMPT = {
  call_type: "cv_job_match",
  model_id: "claude-sonnet-4-6",
  fallback_model_id: "gpt-4o-mini",
  prompt_version: "1.0.0",
  system_template: "You are an impartial recruiter assistant.",
  max_tokens: 2000,
  temperature: 0,
};
const HAIKU_PROMPT = { ...SONNET_PROMPT, call_type: "cv_summary", model_id: "claude-haiku-4-5" };

// RED until Plan 09-05. `callAi` is expected to accept injected deps so the test
// never constructs a real SDK client.
async function loadClient() {
  const mod = await import("../ai-client.ts");
  return mod as {
    callAi: (
      args: {
        prompt: typeof SONNET_PROMPT;
        rawInput: string;
        vagaRubricBlock: string;
        candidato_id: string;
        vaga_id: string;
        // Real CallAiArgs (ai-client.ts:192) already carries the optional
        // per-call timeout override (added Phase 18/21). The local shape must
        // mirror it so the P21 override test (`timeoutMs: 60_000` below) type-checks.
        timeoutMs?: number;
        // idempotency_key drives tryIdempotencyReplay (AI-05 tests below).
        idempotency_key?: string;
        /** Schema de saída — entra na impressão digital da chave (2026-09-06). */
        schema?: unknown;
      },
      deps: {
        anthropic: unknown;
        openai: unknown;
        supabase: unknown;
        breaker?: { canRequest(): boolean; recordSuccess(): void; recordFailure(): void };
        /** Builders de structured output — o da Anthropic entra na impressão digital. */
        zodOutputFormat?: (schema: unknown, name: string) => unknown;
        zodResponseFormat?: (schema: unknown, name: string) => unknown;
        /** Orçamento total injetável (ver ai-client-budget.test.ts). */
        totalBudgetMs?: number;
      },
    ) => Promise<
      {
        provider: string;
        parsed: unknown;
        cost_usd: number;
        cache_hit?: boolean;
        error_code?: string;
        // AI-06 kill-switch (Phase 23): over-cap returns a 'hold' result flagged
        // for human review — never an auto-reject (RNF-07a).
        flagged_for_human_review?: boolean;
        // Phase 49 / JORN-28 (D-28/D-38): proveniência real no retorno.
        model?: string | null;
        log_id?: string | null;
        replayed?: boolean;
        fallback_cause?: string | null;
      }
    >;
  };
}

const baseArgs = {
  rawInput: "CPF 123.456.789-09 e email candidato@example.com no CV.",
  vagaRubricBlock: "Rubric: BARS scale 1-5.",
  candidato_id: "11111111-1111-1111-1111-111111111111",
  vaga_id: "22222222-2222-2222-2222-222222222222",
};

Deno.test("IA-02 — callAi masks PII before any log write (no raw CPF/email in ai_call_logs)", async () => {
  const { callAi } = await loadClient();
  const supabase = makeMockSupabase();
  await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic: makeMockAnthropic(),
    openai: makeMockOpenAI(),
    supabase,
  });
  const logged = JSON.stringify(supabase.inserts);
  assert(!logged.includes("123.456.789-09"), "raw CPF must never reach ai_call_logs");
  assert(!logged.includes("candidato@example.com"), "raw email must never reach ai_call_logs");
});

Deno.test("IA-03 — callAi picks Haiku for cv_summary, Sonnet for other call_types", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  await callAi({ prompt: HAIKU_PROMPT, ...baseArgs }, {
    anthropic, openai: makeMockOpenAI(), supabase: makeMockSupabase(),
  });
  const req = anthropic.calls[0][0] as { model: string };
  assertEquals(req.model, "claude-haiku-4-5", "cv_summary must route to Haiku");

  const anthropic2 = makeMockAnthropic();
  await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic: anthropic2, openai: makeMockOpenAI(), supabase: makeMockSupabase(),
  });
  assertEquals((anthropic2.calls[0][0] as { model: string }).model, "claude-sonnet-4-6");
});

Deno.test("IA-03 — callAi emits system + (vaga+rubric) blocks with cache_control ephemeral", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic, openai: makeMockOpenAI(), supabase: makeMockSupabase(),
  });
  const req = anthropic.calls[0][0] as { system: Array<{ cache_control?: { type: string } }> };
  assert(Array.isArray(req.system) && req.system.length >= 2, "system must be 2+ cached blocks");
  for (const block of req.system) {
    assertEquals(block.cache_control?.type, "ephemeral", "each system block must be ephemeral-cached");
  }
});

Deno.test("IA-04 — when the breaker is OPEN, callAi routes to OpenAI gpt-4o-mini", async () => {
  const { callAi } = await loadClient();
  const openai = makeMockOpenAI();
  const openBreaker = { canRequest: () => false, recordSuccess() {}, recordFailure() {} };
  const result = await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic: makeMockAnthropic(), openai, supabase: makeMockSupabase(), breaker: openBreaker,
  });
  assertEquals(result.provider, "openai");
  // Phase 49 / JORN-28: antes assertia `error_code === "anthropic_circuit_open"`; mudou
  // porque o `error_code` do RESULTADO passou a levar o prefixo `fallback_` em TODO
  // caminho de fallback. Sem o prefixo, a tela do admin lê a linha como «Sucesso» —
  // um resultado do gpt-4o-mini apresentado como se fosse do Sonnet configurado. A
  // causa crua continua disponível, agora em `fallback_cause`.
  assertEquals(result.error_code, "fallback_anthropic_circuit_open");
  assertEquals(result.fallback_cause, "anthropic_circuit_open");
  assertEquals((openai.calls[0] as { model: string }).model, "gpt-4o-mini");
});

// ── AI-02 (Phase 23) — o MESMO CircuitBreaker acumula falhas entre chamadas e ABRE ──
// O bug histórico: cada callAi criava um `new CircuitBreaker()` novo → o contador
// zerava toda chamada e o disjuntor nunca abria. Agora o default é o sharedBreaker
// e as falhas ACUMULAM. Aqui injetamos uma instância FRESH própria (Pitfall 3 — NUNCA
// o sharedBreaker, para não poluir o resto do corpus) e provamos que ela abre.
Deno.test("AI-02 — o mesmo CircuitBreaker acumula falhas entre chamadas e ABRE (roteia OpenAI)", async () => {
  const { callAi } = await loadClient();
  const { CircuitBreaker } = await import("../circuit-breaker.ts");
  // THRESHOLD explícito (3) p/ determinismo; erro NÃO-retriável (400) → cada callAi
  // quebra na 1ª tentativa (1 recordFailure, sem sleep de backoff).
  const breaker = new CircuitBreaker(3) as {
    canRequest(): boolean;
    recordSuccess(): void;
    recordFailure(): void;
  };
  const openai = makeMockOpenAI();
  const nonRetryable = () => makeMockAnthropic({ failTimes: 999, error: new Error("bad request 400") });

  // 3 chamadas → 3 falhas acumuladas no MESMO breaker → OPEN.
  for (let i = 0; i < 3; i++) {
    const r = await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
      anthropic: nonRetryable(), openai, supabase: makeMockSupabase(), breaker,
    });
    assertEquals(r.provider, "openai", "cada falha não-retriável cai p/ OpenAI");
  }
  assertEquals(
    breaker.canRequest(),
    false,
    "o breaker deve ABRIR após THRESHOLD(3) falhas acumuladas ENTRE chamadas",
  );

  // 4ª chamada: breaker OPEN → roteia direto p/ OpenAI SEM tocar Anthropic.
  const anthropic = makeMockAnthropic({ failTimes: 999, error: new Error("bad request 400") });
  const last = await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic, openai, supabase: makeMockSupabase(), breaker,
  });
  assertEquals(last.provider, "openai");
  // Phase 49 / JORN-28: antes assertia `"anthropic_circuit_open"`; mudou pelo prefixo
  // `fallback_` (mesma razão do teste IA-04 acima). A distinção que este teste protege —
  // disjuntor aberto ≠ tentativas esgotadas — segue trancada, agora em `fallback_cause`.
  assertEquals(
    last.error_code,
    "fallback_anthropic_circuit_open",
    "breaker OPEN → fallback_anthropic_circuit_open (não uma causa de tentativa)",
  );
  assertEquals(last.fallback_cause, "anthropic_circuit_open");
  assertEquals(anthropic.calls.length, 0, "com o breaker OPEN, a Anthropic NÃO é chamada de novo");
});

Deno.test("IA-02/03/04 — callAi INSERTs an ai_call_logs row with the audit columns", async () => {
  const { callAi } = await loadClient();
  const supabase = makeMockSupabase();
  await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic: makeMockAnthropic(), openai: makeMockOpenAI(), supabase,
  });
  const logRow = supabase.inserts.find((i) => i.table === "ai_call_logs");
  assert(logRow, "an ai_call_logs row must be inserted");
  // 2026-09-05: a lista trazia "output" — coluna que NUNCA existiu em ai_call_logs. O
  // teste pinava a coluna fantasma que fazia TODO INSERT falhar com PGRST204 em PROD
  // (a tabela ficou com 1 linha desde 22/08). O output bruto vive em `raw_response`.
  for (const col of ["prompt_version", "model_id", "input_hash", "raw_response", "cost_usd"]) {
    assert(col in logRow!.row, `ai_call_logs row must carry "${col}"`);
  }
  assert(!("output" in logRow!.row), 'ai_call_logs row must NOT carry "output" — coluna inexistente (PGRST204)');
});

// ── RESIL-01 — per-call timeout + maxRetries:0 reach the provider ────────────
// Pitfall 2 regression: if the { timeout, maxRetries: 0 } 2nd arg is ever dropped
// from `messages.parse(...)`, this test fails. Without it the EF inherits the SDK
// default timeout (10-60min) + maxRetries:2 (3x3=9 calls) and hangs past the 150s
// idle ceiling (the live 38-102s achado #1).
Deno.test("RESIL-01 — per-call timeout + maxRetries:0 passed to messages.parse", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic, openai: makeMockOpenAI(), supabase: makeMockSupabase(),
  });
  const [, opts] = anthropic.calls[0] as [unknown, { timeout?: number; maxRetries?: number }];
  assert(opts, "the 2nd positional options arg must be passed to messages.parse");
  assertEquals(opts.maxRetries, 0, "maxRetries MUST be 0 — the hand-rolled loop owns retry (Pitfall 1)");
  assert(
    typeof opts.timeout === "number" && opts.timeout > 0,
    "a finite per-call timeout > 0 MUST be passed (Pitfall 2: no cap = 60min hang)",
  );
});

// ── RESIL-01 — env defaults apply when env vars are unset ────────────────────
// AI_CALL_TIMEOUT_MS / MAX_ATTEMPTS are default-guarded so absence in PROD is
// non-breaking: the call still proceeds and carries the default 25000ms timeout.
Deno.test("RESIL-01 — default timeout (25000) applies when AI_CALL_TIMEOUT_MS unset", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  const result = await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic, openai: makeMockOpenAI(), supabase: makeMockSupabase(),
  });
  assertEquals(result.provider, "anthropic", "call must proceed with the default env config");
  const [, opts] = anthropic.calls[0] as [unknown, { timeout?: number }];
  assertEquals(opts.timeout, 25000, "default AI_CALL_TIMEOUT_MS must be 25000 when env is unset");
});

// ── P21 — per-call timeoutMs override reaches the provider ────────────────────
// gerar-guia-entrevista's heavy structured-output generation legitimately exceeds the
// 25s global default and was timing out → 500 in PROD. A per-call `timeoutMs` override
// must reach messages.parse so such EFs get more time WITHOUT loosening the global
// fast-fail. Absence of timeoutMs keeps the 25000 default (asserted above).
Deno.test("P21 — per-call timeoutMs overrides the global default at messages.parse", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  await callAi({ prompt: SONNET_PROMPT, ...baseArgs, timeoutMs: 60_000 }, {
    anthropic, openai: makeMockOpenAI(), supabase: makeMockSupabase(),
  });
  const [, opts] = anthropic.calls[0] as [unknown, { timeout?: number }];
  assertEquals(opts.timeout, 60_000, "per-call timeoutMs must override AI_CALL_TIMEOUT_MS");
});

// ── AI-03 — the REAL SDK timeout shape is retried by the existing loop ────────
// The { timeout } route throws an `APIConnectionTimeoutError` with message
// "Request timed out." (makeMockAnthropic's default failure). isRetryable matches
// it by `err.name === "APIConnectionTimeoutError"` AND the widened regex
// `/tim(e|ed)\s*out/i` — NOT the old `/timeout/i`, which failed on the space in
// "timed out" and made the timeout fatal on attempt 1. `failTimes: 1` = one timeout
// failure, then success on attempt 2. Regression guard for the masking bug: the old
// mock used "529 overloaded" (matched /overloaded/i) so this test never exercised
// the literal timeout message.
Deno.test("AI-03 — real timeout shape (APIConnectionTimeoutError / 'Request timed out.') stays retryable", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic({ failTimes: 1 });
  const result = await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic, openai: makeMockOpenAI(), supabase: makeMockSupabase(),
  });
  assertEquals(result.provider, "anthropic", "must succeed on the retry, not fall to OpenAI");
  assertEquals(anthropic.calls.length, 2, "the loop must make a 2nd real attempt after the timeout failure");
  // EACH attempt must carry the maxRetries:0 + timeout options (not just the first).
  for (const [, opts] of anthropic.calls as [unknown, { timeout?: number; maxRetries?: number }][]) {
    assertEquals(opts.maxRetries, 0, "every attempt must disable SDK retry");
    assert(typeof opts.timeout === "number" && opts.timeout > 0, "every attempt must carry a finite timeout");
  }
});

// ── AI-04 — retry-budget cap: a long per-call timeout reduces the attempt count ─
// With timeoutMs=60_000 (>25s), effectiveMaxAttempts = min(MAX_ATTEMPTS(3),
// floor(140000/60000)=2) = 2. So even though the mock keeps failing (failTimes: 2),
// the loop makes at MOST 2 real attempts before falling to OpenAI — 3×60s + backoff
// would blow the ~150s EF idle ceiling. Guards T-23-01-01 (financial DoS).
Deno.test("AI-04 — retry-budget cap: timeoutMs 60s → 2 attempts (not 3), then OpenAI fallback", async () => {
  const { callAi } = await loadClient();
  // Inject a FRESH breaker (Pitfall 3): 2 failures here would otherwise linger on
  // the shared singleton and pollute later tests in this file.
  const { CircuitBreaker } = await import("../circuit-breaker.ts");
  const breaker = new CircuitBreaker(99) as {
    canRequest(): boolean;
    recordSuccess(): void;
    recordFailure(): void;
  };
  const anthropic = makeMockAnthropic({ failTimes: 2 }); // both attempts time out
  const result = await callAi({ prompt: SONNET_PROMPT, ...baseArgs, timeoutMs: 60_000 }, {
    anthropic, openai: makeMockOpenAI(), supabase: makeMockSupabase(), breaker,
  });
  assertEquals(anthropic.calls.length, 2, "the cap must limit long-timeout calls to 2 attempts (floor(140000/60000))");
  assertEquals(result.provider, "openai", "after the capped attempts exhaust, callAi falls to OpenAI");
  // Phase 49 / JORN-28 (Task 1): antes assertia `"anthropic_retries_exhausted"`; mudou
  // pelo prefixo `fallback_`. A causa crua ainda é a legada aqui — o caminho de EXCEÇÃO
  // (timeout/429/erro da API) só ganha taxonomia própria na Task 2, que reaponta esta
  // asserção para `fallback_anthropic_timeout` (o mock falha com APIConnectionTimeoutError).
  assertEquals(
    result.error_code,
    "fallback_anthropic_retries_exhausted",
    "fallback cause = retries exhausted (breaker was CLOSED)",
  );
});

// ── AI-05 — idempotency replay only replays SUCCESS rows ─────────────────────
// A cached FAILURE (success=false) must NOT be returned as a terminal result — it
// should fall through to a fresh provider call so the RH can reprocess. A cached
// SUCCESS (success=true) replays with cache_hit + cost 0 and touches no provider.
Deno.test("AI-05 — a cached FAILURE (success=false) is NOT replayed → fresh provider call", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  const supabase = makeMockSupabaseWithReplay({
    provider: "anthropic",
    success: false, // a prior transient failure
    output: null,
    error_code: "anthropic_retries_exhausted",
  });
  const result = await callAi(
    { prompt: SONNET_PROMPT, ...baseArgs, idempotency_key: "cand:transcript" },
    { anthropic, openai: makeMockOpenAI(), supabase },
  );
  // The definitive discriminator between "replay" and "fresh call" is whether the
  // provider was invoked. (The `cache_hit` field is overloaded: a fresh call can still
  // report cache_hit=true from an EPHEMERAL PROMPT-cache read — distinct from an
  // idempotency replay — so it is not a reliable signal here.)
  assertEquals(anthropic.calls.length, 1, "a cached failure must NOT short-circuit — the provider IS called");
  assertEquals(result.provider, "anthropic", "the fresh call succeeds and returns anthropic, not the cached failure");
  assertEquals(result.error_code, undefined, "the fresh success carries no error_code (not the cached failure's)");
});

Deno.test("AI-05 — a cached SUCCESS (success=true) IS replayed → no provider call, cost 0", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  const supabase = makeMockSupabaseWithReplay({
    provider: "anthropic",
    success: true,
    output: { resumo: "cacheado", bias_flags: { has_demographic_proxy: false } },
    cost_usd: 0.0123,
    error_code: null,
  });
  const result = await callAi(
    { prompt: SONNET_PROMPT, ...baseArgs, idempotency_key: "cand:transcript" },
    { anthropic, openai: makeMockOpenAI(), supabase },
  );
  assertEquals(anthropic.calls.length, 0, "a cached SUCCESS must replay WITHOUT touching the provider");
  assertEquals(result.cache_hit, true, "replay must flag cache_hit");
  assertEquals(result.cost_usd, 0, "replay must not re-bill (cost_usd 0 — original already accounted)");
  assertEquals(result.provider, "anthropic", "replay echoes the original provider");
});

// ── AI-06 — pre-call cost kill-switch (RUNTIME spend cut) ────────────────────
// The cost guardrail chain has 4 holes (window ~25h, daily-slice scope, dead
// candidate channel, silent dispatch). The ONLY fix that actually cuts spend at
// runtime is a pre-call cap in the EF: BEFORE any provider call, sum the day's
// cost_usd for the vaga and refuse new calls above AI_DAILY_COST_CAP_USD. It is
// the operational HARD cap — distinct from the business threshold (R$200/mês per
// vaga) that the trigger/cost-alerter cover with a 1-day lag.
//
// RNF-07a: over-cap returns a 'hold' + flagged_for_human_review — NEVER an
// auto-reject. The kill-switch must never become a silent candidate-rejection path.
Deno.test("AI-06 — over-cap: kill-switch refuses the call (0 provider calls, hold + human review)", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  const openai = makeMockOpenAI();
  // Two success rows for the day summing 2.5 > cap 1.
  const supabase = makeMockSupabaseWithCostLogs([{ cost_usd: 1.5 }, { cost_usd: 1.0 }]);
  Deno.env.set("AI_DAILY_COST_CAP_USD", "1");
  try {
    const result = await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, { anthropic, openai, supabase });
    assertEquals(result.error_code, "cost_cap_exceeded", "over-cap → error_code cost_cap_exceeded");
    assertEquals(result.provider, "none", "over-cap → NO provider is called");
    assertEquals(result.cost_usd, 0, "a refused call bills nothing");
    assertEquals(result.flagged_for_human_review, true, "RNF-07a: hold + human review, never auto-reject");
    assertEquals(
      (result.parsed as { recommendation?: string }).recommendation,
      "hold",
      "the refused result recommends 'hold' — never 'reject'",
    );
    assertEquals(anthropic.calls.length, 0, "Anthropic MUST NOT be called over-cap");
    assertEquals(openai.calls.length, 0, "OpenAI MUST NOT be called over-cap (no fallback for a cost refusal)");
    const capLog = supabase.inserts.find(
      (i) => i.table === "ai_call_logs" && i.row.error_code === "cost_cap_exceeded",
    );
    assert(capLog, "a cost_cap_exceeded ai_call_logs row must be recorded");
    assertEquals(capLog!.row.success, false, "the audit row marks the refusal as success=false");
  } finally {
    Deno.env.delete("AI_DAILY_COST_CAP_USD");
  }
});

// ── CR-01 — logAiCall must UPSERT on idempotency_key (retry-after-failure) ────
// `ai_call_logs.idempotency_key` is `text UNIQUE`. AI-05 makes a cached FAILURE fall
// through to a FRESH provider call that REUSES the same key; a plain second INSERT
// would collide (23505) with the stale success=false row, the error would be swallowed,
// and the retry outcome would NEVER persist (audit broken, its real spend invisible to
// the AI-06 cap `WHERE success=true`, and it never converges). The other mocks in this
// file are plain spies with NO uniqueness enforcement — exactly why this collision was
// invisible at the unit level (mock-vs-real-schema gap, cf. feedback_integration_contract_gap).
// This mock models the constraint: a duplicate PLAIN insert of a non-null key raises
// 23505 (as the DB would), NULL keys are always distinct (Postgres treats NULLs as
// non-equal in a UNIQUE index), and the upsert path overwrites.
function makeUniquenessEnforcingSupabase() {
  const byKey = new Map<string, Record<string, unknown>>();
  const nullKeyRows: Record<string, unknown>[] = [];
  const dupErrors: string[] = [];
  return {
    byKey,
    nullKeyRows,
    dupErrors,
    from(_table: string) {
      return {
        insert: (row: Record<string, unknown>) => {
          const key = row.idempotency_key;
          if (key == null) {
            nullKeyRows.push(row); // NULL keys never dedup
            return Promise.resolve({ data: null, error: null });
          }
          if (byKey.has(String(key))) {
            // UNIQUE violation — exactly what the real INSERT raises against the stale row.
            dupErrors.push(String(key));
            return Promise.resolve({
              data: null,
              error: {
                code: "23505",
                message:
                  'duplicate key value violates unique constraint "ai_call_logs_idempotency_key_key"',
              },
            });
          }
          byKey.set(String(key), row);
          return Promise.resolve({ data: null, error: null });
        },
        upsert: (row: Record<string, unknown>, _opts?: { onConflict?: string }) => {
          const key = row.idempotency_key;
          if (key == null) {
            nullKeyRows.push(row);
          } else {
            byKey.set(String(key), row); // onConflict overwrite — latest outcome wins
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
}

// A minimal valid AiCallLogRow carrying the audit fields the logger requires.
function aiCallLogRow(overrides: Partial<AiCallLogRow>): AiCallLogRow {
  return {
    candidato_id: "11111111-1111-1111-1111-111111111111",
    vaga_id: "22222222-2222-2222-2222-222222222222",
    call_type: "interview_transcript",
    prompt_version_id: "33333333-3333-3333-3333-333333333333",
    prompt_hash: "deadbeef",
    provider: "anthropic",
    model_id: "claude-sonnet-4-6",
    system_prompt: "sys",
    user_prompt_template: "template sem PII",
    input_token_count: 10,
    raw_response: { ok: true },
    output_token_count: 5,
    latency_ms: 100,
    attempt_number: 1,
    cost_usd: 0,
    success: true,
    ...overrides,
  };
}

Deno.test("CR-01 — the uniqueness-enforcing mock rejects a duplicate PLAIN insert (models the real 23505)", () => {
  // Guards against a vacuous regression test: prove the mock actually enforces the
  // UNIQUE(idempotency_key) constraint before relying on it below.
  const supabase = makeUniquenessEnforcingSupabase();
  const table = supabase.from("ai_call_logs");
  return table.insert({ idempotency_key: "k", success: false }).then((first) => {
    assertEquals(first.error, null, "the first insert of a key succeeds");
    return table.insert({ idempotency_key: "k", success: true }).then((second) => {
      assert(second.error, "a second PLAIN insert of the same non-null key MUST raise a unique violation");
      assertEquals(
        (second.error as { code: string }).code,
        "23505",
        "the collision is a 23505 unique_violation (the real schema constraint)",
      );
    });
  });
});

Deno.test("CR-01 — logAiCall UPSERTs on idempotency_key so a retry after a cached FAILURE persists (no 23505 collision)", async () => {
  const supabase = makeUniquenessEnforcingSupabase();
  const KEY = "cand:transcript";

  // 1) A transient FAILURE lands first with the stable key (success=false, cost 0).
  await logAiCall(
    supabase,
    aiCallLogRow({ idempotency_key: KEY, success: false, error_code: "anthropic_retries_exhausted", cost_usd: 0 }),
  );

  // 2) AI-05 unlocks a FRESH retry; its real (paid) SUCCESS reaches logAiCall with the
  //    SAME key. With the OLD insert-only path this collides (23505) and is swallowed →
  //    the outcome never persists. With the CR-01 upsert fix it OVERWRITES the stale row.
  await logAiCall(
    supabase,
    aiCallLogRow({ idempotency_key: KEY, success: true, cost_usd: 0.0231 }),
  );

  // Exactly ONE row for the key (schema invariant preserved), and it is the SUCCESS —
  // the retry converged and its spend is now visible to the AI-06 cost kill-switch.
  assertEquals(supabase.byKey.size, 1, "exactly one ai_call_logs row per idempotency_key");
  const stored = supabase.byKey.get(KEY)!;
  assertEquals(stored.success, true, "the retried SUCCESS must OVERWRITE the stale failed row (AI-05)");
  assertEquals(
    stored.cost_usd,
    0.0231,
    "the retry's real spend now persists → visible to the AI-06 cap (WHERE success=true)",
  );
  assertEquals(supabase.dupErrors.length, 0, "logAiCall must NOT hit the swallowed-23505 insert path for a keyed retry");
});

Deno.test("CR-01 — a NULL idempotency_key uses plain insert and never dedups (each call is a distinct row)", async () => {
  const supabase = makeUniquenessEnforcingSupabase();
  await logAiCall(supabase, aiCallLogRow({ idempotency_key: null }));
  await logAiCall(supabase, aiCallLogRow({ idempotency_key: undefined }));
  assertEquals(
    supabase.nullKeyRows.length,
    2,
    "two null-key calls must persist as two distinct rows (NULLs are distinct in the UNIQUE)",
  );
  assertEquals(supabase.byKey.size, 0, "no keyed row is written for null-key calls");
  assertEquals(supabase.dupErrors.length, 0, "null-key inserts never collide");
});

Deno.test("AI-06 — under-cap: the day's cost is below the cap → the call proceeds (Anthropic)", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  const supabase = makeMockSupabaseWithCostLogs([{ cost_usd: 0.10 }, { cost_usd: 0.05 }]);
  Deno.env.set("AI_DAILY_COST_CAP_USD", "50");
  try {
    const result = await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
      anthropic, openai: makeMockOpenAI(), supabase,
    });
    assertEquals(result.provider, "anthropic", "under-cap → the call proceeds normally");
    assertEquals(result.error_code, undefined, "under-cap → no cost_cap_exceeded");
    assertEquals(anthropic.calls.length, 1, "the provider IS called under-cap");
  } finally {
    Deno.env.delete("AI_DAILY_COST_CAP_USD");
  }
});

// FAIL-OPEN (T-23-03-02): a lookup that throws must NOT block the funnel. The
// cost-lookup is a guard around availability — if it breaks, the DB trigger is the
// backstop. A broken kill-switch can NEVER become a spend-blocking outage.
Deno.test("AI-06 — FAIL-OPEN: a cost-lookup error does NOT block the call", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  // select() throws → the kill-switch must swallow it and proceed.
  const supabase = makeMockSupabaseWithCostLogs([], { throwOnSelect: true });
  Deno.env.set("AI_DAILY_COST_CAP_USD", "1"); // low cap: if it did NOT fail open it could block
  try {
    const result = await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
      anthropic, openai: makeMockOpenAI(), supabase,
    });
    assertEquals(result.provider, "anthropic", "lookup error → fail-open → the call proceeds");
    assertEquals(result.error_code, undefined, "fail-open does not inject cost_cap_exceeded");
    assertEquals(anthropic.calls.length, 1, "the provider IS called (fail-open)");
  } finally {
    Deno.env.delete("AI_DAILY_COST_CAP_USD");
  }
});

// ── 2026-09-06 — a chave de idempotencia tem de cobrir o INPUT ───────────────
// Ate hoje o replay casava so pela chave do chamador (`{candidatura_id}:transcript`,
// `{candidatura_id}:{tipo}`), que nao muda quando o input muda. Medido em PROD: o RH
// clicou «Gerar guia» e recebeu o guia ANTERIOR sem nenhuma chamada nova ao modelo.
// O mesmo caminho serviria a analise de uma transcricao NOVA com as citacoes da antiga.
//
// Mock com CHAVE: ao contrario de makeMockSupabaseWithReplay (que devolve a linha para
// qualquer `eq`), este guarda um mapa chave→linha, entao so replaya quem realmente casa.
function makeMockSupabaseKeyed() {
  const rows = new Map<string, Record<string, unknown>>();
  const chaves: string[] = [];
  const gravar = (r: Record<string, unknown>) => {
    const k = r.idempotency_key;
    if (typeof k === "string") {
      chaves.push(k);
      if (r.success === true) {
        rows.set(k, {
          provider: r.provider,
          success: true,
          raw_response: r.raw_response,
          cost_usd: r.cost_usd,
          error_code: null,
        });
      }
    }
    return Promise.resolve({ data: null, error: null });
  };
  return {
    chaves,
    from(_table: string) {
      return {
        insert: gravar,
        upsert: (r: Record<string, unknown>, _o?: { onConflict?: string }) => gravar(r),
        select: (_c: string) => ({
          eq: (_col: string, valor: unknown) => ({
            maybeSingle: () =>
              Promise.resolve({ data: rows.get(String(valor)) ?? null, error: null }),
          }),
        }),
      };
    },
  };
}

Deno.test("idempotencia — MESMO input + mesma chave → replay (o provedor NAO e chamado de novo)", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  const supabase = makeMockSupabaseKeyed();
  const args = { prompt: SONNET_PROMPT, ...baseArgs, idempotency_key: "cand:transcript" };

  await callAi(args, { anthropic, openai: makeMockOpenAI(), supabase });
  const segunda = await callAi(args, { anthropic, openai: makeMockOpenAI(), supabase });

  assertEquals(anthropic.calls.length, 1, "a repeticao identica tem de replayar, nao re-cobrar");
  assertEquals(segunda.cache_hit, true);
  assertEquals(segunda.cost_usd, 0);
  assertEquals(
    (segunda as { prompt_version?: string }).prompt_version,
    SONNET_PROMPT.prompt_version,
    "o replay devolve a versao do prompt em uso",
  );
});

Deno.test("idempotencia — input DIFERENTE com a mesma chave do chamador → chamada NOVA", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  const supabase = makeMockSupabaseKeyed();

  await callAi(
    { prompt: SONNET_PROMPT, ...baseArgs, idempotency_key: "cand:transcript" },
    { anthropic, openai: makeMockOpenAI(), supabase },
  );
  await callAi(
    {
      prompt: SONNET_PROMPT,
      ...baseArgs,
      rawInput: "Uma transcricao COMPLETAMENTE diferente da primeira.",
      idempotency_key: "cand:transcript",
    },
    { anthropic, openai: makeMockOpenAI(), supabase },
  );

  assertEquals(
    anthropic.calls.length,
    2,
    "input novo NAO pode devolver a saida do input velho — era o defeito de 06/09",
  );
  assertEquals(new Set(supabase.chaves).size, 2, "as duas chamadas gravam chaves efetivas distintas");
});

Deno.test("idempotencia — mesmo input, PROMPT diferente (max_tokens) → chamada NOVA", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  const supabase = makeMockSupabaseKeyed();

  await callAi(
    { prompt: SONNET_PROMPT, ...baseArgs, idempotency_key: "cand:guia" },
    { anthropic, openai: makeMockOpenAI(), supabase },
  );
  // Espelha a migration 20260906000003: o teto subiu porque a saida vinha truncada —
  // reservir a saida truncada seria o pior resultado possivel.
  await callAi(
    { prompt: { ...SONNET_PROMPT, max_tokens: 8000 }, ...baseArgs, idempotency_key: "cand:guia" },
    { anthropic, openai: makeMockOpenAI(), supabase },
  );

  assertEquals(anthropic.calls.length, 2, "mudar max_tokens tem de invalidar o replay");
});

Deno.test("idempotencia — mesmo input, RUBRICA diferente → chamada NOVA", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  const supabase = makeMockSupabaseKeyed();

  await callAi(
    { prompt: SONNET_PROMPT, ...baseArgs, idempotency_key: "cand:transcript" },
    { anthropic, openai: makeMockOpenAI(), supabase },
  );
  // A analise de transcricao passou a receber as ancoras BARS do guia (bars-rubric.ts):
  // regerar o guia MUDA a rubrica, e a analise tem de ser refeita contra a nova.
  await callAi(
    {
      prompt: SONNET_PROMPT,
      ...baseArgs,
      vagaRubricBlock: "Rubric: ancoras BARS vindas do guia regerado.",
      idempotency_key: "cand:transcript",
    },
    { anthropic, openai: makeMockOpenAI(), supabase },
  );

  assertEquals(anthropic.calls.length, 2, "rubrica nova tem de invalidar o replay");
});


Deno.test("idempotencia — mesmo input, SCHEMA diferente → chamada NOVA", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  const supabase = makeMockSupabaseKeyed();
  // O schema é o que mais determina o formato da resposta. Medido em 2026-09-06:
  // apertar os `describe` do guia e redeployar devolveu, em <1 s e sem linha em
  // ai_call_logs, a saída do gpt-4o-mini de 40 minutos antes — a chave era idêntica.
  const format = (s: unknown, _n: string) => s;

  await callAi(
    { prompt: SONNET_PROMPT, ...baseArgs, idempotency_key: "cand:guia", schema: { campo: "descricao antiga" } },
    { anthropic, openai: makeMockOpenAI(), supabase, zodOutputFormat: format },
  );
  await callAi(
    { prompt: SONNET_PROMPT, ...baseArgs, idempotency_key: "cand:guia", schema: { campo: "descricao NOVA, mais curta" } },
    { anthropic, openai: makeMockOpenAI(), supabase, zodOutputFormat: format },
  );

  assertEquals(anthropic.calls.length, 2, "schema novo tem de invalidar o replay");
  assertEquals(new Set(supabase.chaves).size, 2, "as chaves efetivas têm de diferir");
});

// ══════════════════════════════════════════════════════════════════════════════
// Phase 49 / JORN-28 (D-27c) — «não coube» de ponta a ponta
//
// MEDIDO EM PROD antes desta fase: 17 fallbacks em `ai_call_logs`, TODOS com
// `error_code='anthropic_retries_exhausted'` — enquanto as causas reais eram timeout ×8,
// truncamento ×4 e Zod `too_big` ×5. A tentativa Anthropic cobrada (≈ US$ 0,058 no
// truncamento de 20/09) não virava linha nenhuma, e a linha do resultado dizia
// `success=true` sem registrar que quem respondeu foi o `gpt-4o-mini`.
//
// Os cinco testes abaixo (A–E) trancam o caminho inteiro de UMA causa: truncamento.
// ══════════════════════════════════════════════════════════════════════════════

// ── Teste A — duas linhas por fallback (a tentativa cobrada + o resultado) ────
Deno.test("JORN-28/A — truncamento grava DUAS linhas: a tentativa Anthropic cobrada e o resultado do fallback", async () => {
  const { callAi } = await loadClient();
  const supabase = makeMockSupabaseComId();
  // `stop_reason: 'max_tokens'` + marcador: é a forma exata do truncamento — o JSON vem
  // cortado no teto, então o `parse` do formato TAMBÉM falha. A classificação é por
  // `stop_reason` primeiro, senão «não coube» seria confundido com «fora do schema».
  const anthropic = makeMockAnthropicComStopReason("max_tokens", { comFalhaParse: true });
  const openai = makeMockOpenAI();

  const result = await callAi(
    { prompt: SONNET_PROMPT, ...baseArgs, idempotency_key: "cand:cv" },
    { anthropic, openai, supabase },
  );

  assertEquals(result.provider, "openai", "o truncamento cai para o fallback");
  assertEquals(supabase.logs.length, 2, "um fallback produz EXATAMENTE 2 linhas de ai_call_logs");

  // (i) a tentativa Anthropic — o gasto que era invisível.
  const tentativa = supabase.logs[0];
  assertEquals(tentativa.row.provider, "anthropic");
  assertEquals(tentativa.row.success, false, "a tentativa truncada NÃO é sucesso");
  assertEquals(
    tentativa.row.error_code,
    "anthropic_max_tokens",
    "«não coube» tem código próprio — não mais o genérico anthropic_retries_exhausted",
  );
  assertEquals(
    tentativa.row.idempotency_key,
    null,
    "Pitfall 1: com a chave efetiva, o upsert por chave apagaria esta linha ao gravar o resultado",
  );
  assertEquals(tentativa.via, "insert", "chave nula ⇒ insert simples, nunca upsert");
  assert(
    typeof tentativa.row.cost_usd === "number" && (tentativa.row.cost_usd as number) > 0,
    `a tentativa foi COBRADA e o custo tem de constar (veio ${tentativa.row.cost_usd})`,
  );
  // 4445 × US$3/M + 3000 × US$15/M = US$ 0,058335 — o valor medido em 20/09.
  assert(
    Math.abs((tentativa.row.cost_usd as number) - 0.058335) < 1e-6,
    `custo esperado ≈ 0,058335 (o de PROD); veio ${tentativa.row.cost_usd}`,
  );
  assertEquals(tentativa.row.model_snapshot, MODELO_SONNET_REAL, "o snapshot é o modelo que respondeu");
  // T-49-02-03: o texto truncado NUNCA vai ao log — só stop_reason + usage.
  const bruto = tentativa.row.raw_response as Record<string, unknown>;
  assertEquals(bruto.stop_reason, "max_tokens");
  assert("usage" in bruto, "a tentativa registra o usage (é dele que sai o custo)");
  assert(!("resumo" in bruto), "a tentativa NÃO carrega conteúdo de saída");

  // (ii) a linha do RESULTADO — o que o fallback produziu, rotulado como fallback.
  const resultado = supabase.logs[1];
  assertEquals(resultado.row.provider, "openai");
  assertEquals(resultado.row.success, true, "o resultado do fallback é utilizável");
  assertEquals(
    resultado.row.error_code,
    "fallback_anthropic_max_tokens",
    "o prefixo `fallback_` é o que impede a tela de mostrar «Sucesso» (verde) para um fallback",
  );
  assertEquals(
    resultado.row.model_snapshot,
    MODELO_OPENAI_REAL,
    "o snapshot do resultado é o modelo REAL da OpenAI, não o Sonnet configurado",
  );
  assert(resultado.row.idempotency_key != null, "a linha do RESULTADO leva a chave efetiva");
});

// ── Teste B — o fallback respeita o prompt ───────────────────────────────────
Deno.test("JORN-28/B — a chamada OpenAI do fallback recebe max_completion_tokens e temperature do prompt", async () => {
  const { callAi } = await loadClient();
  const openai = makeMockOpenAI();
  await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic: makeMockAnthropicComStopReason("max_tokens", { comFalhaParse: true }),
    openai,
    supabase: makeMockSupabaseComId(),
  });

  const req = openai.calls[0] as { max_completion_tokens?: number; temperature?: number };
  assertEquals(
    req.max_completion_tokens,
    SONNET_PROMPT.max_tokens,
    "sem teto de saída, o fallback pode truncar do mesmo jeito — e sem registrar por quê",
  );
  assertEquals(
    req.temperature,
    SONNET_PROMPT.temperature,
    "o prompt pede temperature 0; omitir o campo deixava a OpenAI usar o default dela numa avaliação de candidato",
  );
});

// ── Teste C — o retorno leva a proveniência real ─────────────────────────────
Deno.test("JORN-28/C — o retorno do fallback traz model real, fallback_cause, replayed=false e log_id da linha do resultado", async () => {
  const { callAi } = await loadClient();
  const supabase = makeMockSupabaseComId("res");
  const result = await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic: makeMockAnthropicComStopReason("max_tokens", { comFalhaParse: true }),
    openai: makeMockOpenAI(),
    supabase,
  });

  assertEquals(result.provider, "openai");
  assertEquals(
    result.model,
    MODELO_OPENAI_REAL,
    "D-28: é ESTE valor que a EF grava em `modelo_ia` — gravar o Sonnet seria a mentira do JORN-28",
  );
  assertEquals(result.fallback_cause, "anthropic_max_tokens", "a causa sem o prefixo, para a tela rotular");
  assertEquals(result.error_code, "fallback_anthropic_max_tokens", "o error_code leva o prefixo");
  assertEquals(result.replayed, false, "não houve replay — o provedor foi chamado");
  assertEquals(
    result.log_id,
    supabase.logs[1].id,
    "D-38: o log_id é o id da linha do RESULTADO (a 2ª), não o da tentativa",
  );
});

// ── Teste D — caminho feliz também carrega a proveniência ────────────────────
Deno.test("JORN-28/D — sucesso Anthropic devolve model = response.model, log_id preenchido e fallback_cause null", async () => {
  const { callAi } = await loadClient();
  const supabase = makeMockSupabaseComId("ok");
  // `end_turn` sem marcador = resposta completa e parseada: o caminho feliz.
  const anthropic = makeMockAnthropicComStopReason("end_turn");
  const result = await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic, openai: makeMockOpenAI(), supabase: supabase,
  });

  assertEquals(result.provider, "anthropic");
  assertEquals(
    result.model,
    MODELO_SONNET_REAL,
    "o modelo REAL (versão datada) pode diferir do alias configurado — é o real que vale",
  );
  assertEquals(result.fallback_cause, null, "nenhum fallback");
  assertEquals(result.replayed, false);
  assertEquals(supabase.logs.length, 1, "o caminho feliz grava UMA linha");
  assertEquals(result.log_id, supabase.logs[0].id, "o log_id é o id dessa linha");
});

// ── Teste E — os mocks das 7 EFs continuam válidos (degradação para id null) ──
Deno.test("JORN-39/E — logAiCall devolve { id: null, error: null } com um cliente SEM `.select` encadeável, e nada lança", async () => {
  // Este é o teste que protege as 7 EFs consumidoras de precisarem de UMA edição: os
  // mocks delas devolvem `Promise.resolve({ data, error })`, que não tem `.select`.
  // A feature-detection de `logAiCall` degrada para `id: null` em vez de estourar.
  const supabase = makeMockSupabase();
  const devolvido = await logAiCall(supabase, aiCallLogRow({ idempotency_key: null }));
  assertEquals(devolvido.id, null, "sem `.select` no builder não há id a ler — null é a verdade");
  assertEquals(devolvido.error, null, "e não houve erro de escrita");
  assertEquals(supabase.inserts.length, 1, "a linha FOI gravada (a degradação não engole a escrita)");

  // E o mesmo cliente atravessa um callAi inteiro sem lançar.
  const { callAi } = await loadClient();
  const result = await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic: makeMockAnthropicComStopReason("end_turn"),
    openai: makeMockOpenAI(),
    supabase: makeMockSupabase(),
  });
  assertEquals(result.provider, "anthropic");
  assertEquals(result.log_id, null, "sem id disponível, o contrato devolve null — nunca um id inventado");
});

// ── O embrulho do formato NÃO pode mexer na chave de idempotência ────────────
// `JSON.stringify` ignora funções, então o `parse` (embrulhado ou não) é invisível à
// impressão digital. Se algum dia o embrulho passar a acrescentar um campo SERIALIZÁVEL,
// toda chave muda de uma vez e o corpus inteiro de replays é invalidado em silêncio.
Deno.test("JORN-28 — a chave efetiva é a MESMA com e sem `.parse` no formato (o embrulho não vaza)", async () => {
  const { callAi } = await loadClient();
  const chaveCom = makeMockSupabaseKeyed();
  const chaveSem = makeMockSupabaseKeyed();
  const schema = { campo: "igual nos dois" };

  await callAi(
    { prompt: SONNET_PROMPT, ...baseArgs, idempotency_key: "cand:x", schema },
    {
      anthropic: makeMockAnthropic(),
      openai: makeMockOpenAI(),
      supabase: chaveCom,
      // COM `.parse` — o caminho que o `ai-client` embrulha.
      zodOutputFormat: (s: unknown) => ({ type: "json_schema", schema: s, parse: (c: string) => JSON.parse(c) }),
    },
  );
  await callAi(
    { prompt: SONNET_PROMPT, ...baseArgs, idempotency_key: "cand:x", schema },
    {
      anthropic: makeMockAnthropic(),
      openai: makeMockOpenAI(),
      supabase: chaveSem,
      // SEM `.parse` — passa intacto pelo embrulho.
      zodOutputFormat: (s: unknown) => ({ type: "json_schema", schema: s }),
    },
  );

  assertEquals(
    chaveCom.chaves[0],
    chaveSem.chaves[0],
    "o `parse` é função: invisível ao JSON.stringify do fingerprint — a chave não pode mudar",
  );
});
