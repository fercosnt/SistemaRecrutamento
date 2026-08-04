/**
 * Phase 44 / Plano 44-08 Task 2 — a camada de dados da fila de pedidos de cópia
 * (EXPORT-05, LGPD Art. 18, II · Art. 19, II).
 *
 * ⚠ ESTE ARQUIVO NÃO ESTAVA NO ROSTER COMPARTILHADO DOS SETE PLANOS ANTERIORES, e o
 * 44-08 o declarou explicitamente em vez de contrabandeá-lo. A razão: a
 * `44-VALIDATION.md` §Wave 0 lista `slaDados.test.ts` e `FilaPedidosDadosTable.test.tsx`
 * e nenhum teste de serviço — mas a asserção de allowlist deste projeto **só morde no
 * serviço**. É aqui que o mock captura a string de `select()` e os argumentos de
 * `rpc()`; sem este arquivo a projeção explícita (o SC#1 da fase) não teria onde ser
 * provada, e a inversão do toggle não teria onde ser prendida.
 *
 * O idioma de mock é o de `revisaoService.test.ts` (`vi.hoisted` capturando `selects`,
 * `eqs`, `froms` e as chamadas de `rpc`), e o mock vem ANTES do import do serviço
 * porque o client valida `VITE_SUPABASE_*` no topo do módulo.
 *
 * As duas asserções que carregam mais peso são NEGATIVAS, e as duas são sobre o MOCK,
 * não sobre o texto do arquivo:
 *
 *  · **(bd)** nenhuma tabela chegou a `from(...)` no caminho da fila e do contador. Uma
 *    leitura PostgREST acrescentada depois traria o nome do candidato por join do
 *    cliente e furaria o escopo do BD-8, que vive DENTRO do `SECURITY DEFINER`. Um grep
 *    sobre o arquivo não pegaria isso; o mock pega.
 *  · **(bf)** a string de `select` não contém o caractere de projeção total. O literal é
 *    montado em runtime (idioma 42-11): escrevê-lo seria ele mesmo a ocorrência que o
 *    grep encontra.
 *
 * @see src/features/revisao/services/__tests__/revisaoService.test.ts (o molde do mock)
 * @see .planning/phases/44-exporta-o-acesso/44-CONTEXT.md (§BD-8 — fila ≡ contador)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock do cliente Supabase ANTES de importar o serviço ──────────────────────
const { selects, eqs, froms, rpcMock, fromMock, maybeSingleMock } = vi.hoisted(() => ({
  selects: [] as string[],
  eqs: [] as Array<[string, unknown]>,
  froms: [] as string[],
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      selects.push(cols)
      return q
    })
    q.eq = vi.fn((col: string, val: unknown) => {
      eqs.push([col, val])
      return q
    })
    q.maybeSingle = maybeSingleMock
    return q
  }
  fromMock.mockImplementation((tabela: string) => {
    froms.push(tabela)
    return makeQuery()
  })
  return {
    supabase: {
      from: fromMock,
      rpc: rpcMock,
    },
  }
})

import {
  PedidosDadosError,
  classificarErroPedidosDados,
  FILA_PEDIDOS_DADOS_COLUNAS,
  CONFIG_SLA_DADOS_COLUNAS,
  CHAVE_SLA_DADOS,
  COPY_CAUSA,
  COPY_CAUSA_AUSENTE,
  listarFilaPedidosDados,
  contarPedidosDadosPendentes,
  lerConfigSlaDados,
  traduzirCausa,
} from '../pedidosDadosService'

beforeEach(() => {
  selects.length = 0
  eqs.length = 0
  froms.length = 0
  rpcMock.mockReset()
  fromMock.mockClear()
  maybeSingleMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Uma linha crua no formato do `RETURNS TABLE` de `listar_pedidos_dados` (44-02). */
