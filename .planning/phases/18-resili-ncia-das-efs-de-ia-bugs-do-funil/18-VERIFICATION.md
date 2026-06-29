---
phase: 18-resili-ncia-das-efs-de-ia-bugs-do-funil
verified: 2026-06-29T17:30:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Live round-trip under real Anthropic latency/overload — RESIL-01/02 end-to-end"
    expected: "callAi timeout fires within 25s on a slow/hanging Anthropic call; the retry loop retries with backoff; after MAX_ATTEMPTS the EF returns a structured error (not a hard crash). The redeployed EFs show no 38–102s hangs."
    why_human: "Requires real Anthropic 429/529/overload in PROD. Cannot be triggered deterministically in automated tests without a live adversarial provider."
  - test: "gerar-devolutiva-bigfive completes within execution window under real load (RESIL-02)"
    expected: "All 5 OCEAN dims return within ~25s wall time (parallel fan-out). If one dim times out, the other 4 still complete and the devolutiva is returned with the degraded dim's template text."
    why_human: "Requires a live PROD invocation of the redeployed EF. Concurrency behavior under real AI latency is not testable offline."
  - test: "Candidate and RH screens show loading → slow copy → error + retry under a slow AI EF (RESIL-03)"
    expected: "After ~8s of loading, the slow heading 'Estamos processando com IA…' appears. On failure the sobrecarga copy or generic copy appears (correct based on errorCode). Retry button is present and functions. No blank screen at any stage."
    why_human: "Visual, real-latency, requires triggering an actual slow EF invocation in the live app. Cannot be automated without a server and simulated latency."
  - test: "FIX-01 with a real candidatura — consolidar-decisao-final handles work_sample_sjt='na' + caso aberto pendente in PROD"
    expected: "The consolidado is not zero or null when the SJT tipo_score row shows 'na' and the caso_aberto sub-row is pendente_humano. The MC score is preserved."
    why_human: "Deferred to Phase 21 PROD-01/02 live UAT. Requires a real candidatura with a pending caso aberto in PROD. Code correctness is already regression-locked (FIX-01 Deno test passes)."
deferred:
  - truth: "Live round-trip verification of RESIL-01/02/03 under real Anthropic overload in PROD"
    addressed_in: "Phase 21"
    evidence: "Phase 21 success criteria 1 and 2: 'UAT live da Phase 11 … scoring round-trip com candidato real' and 'HUMAN-UAT live deferidos da Phase 16 fechados em PROD'; 18-07-SUMMARY.md explicitly defers live round-trip to Phase 21 (PROD-01/02)"
  - truth: "DevolutivaBigFiveView (the ~30s devolutiva read) is not yet on <AsyncState>"
    addressed_in: "Phase 21 or follow-up"
    evidence: "deferred-items.md explicitly logs this as out-of-scope for 18-06 (SCOPE BOUNDARY); the questionnaire read region IS on <AsyncState>; devolutiva view adopts AsyncState is a clean one-screen follow-up"
---

# Phase 18: Resiliência das EFs de IA & Bugs do Funil — Verification Report

