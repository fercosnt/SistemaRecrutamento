---
phase: 27-integridade-de-migrations-fechamento-da-rede-de-testes
plan: 02
subsystem: testing
tags: [ci, deno, vitest, zod, contract-test, config-toml, cross-runtime, anti-tamper]

# Dependency graph
requires:
  - phase: 22-rede-de-testes
    provides: "BLOCKING deno-test CI job (EF corpus, type-check ON) + frozen tsc baseline gate (107)"
  - phase: 15-decisao-final
    provides: "src/features/decisao/schemas/consolidacaoSchema.ts (bare-zod .strict() shared-schema precedent)"
  - phase: 13-14
    provides: "_shared/redacao-schemas.ts + _shared/entrevista-schemas.ts EF body schemas + the 3 replica+fs-probe contract tests"
provides:
  - "CI-07: deno.json import map (bare `zod`/`zod/v4`) so ONE shared schema module resolves under both Deno (EF) and Node (Vitest)"
  - "CI-07: 3 contract tests (redacao/entrevista/consolidacao) do a real .safeParse against the shared schema — no Node-local replica, no fs source-probe"
  - "CI-07: consolidar-decisao-final EF imports the shared ConsolidacaoRequestSchema (.uuid() restored — de-drift from the loosened z.string())"
  - "CI-13: supabase/config.toml declares verify_jwt for all 12 EFs (3 self-auth false / 9 true) + import_map for the 5 shared-zod EFs"
