/**
 * Phase 52 / Plan 52-09 — `cadastroCandidatoRhService` (JORN-53, JORN-54).
 *
 * `supabase.functions.invoke` mockado. Casos: contrato válido → objeto tipado; `contato: null`
 * aceito (registro fictício/anonimizado, D-40); contrato fora da forma → erro de mensagem FIXA
 * que não ecoa o retorno (pode carregar dado pessoal); erro do invoke → código mapeado, com
 * `details` só do `error` do invoke — nunca o `data`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('@/lib/supabase/client', () => ({
  supabase: { functions: { invoke } },
}))

import {
  lerCadastroCandidatoRh,
  CadastroCandidatoRhServiceError,
} from '../cadastroCandidatoRhService'

const ID = '11111111-1111-4111-8111-111111111111'
const EMAIL = 'maria.souza@exemplo.com.br'
const CELULAR = '(11) 98888-7777'

function corpoValido(extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    vaga_titulo: 'Recepcionista',
    contato: { email: EMAIL, celular: CELULAR },
    cadastro: null,
    disponibilidade: null,
    inscricao: [],
    ...extra,
  }
}

/** FunctionsHttpError-like: o Response cru em `.context`. */
function erroHttp(status: number, error_code: string) {
  return {
    name: 'FunctionsHttpError',
    message: 'Edge Function returned a non-2xx status code',
    context: new Response(JSON.stringify({ ok: false, error_code, message: 'x' }), { status }),
  }
}

async function capturar(p: Promise<unknown>): Promise<CadastroCandidatoRhServiceError> {
  try {
    await p
  } catch (e) {
    expect(e).toBeInstanceOf(CadastroCandidatoRhServiceError)
    return e as CadastroCandidatoRhServiceError
  }
  throw new Error('esperava lançar')
}

beforeEach(() => {
  invoke.mockReset()
})

describe('lerCadastroCandidatoRh — contato', () => {
  it('chama a EF ler-cadastro-candidato-rh com { candidatura_id } e devolve o contrato tipado', async () => {
    invoke.mockResolvedValue({ data: corpoValido(), error: null })
    const r = await lerCadastroCandidatoRh(ID)
    expect(invoke).toHaveBeenCalledWith('ler-cadastro-candidato-rh', {
      body: { candidatura_id: ID },
    })
    expect(r.vaga_titulo).toBe('Recepcionista')
    expect(r.contato).toEqual({ email: EMAIL, celular: CELULAR })
  })

  it('aceita contato: null (registro fictício/anonimizado — D-40)', async () => {
    invoke.mockResolvedValue({ data: corpoValido({ contato: null }), error: null })
    const r = await lerCadastroCandidatoRh(ID)
    expect(r.contato).toBeNull()
  })

  it('aceita vaga_titulo null e contato com celular null', async () => {
    invoke.mockResolvedValue({
      data: corpoValido({ vaga_titulo: null, contato: { email: EMAIL, celular: null } }),
      error: null,
    })
    const r = await lerCadastroCandidatoRh(ID)
    expect(r.vaga_titulo).toBeNull()
    expect(r.contato).toEqual({ email: EMAIL, celular: null })
  })

  it('id não-uuid → INVALID_INPUT sem chamar a EF', async () => {
    const e = await capturar(lerCadastroCandidatoRh('nao-e-uuid'))
    expect(e.code).toBe('INVALID_INPUT')
    expect(invoke).not.toHaveBeenCalled()
  })
})

describe('lerCadastroCandidatoRh — contrato fora da forma', () => {
  it.each([
    ['contato não-objeto', corpoValido({ contato: EMAIL })],
    ['contato.email numérico', corpoValido({ contato: { email: 42, celular: CELULAR } })],
    ['contato.celular ausente', corpoValido({ contato: { email: EMAIL } })],
    ['vaga_titulo numérico', corpoValido({ vaga_titulo: 7 })],
    ['data null', null],
    ['data array', [EMAIL]],
  ])('%s → SERVER_ERROR com mensagem fixa, sem ecoar o retorno', async (_n, data) => {
    invoke.mockResolvedValue({ data, error: null })
    const e = await capturar(lerCadastroCandidatoRh(ID))
    expect(e.code).toBe('SERVER_ERROR')
    expect(['Dados do candidato em formato inesperado.', 'Não foi possível carregar os dados do candidato.']).toContain(
      e.message,
    )
    const serializado = JSON.stringify({ m: e.message, d: e.details })
    expect(serializado).not.toContain(EMAIL)
    expect(serializado).not.toContain(CELULAR)
  })

  it('{ ok:false, error_code } em data → código mapeado, details só com o código', async () => {
    invoke.mockResolvedValue({
      data: { ok: false, error_code: 'NOT_FOUND', message: `nada de ${EMAIL}` },
      error: null,
    })
    const e = await capturar(lerCadastroCandidatoRh(ID))
    expect(e.code).toBe('NOT_FOUND')
    expect(e.details).toEqual({ error_code: 'NOT_FOUND' })
  })
})

describe('lerCadastroCandidatoRh — erro do invoke', () => {
  it.each([
    [401, 'UNAUTHORIZED', 'UNAUTHORIZED'],
    [403, 'FORBIDDEN', 'UNAUTHORIZED'],
    [404, 'NOT_FOUND', 'NOT_FOUND'],
    [400, 'VALIDATION', 'INVALID_INPUT'],
    [500, 'SERVER_ERROR', 'SERVER_ERROR'],
  ])('HTTP %i %s → %s', async (status, ef, esperado) => {
    invoke.mockResolvedValue({ data: null, error: erroHttp(status, ef) })
    const e = await capturar(lerCadastroCandidatoRh(ID))
    expect(e.code).toBe(esperado)
    expect(e.message).toBe('Não foi possível carregar os dados do candidato.')
    expect((e.details as { error_code?: string }).error_code).toBe(ef)
  })

  it('falha de transporte sem código → NETWORK_ERROR', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { name: 'FunctionsFetchError', message: 'Failed to send a request' },
    })
    const e = await capturar(lerCadastroCandidatoRh(ID))
    expect(e.code).toBe('NETWORK_ERROR')
  })
})
