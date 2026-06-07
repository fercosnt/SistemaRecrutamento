/**
 * Phase 7 / Plan 07-01 Task 2 — Wave 0 RED scaffold for configVagaService (VAGACFG-01/02/03).
 *
 * Imports the PLANNED (not-yet-existing) service from
 * `@/features/config-vaga/services/configVagaService`. Compiles under TS strict
 * but is EXPECTED to FAIL at runtime (module-not-found) until Plan 03/04 lands
 * the service. Do NOT stub the module to make this green.
 *
 * Mock pattern mirrors src/features/vagas/services/__tests__/vagasService.test.ts.
 *
 * Coverage (RESEARCH §Architecture + §Code Examples):
 *   - updateVagaConfig issues `.from('vagas').update(...)`
 *   - upsertOpcoesMetadata calls `.rpc('upsert_pergunta_opcoes_metadata', {...})`
 *   - publishVaga calls `.rpc('publish_vaga', { p_vaga_id })`
 *   - a Supabase 42501 error maps to ConfigVagaServiceError code 'FORBIDDEN'
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-RESEARCH.md §Code Examples
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-12)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}))

import { supabase } from '@/lib/supabase/client'
import {
  updateVagaConfig,
  upsertOpcoesMetadata,
  publishVaga,
  ConfigVagaServiceError,
} from '@/features/config-vaga/services/configVagaService'

const mockUpdateChain = (final: { data?: unknown; error?: unknown }) => ({
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue(final),
})

describe('configVagaService (Plan 07-01 — Wave 0 RED)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('T1: updateVagaConfig issues a vagas UPDATE', async () => {
    const chain = mockUpdateChain({ data: null, error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    await updateVagaConfig('vaga-uuid', {
      testes_aplicaveis: [],
      pesos_avaliacao: {
        triagem: 30,
        work_sample_sjt: 30,
        redacao_cultural: 15,
        entrevista: 25,
      },
    })

    expect(supabase.from).toHaveBeenCalledWith('vagas')
    expect(chain.update).toHaveBeenCalled()
  })

  it('T2: upsertOpcoesMetadata calls the RPC by exact name', async () => {
    ;(supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { pergunta_id: 'p1', opcoes_count: 2 },
      error: null,
    })

    await upsertOpcoesMetadata('p1', [{ texto: 'Sim' }, { texto: 'Não' }])

    expect(supabase.rpc).toHaveBeenCalledWith(
      'upsert_pergunta_opcoes_metadata',
      expect.objectContaining({ p_pergunta_id: 'p1' })
    )
  })

  it('T3: publishVaga calls publish_vaga RPC by exact name', async () => {
    ;(supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { status: 'ativa' },
      error: null,
    })

    await publishVaga('vaga-uuid')

    expect(supabase.rpc).toHaveBeenCalledWith(
      'publish_vaga',
      expect.objectContaining({ p_vaga_id: 'vaga-uuid' })
    )
  })

  it('T4: a Supabase 42501 error maps to ConfigVagaServiceError FORBIDDEN', async () => {
    ;(supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'forbidden' },
    })

    await expect(
      upsertOpcoesMetadata('p1', [{ texto: 'Sim' }])
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    // The thrown error is an instance of the custom error class.
    try {
      await upsertOpcoesMetadata('p1', [{ texto: 'Sim' }])
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigVagaServiceError)
    }
  })
})
