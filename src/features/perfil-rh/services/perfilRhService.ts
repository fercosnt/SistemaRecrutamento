/**
 * `perfilRhService` — the "Meu Perfil RH" self-service data layer (PERFIL-01/02/03).
 *
 * Four responsibilities, all consuming ALREADY-AUTHORED Phase-30 backend surface
 * (30-03 migration; applied to PROD in 30-06):
 *   - `readMeuPerfil(uid)` — an ALLOWLIST read of the caller's OWN `usuarios_rh` row
 *     (`.eq('user_id', uid)`). NEVER the wildcard projection — RLS is row-level and does
 *     NOT hide columns; the row is PII ([[reference_select_star_leaks_pii]], T-30-06).
 *   - `atualizarPerfil(nome, avatarPath?)` — dispatches to the `atualizar_meu_perfil_rh`
 *     SECURITY DEFINER RPC (SEG-03 by construction — the SET list physically excludes
 *     `role`/`ativo`/`cargo`/`email`). A name-only save passes `p_avatar_url: null`, and
 *     the RPC's COALESCE keeps the existing avatar. The client NEVER writes `usuarios_rh`
 *     directly (no client UPDATE RLS policy exists — Phase-28 hole stays dropped).
 *   - `alterarSenha(email, current, nova)` — GoTrue re-auth: `signInWithPassword(current)`
 *     BEFORE `updateUser({password: nova})` (T-30-03). A wrong current password maps to a
 *     typed WRONG_CURRENT error (routed to the "Senha atual" field). NO logout — the live
 *     session stays valid (RESEARCH §Q2).
 *   - `validateAvatar` / `uploadAvatar` / `getAvatarSignedUrl` — the private `avatars-rh`
 *     bucket (2 MB, png/jpeg/webp), mirroring `cvUploadService`. The stable path
 *     `{uid}/avatar.<ext>` (upsert:true) is PERSISTED; reads are signed on demand
 *     (Pitfall 11 — never persist a signed URL).
 *
 * Pitfall-7 redaction discipline (T-30-05): password / token / signed-URL are NEVER
 * logged. Password paths log only a `{ hasPassword }` shape; the avatar path logs only
 * `{ sizeKb, mime, hasFile }`. The `pitfall7.grep.test.ts` guard (30-02) enforces this.
 *
 * @module features/perfil-rh/services/perfilRhService
 * @see src/features/vagas/services/cvUploadService.ts (the avatar analog)
 * @see src/features/auth/services/passwordService.ts (the GoTrue redaction idiom)
 * @see src/features/admin/services/usuariosRhService.ts (the service-error-class + allowlist-read idiom)
 */

import { supabase } from '@/lib/supabase/client'
import type { Database } from '../../../../database.types'

/**
 * Typed error class for the perfil-rh operations. Downstream consumers route by
 * `instanceof PerfilRhServiceError` + the `code` switch; `WRONG_CURRENT` is a DISTINCT
 * field-level outcome (the "Senha atual" field), not the generic bucket.
 */
export class PerfilRhServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'WRONG_CURRENT'
      | 'FILE_TOO_LARGE'
      | 'INVALID_MIME'
      | 'UPLOAD_FAILED'
      | 'UNAUTHORIZED'
      | 'WEAK_PASSWORD'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'PerfilRhServiceError'
  }
}

/**
 * The 7-column allowlist for the own-row read — NEVER the wildcard (T-30-06 /
 * [[reference_select_star_leaks_pii]]). `role` is read-only display here (the profile
 * path can never WRITE it — SEG-03).
 */
export const PERFIL_RH_COLUMNS = 'id, user_id, nome_completo, email, cargo, role, avatar_url'

/** The caller's own profile row — the exact allowlist projection, typed from the Row. */
export type PerfilRhRow = Pick<
  Database['public']['Tables']['usuarios_rh']['Row'],
  'id' | 'user_id' | 'nome_completo' | 'email' | 'cargo' | 'role' | 'avatar_url'
>

/** The private avatar bucket (authored in 30-03; applied in 30-06). */
export const AVATAR_BUCKET = 'avatars-rh'
/** 2 MB hard cap (bucket-enforced — this client check is UX). */
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024
/** Only these image MIMEs are accepted (bucket-enforced). */
export const ALLOWED_AVATAR_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const

/** Maps an accepted MIME to the file extension used in the stable avatar path. */
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

