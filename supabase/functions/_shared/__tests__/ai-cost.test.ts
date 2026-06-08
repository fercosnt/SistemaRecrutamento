/**
 * Phase 9 / Plan 09-01 Task 2 — Wave 0 RED scaffold for `_shared/ai-cost.ts`.
 *
 * Gates IA-03 (cost calc + verified COST_PER_TOKEN table + cached tokens billed
 * at cached_read, not input). Flips GREEN in Plan 09-05 when `ai-cost.ts` lands
 * the table from RESEARCH §Code Examples (verified vs 2026 Anthropic/OpenAI
 * pricing: Sonnet $3/$15, Haiku $1/$5, cache_read = 10% of input).
 *
 * NO real API call happens (orchestrator-decision #2) — pure arithmetic.
 *
 * ── Why this is RED now ──
 * `../ai-cost.ts` does not exist yet → dynamic import throws module-not-found
 * at run time. That is the RED assertion.
 *
 * Run: deno test --allow-read supabase/functions/_shared/__tests__/ai-cost.test.ts
 *
 * @see .planning/phases/09-ai-prompt-library-cost-infra/09-RESEARCH.md (§Code Examples — verified pricing)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// The exact verified per-token prices Plan 05 MUST encode (USD per token).
const EXPECTED_COST_PER_TOKEN = {
  "claude-sonnet-4-6": { input: 3e-6, cached_read: 0.3e-6, output: 15e-6 },
  "claude-haiku-4-5": { input: 1e-6, cached_read: 0.1e-6, output: 5e-6 },
  "gpt-4o-mini": { input: 0.15e-6, cached_read: 0.075e-6, output: 0.6e-6 },
} as const;

// RED until Plan 09-05.
async function loadCost() {
  const mod = await import("../ai-cost.ts");
  return mod as {
    COST_PER_TOKEN: Record<string, { input: number; cached_read: number; output: number }>;
    calculateCost: (
      model: string,
      inputTokens: number,
      cachedTokens: number,
      outputTokens: number,
    ) => number;
  };
}

for (const [model, prices] of Object.entries(EXPECTED_COST_PER_TOKEN)) {
  Deno.test(`IA-03 — COST_PER_TOKEN["${model}"] matches verified 2026 pricing`, async () => {
    const { COST_PER_TOKEN } = await loadCost();
    assertEquals(COST_PER_TOKEN[model].input, prices.input, `${model} input price`);
    assertEquals(COST_PER_TOKEN[model].cached_read, prices.cached_read, `${model} cached_read price`);
    assertEquals(COST_PER_TOKEN[model].output, prices.output, `${model} output price`);
  });
}

Deno.test("IA-03 — calculateCost bills fresh input + cached_read + output correctly", async () => {
  const { calculateCost } = await loadCost();
  // 1000 input (200 of which are cache hits) + 500 output on Sonnet.
  const inputTokens = 1000, cachedTokens = 200, outputTokens = 500;
  const p = EXPECTED_COST_PER_TOKEN["claude-sonnet-4-6"];
  const expected =
    (inputTokens - cachedTokens) * p.input + cachedTokens * p.cached_read + outputTokens * p.output;
  const actual = calculateCost("claude-sonnet-4-6", inputTokens, cachedTokens, outputTokens);
  // Float-tolerant equality.
  assert(Math.abs(actual - expected) < 1e-12, `expected ${expected}, got ${actual}`);
});

Deno.test("IA-03 — cached tokens are billed at cached_read, NOT input", async () => {
  const { calculateCost } = await loadCost();
  const p = EXPECTED_COST_PER_TOKEN["claude-haiku-4-5"];
  // All 1000 tokens are cache hits → cost MUST be 1000 * cached_read, never * input.
  const allCached = calculateCost("claude-haiku-4-5", 1000, 1000, 0);
  const wrongIfBilledAsInput = 1000 * p.input;
  assert(Math.abs(allCached - 1000 * p.cached_read) < 1e-12, "cached must use cached_read rate");
  assert(allCached < wrongIfBilledAsInput, "cached_read must be cheaper than input");
});

Deno.test("IA-03 — unknown model yields zero cost (no throw)", async () => {
  const { calculateCost } = await loadCost();
  assertEquals(calculateCost("nonexistent-model", 1000, 0, 1000), 0);
});
