---
phase: 30-meu-perfil-rh
plan: 04
subsystem: client-data-layer
tags: [perfil-rh, service, hooks, tanstack-query, zod, rpc-dispatch, gotrue-reauth, avatar-upload, allowlist, seg-03, pitfall-7]
requires:
  - phase: 30-03
    provides: "atualizar_meu_perfil_rh(p_nome, p_avatar_url) DEFINER RPC + private avatars-rh bucket (authored; PROD apply is 30-06)"
  - phase: 30-02
    provides: "pitfall7.grep.test.ts extended with PHASE_30_PERFIL_PATHS (signed-URL/password redaction guard)"
provides:
  - "perfilRhService — own-row allowlist read + atualizar_meu_perfil_rh RPC dispatch + GoTrue re-auth password change + avatar validate/upload/sign"
  - "usePerfilRh hooks — own-row query + 3 mutations; useAtualizarPerfil refreshes authStore.adminUser on success (panel chrome updates without re-login)"
  - "perfilRhSchemas — perfilNomeSchema (nome 3-255) + alterarSenhaSchema (min8 + refine nova===confirmar/nova!==atual)"
affects: [30-05, 30-06]
tech-stack:
  added: []
  patterns:
    - "Own-row self-read via explicit 7-col allowlist .eq('user_id', uid) — never select('*') (T-30-06, [[reference_select_star_leaks_pii]])"
    - "GoTrue re-auth: signInWithPassword(current) BEFORE updateUser(new); wrong current → typed WRONG_CURRENT field error; no signOut (session stays valid)"
    - "Mutation-onSuccess store refresh: setAdminUser(merged row) propagates identity to the RH shell WITHOUT a re-login"
    - "Avatar-always-carries-nome: uploadAvatar returns only the path; persistence flows through atualizarPerfil({nome, avatarPath}) so the unconditional RPC SET never blanks nome_completo"
    - "Untyped-RPC bridge: supabase.rpc('atualizar_meu_perfil_rh' as never, {...} as never) with a TODO(30-06) to drop the cast after database.types.ts regen"
key-files:
  created:
    - src/features/perfil-rh/schemas/perfilRhSchemas.ts
    - src/features/perfil-rh/services/perfilRhService.ts
    - src/features/perfil-rh/services/__tests__/perfilRhService.test.ts
    - src/features/perfil-rh/hooks/usePerfilRh.ts
    - src/features/perfil-rh/hooks/__tests__/usePerfilRh.test.tsx
  modified: []
key-decisions:
  - "readMeuPerfil projects the exact 7-col allowlist (PERFIL_RH_COLUMNS) — a test asserts the projection contains no '*' (T-30-06)"
  - "alterarSenha maps ANY signInWithPassword error to WRONG_CURRENT (field), and only weak/same_password codes on updateUser to WEAK_PASSWORD"
  - "useAtualizarPerfil refreshes the store by merging edited fields onto the current adminUser and routing through setAdminUser (which already fans out to adminUser/profile/role)"
  - "useAlterarSenha has NO onError toast — WRONG_CURRENT is a field error owned by the SenhaSection (30-05); toasting it here would double-signal"
  - "The RPC is not yet in database.types.ts (regen is 30-06) → args + fn name carry `as never` with an inline TODO to drop after regen"
patterns-established:
  - "Self-service client data layer mirroring usuariosRhService (error class + allowlist read) + cvUploadService (validate/upload/sign) + passwordService (redaction)"
requirements-completed: [PERFIL-01, PERFIL-02, PERFIL-03]
duration: ~10min
completed: 2026-07-14
---

# Phase 30 Plan 04: Perfil RH Client Data Layer Summary

**`perfilRhService` (own-row 7-col allowlist read · `atualizar_meu_perfil_rh` RPC dispatch · GoTrue `signInWithPassword`→`updateUser` re-auth · `avatars-rh` validate/upload/sign) + `usePerfilRh` hooks (own-row query + 3 mutations, where the profile-edit mutation refreshes `authStore.adminUser` so the RH panel chrome reflects the new name/avatar without a re-login) — landed GREEN with Vitest (RED→GREEN within the plan), tsc flat at 104.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2 (2 per-task commits)
- **Files created:** 5 (schemas + service + hook + 2 tests)

## Accomplishments

