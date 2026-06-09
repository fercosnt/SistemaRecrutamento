/**
 * Vitest global setup — Phase 2 Wave 0.
 * Extends `expect` with @testing-library/jest-dom matchers so hook/component tests
 * can use `.toBeInTheDocument()`, `.toHaveAttribute()`, etc.
 *
 * Wired via vite.config.ts `test.setupFiles`.
 *
 * ── Phase 11 (11-03) — RTL ⇄ vitest fake-timer bridge ──
 * `@testing-library/dom`'s `jestFakeTimersAreEnabled()` only returns true when a
 * global `jest` exists (`typeof jest !== 'undefined'`). Under vitest there is no
 * `jest` global, so `waitFor` wrongly believes REAL timers are active and polls
 * with `setInterval` — which vitest's `vi.useFakeTimers()` has stubbed — so the
 * poll never fires and `waitFor` hangs to its timeout even when the asserted
 * condition is already met. The canonical vitest recipe is a minimal `jest` shim
 * that delegates timer control to `vi`. It is additive: RTL still reads
 * `setTimeout.clock` to decide whether timers are faked, so when a test runs on
 * real timers `waitFor` behaves exactly as before.
 * @see node_modules/@testing-library/dom/dist/helpers.js (jestFakeTimersAreEnabled)
 */
import { vi } from 'vitest'
import '@testing-library/jest-dom'

const globalWithJest = globalThis as typeof globalThis & {
  jest?: unknown
}

if (typeof globalWithJest.jest === 'undefined') {
  globalWithJest.jest = {
    advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
    advanceTimersByTimeAsync: vi.advanceTimersByTimeAsync.bind(vi),
  }
}
