/**
 * Schema de validacao para formulario "Redefinir senha"
 * (Phase 3 — D-10; Phase 5 Plan 05-06 — D-15 OTP token field).
 *
 * Valida o código OTP de 6 dígitos + as duas senhas novas + confirma igualdade
 * via `.refine`. Mensagem de match aparece no campo `confirmar_nova_senha`
 * (path explicito).
 *
 * Comportamento B11 (03-VALIDATION.md) + D-15:
 *   - token: código OTP de 6 dígitos numéricos (recovery email) — Phase 5
 *     migração PKCE→OTP. Rejeita não-6-dígitos / não-numérico.
 *   - nova_senha: passa por passwordSchema completo (min 8 + upper + lower + number)
 *   - confirmar_nova_senha: obrigatorio, >= 1 char (o `.refine` cuida da igualdade)
 *   - nova_senha !== confirmar_nova_senha: Zod issue path
 *     ['confirmar_nova_senha'], message 'As senhas não coincidem'
 *
 * Ordem dos erros Zod e a ordem declarativa — se nova_senha for invalida
 * pelo passwordSchema, esse erro aparece antes do refine de match
 * (Zod coleta issues do parse de cada campo antes de rodar refines do object).
 *
 * @module features/auth/schemas/redefinirSenhaSchema
 */

import { z } from 'zod'
import { passwordSchema } from './passwordSchema'

export const redefinirSenhaSchema = z
  .object({
    // D-15: código OTP de 6 dígitos numéricos do email de recuperação.
    token: z
      .string()
      .regex(/^\d{6}$/, 'Digite o código de 6 dígitos do email'),
    nova_senha: passwordSchema,
    confirmar_nova_senha: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.nova_senha === data.confirmar_nova_senha, {
    message: 'As senhas não coincidem',
    path: ['confirmar_nova_senha'],
  })

export type RedefinirSenhaFormData = z.infer<typeof redefinirSenhaSchema>
