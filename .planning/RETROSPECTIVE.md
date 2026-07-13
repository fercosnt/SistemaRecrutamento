# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — M1 MVP Candidato

**Shipped:** 2026-06-06
**Phases:** 7 (1, 2, 3, 4, 4.1, 4.2, 5) | **Plans:** 43 | **Tasks:** 95

### What Was Built
- A secure, mobile-first ATS candidate experience on Supabase: register → login → password recovery (OTP) → browse jobs → apply with CV upload → real-data profile with application status.
- Security foundation: `service_role` removed from the browser bundle, single unified Zustand auth store with JWT-derived role, single role-aware `RoleGuard`, RLS anon-SELECT replaced by a `SECURITY DEFINER` RPC.
- First-ever CI pipeline (GitHub Actions: unit + e2e + lighthouse) + Lighthouse CI + axe-core a11y at zero WCAG A/AA violations — fully GREEN on a live run (27076233734).

### What Worked
- **Root-cause-at-the-primitive fixes cascade.** The a11y contrast failure across all glass routes was fixed once at the shared `BackgroundImage` primitive (a solid dark base layer); the semantic-token break was fixed once at the HSL-channel-triplet source in `globals.css`. One edit, many routes healed.
- **Smoke-runtime gate (Phase 4.1).** Calibrating Wave-0 RED tests against deliberately-unusable pages *before* implementation caught the "gates green but page unusable end-to-end" failure mode that the autonomous plan checker missed in Phase 4.
- **`hydrateFromSession` / `waitForCandidatoHydrated` bridge.** A single shared async-hydration pattern closed the `onAuthStateChange`→navigate race across all three login paths (cadastro auto-login, direct login, OTP recovery) — one abstraction, three journeys.
- **Measure-first on performance (D-06).** Rather than chase an unreachable Lighthouse Performance target, the team measured (0.62–0.68), accepted a documented warn-baseline, and kept Accessibility as the hard gate — avoiding scope creep.

### What Was Inefficient
- **CI was wired late.** The pipeline's first live run only happened in Phase 5 and surfaced 5 genuine gaps (GAP-05-CI-1..5) that a local runbook had masked. Wiring CI in Phase 1 would have caught E2E/a11y drift continuously instead of in one batch at the end.
- **Frozen 292-error tsc baseline.** Commits across phases bypass the husky gate via `core.hooksPath=/dev/null` — a documented but accumulating deviation. The gate exists but isn't enforced; the real fix (burn down the baseline) keeps deferring.
- **Tracking-file lag.** Several requirement checkboxes (e.g. HARD-05) and a `partial` UAT status were stale at milestone-close despite the underlying work being verified — caught and corrected during the audit, but added close-out friction.
- **Carryover sprawl in Phase 4.** Three unnumbered `04-08-CARRYOVER*` sub-plans (no SUMMARY) folded into the main summary; clean but made the plan/summary count reconcile awkwardly at audit time.

### Patterns Established
- **Híbrido git→DB** versioning pattern (no `-vN` filename suffix; git is source of truth, DB is runtime) — carries into M2's AI Prompt Library.
- **3-layer secret redaction** (service-level redacted logs + Vitest console-spy + node:fs grep guard) for any auth/PII flow.
- **Tier-1 (mocked, unconditional) vs Tier-2 (env-gated real-auth) E2E split** so CI stays deterministic under placeholder Supabase.
- **D-08-sanctioned `.exclude` with tracked reasons** for genuine axe false-positives, keeping the a11y gate at zero-violations without suppressing real issues.

### Key Lessons
1. **Wire CI on day one of a milestone, not at the hardening phase.** A green local runbook is not a green CI check; the first live run will surface real gaps.
2. **Fix accessibility/styling defects at the shared primitive, not per-page.** One `BackgroundImage` / token-source edit cascades to every consumer.
3. **Calibrate test gates against the broken state before implementing.** RED-against-unusable catches integration failures that per-unit green checks miss.
4. **Keep tracking files (REQUIREMENTS checkboxes, UAT/VALIDATION status) in lockstep with verification**, or budget an audit pass to reconcile them at milestone-close.
5. **A documented deviation is still debt.** The `core.hooksPath=/dev/null` baseline-bypass worked per-commit but should have had a burn-down plan, not an open-ended exemption.

