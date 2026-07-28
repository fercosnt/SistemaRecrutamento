/**
 * Phase 19 / Plan 19-01 — lazyNamed adapter unit test (PERF-03).
 *
 * Asserts the named-export → `{ default }` remap: a module exporting a NAMED
 * component (`Foo`) resolves and renders behind `<Suspense>` when loaded via
 * `lazyNamed(loader, 'Foo')`. This is the single reason the helper exists
 * (the project forbids default exports — CLAUDE.md — and `React.lazy` requires one).
 *
 * GREEN immediately (the adapter is pure; it does not depend on the route split).
 *
 * @see src/router/lazyNamed.ts
 * @see .planning/phases/19-performance-bundle-cache/19-PATTERNS.md (lazyNamed L43-48)
 */
import { describe, it, expect } from 'vitest'
import { Suspense } from 'react'
import { render, screen } from '@testing-library/react'
import { lazyNamed } from '../lazyNamed'

describe('lazyNamed (Plan 19-01)', () => {
  it('resolves a NAMED export onto React.lazy and renders it behind <Suspense>', async () => {
    // A module shaped like the repo's named-export pages: { Foo } (no default).
    const Lazy = lazyNamed(
      () => Promise.resolve({ Foo: () => <span>hello</span> }),
      'Foo',
    )

    render(
      <Suspense fallback={null}>
        <Lazy />
      </Suspense>,
    )

    // findByText awaits the lazy chunk Promise resolving + the component mounting.
    expect(await screen.findByText('hello')).toBeInTheDocument()
  })

  it('picks the requested name when the module has multiple named exports', async () => {
    const Lazy = lazyNamed(
      () =>
        Promise.resolve({
          Alpha: () => <span>alpha</span>,
          Beta: () => <span>beta</span>,
        }),
      'Beta',
    )

    render(
      <Suspense fallback={null}>
        <Lazy />
      </Suspense>,
    )

    expect(await screen.findByText('beta')).toBeInTheDocument()
    expect(screen.queryByText('alpha')).not.toBeInTheDocument()
  })
})
