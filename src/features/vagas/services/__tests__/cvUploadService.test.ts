/**
 * Phase 4 / Plan 04-03 — cvUploadService Vitest coverage.
 *
 * Activates the 13 Wave 0 stubs from Plan 04-01 Task 6:
 * - validateCV ×3 (T1.1-T1.3): happy + FILE_TOO_LARGE + INVALID_MIME
 * - uploadCV ×6 (T2.1-T2.6): happy + 5 error mappings
 * - getSignedUrl ×2 (T3.1-T3.2): happy + error
 * - removeCV ×2 (T4.1-T4.2): happy + error
 * - Pitfall 7 ×1 (T5.1): console-spy guard against PII / signed URL leaks
 *
 * Storage mock pattern adapted from PATTERNS.md L222-235 — supabase client
 * stubbed with `storage.from()` returning `{ upload, createSignedUrl, remove }`
 * vi.fn instances. The same `mockFrom` is returned on every `from()` call so
 * the same upload/createSignedUrl/remove fns can be programmed per test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Storage mock — `vi.mock` factories are hoisted ABOVE module top-level
// statements, so any vi.fn() referenced by the factory must be created via
// `vi.hoisted()` so it runs in the same hoisted phase. See:
// https://vitest.dev/api/vi.html#vi-hoisted
const { mockUpload, mockCreateSignedUrl, mockRemove, mockFrom, mockInvoke } =
  vi.hoisted(() => {
    const mockUpload = vi.fn()
    const mockCreateSignedUrl = vi.fn()
    const mockRemove = vi.fn()
    const mockFrom = vi.fn(() => ({
      upload: mockUpload,
      createSignedUrl: mockCreateSignedUrl,
      remove: mockRemove,
    }))
    // Phase 32 (SEG-01): getSignedUrl now routes through the get-curriculo-url Edge Function
    // instead of client-side storage signing → mock supabase.functions.invoke alongside storage.
    const mockInvoke = vi.fn()
    return { mockUpload, mockCreateSignedUrl, mockRemove, mockFrom, mockInvoke }
  })

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: { from: mockFrom },
    functions: { invoke: mockInvoke },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  // Deterministic UUID per test — happy-dom provides crypto.randomUUID natively.
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
    '00000000-0000-4000-8000-000000000000' as `${string}-${string}-${string}-${string}-${string}`
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

import {
  validateCV,
  uploadCV,
  getSignedUrl,
  removeCV,
  CVUploadServiceError,
  MAX_FILE_SIZE,
  ALLOWED_MIME,
} from '../cvUploadService'

/**
 * Build a mock File with a given size + MIME type. Default name `cv.pdf`.
 *
 * Uses Uint8Array of the requested length — happy-dom's File constructor
 * preserves `.size` byte count and `.type` accurately.
 */
const buildFile = (sizeBytes: number, mime: string, name = 'cv.pdf'): File => {
  const bytes = new Uint8Array(sizeBytes)
  return new File([bytes], name, { type: mime })
}

