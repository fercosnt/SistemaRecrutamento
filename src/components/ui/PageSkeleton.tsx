/**
 * PageSkeleton — the single branded glass Suspense fallback for lazy routes (PERF-03).
 *
 * Reuses the `AsyncState` loading idiom (`<Skeleton className="… bg-white/5" />`
 * inside a dark glass surface + an optional centered `Loader2` spinner) so the
 * fallback matches the Beauty Smile brand and there is NO blank flash while a
 * lazy `/rh/*` or `/admin/*` route chunk resolves (CONTEXT Área 1 — "spinner glass
 * de marca, sem flash em branco"; Claude's Discretion to reuse the AsyncState skeleton).
 *
 * Self-contained: no data, no hooks, no props — it is purely the `<Suspense fallback>`
 * surface. Wired into `RootLayout`'s `<Suspense>` boundary in Plan 19-02.
 *
 * React caches the resolved chunk Promise, so a re-visited lazy route renders
 * instantly with no fallback flash (react.dev).
 *
 * @module components/ui/PageSkeleton
 * @see src/components/ui/AsyncState.tsx (loading branch L161-173 + glass surface L210-216 — the analog)
 * @see .planning/phases/19-performance-bundle-cache/19-RESEARCH.md (Pattern 3)
 */
import { Loader2 } from 'lucide-react'
import { Glass } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'

export function PageSkeleton() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Glass variant="dark" blur="lg" className="w-full max-w-2xl rounded-xl p-6">
        <div className="space-y-3">
          <Skeleton className="h-24 w-full bg-white/5" />
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/70" aria-hidden="true" />
            <p className="text-sm text-white/70">Carregando…</p>
          </div>
        </div>
      </Glass>
    </div>
  )
}
