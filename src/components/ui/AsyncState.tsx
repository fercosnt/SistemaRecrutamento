/**
 * AsyncState — the single graceful-degradation wrapper for AI-backed read regions (RESIL-03).
 *
 * Generalizes the `HubSection` async-state pattern + the `ConsolidacaoDashboard` retry exemplar
 * into ONE presentational contract (18-UI-SPEC §States Contract). It maps a TanStack-Query-shaped
 * result (`isLoading | isPending`, `isError`, `error`) + an optional emptiness predicate to exactly
 * ONE of five states, rendered in strict priority order:
 *
 *   1. loading   → skeleton (mirrors HubSection `<Skeleton className="… bg-white/5" />`), < slowAfterMs
 *   2. slow      → timed escalation of loading (still pending past slowAfterMs, default 8000ms):
 *                  skeleton + Loader2 spinner + "Estamos processando com IA…". NEVER replaces a
 *                  resolved success/error — it is a loading sub-state only.
 *   3. error     → AlertTriangle (text-red-300 signal, never a fill) + heading + body chosen by
 *                  `errorCode` (AI_UNAVAILABLE → sobrecarga copy; else generic) + standardized retry.
 *   4. empty     → caller's `isEmpty` predicate true → centered heading + body, no fabricated data.
 *   5. success   → render `children`.
 *
 * State-driver rule (binding, 18-UI-SPEC): isLoading||isPending → slow → isError → isEmpty → children.
 *
 * SECURITY (T-18-04-ID): the error state renders ONLY static verbatim PT-BR copy keyed off the
 * `errorCode` string — it NEVER parses, echoes, or renders the raw transport/Supabase error, stack,
 * or any PII. The service layer (Plan 05) extracts only the body's `error_code` into `errorCode`.
 *
 * All copy is single-sourced in one `COPY` const (the no-drift guarantee — same as HubSection.COPY).
 *
 * @module components/ui/AsyncState
 * @see src/features/hub-candidato/components/HubSection.tsx (base pattern — generalized here)
 * @see src/features/decisao/components/ConsolidacaoDashboard.tsx (retry exemplar — L102-111)
 * @see .planning/phases/18-resili-ncia-das-efs-de-ia-bugs-do-funil/18-UI-SPEC.md (binding contract)
 */
import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'
import { Glass, GlassButton } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'

/** Error-code that selects the AI-overload copy; any other value → generic copy. */
export const AI_UNAVAILABLE = 'AI_UNAVAILABLE'

/** Shape of the overridable copy slots — callers may override a subset via the `copy` prop. */
export interface AsyncStateCopy {
  slow: { heading: string; body: string }
  error: { heading: string; overload: string; generic: string }
  empty: { heading: string; body: string }
  retry: { label: string; inflight: string }
}

/**
 * Verbatim PT-BR copy (18-UI-SPEC §Copywriting Contract) — single source so the strings
 * never drift between AsyncState and its delegating consumers (e.g. HubSection).
 */
const COPY: AsyncStateCopy = {
  slow: {
    heading: 'Estamos processando com IA…',
    body: 'Isso pode levar até ~30 segundos. Não feche esta tela.',
  },
  error: {
    heading: 'Não foi possível concluir agora.',
    // errorCode === 'AI_UNAVAILABLE'
    overload: 'O serviço de IA está sobrecarregado. Tente novamente em instantes.',
    // any other error
    generic: 'Verifique a conexão e tente novamente.',
  },
  empty: {
    heading: 'Nada para mostrar ainda',
    body: 'Os dados desta etapa aparecerão aqui quando estiverem disponíveis.',
  },
  retry: {
    label: 'Tentar novamente',
    inflight: 'Tentando…',
  },
} as const