/**
 * Synchronous client-side validation BEFORE upload (UX-only; the bucket is authoritative).
 *
 * @throws {PerfilRhServiceError} `FILE_TOO_LARGE` if `file.size > MAX_AVATAR_SIZE`.
 * @throws {PerfilRhServiceError} `INVALID_MIME` if the MIME is not png/jpeg/webp.
 */
export function validateAvatar(file: File): void {
  if (file.size > MAX_AVATAR_SIZE) {
    throw new PerfilRhServiceError(
      `A imagem deve ter no máximo ${MAX_AVATAR_SIZE / (1024 * 1024)} MB`,
      'FILE_TOO_LARGE',
      { size: file.size, max: MAX_AVATAR_SIZE },
    )
  }
  if (!(ALLOWED_AVATAR_MIME as readonly string[]).includes(file.type)) {
    throw new PerfilRhServiceError(
      'Formato inválido. Use PNG, JPEG ou WEBP.',
      'INVALID_MIME',
      { mime: file.type },
    )
  }
}

/**
 * Reads the caller's OWN profile row with the explicit allowlist projection.
 *
 * @param uid The authenticated user's UID (`auth.uid()` — matches `usuarios_rh.user_id`).
 * @returns The own profile row (7 allowlist cols).
 * @throws {PerfilRhServiceError} `DATABASE_ERROR` on any read error.
 */
export async function readMeuPerfil(uid: string): Promise<PerfilRhRow> {
  const { data, error } = await supabase
    .from('usuarios_rh')
    .select(PERFIL_RH_COLUMNS)
    .eq('user_id', uid)
    .single()

  if (error) {
    throw new PerfilRhServiceError(
      'Não foi possível carregar seu perfil.',
      'DATABASE_ERROR',
      { raw: error },
    )
  }

  return data as unknown as PerfilRhRow
}

/**
 * Updates the caller's own name (+ optional avatar path) via the SECURITY DEFINER RPC
 * `atualizar_meu_perfil_rh`. A name-only save passes `p_avatar_url: null`; the RPC's
 * COALESCE keeps the existing avatar (RESEARCH §Q3). SEG-03: the RPC SET list physically
 * cannot touch `role`/`ativo`/`cargo`/`email`.
 *
 * @param nome The new `nome_completo` (the caller MUST pass the currently-loaded name on
 *   an avatar-only save — the RPC SET on `p_nome` is unconditional, see the hook contract).
 * @param avatarPath Optional stable storage path to persist into `avatar_url`.
 * @throws {PerfilRhServiceError} `DATABASE_ERROR` on any RPC error.
 */
export async function atualizarPerfil(nome: string, avatarPath?: string | null): Promise<void> {
  // TODO(30-06): drop `as never` once database.types.ts regen includes atualizar_meu_perfil_rh
  const { error } = await supabase.rpc('atualizar_meu_perfil_rh' as never, {
    p_nome: nome,
    p_avatar_url: avatarPath ?? null,
  } as never)

  if (error) {
    throw new PerfilRhServiceError(
      'Não foi possível salvar seu perfil.',
      'DATABASE_ERROR',
      { raw: error },
    )
  }
}

/**
 * Changes the caller's password (PERFIL-02). Re-auths with the CURRENT password via
 * `signInWithPassword` BEFORE rotating — a wrong current password throws WRONG_CURRENT
 * (mapped to the "Senha atual" field). On success, `updateUser({password})` rotates on
 * the live session; NO logout (the email is the caller's own, so the session stays valid).
 *
 * Pitfall-7: neither password is ever logged — only a `{ hasPassword }` shape.
 *
 * @param email The caller's OWN email (from the loaded profile row / auth.getUser) — NEVER
 *   accepted from a form field (anti-confusion, RESEARCH §Q2).
 * @param senhaAtual The current password (re-auth material).
 * @param novaSenha The new password.
 * @throws {PerfilRhServiceError} `WRONG_CURRENT` if the current password is wrong;
 *   `WEAK_PASSWORD` if GoTrue rejects the new password; `NETWORK_ERROR` otherwise.
 */
