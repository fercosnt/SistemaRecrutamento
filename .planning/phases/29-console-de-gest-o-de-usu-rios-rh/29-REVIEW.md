# Phase 29 — Code Review Fixes (Console de Gestão de Usuários RH)

Frontend-only follow-up applying 6 file-anchored code-review findings from the Phase 29
review. **No backend/EF/migration change** — the Phase-28 EF `gerenciar-usuario-rh` is live
and correct; these fixes are all client-side.

## Findings + Fixes

### WR-01 (functional bug) — `resetar_senha` EMAIL_SEND_FAILED showed the wrong toast
- **Where:** `src/features/admin/hooks/useUsuariosRh.ts`
- **Root cause:** the EF returns a reset email-send failure as HTTP **502** → `functions.invoke`
  sets `error` → the mutation **rejects**. So the `onSuccess` `result.warning === 'EMAIL_SEND_FAILED'`
  branch in `useResetarSenha` was **dead code** (a 502 never resolves), and `onError`/`toastRowError`
  fell through to the generic "Não foi possível concluir a ação." bucket.
- **Fix:**
  - Added an explicit `EMAIL_SEND_FAILED` branch to `toastRowError` **before** the generic
    bucket → `toast.warning('Não foi possível enviar o e-mail de redefinição agora. Tente novamente em instantes.')`.
  - **Removed** the unreachable `onSuccess` warning branch in `useResetarSenha` (now `onSuccess`
    only toasts success + invalidates).
  - Left `criar`'s EMAIL_SEND_FAILED path (201 success-with-warning) exactly as-is — it works.
  - Corrected the module/function doc comments to describe the 502-error-trail behavior.
- **Test:** new `src/features/admin/hooks/__tests__/useUsuariosRh.test.tsx` asserts the reset
  502 EMAIL_SEND_FAILED surfaces `toast.warning` (not `toast.error`), plus LAST_ADMIN /
  UNAUTHORIZED / generic regression rows.

### WR-02 (correctness bug) — `EditarPapelDialog` stale form state
- **Where:** `src/features/admin/components/EditarPapelDialog.tsx`
- **Root cause:** the dialog is rendered per-row and never unmounts (Radix keeps it mounted),
  so `useForm({ defaultValues })` seeded ONCE at mount and was never re-synced. After changing
  the Select and cancelling, reopening showed the stale uncommitted role (and could arm the
  demote-last-admin guard from stale input).
- **Fix:** pulled `reset` from `useForm` and added
  `useEffect(() => { if (open) reset({ novo_papel: normalizePapel(user.role) }) }, [open, user.role, reset])`
  — mirrors how `NovoUsuarioDialog` resets on open/close/success.
- **Test:** new `src/features/admin/components/__tests__/EditarPapelDialog.test.tsx` mocks the
  Dialog to keep children **mounted** across `open` toggles (the real Radix behavior — the table
  suite's unmount-on-close mock would mask the bug) and asserts a change→close→reopen shows the
  LIVE role, not the stale selection.

### WR-03 (a11y) — anti-lockout disabled-tooltip was mouse-only
- **Where:** `src/features/admin/components/UsuariosRhTable.tsx` (disabled Desativar item) +
  `src/features/admin/components/EditarPapelDialog.tsx` (disabled "Salvar papel").
- **Root cause:** the `<span className="inline-flex">` TooltipTrigger wrapping a `disabled`
  control is not focusable → keyboard/SR users got no announced reason.
- **Fix:** made both wrappers focusable + announced — added `tabIndex={0}`, `aria-disabled="true"`
  and `title={ANTI_LOCKOUT_TOOLTIP}` so the reason is reachable without a mouse. Corrected the
  module-header comments that claimed "keyboard-reachable" to describe the now-true mechanism (and
  noted the TriagemTable idiom we hardened is itself mouse-only). Server LAST_ADMIN remains the
  authoritative backstop (unchanged).

### IN-01 (nit) — NovoUsuarioDialog UNAUTHORIZED
- **Where:** `src/features/admin/components/NovoUsuarioDialog.tsx`
- **Fix:** added an explicit `UNAUTHORIZED → toast.error('Sua sessão expirou. Entre novamente.')`
  branch (parity with `toastRowError`); updated the header doc.

### IN-02 (skip / documented) — unreachable `data.ok === false` field branch
- **Where:** `src/features/admin/services/usuariosRhService.ts`
- **Action:** kept the branch; added a one-line comment noting it is a forward-compat guard for a
  future 2xx-error EF envelope (today the EF signals failure via non-2xx status). Not removed.

### IN-03 (nit, AA) — Inativo badge contrast
- **Where:** `src/features/admin/components/UsuariosRhTable.tsx`
- **Fix:** bumped the Inativo status badge label from `text-white/50` to `text-white/70` on
  `bg-white/10` (Ativo/other tints unchanged). "(você)" marker + último-acesso left as-is.

### IN-04 (nit) — Ativar double-submit
- **Where:** `src/features/admin/components/UsuariosRhTable.tsx`
- **Fix:** added `disabled={ativarDesativar.isPending}` to the direct `Ativar` DropdownMenuItem
  (parity with Desativar/Resetar) to prevent a duplicate `ativar` dispatch.

## Post-fix gates

| Gate | Result |
| --- | --- |
| `npm run test:run` | **839 passed** (106 files) — includes 2 new admin test files |
| `npm run -s lint` (tsc `error TS` count) | **104** (≤104; none in touched admin files) |
| `npm run build` | **0** — assert-chunks PASSED |

## Scope guarantee

No change to `supabase/functions/**`, migrations, or DB. All edits under
`src/features/admin/**` (hooks, services, components + 2 tests).
