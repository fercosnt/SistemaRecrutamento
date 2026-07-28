# Phase 19: Performance — Bundle & Cache - Pattern Map

**Mapped:** 2026-06-29
**Files analyzed:** 13 (8 modify, 5 new)
**Analogs found:** 11 / 13 (2 net-new conventions with no in-repo analog: `lazyNamed` + build-output assertion)

This phase establishes the project's **first** lazy-loading + manualChunks conventions (RESEARCH §Summary: "zero existing React.lazy/Suspense/dynamic-import usage"), so several patterns are copied from RESEARCH Code Examples rather than from an in-repo analog. Where an in-repo analog exists, it is preferred (CLAUDE.md conventions: named exports, `@/` alias, hierarchical query keys, mutation `onSuccess` invalidation).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/router/routes.tsx` (MODIFY) | route config | request-response (route resolution) | itself — current static `import` route block (L10–77, L282–459) | exact (self) |
| `src/router/lazyNamed.ts` (NEW) | utility | transform (named-export → `{default}`) | none in repo — RESEARCH Pattern 2; co-locate beside `routes.tsx` | no analog (new convention) |
| `src/components/ui/PageSkeleton.tsx` (NEW) | component | request-response (Suspense fallback) | `src/components/ui/AsyncState.tsx` loading branch (L161–173) + `HubSection` glass surface | role-match (skeleton/glass) |
| `src/App.tsx` (MODIFY — RootLayout `<Suspense>` + QueryClient ref) | provider/layout + config | request-response | itself — `RootLayout` return (L219–225) + `queryClient` defaults (L36–45) | exact (self) |
| `vite.config.ts` (MODIFY — build block) | config | batch (build-time chunking) | itself — current `build` block (L111–114) + `resolve.alias` (L62–109) | exact (self) |
| `src/features/triagem/components/ComparativoScreen.tsx` (MODIFY — dynamic import) | component | event-driven (click → `import()`) | itself — `handleExport` (L119–131) + top-level import (L33–37) | exact (self) |
| `src/features/entrevista/hooks/useEntrevistaScorecard.ts` (MODIFY — add vagaId + invalidate) | hook | CRUD (mutation invalidation) | itself L151–159 + sibling `useGuiaEntrevista` (L83–88) + `useRedacaoRevisao` (L54–67) | exact (self) |
| `src/features/entrevista/components/EntrevistaWorkspace.tsx` (MODIFY — pass vagaId) | component | request-response | itself — hook call L87 (`vagaId` already at L68) | exact (self) |
| `src/features/triagem/hooks/useRedacaoRevisao.ts` (MODIFY — thread candidaturaId) | hook | CRUD (mutation invalidation) | itself L54–67 + `useEntrevistaScorecard` mutation variables shape | exact (self) |
| `src/features/triagem/components/RedacaoReviewPanel.tsx` (MODIFY — pass candidatura_id) | component | request-response | itself — `handleSalvar` L184–198 | exact (self) |
| `src/features/vagas/hooks/useCandidaturas.ts` (MODIFY — refetchOnWindowFocus) | hook | CRUD (read freshness) | itself — `useCandidaturas` L102–117 (staleTime 1min already) | exact (self) |
| `src/router/__tests__/lazyNamed.test.tsx` (NEW) | test | unit | `src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts` (renderHook + fresh QueryClient) + `routes.nav.test.tsx` | role-match |
| `src/features/{entrevista,triagem}/hooks/__tests__/*.test.ts` (NEW ×2) | test | unit (invalidateQueries spy) | `useVagaPerguntas.test.ts` (renderHook + per-test QueryClient) — **no existing invalidateQueries-spy test in repo** | role-match (partial) |
| chunk-assertion mechanism (NEW — `scripts/assert-chunks.mjs` OR CI grep) | test/script | batch (parse build output) | `scripts/__tests__/sync-prompts.test.ts` (node/deno script-shaped test) | partial (script test, not build-output) |

## Pattern Assignments

### `src/router/lazyNamed.ts` (NEW — utility, transform)

**Analog:** NONE in repo (first lazy-loading helper). Copy verbatim from RESEARCH Pattern 2 (L205–211). Co-locate beside `routes.tsx` per RESEARCH structure (L143). Named export (CLAUDE.md — never default).

