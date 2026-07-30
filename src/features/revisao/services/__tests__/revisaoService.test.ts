/**
 * Phase 42 / Plano 42-03 Task 2 (TDD RED) — contrato de erro + allowlist de colunas
 * da fila de revisão + formatador do contador da sidebar (REVISAO-02/03/05).
 *
 * ⚠ ESTENDIDO no plano 42-09 Task 1 com os três LEITORES (`listarFilaRevisoes`,
 * `contarRevisoesPendentes`, `lerConfigSlaRevisao`). A partir daí o módulo sob teste
 * importa `@/lib/supabase/client`, então este arquivo passa a MOCKAR o cliente (idioma
 * de `explicacaoService.test.ts`) — sem isso o próprio import quebraria, porque o
 * client valida `VITE_SUPABASE_*` no topo do módulo.
 *
 * Três contratos puros, todos sem rede (os contratos originais do 42-03):
 *
 *  1. `classificarErroRevisao` (T-42-V11, lado cliente) — o servidor usa o MESMO
 *     SQLSTATE `42501` para DUAS recusas distintas ("não é RH" e "é o decisor"), e a
 *     42-UI-SPEC exige copy própria e **sem retry oferecido** apenas para a segunda.
 *     Só a MENSAGEM discrimina; a UI não pode adivinhar. Este teste prende exatamente
 *     essa discriminação — inclusive o caso negativo (`42501` genérico ⇒ DESCONHECIDO),
 *     que é o que faz o teste morder se alguém trocar o predicado por um `true`.
 *
 *  2. `FILA_REVISAO_COLUNAS` (T-42-03 / Pitfall 8) — o espelho cliente do `RETURNS
 *     TABLE` de `listar_revisoes_decisao`. RLS é row-level e NÃO esconde coluna
 *     ([[reference_select_star_leaks_pii]]), então a projeção é allowlist explícita. As
 *     três asserções NEGATIVAS (uma por chave proibida) são o cinto: a justificativa
 *     interna do recrutador (BD-9 em aberto, PII digitada à mão) e a identidade do
 *     revisor não podem entrar nesta lista por descuido de um plano futuro.
 *
 *  3. `formatarBadgePendentes` (T-42-V12) — o consumidor em `RHSidebar.tsx:241` avalia
 *     `item.badge && item.badge > 0`; um `0` ali é renderizado como TEXTO pelo React.
 *     Por isso o contrato é `undefined` (some), nunca um número.
 *
 * @see src/features/explicacao/services/__tests__/explicacaoService.test.ts (o molde)
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-RESEARCH.md (§Pattern 3 · §Pitfall 8)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock do cliente Supabase ANTES de importar o serviço ──────────────────────
// Captura a projeção de `select()`, os filtros de `eq()` e as chamadas de `rpc()`
// para asserir a allowlist e o contrato dos leitores sem nenhuma ida à rede.
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
  RevisaoError,
  classificarErroRevisao,
  FILA_REVISAO_COLUNAS,
  formatarBadgePendentes,
  listarFilaRevisoes,
  contarRevisoesPendentes,
  lerConfigSlaRevisao,
  CHAVE_SLA_REVISAO,
} from '../revisaoService'

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

// A mensagem LITERAL que `responder_revisao_decisao` levanta no guard REVISAO-05
// (42-RESEARCH §Code Examples E3). É este texto que o servidor emite; se ele mudar,
// este teste é quem avisa — não a tela do RH.
const MSG_GUARD_DECISOR =
  'quem registrou a decisao nao pode responder a revisao dela (decisor)'

describe('classificarErroRevisao — o 42501 do guard é discriminado por MENSAGEM', () => {
  it('42501 + mensagem com "decisor" → GUARD_DECISOR', () => {
    const err = classificarErroRevisao({ code: '42501', message: MSG_GUARD_DECISOR })
    expect(err.code).toBe('GUARD_DECISOR')
  })

  // O caso que faz o teste MORDER: o mesmo SQLSTATE, mensagem genérica. Se o predicado
  // de discriminação for afrouxado para `true`, esta asserção quebra.
  it('42501 + mensagem genérica ("forbidden") → DESCONHECIDO, NÃO GUARD_DECISOR', () => {
    const err = classificarErroRevisao({ code: '42501', message: 'forbidden' })
    expect(err.code).toBe('DESCONHECIDO')
    expect(err.code).not.toBe('GUARD_DECISOR')
  })

  it('22023 (validação de payload) → VALIDACAO', () => {
    const err = classificarErroRevisao({
      code: '22023',
      message: 'justificativa precisa de ao menos 50 caracteres',
    })
    expect(err.code).toBe('VALIDACAO')
  })

  it('no_data_found (alcançabilidade) → VALIDACAO', () => {
    const err = classificarErroRevisao({
      code: 'no_data_found',
      message: 'decisao inexistente',
    })
    expect(err.code).toBe('VALIDACAO')
  })

  it('SQLSTATE desconhecido (PGRST301) → DESCONHECIDO', () => {
    expect(classificarErroRevisao({ code: 'PGRST301', message: 'x' }).code).toBe(
      'DESCONHECIDO',
    )
  })

  it('erro de rede sem `code` → DESCONHECIDO', () => {
    expect(classificarErroRevisao(new Error('rede')).code).toBe('DESCONHECIDO')
  })

  it('entradas degeneradas (null / undefined / string) não lançam → DESCONHECIDO', () => {
    expect(() => classificarErroRevisao(null)).not.toThrow()
    expect(classificarErroRevisao(null).code).toBe('DESCONHECIDO')
    expect(classificarErroRevisao(undefined).code).toBe('DESCONHECIDO')
    expect(classificarErroRevisao('falhou').code).toBe('DESCONHECIDO')
  })

  it('o resultado é SEMPRE um RevisaoError com name "RevisaoError" e `details` preservado', () => {
    const original = { code: '42501', message: MSG_GUARD_DECISOR }
    const err = classificarErroRevisao(original)
    expect(err).toBeInstanceOf(RevisaoError)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('RevisaoError')
    expect(err.details).toBe(original)
    expect(err.message.length).toBeGreaterThan(0)
  })

  it('preserva `details` também para o erro de rede opaco', () => {
    const original = new Error('rede')
    expect(classificarErroRevisao(original).details).toBe(original)
  })
})

describe('FILA_REVISAO_COLUNAS — allowlist explícita do RETURNS TABLE da fila', () => {
  it('declara exatamente as 11 chaves do contrato (D-P42-05 + estado da linha)', () => {
    expect([...FILA_REVISAO_COLUNAS]).toEqual([
      'candidatura_id',
      'candidato_nome',
      'vaga_titulo',
      'decisao',
      'decidido_por_nome',
      'revisao_solicitada_em',
      'revisao_respondida_em',
      'revisao_veredito',
      'revisao_resultado',
      'respondida_por_nome',
      'pode_responder',
    ])
    expect(FILA_REVISAO_COLUNAS).toHaveLength(11)
  })

  // ── As três asserções NEGATIVAS, uma por chave proibida ──────────────────────
  it('NÃO contém `justificativa` — o texto interno do recrutador fica fora da fila (Pitfall 8 / BD-9)', () => {
    expect(FILA_REVISAO_COLUNAS as readonly string[]).not.toContain('justificativa')
  })

  it('NÃO contém `motivo_rejeicao` — texto interno, nunca projetado na fila', () => {
    expect(FILA_REVISAO_COLUNAS as readonly string[]).not.toContain('motivo_rejeicao')
  })

  it('NÃO contém `revisao_por_usuario` — a identidade (UUID) do revisor nunca vai ao cliente', () => {
    expect(FILA_REVISAO_COLUNAS as readonly string[]).not.toContain(
      'revisao_por_usuario',
    )
  })

  it('`revisao_resultado` (resposta AO CANDIDATO) está presente e é distinta da justificativa interna', () => {
    expect(FILA_REVISAO_COLUNAS as readonly string[]).toContain('revisao_resultado')
    expect(FILA_REVISAO_COLUNAS as readonly string[]).not.toContain('justificativa')
  })

  it('não tem chave duplicada', () => {
    expect(new Set(FILA_REVISAO_COLUNAS).size).toBe(FILA_REVISAO_COLUNAS.length)
  })
})

describe('formatarBadgePendentes — o contador da sidebar (oculto em 0, 99+ acima de 99)', () => {
  it('0 → undefined (badge OCULTO; um 0 seria renderizado como texto pelo React)', () => {
    expect(formatarBadgePendentes(0)).toBeUndefined()
  })

  it('1 → "1"', () => {
    expect(formatarBadgePendentes(1)).toBe('1')
  })

  it('99 → "99" (última contagem exata)', () => {
    expect(formatarBadgePendentes(99)).toBe('99')
  })

  it('100 → "99+"', () => {
    expect(formatarBadgePendentes(100)).toBe('99+')
  })

  it('1234 → "99+"', () => {
    expect(formatarBadgePendentes(1234)).toBe('99+')
  })

  it('undefined → undefined (carregando: oculto, nunca 0, nunca "—")', () => {
    expect(formatarBadgePendentes(undefined)).toBeUndefined()
  })

  it('null → undefined (falha de leitura: oculto)', () => {
    expect(formatarBadgePendentes(null)).toBeUndefined()
  })

  it('NaN → undefined', () => {
    expect(formatarBadgePendentes(NaN)).toBeUndefined()
  })

  it('-3 → undefined (contagem negativa é impossível; oculta em vez de exibir lixo)', () => {
    expect(formatarBadgePendentes(-3)).toBeUndefined()
  })

  it('nunca lança para nenhuma dessas entradas', () => {
    for (const n of [0, 1, 99, 100, 1234, undefined, null, NaN, -3]) {
      expect(() => formatarBadgePendentes(n)).not.toThrow()
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Plano 42-09 Task 1 — os três LEITORES da fila
// ═══════════════════════════════════════════════════════════════════════════════

/** Uma linha crua no formato do `RETURNS TABLE` de `listar_revisoes_decisao`. */
function linhaRpc(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    candidatura_id: '22222222-2222-4222-8222-222222222222',
    candidato_nome: 'Ana Souza',
    vaga_titulo: 'Dentista — Matriz',
    decisao: 'rejeitado',
    decidido_por_nome: 'Carla RH',
    revisao_solicitada_em: '2026-07-20T12:00:00Z',
    revisao_respondida_em: null,
    revisao_veredito: null,
    revisao_resultado: null,
    respondida_por_nome: null,
    pode_responder: true,
    ...over,
  }
}

