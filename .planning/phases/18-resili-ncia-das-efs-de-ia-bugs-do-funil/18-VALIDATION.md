---
phase: 18
slug: resili-ncia-das-efs-de-ia-bugs-do-funil
status: draft
nyquist_compliant: false
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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (filled by planner / nyquist-auditor) | — | — | RESIL-01/02/03, FIX-01/02 | — | — | unit | `npm run test:run` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify Anthropic SDK 0.102.0 `messages.parse()` accepts the second `RequestOptions` arg (`{ timeout, maxRetries, signal }`) — Open Question A2 from RESEARCH.md; fallback = set on client constructor.
- [ ] Confirm `consolidar-decisao-final` deploy state in PROD + enumerate which AI EFs import `callAi` (redeploy set) via `get_edge_function` diff.

*If none of the above resolve to test stubs: existing vitest/deno infra covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI EF survives real Anthropic 429/529 with retry-then-503 | RESIL-01 | Needs real overload / PROD invocation | Deferred to Phase 21 live UAT (PROD-01/02) |
| Candidate/RH screens show loading→slow→error→retry with no blank state under real slow EF | RESIL-03 | Visual, real-latency | Phase 21 live UAT |

*Automated layer covers the deterministic logic (timeout/retry wiring, bigfive parallelization shape, error_code extraction, normalizeSjtComposite, status='active' query). Live behavior under real Anthropic overload is Phase 21.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