```typescript
// src/router/lazyNamed.ts
import { lazy, type ComponentType } from 'react'

/**
 * React.lazy requires a module whose `.default` is the component. The project
 * uses NAMED exports only (CLAUDE.md), so wrap the loader to remap the named
 * export onto `default`. Declared at module top level (NEVER inside render).
 */
export function lazyNamed<T extends Record<string, ComponentType<any>>>(
  loader: () => Promise<T>,
  name: keyof T,
) {
  return lazy(() => loader().then((m) => ({ default: m[name] })))
}
```

> Anti-pattern (RESEARCH L270, L273): `React.lazy` WITHOUT the adapter renders `undefined` (blank route); declaring `lazy(...)` inside a component resets state every render. `lazyNamed` is called once at module scope in `routes.tsx`.

---

### `src/router/routes.tsx` (MODIFY — route config, request-response)

**Analog:** itself. The current file uses 100% static imports (L10–77) and one `RouteObject` per route with `element: <RoleGuard ...><Page /></RoleGuard>`.

**Current eager-import block to PRESERVE (candidate + auth + public routes):** `routes.tsx:11–43` — `LandingPage`, `VagasPublicasPage`, `VagaDetalhePage`, `ManifestoPage`, auth pages (L17–21), candidate pages (L24–27), and the **avaliação barrel** (L36–43: `AvaliacaoContainer`, `SjtMultiplaEscolhaScreen`, `SjtCasoAbertoScreen`, `BigFiveQuestionnaireScreen`, `DevolutivaBigFiveView`, `RedacaoEditorScreen`) + `ProvaCognitivaScreen` (L65) + `ExplicacaoCandidatoPage` (L73, candidate route L271). These stay STATIC (CONTEXT: candidate flows eager for first-paint).

**RH/admin static imports to CONVERT to `lazyNamed` (`routes.tsx:46–74`):**
- `DashboardRHPage`, `CandidatosRHPage`, `PerfilCandidatoRHPage`, `VagasRHPage`, `VagaCandidatosRHPage`, `ComparativoCandidatosPage`, `CriarEditarVagaPage`, `ConfiguracoesPage`, `MeuPerfilPage`, `SuporteRHPage`, `RelatoriosRHPage` (L46–56)
- `RedacaoReviewPanel` (L59), `EntrevistaWorkspace` (L62), `DecisaoFinalPage` (L72)
- Admin: `AiLogsPage`, `PromptVersionsPage`, `AiCostsPage` (L68–70), `BiasAuditPage` (L74)

**Conversion pattern (RESEARCH Pattern 2, L213–219) — replace each static import with a top-level `lazyNamed`, keep the `element` wrapping IDENTICAL:**

```tsx
import { lazyNamed } from './lazyNamed'
const DashboardRHPage = lazyNamed(() => import('../components/pages/DashboardRHPage'), 'DashboardRHPage')
const AiCostsPage     = lazyNamed(() => import('../features/admin/ai-costs/components/AiCostsPage'), 'AiCostsPage')
// ...one per /rh/* + /admin/* page.
```

**SECURITY-CRITICAL — RoleGuard stays OUTSIDE the lazy element, verbatim (RESEARCH §Security V4 L485, current `routes.tsx:282–289`):**

```tsx
{ path: '/rh/dashboard',
  element: (
    <RoleGuard role={['rh', 'administrador']}>
      <DashboardRHPage />        {/* now a lazy component; RoleGuard unchanged */}
    </RoleGuard>
  ) },
```

> Note: `/rh/candidato/:id` (L313–315) uses `<RedirectToHub />` (a local component, NOT a page) — leave it eager. The catch-all `*` → `NotFoundPage` (L466–469) and `RedirectToHub` (L94–97) are tiny/eager. `ConfiguracoesPage` (L399–405) and admin routes keep `role="administrador"`.

---

### `src/components/ui/PageSkeleton.tsx` (NEW — component, Suspense fallback)

