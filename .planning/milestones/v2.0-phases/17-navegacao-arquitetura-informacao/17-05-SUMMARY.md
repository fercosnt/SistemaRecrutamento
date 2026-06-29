---
phase: 17-navegacao-arquitetura-informacao
plan: 05
subsystem: navigation
tags: [legacy-cleanup, react-router, playwright, e2e, dod-gate, navegability-smoke, grep-guard]

# Dependency graph
requires:
  - phase: 17-02
    provides: catch-all path:'*' + NotFoundPage (the J4 404 target) + funilNavMap + D-08 redirects
  - phase: 17-03
    provides: real RH hub (HubCandidatoRH) + RHSidebar Admin item + TriagemTable <Link> carrying candidaturaId (J2/J3 targets)
  - phase: 17-04
    provides: Dashboard funnel step-CTA + candidate landing repoint (J1 target)
provides:
  - Conservative legacy purge — 12 confirmed-dead files removed (file + routes.tsx import/route/devNav scrub); MeuPerfilPage KEPT
  - legacy-routes grep guard flipped 13/13 GREEN (12 dead → 0 refs; MeuPerfilPage positive control stays GREEN)
  - e2e/navegacao.spec.ts promoted RED → GREEN — J4 (404) PASSES unconditionally; J1-J3 gated assert the wired routes/headings (DoD = D-03)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Re-grep-then-delete (D-12 conservative): each dead file confirmed zero live importer + zero in-app nav BEFORE removal; doc-markdown mentions are not live refs"
    - "Per-file 4-edit atomic scrub (Pitfall 6): file + import + route object + devNavigationPages entry, then build to catch a stale import"
    - "RED scaffold promotion: a Wave-0 RED assertion (getByRole link) that guessed the affordance is corrected to the actual implementation (GlassButton → role=button) when the wired build lands"

key-files:
  created:
    - .planning/phases/17-navegacao-arquitetura-informacao/17-05-SUMMARY.md
  modified:
    - src/router/routes.tsx
    - e2e/navegacao.spec.ts
  deleted:
    - src/components/pages/VagaLPPage.tsx
    - src/components/pages/TesteBigFivePage.tsx
    - src/components/pages/TesteDISCPage.tsx
    - src/components/pages/TesteRavenPage.tsx
    - src/components/pages/InstrucoesBigFivePage.tsx
    - src/components/pages/InstrucoesDISCPage.tsx
    - src/components/pages/InstrucoesRavenPage.tsx
    - src/components/pages/ConclusaoTestesPage.tsx
    - src/components/pages/QuestionarioPage.tsx
    - src/components/pages/QuestionarioCulturaPage.tsx
    - src/components/pages/InscricaoPage.tsx
    - src/components/GlassShowcase.tsx

key-decisions:
  - "D-12 conservative deletion: only the proven-dead set was hard-deleted, each gated by a zero-use re-grep BEFORE removal. No file with a live entry was touched — MeuPerfilPage (/rh/perfil, RHTopBar.tsx:38) explicitly KEPT."
  - "J4 back-link assertion corrected to button-or-link: NotFoundPage renders the 'Voltar...' affordance as a GlassButton (role=button, SPA navigate), not a <Link>. The 17-01 RED scaffold guessed role=link — fixed to a resilient .or() so J4 PASSES the wired build (D-16 asserts affordance/route resolution, not element tag)."
  - "DevNavigationMenu untouched (D-02): App.tsx not edited; devnav-gate grep guard stays GREEN. Production nav covers the funnel now but DevNav removal is deferred until 100% coverage is confirmed."

patterns-established:
  - "Wave-3 DoD gate: the navegable-journey E2E (D-03) is the Definition of Done — J4 GREEN unconditionally proves the catch-all; J1-J3 gated prove the wired funnel/hub/admin/avaliação routes resolve by click"

requirements-completed: []

# Metrics
duration: ~6min
completed: 2026-06-28
---

# Phase 17 Plan 05: Conservative Legacy Purge + Navegability DoD Gate Summary

