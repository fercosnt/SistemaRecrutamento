---
phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos
plan: 02
subsystem: ui
tags: [react, tanstack-query, kanban, react-dnd, enum-cutover, audit-trail, rtl]

requires:
  - phase: 25-01
    provides: "registrar_decisao amend (status+etapa+justificativa in one sanctioned UPDATE) + guard_rejeicao_auditada trigger (the DB backstop this plan's UI half complements)"
  - phase: M2/Phase-15
    provides: "registrar_decisao RPC + useRegistrarDecisao hook + decisaoSchema (JUSTIFICATIVA_MIN=50) — reused, not re-created"
  - phase: M2/Phase-9
    provides: "triagemService.ETAPA_M2_LABELS / EtapaFunilM2 / updateCandidaturaEtapa — the live M2 write-path the Kanban was rewired ONTO"
provides:
  - "RH Kanban operating on the real 6-stage etapa_processo funnel via the audited M2 write-path (avancar_etapa), not the dead M1 auto-advance"
  - "EtapaProcesso re-aliased to the DB enum; getProximaEtapa auto-advance + dead M1 value maps deleted (no 22P02 vector)"
  - "UpdateStatusModal reject routed through registrar_decisao with a >=50-char justificativa (no status-only reject escapes the audit trail)"
  - "useUpdateCandidaturaEtapa mutation (M2 audited etapa move)"
affects: [25-05, 25-08, phase-26]

tech-stack:
  added: []
  patterns:
    - "Kanban columns derive from a single source (triagemService.ETAPA_M2_LABELS) — no hardcoded 2nd label copy"
    - "Terminal states (aprovado/rejeitado) render as card pills, not drop columns (UI-SPEC §1)"
    - "Radix Select/Dialog mocked to native equivalents in RTL where no pointer/scrollIntoView polyfills exist"

key-files:
  created:
    - src/components/__tests__/KanbanBoard.test.tsx
    - src/components/modals/__tests__/UpdateStatusModal.test.tsx
  modified:
    - src/features/vagas/types/vagasTypes.ts
    - src/features/vagas/services/candidaturasService.ts
    - src/features/vagas/hooks/useCandidaturas.ts
    - src/components/KanbanBoard.tsx
    - src/components/modals/UpdateStatusModal.tsx

key-decisions:
  - "EtapaProcesso KEEPS its name, re-aliased to Database['public']['Enums']['etapa_processo'] (Pitfall 6) so the 5 interface fields self-correct without churn"
  - "Kanban drag routes through the new useUpdateCandidaturaEtapa (triagemService.updateCandidaturaEtapa -> avancar_etapa), replacing the raw useUpdateCandidaturaStatus auto-advance"
  - "Reject reuses the Phase-15 registrar_decisao path (justificativa >=50) — the DB guard (25-01) is the authoritative teeth; the UI removes the status-only vector + drops the 'Rejeitado' drop column"
  - "Kanban onViewPerfil forwards candidatura.id (not candidato.id) so the hub route resolves the candidaturaId it expects (UX-03)"

patterns-established:
  - "Single-source funnel labels: KANBAN_COLUMNS = WORKING_STAGES.map -> ETAPA_M2_LABELS[etapa]"
  - "columnForEtapa anchors terminals to decisao_final + returns null for unknown/legacy etapas (no console.warn, still reachable via the panel etapa filter)"

requirements-completed: [FUNIL-03, FUNIL-06, FUNIL-02, UX-03]

duration: ~55min (across interrupted session + resume closeout)
completed: 2026-07-11
---

# Phase 25 / Plan 02: RH funnel enum cutover + Kanban rewire + audited reject Summary

**The RH Kanban now operates over the real 6-stage `etapa_processo` funnel via the server-authoritative M2 write-path, the dead M1 auto-advance (the 22P02 crash vector) is gone, and no reject escapes the audit trail — the frontend finally caught up to the M2 enum cutover.**

## Performance

- **Duration:** ~55 min (Task 1 landed in a prior session; Tasks 2–3 completed on resume)
- **Completed:** 2026-07-11
- **Tasks:** 3
- **Files modified:** 5 source + 2 new tests

## Accomplishments
- **Enum cutover (FUNIL-06):** `EtapaProcesso` re-aliased to the DB enum; `getProximaEtapa` auto-advance + `ETAPAS_SEQUENCIA`/`ETAPA_PROCESSO_LABELS`/`ETAPA_PROGRESS`/`ETAPA_TO_KANBAN` deleted; no dead M1 literal (`bigfive`/`disc`/`raven`/`cultura`/`avaliacao_final`) survives in the touched files.
- **Kanban rewire (FUNIL-03, UX-03):** 6 real working-stage columns sourced from `triagemService.ETAPA_M2_LABELS` (single source, grid `repeat(6)`); drag→drop routes through `useUpdateCandidaturaEtapa` → `updateCandidaturaEtapa` → trigger `avancar_etapa` (validates + audits); terminals render as card pills (no `Rejeitado` drop column); `console.warn→triagem` fallback removed; `onViewPerfil` forwards `candidatura.id`.
- **Audited reject (FUNIL-02):** `UpdateStatusModal` reject writes via `registrar_decisao` (`useRegistrarDecisao`) with a ≥50-char justificativa (live char counter, disabled-until-valid, audit copy); non-reject transitions unchanged.

## Task Commits

1. **Task 1: Re-alias EtapaProcesso + delete dead value maps + delete auto-advance** — `f6dcb78` (refactor)
2. **Task 2: Kanban rewire — 6 real columns + M2 drag + terminal pills + nav fix** — `a267128` (feat, test+impl)
3. **Task 3: Reroute UpdateStatusModal reject through registrar_decisao** — `011f187` (feat, RED test → GREEN impl)

## Files Created/Modified
- `src/features/vagas/types/vagasTypes.ts` — EtapaProcesso re-aliased to the DB enum; dead M1 maps deleted
- `src/features/vagas/services/candidaturasService.ts` — getProximaEtapa auto-advance block + import deleted (SEC-11 no-log discipline preserved)
- `src/features/vagas/hooks/useCandidaturas.ts` — new `useUpdateCandidaturaEtapa` mutation (M2 audited move + candidaturas/vagas invalidation)
- `src/components/KanbanBoard.tsx` — 6 real stages, audited drag, terminal pills, candidatura.id nav, grid repeat(6)
- `src/components/modals/UpdateStatusModal.tsx` — reject → registrar_decisao (≥50-char justificativa gate + audit copy)
- `src/components/__tests__/KanbanBoard.test.tsx` — RTL regression net (6/6)
- `src/components/modals/__tests__/UpdateStatusModal.test.tsx` — reject-reroute regression net (3/3)

## Verification
- `npm run test:run`: **761/761** green (93 files) — includes the 2 new suites (9 tests).
- `npm run build`: green (18.7s; pre-existing chunk-size advisories only).
- `npx tsc --noEmit`: **124** errors (below the 128 baseline — the Task-1 candidaturasService −5 and Task-2 KanbanBoard cleanup landed; re-pinned in 25-08).
- Runtime reject-reroute + Kanban drag are confirmed live by **25-07 SMOKE A/B** and the deferred HUMAN-UAT (Kanban drag visual).

## Note on resume
Task 1 was committed in a prior (interrupted) session; Task 2's implementation was left uncommitted in the working tree and Task 3 was not started. This plan was closed out via the `safe_resume_gate` "close out manually" path: Task 2 was verified (tests green, tsc 124) and committed, Task 3 was implemented TDD (RED→GREEN) and committed, then this SUMMARY was written.
