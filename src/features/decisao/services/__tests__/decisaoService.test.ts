/**
 * Phase 15 / Plan 15-03 Task 1 — `decisaoService` contract test (DECISAO-01/02/03).
 *
 * Asserts the EXACT contracts the RH decision data layer must satisfy — the same
 * idioms the Phase-10 triagemService test encodes:
 *  - allowlist projections (NO `select('*')`, NO PII) on `listFinalistas` +
 *    `getDecisaoAtual` — the [[reference_select_star_leaks_pii]] lesson (T-15-09).
 *  - `getConsolidacao` posts the SHARED `.strict()` body { candidatura_id, vaga_id }
 *    to functions.invoke('consolidar-decisao-final') — closing the integration-
 *    contract-gap (the body the EF parses).
 *  - `registrarDecisao` calls supabase.rpc('registrar_decisao', { p_candidatura_id,
 *    p_decisao, p_justificativa }) — the RPC owns the terminal transition; the client
 *    NEVER writes `candidaturas.etapa_atual` directly (no auto-decision, RNF-07a).
 *
 * @see src/features/triagem/services/__tests__/triagemService.test.ts (the mock idiom)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-03-PLAN.md (Task 1)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the supabase client BEFORE importing the service ──────────────────────
// Capture the select() projections + the invoke()/rpc() calls to assert the
// allowlist + the EF/RPC contracts without a network round-trip.
const { selects, eqs, listaResposta, invokeMock, rpcMock, fromMock } = vi.hoisted(() => ({
  selects: [] as string[],
  // Phase 49 / plano 49-22 — os pares `.eq()` importam agora: `listFinalistas` passou a LER
  // `candidaturas` filtrando por `etapa_atual='decisao_final'`, e esse filtro é o contrato.
  eqs: [] as [string, unknown][],
  // Resposta da query SEM terminal (`listFinalistas`) — mutável por teste.
  listaResposta: { data: [] as unknown[], error: null as unknown },
  invokeMock: vi.fn(),
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
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
    q.is = vi.fn(() => q)
    // `.maybeSingle()` terminal (getDecisaoAtual). Default: no decision row.
    q.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
    // Make the query itself awaitable like PostgREST (listFinalistas — no terminal).
    q.then = (resolve: (v: { data: unknown[]; error: unknown }) => unknown) =>
      resolve({ data: listaResposta.data, error: listaResposta.error })
    return q
  }
  fromMock.mockImplementation(() => makeQuery())
  return {
    supabase: {
      from: fromMock,
      functions: { invoke: invokeMock },
      rpc: rpcMock,
    },
  }
})

import {
  getConsolidacao,
  registrarDecisao,
  listFinalistas,
  getDecisaoAtual,
} from '../decisaoService'

const VALID_CAND = '11111111-1111-4111-8111-111111111111'
const VALID_VAGA = '22222222-2222-4222-8222-222222222222'

describe('decisaoService — getConsolidacao (DECISAO-01 EF invoke + shared contract)', () => {
  beforeEach(() => {
    selects.length = 0
    invokeMock.mockReset()
    rpcMock.mockReset()
  })

  it('posts the shared .strict() body { candidatura_id, vaga_id } to consolidar-decisao-final', async () => {
    invokeMock.mockResolvedValue({
      data: { consolidated: 80, breakdown: [], recommendation: 'ok' },
      error: null,
    })
    await getConsolidacao(VALID_CAND, VALID_VAGA)
    expect(invokeMock).toHaveBeenCalledWith(
      'consolidar-decisao-final',
      expect.objectContaining({
        body: { candidatura_id: VALID_CAND, vaga_id: VALID_VAGA },
      }),
    )
  })

  it('rejects an invalid (non-uuid) candidatura_id at the shared schema BEFORE invoking', async () => {
    await expect(getConsolidacao('not-a-uuid', VALID_VAGA)).rejects.toThrow(
      /Identificadores da consolidação inválidos/,
    )
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('maps a transport error to the pt-BR copy', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(getConsolidacao(VALID_CAND, VALID_VAGA)).rejects.toThrow(
      /Não foi possível carregar a consolidação/,
    )
  })

  it('returns the EF { consolidated, breakdown, recommendation } shape on success', async () => {
    const payload = {
      consolidated: 72.5,
      breakdown: [{ etapa: 'triagem', normalized: 72.5, status: 'present', weight: 100, effective_weight: 1 }],
      recommendation: 'Aderência moderada.',
    }
    invokeMock.mockResolvedValue({ data: payload, error: null })
    const result = await getConsolidacao(VALID_CAND, VALID_VAGA)
    expect(result).toEqual(payload)
  })
})

describe('decisaoService — registrarDecisao (DECISAO-03 terminal RPC)', () => {
  beforeEach(() => {
    rpcMock.mockReset()
    fromMock.mockClear()
  })

  it('calls rpc("registrar_decisao", { p_candidatura_id, p_decisao, p_justificativa })', async () => {
    rpcMock.mockResolvedValue({ data: {}, error: null })
    await registrarDecisao({
      candidaturaId: VALID_CAND,
      decisao: 'rejeitado',
      justificativa: 'x'.repeat(55),
    })
    expect(rpcMock).toHaveBeenCalledWith(
      'registrar_decisao',
      expect.objectContaining({
        p_candidatura_id: VALID_CAND,
        p_decisao: 'rejeitado',
        p_justificativa: expect.any(String),
      }),
    )
  })

  it('the client NEVER writes candidaturas.etapa_atual directly (RPC owns the transition)', async () => {
    rpcMock.mockResolvedValue({ data: {}, error: null })
    await registrarDecisao({
      candidaturaId: VALID_CAND,
      decisao: 'aprovado',
      justificativa: 'y'.repeat(55),
    })
    // No `from('candidaturas')` UPDATE — the SECURITY DEFINER RPC is the sole writer.
    expect(fromMock).not.toHaveBeenCalledWith('candidaturas')
  })

  it('maps an RPC error to the pt-BR copy', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'forbidden' } })
    await expect(
      registrarDecisao({ candidaturaId: VALID_CAND, decisao: 'aprovado', justificativa: 'z'.repeat(55) }),
    ).rejects.toThrow(/Não foi possível registrar a decisão/)
  })
})

/**
 * Phase 48 / Plano 48-15 (JORN-19 · D-23) — a recusa do decisor revertido chega à tela.
 *
 * O bloqueio é do SERVIDOR (48-11, `registrar_decisao` vivo md5 `36ab0be3…`): quem teve a
 * decisão revertida recebe `42501` com a mensagem literal abaixo. O papel não autorizado
 * recebe o MESMO SQLSTATE com `forbidden` — por isso a marca `D-23` na mensagem é o que
 * separa as duas recusas, e não o código. Qualquer outro erro segue `DATABASE_ERROR`.
 */
