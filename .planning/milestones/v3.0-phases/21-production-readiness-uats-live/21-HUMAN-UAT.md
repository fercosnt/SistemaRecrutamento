---
status: passed
phase: 21-production-readiness-uats-live
requirements: [PROD-01, PROD-02]
source: [21-01-PLAN.md, 18-HUMAN-UAT.md, 19-HUMAN-UAT.md, 20-HUMAN-UAT.md, milestones/v2.0-phases/11-*/11-HUMAN-UAT.md, milestones/v2.0-phases/16-*/16-HUMAN-UAT.md]
executed: 2026-06-30
executor: Claude (autonomous — Playwright + Supabase MCP + curl against PROD)
env: app local (vite :3003) → PROD Supabase (isljnozzlvckrgjjbjwp) — auth/DB/EFs/Anthropic all PROD
accounts: candidato.funil@teste.com (TEST_USER, candidatos.id 896c6a43 / auth 1079ccf7); e2e.admin@beautysmile.com.br (TEST_ADMIN, administrador)
test_data: [TESTE] Dentista — Funil E2E (vaga a32fe930, owner recruiter@teste.com); candidaturas a1dd4c42 (decisao_final), f73682b6 (avaliacao_assincrona)
---

# Phase 21 — Production-Readiness: Live UAT results

Validation phase. Closes the deferred live HUMAN-UATs from M2 (P11, P16) and M3 (P18, P19, P20)
against PROD. **3 real PROD defects were found and fixed during validation** (see Findings).

## Summary

| # | UAT | Req | Result | Evidence |
|---|-----|-----|--------|----------|
| C1 | P11 #1 candidate assessment flow | PROD-01 | ✅ PASS (reconciled) | prior live session 2026-06-26, fix F4 (686c460) |
| C2 | P11 #2 SJT/redação AI scoring (AVAL-03) | PROD-01 | ✅ PASS (reconciled) | prior live 2026-06-26, IA real (C1/C2 fix c183cd3) |
| C3 | P11 #3 RH scorecard | PROD-01 | ✅ PASS (reconciled) | prior live 2026-06-26 |
| A4 | P11 #4 autosave 30s + back-lock | PROD-01 | ✅ PASS (server) / 🔶 runbook (autosave UX) | back-lock 42501 verified via pg_policies; autosave aria-live FIXED (F3) |
| — | P16 #1 RH cold-start login | PROD-02 | ✅ PASS (reconciled + re-proven) | prior 2026-06-26; re-proven this session (nav E2E J2/J3 admin login → /rh,/admin) |
| A1 | P16 #2 axe Tier-B (R5/C5) | PROD-02 | ✅ Tier-A PASS / 🔶 Tier-B runbook | a11y suite 20/20 green (--workers=1); Tier-B populated sweep → runbook (see Finding F4) |
| B6 | P16 #3 keyboard roving-focus | PROD-02 | 🔶 runbook | Radix Tabs/RadioGroup native roving focus; nav E2E reached workspaces; sighted check → runbook |
| B7 | P16 #4 BigFive aria-live announce | PROD-02 | ✅ FIXED (DOM) / 🔶 literal SR runbook | autosave affordances had NO aria-live → FIXED (F3, ce2d683); literal NVDA/VoiceOver → runbook |
| A2 | P18-01 RESIL-01/02 timing | — | ✅ PASS (live) | devolutiva 13.4s 5-parallel (was timeout); literal 429/529 re-deferred |
| B3 | P18-02 AsyncState slow/error/retry UX | — | 🔶 runbook | AsyncState contract unit-tested + adopted on 5 screens (P18); live visual → runbook |
| A3 | P18-03 FIX-01 consolidar (sjt='na'/caso pendente) | — | ✅ PASS (live) | consolidar v4 → 55.55, sjt 83.33 (mc-only), entrevista WR-02 handled, no NaN |
| B1 | P19-01 lazy-route no-regression | — | ✅ PASS (live) | nav E2E 4/4 (/rh,/admin lazy routes resolve); build chunks split, eager index 904kB |
| B2 | P19-02 cross-client ≤60s freshness | — | 🔶 runbook | targeted cache invalidation unit-tested green (19-03); two-session live → runbook |
| B4 | P20-01 RH edits guide (secure write-path) | — | ✅ PASS (live) | save RPC: admin 200 ok:true; candidato 403 42501 (clean denial) |
| B5 | P20-02 regen preserves manual | — | ✅ PASS (live) | failed-regen kept manual (Pitfall-3); successful regen → 1 manual + 5 IA |

