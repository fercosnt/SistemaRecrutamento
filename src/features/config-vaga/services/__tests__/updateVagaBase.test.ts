/**
 * Phase 25 / Plan 25-03 Task 1 — unit proof for `updateVagaBase` (FUNIL-04).
 *
 * The Editar Vaga base-field write-path. Asserts the writer:
 *   - issues a single `.from('vagas').update(...).eq('id', vagaId)`
 *   - sends REAL column names only (faixa_salarial_min/max, jornada_trabalho,
 *     responsabilidades, requisitos_*, diferenciais, status) — no phantom key
 *   - maps a Supabase 42501 → ConfigVagaServiceError code 'FORBIDDEN'
 *   - maps any other error → 'DATABASE_ERROR'
 *
 * Mock idiom mirrors `configVagaService.test.ts` (from().update().eq() chain).
 * Anon client only — never `supabaseAdmin` (CLAUDE.md Security Rules).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}))

import { supabase } from '@/lib/supabase/client'
import {
  updateVagaBase,
  ConfigVagaServiceError,
  type VagaBaseInput,
} from '@/features/config-vaga/services/configVagaService'

const mockUpdateChain = (final: { data?: unknown; error?: unknown }) => ({
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue(final),
})

const sampleBase: VagaBaseInput = {
  titulo: 'Dentista',
  departamento: 'Clínico',
  cidade: 'São Paulo',
  estado: 'SP',
  faixaSalarialMin: 3000,
  faixaSalarialMax: 5000,
  jornada: '40h/semana',
  responsabilidades: 'Atender pacientes',
  formacao: 'Superior completo',
  experiencia: '2 anos',
  tecnicos: 'Radiologia',
  habilidades: 'Boa comunicação',
  perfilIdeal: 'Proativo e empático',
  diferenciais: 'Inglês fluente',
  status: 'rascunho',
}

describe('updateVagaBase (Plan 25-03 — FUNIL-04)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('issues a vagas UPDATE keyed on the vaga id', async () => {
    const chain = mockUpdateChain({ data: null, error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    await updateVagaBase('vaga-uuid', sampleBase)

    expect(supabase.from).toHaveBeenCalledWith('vagas')
    expect(chain.update).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'vaga-uuid')
  })

  it('sends REAL column names only (incl. status) and no phantom key', async () => {
    const chain = mockUpdateChain({ data: null, error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    await updateVagaBase('vaga-uuid', sampleBase)

    const payload = chain.update.mock.calls[0][0] as Record<string, unknown>

    // real columns present + mapped values
    expect(payload).toHaveProperty('faixa_salarial_min', 3000)
    expect(payload).toHaveProperty('faixa_salarial_max', 5000)
    expect(payload).toHaveProperty('jornada_trabalho', '40h/semana')
    expect(payload).toHaveProperty('responsabilidades', 'Atender pacientes')
    expect(payload).toHaveProperty('requisitos_formacao', 'Superior completo')
    expect(payload).toHaveProperty('requisitos_experiencia', '2 anos')
    expect(payload).toHaveProperty('requisitos_tecnicos', 'Radiologia')
    expect(payload).toHaveProperty('requisitos_habilidades', 'Boa comunicação')
    expect(payload).toHaveProperty('perfil_ideal', 'Proativo e empático')
    expect(payload).toHaveProperty('diferenciais', 'Inglês fluente')
    expect(payload).toHaveProperty('status', 'rascunho')

    // NO phantom key survives (the 8 columns that do not exist on the Row)
    const keys = Object.keys(payload)
    expect(keys).not.toContain('faixa_salarial')
    expect(keys).not.toContain('carga_horaria')
    expect(keys).not.toContain('descricao_completa')
    for (const k of keys) {
      // singular `requisito_*` are phantom; real columns are plural `requisitos_*`
      expect(k.startsWith('requisito_')).toBe(false)
    }
  })

  it('persists slug, tipo_contrato, modelo_trabalho and descricao_curta when given (2026-09-05)', async () => {
    const chain = mockUpdateChain({ data: null, error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    await updateVagaBase('vaga-uuid', {
      ...sampleBase,
      slug: ' dentista-sede ',
      tipoContrato: 'CLT',
      modeloTrabalho: 'Presencial',
      descricaoCurta: 'Atende pacientes na sede.',
    })

    const payload = chain.update.mock.calls[0][0] as Record<string, unknown>
    expect(payload).toHaveProperty('slug', 'dentista-sede')
    expect(payload).toHaveProperty('tipo_contrato', 'CLT')
    expect(payload).toHaveProperty('modelo_trabalho', 'Presencial')
    expect(payload).toHaveProperty('descricao_curta', 'Atende pacientes na sede.')
  })

  it('omits the 4 optional columns when undefined, and never sends an empty slug', async () => {
    const chain = mockUpdateChain({ data: null, error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    await updateVagaBase('vaga-uuid', { ...sampleBase, slug: '   ' })

    const keys = Object.keys(chain.update.mock.calls[0][0] as Record<string, unknown>)
    expect(keys).not.toContain('slug')
    expect(keys).not.toContain('tipo_contrato')
    expect(keys).not.toContain('modelo_trabalho')
    expect(keys).not.toContain('descricao_curta')
  })

  it('maps a Supabase 42501 error to ConfigVagaServiceError FORBIDDEN', async () => {
    const chain = mockUpdateChain({
      data: null,
      error: { code: '42501', message: 'forbidden' },
    })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    await expect(updateVagaBase('vaga-uuid', sampleBase)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })

    const chain2 = mockUpdateChain({
      data: null,
      error: { code: '42501', message: 'forbidden' },
    })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain2)
    try {
      await updateVagaBase('vaga-uuid', sampleBase)
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigVagaServiceError)
    }
  })

  it('maps any other error to DATABASE_ERROR', async () => {
    const chain = mockUpdateChain({
      data: null,
      error: { code: 'XX000', message: 'boom' },
    })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    await expect(updateVagaBase('vaga-uuid', sampleBase)).rejects.toMatchObject({
      code: 'DATABASE_ERROR',
    })
  })
})
