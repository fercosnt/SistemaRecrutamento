/**
 * Wave 0 stub — populated during Waves 1-3.
 * Behaviors covered: B11.
 * See .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md
 */
import { describe, it } from 'vitest'

describe('redefinirSenhaSchema — Wave 0 stubs (03-login-recuperacao-senha)', () => {
  it.todo(
    'B11: schema.parse rejects when novaSenha !== confirmarNovaSenha → Zod issue path: ["confirmarNovaSenha"], message "As senhas não coincidem" (T-03-08)'
  )
  it.todo(
    'B11: schema.parse rejects novaSenha < 8 chars / no uppercase / no lowercase / no number with pt-BR Zod messages (mirrors passwordSchema from cadastro)'
  )
})
