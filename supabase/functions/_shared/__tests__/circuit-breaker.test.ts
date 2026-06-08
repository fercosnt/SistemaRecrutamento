/**
 * Phase 9 / Plan 09-01 Task 2 — Wave 0 RED scaffold for `_shared/circuit-breaker.ts`.
 *
 * Gates IA-04 / RF-PL-15 (Anthropic breaker opens at 5 failures / 60s, then
 * half-opens and resets on a successful probe). Flips GREEN in Plan 09-05 when
 * `circuit-breaker.ts` extracts the CircuitBreaker class from
 * `08-edge-function-reference.ts` (L47-74).
 *
 * NO real API call happens (orchestrator-decision #2) — in-memory state machine.
 *
 * ── Why this is RED now ──
 * `../circuit-breaker.ts` does not exist yet → the dynamic import throws
 * module-not-found at run time. That is the RED assertion.
 *
 * Run: deno test --allow-read supabase/functions/_shared/__tests__/circuit-breaker.test.ts
 *
 * @see docs/conhecimento/prompts/templates/08-edge-function-reference.ts (CircuitBreaker L47)
 * @see .planning/phases/09-ai-prompt-library-cost-infra/09-RESEARCH.md (Pattern 2 / IA-04)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// The contract Plan 05 must satisfy: THRESHOLD=5, RESET_MS=60000.
const THRESHOLD = 5;
const RESET_MS = 60_000;

// RED until Plan 09-05.
async function newBreaker() {
  const mod = await import("../circuit-breaker.ts");
  const CircuitBreaker = mod.CircuitBreaker as new () => {
    canRequest(): boolean;
    recordSuccess(): void;
    recordFailure(): void;
  };
  return new CircuitBreaker();
}

Deno.test("IA-04 — fresh breaker is CLOSED (canRequest === true)", async () => {
  const cb = await newBreaker();
  assertEquals(cb.canRequest(), true);
});

Deno.test("IA-04 — THRESHOLD (5) failures within RESET_MS opens the breaker", async () => {
  const cb = await newBreaker();
  for (let i = 0; i < THRESHOLD; i++) cb.recordFailure();
  assertEquals(cb.canRequest(), false, `breaker must OPEN after ${THRESHOLD} failures`);
});

Deno.test("IA-04 — 4 failures (below THRESHOLD) keep the breaker CLOSED", async () => {
  const cb = await newBreaker();
  for (let i = 0; i < THRESHOLD - 1; i++) cb.recordFailure();
  assertEquals(cb.canRequest(), true, "breaker must stay CLOSED below threshold");
});

Deno.test(
  `IA-04 — after RESET_MS (${RESET_MS}ms) an open breaker half-opens to allow 1 probe`,
  async () => {
    const cb = await newBreaker();
    for (let i = 0; i < THRESHOLD; i++) cb.recordFailure();
    assertEquals(cb.canRequest(), false);
    // Simulate the reset window elapsing via fake time so the test stays fast.
    const realNow = Date.now;
    try {
      const opened = realNow();
      Date.now = () => opened + RESET_MS + 1;
      assertEquals(cb.canRequest(), true, "breaker must half-open after RESET_MS");
    } finally {
      Date.now = realNow;
    }
  },
);

Deno.test("IA-04 — recordSuccess resets the breaker to CLOSED", async () => {
  const cb = await newBreaker();
  for (let i = 0; i < THRESHOLD - 1; i++) cb.recordFailure();
  cb.recordSuccess();
  for (let i = 0; i < THRESHOLD - 1; i++) cb.recordFailure();
  assert(cb.canRequest(), "after a success, the failure count must restart from zero");
});
