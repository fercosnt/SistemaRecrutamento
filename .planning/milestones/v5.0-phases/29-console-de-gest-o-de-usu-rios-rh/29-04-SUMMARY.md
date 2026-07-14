---
phase: 29-console-de-gest-o-de-usu-rios-rh
plan: 04
subsystem: ui
tags: [react, tanstack-query, async-state, rhlayout, admin-console, usuarios-rh]

# Dependency graph
requires:
  - phase: 29-01
    provides: useUsuariosRh() roster query + usuariosRhService allowlist read
  - phase: 29-02
    provides: NovoUsuarioDialog (create-user dialog, controlled open/onOpenChange)
  - phase: 29-03
    provides: UsuariosRhTable (glass roster + per-row account actions + anti-lockout)
  - phase: 28
    provides: gerenciar-usuario-rh EF (authenticate-THEN-authorize write-path)
provides:
  - GestaoUsuariosPage — the composed console body (query → AsyncState → table + header CTA owning NovoUsuarioDialog)
  - ConfiguracoesPage wired to the real console (empty-state removed; single RHLayout owner)
  - /rh/configuracoes end-to-end reachable → USR-01..05 Complete
affects: [Phase 30 (Meu Perfil RH), gsd-secure-phase 29, gsd-verify-work UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Page-host composition: ConfiguracoesPage owns RHLayout (single owner); GestaoUsuariosPage renders body-only (no nested shell)"
    - "AsyncState copy-override drives loading/error/empty/success without editing the shared wrapper — never a blank surface"

key-files:
  created:
    - src/features/admin/components/GestaoUsuariosPage.tsx
    - src/features/admin/components/__tests__/GestaoUsuariosPage.test.tsx
  modified:
    - src/components/pages/ConfiguracoesPage.tsx
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Single RHLayout owner = ConfiguracoesPage; GestaoUsuariosPage is body-only (space-y-6, no legacy p-8) — no shell double-nest"
  - "routes.tsx + RoleGuard role='administrador' untouched; the console is defense-in-depth over the Phase-28 EF server authz (T-29-11)"
  - "AsyncState glass default (true) keeps loading/error/empty/success all on a glass surface — the roster table's own bordered shell nests inside on success"

patterns-established:
  - "Console composition pattern: useUsuariosRh() → <AsyncState copy=...> → <UsuariosRhTable> + header CTA owning the create dialog open state"
  - "Route-host swap: replace an empty-state body with a feature component while preserving route/guard/shell (regression-locked by a routes.tsx source assertion in the test)"

requirements-completed: [USR-01, USR-02]

# Metrics
duration: 5min
completed: 2026-07-13
---

# Phase 29 Plan 04: GestaoUsuariosPage + ConfiguracoesPage wiring Summary

**The A14 console goes live: `/rh/configuracoes` now renders the real RH user roster (query → AsyncState 5-state → table) with a "Novo usuário" CTA opening the create dialog — replacing the M4 empty-state under a single preserved RHLayout + RoleGuard.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-13T20:25:07Z
- **Completed:** 2026-07-13T20:30:18Z
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `GestaoUsuariosPage` composes 29-01 (query) + 29-02 (create dialog) + 29-03 (roster table) behind `<AsyncState>` — loading skeleton / error+retry→refetch / empty defensive / success table, never a blank surface (T-29-12).
- `ConfiguracoesPage` swapped from the "feature unavailable" empty-state to `<GestaoUsuariosPage/>` under one `RHLayout`; the legacy header + GlassCard body + `min-h-screen p-8` wrapper + unused imports removed.
- Route + `RoleGuard role="administrador"` in `routes.tsx` left untouched (defense-in-depth) — regression-locked by a source assertion in the integration test (T-29-13).
- USR-01..05 now reachable end-to-end → marked Complete in REQUIREMENTS.md (checklist + traceability table).

## Task Commits

Each task was committed atomically (via `git -c core.hooksPath=/dev/null`):

1. **Task 1: GestaoUsuariosPage — query + AsyncState + Novo usuário CTA** — `fc3b7d5` (feat)
2. **Task 2: Wire GestaoUsuariosPage into ConfiguracoesPage** — `9833c28` (feat)
3. **Task 3: GestaoUsuariosPage integration test — states + CTA + guard assertion** — `d761bd2` (test)

_Note: Task 3 is `tdd="true"`; because the plan sequences the implementation tasks (1–2) before the test task (3), the test was authored as a GREEN integration lock over the just-built composition (see TDD Gate Compliance below)._

## Files Created/Modified
- `src/features/admin/components/GestaoUsuariosPage.tsx` — console body: `useUsuariosRh()` → `<AsyncState copy=...>` → `<UsuariosRhTable>`; header "Gestão de usuários" + subtitle + `UserPlus` "Novo usuário" CTA owning `<NovoUsuarioDialog>` open state. No RHLayout self-mount.
- `src/components/pages/ConfiguracoesPage.tsx` — renders `<RHLayout><GestaoUsuariosPage/></RHLayout>`; keeps the export name `ConfiguracoesPage` (route imports it lazily). Empty-state gone.
- `src/features/admin/components/__tests__/GestaoUsuariosPage.test.tsx` — RTL: success roster render, loading skeleton, error+retry→refetch, empty defensive, CTA-opens-dialog, RoleGuard source assertion (6 tests).
- `.planning/REQUIREMENTS.md` — USR-01..05 checked + traceability rows set to Complete.

## Decisions Made
- **Single RHLayout owner:** ConfiguracoesPage keeps the shell; GestaoUsuariosPage is body-only (`space-y-6`, no `p-8`). Prevents shell double-nest (UI-SPEC §Layout / plan critical).
- **AsyncState `glass` left at default (true):** loading/error/empty/success all sit on a glass surface (never blank); the roster table's own bordered shell nests inside on success — matches UI-SPEC §States "GlassCard + Table".
- **`onRetry={() => refetch()}`** reuses the BiasAuditPage idiom (a value-returning fn assigned to the `() => void` retry slot — the standard void-fn exception).

## Deviations from Plan

**1. [Rule 1 - Bug] Reworded ConfiguracoesPage docstring so the empty-state string is truly absent**
- **Found during:** Task 2 (verification)
- **Issue:** The initial docstring quoted the old empty-state text `"…ainda não disponível"` verbatim, which tripped the plan's `! grep -q "ainda não disponível"` verify (the string must be gone from the file).
- **Fix:** Reworded the comment to `"feature unavailable" empty-state` — no literal quote of the old string.
- **Files modified:** src/components/pages/ConfiguracoesPage.tsx
- **Verification:** `! grep -q "ainda não disponível"` now passes; wiring + guard checks green.
- **Committed in:** `9833c28` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — a verify-contract mismatch in my own comment text)
**Impact on plan:** Trivial; no scope creep. The three artifacts match the plan spec exactly.

