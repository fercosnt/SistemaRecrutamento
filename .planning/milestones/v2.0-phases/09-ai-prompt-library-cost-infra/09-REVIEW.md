---
phase: 09-ai-prompt-library-cost-infra
reviewed: 2026-06-08T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/features/admin/ai-costs/components/AiCostsPage.tsx
  - src/features/admin/ai-costs/hooks/useAiCosts.ts
  - src/features/admin/ai-costs/services/aiCostsService.ts
  - src/features/admin/ai-logs/components/AiLogsPage.tsx
  - src/features/admin/ai-logs/hooks/useAiLogs.ts
  - src/features/admin/ai-logs/services/aiLogsService.ts
  - src/features/admin/prompt-versions/components/PromptVersionsPage.tsx
  - src/features/admin/prompt-versions/hooks/usePromptVersions.ts
  - src/features/admin/prompt-versions/services/promptVersionsService.ts
  - src/router/routes.tsx
  - supabase/functions/_shared/ai-client.ts
  - supabase/functions/_shared/ai-cost.ts
  - supabase/functions/_shared/audit-logger.ts
  - supabase/functions/_shared/circuit-breaker.ts
  - supabase/functions/_shared/injection-detector.ts
  - supabase/functions/_shared/pii-masker.ts
  - supabase/functions/_shared/prompt-loader.ts
  - supabase/functions/cost-alerter/index.ts
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: fixed
fixed_at: 2026-06-08T02:25:00Z
fixed:
  - CR-01
  - CR-02
  - CR-03
  - WR-01
  - WR-02
  - WR-03
  - WR-04
deferred:
  - IN-01  # code comment, not user-facing — no action required
  - IN-02  # optional WARN-level observability; out of fix scope
---

# Phase 09: Code Review Report

**Reviewed:** 2026-06-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed the Phase 9 AI infrastructure: three admin pages (ai-costs, ai-logs, prompt-versions), shared Edge Function modules (ai-client, ai-cost, audit-logger, circuit-breaker, injection-detector, pii-masker, prompt-loader), the cost-alerter Edge Function, and the router.

The LGPD-critical path (maskPII before INSERT, explicit column allowlists) is correctly structured. The cost-alerter auth gate, unconditional recruiter_alerts INSERT, and graceful email degradation all meet spec. The RoleGuard gating uses `role="administrador"` consistently on all three admin routes.

Three blockers were found: (1) `loadPrompt` silently discards `content_hash` from the DB row because `LoadedPrompt` has no such field, causing every audit log to store an empty string for `prompt_hash` — the integrity field required by IA-02 is broken for all production calls. (2) The active-prompt query is missing the `is_canary=false` filter, so if a row carries both `is_active=true` and `is_canary=true` (legal during a transitional promote), `maybeSingle()` will throw PGRST116 and all AI calls for that `call_type` will fail with a `PromptNotConfiguredError`, taking the feature down. (3) The idempotency replay step is documented in the `callAi` JSDoc header as step 1 but is entirely absent from the implementation — repeated calls with the same `idempotency_key` make a new API call and write a new log row every time.

---

## Critical Issues

### CR-01: `prompt_hash` always stored as empty string — audit integrity broken

**File:** `supabase/functions/_shared/prompt-loader.ts:30,44-53` and `supabase/functions/_shared/ai-client.ts:192`

**Issue:** `PROMPT_COLUMNS` includes `content_hash` in the SELECT list, so the value is fetched from the database. But `LoadedPrompt` (the interface returned by `loadPrompt`) has no `content_hash` field — `toLoadedPrompt()` never maps it. The `ResolvedPrompt` type in `ai-client.ts` has `prompt_hash?: string` (optional), and every call site falls back to `prompt.prompt_hash ?? ""`. The result: every row written to `ai_call_logs` has `prompt_hash = ""`. The IA-02 audit requirement — verifying which prompt template produced a given AI output — is silently defeated for all production calls that go through `loadPrompt`.

**Fix:** Add `content_hash` to `LoadedPrompt` and map it in `toLoadedPrompt`:

