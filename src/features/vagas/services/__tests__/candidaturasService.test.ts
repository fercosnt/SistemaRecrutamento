/**
 * Plan 04-05 Task 3 — candidaturasService.submitCandidaturaWithRespostas
 * Vitest coverage.
 *
 * 7 cases covering:
 *   T1. Happy path → { candidaturaId }
 *   T2. DUPLICATE_CANDIDATURA → CandidaturasServiceError code DUPLICATE_APPLICATION
 *   T3. VALIDATION → INVALID_INPUT
 *   T4. UNAUTHORIZED → UNAUTHORIZED
 *   T5. SERVER_ERROR → DATABASE_ERROR
 *   T6. invokeError (transport) → NETWORK_ERROR
 *   T7. Pitfall 7 / B2 — log args contain redacted shape only; never
 *       curriculo_url or curriculo_nome (PII). Sentinel strings asserted absent.
 *
 * Mock pattern: hoisted `vi.mock('@/lib/supabase/client')` with
 * `functions.invoke` as a `vi.fn()` (mirrors Wave 1a precedent + Phase 2
 * cadastroService.test.ts pattern).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase/client'
import {
  submitCandidaturaWithRespostas,
  listCandidaturas,
  listAllCandidaturas,
  listCandidaturasByVaga,
  updateCandidaturaStatus,
  CandidaturasServiceError,
} from '../candidaturasService'

/**
 * Chainable PostgREST query-builder mock. Every method returns the same object,
 * and the object is awaitable (`then`) so `await query` resolves to `result`.
 */
function makeQueryMock(result: {
  data: unknown[]
  error: unknown
  count: number
}) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'gte', 'lte', 'order', 'range']) {
    q[m] = vi.fn(() => q)
  }
  q.then = (resolve: (v: typeof result) => unknown) => resolve(result)
  return q
}

const baseInput = {
  candidato_id: '11111111-2222-3333-4444-555555555555',
  vaga_id: '22222222-3333-4444-5555-666666666666',
  curriculo_url: 'auth-uid/uuid.pdf',
  curriculo_nome: 'cv.pdf',
  curriculo_size: 1024,
  respostas: [],
}

describe('submitCandidaturaWithRespostas (Plan 04-05)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('T1: happy path returns { candidaturaId }', async () => {
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        ok: true,
        data: { candidaturaId: 'cand-uuid', candidaturaUrl: '/candidato/perfil' },
      },
      error: null,
    })
    const result = await submitCandidaturaWithRespostas(baseInput)
    expect(result.candidaturaId).toBe('cand-uuid')
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'submit-candidatura',
      expect.objectContaining({ body: baseInput })
    )
  })

  it('T2: maps DUPLICATE_CANDIDATURA → DUPLICATE_APPLICATION', async () => {
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        ok: false,
        error_code: 'DUPLICATE_CANDIDATURA',
        message: 'Você já se candidatou a esta vaga.',
      },
      error: null,
    })
    try {
      await submitCandidaturaWithRespostas(baseInput)
      throw new Error('should have thrown')
    } catch (e) {
      if (e instanceof CandidaturasServiceError) {
        expect(e.code).toBe('DUPLICATE_APPLICATION')
        expect(e.message).toMatch(/já se candidatou/)
      } else throw e
    }
  })

  it('T3: maps VALIDATION → INVALID_INPUT', async () => {
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        ok: false,
        error_code: 'VALIDATION',
        message: 'Payload inválido',
        field: 'curriculo_url',
      },
      error: null,
    })
    try {
      await submitCandidaturaWithRespostas(baseInput)
      throw new Error('should have thrown')
    } catch (e) {
      if (e instanceof CandidaturasServiceError) {
        expect(e.code).toBe('INVALID_INPUT')
      } else throw e
    }
  })

  it('T4: maps UNAUTHORIZED → UNAUTHORIZED', async () => {
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ok: false, error_code: 'UNAUTHORIZED', message: 'Sessão inválida.' },
      error: null,
    })
    try {
      await submitCandidaturaWithRespostas(baseInput)
      throw new Error('should have thrown')
    } catch (e) {
      if (e instanceof CandidaturasServiceError) {
        expect(e.code).toBe('UNAUTHORIZED')
      } else throw e
    }
  })

  it('T5: maps SERVER_ERROR → DATABASE_ERROR', async () => {
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        ok: false,
        error_code: 'SERVER_ERROR',
        message: 'Não foi possível registrar a candidatura.',
      },
      error: null,
    })
    try {
      await submitCandidaturaWithRespostas(baseInput)
      throw new Error('should have thrown')
    } catch (e) {
      if (e instanceof CandidaturasServiceError) {
        expect(e.code).toBe('DATABASE_ERROR')
      } else throw e
    }
  })

  it('T6: maps invokeError (transport) → NETWORK_ERROR', async () => {
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch' },
    })
    try {
      await submitCandidaturaWithRespostas(baseInput)
      throw new Error('should have thrown')
    } catch (e) {
      if (e instanceof CandidaturasServiceError) {
        expect(e.code).toBe('NETWORK_ERROR')
      } else throw e
    }
  })

  it('T7: Pitfall 7 / B2 — logs contain {vaga_id, candidato_id, respostas_count} but NEVER curriculo_url, curriculo_nome, or PII filenames', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    ;(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ok: true, data: { candidaturaId: 'cand-uuid' } },
      error: null,
    })
    // B2: curriculo_url path AND curriculo_nome filename are both PII; both
    // must be redacted. The literal sentinels below are the spy assertion
    // targets — if either appears in console output, redaction is broken.
    await submitCandidaturaWithRespostas({
      ...baseInput,
      curriculo_url: 'PATH_SHOULD_NOT_APPEAR/file.pdf',
      curriculo_nome: 'PII_FILENAME_SHOULD_NOT_APPEAR_IN_LOGS.pdf',
    })
    const allArgs = [
      ...consoleSpy.mock.calls,
      ...consoleErrorSpy.mock.calls,
    ]
      .flat()
      .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
      .join(' | ')
    // Allowed redacted keys (positive assertion)
    expect(allArgs).toMatch(/vaga_id/)
    expect(allArgs).toMatch(/candidato_id/)
    expect(allArgs).toMatch(/respostas_count/)
    // B2 forbidden tokens (negative assertions — all must be absent)
    expect(allArgs).not.toMatch(/PATH_SHOULD_NOT_APPEAR/)
    expect(allArgs).not.toMatch(/PII_FILENAME_SHOULD_NOT_APPEAR_IN_LOGS/)
    expect(allArgs).not.toMatch(/curriculo_url/)
    expect(allArgs).not.toMatch(/curriculo_nome/)
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })
})

