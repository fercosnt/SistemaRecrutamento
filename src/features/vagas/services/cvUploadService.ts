/**
 * Phase 4 / CAND-01 — CV Upload Service
 *
 * Wraps Supabase Storage operations for the `curriculos` bucket.
 * Path schema: `{auth.uid()}/{uuid}.pdf` (D-10 amended — see 04-01-SUMMARY.md).
 *
 * Security model:
 * - Bucket `curriculos` is PRIVATE (Plan 04-01 / D-07). Reads exposed via
 *   short-lived signed URLs only (1h per D-08).
 * - Server-side gates: bucket has 5MB cap + `application/pdf` MIME whitelist.
 *   Storage RLS policies require `(storage.foldername(name))[1] = auth.uid()::text`.
 * - Client-side validation here (D-09) is UX-only: catches the common cases
 *   BEFORE upload to avoid wasted bandwidth and to surface friendly pt-BR
 *   error messages. The bucket policy is the authoritative gate.
 *
 * Pitfall 7 redaction discipline:
 * - All `console.*` calls log only `{ sizeKb, mime, hasFile }` shape.
 * - NEVER log the original filename (PII), the signed URL string, or any token.
 * - The static grep guard `pitfall7.grep.test.ts` enforces this; violations
 *   fail the test suite at build time.
 *
 * @module features/vagas/services/cvUploadService
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Typed error class for CV upload operations.
 *
 * Mirrors the shape of `VagasServiceError` (vagasService.ts:28-42) so
 * downstream consumers (FormularioCandidaturaPage in Plan 04-07) can
 * route by `instanceof CVUploadServiceError` + `error.code` switch.
 */
export class CVUploadServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'FILE_TOO_LARGE'
      | 'INVALID_MIME'
      | 'UPLOAD_FAILED'
      | 'STORAGE_QUOTA'
      | 'NETWORK_ERROR'
      | 'UNAUTHORIZED',
    public details?: unknown
  ) {
    super(message)
    this.name = 'CVUploadServiceError'
  }
}

/** D-09: 5 MB hard cap (bucket-enforced). */
export const MAX_FILE_SIZE = 5 * 1024 * 1024
/** D-09: only application/pdf accepted (bucket-enforced). */
export const ALLOWED_MIME = 'application/pdf'

/**
 * Result of a successful upload.
 *
 * Pitfall 11 (transient URL in DB): `path` is the STABLE storage key —
 * stored in `candidaturas.curriculo_url`. RH calls
 * `getSignedUrl(candidaturaId)` on demand (via the get-curriculo-url Edge
 * Function, which resolves the path server-side). NEVER persist a signed URL
 * in DB — it is short-lived (60s TTL, minted by the EF).
 */
export interface UploadCVResult {
  /** Stable storage path (e.g. `{authUid}/{uuid}.pdf`). Persist this. */
  path: string
  /** Empty string — bucket is private. Kept for API symmetry only. */
  publicUrl: string
  /** File size in bytes. */
  size: number
  /** Original filename for UI display (NOT logged). */
  name: string
}

/**
 * Synchronous client-side validation BEFORE upload (D-09).
 *
 * @throws {CVUploadServiceError} `FILE_TOO_LARGE` if `file.size > MAX_FILE_SIZE`.
 * @throws {CVUploadServiceError} `INVALID_MIME` if `file.type !== ALLOWED_MIME`.
 */
