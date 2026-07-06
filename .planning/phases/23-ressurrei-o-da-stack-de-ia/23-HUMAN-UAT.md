---
phase: 23
slug: ressurrei-o-da-stack-de-ia
status: deferred
created: 2026-07-06
kind: human-verification
---

# Phase 23 — Human Verification (deferred live-PROD checks)

Verifier status: **human_needed** — 10/10 must-haves verified in code + PROD schema (the one automated gap, `npm run test:run` exit 1, was **closed post-verify** by excluding the 3 new Deno tests from Vitest). The AI stack revival is applied to PROD (migrations verified via MCP; all 9 EFs redeployed twice — base code + CR-01/WR-01 fix — verify_jwt preserved, boot smoke green). The items below need **live invocation / real spend / visual rendering** and can't be proven in-session.

## Deferred items

| # | Item | Requirement | Why deferred | How to verify |
|---|------|-------------|--------------|---------------|
| 1 | **Live-invocation smoke** — the 5 previously-stub call_types (work_sample_sjt, culture_fit_essay, transcript_analysis, interview_guide) **+ bigfive_devolutiva** run the REAL prompt live and `ai_call_logs` records the real semver (not a 0.0.0 stub / 500) | AI-01 | Only a real EF invocation against PROD prompt_versions proves the stub is gone. Needs the seed candidatura (`candidato.funil@teste.com` / candidatura `a1dd4c42`) + JWT (gotrue /token grant_type=password → curl EFs). | Trigger each EF against the seed candidatura; `SELECT call_type, prompt_version, success FROM ai_call_logs ORDER BY created_at DESC` shows real semver + success=true (the table was 0-rows before 23-05's prompt_version column). |
| 2 | **bigfive_devolutiva resolves the real prompt live** (no PromptNotConfigured 500) | AI-01 | Enum + seed applied; only a live gerar-devolutiva-bigfive call confirms loadPrompt resolves the row end-to-end. | Trigger a Big-Five devolutiva for the seed candidato; confirm 200 + a persisted devolutiva (not the honest-alarm 500). |
| 3 | **Cost guardrail actually alarms** (not detect-only-with-lag) | AI-06 | Needs a real spend threshold crossing + Vault secrets present. | Cross a per-vaga daily cost threshold (or observe an existing crossing); confirm the cost-alerter fires (or, if Vault secrets absent, a RAISE WARNING appears in logs — the AI-06 not-silent fix). |
| 4 | **UX-07 visual** — devolutiva + RH screens render NO raw percentile, neutral Big-Five bands | UX-07 | Grep/unit assert the code; a human confirms the rendered screen. | Open a candidate devolutiva + an RH scorecard; confirm band descriptors ("muito baixo/baixo/típico/alto/muito alto"), no `Percentil N`. |
| 5 | **UX-09 visual** — consolidação suppressed until ≥2 stages, distinct suppression message | UX-09 | Server returns null <2 stages; a human confirms the dashboard copy. | Open a candidatura with 1 completed stage → the distinct suppression message (not the empty-state); with ≥2 → the consolidated number. |

## Accepted deviations (documented, NOT gaps — see SUMMARYs)
- **candidate_cost_over_1 not emitted from the trigger** — `ai_cost_daily` has no candidate dimension; the real per-vaga runtime guardrail is the 23-03 pre-call kill-switch. WR-02: the "global cap" half of the CONTEXT scope was not built (per-vaga accepted as the runtime guard). (23-05 / 23-03 SUMMARYs.)
- **Seed content_hash is the sentinel convention, not the canonical sync-prompts hash** → RF-PL-11 reconciliation deferred to Phase 27 / CI-15 (23-05-SUMMARY).
- **Ledger convergence** (MCP version vs filename) deferred to DBMIG-01 / Phase 27 (renamed local files to match ledger versions to minimize new drift).
- **WR-03** dashboard suppressed-copy nit; **Info** items (parseIntEnv decimals, isRetryable regex over-match, missing AI-04 EF-level test) — low, deferred.
