/**
 * Phase 52 / Plan 52-11 — `avaliacoesRhService`: o contrato das RPCs do 52-08 validado ANTES de
 * chegar à tela, e a projeção para o tipo estreito.
 *
 * - `lerDevolutivaBigFiveRh`: retorno válido → objeto tipado (campo extra que vier, como um número
 *   da escala, é descartado na projeção — T-52-31); `situacao` desconhecida → erro de mensagem fixa,
 *   que não ecoa o retorno; `42501` → `UNAUTHORIZED`; `P0002` → `NOT_FOUND`.
 * - `lerSjtMcRh`: itens tipados; uma `tag`/`peso` que viesse DENTRO de uma alternativa é descartada
 *   na projeção (o tipo não tem os campos — T-52-32, nenhum gabarito chega à tela).
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
  lerSjtMcRh,
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

describe('lerSjtMcRh (52-11 / JORN-57)', () => {
  const ITEM = {
    pergunta_id: 'p-1',
    cenario: 'Um paciente liga irritado.',
    alternativas: [
      { opcao_id: 'o-3', texto: 'C', escolhida: false, tag: 'fortemente_pontua', peso: 3 },
      { opcao_id: 'o-1', texto: 'A', escolhida: true, tag: 'pontua', peso: 2 },
    ],
    escolhida_tag: 'pontua',
    escolhida_peso: 2,
    escolhida_no_banco: true,
  }

  it('retorno válido → itens tipados; alternativas PROJETADAS sem tag/peso, na ordem do servidor', async () => {
    responde({ situacao: 'disponivel', itens: [ITEM] })
    const r = await lerSjtMcRh('cand-1')
    expect(supabase.rpc).toHaveBeenCalledWith('ler_sjt_mc_rh', { p_candidatura_id: 'cand-1' })
    expect(r).toEqual({
      situacao: 'disponivel',
      itens: [
        {
          pergunta_id: 'p-1',
          cenario: 'Um paciente liga irritado.',
          alternativas: [
            { opcao_id: 'o-3', texto: 'C', escolhida: false },
            { opcao_id: 'o-1', texto: 'A', escolhida: true },
          ],
          escolhida_tag: 'pontua',
          escolhida_peso: 2,
          escolhida_no_banco: true,
        },
      ],
    })
    for (const a of r.itens[0].alternativas) {
      expect(Object.keys(a).sort()).toEqual(['escolhida', 'opcao_id', 'texto'])
    }
    expect(JSON.stringify(r.itens[0].alternativas)).not.toContain('fortemente_pontua')
  })

  it('linha sem respostas (motor antigo) → «disponivel» com itens []; sem linha → «sem_sjt_mc»', async () => {
    responde({ situacao: 'disponivel', itens: [] })
    await expect(lerSjtMcRh('cand-1')).resolves.toEqual({ situacao: 'disponivel', itens: [] })
    responde({ situacao: 'sem_sjt_mc', itens: [] })
    await expect(lerSjtMcRh('cand-1')).resolves.toEqual({ situacao: 'sem_sjt_mc', itens: [] })
  })

  it('cenário e etiqueta nulos são aceitos; formato errado → erro de mensagem fixa', async () => {
    responde({
      situacao: 'disponivel',
      itens: [{ ...ITEM, pergunta_id: null, cenario: null, escolhida_tag: null, escolhida_peso: null }],
    })
    const r = await lerSjtMcRh('cand-1')
    expect(r.itens[0]).toMatchObject({ pergunta_id: null, cenario: null, escolhida_tag: null, escolhida_peso: null })

    responde({ situacao: 'disponivel', itens: [{ ...ITEM, escolhida_no_banco: 'sim' }] })
    const err = await lerSjtMcRh('cand-1').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AvaliacoesRhServiceError)
    expect((err as Error).message).toBe('Situações em formato inesperado.')
  })

  it('situacao desconhecida → erro; 42501 → UNAUTHORIZED; P0002 → NOT_FOUND', async () => {
    responde({ situacao: 'gabarito', itens: [] })
    await expect(lerSjtMcRh('cand-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' })
    responde(null, { message: 'forbidden', code: '42501' })
    await expect(lerSjtMcRh('cand-1')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Não foi possível carregar as situações.',
    })
    responde(null, { message: 'x', code: 'P0002' })
    await expect(lerSjtMcRh('cand-1')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
