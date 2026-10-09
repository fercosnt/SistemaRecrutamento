/**
 * Phase 51 / Plan 51-07 (JORN-43 · C-4) — `consultarLiberacao().ja_respondeu` vem do servidor.
 *
 * Medido pela pesquisa (51-RESEARCH §C-4): o candidato NÃO lê o próprio `scores_raven`. A
 * policy de SELECT compara `candidaturas.candidato_id` com `auth.uid()`, e `candidatos.id ≠
 * user_id` em 37 de 37 linhas com usuário — a leitura direta voltava vazia SEMPRE, inclusive
 * para quem tinha linha (sonda de role com o JWT do titular de `d31c78bb`: `own_scores_raven = 0`).
 * Consequência: `ja_respondeu` era sempre `false`, e quem já tinha concluído reabria a prova,
 * respondia os 60 itens e só então falhava no INSERT (PK `(candidatura_id, questao_id)`).
 *
 * O conserto lê a conclusão da chave `raven.registrado` de `get_avaliacao_status` (DEFINER,
 * guarda de titular, só booleanos — 51-06). A leitura da liberação (`cognitivo_liberacao`)
 * continua direta: o candidato a lê por policy própria, e ela funciona (`own_lib = 2`).
 *
 * O cliente Supabase é mockado no nível do `rpc`/`from`, para que a cadeia real
 * `consultarLiberacao → getAvaliacaoStatus → rpc('get_avaliacao_status')` seja exercida.
 *
 * @see src/features/avaliacao-cognitiva/services/ravenService.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  statusPayload: null as unknown,
  statusError: null as { message: string } | null,
  liberacao: { liberado_em: '2026-10-01T12:00:00Z', revogado_em: null } as Record<string, unknown> | null,
  tabelasLidas: [] as string[],
  rpcChamadas: [] as string[],
}))

vi.mock('@/lib/supabase/client', () => {
  const builder = (table: string) => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn(() => q)
    q.eq = vi.fn(() => q)
    q.is = vi.fn(() => q)
    q.maybeSingle = vi.fn(() =>
      Promise.resolve(
        table === 'cognitivo_liberacao'
          ? { data: m.liberacao, error: null }
          : // `scores_raven` como o CANDIDATO o vê hoje: vazio, mesmo com linha (C-4)
            { data: null, error: null },
      ),
    )
    return q
  }
  return {
    supabase: {
      from: vi.fn((table: string) => {
        m.tabelasLidas.push(table)
        return builder(table)
      }),
      rpc: vi.fn((fn: string) => {
        m.rpcChamadas.push(fn)
        if (fn === 'get_avaliacao_status') {
          return Promise.resolve({ data: m.statusPayload, error: m.statusError })
        }
        return Promise.resolve({ data: null, error: null })
      }),
    },
  }
})

import { consultarLiberacao, RavenServiceError } from '@/features/avaliacao-cognitiva/services/ravenService'

const CID = 'cand-raven-c4'

beforeEach(() => {
  m.statusPayload = null
  m.statusError = null
  m.liberacao = { liberado_em: '2026-10-01T12:00:00Z', revogado_em: null }
  m.tabelasLidas = []
  m.rpcChamadas = []
})

describe('consultarLiberacao — ja_respondeu vem de get_avaliacao_status.raven.registrado (C-4)', () => {
  it('raven.registrado = true → ja_respondeu: true (quem concluiu não reabre a prova)', async () => {
    m.statusPayload = { raven: { liberado: true, registrado: true } }

    const lib = await consultarLiberacao(CID)

    expect(lib.ja_respondeu).toBe(true)
    expect(lib.liberado).toBe(true)
    expect(lib.liberado_em).toBe('2026-10-01T12:00:00Z')
    expect(m.rpcChamadas).toContain('get_avaliacao_status')
  })

  it('raven.registrado = false → ja_respondeu: false', async () => {
    m.statusPayload = { raven: { liberado: true, registrado: false } }

    const lib = await consultarLiberacao(CID)

    expect(lib.ja_respondeu).toBe(false)
    expect(lib.liberado).toBe(true)
  })

  it('a leitura direta de scores_raven não acontece mais (o candidato nunca a via)', async () => {
    m.statusPayload = { raven: { liberado: true, registrado: true } }

    await consultarLiberacao(CID)

    expect(m.tabelasLidas).not.toContain('scores_raven')
    // a liberação continua lida direto — o candidato a lê por policy própria
    expect(m.tabelasLidas).toContain('cognitivo_liberacao')
  })

  it('erro em get_avaliacao_status → RavenServiceError DATABASE_ERROR (a tela já trata erro)', async () => {
    m.statusError = { message: 'forbidden' }

    let caught: unknown
    try {
      await consultarLiberacao(CID)
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(RavenServiceError)
    expect((caught as RavenServiceError).code).toBe('DATABASE_ERROR')
  })
})
