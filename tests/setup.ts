/**
 * Vitest global setup — Phase 2 Wave 0.
 * Extends `expect` with @testing-library/jest-dom matchers so hook/component tests
 * can use `.toBeInTheDocument()`, `.toHaveAttribute()`, etc.
 *
 * Wired via vite.config.ts `test.setupFiles`.
 */
import '@testing-library/jest-dom'
