---
phase: 23
slug: ressurrei-o-da-stack-de-ia
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-05
updated: 2026-07-05
---

# Phase 23 — Validation Strategy

> Per-phase validation contract. The Deno EF corpus is now BLOCKING in CI (Phase 22), so code+test change together and each `_shared`/EF edit is regress-guarded by ~148 Deno tests. Populated per-task by the planner (6 plans / 4 waves).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Deno test (EF `_shared` + EFs) — primary; Vitest (frontend UX-07/09 screens); tsc |
| **Config file** | `supabase/functions/deno.json`, `vite.config.ts`, `tsconfig.json` |
| **Quick run command** | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` |
| **Full suite command** | `deno test … supabase/functions && npm run test:run && npm run lint` |
| **Estimated runtime** | ~100s (Deno ~15s, Vitest ~60s, tsc ~20s) |

---

## Sampling Rate

- **After every task commit:** scoped `deno test` for the touched `_shared`/EF module (or `npm run test:run` for a frontend task).
- **After every plan wave:** full suite (`deno test … && npm run test:run && npm run lint`).
- **Before `/gsd:verify-work`:** Deno corpus green + Vitest green + tsc ≤ 133 (Phase 22 pinned baseline).
- **Max feedback latency:** ~100s.

---

## Per-Task Verification Map

> Every code task has an `<automated>` Deno/Vitest command; the two [BLOCKING] PROD plans (23-05/06) verify via Supabase MCP SQL smokes + live ai_call_logs queries (manual-only, documented below).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-01-T1 | 01 | 1 | AI-02, AI-07 | T-23-01-02 | sharedBreaker opens at THRESHOLD≤MAX_ATTEMPTS; parseIntEnv guards NaN | deno unit | `deno test … circuit-breaker.test.ts ai-client.test.ts` | ✅ (update) | ⬜ |
| 23-01-T2 | 01 | 1 | AI-03, AI-04 | T-23-01-01 | isRetryable true for APIConnectionTimeoutError/"Request timed out."; retries capped when timeout>25s | deno unit | `deno test … ai-client.test.ts` | ✅ (fix mask) | ⬜ |
| 23-01-T3 | 01 | 1 | AI-05 | T-23-01-03 | replay returns SUCCESS only; failure falls through to fresh call | deno unit | `deno test … ai-client.test.ts` | ✅ | ⬜ |
| 23-02-T1 | 02 | 1 | AI-01 | T-23-02-01 | SCHEMA_VERSIONS mirrors enum; sweep guard; emitPromptStubAlert writes alert row | deno unit | `deno test … prompt-loader.test.ts` | ❌ W0 (new) | ⬜ |
| 23-02-T2 | 02 | 1 | AI-01, AI-04 | T-23-02-01/02 | 6 EFs re-throw structured error (no 0.0.0 stub); transcricao 60s | deno unit + grep | `deno test … prompt-catch.test.ts` + grep 0 stubs | ❌ W0 (new) | ⬜ |
| 23-02-T3 | 02 | 1 | AI-01, UX-07 | T-23-02-01 | devolutiva fails loud pre-enum; buildDevolutivaUserBlock band-only (no percentile) | deno unit | `deno test … supabase/functions` | ❌ W0 (new) | ⬜ |
| 23-03-T1 | 03 | 2 | AI-06 | T-23-03-01/02 | pre-call kill-switch refuses over-cap (0 provider calls), fail-open on lookup error | deno unit | `deno test … ai-client.test.ts` | ✅ | ⬜ |
| 23-03-T2 | 03 | 2 | AI-06 | T-23-03-03 | alertMessage 4 channels incl candidate_cost_over_1 | deno unit | `deno test … cost-alerter-messages.test.ts` | ❌ W0 (new) | ⬜ |
| 23-04-T1 | 04 | 1 | UX-07 | T-23-04-01 | devolutiva: no `/Percentil \d/`; neutral Big-Five band | vitest | `npm run test:run -- DevolutivaBigFiveView` | ❌ W0 (new) | ⬜ |
| 23-04-T2 | 04 | 1 | UX-07 | T-23-04-01 | ScorecardAvaliacao/ScoreCard: no raw percentile; band labels | vitest | `npm run test:run -- ScorecardAvaliacao ScoreCard` | ❌ W0 (new) | ⬜ |
| 23-04-T3 | 04 | 1 | UX-09 | T-23-04-02 | triagem out of WEIGHTED_KEYS; ≥2 stages → consolidated; else null + distinct msg | deno + vitest | `deno test … consolidar && npm run test:run -- ConsolidacaoDashboard` | ⚠️ extend | ⬜ |
| 23-05-T1 | 05 | 3 | AI-01 | T-23-05-01 | PROD verify: 3 call_types is_active; ai_call_logs.prompt_version (Open Q3) | SQL smoke (MCP) | `mcp execute_sql` SELECT is_active/columns | manual | ⬜ |
| 23-05-T2 | 05 | 3 | AI-01 | T-23-05-01 | enum accepts bigfive_devolutiva; 1 active row; ai_call_logs accepts enum | SQL smoke (MCP) | `SELECT 'bigfive_devolutiva'::llm_call_type` + is_active | manual | ⬜ |
| 23-05-T3 | 05 | 3 | AI-06 | T-23-05-02 | notify_cost_anomaly emits candidate_cost_over_1 + RAISE WARNING | SQL smoke (MCP) | `SELECT prosrc FROM pg_proc WHERE proname='notify_cost_anomaly'` | manual | ⬜ |
| 23-06-T1 | 06 | 4 | AI-01/04/06/UX-07/09 | T-23-06-01/02/03 | 9 EFs redeployed (bundle fresh); no verify_jwt change; static imports | deploy smoke | `supabase functions list` + `grep -rn 'import(\[' == 0` | manual | ⬜ |
| 23-06-T2 | 06 | 4 | AI-01 | T-23-06-01 | 5 broken call_types log real semver live; bigfive_devolutiva logs | live SQL smoke | ai_call_logs post-invocation query | manual | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] **[BLOCKING/non-autonomous — Plan 23-05]** PROD migration via Supabase MCP: `ALTER TYPE llm_call_type ADD VALUE 'bigfive_devolutiva'` (non-transactional, own file) + seed + activate prompt + verify `ai_call_logs.call_type` accepts it. Confirm Open-Qs first (is_active of culture_fit_essay/transcript_analysis/interview_guide; ai_call_logs.prompt_version column existence).
- [ ] **[BLOCKING/non-autonomous — Plan 23-06]** Redeploy all 7 AI EFs + cost-alerter + consolidar-decisao-final (bundle-freeze — `_shared` edits only apply to redeployed EFs). No verify_jwt/authz change (Phase 24).
- [ ] New test scaffolds created inside the code plans: `prompt-loader.test.ts` (sweep), `prompt-catch.test.ts` (catch contract + emitPromptStubAlert), `cost-alerter-messages.test.ts` (4 channels), Vitest for DevolutivaBigFiveView / ScorecardAvaliacao / ScoreCard / ConsolidacaoDashboard.
- [ ] Existing Deno (ai-client/circuit-breaker) + Vitest infra covers the remaining code-level requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The 5 broken call_types run the real prompt LIVE in PROD (non-0.0.0) | AI-01 | Only a real EF invocation against PROD prompt_versions proves the stub is gone | Plan 23-06 T2: trigger each EF against the seed candidatura; confirm ai_call_logs shows the real semver, not a stub/500 |
| bigfive_devolutiva logs to ai_call_logs (enum accepted) | AI-01 | Enum acceptance only observable against PROD schema | Plan 23-05 T2 smoke + Plan 23-06 T2 live log |
| Cost guardrail actually alarms | AI-06 | Needs a real spend threshold crossing | Simulate/observe a threshold; confirm the alarm channel fires without the 1-day lag (23-HUMAN-UAT.md) |
| Devolutiva shows no raw percentile (visual) | UX-07 | Final visual confirmation of the rendered screen | 23-HUMAN-UAT.md: open a candidate devolutiva; confirm bands, no `Percentil N` |
| Consolidation suppressed until ≥2 stages (visual) | UX-09 | Visual confirmation of the distinct suppression message | 23-HUMAN-UAT.md: a candidatura with 1 completed stage shows the suppression message, not the empty-state |

*Code-level behaviors have automated Deno/Vitest verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a [BLOCKING] MCP/live smoke dependency
- [x] No 3 consecutive tasks without automated verify (Waves 1-2 are all Deno/Vitest; Waves 3-4 are documented manual PROD smokes)
- [x] Wave 0 covers the [BLOCKING] migration (23-05) + redeploys (23-06) + cost scaffolding
- [x] No watch-mode flags
- [x] `nyquist_compliant: true` set by planner after per-task map filled

**Approval:** planner-approved 2026-07-05
