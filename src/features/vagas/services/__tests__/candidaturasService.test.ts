/**
 * Plan 04-05 Task 3 — candidaturasService.submitCandidaturaWithRespostas
 * Vitest coverage.
 *
 * 7 cases covering:
 *   T1. Happy path → { candidaturaId }
 *   T2. DUPLICATE_CANDIDATURA → CandidaturasServiceError code DUPLICATE_APPLICATION
 *   T3. VALIDATION → INVALID_INPUT
 *   T4. UNAUTHORIZED → UNAUTHORIZED
 *   T5. SERVER_ERROR → DATABASE_ERROR
 *   T6. invokeError (transport) → NETWORK_ERROR
 *   T7. Pitfall 7 / B2 — log args contain redacted shape only; never
 *       curriculo_url or curriculo_nome (PII). Sentinel strings asserted absent.
 *
 * Mock pattern: hoisted `vi.mock('@/lib/supabase/client')` with
 * `functions.invoke` as a `vi.fn()` (mirrors Wave 1a precedent + Phase 2
 * cadastroService.test.ts pattern).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
  },
}))

import { supabase } from '@/lib/supabase/client'
import {
  submitCandidaturaWithRespostas,
  CandidaturasServiceError,
} from '../candidaturasService'

const baseInput = {
  candidato_id: '11111111-2222-3333-4444-555555555555',
  vaga_id: '22222222-3333-4444-5555-666666666666',
  curriculo_url: 'auth-uid/uuid.pdf',
  curriculo_nome: 'cv.pdf',
  curriculo_size: 1024,
  respostas: [],
}

describe('submitCandidaturaWithRespostas (Plan 04-05)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('T1: happy path returns { candidaturaId }', async () => {
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        ok: true,
        data: { candidaturaId: 'cand-uuid', candidaturaUrl: '/candidato/perfil' },
      },
      error: null,
    })
    const result = await submitCandidaturaWithRespostas(baseInput)
    expect(result.candidaturaId).toBe('cand-uuid')
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'submit-candidatura',
      expect.objectContaining({ body: baseInput })
    )
  })

  it('T2: maps DUPLICATE_CANDIDATURA → DUPLICATE_APPLICATION', async () => {
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        ok: false,
        error_code: 'DUPLICATE_CANDIDATURA',
        message: 'Você já se candidatou a esta vaga.',
      },
      error: null,
    })
    try {
      await submitCandidaturaWithRespostas(baseInput)
      throw new Error('should have thrown')
    } catch (e) {
      if (e instanceof CandidaturasServiceError) {
        expect(e.code).toBe('DUPLICATE_APPLICATION')
        expect(e.message).toMatch(/já se candidatou/)
      } else throw e
    }
  })

  it('T3: maps VALIDATION → INVALID_INPUT', async () => {
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        ok: false,
        error_code: 'VALIDATION',
        message: 'Payload inválido',
        field: 'curriculo_url',
      },
      error: null,
    })
    try {
      await submitCandidaturaWithRespostas(baseInput)
      throw new Error('should have thrown')
    } catch (e) {
      if (e instanceof CandidaturasServiceError) {
        expect(e.code).toBe('INVALID_INPUT')
      } else throw e
    }
  })

  it('T4: maps UNAUTHORIZED → UNAUTHORIZED', async () => {
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ok: false, error_code: 'UNAUTHORIZED', message: 'Sessão inválida.' },
      error: null,
    })
    try {
      await submitCandidaturaWithRespostas(baseInput)
      throw new Error('should have thrown')
    } catch (e) {
      if (e instanceof CandidaturasServiceError) {
        expect(e.code).toBe('UNAUTHORIZED')
      } else throw e
    }
  })

  it('T5: maps SERVER_ERROR → DATABASE_ERROR', async () => {
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        ok: false,
        error_code: 'SERVER_ERROR',
        message: 'Não foi possível registrar a candidatura.',
      },
      error: null,
    })
    try {
      await submitCandidaturaWithRespostas(baseInput)
      throw new Error('should have thrown')
    } catch (e) {
      if (e instanceof CandidaturasServiceError) {
        expect(e.code).toBe('DATABASE_ERROR')
      } else throw e
    }
  })

  it('T6: maps invokeError (transport) → NETWORK_ERROR', async () => {
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch' },
    })
    try {
      await submitCandidaturaWithRespostas(baseInput)
      throw new Error('should have thrown')
    } catch (e) {
      if (e instanceof CandidaturasServiceError) {
        expect(e.code).toBe('NETWORK_ERROR')
      } else throw e
    }
  })

  it('T7: Pitfall 7 / B2 — logs contain {vaga_id, candidato_id, respostas_count} but NEVER curriculo_url, curriculo_nome, or PII filenames', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ok: true, data: { candidaturaId: 'cand-uuid' } },
      error: null,
    })
    // B2: curriculo_url path AND curriculo_nome filename are both PII; both
    // must be redacted. The literal sentinels below are the spy assertion
    // targets — if either appears in console output, redaction is broken.
    await submitCandidaturaWithRespostas({
      ...baseInput,
      curriculo_url: 'PATH_SHOULD_NOT_APPEAR/file.pdf',
      curriculo_nome: 'PII_FILENAME_SHOULD_NOT_APPEAR_IN_LOGS.pdf',
    })
    const allArgs = [
      ...consoleSpy.mock.calls,
      ...consoleErrorSpy.mock.calls,
    ]
      .flat()
      .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
      .join(' | ')
    // Allowed redacted keys (positive assertion)
    expect(allArgs).toMatch(/vaga_id/)
    expect(allArgs).toMatch(/candidato_id/)
    expect(allArgs).toMatch(/respostas_count/)
    // B2 forbidden tokens (negative assertions — all must be absent)
    expect(allArgs).not.toMatch(/PATH_SHOULD_NOT_APPEAR/)
    expect(allArgs).not.toMatch(/PII_FILENAME_SHOULD_NOT_APPEAR_IN_LOGS/)
    expect(allArgs).not.toMatch(/curriculo_url/)
    expect(allArgs).not.toMatch(/curriculo_nome/)
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })
})
