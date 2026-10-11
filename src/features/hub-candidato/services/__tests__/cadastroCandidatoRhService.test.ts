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

// ---------------------------------------------------------------------------
// Task 2 — contrato completo (cadastro, disponibilidade, inscrição)
// ---------------------------------------------------------------------------

const CPF = '123.456.789-09'

function cadastroCompleto(extra: Record<string, unknown> = {}) {
  return {
    nome_completo: 'Maria Aparecida Souza',
    email: EMAIL,
    cpf: CPF,
    celular: CELULAR,
    data_nascimento: '1994-03-12',
    genero: 'feminino',
    cep: '01415-001',
    logradouro: 'Rua Haddock Lobo',
    numero: '120',
    complemento: null,
    bairro: 'Jardim Paulista',
    cidade: 'São Paulo',
    estado: 'SP',
    linkedin_url: 'https://www.linkedin.com/in/maria',
    linkedin: null,
    instagram_url: null,
    instagram: '@maria',
    como_conheceu: 'indicacao',
    como_conheceu_detalhes: null,
    ...extra,
  }
}

function item(extra: Record<string, unknown> = {}) {
  return {
    pergunta_id: 'a0000000-0000-4000-8000-000000000001',
    bloco: 'jornada',
    ordem: 1,
    texto_pergunta: 'Você trabalha aos sábados?',
    tipo_resposta: 'single_choice',
    eliminatoria: true,
    removida: false,
    resposta: { opcoes: ['Sim'] },
    ...extra,
  }
}

function corpoCompleto(extra: Record<string, unknown> = {}) {
  return corpoValido({
    cadastro: cadastroCompleto(),
    disponibilidade: {
      periodo_disponivel: 'Integral',
      regime_trabalho: 'Presencial',
      disponibilidade_imediata: true,
      data_disponibilidade: null,
    },
    inscricao: [
      item(),
      item({ pergunta_id: 'p2', ordem: 2, tipo_resposta: 'numerico', eliminatoria: false, resposta: { numero: 4.5 } }),
      item({ pergunta_id: 'p3', ordem: 3, eliminatoria: false, removida: true, resposta: { texto: 'antiga' } }),
      item({ pergunta_id: 'p4', ordem: 4, eliminatoria: false, resposta: null }),
      item({ pergunta_id: 'p5', ordem: 5, eliminatoria: false, resposta: { opcoes: ['A', 'B'], texto: 'Outro' } }),
    ],
    ...extra,
  })
}

describe('lerCadastroCandidatoRh — contrato completo', () => {
  it('contrato completo válido → objeto tipado, na ordem recebida', async () => {
    invoke.mockResolvedValue({ data: corpoCompleto(), error: null })
    const r = await lerCadastroCandidatoRh(ID)
    expect(r.cadastro?.cpf).toBe(CPF)
    expect(r.cadastro && Object.keys(r.cadastro)).toHaveLength(19)
    expect(r.disponibilidade?.regime_trabalho).toBe('Presencial')
    expect(r.inscricao.map((i) => i.ordem)).toEqual([1, 2, 3, 4, 5])
    expect(r.inscricao[0]).toEqual(item())
    expect(r.inscricao[1].resposta).toEqual({ numero: 4.5 })
    expect(r.inscricao[2].removida).toBe(true)
    expect(r.inscricao[3].resposta).toBeNull()
    expect(r.inscricao[4].resposta).toEqual({ opcoes: ['A', 'B'], texto: 'Outro' })
  })

  it('cadastro null (tombstone) e disponibilidade null aceitos', async () => {
    invoke.mockResolvedValue({
      data: corpoCompleto({ contato: null, cadastro: null, disponibilidade: null }),
      error: null,
    })
    const r = await lerCadastroCandidatoRh(ID)
    expect(r.cadastro).toBeNull()
    expect(r.disponibilidade).toBeNull()
  })

  it('cadastro do fictício: email null com celular presente é aceito', async () => {
    invoke.mockResolvedValue({
      data: corpoCompleto({ contato: null, cadastro: cadastroCompleto({ email: null }) }),
      error: null,
    })
    const r = await lerCadastroCandidatoRh(ID)
    expect(r.contato).toBeNull()
    expect(r.cadastro?.email).toBeNull()
    expect(r.cadastro?.celular).toBe(CELULAR)
  })

  it('campos a mais no corpo NÃO atravessam para a tela (cópia só do contrato)', async () => {
    invoke.mockResolvedValue({
      data: corpoCompleto({
        cadastro: cadastroCompleto({ user_id: 'u-1', deleted_at: null }),
        inscricao: [item({ opcao_eliminatoria: 'Não' })],
      }),
      error: null,
    })
    const r = await lerCadastroCandidatoRh(ID)
    expect(r.cadastro).not.toHaveProperty('user_id')
    expect(r.cadastro).not.toHaveProperty('deleted_at')
    expect(r.inscricao[0]).not.toHaveProperty('opcao_eliminatoria')
  })

  it.each([
    ['inscricao não-array', { inscricao: { a: 1 } }],
    ['inscricao ausente', { inscricao: undefined }],
    ['item com eliminatoria string', { inscricao: [item({ eliminatoria: 'sim' })] }],
    ['item com ordem string', { inscricao: [item({ ordem: '1' })] }],
    ['item sem removida', { inscricao: [item({ removida: undefined })] }],
    ['resposta com opcoes numéricas', { inscricao: [item({ resposta: { opcoes: [1, 2] } })] }],
    ['resposta com chave desconhecida', { inscricao: [item({ resposta: { cpf: CPF } })] }],
    ['resposta objeto vazio', { inscricao: [item({ resposta: {} })] }],
    ['resposta com numero string', { inscricao: [item({ resposta: { numero: '4' } })] }],
    ['cadastro com campo numérico', { cadastro: cadastroCompleto({ cpf: 12345678909 }) }],
    ['cadastro sem um campo', { cadastro: cadastroCompleto({ bairro: undefined }) }],
    ['disponibilidade com imediata string', {
      disponibilidade: { periodo_disponivel: 'x', regime_trabalho: 'y', disponibilidade_imediata: 'sim', data_disponibilidade: null },
    }],
  ])('%s → SERVER_ERROR de mensagem fixa, sem ecoar o retorno', async (_n, extra) => {
    invoke.mockResolvedValue({ data: corpoCompleto(extra), error: null })
    const e = await capturar(lerCadastroCandidatoRh(ID))
    expect(e.code).toBe('SERVER_ERROR')
    expect(e.message).toBe('Dados do candidato em formato inesperado.')
    expect(e.details).toBeUndefined()
    const serializado = JSON.stringify({ m: e.message, d: e.details })
    for (const v of [EMAIL, CELULAR, CPF, 'Haddock']) expect(serializado).not.toContain(v)
  })
})