describe('listarFilaRevisoes — a leitura da fila é RPC, nunca PostgREST (T-42-03)', () => {
  it('chama `listar_revisoes_decisao` com `p_incluir_respondidos: false`', async () => {
    rpcMock.mockResolvedValue({ data: [linhaRpc()], error: null })
    await listarFilaRevisoes({ incluirRespondidos: false })
    expect(rpcMock).toHaveBeenCalledWith('listar_revisoes_decisao', {
      p_incluir_respondidos: false,
    })
  })

  it('repassa `true` quando o toggle "Incluir respondidos" está ligado', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })
    await listarFilaRevisoes({ incluirRespondidos: true })
    expect(rpcMock).toHaveBeenCalledWith('listar_revisoes_decisao', {
      p_incluir_respondidos: true,
    })
  })

  // O gate estrutural do T-42-03: `usuarios_rh` é admin-only desde a SEG-02 e
  // `decisao_final` não é vaga-scoped. Ler qualquer uma por PostgREST resolveria o
  // nome do decisor para nada em toda a fila do recrutador (achado A-01).
  it('NÃO usa `from()` — nenhuma tabela é lida por PostgREST nesta leitura', async () => {
    rpcMock.mockResolvedValue({ data: [linhaRpc()], error: null })
    await listarFilaRevisoes({ incluirRespondidos: false })
    expect(fromMock).not.toHaveBeenCalled()
    expect(froms).not.toContain('usuarios_rh')
    expect(froms).not.toContain('decisao_final')
  })

  it('erro da RPC → LANÇA `RevisaoError` classificado (o hook nunca vê o erro cru)', async () => {
    const cru = { code: '42501', message: 'forbidden' }
    rpcMock.mockResolvedValue({ data: null, error: cru })
    await expect(listarFilaRevisoes({ incluirRespondidos: false })).rejects.toBeInstanceOf(
      RevisaoError,
    )
    rpcMock.mockResolvedValue({ data: null, error: cru })
    await expect(
      listarFilaRevisoes({ incluirRespondidos: false }),
    ).rejects.toMatchObject({ code: 'DESCONHECIDO', details: cru })
  })

  it('`data` nulo → array vazio (a fila vazia é estado, não erro)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    await expect(listarFilaRevisoes({ incluirRespondidos: false })).resolves.toEqual([])
  })

  it('as chaves de cada linha devolvida são EXATAMENTE as de FILA_REVISAO_COLUNAS', async () => {
    rpcMock.mockResolvedValue({ data: [linhaRpc()], error: null })
    const linhas = await listarFilaRevisoes({ incluirRespondidos: false })
    expect(Object.keys(linhas[0]).sort()).toEqual([...FILA_REVISAO_COLUNAS].sort())
  })

  // ── A asserção NEGATIVA de contrato ──────────────────────────────────────────
  // Se o servidor passar a projetar uma coluna a mais (por exemplo a justificativa
  // INTERNA do recrutador — BD-9 em aberto, PII digitada à mão), ela não pode chegar
  // à tela. O serviço projeta a linha na allowlist; este teste é o que morde se
  // alguém trocar a projeção por um pass-through cru.
  it('uma chave EXTRA vinda do servidor (`justificativa`) NUNCA sai do serviço', async () => {
    rpcMock.mockResolvedValue({
      data: [linhaRpc({ justificativa: 'texto interno do recrutador' })],
      error: null,
    })
    const linhas = await listarFilaRevisoes({ incluirRespondidos: false })
    expect(linhas[0]).not.toHaveProperty('justificativa')
    expect(JSON.stringify(linhas)).not.toContain('texto interno do recrutador')
  })

  it('idem para `revisao_por_usuario` (o UUID do revisor, invariante 3)', async () => {
    rpcMock.mockResolvedValue({
      data: [linhaRpc({ revisao_por_usuario: '33333333-3333-4333-8333-333333333333' })],
      error: null,
    })
    const linhas = await listarFilaRevisoes({ incluirRespondidos: false })
    expect(linhas[0]).not.toHaveProperty('revisao_por_usuario')
  })

  it('a ordem devolvida é a do servidor — o serviço não reordena', async () => {
    rpcMock.mockResolvedValue({
      data: [
        linhaRpc({ candidatura_id: 'a', revisao_solicitada_em: '2026-07-01T00:00:00Z' }),
        linhaRpc({ candidatura_id: 'b', revisao_solicitada_em: '2026-07-10T00:00:00Z' }),
      ],
      error: null,
    })
    const linhas = await listarFilaRevisoes({ incluirRespondidos: false })
    expect(linhas.map((l) => l.candidatura_id)).toEqual(['a', 'b'])
  })
})

