---
plan: 21-01
phase: 21-production-readiness-uats-live
status: complete
completed: 2026-06-30
requirements: [PROD-01, PROD-02]
commits: [94ad0b5, 6501f70, 0e85ee6, ce2d683]
---

# Plan 21-01 SUMMARY — Live PROD UAT execution

Validation-only phase executed autonomously against PROD (app :3003 → PROD Supabase) via
Playwright + Supabase MCP + curl with real accounts. Closed the deferred live HUMAN-UATs
of M2 (P11, P16) and M3 (P18, P19, P20), and **found + fixed 3 real PROD defects**.

## What was validated live (deterministic / backend)
- **FIX-01 consolidar** (P18-03): `consolidar-decisao-final` v4 on a1dd4c42 → consolidated 55.55, SJT composite 83.33 (sums only the sucesso mc, excludes the caso_aberto pendente — the FIX-01 mechanism), entrevista pendente handled (WR-02), no NaN, advisory copy (RNF-07a).
- **RESIL-02 timing** (P18-01): `gerar-devolutiva-bigfive` 13.4s for 5 parallel AI calls (pre-fix: timeout).
- **P20 write-path** (ENTREV-06/07/08): `save_entrevista_guia_edits` admin → 200 ok; candidato → 403/42501 (clean denial, role from usuarios_rh).
- **P20 regen merge-preserve** (ENTREV-08): failed regen kept the manual question (Pitfall-3); successful regen merged 1 manual + 5 fresh IA.
- **P19-01 lazy routes**: nav E2E 4/4 (real-auth /rh + /admin lazy routes resolve); prod build chunk-split intact (eager index 904kB, not the 2.7MB monolith).
- **P16 #1 RH login** + **a11y Tier-A** (15 screens green under CI/`--workers=1`).

## Defects found + fixed (committed + EFs redeployed)
1. **F1 (6501f70)** — `gerar-devolutiva-bigfive` wrote `candidatos.id` into a column FK'd to `auth.users` + RLS `auth.uid()` → FK 23503 → devolutiva never persisted. Fixed to resolve+write the auth uid (`candidatos.user_id`); test mock corrected to model the two id-spaces. Live: HTTP 200 + persisted row with the candidate's auth uid.
2. **F2 (0e85ee6)** — RESIL-01's 25s global AI timeout broke EVERY interview-guide generation (Sonnet ~40s/pass → 500). Added per-call `timeoutMs` override (Anthropic + OpenAI fallback; default unchanged); gerar-guia uses 60s. Live: regen → 200 ok.
3. **F3 (ce2d683)** — BigFive/Redacao/SjtCasoAberto autosave affordances lacked aria-live → silent to screen readers (P16 #4). Wrapped each in a persistent `role=status aria-live=polite` region.

## Re-deferred (justified, phase goal permits)
- Literal Anthropic 429/529 overload event (P18-01) — can't be forced; resilience path validated via fix + deployed code + Deno tests.
- Literal NVDA/VoiceOver autosave listen test (P16 #4) — aria-live now present; literal AT confirm is a runbook item.

## Visual residue → 21-RUNBOOK.md
AsyncState slow/error UX (P18-02), cross-client ≤60s freshness (P19-02), sighted keyboard focus ring (P16 #3), autosave 30s UX (P11 #4), populated Tier-B axe (P16 #2). All have code/unit-level evidence; the human eye/AT check is in the runbook for Fernando.

## Gates
vitest 692/692 · tsc 257 (flat) · prod build ✓ · Deno EF 19/19 (incl. new devolutiva auth-uid + callAi timeout-override tests).

## Artifacts
21-CONTEXT.md · 21-01-PLAN.md · 21-HUMAN-UAT.md · 21-RUNBOOK.md · 21-VERIFICATION.md.
Upstream 18/19/20 + 11/16 HUMAN-UAT.md flipped to `closed_via_phase21`.
