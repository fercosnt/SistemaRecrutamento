---
phase: 31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil
plan: 05
subsystem: ui
tags: [typescript, react, radix, alert-dialog, funnel, comparativo, shared-component]

# Dependency graph
requires:
  - phase: 31 (plan 03)
    provides: RejeitarCandidaturaDialog — the shared reject surface (motivo Select + justificativa ≥50 counter + destructive confirm) that writes through useRejeitarCandidatura, mounted here on the comparativo
  - phase: 31 (plan 02)
    provides: useRejeitarCandidatura → rejeitar_candidatura RPC (the audited motivo + ≥50 write-path the dialog consumes)
  - phase: 31 (plan 04)
    provides: the mount-don't-fork precedent (surfaces mount the shared dialog via a host `trigger`; the dialog owns the write)
provides:
  - "ComparativoScreen Rejeitar rewired: the inline no-justificativa confirm AlertDialog (:344-373) is replaced by the shared RejeitarCandidaturaDialog (motivo + ≥50 → rejeitar_candidatura RPC) — funil-02 debt (OPER-04) closed on the comparativo surface"
  - "ComparativoCandidatosPage.handleRejeitar stripped of the bare updateCandidaturaEtapa(id,'rejeitado') no-justificativa write — the reject is now an audited RPC write owned by the shared dialog"
  - "Avançar (OPER-01) preserved verbatim; read-only DecisaoFinalPage embed contract preserved (showActions = Boolean(onAvancar && onRejeitar), both handlers optional)"
affects: [31-06 (BLOCKING apply of rejeitar_candidatura RPC + regen types makes the comparativo reject live at runtime)]

# Tech tracking
tech-stack:
  added: []  # zero new npm packages — reuses the 31-03 shared dialog + 31-02 hook
  patterns:
    - "Mount-don't-fork on a 3rd surface: the comparativo mounts the SAME shared RejeitarCandidaturaDialog (host `trigger` = the dark-glass reject button) that Kanban/Hub mount — one copy of the copy + the ≥50 gate"
    - "Dialog-owns-the-write: the shared dialog performs the RPC + toast + 3-tree invalidation internally; the surface's onRejeitar becomes an optional post-success callback (kept only as the showActions gate signal), NOT a page-level mutate — avoids a double-write/double-audit-row"

key-files:
  created: []
  modified:
    - src/features/triagem/components/ComparativoScreen.tsx
    - src/features/triagem/components/__tests__/ComparativoScreen.test.tsx
    - src/components/pages/ComparativoCandidatosPage.tsx

key-decisions:
  - "The shared RejeitarCandidaturaDialog (mounted in ComparativoScreen) OWNS the reject write — the surface passes candidaturaId + nome + a host `trigger`, and the dialog does the rejeitar_candidatura RPC via its internal useRejeitarCandidatura (this is the 31-04 precedent: surfaces mount, the dialog writes). RejeitarCandidaturaDialog is NOT in this plan's files_modified, so it was mounted unchanged (no fork of the copy or the ≥50 gate)."
  - "Because the dialog owns the write, the page's handleRejeitar is a post-success callback (invalidatePanel), NOT a page-level useRejeitarCandidatura().mutate({motivo,justificativa}) — a page-level mutate would double-write (the dialog already wrote) and produce a second historico_candidatura audit row (the Phase-8 double-write bug the whole phase is built to avoid). See Deviations."
  - "onRejeitar signature kept as (candidaturaId: string) => void and OPTIONAL — it is now the showActions gate signal + post-success hook, so showActions = Boolean(onAvancar && onRejeitar) is preserved verbatim and the DecisaoFinalPage read-only embed (omits both handlers) still renders with no action row and never mounts the dialog (its hook never runs → no QueryClient needed there)."
  - "Comment wording in ComparativoCandidatosPage.tsx deliberately avoids the literal `updateCandidaturaEtapa(...'rejeitado')` string so the phase's verification grep (no remaining bare reject) does not false-positive on prose."

patterns-established:
  - "Third-surface mount of the shared reject dialog: Kanban (31-04) · Hub (31-04) · Comparativo (31-05) all mount the one RejeitarCandidaturaDialog; a future surface follows the same host-trigger shape"

requirements-completed: [OPER-04, OPER-01]

# Metrics
duration: ~8min
completed: 2026-07-14
---

# Phase 31 Plan 05: Reject-do-Comparativo (funil-02) Summary

**The comparativo "Rejeitar" is no longer a bare `updateCandidaturaEtapa(id,'rejeitado')` no-justificativa write — it now mounts the shared `RejeitarCandidaturaDialog` (motivo + justificativa ≥50) that writes through the audited `rejeitar_candidatura` RPC, closing the funil-02 debt (OPER-04) while Avançar (OPER-01) and the read-only Decisão-Final embed stay untouched.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-14T21:46Z (approx)
- **Completed:** 2026-07-14T21:51Z
- **Tasks:** 2 (both `type="auto"`)
- **Files modified:** 3

