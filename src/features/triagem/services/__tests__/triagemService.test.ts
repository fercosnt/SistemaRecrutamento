/**
 * Phase 10 / Plan 10-01 Task 3 — Wave 0 RED scaffold for `triagemService.ts`
 * (TRIAGEM-02 panel read + TRIAGEM-03 comparativo invoke).
 *
 * RED against the not-yet-existing `../triagemService`. The dynamic import via the
 * static `import { ... } from '../triagemService'` below makes Vitest fail with
 * "Cannot find module '../triagemService'" — the calibrated Wave-0 RED signal
 * (smoke-runtime gate, the central Phase-4 lesson). The implementation lands in
 * a later Phase-10 wave and flips these GREEN.
 *
 * The assertions encode the EXACT contracts the service must satisfy:
 *  - allowlist projection (NO `*`, NO cpf/data_nascimento/email/celular) joining
 *    `analise_candidato_vaga` — the [[reference_select_star_leaks_pii]] lesson.
 *  - default order = score_match DESC nulls-last; `.range()` math for 20/page.
 *  - invokeComparativo posts { vaga_id, candidatura_ids } to
 *    functions.invoke('comparativo-candidatos') and maps the EF mixed-vaga 400
 *    to the exact pt-BR copy (the contract 10-06/T1 implements).
 *
 * @see src/features/vagas/services/candidaturasService.ts:1145-1230 (listByVaga select('*') hazard — the anti-pattern forbidden here)
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-UI-SPEC.md (§A panel)
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-01-PLAN.md (Task 3 — TRIAGEM-02/03)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the supabase client BEFORE importing the service ──────────────────
// Capture the select() string and the invoke() call so we can assert the
// allowlist projection and the comparativo contract without a network round-trip.
// vi.hoisted keeps these captures available to the hoisted vi.mock factory
// (top-level `const`s would throw "Cannot access before initialization").
const { lastSelect, rangeArgs, invokeMock, lastUpdate, rpcMock } = vi.hoisted(() => ({
  lastSelect: { value: '' },
  rangeArgs: {} as { from?: number; to?: number },
  invokeMock: vi.fn(),
  // Captures the payload passed to `.update(...)` on the candidaturas mutation so the
  // updateCandidaturaEtapa tests can assert `etapa_justificativa` is ALWAYS in the SET.
  lastUpdate: { value: null as Record<string, unknown> | null },
  // Captures `supabase.rpc('rejeitar_candidatura', {...})` — args + configurable result.
  rpcMock: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      lastSelect.value = cols
      return q
    })
    q.update = vi.fn((payload: Record<string, unknown>) => {
      lastUpdate.value = payload
      return q
    })
    q.eq = vi.fn(() => q)
    q.is = vi.fn(() => q)
    q.ilike = vi.fn(() => q)
    q.order = vi.fn(() => q)
    q.range = vi.fn((from: number, to: number) => {
      rangeArgs.from = from
      rangeArgs.to = to
      // Terminal: resolve like PostgREST.
      return Promise.resolve({ data: [], error: null, count: 0 })
    })
    return q
  }
  return {
    supabase: {
      from: vi.fn(() => makeQuery()),
      functions: { invoke: invokeMock },
      rpc: rpcMock,
    },
  }
})

import {
  listTriagemPanel,
  invokeComparativo,
  updateCandidaturaEtapa,
  rejeitarCandidatura,
} from '../triagemService'

describe('triagemService — TRIAGEM-02 panel read (allowlist projection)', () => {
  beforeEach(() => {
    lastSelect.value = ''
    rangeArgs.from = undefined
    rangeArgs.to = undefined
    invokeMock.mockReset()
  })

  it('select() projection contains NO `*` and NO PII columns (cpf/data_nascimento/email/celular)', async () => {
    await listTriagemPanel('vaga-1', {}, 'score_desc', { page: 1, limit: 20 })
    // FORBIDDEN — these must never appear in the panel projection:
    expect(lastSelect.value).not.toContain('*')
    expect(lastSelect.value).not.toContain('cpf')
    expect(lastSelect.value).not.toContain('data_nascimento')
    expect(lastSelect.value).not.toContain('email')
    expect(lastSelect.value).not.toContain('celular')
  })

  it('select() reads the flat analise columns from v_triagem_panel (score_match/pontos_fortes/gaps/flags/analise_status)', async () => {
    // Reads the `v_triagem_panel` view, which flattens score_match to the top level so the
    // DESC sort actually orders the parent rows (PostgREST can't order parents by an embedded
    // resource column). The analise fields are now top-level columns, not an `analise:...` embed.
    await listTriagemPanel('vaga-1', {}, 'score_desc', { page: 1, limit: 20 })
    expect(lastSelect.value).toContain('score_match')
    expect(lastSelect.value).toContain('pontos_fortes')
    expect(lastSelect.value).toContain('gaps')
    expect(lastSelect.value).toContain('flags')
    expect(lastSelect.value).toContain('analise_status')
    expect(lastSelect.value).toContain('candidato_nome')
  })

  it('.range() math = (page-1)*limit for 20/page (page 2 → 20..39)', async () => {
    await listTriagemPanel('vaga-1', {}, 'score_desc', { page: 2, limit: 20 })
    expect(rangeArgs.from).toBe(20)
    expect(rangeArgs.to).toBe(39)
  })
})

describe('triagemService — TRIAGEM-03 invokeComparativo', () => {
  beforeEach(() => {
    invokeMock.mockReset()
  })

  it('posts { vaga_id, candidatura_ids } to functions.invoke("comparativo-candidatos")', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true, ranking: [], latencia_ms: 1200 }, error: null })
    await invokeComparativo('vaga-1', ['c1', 'c2'])
    expect(invokeMock).toHaveBeenCalledWith(
      'comparativo-candidatos',
      expect.objectContaining({ body: { vaga_id: 'vaga-1', candidatura_ids: ['c1', 'c2'] } }),
    )
  })

  it('maps the EF mixed-vaga 400 to the exact pt-BR copy', async () => {
    // The EF returns { ok:false, error_code:'MIXED_VAGA' } for vagas diferentes.
    invokeMock.mockResolvedValue({ data: { ok: false, error_code: 'MIXED_VAGA' }, error: null })
    await expect(invokeComparativo('vaga-1', ['c1', 'c2'])).rejects.toThrow(
      'Os candidatos selecionados pertencem a vagas diferentes. Compare candidatos de uma mesma vaga.',
    )
  })
})

// ── Phase 49 / plano 49-13 — o contrato novo da EF (49-08) chega ao cliente ───────────
//
// ⚠ POR QUE CADA CAUSA TEM DE TER A SUA FRASE. Até o 49-08 a EF colapsava três causas
// distintas num único MIXED_VAGA, cuja mensagem («vagas diferentes») era FALSA em duas
// delas: um knockout sem análise e um candidato ainda não analisado são da MESMA vaga. O
// RH lia «vagas diferentes» e ia caçar um erro que não existia. A EF passou a emitir
// ENCERRADA e SEM_ANALISE; se este mapa não os conhecesse, os dois cairiam no genérico.
describe('triagemService — invokeComparativo: as recusas novas da EF (49-13 / D-55)', () => {
  beforeEach(() => {
    invokeMock.mockReset()
  })

  it('ENCERRADA ⇒ diz que uma candidatura está encerrada (NUNCA «vagas diferentes»)', async () => {
    invokeMock.mockResolvedValue({ data: { ok: false, error_code: 'ENCERRADA' }, error: null })
    const err = await invokeComparativo('vaga-1', ['c1', 'c2']).catch((e: Error) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toMatch(/encerrada/i)
    // A metade que importa: a frase FALSA de antes não aparece mais nesta causa.
    expect((err as Error).message).not.toMatch(/vagas diferentes/i)
  })

  it('SEM_ANALISE ⇒ diz que falta análise e o que fazer (aguardar ou reprocessar)', async () => {
    invokeMock.mockResolvedValue({
      data: { ok: false, error_code: 'SEM_ANALISE', candidaturas_sem_analise: ['c2'] },
      error: null,
    })
    await expect(invokeComparativo('vaga-1', ['c1', 'c2'])).rejects.toThrow(
      'Ainda não há análise de IA para todos os selecionados. Aguarde a análise ou reprocesse.',
    )
  })

  it('VALIDATION ⇒ a mensagem carrega o teto vindo da CONSTANTE da EF, não de um literal paralelo', async () => {
    invokeMock.mockResolvedValue({ data: { ok: false, error_code: 'VALIDATION' }, error: null })
    // O número exato é propriedade da constante `COMPARATIVO_MAX_CANDIDATOS`; o que este
    // teste trava é que a frase o cite (e não um `10` congelado nesta camada).
    const { COMPARATIVO_MAX_CANDIDATOS } = await import(
      '../../../../../supabase/functions/_shared/comparativo-config'
    )
    await expect(invokeComparativo('vaga-1', ['c1'])).rejects.toThrow(
      `Selecione entre 2 e ${COMPARATIVO_MAX_CANDIDATOS} candidatos para comparar.`,
    )
  })

  it('FORBIDDEN ⇒ mensagem GENÉRICA de propósito: não distingue «não existe» de «não é sua»', async () => {
    // T-49-08-02: uma frase que os diferenciasse viraria oráculo de existência — por
    // tentativa, um RH enumeraria ids de candidatura do sistema inteiro.
    invokeMock.mockResolvedValue({ data: { ok: false, error_code: 'FORBIDDEN' }, error: null })
    await expect(invokeComparativo('vaga-1', ['c1', 'c2'])).rejects.toThrow(
      'Você não tem acesso a uma das candidaturas selecionadas.',
    )
  })

  it('SEM_RESULTADO_IA ⇒ diz que nenhum modelo foi consultado e que NÃO é conexão (WINDOWS 78)', async () => {
    // 49-27 criou o código (503). Até o 49-22 ele caía no genérico, e a TELA dizia «Verifique
    // a conexão» — falso para um corte de gasto. A frase do toast não nomeia a causa exata de
    // propósito (ver o comentário no mapa): dizer «injeção detectada» ao RH confirmaria a um
    // atacante que a defesa disparou.
    invokeMock.mockResolvedValue({
      data: { ok: false, error_code: 'SEM_RESULTADO_IA', motivo: 'cost_cap_exceeded' },
      error: null,
    })
    await expect(invokeComparativo('vaga-1', ['c1', 'c2'])).rejects.toThrow(
      /Nenhum modelo de IA foi consultado/,
    )
    invokeMock.mockResolvedValue({
      data: { ok: false, error_code: 'SEM_RESULTADO_IA', motivo: 'prompt_injection_detected' },
      error: null,
    })
    await expect(invokeComparativo('vaga-1', ['c1', 'c2'])).rejects.toThrow(
      /Não é falha de conexão/,
    )
    // A causa exata NÃO vaza para o texto que o RH lê.
    await expect(invokeComparativo('vaga-1', ['c1', 'c2'])).rejects.not.toThrow(/injec|injeç/i)
  })

  it('a recusa que chega como FunctionsHttpError (4xx) usa a MESMA cópia, não o genérico', async () => {
    // Caminho real de uma recusa 400: o supabase-js devolve `error`, e `data` vem nulo. Se
    // a ramificação vivesse só no bloco `!data.ok`, as quatro recusas caíam no genérico.
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        name: 'FunctionsHttpError',
        message: 'Edge Function returned a non-2xx status code',
        context: { json: async () => ({ ok: false, error_code: 'ENCERRADA' }) },
      },
    })
    await expect(invokeComparativo('vaga-1', ['c1', 'c2'])).rejects.toThrow(/encerrada/i)
  })

  it('código desconhecido cai no genérico — nunca numa frase específica sobre causa que não se sabe', async () => {
    invokeMock.mockResolvedValue({
      data: { ok: false, error_code: 'ALGO_QUE_NAO_EXISTE' },
      error: null,
    })
    await expect(invokeComparativo('vaga-1', ['c1', 'c2'])).rejects.toThrow(
      'Não foi possível gerar o comparativo. Tente novamente.',
    )
  })

  it('AI_UNAVAILABLE segue chegando à tela pelo `details.error_code` (o <AsyncState> ramifica)', async () => {
    invokeMock.mockResolvedValue({
      data: { ok: false, error_code: 'AI_UNAVAILABLE' },
      error: null,
    })
    await expect(invokeComparativo('vaga-1', ['c1', 'c2'])).rejects.toMatchObject({
      details: { error_code: 'AI_UNAVAILABLE' },
    })
  })
})

describe('triagemService — invokeComparativo: posicoes + proveniência (D-27b / D-28)', () => {
  beforeEach(() => {
    invokeMock.mockReset()
  })

  it('200 devolve `posicoes`, `provedor_ia`, `modelo_ia` e `fallback_cause`', async () => {
    invokeMock.mockResolvedValue({
      data: {
        ok: true,
        ranking: { ranked_candidates: [] },
        posicoes: { C1: 'cand-b', C2: 'cand-a' },
        provedor_ia: 'openai',
        modelo_ia: 'gpt-4o-mini-2024',
        fallback_cause: 'anthropic_max_tokens',
        latencia_ms: 4200,
      },
      error: null,
    })
    const res = await invokeComparativo('vaga-1', ['cand-a', 'cand-b'])
    expect(res.posicoes).toEqual({ C1: 'cand-b', C2: 'cand-a' })
    expect(res.provedor_ia).toBe('openai')
    expect(res.modelo_ia).toBe('gpt-4o-mini-2024')
    expect(res.fallback_cause).toBe('anthropic_max_tokens')
    expect(res.latencia_ms).toBe(4200)
  })

  it('EF anterior ao 49-08 (sem os campos) ⇒ `posicoes` {} e proveniência null, sem lançar', async () => {
    // A degradação correta: `{}` faz a tela mostrar o rótulo CRU, nunca o nome do vizinho.
    invokeMock.mockResolvedValue({
      data: { ok: true, ranking: { ranked_candidates: [] }, latencia_ms: 1200 },
      error: null,
    })
    const res = await invokeComparativo('vaga-1', ['c1', 'c2'])
    expect(res.posicoes).toEqual({})
    expect(res.provedor_ia).toBeNull()
    expect(res.modelo_ia).toBeNull()
    expect(res.fallback_cause).toBeNull()
  })
})

// ── OPER-01/03: updateCandidaturaEtapa ALWAYS SETs etapa_justificativa ──────
// Pitfall 3 — the trigger reads NEW.etapa_justificativa; if the UPDATE omits the
// column the trigger reads a STALE stored value. So etapa_justificativa MUST be in
// the SET list on EVERY call (forward advance → null, regression → the fresh text,
// reject → the ≥50 text). Assert the captured payload.
describe('triagemService — updateCandidaturaEtapa always writes etapa_justificativa (OPER-01/03)', () => {
  beforeEach(() => {
    lastUpdate.value = null
  })

  it('forward advance (no justificativa) → payload includes etapa_justificativa: null', async () => {
    await updateCandidaturaEtapa('cand-1', 'triagem')
    expect(lastUpdate.value).not.toBeNull()
    expect(lastUpdate.value).toHaveProperty('etapa_justificativa', null)
    expect(lastUpdate.value).toHaveProperty('etapa_atual', 'triagem')
    // Forward advance is NOT a reject → no status override.
    expect(lastUpdate.value).not.toHaveProperty('status')
  })

  it('regression WITH text → payload carries the fresh justificativa (no stale OLD)', async () => {
    await updateCandidaturaEtapa('cand-1', 'inscricao', 'voltou por X')
    expect(lastUpdate.value).toHaveProperty('etapa_justificativa', 'voltou por X')
    expect(lastUpdate.value).toHaveProperty('etapa_atual', 'inscricao')
  })

  it("reject via updateCandidaturaEtapa is REJECTED (WR-05) — the audited path is rejeitarCandidatura", async () => {
    // WR-05: a bare updateCandidaturaEtapa(id,'rejeitado') would bypass the ≥50 +
    // vaga-owner gate of the rejeitar_candidatura RPC. The service now throws instead
    // of performing the write, so this dead path can never become a silent bypass.
    await expect(updateCandidaturaEtapa('cand-1', 'rejeitado')).rejects.toMatchObject({
      name: 'TriagemServiceError',
      code: 'INVALID_INPUT',
    })
    // No UPDATE payload should have been sent to Supabase (reset to null in beforeEach).
    expect(lastUpdate.value).toBeNull()
  })

  it('empty candidaturaId → throws TriagemServiceError INVALID_INPUT', async () => {
    await expect(updateCandidaturaEtapa('', 'triagem')).rejects.toMatchObject({
      name: 'TriagemServiceError',
      code: 'INVALID_INPUT',
    })
  })
})

// ── OPER-02: rejeitarCandidatura calls the SECURITY DEFINER RPC ─────────────
// The service is a thin typed pass-through — the DB RPC (31-01) is the ≥50 authority.
// Assert the exact p_-prefixed params and the RPC-error → TriagemServiceError mapping.
describe('triagemService — rejeitarCandidatura (OPER-02)', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it("calls supabase.rpc('rejeitar_candidatura', {p_candidatura_id,p_motivo,p_justificativa})", async () => {
    rpcMock.mockResolvedValue({ error: null })
    const justificativa = 'x'.repeat(60)
    await rejeitarCandidatura('cand-9', 'perfil_desalinhado', justificativa)
    expect(rpcMock).toHaveBeenCalledWith('rejeitar_candidatura', {
      p_candidatura_id: 'cand-9',
      p_motivo: 'perfil_desalinhado',
      p_justificativa: justificativa,
    })
  })

  it('RPC error → throws TriagemServiceError with code DATABASE_ERROR', async () => {
    rpcMock.mockResolvedValue({ error: { message: 'check_violation' } })
    await expect(
      rejeitarCandidatura('cand-9', 'outro', 'y'.repeat(60)),
    ).rejects.toMatchObject({ name: 'TriagemServiceError', code: 'DATABASE_ERROR' })
  })

  it('empty candidaturaId → throws TriagemServiceError INVALID_INPUT (no RPC call)', async () => {
    rpcMock.mockResolvedValue({ error: null })
    await expect(
      rejeitarCandidatura('', 'outro', 'z'.repeat(60)),
    ).rejects.toMatchObject({ name: 'TriagemServiceError', code: 'INVALID_INPUT' })
    expect(rpcMock).not.toHaveBeenCalled()
  })
})