describe('cvUploadService (Plan 04-03)', () => {
  describe('validateCV', () => {
    it('T1.1: accepts valid 4MB PDF', () => {
      const file = buildFile(4 * 1024 * 1024, ALLOWED_MIME)
      expect(() => validateCV(file)).not.toThrow()
    })

    it('T1.2: throws FILE_TOO_LARGE on > 5MB', () => {
      const file = buildFile(MAX_FILE_SIZE + 1, ALLOWED_MIME)
      try {
        validateCV(file)
        throw new Error('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(CVUploadServiceError)
        if (e instanceof CVUploadServiceError) {
          expect(e.code).toBe('FILE_TOO_LARGE')
        }
      }
    })

    it('T1.3: throws INVALID_MIME on .docx mime', () => {
      const file = buildFile(
        1024,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'cv.docx'
      )
      try {
        validateCV(file)
        throw new Error('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(CVUploadServiceError)
        if (e instanceof CVUploadServiceError) {
          expect(e.code).toBe('INVALID_MIME')
        }
      }
    })
  })

  describe('uploadCV', () => {
    it('T2.1: happy path returns { path, name, size }', async () => {
      mockUpload.mockResolvedValue({
        data: { path: 'auth-uid/00000000-0000-4000-8000-000000000000.pdf' },
        error: null,
      })
      const file = buildFile(1024 * 1024, ALLOWED_MIME, 'real-cv.pdf')
      const result = await uploadCV(file, 'auth-uid')
      expect(result.path).toBe(
        'auth-uid/00000000-0000-4000-8000-000000000000.pdf'
      )
      expect(result.name).toBe('real-cv.pdf')
      expect(result.size).toBe(1024 * 1024)
      expect(mockUpload).toHaveBeenCalledWith(
        'auth-uid/00000000-0000-4000-8000-000000000000.pdf',
        file,
        expect.objectContaining({
          contentType: ALLOWED_MIME,
          upsert: false,
        })
      )
    })

    it('T2.2: maps "payload too large" → FILE_TOO_LARGE', async () => {
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'Payload too large for bucket' },
      })
      const file = buildFile(1024, ALLOWED_MIME)
      try {
        await uploadCV(file, 'auth-uid')
        throw new Error('should have thrown')
      } catch (e) {
        if (e instanceof CVUploadServiceError) {
          expect(e.code).toBe('FILE_TOO_LARGE')
        } else {
          throw e
        }
      }
    })

    it('T2.3: maps "mime" substring → INVALID_MIME', async () => {
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'mime type not allowed' },
      })
      const file = buildFile(1024, ALLOWED_MIME)
      try {
        await uploadCV(file, 'auth-uid')
        throw new Error('should have thrown')
      } catch (e) {
        if (e instanceof CVUploadServiceError) {
          expect(e.code).toBe('INVALID_MIME')
        } else {
          throw e
        }
      }
    })

    it('T2.4: maps "quota" substring → STORAGE_QUOTA', async () => {
      // Service mapping order: FILE_TOO_LARGE checks both "payload too large"
      // AND "exceeded"; STORAGE_QUOTA checks "quota". To exercise the QUOTA
      // branch deterministically, the fixture message must contain "quota"
      // without "exceeded" (which would short-circuit to FILE_TOO_LARGE).
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'storage quota reached for this user' },
      })
      const file = buildFile(1024, ALLOWED_MIME)
      try {
        await uploadCV(file, 'auth-uid')
        throw new Error('should have thrown')
      } catch (e) {
        if (e instanceof CVUploadServiceError) {
          expect(e.code).toBe('STORAGE_QUOTA')
        } else {
          throw e
        }
      }
    })

    it('T2.5: maps "jwt|unauthorized" → UNAUTHORIZED', async () => {
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'JWT expired' },
      })
      const file = buildFile(1024, ALLOWED_MIME)
      try {
        await uploadCV(file, 'auth-uid')
        throw new Error('should have thrown')
      } catch (e) {
        if (e instanceof CVUploadServiceError) {
          expect(e.code).toBe('UNAUTHORIZED')
        } else {
          throw e
        }
      }
    })

    it('T2.6: maps unknown error → UPLOAD_FAILED', async () => {
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'unspecified network glitch' },
      })
      const file = buildFile(1024, ALLOWED_MIME)
      try {
        await uploadCV(file, 'auth-uid')
        throw new Error('should have thrown')
      } catch (e) {
        if (e instanceof CVUploadServiceError) {
          expect(e.code).toBe('UPLOAD_FAILED')
        } else {
          throw e
        }
      }
    })
  })

  // Phase 32 (SEG-01) — RED until 32-02 rewires getSignedUrl.
  // These encode the post-rewire contract: getSignedUrl(candidaturaId) invokes the
  // get-curriculo-url Edge Function (the ONLY curriculos signer) instead of client-side
  // storage.createSignedUrl. They FAIL now because cvUploadService.ts still calls
  // createSignedUrl (mockInvoke is never reached) — the intended RED. GREEN in 32-02.
  describe('getSignedUrl', () => {
    const CANDIDATURA_ID = '11111111-1111-4111-8111-111111111111'

    it('T3.1: invokes the get-curriculo-url EF with candidatura_id and returns its signedUrl', async () => {
      mockInvoke.mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed?token=abc' },
        error: null,
      })
      const url = await getSignedUrl(CANDIDATURA_ID)
      expect(url).toBe('https://example.com/signed?token=abc')
      expect(mockInvoke).toHaveBeenCalledWith('get-curriculo-url', {
        body: { candidatura_id: CANDIDATURA_ID },
      })
      // The client must NEVER sign the curriculos bucket itself (SEG-01).
      expect(mockCreateSignedUrl).not.toHaveBeenCalled()
    })

    it('T3.2: EF error → throws UPLOAD_FAILED', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'forbidden' },
      })
      try {
        await getSignedUrl(CANDIDATURA_ID)
        throw new Error('should have thrown')
      } catch (e) {
        if (e instanceof CVUploadServiceError) {
          expect(e.code).toBe('UPLOAD_FAILED')
        } else {
          throw e
        }
      }
    })
  })

  describe('removeCV', () => {
    it('T4.1: happy path resolves', async () => {
      mockRemove.mockResolvedValue({ data: [], error: null })
      await expect(removeCV('auth-uid/file.pdf')).resolves.toBeUndefined()
      expect(mockRemove).toHaveBeenCalledWith(['auth-uid/file.pdf'])
    })

    it('T4.2: error case throws UPLOAD_FAILED', async () => {
      mockRemove.mockResolvedValue({
        data: null,
        error: { message: 'forbidden' },
      })
      try {
        await removeCV('auth-uid/file.pdf')
        throw new Error('should have thrown')
      } catch (e) {
        if (e instanceof CVUploadServiceError) {
          expect(e.code).toBe('UPLOAD_FAILED')
        } else {
          throw e
        }
      }
    })
  })

  describe('Pitfall 7 redaction', () => {
    it('T5.1: no console.* logs file.name OR signed URL OR token across all functions', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      // Exercise all happy paths — uploadCV, getSignedUrl, removeCV in turn.
      mockUpload.mockResolvedValue({
        data: { path: 'auth-uid/u.pdf' },
        error: null,
      })
      // Phase 32 (SEG-01): getSignedUrl now drives the get-curriculo-url EF (invoke), whose
      // signedUrl carries the SECRET token the redaction assertion must never see logged. Both
      // signing paths are stubbed with the SECRET token so this redaction guard stays GREEN
      // whether the pre-32-02 client-signing path or the post-32-02 invoke path runs — redaction
      // is an always-on invariant, not one of the intended-RED getSignedUrl contract surfaces.
      mockInvoke.mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed?token=SECRET' },
        error: null,
      })
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed?token=SECRET' },
        error: null,
      })
      mockRemove.mockResolvedValue({ data: [], error: null })

      // The PII filename is intentionally distinctive to make a leak unmissable
      // in the assertion regex below.
      const file = buildFile(
        1024,
        ALLOWED_MIME,
        'CONFIDENTIAL_CV_Joao_Silva.pdf'
      )
      await uploadCV(file, 'auth-uid')
      await getSignedUrl('11111111-1111-4111-8111-111111111111')
      await removeCV('auth-uid/u.pdf')

      // Aggregate every console.* call's arg list into one searchable string.
      const allArgs: string[] = []
      const collect = (calls: unknown[][]) => {
        for (const call of calls) {
          for (const arg of call) {
            allArgs.push(typeof arg === 'string' ? arg : JSON.stringify(arg))
          }
        }
      }
      collect(consoleLogSpy.mock.calls)
      collect(consoleErrorSpy.mock.calls)
      collect(consoleWarnSpy.mock.calls)
      const combined = allArgs.join(' | ')

      // Pitfall 7 forbidden tokens for Phase 4.
      expect(combined).not.toMatch(/CONFIDENTIAL_CV_Joao_Silva\.pdf/)
      expect(combined).not.toMatch(/signed\?token=/i)
      expect(combined).not.toMatch(/SECRET/)
      expect(combined).not.toMatch(/access_token/i)
      expect(combined).not.toMatch(/refresh_token/i)

      consoleLogSpy.mockRestore()
      consoleErrorSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })
  })
})