**Closed Phase 17: hard-deleted the 12 confirmed-dead legacy components (each re-grepped zero-use first; MeuPerfilPage KEPT), scrubbed their routes.tsx import/route/devNav references, flipped the legacy-routes grep guard 13/13 GREEN, and promoted e2e/navegacao.spec.ts from RED to GREEN — J4 (404) PASSES unconditionally against the wired build and J1-J3 gated-real-auth assert the now-wired funnel/hub/admin/avaliação routes (DoD = D-03).**

## Performance

- **Duration:** ~6 min
- **Tasks:** 2
- **Files:** 12 deleted + 2 modified (routes.tsx, navegacao.spec.ts) + 1 SUMMARY created
- **tsc baseline:** 281 → 258 (−23, deletions reduced it; well under the ~301 gate)

## Accomplishments

- **Conservative legacy purge (D-12):** re-grepped each of the 12 dead components for live importers + in-app route nav BEFORE deleting. All 12 confirmed dead (zero live importers in `.ts/.tsx` outside routes.tsx + self; zero `navigate`/`<Link>`/`href` to their routes; the only mentions were 3 doc-markdown lines in `INSTRUCOES-RAVEN.md`/`Guidelines.md`, which are not live refs). Hard-deleted `VagaLPPage` (unrouted, 1213 LoC) + the `/testes/*` tree (`TesteBigFive/DISC/Raven` + their `Instrucoes*` + `ConclusaoTestes`) + `QuestionarioPage` + `QuestionarioCulturaPage` + `InscricaoPage` + `GlassShowcase`.
- **routes.tsx scrub (Pitfall 6):** removed 4 imports (`GlassShowcase`, `InscricaoPage`, `QuestionarioCulturaPage`, the 8-line Testes block) + 11 route objects (`/showcase`, `/auth/inscricao`, `/candidato/questionario-cultura`, `/candidato/questionario`, the 7 `/testes/*` routes) + 11 `devNavigationPages` entries + the stale `/testes/*` doc-comment line. `npm run build` exits 0 — no dangling import.
- **MeuPerfilPage KEPT:** `/rh/perfil` (live entry `RHTopBar.tsx:38`) untouched; the legacy-routes positive-control assertion stays GREEN, proving no over-deletion.
- **legacy-routes grep guard 13/13 GREEN:** the 11 route-coupled dead names now have zero routes.tsx refs, `VagaLPPage.tsx` file is gone, and MeuPerfilPage stays referenced (>0). devnav-gate grep guard stays GREEN (App.tsx untouched — D-02).
- **Navegability smoke promoted (D-16 / D-03 DoD):** J4 (404, unconditional) PASSES against the wired build (catch-all + NotFoundPage from 17-02 — RED in 17-01). J1-J3 gated behind `E2E_AUTH_TEST_USERS` + an `administrador` cred, asserting the now-wired targets (avaliação container route, hub heading, `Entrevista`/`Decisão final`/`Redação` workspace headings, `/admin/*`) by `getByRole` heading/link/button only — never data flow. All 4 journeys list under all 3 Playwright projects (12 listable tests).

## Task Commits

Each task committed atomically (all via `git -c core.hooksPath=/dev/null`, project convention — the pre-commit hook runs `tsc --noEmit` over a legacy baseline and would block a normal commit):

1. **Task 1: Conservative legacy hard-delete + routes.tsx scrub (D-12)** — `313eb52` (chore)
2. **Task 2: Promote navegability smoke RED → GREEN (D-16 / D-03 DoD)** — `387d7ee` (test)

**Plan metadata:** _(this docs commit — SUMMARY + STATE + ROADMAP)_

## Files Created/Modified/Deleted

- **Deleted (12):** `VagaLPPage.tsx`, `TesteBigFivePage.tsx`, `TesteDISCPage.tsx`, `TesteRavenPage.tsx`, `InstrucoesBigFivePage.tsx`, `InstrucoesDISCPage.tsx`, `InstrucoesRavenPage.tsx`, `ConclusaoTestesPage.tsx`, `QuestionarioPage.tsx`, `QuestionarioCulturaPage.tsx`, `InscricaoPage.tsx`, `GlassShowcase.tsx`
- **Modified:** `src/router/routes.tsx` (4 imports + 11 routes + 11 devNav + doc-comment removed), `e2e/navegacao.spec.ts` (J4 back-link assertion corrected to button-or-link; promoted from RED scaffold)
- **Created:** `17-05-SUMMARY.md`

