/**
 * Phase 15 / Plan 15-04 Task 1 — `explicacaoService` contract test (DECISAO-04).
 *
 * Asserts the EXACT LGPD Art. 20 / RNF-07a contracts the candidate explanation data
 * layer must satisfy — the same allowlist + own-row-RPC idioms the Phase-14
 * cognitivoService test encodes:
 *  - the own-row read uses the EXPLICIT `DECISAO_EXPLICACAO_ALLOWLIST` (6 named
 *    columns since Phase 42 / 42-11) and NEVER `select('*')`, NEVER joins
 *    `scores_candidato` — the candidate never sees a score/band/percentile
 *    ([[reference_select_star_leaks_pii]], T-15-12).
 *  - the REACHABILITY GATE (Pitfall 6 / T-15-14): `getExplicacao` returns `null`
 *    unless `decisao = 'rejeitado'` (no row / aprovado / em_espera → not-available).
 *  - the derived candidate reason is a TEMPLATED non-clinical string (Open Q5) — the
 *    raw internal justificativa is NEVER surfaced verbatim, and no score leaks.
 *  - `stampExplicacao` / `solicitarRevisao` call the own-row SECURITY DEFINER RPCs
 *    with 42501/403 → neutral `'denied'` (not an error).
 *  - SEC-03: `solicitarRevisao` fires NO client webhook — the RH notification moved to
 *    the trg_n8n_revisao_decisao DB trigger (pg_net + Vault). The service resolves 'ok'
 *    from the RPC alone; the n8n URL must never ship in the bundle (Pitfall 5).
 *
 * @see src/features/decisao/services/__tests__/decisaoService.test.ts (the mock idiom)
 * @see src/features/explicacao/services/explicacaoService.ts (the unit under test)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock the supabase client BEFORE importing the service ──────────────────────
// Capture the select() projection + the rpc() calls to assert the allowlist + the
// own-row RPC contracts without a network round-trip.
const { selects, rpcMock, fromMock, maybeSingleMock } = vi.hoisted(() => ({
  selects: [] as string[],
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
    q.eq = vi.fn(() => q)
    q.maybeSingle = maybeSingleMock
    return q
  }
  fromMock.mockImplementation(() => makeQuery())
  return {
    supabase: {
      from: fromMock,
      rpc: rpcMock,
    },
  }
})

import {
  DECISAO_EXPLICACAO_ALLOWLIST,
  getExplicacao,
  normalizarVeredito,
  solicitarRevisao,
  stampExplicacao,
} from '../explicacaoService'

const VALID_CAND = '11111111-1111-4111-8111-111111111111'

/** A rejected own row with the review lifecycle fields overridable per case. */
function linhaRejeitada(over: Record<string, unknown> = {}) {
  return {
    decisao: 'rejeitado',
    revisao_solicitada_em: null,
    revisao_resultado: null,
    explicacao_solicitada_em: null,
    revisao_veredito: null,
    revisao_respondida_em: null,
    ...over,
  }
}

beforeEach(() => {
  selects.length = 0
  rpcMock.mockReset()
  maybeSingleMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('explicacaoService — allowlist (T-15-12 / LGPD-04, no score leak)', () => {
  it('the allowlist names EXACTLY the 6 own-row columns and NO score/band/percentile', () => {
    const cols = DECISAO_EXPLICACAO_ALLOWLIST.split(',').map((c) => c.trim())
    expect(cols).toEqual([
      'decisao',
      'revisao_solicitada_em',
      'revisao_resultado',
      'explicacao_solicitada_em',
      'revisao_veredito',
      'revisao_respondida_em',
    ])
  })

  it('the allowlist EXCLUDES the internal RH justificativa (Phase-24 CR-01 — network leak)', () => {
    // justificativa is never read (reason is derived from `decisao`); selecting it shipped
    // the internal RH reasoning text to the candidate's browser. It must not be projected.
    expect(DECISAO_EXPLICACAO_ALLOWLIST).not.toMatch(/justificativa/)
  })

  it('the allowlist is NEVER a star projection and NEVER references scores_candidato', () => {
    expect(DECISAO_EXPLICACAO_ALLOWLIST).not.toContain('*')
    expect(DECISAO_EXPLICACAO_ALLOWLIST).not.toMatch(/scores_candidato|score|banda|percentil/i)
  })

  it('getExplicacao reads decisao_final with the allowlist string (never select("*"))', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        decisao: 'rejeitado',
        justificativa: 'internal RH text 50+ chars internal RH text internal',
        revisao_solicitada_em: null,
        revisao_resultado: null,
        explicacao_solicitada_em: null,
      },
      error: null,
    })
    await getExplicacao(VALID_CAND)
    expect(fromMock).toHaveBeenCalledWith('decisao_final')
    expect(selects).toContain(DECISAO_EXPLICACAO_ALLOWLIST)
    expect(selects.some((s) => s.includes('*'))).toBe(false)
  })
})

