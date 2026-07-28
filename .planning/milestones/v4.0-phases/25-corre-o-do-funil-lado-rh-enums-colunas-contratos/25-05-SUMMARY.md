---
phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos
plan: 05
subsystem: hub-candidato / candidatos-rh (RH hub navigation + not-found)
tags: [UX-03, hub-navigation, not-found-state, tdd, rtl]
requires:
  - "route /rh/candidatos/:id (PerfilCandidatoRHPage → HubCandidatoRH; :id IS a candidaturaId)"
  - "useEntrevistaContexto (isLoading / isError / data==null settle signal)"
provides:
  - "CandidatosRHPage.handleVerPerfil navigates with candidatura.id at both list call sites (card button + table dropdown)"
  - "HubCandidatoRH in-shell not-found GlassCard on an unresolvable candidaturaId (persona shell preserved)"
  - "hubNotFound.test.tsx — RTL regress-guard: not-found renders on settled null contexto; no silent degrade; resolving id = no regression"
affects:
  - "src/components/pages/CandidatosRHPage.tsx (nav param semantics)"
  - "src/features/hub-candidato/components/HubCandidatoRH.tsx (adds an early-return not-found branch)"
tech-stack:
  added: []
  patterns:
    - "NotFoundPage glass composition idiom reused, scoped to the RH shell (in-shell, not the global catch-all)"
    - "early return placed AFTER all hook calls (rules of hooks) + gated on settled query (no premature flash)"
    - "RTL: mock RHLayout passthrough + the 5 hub hooks + router; configurable useEntrevistaContexto spy"
key-files:
  created:
    - src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx
  modified:
    - src/components/pages/CandidatosRHPage.tsx
    - src/features/hub-candidato/components/HubCandidatoRH.tsx
decisions:
  - "The route :id is a candidaturaId end-to-end (PerfilCandidatoRHPage→HubCandidatoRH useParams().id) — both list call sites forward candidatura.id, not candidato?.id"
  - "Kanban half (onViewPerfil forward) already landed in 25-02 (a267128) — treated as a no-op here (not re-done, not reverted); the two halves are file-disjoint and consistent"
  - "not-found gated on !loadingContexto && (errorContexto || !contexto) so it never flashes while the contexto query is still loading; early-return sits after every hook (rules of hooks)"
  - "in-shell GlassCard within RHLayout (persona shell kept) — NOT the global NotFoundPage (that is the catch-all for unknown ROUTES; here the route is valid, the id is not)"
metrics:
  duration: ~14min
  tasks: 2
  files: 3
  tsc_errors: 115
  tests: "781/781 full suite (hubNotFound 6/6, hub-candidato 9/9)"
  completed: 2026-07-11
---

# Phase 25 Plan 05: RH Hub Nav Param Fix + In-Shell Not-Found Summary

UX-03 closed on the RH-list side: `CandidatosRHPage.handleVerPerfil` now forwards `candidatura.id` (the value the `/rh/candidatos/:id` route resolves as a candidaturaId) at both list call sites instead of `candidato?.id`, and `HubCandidatoRH` renders an explicit in-shell "Candidatura não encontrada" state when that id resolves to no row — replacing the silent degrade to a generic `"Candidato" / "—"` header.

## What Was Built

**1. `src/components/pages/CandidatosRHPage.tsx` (nav param semantics — Task 1)**
- `handleVerPerfil` param renamed `candidatoId → candidaturaId`; the target is unchanged (`navigate(\`/rh/candidatos/${candidaturaId}\`)`), but the comment now documents that `:id` IS a candidaturaId (`PerfilCandidatoRHPage → HubCandidatoRH` reads `useParams().id` as a candidaturaId).
- Both list call sites now pass `candidatura.id` (were `candidato?.id`, a *person* id the hub mis-loaded → wrong/no context):
  - the `CandidatoCard` "Ver Perfil" button (card view),
  - the table-view dropdown "Ver Perfil" item.
- The `<KanbanBoard onViewPerfil={handleVerPerfil}/>` forward is unchanged: the prop signature stays `(id: string) => void`, and the Kanban's own call already passes `candidatura.id` (fixed in 25-02).

**2. `src/features/hub-candidato/components/HubCandidatoRH.tsx` (in-shell not-found — Task 2 GREEN)**
- Added `GlassCard` / `GlassButton` (from `@/components/ui/glass`) + `ArrowLeft` (lucide) imports.
- New early-return branch, gated on `!loadingContexto && (errorContexto || !contexto)`, placed **after every hook call** (rules of hooks) and gated on the query having settled (never flashes mid-load). It renders, inside `RHLayout`, a centered `GlassCard`:
  - heading (20px/600) "Candidatura não encontrada",
  - body (16px/400) verbatim "Não encontramos essa candidatura. Ela pode ter sido removida ou o link está incorreto.",
  - a single accent `GlassButton variant="accent"` with a leading `ArrowLeft` (`aria-hidden`), visible label "Voltar aos candidatos" → `/rh/candidatos`, `min-h-11`.
