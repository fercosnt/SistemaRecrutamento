---
phase: 31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil
plan: 04
subsystem: ui
tags: [typescript, react, radix, dropdown-menu, kanban, hub, funnel, shared-component]

# Dependency graph
requires:
  - phase: 31 (plan 03)
    provides: RejeitarCandidaturaDialog + RetrocederCandidaturaDialog — the two shared trigger-based dialogs mounted here (host trigger, never forked)
  - phase: 31 (plan 02)
    provides: useUpdateCandidaturaEtapa (forwards justificativa) — the audited advance/regress write-path both surfaces reuse
provides:
  - "KanbanBoard card ⋯ DropdownMenu (MoreVertical, aria-label='Ações do candidato') on every non-terminal card: Avançar (1-click, same audited moveEtapa as drag-drop) · Retroceder (shared dialog) · Rejeitar (shared dialog) — the ONLY reject/regress affordance on the card; terminals show no menu"
  - "HubCandidatoRH 'Próximo passo' action row: Avançar/Retroceder/Rejeitar beside the dominant 'Abrir {etapa}' CTA (CTA not displaced), hidden on terminal etapas"
  - "Both surfaces deliver avançar/rejeitar/retroceder at ANY of the 6 working stages (OPER-01/02/03), not just the drag-drop advance that existed before"
affects: [31-05 (Comparativo rewires its reject to the same shared RejeitarCandidaturaDialog), 31-06 (BLOCKING apply of rejeitar_candidatura RPC + regen types makes reject/regress live at runtime)]

# Tech tracking
tech-stack:
  added: []  # zero new npm packages — dropdown-menu, the two dialogs, and lucide icons all already present
  patterns:
    - "Shared trigger-based dialog inside a Radix DropdownMenu: the dialog owns its open state, so the menu item is passed as its `trigger` with `onSelect={(e) => e.preventDefault()}` — the menu stays mounted so the AlertDialog (a child of DropdownMenuContent) can portal open instead of unmounting with a closing menu"
    - "Radix DropdownMenuContent lazily mounts its children (no forceMount) → the nested dialogs' hooks (useRejeitarCandidatura/useUpdateCandidaturaEtapa) only run when a menu is opened; the existing KanbanBoard test never opens a menu, so it needs no QueryClientProvider"
    - "Advance reuses the SAME audited write-path as drag-drop (moveEtapa → trigger avancar_etapa) via an onAvancar prop threaded KanbanBoard → KanbanColumn → card — no second write-path, no direct historico INSERT"

key-files:
  created: []
  modified:
    - src/components/KanbanBoard.tsx
    - src/features/hub-candidato/components/HubCandidatoRH.tsx
    - src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx  # Rule 3 test-infra: stub the two hooks the hub now consumes

key-decisions:
  - "Avançar is 1-CLICK (no confirm modal) on both surfaces — honoring the executor directive 'Advance is one-click (no modal)' and staying consistent with the existing drag-drop advance, which also advances with no confirmation. Reject/Retroceder open the shared form-modals; only those two carry the audited justificativa gate. The plan <action>/UI-SPEC mention a 'lightweight confirm' for advance; the 1-click reading was chosen because the board already advances via a single drag with no confirm, so a menu-only confirm would be internally inconsistent, and the acceptance criteria are neutral on advance confirmation."
  - "The shared dialogs are mounted via their `trigger` prop (they own their own open state and expose no open/onOpenChange), NOT forked — the menu item / action button is the trigger. Inside the Kanban menu, each dialog trigger is a DropdownMenuItem with onSelect preventDefault so the menu (and thus the AlertDialog child) stays mounted when the dialog opens."
  - "Terminal cards (aprovado/rejeitado, getTerminalBadge non-null) render NO ⋯ menu at all — all three items would be hidden (no forward stage, and reject/regress are hidden on terminals per T-31-04). On the Hub the 'Próximo passo' block already renders only for non-terminal etapas, so the action group is naturally hidden on terminals."
  - "Avançar is hidden when there is no next WORKING_STAGE (decisao_final) on both surfaces — computed from the 6-stage working order (WORKING_STAGES[idx+1])."
  - "The RH detail action row landed in HubCandidatoRH.tsx (the real surface), NOT the 5-line PerfilCandidatoRHPage.tsx wrapper — the wrapper is untouched."

patterns-established:
  - "Mount-don't-fork: 31-04/31-05 mount the single RejeitarCandidaturaDialog/RetrocederCandidaturaDialog via a host trigger across Kanban/Hub/Comparativo — one copy of the copy + gate"
  - "onSelect-preventDefault is the idiom for opening a trigger-based dialog from inside a Radix DropdownMenuItem in this codebase"