### Cost Observations
- Model mix: predominantly Opus (orchestration + execution) with Sonnet for verification/integration-checker agents; Haiku reserved for simple extraction (planned for M2's CV-summary).
- Notable: gap-closure (05-07) + carryover iterations show the cost of late integration — several small fix-cycles that an earlier CI gate would have collapsed into the main flow.

---

## Milestone: v3.0 — M3 Refinamento RH & Hardening

**Shipped:** 2026-06-30
**Phases:** 4 (18–21) | **Plans:** 16

### What Was Built
EF resilience (per-call AI timeout + retry/backoff, devolutiva 5-dim parallel, `<AsyncState>` 5-state contract on 5 AI screens) + 2 funnel bug regressions (P18); route+vendor code-splitting (eager index 2.7MB→904KB) + targeted cache invalidation ≤60s (P19); secure RH guide-edit write-path (authenticate-THEN-authorize RPC + merge-preserve anti-silent-discard) (P20); live PROD UAT closure for the M2/M3 deferred HUMAN-UATs (P21).

### What Worked
- **Live UAT execution surfaced real defects no test had caught.** Driving the actual EFs in PROD (curl + Supabase MCP) found 3 genuine prod-breakers: the Big Five devolutiva never persisted (FK auth-uid vs candidatos.id), guide generation 500'd on every call (RESIL-01's 25s timeout was too tight), and autosave was silent to screen readers. All three pass unit tests / look fine in code review — only a live round-trip exposed them.
- **RESIL-02 fixing the devolutiva timeout *unmasked* the latent persist bug** — a reminder that one fix can reveal the next defect behind it.
- Deterministic-first validation (Playwright nav E2E, Supabase SQL/logs, prod build chunk-assert) closed the verifiable half cheaply; the visual residue went to a human runbook.