describe('explicacaoService — allowlist estendida com o resultado da revisão (REVISAO-04)', () => {
  it('nomeia o veredito e a data da resposta, além das 4 chaves que já tinha', () => {
    // Fechar o round-trip do Art. 20 do lado do candidato exige exatamente estas duas
    // colunas e nenhuma outra: o veredito e QUANDO a resposta foi dada. A justificativa
    // escrita por quem revisou já viajava em `revisao_resultado` desde a Phase 15.
    const cols = DECISAO_EXPLICACAO_ALLOWLIST.split(',').map((c) => c.trim())
    expect(cols).toContain('revisao_veredito')
    expect(cols).toContain('revisao_respondida_em')
    expect(cols).toHaveLength(6)
  })

  it('NUNCA nomeia coluna de autoria — a identidade de quem revisou não chega ao cliente', () => {
    // A transparência do Art. 20 é atendida pelo CONTEÚDO da revisão, não pela
    // identificação nominal de quem a fez: o nome do revisor é PII de funcionário
    // (42-UI-SPEC §Regra de identidade). O regexp cobre as DUAS colunas de autoria de
    // `decisao_final` — a de quem decidiu e a de quem revisou —, e é deliberadamente
    // parcial para que o literal completo não passe a existir nesta feature.
    // RLS é row-level e NÃO esconde coluna: a allowlist é o ÚNICO controle de coluna
    // nesta superfície, então a asserção tem de ser sobre ela, não sobre a policy.
    expect(DECISAO_EXPLICACAO_ALLOWLIST).not.toMatch(/por_usuario/)
  })

  it('continua EXCLUINDO a justificativa interna do recrutador (fix CR-01 da Phase 24)', () => {
    // Redundante de propósito com a asserção da Phase 15 acima: aquela guardava a
    // allowlist de 4 colunas, esta guarda a de 6. Estender a allowlist é precisamente a
    // operação em que uma exclusão de segurança se perde por acidente — uma coluna lida
    // e nunca usada ainda viaja pela rede até o navegador do candidato.
    expect(DECISAO_EXPLICACAO_ALLOWLIST).not.toMatch(/justificativa/)
  })

  it('não nomeia nenhum valor de acompanhamento interno do RH (D-P42-03)', () => {
    // O limiar de acompanhamento da fila é config INTERNA e nunca alcança superfície de
    // candidato. Aqui isso é trivialmente verdadeiro (não há coluna dessas em
    // `decisao_final`), e a asserção existe para que continue trivialmente verdadeiro.
    expect(DECISAO_EXPLICACAO_ALLOWLIST).not.toMatch(/sla|dias|atraso|atencao|atenção/i)
  })
})

