---
phase: 9
slug: ai-prompt-library-cost-infra
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-08
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Filled by gsd-planner/gsd-nyquist-auditor during planning; the table below is a seed.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (src/ unit) + Deno test (supabase/functions) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run && npm run lint && npm run build` |
| **Estimated runtime** | ~30–60 seconds (vitest) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run`
- **After every plan wave:** Run full suite (`test:run` + `lint` + `build`)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

*(Planner fills concrete task rows. Seed expectations below.)*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-XX-XX | — | — | LGPD-04 | — | forbidden-string grep fails build on "teste psicológico" etc. in src/ + supabase/functions/ | unit | `npm run test:run` | ❌ W0 | ⬜ pending |
| 09-XX-XX | — | — | IA-01 | — | sync-prompts UPSERTs 7 rows with SemVer + content_hash, is_active=false | unit (Deno) | `deno test` | ❌ W0 | ⬜ pending |
| 09-XX-XX | — | — | IA-02 | — | ai-client INSERTs ai_call_logs row w/ prompt_version+model_version+input_hash+cost (mocked SDK) | unit (Deno) | `deno test` | ❌ W0 | ⬜ pending |
| 09-XX-XX | — | — | IA-03 | — | cost calc + cache_read_input_tokens accounted; model mix Haiku/Sonnet selected per call_type | unit (Deno) | `deno test` | ❌ W0 | ⬜ pending |
| 09-XX-XX | — | — | IA-04 | — | trigger→pg_net POST fires cost-alerter; EF INSERTs recruiter_alerts row (email best-effort) | SQL smoke | manual SQL (MCP) | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] Deno test stubs for `_shared/ai-client.ts`, `prompt-loader.ts`, `audit-logger.ts`, `pii-masker.ts`, `circuit-breaker.ts` (mocked Anthropic/OpenAI SDK)
- [ ] Vitest `forbidden-strings.grep.test.ts` (LGPD-04) — RED first against a seeded violation, GREEN after scan clean
- [ ] `scripts/sync-prompts.ts` test (frontmatter Zod validation + content_hash determinism)

*Existing infra covers vitest; Deno test harness for EF helpers may need a Wave 0 stub.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live ai-client smoke (real Anthropic call, structured output, cache hit) | IA-02, IA-03 | ANTHROPIC_API_KEY + OPENAI_API_KEY not in Supabase secrets — human must add | Fernando adds secrets, invokes temporary smoke, confirms ai_call_logs row + usage.cache_read_input_tokens |
| cost-alerter email delivery to DPO/RH lead | IA-04 | RESEND_API_KEY not configured; email is external side-effect | Add RESEND_API_KEY, trigger anomaly, confirm email received (row INSERT is autonomously tested) |
| PROD migration apply (ai_* tables + cron + trigger) | IA-01, IA-02, IA-04 | PL/pgSQL 42601 — apply via Supabase MCP execute_sql | Apply migration via MCP, reconcile supabase_migrations, db push "up to date" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
