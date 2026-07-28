/**
 * Plan 04-02 Task 1 — isUuid runtime UUID-vs-slug discriminator tests.
 * Promoted from Wave 0 stubs (Plan 04-01 Task 6).
 */
import { describe, it, expect } from 'vitest'
import { isUuid } from '../isUuid'

describe('isUuid (Plan 04-02)', () => {
  it('T1: valid UUID v4 returns true', () => {
    expect(isUuid('11111111-2222-3333-4444-555555555555')).toBe(true)
  })
  it('T2: lowercase UUID returns true', () => {
    expect(isUuid('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe(true)
  })
  it('T3: UUID with extra chars returns false', () => {
    expect(isUuid('11111111-2222-3333-4444-555555555555-extra')).toBe(false)
  })
  it('T4: slug-shaped string returns false', () => {
    expect(isUuid('atendimento-ao-paciente')).toBe(false)
  })
  it('T5: empty string returns false', () => {
    expect(isUuid('')).toBe(false)
  })
  it('T6: UUIDv7 (RFC 9562 hex chars) also matches', () => {
    expect(isUuid('01234567-89ab-7def-8123-456789abcdef')).toBe(true)
  })
})