describe('explicacaoService — leitura do resultado da revisão (REVISAO-04)', () => {
  it.each(['mantida', 'revertida'] as const)(
    'devolve o veredito `%s` e a data da resposta quando a revisão foi respondida',
    async (veredito) => {
      maybeSingleMock.mockResolvedValue({
        data: linhaRejeitada({
          revisao_solicitada_em: '2026-07-20T10:00:00Z',
          revisao_respondida_em: '2026-07-28T14:30:00Z',
          revisao_veredito: veredito,
          revisao_resultado: 'Reexaminamos o conjunto do processo e a base desta resposta.',
        }),
        error: null,
      })
      const result = await getExplicacao(VALID_CAND)
      expect(result?.revisao_veredito).toBe(veredito)
      expect(result?.revisao_respondida_em).toBe('2026-07-28T14:30:00Z')
      expect(result?.revisao_resultado).toBe(
        'Reexaminamos o conjunto do processo e a base desta resposta.',
      )
    },
  )

  it('revisão ainda sem resposta → veredito e data nulos (nada a exibir)', async () => {
    maybeSingleMock.mockResolvedValue({
      data: linhaRejeitada({ revisao_solicitada_em: '2026-07-20T10:00:00Z' }),
      error: null,
    })
    const result = await getExplicacao(VALID_CAND)
    expect(result?.revisao_veredito).toBeNull()
    expect(result?.revisao_respondida_em).toBeNull()
  })

  it('veredito INESPERADO do servidor resolve para null em vez de vazar para a interface', async () => {
    // O CHECK do banco já restringe o vocabulário, mas o cliente não deve confiar num
    // invariante remoto para decidir o que renderiza: um valor novo tem de FECHAR a
    // superfície, nunca ser ecoado cru ao candidato.
    maybeSingleMock.mockResolvedValue({
      data: linhaRejeitada({
        revisao_respondida_em: '2026-07-28T14:30:00Z',
        revisao_veredito: 'parcialmente_revertida',
      }),
      error: null,
    })
    const result = await getExplicacao(VALID_CAND)
    expect(result?.revisao_veredito).toBeNull()
  })

  it('a leitura NÃO devolve nenhum campo de autoria da revisão', async () => {
    // Belt-and-braces sobre a asserção da allowlist: mesmo que o servidor devolva a
    // coluna de autoria (RLS é row-level e não esconde coluna), a projeção montada aqui
    // não a repassa. A chave é montada em runtime para que o literal completo não exista
    // como texto nesta feature.
    const chaveDeAutoria = ['revisao', 'por', 'usuario'].join('_')
    maybeSingleMock.mockResolvedValue({
      data: {
        ...linhaRejeitada({ revisao_respondida_em: '2026-07-28T14:30:00Z' }),
        [chaveDeAutoria]: '99999999-9999-4999-8999-999999999999',
      },
      error: null,
    })
    const result = await getExplicacao(VALID_CAND)
    expect(Object.keys(result ?? {})).not.toContain(chaveDeAutoria)
    expect(JSON.stringify(result)).not.toContain('99999999-9999-4999-8999-999999999999')
  })
})

describe('explicacaoService — normalizarVeredito (puro e total)', () => {
  it.each(['mantida', 'revertida'] as const)('aceita `%s`', (v) => {
    expect(normalizarVeredito(v)).toBe(v)
  })

  it.each([
    null,
    undefined,
    '',
    'MANTIDA',
    'mantido',
    'parcialmente_revertida',
    42,
    {},
    [],
  ])('resolve %o para null', (v) => {
    expect(normalizarVeredito(v)).toBeNull()
  })
})

describe('explicacaoService — reachability gate (Pitfall 6 / T-15-14)', () => {
  it('returns null when no decision row exists AND it was not a knockout', async () => {
    // §7.18: a ausência de `decisao_final` deixou de ser conclusiva — pode ser o
    // knockout. O serviço PERGUNTA ao servidor; um `false` mantém a página indisponível.
    // Este é o caso (b) do §7.18: rejeição HUMANA na triagem, que não tem página.
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
    rpcMock.mockResolvedValue({ data: false, error: null })
    await expect(getExplicacao(VALID_CAND)).resolves.toBeNull()
  })

  it.each(['aprovado', 'em_espera'] as const)(
    'returns null when decisao=%s (only rejeitado reaches the page)',
    async (decisao) => {
      maybeSingleMock.mockResolvedValue({
        data: {
          decisao,
          justificativa: 'x'.repeat(60),
          revisao_solicitada_em: null,
          revisao_resultado: null,
          explicacao_solicitada_em: null,
        },
        error: null,
      })
      await expect(getExplicacao(VALID_CAND)).resolves.toBeNull()
    },
  )

  it('returns the explanation with a TEMPLATED non-clinical reason when decisao=rejeitado', async () => {
    const rawJustificativa =
      'Score abaixo do corte; banda C; reprovar — texto interno do RH com mais de 50 chars.'
    maybeSingleMock.mockResolvedValue({
      data: {
        decisao: 'rejeitado',
        justificativa: rawJustificativa,
        revisao_solicitada_em: null,
        revisao_resultado: null,
        explicacao_solicitada_em: null,
      },
      error: null,
    })
    const result = await getExplicacao(VALID_CAND)
    expect(result).not.toBeNull()
    expect(result?.decisao).toBe('rejeitado')
    // The candidate reason is the TEMPLATED string, NOT the raw internal justificativa,
    // and carries no score/band/percentile (Open Q5 / RNF-07a / LGPD-04).
    expect(result?.reason).not.toBe(rawJustificativa)
    expect(result?.reason).not.toMatch(/score|banda|percentil|\bC\b|reprovar/i)
    expect(result?.reason.length).toBeGreaterThan(20)
  })

  it('throws INVALID_INPUT when candidaturaId is empty', async () => {
    await expect(getExplicacao('')).rejects.toThrow(/obrigatório/)
  })
})