export interface AsyncStateProps {
  /** TanStack `isLoading` — takes precedence over every other state. */
  isLoading?: boolean
  /** TanStack `isPending` — treated identically to `isLoading`. */
  isPending?: boolean
  /** Read/invoke failed → error state. Takes precedence over `isEmpty`. */
  isError?: boolean
  /** Caller emptiness predicate (e.g. `!data?.items.length`). */
  isEmpty?: boolean
  /** `'AI_UNAVAILABLE'` → sobrecarga copy; any other value → generic copy. */
  errorCode?: string
  /** Milliseconds before the loading state escalates to the slow note. */
  slowAfterMs?: number
  /** Retry handler — wired in the error state ONLY. */
  onRetry?: () => void
  /** While true the retry button shows "Tentando…" and is disabled (no double-submit). */
  retrying?: boolean
  /** Wrap the state surface in `<Glass variant="dark">`; default true. */
  glass?: boolean
  /** Per-call copy overrides merged over the verbatim defaults (e.g. HubSection futuro/sem_dados). */
  copy?: Partial<AsyncStateCopy>
  /** Success content. */
  children?: ReactNode
}

/** Centered empty/error text block — HubSection.EstadoVazio typography (no fabricated data). */
function EstadoVazio({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <p className="text-base font-semibold text-white md:text-lg">{heading}</p>
      <p className="max-w-md text-sm text-white/70">{body}</p>
    </div>
  )
}

/** Merge a partial copy override over the defaults, slot by slot (shallow per-slot). */
function mergeCopy(override?: Partial<AsyncStateCopy>): AsyncStateCopy {
  if (!override) return COPY
  return {
    slow: { ...COPY.slow, ...override.slow },
    error: { ...COPY.error, ...override.error },
    empty: { ...COPY.empty, ...override.empty },
    retry: { ...COPY.retry, ...override.retry },
  }
}

/**
 * AsyncState — renders exactly one of loading / slow / error / empty / success.
 *
 * Precedence is binding: isLoading||isPending → slow → isError → isEmpty → children.
 */
export function AsyncState({
  isLoading,
  isPending,
  isError,
  isEmpty,
  errorCode,
  slowAfterMs = 8000,
  onRetry,
  retrying,
  glass = true,
  copy,
  children,
}: AsyncStateProps) {
  const loading = Boolean(isLoading || isPending)
  const [isSlow, setIsSlow] = useState(false)
  const text = mergeCopy(copy)

  // Slow-state timer: escalate loading → slow after `slowAfterMs` while still pending.
  // Resets whenever loading resolves (or the threshold changes) so it NEVER replaces a
  // resolved success/error state. Cleared on unmount.
  useEffect(() => {
    if (!loading) {
      setIsSlow(false)
      return
    }
    setIsSlow(false)
    const id = setTimeout(() => setIsSlow(true), slowAfterMs)
    return () => clearTimeout(id)
  }, [loading, slowAfterMs])

  let content: ReactNode

  if (loading) {
    content = (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full bg-white/5" />
        {isSlow ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/70" aria-hidden="true" />
            <p className="text-base font-semibold text-white">{text.slow.heading}</p>
            <p className="max-w-md text-sm text-white/70">{text.slow.body}</p>
          </div>
        ) : null}
      </div>
    )
  } else if (isError) {
    const body = errorCode === AI_UNAVAILABLE ? text.error.overload : text.error.generic
    content = (
      <div className="flex flex-col items-center gap-3 p-12 text-center text-white/80">
        <AlertTriangle className="h-8 w-8 text-red-300" aria-hidden="true" />
        <p className="text-base font-semibold text-white md:text-lg">{text.error.heading}</p>
        <p className="max-w-md text-sm text-white/70">{body}</p>
        {onRetry ? (
          <GlassButton
            variant="white"
            hover
            onClick={onRetry}
            disabled={retrying}
            className="min-h-[44px]"
          >
            {retrying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {text.retry.inflight}
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {text.retry.label}
              </>
            )}
          </GlassButton>
        ) : null}
      </div>
    )
  } else if (isEmpty) {
    content = <EstadoVazio heading={text.empty.heading} body={text.empty.body} />
  } else {
    content = children
  }

  if (glass) {
    return (
      <Glass variant="dark" blur="lg" className="rounded-xl p-6">
        {content}
      </Glass>
    )
  }

  return <>{content}</>
}
