/**
 * lazyNamed — the named-export → `{ default }` adapter for `React.lazy`.
 *
 * `React.lazy` REQUIRES a module whose `.default` is the component. This project
 * uses NAMED exports EXCLUSIVELY (CLAUDE.md — `export function`/`export const`,
 * never `export default`), so a bare `React.lazy(() => import('./Page'))` would
 * resolve `undefined` (the component is on `.PageName`, not `.default`) and render
 * a blank route. `lazyNamed` remaps the named export onto `default` so the project
 * convention and `React.lazy` coexist.
 *
 * Declared/called ONCE at module top level (in `routes.tsx`) — NEVER inside a
 * component render (which would reset the lazy state every render — react.dev).
 *
 * @module router/lazyNamed
 * @see .planning/phases/19-performance-bundle-cache/19-RESEARCH.md (Pattern 2, L205-211)
 * @see https://react.dev/reference/react/lazy (default-export requirement)
 */
import { lazy, type ComponentType } from 'react'

export function lazyNamed<T extends Record<string, ComponentType<any>>>(
  loader: () => Promise<T>,
  name: keyof T,
) {
  return lazy(() => loader().then((m) => ({ default: m[name] })))
}