**Phase Goal:** As Edge Functions de IA do funil resistem a latência alta e overload transiente da Anthropic sem falha dura, candidato e RH veem estado claro durante chamadas lentas/falhas, e os 4 achados do E2E live em PROD (candidatura a1dd4c42) deixam de travar o funil.
**Verified:** 2026-06-29T17:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Uma EF de IA que recebe 429/529/overload não falha na 1ª tentativa — retenta com backoff dentro de um timeout configurável (RESIL-01) | VERIFIED | `supabase/functions/_shared/ai-client.ts` L70/78: `MAX_ATTEMPTS` and `AI_CALL_TIMEOUT_MS` env-configurable with safe defaults 3/25000. L369/470: `{ timeout: AI_CALL_TIMEOUT_MS, maxRetries: 0 }` passed to both Anthropic and OpenAI `parse()` calls. Deno test `RESIL-01 — per-call timeout + maxRetries:0 passed to messages.parse` passes (8/8 tests green). The hand-rolled retry loop (L349) remains the single retry owner. |
| 2 | `gerar-devolutiva-bigfive` completa dentro do limite de execução (RESIL-02) | VERIFIED | `supabase/functions/gerar-devolutiva-bigfive/index.ts` L397: `await Promise.allSettled(DIMS.map(...))` — 5 concurrent dims. L316: `for (let attempt = 0; attempt < 1; attempt++)` — 1 attempt per dim. Per-dim inline degrade to `BAND_TEMPLATES` on rejection. Deno test 7/7 passes including the concurrency gate (deferred-promise that deadlocks on sequential code) and per-dim rejection isolation. Live PROD: EF redeployed as `gerar-devolutiva-bigfive` v6→v7 (18-07-SUMMARY.md). Live round-trip under real overload → deferred to Phase 21. |
| 3 | Quando uma EF de IA demora ou falha, a tela do candidato e do RH mostram loading, erro legível e retry — nenhuma tela trava em branco (RESIL-03) | VERIFIED | `src/components/ui/AsyncState.tsx` exports `AsyncState` with 5-state contract (loading/slow@8s/error/empty/success); `AI_UNAVAILABLE` → sobrecarga copy; else generic copy; retry in error state only with `disabled={retrying}`. All 5 AI screens confirmed: `ConsolidacaoDashboard.tsx`, `BigFiveQuestionnaireScreen.tsx`, `SjtCasoAbertoScreen.tsx`, `RedacaoEditorScreen.tsx`, `ComparativoScreen.tsx` all import and use `<AsyncState>`. `extractEfErrorCode` wired in all 4 AI services (decisao, avaliacao, bigfive, triagem). Vitest 657/657 green. Visual real-latency behavior → deferred to Phase 21. |
| 4 | `consolidar-decisao-final` produz consolidado correto quando `work_sample_sjt='na'` e caso aberto pendente — não trava nem zera (FIX-01) | VERIFIED | `supabase/functions/consolidar-decisao-final/index.ts` L173: `export function normalizeSjtComposite` — body unchanged from commit `350e994`, only `export` prepended. Deno tests: `FIX-01: caso_aberto pendente-único → null` and `FIX-01: MC sucesso preserved when caso_aberto pendente (8/10 → 80, not zeroed)` — both pass (11/11 total). EF redeployed v2→v3. Live candidatura round-trip → Phase 21. |
| 5 | A tela de avaliação carrega perguntas independentemente do mismatch `status='active'` vs `'ativo'` (FIX-02) | VERIFIED | `src/features/avaliacao/services/avaliacaoService.ts` L140: `.eq('status', 'active')` — canonical value. Vitest regression test `src/features/avaliacao/services/__tests__/avaliacaoService.test.ts` asserts `toHaveBeenCalledWith('status', 'active')` AND returned rows length > 0. Test passes (657/657 vitest green). |

**Score: 5/5 truths verified**

---

