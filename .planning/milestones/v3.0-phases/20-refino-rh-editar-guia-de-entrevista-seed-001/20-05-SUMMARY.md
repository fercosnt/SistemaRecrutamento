---
phase: 20-refino-rh-editar-guia-de-entrevista-seed-001
plan: 05
subsystem: ui
tags: [ENTREV-06, ENTREV-07, ENTREV-08, react, rtl, edit-mode, async-state, glass-ui, rnf-07a]

# Dependency graph
requires:
  - phase: 20-03
    provides: "useGuiaEntrevista.saveEdits mutation (batch-save plumbing) + GuiaPergunta.origem + origem-aware normalizeGuia (read layer carries provenance)"
  - phase: 20-02
    provides: "save_entrevista_guia_edits RPC live in PROD (authenticate-THEN-authorize write-path)"
  - phase: 20-04
    provides: "gerar-guia-entrevista EF merge-preserve (never drops origem:'manual' on regen)"
provides:
  - "Edit-mode GuiaEntrevistaPanel: toggle 'Editar guia' + EditablePerguntaRow (inline pergunta Input + dimensão Select + up/down reorder + delete-confirm)"
  - "add-manual inline form stamping origem:'manual' on the new row"
  - "per-question IA (accent + Sparkles) / Manual (neutral) origem badge — the ENTREV-08 audit affordance, user-observable"
  - "batch 'Salvar edições' → onSaveEdits({ tipo, perguntas }) via the 20-03 saveEdits mutation; 'Salvando…' in-flight; static PT-BR save-error copy keyed by code"
  - "EntrevistaWorkspace wires saveEdits/saving/saveError/saveErrorCode + success toast"
affects:
  - "Phase 21 (live edit/save/regen round-trip UAT in PROD — deferred)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "edit-mode panel: local draft[] state initialized from the saved guide on enter-edit, reset on guide-change/Cancelar (single source of truth in edit mode)"
    - "save-error region = static PT-BR copy keyed by errorCode (FORBIDDEN/insufficient_privilege → permission copy), NEVER the raw RPC error (T-20-16 / T-18-04-ID)"
    - "Radix Select dimensão options = the closed union of the guide's own dimensões + the row's current value (no fixed enum exists for AI dimensões)"
    - "RTL drives Inputs/buttons via fireEvent (repo convention); Radix Select popper NOT driven under happy-dom — dimensão tested via the deterministic add-manual Input"

key-files:
  created:
    - "src/features/entrevista/components/__tests__/GuiaEntrevistaPanel.test.tsx"
    - ".planning/phases/20-refino-rh-editar-guia-de-entrevista-seed-001/20-05-SUMMARY.md"
  modified:
    - "src/features/entrevista/components/GuiaEntrevistaPanel.tsx"
    - "src/features/entrevista/components/EntrevistaWorkspace.tsx"

key-decisions:
  - "dimensão edit control = Radix Select whose options are the closed union of the guide's existing dimensões + the row's current value (the must_haves Select contract). A brand-new manual question's dimensão uses a free-text Input in the add-manual form, since arbitrary new dimensões cannot come from a closed Select."
  - "Edit state lives in a local draft[] (useState) reset via useEffect on the saved-guide reference change — a successful save invalidates the guide query (handled in the 20-03 hook), the new guide flows in, and the effect exits edit mode showing the saved guide."
  - "Save-error renders ONLY static copy keyed by code (FORBIDDEN/insufficient_privilege → 'Você não tem permissão para editar este guia.'; else generic). The raw RPC error / SQLSTATE / table name is never echoed (T-20-16)."
  - "Reorder boundary buttons are disabled (not hidden) so focus order stays stable (a11y); delete is staged in draft and only persisted on Salvar (the AlertDialog copy says so)."
  - "Accent (#35BFAD) used ONLY on the IA badge, its Sparkles, and the 'Salvar edições' GlassButton — never on Manual/Cancelar/reorder/delete (UI-SPEC §Color)."