describe('explicacaoService — stampExplicacao (T-15-15 visit stamp)', () => {
  it('invokes the stamp_explicacao_acessada RPC with the candidatura id', async () => {
    rpcMock.mockResolvedValue({ error: null })
    await expect(stampExplicacao(VALID_CAND)).resolves.toBe('ok')
    expect(rpcMock).toHaveBeenCalledWith('stamp_explicacao_acessada', {
      p_candidatura_id: VALID_CAND,
    })
  })

  it('returns "denied" (neutral) on a 42501 own-row denial — not an error', async () => {
    rpcMock.mockResolvedValue({ error: { code: '42501', message: 'forbidden' } })
    await expect(stampExplicacao(VALID_CAND)).resolves.toBe('denied')
  })
})

describe('explicacaoService — solicitarRevisao (DECISAO-04 + SEC-03 server-side notify)', () => {
  it('invokes solicitar_revisao_decisao and fires NO client webhook (SEC-03: dispatch is server-side)', async () => {
    rpcMock.mockResolvedValue({ error: null })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await expect(solicitarRevisao(VALID_CAND)).resolves.toBe('ok')

    expect(rpcMock).toHaveBeenCalledWith('solicitar_revisao_decisao', {
      p_candidatura_id: VALID_CAND,
    })
    // SEC-03: the RH notification moved to the trg_n8n_revisao_decisao DB trigger
    // (pg_net + Vault). The client MUST NOT dispatch — the n8n URL must never ship in
    // the bundle (Pitfall 5). So no fetch fires from this service.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('resolves "ok" from the RPC alone — no client fetch to fail (SEC-03)', async () => {
    rpcMock.mockResolvedValue({ error: null })
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    // The mutation resolves on the RPC; there is no client notification path to break.
    await expect(solicitarRevisao(VALID_CAND)).resolves.toBe('ok')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns "denied" on a 42501 own-row denial and fires no client dispatch', async () => {
    rpcMock.mockResolvedValue({ error: { code: '42501', message: 'forbidden' } })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(solicitarRevisao(VALID_CAND)).resolves.toBe('denied')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['P0002', 'no_data_found'] as const)(
    'returns "unavailable" on the reachability %s (no rejected decision) — distinct from a retryable error (WR-05)',
    async (code) => {
      rpcMock.mockResolvedValue({
        error: { code, message: 'revisao indisponivel: nao ha decisao rejeitada' },
      })
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      // Non-retryable neutral outcome — NOT a thrown NETWORK_ERROR, NOT a webhook fire.
      await expect(solicitarRevisao(VALID_CAND)).resolves.toBe('unavailable')
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )
})

/**
 * §7.18 do GUIA-VALIDACAO-FINAL, caminho (2) — veredito do responsável: quem é eliminado
 * pelo knockout automático passa a ter página de explicação, e NÃO passa a ter revisão.
 *
 * A medição que motivou tudo: quem é reprovado POR UM HUMANO tinha e-mail, explicação e
 * revisão; quem é reprovado SEM NENHUM HUMANO OLHAR não tinha nenhum dos três — o inverso
 * do que o Art. 20 protege.
 *
 * O portão mais importante deste bloco não é o que faz a página aparecer: é o que a
 * mantém FECHADA para a rejeição humana da triagem. As duas são indistinguíveis nas
 * colunas que o candidato pode ler (as duas têm status='rejeitado', as duas ficam sem
 * `decisao_final`, e a allowlist do cliente exclui `motivo_rejeicao` de propósito).
 * Inferir knockout da ausência de decisão daria a uma rejeição escrita por uma pessoa o
 * texto da automática — plausível, silencioso e falso, a família de defeito desta sessão.
 */
describe('explicacaoService — a rejeição automática (§7.18, caminho 2)', () => {
  it('sem `decisao_final` e COM knockout: devolve explicação de origem automática', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
    rpcMock.mockResolvedValue({ data: true, error: null })

    const r = await getExplicacao(VALID_CAND)
    expect(r).not.toBeNull()
    expect(r?.origem).toBe('automatica')
    expect(r?.decisao).toBe('rejeitado')
    // Pergunta feita ao SERVIDOR, com o id da própria candidatura.
    expect(rpcMock).toHaveBeenCalledWith('explicacao_rejeicao_automatica', {
      p_candidatura_id: VALID_CAND,
    })
  })

  it('o texto nomeia o MECANISMO e cala o CRITÉRIO (Art. 20 sim, D-15 preservado)', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
    rpcMock.mockResolvedValue({ data: true, error: null })

    const r = await getExplicacao(VALID_CAND)
    // Diz que foi automático e o que o motivou — é o direito do Art. 20.
    expect(r?.reason).toMatch(/requisitos objetivos|elegibilidade/i)
    expect(r?.reason).toMatch(/formul[áa]rio/i)
    // E não entrega nota, banda, percentil nem análise — RNF-07a / LGPD-04.
    expect(r?.reason).not.toMatch(/score|nota \d|banda|percentil|\d+\s*%/i)
    // A frase que existe para desarmar a leitura de julgamento pessoal.
    expect(r?.reason).toMatch(/n[ãa]o impede que voc[êe] se candidate a outras/i)
  })

  it('o ciclo de revisão vem TODO nulo — não há revisão a oferecer', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
    rpcMock.mockResolvedValue({ data: true, error: null })

    const r = await getExplicacao(VALID_CAND)
    expect(r?.revisao_solicitada_em).toBeNull()
    expect(r?.revisao_resultado).toBeNull()
    expect(r?.revisao_veredito).toBeNull()
    expect(r?.revisao_respondida_em).toBeNull()
    expect(r?.explicacao_solicitada_em).toBeNull()
  })

  it('⚠ a rejeição HUMANA da triagem continua sem página (o portão que mais importa)', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
    rpcMock.mockResolvedValue({ data: false, error: null })
    await expect(getExplicacao(VALID_CAND)).resolves.toBeNull()
  })

  it('só `true` abre a página: nem truthy, nem shape inesperado de um build futuro', async () => {
    for (const data of [1, 'true', {}, [], null, undefined]) {
      maybeSingleMock.mockResolvedValue({ data: null, error: null })
      rpcMock.mockResolvedValue({ data, error: null })
      await expect(getExplicacao(VALID_CAND)).resolves.toBeNull()
    }
  })

  it('erro na RPC resolve para indisponível, e não derruba a tela de transparência', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
    rpcMock.mockResolvedValue({ data: null, error: { code: '42501' } })
    await expect(getExplicacao(VALID_CAND)).resolves.toBeNull()
  })

  it('havendo decisão HUMANA rejeitada, a origem é humana e a RPC nem é consultada', async () => {
    rpcMock.mockClear()
    maybeSingleMock.mockResolvedValue({ data: linhaRejeitada(), error: null })

    const r = await getExplicacao(VALID_CAND)
    expect(r?.origem).toBe('humana')
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('aprovado/em_espera não caem no fallback — knockout e decisão final se excluem', async () => {
    for (const decisao of ['aprovado', 'em_espera'] as const) {
      rpcMock.mockClear()
      maybeSingleMock.mockResolvedValue({ data: linhaRejeitada({ decisao }), error: null })
      await expect(getExplicacao(VALID_CAND)).resolves.toBeNull()
      expect(rpcMock).not.toHaveBeenCalled()
    }
  })
})
