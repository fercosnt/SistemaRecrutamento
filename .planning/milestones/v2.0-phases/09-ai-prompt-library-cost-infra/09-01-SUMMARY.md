---
phase: 09-ai-prompt-library-cost-infra
plan: 01
subsystem: ai-infra-tests
tags: [wave-0, red-scaffold, lgpd-04, deno-tests, sql-smoke, vitest-grep]
requires:
  - "src/features/auth/utils/__tests__/pitfall7.grep.test.ts (grep-guard analog)"
  - "supabase/functions/_shared/__tests__/strict-schema.test.ts (Deno test analog)"
  - "docs/conhecimento/prompts/templates/08-edge-function-reference.ts (helper logic source)"
provides:
  - "LGPD-04 / RNF-12 forbidden-strings CI grep guard (GREEN — source clean)"
  - "5 Deno RED test stubs for the _shared AI helpers (pii-masker, circuit-breaker, injection-detector, ai-cost, ai-client) — mocked SDK"
  - "sync-prompts Deno RED test (content_hash determinism + Zod frontmatter + UPSERT defaults)"
  - "7-block SQL-smoke runbook for the Phase-9 migration apply (Plan 09-07)"
affects:
  - "Plan 09-04 (helpers flip pii-masker/circuit-breaker/injection-detector/ai-cost GREEN)"
  - "Plan 09-05 (ai-client flips GREEN, SDK-bumped)"
  - "Plan 09-06 (sync-prompts.ts flips GREEN)"
  - "Plan 09-07 (runs the 7 SQL smokes after PROD migration apply)"
tech-stack:
  added: []
  patterns:
    - "Vitest node:fs grep guard with __tests__ self-exclusion (pitfall7 precedent)"
    - "Deno RED test via dynamic import → module-not-found is the RED assertion"
    - "ai-client tested via dependency-injected mocks (no real npm: SDK import, no network)"
    - "SQL-smoke runbook with ROLLBACK-free fixtures (D-22 MCP apply path)"
key-files:
  created:
    - "src/__tests__/guards/forbidden-strings.grep.test.ts"
    - "supabase/functions/_shared/__tests__/pii-masker.test.ts"
    - "supabase/functions/_shared/__tests__/circuit-breaker.test.ts"
    - "supabase/functions/_shared/__tests__/injection-detector.test.ts"
    - "supabase/functions/_shared/__tests__/ai-cost.test.ts"
    - "supabase/functions/_shared/__tests__/ai-client.test.ts"
    - "scripts/__tests__/sync-prompts.test.ts"
    - ".planning/phases/09-ai-prompt-library-cost-infra/09-SQL-SMOKE-RUNBOOK.md"
  modified: []
decisions:
  - "ai-client.test.ts mocks Anthropic+OpenAI+supabase via dependency injection (deps arg) — no real npm: SDK import in the test, honoring orchestrator-decision #2 (no real API call this phase)."
  - "Test header wave references aligned to ROADMAP wave-mapping (helpers GREEN in 09-04, ai-client in 09-05, sync-prompts in 09-06) rather than the plan-body's prose (Plans 04/05/06) — same intent, ROADMAP is the authoritative wave map."
  - "Deno std pinned to deno.land/std@0.224.0/assert for the new tests (current stable assert module; strict-schema.test.ts uses Vitest imports which do not run under deno test — left untouched, pre-existing/out-of-scope)."
metrics:
  duration: "~15 min"
  completed: "2026-06-08"
  tasks: 3
  files: 8
  commits: 3
---

# Phase 9 Plan 01: Wave-0 RED Scaffolds + SQL-Smoke Runbook Summary

**One-liner:** Authored the Phase-9 RED test battery — a GREEN LGPD-04 forbidden-strings Vitest grep guard, 6 RED Deno test stubs (5 `_shared` helpers + sync-prompts) gating IA-01/02/03/04 against not-yet-existing implementations, and a 7-block SQL-smoke runbook for the `[BLOCKING]` PROD migration apply — so every downstream Phase-9 surface has a calibrated failing test before its implementation lands (Nyquist/smoke-runtime gate, the central Phase-4 lesson).