### Deferred Items (addressed in later phases — not actionable gaps)

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Live round-trip verification of RESIL-01/02/03 under real Anthropic overload | Phase 21 | Phase 21 SC 1/2 (PROD-01/02); 18-07-SUMMARY.md explicitly defers; 18-VALIDATION.md Manual-Only Verifications table |
| 2 | `DevolutivaBigFiveView` async state not yet on `<AsyncState>` | Phase 21 or follow-up | deferred-items.md: "a one-screen adoption identical to the three done in 18-06"; the questionnaire screen (the primary read with slow loading) IS adopted; devolutiva view is downstream |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/_shared/ai-client.ts` | Per-call timeout + maxRetries:0 + env-config | VERIFIED | L70: `MAX_ATTEMPTS=Number(Deno.env.get…"3")`, L78: `AI_CALL_TIMEOUT_MS=…"25000"`, L369+470: `{ timeout, maxRetries: 0 }` on both provider calls |
| `supabase/functions/_shared/__tests__/ai-client.test.ts` | RESIL-01 regression tests (maxRetries:0, timeout>0) | VERIFIED | 3 RESIL-01 Deno tests added; `makeMockAnthropic` captures `[req, opts]` tuples; `opts.maxRetries === 0` + `opts.timeout > 0` asserted |
| `supabase/functions/gerar-devolutiva-bigfive/index.ts` | Promise.allSettled fan-out, 1 attempt/dim, per-dim degrade | VERIFIED | L397: `Promise.allSettled(DIMS.map(...))` present; L316: `attempt < 1`; inline degrade on `rejected` result |
| `supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts` | 4 Deno cases: concurrency, 1-attempt, degrade, OCEAN order | VERIFIED | 7 tests pass including the deferred-promise concurrency gate and single-dim-rejection isolation |
| `supabase/functions/consolidar-decisao-final/index.ts` | `export function normalizeSjtComposite` | VERIFIED | L173: `export function normalizeSjtComposite` present; body byte-unchanged from `350e994` |
| `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` | FIX-01 regression cases (null + 80) | VERIFIED | L369+379: two FIX-01 Deno tests; both pass |
| `src/features/avaliacao/services/__tests__/avaliacaoService.test.ts` | FIX-02 regression (status='active', rows returned) | VERIFIED | Asserts `toHaveBeenCalledWith('status','active')` and `perguntas.length > 0`; passes |
| `src/components/ui/AsyncState.tsx` | 5-state contract, AI_UNAVAILABLE copy, retry | VERIFIED | Named `AsyncState` export; `COPY` const with verbatim PT-BR; `AI_UNAVAILABLE` branch at L175; slow timer via useEffect |
| `src/components/ui/__tests__/AsyncState.test.tsx` | 7 cases: loading, slow@8s, error generic, error overload, retry+disabled, empty, success | VERIFIED | All 7 cases present; fake timers for slow@8s; `AI_UNAVAILABLE` overload copy asserted |
| `src/lib/efErrors.ts` | `extractEfErrorCode` — reads both body shapes, never throws | VERIFIED | Named export `extractEfErrorCode` at L38; reads `data.error_code` and `error.context.json().error_code` with try/catch degrade |
| `src/lib/__tests__/efErrors.test.ts` | 4 cases including AI_UNAVAILABLE | VERIFIED | 4 Vitest cases including `AI_UNAVAILABLE` via data and via error.context; all pass |
| `src/features/hub-candidato/components/HubSection.tsx` | Delegates to `<AsyncState>` | VERIFIED | L28: imports `AsyncState`; L86: `<AsyncState>` used; `futuro`/`sem_dados` copy preserved as overrides |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `supabase/functions/_shared/ai-client.ts` | `anthropic.messages.parse` | `{ timeout: AI_CALL_TIMEOUT_MS, maxRetries: 0 }` at L369 | VERIFIED | grep confirms `maxRetries: 0` at L369 and L470 |
| `supabase/functions/gerar-devolutiva-bigfive/index.ts` | `personalizeDim` | `Promise.allSettled` over DIMS, 1 attempt, degrade | VERIFIED | L397: `Promise.allSettled(DIMS.map(...))` present; L316: `< 1` |
| `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` | `normalizeSjtComposite` | `import { normalizeSjtComposite } from '../index.ts'` | VERIFIED | L364: dynamic import with typed interface; FIX-01 cases pass |
| `src/features/avaliacao/services/avaliacaoService.ts` | `src/lib/efErrors.ts` | `extractEfErrorCode(data, error)` at L322 | VERIFIED | Import at L30; usage at L322 |
| `src/features/triagem/services/triagemService.ts` | `src/lib/efErrors.ts` | `extractEfErrorCode(data, error)` at L256 | VERIFIED | Import at L17; usage at L256 (MIXED_VAGA path also preserved) |
| `src/features/decisao/services/decisaoService.ts` | `src/lib/efErrors.ts` | `extractEfErrorCode(data, error)` at L102+L114 | VERIFIED | Import at L30; used in both error branches |
| `src/features/avaliacao/services/bigfiveService.ts` | `src/lib/efErrors.ts` | `extractEfErrorCode(data, error)` at L196 | VERIFIED | Import at L29; usage at L196 |
| `src/features/decisao/components/ConsolidacaoDashboard.tsx` | `src/components/ui/AsyncState.tsx` | `<AsyncState isLoading isError errorCode onRetry>` at L110 | VERIFIED | Import at L30; usage at L110 |
| `src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx` | `src/components/ui/AsyncState.tsx` | `<AsyncState>` at L382 | VERIFIED | Import at L27; usage at L382 |
| `src/features/triagem/components/ComparativoScreen.tsx` | `src/components/ui/AsyncState.tsx` | `<AsyncState>` at L134 | VERIFIED | Import at L18; usage at L134 |
| `src/features/hub-candidato/components/HubSection.tsx` | `src/components/ui/AsyncState.tsx` | delegation via `<AsyncState>` | VERIFIED | Import at L28; `<AsyncState>` at L86; no drift |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `AsyncState.tsx` | `errorCode` prop | Caller passes `error_code` from `*ServiceError.details` (wired in Plan 05) | Yes — `extractEfErrorCode` reads live EF response body | FLOWING |
| `ai-client.ts` | `AI_CALL_TIMEOUT_MS` / `MAX_ATTEMPTS` | `Deno.env.get(...)` with safe defaults | Yes — env-configurable; defaults 25000/3 are non-breaking | FLOWING |
| `consolidar-decisao-final/index.ts` | `normalizeSjtComposite` return | Pure function over `ScoreRow[]` from DB | Yes — pure aggregation, locked by regression test | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| RESIL-01 — maxRetries:0 + timeout reach provider | `deno test --allow-read --allow-env supabase/functions/_shared/__tests__/ai-client.test.ts` | 8 passed / 0 failed | PASS |
| RESIL-01 — default env guards (25000ms/3 when unset) | Same suite, test "RESIL-01 — default timeout applies when AI_CALL_TIMEOUT_MS unset" | Passed | PASS |
| RESIL-01 — retryable failure retried by loop | Same suite, test "RESIL-01 — retryable failure is retried by the loop" | Passed (2s) | PASS |
| RESIL-02 — 5 dims concurrent (deferred-promise gate) | `deno test --allow-read --allow-env supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts` | 7 passed / 0 failed | PASS |
| FIX-01 — pending-only → null | `deno test --allow-read --allow-env supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` | 11 passed / 0 failed | PASS |
| FIX-02 — status='active' query | `npm run test:run` (vitest 76 files) | 657 passed / 0 failed | PASS |
| RESIL-03 — AsyncState 5-state contract | Same vitest run (AsyncState.test.tsx included) | Passed | PASS |
| tsc baseline not regressed | `npm run lint 2>&1 \| grep "error TS" \| wc -l` | 258 (= FOUND-08 pre-existing baseline) | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| RESIL-01 | 18-01 | callAi per-call timeout + maxRetries:0 + env-config | SATISFIED | ai-client.ts L70/78/369/470; Deno 8/8 RESIL-01 tests; 8 EFs redeployed PROD |
| RESIL-02 | 18-02 | gerar-devolutiva-bigfive parallelized (allSettled, 1 attempt, degrade) | SATISFIED | index.ts L397 allSettled; L316 attempt<1; Deno 7/7 tests; EF redeployed v6→v7 |
| RESIL-03 | 18-04/05/06 | AsyncState + extractEfErrorCode + 5 screen adoption | SATISFIED | All 5 screens import AsyncState; 4 services wire extractEfErrorCode; Vitest 657/657 |
| FIX-01 | 18-03 | consolidar handles SJT na + caso_aberto pendente | SATISFIED | export normalizeSjtComposite L173; 2 Deno regression cases pass; EF redeployed v2→v3 |
| FIX-02 | 18-03 | avaliacaoService uses status='active' | SATISFIED | avaliacaoService.ts L140; Vitest regression asserts toHaveBeenCalledWith('status','active') |

**Note:** REQUIREMENTS.md traceability table shows `RESIL-02 | Phase 18 | Pending` — this is a documentation artifact lag. The requirement text (`- [ ]`) was not ticked after execution. The code, tests, and PROD deploy all confirm RESIL-02 is complete. The ROADMAP.md Phase 18 entry is correctly marked `[x]`. This is a doc-only drift, not a code gap.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/functions/_shared/ai-client.ts` | L6 | `TODO` in JSDoc (`TODO Edge Function consumidor`) | INFO | The word "TODO" appears in the phrase "TODO Edge Function consumidor de" (Portuguese word "todo" meaning "all/every"), NOT an English action marker. Not a debt marker — false positive. |

