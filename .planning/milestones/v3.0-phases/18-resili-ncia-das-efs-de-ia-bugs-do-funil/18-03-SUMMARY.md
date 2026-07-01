---
phase: 18-resili-ncia-das-efs-de-ia-bugs-do-funil
plan: 03
subsystem: testing
tags: [deno, vitest, regression-test, edge-function, supabase-mock, rnf-07a]

# Dependency graph
requires:
  - phase: 15-decis-o-final-audit-vel-lgpd-art-20
    provides: consolidar-decisao-final EF + its Deno golden test (DECISAO-01)
  - phase: 18 (18-01/18-02)
    provides: in-flight hardening of the AI EF surface (callAi timeout, bigfive fan-out)
provides:
  - Exported normalizeSjtComposite (pure SJT composite aggregation, importable for unit test)
  - FIX-01 Deno regression (2 cases): pending-only caso_aberto → null; MC sucesso preserved when caso_aberto pendente
  - FIX-02 Vitest regression: avaliacaoService.getAvaliacaoContext queries perguntas with .eq('status','active') and surfaces rows
affects: [18-07 (BLOCKING redeploy — consolidar must carry FIX-01), 21 (PROD UATs)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Export-for-test of a pure aggregation fn (body byte-unchanged; only the export keyword) to lock behavior with a Deno unit test"
    - "Multi-table mocked-supabase Vitest idiom (table-aware fromMock) asserting a query's .eq sentinel + surfaced rows without network"

key-files:
  created:
    - src/features/avaliacao/services/__tests__/avaliacaoService.test.ts
  modified:
    - supabase/functions/consolidar-decisao-final/index.ts
    - supabase/functions/consolidar-decisao-final/__tests__/index.test.ts

key-decisions:
  - "Re-fix prohibited: FIX-01 (350e994) and FIX-02 (686c460) are already correct in source. The ONLY production-code change is prepending `export` to normalizeSjtComposite; body is byte-unchanged."
  - "FIX-01 test loaded normalizeSjtComposite via dynamic import (mirroring the file's existing loadHandler idiom); fixtures cast `as never` at the call boundary to satisfy Deno's strict ScoreRow[] signature."
  - "FIX-02 test uses a table-aware fromMock: candidaturas → .maybeSingle() returns a row; perguntas → .eq('status', val) is the awaitable terminal returning rows ONLY for 'active' (legacy 'ativo' → empty), which is the regression guard."

patterns-established:
  - "Lock a live-fixed bug with the regression test that would have caught it — without touching the fix (hardening phase invariant)."

requirements-completed: [FIX-01, FIX-02]

# Metrics
duration: 4min
completed: 2026-06-29
---

# Phase 18 Plan 03: Lock FIX-01/FIX-02 with regression tests Summary

**Exported `normalizeSjtComposite` (body byte-unchanged) + 2 Deno cases locking the SJT-composite aggregation, and a multi-table mocked-supabase Vitest locking the avaliação perguntas `status='active'` sentinel — the two live PROD bugs (350e994, 686c460) now have the regression coverage that would have caught each.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-29T06:13:07Z
- **Completed:** 2026-06-29T06:16:xxZ
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- FIX-01: `normalizeSjtComposite` exported (only the `export` keyword; body untouched from `350e994`) and locked by 2 Deno cases — (a) caso_aberto pendente-único → `null`; (b) MC sucesso 8/10 preserved as `80` when a caso_aberto sub-row is pendente (not zeroed/N/A).
- FIX-02: new `avaliacaoService.test.ts` asserts `getAvaliacaoContext` queries `perguntas` with `.eq('status','active')` and surfaces the rows; a guard case proves the legacy `'ativo'` sentinel returns zero rows.
- `consolidar-decisao-final` confirmed deterministic / NO-LLM — RNF-07a preserved (this plan adds no LLM call, no auto-decision).
- avaliacaoService read keeps its explicit column allowlist (`id,cargo,cenario,formato,tempo_est_min,rubric,status`) — never `select('*')` (no PII/answer-key leak).

## Task Commits

Each task was committed atomically:

1. **Task 1: Export normalizeSjtComposite + FIX-01 Deno regression** - `8207d50` (test)
2. **Task 2: FIX-02 Vitest regression for avaliacaoService perguntas load** - `68dc880` (test)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `supabase/functions/consolidar-decisao-final/index.ts` - Added `export` to `normalizeSjtComposite` (L173); body byte-unchanged (verified via `git diff`).
- `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` - +2 FIX-01 Deno cases (`loadNormalize` dynamic import; `assertEquals`).
- `src/features/avaliacao/services/__tests__/avaliacaoService.test.ts` - NEW. FIX-02 regression: table-aware mocked supabase, asserts `.eq('status','active')` + rows length > 0; sibling guard case for `'ativo'`.

## Decisions Made
- Re-fix prohibited per plan constraints. The only production-code change is `export` on `normalizeSjtComposite`. Verified `git diff` shows a single-line change (the keyword); FIX-01 logic untouched.
- FIX-01 test loads the fn via dynamic `import("../index.ts")` (the file's existing `loadHandler` idiom). Deno strict type-check forced casting the narrowed fixtures `as never` at the call boundary (the function signature takes the full `ScoreRow[]`); the regression only exercises `status/score/score_max`.
- FIX-02 mock is table-aware: `candidaturas` terminates in `.maybeSingle()` (returns a row), `perguntas` terminates in `.eq('status', val)` returning rows ONLY for `'active'`. The legacy `'ativo'` path resolves to `[]`, which is exactly the regression the test guards.

## Deviations from Plan

None - plan executed exactly as written. (No re-fix; no architectural change; no package install.)

## Issues Encountered
- Deno's strict type-check (`TS2352`) rejected casting the module to a narrowed `normalizeSjtComposite` signature, because the export takes `ScoreRow[]` (5 extra required fields). Resolved by casting the module `as unknown as { normalizeSjtComposite: (rows: never) => ... }` and passing fixtures `as never` at each call site — the same `as never` idiom the RESEARCH/PATTERNS examples specified. No behavior change; tests then passed 11/11.

## Verification

- `deno test --allow-read --allow-env supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` → **11 passed | 0 failed** (9 prior + 2 FIX-01).
- `npm run test:run -- src/features/avaliacao/services/__tests__/` → **17 passed (4 files)** — FIX-02 (2) + siblings green (no regression).
- `grep -n "export function normalizeSjtComposite" .../index.ts` → matches (L173).
- `git diff .../index.ts` → only the `export` keyword (body byte-unchanged).
- `git diff src/features/avaliacao/services/avaliacaoService.ts` → empty (service untouched).
- **tsc error count: 258** (`npm run lint | grep -cE "error TS"`) — at the FOUND-08/M4 baseline, ≤ 258 ✓.

## Threat Surface
- T-18-03-T (Tampering / consolidado): mitigated — `normalizeSjtComposite` body byte-unchanged; consolidar stays deterministic / NO-LLM. No auto-decision added (RNF-07a).
- T-18-03-ID (Info Disclosure / perguntas read): mitigated — test asserts the existing allowlist projection; never relaxes to `select('*')`.
- T-18-03-V (regression coverage gap): closed — both live bugs now carry the regression that would have caught them.
- No new security-relevant surface introduced. No `## Threat Flags`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- FIX-01/FIX-02 behavior is now executable-locked; a future edit re-introducing the Map-collapse (FIX-01) or the `'ativo'` sentinel (FIX-02) will fail CI.
- **PROD redeploy of `consolidar-decisao-final` (carrying FIX-01 `350e994`) is the [BLOCKING] Plan 18-07** — this plan does NOT deploy. Use `get_edge_function` to diff deployed-vs-local before/after the redeploy.

## Self-Check: PASSED

- FOUND: `supabase/functions/consolidar-decisao-final/index.ts`
- FOUND: `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts`
- FOUND: `src/features/avaliacao/services/__tests__/avaliacaoService.test.ts`
- FOUND: `.planning/phases/18-resili-ncia-das-efs-de-ia-bugs-do-funil/18-03-SUMMARY.md`
- FOUND commit: `8207d50` (Task 1) · FOUND commit: `68dc880` (Task 2)

---
*Phase: 18-resili-ncia-das-efs-de-ia-bugs-do-funil*
*Completed: 2026-06-29*
