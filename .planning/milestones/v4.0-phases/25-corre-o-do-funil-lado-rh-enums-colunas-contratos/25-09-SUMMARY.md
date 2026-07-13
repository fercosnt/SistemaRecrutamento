---
phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos
plan: 09
subsystem: ui
tags: [react, tanstack-query, supabase, rls, dropdown-menu, dead-affordance, vagas]

# Dependency graph
requires:
  - phase: 25 (25-05)
    provides: "candidatura.id nav call sites in CandidatosRHPage (card + table dropdowns) — the same two dropdowns whose dead items are swept here"
  - phase: 25 (25-06)
    provides: "UX-06 dead-affordance sweep Wave 1 (badges, RHTopBar search, DecisaoFinalPage no-ops, A14/A37 mock screens); this plan closes the 2 items 25-06 left out of scope"
provides:
  - "CandidatosRHPage RH dropdown shows only wired actions — 3 no-op items (Enviar Email / Enviar WhatsApp / Exportar PDF) removed from both card and table views"
  - "enriquecerVaga per-vaga status counts decoupled from candidatoId via an includeCounts flag threaded useVagas -> listVagas -> enriquecerVaga; RH/administrador sessions now get real VagasRHPage tiles"
  - "WR-10 anon-safety preserved: anon /vagas visitors still issue zero candidaturas round-trips"
  - "REQUIREMENTS.md Phase-25 coverage reconciled: FUNIL-02/03/06/09/11 marked Complete"
affects: [phase-26-funil-candidato, milestone-audit, 25-verification-reverify]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-signal enrichment gate: anon fast-return keys on NEITHER candidatoId NOR includeCounts, so an authenticated session with a null candidato (RH) still reaches the RLS-scoped count query"
    - "Authenticated-session signal for data-fetch gating = authStore.user presence (!!user), null for anon"

key-files:
  created: []
  modified:
    - src/components/pages/CandidatosRHPage.tsx
    - src/features/vagas/services/vagasService.ts
    - src/features/vagas/hooks/useVagas.ts
    - src/features/vagas/services/__tests__/vagasService.test.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "includeCounts is derived from authStore.user (authenticated) rather than role, giving RH/administrador/candidato real counts while anon (user===null) preserves the WR-10 zero-round-trip skip"
  - "getVagaById/getVagaBySlug pass includeCounts = !!candidatoId to preserve the exact pre-25-09 detail-page behavior (VagaDetalhePage/VagasPublicasPage counts ran iff candidatoId was truthy) — no detail-hook or page changes needed"
  - "UX-06 REQUIREMENTS.md coverage row left unflipped per plan Task 3 instruction — its final mark is deferred to the 25-VERIFICATION re-verify"

patterns-established:
  - "Dead-affordance sweep: remove the no-op DropdownMenuItem AND the now-orphaned separators that only fenced it, AND the now-unused icon imports (grep each icon before removing — Mail was kept, still used for the email row)"

requirements-completed: [UX-06]

# Metrics
duration: ~10min
completed: 2026-07-12
---

# Phase 25 Plan 09: UX-06 Gap-Closure (dead RH menu + real per-vaga tiles) Summary

**Closed the 2 open UX-06 dead-affordance items from 25-VERIFICATION: swept the 3 no-op RH dropdown items (Enviar Email / WhatsApp / Exportar PDF) from both CandidatosRHPage views, and gave the VagasRHPage per-vaga tiles real RH-session counts via an `includeCounts` flag that decouples the count query from candidatoId while preserving the WR-10 anon skip.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-12T04:26:37Z
- **Completed:** 2026-07-12T04:36:05Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Removed the 3 no-op `DropdownMenuItem`s (zero `onClick`) + orphaned separators from both the card view and the table view of CandidatosRHPage; pruned now-unused `MessageSquare`/`FileText` icon imports (kept `Mail`, still used for the candidate email row).
- Decoupled `enriquecerVaga`'s per-vaga status-count query from `candidatoId` via a new `includeCounts` flag threaded `useVagas` → `listVagas` → `enriquecerVaga`. RH/administrador sessions (which have `authStore.candidato === null`) now receive real `total` / `emAnalise` / `aprovados` counts on the VagasRHPage tiles instead of a structural 0.
- Preserved WR-10: the anon fast-return now gates on BOTH signals (neither `candidatoId` nor `includeCounts`), so anonymous `/vagas` visitors still issue zero candidaturas round-trips. Verified by a unit test asserting `supabase.from` is never called with `'candidaturas'`.
- Reconciled REQUIREMENTS.md: FUNIL-02/03/06/09/11 flipped from Pending → Complete (checklist `[x]` + coverage table) — the documentation-hygiene process finding from 25-VERIFICATION.