**Analog:** `src/components/ui/AsyncState.tsx` loading branch (L161–173) + glass surface (L210–216). Reuse the SAME `Skeleton`/`Glass` primitives and `bg-white/5` glass token so the fallback matches the brand (CONTEXT: "spinner glass de marca", Claude's Discretion on exact form).

**Imports to copy (`AsyncState.tsx:33–34`):**
```typescript
import { Glass } from '@/components/ui/glass'   // export at glass.tsx:45
import { Skeleton } from '@/components/ui/skeleton' // export at skeleton.tsx:13
```

**Skeleton + glass surface pattern to copy (`AsyncState.tsx:162–173, 210–216`):**
```tsx
// loading skeleton (AsyncState L162-173):
<div className="space-y-3">
  <Skeleton className="h-24 w-full bg-white/5" />
</div>
// wrapped in the dark glass surface (AsyncState L211-215):
<Glass variant="dark" blur="lg" className="rounded-xl p-6">
  {/* skeleton */}
</Glass>
```

> Named export `export function PageSkeleton()` (CLAUDE.md). Anchor decision (RESEARCH Pattern 3): a SINGLE `<Suspense fallback={<PageSkeleton/>}>` in `RootLayout` covers all lazy routes. Optional `Loader2` spinner: copy `AsyncState.tsx:167` (`<Loader2 className="h-6 w-6 animate-spin text-white/70" />`, import from `lucide-react`).

---

### `src/App.tsx` (MODIFY — RootLayout `<Suspense>` + QueryClient defaults)

**Analog:** itself.

**Current RootLayout return to wrap (`App.tsx:219–225`):**
```tsx
return (
  <>
    <Outlet />
    {import.meta.env.DEV && <DevNavigationMenu />}
    <Toaster position="top-right" />
  </>
)
```

**New return (RESEARCH Pattern 3, L228–239) — wrap `<Outlet/>` in `<Suspense>`:**
```tsx
import { Suspense } from 'react'   // add to the existing 'react' import (App.tsx:19)
import { PageSkeleton } from './components/ui/PageSkeleton'
// ...
return (
  <>
    <Suspense fallback={<PageSkeleton />}>
      <Outlet />
    </Suspense>
    {import.meta.env.DEV && <DevNavigationMenu />}
    <Toaster position="top-right" />
  </>
)
```

**QueryClient defaults reference (`App.tsx:36–45`) — DO NOT flip the global `refetchOnWindowFocus: false` (L42).** It stays the project-wide default; freshness is applied per-query in `useCandidaturas` (RESEARCH Pitfall 5, Anti-Pattern L272 — flipping the global refetches expensive RH/AI reads).

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,  // KEEP global false (App.tsx:42)
    },
  },
})
```

---

### `vite.config.ts` (MODIFY — build block, batch chunking)

**Analog:** itself — current `build` block (L111–114) + `resolve.alias` (L62–109, which dedupes radix/recharts — ORTHOGONAL to manualChunks per CONTEXT L78).

**Current build block to extend (`vite.config.ts:111–114`):**
```typescript
build: {
  target: 'esnext',
  outDir: 'build',
},
```

**New build block (RESEARCH Pattern 1, L165–186) — add `rollupOptions.output.manualChunks`, narrow react-vendor:**
```typescript
build: {
  target: 'esnext',
  outDir: 'build',
  rollupOptions: {
    output: {
      manualChunks(id: string) {
        if (
          id.includes('node_modules/react/') ||
          id.includes('node_modules/react-dom/') ||
          id.includes('node_modules/react-router') ||
          id.includes('node_modules/scheduler/')
        ) {
          return 'react-vendor'
        }
        // return undefined → Rollup auto-chunks lazy routes + @radix-ui
      },
    },
  },
},
```

> Anti-pattern (RESEARCH Pitfall 1, Anti-Pattern L269): a BROAD `if id.includes('node_modules') return 'vendor'` re-triggers the "Cannot access X before initialization" circular-init blank-screen (prod-only). Keep react+react-dom+react-router+scheduler together; leave `@radix-ui` to auto-chunking (it's used by both eager candidate UI and lazy RH UI — A2). Verify by loading the BUILT output, not just dev.

---

### `src/features/triagem/components/ComparativoScreen.tsx` (MODIFY — dynamic import, event-driven)

**Analog:** itself — `handleExport` (L119–131) + top-level value import (L33–37).

**Current top-level import to change (`ComparativoScreen.tsx:33–37`):**
```tsx
import {
  exportComparativo,
  type ComparativeRankingView,
  type RankedCandidate,
} from '../pdf/exportComparativo'
```

**Current click handler (`ComparativoScreen.tsx:119–131`):**
```tsx
const handleExport = () => {
  setIsGenerating(true)
  try {
    exportComparativo(candidates)
    toast.success('PDF exportado.')
  } catch { toast.error('Não foi possível gerar o PDF. Tente novamente.') }
  finally { setIsGenerating(false) }
}
```

**Change (RESEARCH Pitfall 3 L300–304 + Code Example L353–363): keep ONLY the `type` imports at top level; `await import()` the VALUE inside the handler (make it `async`):**
```tsx
// top-level — VALUE import removed, types kept (types erase at build):
import type { ComparativeRankingView, RankedCandidate } from '../pdf/exportComparativo'

