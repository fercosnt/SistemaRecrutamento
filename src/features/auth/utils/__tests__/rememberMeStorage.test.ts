/**
 * rememberMeStorage adapter — Phase 3 Wave 2 (Plan 03-03).
 *
 * Behaviors covered:
 *   - B5: setRememberMeMode("session") routes to sessionStorage (session dies on tab close)
 *   - B6: default / "local" mode routes to localStorage (session survives tab close)
 *   - B16: mode swap wipes pre-existing sb-* keys from the OTHER store (T-03-04)
 *
 * Uses vi.resetModules() + dynamic import to guarantee the module-scoped
 * `currentMode` is reset before each test (adapter has no __resetForTests hook).
 *
 * See .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md (B5, B6, B16)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Vitest v4 spy typing escape hatch (STATE.md 02-04 decision).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const consoleSpies: any[] = []

// Runtime import type — lazy (re-imported per-test after vi.resetModules()).
type RememberMeModule = typeof import('../rememberMeStorage')

async function loadFreshModule(): Promise<RememberMeModule> {
  vi.resetModules()
  return await import('../rememberMeStorage')
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  // Console spies — Pitfall 7 gate.
  consoleSpies.push(vi.spyOn(console, 'log').mockImplementation(() => {}))
  consoleSpies.push(vi.spyOn(console, 'error').mockImplementation(() => {}))
  consoleSpies.push(vi.spyOn(console, 'warn').mockImplementation(() => {}))
  consoleSpies.push(vi.spyOn(console, 'info').mockImplementation(() => {}))
  consoleSpies.push(vi.spyOn(console, 'debug').mockImplementation(() => {}))
})

afterEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  consoleSpies.length = 0
})

function expectNoConsoleCalls(): void {
  for (const spy of consoleSpies) {
    expect(spy).not.toHaveBeenCalled()
  }
}

// ============================================================
// Tests
// ============================================================

describe('rememberMeStorage — D-19 storage adapter (B5, B6, B16)', () => {
  it('T2.1 (B6): default "local" mode writes to localStorage, not sessionStorage', async () => {
    const { rememberMeStorage } = await loadFreshModule()

    rememberMeStorage.setItem('sb-auth-token', 'value')

    expect(window.localStorage.getItem('sb-auth-token')).toBe('value')
    expect(window.sessionStorage.getItem('sb-auth-token')).toBeNull()
  })

  it('T2.2 (B5): setRememberMeMode("session") routes subsequent writes to sessionStorage', async () => {
    const { rememberMeStorage, setRememberMeMode } = await loadFreshModule()

    setRememberMeMode('session')
    rememberMeStorage.setItem('sb-auth-token', 'new')

    expect(window.sessionStorage.getItem('sb-auth-token')).toBe('new')
    expect(window.localStorage.getItem('sb-auth-token')).toBeNull()
  })

  it('T2.3 (read-through): getItem falls back to OTHER store when backing is empty', async () => {
    const { rememberMeStorage } = await loadFreshModule()

    // Mode is 'local' (default), localStorage empty, sessionStorage has value.
    window.sessionStorage.setItem('sb-auth-token', 'other-tab-value')

    expect(rememberMeStorage.getItem('sb-auth-token')).toBe('other-tab-value')
  })

  it('T2.4 (B16 / T-03-04): setRememberMeMode("session") wipes sb-* keys from localStorage only', async () => {
    const { setRememberMeMode } = await loadFreshModule()

    window.localStorage.setItem('sb-auth-token', 'persisted')
    window.localStorage.setItem('sb-project-ref', 'isljnozzlvckrgjjbjwp')
    window.localStorage.setItem('unrelated', 'keep')

    setRememberMeMode('session')

    expect(window.localStorage.getItem('sb-auth-token')).toBeNull()
    expect(window.localStorage.getItem('sb-project-ref')).toBeNull()
    expect(window.localStorage.getItem('unrelated')).toBe('keep')
  })

  it('T2.5 (idempotent): setRememberMeMode("local") when already "local" is a no-op (does not wipe sessionStorage)', async () => {
    const { setRememberMeMode } = await loadFreshModule()

    // Pre-seed sessionStorage with sb-* key — should survive the no-op swap.
    window.sessionStorage.setItem('sb-pre-existing', 'keep-me')

    setRememberMeMode('local')

    expect(window.sessionStorage.getItem('sb-pre-existing')).toBe('keep-me')
  })

  it('T2.6 (removeItem clears both): SIGNED_OUT wipes value from localStorage and sessionStorage', async () => {
    const { rememberMeStorage } = await loadFreshModule()

    window.localStorage.setItem('sb-auth-token', 'a')
    window.sessionStorage.setItem('sb-auth-token', 'b')

    rememberMeStorage.removeItem('sb-auth-token')

    expect(window.localStorage.getItem('sb-auth-token')).toBeNull()
    expect(window.sessionStorage.getItem('sb-auth-token')).toBeNull()
  })

  it('T2.7 (session → local swap): session mode writes, then swap to local wipes session sb-* and redirects writes', async () => {
    const { rememberMeStorage, setRememberMeMode } = await loadFreshModule()

    setRememberMeMode('session')
    rememberMeStorage.setItem('sb-auth-token', 'ephemeral')
    expect(window.sessionStorage.getItem('sb-auth-token')).toBe('ephemeral')

    setRememberMeMode('local')

    // Session sb-* wiped on swap (symmetric T-03-04 mitigation).
    expect(window.sessionStorage.getItem('sb-auth-token')).toBeNull()

    // New writes land in localStorage.
    rememberMeStorage.setItem('sb-auth-token', 'persistent')
    expect(window.localStorage.getItem('sb-auth-token')).toBe('persistent')
    expect(window.sessionStorage.getItem('sb-auth-token')).toBeNull()
  })

  it('T2.8 (Pitfall 7): NO console.* calls across any operation', async () => {
    const { rememberMeStorage, setRememberMeMode } = await loadFreshModule()

    // Exercise all branches (happy + idempotent + swap).
    rememberMeStorage.setItem('sb-k', 'v')
    rememberMeStorage.getItem('sb-k')
    rememberMeStorage.getItem('sb-missing')
    setRememberMeMode('session')
    rememberMeStorage.setItem('sb-k', 'v2')
    setRememberMeMode('session') // idempotent
    rememberMeStorage.removeItem('sb-k')
    setRememberMeMode('local')

    expectNoConsoleCalls()
  })

  it('T2.9 (getItem primary hit): when backing has a value, OTHER store is not consulted for the return value', async () => {
    const { rememberMeStorage } = await loadFreshModule()

    window.localStorage.setItem('sb-k', 'primary')
    window.sessionStorage.setItem('sb-k', 'other')

    // Default mode is 'local' — returns backing first.
    expect(rememberMeStorage.getItem('sb-k')).toBe('primary')
  })
})
