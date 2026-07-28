---
phase: 24-blindagem-de-seguran-a-pii-lgpd
plan: 03
subsystem: database
tags: [rls, security-definer, candidate-deny, postgres, supabase, lgpd, pii, redacao, verdict]

# Dependency graph
requires:
  - phase: 24-01
    provides: 24-LIVE-STATE.md (A7 CONFIRMED — candidate own-row redação read is a base-table policy; RH shares the authenticated role → column REVOKE INVALID for SEC-02)
  - phase: 13
    provides: redacoes_candidato table (verdict cols + redacao_candidato_select / redacao_rh_select policies) + redacaoService candidate reader
provides:
  - "SEC-02: DROP redacao_candidato_select base-table row policy + get_minha_redacao(p_candidatura_id) SECURITY DEFINER RPC (own-row guard, safe-projection, coarsened status_analise) — candidate cannot read any verdict column of their own redação"
  - "redacaoService candidate own-row reads (getRedacaoCandidato / getMinhasRedacoes) rewired to .rpc('get_minha_redacao') in lockstep (A7 / Pitfall 2)"
  - "Repeatable candidato-DENY + RH-intact SQL smoke (supabase/tests/sec02_smokes.sql) for the 24-08 PROD apply wave"
affects: [24-04, 24-08, 24-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "candidate-DENY row + DEFINER RPC (NOT column REVOKE) for a verdict column that RH legitimately reads on the SAME authenticated role — the phase's #1 landmine (Pitfall 1)"
    - "DEFINER own-row guard via candidatos.user_id = auth.uid() INSIDE the function (reprocessar_analise idiom; auth.uid() is GUC-based, survives DEFINER)"
    - "status coarsening inside the RPC so a workflow state (pendente_humano) cannot leak the verdict outcome"
    - "confined RPC-name/args cast for a not-yet-typed RPC (mirrors cognitivoService.listItens) — dropped at 24-08 regen"

key-files:
  created:
    - supabase/migrations/20260706110003_sec02_redacao_verdict.sql
    - supabase/tests/sec02_smokes.sql
    - src/features/avaliacao/__tests__/redacaoService.rpc.test.ts
  modified:
    - src/features/avaliacao/services/redacaoService.ts

key-decisions:
  - "SEC-02 mechanism is candidate-DENY row (DROP redacao_candidato_select) + get_minha_redacao DEFINER RPC — NEVER a column REVOKE, because RH reads the verdict via the SAME authenticated role and a REVOKE would blind RH (Pitfall 1, live-confirmed in 24-LIVE-STATE.md)"
  - "RH policies (redacao_rh_select / redacao_rh_update / redacao_no_client_insert) left byte-for-byte intact — RH keeps its full base-table verdict read"
  - "status_analise coarsened in the RPC: only 'concluida' verbatim, everything else (pendente/processando/falhou/pendente_humano) → neutral 'em_analise', so pendente_humano does not leak 'you triggered a red flag' (RESEARCH discretion note, T-24-03-03)"
  - "Client rewire landed in the SAME plan as the migration (A7) so 'minha redação' is never blanked; MinhaRedacaoRow reused verbatim (no verdict field added)"

patterns-established:
  - "SEC-02 posture = DROP candidate row policy + own-row-guarded DEFINER safe-projection RPC + coarsened workflow status; RH base-table verdict read untouched; NO column REVOKE"

requirements-completed: [SEC-02]

# Metrics
duration: ~12min
completed: 2026-07-07
---

# Phase 24 Plan 03: SEC-02 Redação Verdict Candidate-DENY Summary

**Closed the essay-verdict leak with the phase's landmine mechanism done right: DROP the candidate's base-table row-SELECT on `redacoes_candidato` + a `get_minha_redacao` SECURITY DEFINER RPC (own-row guard, safe projection, coarsened status) — NOT a column REVOKE, because RH reads the verdict via the same `authenticated` role. Candidate client rewired to the RPC in lockstep; RH verdict reads untouched.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-07T00:44Z (approx)
- **Completed:** 2026-07-07T00:52Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- **SEC-02 migration** — authored `20260706110003_sec02_redacao_verdict.sql`: `DROP POLICY redacao_candidato_select` (candidato → 0 rows on any direct verdict read) + `get_minha_redacao(p_candidatura_id)` `SECURITY DEFINER SET search_path=''`, enforcing `candidatos.user_id = auth.uid()` INSIDE the function and projecting ONLY `id/pergunta_id/ordem/texto/word_count/submetida_em/status_analise` — never a verdict column, never `bloqueio_avanco`. `status_analise` coarsened (only `concluida` verbatim, else `em_analise`). `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE … TO authenticated`. RH policies untouched. NO column REVOKE anywhere.
- **Client rewire (lockstep, A7)** — `redacaoService.getRedacaoCandidato` + `getMinhasRedacoes` now call `.rpc('get_minha_redacao', { p_candidatura_id })` instead of `.from('redacoes_candidato').select(...)`. `MinhaRedacaoRow` reused verbatim; RH reader `revisaoRedacaoService.ts` untouched.
- **Regression lock** — `supabase/tests/sec02_smokes.sql` (candidato-DENY on `red_flag_etico` via base table + `get_minha_redacao` no-verdict result-type assertion + RH-still-reads assertion) and `redacaoService.rpc.test.ts` (asserts the RPC call + absence of any verdict field in the candidate projection).

## Task Commits

Each task was committed atomically (via the allowlisted `git -c core.hooksPath=/dev/null` bypass — husky pre-commit runs the frozen 133-error tsc baseline):

1. **Task 1: SEC-02 migration — DROP candidate row policy + get_minha_redacao DEFINER RPC** — `fc91bee` (feat)
2. **Task 2: redacaoService rewire to get_minha_redacao** — `c22fab5` (feat)
3. **Task 3: SEC-02 SQL smoke + vitest projection guard** — `0038d8c` (test)

## Files Created/Modified
- `supabase/migrations/20260706110003_sec02_redacao_verdict.sql` (created) — DROP redacao_candidato_select + get_minha_redacao DEFINER safe-projection RPC (coarsened status); no column REVOKE; RH policies intact
- `supabase/tests/sec02_smokes.sql` (created) — candidato-DENY + get_minha_redacao safe-projection + RH-still-reads smoke (3 sections), executed against PROD in 24-08
- `src/features/avaliacao/__tests__/redacaoService.rpc.test.ts` (created) — asserts both candidate reads call `.rpc('get_minha_redacao')`, never `.from('redacoes_candidato')`, and carry no verdict field
- `src/features/avaliacao/services/redacaoService.ts` (modified) — getRedacaoCandidato + getMinhasRedacoes rewired to the RPC; file-header invariant #1 updated to describe the RPC path; REDACAO_CANDIDATO_ALLOWLIST retained as defense-in-depth/test anchor

## Decisions Made
- **Mechanism (the landmine)** — followed the plan/CONTEXT SEC-02 decision exactly: candidate-DENY row (`DROP redacao_candidato_select`) + `get_minha_redacao` DEFINER RPC. Deliberately authored NO `REVOKE SELECT (col)` on `redacoes_candidato` — 24-LIVE-STATE.md confirmed RH reads the 9 verdict columns via the SAME `authenticated` role, so a column REVOKE would blind RH (Pitfall 1). Because there is no candidate SELECT policy left, the base table returns 0 rows to any candidato — that row-deny is the real teeth.
- **status_analise coarsening** — the RPC maps every non-`concluida` state to a neutral `em_analise` so `pendente_humano` (human review triggered by a red flag) cannot leak the outcome to the candidate (T-24-03-03). `ordem` is projected (per the plan's RPC signature) and dropped by the client mapping into `MinhaRedacaoRow`.
- **Not-yet-typed RPC** — used the confined RPC-name/args cast idiom from `cognitivoService.listItens`; `get_minha_redacao` lands in `database.types.ts` at the 24-08 regen, when the cast is dropped (guardrail: do not hand-edit `database.types.ts`).
- **Single-row semantics** — `getRedacaoCandidato` previously used `.maybeSingle()`; since the RPC `RETURNS TABLE`, it now takes the first ordered row (`rows[0] ?? null`). Faithful to the candidate-safe read; ordering is by `ordem` inside the RPC (stable; `getMinhasRedacoes` previously ordered by `submetida_em` — a minor, safe ordering change).

## Deviations from Plan

None - plan executed exactly as written. (The candidate-DENY + DEFINER-RPC mechanism, the coarsened status, the RH-untouched invariant, the lockstep client rewire, and the file-only/no-PROD-apply scope all match the plan verbatim.)

## Issues Encountered
- The new vitest guard initially used `row as Record<string, unknown>` for the `not.toHaveProperty` checks, which tripped `TS2352` (MinhaRedacaoRow ↮ Record) and grew tsc 133→135. Dropped the casts (`expect(row).not.toHaveProperty(k)` — the matcher accepts `unknown`); tsc back to 133, vitest 3/3 green.

## Verification
- `npm run test:run -- redacaoService.rpc` → 3/3 green.
- tsc baseline: **133** (unchanged — no growth).
- Acceptance greps — migration: `get_minha_redacao` + `DROP POLICY redacao_candidato_select` + `auth.uid()` = 7 hits; `REVOKE SELECT (` = 0; verdict columns in the RETURN QUERY projection = 0 (the only mention is the COMMENT doc naming what is excluded); no DDL touching `redacao_rh_select`/`redacao_rh_update`/`redacao_no_client_insert`; non-comment `candidaturas` write = 0; `SECURITY DEFINER` + `SET search_path = ''` present; no BEGIN/COMMIT wrapper. Client: `.rpc('get_minha_redacao')` = 2, `.from('redacoes_candidato').select` = 0. Smoke: `get_minha_redacao`/`set_config('request.jwt.claims'` anchors = 9, candidato-DENY on `red_flag_etico`, `pg_get_function_result` safe-projection assertion, RH `administrador` assertion, `REVOKE SELECT (` = 0.
- No PROD migration applied (24-08); no `candidaturas` write (RNF-07a).

## User Setup Required
None - no external service configuration required. (PROD apply of the migration + running `sec02_smokes.sql` against PROD = 24-08, orchestrator-run; EF/regen follow in 24-08/24-09.)

## Next Phase Readiness
- **24-04 (SEC-05/06/08 vaga-scope):** unblocked — SEC-02 kept isolated per plan; note that 24-04 may also sweep `redacoes_candidato`'s RH policies for vaga-scoping (A30) — those RH policies are intact here and ready to be tightened there.
- **24-08 (PROD apply):** must (a) apply `20260706110003_sec02_redacao_verdict.sql` via Supabase MCP, (b) run `supabase/tests/sec02_smokes.sql` against PROD (§(a) candidato-DENY, §(b) safe projection, §(c) RH-still-reads MUST all PASS — §(c) FAIL would mean RH was blinded), (c) regen `database.types.ts` (adds `get_minha_redacao`) and drop the confined cast in `redacaoService`.

## Self-Check: PASSED

- All 3 created files + this SUMMARY exist on disk.
- All 3 task commits present in git (`fc91bee`, `c22fab5`, `0038d8c`).
- No tracked files deleted across the 3 task commits.

---
*Phase: 24-blindagem-de-seguran-a-pii-lgpd*
*Completed: 2026-07-07*