const handleExport = async () => {
  setIsGenerating(true)
  try {
    const { exportComparativo } = await import('../pdf/exportComparativo')
    exportComparativo(candidates)
    toast.success('PDF exportado.')
  } catch { toast.error('Não foi possível gerar o PDF. Tente novamente.') }
  finally { setIsGenerating(false) }
}
```

> `exportComparativo.ts` itself is UNCHANGED (its static `import { jsPDF } from 'jspdf'` at L16–17 is now reachable only through the dynamic boundary → Rollup emits jspdf+autotable in a separate async chunk). Pitfall 3: a SINGLE remaining top-level value import anywhere in the eager graph keeps jsPDF in the main chunk — verify `DecisaoFinalPage.tsx` (the other `exportComparativo` referencer at `src/features/decisao/components/DecisaoFinalPage.tsx`) imports ONLY the `RankedCandidate` type (RESEARCH L303 says it already does — confirm during impl).

---

### `src/features/entrevista/hooks/useEntrevistaScorecard.ts` (MODIFY — hook, CRUD invalidation) [Gap A]

**Analog:** itself L135–162 + the sibling `useGuiaEntrevista` (L66–91) which already takes `vagaId` and invalidates on success.

**`decisaoKeys.consolidacao` signature (CONFIRMED `useConsolidacao.ts:21–22`):** `(candidaturaId: string, vagaId: string) => [...decisaoKeys.all, 'consolidacao', candidaturaId, vagaId]`. Import: `import { decisaoKeys } from '@/features/decisao/hooks/useConsolidacao'`.

**Current hook signature + mutation (`useEntrevistaScorecard.ts:135–159`):**
```typescript
export function useEntrevistaScorecard(
  candidaturaId: string | undefined,
  options?: Omit<UseQueryOptions<EntrevistaScoreRow[], Error>, 'queryKey' | 'queryFn'>,
) {
  const queryClient = useQueryClient()
  const query = useQuery({ /* ...scorecard(candidaturaId) ... */ })
  const salvar = useMutation({
    mutationFn: (payload: SalvarAvaliacaoPayload) => salvarAvaliacao(candidaturaId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entrevistaKeys.scorecard(candidaturaId || '') })
    },
  })
  return { ...query, salvarAvaliacao: salvar }
}
```

**Fix (RESEARCH Pattern 4 L250–265 + Code Example L322–329): add `vagaId` param, add targeted invalidation:**
```typescript
import { decisaoKeys } from '@/features/decisao/hooks/useConsolidacao'

export function useEntrevistaScorecard(
  candidaturaId: string | undefined,
  vagaId: string | undefined,        // ← NEW
  options?: Omit<UseQueryOptions<EntrevistaScoreRow[], Error>, 'queryKey' | 'queryFn'>,
) {
  // ...
  const salvar = useMutation({
    mutationFn: (payload: SalvarAvaliacaoPayload) => salvarAvaliacao(candidaturaId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entrevistaKeys.scorecard(candidaturaId || '') })
      if (candidaturaId && vagaId) {   // ← NEW targeted, NOT broad
        queryClient.invalidateQueries({ queryKey: decisaoKeys.consolidacao(candidaturaId, vagaId) })
      }
    },
  })
}
```

> Anti-pattern (RESEARCH L271): a broad `decisaoKeys.all` invalidation is forbidden — CONTEXT says ALVO (targeted). The `vagaId` param is positional and inserted BEFORE `options` — update the call site (next file).

---

### `src/features/entrevista/components/EntrevistaWorkspace.tsx` (MODIFY — pass vagaId)

**Analog:** itself — `vagaId` is ALREADY computed at `EntrevistaWorkspace.tsx:68` (`const vagaId = contexto?.vaga_id`) and passed to `useGuiaEntrevista(candidaturaId, vagaId)` at L74.

**Current call (`EntrevistaWorkspace.tsx:83–87`):**
```tsx
const { data: scores, isLoading: loadingScores, salvarAvaliacao } =
  useEntrevistaScorecard(candidaturaId)