function linhaCrua(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'a0000000-0000-0000-0000-000000000001',
    candidato_id: 'c0000000-0000-0000-0000-000000000001',
    candidato_nome: 'Maria da Silva',
    situacao: 'atendido',
    causa: null,
    solicitado_em: '2026-08-01T10:00:00Z',
    atendido_em: '2026-08-01T10:00:02Z',
    ...over,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// (ay) (az) — a RPC certa, e a INVERSÃO do toggle nos dois sentidos
// ─────────────────────────────────────────────────────────────────────────────

describe('listarFilaPedidosDados — a RPC do BD-8 e a polaridade do toggle', () => {
  it('(ay) visão completa (soNaoAtendidos: false) → incluir atendidos = true', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })

    await listarFilaPedidosDados({ soNaoAtendidos: false })

    expect(rpcMock).toHaveBeenCalledTimes(1)
    expect(rpcMock).toHaveBeenCalledWith('listar_pedidos_dados', {
      p_incluir_atendidos: true,
    })
  })

  // A asserção que morde numa cópia cega do análogo: em `/rh/revisoes` o nome do filtro
  // e o do parâmetro têm a MESMA polaridade; aqui têm polaridades OPOSTAS, de propósito.
  it('(az) só não atendidos (soNaoAtendidos: true) → incluir atendidos = false', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })

    await listarFilaPedidosDados({ soNaoAtendidos: true })

    expect(rpcMock).toHaveBeenCalledWith('listar_pedidos_dados', {
      p_incluir_atendidos: false,
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// (ba) (bb) — a allowlist na fronteira
// ─────────────────────────────────────────────────────────────────────────────

describe('projeção por allowlist na fronteira do cliente', () => {
  it('(ba) coluna extra vinda do servidor NÃO atravessa a projeção', async () => {
    rpcMock.mockResolvedValue({
      data: [
        linhaCrua({
          curriculo_path: 'curriculos/abc/cv.pdf',
          email: 'maria@example.com',
        }),
      ],
      error: null,
    })

    const [linha] = await listarFilaPedidosDados({ soNaoAtendidos: false })

    // Conjunto de chaves, não campo a campo: é o conjunto que prova a ausência.
    expect(Object.keys(linha).sort()).toEqual([...FILA_PEDIDOS_DADOS_COLUNAS].sort())
    expect(linha).not.toHaveProperty('curriculo_path')
    expect(linha).not.toHaveProperty('email')
  })

  it('(bb) coluna ausente na resposta → null, nunca undefined e nunca chave faltando', async () => {
    const semNome = linhaCrua()
    delete semNome.candidato_nome
    rpcMock.mockResolvedValue({ data: [semNome], error: null })

    const [linha] = await listarFilaPedidosDados({ soNaoAtendidos: false })

    expect('candidato_nome' in linha).toBe(true)
    expect(linha.candidato_nome).toBeNull()
    expect(linha.candidato_nome).not.toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// (bc) (bd) — o contador, e a asserção negativa de superfície
// ─────────────────────────────────────────────────────────────────────────────

describe('contarPedidosDadosPendentes — a outra RPC, e nada mais', () => {
  it('(bc) chama a RPC do contador SEM argumento', async () => {
    rpcMock.mockResolvedValue({ data: 3, error: null })

    const total = await contarPedidosDadosPendentes()

    expect(total).toBe(3)
    expect(rpcMock).toHaveBeenCalledWith('contar_pedidos_dados_pendentes')
    // Sem segundo argumento: um filtro aqui seria o segundo predicado que o BD-8 proíbe.
    expect(rpcMock.mock.calls[0]).toHaveLength(1)
  })

  it('(bc) resposta nula resolve para 0', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    await expect(contarPedidosDadosPendentes()).resolves.toBe(0)
  })

  it('(bd) exercitadas fila e contador, NENHUMA tabela foi tocada por PostgREST', async () => {
    rpcMock.mockResolvedValue({ data: [linhaCrua()], error: null })
    await listarFilaPedidosDados({ soNaoAtendidos: false })

    rpcMock.mockResolvedValue({ data: 1, error: null })
    await contarPedidosDadosPendentes()

    // As duas portas do BD-8 são RPC. Uma leitura de tabela acrescentada depois
    // traria o nome do candidato por join do cliente e furaria o escopo do DEFINER.
    expect(froms).toEqual([])
    expect(fromMock).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// (be) (bf) (bg) — o leitor de config
// ─────────────────────────────────────────────────────────────────────────────

describe('lerConfigSlaDados — allowlist de três colunas, e nunca lança', () => {
  it('(be) projeta as três colunas nomeadas e filtra pela chave da fase', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { chave: CHAVE_SLA_DADOS, dias_atencao: 7, dias_atraso: 12 },
      error: null,
    })

    const cfg = await lerConfigSlaDados()

    expect(cfg).toEqual({ diasAtencao: 7, diasAtraso: 12 })
    expect(froms).toEqual(['config_sla_dados'])
    expect(selects).toEqual([CONFIG_SLA_DADOS_COLUNAS])
    expect(eqs).toEqual([['chave', CHAVE_SLA_DADOS]])
  })

  it('(bf) a string de select NÃO contém o caractere de projeção total', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { chave: CHAVE_SLA_DADOS, dias_atencao: 7, dias_atraso: 12 },
      error: null,
    })

    await lerConfigSlaDados()

    // Montado em runtime (idioma 42-11): escrever o literal aqui seria ele mesmo a
    // ocorrência que a asserção proíbe.
    const projecaoTotal = String.fromCharCode(42)
    expect(selects).toHaveLength(1)
    expect(selects[0]).not.toContain(projecaoTotal)
    expect(CONFIG_SLA_DADOS_COLUNAS).not.toContain(projecaoTotal)
  })

  it('(bg) erro de transporte → null, sem lançar', async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: { code: '08006', message: 'connection failure' },
    })
    await expect(lerConfigSlaDados()).resolves.toBeNull()
  })

  it('(bg) linha ausente → null, sem lançar', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
    await expect(lerConfigSlaDados()).resolves.toBeNull()
  })

  it('(bg) limiar não numérico → null, sem lançar', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { chave: CHAVE_SLA_DADOS, dias_atencao: '7', dias_atraso: 12 },
      error: null,
    })
    await expect(lerConfigSlaDados()).resolves.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// (bh) — o erro sai classificado, nunca cru