## Accomplishments
- **Task 1 — ComparativoScreen (OPER-04):** replaced the inline no-justificativa reject confirm `AlertDialog` (`:344-373`) with the shared `RejeitarCandidaturaDialog`, passing the candidate's `candidaturaId` + `nome` and a destructive dark-glass host `trigger` (`border-red-500/40 bg-red-500/10 text-red-300`, verbatim styling + `X` icon). The dialog owns the audited `rejeitar_candidatura` RPC write (motivo + ≥50 via its internal `useRejeitarCandidatura`). The **Avançar block (`:314-341`) is unchanged** (OPER-01) and `showActions = Boolean(onAvancar && onRejeitar)` (`:121`) is preserved.
- **Task 2 — ComparativoCandidatosPage (funil-02 close):** stripped the bare `updateCandidaturaEtapa(candidaturaId, 'rejeitado')` (+ its toast) from `handleRejeitar` — the reject is now an audited RPC write owned by the shared dialog. `handleRejeitar` became a lightweight post-success callback (`invalidatePanel`); `handleAvancar` (→ `updateCandidaturaEtapa(id, PROXIMA_ETAPA_APOS_TRIAGEM)`) is unchanged.
- **Test rewire:** `ComparativoScreen.test.tsx` now asserts the reject **routes through the RPC path** — `useRejeitarCandidatura().mutate` is called with `{ candidaturaId, motivo, justificativa }` (mocked hook), the reject dialog now HAS a justificativa `<Textarea>` (the old bare confirm did not), Avançar is unchanged, and the read-only embed (no handlers) renders no action row and never mounts the dialog.

## Task Commits

