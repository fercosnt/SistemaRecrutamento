/**
 * Wave 0 STUB — flesh out in Plan 04-03.
 * Coverage target: 100% of cvUploadService (validateCV, uploadCV, getSignedUrl, removeCV).
 */
import { describe, it, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        createSignedUrl: vi.fn(),
        remove: vi.fn(),
      })),
    },
  },
}))

describe('cvUploadService (Wave 0 stub — Plan 04-03)', () => {
  describe('validateCV', () => {
    it.skip('T1.1: accepts valid 4MB PDF (Plan 04-03)', () => {})
    it.skip('T1.2: throws FILE_TOO_LARGE on 6MB (Plan 04-03)', () => {})
    it.skip('T1.3: throws INVALID_MIME on .docx (Plan 04-03)', () => {})
  })
  describe('uploadCV', () => {
    it.skip('T2.1: happy path returns { path, name, size } (Plan 04-03)', () => {})
    it.skip('T2.2: maps "payload too large" → FILE_TOO_LARGE (Plan 04-03)', () => {})
    it.skip('T2.3: maps "mime" substring → INVALID_MIME (Plan 04-03)', () => {})
    it.skip('T2.4: maps "quota" substring → STORAGE_QUOTA (Plan 04-03)', () => {})
    it.skip('T2.5: maps "jwt|unauthorized" → UNAUTHORIZED (Plan 04-03)', () => {})
  })
  describe('getSignedUrl', () => {
    it.skip('T3.1: happy path returns signed URL (Plan 04-03)', () => {})
    it.skip('T3.2: error case throws UPLOAD_FAILED (Plan 04-03)', () => {})
  })
  describe('removeCV', () => {
    it.skip('T4.1: happy path resolves (Plan 04-03)', () => {})
    it.skip('T4.2: error case throws UPLOAD_FAILED (Plan 04-03)', () => {})
  })
  describe('Pitfall 7 redaction', () => {
    it.skip('T5.1: no console.* logs file.name across all functions (Plan 04-03)', () => {})
  })
})
