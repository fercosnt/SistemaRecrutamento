/**
 * Plan 04-02 Task 2 — vagasService.getVagaBySlug Vitest coverage.
 *
 * 6 cases covering happy path, anti-enumeration generic 404 (D-09 carryover from
 * Phase 3), INVALID_INPUT, DATABASE_ERROR mapping, and Pitfall 7 console-spy guard.
 *
 * Mock pattern: supabase.from chain mocked via mockReturnThis (mirrors
 * cadastroService.test.ts:29-39 pattern documented in 04-PATTERNS.md L207-220).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase/client'
import { getVagaBySlug, listVagas } from '../vagasService'

const mockChain = (final: { data?: unknown; error?: unknown }) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue(final),
})

describe('getVagaBySlug (Plan 04-02)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('T1: returns success when slug exists', async () => {
    const fakeVaga = {
      id: 'vaga-uuid',
      titulo: 'Teste',
      slug: 'teste',
      status: 'ativa',
      created_at: '2026-04-25T00:00:00Z',
    }
    // First call (vaga lookup) returns fakeVaga; subsequent calls (enriquecerVaga
    // count queries) return empty/zero — they don't gate success here.
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
      (table: string) => {
        if (table === 'vagas') {
          return mockChain({ data: fakeVaga, error: null })
        }
        // candidaturas count queries
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi
            .fn()
            .mockResolvedValue({ data: [], count: 0, error: null }),
        }
      }
    )
    const result = await getVagaBySlug('teste')
    expect(result.success).toBe(true)
  })

  it('T2: returns NOT_FOUND on PGRST116 with anti-enumeration generic message', async () => {
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(
      mockChain({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
    )
    const result = await getVagaBySlug('nonexistent-slug')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('Vaga não encontrada')
  })

  it('T3: returns INVALID_INPUT on empty string', async () => {
    const result = await getVagaBySlug('')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('Slug da vaga inválido')
  })

  it('T4: anti-enumeration — same message when row missing without PGRST116', async () => {
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(
      mockChain({ data: null, error: null })
    )
    const result = await getVagaBySlug('soft-deleted-slug')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('Vaga não encontrada')
  })

  it('T5: maps DATABASE_ERROR for non-PGRST116 errors', async () => {
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(
      mockChain({
        data: null,
        error: { code: 'XX001', message: 'connection lost' },
      })
    )
    const result = await getVagaBySlug('teste')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/^Erro ao buscar vaga/)
  })

  it('T6: Pitfall 7 — no console.* calls during getVagaBySlug execution', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(
      mockChain({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
    )
    await getVagaBySlug('teste')
    expect(consoleSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })
})

/**
 * Plan 25-09 Task 2 — enriquecerVaga per-vaga status counts, threaded from
 * listVagas via `includeCounts` (independent of candidatoId).
 *
 * Closes the UX-06 RH-tile gap: an RH/administrador session has
 * authStore.candidato === null, so the old candidatoId-gated count path never
 * ran for the RH VagasRHPage tiles (always 0). The count query is now driven by
 * includeCounts (true for any authenticated session per useVagas), while the
 * WR-10 anon-safety early-return is preserved (anon = no candidatoId AND no
 * includeCounts → zero candidaturas round-trips).
 */
const fakeVagaRow = {
  id: 'vaga-uuid',
  titulo: 'Dentista',
  slug: 'dentista',
  status: 'ativa',
  created_at: '2026-04-25T00:00:00Z',
}

/** Thenable list-query mock: chain methods return `this`, `.range()` resolves. */
const mockVagasListQuery = (rows: unknown[]) => ({
  select: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockResolvedValue({ data: rows, error: null, count: rows.length }),
})

/** candidaturas status-count query mock: `.select().eq().is()` resolves. */
const mockCandidaturasCountQuery = (
  statusRows: Array<{ status: string | null }>
) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockResolvedValue({ data: statusRows, error: null }),
})

describe('listVagas includeCounts (Plan 25-09)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('T7: RH-style call (includeCounts=true, no candidatoId) populates real per-vaga counts', async () => {
    const statusRows = [
      { status: 'em_analise' },
      { status: 'em_analise' },
      { status: 'aprovado_proxima' },
      { status: 'rejeitado' },
    ]
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
      (table: string) => {
        if (table === 'vagas') return mockVagasListQuery([fakeVagaRow])
        return mockCandidaturasCountQuery(statusRows)
      }
    )

    // No candidatoId (RH session), includeCounts=true
    const res = await listVagas(
      { filters: { apenasAtivas: false }, pagination: { page: 1, limit: 12 } },
      undefined,
      true
    )

    expect(res.success).toBe(true)
    const vaga = res.data[0]
    expect(vaga.totalCandidatos).toBe(4)
    expect(vaga.candidatosEmAnalise).toBe(2)
    expect(vaga.candidatosAprovados).toBe(1)
    // RH session has no candidatoId → hasUserApplied query must NOT run,
    // so the only candidaturas read is the count query itself.
    expect(supabase.from).toHaveBeenCalledWith('candidaturas')
  })

  it('T8: anon-style call (no candidatoId, includeCounts falsy) issues NO candidaturas query and leaves counts undefined (WR-10 preserved)', async () => {
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
      (table: string) => {
        if (table === 'vagas') return mockVagasListQuery([fakeVagaRow])
        return mockCandidaturasCountQuery([])
      }
    )

    // Anon: no candidatoId, no includeCounts
    const res = await listVagas({ filters: { apenasAtivas: false } })

    expect(res.success).toBe(true)
    const vaga = res.data[0]
    expect(vaga.totalCandidatos).toBeUndefined()
    expect(vaga.candidatosEmAnalise).toBeUndefined()
    expect(vaga.candidatosAprovados).toBeUndefined()
    // The whole point of WR-10: anon issues zero candidaturas round-trips.
    expect(supabase.from).not.toHaveBeenCalledWith('candidaturas')
  })
})