No unreferenced TBD/FIXME/XXX debt markers found in Phase 18 modified files.

---

### Human Verification Required

#### 1. Live round-trip under real Anthropic latency/overload (RESIL-01 + RESIL-02)

**Test:** Invoke a real AI EF (e.g., `analise-candidato-individual` or `gerar-devolutiva-bigfive`) against PROD while Anthropic is under load. Alternatively, use a debugging tool to introduce artificial latency/429 responses.
**Expected:** The EF does not hang past ~25s per call; the retry loop fires on a retryable error; after 3 attempts the EF returns a structured `AI_UNAVAILABLE` or similar code, not a hard crash. The `gerar-devolutiva-bigfive` completes all 5 dims within ~25s (parallel ceiling), not 5×25s = 125s.
**Why human:** Requires real Anthropic 429/529/overload in PROD. Cannot be triggered deterministically in automated tests without a live adversarial provider. Explicitly deferred to Phase 21 (PROD-01/02).

#### 2. Candidate/RH screen visual behavior under a slow AI EF (RESIL-03)

**Test:** Open a candidate AI screen (e.g., BigFive questionnaire) or RH screen (Consolidação, Comparativo) while an EF is intentionally slow (e.g., via network throttling or a slow PROD moment). Observe the state progression.
**Expected:** Within ~8s of loading, the slow heading "Estamos processando com IA…" appears. On error, the appropriate copy appears (sobrecarga if AI_UNAVAILABLE, generic otherwise). The retry button is present, clickable, and shows "Tentando…" + disabled while retrying. No blank screen at any point.
**Why human:** Visual, real-latency behavior. The component contract is unit-tested (657 tests pass including AsyncState fake-timer slow@8s test), but the actual screen rendering under a live slow EF requires a running app. Deferred to Phase 21.

