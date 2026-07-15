---
phase: 31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil
plan: 03
subsystem: ui
tags: [typescript, react, radix, alert-dialog, select, funnel, shared-component]

# Dependency graph
requires:
  - phase: 31 (plan 02)
    provides: useRejeitarCandidatura hook + MotivoRejeicaoRh union + extended useUpdateCandidaturaEtapa (forwards justificativa) — the typed client path both dialogs consume
  - phase: 15 (decisao final)
    provides: RegistrarDecisaoForm — the ≥50 counter + AlertDialog confirm-gate analog copied here (with the ONE btrim deviation)
provides:
  - "RejeitarCandidaturaDialog — the SINGLE shared reject surface (motivo Select + justificativa Textarea + live btrim counter) reused by all 3 RH surfaces; confirm gated on motivo !== null && justificativa.trim().length >= 50"
  - "RetrocederCandidaturaDialog — audited regress dialog (destino Select limited to strictly-earlier non-terminal stages + required non-empty justificativa) wired to the extended useUpdateCandidaturaEtapa"
  - "RejeitarCandidaturaDialog.test.tsx — 6-behavior gate/counter/btrim component test (VALIDATION Wave-0 gap closed)"
affects: [31-04 (Kanban card menu + Hub action row mount both dialogs), 31-05 (Comparativo rewires reject to RejeitarCandidaturaDialog)]

# Tech tracking
tech-stack:
  added: []  # zero new npm packages — alert-dialog, select, textarea all vendored in src/components/ui/
  patterns:
    - "Host-supplied `trigger: React.ReactNode` prop (asChild) so each surface's button matches its dark-glass chrome while the dialog body renders on the LIGHT AlertDialogContent (bg-background)"
    - "Async confirm on Radix AlertDialogAction via onClick e.preventDefault() + controlled `open` state → dialog stays open during isPending, closes in the per-call mutate onSuccess"
    - "Client counter/gate counts .trim().length (mirror the server btrim) — the ONE deviation from the RegistrarDecisaoForm analog's raw .length"
    - "Radix Select mocked to a native <select> in the component test (repo idiom, NovoUsuarioDialog.test.tsx); the real Radix AlertDialog renders unmocked (ComparativoScreen.test.tsx precedent)"

key-files:
  created:
    - src/features/triagem/components/RejeitarCandidaturaDialog.tsx
    - src/features/triagem/components/__tests__/RejeitarCandidaturaDialog.test.tsx
    - src/features/triagem/components/RetrocederCandidaturaDialog.tsx
  modified: []

key-decisions:
  - "The confirm is a Radix AlertDialogAction with onClick e.preventDefault() + a controlled `open` state (not the auto-closing default). This keeps the dialog OPEN during the pending mutation so the 'Rejeitando…'/'Retrocedendo…' spinner + disabled cancel are visible (UI-SPEC §Interaction 'Submitting'), and it closes only in the per-call mutate onSuccess (which also resets the fields + calls the host onRejected/onDone)."
  - "Counter + enable-gate count justificativa.trim().length (not raw length) — the client mirror of the server btrim so leading/trailing whitespace can't fake a ≥50 pass (T-31-02). The server RPC RAISE stays the sole authority; the counter is UX only."
  - "RetrocederCandidaturaDialog derives destinos from a local FUNNEL_ORDER of the 6 NON-terminal stages (terminals aprovado/rejeitado excluded) via slice(0, currentIndex) — strictly-earlier stages only; a terminal/unknown etapaAtual yields an empty list (host hides the affordance for terminals anyway)."
  - "Regress confirm uses default (neutral/primary) buttonVariants — NOT bg-destructive, NOT the turquoise accent — because retroceder is a lateral move, not a rejection (UI-SPEC §Color). Reserving red for reject keeps the audit-consequence signal honest."
  - "Discretionary a11y copy: the regress AlertDialogDescription ('Selecione a etapa de destino e explique o motivo. O retorno fica registrado na trilha de auditoria.') is added for the Radix a11y requirement — the UI-SPEC §Copywriting Contract lists no regress description string. It carries no forbidden language (no 'teste psicológico', no score/número)."

