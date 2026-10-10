/**
 * Phase 51 / Plan 51-18 (G2 · WR-01 · JORN-46) — `marcarInstrumentoRegistrado`.
 *
 * O helper escreve SÓ `registrado: true` do card pedido na entrada `['avaliacao','status',id]`
 * (a mesma do `AvaliacaoContainer`) e invalida essa entrada. Bordas: entrada ausente continua
 * ausente (nada fabricado) e a invalidação acontece mesmo assim; a entrada de outra candidatura
 * não muda; toda folha continua booleana (RNF-07a — nenhum número atravessa).
 */
import { describe, it, expect, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))

import { marcarInstrumentoRegistrado } from '../avaliacaoStatusCache'

const KEY = (id: string) => ['avaliacao', 'status', id]

const STATUS_ANTES = {
  sjt_mc: { registrado: false, iniciado: true },
  sjt_caso_aberto: { registrado: false, iniciado: false },
  big_five: { registrado: false, iniciado: true },
  redacao: { registrado: false, iniciado: false },
  cognitivo: { registrado: false, iniciado: true },
  raven: { liberado: true, registrado: false },
}

type Status = typeof STATUS_ANTES

function novoQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  })
}

/** Toda folha do status é booleana — nenhum número (score/banda) entrou no cache. */
function folhas(obj: unknown): unknown[] {
  if (obj === null || typeof obj !== 'object') return [obj]
  return Object.values(obj as Record<string, unknown>).flatMap(folhas)
}

describe('marcarInstrumentoRegistrado (51-18 / G2)', () => {
  it('entrada existente: só cognitivo.registrado vira true; iniciado, os outros cards e raven ficam iguais; entrada invalidada', () => {
    const qc = novoQc()
    qc.setQueryData(KEY('C1'), structuredClone(STATUS_ANTES))

    marcarInstrumentoRegistrado(qc, 'C1', 'cognitivo')

    const depois = qc.getQueryData<Status>(KEY('C1'))
    expect(depois).toEqual({
      ...STATUS_ANTES,
      cognitivo: { registrado: true, iniciado: true },
    })
    expect(qc.getQueryState(KEY('C1'))?.isInvalidated).toBe(true)
    for (const f of folhas(depois)) expect(typeof f).toBe('boolean')
  })

  it.each(['sjt_caso_aberto', 'big_five', 'redacao'] as const)(
    'entrada existente: card %s — só o card pedido muda',
    (card) => {
      const qc = novoQc()
      qc.setQueryData(KEY('C1'), structuredClone(STATUS_ANTES))

      marcarInstrumentoRegistrado(qc, 'C1', card)

      expect(qc.getQueryData<Status>(KEY('C1'))).toEqual({
        ...STATUS_ANTES,
        [card]: { ...STATUS_ANTES[card], registrado: true },
      })
      expect(qc.getQueryState(KEY('C1'))?.isInvalidated).toBe(true)
    },
  )

  it('entrada ausente: continua ausente (nada fabricado) e a invalidação é chamada mesmo assim', () => {
    const qc = novoQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')

    marcarInstrumentoRegistrado(qc, 'C1', 'cognitivo')

    expect(qc.getQueryData(KEY('C1'))).toBeUndefined()
    expect(spy).toHaveBeenCalledWith({ queryKey: ['avaliacao', 'status', 'C1'] })
  })

  it('isolamento: a entrada de outra candidatura fica idêntica e não é invalidada', () => {
    const qc = novoQc()
    qc.setQueryData(KEY('C1'), structuredClone(STATUS_ANTES))
    qc.setQueryData(KEY('C2'), structuredClone(STATUS_ANTES))

    marcarInstrumentoRegistrado(qc, 'C1', 'cognitivo')

    expect(qc.getQueryData(KEY('C2'))).toEqual(STATUS_ANTES)
    expect(qc.getQueryState(KEY('C2'))?.isInvalidated).toBe(false)
  })
})
