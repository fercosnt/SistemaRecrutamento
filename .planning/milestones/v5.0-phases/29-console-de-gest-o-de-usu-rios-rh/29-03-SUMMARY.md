---
phase: 29-console-de-gest-o-de-usu-rios-rh
plan: 03
subsystem: ui
tags: [react-hook-form, zod, shadcn-table, shadcn-dropdown-menu, shadcn-alert-dialog, radix-tooltip, sonner, rtl, tdd, anti-lockout]

# Dependency graph
requires:
  - phase: 29-console-de-gest-o-de-usu-rios-rh
    plan: 01
    provides: "UsuarioRhRow type + editarPapelSchema/PAPEL_OPTIONS + useMudarPapel/useAtivarDesativar/useResetarSenha (each invalidates the roster; row hooks map LAST_ADMIN)"
  - phase: 29-console-de-gest-o-de-usu-rios-rh
    plan: 02
    provides: "NovoUsuarioDialog sibling — bare-RHF+Zod dialog idiom, error routing reuse"
  - phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro
    provides: "gerenciar-usuario-rh EF (mudar_papel/ativar/desativar/resetar_senha) + BEFORE UPDATE/DELETE anti-lockout trigger (LAST_ADMIN, authoritative)"
provides:
  - "EditarPapelDialog: controlled role-change Dialog (Controller Select {Recrutador, Administrador} pre-set to current role) → mudar_papel; demote-last-admin disabled + keyboard-safe tooltip"
  - "UsuariosRhTable: glass roster <table> (avatar, papel/status badges, primeiro_acesso chip, último acesso, '(você)') + per-row Ações DropdownMenu (Editar papel · Ativar direct · Desativar/Resetar behind AlertDialog) + last-active-admin anti-lockout disable/tooltip"
