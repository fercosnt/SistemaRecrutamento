/**
 * Schema tests promoted from Wave 0 it.todo → real asserts (Plan 03-02).
 * Behaviors covered: B11 (Password mismatch Zod error).
 * See .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md
 *
 * T3.1-T3.6 exercise passwordSchema (shared between cadastro + redefinir).
 * T3.7-T3.9 exercise redefinirSenhaSchema (object + .refine match).
 */
import { describe, it, expect } from 'vitest'
import { passwordSchema } from '../passwordSchema'
import { redefinirSenhaSchema } from '../redefinirSenhaSchema'

describe('passwordSchema (Wave 1, Plan 03-02)', () => {
  it('T3.1: rejects < 8 chars with pt-BR min message', () => {
    const result = passwordSchema.safeParse('Abcdef1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Senha deve ter no mínimo 8 caracteres'
      )
    }
  })

  it('T3.2: rejects with no uppercase — message "Inclua pelo menos uma letra maiúscula"', () => {
    const result = passwordSchema.safeParse('abcdefgh1')
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('Inclua pelo menos uma letra maiúscula')
    }
  })

  it('T3.3: rejects with no lowercase — message "Inclua pelo menos uma letra minúscula"', () => {
    const result = passwordSchema.safeParse('ABCDEFGH1')
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('Inclua pelo menos uma letra minúscula')
    }
  })

  it('T3.4: rejects with no number — message "Inclua pelo menos um número"', () => {
    const result = passwordSchema.safeParse('Abcdefgh')
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('Inclua pelo menos um número')
    }
  })

  it('T3.5: accepts valid 8-char password (lower+upper+digit)', () => {
    const result = passwordSchema.safeParse('Abcdefg1')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('Abcdefg1')
    }
  })

  it('T3.6: rejects > 100 chars with max message', () => {
    const over100 = 'a'.repeat(101) + 'A1'
    const result = passwordSchema.safeParse(over100)
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('Senha deve ter no máximo 100 caracteres')
    }
  })
})

describe('redefinirSenhaSchema (Wave 1, Plan 03-02)', () => {
  it('T3.7: accepts matching valid passwords', () => {
    const result = redefinirSenhaSchema.safeParse({
      token: '123456',
      nova_senha: 'Abcdef12',
      confirmar_nova_senha: 'Abcdef12',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.nova_senha).toBe('Abcdef12')
      expect(result.data.confirmar_nova_senha).toBe('Abcdef12')
    }
  })

  it('T3.8: B11 — rejects mismatch at path ["confirmar_nova_senha"] with message "As senhas não coincidem"', () => {
    const result = redefinirSenhaSchema.safeParse({
      token: '123456',
      nova_senha: 'Abcdef12',
      confirmar_nova_senha: 'Mismatch1',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const mismatchIssue = result.error.issues.find(
        (i) =>
          i.path.length === 1 &&
          i.path[0] === 'confirmar_nova_senha' &&
          i.message === 'As senhas não coincidem'
      )
      expect(mismatchIssue).toBeDefined()
    }
  })

  it('T3.9: rejects weak nova_senha with passwordSchema error at path ["nova_senha"] (declaration order)', () => {
    const result = redefinirSenhaSchema.safeParse({
      token: '123456',
      nova_senha: 'weak',
      confirmar_nova_senha: 'weak',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      // When nova_senha fails passwordSchema, the first issue is on nova_senha
      // (Zod parses object fields in declaration order before running refines).
      const novaSenhaIssue = result.error.issues.find(
        (i) => i.path[0] === 'nova_senha'
      )
      expect(novaSenhaIssue).toBeDefined()
      // Specifically the min(8) check fires
      expect(novaSenhaIssue?.message).toBe(
        'Senha deve ter no mínimo 8 caracteres'
      )
    }
  })
})

// ============================================================
// 6-digit OTP token field (Phase 5 Plan 05-06 — D-15)
// ============================================================

describe('redefinirSenhaSchema — OTP token field (Wave 5, Plan 05-06)', () => {
  it('T3.10: accepts a valid 6-digit numeric token + matching passwords', () => {
    const result = redefinirSenhaSchema.safeParse({
      token: '123456',
      nova_senha: 'Abcdef12',
      confirmar_nova_senha: 'Abcdef12',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.token).toBe('123456')
    }
  })

  it('T3.11: rejects a 5-digit token at path ["token"]', () => {
    const result = redefinirSenhaSchema.safeParse({
      token: '12345',
      nova_senha: 'Abcdef12',
      confirmar_nova_senha: 'Abcdef12',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const tokenIssue = result.error.issues.find((i) => i.path[0] === 'token')
      expect(tokenIssue).toBeDefined()
    }
  })

  it('T3.12: rejects a 7-digit token at path ["token"]', () => {
    const result = redefinirSenhaSchema.safeParse({
      token: '1234567',
      nova_senha: 'Abcdef12',
      confirmar_nova_senha: 'Abcdef12',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const tokenIssue = result.error.issues.find((i) => i.path[0] === 'token')
      expect(tokenIssue).toBeDefined()
    }
  })

  it('T3.13: rejects a non-numeric 6-char token at path ["token"]', () => {
    const result = redefinirSenhaSchema.safeParse({
      token: 'abc123',
      nova_senha: 'Abcdef12',
      confirmar_nova_senha: 'Abcdef12',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const tokenIssue = result.error.issues.find((i) => i.path[0] === 'token')
      expect(tokenIssue).toBeDefined()
    }
  })

  it('T3.14: rejects an empty token at path ["token"]', () => {
    const result = redefinirSenhaSchema.safeParse({
      token: '',
      nova_senha: 'Abcdef12',
      confirmar_nova_senha: 'Abcdef12',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const tokenIssue = result.error.issues.find((i) => i.path[0] === 'token')
      expect(tokenIssue).toBeDefined()
    }
  })
})