```

**Fix — thread the already-available `vagaId` (mirrors the L74 `useGuiaEntrevista` call):**
```tsx
const { data: scores, isLoading: loadingScores, salvarAvaliacao } =
  useEntrevistaScorecard(candidaturaId, vagaId)
```

> `handleSalvarAvaliacao` (L91–96) and the `<...onSalvar={handleSalvarAvaliacao}/>` wiring (L186) are UNCHANGED — only the hook arg changes.

---

### `src/features/triagem/hooks/useRedacaoRevisao.ts` (MODIFY — hook, CRUD invalidation) [Gap B]

**Analog:** itself L38–70. The hook has `vagaId` (queue is per-vaga); the per-essay `candidatura_id` lives on each row (`RedacaoReviewRow.candidatura_id`, CONFIRMED `revisaoRedacaoService.ts:60`) and must be threaded through the mutation VARIABLES.

**Current mutation (`useRedacaoRevisao.ts:54–67`):**
```typescript
const salvar = useMutation({
  mutationFn: ({ redacaoId, payload }: { redacaoId: string; payload: SalvarRevisaoPayload }) =>
    salvarRevisao(redacaoId, payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: redacaoRevisaoKeys.queue(vagaId || '') })
    queryClient.invalidateQueries({ queryKey: redacaoRevisaoKeys.duvidas() })
  },
})
```

**Fix (RESEARCH Code Example L336–349): add `candidaturaId` to the mutation variables; use `onSuccess: (_d, vars)` to read it:**
```typescript
import { decisaoKeys } from '@/features/decisao/hooks/useConsolidacao'

const salvar = useMutation({
  mutationFn: ({ redacaoId, payload }: { redacaoId: string; candidaturaId: string; payload: SalvarRevisaoPayload }) =>
    salvarRevisao(redacaoId, payload),
  onSuccess: (_d, vars) => {
    queryClient.invalidateQueries({ queryKey: redacaoRevisaoKeys.queue(vagaId || '') })
    queryClient.invalidateQueries({ queryKey: redacaoRevisaoKeys.duvidas() })
    if (vagaId && vars.candidaturaId) {
      queryClient.invalidateQueries({ queryKey: decisaoKeys.consolidacao(vars.candidaturaId, vagaId) })
    }
  },
})
```

> The mutation `mutationFn` still calls `salvarRevisao(redacaoId, payload)` (unchanged service signature — `candidaturaId` is carried for invalidation only, not passed to the service).

---

### `src/features/triagem/components/RedacaoReviewPanel.tsx` (MODIFY — pass candidatura_id)

**Analog:** itself — `handleSalvar` (L184–198), where `selected` (`= rows.find(...)`, L176) carries `.candidatura_id` (`RedacaoReviewRow.candidatura_id`).

**Current call (`RedacaoReviewPanel.tsx:190–191`):**
```tsx
salvarRevisao.mutate(
  { redacaoId: selected.id, payload },
  { onSuccess: ..., onError: ... },
)
```

**Fix — add `candidaturaId: selected.candidatura_id` to the mutate variables (RESEARCH L349):**
```tsx
salvarRevisao.mutate(
  { redacaoId: selected.id, candidaturaId: selected.candidatura_id, payload },
  { onSuccess: ..., onError: ... },
)
```

---

### `src/features/vagas/hooks/useCandidaturas.ts` (MODIFY — read freshness)

**Analog:** itself — `useCandidaturas` (L91–117), which ALREADY has `staleTime: 1 * 60 * 1000` (L112, ≤60s ✓). It only needs `refetchOnWindowFocus: true` (it currently inherits the global `false`).

**Current query options (`useCandidaturas.ts:102–116`):**
```typescript
return useQuery({
  queryKey: candidaturasKeys.list(candidato?.id || '', filters, orderBy, pagination),
  queryFn: () => listCandidaturas(candidato!.id, filters, orderBy, pagination),
  enabled: !!candidato?.id,
  staleTime: 1 * 60 * 1000, // 1 minuto (status pode mudar)  ← ≤60s ✓
  gcTime: 5 * 60 * 1000,
  retry: 2,
  ...options,
})
```

**Fix (RESEARCH Code Example L378–385 + Pitfall 5): add per-query `refetchOnWindowFocus: true`:**
```typescript
  staleTime: 1 * 60 * 1000,
  refetchOnWindowFocus: true,   // ← per-query; ≤60s cross-client guarantee (Pitfall 5: needs BOTH)
  gcTime: 5 * 60 * 1000,
  retry: 2,
