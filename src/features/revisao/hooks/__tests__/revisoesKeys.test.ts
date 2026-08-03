/**
 * Phase 42 / Plano 42-09 Task 1 — a fábrica hierárquica de query keys da revisão.
 *
 * A chave é o que separa DUAS listas que vivem ao mesmo tempo no cache: a fila só de
 * pendentes (o padrão) e a fila com respondidos incluídos (o toggle ligado). Se as duas
 * colidissem numa chave só, alternar o switch mostraria a lista errada do cache sem
 * refetch — o defeito silencioso que este teste prende.
 *
 * O cliente Supabase é mockado porque `useFilaRevisoes` importa o serviço, que importa
 * o client — e o client valida `VITE_SUPABASE_*` no topo do módulo.
 *
 * @see src/features/funil/hooks/useFilaTrabalho.ts (o molde: `filaKeys` + staleTime 5min)
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}))

import { revisoesKeys } from '../useFilaRevisoes'

describe('revisoesKeys — namespace hierárquico (convenção §8.1 do projeto)', () => {
  it('`all` é a raiz e toda chave descende dela', () => {
    expect(revisoesKeys.all).toEqual(['revisoes'])
    expect(revisoesKeys.lists()[0]).toBe('revisoes')
    expect(revisoesKeys.pendentesCount()[0]).toBe('revisoes')
    expect(revisoesKeys.configSla()[0]).toBe('revisoes')
  })

  it('as duas variantes do toggle produzem chaves DISTINTAS', () => {
    const so_pendentes = revisoesKeys.list({ incluirRespondidos: false })
    const com_respondidos = revisoesKeys.list({ incluirRespondidos: true })
    expect(so_pendentes).not.toEqual(com_respondidos)
  })

  it('`list` desce de `lists`', () => {
    expect(revisoesKeys.list({ incluirRespondidos: false }).slice(0, 2)).toEqual([
      'revisoes',
      'list',
    ])
  })

  it('`pendentesCount` e `configSla` são estáveis entre chamadas e distintas entre si', () => {
    expect(revisoesKeys.pendentesCount()).toEqual(revisoesKeys.pendentesCount())
    expect(revisoesKeys.configSla()).toEqual(revisoesKeys.configSla())
    expect(revisoesKeys.pendentesCount()).not.toEqual(revisoesKeys.configSla())
  })
})
