/**
 * Phase 30 / Plan 30-05 — AvatarUpload (PERFIL-03).
 *
 * The circular avatar block of the "Meu Perfil RH" page: a signed-URL preview (fallback =
 * initials disc), a REAL focusable `<button>` "Alterar foto" that triggers a visually-hidden
 * but labeled `<input type=file>`, an uploading spinner + `aria-live="polite"` status, and the
 * honest helper "PNG, JPG ou WebP, até 2 MB." (exactly what the bucket enforces).
 *
 * WARNING #3 (avatar-only save must NOT blank nome): this component ONLY uploads and bubbles
 * the returned storage PATH up via `onUploaded`. Persistence flows through PerfilSection's
 * `atualizarPerfil({ nome: <loaded/edited nome>, avatarPath })`, so the unconditional RPC SET
 * on `p_nome` never receives a null/blank nome.
 *
 * Pitfall-7: the signed URL is used ONLY as an `<img src>` — never logged.
 *
 * @module features/perfil-rh/components/AvatarUpload
 * @see src/features/perfil-rh/services/perfilRhService.ts (validateAvatar / getAvatarSignedUrl)
 * @see src/features/perfil-rh/hooks/usePerfilRh.ts (useUploadAvatar — returns ONLY the path)
 */
import { useRef, useState, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  validateAvatar,
  getAvatarSignedUrl,
  PerfilRhServiceError,
} from '../services/perfilRhService'
import { useUploadAvatar } from '../hooks/usePerfilRh'

export interface AvatarUploadProps {
  /** The currently-known stored avatar path (`usuarios_rh.avatar_url`) — signed for preview. */
  avatarPath: string | null
  /** The display name — used for the `alt` text + the initials fallback. */
  nome: string
  /** Bubbles the freshly-uploaded storage PATH up to PerfilSection (persisted via atualizarPerfil). */
  onUploaded: (path: string) => void
}

export function AvatarUpload({ avatarPath, nome, onUploaded }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const upload = useUploadAvatar()

  // Sign the stored path for the circular preview (staleTime < the 1h expiry). NEVER logged.
  const { data: signedUrl } = useQuery({
    queryKey: ['avatar-signed', avatarPath],
    queryFn: () => getAvatarSignedUrl(avatarPath as string),
    enabled: !!avatarPath,
    staleTime: 55 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

  const initial = (nome?.trim()?.charAt(0) || 'U').toUpperCase()

  const handlePick = () => inputRef.current?.click()

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setInlineError(null)
    const file = e.target.files?.[0]
    // Reset the input so re-selecting the same file re-triggers change.
    e.target.value = ''
    if (!file) return

    // Client-side validation BEFORE upload → inline field error on FILE_TOO_LARGE / INVALID_MIME.
    try {
      validateAvatar(file)
    } catch (err) {
      const msg =
        err instanceof PerfilRhServiceError ? err.message : 'Não foi possível usar esta imagem.'
      setInlineError(msg)
      return
    }

    try {
      const path = await upload.mutateAsync(file)
      onUploaded(path)
    } catch (err) {
      const msg =
        err instanceof PerfilRhServiceError ? err.message : 'Falha ao enviar a imagem.'
      toast.error(msg)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Circular preview: signed <img> when present, else the initials disc. */}
      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#35BFAD] shadow-lg shadow-[#35BFAD]/30">
        {signedUrl ? (
          <img
            src={signedUrl}
            alt={`Foto de perfil de ${nome}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-2xl font-semibold text-white" aria-hidden="true">
            {initial}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <button
          type="button"
          onClick={handlePick}
          disabled={upload.isPending}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
        >
          {upload.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Enviando…
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" aria-hidden="true" />
              Alterar foto
            </>
          )}
        </button>

        {/* Visually-hidden but focusable + labeled file input. */}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Selecionar foto de perfil"
          className="sr-only"
          onChange={handleChange}
        />

        <p className="text-xs text-white/60">PNG, JPG ou WebP, até 2 MB.</p>

        {upload.isPending && (
          <p role="status" aria-live="polite" className="sr-only">
            Enviando…
          </p>
        )}

        {inlineError && (
          <p role="alert" aria-live="assertive" className="text-sm text-red-400">
            {inlineError}
          </p>
        )}
      </div>
    </div>
  )
}