#### 3. FIX-01 with a real PROD candidatura (consolidar live behavior)

**Test:** Trigger `consolidar-decisao-final` on a candidatura where `work_sample_sjt='na'` and there is a `caso_aberto` sub-row with `status='pendente_humano'`.
**Expected:** The consolidado is not null or zero. The MC score (if present and `status='sucesso'`) is preserved in the consolidado value.
**Why human:** Requires a real candidatura in the right state in PROD. The code correctness is locked by the FIX-01 Deno regression tests (2/2 pass), but the live round-trip with real DB rows is a Phase 21 PROD-01 UAT item.

#### 4. REQUIREMENTS.md doc drift — RESIL-02 traceability table

**Test:** Update REQUIREMENTS.md traceability table row `| RESIL-02 | Phase 18 | Pending |` → `| RESIL-02 | Phase 18 | Complete |` and change `- [ ] **RESIL-02**` to `- [x] **RESIL-02**`.
**Expected:** REQUIREMENTS.md traceability is consistent with the shipped code.
**Why human:** Documentation edit — low complexity, but requires a human to commit the update. The code is correct; the traceability doc has a stale `Pending` marker.

---

### Gaps Summary

No code-level gaps identified. All 5 ROADMAP.md success criteria are satisfied in the codebase:

- RESIL-01: Implemented and regression-tested in `ai-client.ts` (8/8 Deno tests pass); 8 EFs redeployed to PROD.
- RESIL-02: Implemented and regression-tested in `gerar-devolutiva-bigfive/index.ts` (7/7 Deno tests pass); EF redeployed to PROD as v7.
- RESIL-03: Shared `<AsyncState>` wrapper implemented with contract tests (657/657 vitest); `extractEfErrorCode` wired in all 4 AI services; all 5 AI screens adopt `<AsyncState>`.
- FIX-01: `normalizeSjtComposite` exported and locked by 2 Deno regression cases (11/11 pass); EF redeployed v3.
- FIX-02: `avaliacaoService` confirmed at `.eq('status','active')`; Vitest regression asserts the canonical sentinel.

The 6 code-review warnings (WR-01 through WR-06) and 5 info items (IN-01 through IN-05) were all found and fixed in the post-review commit batch (`3d0f3ec` and related `ba4af64`–`7c9da3e`). The 18-REVIEW.md documents 0 critical/blockers.

Human verification is required only for live PROD behavior under real Anthropic load (deferred to Phase 21 per the plan's own design), for visual slow/error UX verification, and for a minor documentation update to REQUIREMENTS.md.

---

_Verified: 2026-06-29T17:30:00Z_
_Verifier: Claude (gsd-verifier)_
