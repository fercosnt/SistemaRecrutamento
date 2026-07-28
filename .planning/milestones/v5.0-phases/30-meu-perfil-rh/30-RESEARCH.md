# Phase 30 — Research: Meu Perfil RH (A37 self-service)

**Researched:** 2026-07-13 (authored inline by the orchestrator — the spawned researcher agents stalled on transient API instability; grounded in the in-repo precedents cited below, all VERIFIED by direct read).
**Confidence:** HIGH — every mechanism has a working in-repo precedent (curriculos bucket + cvUploadService + passwordService + Phase-28 RPC/RLS).

## Summary of load-bearing findings

The whole phase is composable from shipped precedents. The one genuinely new/subtle bit is the **self-service profile write path** — and CONTEXT already locked the safe design: a `SECURITY DEFINER` RPC that physically cannot touch `role` (SEG-03 by construction). No RLS UPDATE policy is (re)added.

---

## Q1 — Avatar storage bucket + own-folder RLS

**Precedent (VERIFIED):** `supabase/migrations/20260425000002_curriculos_bucket.sql` + `src/features/vagas/services/cvUploadService.ts`.

- **Bucket:** private (`public=false`), `file_size_limit` = 2 MB (`2097152`), `allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp']`. Create idempotently via `INSERT INTO storage.buckets ... ON CONFLICT (id) DO UPDATE`.
- **Own-folder RLS on `storage.objects`** (mirror the curriculos 4 policies exactly, retargeted to `bucket_id='avatars-rh'`): SELECT/INSERT/UPDATE/DELETE each gated on `bucket_id='avatars-rh' AND (storage.foldername(name))[1] = (select auth.uid()::text)`. **Difference from curriculos:** NO `rh/administrador reads any` clause on SELECT — an RH user's avatar is their own; only the owner reads/writes their folder (SEG-03 spirit — no cross-user access). `(select auth.uid()::text)` is subquery-wrapped for the RLS perf cache (Pitfall 8).
- **Path schema:** `{auth.uid()}/avatar.<ext>` — a STABLE key (one avatar per user; `upsert:true` to overwrite on re-upload, unlike CV's fresh-UUID-no-overwrite). Storing a stable path (not a per-call UUID) is right for a single replaceable avatar.
- **Read (private bucket):** `createSignedUrl(path, 3600)` on demand (cvUploadService:193-206 idiom). **Pitfall 11:** persist the PATH in `usuarios_rh.avatar_url`, NOT a signed URL (it expires in 1h). Render by signing on read; TanStack Query `staleTime` ~55min so it refreshes before expiry.
- **Client validation (UX-only, bucket is authoritative):** `validateAvatar(file)` throws `FILE_TOO_LARGE` (>2MB) / `INVALID_MIME` (not png/jpeg/webp) before upload — mirror `validateCV`. **Pitfall 7 redaction:** log only `{sizeKb, mime, hasFile}`, never the filename/signed-URL/token (the `pitfall7.grep.test.ts` guard enforces it).

## Q2 — GoTrue re-auth to change password (client-only)

**Precedent (VERIFIED):** `src/features/auth/services/passwordService.ts` + `authService.ts` use `supabase.auth.signInWithPassword`.

- **Flow:** (1) `supabase.auth.signInWithPassword({ email, password: currentPassword })` to verify the current password. (2) On success → `supabase.auth.updateUser({ password: newPassword })`. Wrong current password → the signIn returns an `AuthApiError` (invalid credentials) → map to a field error on "senha atual".
- **Session gotcha (resolved):** `signInWithPassword` for the SAME already-signed-in user re-issues a session for that same user — it does NOT log them out or switch users (the email is the current user's own). `updateUser({password})` then rotates the password on the live session; the session stays valid (no forced logout — matches the CONTEXT decision). Alternative `auth.reauthenticate()` (nonce-by-email) is heavier (requires an email round-trip) and unnecessary here — **recommend the signInWithPassword→updateUser path** (simplest reliable, no email dependency).
- **Pitfall 7:** never log `currentPassword`/`newPassword`/tokens; the service logs only `{ ok }`-shape. Zod (client): new ≥8, confirm===new, new≠current — all pt-BR messages.
- **The email** for the re-auth comes from the loaded own-profile row (`usuarios_rh.email`) or `supabase.auth.getUser()` — use the authenticated user's own email; never accept it from a form field (anti-confusion).

## Q3 — The `atualizar_meu_perfil_rh` RPC (SEG-03 by construction)

**Precedent (VERIFIED):** Phase-28 `20260713000003_usr_rh_mutacao_rpc.sql` RPC shape — but this one is the INVERSE privilege (self-service, `GRANT authenticated`, not `REVOKE`).

- **Signature:** `atualizar_meu_perfil_rh(p_nome text, p_avatar_url text DEFAULT NULL)` → `void` (or returns the updated own row for the client to refresh). `LANGUAGE plpgsql SECURITY DEFINER SET search_path=public`.
- **Body:** `UPDATE public.usuarios_rh SET nome_completo = p_nome, avatar_url = COALESCE(p_avatar_url, avatar_url), updated_by = auth.uid(), updated_at = now() WHERE user_id = auth.uid();` — `role`/`ativo`/`cargo`/`email`/`deleted_at` are NOT in the SET list → **SEG-03 holds by construction: the self-service path cannot escalate a role or reactivate/rename cargo.** `COALESCE(p_avatar_url, avatar_url)` = a NULL avatar arg (name-only save) does NOT wipe the existing photo (Q3 NULL-avatar concern resolved).
- **auth.uid() under SECURITY DEFINER:** resolves the CALLER (it reads the `request.jwt.claims` GUC, not the definer's identity) — VERIFIED-correct precedent: the Phase-28 `is_active_rh_admin()` DEFINER helper uses `auth.uid()` the same way and its live smoke passed. So `WHERE user_id = auth.uid()` correctly scopes to the caller's own row, and the RPC can only ever write ONE row (the caller's). Race-safe (single-row own update).
- **GRANT:** `GRANT EXECUTE ON FUNCTION public.atualizar_meu_perfil_rh(text, text) TO authenticated;` (self-service — every RH user calls it for their own row). This is safe precisely because the body is uid-scoped and column-limited.
- **Best-effort audit:** inside the RPC, `PERFORM log_auditoria(p_usuario_id := auth.uid(), p_usuario_tipo := 'rh', p_acao := 'editar_perfil', p_categoria := 'usuario', p_recurso_tipo := 'usuarios_rh', p_recurso_id := <own row id>, p_severidade := 'info', p_sucesso := true)`. Keep it in-RPC (atomic with the update) — lighter than the Phase-28 dados_antes/depois snapshot; a name/avatar change is low-sensitivity.
- **RLS UPDATE stays DENIED:** do NOT re-add any client UPDATE policy on `usuarios_rh` (Phase 28 dropped the self-promotion hole). The own-row SELECT policy (`RH pode ler seu próprio perfil`) is PRESERVED → the profile self-read works with a plain allowlist `.select().eq('user_id', auth.uid())`.

## Q4 — Signed-URL refresh strategy

Store the **path** in `usuarios_rh.avatar_url`; sign on read (`createSignedUrl(path, 3600)`), cache via TanStack Query `staleTime ~55min`. Never persist a signed URL (Pitfall 11). On avatar replace: `upload(path, file, {upsert:true, contentType})` overwrites the stable `{uid}/avatar.<ext>` (if the extension changes, remove the old object first or key the path by a fixed name+content-type — recommend fixing to `{uid}/avatar` with the contentType header, or storing the actual `<ext>` path and removing the prior on ext-change; simplest: one path per ext, and store the exact path).

---

## Validation Architecture (Nyquist)

> Behavioral SQL smoke (impersonated JWT) is the load-bearing gate for SEG-03; client service/component tests cover PERFIL-01/02/03.

### Test framework
| Property | Value |
|----------|-------|
| Framework | Vitest + RTL (service/component) · SQL behavioral smoke (impersonated JWT, PROD via MCP) |
| Config | `vite.config.ts` · migrations applied via Supabase MCP `apply_migration` |
| Quick run | `npm run test:run` · Type-check `npm run lint` (tsc ≤ frozen baseline) |

### Requirements → test map
| Req | Behavior | Test type | Gate |
|-----|----------|-----------|------|
| SEG-03 | `atualizar_meu_perfil_rh` updates ONLY the caller's own row (WHERE user_id=auth.uid()); changing another user's row is impossible | SQL smoke (impersonated recrutador JWT + a 2nd disposable user) | PROD smoke |
| SEG-03 | The RPC CANNOT set `role`/`ativo` (not in SET) — after calling with any args, the caller's `role` is unchanged; **re-prove the Phase-28 WR-01 self-promotion-denied** (recrutador direct `UPDATE usuarios_rh SET role='administrador'` still affects 0 rows) | SQL smoke | PROD smoke |
| SEG-03 | No client UPDATE RLS policy exists on `usuarios_rh` (regression guard — Phase 28 state preserved) | SQL assertion (`pg_policies`) | PROD smoke |
| PERFIL-01 | `perfilRhService.atualizarPerfil(nome, avatarPath)` calls `rpc('atualizar_meu_perfil_rh', {p_nome, p_avatar_url})`; own-row read via allowlist `.select().eq('user_id', uid)` (never select('*')) | service unit (mocked) | Vitest |
| PERFIL-02 | change-password: `signInWithPassword(email, current)` → on success `updateUser({password:new})`; wrong current → field error; new≠current + min8 + confirm enforced; no logout | service + component unit | Vitest |
| PERFIL-03 | `validateAvatar` rejects >2MB + non-png/jpeg/webp; `uploadAvatar(file, uid)` → `{uid}/avatar.<ext>` upsert; avatar_url persists the PATH; render via createSignedUrl | service unit | Vitest |
| a11y | labels/aria per field, role="alert" errors, avatar upload keyboard-operable, AA contrast (Phase-29 values) | RTL + axe Tier-A | Vitest/axe |
| Pitfall-7 | no password/token/signed-URL in any console.* (perfil-rh surfaces) | grep guard | Vitest |

### Wave 0
- Live-state capture (light): confirm `usuarios_rh` has NO client UPDATE policy (Phase 28 state), the own-row SELECT policy is present, `avatar_url` column exists; confirm `log_auditoria` signature. Verify the LIVE body of nothing needs CREATE OR REPLACE except the NEW RPC (no existing `atualizar_meu_perfil_rh`).
- Author: `perfilRhService.test.ts`, the change-password + avatar service tests, the SEG-03 SQL smoke, the Pitfall-7 grep extension.

## Security Domain (STRIDE)
| Threat | Category | Mitigation |
|--------|----------|-----------|
| Self-promotion via the profile path | Elevation of Privilege | The RPC SET list excludes role/ativo → impossible by construction; RLS UPDATE denied; no other write path. SEG-03 smoke proves it. |
| Editing another user's profile | IDOR / Tampering | `WHERE user_id=auth.uid()` in the DEFINER RPC → one row, the caller's, only. |
| Password change without knowing the current password | Broken auth | re-auth via signInWithPassword before updateUser. |
| Avatar path traversal / cross-user avatar write | Tampering | own-folder storage RLS `(storage.foldername(name))[1] = auth.uid()::text`. |
| Secret leakage (password/token/signed URL) | Info Disclosure | Pitfall-7 redaction + grep guard; sign-on-read, never persist signed URL. |

## Sources (all VERIFIED in-repo unless noted)
- `supabase/migrations/20260425000002_curriculos_bucket.sql` — private bucket + own-folder RLS (the avatar analog).
- `src/features/vagas/services/cvUploadService.ts` — upload/validate/signed-URL/error-map + Pitfall-7.
- `src/features/auth/services/passwordService.ts` + `authService.ts` — GoTrue signInWithPassword + redaction.
- `supabase/migrations/20260713000003_usr_rh_mutacao_rpc.sql` (Phase 28) — DEFINER RPC + log_auditoria shape (this one is admin/REVOKE; profile RPC is self-service/GRANT).
- Phase-28 `28-LIVE-STATE.md` — usuarios_rh has NO client UPDATE policy; own-row SELECT preserved; auth.uid() under DEFINER is GUC-based (Phase-28 smokes passed).
- Supabase JS SDK `auth.updateUser`/`auth.signInWithPassword`, Storage `createSignedUrl`/`upload{upsert}` — standard, mirrored by the in-repo usages above.

**Research date:** 2026-07-13 · **Valid until:** ~2026-08-13 (re-verify live policy state at plan time).