patterns-established:
  - "Single-source-of-truth shared dialog: one RejeitarCandidaturaDialog reused across Kanban/Hub/Comparativo — 31-04/05 mount it with a host trigger, never fork the copy or the gate"
  - "Light-modal-over-dark-glass split: trigger buttons live on the host's dark glass; the AlertDialog body uses default shadcn light tokens"

requirements-completed: [OPER-02, OPER-03]

# Metrics
duration: ~8min
completed: 2026-07-14
---

# Phase 31 Plan 03: Shared Reject + Regress Dialogs Summary

**The two shared RH dialogs — `RejeitarCandidaturaDialog` (motivo Select + justificativa Textarea + btrim-aware ≥50 counter, light modal, destructive confirm) and `RetrocederCandidaturaDialog` (strictly-earlier-stage destino + required non-empty justificativa, neutral) — the single client mirror of the server gates that 31-04/05 mount on three surfaces without forking the gate.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-14T21:11Z (approx)
- **Completed:** 2026-07-14T21:14Z
- **Tasks:** 2 (Task 1 TDD, Task 2 auto)
- **Files created:** 3 · **Files modified:** 0

## Accomplishments
- Built `RejeitarCandidaturaDialog` (OPER-02): a light-modal `AlertDialogContent` (`bg-background`) holding a motivo `<Select>` (the 6 `motivo_rejeicao_rh` enum values → pt-BR labels), a justificativa `<Textarea>`, and a live counter `{trimmed} / 50 mín.`. Confirm is gated on `motivo !== null && justificativa.trim().length >= 50 && !isPending` and wired to `useRejeitarCandidatura`. The **btrim-aware count** (`.trim().length`, not raw `.length`) is the client mirror of the server gate so 60 spaces can't fake a pass. Destructive confirm `bg-destructive text-destructive-foreground hover:bg-destructive/90`; host supplies the `trigger`.
- Wrote the component test FIRST (TDD RED → GREEN): 6 behaviors — idle disabled + `0 / 50 mín.`; motivo+40 → too-short helper + disabled; motivo+60 → helper hidden + enabled; 60 spaces → trimmed counter `0 / 50 mín.` + disabled; confirm click → `mutate` with `{ candidaturaId, motivo, justificativa }`; pending → confirm shows "Rejeitando…" + confirm & cancel disabled.
- Built `RetrocederCandidaturaDialog` (OPER-03): a destino `<Select>` limited to **strictly-earlier non-terminal stages** (derived from a local `FUNNEL_ORDER` of the 6 non-terminal etapas by ordinal), plus a justificativa `<Textarea>` required **non-empty** (not the ≥50 floor). Confirm wired to the extended `useUpdateCandidaturaEtapa` (forwards `justificativa` so the trigger records the fresh text). Neutral styling (default buttonVariants — no destructive, no accent).
- Copy is verbatim from 31-UI-SPEC §Copywriting Contract (reject title/description/labels/counter/helper/confirm/cancel; regress title/labels/placeholder/confirm). No "teste psicológico"; no score/número in the reject copy (RNF-07a / RNF-12a).

## Task Commits

