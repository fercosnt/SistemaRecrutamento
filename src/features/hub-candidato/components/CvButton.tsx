/**
 * CvButton — imperative "open the candidate CV" button (VISRH-01).
 *
 * The ONLY privileged CV path is the P32 `get-curriculo-url` EF (authenticate-THEN-
 * authorize, owner/admin, 60s-TTL signed URL). This button calls
 * `cvUploadService.getSignedUrl(candidaturaId)` on click and opens the URL immediately
 * with `window.open(url,'_blank')`. The signed URL is NEVER stored in component state
 * or a query cache and is NEVER passed to any `console.*` (Pitfall 7) — only a boolean
 * loading/error flag lives in state. The client passes only `candidaturaId` (never a
 * storage path — the EF resolves `curriculo_url` server-side, so a forged path is
 * impossible; CV IDOR is enforced server-side, T-34-02-04).
 *
 * @module features/hub-candidato/components/CvButton
 * @see src/features/vagas/services/cvUploadService.ts (getSignedUrl — the shipped signer)
 * @see .planning/phases/34-.../34-UI-SPEC.md (§CV block copy + §Accessibility aria-busy)
 */
import { useState } from 'react'
import { FileText } from 'lucide-react'
import { getSignedUrl } from '@/features/vagas/services/cvUploadService'

export interface CvButtonProps {
  /** The candidatura whose CV to open (the `:id` route param — Pitfall 8). */
  candidaturaId: string
}

export function CvButton({ candidaturaId }: CvButtonProps) {
  // ONLY boolean flags — the signed URL is NEVER stored (Pitfall 7).
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function handleOpen() {
    if (loading) return
    setLoading(true)
    setError(false)
    try {
      const url = await getSignedUrl(candidaturaId)
      // Open immediately; do not keep the URL around, do not log it (Pitfall 7).
      window.open(url, '_blank')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        aria-busy={loading}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60"
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        {loading ? 'Abrindo…' : 'Abrir currículo'}
      </button>
      {error ? (
        <p className="text-sm text-red-300" aria-live="polite">
          Não foi possível abrir o currículo. Tente novamente em instantes.
        </p>
      ) : null}
    </div>
  )
}