requirements-completed: [OPER-01, OPER-02, OPER-03]

# Metrics
duration: ~10min
completed: 2026-07-14
---

# Phase 31 Plan 04: RH Detail Surfaces — Kanban Card Menu + Hub Action Row Summary

**Wired the two shared dialogs (31-03) plus a 1-click Avançar into the two RH detail surfaces — the `KanbanBoard` card ⋯ `DropdownMenu` and the `HubCandidatoRH` "Próximo passo" action row — delivering avançar/rejeitar/retroceder at ANY of the 6 working stages (OPER-01/02/03) through the single audited write-path, never a bare status write.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-07-14
- **Tasks:** 2 (both `type="auto"`)
- **Files created:** 0 · **Files modified:** 3 (2 surfaces + 1 test-infra mock)

## Accomplishments
- **Task 1 — Kanban card menu (OPER-01/02/03):** added a `DropdownMenu` (`MoreVertical`, `aria-label="Ações do candidato"`, `min-h-[32px]` icon button) beside "Ver Perfil" on every **non-terminal** card. Items: **Avançar** (accent, 1-click — reuses the existing `moveEtapa`/`useUpdateCandidaturaEtapa` through a new `onAvancar` prop, hidden at `decisao_final`), **Retroceder** (`ArrowLeft`, neutral — mounts the shared `RetrocederCandidaturaDialog` with the card's `candidatura.id` + nome + `etapaAtual`), **Rejeitar** (`X`, `variant="destructive"` red — mounts the shared `RejeitarCandidaturaDialog`). Retroceder/Rejeitar triggers use `onSelect={(e) => e.preventDefault()}` so the menu stays mounted and the dialogs portal open. **Terminal cards render no menu**; **drag-drop advance is unchanged** (the menu is the keyboard/explicit path + the only reject/regress affordance).
- **Task 2 — Hub action row (OPER-01/02/03):** inside the "Próximo passo" block, added Avançar / Retroceder / Rejeitar **beside** the dominant "Abrir {etapa}" CTA (inside the same `flex flex-wrap items-center justify-between gap-4` row — the CTA is not displaced). Avançar (accent outline) is 1-click via `useUpdateCandidaturaEtapa`; Retroceder (neutral dark-glass trigger) + Rejeitar (`border-red-500/40 bg-red-500/10 text-red-300` trigger) mount the shared dialogs. The action group is gated on non-null `etapaAtual`; the block already renders only for non-terminal etapas, so it is naturally hidden on `aprovado`/`rejeitado`. **`PerfilCandidatoRHPage.tsx` (the wrapper) is NOT edited.**
- Styling follows 31-UI-SPEC §Color: accent `#35BFAD` for Avançar, destructive `#EF4444`/red-300 for Rejeitar, neutral white-alpha for Retroceder — each affordance pairs an icon + text label + color (never color alone).

## Task Commits

Each task committed atomically (pre-commit hook bypassed via `core.hooksPath=/dev/null` per this repo's documented workflow):

1. **Task 1 (feat): Kanban card ⋯ menu — avançar/retroceder/rejeitar** — `2644ecc`
2. **Task 2 (feat): HubCandidatoRH "Próximo passo" action row** — `605c3c8`

**Plan metadata:** (this SUMMARY + STATE + ROADMAP) — see final docs commit.

## Files Created/Modified
- `src/components/KanbanBoard.tsx` — card `DropdownMenu` (MoreVertical) with Avançar/Retroceder/Rejeitar; `onAvancar` prop threaded KanbanBoard → KanbanColumn → card, reusing `moveEtapa`; drag-drop path untouched.
- `src/features/hub-candidato/components/HubCandidatoRH.tsx` — "Próximo passo" action row beside the CTA; `useUpdateCandidaturaEtapa` for 1-click advance + the two shared dialogs; `WORKING_STAGES` (TIMELINE.slice(0,6)) for the next-stage derivation.
- `src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx` — **Rule 3 test-infra:** stubbed `useUpdateCandidaturaEtapa` + `useRejeitarCandidatura` (the hub now consumes them and the suite renders the hub without a `QueryClientProvider`).

## Decisions Made
- **1-click Avançar (no confirm modal).** Honors the executor's "Advance is one-click (no modal)" directive and is consistent with the existing drag-drop advance (which advances with no confirmation). Only Reject/Retroceder open the shared form-modals with the audited justificativa gate. (Plan/UI-SPEC mention a "lightweight confirm" for advance; see Deviations.)
- **Mount-don't-fork via `trigger` + `onSelect` preventDefault.** The shared dialogs own their open state, so the menu items ARE the triggers; preventDefault keeps the Radix menu (and its AlertDialog child) mounted so the dialog can open. The tradeoff — the dropdown stays open behind the modal until dismissed — is the accepted cost of trigger-only dialogs.
- **Advance reuses the audited write-path.** `onAvancar` calls the same `moveEtapa`/`useUpdateCandidaturaEtapa` the drop handler uses (→ trigger `avancar_etapa`), so there is exactly one write-path and no direct `historico_candidatura` INSERT (T-31-05).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stubbed two hooks in hubNotFound.test.tsx**
- **Found during:** Task 2
- **Issue:** `HubCandidatoRH` now calls `useUpdateCandidaturaEtapa()` at the top and mounts the two dialogs (which call `useUpdateCandidaturaEtapa`/`useRejeitarCandidatura` → `useQueryClient`). The existing `hubNotFound.test.tsx` renders the hub with no `QueryClientProvider`, so those hooks would throw and break all 6 cases.
- **Fix:** Added `vi.mock` stubs for `@/features/vagas/hooks/useCandidaturas` (`useUpdateCandidaturaEtapa`) and `@/features/triagem/hooks/useRejeitarCandidatura` — mirroring how the suite already mocks every hook the hub consumes.
- **Files modified:** `src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx`
- **Commit:** `605c3c8`

### Interpretation call (documented, not an auto-fix)

**Avançar rendered as 1-click, not a confirm modal.** The plan `<action>` for both tasks and 31-UI-SPEC §Component Inventory describe advance "behind a lightweight confirm." The executor's `<critical_constraints>` directive states "Advance is one-click (no modal)." Resolved in favor of 1-click because (a) it is the explicit execution directive, (b) it is internally consistent with the pre-existing drag-drop advance (which has no confirm), and (c) the plan's acceptance criteria for Task 1/2 do not require an advance confirm dialog. The UI-SPEC advance-dialog copy remains used by `ComparativoScreen`'s existing advance block (untouched, per 31-05 scope).

## Issues Encountered
None beyond the Rule 3 test-infra fix above. The pre-existing `KanbanBoard.tsx` `STAGE_STYLE` tsc error (verified on HEAD before this plan: line 62 → line 70 after the +8 import lines) is part of the 104 baseline and was not introduced here.

## Verification
- `npx vitest run src/features/triagem src/components/__tests__/KanbanBoard.test.tsx` — **58/58 GREEN** (Task 1 gate; existing KanbanBoard regression net unaffected — its cases never open the ⋯ menu, so the lazily-mounted dialogs never run their hooks).
- `npx vitest run src/features/hub-candidato src/features/triagem` — **60/60 GREEN** (Task 2 gate).
- **Full suite:** `npx vitest run` — **896/896 GREEN** (113 files) — no broad regression.
- `npm run lint` (tsc `--noEmit`) — **104 errors, held at the M5 baseline**; **ZERO** new errors from either modified surface (`HubCandidatoRH.tsx` grep = none; the single `KanbanBoard.tsx` error is the pre-existing `STAGE_STYLE` baseline error).

## Known Stubs
None. Both surfaces are fully wired to the shared dialogs + the audited hooks. Note: a live reject/regress only fully succeeds at RUNTIME after the [BLOCKING] 31-06 applies the `rejeitar_candidatura` RPC to PROD and regens `database.types.ts` (the service carries the `as never` cast until then) — this is the expected authored-ahead phase state tracked by 31-06, not a stub in these files.

## User Setup Required
None — pure client-tier UI. No external service configuration.

## Next Phase Readiness
- 31-05 rewires `ComparativoScreen`'s no-justificativa reject to the SAME shared `RejeitarCandidaturaDialog` — the mount-don't-fork pattern established here (host trigger) applies directly.
- 31-06 (BLOCKING) applies the `rejeitar_candidatura` RPC + regens types → reject/regress become live at runtime and the `as never` cast drops.
- The live `avancar_etapa()` trigger remains unedited (invariant preserved). No blockers introduced.

## Self-Check: PASSED

- FOUND: src/components/KanbanBoard.tsx (contains DropdownMenu + RejeitarCandidaturaDialog + RetrocederCandidaturaDialog)
- FOUND: src/features/hub-candidato/components/HubCandidatoRH.tsx (contains RejeitarCandidaturaDialog action row)
- FOUND commit: 2644ecc (Task 1)
- FOUND commit: 605c3c8 (Task 2)

---
*Phase: 31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil*
*Completed: 2026-07-14*
