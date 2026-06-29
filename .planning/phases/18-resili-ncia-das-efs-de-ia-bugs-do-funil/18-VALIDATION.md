---
phase: 18
slug: resili-ncia-das-efs-de-ia-bugs-do-funil
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-29
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend/unit) + deno test (Edge Functions) |
| **Config file** | vitest.config.ts (frontend); deno.json per EF |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run && deno test supabase/functions/` |
| **Estimated runtime** | ~30 seconds (vitest); EF deno tests ~few s |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (scoped to touched files when possible)
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-T1 | 18-01 | 1 | RESIL-01 | T-18-01-DoS: bound retry composition | lint/investigation | `npm run lint` | ✅ ai-client.ts | ⬜ pending |
| 18-01-T2 | 18-01 | 1 | RESIL-01 | T-18-01-DoS: maxRetries:0 + per-call timeout | unit (Deno DI) | `deno test --allow-read --allow-env supabase/functions/_shared/__tests__/ai-client.test.ts` | ✅ extend | ⬜ pending |
| 18-01-T3 | 18-01 | 1 | RESIL-01 | T-18-01-DoS: asserts options reach provider | unit (Deno DI) | `deno test --allow-read --allow-env supabase/functions/_shared/__tests__/ai-client.test.ts` | ✅ extend | ⬜ pending |
| 18-02-T1 | 18-02 | 1 | RESIL-02 | T-18-02-T: per-dim degrade non-decisional | unit (Deno DI) | `deno test --allow-read --allow-env supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts` | ❌ create | ⬜ pending |
| 18-02-T2 | 18-02 | 1 | RESIL-02 | T-18-02-DoS: bounded 5-way parallel | unit (Deno DI) | `deno test --allow-read --allow-env supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts` | ❌ create | ⬜ pending |
| 18-03-T1 | 18-03 | 1 | FIX-01 | T-18-03-T: consolidar stays NO-LLM | unit (Deno pure fn) | `deno test --allow-read --allow-env supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` | ✅ extend | ⬜ pending |
| 18-03-T2 | 18-03 | 1 | FIX-02 | T-18-03-ID: allowlist read preserved | unit (Vitest mock) | `npm run test:run -- src/features/avaliacao/services/__tests__/avaliacaoService.test.ts` | ❌ create | ⬜ pending |
| 18-04-T1 | 18-04 | 1 | RESIL-03 | T-18-04-ID: static copy, no raw error echo | lint | `npm run lint` | ❌ create | ⬜ pending |
| 18-04-T2 | 18-04 | 1 | RESIL-03 | T-18-04-ID: errorCode copy branch only | component (Vitest+RTL fake timers) | `npm run test:run -- src/components/ui/__tests__/AsyncState.test.tsx` | ❌ create | ⬜ pending |
| 18-04-T3 | 18-04 | 1 | RESIL-03 | T-18-04-ID: no-drift delegation | lint + unit | `npm run lint && npm run test:run -- src/features/hub-candidato` | ❌ create | ⬜ pending |
| 18-05-T1 | 18-05 | 1 | RESIL-03 | T-18-05-ID: returns code only, never throws | unit (Vitest mock) | `npm run test:run -- src/lib/__tests__/efErrors.test.ts` | ❌ create | ⬜ pending |
| 18-05-T2 | 18-05 | 1 | RESIL-03 | T-18-05-ID3: no allowlist regression; MIXED_VAGA preserved | unit (Vitest) | `npm run lint && npm run test:run -- src/features/decisao src/features/triagem src/features/avaliacao/services` | ✅ existing | ⬜ pending |
| 18-06-T1 | 18-06 | 2 | RESIL-03 | T-18-06-T2: MIXED_VAGA preserved | unit (Vitest) | `npm run lint && npm run test:run -- src/features/decisao src/features/triagem` | ✅ existing | ⬜ pending |
| 18-06-T2 | 18-06 | 2 | RESIL-03 | T-18-06-ID: no PII to candidate | unit (Vitest) | `npm run lint && npm run test:run -- src/features/avaliacao` | ✅ existing | ⬜ pending |
| 18-07-T1 | 18-07 | 3 | RESIL-01/02, FIX-01 | T-18-07-DoS: enumerate full redeploy set | investigation (grep) | `grep -rl "callAi" supabase/functions/*/index.ts` | n/a | ⬜ pending |
| 18-07-T2 | 18-07 | 3 | RESIL-01/02, FIX-01 | T-18-07-EoP/SC: human-gated deploy, authz preserved | checkpoint:human-verify | `get_edge_function` diff (manual) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify Anthropic SDK 0.102.0 `messages.parse()` accepts the second `RequestOptions` arg (`{ timeout, maxRetries, signal }`) — Open Question A2 from RESEARCH.md; fallback = set on client constructor. **Handled as 18-01 Task 1 (investigation + documented fallback route).**
- [ ] Confirm `consolidar-decisao-final` deploy state in PROD + enumerate which AI EFs import `callAi` (redeploy set) via `get_edge_function` diff. **Handled as 18-07 Task 1.**

*New test files (AsyncState.test.tsx, efErrors.test.ts, avaliacaoService.test.ts, gerar-devolutiva-bigfive/__tests__/index.test.ts) are created as TDD red in Task 1 of their respective plans — the correct Wave 0 pattern. Existing vitest/deno infra covers the remaining phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI EF survives real Anthropic 429/529 with retry-then-503 | RESIL-01 | Needs real overload / PROD invocation | Deferred to Phase 21 live UAT (PROD-01/02) |
| Candidate/RH screens show loading→slow→error→retry with no blank state under real slow EF | RESIL-03 | Visual, real-latency | Phase 21 live UAT |
| EF redeploy carries Phase-18 bundle + preserves authz | RESIL-01/02, FIX-01 | PROD deploy + bundle diff | 18-07 Task 2 ([BLOCKING] human-gated); post-deploy `get_edge_function` diff |

*Automated layer covers the deterministic logic (timeout/retry wiring, bigfive parallelization shape, error_code extraction, normalizeSjtComposite, status='active' query). Live behavior under real Anthropic overload is Phase 21.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (18-01 T1, 18-07 T1)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-mapped 2026-06-29 (Per-Task Verification Map filled; `wave_0_complete` flips true after execution)
