---
phase: 23-ressurrei-o-da-stack-de-ia
reviewed: 2026-07-06T04:30:22Z
depth: deep
files_reviewed: 37
files_reviewed_list:
  - scripts/sync-prompts.ts
  - src/components/ScoreCard.tsx
  - src/components/__tests__/ScoreCard.test.tsx
  - src/features/avaliacao/components/DevolutivaBigFiveView.tsx
  - src/features/avaliacao/components/ScorecardAvaliacao.tsx
  - src/features/avaliacao/components/__tests__/DevolutivaBigFiveView.test.tsx
  - src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx
  - src/features/decisao/components/ConsolidacaoDashboard.tsx
  - src/features/decisao/components/__tests__/ConsolidacaoDashboard.test.tsx
  - supabase/functions/_shared/__tests__/ai-client.test.ts
  - supabase/functions/_shared/__tests__/circuit-breaker.test.ts
  - supabase/functions/_shared/__tests__/cost-alerter-messages.test.ts
  - supabase/functions/_shared/__tests__/prompt-catch.test.ts
  - supabase/functions/_shared/__tests__/prompt-loader.test.ts
  - supabase/functions/_shared/ai-client.ts
  - supabase/functions/_shared/audit-logger.ts
  - supabase/functions/_shared/circuit-breaker.ts
  - supabase/functions/_shared/prompt-loader.ts
  - supabase/functions/analise-candidato-individual/__tests__/index.test.ts
  - supabase/functions/analise-candidato-individual/index.ts
  - supabase/functions/avaliar-redacao-cultural/index.test.ts
  - supabase/functions/avaliar-redacao-cultural/index.ts
  - supabase/functions/avaliar-redacao/__tests__/index.test.ts
  - supabase/functions/avaliar-redacao/index.ts
  - supabase/functions/avaliar-transcricao-entrevista/index.ts
  - supabase/functions/comparativo-candidatos/__tests__/index.test.ts
  - supabase/functions/comparativo-candidatos/index.ts
  - supabase/functions/consolidar-decisao-final/__tests__/index.test.ts
  - supabase/functions/consolidar-decisao-final/index.ts
  - supabase/functions/cost-alerter/index.ts
  - supabase/functions/cost-alerter/messages.ts
  - supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts
  - supabase/functions/gerar-devolutiva-bigfive/index.ts
  - supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts
  - supabase/functions/gerar-guia-entrevista/index.ts
  - supabase/migrations/20260706010519_bigfive_devolutiva_enum.sql
  - supabase/migrations/20260706010544_bigfive_devolutiva_seed.sql
  - supabase/migrations/20260706010602_cost_guardrail_fix.sql
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-07-06T04:30:22Z
**Depth:** deep
**Files Reviewed:** 37
**Status:** issues_found

## Summary

Phase 23 revives the dead AI stack (SCHEMA_VERSIONS realignment, shared circuit
breaker, real timeout matching, idempotency replay, cost kill-switch, and
percentile→band UX honesty). Most of the changes are correct and well-tested
at the unit level: the `SCHEMA_VERSIONS` sweep, the circuit-breaker singleton +
`THRESHOLD ≤ MAX_ATTEMPTS` invariant, the retry-budget cap math (always ≥1
attempt), the narrowed catches in all 7 EFs, and the UX-07/UX-09 frontend +
backend changes all trace correctly through the code and hold up against the
edge cases the review context asked about.

However, cross-referencing the new AI-05 "replay success-only" logic against
the actual `ai_call_logs` schema (not just the test mocks) surfaces one
provable BLOCKER: the fresh retry call that AI-05 is designed to unlock cannot
actually persist its result, because `ai_call_logs.idempotency_key` carries an
unconditional `UNIQUE` constraint and `logAiCall` only ever `.insert()`s. This
silently defeats both AI-05 (no durable success is ever recorded for a retried
idempotency key) and undermines AI-06 (the retried spend never counts toward
the cost kill-switch, since it sums `cost_usd WHERE success=true`). All test
mocks in `ai-client.test.ts` are plain objects with no uniqueness enforcement,
so this gap is invisible at the unit-test level — a classic
mock-vs-real-schema contract gap (same pattern as
`feedback_integration_contract_gap` from Phase 11).

