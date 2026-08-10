/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 47 / Plano 47-07 Task 1 — RED→GREEN: o histórico passa a ser lido pela RPC
 * `listar_historico_candidatura` (CONSOL-02 / VISRH-03), e o uuid do `ator` deixa de
 * existir no cliente.
 *
 * Herdado da Phase 34 e PRESERVADO: o guard de vazamento de PII
 * ([[reference_select_star_leaks_pii]]). A projeção continua NOMEADA e nunca vira `'*'`
 * — a RLS é row-level e não esconde coluna. O que mudou é ONDE o guard mora: a
 * assinatura da função do servidor, com `HISTORICO_ALLOWLIST` como o registro
 * versionado — e EXECUTÁVEL — do que aquele contrato entrega.
 *
 * As três asserções que carregam o peso desta fase:
 *   1. `supabase.from` é uma ARMADILHA — qualquer projeção direta da tabela levanta;
 *   2. o `ator` uuid não atravessa nem quando o servidor o devolve (defesa em profundidade);
 *   3. `42501` (recusa por escopo de vaga / papel) é DISTINGUÍVEL de uma falha de rede.
 *
 * @see supabase/migrations/20260809000001_p47_listar_historico_candidatura.sql (contrato vivo)
 * @see src/features/admin/retencao/services/__tests__ (o molde de serviço-por-RPC clonado)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { rpcCall, result } = vi.hoisted(() => ({
  rpcCall: {} as { fn?: string; params?: Record<string, unknown>; chamadas?: number },
  result: { data: null as unknown, error: null as unknown },
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: vi.fn((fn: string, params?: Record<string, unknown>) => {
      rpcCall.fn = fn
      rpcCall.params = params
      rpcCall.chamadas = (rpcCall.chamadas ?? 0) + 1
      return Promise.resolve({ data: result.data, error: result.error })
    }),
    // ARMADILHA EXECUTÁVEL: a projeção direta de `historico_candidatura` saiu do
    // serviço nesta fase. Se alguém a reintroduzir, o teste levanta aqui, com o motivo.
    from: vi.fn(() => {
      throw new Error(
        'o histórico é lido pela RPC — a projeção direta da tabela abriria de volta o caminho do uuid',
      )
    }),
  },
}))

import {
  listHistorico,
  HISTORICO_ALLOWLIST,
  HistoricoCandidaturaServiceError,
} from '../historicoCandidaturaService'

const ALLOWLIST_COLS = ['etapa_de', 'etapa_para', 'ator_rotulo', 'criterio_texto', 'criado_em']

/**
 * O contrato de linha que este arquivo PROVA — o espelho cliente do `RETURNS TABLE` da
 * RPC. Escrito aqui, e não importado, porque este teste é o RED: no instante em que ele
 * foi commitado, `HistoricoRow` ainda carregava o uuid do `ator`. A prova em tempo de
 * COMPILAÇÃO de que `HistoricoRow` virou este tipo vive em
 * `__tests__/historicoAtorRotulos.test.tsx`, cujas fixtures são `HistoricoRow` literais.
 */
type LinhaEsperada = {
  etapa_de: string | null
  etapa_para: string
  ator_rotulo: string
  criterio_texto: string | null
  criado_em: string
}

const asLinhas = (rows: unknown) => rows as LinhaEsperada[]

/** Captura a recusa como recusa — `rejects` sozinho não dá acesso tipado ao erro. */
async function capturarErro(p: Promise<unknown>): Promise<HistoricoCandidaturaServiceError> {
  try {
    await p
  } catch (e) {
    return e as HistoricoCandidaturaServiceError
  }
  throw new Error('esperava uma recusa, mas a chamada resolveu')
}

/** Uma linha crua como a RPC a devolve (rótulo já resolvido no servidor). */
function linhaCrua(over: Record<string, unknown> = {}) {
  return {
    etapa_de: 'triagem',
    etapa_para: 'avaliacao_assincrona',
    ator_rotulo: 'Mariana Alves de Souza',
    criterio_texto: 'ok',
    criado_em: '2026-07-16T10:00:00Z',
    ...over,
  }
}