describe('decisaoService — registrarDecisao traduz as recusas do servidor (48-15 / D-23)', () => {
  const MSG_D23_VIVA = 'quem teve a decisao revertida nao registra a nova decisao deste caso (D-23)'
  const vars = { candidaturaId: VALID_CAND, decisao: 'aprovado' as const, justificativa: 'z'.repeat(55) }

  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('42501 com a marca D-23 → FORBIDDEN_DECISOR_REVERTIDO', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: '42501', message: MSG_D23_VIVA } })
    await expect(registrarDecisao(vars)).rejects.toMatchObject({
      name: 'DecisaoServiceError',
      code: 'FORBIDDEN_DECISOR_REVERTIDO',
    })
  })

  it('BORDA: 42501 sem a marca D-23 (papel não autorizado) → FORBIDDEN, nunca decisor revertido', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: '42501', message: 'forbidden' } })
    await expect(registrarDecisao(vars)).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('a mensagem crua do transporte não vaza num caminho de permissão', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: '42501', message: MSG_D23_VIVA } })
    const err = (await registrarDecisao(vars).catch((e: unknown) => e)) as Error
    expect(err).toBeInstanceOf(Error)
    expect(err.message).not.toContain('decisao revertida nao registra')
  })

  it('outro erro (ex.: 23514) → DATABASE_ERROR, como antes', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '23514', message: 'justificativa deve ter ao menos 50 caracteres' },
    })
    await expect(registrarDecisao(vars)).rejects.toMatchObject({ code: 'DATABASE_ERROR' })
  })
})

