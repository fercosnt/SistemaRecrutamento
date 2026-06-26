---
phase: 15
slug: decis-o-final-audit-vel-lgpd-art-20
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-25
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x (frontend/services) + Deno test (Edge Functions `_local`) + SQL smokes (live PROD via Supabase MCP, fixture + `set_config request.jwt.claims`, ROLLBACK-free cleanup) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:run -- <pattern>` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~16 seconds (vitest); SQL smokes manual |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- <pattern>`
- **After every plan wave:** Run `npm run test:run` + `npm run build`
- **Before verify:** Full suite green + tsc baseline ≤305 + SQL smokes PASS
- **Max feedback latency:** ~20 seconds (automated); SQL smokes deferred to the [BLOCKING] PROD-apply task

---

## Per-Task Verification Map

> Populated by the planner per plan/task. Each behavior-adding task carries an `<automated>` verify
> (vitest pattern, Deno test, or build/grep assertion). The `consolidar-decisao-final` aggregation
> (heterogeneous score-scale → 0-100 normalization + weight renormalization over present etapas) and
> the EEOC 4/5 ratio are deterministic → unit-testable golden tests. PROD migration/EF apply +
> RLS-denial + RNF-07a (no auto-reject, `por_usuario NOT NULL`) verified via SQL smokes in the
> [BLOCKING] apply task.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-NN-NN | NN | N | DECISAO-0X / LGPD-03 | T-15-NN | (planner fills) | unit | `npm run test:run -- <pattern>` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Golden unit tests for the consolidation aggregation (weight→score mapping, 0-100 normalization, weight renormalization over present etapas, pendente/missing → N/A) — `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` (RED Deno, module-not-found until Wave 1; 7 tests: normalization + renormalization + context rows + no-re-score + 4 authorize cases)
- [x] Golden unit test for the EEOC 4/5 adverse-impact ratio across age bands — `src/features/admin/bias-audit/__tests__/biasMath.test.ts` (RED Vitest, module-resolution until Wave 2; selection_rate + reference band + 0.70 worked-example flag + bandFromAge boundaries + small-N + null-birthdate exclusion)
- [x] Contract test: client `consolidar-decisao-final` request body parses against the EF `.strict()` Zod schema (avoid the [[feedback_integration_contract_gap]] drift) — `src/features/decisao/schemas/__tests__/consolidacaoContract.test.ts` (Node-local `.strict()` replica: accept-valid + reject-unknown-key/score/non-uuid GREEN now; `node:fs` source-probe over `../consolidacaoSchema.ts` RED until Wave 2)

*Existing vitest + Deno + SQL-smoke infrastructure covers the rest. forbidden-strings.grep extended with a sanity-count `it` locking LGPD-04 coverage over the 3 new feature dirs — SCAN_ROOTS unchanged.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Candidate LGPD Art. 20 page round-trip + "revisão por pessoa natural" notification to RH | DECISAO-04 | Needs live candidatura with a `rejeitado` decision + N8N webhook | Deferred to HUMAN-UAT (live) |
| Bias-audit snapshot + CSV export over real population | LGPD-03 | Needs live decided candidaturas with birth dates | Deferred to HUMAN-UAT (admin) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (consolidation + EEOC golden tests + contract test)
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Wave 0 complete (15-01) — 3 RED golden/contract tests + LGPD-04 sanity-count landed; downstream waves implement against them.