## TDD Gate Compliance
The plan orders implementation (Tasks 1–2) before the `tdd="true"` test (Task 3), so this is post-implementation characterization rather than strict RED-first. Not run under MVP+TDD gate mode (no `MVP_MODE`/`TDD_MODE` flags). The test authored in Task 3 (`test(29-04): …` — `d761bd2`) is GREEN 6/6 and locks all 5 AsyncState/CTA cases + the RoleGuard invariant. RED-first was not applicable because the feature under test was built by the preceding tasks in the same plan.

## Issues Encountered
None beyond the deviation above.

## Verification
- New test: `npm run test:run -- …/GestaoUsuariosPage.test.tsx` → 6/6 GREEN.
- Full suite: `npm run test:run` → **832/832** (104 files).
- Type-check: `npx tsc --noEmit` → **104** errors (flat baseline; ≤104 held).
- Build: `npm run build` → success; PERF-03 chunk conditions all met (eager index 882 kB < baseline; 42 chunks; no jsPDF in eager index).
- Single RHLayout owner confirmed (GestaoUsuariosPage has 0 RHLayout import/JSX; ConfiguracoesPage owns it).
- Guard preserved: `grep -q 'RoleGuard role="administrador"' src/router/routes.tsx` → present; empty-state string absent from ConfiguracoesPage.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 29 (Console de Gestão de Usuários RH) is code-complete across 29-01..04; USR-01..05 Complete. Ready for `/gsd-secure-phase 29` (privilege-escalation surface) + `/gsd-verify-work` live UAT (admin `e2e.admin@beautysmile.com.br`).
- Next execution: Phase 30 (Meu Perfil RH — A37 self-service, SEG-03 anti-privilege-escalation).

## Self-Check: PASSED

---
*Phase: 29-console-de-gest-o-de-usu-rios-rh*
*Completed: 2026-07-13*