describe('decisaoService — allowlist reads (T-15-09, NEVER select(*))', () => {
  beforeEach(() => {
    selects.length = 0
  })

  /*
   * ⚠ Phase 49 / plano 49-22 — D-36b: esta asserção mudou DE PROPÓSITO. Ela exigia
   * `candidatura_id` e `decisao`, porque `listFinalistas` lia `decisao_final` — a tabela de
   * quem JÁ TEM decisão registrada. Isso fazia a aba «Comparativo» da decisão final comparar
   * candidaturas ENCERRADAS e ignorar quem de fato aguarda decisão. A projeção nova é
   * `id, etapa_atual, status` sobre `candidaturas`; a allowlist (nunca o curinga, nunca PII)
   * segue sendo o invariante, e é ele que este teste continua vigiando.
   */
  it('listFinalistas projects ONLY id + etapa_atual + status (no *, no PII)', async () => {
    await listFinalistas(VALID_VAGA)
    const proj = selects.join(' | ')
    expect(proj).not.toContain('*')
    expect(proj).toContain('id')
    expect(proj).toContain('etapa_atual')
    expect(proj).toContain('status')
    // never identity/score columns:
    expect(proj).not.toContain('cpf')
    expect(proj).not.toContain('data_nascimento')
    expect(proj).not.toContain('nome')
    expect(proj).not.toContain('score')
  })

  it('getDecisaoAtual projects ONLY decisao, justificativa, em (no *, no PII)', async () => {
    await getDecisaoAtual(VALID_CAND)
    const proj = selects.join(' | ')
    expect(proj).not.toContain('*')
    expect(proj).toContain('decisao')
    expect(proj).toContain('justificativa')
    expect(proj).toContain('em')
    expect(proj).not.toContain('cpf')
  })
})

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * Phase 49 / plano 49-22 — D-36b: os «finalistas» são quem AGUARDA decisão.
 *
 * `listFinalistas` lia `decisao_final`, a tabela de quem JÁ TEM decisão registrada. As duas
 * populações são quase disjuntas: quem tem linha lá é, em regra, encerrado. O resultado era
 * uma aba «Comparativo» que comparava candidaturas terminadas e não mostrava quem está de
 * fato em `decisao_final` — enquanto o texto da tela dizia «outros candidatos em decisão
 * final», que era FALSO.
 *
 * ⚠ O filtro de encerrada usa o predicado CANÔNICO, não uma allowlist local, e ele é aplicado
 * no cliente de propósito: `candidaturaEncerrada` é uma disjunção sobre DUAS colunas
 * (`etapa_atual` terminal OU `status` terminal) e reescrevê-la em PostgREST seria a segunda
 * verdade que o 49-03 removeu.
 * ═══════════════════════════════════════════════════════════════════════════
 */
describe('decisaoService — listFinalistas: quem está em decisao_final e não encerrado (D-36b)', () => {
  beforeEach(() => {
    selects.length = 0
    eqs.length = 0
    listaResposta.data = []
    listaResposta.error = null
    fromMock.mockClear()
  })

  it('lê `candidaturas` — NÃO `decisao_final`', async () => {
    await listFinalistas(VALID_VAGA)
    expect(fromMock).toHaveBeenCalledWith('candidaturas')
    expect(fromMock).not.toHaveBeenCalledWith('decisao_final')
  })

  it('filtra pela vaga E por `etapa_atual = decisao_final`', async () => {
    await listFinalistas(VALID_VAGA)
    expect(eqs).toEqual(
      expect.arrayContaining([
        ['vaga_id', VALID_VAGA],
        ['etapa_atual', 'decisao_final'],
      ]),
    )
  })

  it('a fixture do <behavior>: só a candidatura em andamento sobra', async () => {
    listaResposta.data = [
      { id: 'cand-viva', etapa_atual: 'decisao_final', status: 'em_analise' },
      // `status='finalizado'` é o TERCEIRO estado terminal (o que o 49-05 encontrou no Kanban):
      // a etapa ainda é de trabalho, mas a candidatura acabou.
      { id: 'cand-fin', etapa_atual: 'decisao_final', status: 'finalizado' },
      { id: 'cand-rej', etapa_atual: 'rejeitado', status: 'rejeitado' },
    ]
    const out = await listFinalistas(VALID_VAGA)
    expect(out.map((f) => f.candidatura_id)).toEqual(['cand-viva'])
  })

  it('`aprovado_proxima` NÃO é encerrada — continua finalista', async () => {
    listaResposta.data = [
      { id: 'cand-apr', etapa_atual: 'decisao_final', status: 'aprovado_proxima' },
    ]
    const out = await listFinalistas(VALID_VAGA)
    expect(out.map((f) => f.candidatura_id)).toEqual(['cand-apr'])
  })

  it('devolve `etapa_atual` e `status` junto com o id (o que o predicado consumiu)', async () => {
    listaResposta.data = [
      { id: 'cand-viva', etapa_atual: 'decisao_final', status: 'em_analise' },
    ]
    const out = await listFinalistas(VALID_VAGA)
    expect(out[0]).toEqual({
      candidatura_id: 'cand-viva',
      etapa_atual: 'decisao_final',
      status: 'em_analise',
    })
  })

  it('erro do PostgREST → DecisaoServiceError DATABASE_ERROR (inalterado)', async () => {
    listaResposta.error = { message: 'boom' }
    await expect(listFinalistas(VALID_VAGA)).rejects.toMatchObject({
      name: 'DecisaoServiceError',
      code: 'DATABASE_ERROR',
    })
  })
})
