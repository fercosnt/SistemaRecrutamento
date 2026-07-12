---
phase: 27-integridade-de-migrations-fechamento-da-rede-de-testes
plan: 03
subsystem: testing
tags: [deno, vitest, zod, edge-function, sql-smoke, ci, tsc-baseline, rnf-07a, knockout]

# Dependency graph
requires:
  - phase: 27-02
    provides: "bare `zod` import in _shared/schemas.ts + deno.json import map (one schema, both runtimes)"
  - phase: 27-04
    provides: "DBMIG-02 avancar_etapa trigger fix (20260712110001) — the survivor auto_rejeitado=false predicate the smoke asserts (applied live in 27-05)"
  - phase: 25-01
    provides: "submit_candidatura_atomic knockout flag + app.rejeicao_sancionada GUC (the sanctioned auto-reject)"
provides:
  - "submit-candidatura EF refactored to an exported testable handler(req, deps)"
  - "CI-runnable Deno EF unit test (401 / .strict 400 / RPC-shape / error-map) for the sole sanctioned auto-reject"
  - "Vitest client contract test — real .safeParse of the client body against the shared submitCandidaturaSchema"
  - "submit_candidatura_atomic SQL smoke (knockout / survivor / dedup + DBMIG-02), RED until 27-05"
  - "CI tsc frozen baseline re-pinned 107 -> measured 104"
affects: [27-05, 27-06, phase-27-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exported handler(req, deps) + import.meta.main Deno.serve wrapper (testable EF seam)"
    - "Service_role-only RPC smoke: run under the privileged role with request.jwt.claims cleared (auth.uid()=NULL) — NOT SET ROLE authenticated (no EXECUTE grant)"
    - "Measure-last tsc re-pin on the final autonomous tree"

key-files:
  created:
    - supabase/functions/submit-candidatura/index.test.ts
    - src/features/cadastro/__tests__/submitCandidaturaContract.test.ts
    - supabase/tests/submit_candidatura_atomic_smokes.sql
  modified:
    - supabase/functions/submit-candidatura/index.ts
    - .github/workflows/ci.yml

key-decisions:
  - "The submit-candidatura EF handler was extracted to a testable seam identical to submit-bigfive-final; behavior byte-equivalent (same step order safeParse->getUser->ownership->RPC, same status/error_code/message/arg object)."
  - "The env-500 + no-auth-header 401 moved into the Deno.serve wrapper; the no-header case is preserved by getUser (empty Authorization -> no user -> 401 'Sessão inválida.', byte-identical response)."
  - "The RPC smoke runs under the privileged role with request.jwt.claims CLEARED (auth.uid()=NULL) — submit_candidatura_atomic is service_role-only (REVOKE PUBLIC), matching the EF's system-write context; SET ROLE authenticated would 42501."
  - "tsc re-pinned to the MEASURED 104 (the 107 pin was stale — Phase 26 26-03 had already dropped the real count); this plan's edits add 0 net errors."

patterns-established:
  - "Testable-handler EF seam: extract Deno.serve body into export handler(req, deps); guard Deno.serve with import.meta.main so the test can import without booting a server."
  - "Fire-and-forget webhook in an EF test: stub globalThis.fetch (no --allow-net) + sanitizeOps/Resources off on the case that reaches it."

requirements-completed: []  # CI-07 was already Complete (27-02). CI-03 + DBMIG-02 stay Pending until the 27-05 live apply (the RPC smoke is RED-until-apply — the phase's honesty theme).

# Metrics
duration: 16min
completed: 2026-07-12
---

# Phase 27 Plan 03: CI-03 submit-candidatura test net + tsc re-pin Summary

**The system's ONLY sanctioned auto-reject is now regression-covered at the request layer (a CI-runnable Deno unit test on an extracted testable handler), the anti-tamper contract is a real cross-runtime `.safeParse`, the RPC layer has an authored knockout/survivor/dedup + DBMIG-02 smoke (RED until 27-05), and the CI tsc gate is pinned to the real measured 104.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-07-12T19:40Z (approx)
- **Completed:** 2026-07-12T19:57Z
- **Tasks:** 3 completed
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Refactored `submit-candidatura/index.ts` to export `handler(req, deps)` with the two supabase clients injected via `deps`, mirroring `submit-bigfive-final`. `Deno.serve` (guarded by `import.meta.main`) builds the real clients and injects them. Behavior byte-equivalent — the full Deno corpus stayed green (187/0 -> 192/0 with the new test).
- Wrote the Deno EF unit test (5 cases): 401 no-session + zero-RPC, `.strict()` 400 on an injected `score` + zero-RPC, happy-path `rpc('submit_candidatura_atomic', {p_candidato_id, p_vaga_id, p_respostas, ...})`, and `23505 -> DUPLICATE_CANDIDATURA (409)` / `23503 -> VALIDATION (400)`.
- Wrote the Vitest client contract test (5 cases): a REAL `.safeParse` of the client's built body against the shared `submitCandidaturaSchema` (not a replica) — valid parses, injected `score`/unknown key rejected (`.strict`, RNF-07a), non-uuid + >5 MB rejected.
- Authored `submit_candidatura_atomic_smokes.sql` (knockout sanctioned-reject + survivor advance + dedup + DBMIG-02 `auto_rejeitado` semantics), documented RED-until-27-05, runs via SQL Editor / MCP in the BLOCKING wave.
- Re-measured and re-pinned the CI tsc frozen baseline 107 -> 104 (all 4 operative refs + banner); 27-01's bundle-gate + sync-prompts CI steps left intact.

## Task Commits

1. **Task 1: refactor submit-candidatura handler** - `d865cf8` (refactor)
2. **Task 2: Deno EF test + Vitest client contract** - `ab5544f` (test)
3. **Task 3: SQL smoke + measure-last tsc re-pin** - `abfb87c` (test)

## Files Created/Modified

- `supabase/functions/submit-candidatura/index.ts` - MODIFIED: extracted the inline `Deno.serve` body into `export async function handler(req, deps)`; `Deno.serve` (import.meta.main-guarded) builds + injects the clients.
- `supabase/functions/submit-candidatura/index.test.ts` - CREATED: Deno EF unit test (5 cases) against the exported handler.
- `src/features/cadastro/__tests__/submitCandidaturaContract.test.ts` - CREATED: Vitest real-parse client↔EF body contract (5 cases).
- `supabase/tests/submit_candidatura_atomic_smokes.sql` - CREATED: knockout/survivor/dedup + DBMIG-02 SQL smoke (RED until 27-05).
- `.github/workflows/ci.yml` - MODIFIED: tsc gate re-pinned 107 -> 104 (label/echo/-gt/::error:: + banner).

## Decisions Made

- **Byte-equivalent seam extraction.** The handler keeps every step in the original order (`safeParse` 400 -> `getUser` 401 -> candidatos ownership 403 -> `submit_candidatura_atomic` RPC with the 23505/23503 mapping). Only the client-construction seam moved to `Deno.serve`. The env-500 and the no-Authorization-header 401 moved to the wrapper; the no-header case stays byte-identical because an empty Authorization -> `getUser` yields no user -> the same 401 "Sessão inválida." response.
- **Smoke runs as service_role, not authenticated.** `submit_candidatura_atomic` is `REVOKE PUBLIC / GRANT service_role`, so `SET ROLE authenticated` would 42501. The EF invokes it via its service_role client where `auth.uid()` is NULL (a system write). The smoke reproduces that exactly by running under the privileged role with `request.jwt.claims` CLEARED — which is also what makes the survivor `auto_rejeitado=false` predicate (`ator IS NULL AND ...`) meaningful.
- **Measure-last re-pin.** The 107 pin was stale; the real count entering Phase 27 was already 104 (Phase 26 26-03 n8n deletion, -3). This plan's edits (a test-only handler seam + one new client test in src/) add 0 net tsc errors, so the measured value stayed 104 and the gate was pinned there.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] implicit-`any` on the perguntas pre-check map after the deps refactor**
- **Found during:** Task 1
- **Issue:** With `supabaseAdmin` now typed `any` (injected via `deps`), `validPerguntas` became `any` and `.map((p) => p.id)` tripped `noImplicitAny` under `deno check` — the pre-refactor code inferred `p` from the typed `createClient` result.
- **Fix:** Annotated the row shape at the call site: `((validPerguntas ?? []) as { id: string }[]).map((p) => p.id)`.
- **Files modified:** `supabase/functions/submit-candidatura/index.ts`
- **Verification:** `deno check --config supabase/functions/deno.json supabase/functions/submit-candidatura/index.ts` clean; full corpus 192/0.
- **Committed in:** `d865cf8`

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking). **Impact:** required to keep the type-checked Deno corpus green after the deps seam; no scope creep.

