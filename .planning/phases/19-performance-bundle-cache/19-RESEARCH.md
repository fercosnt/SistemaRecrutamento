# Phase 19: Performance — Bundle & Cache - Research

**Researched:** 2026-06-29
**Domain:** Frontend build optimization (Vite 6 / Rollup 4 code-splitting) + TanStack Query v5 cache invalidation/freshness
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Área 1 — Code-splitting (PERF-03)**
- Lazy-load (`React.lazy` + dynamic `import()`) as rotas `/rh/*` e `/admin/*` (auth-gated, baixo tráfego); MANTER os fluxos do candidato (landing, dashboard, avaliação) EAGER para o first-paint mobile.
- Libs pesadas de uso único via dynamic `import()` no call site: jsPDF no clique "Exportar", recharts dentro da rota admin lazy.
- Adicionar `rollupOptions.output.manualChunks` separando um vendor chunk estável (react + @radix-ui) do código de app.
- Fallback de Suspense: um `PageSkeleton`/spinner glass de marca no boundary lazy (sem flash em branco).

**Área 2 — Cache invalidation & freshness (PERF-04)**
- Corrigir os 2 gaps: `salvarAvaliacao` e `salvarRevisao` também invalidam `decisaoKeys.consolidacao(candidaturaId, vagaId)` (threadar os ids — invalidação ALVO, não broad).
- Freshness cross-client (aba aberta do candidato vs mudança de status pelo RH): habilitar `refetchOnWindowFocus` para os reads de status/dashboard do candidato + manter staleTime ≤60s desses reads → mudança visível em ≤60s no refocus/navegação.
- Política de staleTime: manter o default global de 5min; reads de status candidato-visíveis ≤60s (candidaturas já 1min).
- Escopo: corrigir os gaps conhecidos + um quick audit de que cada mutation invalida os reads candidato-visíveis que ela afeta.

### Claude's Discretion
- Exato conjunto/limite dos manualChunks (quais libs no vendor chunk) desde que o chunk da rota inicial do candidato encolha e os chunks de rota resolvam em runtime.
- Forma exata do `PageSkeleton` (reusar HubSection/AsyncState skeleton vs novo) e onde ancorar o `<Suspense>` (root layout vs por-grupo de rota).
- Se habilitar `refetchOnWindowFocus` global vs per-query nos reads candidato-visíveis (preferir o mais cirúrgico que ainda garanta ≤60s).

### Deferred Ideas (OUT OF SCOPE)
- Lazy-load dos fluxos do candidato — fora de escopo (mantidos eager para first-paint); reconsiderar só se o chunk inicial ainda for grande após o split RH/admin.
- Otimização de imagens/assets, prefetch de rotas, e SSR — fora do escopo deste milestone de hardening.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-03 | Bundle servido em chunks (code-splitting route-level + vendor) — candidato mobile-first não paga os 661 KiB monolíticos no first paint. *(fecha tech-debt HARD-02)* | Standard Stack (Vite 6 manualChunks function form + React.lazy/Suspense), Architecture Patterns 1–3, Code Examples (lazy route adapter for named exports, manualChunks recipe, call-site dynamic import), Common Pitfalls 1–3. Baseline measured: monolith = **2,788.27 kB** (gzip 796 kB). |
| PERF-04 | Mudança escrita (candidato/RH) aparece no perfil/dashboard do candidato em ≤60s — invalidação de cache alvo nas mutations relevantes. *(fecha tech-debt PERF-01)* | Architecture Pattern 4 (targeted invalidateQueries), Code Examples (the 2 invalidation-gap fixes with exact id-threading), TanStack Query v5 freshness model (refetchOnWindowFocus + staleTime ≤60s), Common Pitfall 4–5. |
</phase_requirements>

## Summary