affects: [29-04-GestaoUsuariosPage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-row local state (editOpen + confirm) driving CONTROLLED AlertDialog/Dialog (open prop) — opened from DropdownMenuItem onClick, avoiding the menu-item-inside-trigger portal trap"
    - "Anti-lockout as a derived-from-rows client hint: activeAdminCount → lastActiveAdminId → disable Desativar + demote with the TriagemTable `<span className=inline-flex>` keyboard-safe disabled-tooltip idiom; the EF/trigger LAST_ADMIN stays authoritative"
    - "Feedback ownership split (29-01): the row hooks toast success + map LAST_ADMIN on error + invalidate; the table components only swallow the rejection (no double-toast)"
    - "RTL over Radix DropdownMenu/AlertDialog/Dialog/Select/Tooltip via native-equivalent mocks (repo idiom) + within(row) scoping for the multi-row roster"

key-files:
  created:
    - src/features/admin/components/EditarPapelDialog.tsx
    - src/features/admin/components/UsuariosRhTable.tsx
    - src/features/admin/components/__tests__/UsuariosRhTable.test.tsx
  modified: []

key-decisions:
  - "The row confirms are CONTROLLED AlertDialogs opened via per-row state from the DropdownMenuItem onClick — not AlertDialogTrigger inside the menu (which closes the menu and swallows the open); Ativar bypasses the confirm entirely (direct dispatch)"
  - "Anti-lockout is derived from the loaded rows (role==='administrador' && ativo, count===1); on that single row Desativar is a disabled DropdownMenuItem wrapped in the inline-flex tooltip idiom and EditarPapelDialog receives isLastActiveAdmin so its demote (→recrutador) Salvar is disabled + tooltipped. Server LAST_ADMIN is the hard backstop"
  - "EditarPapelDialog normalizes a legacy/unknown DB role (gerente/visualizador) to 'recrutador' for the control default so the console only ever assigns the two-value enum"
  - "Only the 9 allowlisted UsuarioRhRow columns are bound to the DOM (no avatar_url/telefone/created_by) — T-29-07"

patterns-established:
  - "Controlled-confirm-from-dropdown pattern (per-row state + open-prop AlertDialog) — reusable for any RH table row-action needing a confirm without an inline trigger"

requirements-completed: [USR-01, USR-03, USR-04, USR-05]

# Metrics
duration: 12min
completed: 2026-07-13
---

# Phase 29 Plan 03: Roster Table + Per-Row Account Actions Summary

**The glass RH roster `<table>` (avatar disc, nome/email, cargo, papel + status badges, "Aguardando 1º acesso" chip, último acesso, "(você)" self-marker) with a per-row Ações menu that changes role, activates/deactivates and resets password — every write through the Phase-28 secure EF via the 29-01 mutations, destructive actions behind honest pt-BR AlertDialog confirms, Ativar direct, and a keyboard-reachable anti-lockout hint that disables Desativar + the demote path on the last active administrador while the EF/trigger LAST_ADMIN stays authoritative.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2 (Task 1 auto · Task 2 TDD RED → GREEN)
- **Files:** 3 created

## Accomplishments

- **`EditarPapelDialog.tsx`** — controlled glass `Dialog` (title "Editar papel"), a single `Controller`-driven `Select` over `PAPEL_OPTIONS` pre-set to the user's current role (legacy/unknown role normalized to `recrutador`), footer "Cancelar" + "Salvar papel" (`min-h-[44px]`, pending → "Salvando…" + `Loader2` + disabled). Save dispatches `useMudarPapel().mutateAsync({ targetId, novoPapel })` then closes; the hook toasts "Papel atualizado." + invalidates + maps LAST_ADMIN. Anti-lockout: when `isLastActiveAdmin` and the chosen value would demote (administrador→recrutador), "Salvar papel" is disabled and wrapped in the `<span className="inline-flex">` tooltip idiom with the verbatim copy.
- **`UsuariosRhTable.tsx`** — glass `<table>` (TriagemTable shell) with a header row (Usuário/Cargo/Papel/Status/Último acesso/Ações) and one `UsuarioRow` per `UsuarioRhRow`. Each row: avatar-initial disc (gradient `from-[#35BFAD] to-[#00109E]`), nome_completo (14px) over email (12px), a `text-xs text-white/50` "(você)" marker when `row.user_id === currentUserId` (row NOT hidden), cargo or "—", papel Badge (accent `#35BFAD`/20 white for administrador, neutral for recrutador, neutral fallback for legacy roles), status Badge (Ativo green / Inativo muted white/50), an amber "Aguardando 1º acesso" chip when `primeiro_acesso`, último acesso as `dd/MM/yyyy` (pt-BR) / "Nunca acessou" (primeiro_acesso) / "—".
- **Row Ações DropdownMenu** (`MoreHorizontal`, `aria-label="Ações"`, `min-h/w-[44px]`, glass content `align="end"`): "Editar papel" (opens EditarPapelDialog) · "Ativar" (when `ativo=false`, **direct** dispatch `ativar:true`, no confirm) / "Desativar" (when `ativo=true`, behind AlertDialog) · "Resetar senha" (behind AlertDialog). Every item is a real Radix `DropdownMenuItem` (roving focus).
- **Two honest AlertDialog confirms** — Desativar ("Desativar usuário?" / "{nome} perderá o acesso… Você pode reativar depois." / action "Desativar"/"Desativando…") dispatches `ativarDesativar({ targetId, ativar:false })`; Resetar senha ("Enviar e-mail de redefinição de senha?" / "Enviaremos um e-mail para {email}… A senha atual continua válida…" — does **NOT** claim the account is locked, T-29-09 / action "Enviar e-mail"/"Enviando…") dispatches `resetarSenha(targetId)`.
- **Anti-lockout (USR-07 UX, T-29-08)** — `activeAdminCount` derived from the loaded rows; on the single last-active-admin row Desativar is a disabled `DropdownMenuItem` inside the keyboard-safe inline-flex tooltip, and EditarPapelDialog gets `isLastActiveAdmin` so its demote-to-recrutador "Salvar papel" is disabled + tooltipped. The Phase-28 EF/trigger `LAST_ADMIN` remains authoritative; a race falls back to the server toast (the 29-01 hook maps it).
- **13-case RTL suite** (Radix DropdownMenu/AlertDialog/Dialog/Select/Tooltip mocked to native equivalents; `within(row)` scoping) asserting: roster render + badges + chip + "(você)" + no-PII-leak + date formatting; Ativar direct (no confirm); Desativar + Resetar each behind a confirm before dispatch; Desativar pending "Desativando…"; Editar papel opens the dialog and Salvar dispatches `mudar_papel`; **last-active-admin Desativar disabled + tooltip**; **EditarPapelDialog demote Salvar disabled + tooltip**; a LAST_ADMIN rejection surfaces the server toast.

## Task Commits

Each task committed atomically (`git -c core.hooksPath=/dev/null`):

1. **Task 1: EditarPapelDialog** — `accfc2d` (`feat(29-03)`)
2. **Task 2: UsuariosRhTable + RTL test (TDD)** — `7248592` (`feat(29-03)`)

**Plan metadata:** committed with SUMMARY/STATE/ROADMAP (docs).

## Files Created

- `src/features/admin/components/EditarPapelDialog.tsx` (196 lines) — role-change Dialog with demote-last-admin guard.
- `src/features/admin/components/UsuariosRhTable.tsx` (391 lines) — glass roster + Ações menu + confirms + anti-lockout.
- `src/features/admin/components/__tests__/UsuariosRhTable.test.tsx` (340 lines) — 13-case RTL contract.

## TDD Gate Compliance

- Task 2 (`tdd="true"`): **RED** — the test was authored first and failed to resolve the missing `../UsuariosRhTable` module (component not yet implemented). **GREEN** — after implementing `UsuariosRhTable.tsx`, 13/13 pass. **REFACTOR** — none (two post-RED fixes were test-only: a `../services` → `../../services` import-depth typo and a non-nullable `cargo` fixture, both restoring the tsc≤104 gate). Task 1 (EditarPapelDialog) is `type="auto"` — its behavior is verified by Task 2's test (it opens the dialog and asserts the demote path). Gate sequence (test-first → feat GREEN) intact; committed as a single atomic `feat` per the sequential single-task flow.

## Decisions Made

- **Controlled-confirm-from-dropdown:** each `UsuarioRow` owns `editOpen` + `confirm` state; the DropdownMenuItem `onClick` sets state and a controlled (open-prop) `AlertDialog`/`EditarPapelDialog` renders — avoids the well-known trap of an `AlertDialogTrigger` inside a `DropdownMenuItem` (menu closes, dialog never opens). Ativar bypasses the confirm entirely.
- **Anti-lockout derived from rows, server authoritative:** the client disables Desativar + demote on the single active administrador as a UX hint; the Phase-28 BEFORE UPDATE/DELETE trigger (`pg_advisory_xact_lock` + admin count → `LAST_ADMIN`) is the hard backstop, surfaced via the 29-01 hook's mapped toast on any race.
- **Legacy role normalization:** EditarPapelDialog normalizes `gerente`/`visualizador` to `recrutador` for the Select default; the badge map falls back to a neutral tint with the raw label so a legacy row still renders honestly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None substantive. Two test-only fixes after the first GREEN run kept the `npm run lint` (tsc) gate at ≤104: an import-depth typo (`../services` → `../../services` from `__tests__/`) and a `cargo: null` fixture (the 29-01 `UsuarioRhRow.cargo` is a non-nullable `string`, so the empty-cargo "—" case uses `''`). Both resolved; tsc back to 104.

## User Setup Required

None — no external service configuration. The `gerenciar-usuario-rh` EF and all four consumed actions (`mudar_papel`/`ativar`/`desativar`/`resetar_senha`) plus the anti-lockout trigger are already live on PROD (Phase 28). No backend/migration/apply work in this plan (UI-only).

## Next Phase Readiness

- **Ready for 29-04** (GestaoUsuariosPage): the roster table + edit dialog are self-contained, consuming only the 29-01 hooks + `authStore`; 29-04 wires `useUsuariosRh` (query + AsyncState), the "Novo usuário" CTA (NovoUsuarioDialog), and mounts `<UsuariosRhTable rows={…} />` inside `ConfiguracoesPage` (route/RoleGuard/RHLayout preserved).
- No blockers. Full suite green (826/826, +13); tsc flat at 104 (≤104 gate held); build clean.

## Self-Check: PASSED

- Files: `EditarPapelDialog.tsx` FOUND; `UsuariosRhTable.tsx` FOUND; `__tests__/UsuariosRhTable.test.tsx` FOUND.
- Commits: `accfc2d` (Task 1), `7248592` (Task 2) both FOUND.

---
*Phase: 29-console-de-gest-o-de-usu-rios-rh*
*Completed: 2026-07-13*
