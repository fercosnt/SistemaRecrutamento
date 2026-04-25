/**
 * Tests for cadastroService (Phase 2 Plan 02-05)
 *
 * Phase 1 FOUND-01 moved multi-table orchestration (auth.signUp + 5 inserts +
 * rollback) to the Edge Function `cadastrar-candidato`. The client-side
 * `cadastrarCandidato` is now a thin adapter around `supabase.functions.invoke`.
 *
 * Plan 02-05 (Wave 2) evolves the client error contract to match Plan 02-03:
 *   { ok: false, error_code, message, field?, error? }
 * with 4 canonical codes (EMAIL_EXISTS / CPF_EXISTS / VALIDATION / SERVER_ERROR)
 * plus transport fallbacks (NETWORK_ERROR / UNKNOWN_ERROR / EDGE_FUNCTION_ERROR).
 *
 * This file tests:
 * 1. error_code -> CadastroError.code routing (all 4 canonical codes)
 * 2. Legacy { ok: false, error: string } -> UNKNOWN_ERROR fallback
 * 3. invokeError (SDK-level failure) -> NETWORK_ERROR
 * 4. field preserved from server response
 * 5. Pitfall 7: password never appears in console.* calls
 * 6. CadastroError class shape
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cadastrarCandidato, CadastroError, tryAutoLogin } from '../cadastroService'
import type { CandidatoFormData } from '../../types'

// Mock do Supabase client — Plan 02-05 shape aligned with 02-PATTERNS.md §
// Vitest Mock Setup. functions.invoke is the primary integration point now;
// auth.signInWithPassword is used by tryAutoLogin.
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
    auth: {
      signInWithPassword: vi.fn(),
      admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) },
    },
  },
}))

// Mock do authService (re-exported shim, kept for backward compat imports).
// Phase 3 Plan 03-04 / D-17 Option A: OLD AuthError renamed to SignUpError;
// canonical AuthError now lives at @/features/auth/types/authTypes.ts.
vi.mock('../authService', () => ({
  signUp: vi.fn(),
  SignUpError: class SignUpError extends Error {
    constructor(
      message: string,
      public code: string,
      public originalError?: unknown
    ) {
      super(message)
      this.name = 'SignUpError'
    }
  },
  // Re-exported by the shim — Phase 2 consumers may import from this path.
  tryAutoLogin: vi.fn(),
}))

// Import dos mocks após configuração
import { supabase } from '@/lib/supabase/client'

// ============================================
// FIXTURES
// ============================================

/**
 * Minimal form data satisfying `cadastrarCandidato` at runtime. Cast via
 * `as unknown as CandidatoFormData` to bypass full type compliance during
 * tests — the service only reads a subset of fields.
 */
const minimalFormData = {
  dadosPessoais: {
    nome_completo: 'João Teste',
    cpf: '12345678901',
    email: 'joao@example.com',
    telefone: '11987654321',
    data_nascimento: '1990-01-01',
    genero: 'masculino',
    como_conheceu: 'outros',
    como_conheceu_detalhes: 'teste',
    instagram: '',
    linkedin: '',
    senha: 'Abcd1234',
    confirmar_senha: 'Abcd1234',
  },
  endereco: {
    cep: '01310100',
    logradouro: 'Av Paulista',
    numero: '1000',
    complemento: '',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    estado: 'SP',
  },
  disponibilidade: {
    turno_preferido: 'integral',
    modelo_trabalho: 'hibrido',
    disponibilidade_imediata: true,
    data_disponibilidade: null,
  },
  autorizacoes: {
    autorizacao_uso_dados: true,
    autorizacao_comunicacao: true,
    autorizacao_retencao_curriculo: true,
    autorizacao_analise_video: false,
  },
} as unknown as CandidatoFormData

// ============================================
// Phase 2 Plan 02-05 — structured error_code routing
// ============================================