## What Was Built

| Task | Deliverable | RED/GREEN | Commit |
|------|-------------|-----------|--------|
| 1 | `src/__tests__/guards/forbidden-strings.grep.test.ts` — LGPD-04/RNF-12 CI guard | **GREEN** (source clean; gate fails only on a forbidden term) — 8 tests | `01deaea` |
| 2 | 5 Deno test stubs (`pii-masker`, `circuit-breaker`, `injection-detector`, `ai-cost`, `ai-client`) | **RED** (module-not-found until Plans 09-04/05) | `190b062` |
| 3 | `scripts/__tests__/sync-prompts.test.ts` (RED) + `09-SQL-SMOKE-RUNBOOK.md` (7 smokes) | **RED** (until Plan 09-06) + doc | `60b8b3a` |

### Task 1 — LGPD-04 forbidden-strings Vitest grep guard
Copied the `pitfall7.grep.test.ts` shape. `ROOT = resolve(__dirname, '../../..')` (file is 3 deep at `src/__tests__/guards/`), `SCAN_ROOTS = ['src', 'supabase/functions']` (docs/ + .planning/ excluded per locked decision), FORBIDDEN regex matching the 5 RNF-12 terms with accent tolerance, `__tests__` + `node_modules` self-exclusion. Sub-tests: regex matches all 5 forbidden terms (`it.each`), regex does NOT match the approved "avaliação comportamental/cognitiva" copy, and a roots-resolve sanity check. **8/8 GREEN** — confirms the codebase is currently clean (the guard's job is to FAIL the build only when a forbidden string appears).

### Task 2 — 5 Deno RED test stubs (mocked SDK)
Each imports the not-yet-existing helper from `'../<helper>.ts'`; the dynamic import throws `TypeError: Module not found`, which IS the RED assertion (not a syntax error). All behavioral fixtures document the exact contract for the implementer:
- **pii-masker.test.ts** — `maskPII()` replaces CPF/CNPJ/email/telefone/data-nasc/endereco/RG with bracketed placeholders + returns the placeholders-found list (IA-02 / Pitfall 6); synthetic PII only.
- **circuit-breaker.test.ts** — THRESHOLD=5 / RESET_MS=60000 open; half-open after reset via fake `Date.now`; `recordSuccess` resets to CLOSED (IA-04 / RF-PL-15).
- **injection-detector.test.ts** — 8 adversarial payloads flagged `{detected:true, pattern}`; benign CV text not flagged (RF-PL-18).
- **ai-cost.test.ts** — exact `COST_PER_TOKEN` for `claude-sonnet-4-6` / `claude-haiku-4-5` / `gpt-4o-mini`; cached tokens billed at `cached_read` not `input` (IA-03).
- **ai-client.test.ts** — Anthropic + OpenAI + supabase MOCKED via dependency injection; asserts (a) PII masked before any log write, (b) Haiku for cv_summary / Sonnet otherwise, (c) system blocks carry `cache_control: ephemeral`, (d) breaker-open routes to `gpt-4o-mini` with `provider='openai'` + `error_code='anthropic_circuit_open'`, (e) `ai_call_logs` INSERT carries `prompt_version/model_id/input_hash/output/cost_usd` (IA-02/03/04). **No real npm: SDK import, no network.**

SDK pins re-verified at execute time (`npm view`): `@anthropic-ai/sdk@0.102.0`, `openai@6.42.0`, `zod@4.4.3` (helper peer-dep ≥3.25.0 → tests document `npm:zod@3.25.76` for Plan 05). 32 Deno tests collected, all RED via module-not-found.

### Task 3 — sync-prompts RED test + SQL-smoke runbook
- **sync-prompts.test.ts** (RED) — `contentHash` deterministic 64-char SHA-256 hex + canonical (reordered-equal frontmatter → same hash) + content-sensitive (RF-PL-02); Zod `validateFrontmatter` rejects a missing field + a non-semver `^\d+\.\d+\.\d+$` (RF-PL-01); `buildUpsertRow` defaults `is_active=false`/`is_canary=false` carrying the content_hash (RF-PL-07).
- **09-SQL-SMOKE-RUNBOOK.md** — 7 copy-paste SQL smoke blocks for Plan 09-07's PROD apply: SMOKE-1 (6 tables + RLS via pg_tables/pg_policies), SMOKE-2 (llm_call_type 7 values / llm_provider / candidate_status), SMOKE-3 (`unique_active_per_type` EXCLUDE blocks 2 active rows — Pitfall 5), SMOKE-4 (immutability trigger blocks system_template UPDATE, allows state-column UPDATE — RF-PL-04/Pitfall 5), SMOKE-5 (`promote_to_canary` P0001 out-of-range + 42501 non-administrador via set_config), SMOKE-6 (cost-anomaly trigger queues `net.http_post` — IA-04), SMOKE-7 (pg_cron `ai-cost-aggregation` 01:30 + `ai-logs-retention-cleanup` 02:00). ROLLBACK-free fixtures via Supabase MCP execute_sql (D-22).

## Verification

- `npx vitest run src/__tests__/guards/forbidden-strings.grep.test.ts` → **8/8 PASS** (GREEN gate; source clean).
- `deno test --no-check --allow-read supabase/functions/_shared/__tests__/` → all new tests **RED via `TypeError: Module not found`** (the calibrated failure; not syntax errors).
- `deno test --no-check --allow-read scripts/__tests__/sync-prompts.test.ts` → **RED via module-not-found**.
- `grep -c "SMOKE-"` runbook → **7**; covers all 6 tables, 3 enums, pg_net + pg_cron checks.
- `grep "IA-0"` across the 5 Deno helper tests → **25 hits** (≥5; each names the IA-0x behavior it gates; injection-detector correctly uses RF-PL-18).
- `npm run -s lint` (tsc) → **293 errors = frozen ~293 baseline** (zero growth from this plan's additions).

## Deviations from Plan

### Auto-fixed / clarifications (none blocking)

**1. [Rule 3 — Wave-number alignment] Test headers cite ROADMAP wave mapping, not plan-body prose**
- **Found during:** Tasks 2 + 3.
- **Issue:** The plan body says helpers flip GREEN in "Plans 04/05", sync-prompts in "Plan 06". The ROADMAP wave map assigns the helpers to 09-04, ai-client to 09-05, sync-prompts to 09-06.
- **Fix:** Test header comments reference the ROADMAP wave numbers (the authoritative wave map). Same intent — no behavioral change.
- **Files:** the 6 Deno test files.

**2. [Rule 3 — Deno std pin] New tests import `deno.land/std@0.224.0/assert`**
- **Issue:** The analog `strict-schema.test.ts` uses Vitest imports (`from 'vitest'`), which do NOT run under `deno test` (it errors as an uncaught import). To keep the new Deno tests runnable under `deno test`, they use the Deno std assert module.
- **Note:** `strict-schema.test.ts` itself is left untouched — its `deno test` uncaught error is pre-existing and out of scope for this plan (Phase 8 artifact).

Otherwise the plan executed as written.

## Known Stubs

None that block the plan goal. The 6 RED Deno tests reference implementation modules (`pii-masker.ts`, `circuit-breaker.ts`, `injection-detector.ts`, `ai-cost.ts`, `ai-client.ts`, `sync-prompts.ts`) that do not exist yet **by design** — they are Wave-0 RED scaffolds whose module-not-found failure is the calibrated assertion. Plans 09-04/05/06 land the implementations and flip them GREEN.

## Self-Check: PASSED

- Files: all 8 created files present on disk (verified via `ls`).
- Commits: `01deaea`, `190b062`, `60b8b3a` all in `git log`.