```

> Pitfall 5 (RESEARCH L312–316): `refetchOnWindowFocus` only refetches STALE queries — it needs `staleTime ≤ 60s` to fire. `useCandidaturas` pairs both. **Quick-audit task (CONTEXT L54, RESEARCH Open Q1):** also grep candidate-facing components (`DashboardCandidatoPage`, `MeuPerfilCandidatoPage`, `ExplicacaoCandidatoPage`) for any other `useQuery` reads of mutable status and apply the same pairing. Treat `useCandidaturas` as the known-required minimum (A4). Do NOT touch RH reads (`useAllCandidaturas` L135, `useVagaCandidaturas` L174) — out of scope.

---

### Test files (NEW — unit)

**Shared analog for all hook tests: `src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts`** (RESEARCH L450 cites this as the precedent). Copy its harness:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'

let queryClient: QueryClient
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
```

- **`src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts`** (Gap A) — spy on `queryClient.invalidateQueries`, assert it is called with `decisaoKeys.consolidacao(candidaturaId, vagaId)` on `salvarAvaliacao` success. `vi.spyOn(queryClient, 'invalidateQueries')` (NOTE: there is **no existing invalidateQueries-spy test in the repo** — this establishes the spy pattern; mock the `entrevistaService.salvarAvaliacao` via `vi.mock` like `useVagaPerguntas.test.ts:37–39`).
- **`src/features/triagem/hooks/__tests__/useRedacaoRevisao.test.ts`** (Gap B) — same harness; assert per-row `candidatura_id` is threaded into the `decisaoKeys.consolidacao(...)` invalidation via the mutation variables.
- **`src/router/__tests__/lazyNamed.test.tsx`** (PERF-03) — structural/render test that `lazyNamed(loader, name)` resolves the named export to the component. Analog for the structural style: `routes.nav.test.tsx` (reads the live module, asserts shape) — but this one renders behind `<Suspense>`. Use `render` + `await screen.findByText(...)`.

> File-path convention (all in-repo tests): co-located `__tests__/` folder beside the source; `*.test.ts` (hooks) / `*.test.tsx` (components); `vi.mock('@/lib/...')` + `vi.hoisted()` for SDK chains (`useVagaPerguntas.test.ts:28–39`).

### Build-output chunk assertion (NEW — PERF-03 gate)

**No build-output assertion exists in the repo.** Closest shape: `scripts/__tests__/sync-prompts.test.ts` (a script-targeting test, but it tests a TS module, not `build/` artifacts). Per RESEARCH L455/L472, the mechanism is a **`scripts/assert-chunks.mjs`** (parse `build/assets/*.js`) OR an inline CI grep. Assertions (RESEARCH L366–372):
- `build/assets/` contains a `react-vendor-*.js` chunk.
- Lazy `/rh/*` + `/admin/*` route chunks emit separately.
- `jspdf`/`jspdf-autotable` bytes are NOT in the eager `index-*.js` (only in a dynamic chunk).
- Eager `index-*.js` < baseline 2,788.27 kB (RESEARCH L372).

> `scripts/**` is EXCLUDED from Vitest (`vite.config.ts:21`), so this runs as part of the `npm run build` gate, not `npm run test:run`.

### E2E lazy-route navigation no-regression (EXTEND — PERF-03)