**PROD-01:** ✅ PASS — P11 work-sample/SJT + redação scoring round-trip executed in PROD (reconciled from 2026-06-26 live + re-confirmed server-side this session).
**PROD-02:** ✅ closed — P16 #1 PASS; #2 Tier-A PASS (Tier-B populated → runbook); #3 → runbook; #4 a11y gap FIXED (literal SR → runbook). Residual literal items re-deferred WITH justification (phase goal permits).

## Findings — defects fixed this session

### F1 — Big Five devolutiva never persisted (FK auth.users vs candidatos.id) — FIXED
`gerar-devolutiva-bigfive` wrote `candidaturas.candidato_id` (= `candidatos.id`) into
`devolutivas_candidato.candidato_id`, which FKs `auth.users(id)` and is RLS-matched on `auth.uid()`.
Every real candidate hit FK 23503 → `status:'falhou'` (the "devolutiva não grava" achado, masked by the
pre-RESIL-02 timeout). Fixed: resolve the auth uid via `candidatos.user_id`; the test mock that collapsed
both id-spaces was corrected to model the indirection. Live verified: HTTP 200, persisted row
`379ae45b` with `candidato_id = 1079ccf7` (the candidate's auth uid → RLS-readable). Commit `6501f70`, EF redeployed.

### F2 — gerar-guia-entrevista 500 on every generation (RESIL-01 25s timeout too tight) — FIXED
RESIL-01 (P18) imposed a 25s global per-call AI timeout. Guide generation (Sonnet, structured STAR+BARS,
~4000 tokens, up to 2 passes) legitimately runs ~40s/pass → every generation timed out → 500. RH could not
generate or regenerate ANY interview guide in PROD. Fixed: optional per-call `timeoutMs` override on `callAi`
(threaded to Anthropic primary + OpenAI fallback; global default unchanged at 25s); gerar-guia passes 60s.
Live verified: pre-fix 500 (×2, ~52s); post-fix HTTP 200 ok:true (~85s); merged guide = 1 manual + 5 IA.
Commit `0e85ee6`, EF redeployed. Deno 19/19 incl. new override test.

### F3 — Autosave status not announced to screen readers (P16 #4 / AB-8) — FIXED
BigFive/Redacao/SjtCasoAberto autosave affordances rendered "Salvo automaticamente"/etc. in plain spans
with NO aria-live → silent to AT. Fixed: each now renders a persistent
`<span role="status" aria-live="polite" aria-atomic="true">` with state content swapping inside.
Commit `ce2d683`. tsc flat 257; avaliacao vitest 59/59.

## Findings — recorded, not fixed (test-infra / runbook)

### F4 — a11y suite flaky under local full-parallelism; Tier-B test has no login wiring
- The a11y Playwright suite rotates ONE screen to a serious/critical "failure" per run under local
  `fullyParallel`+`workers:undefined`+`retries:0` (axe scans a transient render under contention).
  Under CI (`workers:1`, `retries:2`) and with `--workers=1` locally it is GREEN (20 passed, 2 Tier-B skipped).
  Not a product defect. Runbook: run a11y locally with `--workers=1`.
- The Tier-B test (`a11y Tier-B: R5/C5`) does `page.goto(route)` with no login/seed → with `E2E_REAL_LOGIN=1`
  it would axe-sweep an auth redirect, not the populated R5/C5. A faithful populated Tier-B sweep needs a
  real-login + injected axe-core (runbook item). Low priority (Tier-A covers the same components' a11y shell).

## Re-deferred (with justification — phase goal permits)
- **P18-01 literal Anthropic 429/529 overload event** — cannot be forced on demand; the timeout/retry/backoff
  path + clean error surfacing are validated by the per-call timeout fix (F2) + RESIL-01/02 deployed code + Deno tests.
- **P16 #4 literal screen-reader (NVDA/VoiceOver) listen test** — the aria-live region is now present (F3 fix);
  the literal AT announce confirmation is a runbook item (no screen reader in the autonomous session).

## PROD test artifacts (coherent test data left on the [TESTE] funil)
- `entrevista_guias` online for a1dd4c42: 1 manual ("[P21] Conte sobre um conflito clínico…") + 5 IA (from regen).
- `devolutivas_candidato` row `379ae45b` for a1dd4c42 (proves F1 fix).
- consolidar-decisao-final recomputed the (correct, idempotent) consolidado for a1dd4c42.
- All on the dedicated `[TESTE] Dentista — Funil E2E` candidatura — useful as the runbook's starting state; not real-user data.

## Re-run pointer
The deferred items in 18/19/20-HUMAN-UAT.md and 11/16-HUMAN-UAT.md are now executed/closed here. See `21-RUNBOOK.md`
for the human re-validation steps (visual residue: AsyncState UX, cross-client freshness, sighted keyboard, literal SR).
