---
phase: 27
slug: integridade-de-migrations-fechamento-da-rede-de-testes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-12
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `27-RESEARCH.md` §Validation Architecture. Per-task IDs assigned during planning.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Client framework** | Vitest ^4.1.9 |
| **EF/scripts framework** | Deno 2.x |
| **tsc gate** | `npm run -s lint` (frozen baseline 107, real 104 — re-pin measured, never inflate) |
| **DB behavior** | plain psql smokes under `supabase/tests/*.sql` (manual/branch, NOT the CI runner) |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run` + `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` |
| **Estimated runtime** | ~60–120 seconds (Vitest) + ~20s (Deno corpus) |

---

## Sampling Rate

- **After every task commit:** `npm run test:run` (Vitest) + `npm run -s lint` (tsc gate — must stay ≤107).
- **After every plan wave:** full Vitest + `deno test` EF corpus + (once the scripts step lands) `deno test … scripts/__tests__/`.
- **Phase gate (BLOCKING non-autonomous wave):** branch catalog-diff empty · `supabase db push --linked` = "up to date" · `submit_candidatura_atomic` + DBMIG-02 smokes green on PROD · affected EFs redeployed + live-smoked · full Vitest/Deno/tsc green.
- **Max feedback latency:** ~120 seconds (Vitest quick run).

---

## Per-Requirement Verification Map

*(Task IDs bound to plans during planning; the gsd-nyquist-auditor refines the per-task map during execution.)*

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| CI-03 | submit-candidatura EF: 401 no-auth, `.strict()` body reject, RPC call shape, error mapping | Deno unit (mock client) | `deno test … supabase/functions/submit-candidatura` | ❌ W0 |
| CI-03/07 | client body ↔ real EF `.strict()` schema, anti-tamper reject (`.safeParse`) | Vitest contract | `npm run test:run -- submit-candidatura` | ❌ W0 |
| CI-03 | knockout sanctioned-reject + survivor advance + dedup | psql smoke (branch/PROD) | `supabase/tests/submit_candidatura_atomic_smokes.sql` | ❌ W0 (RED until DBMIG-02 apply) |
| DBMIG-02 | survivor advance now `auto_rejeitado=false`; knockout still `true` | psql smoke (branch/PROD) | same smoke file | ❌ W0 |
| DBMIG-01 | rebuild-from-zero: catalog diff (rebuild vs PROD) empty; ledger converges | manual (BLOCKING wave) | catalog queries + `supabase db push --linked` | ❌ (procedure) |
| CI-06 | entrevistaService uses shared `extractEfErrorCode`; no local dup | Vitest (efErrors + entrevista suites) | `npm run test:run` | ✅ regression |
| CI-07 | redacao/entrevista/consolidacao contract tests do real `.safeParse` against shared schema | Vitest | `npm run test:run -- contract` | ✅ migrate 3 |
| CI-10 | bundle regression fails build + CI | node script | `node scripts/assert-chunks.mjs` (postbuild + CI step) | ✅ exists, wire |
| CI-13 | 12-function `verify_jwt` declared | declarative | file presence + shape | ❌ create |
| CI-15 | sync-prompts test runs in CI | Deno | `deno test --allow-env --allow-read scripts/__tests__/` | ✅ exists, wire |

---

## Wave 0 Requirements

- [ ] `supabase/functions/submit-candidatura/*.test.ts` — Deno EF handler/validation test (CI-03)
- [ ] client contract test importing the real shared `submitCandidaturaSchema` (CI-03/07)
- [ ] `supabase/tests/submit_candidatura_atomic_smokes.sql` — knockout/survivor/dedup + DBMIG-02 (RED until trigger fix applied)
- [ ] `supabase/functions/deno.json` `imports` map (`zod`, `zod/v4`) — CI-07 enabler
- [ ] `supabase/config.toml` — CI-13 (+ `import_map` per RESEARCH §3b)
- [ ] `package.json` `assert:chunks`/`postbuild` + `ci.yml` bundle step — CI-10
- [ ] `ci.yml` deno `scripts/__tests__` step — CI-15

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rebuild-from-zero + ledger convergence | DBMIG-01 | Needs a clean Supabase preview branch (Pro-plan) or local `db reset`; catalog-diff + `db push --linked` are procedural, not a CI unit | Create branch → apply files → catalog fingerprint diff vs PROD → iterate baseline/catch-up until empty → `migration repair`/reconcile version rows → `supabase db push --linked` = "up to date" |
| DBMIG-02 + knockout/survivor/dedup smokes on live DB | CI-03, DBMIG-02 | RPC behavior over impersonated JWT + GUC; no live DB in CI | Run `submit_candidatura_atomic_smokes.sql` on branch/PROD after trigger fix + backfill applied |
| EF redeploy live-smoke (verify_jwt + shared-schema bundles) | CI-07, CI-13 | Deploy-time propagation of config.toml `verify_jwt`/`import_map` needs a live 401/200 check | Redeploy affected EFs; curl no-auth → 401 (jwt-on) / Bearer-self-auth EFs unchanged |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
