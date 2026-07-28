---
phase: 10-triagem-rh-com-ia-comparativo-etapa-2
plan: 06
subsystem: ui
tags: [react, tanstack-query, supabase, jspdf, alert-dialog, triagem, comparativo, rnf-07a, lgpd]

# Dependency graph
requires:
  - phase: 10-05
    provides: "invokeComparativo (triagemService) + triagemKeys.comparativo + SugestaoIABadge + TriagemTable compare-bar (onCompare stub)"
  - phase: 10-04
    provides: "comparativo-candidatos EF live in PROD (JWT ON) + analise_candidato_vaga table"
  - phase: 06
    provides: "avancar_etapa() BEFORE UPDATE trigger — transition validator + historico audit row on etapa_atual change"
provides:
  - "useComparativo — useMutation wrapping invokeComparativo, toast on error (incl. mixed-vaga pt-BR copy)"
  - "exportComparativo — jspdf + jspdf-autotable client-side PDF (attributes-as-rows / candidates-as-columns, selectable text)"
  - "updateCandidaturaEtapa — inline Avançar/Rejeitar via candidaturas.etapa_atual UPDATE (fires avancar_etapa trigger)"
  - "ComparativoScreen — candidates-as-columns table, sticky attribute column, SugestaoIABadge, inline confirm actions, export"
  - "ComparativoCandidatosPage + /rh/vagas/:id/comparativo RH-guarded route"
affects: [11-15 DECISAO-02 reuses the candidates-as-columns table; phase 10 RH triage loop now end-to-end wired]

# Tech tracking
tech-stack:
  added:
    - "jspdf@^4.2.1 + jspdf-autotable@^5.0.8 (already installed in 10-01; first runtime use here)"
  patterns:
    - "Candidates-as-columns / attributes-as-rows table with sticky-left first column (sticky left-0 z-10) + overflow-x-auto — the DECISAO-02 reuse seed"
    - "EF-anonymized candidate_id (C1/C2…) resolved back to the real candidatura/nome by score-ordered position (the panel passes the names; the EF never sees them)"
    - "Inline human-confirmed stage actions: alert-dialog confirm → candidaturas.etapa_atual UPDATE → avancar_etapa trigger owns the audit row (no explicit historico insert)"

key-files:
  created:
    - src/features/triagem/hooks/useComparativo.ts
    - src/features/triagem/pdf/exportComparativo.ts
    - src/features/triagem/components/ComparativoScreen.tsx
    - src/features/triagem/components/__tests__/ComparativoScreen.test.tsx
    - src/components/pages/ComparativoCandidatosPage.tsx
  modified:
    - src/features/triagem/services/triagemService.ts
    - src/router/routes.tsx
    - src/components/pages/VagaCandidatosRHPage.tsx
    - vite.config.ts

key-decisions:
  - "Inline Avançar/Rejeitar = a plain candidaturas.etapa_atual UPDATE rather than a callable RPC — avancar_etapa is a BEFORE UPDATE trigger (Phase 6), not an RPC; the UPDATE fires it, the trigger validates + writes the historico row. Rejeitar also sets status='rejeitado' for the panel/dashboard badge. No long justification (deferred to Decisão Final / Etapa 6)."
  - "Avançar targets the M2-funnel next stage 'avaliacao_assincrona' via a new EtapaFunilM2 type + PROXIMA_ETAPA_APOS_TRIAGEM const — the legacy front-end EtapaProcesso (bigfive/disc…) does NOT match the DB etapa_processo enum (known schema drift), so the action types against the DB enum and casts the Update payload (as never) to avoid growing the tsc baseline."
  - "EF anonymizes candidate_id to C1/C2… in score order, so the page resolves names by parsing the numeric suffix into the score-ordered selection it carried in router state — the screen stays presentational and the names never leave the authenticated RH session through the EF."
  - "Mixed-vaga 400 pt-BR copy is produced by invokeComparativo (10-05) → useComparativo onError toast → surfaced on the page error state; the screen test asserts the exact string contract is stable."

patterns-established:
  - "candidates-as-columns comparativo table (sticky-left labels, horizontal scroll) — directly reusable by DECISAO-02 (Phase 15)"
  - "client-side jspdf-autotable export with idle/generating/success/error states + sonner toasts"
  - "score-band reuse: same 70/40 thresholds + glass color classes as TriagemTable, applied to composite_score"

# Metrics
metrics:
  duration: ~22 min
  completed: 2026-06-09
  tasks: 2
  files: 9
  commits: 3
---

# Phase 10 Plan 06: Comparativo Screen + PDF Export Summary

The on-demand RH comparativo: candidates-as-columns table (≤10), AI-framed and human-confirmed, wired end-to-end from the panel's Comparar(N) CTA through the `comparativo-candidatos` EF to inline Avançar/Rejeitar and a selectable-text PDF — closing the full Etapa-2 triage loop.

## What Was Built

**Task 1 — service flow + hook + PDF util** (`28d9fca`)
- `updateCandidaturaEtapa(candidaturaId, novaEtapa)` added to `triagemService.ts`: UPDATEs `candidaturas.etapa_atual` (firing the Phase-6 `avancar_etapa` trigger which validates the transition and writes the `historico_candidatura` audit row). Rejeitar also flips `status='rejeitado'`. New `EtapaFunilM2` type + `PROXIMA_ETAPA_APOS_TRIAGEM='avaliacao_assincrona'` const aligned to the DB `etapa_processo` enum.
- `useComparativo.ts`: `useMutation` wrapping the existing `invokeComparativo`, `toast.error` on failure (surfacing the mixed-vaga pt-BR copy).
- `exportComparativo.ts`: landscape `jsPDF` + `autoTable` building head=`['Atributo', ...names]` and attribute rows (Ranking IA / Score IA / Pontos fortes / Gaps / Justificativa IA, arrays joined with `; `), `doc.save('comparativo-candidatos.pdf')`. Exports `RankedCandidate` + `ComparativeRankingView` types shared with the screen.