// ─────────────────────────────────────────────────────────────────────────────

describe('classificarErroPedidosDados — vocabulário de dois valores, nunca vaza', () => {
  // O texto que o transporte emitiria: SQLSTATE, nome de tabela, detalhe de infra.
  const MSG_CRUA = 'permission denied for function listar_pedidos_dados'

  it('(bh) 42501 → PERMISSAO, e a mensagem crua NÃO aparece', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '42501', message: MSG_CRUA },
    })

    await expect(listarFilaPedidosDados({ soNaoAtendidos: false })).rejects.toBeInstanceOf(
      PedidosDadosError,
    )

    const err = classificarErroPedidosDados({ code: '42501', message: MSG_CRUA })
    expect(err.code).toBe('PERMISSAO')
    expect(err.message).not.toContain(MSG_CRUA)
    expect(err.message).not.toContain('42501')
    expect(err.message).not.toContain('listar_pedidos_dados')
  })

  it('(bh) erro genérico → DESCONHECIDO, e a mensagem crua NÃO aparece', () => {
    const bruta = 'relation "solicitacoes_dados" does not exist'
    const err = classificarErroPedidosDados({ code: '42P01', message: bruta })

    expect(err.code).toBe('DESCONHECIDO')
    expect(err.message).not.toContain(bruta)
    expect(err.message).not.toContain('solicitacoes_dados')
  })

  it('(bh) é TOTAL — null resolve para um PedidosDadosError, nunca lança', () => {
    expect(() => classificarErroPedidosDados(null)).not.toThrow()
    expect(classificarErroPedidosDados(null)).toBeInstanceOf(PedidosDadosError)
    expect(classificarErroPedidosDados(null).code).toBe('DESCONHECIDO')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// (bi) — traduzirCausa é total sobre vocabulário fechado
// ─────────────────────────────────────────────────────────────────────────────

describe('traduzirCausa — vocabulário fechado com fallback total', () => {
  it('(bi) os três tokens do CHECK viram a copy verbatim da UI-SPEC', () => {
    expect(traduzirCausa('falha_geracao')).toBe(COPY_CAUSA.falha_geracao)
    expect(traduzirCausa('curriculo_ausente')).toBe(COPY_CAUSA.curriculo_ausente)
    expect(traduzirCausa('permissao')).toBe(COPY_CAUSA.permissao)
  })

  it('(bi) causa nula ou vazia → "Motivo não registrado.", nunca célula em branco', () => {
    expect(traduzirCausa(null)).toBe(COPY_CAUSA_AUSENTE)
    expect(traduzirCausa(undefined)).toBe(COPY_CAUSA_AUSENTE)
    expect(traduzirCausa('')).toBe(COPY_CAUSA_AUSENTE)
    expect(COPY_CAUSA_AUSENTE).not.toBe('')
  })

  // Aqui o fallback DIVERGE de `rotularDecisao` (que mostra o token cru), porque a causa
  // nomeia o caminho de falha INTERNO — cru na tela seria detalhe de infraestrutura.
  it('(bi) token desconhecido → fallback, e o token NÃO aparece no retorno', () => {
    const desconhecido = 'timeout_storage_upstream'
    expect(traduzirCausa(desconhecido)).toBe(COPY_CAUSA_AUSENTE)
    expect(traduzirCausa(desconhecido)).not.toContain(desconhecido)
  })
})
