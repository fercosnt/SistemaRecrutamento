---
phase: 29-console-de-gest-o-de-usu-rios-rh
plan: 02
subsystem: ui
tags: [react-hook-form, zod, shadcn-dialog, radix-select, sonner, rtl, tdd]

# Dependency graph
requires:
  - phase: 29-console-de-gest-o-de-usu-rios-rh
    plan: 01
    provides: "novoUsuarioSchema + PAPEL_OPTIONS + NovoUsuarioForm (schemas), useCriarUsuario (hook), UsuariosRhServiceError (.details.error_code)"
  - phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro
    provides: "gerenciar-usuario-rh EF (action:'criar' → resetPasswordForEmail), EMAIL_EXISTS/EMAIL_SEND_FAILED contract"
provides:
  - "NovoUsuarioDialog: controlled create-user Dialog (RHF register/Controller + zodResolver(novoUsuarioSchema)); honest helper copy; pending/disabled submit; error_code → field/toast mapping"
affects: [29-04-GestaoUsuariosPage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bare RHF register/Controller + zodResolver (LoginRHPage idiom) — NOT the unused shadcn Form-field primitive"
    - "Feedback ownership split: the hook toasts success/EMAIL_SEND_FAILED + invalidates; the dialog owns only the ERROR branch (EMAIL_EXISTS → field, others → toast) and never double-toasts"
    - "RTL over Radix Dialog/Select via native-equivalent mocks (repo idiom, UpdateStatusModal.test.tsx) — no pointer/portal polyfills"

key-files:
  created:
    - src/features/admin/components/NovoUsuarioDialog.tsx
    - src/features/admin/components/__tests__/NovoUsuarioDialog.test.tsx
  modified: []

key-decisions:
  - "The dialog CLOSES on any mutateAsync resolve (success OR EMAIL_SEND_FAILED warning) — the warning is the hook's toast, not an error the dialog must surface"
  - "EMAIL_EXISTS → RHF setError('email') + keep open (field routing, no toast); all other error_codes → exact UI-SPEC pt-BR toast.error + keep open"
  - "Client Zod validation blocks the invoke before it happens (defense-in-depth); the EF .strict() union is authoritative"

patterns-established:
  - "Create-dialog error routing: read errorCodeOf(err).details.error_code, branch EMAIL_EXISTS-to-field vs enumerated-toast — reusable by 29-03 EditarPapelDialog"

requirements-completed: [USR-02]

# Metrics
duration: 4min
completed: 2026-07-13
---

# Phase 29 Plan 02: NovoUsuarioDialog Summary

**The "Novo usuário" create dialog: a bare RHF + `zodResolver(novoUsuarioSchema)` form (email/nome/cargo/papel) that dispatches `action:'criar'` through the Phase-28 secure EF via `useCriarUsuario`, with honest pt-BR copy, a pending/disabled submit, and the full `error_code → field/toast` mapping — EMAIL_EXISTS routes to the email field, EMAIL_SEND_FAILED is a resolve-and-close warning, and the hook owns every success toast so the dialog never double-toasts.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-07-13T20:01:00Z
- **Completed:** 2026-07-13T20:05:00Z
- **Tasks:** 1 (TDD: RED → GREEN)
- **Files modified:** 2 created

## Accomplishments
- `NovoUsuarioDialog.tsx` — controlled `Dialog` (glass `DialogContent`) with 4 fields (E-mail/Nome completo/Cargo/Papel), the honest helper "O usuário receberá um e-mail para definir a própria senha e acessar o painel." (T-29-04 — promises exactly what the EF does), and a `DialogFooter` (Cancelar + "Criar usuário", `min-h-[44px]`).
- Bare RHF `register` for the 3 text inputs + a `Controller`-wrapped `Select` for `papel` (default `recrutador`, exactly {Recrutador, Administrador} from `PAPEL_OPTIONS`, T-29-05). Inline `role="alert"` + `aria-invalid`/`aria-describedby` errors — the `LoginRHPage` idiom, **not** the unused shadcn Form-field primitive (grep-forbidden per plan → 0 matches, no `ui/form` import).
- `onSubmit` calls `criar.mutateAsync(values)` in try/catch: resolve → `reset()` + `onOpenChange(false)` (the hook already toasts success or the EMAIL_SEND_FAILED warning and invalidates the roster); catch → `errorCodeOf(err)` branches `EMAIL_EXISTS` → `setError('email', …)` (keep open) vs `VALIDATION`/`FORBIDDEN`/`NOT_FOUND`/`SERVER_ERROR`/unknown → the exact UI-SPEC `toast.error` (keep open).
- Pending submit shows `Loader2` + "Criando…" and is `disabled` (no double-submit).
- 12-case RTL suite (Radix Dialog/Select mocked to native equivalents) asserting: layout+honest copy, default `recrutador`, the criar dispatch body, close-on-success + no double-toast, EMAIL_SEND_FAILED close, EMAIL_EXISTS field-error-stays-open, each enumerated toast, client-validation-blocks-invoke, and pending disable.

## Task Commits

Each task was committed atomically:

1. **Task 1: NovoUsuarioDialog (test-first)** — `2cb1b3a` (test, RED) → `bb441ce` (feat, GREEN)

**Plan metadata:** committed with SUMMARY/STATE/ROADMAP (docs).

## Files Created/Modified
- `src/features/admin/components/NovoUsuarioDialog.tsx` — the create-user Dialog (RHF+Zod, honest copy, error_code → field/toast mapping, pending disable).
- `src/features/admin/components/__tests__/NovoUsuarioDialog.test.tsx` — 12-case RTL contract.

## TDD Gate Compliance
- **RED:** `2cb1b3a` (`test(29-02)`) — failed to resolve the missing `../NovoUsuarioDialog` module (component not yet implemented).
- **GREEN:** `bb441ce` (`feat(29-02)`) — 12/12 pass.
- **REFACTOR:** none needed (clean on first GREEN). Gate sequence intact (test → feat).

## Decisions Made
- The dialog closes on **any** `mutateAsync` resolve — success and `EMAIL_SEND_FAILED` are both "the user was created"; the warning is the hook's `toast.warning`, not an error the dialog re-surfaces.
- The dialog owns **only** the ERROR branch (matching `useCriarUsuario` having no `onError`): `EMAIL_EXISTS` → email field error (no toast); every other `error_code` → the exact UI-SPEC pt-BR `toast.error`. Success toasting stays the hook's job — no double-toast.
- Client-side Zod validation blocks the invoke before it happens; the EF `.strict()` union remains the authoritative gate.

## Deviations from Plan

None - plan executed exactly as written.

_One cosmetic guard adjustment (not a plan deviation): reworded a docstring so it no longer contained the literal `FormField` token, keeping the `grep -n "FormField"` guard at 0 matches. No behavior change._

## Issues Encountered
None. The verification `grep` initially matched a docstring mention of the forbidden shadcn `FormField` primitive; reworded the comment so the guard reads a clean 0.

## User Setup Required
None - no external service configuration required. The `gerenciar-usuario-rh` EF and its `criar` path are already live on PROD (Phase 28). No backend/migration/apply work in this plan (UI-only).

## Next Phase Readiness
- **Ready for 29-03** (EditarPapelDialog + UsuariosRhTable) and **29-04** (GestaoUsuariosPage wiring the CTA that opens this dialog): the create dialog is a self-contained controlled component consuming only `useCriarUsuario` + `novoUsuarioSchema`.
- No blockers. Full suite green (813/813, +12); tsc baseline flat at 104 (≤104 gate held).

## Self-Check: PASSED
- Files: `src/features/admin/components/NovoUsuarioDialog.tsx` FOUND; `src/features/admin/components/__tests__/NovoUsuarioDialog.test.tsx` FOUND.
- Commits: `2cb1b3a` (RED), `bb441ce` (GREEN) both FOUND.

---
*Phase: 29-console-de-gest-o-de-usu-rios-rh*
*Completed: 2026-07-13*
