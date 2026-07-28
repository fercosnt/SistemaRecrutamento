/**
 * extractRole — Phase 3 Wave 2 (Plan 03-03).
 *
 * Behaviors covered: B7 (D-13 / Bug 1 fix — extractRole must decode JWT payload,
 * NOT read session.user.app_metadata).
 *
 * See .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md (B7)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { extractRole } from '../extractRole'

// ============================================================
// Helpers
// ============================================================

/**
 * Mint a well-formed JWT (header.payload.signature) with a fake signature.
 *
 * extractRole never verifies the signature (Supabase-js already verified it
 * server-side — RESEARCH §Q2 / threat `T-supply-chain-jwt-decode`: accept),
 * so any base64url-encoded 3-part token round-trips.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const toBase64Url = (input: string): string =>
    Buffer.from(input)
      .toString('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  const header = toBase64Url('{"alg":"HS256","typ":"JWT"}')
  const body = toBase64Url(JSON.stringify(payload))
  const signature = 'fake-signature-not-verified'
  return `${header}.${body}.${signature}`
}

/** Build a minimal Session-shaped object that satisfies extractRole's type gate. */
function makeSession(access_token: string): Session {
  return { access_token } as unknown as Session
}

// ============================================================
// Console spy harness (Pitfall 7 / T-03-07b)
// ============================================================

// Vitest v4 spy typing for overloaded console methods doesn't satisfy a
// strict `ReturnType<typeof vi.spyOn>`; use `any[]` per STATE.md 02-04 decision.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const consoleSpies: any[] = []

beforeEach(() => {
  // Spy all 5 console methods — any leak is a failure.
  consoleSpies.push(vi.spyOn(console, 'log').mockImplementation(() => {}))
  consoleSpies.push(vi.spyOn(console, 'error').mockImplementation(() => {}))
  consoleSpies.push(vi.spyOn(console, 'warn').mockImplementation(() => {}))
  consoleSpies.push(vi.spyOn(console, 'info').mockImplementation(() => {}))
  consoleSpies.push(vi.spyOn(console, 'debug').mockImplementation(() => {}))
})

afterEach(() => {
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

describe('extractRole — JWT payload decode (Bug 1 / D-13 fix)', () => {
  it('T1.1: returns null for null session', () => {
    expect(extractRole(null)).toBeNull()
  })

  it('T1.2: returns null for empty access_token (short-circuit)', () => {
    expect(extractRole(makeSession(''))).toBeNull()
  })

  it('T1.3 (Bug 1 regression): returns "candidato" when JWT payload has app_metadata.role="candidato"', () => {
    const token = makeJwt({
      sub: 'user-uuid-candidato',
      email: 'candidato@example.com',
      app_metadata: { role: 'candidato', provider: 'email' },
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    expect(extractRole(makeSession(token))).toBe('candidato')
  })

  it('T1.4a: returns "rh" when JWT payload has app_metadata.role="rh"', () => {
    const token = makeJwt({
      sub: 'user-uuid-rh',
      app_metadata: { role: 'rh' },
    })
    expect(extractRole(makeSession(token))).toBe('rh')
  })

  it('T1.4b: returns "administrador" when JWT payload has app_metadata.role="administrador"', () => {
    const token = makeJwt({
      sub: 'user-uuid-admin',
      app_metadata: { role: 'administrador' },
    })
    expect(extractRole(makeSession(token))).toBe('administrador')
  })

  it('T1.5: returns null when app_metadata.role is an unknown string (whitelist enforced)', () => {
    const token = makeJwt({
      sub: 'user-uuid',
      app_metadata: { role: 'hacker' },
    })
    expect(extractRole(makeSession(token))).toBeNull()
  })

  it('T1.6a: returns null when app_metadata is missing entirely', () => {
    const token = makeJwt({
      sub: 'user-uuid',
      email: 'foo@example.com',
    })
    expect(extractRole(makeSession(token))).toBeNull()
  })

  it('T1.6b: returns null when app_metadata exists but has no role claim', () => {
    const token = makeJwt({
      sub: 'user-uuid',
      app_metadata: { provider: 'email' },
    })
    expect(extractRole(makeSession(token))).toBeNull()
  })

  it('T1.7: returns null for malformed token (jwt-decode throws → caught)', () => {
    expect(extractRole(makeSession('not-a-jwt'))).toBeNull()
  })

  it('T1.8 (Pitfall 7 / T-03-07b): NEVER calls console.* across any branch', () => {
    // Cover all failure + success branches in a single test.
    extractRole(null)
    extractRole(makeSession(''))
    extractRole(makeSession('not-a-jwt'))
    extractRole(
      makeSession(
        makeJwt({
          sub: 'user-uuid',
          app_metadata: { role: 'candidato' },
        })
      )
    )
    extractRole(
      makeSession(
        makeJwt({ sub: 'user-uuid', app_metadata: { role: 'hacker' } })
      )
    )

    expectNoConsoleCalls()
  })
})