```typescript
// prompt-loader.ts — LoadedPrompt interface
export interface LoadedPrompt {
  id: string;
  semver: string;
  system_template: string;
  user_template: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
  schema_version_required: string;
  content_hash: string;   // ADD THIS
}

// toLoadedPrompt mapping
function toLoadedPrompt(row: Record<string, unknown>): LoadedPrompt {
  return {
    // ... existing fields ...
    content_hash: String(row.content_hash ?? ""),  // ADD THIS
  };
}
```

Then in `ai-client.ts`, callers using `loadPrompt` should use `prompt_hash: prompt.content_hash ?? ""` (or map `content_hash` to `prompt_hash` when building `ResolvedPrompt` from `LoadedPrompt`).

---

### CR-02: Active-prompt query missing `is_canary=false` filter — PGRST116 crash during canary promote

**File:** `supabase/functions/_shared/prompt-loader.ts:141-147`

**Issue:** The query fetching the active version filters only `.eq("is_active", true)`. During the transitional window when a canary is being promoted to active, a database row can legitimately have both `is_active=true` and `is_canary=true` (depending on the promote RPC implementation). When two such rows exist for the same `call_type`, `maybeSingle()` raises PGRST116 ("multiple rows returned"). `loadPrompt` catches this as `activeRes.error` being truthy and throws `PromptNotConfiguredError`, causing every AI call for that `call_type` to fail until the state is corrected manually. The comment on line 130 correctly describes the intended filter (`is_active=true AND is_canary=false`), but the code does not implement it.

**Fix:**
```typescript
const activeRes = await supabaseAdmin
  .from("prompt_versions")
  .select(PROMPT_COLUMNS)
  .eq("call_type", call_type)
  .eq("is_active", true)
  .eq("is_canary", false)   // ADD THIS
  .maybeSingle();
```

Note: the `SupabaseLike` mock interface (lines 89-99) chains only two `.eq()` calls before `maybeSingle()`. Adding a third `.eq()` requires extending the structural type. In production, supabase-js supports unlimited chains; the mock interface just needs to be updated to match.

---

### CR-03: Idempotency replay documented but not implemented — duplicate API calls and log rows

**File:** `supabase/functions/_shared/ai-client.ts:18,174-228`

**Issue:** The `callAi` JSDoc header lists "idempotency replay (se idempotency_key ja registrado)" as step 1. The implementation jumps directly to injection detection with no lookup of `idempotency_key` in `ai_call_logs`. When a downstream Edge Function retries on a transient error (or a pg_net retry fires twice), `callAi` will make a fresh Anthropic/OpenAI API call, incur cost, and write a second audit log row — potentially with a different result. The `idempotency_key` is passed all the way through to `logAiCall` and stored, but is never read back to short-circuit duplicate calls. This also means cost data in `ai_cost_daily` can be inflated by retried requests.

**Fix:** Add a lookup at the start of `callAi`, before injection detection:

```typescript
// Step 1: idempotency replay
if (idempotency_key) {
  const { data: existing } = await supabase
    .from("ai_call_logs")
    .select("provider, cost_usd, latency_ms, success, parsed_score, parsed_reasoning")
    .eq("idempotency_key", idempotency_key)
    .maybeSingle();
  if (existing) {
    return {
      provider: existing.provider as string,
      parsed: existing.parsed_score ?? null,
      cost_usd: 0,          // already counted
      latency_ms: 0,
      cache_hit: true,
      prompt_version: prompt.prompt_version,
    };
  }
}
```

The exact return shape should replay whatever the original call returned; the key invariant is that no new API call is made and no new log row is written.

---

## Warnings

### WR-01: `calculateCost` returns a negative value when `cachedTokens > inputTokens`

**File:** `supabase/functions/_shared/ai-cost.ts:45-46`

**Issue:** `freshInput = inputTokens - cachedTokens`. If the Anthropic API response returns `cache_read_input_tokens` larger than `input_tokens` (e.g., due to a provider data anomaly or incorrect token accounting), `freshInput` is negative. Multiplying by `p.input` produces a negative cost contribution that deflates the stored `cost_usd`. The function has no guard against this.

