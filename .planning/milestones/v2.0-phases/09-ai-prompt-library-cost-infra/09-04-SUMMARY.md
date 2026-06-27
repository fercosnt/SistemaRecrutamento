---
phase: 09-ai-prompt-library-cost-infra
plan: 04
subsystem: ai-shared-utilities
tags: [ai, lgpd, pii, circuit-breaker, cost, prompt-injection, deno, _shared]
requires:
  - "09-01 (Wave-0 Deno RED stubs: pii-masker/injection-detector/circuit-breaker/ai-cost.test.ts)"
provides:
  - "maskPII() — PT-BR PII masking (7 categories) returning { masked, placeholders }"
  - "detectPromptInjection() — 8-pattern adversarial detector"
  - "CircuitBreaker — in-memory 5/60s breaker (CLOSED/OPEN/HALF-OPEN)"
  - "COST_PER_TOKEN + calculateCost() — verified 2026 pricing, cached_read billing"
affects:
  - "09-05 ai-client.ts composes all 4 helpers via ../<helper>.ts imports"
tech-stack:
  added: []
  patterns:
    - "Pure Deno _shared utilities: no DB/SDK/network imports"
    - "Global-regex PII masking ordered specific->general (CNPJ>CPF>RG) to avoid prefix capture"
key-files:
  created:
    - supabase/functions/_shared/pii-masker.ts
    - supabase/functions/_shared/injection-detector.ts
    - supabase/functions/_shared/circuit-breaker.ts
    - supabase/functions/_shared/ai-cost.ts
  modified: []
decisions:
  - "Helper return key is `placeholders` (test contract), not `piiFound` (plan-body prose) — followed the RED test"
  - "RG masking added (absent from reference impl) ordered AFTER CPF/CNPJ to avoid prefix overlap"
  - "COST_PER_TOKEN holds only the 3 verified RESEARCH models (Sonnet/Haiku/gpt-4o-mini), dropping reference's gpt-4o"
metrics:
  duration: ~10 min
  completed: 2026-06-08
---

# Phase 9 Plan 04: AI _shared Utilities Summary

Implemented the 4 pure `_shared/` Deno utilities (PII masking, prompt-injection detection, circuit breaker, cost calculation) extracted from `08-edge-function-reference.ts`, flipping their Wave-0 Deno RED tests GREEN (26/26) with no DB, SDK, or network dependency. These are the stateless building blocks the ai-client (Plan 05) composes.

## What Was Built

- **pii-masker.ts** (`maskPII`): strips 7 PT-BR PII categories — CPF, CNPJ, email, telefone, data-nasc, endereco, RG — returning `{ masked, placeholders }` where `placeholders` is the audit trail of labels applied. Does NOT mask skills/company names/job titles (AUDITORIA-LGPD §5.3). IA-02.
- **injection-detector.ts** (`detectPromptInjection`): flags the 8 known adversarial patterns, returning `{ detected, pattern? }` with the matched `source`. Benign CV text (incl. PT-BR "ignoro processos") is not flagged. RF-PL-18.
- **circuit-breaker.ts** (`CircuitBreaker`): in-memory per-isolate breaker, THRESHOLD=5 / RESET_MS=60000, CLOSED/OPEN/HALF-OPEN; `recordSuccess` clears `openedAt`. IA-04 / RF-PL-15.
- **ai-cost.ts** (`COST_PER_TOKEN` + `calculateCost`): 3 verified 2026 models; cached tokens billed at `cached_read`, unknown model -> 0 (no throw). IA-03.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | pii-masker + injection-detector | bb660d5 | pii-masker.ts, injection-detector.ts |
| 2 | circuit-breaker + ai-cost | 5db7cf7 | circuit-breaker.ts, ai-cost.ts |
| 3 | LGPD-04 guard GREEN over new helpers | (verify-only, no code change) | — |

## Verification

- **Deno tests:** all 4 helper suites GREEN — `pii-masker.test.ts` + `injection-detector.test.ts` (15/15) + `circuit-breaker.test.ts` + `ai-cost.test.ts` (11/11) = **26/26 passed, 0 failed**.
- **LGPD-04 guard:** `forbidden-strings.grep.test.ts` 8/8 GREEN with `supabase/functions/_shared/*` present — no forbidden product copy in any helper.
- **tsc baseline:** 293 = 293 (zero growth; helpers are Deno npm:/deno.land modules outside the tsc include scope).
- **No external imports** in any of the 4 files (pure utilities confirmed by source).
- **No file deletions** in any commit.

## Deviations from Plan

### Process

**1. Task 3 was verify-only — no code commit.**
- **Found during:** Task 3
- **Issue:** The LGPD-04 guard was already GREEN over the now-populated `supabase/functions/` tree; no forbidden term slipped into any helper, so the listed edit target (pii-masker.ts) needed no change. Re-touching it would produce an empty/no-op commit.
- **Resolution:** Asserted the guard GREEN (8/8) and documented it here, per the 09-02 verify-only precedent. No source change.

### Auto-fixed Issues

**2. [Rule 1 — Contract] Return key is `placeholders`, not `piiFound`.**
- **Found during:** Task 1
- **Issue:** The plan body (`<action>`/`must_haves`) calls the audit list `piiFound`, but the RED test contract (`pii-masker.test.ts`) destructures `{ masked, placeholders }`. The test is the source of truth for GREEN.
- **Fix:** `maskPII` returns `placeholders`. No test edits.
- **Files:** pii-masker.ts
- **Commit:** bb660d5

**3. [Rule 2 — Missing functionality] RG masking added + ordered after CPF/CNPJ.**
- **Found during:** Task 1
- **Issue:** The reference `08-edge-function-reference.ts` PII_RULES lacks an RG rule, but the test fixture and plan require RG (7th category). A naive RG regex risks capturing the prefix of a longer CPF/CNPJ number.
- **Fix:** Added `[RG]` rule (`\d{2}.?\d{3}.?\d{3}-[\dxX]`) placed AFTER CPF/CNPJ in the ordered rule list so longer numbers mask first.
- **Files:** pii-masker.ts
- **Commit:** bb660d5

## Threat Surface

No new threat surface beyond the plan's `<threat_model>` (T-09-11..14 all mitigated by these helpers). No network endpoints, auth paths, or schema changes introduced — pure in-process utilities.

## Known Stubs

None. All 4 helpers are fully implemented with passing behavioral tests.

## Self-Check: PASSED

- FOUND: supabase/functions/_shared/pii-masker.ts
- FOUND: supabase/functions/_shared/injection-detector.ts
- FOUND: supabase/functions/_shared/circuit-breaker.ts
- FOUND: supabase/functions/_shared/ai-cost.ts
- FOUND commit: bb660d5
- FOUND commit: 5db7cf7