export async function alterarSenha(
  email: string,
  senhaAtual: string,
  novaSenha: string,
): Promise<void> {
  // Pitfall 7: log only the flag — NEVER either password.
  console.log('[PERFIL] alterarSenha invoked', { hasPassword: Boolean(novaSenha) })

  // (1) Re-auth: verify the CURRENT password. For the already-signed-in user this
  // re-issues a session for the SAME user (no logout / no user switch) — RESEARCH §Q2.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: senhaAtual,
  })

  if (signInError) {
    // Any signIn failure here means the current password did not verify → field error.
    throw new PerfilRhServiceError(
      'Senha atual incorreta.',
      'WRONG_CURRENT',
      { code: signInError.code, status: signInError.status },
    )
  }

  // (2) Rotate the password on the live session — no signOut.
  const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha })

  if (updateError) {
    const code = (updateError.code || '').toLowerCase()
    if (code.includes('weak') || code.includes('same_password')) {
      throw new PerfilRhServiceError(
        'A nova senha não atende aos requisitos de segurança.',
        'WEAK_PASSWORD',
        { code: updateError.code, status: updateError.status },
      )
    }
    throw new PerfilRhServiceError(
      'Não foi possível alterar a senha. Tente novamente.',
      'NETWORK_ERROR',
      { code: updateError.code, status: updateError.status },
    )
  }
}

/**
 * Uploads the avatar to the private `avatars-rh` bucket at the stable path
 * `{uid}/avatar.<ext>` (upsert:true — one avatar per user, overwritten on re-upload).
 *
 * @param file The image File selected by the user.
 * @param uid The authenticated user's UID — storage RLS matches on
 *   `(storage.foldername(name))[1] = auth.uid()::text` (own-folder only).
 * @returns The STABLE storage PATH (persist this via `atualizarPerfil`; NEVER a signed URL).
 * @throws {PerfilRhServiceError} validation codes or `UPLOAD_FAILED`/`UNAUTHORIZED`.
 */
export async function uploadAvatar(file: File, uid: string): Promise<string> {
  // Throws synchronously if validation fails — caller catches before await.
  validateAvatar(file)

  // Pitfall 7 redacted log — { sizeKb, mime, hasFile } only. NO filename, NO path.
  console.log('[PERFIL] avatar upload invoked', {
    sizeKb: Math.round(file.size / 1024),
    mime: file.type,
    hasFile: Boolean(file),
  })

  const ext = MIME_TO_EXT[file.type] ?? 'png'
  const path = `${uid}/avatar.${ext}`

  // Pitfall 3 (this-detached supabase): always invoke through the chain.
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true, // one avatar per user — overwrite on re-upload
  })

  if (error) {
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('payload too large') || msg.includes('exceeded')) {
      throw new PerfilRhServiceError('A imagem excede o limite de 2 MB', 'FILE_TOO_LARGE', error)
    }
    if (msg.includes('mime')) {
      throw new PerfilRhServiceError('Formato inválido', 'INVALID_MIME', error)
    }
    if (msg.includes('jwt') || msg.includes('unauthorized')) {
      throw new PerfilRhServiceError('Sessão expirada', 'UNAUTHORIZED', error)
    }
    throw new PerfilRhServiceError('Falha ao enviar a imagem', 'UPLOAD_FAILED', error)
  }

  // Return the PATH (data.path), never a signed URL (Pitfall 11).
  return data.path
}

/**
 * Generates a signed URL for an avatar (1h expiry). Consumers cache with
 * `staleTime ~55min` to refresh before expiry. The returned URL is NEVER logged (Pitfall 7).
 *
 * @param path The stable storage path (from `uploadAvatar` / `usuarios_rh.avatar_url`).
 * @returns The signed URL string.
 * @throws {PerfilRhServiceError} `UPLOAD_FAILED` on any error or empty response.
 */
export async function getAvatarSignedUrl(path: string): Promise<string> {
  const EXPIRES_IN_SECONDS = 3600 // 1 hour
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, EXPIRES_IN_SECONDS)

  if (error || !data?.signedUrl) {
    throw new PerfilRhServiceError(
      'Não foi possível gerar a imagem do perfil',
      'UPLOAD_FAILED',
      error,
    )
  }
  // DO NOT log data.signedUrl — Pitfall 7
  return data.signedUrl
}

/** Namespaced service surface (mirrors `usuariosRhService`). */
export const perfilRhService = {
  readMeuPerfil,
  atualizarPerfil,
  alterarSenha,
  validateAvatar,
  uploadAvatar,
  getAvatarSignedUrl,
}
