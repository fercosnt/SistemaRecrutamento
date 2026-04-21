/**
 * Tests for duplicateCheckService
 *
 * Phase 1 FOUND-10 migrated duplicate check from anon SELECT on
 * `public.candidatos` to `supabase.rpc('check_candidato_duplicate', ...)`
 * (SECURITY DEFINER, never exposes raw candidato data).
 *
 * Phase 2 Plan 02-05 extended the RPC to include `rate_limited: boolean`
 * (migration 0005, D-12 rate-limit policy). Client maps `rate_limited=true`
 * to `DuplicateCheckError({ code: 'RATE_LIMITED' })`.
 *
 * This file tests:
 * - Pure helpers (cleanCPF, cleanEmail, format validators) — untouched from
 *   pre-Phase-2 suite.
 * - RPC happy path: cpf_exists/email_exists booleans propagate to
 *   `isDuplicate`.
 * - RPC rate-limit gate: `rate_limited: true` -> DuplicateCheckError with
 *   code='RATE_LIMITED'.
 * - Structural probe (source text): interface contains `rate_limited: boolean`
 *   and code union contains `'RATE_LIMITED'`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkCPFDuplicate,
  checkEmailDuplicate,
  checkBothDuplicates,
  DuplicateCheckError,
  cleanCPF,
  cleanEmail,
  isValidCPFFormat,
  isValidEmailFormat,
} from '../duplicateCheckService'

// Mock do Supabase client
//
// Phase 2 Plan 02-05: `rpc` is the primary integration point post-FOUND-10.
// `from` is kept for back-compat with any residual callers (none in this
// service, but mock shape stays consistent with 02-PATTERNS § Vitest Mock Setup).
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

// Import do mock após configuração
import { supabase } from '@/lib/supabase/client'

// ============================================
// Pure helpers (untouched from pre-Phase-2 suite)
// ============================================

describe('cleanCPF', () => {
  it('deve remover pontos e traços do CPF', () => {
    expect(cleanCPF('123.456.789-00')).toBe('12345678900')
  })

  it('deve remover espaços do CPF', () => {
    expect(cleanCPF('123 456 789 00')).toBe('12345678900')
  })

  it('deve retornar apenas números', () => {
    expect(cleanCPF('abc123def456ghi789jkl00')).toBe('12345678900')
  })
})

describe('cleanEmail', () => {
  it('deve converter email para lowercase', () => {
    expect(cleanEmail('JoAo@ExAmPlE.cOm')).toBe('joao@example.com')
  })

  it('deve remover espaços do email', () => {
    expect(cleanEmail('  joao@example.com  ')).toBe('joao@example.com')
  })

  it('deve aplicar trim e lowercase simultaneamente', () => {
    expect(cleanEmail('  JoAo@ExAmPlE.cOm  ')).toBe('joao@example.com')
  })
})

describe('isValidCPFFormat', () => {
  it('deve validar CPF com 11 dígitos (sem formatação)', () => {
    expect(isValidCPFFormat('12345678900')).toBe(true)
  })

  it('deve validar CPF formatado (com pontos e traço)', () => {
    expect(isValidCPFFormat('123.456.789-00')).toBe(true)
  })

  it('deve rejeitar CPF com menos de 11 dígitos', () => {
    expect(isValidCPFFormat('123456789')).toBe(false)
  })

  it('deve rejeitar CPF com mais de 11 dígitos', () => {
    expect(isValidCPFFormat('123456789012')).toBe(false)
  })

  it('deve rejeitar CPF vazio', () => {
    expect(isValidCPFFormat('')).toBe(false)
  })
})

describe('isValidEmailFormat', () => {
  it('deve validar email com formato correto', () => {
    expect(isValidEmailFormat('joao@example.com')).toBe(true)
  })

  it('deve validar email com subdomínios', () => {
    expect(isValidEmailFormat('joao@mail.example.com')).toBe(true)
  })

  it('deve rejeitar email sem @', () => {
    expect(isValidEmailFormat('joaoexample.com')).toBe(false)
  })

  it('deve rejeitar email sem domínio', () => {
    expect(isValidEmailFormat('joao@')).toBe(false)
  })

  it('deve rejeitar email sem nome de usuário', () => {
    expect(isValidEmailFormat('@example.com')).toBe(false)
  })

  it('deve rejeitar email vazio', () => {
    expect(isValidEmailFormat('')).toBe(false)
  })
})

// ============================================
// checkCPFDuplicate via RPC (Phase 1 FOUND-10 contract)
// ============================================

describe('checkCPFDuplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve lançar erro para CPF com formato inválido', async () => {
    await expect(checkCPFDuplicate('123')).rejects.toThrow(DuplicateCheckError)
    await expect(checkCPFDuplicate('123')).rejects.toThrow('CPF inválido')
  })

  it('retorna isDuplicate: true quando RPC.cpf_exists=true', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: true, email_exists: false, rate_limited: false },
      error: null,
    } as never)

    const result = await checkCPFDuplicate('123.456.789-00')

    expect(result.isDuplicate).toBe(true)
    expect(result.field).toBe('cpf')
    expect(result.value).toBe('12345678900')
  })

  it('retorna isDuplicate: false quando RPC.cpf_exists=false', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: false, email_exists: false, rate_limited: false },
      error: null,
    } as never)

    const result = await checkCPFDuplicate('123.456.789-00')

    expect(result.isDuplicate).toBe(false)
    expect(result.field).toBe('cpf')
    expect(result.value).toBe('12345678900')
  })

  it('lança DuplicateCheckError quando RPC retorna error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    } as never)

    await expect(checkCPFDuplicate('123.456.789-00')).rejects.toThrow(
      DuplicateCheckError
    )
  })

  it('chama RPC check_candidato_duplicate com p_cpf limpo e p_email vazio', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: false, email_exists: false, rate_limited: false },
      error: null,
    } as never)

    await checkCPFDuplicate('123.456.789-00')

    expect(supabase.rpc).toHaveBeenCalledWith('check_candidato_duplicate', {
      p_cpf: '12345678900',
      p_email: '',
    })
  })
})

// ============================================
// checkEmailDuplicate via RPC
// ============================================

describe('checkEmailDuplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve lançar erro para email com formato inválido', async () => {
    await expect(checkEmailDuplicate('invalido')).rejects.toThrow(
      DuplicateCheckError
    )
    await expect(checkEmailDuplicate('invalido')).rejects.toThrow(
      'Email inválido'
    )
  })

  it('retorna isDuplicate: true quando RPC.email_exists=true', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: false, email_exists: true, rate_limited: false },
      error: null,
    } as never)

    const result = await checkEmailDuplicate('maria@example.com')

    expect(result.isDuplicate).toBe(true)
    expect(result.field).toBe('email')
    expect(result.value).toBe('maria@example.com')
  })

  it('retorna isDuplicate: false quando RPC.email_exists=false', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: false, email_exists: false, rate_limited: false },
      error: null,
    } as never)

    const result = await checkEmailDuplicate('novo@example.com')

    expect(result.isDuplicate).toBe(false)
    expect(result.field).toBe('email')
    expect(result.value).toBe('novo@example.com')
  })

  it('lança DuplicateCheckError quando RPC retorna error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    } as never)

    await expect(checkEmailDuplicate('test@example.com')).rejects.toThrow(
      DuplicateCheckError
    )
  })

  it('chama RPC com p_email normalizado (lowercase + trim) e p_cpf vazio', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: false, email_exists: false, rate_limited: false },
      error: null,
    } as never)

    await checkEmailDuplicate('  JoAo@ExAmPlE.cOm  ')

    expect(supabase.rpc).toHaveBeenCalledWith('check_candidato_duplicate', {
      p_cpf: '',
      p_email: 'joao@example.com',
    })
  })
})

// ============================================
// checkBothDuplicates — single RPC call with both args
// ============================================

describe('checkBothDuplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('faz uma única chamada RPC com ambos p_cpf e p_email', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: false, email_exists: false, rate_limited: false },
      error: null,
    } as never)

    await checkBothDuplicates('123.456.789-00', 'test@example.com')

    expect(supabase.rpc).toHaveBeenCalledTimes(1)
    expect(supabase.rpc).toHaveBeenCalledWith('check_candidato_duplicate', {
      p_cpf: '12345678900',
      p_email: 'test@example.com',
    })
  })

  it('retorna ambos duplicados quando RPC retorna ambos true', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: true, email_exists: true, rate_limited: false },
      error: null,
    } as never)

    const results = await checkBothDuplicates(
      '123.456.789-00',
      'maria@example.com'
    )

    expect(results.cpf.isDuplicate).toBe(true)
    expect(results.cpf.field).toBe('cpf')
    expect(results.email.isDuplicate).toBe(true)
    expect(results.email.field).toBe('email')
  })

  it('retorna ambos não-duplicados quando RPC retorna ambos false', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: false, email_exists: false, rate_limited: false },
      error: null,
    } as never)

    const results = await checkBothDuplicates(
      '123.456.789-00',
      'novo@example.com'
    )

    expect(results.cpf.isDuplicate).toBe(false)
    expect(results.email.isDuplicate).toBe(false)
  })
})

// ============================================
// DuplicateCheckError class
// ============================================

describe('DuplicateCheckError', () => {
  it('deve criar erro com código e mensagem', () => {
    const error = new DuplicateCheckError('Teste erro', 'INVALID_INPUT', 'cpf')

    expect(error.message).toBe('Teste erro')
    expect(error.code).toBe('INVALID_INPUT')
    expect(error.field).toBe('cpf')
    expect(error.name).toBe('DuplicateCheckError')
  })

  it('deve ser instância de Error', () => {
    const error = new DuplicateCheckError('Teste', 'NETWORK_ERROR')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(DuplicateCheckError)
  })

  it('aceita todos os códigos Phase 2 (incluindo RATE_LIMITED)', () => {
    const codes: Array<DuplicateCheckError['code']> = [
      'INVALID_INPUT',
      'NETWORK_ERROR',
      'DATABASE_ERROR',
      'RATE_LIMITED',
    ]
    for (const code of codes) {
      const err = new DuplicateCheckError('test', code)
      expect(err.code).toBe(code)
    }
  })
})

// ============================================
// Phase 2 Plan 02-05 Task 2 — RATE_LIMITED unit probe
// (kept from Task 2 commit so grep acceptance literals
// `rate_limited: true` and `code: 'RATE_LIMITED'` remain in the file)
// ============================================

describe('duplicateCheckService — RATE_LIMITED propagation (Phase 2 T2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws DuplicateCheckError { code: 'RATE_LIMITED' } when RPC returns rate_limited: true", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: null, email_exists: null, rate_limited: true },
      error: null,
    } as never)
    await expect(checkCPFDuplicate('12345678901')).rejects.toMatchObject({
      name: 'DuplicateCheckError',
      code: 'RATE_LIMITED',
    })
  })
})

// ============================================
// Phase 2 Plan 02-05 Task 4 — rate_limited handling (expanded)
// ============================================

describe('duplicateCheckService — rate_limited handling (Phase 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws DuplicateCheckError with code=RATE_LIMITED when RPC returns rate_limited=true (via checkCPFDuplicate)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: null, email_exists: null, rate_limited: true },
      error: null,
    } as never)

    await expect(checkCPFDuplicate('12345678901')).rejects.toMatchObject({
      name: 'DuplicateCheckError',
      code: 'RATE_LIMITED',
    })
  })

  it('throws DuplicateCheckError with code=RATE_LIMITED when RPC returns rate_limited=true (via checkEmailDuplicate)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: null, email_exists: null, rate_limited: true },
      error: null,
    } as never)

    await expect(
      checkEmailDuplicate('joao@example.com')
    ).rejects.toMatchObject({
      name: 'DuplicateCheckError',
      code: 'RATE_LIMITED',
    })
  })

  it('throws DuplicateCheckError with code=RATE_LIMITED when RPC returns rate_limited=true (via checkBothDuplicates)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: null, email_exists: null, rate_limited: true },
      error: null,
    } as never)

    await expect(
      checkBothDuplicates('12345678901', 'joao@example.com')
    ).rejects.toMatchObject({
      name: 'DuplicateCheckError',
      code: 'RATE_LIMITED',
    })
  })

  it('returns normal DuplicateCheckResult when rate_limited=false and booleans present', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { cpf_exists: false, email_exists: false, rate_limited: false },
      error: null,
    } as never)

    const res = await checkCPFDuplicate('12345678901')
    expect(res.isDuplicate).toBe(false)
  })

  it('CheckCandidatoDuplicateResponse interface includes rate_limited: boolean (type-level source probe)', async () => {
    // Structural assertion: the source file must declare `rate_limited: boolean`
    // in the response interface AND `'RATE_LIMITED'` in the error code union.
    // Using dynamic import of node:fs (happy-dom env) keeps the probe
    // compatible with the Vitest test environment.
    const fs = await import('node:fs')
    const path = await import('node:path')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../duplicateCheckService.ts'),
      'utf8'
    )
    expect(src).toMatch(/rate_limited:\s*boolean/)
    expect(src).toMatch(/'RATE_LIMITED'/)
  })
})