**Fix:**
```typescript
const freshInput = Math.max(0, inputTokens - cachedTokens);
```

---

### WR-02: `runOpenAIFallback` propagates `error_code: "anthropic_circuit_open"` when Anthropic exhausted retries, not when circuit is open

**File:** `supabase/functions/_shared/ai-client.ts:355-357`

**Issue:** `error_code: "anthropic_circuit_open"` is always written to the fallback log row (line 357), even when the fallback was triggered because Anthropic exhausted its MAX_ATTEMPTS retries (the circuit was CLOSED but all attempts failed). This mislabels the root cause in `ai_call_logs`, making it impossible to distinguish "circuit opened, no attempts made" from "all retries failed" when querying the audit log.

**Fix:** Pass a separate flag into `FallbackArgs` to distinguish the trigger reason:

```typescript
interface FallbackArgs {
  // ...
  triggerError?: unknown;
  circuitWasOpen?: boolean;   // ADD
}

// In the log row:
error_code: a.circuitWasOpen ? "anthropic_circuit_open" : "anthropic_retries_exhausted",
```

---

### WR-03: Injection detector misses `DAN` without a space (e.g., `DANmode`)

**File:** `supabase/functions/_shared/injection-detector.ts:29`

**Issue:** The pattern `/jailbreak|DAN\s+mode/i` requires at least one whitespace between `DAN` and `mode`. A trivial bypass is `DANmode` or `DAN-mode`. While no injection detector is exhaustive, requiring whitespace between the two tokens is a weak anchor for a security control.

**Fix:**
```typescript
/jailbreak|DAN[\s_-]*mode/i,
```

This is a defense-in-depth control (the server does not trust AI output for access decisions), but bypassing the detector causes the raw candidate input to be sent to the AI provider without the `flagged_for_human_review` annotation.

---

### WR-04: `PromptVersionsPage` "Comparar versões" button does nothing when clicked

**File:** `src/features/admin/prompt-versions/components/PromptVersionsPage.tsx:287-292`

**Issue:** The "Comparar versões" button has `onClick={() => undefined}`. Clicking it when `canCompare` is true performs no action. The side-by-side diff panel below it already renders automatically via `{canCompare && ...}`, so the button is inert dead UI. An admin who clicks it expecting something to happen gets no feedback.

**Fix:** Either remove the button entirely (the diff renders automatically on checkbox selection) or replace the no-op with a scroll-to-diff action:

```typescript
onClick={() => {
  document.getElementById('diff-panel')?.scrollIntoView({ behavior: 'smooth' })
}}
```

---

## Info

### IN-01: `routes.tsx` comment "Testes Psicométricos" is internal-only but worth tracking

**File:** `src/router/routes.tsx:38`

**Issue:** The code comment `// Testes Psicométricos` uses the forbidden product-copy term ("psicométrico") that CLAUDE.md prohibits in user-facing strings. This is a code comment, not a user-facing string, so it is not a product-copy violation. However, the CLAUDE.md rule about "never 'teste psicológico'" and the preference for "avaliação comportamental/cognitiva" applies to UI copy; code comments are out of scope. No action required, but flagged for awareness so the convention is not accidentally promoted to copy.

**Fix:** No fix required; code comment is not user-facing.

---

### IN-02: `loadPrompt` active-row query silently swallows canary-fetch errors

**File:** `supabase/functions/_shared/prompt-loader.ts:160-162`

**Issue:** If the canary query fails with a network or DB error, `canaryRes.error` is truthy and the code sets `canary = null`, silently falling through to the active version. This is intentional defensive behavior (documented in the comment). However, a transient error on the canary query while a canary deployment is active means all traffic routes to the active version with no observability signal. Consider logging the error at WARN level.

**Fix:**
```typescript
const canary = canaryRes.error
  ? (console.warn("[prompt-loader] canary query failed, using active:", canaryRes.error), null)
  : canaryRes.data;
```

---

_Reviewed: 2026-06-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
