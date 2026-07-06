---
phase: 23
slug: ressurrei-o-da-stack-de-ia
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-05
---

# Phase 23 — Validation Strategy

> Per-phase validation contract. The Deno EF corpus is now BLOCKING in CI (Phase 22), so code+test change together and each `_shared`/EF edit is regress-guarded by ~148 Deno tests. Populated per-task by the planner.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Deno test (EF `_shared` + EFs) — primary for this phase; Vitest (frontend UX-07/09 screens); tsc |
| **Config file** | `supabase/functions/deno.json`, `vite.config.ts`, `tsconfig.json` |
| **Quick run command** | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` |
| **Full suite command** | `deno test … supabase/functions && npm run test:run && npm run lint` |
| **Estimated runtime** | ~100s (Deno ~15s, Vitest ~60s, tsc ~20s) |

---

## Sampling Rate

- **After every task commit:** scoped `deno test` for the touched `_shared`/EF module (or `npm run test:run` for a frontend task).
- **After every plan wave:** full suite (`deno test … && npm run test:run && npm run lint`).
- **Before `/gsd:verify-work`:** Deno corpus green + Vitest green + tsc ≤ 133.
- **Max feedback latency:** ~100s.

---

## Per-Task Verification Map

> Populated by the planner. Each AI-req maps to a Deno unit test on the touched `_shared` module; UX-07/09 to Vitest on the screens/EF output.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-XX | XX | X | AI-01 | — | 7 call_types resolve real prompt (not 0.0.0 stub); catch no longer swallows; alarm fires at catch | deno unit | `deno test … prompt-loader.test.ts` | ✅ | ⬜ |
| 23-XX | XX | X | AI-02 | — | shared breaker opens after THRESHOLD≤MAX_ATTEMPTS across calls | deno unit | `deno test … circuit-breaker.test.ts` | ✅ (update) | ⬜ |
| 23-XX | XX | X | AI-03 | — | isRetryable true for APIConnectionTimeoutError / "Request timed out." | deno unit | `deno test … ai-client.test.ts` | ✅ (fix masking test) | ⬜ |
| 23-XX | XX | X | AI-04 | — | avaliar-transcricao passes 60s timeoutMs; attempts capped to fit 150s | deno unit | `deno test … ai-client.test.ts` | ✅ | ⬜ |
| 23-XX | XX | X | AI-05 | — | replay returns cached SUCCESS only; failure falls through to fresh call | deno unit | `deno test … ai-client.test.ts` | ✅ | ⬜ |
| 23-XX | XX | X | AI-06 | T-23 cost | cost guardrail scope/window/channel real + pre-call kill-switch | deno unit | `deno test … ai-cost*.test.ts` | ❌ W0 | ⬜ |
| 23-XX | XX | X | AI-07 | — | parseIntEnv: malformed env → default, no NaN loop-death | deno unit | `deno test … ai-client.test.ts` | ✅ | ⬜ |
| 23-XX | XX | X | UX-07 | — | no raw percentile in devolutiva/RH; neutral Big-Five bands | vitest | `npm run test:run` (DevolutivaBigFiveView / Scorecard) | ✅ | ⬜ |
| 23-XX | XX | X | UX-09 | — | triagem out of WEIGHTED_KEYS; ≥2 stages required for consolidated number | vitest/deno | `npm run test:run` + `deno test … consolidar` | ✅ | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] **[BLOCKING/non-autonomous]** PROD migration via Supabase MCP: `ALTER TYPE llm_call_type ADD VALUE 'bigfive_devolutiva'` (non-transactional) + seed + activate prompt + sync; verify `ai_call_logs.call_type` accepts it. Confirm the 4 research Open-Qs first (is_active of culture_fit_essay/transcript_analysis/interview_guide; ai_call_logs.prompt_version column existence).
- [ ] **[BLOCKING/non-autonomous]** Redeploy all 7 AI EFs + cost-alerter (bundle-freeze — `_shared` edits only apply to redeployed EFs).
- [ ] `ai-cost` guardrail test scaffolding (pre-call kill-switch).
- [ ] Existing Deno + Vitest infra covers all code-level requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The 7 call_types run the real prompt LIVE in PROD (non-0.0.0) | AI-01 | Only a real EF invocation against PROD prompt_versions proves the stub is gone | Trigger each EF against the seed candidatura; confirm ai_call_logs shows the real semver, not a stub/500 |
| Cost guardrail actually alarms | AI-06 | Needs a real spend threshold crossing | Simulate/observe a threshold; confirm the alarm channel fires without the 1-day lag |

*Code-level behaviors have automated Deno/Vitest verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependency
- [ ] No 3 consecutive tasks without automated verify
- [ ] Wave 0 covers the [BLOCKING] migration + redeploys + cost scaffolding
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set by planner after per-task map filled

**Approval:** pending