**Analog:** `e2e/navegacao.spec.ts` — extend it (don't create a new spec). Reuse the gated real-auth harness (`describeRealAuth`, L59) and the **`loginRH` helper (L80–90) with the mandatory `.blur()` workaround** (L67–77, L84–88 — forms use RHF `mode:'onBlur'` + `disabled={!isValid}`; `fill()` without `blur()` leaves "Entrar" eternally disabled). Add one journey: navigate to a `/rh/*` and one `/admin/*` route, assert the heading renders BEHIND `<Suspense>` (route + heading, NOT data — D-16, getByRole). J3 (L173–184) already navigates `/admin/*` — extend the assertion to confirm the lazy chunk resolves.

## Shared Patterns

### Named exports only (CLAUDE.md — load-bearing for `lazyNamed`)
**Source:** every component/hook in the repo (`export function`/`export const`, never `export default`).
**Apply to:** `lazyNamed.ts`, `PageSkeleton.tsx`, all new test files. This is the exact reason `lazyNamed` exists (React.lazy wants `.default`; the project never provides one).

### `@/` absolute alias for cross-feature imports
**Source:** `vite.config.ts:108` (`'@': path.resolve(__dirname, './src')`); used e.g. `AsyncState.tsx:33`, `ComparativoScreen.tsx:18`.
**Apply to:** the `decisaoKeys` import in both gap-fix hooks → `import { decisaoKeys } from '@/features/decisao/hooks/useConsolidacao'`. Relative imports stay WITHIN a feature (e.g. `../pdf/exportComparativo` in `ComparativoScreen.tsx`).

### Hierarchical query-key factories (targeted invalidation)
**Source:** `decisaoKeys` (`useConsolidacao.ts:19–25`), `entrevistaKeys` (`useEntrevistaScorecard.ts:36–42`), `redacaoRevisaoKeys` (`useRedacaoRevisao.ts:27–32`), `candidaturasKeys` (`useCandidaturas.ts:51–70`).
**Apply to:** both PERF-04 gap fixes — invalidate via the EXISTING `decisaoKeys.consolidacao(candidaturaId, vagaId)` factory, never a hand-built array, never the broad `decisaoKeys.all`.

### Mutation `onSuccess` → `invalidateQueries` (the established PERF-04 shape)
**Source:** `useGuiaEntrevista.gerar` (`useEntrevistaScorecard.ts:83–88`), `useRedacaoRevisao.salvar` (L62–66), `useCreateCandidatura` (`useCandidaturas.ts:271–297`), `useUpdateCandidaturaStatus` (L338–369, also shows `refetchQueries({type:'active'})` for the same-client immediate-refetch path).
**Apply to:** both gap fixes — ADD the consolidacao invalidation alongside the existing ones (don't replace them).

### Glass loading/skeleton primitive
**Source:** `AsyncState.tsx:161–173, 210–216` (loading skeleton + `<Glass variant="dark" blur="lg">`), `HubSection.tsx:79` (same glass surface), `Skeleton` (`skeleton.tsx:13`), `Glass`/`Loader2` (`glass.tsx:45`, lucide-react).
**Apply to:** `PageSkeleton.tsx` Suspense fallback.

### Vitest hook-test harness (renderHook + fresh QueryClient + retry:false)
**Source:** `useVagaPerguntas.test.ts:43–57` — per-test `new QueryClient({ defaultOptions: { queries: { retry: false } } })`, `createElement(QueryClientProvider, ...)` wrapper, `vi.hoisted()` + `vi.mock('@/lib/...')` for SDK chains.
**Apply to:** all 3 new unit test files.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/router/lazyNamed.ts` | utility | transform | First `React.lazy` usage in the codebase (RESEARCH §Summary). Copy verbatim from RESEARCH Pattern 2 (L205–211). |
| chunk-assertion mechanism (`scripts/assert-chunks.mjs` or CI grep) | test/script | batch | No build-output assertion infra exists (RESEARCH L472). `scripts/__tests__/sync-prompts.test.ts` is the nearest *script-test* shape but targets a TS module, not `build/` artifacts. Build from RESEARCH §Code Examples (L366–372). |
| invalidateQueries-spy unit tests (×2) | test | unit | No existing test in the repo spies on `queryClient.invalidateQueries` (grep returned zero). Harness is borrowed from `useVagaPerguntas.test.ts`, but the spy/assertion style is net-new. |

## Metadata

**Analog search scope:** `src/router/`, `src/components/ui/`, `src/features/{entrevista,triagem,decisao,vagas,hub-candidato}/`, `src/App.tsx`, `vite.config.ts`, `e2e/`, `scripts/`, all `**/__tests__/`.
**Files scanned:** ~20 source + 2 test analogs read in full or targeted.
**Pattern extraction date:** 2026-06-29