patterns-established:
  - "Edit-mode-over-read-only-panel: extend an existing read-only row component (PerguntaRow) into an EditablePerguntaRow, carrying the same spacing/typography for visual continuity, gated by a single editing flag."
  - "Save-state contract: panel takes saving/saveError/saveErrorCode booleans + code from the host, renders a static error band; the host owns the mutation + the success toast."

requirements-completed: [ENTREV-06, ENTREV-07, ENTREV-08]

# Metrics
duration: ~5min
completed: 2026-06-30
---

# Phase 20 Plan 05: Edit-Mode Interview-Guide Panel Summary

**One-liner:** Turned the read-only `GuiaEntrevistaPanel` into an RH edit surface — toggle "Editar guia", inline-edit pergunta (Input) + dimensão (Select), up/down reorder (boundary buttons disabled), delete-confirm (AlertDialog), add-manual (`origem:'manual'`), per-question IA/Manual origem badge (the ENTREV-08 audit affordance), and a batch "Salvar edições" wired to the existing `useGuiaEntrevista.saveEdits` mutation with a static PT-BR save-error contract that never echoes the raw RPC error — closing the user-observable half of ENTREV-06/07 (ENTREV-08 backend already live via 20-02/20-04).

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-30T01:17:00-03:00 (approx, first file write)
- **Completed:** 2026-06-30T01:22:04-03:00
- **Tasks:** 2 of 2
- **Files modified:** 3 (1 created test, 1 created summary, 2 source modified)

## What shipped

### Task 1 — Edit-mode panel + EditablePerguntaRow + badges + up/down + delete-confirm + add-manual + batch save states (commit `eb2aeb2`)

- `GuiaEntrevistaPanelProps` extended with `onSaveEdits?`, `saving?`, `saveError?`, `saveErrorCode?`.
- Local edit state: `draft[]` (working perguntas) initialized from `perguntasOf(guia)` on enter-edit; reset on `Cancelar` and on the saved-guide reference change (via `useEffect`), which also exits edit mode so a successful save shows the saved guide in view.
- `EditablePerguntaRow`: inline `Input` (pergunta, `text-base` to hold row height) + Radix `Select` (dimensão, options = closed union of the guide's dimensões + the row's value) + up/down `ChevronUp`/`ChevronDown` (aria-labels 'Mover para cima'/'Mover para baixo', boundary buttons `disabled`) + delete `Trash2` opening an `AlertDialog` ('Remover esta pergunta?' / confirm 'Remover pergunta' destructive-tinted; removal staged in draft, persisted only on save).
- `AddPerguntaForm`: inline 'Adicionar pergunta' → Pergunta `Input` + Dimensão `Input` + 'Adicionar'/'Cancelar'; the appended row is stamped `origem:'manual'`.
- Per-question `OrigemBadge`: IA = accent `border-[#35BFAD]/40 bg-[#35BFAD]/10` + `Sparkles`; Manual = neutral `border-white/15 bg-white/5`; missing `origem` → IA. Rendered in BOTH view and edit modes.
- Footer: 'Salvar edições' (accent `GlassButton`, `Save`, disabled until dirty + while saving → label 'Salvando…') + 'Cancelar' (neutral, `X`, reverts without a dialog). Optional dirty hint 'Você tem edições não salvas.'.
- Save-error band: static PT-BR copy keyed by `saveErrorCode` — FORBIDDEN/insufficient_privilege → 'Você não tem permissão para editar este guia.'; else 'Verifique a conexão e tente novamente.'. Never echoes the raw error (T-20-16); edit state preserved.
- IA-only fields (Âncoras BARS) stay read-only display in both modes.
- 13-case RTL suite created (`GuiaEntrevistaPanel.test.tsx`): view-mode badge-by-origem, disabled toggle on no guide, enter-edit renders editable rows, inline-edit→save payload, add-manual `origem:'manual'` in payload, delete-confirm staging, up/down reorder + boundary-disabled, dirty-gated save, 'Salvando…' disabled, FORBIDDEN→permission copy (no raw error leak), generic error copy, Cancelar revert, BARS read-only.