Three warnings round out the review: an architectural inconsistency in
`gerar-devolutiva-bigfive`'s error handling (it bypasses the EF's own
"never-absent" invariant on a prompt-resolution failure, unlike the other 6
EFs), a narrower-than-decided scope for the AI-06 cost guardrail (per-vaga
only, no global cap, despite CONTEXT.md's explicit "per-vaga + global"
decision), and a frontend/backend copy mismatch in `ConsolidacaoDashboard`'s
suppressed-aggregate message.

## Critical Issues

### CR-01: AI-05 replay-on-failure retry cannot persist — UNIQUE constraint on `idempotency_key` silently blocks the audit write and defeats the AI-06 cost cap

**File:** `supabase/functions/_shared/ai-client.ts:277-310` (`tryIdempotencyReplay`), `supabase/functions/_shared/audit-logger.ts:103-148` (`logAiCall`), schema: `supabase/migrations/20260609000001_prompt_library_schema.sql:193` (`idempotency_key text UNIQUE`)

**Issue:** AI-05's fix is: "a cached FAILURE (`success=false`) is NOT replayed → fall through to a fresh provider call" (`ai-client.ts:291-297`). This is correct at the decision layer — `tryIdempotencyReplay` returns `null` when `existing.success !== true`, and `callAi` proceeds to call the real provider again.

But `ai_call_logs.idempotency_key` is declared `text UNIQUE` (unconditional, not a partial index) in the base migration, and the OLD failed row (`success=false`) with that exact `idempotency_key` already occupies that unique slot. When the fresh retry completes (success OR failure) and reaches `logAiCall`, it does a plain `.from("ai_call_logs").insert(insertRow)` (`audit-logger.ts:141`) — never an upsert, never a delete/update of the stale row. Postgres rejects the second INSERT with `23505 unique_violation`. `logAiCall` swallows this: `if (error) { console.error(...) }` (`audit-logger.ts:142-148`) — no throw, no retry, no upsert fallback.

Consequences, all real and provable from the schema + code (not hypothetical):
1. **Audit trail is broken for exactly the scenario AI-05 targets.** The retried call's `ai_call_logs` row never lands. This contradicts the module's own stated invariant: "Toda chamada de IA DEVE ser registrada (IA-02)" (`audit-logger.ts:6`).
2. **The AI-06 pre-call cost kill-switch under-counts spend.** `isDailyCostCapExceeded` sums `cost_usd` from `ai_call_logs WHERE success=true` (`ai-client.ts:334-368`). Because the retry's insert fails, its real (paid) provider cost is invisible to this sum — an RH who repeatedly clicks "reprocessar" on a failed guia/transcrição/devolutiva can keep incurring real Anthropic/OpenAI spend that never shows up in the cap that AI-06 was just built to enforce.
3. **The retry never converges.** Since the stale failed row is the only row matching that `idempotency_key`, every subsequent call to `tryIdempotencyReplay` for the same key still finds `success=false` and returns `null` again — meaning every future "reprocessar" click makes a brand-new real API call, forever, with no way to ever reach a persisted `success=true` state for that key. Before this phase's fix, the (worse in a different way, but at least *convergent*) behavior was to replay the stale failure at zero cost; now it is a real-cost call that can never durably succeed.
4. This is invisible to the added tests: `ai-client.test.ts`'s `makeMockSupabaseWithReplay`/mock `insert()` are plain spies with no uniqueness enforcement (`ai-client.test.ts:100-118`), so "AI-05 — a cached FAILURE … is NOT replayed → fresh provider call" passes even though the real DB write for that fresh call is guaranteed to conflict.

Directly affected: `gerar-guia-entrevista` (`${cand}:${tipo}`), `avaliar-transcricao-entrevista` (`${cand}:transcript`), `gerar-devolutiva-bigfive` (`bigfive_devolutiva:${cand}:${dim}:${banda}`), `avaliar-redacao-cultural` (content-hashed key) — i.e., every EF that AI-05's research/plan explicitly calls out as "destravado" by this fix.

