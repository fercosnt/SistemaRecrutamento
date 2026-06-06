/// <reference types="@testing-library/jest-dom" />
/**
 * ErrorBoundaryRoot render-catch test — Phase 5 Wave 0 scaffold (Plan 05-01 Task 3).
 *
 * Behavior asserted (HARD-03 / D-09 scaffold):
 *   Rendering a child that THROWS inside the canonical ErrorBoundary shows the
 *   fallback UI ("Ops! Algo deu errado") — NOT a white screen / unhandled throw.
 *
 * CANONICAL ErrorBoundary CHOICE: `src/components/ErrorBoundary.tsx` (the richer
 * 8.3 KB class component with the BeautySmileLogo + GlassCard fallback). The other
 * boundary, `src/features/cadastro/components/ErrorBoundary.tsx`, is the leaner
 * variant. Plan 05-03 HOISTS THIS canonical one to the App root (wrap RouterProvider)
 * and deletes / re-exports the cadastro copy.
 *
 * Why GREEN now (not RED): the canonical boundary is a complete class component that
 * already implements getDerivedStateFromError + the fallback render — it CATCHES today.
 * 05-03 only additionally MOUNTS it at the App root; the catch behavior this test
 * asserts is the contract that hoist must preserve.
 *
 * @see .planning/phases/05-perfil-hardening-mvp/05-PATTERNS.md (§MODIFY src/App.tsx — D-09)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

/**
 * A child that throws on render — the boundary must catch this and swap to fallback.
 */
function ThrowingChild(): React.ReactElement {
  throw new Error('intentional render throw for ErrorBoundary scaffold')
}

describe('ErrorBoundary (canonical src/components/ErrorBoundary.tsx) — HARD-03 scaffold', () => {
  // React logs the caught error to console.error during the boundary catch — this
  // is EXPECTED noise; suppress it so the test output stays clean (we still assert
  // the fallback rendered, which proves the catch happened).
  // Vitest v4 overloaded-method spy typing does not satisfy
  // `ReturnType<typeof vi.spyOn>` for console.error (multi-overload signature);
  // use the `any` escape hatch per STATE.md decision [02-04].
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let errorSpy: any

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('catches a throwing child and renders the fallback UI (not a white screen)', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    )

    // The default fallback heading proves the boundary caught the throw.
    expect(screen.getByText(/Ops! Algo deu errado/i)).toBeInTheDocument()
  })

  it('renders children normally when nothing throws (preserve happy path)', () => {
    render(
      <ErrorBoundary>
        <div>conteúdo saudável</div>
      </ErrorBoundary>,
    )

    expect(screen.getByText('conteúdo saudável')).toBeInTheDocument()
    expect(screen.queryByText(/Ops! Algo deu errado/i)).not.toBeInTheDocument()
  })
})