- NOT the global `NotFoundPage` (that is the catch-all for unknown *routes*); the RH persona shell is preserved (UI-SPEC §3).

**3. `src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx` (new — Task 2 RED→regress-guard)**
- Mocks `RHLayout` as a passthrough + the 5 hub hooks (`useEntrevistaContexto` configurable spy, `useEntrevistaScorecard`, `useScorecardCandidato`, `useRedacaoRevisao`, `useConsolidacao`) + `react-router-dom` (`useParams` → unresolvable id, `useNavigate` → spy).
- 6 assertions: settled-null → heading + verbatim body render; not-found does NOT degrade to the generic "Candidato" header nor the "Linha do funil" timeline; back-link navigates to `/rh/candidatos`; `isError` also triggers not-found; still-loading does NOT flash the not-found; a resolving id renders the normal hub (name header) with no regression.

## TDD Gate Compliance

Task 2 is `tdd="true"` — gate sequence honored in git:
1. RED: `test(25-05)` `3726a6a` — `hubNotFound.test.tsx` fails 4/6 (the not-found assertions) because `HubCandidatoRH` has no not-found branch yet; the 2 passing (loading no-flash + resolving-id no-regression) confirm the calibration, not an unexpected pass.
2. GREEN: `feat(25-05)` `41bb1cb` — added the not-found early-return → hubNotFound 6/6.
3. REFACTOR: none needed (single-source early-return; no post-GREEN change).

Task 1 (`tdd="false"`) is guarded by the existing 25-02 `KanbanBoard.test.tsx` UX-03 test plus the new hub not-found test; the CandidatosRHPage list call sites have no dedicated unit test, so the guard is the build + tsc + full suite.

## Task Commits

| Task | Gate | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | feat (nav param) | `c954800` | src/components/pages/CandidatosRHPage.tsx |
| 2 | RED (test) | `3726a6a` | src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx |
| 2 | GREEN (feat) | `41bb1cb` | src/features/hub-candidato/components/HubCandidatoRH.tsx |

## Verification

- Task 1 verify (`grep candidatura.id` + build): both list call sites pass `candidatura.id`, no `candidato?.id` remains; `npm run build` green.
- Task 2 verify (`hubNotFound` test + greps): `npm run test:run -- hubNotFound` → **6/6**; `Candidatura não encontrada` and `Voltar aos candidatos` present in `HubCandidatoRH.tsx`.
- `npm run test:run` (full): **781/781 pass** (96 files) — no regression.
- `npm run lint` (tsc --noEmit): **115 errors — flat, NOT increased** (FOUND-08 baseline 115 after 25-03/25-04).
- `npm run build`: green (pre-existing chunk-size advisories only).
- End-to-end contract confirmed: `/rh/candidatos/:id` (routes.tsx L310) → `PerfilCandidatoRHPage` → `HubCandidatoRH` reads `useParams().id` as candidaturaId. `requirements.mark-complete UX-03` → Complete.

## Deviations from Plan

**No-op (already satisfied by 25-02):** The plan's Task 1 note flagged that the Kanban `onViewPerfil` forward was fixed in 25-02. Verified against the committed tree (a267128): `KanbanBoard` already forwards `candidatura.id` (both the card button `onViewPerfil(candidatura.id)` and the JSDoc/prop naming), and `KanbanBoard.test.tsx` already pins `onViewPerfil` called with `candidatura.id` not `candidato.id`. That half was NOT re-done or reverted — only the genuinely-remaining list call sites (`CandidatosRHPage` L411/L776) were changed. The two UX-03 halves are file-disjoint and consistent.

Otherwise: plan executed as written. No Rule 1–4 deviations, no auth gates, zero package installs.

## Threat Model Outcome

- T-25-05-01 (correctness — wrong nav param loads the wrong/no candidatura): mitigated — `candidatura.id` at every list call site (Kanban already in 25-02); the end-to-end candidaturaId contract confirmed.
- T-25-05-02 (Information Disclosure — not-found copy leaks PII): mitigated — the not-found copy is generic ("Não encontramos essa candidatura"); no candidate name/email/id is echoed.
- T-25-SC (supply chain): n/a — zero package installs.

## Follow-ups (NOT this plan)

- Visual confirmation of the 404 + nav is the deferred HUMAN-UAT (per plan `<verification>`).
- 25-06 (dead-affordance sweep + A14/A37 mock-screen empty-state gating) remains in Wave 1.

## Self-Check: PASSED

- FOUND: src/components/pages/CandidatosRHPage.tsx
- FOUND: src/features/hub-candidato/components/HubCandidatoRH.tsx (Candidatura não encontrada + Voltar aos candidatos present)
- FOUND: src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx
- FOUND commit: c954800 (Task 1 nav)
- FOUND commit: 3726a6a (RED)
- FOUND commit: 41bb1cb (GREEN)