Each task committed atomically (pre-commit hook bypassed via `core.hooksPath=/dev/null` per this repo's documented workflow; Task 1 followed TDD test→feat):

1. **Task 1 (test): failing RejeitarCandidaturaDialog gate/counter/btrim test** — `1629ad5` (test)
2. **Task 1 (feat): RejeitarCandidaturaDialog shared reject surface** — `360f5d3` (feat)
3. **Task 2 (feat): RetrocederCandidaturaDialog audited regress** — `eb8baa5` (feat)

**Plan metadata:** (this SUMMARY + STATE + ROADMAP) — see final docs commit.

## Files Created/Modified
- `src/features/triagem/components/RejeitarCandidaturaDialog.tsx` — NEW shared reject dialog (motivo Select + ≥50 btrim counter + light modal + destructive confirm), wired to `useRejeitarCandidatura`.
- `src/features/triagem/components/__tests__/RejeitarCandidaturaDialog.test.tsx` — NEW 6-behavior component test (gate + counter + btrim; Radix Select mocked to native, real AlertDialog).
- `src/features/triagem/components/RetrocederCandidaturaDialog.tsx` — NEW audited regress dialog (earlier-stage destino + required non-empty justificativa + neutral), wired to the extended `useUpdateCandidaturaEtapa`.

## Decisions Made
- **Async confirm keeps the dialog open on pending.** Radix's `AlertDialogAction` auto-closes on click; instead the confirm calls `e.preventDefault()` + `handleConfirm()` on a controlled `open` state, so the pending spinner + disabled cancel are visible and the dialog closes only in the per-call `mutate` `onSuccess` (which also resets fields + fires the host callback).
- **Trimmed counter (T-31-02).** Both the counter and the enable-gate count `.trim().length` — the client mirror of the server `btrim` — so whitespace can't fake a ≥50 pass. The counter is UX; the RPC RAISE is the authority.
- **Destino filter by funnel ordinal.** `RetrocederCandidaturaDialog` slices a local `FUNNEL_ORDER` (6 non-terminal stages) to `slice(0, currentIndex)` → strictly-earlier stages only; forward stages and both terminals never appear.
- **Neutral regress confirm.** Default buttonVariants (not destructive, not accent) — retroceder is a lateral move; red stays reserved for reject.

## Deviations from Plan

None — plan executed as written. Task 1 followed TDD (RED `test(...)` commit → GREEN `feat(...)` commit); Task 2 is a single `feat(...)` commit. Both `<verify>` gates ran green. The only discretionary addition is the regress `AlertDialogDescription` a11y copy (documented in key-decisions) — the UI-SPEC lists no regress description string but Radix requires one; the added text carries no forbidden language.

## Issues Encountered
None. RED was confirmed before implementing Task 1 (import-resolution failure — the component did not yet exist); all 6 cases flipped GREEN after the minimal implementation. No auto-fixes (Rules 1-3) were needed.

## Verification
- `npx vitest run src/features/triagem/components/__tests__/RejeitarCandidaturaDialog.test.tsx` — **6/6 GREEN** (Task 1 gate).
- `npx vitest run src/features/triagem` — **51/51 GREEN** (9 files; Task 2 gate — no regression).
- `npm run lint` (tsc `--noEmit`) — **104 errors, held at the M5/Wave-1 baseline**; **ZERO** errors from the two new component files (`RejeitarCandidaturaDialog` / `RetrocederCandidaturaDialog` grep = NONE).

## TDD Gate Compliance
Task 1 is `tdd="true"`: a `test(...)` commit (`1629ad5`, RED) precedes the `feat(...)` commit (`360f5d3`, GREEN). RED was verified by running the suite before implementing (import failed — component absent). No unexpected pass during RED. No REFACTOR commit was needed. Task 2 is `type="auto"` (no test required beyond the suite staying green).

## Known Stubs
None. Both dialogs are fully wired to their 31-02 hooks. Note: a live reject only succeeds at RUNTIME after the [BLOCKING] 31-06 applies the `rejeitar_candidatura` RPC to PROD + regens `database.types.ts` (the service still carries the `as never` cast until then) — this is the expected authored-ahead state for the phase, tracked by 31-06, not a stub in these components.

## User Setup Required
None — pure client-tier UI. No external service configuration.

## Next Phase Readiness
- Both dialogs are ready for 31-04 (Kanban card `DropdownMenu` + `HubCandidatoRH` "Próximo passo" action row mount them with host triggers) and 31-05 (Comparativo rewires its no-justificativa reject to `RejeitarCandidaturaDialog`).
- They are the single source of truth for their copy + gate — 31-04/05 must mount them, never fork.
- The live avancar_etapa() trigger remains unedited (invariant preserved). No blockers introduced.

## Self-Check: PASSED

- FOUND: src/features/triagem/components/RejeitarCandidaturaDialog.tsx
- FOUND: src/features/triagem/components/__tests__/RejeitarCandidaturaDialog.test.tsx
- FOUND: src/features/triagem/components/RetrocederCandidaturaDialog.tsx
- FOUND commit: 1629ad5 (Task 1 test / RED)
- FOUND commit: 360f5d3 (Task 1 feat / GREEN)
- FOUND commit: eb8baa5 (Task 2 feat)

---
*Phase: 31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil*
*Completed: 2026-07-14*
