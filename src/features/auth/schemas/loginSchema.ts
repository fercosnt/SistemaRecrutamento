/**
 * Schema de validacao para formulario de login (Phase 3 — 03-PATTERNS L412-422).
 *
 * Portado de src/schemas/loginSchema.ts (Phase 2). Campos preservados:
 *   - email: obrigatorio, formato valido (Zod email)
 *   - password: obrigatorio, >= 1 caractere (nao aplicar passwordSchema — login
 *     apenas verifica presenca; validacao de complexidade e responsabilidade
 *     do cadastro + redefinir-senha)
 *   - rememberMe: boolean, default false
 *
 * D-05 "checked by default" sera aplicado no RHF `useForm({ defaultValues:
 * { rememberMe: true } })` da LoginCandidatoPage (Wave 3, Plan 03-05).
 * NAO alterar default aqui — contrato Zod estavel.
 *
 * Arquivo legado `src/schemas/loginSchema.ts` permanece por ora; deletado na
 * limpeza final (Plan 03-06 cleanup task).
 *
 * @module features/auth/schemas/loginSchema
 */

import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),

  password: z.string().min(1, 'Senha é obrigatória'),

  rememberMe: z.boolean().optional().default(false),
})

export type LoginFormData = z.infer<typeof loginSchema>

/**
 * Mensagens de erro customizadas (preservadas do legado Phase 2).
 */
export const loginErrorMessages = {
  email: {
    required: 'Email é obrigatório',
    invalid: 'Email inválido',
  },
  password: {
    required: 'Senha é obrigatória',
  },
} as const