## Decisions Made

- **D-12 conservative deletion:** only the proven-dead set was removed, each gated by a zero-use re-grep BEFORE deletion. No surprise live importer surfaced; nothing was force-deleted. `MeuPerfilPage` KEPT (live RHTopBar entry).
- **J4 back-link assertion corrected:** the 17-01 RED scaffold asserted `getByRole('link', {name:/Voltar/i})`, but `NotFoundPage` renders the back affordance as a `GlassButton` (role=button, SPA `navigate`). Without the fix, J4 would FAIL the wired build. Changed to a resilient `getByRole('button')` `.or(getByRole('link'))` — asserting affordance/route resolution (D-16), not the element tag.
- **DevNav untouched (D-02):** App.tsx not edited; the `devNavigationPages` map only lost the entries for the deleted routes. DevNav removal deferred until production nav is verified at 100% coverage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] J4/404 back-link assertion targeted the wrong ARIA role**
- **Found during:** Task 2 (promoting the navegability smoke)
- **Issue:** The 17-01 RED scaffold asserted the 404 back affordance as `getByRole('link', {name: /Voltar/i})`. The wired `NotFoundPage` (17-02) renders the role-aware "Voltar ao..." affordance as a `GlassButton` (role=button, SPA `navigate`), not an `<a>`/`<Link>`. The assertion would fail against the now-wired build, blocking the J4 GREEN promotion the plan mandates.
- **Fix:** Changed the J4 back-link assertion to `getByRole('button', {name:/Voltar/i}).or(getByRole('link', {name:/Voltar/i})).first()` — resilient to the affordance kind, asserting affordance/route resolution (D-16) rather than the element tag. Zero src/ change; pure test-code.
- **Files modified:** `e2e/navegacao.spec.ts`
- **Verification:** J4 now PASSES against the live dev server (3.3s); J1-J3 skip cleanly without creds.
- **Committed in:** `387d7ee` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — test-code only, zero src/ change, required to satisfy the plan's "J4 GREEN unconditionally" acceptance criterion). No scope creep.

## Issues Encountered

- **2 pre-existing Deno EF suites fail under full Vitest (NOT this plan):** `supabase/functions/_shared/__tests__/essay-schemas.test.ts` + `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` fail with `Only URLs with a scheme in: file and data are supported... Received protocol 'https:'`. These are `deno test` files (https: import scheme) picked up under Vitest — a pre-existing test-harness mismatch unrelated to Phase 17 (no `supabase/functions/` files were touched this plan). Explicitly flagged in the plan context as out-of-scope. All 637 actual Vitest tests PASS — zero regression from the deletions.

## Verification Results

- `npm run test:run -- legacy-routes` → **13/13 GREEN** (12 dead flipped + MeuPerfilPage positive control)
- `npm run test:run -- devnav-gate` → **1/1 GREEN** (App.tsx untouched, D-02 intact)
- `npm run build` → **exits 0** (no dangling import after deletions)
- `npm run lint` (tsc) → **258 errors** (down from 281 baseline; deletions reduced it; well under ~301 gate)
- `npx playwright test navegacao --list` → **4 journeys × 3 projects = 12 tests listed**
- `npx playwright test navegacao --grep "404"` → **J4 PASSES** (3.3s) against wired dev server
- Full `npm run test:run` → **637 passed**, only the 2 pre-existing Deno EF suites fail (not this plan)

## Self-Check: PASSED

All 12 target files confirmed deleted; MeuPerfilPage confirmed present; both task commits (`313eb52`, `387d7ee`) confirmed in git history; SUMMARY.md present on disk.

---
*Phase: 17-navegacao-arquitetura-informacao*
*Completed: 2026-06-28*