### Task 2 — Wire saveEdits/saving/saveError from EntrevistaWorkspace (commit `100548b`)

- Destructured `saveEdits` from `useGuiaEntrevista(candidaturaId, vagaId)`.
- Passed `onSaveEdits={(vars) => saveEdits.mutate(vars)}`, `saving={saveEdits.isPending}`, `saveError={!!saveEdits.error}`, `saveErrorCode={(saveEdits.error as EntrevistaServiceError | undefined)?.code}`.
- Added a `useEffect` firing the Sonner toast 'Edições do guia salvas.' on `saveEdits.isSuccess`.
- Existing `guia`/`loading`/`generating`/`onGerar` props unchanged; no other tabs touched; no `candidaturas` write added (RNF-07a).

## Deviations from Plan

None — plan executed as written. The dimensão control honors the must_haves `Select` contract for existing rows (closed union of the guide's dimensões + current value) and uses a free-text `Input` only in the add-manual form (a brand-new manual dimensão cannot come from a closed Select); this is the UI-SPEC's intent (add-form labels say "Dimensão" without mandating Select) and is documented as a key-decision, not a deviation.

## Verification

- `npm run test:run -- src/features/entrevista/components/__tests__/GuiaEntrevistaPanel.test.tsx` → 13/13 green.
- `npm run test:run -- src/features/entrevista` → 59/59 green.
- `npm run test:run` (full suite) → **688/688 green** (was 675 in 20-04 → +13 new RTL tests; no regression).
- `npm run lint` (tsc --noEmit) → **257 errors** (FOUND-08 M4 baseline held; PLAN budget ≤258, executor budget ≤257 — met).
- `npm run build` → green (chunk-size note is the pre-existing advisory, not an error).
- grep gates: panel has 'Editar guia' + `onSaveEdits`; workspace destructures + wires `saveEdits` (onSaveEdits/saving/saveError/saveErrorCode + success toast).

## Threat surface

The plan's threat register (T-20-16 raw-error echo · T-20-17 client posts a score · T-20-18 UI bypasses server guard · T-20-SC supply-chain) is honored: the save-error region renders only static copy keyed by code (no raw echo); the edit payload only carries pergunta/dimensão/origem/order (no score/band field is editable); the RPC remains the authoritative guard (20-02); zero external packages added (all UI primitives vendored). No NEW security-relevant surface introduced beyond the threat model.

## Known Stubs

None. The panel is fully wired to the live `saveEdits` mutation (20-03) backed by the PROD RPC (20-02) and the merge-preserve EF (20-04). No hardcoded empty data, no placeholder text, no unwired data source.

## Requirements

- **ENTREV-06** (edit pergunta + dimensão of an existing question, persists) — UI delivered; persistence via the live 20-02/20-03 write-path. ✅ markable complete.
- **ENTREV-07** (add manual, remove, reorder) — UI delivered (add-manual `origem:'manual'`, delete-confirm, up/down). ✅ markable complete.
- **ENTREV-08** (origem badge audit affordance; regen never silently drops manual) — the user-observable IA/Manual badge lands here; the server-side anti-silent-discard invariant was already live via 20-02/20-04. ✅ markable complete.

## Self-Check: PASSED

- `src/features/entrevista/components/GuiaEntrevistaPanel.tsx` — FOUND
- `src/features/entrevista/components/EntrevistaWorkspace.tsx` — FOUND
- `src/features/entrevista/components/__tests__/GuiaEntrevistaPanel.test.tsx` — FOUND
- commit `eb2aeb2` — FOUND
- commit `100548b` — FOUND
