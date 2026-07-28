/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 17 / Plan 17-01 Task 1 — Wave 0 RED scaffold for the route table (D-08 / D-14).
 *
 * RED CONTRACT: these assertions read the LIVE `routes` array from `@/router/routes` and
 * require structural elements that do NOT exist until Plan 17-02 lands them:
 *   - D-14: a catch-all route object with `path === '*'` resolving to NotFoundPage.
 *     Today there is NO catch-all → `routes.find(r => r.path === '*')` is undefined → RED.
 *   - D-08: route normalization keeps the old `/rh/candidatos/:id` reachable (a redirect
 *     target or the canonical mount). Today the path exists (mounts the mock) — this
 *     assertion is a guard that the normalization does NOT delete the inbound link.
 *
 * Why no full RouterProvider mount: mounting the whole `routes` array pulls in every page
 * component (heavy, store/Supabase-coupled) and would make this a slow integration test.
 * The route-table shape is the load-bearing contract for D-14/D-08, so we assert it
 * structurally. The Playwright nav smoke (e2e/navegacao.spec.ts, Task 3) covers the
 * mounted 404 heading end-to-end.
 *
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-PATTERNS.md (§routes.tsx catch-all + redirects)
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-RESEARCH.md (Pitfall 5 — Navigate does not interpolate)
 */
import { describe, it, expect } from 'vitest'
import type { RouteObject } from 'react-router-dom'

import { routes } from '@/router/routes'

/** Recursively flatten a RouteObject tree into a flat list (the table is flat today, but
 * this is robust if a future wave introduces nested `children`). */
function flatten(rs: RouteObject[]): RouteObject[] {
  return rs.flatMap((r) => [r, ...(r.children ? flatten(r.children) : [])])
}

describe('route table — catch-all 404 + normalization (D-08 / D-14)', () => {
  it('expõe um catch-all `path: "*"` (404 NotFound) — RED até 17-02 adicionar o catch-all', () => {
    const all = flatten(routes)
    const catchAll = all.find((r) => r.path === '*')
    expect(catchAll).toBeDefined()
    // The catch-all MUST carry an element (NotFoundPage). RED today: no '*' route exists.
    expect(catchAll?.element).toBeTruthy()
  })

  it('o catch-all é a ÚLTIMA entrada do array de rotas (precedência correta do React Router)', () => {
    // A '*' route placed before specific routes would shadow them. RED today: absent.
    const lastTop = routes[routes.length - 1]
    expect(lastTop?.path).toBe('*')
  })

  it('mantém a rota de entrada do hub `/rh/candidatos/:id` alcançável (D-08 não quebra o link existente)', () => {
    const all = flatten(routes)
    // The TriagemTable inbound link (line 325) targets this path; normalization (D-08)
    // must keep it reachable (canonical mount OR a param-preserving redirect element).
    const hubEntry = all.find((r) => r.path === '/rh/candidatos/:id')
    expect(hubEntry).toBeDefined()
    expect(hubEntry?.element).toBeTruthy()
  })

  it('mantém uma rota conhecida-boa `/rh/dashboard` (sanity — o catch-all não pode engolir rotas válidas)', () => {
    const all = flatten(routes)
    expect(all.find((r) => r.path === '/rh/dashboard')).toBeDefined()
  })
})