describe('contarRevisoesPendentes — o escalar do badge da sidebar', () => {
  it('chama `contar_revisoes_pendentes` e devolve o número', async () => {
    rpcMock.mockResolvedValue({ data: 7, error: null })
    await expect(contarRevisoesPendentes()).resolves.toBe(7)
    expect(rpcMock).toHaveBeenCalledWith('contar_revisoes_pendentes')
  })

  it('retorno nulo resolve para 0 (nunca `null` no consumidor)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    await expect(contarRevisoesPendentes()).resolves.toBe(0)
  })

  it('erro da RPC → lança `RevisaoError`', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: '42501', message: 'forbidden' } })
    await expect(contarRevisoesPendentes()).rejects.toBeInstanceOf(RevisaoError)
  })
})

describe('lerConfigSlaRevisao — config ausente é faixa degenerada, NUNCA erro de tela', () => {
  it('lê `config_sla_revisao` por allowlist de 3 colunas, filtrando pela chave', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { chave: CHAVE_SLA_REVISAO, dias_atencao: 5, dias_atraso: 10 },
      error: null,
    })
    await expect(lerConfigSlaRevisao()).resolves.toEqual({
      diasAtencao: 5,
      diasAtraso: 10,
    })
    expect(froms).toEqual(['config_sla_revisao'])
    expect(selects).toEqual(['chave, dias_atencao, dias_atraso'])
    expect(eqs).toEqual([['chave', 'revisao_art20']])
  })

  it('NUNCA projeta `*` (allowlist explícita — [[reference_select_star_leaks_pii]])', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
    await lerConfigSlaRevisao()
    for (const cols of selects) expect(cols).not.toContain('*')
  })

  it('linha ausente → `null`, sem lançar', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
    await expect(lerConfigSlaRevisao()).resolves.toBeNull()
  })

  it('erro de leitura (RLS, rede) → `null`, sem lançar', async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'forbidden' },
    })
    await expect(lerConfigSlaRevisao()).resolves.toBeNull()
  })

  it('limiar não numérico no banco → `null` (a config ilegível degenera aqui, não na tela)', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { chave: CHAVE_SLA_REVISAO, dias_atencao: null, dias_atraso: 10 },
      error: null,
    })
    await expect(lerConfigSlaRevisao()).resolves.toBeNull()
  })
})