### What Was Inefficient
- The Tier-B a11y Playwright test claims a "real-login axe sweep" but has no login wiring → it never exercised the populated screens. Test-claim drift that a live UAT caught.
- The unit-test mock for `gerar-devolutiva-bigfive` collapsed `candidatos.id` and the auth uid into one value — exactly why the FK bug survived to prod (the mock didn't model the two id-spaces). The shared-contract-test lesson (`feedback_integration_contract_gap`) recurred.

### Patterns Established
- **Per-call AI timeout override** on the shared `callAi` (backward-compatible; only the heavy EF opts in) — the right shape for "one EF needs more time" without weakening global fast-fail.
- **Persistent aria-live region** for autosave affordances (stable wrapper, content swaps inside) — the reliable announce pattern.

### Key Lessons
- Live PROD UATs are not a formality — for an AI funnel they are the only thing that catches FK/timeout/RLS-id-space bugs that unit tests + code review pass clean.
- Model id-space indirections (candidatos.id vs auth.uid) explicitly in mocks, or the FK that enforces them in prod will be the test.

### Cost Observations
- Single autonomous session (Opus 4.8, 1M context) drove discuss→plan→execute→audit→complete. 3 EFs redeployed, 6 commits.
- Gates at close: vitest 692/692 · tsc 257 · build 0 · Deno EF 19/19.

---

## Milestone: v4.0 — M4 Correção & Blindagem do Funil

**Shipped:** 2026-07-13
**Phases:** 6 (22–27) | **Plans:** 43

### What Was Built
- Closed every candidate-facing PII/gabarito leak (cognitive `gabarito_idx`, SJT `rubric`, essay verdict) via column REVOKE / SECURITY DEFINER reader RPCs, vaga-scoped SELECT policies, and IDOR closure on the privileged EFs — RLS row-level is never a column secret (P24).
- Revived the silently-dead AI stack: the 7 `call_types` run real library prompts (not the 1-line stub), on a shared circuit breaker with retriable timeouts, a fail-open cost kill-switch, and NaN env guards; raw percentile removed from candidate + RH screens (P23).
- Eliminated the M1→M2 drift: RH Kanban / Editar-Vaga / decisão now operate over enums+columns that exist, no reject escapes the audit trail (RNF-07a trigger), and the candidate reaches+completes every stage with a non-manipulable `pontuar_sjt`, reachable cognitive, and re-application after soft-delete (P25/P26).
- Wired the regression net that would have caught every live defect: Deno EF corpus green in a blocking CI job, tsc gate pinned to a measured baseline (257→104), real client↔EF `.safeParse` contract tests, bundle + verify_jwt gates, and coverage of the sole sanctioned auto-reject (submit-candidatura knockout) (P22/P27).
- Migrations ledger converged live (73/73 version+name exact, 0 drift/orphans/missing); the baseline-fill + from-zero rebuild *proof* is the single sanctioned deferral (DBMIG-01).

### What Worked
- **Pre-apply / at-review verification caught real regressions before prod damage.** Verifying the LIVE function body (`pg_get_functiondef`) before a re-authored `CREATE OR REPLACE` caught that the DBMIG-02 trigger migration — authored from the Phase-6 body — would have silently dropped the Phase-14 ENTREV-03 bias-review flag-guard; the migration was rewritten to preserve it. Separately, code review caught the DBMIG-02 backfill's WHERE clause corrupting every genuine knockout audit row (CR-01) — fixed, and the live-data integrity query confirmed **0 corrupted rows**. Neither reached a bad prod state.
- **Behavioral SQL/EF smokes beat structural greps.** Impersonated-JWT + `SET ROLE authenticated` smokes caught two leaks that pg_policies/grep checks passed clean: a column REVOKE that is a no-op against a table-level GRANT (SEC-07), and an M1-era duplicate role-only policy that OR-defeated the new vaga-scoping (SEC-08) — both remediated same-day.

### What Was Inefficient
- **DBMIG-01 baseline-fill + clean-room rebuild needed infra the headless autonomous session lacked** (Docker / Supabase CLI-auth rebuild loop; `SUPABASE_ACCESS_TOKEN` unavailable) → the from-zero rebuild proof was deferred as an environment-gated sanctioned partial, even though the ledger-convergence half (the actual pgTAP/reproducibility unblock) landed and was verified live.

### Key Lessons
- **MCP `apply_migration` ledger drift is real and reconcilable.** It stamps a timestamp version-row, not the filename — the drift accumulated across M2–M4 converged in P27 by writing the correct version rows, not by re-running migrations.
- **Live behavioral smokes > structural greps** for any RLS/column/policy claim: a green grep or pg_policies dump proves the object exists, not that the leak is closed; only an impersonated-role read proves the projection.
- **Verify the live function body before `CREATE OR REPLACE`.** A migration re-authored from an old body silently reverts whatever the current live body added; diff against `pg_get_functiondef` first.

### Cost Observations
- Single `/gsd-autonomous` run (Opus 4.8, 1M context) drove all 6 phases discuss→plan→execute + milestone lifecycle. PROD landings (migrations via Supabase MCP `apply_migration`, EF redeploys via CLI) authorized by Fernando in the BLOCKING waves.
- Gates at close: vitest 774/774 · tsc 104 · Deno EF corpus 192/0 · build 0.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 (M1 MVP Candidato) | 7 | 43 | First CI pipeline established; smoke-runtime gate pattern introduced (Phase 4.1); measure-first performance baseline |
| v4.0 (M4 Correção & Blindagem) | 6 (22–27) | 43 | Behavioral SQL/EF smokes as the primary live-verification gate; MCP apply_migration + ledger reconcile (73/73); hardening-only milestone (no feature expansion) |

### Cumulative Quality

| Milestone | Unit Tests | E2E (CI) | a11y |
|-----------|-----------|----------|------|
| v1.0 | 358 passing (Vitest) | full chromium green (31 passed / 0 failed) | 0 WCAG A/AA violations (5 public routes) |
| v4.0 | 774 passing (Vitest) | Deno EF corpus 192/0 in a blocking CI job; tsc gate pinned 104 | WCAG AA held from v2.0 (no new axe work) |

### Top Lessons (Verified Across Milestones)

1. Wire CI early — a green local runbook ≠ a green CI check. *(v1.0)*
2. Fix shared-primitive defects once at the source; they cascade. *(v1.0)*
3. Live behavioral smokes (impersonated JWT + `SET ROLE`) catch column/policy leaks that structural greps and unit tests pass clean. *(v4.0)*
4. MCP `apply_migration` stamps a timestamp version-row, not the filename — ledger drift is real but reconcilable without re-running migrations. *(v4.0)*

---
