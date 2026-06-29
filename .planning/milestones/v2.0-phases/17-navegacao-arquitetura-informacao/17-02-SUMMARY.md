---
phase: 17-navegacao-arquitetura-informacao
plan: 02
subsystem: navigation
tags: [react-router, navigation, funilNavMap, 404, catch-all, route-normalization, glass-ui, wave-1]

# Dependency graph
requires:
  - phase: 17-01 (Wave 0 RED battery)
    provides: funilNavMap.test.ts + routes.nav.test.tsx RED specs (calibrated to flip GREEN here)
  - phase: M2 (Phases 6-16, archived)
    provides: EtapaFunilM2 + ETAPA_M2_LABELS enum, candidaturaId route contract, the orphaned funnel workspaces
provides:
  - "funilNavMap.ts — single-source EtapaFunilM2 → { label, rotaCandidato, rotaWorkspaceRH, ctaCandidato, ctaRH } map, candidaturaId-parameterized (D-17)"
  - "NotFoundPage.tsx — Beauty Smile glass 404 with role-aware SPA back-link (D-14)"
  - "routes.tsx catch-all path:'*' (LAST) + bare-singular /rh/candidato/:id → plural hub redirect (D-08/D-14)"
affects: [17-03, 17-04, 17-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure src/lib/ nav module (acyclic feature→lib, opcoesNormalize precedent) consumed by BOTH candidate Dashboard page and RH hub feature"
    - "Param-preserving route redirect via a useParams wrapper component (RedirectToHub) — NOT a literal <Navigate to=':id'> (Pitfall 5)"
    - "Catch-all path:'*' appended LAST + no RoleGuard (terminal presentational page, renders for any/unknown role)"

key-files:
  created:
    - src/lib/navegacao/funilNavMap.ts
    - src/components/pages/NotFoundPage.tsx
  modified:
    - src/router/routes.tsx

key-decisions:
  - "D-17: funilNavMap reuses EtapaFunilM2 + ETAPA_M2_LABELS from triagemService (no parallel enum) — TS Record<EtapaFunilM2,…> enforces exhaustiveness over the 8 stages"
  - "Pitfall 1: every :id route segment in the map carries candidaturaId, not candidato/vaga id"
  - "D-08: canonical hub = plural /rh/candidatos/:id (TriagemTable link stays per D-04); bare singular /rh/candidato/:id redirects param-preserving; workspace sub-routes untouched"
  - "NotFoundPage back-link reads store role (useRole) and picks one of 3 fixed internal home routes — exposes no protected route names (V7/T-17-02-404)"
  - "No bg-primary (broken token D-26) — bg-[#35BFAD] accent + dark glass; comment reworded to keep the bg-primary grep guard at 0"

patterns-established:
  - "Wave-1 GREEN flip: the two genuinely-new artifacts (funilNavMap pure derivation + NotFoundPage presentational) + the route-table edits flip the 17-01 RED specs"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-06-28
---

# Phase 17 Plan 02: Navigation Foundation Summary

**The single-source `funilNavMap` (D-17, candidaturaId-keyed, reusing ETAPA_M2_LABELS), the Beauty Smile glass `NotFoundPage` (D-14, role-aware SPA back-link), and the `routes.tsx` catch-all `path:'*'` + bare-singular hub redirect (D-08/D-14) — the foundation every downstream wiring plan (17-03 hub, 17-04 Dashboard CTA, 17-05 E2E) consumes, flipping the 17-01 funilNavMap + routes.nav RED specs GREEN.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-28T19:27:19Z
- **Completed:** 2026-06-28T19:31:59Z
- **Tasks:** 3
- **Files modified:** 3 (2 created + 1 modified)

## Accomplishments

- Built `src/lib/navegacao/funilNavMap.ts` as the exhaustive `Record<EtapaFunilM2, FunilNavEntry>` single source, reusing `EtapaFunilM2` + `ETAPA_M2_LABELS` from triagemService (no parallel enum) — TS enforces exhaustiveness over the 8 stages, every route fn interpolates the candidaturaId (Pitfall 1). Flipped `funilNavMap.test.ts` GREEN (5/5).
- Built `src/components/pages/NotFoundPage.tsx` — a standalone Beauty Smile glass 404 (BackgroundImage gradient + centered dark GlassCard, no persona navbar, no RoleGuard) with verbatim UI-SPEC copy and a role-aware SPA back-link computed from the store `role` via a switch (candidato→/candidato/dashboard, rh|administrador→/rh/dashboard, null→/). Navigation via `useNavigate`/`GlassButton`, turquoise accent, ≥44px tap target. Zero `bg-primary`.
- Edited `src/router/routes.tsx`: appended the catch-all `{ path: '*', element: <NotFoundPage /> }` as the LAST entry (no RoleGuard) and added the D-08 normalization — a `RedirectToHub` `useParams` wrapper mapping bare singular `/rh/candidato/:id` → canonical plural `/rh/candidatos/:id` param-preserving (NOT a literal `<Navigate to=":id">`, Pitfall 5). Kept the plural hub canonical (TriagemTable link stays, D-04), left workspace sub-routes + RoleGuards untouched, deleted no legacy (deferred to 17-05), left DevNav/App.tsx untouched (D-02). Flipped `routes.nav.test.tsx` GREEN (4/4).

## Task Commits

Each task committed atomically (all via `git -c core.hooksPath=/dev/null`, project convention):

1. **Task 1: funilNavMap.ts — single-source etapa→tela map (D-17)** — `cafbef1` (feat)
2. **Task 2: NotFoundPage.tsx — Beauty Smile glass 404, role-aware back-link (D-14)** — `ecc41f1` (feat)
3. **Task 3: routes.tsx — catch-all 404 + route normalization redirect (D-08/D-14)** — `e2d13c9` (feat)

**Plan metadata:** _(the docs commit — SUMMARY + STATE + ROADMAP)_

## Files Created/Modified

- `src/lib/navegacao/funilNavMap.ts` (NEW) — exhaustive 8-stage map, candidaturaId-parameterized, reusing ETAPA_M2_LABELS; pure (no React/Supabase); `FunilNavEntry` interface exported.
- `src/components/pages/NotFoundPage.tsx` (NEW) — glass 404, role-aware SPA back-link, verbatim UI-SPEC copy, no bg-primary.
- `src/router/routes.tsx` (MODIFIED) — `Navigate`/`useParams` imports + `NotFoundPage` import + `RedirectToHub` wrapper; bare-singular hub redirect route; catch-all `path:'*'` appended LAST.

## Decisions Made

- **funilNavMap reuses the funnel enum, never redeclares it (D-17):** importing `EtapaFunilM2` + `ETAPA_M2_LABELS` means the `Record<EtapaFunilM2, …>` type forces exhaustiveness and the labels stay drift-proof — a parallel copy would reintroduce the 22P02 enum-drift bug `ETAPA_M2_LABELS` was created to fix.
- **Hub id contract = candidaturaId, plural mount canonical (D-08 / Open Q1):** the plural `/rh/candidatos/:id` stays the hub mount because TriagemTable already links to it (D-04, content changes in 17-03), and the bare singular `/rh/candidato/:id` redirects to it param-preserving. The workspace sub-routes keep singular form + RoleGuard.
- **NotFoundPage is guard-free and role-read-only:** it renders for any/unknown role (terminal presentational page, T-17-02-EOP accept) and the back-link exposes only fixed internal home routes selected by the store role (no protected route-name leak, T-17-02-404 mitigate).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `bg-primary` grep guard tripped by a doc-comment substring**
- **Found during:** Task 2 (NotFoundPage)
- **Issue:** The acceptance criterion + plan verify command run `grep -c "bg-primary" === 0`, but the file's broken-token caveat doc-comment contained the literal substring `bg-primary` twice → the guard read 2, which would fail the acceptance check despite zero actual usage.
- **Fix:** Reworded the comment to describe the broken token without the literal `bg-primary` substring (no behavior change, no class change).
- **Files modified:** src/components/pages/NotFoundPage.tsx
- **Verification:** `grep -c "bg-primary"` now 0; the page still uses `bg-[#35BFAD]` accent + dark glass only.
- **Committed in:** `ecc41f1` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — comment prose only, zero behavior/class change)
**Impact on plan:** None on scope — the fix only changed comment wording to satisfy the literal grep guard.