## Issues Encountered

None beyond the deviation above. The service_role-only RPC required the smoke to run under the privileged role (not the funil01 `SET ROLE authenticated` idiom) — reconciled by clearing `request.jwt.claims` to pin `auth.uid()=NULL` (the EF's system-write context), which still satisfies the `set_config('request.jwt.claims', …)` impersonation-idiom acceptance grep and is semantically load-bearing for the survivor predicate.

## Known Stubs

None. The smoke SQL is authored-but-RED-until-27-05 by design (assertion 2 depends on the DBMIG-02 trigger fix applying live in the BLOCKING wave) — documented in its header, not a stub.

## Verification

- `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/submit-candidatura` -> 5/5 green.
- `npm run test:run -- submitCandidaturaContract` -> 5/5 green.
- Full Deno corpus -> **192 passed / 0 failed**. Full Vitest -> **770 passed / 770**.
- `npm run -s lint 2>&1 | grep -c "error TS"` -> **104**; `grep -c -- "-gt 104" .github/workflows/ci.yml` -> 1; `grep -c -- "-gt 107"` -> 0.
- Smoke greps: `auto_rejeitado` x12 (>=2), `knockout_automatico|DUPLICATE|triagem` x14 (>=3), `set_config('request.jwt.claims'` x5 (>=1).
- 27-01 CI steps intact: `Bundle gate (PERF-03)`, `Deno scripts test (sync-prompts)`, `postbuild` assert-chunks all present.

## Next Phase Readiness

- **27-05 (BLOCKING, MCP apply):** applies the DBMIG-02 trigger fix (20260712110001) + backfill live on PROD, at which point `submit_candidatura_atomic_smokes.sql` flips GREEN (survivor `auto_rejeitado=false`). Running that smoke live is the closure of CI-03's RPC layer + DBMIG-02.
- **Requirements:** CI-07 already Complete (27-02). CI-03 + DBMIG-02 remain Pending until the 27-05 live apply — kept honest per the phase theme.
- No blockers.

## Self-Check: PASSED

All 6 created/modified files present on disk; all 3 task commits (`d865cf8`, `ab5544f`, `abfb87c`) present in git history.

---
*Phase: 27-integridade-de-migrations-fechamento-da-rede-de-testes*
*Completed: 2026-07-12*