affects: [27-03, 27-06, ci-maintenance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "deno.json `imports` map maps bare `zod`/`zod/v4` -> `npm:zod@3.25.76` so one bare-specifier module imports under Deno (map) AND Node (node_modules)"
    - "cross-runtime shared Zod contract: EF + client test import the SAME .strict() module; real .safeParse asserts valid body true + injected-key false (anti-tamper)"
    - "config.toml deploy-posture-as-code: per-function verify_jwt derived from grep-verified live deploy headers + import_map for shared-zod bundles"

key-files:
  created:
    - supabase/config.toml
  modified:
    - supabase/functions/deno.json
    - supabase/functions/_shared/schemas.ts
    - supabase/functions/_shared/redacao-schemas.ts
    - supabase/functions/_shared/entrevista-schemas.ts
    - supabase/functions/consolidar-decisao-final/index.ts
    - supabase/functions/consolidar-decisao-final/__tests__/index.test.ts
    - src/features/avaliacao/__tests__/redacao-contract.test.ts
    - src/features/entrevista/__tests__/entrevista-contract.test.ts
    - src/features/decisao/schemas/__tests__/consolidacaoContract.test.ts

key-decisions:
  - "CI-07 scope: migrate exactly schemas.ts + redacao-schemas.ts + entrevista-schemas.ts to bare `zod` (each rewrite forces an EF redeploy — Pitfall 3); cognitivo-schemas.ts left untouched so its body stays a documented replica in the entrevista test"
  - "consolidar EF imports the shared ConsolidacaoRequestSchema by relative path (../../../src/...consolidacaoSchema.ts); dead npm:zod/v4 import dropped (z was only used by the re-declared schema)"
  - "CI-13 verify_jwt: 3 false (analise-candidato-individual, cost-alerter, gerar-devolutiva-bigfive — Vault Bearer self-auth) / 9 true; import_map on the 5 EFs whose bundle reaches the bare-zod shared module"

patterns-established:
  - "one bare-specifier shared Zod module + real .safeParse on both runtimes (kills the replica+fs-probe idiom the drift could slip past)"
  - "restoring a de-drifted schema (.uuid()) can break fixtures that relied on the loosened form — client-submitted bodies need real UUIDs; mock .eq() stubs are value-agnostic so DB fixtures are unaffected"

requirements-completed: [CI-07, CI-13]

# Metrics
duration: ~18min
completed: 2026-07-12
---

# Phase 27 Plan 02: CI-07 Cross-Runtime Shared Zod Contract + CI-13 config.toml Summary

**Turned the replica+`fs`-probe contract idiom into a real cross-runtime net: one bare-`zod` shared schema module (resolved by Deno via a new `deno.json` import map and by Node via `node_modules`) is now imported by BOTH the EF and the client test with a real `.safeParse`; the consolidar EF was de-drifted onto the shared `.uuid()` schema; and `supabase/config.toml` declares the 12-function `verify_jwt` deploy posture as code.**

## Performance

- **Duration:** ~18 min
- **Completed:** 2026-07-12
- **Tasks:** 3
- **Files created:** 1 · **Files modified:** 8

## Accomplishments
- **CI-07 import map:** `supabase/functions/deno.json` gained an `imports` map (`"zod": "npm:zod@3.25.76"`, `"zod/v4": "npm:zod@3.25.76/v4"`); the three shared schema modules (`_shared/schemas.ts` from `https://esm.sh/zod@3`, `_shared/redacao-schemas.ts` + `_shared/entrevista-schemas.ts` from `npm:zod@3.25.76`) now use a bare `import { z } from 'zod'`. Node resolves it from `node_modules` (3.25.76, byte-identical to the EF pin); Deno resolves it via the import map. The full Deno EF corpus stayed green (187/0) — the guard for a missed consumer.
- **CI-07 de-drift:** `consolidar-decisao-final/index.ts` now imports the shared `ConsolidacaoRequestSchema` (`.uuid()` + `.strict()`) instead of the re-declared loosened `z.string()` copy; the now-dead `npm:zod/v4` import was removed. One shared module, EF + client both import it.
- **CI-07 real contract tests:** the 3 contract tests (redacao, entrevista, consolidacao) dropped the `node:fs` source-text probe + the Node-local `...Replica` schema and now import the REAL shared schema, doing a real `.safeParse(buildClientBody())` (expect true) plus `.safeParse({ ...body, score: 9 })` (expect false via `.strict()` — anti-tamper, RNF-07a).
- **CI-13:** `supabase/config.toml` authored from scratch — `project_id` + one `[functions.<name>]` block per EF for all 12 functions; `verify_jwt = false` for the 3 Bearer self-auth EFs, `true` for the other 9; `import_map = "./functions/deno.json"` on the 5 EFs whose bundle reaches the bare-`zod` shared module.

## Task Commits

Each task committed atomically via the allowlisted `git -c core.hooksPath=/dev/null` bypass (husky pre-commit `npm run lint` trips the frozen tsc baseline):

1. **Task 1: CI-07 deno.json import map + bare-`zod` in 3 shared schema modules** — `e99a64a` (feat)
2. **Task 2: CI-07 consolidar EF imports shared schema + 3 real-parse contract tests** — `b875352` (feat)
3. **Task 3: CI-13 author supabase/config.toml** — `3db7c8d` (feat)

**Plan metadata:** committed separately with SUMMARY.md + STATE.md + ROADMAP.md.

## Verification

- `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` → **187 passed | 0 failed** (corpus green after the specifier swap + shared-schema import).
- `npm run test:run -- contract` → **6 files / 43 tests passed** (the 3 migrated tests + the pre-existing contract tests).
- `npm run test:run` (full Vitest) → **98 files / 765 tests passed** (775 entering the plan; −10 from removing the redundant Part-2 source-probe assertions).
- `npm run -s lint 2>&1 | grep -c "error TS"` → **104** (≤107; this plan does not re-pin — 27-03 does). No errors in any touched file (no masked swap).
- `supabase/config.toml`: 12 `[functions.*]` blocks, 3 `verify_jwt = false` / 9 `verify_jwt = true`, 5 `import_map` entries, first non-comment line `project_id`.
- The excluded `strict-schema.test.ts` source-probe stays green under Vitest (7/7) — the specifier swap is grep-agnostic for `.strict()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] consolidar EF Deno test `BODY` needed real UUIDs after `.uuid()` restore**
- **Found during:** Task 2 (Deno corpus run after pointing the EF at the shared schema)
- **Issue:** The consolidar EF previously validated the body with a loosened `z.string()`; its own Deno test (`consolidar-decisao-final/__tests__/index.test.ts`) sent `BODY = { candidatura_id: "cand-1", vaga_id: "v1" }`. Restoring `.uuid()` via the shared schema made those non-UUID placeholders fail validation → 400 VALIDATION, breaking the 8 aggregation tests + the rh-not-own (403) + admin-bypass (200) tests (the 401/403 short-circuit-before-validation tests still passed).
- **Fix:** Changed the test `BODY` constant to real UUIDs. The mock `.eq()` stubs ignore the filter value, so the fixture rows' `candidatura_id: "cand-1"` labels are value-agnostic and were left unchanged.
- **Files modified:** `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts`
- **Commit:** `b875352`

### Scoped exception (not a deviation)

- The entrevista contract test keeps `SubmitCognitivoBodySchemaReplica` + `BandaCognitivaEnumReplica` as Node-local replicas: `_shared/cognitivo-schemas.ts` is deliberately NOT migrated to bare `zod` in 27-02 (each shared-module rewrite forces an EF redeploy — Pitfall 3; the plan scopes the migration to schemas.ts + redacao-schemas.ts + entrevista-schemas.ts). The `grep "Replica" == 0` acceptance applies only to the consolidacao test (which is 0). The cognitivo shared import can migrate the day that module is rewritten.

## Known Stubs

None — no hardcoded empty values, placeholders, or unwired data sources introduced. `config.toml` is inert until the 27-06 EF redeploys (documented in the file header + the plan's own scope).

## Threat Flags

None — no new network endpoint / auth path / schema surface introduced. `config.toml` declares the existing (already-deployed) `verify_jwt` posture; the shared `.strict()` schema tightens (does not weaken) input validation.

## Self-Check: PASSED

- All 8 created/modified files verified present on disk.
- All 3 task commits (`e99a64a`, `b875352`, `3db7c8d`) verified in git history.