describe('historicoCandidaturaService — leitura pela RPC (CONSOL-02 / VISRH-03)', () => {
  beforeEach(() => {
    rpcCall.fn = undefined
    rpcCall.params = undefined
    rpcCall.chamadas = 0
    result.data = []
    result.error = null
  })

  it('lê pela RPC `listar_historico_candidatura`, passando o id da candidatura', async () => {
    await listHistorico('cand-9')
    expect(rpcCall.fn).toBe('listar_historico_candidatura')
    expect(rpcCall.params).toMatchObject({ p_candidatura_id: 'cand-9' })
    expect(rpcCall.chamadas).toBe(1)
  })

  it('NUNCA projeta a tabela diretamente (o mock de `from` levanta se alguém tentar)', async () => {
    result.data = [linhaCrua()]
    await expect(listHistorico('cand-1')).resolves.toHaveLength(1)
  })

  it('devolve as linhas NA ORDEM EM QUE VIERAM — o cliente não reordena (a RPC já ordena)', async () => {
    result.data = [
      linhaCrua({ criado_em: '2026-07-10T10:00:00Z', criterio_texto: 'primeira-da-resposta' }),
      linhaCrua({ criado_em: '2026-07-20T10:00:00Z', criterio_texto: 'segunda-da-resposta' }),
    ]
    const rows = await listHistorico('cand-1')
    expect(rows.map((r) => r.criterio_texto)).toEqual([
      'primeira-da-resposta',
      'segunda-da-resposta',
    ])
  })

  it('cada linha carrega o RÓTULO do ator como texto', async () => {
    result.data = [linhaCrua({ ator_rotulo: 'O próprio candidato' })]
    const rows = asLinhas(await listHistorico('cand-1'))
    expect(rows[0].ator_rotulo).toBe('O próprio candidato')
  })

  it('o uuid do ator NÃO atravessa — nem quando o servidor o devolve (defesa em profundidade)', async () => {
    result.data = [linhaCrua({ ator: '3f1c9e2a-77bd-4f0e-9a1b-0c5d8e2f4a61', id: 'linha-1' })]
    const rows = await listHistorico('cand-1')
    expect(rows[0]).not.toHaveProperty('ator')
    expect(rows[0]).not.toHaveProperty('id')
    expect(JSON.stringify(rows)).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    )
  })

  it('a recusa de permissão do banco (42501) vira FORBIDDEN — distinguível de falha de rede', async () => {
    result.error = { code: '42501', message: 'permission denied for table usuarios_rh' }
    await expect(listHistorico('cand-1')).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('a recusa NÃO ecoa o código cru nem o texto do banco para a tela', async () => {
    result.error = { code: '42501', message: 'permission denied for table usuarios_rh' }
    const erro = await capturarErro(listHistorico('cand-1'))
    expect(erro).toBeInstanceOf(HistoricoCandidaturaServiceError)
    expect(erro.message).not.toContain('42501')
    expect(erro.message).not.toContain('usuarios_rh')
    expect(erro.message).not.toContain('permission denied')
  })

  it('qualquer outro erro do banco continua DATABASE_ERROR, com a mensagem preservada', async () => {
    result.error = { code: '08006', message: 'connection failure' }
    const erro = await capturarErro(listHistorico('cand-1'))
    expect(erro.code).toBe('DATABASE_ERROR')
    expect(erro.message).toContain('connection failure')
  })

  it('retorno nulo vira lista vazia', async () => {
    result.data = null
    await expect(listHistorico('cand-1')).resolves.toEqual([])
  })

  it('entrada vazia continua lançando INVALID_INPUT, sem tocar o banco', async () => {
    await expect(listHistorico('')).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(rpcCall.chamadas).toBe(0)
  })

  it('a HISTORICO_ALLOWLIST continua explícita: sem `*`, nomeia as 5 colunas da RPC', () => {
    expect(HISTORICO_ALLOWLIST).not.toContain('*')
    for (const col of ALLOWLIST_COLS) {
      expect(HISTORICO_ALLOWLIST).toContain(col)
    }
  })

  it('a allowlist NÃO nomeia o uuid do ator, nem e-mail, nem identificador de usuário de RH', () => {
    expect(HISTORICO_ALLOWLIST).not.toMatch(/\bator\b(?!_)/)
    expect(HISTORICO_ALLOWLIST).not.toContain('email')
    expect(HISTORICO_ALLOWLIST).not.toContain('usuario_id')
    expect(HISTORICO_ALLOWLIST).not.toContain('user_id')
  })
})