Phase 19 is a pure build-config + cache-behavior hardening pass on a **Vite 6.3.5 / Rollup 4.52.5 / React 18.3.1 / react-router-dom 6.30.1 / @tanstack/react-query 5.90.10** SPA. No new dependencies are introduced — every library needed (`vite`, `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `jspdf`, `jspdf-autotable`, `recharts`) is already installed. The work is three concrete moves: (1) add `build.rollupOptions.output.manualChunks` to peel a stable vendor chunk off the 2.78 MB monolith; (2) wrap `/rh/*` and `/admin/*` route elements in `React.lazy` + a `<Suspense>` boundary, and push `jsPDF` (PDF export) + `recharts` (admin charts) behind dynamic `import()` so the candidate first-paint never downloads them; (3) close two real cache-invalidation gaps and add `refetchOnWindowFocus` to the candidate-visible status reads so a write is visible within ≤60s.

The codebase has **zero** existing `React.lazy`/`Suspense`/dynamic-`import()` usage, so this phase establishes the project's lazy-loading convention from scratch. The two binding project constraints that shape every code example: the project uses **named exports exclusively** (`export const Component`) — which collides head-on with `React.lazy`'s default-export requirement, requiring the `.then(m => ({ default: m.Name }))` adapter on every lazy route — and the classic **manualChunks circular-init footgun** ("Cannot access X before initialization") is a real, well-documented risk that dictates keeping React + all React-dependent eager UI libs in the same vendor chunk.

The PERF-04 side is small and surgical: the two gap hooks (`useEntrevistaScorecard.salvarAvaliacao`, `useRedacaoRevisao.salvarRevisao`) already invalidate their own keys but not `decisaoKeys.consolidacao(candidaturaId, vagaId)`. The id-threading is non-trivial and is the load-bearing detail (see Code Examples): the entrevista hook has `candidaturaId` but must receive `vagaId` (available at the call site via `contexto?.vaga_id`); the redacao hook has `vagaId` but the per-row `candidatura_id` lives on `RedacaoReviewRow.candidatura_id` and must be threaded from the call site.

**Primary recommendation:** Use the **function-form** `manualChunks(id)` grouping `react`/`react-dom`/`react-router-dom`/`scheduler` into one `react-vendor` chunk (NOT a broad "all node_modules in vendor" split — that re-triggers circular-init); lazy-load `/rh/*` + `/admin/*` route elements via a small `lazyNamed(loader, exportName)` helper wrapping `React.lazy`; anchor a single `<Suspense fallback={<PageSkeleton/>}>` inside `RootLayout` around `<Outlet/>`; convert `exportComparativo`'s top-level import to a call-site `await import()`; and for PERF-04, thread the ids into both gap fixes and add `refetchOnWindowFocus: true` per-query to the candidate-visible reads (which already carry staleTime ≤60s) rather than flipping the global default.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Code-splitting / chunk emission | Build (Vite/Rollup) | — | Pure build-time config (`vite.config.ts build.rollupOptions`). No runtime/server involvement. |
| Lazy route loading + Suspense fallback | Browser / Client | — | `React.lazy` resolves the route chunk at navigation; `<Suspense>` renders the fallback. SPA-only; no SSR (deferred). |
| Call-site dynamic import (jsPDF/recharts) | Browser / Client | — | `await import()` fires on user interaction (export click) or route entry. |
| Cache invalidation on mutation | Browser / Client (TanStack Query) | API/DB (source of truth) | `invalidateQueries` is a client cache operation; it re-reads from Supabase (the authoritative store). |
| Cross-client freshness (≤60s) | Browser / Client (refetchOnWindowFocus + staleTime) | API/DB | The DB already holds the new value (written by the other client); the open candidate tab must re-read it. Pure client-cache policy. |

## Standard Stack

> **No new packages.** Every tool below is already a project dependency. The phase changes *configuration and call sites*, not the dependency tree.

### Core
| Library | Version (installed) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| `vite` | **6.3.5** | Build tool; exposes `build.rollupOptions.output.manualChunks` | Project's build tool. [VERIFIED: node_modules] |
| `rollup` | **4.52.5** (transitive via Vite) | The bundler Vite 6 delegates to; `manualChunks` is a Rollup output option | Vite 6 uses Rollup 4 (Rolldown is opt-in/future, not in this project). [VERIFIED: node_modules] |
| `react` | **18.3.1** | `React.lazy`, `Suspense` | [VERIFIED: node_modules] |
| `react-dom` | **18.3.1** | DOM renderer (pairs with react in vendor chunk) | [VERIFIED: node_modules] |
| `react-router-dom` | **6.30.1** | Router; routes declared as `RouteObject[]` with `element:` | NOT v7 — lazy pattern uses `React.lazy` on `element`, not the v6 `route.lazy` API (see Pitfall 2). [VERIFIED: node_modules] |
| `@tanstack/react-query` | **5.90.10** | `invalidateQueries`, `refetchOnWindowFocus`, `staleTime` | [VERIFIED: node_modules] |

### Supporting (already-installed libs being pushed behind dynamic import)
| Library | Version (installed) | Purpose | When to Use |
|---------|---------------------|---------|-------------|
| `jspdf` | **4.2.1** | PDF generation (comparativo export) | Load via `await import()` inside the export click handler only. [VERIFIED: node_modules] |
| `jspdf-autotable` | **5.0.8** | Table layout for jsPDF | Co-loaded with jsPDF in the same dynamic chunk (same module `exportComparativo.ts`). [VERIFIED: node_modules] |
| `recharts` | **2.15.4** | Charts on `/admin/ai-costs` only | Split automatically by making `/admin/ai-costs` a lazy route (statically imported inside `AiCostsPage.tsx`). [VERIFIED: node_modules] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `React.lazy` on `element:` | react-router v6 native `route.lazy` | `route.lazy` resolves route-object keys (`Component`, `loader`…) and would require rewriting every `RouteObject` from `element:` to `Component:` + moving `RoleGuard`/`ErrorBoundary` wrapping. Higher blast radius; `React.lazy` is the CONTEXT-locked choice and surgical. [CITED: reactrouter.com/6.30.1/route/lazy] |
| Function-form `manualChunks` (narrow react-vendor) | Object form `{ 'react-vendor': ['react','react-dom',...] }` | Object form also works and is more explicit, BUT it matches by module *specifier*, not resolved path, and is brittle with the project's `resolve.alias` versioned-specifier entries. Function form keys off resolved `id` paths in `node_modules`, which is alias-agnostic. Either is acceptable (Claude's Discretion); function form recommended. [CITED: rollupjs.org output-manualchunks] |
| Per-package chunk (one chunk per node_modules pkg) | Coarse single vendor chunk | Per-package produces many small HTTP requests; a *narrow* react-vendor chunk is the CONTEXT decision ("vendor chunk estável react + @radix-ui"). [ASSUMED — tradeoff judgment] |

**Installation:** None required. Verify nothing regressed: `npm run build` (already passes — baseline captured below).

**Version verification (run in this session):**
- `vite@6.3.5`, `rollup@4.52.5`, `react@18.3.1`, `react-dom@18.3.1`, `react-router-dom@6.30.1`, `@tanstack/react-query@5.90.10`, `jspdf@4.2.1`, `jspdf-autotable@5.0.8`, `recharts@2.15.4` — all confirmed via `require('<pkg>/package.json').version` against installed `node_modules`. [VERIFIED: node_modules]

## Package Legitimacy Audit

**N/A — this phase installs ZERO external packages.** All libraries used (vite, rollup, react, react-dom, react-router-dom, @tanstack/react-query, jspdf, jspdf-autotable, recharts) are pre-existing, in-use project dependencies confirmed present in `node_modules`. No slopcheck/registry verification gate applies. The planner does NOT need any `checkpoint:human-verify` install task.

## Architecture Patterns

### System Architecture Diagram

```
                          ┌─────────────────────────────────────────────┐
   npm run build          │  vite.config.ts                             │
   ───────────►           │  build.rollupOptions.output.manualChunks(id)│
                          │    id ∈ react|react-dom|react-router|scheduler│
                          │       → "react-vendor" chunk                 │
                          └───────────────────┬─────────────────────────┘
                                              │ emits
                       ┌──────────────────────┼───────────────────────────┐
                       ▼                       ▼                            ▼
              react-vendor-*.js         index-*.js (candidate          rh-*.js / admin-*.js
              (stable, cached)          eager: landing/dashboard/        (lazy route chunks)
                                        avaliacao)                       jspdf-*.js / recharts-*.js
                                                                         (call-site dynamic import)
   ──────────────────────────────────  RUNTIME  ──────────────────────────────────

   Candidate (mobile)  ──navigate /──►  index chunk + react-vendor  (NO rh/admin/jspdf/recharts)
                                                  │
   RH navigates /rh/* ──────────────►  React.lazy(loader) ──suspends──► <Suspense fallback=PageSkeleton>
                                                  │ chunk arrives                 │
                                                  ▼                               ▼
                                        route element renders            (cached → no fallback flash)

   RH clicks "Exportar PDF" ────────►  await import('./exportComparativo') ──► jspdf chunk ──► doc.save()

   ──────────────────────────────────  PERF-04 freshness  ──────────────────────

   RH salvarAvaliacao / salvarRevisao ─► invalidateQueries(decisaoKeys.consolidacao(candId, vagaId))
                                                  │ (same client → immediate refetch of active query)
   RH updateCandidaturaStatus ────────► DB row changes
                                                  │
   Candidate tab (already open) ──refocus──► refetchOnWindowFocus:true + staleTime≤60s ──► re-read ►≤60s
```

### Recommended Project Structure
```
src/
├── router/
│   ├── routes.tsx          # rewrite /rh/* + /admin/* element: → React.lazy adapters (eager candidate routes UNCHANGED)
│   └── lazyNamed.ts        # NEW: lazyNamed(loader, exportName) helper (named-export → default adapter)
├── components/ui/
│   └── PageSkeleton.tsx    # NEW (or reuse AsyncState glass skeleton) — Suspense fallback
├── App.tsx                 # add <Suspense fallback={<PageSkeleton/>}> around <Outlet/> in RootLayout; add refetchOnWindowFocus policy
├── features/
│   ├── entrevista/hooks/useEntrevistaScorecard.ts  # add vagaId param + invalidate decisaoKeys.consolidacao
│   ├── triagem/hooks/useRedacaoRevisao.ts          # thread candidaturaId into salvar onSuccess
│   ├── triagem/components/RedacaoReviewPanel.tsx   # pass selected.candidatura_id into salvarRevisao
│   ├── entrevista/components/EntrevistaWorkspace.tsx # pass vagaId into useEntrevistaScorecard
│   ├── triagem/pdf/exportComparativo.ts            # (no change — stays a lazy-importable module)
│   └── triagem/components/ComparativoScreen.tsx    # top-level import → await import() in click handler
vite.config.ts              # add build.rollupOptions.output.manualChunks
```

### Pattern 1: Function-form `manualChunks` for a narrow, stable vendor chunk
**What:** Keep React + React-router (+ scheduler) in ONE long-lived chunk, leave everything else in app/route chunks.
**When to use:** When the CONTEXT decision is a "stable vendor chunk" and you must avoid the circular-init footgun.
**Example:**
```typescript
// Source: rollupjs.org/configuration-options/#output-manualchunks (function form)
//         + soledadpenades.com/posts/2025/use-manual-chunks-with-vite-... (node_modules id parsing)
// vite.config.ts → build:
build: {
  target: 'esnext',
  outDir: 'build',
  rollupOptions: {
    output: {
      manualChunks(id: string) {
        // NARROW react-vendor: only the libs the WHOLE app needs at init.
        // Keeping react + react-dom + react-router + scheduler together prevents
        // the "Cannot access X before initialization" circular-init error.
        if (
          id.includes('node_modules/react/') ||
          id.includes('node_modules/react-dom/') ||
          id.includes('node_modules/react-router') ||  // react-router + react-router-dom
          id.includes('node_modules/scheduler/')
        ) {
          return 'react-vendor'
        }
        // Everything else stays in app/route chunks (rollup auto-splits lazy routes).
      },
    },
  },
},
```
> Note: returning `undefined` (falling through) leaves the module to Rollup's automatic chunking, which is exactly what you want for the lazy `/rh/*` `/admin/*` route chunks and for `@radix-ui`. Adding `@radix-ui` to `react-vendor` is *optional* (Claude's Discretion) — only do it if all radix usage is eager; since radix is used by both eager candidate UI and lazy RH UI, leaving radix to auto-chunking is safest against circular-init. [VERIFIED: rollup docs + Vite build baseline]

### Pattern 2: `React.lazy` with the named-export adapter (project uses named exports)
**What:** A tiny helper that converts a named export into the `{ default }` shape `React.lazy` requires.
**When to use:** EVERY lazy route in this project (CLAUDE.md forbids default exports).
**Example:**
```typescript
// Source: react.dev/reference/react/lazy ("the lazy component must be exported as default")
//         + github.com/facebook/react/issues/14603 (named-export adapter)
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
```tsx
// src/router/routes.tsx — replace static imports for /rh/* + /admin/* with:
import { lazyNamed } from './lazyNamed'
const DashboardRHPage = lazyNamed(() => import('../components/pages/DashboardRHPage'), 'DashboardRHPage')
const AiCostsPage     = lazyNamed(() => import('../features/admin/ai-costs/components/AiCostsPage'), 'AiCostsPage')
// ...one per /rh/* and /admin/* page. RoleGuard + ErrorBoundary wrapping stays IDENTICAL:
{ path: '/rh/dashboard',
  element: <RoleGuard role={['rh','administrador']}><DashboardRHPage /></RoleGuard> },
```
> The eager candidate routes (`/`, `/vagas`, `/candidato/*`, auth) keep their **static** imports — they must NOT be lazy (CONTEXT deferred). [VERIFIED: react.dev + WebSearch adapter pattern, multiple sources]

### Pattern 3: Single `<Suspense>` boundary in `RootLayout`
**What:** One Suspense fallback wrapping `<Outlet/>` so any lazy route shows the branded skeleton.
**When to use:** Anchor here (Claude's Discretion allows root vs per-group; root is simplest and covers all lazy routes).
**Example:**
```tsx
// src/App.tsx RootLayout return:
import { Suspense } from 'react'
import { PageSkeleton } from './components/ui/PageSkeleton'
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
> `PageSkeleton` can reuse the `AsyncState` glass skeleton primitive (`<Skeleton className="… bg-white/5" />` + glass surface). React caches the resolved chunk Promise, so a *re-visited* lazy route renders instantly with **no fallback flash**. [VERIFIED: react.dev — "the Promise's resolved value will be cached"]

### Pattern 4: Targeted `invalidateQueries` threading the ids (PERF-04)
**What:** On mutation success, invalidate the *specific* consolidacao key, not a broad namespace.
**When to use:** Both gap fixes.
**Example:**
```typescript
// Source: tanstack.com/query/v5 query-invalidation (prefix match; active queries refetch)
// useEntrevistaScorecard — ADD vagaId param (call site has it via contexto.vaga_id):
export function useEntrevistaScorecard(
  candidaturaId: string | undefined,
  vagaId: string | undefined,          // ← NEW
  options?: ...,
) {
  const salvar = useMutation({
    mutationFn: (p: SalvarAvaliacaoPayload) => salvarAvaliacao(candidaturaId!, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entrevistaKeys.scorecard(candidaturaId || '') })
      if (candidaturaId && vagaId) {     // ← NEW targeted invalidation
        queryClient.invalidateQueries({ queryKey: decisaoKeys.consolidacao(candidaturaId, vagaId) })
      }
    },
  })
}
// EntrevistaWorkspace.tsx call site: useEntrevistaScorecard(candidaturaId, vagaId)  // vagaId = contexto?.vaga_id
```

### Anti-Patterns to Avoid
- **Broad vendor chunk (`if id.includes('node_modules') return 'vendor'`):** re-introduces circular-init because React-dependent libs land in a chunk that loads before/after React unpredictably (Pitfall 1). Use a narrow react-vendor.
- **`React.lazy` without the named-export adapter:** silently renders `undefined` (component is on `.NamedExport`, not `.default`) → blank route. Always use `lazyNamed`.
- **Broad `invalidateQueries({ queryKey: decisaoKeys.all })` for the gap fix:** CONTEXT says targeted, not broad — invalidates unrelated consolidacao reads.
- **Flipping the GLOBAL `refetchOnWindowFocus: true`:** would refetch every query on focus (including expensive RH/AI reads). Prefer per-query on the candidate-visible reads (Pitfall 5 / Claude's Discretion).
- **Declaring `lazy(...)` inside a component:** resets state on every render (react.dev explicit warning). Always module top-level (`lazyNamed` is called once at module scope).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chunk splitting | A custom Rollup plugin / manual entry points | `build.rollupOptions.output.manualChunks` | First-class Rollup/Vite API; handles the dependency graph + shared-module hoisting. |
| Lazy component loading | A custom dynamic-import + state machine wrapper | `React.lazy` + `<Suspense>` | Built-in; caches the chunk Promise, integrates with the render lifecycle and error boundaries. |
| Cross-client freshness polling | A custom `setInterval` re-fetch loop | `refetchOnWindowFocus` + `staleTime` (and `refetchInterval` only if a closed-tab guarantee is ever needed — out of scope) | TanStack already debounces focus events and respects staleness; a hand-rolled loop double-fetches. |
| Cache invalidation | Manually `setQueryData` / clearing cache | `queryClient.invalidateQueries({ queryKey })` | Prefix-matches, refetches active queries, marks inactive stale — all correct semantics for free. |

**Key insight:** Every capability in this phase already has a first-class, dependency-free API. The risk is entirely in *configuration nuance* (the circular-init footgun, the named-export adapter, the staleTime⇄refetchOnWindowFocus coupling), not in missing tooling.

## Common Pitfalls

### Pitfall 1: `manualChunks` "Cannot access 'X' before initialization" (circular init)
**What goes wrong:** A vendor chunk containing a React-dependent lib (recharts, @radix-ui) loads before the chunk defining React, or two manual chunks import each other, producing a runtime `Cannot access 'X' before initialization` / `Cannot read properties of undefined` — a **blank white screen in production only** (dev/HMR masks it).
**Why it happens:** `manualChunks` forces modules into chunks and can create circular import edges between chunks that Rollup cannot order safely. Documented in vitejs/vite#9686, #12209, #20202.
**How to avoid:** Keep `react` + `react-dom` + `react-router*` + `scheduler` in the SAME chunk (Pattern 1). Do NOT scatter React-dependent libs across separate manual chunks — let Rollup auto-chunk them (return `undefined`). Test with an actual `npm run build` + load the built `build/` (not just dev) before merge.
**Warning signs:** Works in `npm run dev`, white screen / console `before initialization` after `npm run build && preview`.

### Pitfall 2: react-router v6 `route.lazy` ≠ `React.lazy` (default-export confusion)
**What goes wrong:** Reaching for `lazy: () => import('./Page')` on the `RouteObject` (the v6 router API) and expecting it to render the named component, OR using `React.lazy` and forgetting the named-export adapter → blank route.
**Why it happens:** Two different "lazy" mechanisms. `route.lazy` (router) spreads `Component`/`loader`/etc. and explicitly has NO default export; `React.lazy` (React) REQUIRES a default export. The project routes use `element:` (not `Component:`), so the correct tool is `React.lazy` + the named-export adapter.
**How to avoid:** Use `lazyNamed` (Pattern 2) on `element:`. Do not switch to `route.lazy` (would require rewriting `RouteObject`s to `Component:` and re-homing `RoleGuard`/`ErrorBoundary`).
**Warning signs:** Route renders nothing / `Element type is invalid: ... got: undefined`.

### Pitfall 3: jsPDF still in the main chunk after "lazy-loading" (stale static import)
**What goes wrong:** Wrapping the export button in a handler but leaving the top-level `import { exportComparativo } from '../pdf/exportComparativo'` (which itself statically `import`s `jspdf`) — Rollup keeps jsPDF in the eager chunk because of the static edge.
**Why it happens:** A single remaining static import anywhere in the eager graph pulls the whole module in.
**How to avoid:** The dynamic boundary must be at the **call site**: `const { exportComparativo } = await import('../pdf/exportComparativo')` inside the click handler, and remove the top-level value import (keep only `import type` where needed — `DecisaoFinalPage.tsx` already imports only the `RankedCandidate` *type*, which erases at build and costs nothing).
**Warning signs:** `npm run build` still shows jspdf/autotable bytes inside the main `index-*.js` (or `html2canvas`/`purify.es` chunks still pulled eagerly by the candidate path).

### Pitfall 4: invalidation gap — write succeeds but consolidacao dashboard stays stale
**What goes wrong:** `salvarAvaliacao` / `salvarRevisao` invalidate their own key but NOT `decisaoKeys.consolidacao(...)`, so the Decisão Final dashboard shows pre-write data until staleTime (5min) elapses.
**Why it happens:** The consolidacao query (`useConsolidacao`, staleTime 5min) is a *different* key from the entrevista/redacao keys; nothing tells it to refetch.
**How to avoid:** Thread the ids and add the targeted invalidation (Pattern 4 + Code Examples). The id-threading is the load-bearing part — see the exact signatures below.
**Warning signs:** RH saves a scorecard/review, navigates to `/rh/candidato/:id/decisao`, sees old aggregate.

### Pitfall 5: `refetchOnWindowFocus` does nothing because the query is still fresh
**What goes wrong:** Enabling `refetchOnWindowFocus: true` on a read whose `staleTime` is the global 5min → on refocus the query is still *fresh*, so it does NOT refetch, and the ≤60s guarantee fails.
**Why it happens:** `refetchOnWindowFocus` only refetches **stale** queries. staleTime gates it.
**How to avoid:** The candidate-visible reads must have BOTH `refetchOnWindowFocus: true` AND `staleTime ≤ 60s`. `candidaturasKeys.list` already has staleTime 1min ✓ — it only needs `refetchOnWindowFocus: true` (it currently inherits the global `false`). Audit each candidate-visible read for this pairing.
**Warning signs:** Manual test: open candidate dashboard, change status as RH in another browser, refocus candidate tab within 60s → value does NOT update.

## Code Examples

### The two PERF-04 invalidation-gap fixes (exact id-threading)

**Gap A — `useEntrevistaScorecard.salvarAvaliacao` (`useEntrevistaScorecard.ts:151-159`)**
- Hook currently receives only `candidaturaId`. It does NOT have `vagaId`.
- `vagaId` IS available at the call site: `EntrevistaWorkspace.tsx:68` → `const vagaId = contexto?.vaga_id`.
- Fix: add a `vagaId` param to the hook; invalidate `decisaoKeys.consolidacao(candidaturaId, vagaId)` on success; pass `vagaId` from the workspace.
```typescript
// useEntrevistaScorecard.ts — import decisaoKeys, add vagaId param (see Pattern 4 example above)
import { decisaoKeys } from '@/features/decisao/hooks/useConsolidacao'
// EntrevistaWorkspace.tsx:87 → useEntrevistaScorecard(candidaturaId, vagaId)
```

**Gap B — `useRedacaoRevisao.salvarRevisao` (`useRedacaoRevisao.ts:54-67`)**
- Hook receives `vagaId` (the queue is per-vaga). The per-essay `candidatura_id` is NOT at hook level — it is on each row: `RedacaoReviewRow.candidatura_id` (confirmed at `revisaoRedacaoService.ts:60`).
- The `salvar` mutation is called per selected row in `RedacaoReviewPanel.handleSalvar` (`RedacaoReviewPanel.tsx:184-198`) with `{ redacaoId: selected.id, payload }`. `selected.candidatura_id` is available there.
- Fix: extend the mutation variables to carry `candidaturaId` (from `selected.candidatura_id`); on success invalidate `decisaoKeys.consolidacao(candidaturaId, vagaId)` (hook has `vagaId`; mutation arg supplies `candidaturaId`).
```typescript
// useRedacaoRevisao.ts — salvar mutation variables gain candidaturaId:
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
// RedacaoReviewPanel.tsx handleSalvar → salvarRevisao.mutate({ redacaoId: selected.id, candidaturaId: selected.candidatura_id, payload }, ...)
```
> `decisaoKeys.consolidacao(candidaturaId, vagaId)` signature CONFIRMED at `useConsolidacao.ts:21-22` → `[...decisaoKeys.all, 'consolidacao', candidaturaId, vagaId]`. [VERIFIED: codebase]

### Call-site dynamic import for jsPDF (`ComparativoScreen.tsx:34,124`)
```tsx
// BEFORE: top-level  import { exportComparativo } from '../pdf/exportComparativo'   (+ value usage L124)
// AFTER: keep only the TYPE import; load the module on click.
import type { RankedCandidate } from '../pdf/exportComparativo'
async function handleExport(candidates: RankedCandidate[]) {
  const { exportComparativo } = await import('../pdf/exportComparativo')
  exportComparativo(candidates)
}
```
> `exportComparativo.ts` itself stays unchanged (its static `import { jsPDF } from 'jspdf'` is now reachable ONLY through the dynamic boundary, so Rollup emits jspdf+autotable in a separate async chunk). [VERIFIED: codebase + Rollup code-splitting semantics]

### Build-output chunk assertion (measuring the split — PERF-03)
```bash
# After build, assert route/vendor chunks exist and the eager chunk shrank.
npm run build
ls -la build/assets/*.js
# Expect to see: react-vendor-*.js, a DISTINCT chunk per lazy RH/admin page (or grouped),
# jspdf/autotable in their own chunk, recharts (index.es) NOT in the eager index chunk.
# Baseline eager monolith was 2,788.27 kB — the new eager index chunk MUST be visibly smaller.
```

### TanStack Query v5 freshness on a candidate-visible read
```typescript
// useCandidaturas already has staleTime 1min. Add per-query refetchOnWindowFocus (do NOT flip global):
return useQuery({
  queryKey: candidaturasKeys.list(...),
  queryFn: ...,
  staleTime: 1 * 60 * 1000,        // ≤60s ✓ (already present)
  refetchOnWindowFocus: true,       // ← per-query; ≤60s cross-client guarantee
  retry: 2,
  ...options,
})
```

## Runtime State Inventory

> Not a rename/refactor/migration phase. **Omitted** — this phase changes build config + client cache behavior only. No stored data, live-service config, OS-registered state, secrets, or build artifacts carry a renamed string. (One adjacent note: `build/` output is regenerated by `npm run build` — no stale artifact concern since it is git-ignored output, not a tracked package.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `splitVendorChunkPlugin` (Vite) | `build.rollupOptions.output.manualChunks` | Deprecated in Vite 5, removed in Vite 6 | Do NOT use `splitVendorChunkPlugin` — it is gone in Vite 6. Use `manualChunks` directly. [CITED: vite.dev migration] |
| `cacheTime` (Query v4) | `gcTime` (Query v5) | v5 | Already migrated in this codebase (`App.tsx:40` comment confirms). |
| `onError` on `useQuery` (v4) | component renders error from `isError` (v5) | v5 | Already migrated (`useConsolidacao.ts:30-31` comment confirms). |
| Vite 6 → Rollup 4 | Vite 7+ → Rolldown (opt-in) | Future | This project is Vite **6.3.5** (Rollup 4). The `vite.dev/guide/build` page now references `rolldownOptions` — IGNORE that; for Vite 6 the option is `rollupOptions.output.manualChunks`. [VERIFIED: node_modules vite@6.3.5] |

**Deprecated/outdated:**
- `splitVendorChunkPlugin`: removed in Vite 6 — use `manualChunks`.
- Any `rolldownOptions.*` guidance from current vite.dev docs: not applicable to Vite 6.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A *narrow* react-vendor chunk (react/react-dom/react-router/scheduler) is preferable to per-package or broad-vendor for stability + circular-init safety | Standard Stack / Pattern 1 | Low — if the eager chunk is still large, planner can widen the vendor grouping (Claude's Discretion). Build output will reveal it. |
| A2 | `@radix-ui` is best left to Rollup auto-chunking (not forced into react-vendor) because it is used by BOTH eager candidate UI and lazy RH UI | Pattern 1 note | Low — forcing radix into react-vendor is a valid alternative; only risks slightly larger eager chunk, not correctness. |
| A3 | Per-query `refetchOnWindowFocus: true` on candidate-visible reads is more surgical than flipping the global default | Pattern 4 / Pitfall 5 | Low — CONTEXT marks this as Claude's Discretion; either satisfies ≤60s if staleTime ≤60s. |
| A4 | The exact set of candidate-visible reads needing the refetchOnWindowFocus+staleTime pairing = `useCandidaturas` (dashboard) + any status read on `MeuPerfilCandidatoPage`/`DashboardCandidatoPage`; the planner should grep for candidate-facing `useQuery` reads of status to confirm the full set | Validation Architecture | Medium — if a candidate-visible status read is missed, that surface won't meet ≤60s. The "quick audit" in CONTEXT covers this; planner must enumerate. |

## Open Questions

1. **Which candidate-visible reads beyond `useCandidaturas` need the freshness pairing?**
   - What we know: `useCandidaturas` (staleTime 1min) is the primary dashboard read; `useUpdateCandidaturaStatus` already invalidates + active-refetches on the RH side (same-client path is covered).
   - What's unclear: whether `MeuPerfilCandidatoPage` / `ExplicacaoCandidatoPage` have their own status reads that an open candidate tab could hold stale.
   - Recommendation: planner runs the CONTEXT-scoped "quick audit" — grep candidate-facing components for `useQuery` reads of mutable status, apply `refetchOnWindowFocus: true` + ensure `staleTime ≤ 60s` to each. Treat `useCandidaturas` as the known-required minimum.

2. **Group lazy RH/admin chunks, or one chunk per page?**
   - What we know: 15+ `/rh/*` routes and 4 `/admin/*` routes. One chunk per page = many small files; grouping = fewer, larger files.
   - What's unclear: optimal granularity for this low-traffic, auth-gated area.
   - Recommendation: start with per-page `React.lazy` (Rollup emits one chunk per dynamic import naturally) — simplest, and the candidate never downloads any of them. Revisit only if RH navigation feels slow (out of scope this phase).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + npm | `npm run build` / `npm run test` | ✓ | (project toolchain) | — |
| Vite | build + dev | ✓ | 6.3.5 | — |
| Rollup (transitive) | manualChunks | ✓ | 4.52.5 | — |
| Vitest + happy-dom | unit tests | ✓ | (configured in vite.config.ts) | — |
| Playwright | E2E navigation no-regression | ✓ (scripts present: `test:e2e`) | — | manual navigation smoke if E2E flaky |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none. All tooling present; `npm run build` already succeeds (baseline captured).

## Validation Architecture

> `workflow.nyquist_validation: true` → this section is REQUIRED.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (globals, `environment: 'happy-dom'`) + @testing-library/react; Playwright for E2E |
| Config file | `vite.config.ts` (`test` block); setup `tests/setup.ts` (jest-dom + vitest fake-timer bridge) |
| Quick run command | `npm run test:run` (single run) |
| Full suite command | `npm run test:run` (unit) + `npm run test:e2e` (Playwright) + `npm run build` (chunk assertion) |
| Hook-test wrapper precedent | `src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts` — `renderHook` + fresh per-test `QueryClient({ defaultOptions:{ queries:{ retry:false }}})` wrapper via `createElement(QueryClientProvider, ...)` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-03 | `npm run build` emits a `react-vendor` chunk + separate lazy RH/admin route chunks; eager `index` chunk < 2,788 kB baseline | build-output assertion | `npm run build` then grep `build/assets/*.js` for `react-vendor` + size check on the eager index chunk | ❌ Wave 0 (script `scripts/assert-chunks.mjs` or a CI grep) |
| PERF-03 | jsPDF/autotable NOT in eager chunk (only in a dynamic chunk) | build-output assertion | `npm run build`; assert no `jspdf` bytes in eager `index-*.js` | ❌ Wave 0 |
| PERF-03 | Lazy RH/admin routes still render after navigation (no blank/`undefined` element); candidate eager routes unaffected | E2E navigation no-regression | `npm run test:e2e` (navigate to a `/rh/*` and `/admin/*` route, assert content renders behind Suspense) | ⚠️ extend existing Playwright (Phase 17 auth helper exists; reuse `blur()` login helper) |
| PERF-03 | `lazyNamed` adapter maps named export → default correctly | unit | `npm run test:run` (render a lazy route element, assert it resolves) | ❌ Wave 0 (`src/router/__tests__/lazyNamed.test.tsx`) |
| PERF-04 | `salvarAvaliacao` success invalidates `decisaoKeys.consolidacao(candidaturaId, vagaId)` | unit (spy on `queryClient.invalidateQueries`) | `npm run test:run` | ❌ Wave 0 (`useEntrevistaScorecard.test.ts`) |
| PERF-04 | `salvarRevisao` success invalidates `decisaoKeys.consolidacao(candidaturaId, vagaId)` with the row's `candidatura_id` | unit (spy on `invalidateQueries`) | `npm run test:run` | ❌ Wave 0 (`useRedacaoRevisao.test.ts`) |
| PERF-04 | Candidate-visible read carries `refetchOnWindowFocus: true` AND `staleTime ≤ 60s` | unit (assert query options) or manual | `npm run test:run` (assert hook config) + manual cross-client | ⚠️ partial — unit asserts config; true ≤60s cross-client is a manual/UAT check (deferred to Phase 21 PROD-UAT per milestone pattern) |

### Sampling Rate
- **Per task commit:** `npm run test:run` (unit) + `npm run lint` (tsc) — quick.
- **Per wave merge:** `npm run test:run` + `npm run build` (chunk assertion is part of the build gate for this phase).
- **Phase gate:** Full unit suite green + `npm run build` green with the chunk assertion + E2E navigation no-regression green before `/gsd:verify-work`. Cross-client ≤60s manual freshness check deferred to Phase 21 PROD-UAT (consistent with prior phases' deferred-UAT pattern).

### Wave 0 Gaps
- [ ] `src/router/__tests__/lazyNamed.test.tsx` — covers PERF-03 (named-export adapter resolves to the component)
- [ ] `src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts` — covers PERF-04 Gap A (spy `invalidateQueries` includes `decisaoKeys.consolidacao`)
- [ ] `src/features/triagem/hooks/__tests__/useRedacaoRevisao.test.ts` — covers PERF-04 Gap B (per-row `candidatura_id` threaded)
- [ ] Chunk-assertion mechanism: a `scripts/assert-chunks.mjs` (parse `build/assets`) OR an inline CI grep step — covers PERF-03 build-output assertion. (No script-running test infra exists for build output yet.)
- [ ] Extend Playwright E2E with a lazy-route navigation smoke for one `/rh/*` + one `/admin/*` route (reuse Phase 17 real-auth helper, incl. the `blur()` login workaround).
- [ ] Shared QueryClient test wrapper: reuse the `useVagaPerguntas.test.ts` pattern (no new fixture needed).

## Security Domain

> `security_enforcement` not present as `false` in config (config shows `workflow` block; no explicit `security_enforcement: false`) → include, but scope is minimal for a build/cache phase.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase touches no auth code (RoleGuard wrapping is preserved verbatim on lazy routes). |
| V3 Session Management | no | Unchanged. |
| V4 Access Control | **yes (regression-only)** | Lazy-loading MUST NOT bypass `RoleGuard`. The `<RoleGuard>` wrapper stays OUTSIDE/around the lazy element so the guard renders before the chunk's content; access control is unchanged. Verify no `/rh/*` `/admin/*` route loses its `RoleGuard` during the rewrite. |
| V5 Input Validation | no | No new inputs. |
| V6 Cryptography | no | None. |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Lazy chunk for an RH/admin page is fetchable by an unauthenticated client (the JS chunk is public) | Information Disclosure | Accepted/by-design: route chunks contain UI code, NOT data; all data access is RLS + EF-authorized server-side. A candidate downloading the `/rh/*` chunk JS gains no data (the reads 401/deny). Same posture as today's monolith (the code is already in the public bundle). No new exposure — splitting it out is neutral. |
| `RoleGuard` dropped during the routes.tsx rewrite | Elevation of Privilege | Code review + the existing RoleGuard tests must stay green; each lazy route keeps `element: <RoleGuard ...><LazyPage/></RoleGuard>`. |
| `manualChunks` misconfig ships a blank prod app (DoS-by-bug) | Denial of Service (self-inflicted) | Mandatory `npm run build` + load the built output before merge (Pitfall 1). |

## Sources

### Primary (HIGH confidence)
- `node_modules/*/package.json` — exact installed versions of vite (6.3.5), rollup (4.52.5), react/react-dom (18.3.1), react-router-dom (6.30.1), @tanstack/react-query (5.90.10), jspdf (4.2.1), jspdf-autotable (5.0.8), recharts (2.15.4). [VERIFIED this session]
- Project source — `vite.config.ts`, `src/App.tsx`, `src/router/routes.tsx`, `useEntrevistaScorecard.ts`, `useRedacaoRevisao.ts`, `useConsolidacao.ts`, `useCandidaturas.ts`, `RedacaoReviewPanel.tsx`, `EntrevistaWorkspace.tsx`, `exportComparativo.ts`, `ComparativoScreen.tsx`, `revisaoRedacaoService.ts`, `entrevistaService.ts`, `AsyncState.tsx`. [VERIFIED this session — file:line cited inline]
- Baseline `npm run build` output (this session): eager monolith `index-CphRg52V.js` = 2,788.27 kB (gzip 796.06 kB); recharts `index.es` = 159.59 kB; `html2canvas.esm` = 202.36 kB; `purify.es` = 26.92 kB; Rollup's own warning recommends `manualChunks`. [VERIFIED this session]
- react.dev/reference/react/lazy — default-export requirement; Promise/value caching (no fallback flash on revisit); "do not declare lazy inside other components". [CITED]
- rollupjs.org/configuration-options/#output-manualchunks — function-form signature `(id, {getModuleInfo, getModuleIds}) => string | void`; object form matching; side-effect ordering caution. [CITED]
- reactrouter.com/6.30.1/route/lazy — `route.lazy` has NO default export and spreads route-object keys (distinguishes it from `React.lazy`). [CITED]

### Secondary (MEDIUM confidence — official docs via WebSearch summaries)
- tanstack.com/query/v5 query-invalidation — `invalidateQueries({ queryKey })` prefix matching, `exact: true`, `refetchType: 'none'|'all'`, active queries refetch / inactive marked stale. [CITED via WebSearch of official v5 docs]
- tanstack.com/query/v5 window-focus-refetching + important-defaults — `refetchOnWindowFocus` global or per-query; only refetches when STALE; values `true|false|'always'`. [CITED via WebSearch of official v5 docs]
- React named-export adapter `.then(m => ({ default: m.Name }))` — github.com/facebook/react/issues/14603 + react.dev intermediate-module guidance. [CITED — multiple sources agree]

### Tertiary (LOW confidence — community, used only for the footgun shape)
- soledadpenades.com 2025 manualChunks-caching post — function-form node_modules id parsing recipe. [WebFetch]
- vitejs/vite#9686, #12209, #20202 — "Cannot access before initialization" / manualChunks circular-dependency reports (corroborates Pitfall 1; not used for API claims). [WebSearch]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against installed node_modules; no new packages.
- Architecture (manualChunks + React.lazy + Suspense): HIGH — function-form signature from Rollup docs, lazy/default-export from react.dev, footgun corroborated by multiple Vite issues + a working recipe.
- PERF-04 (invalidation + freshness): HIGH on the exact code paths (file:line verified in codebase: id availability, key signature) and MEDIUM-HIGH on the v5 semantics (official docs via WebSearch; tanstack.com blocks direct WebFetch).
- Pitfalls: HIGH — each is grounded in either official docs or reproduced community reports.

**Research date:** 2026-06-29
**Valid until:** ~2026-07-29 (stable stack; the only fast-moving risk is a Vite 7/Rolldown migration, which would change `rollupOptions` → `rolldownOptions` — not relevant while on Vite 6.3.5).
