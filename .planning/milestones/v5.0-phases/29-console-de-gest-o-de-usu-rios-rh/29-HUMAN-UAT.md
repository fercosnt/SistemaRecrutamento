# Phase 29 — HUMAN-UAT (deferred live checks)

**Status:** deferred (verification 7/7 at code/dispatch level; these 6 close only over live round-trips — Phase-28 server guarantees + SMTP/visual, not grep-checkable). No gaps.
**Live admin account:** `e2e.admin@beautysmile.com.br` (administrador). ⚠️ USR-02 will create the system's **first `recrutador`** account.

## 1. Create → set-password email → sign-in (USR-02)
Open `/rh/configuracoes` as admin → "Novo usuário" → fill email/nome/cargo/papel=recrutador → submit. Confirm: success toast, roster refetches with the new user ("Aguardando 1º acesso"), the user receives the `/auth/redefinir-senha?tipo=rh` email, sets a password, and signs into the RH panel as recrutador. **Flag if custom SMTP is needed** (built-in = 2/hr).

## 2. Role change → JWT on next sign-in (USR-03)
"Editar papel" on a user → change recrutador↔administrador → save. Confirm the change reflects on that user's **next** sign-in/token refresh (the auth-hook re-reads `usuarios_rh`) — not necessarily instant in an active session.

## 3. Deactivate blocks access / reactivate restores (USR-04)
Desativar a recrutador → confirm they can no longer access the RH panel (auth-hook resolves non-active RH → loses role). Reativar → access restored. Confirm no hard-delete (row persists, `ativo` toggles).

## 4. Reset password delivers the path (USR-05)
"Resetar senha" on a user → confirm the redefinition email arrives and the honest copy held ("a senha atual continua válida até o usuário definir uma nova").

## 5. Anti-lockout live (USR-07 UX)
With exactly one active administrador, confirm Desativar + demote ("Salvar papel") are disabled with the tooltip on that row; if a race reaches the server, the `LAST_ADMIN` toast shows. (The 2-session concurrency proof is tracked in 28-HUMAN-UAT.)

## 6. Visual / glass / WCAG-AA sweep
Live visual pass on the console (glass admin theme, badge contrast). Run the axe-core Tier-A gate against the live console; **confirm the `text-white/50` pairs** (Inativo badge, "(você)" marker, último-acesso) meet AA — bump to `text-white/60` if under 4.5:1 (UI-checker flag).

---
*All 6 are confirmatory over an already code-verified + Phase-28-server-proven boundary. Carry to the milestone-close HUMAN-UAT sweep.*