describe('listCandidaturas projection — T-08-09 / T-08-13 LGPD no-leak (Phase 8)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('projects an explicit candidate allowlist that NEVER sends the knockout criterion or RH/AI internals over the wire', async () => {
    const q = makeQueryMock({ data: [], error: null, count: 0 })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(q)

    await listCandidaturas('cand-uuid')

    const selectArg = (q.select as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string

    // No wildcard — RLS is row-level only and does NOT hide columns, so a
    // `select('*')` would transmit internal columns to the candidate's browser.
    expect(selectArg).not.toMatch(/\*/)

    // The knockout criterion must never reach the client (only the neutral
    // feedback_rejeicao is candidate-facing).
    expect(selectArg).not.toMatch(/opcao_knockout_id/)
    expect(selectArg).not.toMatch(/motivo_rejeicao/)

    // Broader RH/AI internals must not leak either (fail-closed allowlist).
    expect(selectArg).not.toMatch(/observacoes_rh/)
    expect(selectArg).not.toMatch(/score_geral/)
    expect(selectArg).not.toMatch(/analise_ia_/)
    expect(selectArg).not.toMatch(/etapa_justificativa/)

    // The neutral rejection message IS candidate-facing and must be present.
    expect(selectArg).toMatch(/feedback_rejeicao/)
    // Core candidate-facing fields the UI renders.
    expect(selectArg).toMatch(/\bstatus\b/)
    expect(selectArg).toMatch(/etapa_atual/)
  })
})

/**
 * 49-04 / JORN-38 + JORN-13 — a projeção das LISTAS DO RH.
 *
 * O defeito que estes testes travam tinha duas faces no MESMO select:
 * 1. `candidato:candidatos(*)` levava o cadastro inteiro — CPF e data de nascimento
 *    inclusive — ao navegador de qualquer recrutador logado. A RLS filtra LINHAS, não
 *    COLUNAS: nenhuma política impedia, e a tela não exibia nada disso.
 * 2. Os embeds `scores_bigfive` / `scores_disc` apontavam para tabelas com **0 linhas em
 *    PROD**, e o resultado vazio virava `0` nos helpers — nota inventada na tela (D-31).
 *
 * As asserções são sobre a STRING passada a `.select`, no idioma do teste de
 * `listCandidaturas` acima (Wave-0 de `scoresRhService`): é a forma que reprova o retorno
 * do curinga, não o valor de um fixture.
 */
describe('listAllCandidaturas — projeção explícita e fonte canônica das notas (49-04)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sem curinga em candidatos, sem cpf/data_nascimento, sem embed morto, com scores_candidato', async () => {
    const q = makeQueryMock({ data: [], error: null, count: 0 })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(q)

    await listAllCandidaturas()

    const selectArg = (q.select as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string

    // (1) JORN-38 — nenhuma coluna do candidato que a tela não exibe.
    expect(selectArg).not.toMatch(/candidatos\s*\(\s*\*/)
    expect(selectArg).not.toMatch(/\bcpf\b/)
    expect(selectArg).not.toMatch(/data_nascimento/)
    // As três que as telas REALMENTE exibem seguem presentes.
    expect(selectArg).toMatch(/nome_completo/)
    expect(selectArg).toMatch(/\bemail\b/)
    expect(selectArg).toMatch(/\bcelular\b/)

    // (2) JORN-13 — embeds mortos fora, fonte canônica dentro.
    expect(selectArg).not.toMatch(/scores_bigfive/)
    expect(selectArg).not.toMatch(/scores_disc/)
    expect(selectArg).toMatch(/scores_candidato/)
    expect(selectArg).toMatch(/redacoes_candidato/)
    expect(selectArg).toMatch(/scores_raven/)

    // A linha da própria `candidaturas` continua inteira: o RH vê o registro dele.
    expect(selectArg).toMatch(/^\s*\*/)
  })
})

