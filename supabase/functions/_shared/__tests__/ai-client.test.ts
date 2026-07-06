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
      },
      deps: {
        anthropic: unknown;
        openai: unknown;
        supabase: unknown;
        breaker?: { canRequest(): boolean; recordSuccess(): void; recordFailure(): void };
      },
    ) => Promise<{ provider: string; parsed: unknown; cost_usd: number; error_code?: string }>;
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
  assertEquals(result.error_code, "anthropic_circuit_open");
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
  assertEquals(last.error_code, "anthropic_circuit_open", "breaker OPEN → circuit_open (não retries_exhausted)");
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
  for (const col of ["prompt_version", "model_id", "input_hash", "output", "cost_usd"]) {
    assert(col in logRow!.row, `ai_call_logs row must carry "${col}"`);
  }
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
  assertEquals(result.error_code, "anthropic_retries_exhausted", "fallback cause = retries exhausted (breaker was CLOSED)");
});
