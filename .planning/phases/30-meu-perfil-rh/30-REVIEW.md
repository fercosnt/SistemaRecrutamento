# Phase 30 — Meu Perfil RH — Code Review

**Scope:** client-side code-review pass over the `perfil-rh` feature (PERFIL-01/02/03 + SEG-03).
**Date:** 2026-07-14
**Backend:** NO change in this pass — the `atualizar_meu_perfil_rh` RPC was already re-hardened on PROD and the migration file updated by the orchestrator. No `supabase/migrations` edit, no MCP call.

---

## Findings & Fixes (applied this pass)

### WR-01 (bug) — `WRONG_CURRENT` over-mapped transient re-auth failures

- **File:** `src/features/perfil-rh/services/perfilRhService.ts` → `alterarSenha`
- **Issue:** the `signInWithPassword` error branch mapped EVERY failure to
  `WRONG_CURRENT` / "Senha atual incorreta." But GoTrue's `signIn` also fails on
  429 rate-limit / network / >=500 — none of which prove the current password is wrong.
  A rate-limited user was falsely told their password was incorrect.
- **Fix:** only `status === 400` OR `code === 'invalid_credentials'` → `WRONG_CURRENT`
  ("Senha atual incorreta."). Any other re-auth failure → `NETWORK_ERROR`
  ("Não foi possível verificar sua senha. Tente novamente.") carrying `{ code, status }`
  in `details`. The early throw is preserved, so `updateUser` stays unreachable after a
  failed `signIn` (no rotation on an unverified current password).
- **Tests:** the existing wrong-current test (400 / `invalid_credentials` → `WRONG_CURRENT`)
  still passes; added two tests asserting a 429 rate-limit and a 503 (undefined code) both
  map to `NETWORK_ERROR` and never rotate.

### WR-02 (bug) — stale avatar preview on same-extension re-upload

- **File:** `src/features/perfil-rh/hooks/usePerfilRh.ts` → `useUploadAvatar`
- **Issue:** the signed-URL query is keyed only on `['avatar-signed', avatarPath]` with a
  55-min `staleTime`. On a re-upload with the SAME extension the stable path
  (`{uid}/avatar.<ext>`) is IDENTICAL, so the query key never changes. `onSuccess` only
  invalidated `perfilRhKeys.me(uid)`, so the cached signed URL (the OLD image) kept being
  served — the user uploaded a new photo but saw the old one.
- **Fix:** `onSuccess` now also invalidates `{ queryKey: ['avatar-signed'] }` (the whole
  signed-URL family) so the new object is re-signed and re-fetched.
- **Tests:** extended the upload hook test to assert `invalidateQueries` is called with
  `{ queryKey: ['avatar-signed'] }` on upload success.

### WR-03 (client half) — avatar-only save must not send an unvalidated sub-min name

- **File:** `src/features/perfil-rh/components/PerfilSection.tsx` → `handleUploaded`
- **Issue:** the current field value was read via `getValues('nome_completo')?.trim()` and
  sent raw with the avatar. The RPC now rejects `< 3` chars (live guard), but the client
  should not send an invalid in-progress nome (e.g. "Ma") in the first place.
- **Fix:** `handleUploaded` now parses the current field value with `perfilNomeSchema`
  (`safeParse`); it sends the field value ONLY when it passes (min 3), otherwise it falls
  back to the loaded (already-valid) `perfil.nome_completo`.
- **Tests:** added a PerfilSection test asserting that with an in-progress 2-char name ("Ma")
  typed, an avatar upload sends `nome: 'Maria Recrutadora'` (the loaded valid nome) and NEVER
  `nome: 'Ma'`.

### IN-03 (a11y nit) — hidden file input was a second tab stop

- **File:** `src/features/perfil-rh/components/AvatarUpload.tsx`
- **Issue:** the `sr-only` `<input type=file>` stayed in the tab order, so keyboard users
  tabbed onto an invisible control.
- **Fix:** added `tabIndex={-1}` to the input (it stays reachable via the visible
  "Alterar foto" button's `inputRef.current?.click()` and keeps its `aria-label`).

---

## Already fixed elsewhere (noted, not re-done here)

- **IN-02** and **WR-03-server** were fixed on the `atualizar_meu_perfil_rh` RPC by the
  orchestrator (re-hardened on PROD + migration file updated). This client pass deliberately
  touched NO migration and made NO MCP call.

## Accepted debt

- **IN-01 (extension-change orphan):** if a user re-uploads with a DIFFERENT extension
  (e.g. `avatar.png` → `avatar.webp`), the previous object is orphaned in the `avatars-rh`
  bucket rather than overwritten (the stable path only overwrites within the same extension).
  Accepted as storage-cleanliness debt: it is bounded by own-folder RLS
  (`(storage.foldername(name))[1] = auth.uid()::text`) — a user can only ever orphan objects
  inside their OWN `{uid}/` folder, never leak or grow into another user's space. No security
  or correctness impact; a future cleanup pass (or a bucket lifecycle rule) can reclaim it.

---

## Post-fix gates

| Gate            | Command                                    | Result            |
| --------------- | ------------------------------------------ | ----------------- |
| Full Vitest     | `npm run test:run`                         | 881/881 green     |
| perfil-rh suite | `npx vitest run src/features/perfil-rh`    | 36/36 green       |
| tsc error count | `npm run -s lint \| grep -c "error TS"`    | 104 (≤104)        |
| Production build | `npm run build`                           | exit 0 (chunks ✓) |

Files changed (client only):

- `src/features/perfil-rh/services/perfilRhService.ts` (WR-01)
- `src/features/perfil-rh/hooks/usePerfilRh.ts` (WR-02)
- `src/features/perfil-rh/components/PerfilSection.tsx` (WR-03 client)
- `src/features/perfil-rh/components/AvatarUpload.tsx` (IN-03)
- `src/features/perfil-rh/services/__tests__/perfilRhService.test.ts` (WR-01 tests)
- `src/features/perfil-rh/hooks/__tests__/usePerfilRh.test.tsx` (WR-02 test)
- `src/features/perfil-rh/components/__tests__/PerfilSection.test.tsx` (WR-03 test)
