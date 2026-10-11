/**
 * Phase 52 / Plan 52-11 — `avaliacoesRhService`: o contrato das RPCs do 52-08 validado ANTES de
 * chegar à tela, e a projeção para o tipo estreito.
 *
 * - `lerDevolutivaBigFiveRh`: retorno válido → objeto tipado (campo extra que vier, como um número
 *   da escala, é descartado na projeção — T-52-31); `situacao` desconhecida → erro de mensagem fixa,
 *   que não ecoa o retorno; `42501` → `UNAUTHORIZED`; `P0002` → `NOT_FOUND`.
 *
 * @see src/features/avaliacao/services/avaliacoesRhService.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: { fn: null as null | ((...args: unknown[]) => unknown) },
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: { rpc: vi.fn((...args: unknown[]) => rpcMock.fn?.(...args)) },
}))

import {
  AvaliacoesRhServiceError,
  lerDevolutivaBigFiveRh,
} from '../avaliacoesRhService'
import { supabase } from '@/lib/supabase/client'

function responde(data: unknown, error: unknown = null) {
  rpcMock.fn = () => Promise.resolve({ data, error })
}

beforeEach(() => {
  rpcMock.fn = null
  vi.mocked(supabase.rpc).mockClear()
})

describe('lerDevolutivaBigFiveRh (52-11 / JORN-56)', () => {
  it('retorno «disponivel» válido → objeto tipado, projetado sem campo extra', async () => {
    responde({
      situacao: 'disponivel',
      dimensoes: [
        { dim: 'O', banda: 'mod_alto', texto_interpretativo: 'Texto O.', percentil: 87 },
        { dim: 'N', banda: 'medio', texto_interpretativo: null },
      ],
      disclaimer_emocional: 'Aviso emocional.',
      disclaimer_lgpd_crp: 'Rodapé.',
    })
    const r = await lerDevolutivaBigFiveRh('cand-1')
    expect(supabase.rpc).toHaveBeenCalledWith('ler_devolutiva_bigfive_rh', { p_candidatura_id: 'cand-1' })
    expect(r).toEqual({
      situacao: 'disponivel',
      dimensoes: [
        { dim: 'O', banda: 'mod_alto', texto_interpretativo: 'Texto O.' },
        { dim: 'N', banda: 'medio', texto_interpretativo: '' },
      ],
      disclaimer_emocional: 'Aviso emocional.',
      disclaimer_lgpd_crp: 'Rodapé.',
    })
    // A projeção é explícita: nenhuma chave além das três do tipo.
    for (const d of r.dimensoes) expect(Object.keys(d).sort()).toEqual(['banda', 'dim', 'texto_interpretativo'])
    expect(JSON.stringify(r)).not.toContain('87')
  })

  it('«sem_devolutiva» → sem dimensões e sem avisos', async () => {
    responde({ situacao: 'sem_devolutiva', dimensoes: [], disclaimer_emocional: null, disclaimer_lgpd_crp: null })
    await expect(lerDevolutivaBigFiveRh('cand-1')).resolves.toEqual({
      situacao: 'sem_devolutiva',
      dimensoes: [],
      disclaimer_emocional: null,
      disclaimer_lgpd_crp: null,
    })
  })

  it('situacao desconhecida → erro de mensagem FIXA, sem ecoar o retorno', async () => {
    responde({ situacao: 'segredo_do_candidato', dimensoes: [] })
    const err = await lerDevolutivaBigFiveRh('cand-1').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AvaliacoesRhServiceError)
    expect((err as AvaliacoesRhServiceError).code).toBe('DATABASE_ERROR')
    expect((err as Error).message).toBe('Devolutiva em formato inesperado.')
    expect((err as Error).message).not.toContain('segredo_do_candidato')
  })

  it('faixa fora do vocabulário → erro (nada inventa faixa)', async () => {
    responde({ situacao: 'disponivel', dimensoes: [{ dim: 'O', banda: 'alto', texto_interpretativo: 'x' }] })
    await expect(lerDevolutivaBigFiveRh('cand-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' })
  })

  it('42501 → UNAUTHORIZED', async () => {
    responde(null, { message: 'forbidden', code: '42501' })
    await expect(lerDevolutivaBigFiveRh('cand-1')).rejects.toMatchObject({
      name: 'AvaliacoesRhServiceError',
      code: 'UNAUTHORIZED',
      message: 'Não foi possível carregar a devolutiva.',
    })
  })

  it('P0002 → NOT_FOUND', async () => {
    responde(null, { message: 'candidatura nao encontrada', code: 'P0002' })
    await expect(lerDevolutivaBigFiveRh('cand-1')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('sem candidaturaId → INVALID_INPUT, sem chamar a RPC', async () => {
    await expect(lerDevolutivaBigFiveRh('')).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})