export function validateCV(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new CVUploadServiceError(
      `Currículo deve ter no máximo ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
      'FILE_TOO_LARGE',
      { size: file.size, max: MAX_FILE_SIZE }
    )
  }
  if (file.type !== ALLOWED_MIME) {
    throw new CVUploadServiceError(
      'Apenas arquivos PDF são aceitos',
      'INVALID_MIME',
      { mime: file.type, allowed: ALLOWED_MIME }
    )
  }
}

/**
 * Upload CV to the private `curriculos` bucket.
 *
 * Path schema: `{authUid}/{uuid}.pdf` — fresh UUID per call. Never
 * overwrites; old CVs must be removed via `removeCV(path)` explicitly.
 *
 * @param file - The PDF File object selected by the user.
 * @param authUid - The authenticated user's UID (NOT candidato_id).
 *   Required because storage RLS policies match on
 *   `(storage.foldername(name))[1] = auth.uid()::text` (Plan 04-01 / D-10).
 * @returns `{ path, publicUrl: '', size, name }` — persist `path` only.
 * @throws {CVUploadServiceError} mapped from Supabase Storage error class:
 *   - `FILE_TOO_LARGE` for `payload too large` / `exceeded` substrings
 *   - `INVALID_MIME` for `mime` substring
 *   - `STORAGE_QUOTA` for `quota` substring
 *   - `UNAUTHORIZED` for `jwt` / `unauthorized` substrings
 *   - `UPLOAD_FAILED` for any other error (default)
 */
export async function uploadCV(
  file: File,
  authUid: string
): Promise<UploadCVResult> {
  // Throws synchronously if validation fails — caller catches before await.
  validateCV(file)

  // Pitfall 7 redacted log — { sizeKb, mime } only. NO filename, NO path.
  console.log('[CV] upload invoked', {
    sizeKb: Math.round(file.size / 1024),
    mime: file.type,
    hasFile: Boolean(file),
  })

  const uuid = crypto.randomUUID()
  const path = `${authUid}/${uuid}.pdf`

  // Pitfall 3 (this-detached supabase): always invoke through the chain.
  // NEVER `const upload = supabase.storage.from('curriculos').upload`.
  const { data, error } = await supabase.storage.from('curriculos').upload(path, file, {
    contentType: ALLOWED_MIME,
    upsert: false, // never overwrite — fresh UUID per call
  })

  if (error) {
    const msg = (error.message || '').toLowerCase()
    // Map common Supabase Storage errors to typed codes.
    if (msg.includes('payload too large') || msg.includes('exceeded')) {
      throw new CVUploadServiceError(
        'Currículo excede limite de 5 MB',
        'FILE_TOO_LARGE',
        error
      )
    }
    if (msg.includes('mime')) {
      throw new CVUploadServiceError('Formato inválido', 'INVALID_MIME', error)
    }
    if (msg.includes('quota')) {
      throw new CVUploadServiceError(
        'Limite de armazenamento atingido',
        'STORAGE_QUOTA',
        error
      )
    }
    if (msg.includes('jwt') || msg.includes('unauthorized')) {
      throw new CVUploadServiceError('Sessão expirada', 'UNAUTHORIZED', error)
    }
    throw new CVUploadServiceError(
      'Falha ao enviar currículo',
      'UPLOAD_FAILED',
      error
    )
  }

  return {
    path: data.path,
    publicUrl: '', // bucket is private; signed URL on-demand via getSignedUrl
    size: file.size,
    name: file.name,
  }
}

/**
 * Fetch a signed URL for a candidate CV via the `get-curriculo-url` Edge Function.
 *
 * Phase 32 / SEG-01: the client NO LONGER signs the private `curriculos` bucket
 * itself. The Edge Function (service_role) is the SINGLE privileged signer — it
 * authenticates the RH JWT, authorizes role + vaga ownership (vagas.created_by;
 * administrador bypasses), resolves `curriculo_url` server-side from the
 * `candidatura_id`, and mints a 60s signed URL. Migration A drops the role-only
 * Storage read branch so no RH can read a CV outside their owned vagas, and the
 * `candidatura_id` input can never be a forged storage path.
 *
 * SECURITY NOTE: NEVER log the returned signed URL — Pitfall 7 forbids this.
 * The static grep guard scans for `signedurl`/`signed_url`/`?token=` in any
 * `console.*` call within Phase 4 surfaces.
 *
 * @param candidaturaId - The candidatura whose CV to sign. NOT a storage path —
 *   the EF resolves `curriculo_url` server-side (a client path is forgeable).
 * @returns Signed URL string (60s TTL, minted by the EF).
 * @throws {CVUploadServiceError} `UPLOAD_FAILED` on any EF error or empty response.
 */
export async function getSignedUrl(candidaturaId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-curriculo-url', {
    body: { candidatura_id: candidaturaId },
  })

  if (error || !data?.signedUrl) {
    throw new CVUploadServiceError(
      'Não foi possível gerar URL de download',
      'UPLOAD_FAILED',
      error ?? data
    )
  }
  // DO NOT log data.signedUrl — Pitfall 7
  return data.signedUrl as string
}

/**
 * Remove a CV from storage.
 *
 * Used by candidate self-service (re-upload replaces) or by RH cleanup.
 *
 * @param path - Stable storage path to delete.
 * @throws {CVUploadServiceError} `UPLOAD_FAILED` on any storage error.
 */
export async function removeCV(path: string): Promise<void> {
  const { error } = await supabase.storage.from('curriculos').remove([path])
  if (error) {
    throw new CVUploadServiceError(
      'Não foi possível remover currículo',
      'UPLOAD_FAILED',
      error
    )
  }
}