Each task committed atomically (pre-commit hook bypassed via `core.hooksPath=/dev/null` per this repo's documented workflow):

1. **Task 1: ComparativoScreen reject → shared dialog + test rewire** — `2bbb902` (feat)
2. **Task 2: ComparativoCandidatosPage handleRejeitar → RPC via shared dialog** — `a23ea1e` (feat)

**Plan metadata:** (this SUMMARY + STATE + ROADMAP) — see final docs commit.

_Note: the `ComparativoScreen.test.tsx` rewire was committed WITH Task 1 (not Task 2) because the test is coupled to the component change — Task 1's `<verify>` requires a green `src/features/triagem` suite, so the test had to move green in the same commit._

## Files Created/Modified
- `src/features/triagem/components/ComparativoScreen.tsx` — reject cell now mounts `<RejeitarCandidaturaDialog>` (host trigger); `onRejeitar` re-documented as an optional post-success callback; Avançar + `showActions` gate preserved.
- `src/features/triagem/components/__tests__/ComparativoScreen.test.tsx` — reject test asserts the new RPC path (mutate with structured payload) + read-only-embed gate; Select + `useRejeitarCandidatura` mocked (repo idiom).
- `src/components/pages/ComparativoCandidatosPage.tsx` — `handleRejeitar` post-success callback (bare `updateCandidaturaEtapa(id,'rejeitado')` removed); `handleAvancar` unchanged.

## Decisions Made
- **Dialog owns the write (mount-don't-fork).** The comparativo is the 3rd surface (after Kanban + Hub, 31-04) to mount the single shared `RejeitarCandidaturaDialog`. The dialog performs the RPC + toast + 3-tree invalidation internally; the surface only supplies `candidaturaId`/`nome`/`trigger`. `RejeitarCandidaturaDialog` was mounted **unchanged** (it is not in this plan's `files_modified`) — no fork of the copy or the ≥50 gate.
- **No page-level mutate (no double-write).** Since the dialog already writes, the page's `handleRejeitar` is a post-success callback (`invalidatePanel`), not a `useRejeitarCandidatura().mutate(...)`. A page-level mutate would reject the already-rejected candidatura a second time → a second `historico_candidatura` audit row (the Phase-8 double-write bug). See Deviations.
- **`onRejeitar` kept optional as the gate signal.** `showActions = Boolean(onAvancar && onRejeitar)` is preserved verbatim; the read-only `DecisaoFinalPage` embed omits both handlers → no action row, no dialog mounted, `useRejeitarCandidatura` never runs there (so that embed needs no QueryClientProvider).

## Deviations from Plan

### Interpretation call (documented, not an auto-fix)

**Reject write lives in the shared dialog, not in `ComparativoCandidatosPage.handleRejeitar`.**
- **Found during:** Task 2.
- **Plan text vs. reality:** Task 2's `<action>` and the must_haves artifact describe `handleRejeitar` calling `useRejeitarCandidatura().mutate({ candidaturaId, motivo, justificativa })` "the structured motivo+justificativa come from the shared dialog". But the shared `RejeitarCandidaturaDialog` **as built in 31-03** performs the RPC internally and exposes only a no-payload `onRejected?` post-success callback — it does NOT forward `{motivo, justificativa}` upward. `RejeitarCandidaturaDialog.tsx` is **not** in this plan's `files_modified`, and Task 1's `<action>` explicitly grants executor discretion to "let the dialog call `useRejeitarCandidatura` directly and use `onRejeitar` only as an optional post-success callback".
- **Resolution:** Design A (dialog owns the write; page's `handleRejeitar` is a post-success callback). This honors the hard constraints — *mount the shared dialog, do not fork its copy or ≥50 gate*, do not modify out-of-scope files, and the 31-04 precedent — and avoids the double-write/double-audit-row that a page-level mutate would cause on an already-rejected candidatura.
- **Effect on the plan's checks:** the FUNCTIONAL truths all hold — the comparativo reject requires motivo + ≥50 and writes through `rejeitar_candidatura` (via the dialog `ComparativoScreen` mounts). The primary `<verification>` grep (no remaining `updateCandidaturaEtapa(...'rejeitado')` in the page) passes. The one artifact hint not literally met is `ComparativoCandidatosPage.tsx contains "useRejeitarCandidatura"` — the RPC is reached through the dialog `ComparativoScreen` mounts, not a page-file mutate, so the literal string lives in `ComparativoScreen`'s dependency chain rather than the page. Adding an unused `useRejeitarCandidatura` import to the page purely to satisfy a substring grep would be dead code, so it was not done.

---

**Total deviations:** 1 documented interpretation call (0 auto-fixed bugs).
**Impact on plan:** No scope creep. All functional success criteria met; the deviation is a design-fidelity choice forced by the shared dialog's self-contained write (the correct, precedent-following, double-write-free design).

## Issues Encountered
- The verification grep for `updateCandidaturaEtapa(.*'rejeitado')` initially false-positived on my new **explanatory comments** in the page (which referenced the old pattern by name). Reworded the comments to avoid the literal `updateCandidaturaEtapa(...'rejeitado')` string so the grep is clean — the actual bare-reject code call is gone.

## Known Stubs
None. The comparativo reject is fully wired to the shared dialog → `useRejeitarCandidatura`. As with 31-03/31-04, a live reject only fully succeeds at RUNTIME after the [BLOCKING] 31-06 applies the `rejeitar_candidatura` RPC to PROD and regens `database.types.ts` (the service carries the `as never` cast until then) — the expected authored-ahead phase state tracked by 31-06, not a stub in these files.

## User Setup Required
None — pure client-tier UI. No external service configuration.

## Verification
- `npx vitest run src/features/triagem/components/__tests__/ComparativoScreen.test.tsx` — **7/7 GREEN** (reject-via-RPC path + read-only-embed gate asserted).
- `npx vitest run src/features/triagem` — **52/52 GREEN** (9 files; no triagem regression).
- **Full suite:** `npx vitest run` — **897/897 GREEN** (113 files) — no broad regression (ComparativoScreen is embedded read-only in DecisaoFinalPage; that embed omits handlers → the dialog is not mounted there).
- `npm run lint` (tsc `--noEmit`) — **104 errors, held at the M5 baseline**; **ZERO** new errors from any of the 3 modified files.
- Grep — **no remaining** `updateCandidaturaEtapa(.*'rejeitado')` in `ComparativoCandidatosPage.tsx`.

## Next Phase Readiness
- All three RH reject surfaces (Kanban · Hub · Comparativo) now route through the single shared `RejeitarCandidaturaDialog` → `rejeitar_candidatura` RPC. Phase 31's UI tier is complete.
- 31-06 (BLOCKING) applies the `rejeitar_candidatura` RPC to PROD + regens `database.types.ts` → the reject becomes live at runtime across all surfaces and the `as never` cast drops.
- The live `avancar_etapa()` trigger remains unedited (invariant preserved). No blockers introduced.

## Self-Check: PASSED

- FOUND: src/features/triagem/components/ComparativoScreen.tsx (contains RejeitarCandidaturaDialog)
- FOUND: src/components/pages/ComparativoCandidatosPage.tsx (bare reject removed; handleAvancar preserved)
- FOUND: src/features/triagem/components/__tests__/ComparativoScreen.test.tsx (asserts RPC path)
- FOUND commit: 2bbb902 (Task 1 feat)
- FOUND commit: a23ea1e (Task 2 feat)

---
*Phase: 31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil*
*Completed: 2026-07-14*
