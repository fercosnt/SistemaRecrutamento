/**
 * Phase 18 / Plan 18-05 Task 1 — `extractEfErrorCode` contract test (RESIL-03).
 *
 * Locks the shared transport→domain error_code extractor that every AI service
 * routes through. Four behavior cases (18-05-PLAN <behavior>):
 *   1. data.error_code present                     → returns it (e.g. AI_UNAVAILABLE)
 *   2. non-2xx FunctionsHttpError body.error_code  → returns it (via error.context.json())
 *   3. no code anywhere                            → undefined
 *   4. error.context.json() throws / non-JSON body → undefined (degrades, NEVER throws)
 *
 * Mirrors the `decisaoService.test.ts` invokeMock idiom: no network — the
 * `error.context` is a hand-rolled `Response`-like object with a `.json()` stub.
 *
 * @see src/lib/efErrors.ts (the helper under test)
 * @see src/features/decisao/services/__tests__/decisaoService.test.ts (invokeMock idiom)
 */
import { describe, it, expect } from 'vitest'
import { extractEfErrorCode } from '../efErrors'

describe('extractEfErrorCode — shared EF error_code extractor (RESIL-03)', () => {
  it('reads error_code from the 200/parsed body (data.error_code → AI_UNAVAILABLE)', async () => {
    const code = await extractEfErrorCode({ error_code: 'AI_UNAVAILABLE' }, null)
    expect(code).toBe('AI_UNAVAILABLE')
  })

  it('reads error_code from a non-2xx FunctionsHttpError body (error.context.json())', async () => {
    const error = {
      context: { json: () => Promise.resolve({ error_code: 'AI_UNAVAILABLE', retryable: true }) },
    }
    const code = await extractEfErrorCode(null, error)
    expect(code).toBe('AI_UNAVAILABLE')
  })

  it('returns undefined when no error_code is present anywhere', async () => {
    const error = { context: { json: () => Promise.resolve({ message: 'boom' }) } }
    const code = await extractEfErrorCode({ ok: false }, error)
    expect(code).toBeUndefined()
  })

  it('degrades to undefined (never throws) when error.context.json() rejects / body is not JSON', async () => {
    const error = { context: { json: () => Promise.reject(new Error('not JSON')) } }
    await expect(extractEfErrorCode(null, error)).resolves.toBeUndefined()
  })

  it('returns undefined for a null/undefined error with no data code (no Response to read)', async () => {
    expect(await extractEfErrorCode(null, null)).toBeUndefined()
    expect(await extractEfErrorCode(undefined, undefined)).toBeUndefined()
  })

  it('does NOT echo any non-code body field (returns only the code string)', async () => {
    // ASVS V7 / T-18-05-ID: the helper discards message/stack/PII — only the code.
    const code = await extractEfErrorCode(
      { error_code: 'MIXED_VAGA', message: 'sensitive raw transport text', stack: 'x' },
      null,
    )
    expect(code).toBe('MIXED_VAGA')
  })

  it('treats an empty-string error_code as no-code (undefined)', async () => {
    expect(await extractEfErrorCode({ error_code: '' }, null)).toBeUndefined()
  })
})
