---
phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring
plan: 01
subsystem: database
tags: [postgres, plpgsql, security-definer, sjt-scoring, rls, sql-smoke, supabase]

# Dependency graph
requires:
  - phase: 11 (avaliacao-assincrona infra)
    provides: pontuar_sjt RPC, scores_candidato sink (UNIQUE NULLS NOT DISTINCT MC key), perguntas/perguntas_opcao_sjt bank, get_opcoes_sjt
  - phase: 24 (SEC blindagem)
    provides: sec05_08_smokes.sql impersonation idiom (set_config request.jwt.claims + SET ROLE authenticated)
provides:
  - "pontuar_sjt v2 (files-only): dedup + full-battery denominator + battery-membership (FUNIL-07 server teeth) + completeness + empty-battery guard + hard re-submit lock, RNF-07a preserved"
  - "funil01_pontuar_sjt_smokes.sql: 7-assertion behavioral gate over an impersonated candidate JWT (the load-bearing acceptance proof, RED until 26-07)"
affects: [26-07 (Wave 4 BLOCKING apply + smoke run), 27 (database.types.ts regen + migration ledger reconcile)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-authoritative anti-tamper via SECURITY DEFINER re-derivation (Σ peso server-side; client posts picks only; neutral return)"
    - "Full-battery denominator + completeness as one correctness property (both halves, not one)"
    - "Empty-battery loud-fail (RAISE 22023) before completeness so 0/0 can never short-circuit to 'sucesso'"
    - "Self-contained disposable SQL smoke fixture around a discovered real candidato (no auth.users manipulation)"

key-files:
  created:
    - supabase/migrations/20260712100001_funil01_pontuar_sjt_v2.sql
    - supabase/tests/funil01_pontuar_sjt_smokes.sql
  modified: []

key-decisions:
  - "Denominator = Σ MAX(peso) over ANY(v_battery) (full active-MC battery), replacing the answered-only maxes bug"
  - "Hard re-submit lock (RAISE 42501 on a non-'falhou' MC row) closes A41 overwrite; ON CONFLICT DO UPDATE guarded to WHERE status='falhou' so only a failed-scoring retry can re-write"
  - "Empty battery (v_expected=0) RAISEs 22023 'bateria SJT nao configurada' BEFORE completeness (Open Q2 resolved)"
  - "Battery scoped to formato='mc' AND status='active' so the caso_aberto item is excluded from MC math (Pitfall 2)"
  - "Smoke builds a disposable fixture around a REAL candidato (for a valid auth.uid() ownership match) instead of inserting auth.users rows; discovered candidato never deleted"

patterns-established:
  - "Pattern 1: pontuar_sjt guard order — authz(A) → re-submit-lock(B) → resolve-battery(C) → empty-battery(C2) → dedup(D) → membership(E) → completeness(F) → score(H) → insert(I)"
  - "Pattern 2: SQL smoke error-precision — catch by sqlstate AND assert SQLERRM contains the exact message so a wrong-error regression cannot pass"

requirements-completed: [FUNIL-01, FUNIL-07]

# Metrics
duration: 18min
completed: 2026-07-12
---

# Phase 26 Plan 01: Non-manipulable pontuar_sjt (FUNIL-01 + FUNIL-07 server) Summary

**Rewrote the `pontuar_sjt` SECURITY DEFINER RPC so SJT scoring is non-manipulable — dedup + full-battery denominator + battery-membership (FUNIL-07 server teeth) + completeness + empty-battery loud-fail + a hard re-submit lock — and authored its 7-assertion impersonated-JWT behavioral smoke; both files-only, live apply deferred to the Wave 4 BLOCKING plan 26-07.**

## Performance

- **Duration:** ~18 min
- **Completed:** 2026-07-12
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- `pontuar_sjt` v2 closes all four Phase-11 holes: (A8/FUNIL-01) no-DISTINCT inflation → dedup RAISE 22023; answered-only denominator → Σ MAX(peso) over `ANY(v_battery)`; incomplete submit → completeness RAISE 22023; (A41) ON-CONFLICT overwrite → hard re-submit lock RAISE 42501 on a non-'falhou' MC row.
- (A17/FUNIL-07) server-side battery-membership check RAISEs 42501 for any submitted `pergunta_id` outside the vaga battery — the client filter is presentation only; the server is the security control.
- Open Q2 resolved: an empty/unconfigured battery (`v_expected=0`) RAISEs 22023 `'bateria SJT nao configurada'` **before** completeness, so an empty `p_respostas` submit fails loudly instead of scoring a silent 0/0 'sucesso'.
- RNF-07a preserved: the function writes ONLY `scores_candidato` and returns a NEUTRAL `{ok,registrado}` — never touches `candidaturas.status/etapa_atual`, never auto-rejects.
- Authored `funil01_pontuar_sjt_smokes.sql` — a self-contained, ROLLBACK-free behavioral gate that impersonates a candidate JWT and proves all 7 behaviors (dedup, full-battery denominator equality, subset rejection, foreign-pergunta rejection, re-submit lock + single-MC-row, RNF-07a unchanged, empty-battery loud-fail).

## Task Commits

Each task was committed atomically (hooks-bypass per project rule):

1. **Task 1: Author pontuar_sjt v2 migration** - `3fda8cd` (feat)
2. **Task 2: Author FUNIL-01/07 behavioral smoke** - `3501c0b` (test)

**Plan metadata:** _(final docs commit — this SUMMARY + STATE + ROADMAP)_

## Files Created/Modified
- `supabase/migrations/20260712100001_funil01_pontuar_sjt_v2.sql` - `CREATE OR REPLACE public.pontuar_sjt(uuid, jsonb)` with the six guards, full-battery denominator, MC-only battery, versao:2 audit metadata, neutral return, correct `SET search_path=''` envelope + REVOKE/GRANT tail, no `BEGIN/COMMIT` wrapper.
- `supabase/tests/funil01_pontuar_sjt_smokes.sql` - impersonated-JWT behavioral smoke (9 PASS notices across the 7 assertions), disposable fixture built around a discovered real candidato, ROLLBACK-free cleanup.

## Decisions Made
- Kept a guarded `ON CONFLICT ... DO UPDATE ... WHERE status='falhou'` rather than RESEARCH Example 1's plain INSERT, so a prior failed-scoring row (the only case that passes the lock and can conflict) is re-scored cleanly without a 23505, while a valid recorded score is still lock-protected (no A41 hole).
- Smoke design chose a **discovery + disposable-fixture** hybrid: it reuses a real `candidato.user_id` (so `auth.uid()` ownership matches) and builds disposable vagas/candidaturas/perguntas around it, avoiding `auth.users` inserts. Fixture-build is wrapped in an exception handler that sets `smoke.ready='n'` and skips-with-NOTICE if the live schema has a NOT NULL gap (savepoint rollback undoes partial inserts).

## Deviations from Plan

None - plan executed exactly as written. Both files match the plan `<action>` blocks and the RESEARCH §Code Example 1 template (with the C2 empty-battery guard the plan mandates). No auto-fixes were required. tsc unaffected (SQL-only), baseline held at 107.

## Issues Encountered
- The base tables (`candidaturas`/`candidatos`/`vagas`) are M1 pre-versioned baseline and not present in any migration file (the DBMIG-01/Phase-27 gap), so their exact NOT NULL column set is not fully knowable from the repo. Mitigated by sourcing insert columns from `seed.sql` + `submit_candidatura` RPC and wrapping the smoke fixture-build in a skip-with-NOTICE exception handler — the Wave 4 (26-07) agent, running against live PROD, can adjust any residual schema gap before the smoke goes GREEN.

## User Setup Required
None - no external service configuration. The live apply of the migration and the smoke run are the BLOCKING Wave 4 plan 26-07 (Supabase MCP `apply_migration` / `execute_sql`).

## Next Phase Readiness
- Files-only deliverable ready for the Wave 4 BLOCKING apply (26-07): apply `20260712100001_funil01_pontuar_sjt_v2.sql` via MCP `apply_migration`, then run `funil01_pontuar_sjt_smokes.sql` via `execute_sql` — expect 9 PASS notices, zero EXCEPTION.
- No blockers. `database.types.ts` regen for the RPC signature is Phase 27 (unchanged 2-arg signature here, so no client cast churn needed for this plan).

## Self-Check: PASSED

- FOUND: `supabase/migrations/20260712100001_funil01_pontuar_sjt_v2.sql`
- FOUND: `supabase/tests/funil01_pontuar_sjt_smokes.sql`
- FOUND: `.planning/phases/26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring/26-01-SUMMARY.md`
- FOUND commit: `3fda8cd` (Task 1) · `3501c0b` (Task 2)
- tsc baseline held at 107 (SQL-only changes, no growth)

---
*Phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring*
*Completed: 2026-07-12*
