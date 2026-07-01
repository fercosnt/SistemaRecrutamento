---
status: closed_via_phase21
phase: 18-resili-ncia-das-efs-de-ia-bugs-do-funil
source: [18-VERIFICATION.md]
started: 2026-06-29
updated: 2026-06-29
deferred_to: Phase 21 (PROD-01/PROD-02 live UATs)
---

## Current Test

[awaiting live PROD verification — by design, deferred to Phase 21]

All 5 code-level must-haves (RESIL-01/02/03, FIX-01, FIX-02) are VERIFIED green in
the source tree + automated tests (tsc 258 baseline, vitest 76/657, Deno 18/18) and
the 8 EFs are redeployed to PROD. The items below require **real PROD data + real
Anthropic latency/overload**, which is exactly the scope of Phase 21 — they are
deferred there per the phase design (CONTEXT Área 3, RESEARCH Manual-Only Verifications).

## Tests

### UAT-18-01 — RESIL-01/02 live round-trip under real Anthropic latency/overload
- **Requirement:** RESIL-01, RESIL-02
- **Why manual:** needs real Anthropic 429/529/overload + real EF invocation; cannot be simulated in unit tests.
- **Steps:** Trigger an AI EF (e.g. `gerar-devolutiva-bigfive`, `analise-candidato-individual`) against a live candidatura under load. Confirm: the per-call timeout (~25s) fires instead of the EF hanging 38–102s; a 429/529 retries with backoff then surfaces a clean 503 `{error_code:'AI_UNAVAILABLE'}` after exhaustion (no 9× amplification); bigfive devolutiva completes within the execution window (5 dims in parallel).
- **Status:** deferred → Phase 21

### UAT-18-02 — RESIL-03 visual slow/error/retry UX in the running app
- **Requirement:** RESIL-03
- **Why manual:** visual, real-latency; needs a running server + slow/failing EF.
- **Steps:** In the live app, exercise a slow/failing AI call on each of the 5 screens (BigFive, SJT caso aberto, redação, Consolidação, Comparativo). Confirm: loading → slow note → legible error → visible "Tentar novamente" retry; `AI_UNAVAILABLE` shows the sobrecarga copy, other failures show generic; no blank screen; the non-AI DB-read screens show neutral "Carregando…" copy (not the AI slow copy).
- **Status:** deferred → Phase 21

### UAT-18-03 — FIX-01 live PROD candidatura round-trip
- **Requirement:** FIX-01
- **Why manual:** needs a real candidatura in the `work_sample_sjt='na'` + caso_aberto `pendente_humano` state.
- **Steps:** Run `consolidar-decisao-final` (v4, live) for such a candidatura. Confirm the consolidated score does not zero/trap; MC success is preserved; the recommendation copy does NOT list a pending entrevista as both "revisão pendente" and "não avaliada" (WR-02 fix); no NaN consolidated score (WR-06 fix).
- **Status:** deferred → Phase 21

## Notes

- Item "REQUIREMENTS.md doc drift (RESIL-02 Pending→Complete)" from the verifier was resolved inline by the orchestrator (not a deferred UAT).
- Live verification of these 3 items is the home of Phase 21 (PROD-01/PROD-02). When Phase 21 runs them green, re-run `/gsd-verify-work 18` to flip 18-VERIFICATION.md to `passed`.


## Phase 21 closure (2026-06-30)
Deferred live UATs executed/closed in Phase 21 (live PROD). See `.planning/phases/21-production-readiness-uats-live/21-HUMAN-UAT.md` + `21-RUNBOOK.md`. Backend/deterministic halves PASS live; visual residue → 21-RUNBOOK; literal SR/overload re-deferred with justification.