**Fix:** Make the write idempotent on `idempotency_key`, not insert-only. Either:
```ts
// audit-logger.ts — logAiCall: upsert instead of insert when idempotency_key is set
const writer = row.idempotency_key
  ? supabaseAdmin.from("ai_call_logs").upsert(insertRow, { onConflict: "idempotency_key" })
  : supabaseAdmin.from("ai_call_logs").insert(insertRow);
const { error } = await writer;
```
or delete/mark the stale failed row for that `idempotency_key` before the fresh call proceeds (e.g., in `tryIdempotencyReplay`'s `success!==true` branch, issue a `DELETE … WHERE idempotency_key = ? AND success = false` before returning `null`). The upsert approach is safer (single statement, no race between the delete and the new insert) and preserves "1 row per idempotency_key" as the schema already assumes.

## Warnings

### WR-01: `gerar-devolutiva-bigfive` bypasses its own "never-absent" invariant when prompt resolution fails (inconsistent with the other 6 EFs)

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:606-622`

**Issue:** In the 6 "normal" AI EFs (`analise-candidato-individual`, `avaliar-redacao`, `avaliar-redacao-cultural`, `avaliar-transcricao-entrevista`, `comparativo-candidatos`, `gerar-guia-entrevista`), the narrowed `loadPrompt` catch (AI-01) lives *inside* the exported `handler()` function, so a re-thrown `SchemaVersionMismatchError`/`PromptNotConfiguredError` is caught by that same handler's outer try/catch, which persists a `status: 'falhou'` row in the EF's own domain table (never-absent invariant) and returns a normal `200 {ok:false, status:'falhou'}` response.

In `gerar-devolutiva-bigfive`, the `loadPrompt` call (and its catch) sits in the `Deno.serve(...)` wrapper *before* `handler()` is even invoked (`index.ts:606-622`, vs. `handler()` defined at `index.ts:377`). `handler()` itself has several `return { status: "falhou" }` guards (lines 394, 422, 444, 542) that constitute its own never-absent invariant — but none of them ever run if `loadPrompt` throws, because `handler()` is never called. The thrown error propagates out of the `Deno.serve` callback with no wrapping try/catch, so the only observable trace is the `emitPromptStubAlert` row (which the catch does write, so it is not completely silent) plus whatever generic 500 Deno's default handler produces — no `devolutivas_candidato`/`scores_candidato` state records the failure the way the other 6 EFs do.

**Fix:** Move the `loadPrompt` resolution + narrowed catch inside `handler()` (or wrap the `Deno.serve` callback's prompt-resolution step in the same try/catch pattern used by the other 6 EFs), so a prompt-resolution failure for the devolutiva also produces a persisted, observable "falhou" trace consistent with the rest of the AI stack, rather than a bare unhandled rejection.

### WR-02: AI-06 cost guardrail implements only a per-vaga cap; the "global" scope from CONTEXT.md's decision was dropped without being flagged as a deviation

**File:** `supabase/functions/_shared/ai-client.ts:334-368` (`isDailyCostCapExceeded`)

**Issue:** `23-CONTEXT.md` and `23-RESEARCH.md` both state the AI-06 decision as: "corrigir o alarme p/ escopo/janela/canal reais (rolling diário, **per-vaga + global**)". The shipped kill-switch (`isDailyCostCapExceeded`) sums `cost_usd` filtered by a single `vaga_id` only — there is no aggregate daily cap across all vagas. A scenario where AI spend is spread thin across many vagas (each individually under the per-vaga cap) has no ceiling at all, even though the decision explicitly called for one. Unlike the `candidate_cost_over_1` narrowing (which is explicitly documented as an accepted data-model limitation in `23-05-SUMMARY.md`), the dropped "global" half of the AI-06 decision is not called out anywhere as an intentional deviation in any PLAN/SUMMARY reviewed.

**Fix:** Either add a second, cheap global-scope check (e.g., a materialized daily total across all vagas, or a periodic cron-refreshed counter) to `isDailyCostCapExceeded`/`callAi`, or — if the global cap is intentionally deferred — record that deviation explicitly (e.g., in a phase SUMMARY or a code comment analogous to the `candidate_cost_over_1` note in the migration) so it isn't mistaken for complete AI-06 coverage in a future audit.

### WR-03: `ConsolidacaoDashboard`'s suppressed-aggregate hero message doesn't match the backend's own distinction between "0 stages" and "1 stage" present

**File:** `src/features/decisao/components/ConsolidacaoDashboard.tsx:160-190`; contrast with `supabase/functions/consolidar-decisao-final/index.ts:187-206` (`buildRecommendation`)

**Issue:** The backend's `buildRecommendation` deliberately distinguishes two different `consolidated == null` cases: "Agregado suprimido até ≥2 etapas concluídas." when `presentCount >= 1`, vs. "Nenhuma etapa avaliável concluída — sem agregado disponível." when `presentCount === 0` (confirmed by the test `"UX-09 — triagem-only present → consolidated null"`, which produces 0 *weighted* present stages and would hit the second branch). The frontend hero, however, renders the hardcoded string "Agregado suprimido até ≥2 etapas concluídas" unconditionally whenever `data?.consolidated == null` (`ConsolidacaoDashboard.tsx:172-186`), regardless of whether 0 or 1 weighted stages are actually present — it never reads `data.recommendation`. In the common real-world case (a candidate whose only completed step so far is the CV triagem, i.e. 0 weighted stages), the RH sees "suppressed until ≥2 stages" (implying progress toward 2) when the backend's own copy would have said "no stage evaluated yet" — a minor but real inconsistency between the two message sources for the exact same state.

**Fix:** Either have the hero render `data.recommendation` directly (single source of truth, matches the backend's 0-vs-1 distinction), or gate the frontend's suppressed-message branch on the same `presentRows.length >= 1` weighted-stage condition the backend uses (excluding the triagem context row) rather than solely on `consolidated == null`.

## Info

### IN-01: `parseIntEnv`/`envInt` names imply integer parsing but accept (and are used for) decimal values

**File:** `supabase/functions/_shared/ai-client.ts:72-78`, `supabase/functions/_shared/circuit-breaker.ts:41-45`

**Issue:** `parseIntEnv`/`envInt` use `Number(raw)`, not `parseInt`/truncation — they happily accept `"50.5"` for `AI_DAILY_COST_CAP_USD` (a dollar amount, naturally decimal) even though the name suggests integer-only semantics. Functionally correct today, but the name invites a future maintainer to assume truncation happens, or to reach for a real `parseInt`-based helper for a genuinely integer-only env var and get surprised when a decimal silently passes through this one.

**Fix:** Rename to something scope-neutral (e.g. `parseNumEnv`) or add a one-line comment at the `AI_DAILY_COST_CAP_USD` call site clarifying that decimals are intentionally supported.

### IN-02: `isRetryable`'s widened timeout regex has a small theoretical over-match surface

**File:** `supabase/functions/_shared/ai-client.ts:250-264`

**Issue:** The new `/529|overloaded|503|429|tim(e|ed)\s*out/i` regex (plus the `name === "APIConnectionTimeoutError"` check) is the correct fix for the "Request timed out." masking bug (AI-03) and is well-covered by tests. As a minor note: the regex still runs as a substring match against `err.message`, so any error whose message happens to contain "timed out"/"timeout" for a genuinely non-retryable reason (e.g., a provider validation error that echoes back user-supplied text mentioning "session timed out") would be misclassified as retryable. Low practical risk today since these messages are SDK/provider-generated, not directly attacker-controlled, but worth keeping in mind if the SDK ever surfaces raw request content in error messages.

**Fix:** No action required now; if this ever becomes a real vector, prefer matching only on `err.name`/`err.constructor.name` and drop the message-substring fallback, or anchor the regex more precisely (e.g., require the exact SDK phrasing).

### IN-03: No EF-level regression test asserts `avaliar-transcricao-entrevista` actually passes `timeoutMs: 60000` to `callAi`

**File:** `supabase/functions/avaliar-transcricao-entrevista/index.ts:226`

**Issue:** AI-04's fix (`timeoutMs: parseIntEnv("TRANSCRICAO_TIMEOUT_MS", 60000)`) is a one-line, easy-to-silently-revert change, but there is no test in this EF's own test suite (nor in a shared fixture) that asserts the `callAi` call site actually threads this value through. The retry-budget-cap behavior is tested generically in `ai-client.test.ts` (AI-04 test using `SONNET_PROMPT` directly), but that test does not exercise this specific EF's call site. This mirrors a pre-existing gap (`gerar-guia-entrevista`'s own `timeoutMs: 60_000` from Phase 21 has the same lack of an EF-level assertion), so it is not a regression introduced by this phase, but it remains an easy-to-miss silent revert vector for both call sites.

**Fix:** Add a lightweight assertion (e.g., inject a spy `callAi` via the EF's dependency-injection test harness and assert the `timeoutMs` field on the captured args) in a follow-up test pass.

---

_Reviewed: 2026-07-06T04:30:22Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