describe('listCandidaturasByVaga — a aba «Por Vaga» na MESMA fonte da lista geral (49-04)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sem cpf nem data_nascimento, e com os mesmos embeds de notas do card', async () => {
    const q = makeQueryMock({ data: [], error: null, count: 0 })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(q)

    await listCandidaturasByVaga('vaga-uuid')

    const selectArg = (q.select as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string

    // JORN-38 — as duas colunas que a tela nunca exibiu e que iam no payload.
    expect(selectArg).not.toMatch(/\bcpf\b/)
    expect(selectArg).not.toMatch(/data_nascimento/)
    expect(selectArg).not.toMatch(/candidatos\s*\(\s*\*/)

    // JORN-13 — o card desta aba é o MESMO `CandidatoCard`; sem estes embeds ele
    // mostraria «não fez» para todo mundo, o que é uma mentira diferente da anterior.
    expect(selectArg).toMatch(/scores_candidato/)
    expect(selectArg).toMatch(/redacoes_candidato/)
    expect(selectArg).toMatch(/scores_raven/)
    // O card mostra o título da vaga; antes deste plano a aba não embutia `vaga`.
    expect(selectArg).toMatch(/vaga:vagas/)
  })
})

describe('updateCandidaturaStatus — o pré-fetch não puxa o cadastro do candidato (49-04)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('o primeiro select é projeção explícita de candidaturas, sem embed de candidatos', async () => {
    const selects: unknown[] = []
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const q: Record<string, unknown> = {}
      q.select = vi.fn((arg: unknown) => {
        selects.push(arg)
        return q
      })
      q.eq = vi.fn(() => q)
      q.single = vi.fn(async () => ({
        data: { id: 'cand-1', etapa_atual: 'triagem', status: 'em_analise' },
        error: null,
      }))
      q.update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }))
      return q
    })

    const r = await updateCandidaturaStatus({
      candidaturaId: 'cand-1',
      status_candidatura: 'em_analise',
    } as Parameters<typeof updateCandidaturaStatus>[0])

    expect(r.success).toBe(true)
    const preFetch = selects[0] as string
    // O corpo desta função só lê `etapa_atual` da linha pré-existente. Tudo o que
    // vinha além disso — o cadastro inteiro do candidato e da vaga — era payload
    // que nenhuma tela lia (JORN-38).
    expect(preFetch).not.toMatch(/candidatos/)
    expect(preFetch).not.toMatch(/vagas/)
    expect(preFetch).not.toMatch(/\*/)
    expect(preFetch).toMatch(/etapa_atual/)
  })
})

/**
 * 48-09 / D-12 — `feedback_rejeicao` chega ao candidato (painel, cópia LGPD). Só o
 * servidor o escreve, com texto NEUTRO. O antigo ramo de `updateCandidaturaStatus` que
 * copiava o motivo em texto livre do RH para essa coluna foi removido; este teste impede
 * que ele volte — mesmo que um chamador ainda empurre um `motivo_rejeicao` no objeto.
 */
describe('updateCandidaturaStatus — nunca escreve feedback_rejeicao (48-09 / D-12)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('o payload do UPDATE não carrega feedback_rejeicao, nem o texto do RH', async () => {
    const updates: unknown[] = []
    const TEXTO_RH = 'Texto livre do RH que jamais pode chegar ao candidato.'
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const q: Record<string, unknown> = {}
      q.select = vi.fn(() => q)
      q.eq = vi.fn(() => q)
      q.single = vi.fn(async () => ({
        data: { id: 'cand-1', etapa_atual: 'triagem', status: 'em_analise' },
        error: null,
      }))
      q.update = vi.fn((payload: unknown) => {
        updates.push(payload)
        return { eq: vi.fn(async () => ({ error: null })) }
      })
      return q
    })

    const r = await updateCandidaturaStatus({
      candidaturaId: 'cand-1',
      status_candidatura: 'rejeitado',
      // Um chamador antigo (fora do tipo) ainda mandando o campo removido.
      ...({ motivo_rejeicao: TEXTO_RH } as Record<string, unknown>),
    } as Parameters<typeof updateCandidaturaStatus>[0])

    expect(r.success).toBe(true)
    expect(updates).toHaveLength(1)
    expect(Object.keys(updates[0] as object)).not.toContain('feedback_rejeicao')
    expect(JSON.stringify(updates[0])).not.toContain(TEXTO_RH)
  })
})