## Issues Encountered

- **tsc baseline 292 → 291:** the funilNavMap module-not-found RED (one of the 2 intended 17-01 RED errors) resolved when Task 1 created the module. The remaining +1 over the 290 legacy baseline is the HubSection module-not-found RED, which 17-03 resolves. Well under the ~301 gate; no new tsc errors introduced.
- **`npm run build` chunk-size warning:** pre-existing advisory (chunks > 500 kB), not an error; build exits 0.

## Authentication Gates

None — no external service or auth interaction in this client-routing plan.

## Known Stubs

None — `funilNavMap` is a complete derivation over all 8 stages; `NotFoundPage` is fully wired (no placeholder data). The hub CONTENT at `/rh/candidatos/:id` still mounts the legacy `PerfilCandidatoRHPage` mock, but that is the canonical mount whose destination CONTENT is intentionally changed in 17-03 (D-04) — not a stub introduced by this plan.

## User Setup Required

None.

## Next Phase Readiness

- **17-03 (Wave 2 — RH hub):** imports `funilNavMap` for the per-stage "Abrir {label}" CTA + section navigation; the hub mounts at the canonical plural `/rh/candidatos/:id` (candidaturaId). The `HubSection` module-not-found RED is the only remaining +1 over baseline.
- **17-04 (Wave 2 — Dashboard CTA):** imports `funilNavMap` for the candidate "Continuar para {label}" step-CTA + LGPD card route (`rotaCandidato`).
- **17-05 (Wave 3 — E2E + legacy cleanup):** the catch-all + 404 heading + bare-singular redirect are live for the Playwright J4 (404) journey and the param-preserving redirect assertion. Legacy deletion is deferred here per plan.
- No blockers.

## Threat Flags

None — the catch-all introduces no new access surface (guard-free terminal page, real access control unchanged on /rh/* and /admin/*); the redirect target is a static internal template, not user-derived (no open-redirect).

## Self-Check: PASSED

All 3 source files + SUMMARY.md present on disk; all 3 task commits (`cafbef1`, `ecc41f1`, `e2d13c9`) present in git history.

---
*Phase: 17-navegacao-arquitetura-informacao*
*Completed: 2026-06-28*