## Task Commits

Each task was committed atomically (all via the allowlisted `git -c core.hooksPath=/dev/null` hook-bypass):

1. **Task 1: Sweep the 3 no-op RH dropdown items (card + table views)** — `f3d36d0` (fix)
2. **Task 2: Real per-vaga counts for authenticated (RH) sessions; anon still skipped** — `ad04561` (feat, TDD)
3. **Task 3: Reconcile REQUIREMENTS.md Phase-25 coverage** — `f8fa1a4` (docs)

**Plan metadata:** _(final docs commit — SUMMARY + STATE + ROADMAP)_

_TDD note (Task 2): RED was demonstrated in the working tree (T7 failed `undefined → 4` before the service change, T8 already green — WR-10 pre-preserved), then RED+GREEN were committed atomically in `ad04561` because committing the RED test alone would have raised the tsc arg-count error to 108, violating the ≤107 baseline constraint at commit time._

## Files Created/Modified
- `src/components/pages/CandidatosRHPage.tsx` — removed dead dropdown items + orphaned separators (both views); dropped `MessageSquare`/`FileText` imports.
- `src/features/vagas/services/vagasService.ts` — `enriquecerVaga(vaga, candidatoId?, includeCounts?)`: two-signal anon gate, `hasUserApplied` only when `candidatoId` present, counts when `includeCounts`; `listVagas` threads `includeCounts`; `getVagaById`/`getVagaBySlug` pass `!!candidatoId` to keep detail-page behavior identical.
- `src/features/vagas/hooks/useVagas.ts` — reads `authStore.user`, sets `includeCounts = !!user` (authenticated) and passes it to `listVagas`.
- `src/features/vagas/services/__tests__/vagasService.test.ts` — added T7 (RH-style call populates counts) and T8 (anon-style call issues no candidaturas query, counts undefined).
- `.planning/REQUIREMENTS.md` — FUNIL-02/03/06/09/11 → Complete (checklist + coverage table).

## Decisions Made
- **Authenticated signal = `authStore.user`.** The plan allowed role or user; `user` is present for every authenticated session (candidato/rh/administrador) and null for anon, which is exactly the WR-10 boundary. Role would work equally but `user` reads as "is there a session at all."
- **Detail pages untouched.** Rather than thread `includeCounts` into `useVaga`/`useVagaBySlug`/`VagaDetalhePage`, `getVagaById`/`getVagaBySlug` pass `includeCounts = !!candidatoId`, which reproduces the exact pre-25-09 behavior (counts ran iff `candidatoId` truthy). This keeps the blast radius to the plan's `files_modified` and avoids a candidate-detail regression.
- **UX-06 REQUIREMENTS.md row not flipped here** — per plan Task 3, its final mark is left to the 25-VERIFICATION re-verify. (Both underlying items are now delivered.)

## Deviations from Plan

None — plan executed exactly as written. The only judgment call was folding Task 2's TDD RED+GREEN into a single atomic commit to respect the project's ≤107 tsc baseline constraint (a RED-only commit would transiently read 108). This is a commit-granularity choice, not a scope change; RED was still demonstrated first in the working tree.

## Issues Encountered
None. All gates green on the first pass after implementation.

## Verification / Gate Results
- `grep -cE "Enviar Email|Enviar WhatsApp|Exportar PDF" src/components/pages/CandidatosRHPage.tsx` → **0** (both views swept).
- `grep -q "includeCounts"` in both `vagasService.ts` and `useVagas.ts` → **present**.
- `npx tsc --noEmit | grep -c "error TS"` → **107** (NOT increased above the frozen baseline).
- `npm run test:run` → **783/783** across 96 files (was 781; +2 new assertions T7/T8).
- `npm run build` → **green** (pre-existing chunk-size advisories only).

## User Setup Required
None — no external service configuration required. (No DB migration, no EF redeploy: the count query was already RLS-scoped; this plan only changes when the client issues it.)

## Next Phase Readiness
- Both UX-06 gap items are now closed in code + unit-guarded. A 25-VERIFICATION re-verify should flip UX-06 to satisfied and lift Phase 25 to 9/9.
- Two live-only checks remain worth a human glance (not blockers): (1) the RH VagasRHPage tiles showing real non-zero counts for a vaga with candidaturas in a real RH session, and (2) the reflow of the Candidatos dropdown after the item removal. Both are visual/RLS-runtime confirmations that jsdom cannot exercise.
- Ready for Phase 26 (Funil lado candidato).

## Self-Check: PASSED

All modified files present on disk; all 3 task commits (`f3d36d0`, `ad04561`, `f8fa1a4`) found in git history.

---
*Phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos*
*Completed: 2026-07-12*
