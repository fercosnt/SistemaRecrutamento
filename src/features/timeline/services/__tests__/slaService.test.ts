/**
 * Phase 40 / Plan 40-01 Task 3 — camada de dados da timeline (TIMELINE-02).
 *
 * Trava a disciplina de leitura de `config_sla_etapa`: o read usa allowlist explícita
 * (nunca `select('*')`), erro do supabase vira `SlaServiceError`, e data null → []. Mock
 * do client anon espelhando o idioma de `agendamentoCandidatoService.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fromCalls, selectCols, result } = vi.hoisted(() => ({
  fromCalls: [] as string[],
  selectCols: [] as string[],
  result: { current: { data: null as unknown, error: null as { message: string } | null } },
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      fromCalls.push(table)
      return {
        select: vi.fn((cols: string) => {
          selectCols.push(cols)
          return Promise.resolve(result.current)
        }),
      }
    }),
  },
}))

import { listarSlaEtapas, SlaServiceError } from '../slaService'

const ROWS = [
  { etapa: 'triagem', prazo_valor: 48, prazo_unidade: 'horas', rotulo_candidato: 'Em triagem — retorno em até 48 horas.' },
  { etapa: 'aprovado', prazo_valor: null, prazo_unidade: null, rotulo_candidato: 'Parabéns!' },
]

beforeEach(() => {
  fromCalls.length = 0
  selectCols.length = 0
  result.current = { data: null, error: null }
})

describe('slaService.listarSlaEtapas', () => {
  it('lê config_sla_etapa e retorna as linhas', async () => {
    result.current = { data: ROWS, error: null }
    const out = await listarSlaEtapas()
    expect(fromCalls).toEqual(['config_sla_etapa'])
    expect(out).toEqual(ROWS)
  })

  it('usa allowlist de colunas — NUNCA select("*")', async () => {
    result.current = { data: ROWS, error: null }
    await listarSlaEtapas()
    expect(selectCols).toHaveLength(1)
    expect(selectCols[0]).not.toContain('*')
    for (const col of ['etapa', 'prazo_valor', 'prazo_unidade', 'rotulo_candidato']) {
      expect(selectCols[0]).toContain(col)
    }
  })

  it('erro do supabase vira SlaServiceError', async () => {
    result.current = { data: null, error: { message: 'boom' } }
    await expect(listarSlaEtapas()).rejects.toBeInstanceOf(SlaServiceError)
  })

  it('data null → retorna []', async () => {
    result.current = { data: null, error: null }
    expect(await listarSlaEtapas()).toEqual([])
  })
})
