/**
 * Schema de validação para formulário de login
 *
 * Utiliza Zod para validação client-side com mensagens em português.
 *
 * @module schemas/loginSchema
 */

import { z } from 'zod'

/**
 * Schema Zod para validação do formulário de login
 *
 * Campos:
 * - email: obrigatório, formato de email válido
 * - password: obrigatório, mínimo 1 caractere
 * - rememberMe: opcional, booleano para persistência de sessão
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),

  password: z
    .string()
    .min(1, 'Senha é obrigatória'),

  rememberMe: z
    .boolean()
    .optional()
    .default(false),
})

/**
 * Type inference do schema para uso com TypeScript
 */
export type LoginFormData = z.infer<typeof loginSchema>

/**
 * Mensagens de erro customizadas para validação
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