**Task 2 — screen + page + route + test** (`e42b4c4`)
- `ComparativoScreen.tsx`: candidates-as-columns table (attribute labels sticky-left `sticky left-0 z-10`, `overflow-x-auto`, 200px min candidate column). Rows: header (name + avatar initial + ranking medal), Ranking IA, Score IA band (70/40 thresholds reused from TriagemTable), Pontos fortes, Gaps, Justificativa IA, Flags (neutral badges), Ação. `SugestaoIABadge` (full) rendered once at the top (RNF-07a). Inline Avançar (accent) + Rejeitar (destructive) each gated by an `alert-dialog` confirm. "Exportar PDF" with idle/generating/success/error states + sonner toasts.
- `ComparativoCandidatosPage.tsx`: RHLayout wrapper reading `{ ids, candidatos }` from router state + vagaId param, running `useComparativo` on mount, resolving the EF's anonymized C1/C2… back to real candidatura/nome by score-ordered position, rendering loading / error (mixed-vaga pt-BR copy) / screen states, and routing inline actions through `updateCandidaturaEtapa` + TanStack invalidation.
- `routes.tsx`: `/rh/vagas/:id/comparativo` with `role={['rh','administrador']}` guard + import.
- `VagaCandidatosRHPage.tsx`: `onCompare` wired to `navigate(...)` carrying ids + names ordered score-DESC.
- `ComparativoScreen.test.tsx`: 6 RTL tests — ≤10 columns render with ranking medals, SugestaoIABadge present, Avançar/Rejeitar open confirm dialogs and fire callbacks (Rejeitar asserts no long-justification textbox), Exportar PDF calls the mocked `exportComparativo`, and the mixed-vaga copy contract is stable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] M2/M1 etapa enum schema drift on the inline action UPDATE**
- **Found during:** Task 1
- **Issue:** The front-end `EtapaProcesso` type (`bigfive`/`disc`/…) does not match the DB `etapa_processo` enum (`avaliacao_assincrona`/`decisao_final`/…). Typing `updateCandidaturaEtapa` against `EtapaProcesso` produced a new tsc error (would push baseline 292→294).
- **Fix:** Introduced a DB-aligned `EtapaFunilM2` type + `PROXIMA_ETAPA_APOS_TRIAGEM` const; the Avançar targets the real M2 next stage `'avaliacao_assincrona'`; the Update payload is cast `as never` (the established supabase-typing escape for the M1/M2 drift). Net tsc baseline ended at **292** (no growth; the only triagemService tsc error, line 132, is the pre-existing `listTriagemPanel` filter on the same drift).
- **Files modified:** src/features/triagem/services/triagemService.ts
- **Commit:** 28d9fca

**2. [Rule 3 - Blocking] Phase-10 Deno EF test suites failed Vitest collection**
- **Found during:** Task 2 full-suite run
- **Issue:** `supabase/functions/{analise-candidato-individual,comparativo-candidatos}/__tests__/index.test.ts` (Deno RED scaffolds from 10-01) import via `https://` specifiers the Node/Vitest ESM loader cannot resolve → 2 failed suites in `npm run test:run`. These were left out of the existing vitest exclude list (which already excludes 5 other Deno EF tests by exact path). Out of this plan's file scope but blocking a green suite (success criterion).
- **Fix:** Extended the `vite.config.ts` test.exclude with `supabase/functions/{analise-candidato-individual,comparativo-candidatos}/**/*.test.ts`, matching the documented pattern (these run under `deno test`, not Vitest).
- **Files modified:** vite.config.ts
- **Commit:** e42b4c4

## Verification

- `npm run test:run -- triagemService` — 5/5 pass; mixed-vaga copy + ef name + autotable + useMutation greps all OK
- `npm run test:run -- ComparativoScreen` — 6/6 pass
- `npm run test:run` (full frontend) — **42 files / 448 tests pass, 0 fail** (2 Deno EF suites now correctly excluded)
- `npm run lint` (tsc) — **292** errors (baseline; no growth; ≤293 invariant held)
- `npm run build` — exit 0 (~6.4s)
- Route grep: `ComparativoCandidatosPage` + `/rh/vagas/:id/comparativo` with `role={['rh','administrador']}` present in routes.tsx

## Known Stubs

None. The screen consumes live EF data via `useComparativo`; inline actions hit a real `candidaturas` UPDATE; the PDF is real client-side jspdf output. The EF `flags` are not yet returned per-candidate in `ranked_candidates` so the Flags row renders empty when absent (graceful `?? []`) — informative-only, non-gating, consistent with the EF contract.

## Threat Flags

None. No new network endpoint, auth path, or schema change — the comparativo EF (JWT ON, same-vaga check) and the `avancar_etapa` trigger already existed; this plan only adds client-side surface. T-10-19 (mixed-vaga → pt-BR copy, no partial render), T-10-20 (alert-dialog-confirmed inline actions, no score-gated auto-action), T-10-21/T-10-SC (client-side jspdf, no new package surface) all honored as planned.

## Self-Check: PASSED

All 5 created files + the SUMMARY exist on disk; both per-task commits (`28d9fca`, `e42b4c4`) are present in git log.
