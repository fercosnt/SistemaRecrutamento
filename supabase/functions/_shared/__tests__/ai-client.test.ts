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
// A fake `messages.parse()` that records the request shape and returns a fixture
// carrying usage.cache_read_input_tokens (so cost calc can prove cache billing).
function makeMockAnthropic(opts: { failTimes?: number } = {}) {
  const calls: unknown[] = [];
  let remainingFailures = opts.failTimes ?? 0;
  return {
    calls,
    messages: {
      parse: (req: unknown) => {
        calls.push(req);
        if (remainingFailures > 0) {
          remainingFailures--;
          return Promise.reject(new Error("anthropic 529 overloaded"));
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
  const req = anthropic.calls[0] as { model: string };
  assertEquals(req.model, "claude-haiku-4-5", "cv_summary must route to Haiku");

  const anthropic2 = makeMockAnthropic();
  await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic: anthropic2, openai: makeMockOpenAI(), supabase: makeMockSupabase(),
  });
  assertEquals((anthropic2.calls[0] as { model: string }).model, "claude-sonnet-4-6");
});

Deno.test("IA-03 — callAi emits system + (vaga+rubric) blocks with cache_control ephemeral", async () => {
  const { callAi } = await loadClient();
  const anthropic = makeMockAnthropic();
  await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic, openai: makeMockOpenAI(), supabase: makeMockSupabase(),
  });
  const req = anthropic.calls[0] as { system: Array<{ cache_control?: { type: string } }> };
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