describe('cadastroService — structured error_code routing (Phase 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws CadastroError with code=EMAIL_EXISTS and field=email when server returns EMAIL_EXISTS', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        ok: false,
        error_code: 'EMAIL_EXISTS',
        message: 'Este email já está cadastrado.',
        field: 'email',
        error: 'Este email já está cadastrado.',
      },
      error: null,
    } as never)

    await expect(cadastrarCandidato(minimalFormData)).rejects.toMatchObject({
      name: 'CadastroError',
      code: 'EMAIL_EXISTS',
      field: 'email',
    })
  })

  it('throws CadastroError with code=CPF_EXISTS and field=cpf when server returns CPF_EXISTS', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        ok: false,
        error_code: 'CPF_EXISTS',
        message: 'Este CPF já está cadastrado.',
        field: 'cpf',
      },
      error: null,
    } as never)

    await expect(cadastrarCandidato(minimalFormData)).rejects.toMatchObject({
      code: 'CPF_EXISTS',
      field: 'cpf',
    })
  })

  it('throws CadastroError with code=VALIDATION and preserves field when VALIDATION', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        ok: false,
        error_code: 'VALIDATION',
        message: 'CEP inválido',
        field: 'cep',
      },
      error: null,
    } as never)

    await expect(cadastrarCandidato(minimalFormData)).rejects.toMatchObject({
      code: 'VALIDATION',
      field: 'cep',
    })
  })

  it('throws CadastroError with code=SERVER_ERROR when server emits SERVER_ERROR', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        ok: false,
        error_code: 'SERVER_ERROR',
        message: 'Algo deu errado.',
      },
      error: null,
    } as never)

    await expect(cadastrarCandidato(minimalFormData)).rejects.toMatchObject({
      code: 'SERVER_ERROR',
    })
  })

  it('falls back to UNKNOWN_ERROR when legacy { ok:false, error: string } (no error_code)', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { ok: false, error: 'Erro genérico legado' },
      error: null,
    } as never)

    await expect(cadastrarCandidato(minimalFormData)).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
      message: 'Erro genérico legado',
    })
  })

  it('throws CadastroError with code=NETWORK_ERROR when invokeError is non-null', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'fetch failed' },
    } as never)

    await expect(cadastrarCandidato(minimalFormData)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    })
  })

  it('never logs password/senha via console.log during a failed submit (Pitfall 7)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined)

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { ok: false, error_code: 'SERVER_ERROR', message: 'oops' },
      error: null,
    } as never)

    try {
      await cadastrarCandidato(minimalFormData)
    } catch {
      // expected
    }

    for (const spy of [logSpy, errSpy, infoSpy, debugSpy]) {
      for (const call of spy.mock.calls) {
        const serialized = JSON.stringify(call)
        expect(serialized).not.toContain('Abcd1234')
        expect(serialized).not.toMatch(/"senha"/)
        expect(serialized).not.toMatch(/"confirmar_senha"/)
      }
    }

    logSpy.mockRestore()
    errSpy.mockRestore()
    infoSpy.mockRestore()
    debugSpy.mockRestore()
  })
})

// ============================================
// Happy path — success response shape
// ============================================

describe('cadastroService — success path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns { userId, candidatoId, ... } when server returns ok:true', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        ok: true,
        data: {
          userId: 'user-uuid-1',
          candidatoId: 'cand-uuid-2',
          disponibilidadeId: 'disp-uuid-3',
          autorizacoesId: 'aut-uuid-4',
        },
      },
      error: null,
    } as never)

    const result = await cadastrarCandidato(minimalFormData)

    expect(result).toEqual({
      userId: 'user-uuid-1',
      candidatoId: 'cand-uuid-2',
      disponibilidadeId: 'disp-uuid-3',
      autorizacoesId: 'aut-uuid-4',
    })
  })

  it('throws EDGE_FUNCTION_ERROR when ok:true but data is incomplete', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { ok: true, data: { userId: 'u1' /* missing candidatoId */ } },
      error: null,
    } as never)

    await expect(cadastrarCandidato(minimalFormData)).rejects.toMatchObject({
      code: 'EDGE_FUNCTION_ERROR',
    })
  })
})

// ============================================
// tryAutoLogin helper (D-02)
// ============================================

describe('tryAutoLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when first attempt succeeds (no retry)', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    } as never)

    const promise = tryAutoLogin('joao@example.com', 'Abcd1234')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe(true)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1)
  })

  it('retries once with 500ms backoff when first attempt fails', async () => {
    vi.mocked(supabase.auth.signInWithPassword)
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      } as never)
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      } as never)

    const promise = tryAutoLogin('joao@example.com', 'Abcd1234')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe(true)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(2)
  })

  it('returns false when both attempts fail', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    } as never)

    const promise = tryAutoLogin('joao@example.com', 'Abcd1234')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe(false)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(2)
  })

  it('never logs the password via console.*', async () => {
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
      vi.spyOn(console, 'info').mockImplementation(() => undefined),
      vi.spyOn(console, 'debug').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    ]

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    } as never)

    const promise = tryAutoLogin('joao@example.com', 'Abcd1234')
    await vi.runAllTimersAsync()
    await promise

    for (const spy of spies) {
      for (const call of spy.mock.calls) {
        const serialized = JSON.stringify(call)
        expect(serialized).not.toContain('Abcd1234')
      }
      spy.mockRestore()
    }
  })
})

// ============================================
// CadastroError class
// ============================================

describe('CadastroError', () => {
  it('is an Error subclass with name "CadastroError"', () => {
    const err = new CadastroError('msg', 'UNKNOWN_ERROR')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(CadastroError)
    expect(err.name).toBe('CadastroError')
  })

  it('stores message, code, and field', () => {
    const err = new CadastroError('Email duplicado', 'EMAIL_EXISTS', 'email')
    expect(err.message).toBe('Email duplicado')
    expect(err.code).toBe('EMAIL_EXISTS')
    expect(err.field).toBe('email')
  })

  it('accepts all Phase 2 canonical codes', () => {
    const codes: Array<CadastroError['code']> = [
      'EMAIL_EXISTS',
      'CPF_EXISTS',
      'VALIDATION',
      'SERVER_ERROR',
      'NETWORK_ERROR',
      'EDGE_FUNCTION_ERROR',
      'UNKNOWN_ERROR',
    ]
    for (const code of codes) {
      const err = new CadastroError('test', code)
      expect(err.code).toBe(code)
    }
  })
})

