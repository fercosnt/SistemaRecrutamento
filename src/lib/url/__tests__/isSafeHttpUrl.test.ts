/**
 * Phase 48 / Plan 48-03 Task 2 — JORN-D5 shared URL guard.
 *
 * `isSafeHttpUrl` was a private helper of `AgendamentoCandidatoCard` (render side, WR-01).
 * It now lives in `src/lib/url/` so the SAME function decides both whether the candidate
 * sees a clickable link and whether the RH form accepts an online interview link.
 *
 * @see src/lib/url/isSafeHttpUrl.ts
 */
import { describe, it, expect } from 'vitest'
import { isSafeHttpUrl } from '@/lib/url/isSafeHttpUrl'

describe('isSafeHttpUrl — http(s) only (JORN-D5 / WR-01)', () => {
  it('aceita https com host', () => {
    expect(isSafeHttpUrl('https://meet.google.com/x')).toBe(true)
  })

  it('aceita http com host', () => {
    expect(isSafeHttpUrl('http://a.b')).toBe(true)
  })

  it('apara espaços antes de avaliar', () => {
    expect(isSafeHttpUrl('  https://a.b  ')).toBe(true)
  })

  it('recusa texto sem esquema (o caso dddd medido em PROD)', () => {
    expect(isSafeHttpUrl('dddd')).toBe(false)
  })

  it('recusa javascript:', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
  })

  it('recusa data:', () => {
    expect(isSafeHttpUrl('data:text/html,<b>x</b>')).toBe(false)
  })

  it('recusa vazio', () => {
    expect(isSafeHttpUrl('')).toBe(false)
  })

  it('recusa esquema sem host', () => {
    expect(isSafeHttpUrl('https://')).toBe(false)
  })
})