### Task 1 — `perfilRhSchemas` + `perfilRhService` (commit `338dbe2`)
- **`perfilRhSchemas.ts`:** `perfilNomeSchema` (nome_completo trim/min(3)/max(255)) + `alterarSenhaSchema` (senha_atual required; nova_senha min(8) `'Mínimo 8 caracteres'`; `.refine` nova===confirmar `'As senhas não conferem'`; `.refine` nova!==atual `'A nova senha deve ser diferente da atual'`).
- **`perfilRhService.ts`:**
  - `readMeuPerfil(uid)` → `.select(PERFIL_RH_COLUMNS).eq('user_id', uid).single()` — the exact 7-col allowlist `id,user_id,nome_completo,email,cargo,role,avatar_url`, NEVER `select('*')` (T-30-06).
  - `atualizarPerfil(nome, avatarPath?)` → `rpc('atualizar_meu_perfil_rh', { p_nome, p_avatar_url: avatarPath ?? null })`; name-only save passes `p_avatar_url: null` (RPC COALESCE keeps the avatar). Carries `as never` + a `TODO(30-06)` to drop after regen.
  - `alterarSenha(email, current, nova)` → `signInWithPassword({email, password: current})` BEFORE `updateUser({password: nova})`; wrong current → `WRONG_CURRENT` (never rotates); weak new → `WEAK_PASSWORD`; NO `signOut`.
  - `validateAvatar` (≤2MB `FILE_TOO_LARGE`, png/jpeg/webp `INVALID_MIME`) + `uploadAvatar(file, uid)` → `avatars-rh` `{uid}/avatar.<ext>` `upsert:true`, returns the PATH (never a signed URL) + `getAvatarSignedUrl(path)` `createSignedUrl(path, 3600)`.
  - `PerfilRhServiceError` code union; Pitfall-7 redaction (`{hasPassword}` / `{sizeKb,mime,hasFile}` shapes only).
  - **Tests (15):** allowlist projection asserted no-`*` + `.eq('user_id', uid)`; RPC name+args; signIn-before-updateUser order + no signOut; WRONG_CURRENT never rotates; validateAvatar rejects >2MB + non-image; uploadAvatar path/upsert + validates-before-upload; getAvatarSignedUrl.

### Task 2 — `usePerfilRh` hooks (commit `9c30624`)
- `perfilRhKeys` (`all` → `me(uid)`); `usePerfilRh()` own-row `useQuery` (`enabled:!!uid`, staleTime 5min, retry 2).
- `useAtualizarPerfil` onSuccess: `toast.success('Perfil atualizado.')` + invalidate `me(uid)` + **refreshes `authStore.adminUser`** — merges `{nome_completo, avatar_url, updated_at}` onto the current `adminUser` and calls `setAdminUser(merged)` so the RH shell chrome updates WITHOUT a re-login (BLOCKER / Success Criterion #1).
- `useUploadAvatar` returns ONLY the storage path (caller persists via `atualizarPerfil({nome:<loaded>, avatarPath})` — WARNING #3, avatar-save always carries the loaded nome so the unconditional RPC SET never blanks `nome_completo`); invalidate on success.
- `useAlterarSenha` success toast only; `WRONG_CURRENT` is a field error owned by the SenhaSection (no `onError` toast — documented in JSDoc).
- **Tests (6):** own-row query calls `readMeuPerfil('uid-1')`; `setAdminUser` called with updated nome+avatar_url on success (BLOCKER assertion) + invalidate; name-only save keeps loaded avatar_url; success toast; WRONG_CURRENT no-toast; uploadAvatar returns path + invalidate.

## Deviations from Plan

None — plan executed exactly as written. RED→GREEN authored in-plan; the not-yet-typed RPC carries the planned documented `as never` cast for 30-06.

## Verification

- `npm run test:run -- src/features/perfil-rh` → **21/21 GREEN** (15 service + 6 hooks).
- Pitfall-7 grep guard (`pitfall7.grep.test.ts`) → **GREEN** over the new perfil-rh sources (6/6).
- `npm run lint` (tsc) → **104 errors, flat at baseline** (the `as never` cast keeps the not-yet-typed RPC green); zero perfil-rh errors.

## Known Stubs

None — every export is wired to real Supabase surface (client anon). Backend PROD apply (RPC + bucket) is owned by 30-06; until then the RPC cast is documented.

## Self-Check: PASSED
- FOUND: src/features/perfil-rh/schemas/perfilRhSchemas.ts
- FOUND: src/features/perfil-rh/services/perfilRhService.ts
- FOUND: src/features/perfil-rh/services/__tests__/perfilRhService.test.ts
- FOUND: src/features/perfil-rh/hooks/usePerfilRh.ts
- FOUND: src/features/perfil-rh/hooks/__tests__/usePerfilRh.test.tsx
- FOUND commit: 338dbe2 (Task 1 — service + schemas)
- FOUND commit: 9c30624 (Task 2 — hooks)
